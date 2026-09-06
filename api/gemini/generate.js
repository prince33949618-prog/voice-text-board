function extractGeminiText(data) {
  const directText = data?.output_text || data?.outputText || data?.text || data?.interaction?.output_text || data?.interaction?.outputText;
  if (directText?.trim()) return directText.trim();
  const candidateText = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (candidateText) return candidateText;
  const outputText = data?.outputs
    ?.flatMap((output) => Array.isArray(output.content) ? output.content : output.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
  return outputText || "";
}

async function fetchWithTimeout(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const apiKey = String(body.apiKey || "").trim();
    const model = String(body.model || "gemini-2.5-flash-lite").trim();
    const prompt = String(body.prompt || "").trim();
    const maxOutputTokens = Math.max(40, Math.min(Number(body.maxOutputTokens || 900), 3000));
    const temperature = Math.max(0, Math.min(Number(body.temperature ?? 0.25), 1));

    if (!apiKey) {
      res.status(400).json({ error: "Missing Gemini API key" });
      return;
    }
    if (!prompt) {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }

    const generateResponse = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens }
      })
    });
    const generateData = await generateResponse.json();
    if (generateResponse.ok) {
      const text = extractGeminiText(generateData);
      if (text) {
        res.status(200).json({ text });
        return;
      }
    }

    const interactionResponse = await fetchWithTimeout("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        model,
        input: prompt,
        generation_config: { temperature, max_output_tokens: maxOutputTokens }
      })
    });
    const interactionData = await interactionResponse.json();
    if (!interactionResponse.ok) {
      const message = generateData?.error?.message || interactionData?.error?.message || "Gemini API request failed";
      res.status(interactionResponse.status || generateResponse.status || 500).json({ error: message });
      return;
    }

    const text = extractGeminiText(interactionData);
    if (!text) {
      res.status(502).json({ error: "Gemini returned an empty response" });
      return;
    }
    res.status(200).json({ text });
  } catch (error) {
    const message = error?.name === "AbortError" ? "Gemini request timed out" : error?.message || "Server error";
    res.status(500).json({ error: message });
  }
}
