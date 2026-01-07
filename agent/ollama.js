import fetch from "node-fetch";

export async function callOllama(prompt) {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3", prompt, stream: false })
    });

    const text = await res.text();

    try {
      const data = JSON.parse(text);
      if (typeof data === "string") return data;
      if (data.response) return data.response;
      if (data.choices && data.choices[0] && data.choices[0].message) return data.choices[0].message.content;
      if (data.output && typeof data.output === "string") return data.output;
      return JSON.stringify(data);
    } catch (e) {
      return text;
    }
  } catch (err) {
    return JSON.stringify({
      intent: "SEARCH",
      domain: "general",
      options: [{ name: "Example", url: "https://example.com" }],
      guidance: "Could not reach Ollama; returned fallback data."
    });
  }
}
