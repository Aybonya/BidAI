const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const parseResponseText = (payload) => {
  for (const item of payload?.output || []) {
    for (const chunk of item?.content || []) {
      if (chunk?.type === "output_text" && chunk?.text) {
        return String(chunk.text).trim();
      }
    }
  }
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  throw new Error("OPENAI_TEXT_NOT_FOUND");
};

const buildFallback = ({ userText, context }) => {
  const fieldName = context?.selectedField?.name || "Таңдалмаған алқап";
  const fieldCount = toNum(context?.fieldCount, 0);
  const area = toNum(context?.selectedField?.areaHa, 0);

  if (/есеп|отчет|report/i.test(userText || "")) {
    return `Жақсы, есепті бастайық. Қазір ${fieldCount} алқап бар, белсенді алқап: ${fieldName}. Алдымен кезеңді таңдаңыз (30/90 күн), содан кейін AI талдауды іске қосыңыз.`;
  }

  if (/ndvi|ndmi|ndre|индекс/i.test(userText || "")) {
    return `Индекстер бойынша қысқаша: NDVI - вегетация белсенділігі, NDMI - ылғал күйі, NDRE - ерте стресс белгілері. Белсенді алқап: ${fieldName}${area ? ` (${area} га)` : ""}.`;
  }

  return `Сәлем, мен Мансурдың AI көмекшісімін. Қазір жүйеде ${fieldCount} алқап бар, белсенді алқап: ${fieldName}. Нақты сұрақ жазыңыз: индекс, тәуекел, әрекет жоспары немесе маусым салыстыруы.`;
};

export const generateAssistantReply = async ({ messages = [], context = {} }) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    const lastUser = [...messages].reverse().find((m) => m?.role === "user");
    return {
      reply: buildFallback({ userText: lastUser?.content || "", context }),
      source: "fallback",
      openai: null
    };
  }

  const model = process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || "gpt-4o-mini";
  const trimmedMessages = messages
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1600) }));

  const systemPrompt =
    "Сен DalaSense ішіндегі Мансур AI ассистентісің. Міндет: фермерге пайдалы, нақты, қысқа және әрекетке бағытталған жауап беру. Тіл: тек қазақша. Егер дерек жетіспесе, оны ашық айт. Индекстерді (NDVI/NDMI/NDRE), тәуекелдерді және келесі қадамдарды түсіндір.";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ context, messages: trimmedMessages }) }
      ],
      max_output_tokens: 700
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OPENAI_HTTP_${response.status}: ${errText}`);
  }

  const payload = await response.json();
  const reply = parseResponseText(payload);
  return {
    reply,
    source: "openai",
    openai: {
      requestId: payload?.id || null,
      usage: payload?.usage || null
    }
  };
};

export const safeAssistantReply = async (args) => {
  try {
    return await generateAssistantReply(args);
  } catch (error) {
    const lastUser = [...(args?.messages || [])].reverse().find((m) => m?.role === "user");
    return {
      reply: buildFallback({ userText: lastUser?.content || "", context: args?.context || {} }),
      source: "fallback",
      openai: null,
      error: String(error?.message || error)
    };
  }
};
