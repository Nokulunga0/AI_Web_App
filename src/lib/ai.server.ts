/** Server-only helper: calls the AI gateway and returns parsed JSON, or null when no key is configured. */
export async function callAiJson(system: string, user: string): Promise<any | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system + "\nRespond with valid JSON only." },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Too many requests right now. Please wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits are used up. Turn on Demo mode in Settings to keep exploring.");
  if (!res.ok) throw new Error(`The AI service returned an error (${res.status}). Please try again.`);
  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("The AI returned an unexpected response. Please regenerate.");
  return JSON.parse(text.slice(start, end + 1));
}
