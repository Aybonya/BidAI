import { ChevronDown, ListFilter, Search } from "lucide-react";

export default function FieldsPanel({ fields, selectedId, onSelectField, onAddField }) {
  return (
    <aside className="glass-panel h-full w-[380px] rounded-3xl border-[#d4ceb9] bg-[#f8f4e8]/88 p-5">
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7a826f]">Кітапхана</p>
            <h2 className="headline-font mt-1 text-2xl font-semibold text-[#1f2b24]">Менің алқаптарым</h2>
          </div>
          <button
            type="button"
            className="soft-button inline-flex items-center gap-2 rounded-full border border-[#d7d1be] bg-white px-3 py-1.5 text-sm text-[#4a5345]"
          >
            2026 маусым
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-[#d7d1be] bg-white px-3 py-2">
            <Search size={16} className="text-[#7f8778]" />
            <input
              className="w-full bg-transparent text-sm text-[#2f3a31] focus:outline-none"
              placeholder="Алқапты табу"
            />
          </div>
          <button
            type="button"
            className="soft-button h-10 w-10 rounded-2xl border border-[#d7d1be] bg-white text-[#4f594b]"
          >
            <ListFilter size={18} className="mx-auto" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1">
          {fields.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => onSelectField(field)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                selectedId === field.id
                  ? "border-[#d97832] bg-[#fff2e6]"
                  : "border-[#ddd7c5] bg-white hover:border-[#c9c0a7]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="headline-font text-base font-semibold text-[#253226]">{field.name}</p>
                <span className="rounded-full bg-[#edf1e6] px-2 py-0.5 text-[11px] text-[#5f695d]">
                  {field.areaHa} га
                </span>
              </div>
              <p className="mt-2 text-xs text-[#6c7567]">{field.note || "Ескертпесіз"}</p>
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-dashed border-[#c9bd9a] bg-[#efe8d5] p-4">
          <p className="headline-font text-base font-semibold text-[#2a342a]">Жаңа алқап</p>
          <p className="mt-1 text-xs text-[#6d7567]">
            Түймені басып, картада контурды қос шерту арқылы аяқтаңыз.
          </p>
          <button
            type="button"
            onClick={onAddField}
            className="soft-button mt-3 w-full rounded-full bg-[#d97832] px-4 py-2 text-sm font-semibold text-white"
          >
            + Қосу
          </button>
        </div>
      </div>
    </aside>
  );
}
