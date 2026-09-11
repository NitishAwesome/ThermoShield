import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';
import { DailyForecast } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface ForecastChartProps {
  forecast?: DailyForecast;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ forecast }) => {
  const { t } = useTranslation();

  if (!forecast || !forecast.dates || forecast.dates.length === 0) {
    return (
      <div className="rounded-2xl ts-card-elevated border ts-border p-6 text-center ts-text-muted text-sm">
        {t('forecastChart.noData')}
      </div>
    );
  }

  const chartData = forecast.dates.map((dateStr, idx) => {
    const d = new Date(dateStr);
    const dayLabel = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    return {
      date: dayLabel,
      maxTemp: forecast.max_temperature[idx],
      minTemp: forecast.min_temperature[idx],
    };
  });

  return (
    <div className="rounded-2xl ts-card-elevated border ts-border p-4 sm:p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ts-border pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
          <h3 className="text-base font-bold ts-text-primary">
            {t('forecastChart.title')}
          </h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded ts-card-subtle ts-text-muted border ts-border self-start sm:self-auto flex-shrink-0">
          Open-Meteo Synoptic
        </span>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              unit="°C"
              domain={['auto', 'auto']}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#f8fafc',
                fontSize: '12px',
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area
              type="monotone"
              dataKey="maxTemp"
              name={t('forecastChart.maxTempLegend')}
              stroke="#f97316"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorMax)"
            />
            <Area
              type="monotone"
              dataKey="minTemp"
              name={t('forecastChart.minTempLegend')}
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMin)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
