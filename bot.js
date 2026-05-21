import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

// -------------------------------------------------------
// Environment variables stored in Render
// -------------------------------------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Website/data repo
const REPO = "lukage86/dianastreamstatus";
const FILE_PATH = "override.json";
// -------------------------------------------------------

// -------------------------------------------------------
// Tiny web server required for Render Free Web Service
// -------------------------------------------------------
const app = express();

app.get("/", (req, res) => {
  res.send("Diana Discord bot is running.");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});
// -------------------------------------------------------

if (!DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN environment variable.");
  process.exit(1);
}

if (!GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN environment variable.");
  process.exit(1);
}

async function readOverride() {
  try {
    const url = `https://raw.githubusercontent.com/${REPO}/main/${FILE_PATH}?_=${Date.now()}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.log(`Could not read override file. HTTP ${res.status}`);
      return 0;
    }

    const json = await res.json().catch(() => ({ override: 0 }));
    return json.override ?? 0;
  } catch (err) {
    console.error("Error reading override:", err);
    return 0;
  }
}

async function updateGitHub(value) {
  try {
    const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

    const existingRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    const existing = await existingRes.json();

    if (!existing.sha) {
      console.log("ERROR: Could not load SHA from GitHub:", existing);
      return false;
    }

    const newContent = Buffer.from(
      JSON.stringify({ override: value }, null, 2)
    ).toString("base64");

    const result = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Set override to ${value}`,
        content: newContent,
        sha: existing.sha
      })
    });

    const json = await result.json();

    if (!result.ok) {
      console.log("GitHub update failed:", json);
      return false;
    }

    console.log("GitHub update successful:", json.commit?.html_url || json);
    return true;
  } catch (err) {
    console.error("Error updating GitHub:", err);
    return false;
  }
}

function getStatusText(value) {
  switch (value) {
    case 1:
      return "🚨 **Stream is canceled tonight.**";
    case 2:
      return "⚠️ **Stream is unlikely tonight.**";
    case 3:
      return "📝 **Stream status is set to manual.**";
    default:
      return "✅ **Stream is on normal schedule.**";
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds
  ]
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async msg => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith("!stream")) return;

  const command = msg.content.trim().toLowerCase();

  if (command === "!stream cancel") {
    const ok = await updateGitHub(1);
    return msg.reply(ok ? "Override set: **Stream is canceled tonight.**" : "Failed to update GitHub.");
  }

  if (command === "!stream unlikely") {
    const ok = await updateGitHub(2);
    return msg.reply(ok ? "Override set: **Stream is unlikely tonight.**" : "Failed to update GitHub.");
  }

  if (command === "!stream manual") {
    const ok = await updateGitHub(3);
    return msg.reply(ok ? "Override set: **Stream status is set to manual.**" : "Failed to update GitHub.");
  }

  if (command === "!stream clear") {
    const ok = await updateGitHub(0);
    return msg.reply(ok ? "Override cleared — back to normal schedule." : "Failed to update GitHub.");
  }

  if (command === "!stream status") {
    const value = await readOverride();
    const text = getStatusText(value);
    return msg.reply(text);
  }

  return msg.reply(
    "Commands: `!stream status`, `!stream cancel`, `!stream unlikely`, `!stream manual`, `!stream clear`"
  );
});

client.login(DISCORD_TOKEN);
