import { Bot, Loader2, Send, X } from "lucide-react";
import { useMemo, useState } from "react";

const HISTORY_KEY = "dala.assistant.history.v1";

const defaultAvatarUrl =
  "https://api.dicebear.com/9.x/adventurer/svg?seed=DalaSense&backgroundType=gradientLinear";
const localAvatarPath = "/chibi-friend.png";
const sharedAvatarSrc = import.meta.env.VITE_CHIBI_AVATAR_URL || localAvatarPath;

const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const hasBrokenEncoding = (messages) =>
  Array.isArray(messages) &&
  messages.some((m) => typeof m?.content === "string" && /Р|�/.test(m.content));

const initialMessages = [
  {
    role: "assistant",
    content:
      "Сәлем! Мен Мансур AI көмекшісімін. Индекстер, тәуекелдер, әрекет жоспары немесе маусым салыстыруы туралы сұраңыз."
  }
];

export default function ChibiAssistant({ fields = [], selectedField = null, position = "fixed-right" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => {
    const restored = loadJson(HISTORY_KEY, initialMessages);
    return hasBrokenEncoding(restored) ? initialMessages : restored;
  });
  const [avatarSrc, setAvatarSrc] = useState(sharedAvatarSrc);

  const context = useMemo(
    () => ({
      fieldCount: fields.length,
      selectedField: selectedField
        ? {
            id: selectedField.id,
            name: selectedField.name,
            crop: selectedField.crop,
            areaHa: selectedField.areaHa
          }
        : null
    }),
    [fields, selectedField]
  );

  const anchorClass = position === "map-left" ? "absolute bottom-16 left-4" : "fixed bottom-4 right-4";

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    saveJson(HISTORY_KEY, nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, context })
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json();
      const reply = data?.reply || "Кешіріңіз, қазір жауап бере алмадым.";
      const finalMessages = [...nextMessages, { role: "assistant", content: reply }];
      setMessages(finalMessages);
      saveJson(HISTORY_KEY, finalMessages);
    } catch {
      const fallbackReply =
        "Қазір сервермен байланыс әлсіз. Алдымен алқапты таңдап, кезеңді қойып, AI талдауды іске қосыңыз.";
      const finalMessages = [...nextMessages, { role: "assistant", content: fallbackReply }];
      setMessages(finalMessages);
      saveJson(HISTORY_KEY, finalMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${anchorClass} z-[1200] flex items-center gap-3 rounded-full border border-[#d8cfb5] bg-[#fff7e8] px-4 py-2 shadow-lg`}
        >
          <img
            src={avatarSrc}
            alt="Chibi assistant"
            onError={() => setAvatarSrc(defaultAvatarUrl)}
            className="h-10 w-10 rounded-full border border-[#e5d5b3] object-cover"
          />
          <span className="text-sm font-semibold text-[#2e3a31]">AI Chibi</span>
          <Bot size={16} className="text-[#d97832]" />
        </button>
      )}

      {open && (
        <section className={`${anchorClass} z-[1200] w-[360px] overflow-hidden rounded-3xl border border-[#d7cfb7] bg-[#fbf6ea] shadow-2xl`}>
          <header className="flex items-center justify-between border-b border-[#e3dbc3] px-4 py-3">
            <div className="flex items-center gap-3">
              <img
                src={avatarSrc}
                alt="Friend chibi"
                onError={() => setAvatarSrc(defaultAvatarUrl)}
                className="h-11 w-11 rounded-full border border-[#d8c7a4] object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-[#243126]">AI ассистент</p>
                <p className="text-xs text-[#6d7568]">Мансур чиби</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-[#5f6a5f] hover:bg-[#f0eadb]">
              <X size={16} />
            </button>
          </header>

          <div className="h-80 overflow-y-auto px-4 py-3">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={`${m.role}-${i}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-[#1f2d26] text-white" : "border border-[#ddd4bc] bg-white text-[#2f3a31]"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-[#ddd4bc] bg-white px-3 py-2 text-xs text-[#5c665a]">
                    <Loader2 size={12} className="animate-spin" />
                    Жауап дайындап жатырмын...
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="border-t border-[#e3dbc3] p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") send();
                }}
                className="w-full rounded-full border border-[#d8cfb5] bg-white px-4 py-2 text-sm text-[#2f3a31] focus:outline-none"
                placeholder="Сұрағыңызды жазыңыз..."
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || !input.trim()}
                className="rounded-full bg-[#d97832] p-2 text-white disabled:opacity-60"
              >
                <Send size={16} />
              </button>
            </div>
          </footer>
        </section>
      )}
    </>
  );
}
