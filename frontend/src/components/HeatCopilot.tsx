import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  ShieldAlert,
  HeartPulse,
  ChevronDown,
  Info
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
}

const INITIAL_SUGGESTIONS = [
  '💧 Hydration rules for 40°C heat',
  '🚨 Heat stroke emergency first aid',
  '👷 Work-rest cycle for outdoor labor',
  '👴 Precautions for elderly & kids',
];

export const HeatCopilot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: "Hello! I am **Dr. ThermoShield**, your AI Biometeorological Heatwave Advisor.\n\nAsk me anything about heat safety, hydration protocols, Wet-Bulb Globe Temperature (WBGT) work-rest cycles, or emergency heat exhaustion first aid.",
      safetyTier: 'ADVISORY',
      suggestedQuestions: INITIAL_SUGGESTIONS,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const { locationName } = useLocation();
  const { user } = useAuth();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || loading) return;

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

    try {
      const res = await api.chatWithCopilot({
        message: textToSend,
        location: locationName || 'Mumbai',
        user_role: user?.role || 'citizen',
      });

      const copilotMsg: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: res.reply,
        safetyTier: res.safety_tier,
        suggestedQuestions: res.suggested_questions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        text: "I encountered a momentary connection issue. Please ensure the backend is reachable or try asking again.",
        safetyTier: 'ADVISORY',
        suggestedQuestions: INITIAL_SUGGESTIONS,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  // Helper to format simple markdown (bold text and bullets)
  const formatMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bullet items
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const bulletContent = line.trim().substring(2);
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
    // Basic regex parser for **bold** text
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
          <HeartPulse className="w-3 h-3 text-red-500 animate-pulse" /> Emergency Protocol
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
    <aside aria-label="AI Heatwave Copilot" className="fixed bottom-5 right-5 z-50 select-none">
      {/* Floating Trigger Badge */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          title="Open Dr. ThermoShield AI Heat Copilot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300"></span>
            </span>
          </div>
          <div className="flex flex-col items-start pr-1 text-left">
            <span className="text-xs font-bold leading-tight tracking-wide">Ask Heat Copilot</span>
            <span className="text-[10px] text-orange-100 font-medium leading-tight">Dr. ThermoShield AI</span>
          </div>
        </button>
      )}

      {/* Slide-over Chat Box */}
      {isOpen && (
        <div
          className={`flex flex-col rounded-2xl shadow-2xl transition-all duration-300 border ts-border backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 overflow-hidden ${
            isMinimized
              ? 'w-80 h-14'
              : 'w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-white shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate leading-tight flex items-center gap-1.5">
                  Dr. ThermoShield
                  <span className="px-1.5 py-0.2 text-[9px] font-semibold uppercase bg-white/25 rounded-md">
                    Copilot
                  </span>
                </h3>
                <p className="text-[10px] text-orange-100 truncate flex items-center gap-1">
                  <span>📍 {locationName || 'Mumbai'}</span>
                  <span>•</span>
                  <span>Active Heat Defense</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Telemetry Awareness Strip */}
              <div className="px-3.5 py-1.5 bg-orange-50/80 dark:bg-orange-950/30 border-b border-orange-100 dark:border-orange-900/40 text-[11px] flex items-center justify-between text-orange-900 dark:text-orange-200">
                <span className="flex items-center gap-1 font-medium">
                  <Info className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
                  Grounded in IMD, NDMA & WHO heat action standards
                </span>
                <span className="text-[10px] font-mono text-orange-700/80 dark:text-orange-300/80">
                  v2.4
                </span>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {msg.sender === 'copilot' && (
                      <div className="flex items-center gap-1.5 mb-1 pl-1">
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                          Dr. ThermoShield
                        </span>
                        {getTierBadge(msg.safetyTier)}
                        <span className="text-[10px] text-gray-400 ml-1">{msg.timestamp}</span>
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-xs'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 rounded-bl-xs'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div>{formatMarkdown(msg.text)}</div>
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
                        Analyzing telemetry...
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
                    placeholder="Ask about hydration, WBGT, or first aid..."
                    className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all disabled:opacity-60"
                  />
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
                  <span>Press Enter to send</span>
                  <span className="text-red-500 dark:text-red-400 font-medium">
                    Call 108 in severe emergencies
                  </span>
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
