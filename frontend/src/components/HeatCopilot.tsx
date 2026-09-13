import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  ShieldAlert,
  HeartPulse,
  ChevronDown,
  Info,
  Key,
  Check,
  ExternalLink,
  Cpu,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Share2,
  RotateCcw,
  Download,
  Maximize2,
  Minimize2,
  PhoneCall,
  Activity,
  Flame,
  Droplets,
  Sun,
  MapPin,
  Search,
  Navigation
} from 'lucide-react';
import { api } from '../services/api';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  safetyTier?: string;
  suggestedQuestions?: string[];
  timestamp: string;
  modelUsed?: string;
  isGemini?: boolean;
  emergencyCall?: boolean;
  resolvedLocation?: string;
  resolvedTelemetry?: {
    temp: number;
    humidity: number;
    apparent_temperature?: number;
    weather_description?: string;
    risk_level?: string;
    latitude?: number;
    longitude?: number;
    is_query_location?: boolean;
  };
}

const POPULAR_QUICK_CITIES = [
  { name: 'Delhi', fullName: 'Delhi, India', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', fullName: 'Mumbai, Maharashtra, India', lat: 19.0760, lon: 72.8777 },
  { name: 'Jaipur', fullName: 'Jaipur, Rajasthan, India', lat: 26.9124, lon: 75.7873 },
  { name: 'Bengaluru', fullName: 'Bengaluru, Karnataka, India', lat: 12.9716, lon: 77.5946 },
  { name: 'Kolkata', fullName: 'Kolkata, West Bengal, India', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', fullName: 'Chennai, Tamil Nadu, India', lat: 13.0827, lon: 80.2707 },
  { name: 'Lucknow', fullName: 'Lucknow, Uttar Pradesh, India', lat: 26.8467, lon: 80.9462 },
  { name: 'Ahmedabad', fullName: 'Ahmedabad, Gujarat, India', lat: 23.0225, lon: 72.5714 },
  { name: 'Pune', fullName: 'Pune, Maharashtra, India', lat: 18.5204, lon: 73.8567 },
  { name: 'Hyderabad', fullName: 'Hyderabad, Telangana, India', lat: 17.3850, lon: 78.4867 },
  { name: 'Patna', fullName: 'Patna, Bihar, India', lat: 25.5941, lon: 85.1376 },
  { name: 'Nagpur', fullName: 'Nagpur, Maharashtra, India', lat: 21.1458, lon: 79.0882 },
];

const INITIAL_SUGGESTIONS = [
  '💧 Hydration rules for 40°C heat',
  '🚨 Heat stroke emergency first aid',
  '👷 Work-rest cycle for outdoor labor',
  '👴 Precautions for elderly & kids',
];

const GEMINI_STORAGE_KEY = 'thermoshield_gemini_key';

// Web Audio API Synthesizer for subtle interaction chimes
const playChime = (type: 'send' | 'receive' | 'emergency') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'send') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'receive') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === 'emergency') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // AudioContext blocked or not supported - fails silently
  }
};

export const HeatCopilot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTelemetryHUD, setShowTelemetryHUD] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchCityText, setSearchCityText] = useState('');
  const [citySearchResults, setCitySearchResults] = useState<Array<{ name: string; latitude: number; longitude: number }>>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Live Telemetry Cache
  const [liveTelemetry, setLiveTelemetry] = useState<{
    temp: number;
    humidity: number;
    wbgt: number;
    heatIndex: number;
    riskLevel: string;
  }>({
    temp: 36.5,
    humidity: 58,
    wbgt: 30.8,
    heatIndex: 41.2,
    riskLevel: 'HIGH',
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: "Namaste! I am **Dr. ThermoShield**, your AI Biometeorological Heatwave Advisor.\n\nAsk me anything in **English, Hindi, or Hinglish** about heat safety, hydration schedules (ORS, Aam Panna), ISO 7243 WBGT work-rest cycles, or emergency heat exhaustion first aid.",
      safetyTier: 'ADVISORY',
      suggestedQuestions: INITIAL_SUGGESTIONS,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-2.0-flash',
      isGemini: true,
      emergencyCall: false,
    },
  ]);

  const { locationName, coords, setCoordsAndName, detectMyLocation, isLocating } = useLocation();
  const { user } = useAuth();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // City Search & Selection handlers
  const handleSearchCity = async (val: string) => {
    setSearchCityText(val);
    if (val.trim().length < 2) {
      setCitySearchResults([]);
      return;
    }
    setIsSearchingCity(true);
    try {
      const res = await api.searchLocations(val.trim());
      if (res && res.locations) {
        setCitySearchResults(res.locations);
      }
    } catch {
      // Search failed silently
    } finally {
      setIsSearchingCity(false);
    }
  };

  const selectCity = (name: string, lat: number, lon: number) => {
    setCoordsAndName({ lat, lon }, name);
    setShowLocationModal(false);
    setSearchCityText('');
    setCitySearchResults([]);
  };

  // Sync Telemetry with backend when coords change
  useEffect(() => {
    let isSubscribed = true;
    const fetchTelemetry = async () => {
      try {
        const data = await api.getWeather(coords.lat, coords.lon);
        if (isSubscribed && data && data.weather) {
          const t = data.weather.temperature ?? 36.5;
          const h = data.weather.humidity ?? 58;
          // Calculate approx Heat Index & WBGT
          const hi = data.weather.apparent_temperature ?? (t + 0.5555 * ((6.11 * Math.pow(10, (7.5 * t) / (237.3 + t)) * (h / 100)) - 10));
          const wbgt = 0.7 * (t * 0.8) + 0.3 * t; // simplified estimate
          const risk = t >= 40 ? 'EXTREME' : t >= 36 ? 'HIGH' : t >= 32 ? 'MODERATE' : 'LOW';

          setLiveTelemetry({
            temp: Number(t.toFixed(1)),
            humidity: Math.round(h),
            heatIndex: Number(hi.toFixed(1)),
            wbgt: Number(wbgt.toFixed(1)),
            riskLevel: risk,
          });
        }
      } catch {
        // Keep baseline telemetry on network error
      }
    };
    if (isOpen) {
      fetchTelemetry();
    }
    return () => {
      isSubscribed = false;
    };
  }, [coords, isOpen]);

  // Speech Recognition setup (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Works well for Indian English and Hinglish

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  // Speech Synthesis cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen && !isMinimized && !showSettings) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, loading, showSettings]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && !showSettings) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, showSettings]);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition start failed:", err);
      }
    }
  };

  const handleSpeak = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Speech synthesis is not supported on your device.");
      return;
    }

    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown characters for smooth speech
    const cleanSpeechText = text
      .replace(/[*#_`>]/g, '')
      .replace(/•/g, ', ')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 1800);
    });
  };

  const handleShare = async (text: string) => {
    const shareData = {
      title: 'Dr. ThermoShield Heat Advisory',
      text: `🛡️ ThermoShield Heat Alert for ${locationName || 'your area'}:\n\n${text}\n\nVia ThermoShield Early Warning Network`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Ignored if cancelled
      }
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Do you want to reset this chat session with Dr. ThermoShield?")) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      setMessages([
        {
          id: 'welcome-reset',
          sender: 'copilot',
          text: "Chat session reset. Dr. ThermoShield is ready. What heatwave risk or hydration advice do you need?",
          safetyTier: 'ADVISORY',
          suggestedQuestions: INITIAL_SUGGESTIONS,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'gemini-2.0-flash',
          isGemini: true,
        },
      ]);
    }
  };

  const handleExportChat = () => {
    const transcript = messages
      .map((m) => `[${m.timestamp}] ${m.sender === 'user' ? 'Citizen' : 'Dr. ThermoShield'}:\n${m.text}\n`)
      .join('\n----------------------------------------\n\n');
    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ThermoShield_Advisory_${locationName || 'Mumbai'}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveKey = () => {
    const cleanKey = tempApiKey.trim();
    setApiKey(cleanKey);
    try {
      if (cleanKey) {
        localStorage.setItem(GEMINI_STORAGE_KEY, cleanKey);
      } else {
        localStorage.removeItem(GEMINI_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save Gemini key to localStorage', e);
    }
    setKeySavedMessage(true);
    setTimeout(() => {
      setKeySavedMessage(false);
      setShowSettings(false);
    }, 1200);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || loading) return;

    if (soundEnabled) playChime('send');

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setLoading(true);

    // Prepare multi-turn history for Gemini
    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      text: m.text,
    }));

    try {
      const res = await api.chatWithCopilot({
        message: textToSend,
        location: locationName || 'Mumbai',
        temperature_c: liveTelemetry.temp,
        humidity: liveTelemetry.humidity,
        risk_level: liveTelemetry.riskLevel,
        user_role: user?.role || 'citizen',
        conversation_history: historyPayload,
        api_key: apiKey || undefined,
      });

      const isEmergency = res.emergency_call || res.safety_tier === 'EMERGENCY';
      if (soundEnabled) playChime(isEmergency ? 'emergency' : 'receive');

      const copilotMsg: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: res.reply,
        safetyTier: res.safety_tier,
        suggestedQuestions: res.suggested_questions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.model_used || 'gemini-2.0-flash',
        isGemini: res.is_gemini ?? true,
        emergencyCall: isEmergency,
        resolvedLocation: res.resolved_location,
        resolvedTelemetry: res.resolved_telemetry,
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch {
      if (soundEnabled) playChime('receive');
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        text: "I encountered a momentary connection issue. Please ensure the backend is reachable or try asking again.",
        safetyTier: 'ADVISORY',
        suggestedQuestions: INITIAL_SUGGESTIONS,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'biomet-expert-engine',
        isGemini: false,
        emergencyCall: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to format simple markdown (bold text, headings, and bullets)
  const formatMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bullet items
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        const bulletContent = line.trim().replace(/^[*•-]\s*/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-sm my-0.5">
            {renderFormattedSpans(bulletContent)}
          </li>
        );
      }
      if (line.trim().startsWith('### ')) {
        return (
          <h4 key={idx} className="font-semibold text-sm mt-2 mb-1 text-orange-600 dark:text-orange-400">
            {line.trim().substring(4)}
          </h4>
        );
      }
      if (line.trim().startsWith('## ')) {
        return (
          <h3 key={idx} className="font-bold text-sm mt-2 mb-1 text-orange-600 dark:text-orange-400">
            {line.trim().substring(3)}
          </h3>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-sm my-1">
          {renderFormattedSpans(line)}
        </p>
      );
    });
  };

  const renderFormattedSpans = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const getTierBadge = (tier?: string) => {
    if (!tier) return null;
    if (tier === 'EMERGENCY') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
          <HeartPulse className="w-3 h-3 text-red-500 animate-pulse" /> Emergency
        </span>
      );
    }
    if (tier === 'EXTREME') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
          <ShieldAlert className="w-3 h-3 text-orange-500" /> Extreme Heat
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <Sparkles className="w-3 h-3 text-blue-500" /> Biometeorology
      </span>
    );
  };

  return (
    <aside aria-label="AI Heatwave Copilot" className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 select-none max-w-[calc(100vw-24px)]">
      {/* Floating Trigger Badge */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 border border-white/20"
          title="Open Dr. ThermoShield AI Heat Copilot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-300"></span>
            </span>
          </div>
          <div className="flex flex-col items-start pr-1 text-left">
            <span className="text-xs font-bold leading-tight tracking-wide flex items-center gap-1">
              Ask Heat Copilot
              <span className="text-[9px] px-1 py-0.2 bg-white/25 rounded font-mono">AI 2.0</span>
            </span>
            <span className="text-[10px] text-orange-100 font-medium leading-tight">Dr. ThermoShield</span>
          </div>
        </button>
      )}

      {/* Slide-over Chat Box */}
      {isOpen && (
        <div
          className={`flex flex-col rounded-2xl shadow-2xl transition-all duration-300 border ts-border backdrop-blur-2xl bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 overflow-hidden ${
            isMinimized
              ? 'w-72 sm:w-80 h-14'
              : isExpanded
              ? 'w-[calc(100vw-24px)] sm:w-[620px] h-[640px] max-h-[90vh]'
              : 'w-[calc(100vw-24px)] sm:w-[420px] h-[590px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-white shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate leading-tight flex items-center gap-1.5">
                  Dr. ThermoShield
                  <span className="px-1.5 py-0.2 text-[9px] font-semibold uppercase bg-white/25 rounded-md flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> Gemini AI
                  </span>
                </h3>
                <div className="text-[10px] text-orange-100 truncate flex items-center gap-1 mt-0.5">
                  <button
                    onClick={() => {
                      setShowLocationModal(!showLocationModal);
                      setShowSettings(false);
                    }}
                    className="flex items-center gap-1 bg-black/15 hover:bg-black/25 px-1.5 py-0.5 rounded text-white font-medium transition-colors truncate max-w-[170px]"
                    title="Click to switch city / zone"
                  >
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{locationName || 'Mumbai'}</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-80 shrink-0 ml-0.5" />
                  </button>
                  <span>•</span>
                  <span>{liveTelemetry.temp}°C {liveTelemetry.riskLevel}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Telemetry HUD Toggle */}
              <button
                onClick={() => setShowTelemetryHUD(!showTelemetryHUD)}
                className={`p-1 rounded-md transition-colors ${showTelemetryHUD ? 'bg-white/30' : 'hover:bg-white/20'}`}
                title="Toggle Environmental Telemetry HUD"
              >
                <Activity className="w-4 h-4" />
              </button>

              {/* Audio Sound FX Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1 rounded-md transition-colors ${soundEnabled ? 'hover:bg-white/20' : 'bg-black/20 text-orange-200'}`}
                title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Gemini Key Config */}
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowLocationModal(false);
                }}
                className={`p-1 rounded-md transition-colors ${showSettings ? 'bg-white/30' : 'hover:bg-white/20'}`}
                title="Configure Gemini API Key"
              >
                <Key className="w-4 h-4" />
              </button>

              {/* Expand / Minimize Width */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:block p-1 hover:bg-white/20 rounded-md transition-colors"
                title={isExpanded ? 'Normal view' : 'Wide diagnostic view'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Minimize to dock */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
              </button>

              {/* Close */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSettings(false);
                  setShowLocationModal(false);
                  setShowTelemetryHUD(false);
                }}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Location Switcher Modal */}
              {showLocationModal && (
                <div className="p-3.5 bg-orange-50/95 dark:bg-gray-800/95 border-b border-orange-200 dark:border-gray-700 text-xs space-y-2.5 animate-fadeIn shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      Select Monitored City or Heat Hub
                    </span>
                    <button
                      onClick={() => setShowLocationModal(false)}
                      className="p-1 hover:bg-orange-200/50 dark:hover:bg-gray-700 rounded text-gray-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchCityText}
                      onChange={(e) => handleSearchCity(e.target.value)}
                      placeholder="Search any city or district (e.g. Delhi, Jaipur, Bengaluru)..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                  </div>

                  {/* Search Results if any */}
                  {isSearchingCity ? (
                    <div className="text-[11px] text-gray-500 py-1 text-center">Searching cities...</div>
                  ) : citySearchResults.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                      {citySearchResults.map((city, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectCity(city.name, city.latitude, city.longitude)}
                          className="w-full px-2.5 py-1.5 text-left text-[11px] hover:bg-orange-50 dark:hover:bg-gray-800 flex items-center justify-between text-gray-800 dark:text-gray-200 transition-colors"
                        >
                          <span className="truncate">{city.name}</span>
                          <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium shrink-0">Select</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {/* Popular Indian Cities Chips */}
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Popular Heat Monitoring Zones
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {POPULAR_QUICK_CITIES.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => selectCity(c.fullName, c.lat, c.lon)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                            locationName?.toLowerCase().includes(c.name.toLowerCase())
                              ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                              : 'bg-white dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-400'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* GPS Detection Option */}
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => {
                        detectMyLocation();
                        setShowLocationModal(false);
                      }}
                      disabled={isLocating}
                      className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 hover:underline font-medium"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>{isLocating ? 'Detecting GPS...' : 'Use My Current GPS'}</span>
                    </button>
                    <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                      Active: {locationName?.split(',')[0] || 'Mumbai'}
                    </span>
                  </div>
                </div>
              )}

              {/* Telemetry HUD Strip (Expandable) */}
              {showTelemetryHUD && (
                <div className="px-4 py-2.5 bg-gradient-to-b from-orange-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-orange-200 dark:border-gray-700 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] mb-1.5 font-semibold text-orange-950 dark:text-orange-200">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-orange-500" />
                      Live Synoptic Telemetry
                      <button
                        onClick={() => setShowLocationModal(!showLocationModal)}
                        className="underline hover:text-orange-600 font-semibold ml-0.5"
                        title="Click to change location"
                      >
                        ({locationName || 'Mumbai'})
                      </button>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-200/80 dark:bg-orange-900/80 text-orange-800 dark:text-orange-200 uppercase font-mono">
                      {liveTelemetry.riskLevel} Risk
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-orange-100/60 dark:bg-gray-800/80 border border-orange-200 dark:border-gray-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <Flame className="w-3 h-3 text-red-500" /> Temp
                      </div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">{liveTelemetry.temp}°C</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-orange-100/60 dark:bg-gray-800/80 border border-orange-200 dark:border-gray-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <Sun className="w-3 h-3 text-amber-500" /> Feels
                      </div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">{liveTelemetry.heatIndex}°C</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-orange-100/60 dark:bg-gray-800/80 border border-orange-200 dark:border-gray-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <Droplets className="w-3 h-3 text-blue-500" /> Humid
                      </div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">{liveTelemetry.humidity}%</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-orange-100/60 dark:bg-gray-800/80 border border-orange-200 dark:border-gray-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <HeartPulse className="w-3 h-3 text-purple-500" /> WBGT
                      </div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">{liveTelemetry.wbgt}°C</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings / API Key Modal Panel */}
              {showSettings && (
                <div className="p-4 bg-orange-50/95 dark:bg-gray-800/95 border-b border-orange-200 dark:border-gray-700 text-xs space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-orange-500" />
                      Google Gemini AI Key (Gemini 2.0 Flash)
                    </span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
                    >
                      Get free key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                    Paste your personal Google Gemini API key to enable live, unmetered AI responses:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                    />
                    <button
                      onClick={handleSaveKey}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium flex items-center gap-1 shrink-0"
                    >
                      {keySavedMessage ? <Check className="w-3.5 h-3.5" /> : 'Save'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                    <span>
                      Status: {apiKey ? '🟢 Custom Key Active' : '⚪ Using Server / Expert Engine'}
                    </span>
                    {apiKey && (
                      <button
                        onClick={() => {
                          setTempApiKey('');
                          setApiKey('');
                          localStorage.removeItem(GEMINI_STORAGE_KEY);
                        }}
                        className="text-red-500 hover:underline"
                      >
                        Clear Key
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Status & Sub-action Toolbar */}
              <div className="px-3.5 py-1.5 bg-orange-50/80 dark:bg-orange-950/30 border-b border-orange-100 dark:border-orange-900/40 text-[11px] flex items-center justify-between text-orange-900 dark:text-orange-200">
                <span className="flex items-center gap-1 font-medium truncate">
                  <Info className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
                  IMD / NDMA / WHO Heatwave Standards
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportChat}
                    className="p-1 hover:bg-orange-200/50 dark:hover:bg-orange-900/50 rounded transition-colors text-orange-700 dark:text-orange-300"
                    title="Export Health Advisory"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleClearChat}
                    className="p-1 hover:bg-orange-200/50 dark:hover:bg-orange-900/50 rounded transition-colors text-orange-700 dark:text-orange-300"
                    title="Clear Conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {msg.sender === 'copilot' && (
                      <div className="flex items-center gap-1.5 mb-1.5 pl-1">
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                          Dr. ThermoShield
                        </span>
                        {getTierBadge(msg.safetyTier)}
                        {msg.isGemini && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5 font-medium">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> Gemini 2.0
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-1">{msg.timestamp}</span>
                      </div>
                    )}

                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-xs'
                          : 'bg-gray-100/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 rounded-bl-xs'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div>
                          {/* Query City Telemetry Badge & Quick Switch Button */}
                          {msg.resolvedLocation && msg.resolvedTelemetry?.is_query_location && (
                            <div className="mb-2.5 p-2 rounded-xl bg-orange-50/90 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-orange-950 dark:text-orange-200">
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                                <span className="font-semibold truncate">{msg.resolvedLocation.split(',')[0]}:</span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {msg.resolvedTelemetry.temp}°C • {msg.resolvedTelemetry.humidity}% RH
                                  {msg.resolvedTelemetry.apparent_temperature !== undefined && (
                                    <span className="text-orange-600 dark:text-orange-400 font-medium ml-1">
                                      (Feels {msg.resolvedTelemetry.apparent_temperature}°C)
                                    </span>
                                  )}
                                </span>
                              </div>
                              {msg.resolvedTelemetry.latitude !== undefined && msg.resolvedTelemetry.longitude !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCoordsAndName(
                                      { lat: msg.resolvedTelemetry!.latitude!, lon: msg.resolvedTelemetry!.longitude! },
                                      msg.resolvedLocation!
                                    );
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium text-[10px] transition-colors shadow-xs shrink-0 cursor-pointer"
                                  title="Set this city as active dashboard zone"
                                >
                                  Set as Active Zone
                                </button>
                              )}
                            </div>
                          )}

                          {formatMarkdown(msg.text)}

                          {/* Emergency 108 Call Card if triggered */}
                          {msg.emergencyCall && (
                            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-400/40 text-red-700 dark:text-red-300 flex flex-col gap-2">
                              <div className="flex items-center gap-2 font-bold text-xs">
                                <HeartPulse className="w-4 h-4 text-red-500 animate-pulse" />
                                Severe Heat Emergency Detected
                              </div>
                              <p className="text-[11px] text-gray-700 dark:text-gray-300">
                                Move patient to shade immediately, apply cold compresses to armpits/groin, and call ambulance assistance.
                              </p>
                              <a
                                href="tel:108"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wide shadow-md shadow-red-500/20 active:scale-95 transition-all text-center"
                              >
                                <PhoneCall className="w-3.5 h-3.5 animate-bounce" /> Call 108 Ambulance Hotline
                              </a>
                            </div>
                          )}

                          {/* Message Action Toolbar (Read aloud, Copy, WhatsApp) */}
                          <div className="mt-2.5 pt-2 border-t border-gray-200/70 dark:border-gray-700/70 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSpeak(msg.text, msg.id)}
                                className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                title={speakingMsgId === msg.id ? "Stop voice" : "Read aloud"}
                              >
                                {speakingMsgId === msg.id ? (
                                  <VolumeX className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                                <span>{speakingMsgId === msg.id ? "Stop" : "Listen"}</span>
                              </button>
                              <span>•</span>
                              <button
                                onClick={() => handleCopy(msg.text, msg.id)}
                                className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                title="Copy to clipboard"
                              >
                                {copiedMsgId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedMsgId === msg.id ? "Copied" : "Copy"}</span>
                              </button>
                            </div>

                            <button
                              onClick={() => handleShare(msg.text)}
                              className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              title="Share on WhatsApp or social"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.sender === 'user' && (
                      <span className="text-[10px] text-gray-400 mt-1 pr-1">{msg.timestamp}</span>
                    )}

                    {/* Copilot Follow-up Suggestion Chips */}
                    {msg.sender === 'copilot' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-1 max-w-[95%]">
                        {msg.suggestedQuestions.map((q, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSendMessage(q)}
                            disabled={loading}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-gray-700 transition-colors text-left truncate max-w-full"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex flex-col items-start pl-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        Dr. ThermoShield
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
                        <Sparkles className="w-2.5 h-2.5 animate-spin" />
                        Generating Gemini advisory...
                      </span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-xs px-4 py-3 border border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t ts-border bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder={isListening ? "Listening to your voice..." : "Ask in English or Hindi (e.g. 'pani kitna pina chahiye')..."}
                    className={`flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border ${
                      isListening
                        ? 'border-red-500 ring-2 ring-red-400/40 bg-red-50/50 dark:bg-red-950/30'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                    } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all disabled:opacity-60`}
                  />

                  {/* Microphone Voice Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse border-red-600 shadow-md shadow-red-500/30'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700'
                    }`}
                    title={isListening ? "Stop listening" : "Speak question (Voice input)"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Send Button */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() || loading}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/20 active:scale-95 shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 px-1">
                  <span>Enter to send • Tap 🎙️ to speak</span>
                  <a href="tel:108" className="text-red-500 hover:underline dark:text-red-400 font-semibold flex items-center gap-0.5">
                    <PhoneCall className="w-2.5 h-2.5" /> Call 108 Emergency
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
};

export default HeatCopilot;
