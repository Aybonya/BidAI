import { useEffect, useMemo, useRef, useState } from "react";

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplay = (date) =>
  date.toLocaleDateString("kk-KZ", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

export default function PeriodSelector({
  dateRange,
  onApply,
  latestDate,
  seasonStart,
  seasonEnd
}) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(formatDate(dateRange.start));
  const [draftEnd, setDraftEnd] = useState(formatDate(dateRange.end));
  const panelRef = useRef(null);

  useEffect(() => {
    setDraftStart(formatDate(dateRange.start));
    setDraftEnd(formatDate(dateRange.end));
  }, [dateRange]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!panelRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("pointerdown", handleClick);
    }
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [open]);

  const applyRange = (start, end) => {
    const safeStart = new Date(start);
    const safeEnd = new Date(end);
    onApply({ start: safeStart, end: safeEnd });
    setOpen(false);
  };

  const latest = latestDate ?? dateRange.end;
  const presets = [
    {
      label: "30 күн",
      getRange: () => {
        const end = new Date(latest);
        const start = new Date(end);
        start.setDate(end.getDate() - 29);
        return { start, end };
      }
    },
    {
      label: "60 күн",
      getRange: () => {
        const end = new Date(latest);
        const start = new Date(end);
        start.setDate(end.getDate() - 59);
        return { start, end };
      }
    },
    {
      label: "Бүкіл маусым",
      getRange: () => ({ start: seasonStart, end: seasonEnd })
    }
  ];

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
      >
        Кезеңді таңдау
      </button>
      <span className="ml-3 text-sm text-slate-500">
        {formatDisplay(dateRange.start)} – {formatDisplay(dateRange.end)}
      </span>
      {open && (
        <div
          className="absolute right-0 mt-3 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-float z-50"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const range = preset.getRange();
                  applyRange(range.start, range.end);
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Басы</label>
              <input
                type="date"
                value={draftStart}
                onChange={(event) => setDraftStart(event.target.value)}
                onFocus={() => setOpen(true)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Соңы</label>
              <input
                type="date"
                value={draftEnd}
                onChange={(event) => setDraftEnd(event.target.value)}
                onFocus={() => setOpen(true)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => applyRange(draftStart, draftEnd)}
            className="mt-3 w-full rounded-full bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Қолдану
          </button>
        </div>
      )}
    </div>
  );
}
