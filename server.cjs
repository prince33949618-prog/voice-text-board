const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 5173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function readRequestBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

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

function fetchWithTimeout(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function handleGeminiGenerate(req, res) {
  try {
    const rawBody = await readRequestBody(req);
    const body = JSON.parse(rawBody || "{}");
    const apiKey = String(body.apiKey || "").trim();
    const model = String(body.model || "gemini-2.5-flash-lite").trim();
    const prompt = String(body.prompt || "").trim();
    const maxOutputTokens = Math.max(40, Math.min(Number(body.maxOutputTokens || 900), 3000));
    const temperature = Math.max(0, Math.min(Number(body.temperature ?? 0.25), 1));

    if (!apiKey) {
      send(res, 400, JSON.stringify({ error: "Missing Gemini API key" }), "application/json; charset=utf-8");
      return;
    }
    if (!prompt) {
      send(res, 400, JSON.stringify({ error: "Missing prompt" }), "application/json; charset=utf-8");
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
        send(res, 200, JSON.stringify({ text }), "application/json; charset=utf-8");
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
      send(res, interactionResponse.status || generateResponse.status, JSON.stringify({ error: message }), "application/json; charset=utf-8");
      return;
    }
    const text = extractGeminiText(interactionData);
    if (!text) {
      send(res, 502, JSON.stringify({ error: "Gemini returned an empty response" }), "application/json; charset=utf-8");
      return;
    }
    send(res, 200, JSON.stringify({ text }), "application/json; charset=utf-8");
  } catch (error) {
    const message = error.name === "AbortError" ? "Gemini request timed out" : error.message || "Server error";
    send(res, 500, JSON.stringify({ error: message }), "application/json; charset=utf-8");
  }
}

http
  .createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/gemini/generate" && req.method === "POST") {
      handleGeminiGenerate(req, res);
      return;
    }
    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.normalize(path.join(root, requested));

    if (!filePath.startsWith(root)) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        fs.readFile(path.join(root, "index.html"), (fallbackError, fallbackData) => {
          if (fallbackError) send(res, 404, "Not found");
          else send(res, 200, fallbackData, mimeTypes[".html"]);
        });
        return;
      }

      send(res, 200, data, mimeTypes[path.extname(filePath)] || "application/octet-stream");
    });
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Voice Text Board is available at http://127.0.0.1:${port}/`);
  });
