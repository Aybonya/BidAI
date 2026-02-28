export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="glass-panel inline-flex items-center gap-1 rounded-2xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            activeTab === tab
              ? "bg-[#1f2d26] text-white"
              : "text-[#576253] hover:bg-[#ece7d9]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
