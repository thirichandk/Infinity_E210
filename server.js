import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { resolveIntent } from "./agent/intentResolver.js";
import { generateGuide } from "./agent/guideGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "ui")));

app.post("/resolve", async (req, res) => {
  try {
    const { wish } = req.body;
    const result = await resolveIntent(wish);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/guide', async (req, res) => {
  try {
    const { wish, option } = req.body;
    const goal = { wish };
    const siteData = option || {};
    const guide = await generateGuide(goal, siteData);
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Intent Guide Agent running at http://127.0.0.1:${PORT}`);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    const alt = PORT + 1;
    console.warn(`Port ${PORT} in use — retrying on ${alt}`);
    app.listen(alt, HOST, () => console.log(`✅ Intent Guide Agent running at http://127.0.0.1:${alt}`));
  } else {
    console.error(err);
    process.exit(1);
  }
});
