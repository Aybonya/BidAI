import { BarChart3, CloudUpload, Leaf, Settings, Sprout, Tractor } from "lucide-react";

const navItems = [
  { id: "fields", label: "Алқаптар", icon: Sprout },
  { id: "analytics", label: "Талдау", icon: BarChart3 },
  { id: "upload", label: "Жүктеу", icon: CloudUpload },
  { id: "equipment", label: "Техника", icon: Tractor },
  { id: "settings", label: "Баптаулар", icon: Settings }
];

export default function Sidebar() {
  return (
    <header className="glass-panel relative z-20 mx-3 mt-3 rounded-2xl border-[#cbc5b2] bg-[#f8f5ea]/90 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f2d26] text-[#ffd89d]">
            <Leaf size={20} />
          </div>
          <div>
            <p className="headline-font text-lg font-semibold text-[#1f2b24]">BidAI Console</p>
            <p className="text-xs text-[#6d7668]">Алқап мониторингі және индекстер</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`soft-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
                  index === 0
                    ? "bg-[#d97832] text-white"
                    : "border border-[#d0cab7] bg-white text-[#4a5548]"
                }`}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
