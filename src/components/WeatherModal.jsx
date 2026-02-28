import { Cloud, Droplet, Snowflake, Wind, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

const iconMap = {
  cloud: Cloud,
  rain: Droplet,
  snow: Snowflake,
  wind: Wind
};

const metricCards = [
  { key: "tempC", label: "Температура", unit: "°", icon: Cloud },
  { key: "precipitationMm", label: "Жауын-шашын", unit: "мм", icon: Droplet },
  { key: "windMs", label: "Жел", unit: "м/с", icon: Wind },
  { key: "cloudPct", label: "Бұлттылық", unit: "%", icon: Cloud },
  { key: "humidityPct", label: "Ылғалдылық", unit: "%", icon: Droplet },
  { key: "dewPointC", label: "Шық нүктесі", unit: "°", icon: Snowflake }
];

function MiniBars({ values }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-3 flex items-end gap-1">
      {values.map((value, index) => (
        <div
          key={index}
          className="w-2 rounded-full bg-brand-500/60"
          style={{ height: `${Math.max(6, (value / max) * 32)}px` }}
        />
      ))}
    </div>
  );
}

export default function WeatherModal({ open, onClose, field, weather }) {
  const escHandler = useMemo(
    () => (event) => {
      if (event.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", escHandler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", escHandler);
    };
  }, [open, escHandler]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative z-10 w-[90vw] max-w-5xl rounded-2xl bg-white p-6 shadow-float">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800"
        >
          <X size={16} className="mx-auto" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Ауа райы</h2>
          <p className="text-sm text-slate-500">{field?.name}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {metricCards.map((metric, index) => {
            const Icon = metric.icon;
            const value = weather.current[metric.key];
            const bars = weather.hourlyBars[index] || weather.hourlyBars[0];
            return (
              <div key={metric.key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Icon size={16} className="text-brand-500" />
                    {metric.label}
                  </div>
                  <div className="text-lg font-semibold text-slate-900">
                    {value}{metric.unit}
                  </div>
                </div>
                <MiniBars values={bars} />
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900">Ауа райы болжамы</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
            {weather.dailyForecast.map((day) => {
              const DayIcon = iconMap[day.iconType] || Cloud;
              return (
                <div
                  key={day.label}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
                >
                  <div className="text-sm font-semibold text-slate-800">{day.label}</div>
                  <div className="text-[11px] text-slate-400">{day.date}</div>
                  <DayIcon size={18} className="mt-2 text-brand-500" />
                  <div className="mt-2">Темп.: {day.tempMin}–{day.tempMax}°</div>
                  <div>Жауын-шашын: {day.precipMm} мм</div>
                  <div>Жел: {day.windMs} м/с</div>
                  <div>Бұлтт.: {day.cloudPct}%</div>
                  <div>Ылғ.: {day.humidityPct}%</div>
                  <div>Шық: {day.dewPointC}°</div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400">Жаңа ғана жаңартылды</p>
      </div>
    </div>,
    document.body
  );
}
