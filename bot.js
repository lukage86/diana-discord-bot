import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

// -------------------------------------------------------
// Tokens are securely stored in Replit Secrets
// -------------------------------------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const REPO = "lukage86/dianastreamstatus";
const FILE_PATH = "override.json";
// -------------------------------------------------------

async function readOverride() {
  // ✅ FIXED RAW URL — added cache buster & removed invalid ref path
  const url = `https://raw.githubusercontent.com/${REPO}/main/${FILE_PATH}?_=${Date.now()}`;

  const res = await fetch(url);
  const json = await res.json().catch(() => ({ override: 0 }));

  return json.override ?? 0;
}

async function updateGitHub(value) {
  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  // Step 1: fetch existing file to get SHA
  const existing = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  }).then(res => res.json());

  if (!existing.sha) {
    console.log("❌ ERROR: Could not load SHA from GitHub:", existing);
    return;
  }

  // Step 2: encode new JSON
  const newContent = Buffer.from(
    JSON.stringify({ override: value }, null, 2)
  ).toString("base64");

  // Step 3: PUT update
  const result = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
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
  console.log("GitHub Response:", json);
}

function getStatusText(value) {
  switch (value) {
    case 1: return "🚨 **Stream is canceled tonight.**";
    case 2: return "⚠️ **Stream is unlikely tonight.**";
    case 3: return "📝 **Stream status is set to manual.**";
    default: return "✅ **Stream is on normal schedule.**";
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
  if (!msg.content.startsWith("!stream")) return;

  if (msg.content === "!stream cancel") {
    await updateGitHub(1);
    msg.reply("Override set: **Stream is canceled tonight.**");
  }

  else if (msg.content === "!stream unlikely") {
    await updateGitHub(2);
    msg.reply("Override set: **Stream is unlikely tonight.**");
  }

  else if (msg.content === "!stream manual") {
    await updateGitHub(3);
    msg.reply("Override set: **Stream status is set to manual.**");
  }

  else if (msg.content === "!stream clear") {
    await updateGitHub(0);
    msg.reply("Override cleared — back to normal schedule.");
  }

  else if (msg.content === "!stream status") {
    const value = await readOverride();
    const text = getStatusText(value);
    msg.reply(text);
  }
});

client.login(DISCORD_TOKEN);
