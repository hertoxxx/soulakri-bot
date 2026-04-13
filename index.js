// ============================================================
//  SOULAKRI BOT v13 — discord.js v14
// ============================================================

require("dotenv").config();
const fs   = require("fs");
const path = require("path");  
const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, ButtonBuilder, ButtonStyle,  
  ActionRowBuilder, SlashCommandBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  REST, Routes, ChannelType, PermissionFlagsBits,
  AttachmentBuilder,
} = require("discord.js");

const sodium = require("libsodium-wrappers");
sodium.ready.then(() => console.log("[Audio] libsodium prêt ✅"));

const mongoose = require("mongoose");

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connecté !"))
  .catch(err => console.error("❌ MongoDB erreur :", err));

// ── Schemas ──
const XPSchema = new mongoose.Schema({
  userId:   { type: String, required: true, unique: true },
  xp:       { type: Number, default: 0 },
  level:    { type: Number, default: 1 },
  messages: { type: Number, default: 0 },
});

const WarnSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  warns:  { type: Array, default: [] },
});

const BlagueSchema = new mongoose.Schema({
  joke:   String,
  answer: String,
});

const BirthdaySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  date:   String,
});

const ConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  config:  { type: Object, default: {} },
});

const ObjectifSchema = new mongoose.Schema({
  guildId:   { type: String, required: true, unique: true },
  texte:     { type: String, default: "Aucun objectif défini." },
  updatedBy: { type: String, default: null },
  updatedAt: { type: Number, default: null },
});

const BedrockSchema = new mongoose.Schema({
  guildId:   { type: String, required: true, unique: true },
  ip:        { type: String, default: "" },
  port:      { type: String, default: "" },
  updatedAt: { type: Number, default: null },
});

const GiveawaySchema = new mongoose.Schema({
  giveawayId: { type: String, required: true, unique: true },
  data:       { type: Object, default: {} },
});

// ── Models ──
const XPModel       = mongoose.model("XP",       XPSchema);
const WarnModel     = mongoose.model("Warn",     WarnSchema);
const BlagueModel   = mongoose.model("Blague",   BlagueSchema);
const BirthdayModel = mongoose.model("Birthday", BirthdaySchema);
const ConfigModel   = mongoose.model("Config",   ConfigSchema);
const ObjectifModel = mongoose.model("Objectif", ObjectifSchema);
const BedrockModel  = mongoose.model("Bedrock",  BedrockSchema);
const GiveawayModel = mongoose.model("Giveaway", GiveawaySchema);

// ============================================================
//  CONFIG
// ============================================================

process.env.FFMPEG_PATH = require("ffmpeg-static");
const C = {
  GUILD_ID:           "1487136081152577556",
  CHANNEL_REGLEMENT:  "1487136083627086010",
  CHANNEL_BIENVENUE:  "1487136083627086009",
  CHANNEL_LOGS:       "1487136083132284951",
  CHANNEL_ROLES:      "1487136083627086011",
  CHANNEL_MATHS:      "1487136084986040467",
  CHANNEL_BEDROCK:    "1487136084214157382",
  CHANNEL_DESCAMPS:   "1492215799522263111",
  CHANNEL_TARNEC:     "1492216229178380419",
  CHANNEL_OBJECTIF:   "1489929567505485954",

  ROLE_JOUEUR:       "1489335006290776174",
  ROLE_NON_VERIFIE:  "1489335084568936498",
  ROLE_ADMIN:        "1487136081198448730",
  ROLE_MOD:          "1487136081198448729",
  ROLE_BUILDER:      "1489909890246905866",
  ROLE_PVP:          "1489909976070750279",
  ROLE_SURVIE:       "1489910021876875354",
  ROLE_NOTIFS:       "1489910094287077466",

  MC_IP:         "soulakri.falix.gg",
  MC_PORT:       "22608",
  FALIX_SERVER:  "2870153",

  LOGO_URL: "https://i.imgur.com/igybOpU.png",
  FOOTER:   "Soulakri • Survie & Fun Crossplay",

  BLUE:   0x5DADE2,
  GOLD:   0xF4D03F,
  RED:    0xE74C3C,
  GREEN:  0x2ECC71,
  PURPLE: 0x9B59B6,
  ORANGE: 0xE67E22,
  DARK:   0x2C3E50,
  CYAN:   0x1ABC9C,
  PINK:   0xFF69B4,

  XP_MIN:         15,
  XP_MAX:         40,
  XP_COOLDOWN_MS: 60_000,

  VITTEL_INTERVAL_MS: 5 * 60 * 1000,
  VITTEL_TIMEOUT_MS:  60 * 1000,

  SOUNDS_BASE: "https://raw.githubusercontent.com/hertoxxx/soulakri-bot/main/sounds",

  MAX_WARNS:    3,
  TOP_PAGE_SIZE: 10,
};

// ============================================================
//  CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.GuildMember],
});

const TOKEN = process.env.DISCORD_TOKEN;

// ============================================================
//  XP
// ============================================================

const XP_FILE = "./xp_data.json";
function loadXP() {
  if (!fs.existsSync(XP_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(XP_FILE, "utf8")); } catch { return {}; }
}
function saveXP(data) { fs.writeFileSync(XP_FILE, JSON.stringify(data, null, 2)); }

let xpData = loadXP();
const xpCooldowns = new Map();

function getUser(userId) {
  if (!xpData[userId]) xpData[userId] = { xp: 0, level: 1, messages: 0 };
  return xpData[userId];
}
function xpForLevel(level) { return Math.floor(100 * Math.pow(level, 1.5)); }
function progressBar(current, max, length = 12) {
  const filled = Math.min(Math.round((current / max) * length), length);
  return "▰".repeat(filled) + "▱".repeat(length - filled);
}
function addXP(userId, amount) {
  const user = getUser(userId);
  user.xp += amount;
  user.messages += 1;
  let leveledUp = false;
  while (user.xp >= xpForLevel(user.level)) {
    user.xp -= xpForLevel(user.level);
    user.level += 1;
    leveledUp = true;
  }
  saveXP(xpData);
  return { user, leveledUp };
}

// ============================================================
//  WARNS
// ============================================================

const WARNS_FILE = "./warns.json";
function loadWarns() {
  if (!fs.existsSync(WARNS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(WARNS_FILE, "utf8")); } catch { return {}; }
}
function saveWarns(data) { fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2)); }

function getWarns(userId) {
  const data = loadWarns();
  return data[userId] || [];
}
function addWarn(userId, moderatorId, raison) {
  const data = loadWarns();
  if (!data[userId]) data[userId] = [];
  const warn = { id: Date.now(), moderatorId, raison, date: Date.now() };
  data[userId].push(warn);
  saveWarns(data);
  return data[userId];
}
function clearWarns(userId) {
  const data = loadWarns();
  data[userId] = [];
  saveWarns(data);
}
function removeWarn(userId, warnId) {
  const data = loadWarns();
  if (!data[userId]) return false;
  const before = data[userId].length;
  data[userId] = data[userId].filter(w => w.id !== warnId);
  saveWarns(data);
  return data[userId].length < before;
}

// ============================================================
//  BLAGUES (persistantes)
// ============================================================

const BLAGUES_FILE = "./blagues.json";
const BLAGUES_DEFAULT = [
  { joke: "Pourquoi Creeper est toujours seul ?",               answer: "Parce qu'il fait exploser toutes ses relations ! 💥" },
  { joke: "Comment s'appelle un joueur Minecraft qui pleure ?", answer: "Un mineur en larmes ! ⛏️" },
  { joke: "Quel est le sport préféré des Endermen ?",           answer: "La téléportation marathon ! 🏃" },
  { joke: "Pourquoi Steve ne sourit jamais ?",                  answer: "Parce qu'il a perdu ses diamonds dans la lave ! 💎" },
  { joke: "Pourquoi les Zombies n'aiment pas le soleil ?",      answer: "Parce qu'il leur tape sur les nerfs… et sur la peau ! ☀️" },
];

function loadBlagues() {
  if (!fs.existsSync(BLAGUES_FILE)) { saveBlagues(BLAGUES_DEFAULT); return [...BLAGUES_DEFAULT]; }
  try { return JSON.parse(fs.readFileSync(BLAGUES_FILE, "utf8")); } catch { return [...BLAGUES_DEFAULT]; }
}
function saveBlagues(data) { fs.writeFileSync(BLAGUES_FILE, JSON.stringify(data, null, 2)); }

// ============================================================
//  CONFIG BOT
// ============================================================

const BOT_CONFIG_FILE = "./bot_config.json";
const DEFAULT_CONFIG = {
  descamps: {
    enabled: true,
    interval_minutes: 60,
    channel: C.CHANNEL_DESCAMPS,
  },
  tarnec: {
    enabled: true,
    interval_minutes: 90,
    channel: C.CHANNEL_TARNEC,
    theme: "L'Inde",
  },
  vittel: {
    enabled: true,
    interval_minutes: 5,
    channel: C.CHANNEL_MATHS,
    theme: "Mathématiques",
  },
  statserveur_auto: false,
  statserveur_interval_minutes: 10,
  statserveur_channel: null,
};

function loadConfig() {
  if (!fs.existsSync(BOT_CONFIG_FILE)) { saveConfig(DEFAULT_CONFIG); return DEFAULT_CONFIG; }
  try {
    const saved = JSON.parse(fs.readFileSync(BOT_CONFIG_FILE, "utf8"));
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      descamps: { ...DEFAULT_CONFIG.descamps, ...saved.descamps },
      tarnec:   { ...DEFAULT_CONFIG.tarnec,   ...saved.tarnec   },
      vittel:   { ...DEFAULT_CONFIG.vittel,   ...saved.vittel   },
    };
  } catch { return DEFAULT_CONFIG; }
}
function saveConfig(data) { fs.writeFileSync(BOT_CONFIG_FILE, JSON.stringify(data, null, 2)); }

// ============================================================
//  GIVEAWAYS
// ============================================================

const GIVEAWAY_FILE = "./giveaways.json";
function loadGiveaways() {
  if (!fs.existsSync(GIVEAWAY_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(GIVEAWAY_FILE, "utf8")); } catch { return {}; }
}
function saveGiveaways(data) { fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(data, null, 2)); }

// ============================================================
//  DODGE SYSTEM
// ============================================================

const dodgeWindows = new Map();
function setDodgeWindow(userId, commandName, durationMs = 10_000) {
  dodgeWindows.set(userId, { commandName, expiresAt: Date.now() + durationMs });
}
function canDodge(userId) {
  const w = dodgeWindows.get(userId);
  if (!w) return null;
  if (Date.now() > w.expiresAt) { dodgeWindows.delete(userId); return null; }
  dodgeWindows.delete(userId);
  return w;
}

// ============================================================
//  ANNIVERSAIRES
// ============================================================

const BIRTHDAY_FILE = "./birthdays.json";
function loadBirthdays() {
  if (!fs.existsSync(BIRTHDAY_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(BIRTHDAY_FILE, "utf8")); } catch { return {}; }
}
function saveBirthdays(data) { fs.writeFileSync(BIRTHDAY_FILE, JSON.stringify(data, null, 2)); }

// ============================================================
//  UTILS
// ============================================================

function makeEmbed({ color, title, description, fields = [], thumbnail, image, author } = {}) {
  const e = new EmbedBuilder()
    .setColor(color ?? C.BLUE)
    .setFooter({ text: C.FOOTER, iconURL: C.LOGO_URL })
    .setTimestamp();
  if (title)       e.setTitle(title);
  if (description) e.setDescription(description);
  if (thumbnail)   e.setThumbnail(thumbnail);
  if (image)       e.setImage(image);
  if (author)      e.setAuthor(typeof author === "string" ? { name: author, iconURL: C.LOGO_URL } : author);
  if (fields.length) e.addFields(fields);
  return e;
}

async function logAction(guild, { title, description, color, fields = [] }) {
  try {
    const ch = guild.channels.cache.get(C.CHANNEL_LOGS);
    if (!ch) return;
    await ch.send({ embeds: [makeEmbed({ color, title, description, fields })] });
  } catch {}
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}j ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}min`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

// ============================================================
//  AUDIO VOCAL (@discordjs/voice)
// ============================================================

let voiceAvailable = false;
let voiceLib = null;

try {
  voiceLib = require("@discordjs/voice");
  voiceAvailable = true;
} catch {
  console.warn("[Audio] @discordjs/voice non installé — commandes vocales désactivées.");
}

const SOUNDS = {
  bakri: `${C.SOUNDS_BASE}/bakri.mp3`,
  naim:  `${C.SOUNDS_BASE}/naim.mp3`,
};

async function playInVoice(member, soundUrl) {
  if (!voiceAvailable) return { ok: false, reason: "library_missing" };
  const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = voiceLib;

  const voiceChannel = member.voice?.channel;
  if (!voiceChannel) return { ok: false, reason: "not_in_voice" };

  let connection;
  try {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);

    // ✅ FIX : fetch le fichier et passer un stream lisible
    const res = await fetch(soundUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { Readable } = require("stream");
    const webStream = res.body;
    const nodeStream = Readable.fromWeb(webStream);

    const player   = createAudioPlayer();
    const resource = createAudioResource(nodeStream);
    player.play(resource);
    connection.subscribe(player);

    await entersState(player, AudioPlayerStatus.Idle, 30_000);
    connection.destroy();
    return { ok: true };
  } catch (err) {
    connection?.destroy();
    return { ok: false, reason: "error", message: err.message };
  }
}

async function sendMp3Attachment(interaction, soundKey, filename) {
  try {
    const url = SOUNDS[soundKey];
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return new AttachmentBuilder(buffer, { name: filename || `${soundKey}.mp3` });
  } catch { return null; }
}

// ============================================================
//  API MINECRAFT
// ============================================================

async function getServerData() {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${C.MC_IP}:${C.MC_PORT}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ============================================================
//  BEDROCK
// ============================================================

const BEDROCK_FILE = "./bedrock.json";
function loadBedrock() {
  if (!fs.existsSync(BEDROCK_FILE)) return { ip: "", port: "", updatedAt: null };
  try { return JSON.parse(fs.readFileSync(BEDROCK_FILE, "utf8")); } catch { return { ip: "", port: "", updatedAt: null }; }
}
function saveBedrock(data) { fs.writeFileSync(BEDROCK_FILE, JSON.stringify(data, null, 2)); }

function getFalixHeaders() {
  return {
    "Content-Type": "application/json",
    "Cookie": process.env.FALIX_SESSION || "",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://client.falixnodes.net",
    "Referer": `https://client.falixnodes.net/server/${C.FALIX_SERVER}/subdomains`,
  };
}

async function getFalixNetworkInfo() {
  try {
    const res = await fetch(
      `https://client.falixnodes.net/api/v1/servers/${C.FALIX_SERVER}/network/ports`,
      { headers: getFalixHeaders() }
    );
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "cookie_expired" };
    if (!res.ok) return { ok: false, reason: "http_error", status: res.status };
    const json = await res.json();
    const primary = json.ports?.find(p => p.primary === true);
    if (!primary) return { ok: false, reason: "no_primary_port" };
    return { ok: true, ip: primary.ip, port: String(primary.port) };
  } catch (err) { return { ok: false, reason: "error", message: err.message }; }
}

async function checkBedrockPort() {
  try {
    const networkResult = await getFalixNetworkInfo();
    if (!networkResult.ok) {
      if (networkResult.reason === "cookie_expired") {
        console.warn("[Bedrock] Cookie expiré.");
        const guild = client.guilds.cache.get(C.GUILD_ID);
        const logCh = guild?.channels.cache.get(C.CHANNEL_LOGS);
        if (logCh) {
          const adminRole = guild.roles.cache.get(C.ROLE_ADMIN);
          await logCh.send({ content: adminRole ? `${adminRole}` : "", embeds: [makeEmbed({ color: C.RED, title: "⚠️ Cookie FalixNodes expiré", description: "Utilise `/set-cookie`" })] });
        }
      }
      return;
    }
    const { ip: newIP, port: newPort } = networkResult;
    const current = loadBedrock();
    if (current.port && current.ip === newIP && current.port === newPort) return;
    console.log(`[Bedrock] Changement : ${current.port || "inconnu"} → ${newPort}`);
    saveBedrock({ ip: newIP, port: newPort, updatedAt: Date.now() });
    const guild = client.guilds.cache.get(C.GUILD_ID);
    if (!guild) return;
    await postBedrockMessage(newIP, newPort);
    const logCh = guild.channels.cache.get(C.CHANNEL_LOGS);
    if (logCh) {
      const adminRole = guild.roles.cache.get(C.ROLE_ADMIN);
      await logCh.send({ content: adminRole ? `${adminRole}` : "", embeds: [makeEmbed({ color: C.ORANGE, title: "⚠️ Port Bedrock changé", description: `**Ancien :** \`${current.port || "inconnu"}\`\n**Nouveau :** \`${newPort}\`\n**IP :** \`${newIP}\`\n\n🔄 Redémarre le serveur MC sur FalixNodes.` })] });
    }
  } catch (err) { console.error("[Bedrock] Erreur :", err); }
}

async function postBedrockMessage(ip, port) {
  try {
    const guild = client.guilds.cache.get(C.GUILD_ID);
    const bedrockCh = guild?.channels.cache.get(C.CHANNEL_BEDROCK);
    if (!bedrockCh) return;
    const embed = makeEmbed({
      color: C.GREEN, title: "📱 Connexion Bedrock — Soulakri", thumbnail: C.LOGO_URL,
      description: "Infos pour rejoindre depuis **Minecraft Bedrock** ✅",
      fields: [
        { name: "📡 Adresse IP", value: `\`\`\`${ip}\`\`\``,   inline: false },
        { name: "🔌 Port",       value: `\`\`\`${port}\`\`\``, inline: false },
        { name: "⚠️ Info",       value: "Change à chaque redémarrage du serveur MC.", inline: false },
        { name: "📅 Mis à jour", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      ],
    });
    const pins  = await bedrockCh.messages.fetchPinned();
    const myPin = pins.find(m => m.author.id === client.user.id);
    if (myPin) { await myPin.edit({ embeds: [embed] }); }
    else { const msg = await bedrockCh.send({ embeds: [embed] }); await msg.pin().catch(() => {}); }
  } catch (err) { console.error("[Bedrock] postBedrockMessage :", err); }
}

async function startBedrockWatcher() {
  const cached = loadBedrock();
  if (cached.port) await postBedrockMessage(cached.ip || C.MC_IP, cached.port);
  await checkBedrockPort();
  setInterval(checkBedrockPort, 30 * 60 * 1000);
}

// ============================================================
//  OBJECTIF
// ============================================================

const OBJECTIF_FILE = "./objectif.json";
function loadObjectif() {
  if (!fs.existsSync(OBJECTIF_FILE)) return { texte: "Aucun objectif défini.", updatedBy: null, updatedAt: null };
  try { return JSON.parse(fs.readFileSync(OBJECTIF_FILE, "utf8")); } catch { return { texte: "Aucun objectif défini.", updatedBy: null, updatedAt: null }; }
}
function saveObjectif(data) { fs.writeFileSync(OBJECTIF_FILE, JSON.stringify(data, null, 2)); }

async function updateObjectifChannel(guild, obj) {
  try {
    const ch = guild.channels.cache.get(C.CHANNEL_OBJECTIF);
    if (!ch) return;
    const embed = makeEmbed({
      color:       C.GOLD,
      title:       "🎯 Objectif actuel — Soulakri",
      description: `> ${obj.texte}`,
      thumbnail:   C.LOGO_URL,
      fields:      obj.updatedBy
        ? [{ name: "✏️ Mis à jour par", value: `<@${obj.updatedBy}>`, inline: true }, { name: "📅 Le", value: `<t:${Math.floor(obj.updatedAt / 1000)}:D>`, inline: true }]
        : [],
    });
    const pins  = await ch.messages.fetchPinned().catch(() => null);
    const myPin = pins?.find(m => m.author.id === client.user.id);
    if (myPin) { await myPin.edit({ embeds: [embed] }); }
    else { const msg = await ch.send({ embeds: [embed] }); await msg.pin().catch(() => {}); }
  } catch (err) { console.error("[Objectif] updateObjectifChannel :", err); }
}

// ============================================================
//  VITTEL BOT
// ============================================================

let vittelActive = null;
let vittelTimer  = null;

function generateMathQuestion() {
  const types = [
    () => {
      const a = [6, 7, 66, 77, 67, 76][Math.floor(Math.random() * 6)];
      const b = [6, 7, 6, 7, 6, 7][Math.floor(Math.random() * 6)];
      const ops = ["+", "-", "×"], op = ops[Math.floor(Math.random() * ops.length)];
      const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
      return { question: `${a} ${op} ${b} = ?`, answer: String(answer) };
    },
    () => {
      const vars = ["v", "b", "s"], vn = vars[Math.floor(Math.random() * vars.length)];
      const x = Math.floor(Math.random() * 7) + 1, b = [6, 7, 6, 7, 14, 12][Math.floor(Math.random() * 6)];
      return { question: `${vn} + ${b} = ${x + b}, que vaut ${vn} ?`, answer: String(x) };
    },
    () => {
      const vars = ["v", "b", "s"], vn = vars[Math.floor(Math.random() * vars.length)];
      const factor = [6, 7][Math.floor(Math.random() * 2)], x = Math.floor(Math.random() * 6) + 1;
      return { question: `${factor}${vn} = ${x * factor}, que vaut ${vn} ?`, answer: String(x) };
    },
    () => {
      const vars = ["v", "b", "s"], vn = vars[Math.floor(Math.random() * vars.length)];
      const threshold = [6, 7, 12, 14][Math.floor(Math.random() * 4)];
      return { question: `${vn} < ${threshold} — donne un exemple de valeur possible pour ${vn}`, answer: null, checkFn: (r) => { const n = parseInt(r); return !isNaN(n) && n >= 0 && n < threshold; }, hint: `(entier entre 0 et ${threshold - 1})` };
    },
    () => {
      const pad = n => String(n).padStart(2, "0");
      const h = [6, 7][Math.floor(Math.random() * 2)], m = [0, 6, 7, 12, 30, 42][Math.floor(Math.random() * 6)];
      const addM = [6, 7, 30, 60][Math.floor(Math.random() * 4)], tot = h * 60 + m + addM;
      return { question: `Il est ${pad(h)}h${pad(m)}. Dans ${addM} min, quelle heure sera-t-il ?`, answer: `${pad(Math.floor(tot / 60) % 24)}h${pad(tot % 60)}`, altAnswer: `${pad(Math.floor(tot / 60) % 24)}:${pad(tot % 60)}` };
    },
  ];
  return types[Math.floor(Math.random() * types.length)]();
}

async function runVittelQuestion(channel) {
  if (vittelActive) return;
  const q = generateMathQuestion();
  await channel.send({ embeds: [makeEmbed({
    color: 0x00BFFF,
    author: { name: "Vittel BOT", iconURL: C.LOGO_URL },
    title: "🧮 Question mathématique !",
    description: `**${q.question}**\n\n⏱️ Vous avez **60 secondes** pour répondre !`,
  }).setFooter({ text: "Tapez votre réponse directement dans ce salon" })] });

  const collector = channel.createMessageCollector({ filter: m => !m.author.bot, time: C.VITTEL_TIMEOUT_MS });
  vittelActive = { q, collector };

  collector.on("collect", async (m) => {
    const resp = m.content.trim().toLowerCase().replace(/\s/g, "");
    let correct = false;
    if (q.checkFn) { correct = q.checkFn(resp); }
    else {
      const expected = String(q.answer).toLowerCase().replace(/\s/g, "");
      const alt = q.altAnswer ? String(q.altAnswer).toLowerCase().replace(/\s/g, "") : null;
      correct = resp === expected || (alt && resp === alt);
    }
    if (correct) {
      await channel.send({ embeds: [makeEmbed({ color: C.GREEN, author: { name: "Vittel BOT", iconURL: C.LOGO_URL }, title: "✅ Correct !", description: `**${m.author}** a trouvé ! 🎉\n📌 Réponse : **${q.checkFn ? resp : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}` })] });
      collector.stop("answered");
    } else {
      await channel.send({ embeds: [makeEmbed({ color: C.RED, author: { name: "Vittel BOT", iconURL: C.LOGO_URL }, title: "❌ Faux !", description: `${m.author}, **${m.content}** est incorrect. Réessaie ! 💪` })] });
    }
  });

  collector.on("end", async (_, reason) => {
    vittelActive = null;
    if (reason !== "answered") {
      await channel.send({ embeds: [makeEmbed({ color: C.ORANGE, author: { name: "Vittel BOT", iconURL: C.LOGO_URL }, title: "⏰ Temps écoulé !", description: `Réponse : **${q.checkFn ? "voir énoncé" : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}` })] }).catch(() => {});
    }
  });
}

function startVittelBot() {
  if (vittelTimer) clearInterval(vittelTimer);
  const cfg = loadConfig();
  if (!cfg.vittel.enabled) return;

  vittelTimer = setInterval(async () => {
    try {
      const cfgNow  = loadConfig();
      if (!cfgNow.vittel.enabled) return;
      const guild   = client.guilds.cache.get(C.GUILD_ID);
      const channel = guild?.channels.cache.get(cfgNow.vittel.channel || C.CHANNEL_MATHS);
      if (channel) await runVittelQuestion(channel);
    } catch (err) { console.error("Vittel BOT erreur :", err); }
  }, (cfg.vittel.interval_minutes || 5) * 60 * 1000);

  console.log(`[Vittel BOT] Démarré — toutes les ${cfg.vittel.interval_minutes} min`);
}

// ============================================================
//  DESCAMPS BOT
// ============================================================

const DESCAMPS_ANECDOTES = [
  { title: "💡 Valeur d'usage vs Valeur d'échange", content: "Un pain maison a une **valeur d'usage** (tu peux le manger) mais zéro valeur d'échange si personne ne veut l'acheter. Descamps dirait : *'C'est pas parce que c'est utile que ça se vend !'* 🥖" },
  { title: "📊 La loi de l'offre et de la demande selon Descamps", content: "Quand Descamps sort son cours, la **demande** d'attention s'effondre. L'**offre** de bâillements, elle, explose. Équilibre atteint. 📉😴" },
  { title: "🏦 Le PIB — Produit Intérieur Brut", content: "Le PIB mesure la richesse produite sur un territoire en un an. Mais attention : si tu casses ta voiture et la répares, ça AUGMENTE le PIB. Descamps trouve ça *fascinant*. 🚗💥" },
  { title: "⚖️ Justice sociale et inégalités", content: "En SES, on distingue **égalité** (tout le monde reçoit pareil) et **équité** (chacun reçoit selon ses besoins). Descamps préfère l'équité… surtout pour les notes. 📝" },
  { title: "🌍 Mondialisation — Descamps style", content: "La mondialisation, c'est des échanges à l'échelle mondiale. En clair : ton téléphone est conçu aux USA, fabriqué en Chine, avec des matières premières africaines. Descamps appelle ça la **Division Internationale du Travail**. 🌐" },
  { title: "💰 Le marché du travail", content: "Sur le marché du travail, l'employeur est du côté de la **demande** (il demande du boulot), le salarié est du côté de l'**offre**. Contre-intuitif, mais Descamps adore te piéger là-dessus. 😈" },
  { title: "📈 La croissance économique", content: "Croissance ≠ développement ! On peut avoir une croissance forte avec des inégalités qui explosent. C'est tout le débat entre **IDH** et **PIB**. Descamps en fait tout un fromage. 🧀" },
  { title: "🏛️ L'État-Providence selon Descamps", content: "L'État-Providence protège les citoyens : sécu, chomage, retraite... Mais est-ce soutenable ? Descamps pose la question chaque année sans jamais vraiment répondre. 🤷" },
];

let descampsAnecdoteIndex = 0;
let descampsTimer = null;

function startDescampsBot() {
  const cfg = loadConfig();
  if (!cfg.descamps.enabled) return;
  if (descampsTimer) clearInterval(descampsTimer);

  descampsTimer = setInterval(async () => {
    try {
      const cfgNow  = loadConfig();
      if (!cfgNow.descamps.enabled) return;
      const guild   = client.guilds.cache.get(C.GUILD_ID);
      const channel = guild?.channels.cache.get(cfgNow.descamps.channel || C.CHANNEL_DESCAMPS);
      if (!channel) return;
      const anecdote = DESCAMPS_ANECDOTES[descampsAnecdoteIndex % DESCAMPS_ANECDOTES.length];
      descampsAnecdoteIndex++;
      await channel.send({ embeds: [makeEmbed({
        color:       0xE67E22,
        author:      { name: "Descamps BOT 📚", iconURL: C.LOGO_URL },
        title:       `📖 ${anecdote.title}`,
        description: anecdote.content,
        fields:      [{ name: "📚 Matière", value: "`SES — Sciences Économiques et Sociales`", inline: true }],
      })] });
    } catch (err) { console.error("[Descamps BOT] Erreur :", err); }
  }, cfg.descamps.interval_minutes * 60 * 1000);

  console.log(`[Descamps BOT] Démarré — toutes les ${cfg.descamps.interval_minutes} min`);
}

// ============================================================
//  LETARNEC BOT
// ============================================================

const TARNEC_FACTS = {
  "L'Inde": [
    "🇮🇳 L'Inde est la **1ère démocratie** du monde avec 1,4 milliard d'habitants — elle a dépassé la Chine en 2023 ! LeTarnec est impressionné.",
    "🌾 60% des Indiens vivent encore de **l'agriculture**, malgré une économie des services qui explose. Paradoxe indien numéro 1.",
    "💻 L'Inde est la **Silicon Valley** des pays émergents : Bangalore regroupe des milliers d'entreprises tech mondiales.",
    "⚡ Plus de **200 millions d'Indiens** n'ont toujours pas accès à l'électricité en zone rurale. Défi colossal selon LeTarnec.",
    "🚀 L'Inde a envoyé une sonde sur la **Lune en 2023** (Chandrayaan-3) — 7ème puissance spatiale mondiale. LeTarnec valide.",
    "💧 La **mousson** régule toute l'agriculture indienne. Une mauvaise saison = millions de paysans ruinés. La dépendance climatique reste totale.",
    "📊 L'Inde est la **5ème économie mondiale** (PIB) mais seulement 140ème en PIB par habitant. L'inégalité en chiffres.",
    "🏙️ **Mumbai** est la ville la plus chère d'Inde mais abrite aussi **Dharavi**, l'un des plus grands bidonvilles d'Asie. Contraste total.",
  ],
  "default": [
    "📚 LeTarnec prépare ses cours sur le nouveau thème... restez connectés !",
    "🌍 La géographie, c'est comprendre le monde tel qu'il est. LeTarnec dixit.",
    "🗺️ Un fun fact géographique arrive bientôt. LeTarnec consulte ses fiches.",
  ],
};

let tarnecFactIndex = 0;
let tarnecTimer    = null;

function startTarnecBot() {
  const cfg = loadConfig();
  if (!cfg.tarnec.enabled) return;
  if (tarnecTimer) clearInterval(tarnecTimer);

  tarnecTimer = setInterval(async () => {
    try {
      const cfgNow  = loadConfig();
      if (!cfgNow.tarnec.enabled) return;
      const guild   = client.guilds.cache.get(C.GUILD_ID);
      const channel = guild?.channels.cache.get(cfgNow.tarnec.channel || C.CHANNEL_TARNEC);
      if (!channel) return;
      const theme = cfgNow.tarnec.theme || "L'Inde";
      const facts = TARNEC_FACTS[theme] || TARNEC_FACTS["default"];
      const fact  = facts[tarnecFactIndex % facts.length];
      tarnecFactIndex++;
      await channel.send({ embeds: [makeEmbed({
        color:       0x8E44AD,
        author:      { name: "LeTarnec BOT 🌍", iconURL: C.LOGO_URL },
        title:       `🗺️ Fun Fact — ${theme}`,
        description: fact,
        fields:      [{ name: "📚 Matière", value: "`Histoire-Géographie`", inline: true }, { name: "🎯 Thème", value: `\`${theme}\``, inline: true }],
      })] });
    } catch (err) { console.error("[LeTarnec BOT] Erreur :", err); }
  }, cfg.tarnec.interval_minutes * 60 * 1000);

  console.log(`[LeTarnec BOT] Démarré — toutes les ${cfg.tarnec.interval_minutes} min`);
}

// ============================================================
//  STATSERVEUR AUTO
// ============================================================

let statServeurTimer = null;

function startStatServeurAuto() {
  const cfg = loadConfig();
  if (!cfg.statserveur_auto || !cfg.statserveur_channel) return;
  if (statServeurTimer) clearInterval(statServeurTimer);

  statServeurTimer = setInterval(async () => {
    try {
      const cfgNow = loadConfig();
      if (!cfgNow.statserveur_auto || !cfgNow.statserveur_channel) return;
      const guild = client.guilds.cache.get(C.GUILD_ID);
      const ch    = guild?.channels.cache.get(cfgNow.statserveur_channel);
      if (!ch) return;
      const data = await getServerData();
      const embed = data?.online
        ? makeEmbed({ color: C.CYAN, title: "🌐 Statut du serveur Soulakri", thumbnail: C.LOGO_URL, description: "Le serveur est **en ligne** ✅", fields: [{ name: "👤 Joueurs", value: `${data.players?.online ?? 0} / ${data.players?.max ?? 0}`, inline: true }, { name: "📦 Version", value: `\`${data.version ?? "?"}\``, inline: true }, { name: "🏓 MOTD", value: data.motd?.clean?.[0] ?? "Soulakri MC", inline: false }, { name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }, { name: "🔄 Mis à jour", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }] })
        : makeEmbed({ color: C.RED, title: "❌ Serveur hors ligne", description: "Le serveur est actuellement **hors ligne**.", fields: [{ name: "🔄 Vérifié", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }] });

      const pins  = await ch.messages.fetchPinned().catch(() => null);
      const myPin = pins?.find(m => m.author.id === client.user.id);
      if (myPin) { await myPin.edit({ embeds: [embed] }); }
      else { const msg = await ch.send({ embeds: [embed] }); await msg.pin().catch(() => {}); }
    } catch (err) { console.error("[StatServeur Auto] Erreur :", err); }
  }, (loadConfig().statserveur_interval_minutes || 10) * 60 * 1000);

  console.log(`[StatServeur Auto] Démarré — toutes les ${loadConfig().statserveur_interval_minutes} min`);
}

// ============================================================
//  GIVEAWAY — moteur
// ============================================================

async function endGiveaway(giveawayId) {
  const giveaways = loadGiveaways();
  const gw = giveaways[giveawayId];
  if (!gw || gw.ended) return;

  try {
    const guild   = client.guilds.cache.get(C.GUILD_ID);
    const channel = guild?.channels.cache.get(gw.channelId);
    if (!channel) return;
    const message = await channel.messages.fetch(gw.messageId).catch(() => null);
    if (!message) return;

    const reaction = message.reactions.cache.get("🎉");
    await reaction?.users.fetch();
    const participants = reaction?.users.cache.filter(u => !u.bot).map(u => u.id) || [];

    gw.ended = true;
    gw.participants = participants;

    let winners = [];
    if (participants.length > 0) {
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      winners = shuffled.slice(0, Math.min(gw.winners, participants.length));
    }
    gw.winnerIds = winners;
    giveaways[giveawayId] = gw;
    saveGiveaways(giveaways);

    const winnerMentions = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "Aucun participant 😢";

    await message.edit({ embeds: [makeEmbed({
      color:       C.RED,
      title:       `🎉 GIVEAWAY TERMINÉ — ${gw.prize}`,
      description: `**Gagnant(s) :** ${winnerMentions}\n\n👥 Participants : **${participants.length}**`,
      fields:      [{ name: "🏆 Lot", value: gw.prize, inline: true }, { name: "🎟️ Participants", value: String(participants.length), inline: true }, { name: "📅 Terminé", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }],
    })], components: [] });

    if (winners.length) {
      await channel.send({ content: `🎊 Félicitations ${winnerMentions} ! Vous avez gagné **${gw.prize}** !`, embeds: [makeEmbed({ color: C.GOLD, title: "🏆 Gagnant(s) du Giveaway !", description: `**${winnerMentions}** remporte(nt) : **${gw.prize}** !` })] });
    } else {
      await channel.send({ embeds: [makeEmbed({ color: C.RED, title: "😢 Aucun gagnant", description: `Le giveaway pour **${gw.prize}** n'a eu aucun participant.` })] });
    }
  } catch (err) { console.error("[Giveaway] Erreur endGiveaway :", err); }
}

function scheduleGiveaway(giveawayId, endsAt) {
  const delay = endsAt - Date.now();
  if (delay <= 0) { endGiveaway(giveawayId); return; }
  if (delay > 2_147_483_647) return;
  setTimeout(() => endGiveaway(giveawayId), delay);
}

function restoreGiveaways() {
  const giveaways = loadGiveaways();
  for (const [id, gw] of Object.entries(giveaways)) {
    if (!gw.ended) scheduleGiveaway(id, gw.endsAt);
  }
}

// ============================================================
//  COMMANDES SLASH
// ============================================================

const COMMANDS = [
  new SlashCommandBuilder().setName("help").setDescription("📖 Affiche toutes les commandes"),
  new SlashCommandBuilder().setName("ip").setDescription("🎮 IP du serveur Minecraft"),
  new SlashCommandBuilder().setName("bedrock").setDescription("📱 Infos connexion Bedrock"),
  new SlashCommandBuilder().setName("serverinfo").setDescription("🌐 Infos du serveur Discord"),
  new SlashCommandBuilder().setName("statserveur").setDescription("🌐 Statut du serveur Minecraft"),
  new SlashCommandBuilder().setName("joueurs").setDescription("👥 Joueurs connectés sur le MC"),
  new SlashCommandBuilder()
    .setName("stats").setDescription("📊 Stats d'un joueur Minecraft")
    .addStringOption(o => o.setName("pseudo").setDescription("Pseudo Minecraft").setRequired(true)),

  new SlashCommandBuilder().setName("grade").setDescription("🏅 Ton grade et niveau XP"),
  new SlashCommandBuilder()
    .setName("niveau").setDescription("⭐ Niveau XP d'un joueur")
    .addUserOption(o => o.setName("joueur").setDescription("Joueur").setRequired(false)),
  new SlashCommandBuilder().setName("top").setDescription("🏆 Classement XP"),

  new SlashCommandBuilder().setName("blague").setDescription("😂 Blague aléatoire"),
  new SlashCommandBuilder().setName("soules").setDescription("🔥 Soules lance une flash !"),
  new SlashCommandBuilder().setName("giry").setDescription("💥 Giry envoie la flash de Skye !"),
  new SlashCommandBuilder().setName("67").setDescription("🎲 Six Seven !"),
  new SlashCommandBuilder().setName("cassandre").setDescription("🔗 Cassandre sort Deadlock !"),
  new SlashCommandBuilder()
    .setName("ratio").setDescription("☑️ Ratio quelqu'un")
    .addUserOption(o => o.setName("cible").setDescription("La victime").setRequired(true)),
  new SlashCommandBuilder()
    .setName("cracked").setDescription("💀 Cracked !")
    .addStringOption(o => o.setName("pseudo").setDescription("Le pseudo cracké").setRequired(true)),
  new SlashCommandBuilder().setName("bakri").setDescription("⚛️ M. Bakri — Prof de physique (vocal + son)"),
  new SlashCommandBuilder().setName("naim").setDescription("🎤 Naim — Le son du goat (vocal + son)"),
  new SlashCommandBuilder().setName("raoudi").setDescription("🎰 Le compte de Raoudi"),
  new SlashCommandBuilder().setName("obled").setDescription("🐍 M. Obled — Python & Thonny"),
  new SlashCommandBuilder().setName("bourgin").setDescription("🧱 WALL JUMP !"),
  new SlashCommandBuilder().setName("bobard").setDescription("🤥 Bobard ou vérité ?"),
  new SlashCommandBuilder().setName("dodge").setDescription("🌀 Esquiver la prochaine flash"),

  new SlashCommandBuilder().setName("objectif").setDescription("🎯 Objectif actuel du serveur"),
  new SlashCommandBuilder()
    .setName("sondage").setDescription("📊 Créer un sondage")
    .addStringOption(o => o.setName("question").setDescription("Ta question").setRequired(true))
    .addStringOption(o => o.setName("choix1").setDescription("Choix 1").setRequired(false))
    .addStringOption(o => o.setName("choix2").setDescription("Choix 2").setRequired(false))
    .addStringOption(o => o.setName("choix3").setDescription("Choix 3").setRequired(false))
    .addStringOption(o => o.setName("choix4").setDescription("Choix 4").setRequired(false)),
  new SlashCommandBuilder()
    .setName("rappel").setDescription("⏰ Se rappeler quelque chose")
    .addIntegerOption(o => o.setName("minutes").setDescription("Dans combien de minutes").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("De quoi te rappeler").setRequired(true)),
  new SlashCommandBuilder().setName("ticket").setDescription("🎫 Ouvre un ticket support"),
  new SlashCommandBuilder()
    .setName("anniversaire").setDescription("🎂 Enregistre ton anniversaire")
    .addStringOption(o => o.setName("date").setDescription("Ta date (JJ/MM)").setRequired(true)),

  new SlashCommandBuilder()
    .setName("ban").setDescription("🔨 Bannir un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("kick").setDescription("👢 Expulser un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("mute").setDescription("🔇 Mute temporaire (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Durée en minutes").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("unmute").setDescription("🔊 Retirer le mute (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)),
  new SlashCommandBuilder()
    .setName("warn").setDescription("⚠️ Avertir un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison du warn").setRequired(true)),
  new SlashCommandBuilder()
    .setName("warns").setDescription("📋 Voir les warns d'un membre")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)),
  new SlashCommandBuilder()
    .setName("clearwarn").setDescription("🧹 Supprimer les warns d'un membre (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addStringOption(o => o.setName("warn_id").setDescription("ID d'un warn précis (optionnel)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("giveaway").setDescription("🎉 Lancer un giveaway")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName("lot").setDescription("Ce qu'on fait gagner").setRequired(true))
    .addIntegerOption(o => o.setName("duree").setDescription("Durée en minutes").setRequired(true))
    .addIntegerOption(o => o.setName("gagnants").setDescription("Nombre de gagnants (défaut: 1)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("set-cookie").setDescription("🍪 Mettre à jour le cookie FalixNodes (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("cookie").setDescription("Cookie complet").setRequired(true)),
  new SlashCommandBuilder()
    .setName("reglement").setDescription("📜 Poster le règlement (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("roles").setDescription("🎭 Poster le sélecteur de rôles (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("vittel").setDescription("🧮 Lancer Vittel BOT (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("tarnec-theme").setDescription("🗺️ Changer le thème de LeTarnec BOT (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("theme").setDescription("Nouveau thème").setRequired(true)),
  new SlashCommandBuilder()
    .setName("mc-objectif").setDescription("🎯 Définir l'objectif du serveur (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("texte").setDescription("Nouvel objectif").setRequired(true)),

  // CONFIG — unique point d'entrée avec menu de navigation
  new SlashCommandBuilder()
    .setName("config").setDescription("⚙️ Panneau de configuration global (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// ============================================================
//  ENREGISTREMENT DES COMMANDES
// ============================================================

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("⏳ Enregistrement des commandes slash...");
    await rest.put(Routes.applicationGuildCommands(client.user.id, C.GUILD_ID), { body: COMMANDS.map(c => c.toJSON()) });
    console.log("✅ Commandes enregistrées !");
  } catch (err) { console.error("❌ Erreur commandes :", err); }
}

// ============================================================
//  CONFIG UI — builders
// ============================================================

function buildConfigMainEmbed(cfg) {
  const statusEmoji = v => v ? "🟢" : "🔴";
  return makeEmbed({
    color:       0x2B2D31,
    author:      { name: "Soulakri BOT v13 — Configuration", iconURL: C.LOGO_URL },
    title:       "⚙️ Panneau de configuration",
    description: "Sélectionne une catégorie dans le menu ci-dessous pour modifier la configuration.",
    thumbnail:   C.LOGO_URL,
    fields: [
      {
        name:  "🧮 Vittel BOT",
        value: `${statusEmoji(cfg.vittel.enabled)} **${cfg.vittel.enabled ? "Actif" : "Inactif"}** · ⏱️ ${cfg.vittel.interval_minutes} min · <#${cfg.vittel.channel || C.CHANNEL_MATHS}>`,
        inline: false,
      },
      {
        name:  "📚 Descamps BOT",
        value: `${statusEmoji(cfg.descamps.enabled)} **${cfg.descamps.enabled ? "Actif" : "Inactif"}** · ⏱️ ${cfg.descamps.interval_minutes} min · <#${cfg.descamps.channel || C.CHANNEL_DESCAMPS}>`,
        inline: false,
      },
      {
        name:  "🗺️ LeTarnec BOT",
        value: `${statusEmoji(cfg.tarnec.enabled)} **${cfg.tarnec.enabled ? "Actif" : "Inactif"}** · ⏱️ ${cfg.tarnec.interval_minutes} min · <#${cfg.tarnec.channel || C.CHANNEL_TARNEC}>\n🎯 Thème : **${cfg.tarnec.theme}**`,
        inline: false,
      },
      {
        name:  "🌐 StatServeur Auto",
        value: `${statusEmoji(cfg.statserveur_auto)} **${cfg.statserveur_auto ? "Actif" : "Inactif"}** · ⏱️ ${cfg.statserveur_interval_minutes} min · ${cfg.statserveur_channel ? `<#${cfg.statserveur_channel}>` : "*salon non défini*"}`,
        inline: false,
      },
      {
        name:  "🔊 Audio (@discordjs/voice)",
        value: voiceAvailable ? "🟢 Installé — commandes vocales actives" : "🔴 Non installé — commandes vocales désactivées",
        inline: false,
      },
    ],
  });
}

function buildConfigMainRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("config_category")
    .setPlaceholder("📂 Choisir une catégorie...")
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("🧮 Vittel BOT").setDescription("Questions maths auto").setValue("vittel").setEmoji("🧮"),
      new StringSelectMenuOptionBuilder().setLabel("📚 Descamps BOT").setDescription("Anecdotes SES auto").setValue("descamps").setEmoji("📚"),
      new StringSelectMenuOptionBuilder().setLabel("🗺️ LeTarnec BOT").setDescription("Fun facts Histogéo auto").setValue("tarnec").setEmoji("🗺️"),
      new StringSelectMenuOptionBuilder().setLabel("🌐 StatServeur Auto").setDescription("Statut MC épinglé").setValue("statserveur").setEmoji("🌐"),
      new StringSelectMenuOptionBuilder().setLabel("🍪 FalixNodes").setDescription("Cookie + port Bedrock").setValue("falix").setEmoji("🍪"),
      new StringSelectMenuOptionBuilder().setLabel("😂 Blagues").setDescription("Gérer les blagues perso").setValue("blagues").setEmoji("😂"),
    );
  return new ActionRowBuilder().addComponents(menu);
}

// Embed + boutons pour une sous-catégorie
function buildCategoryEmbed(cat, cfg) {
  if (cat === "vittel") {
    return {
      embed: makeEmbed({
        color:       0x00BFFF,
        author:      { name: "Configuration — Vittel BOT", iconURL: C.LOGO_URL },
        title:       "🧮 Vittel BOT",
        description: "Bot automatique de questions mathématiques.",
        fields: [
          { name: "État",       value: cfg.vittel.enabled ? "🟢 Actif" : "🔴 Inactif", inline: true },
          { name: "Intervalle", value: `${cfg.vittel.interval_minutes} minutes`,         inline: true },
          { name: "Salon",      value: `<#${cfg.vittel.channel || C.CHANNEL_MATHS}>`,   inline: true },
          { name: "Thème",      value: cfg.vittel.theme || "Mathématiques",             inline: true },
        ],
      }),
      rows: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_vittel_toggle").setLabel(cfg.vittel.enabled ? "🔴 Désactiver" : "🟢 Activer").setStyle(cfg.vittel.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId("cfg_vittel_interval").setLabel("⏱️ Intervalle").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("cfg_vittel_theme").setLabel("🎯 Thème").setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_back").setLabel("◀ Retour").setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  if (cat === "descamps") {
    return {
      embed: makeEmbed({
        color:       0xE67E22,
        author:      { name: "Configuration — Descamps BOT", iconURL: C.LOGO_URL },
        title:       "📚 Descamps BOT",
        description: "Bot automatique d'anecdotes SES.",
        fields: [
          { name: "État",       value: cfg.descamps.enabled ? "🟢 Actif" : "🔴 Inactif",         inline: true },
          { name: "Intervalle", value: `${cfg.descamps.interval_minutes} minutes`,                 inline: true },
          { name: "Salon",      value: `<#${cfg.descamps.channel || C.CHANNEL_DESCAMPS}>`,         inline: true },
        ],
      }),
      rows: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_descamps_toggle").setLabel(cfg.descamps.enabled ? "🔴 Désactiver" : "🟢 Activer").setStyle(cfg.descamps.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId("cfg_descamps_interval").setLabel("⏱️ Intervalle").setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_back").setLabel("◀ Retour").setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  if (cat === "tarnec") {
    return {
      embed: makeEmbed({
        color:       0x8E44AD,
        author:      { name: "Configuration — LeTarnec BOT", iconURL: C.LOGO_URL },
        title:       "🗺️ LeTarnec BOT",
        description: "Bot automatique de fun facts Histoire-Géographie.",
        fields: [
          { name: "État",       value: cfg.tarnec.enabled ? "🟢 Actif" : "🔴 Inactif",       inline: true },
          { name: "Intervalle", value: `${cfg.tarnec.interval_minutes} minutes`,               inline: true },
          { name: "Salon",      value: `<#${cfg.tarnec.channel || C.CHANNEL_TARNEC}>`,         inline: true },
          { name: "Thème actuel", value: `**${cfg.tarnec.theme}**`,                            inline: true },
          { name: "Thèmes dispo", value: Object.keys(TARNEC_FACTS).filter(k => k !== "default").map(k => `\`${k}\``).join(", "), inline: false },
        ],
      }),
      rows: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_tarnec_toggle").setLabel(cfg.tarnec.enabled ? "🔴 Désactiver" : "🟢 Activer").setStyle(cfg.tarnec.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId("cfg_tarnec_interval").setLabel("⏱️ Intervalle").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("cfg_tarnec_theme").setLabel("🎯 Thème").setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_back").setLabel("◀ Retour").setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  if (cat === "statserveur") {
    return {
      embed: makeEmbed({
        color:       C.CYAN,
        author:      { name: "Configuration — StatServeur Auto", iconURL: C.LOGO_URL },
        title:       "🌐 StatServeur Auto",
        description: "Affiche et épingle automatiquement le statut du serveur MC dans un salon.",
        fields: [
          { name: "État",       value: cfg.statserveur_auto ? "🟢 Actif" : "🔴 Inactif",                                              inline: true },
          { name: "Intervalle", value: `${cfg.statserveur_interval_minutes} minutes`,                                                   inline: true },
          { name: "Salon",      value: cfg.statserveur_channel ? `<#${cfg.statserveur_channel}>` : "*non défini*",                     inline: true },
        ],
      }),
      rows: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_stat_toggle").setLabel(cfg.statserveur_auto ? "🔴 Désactiver" : "🟢 Activer").setStyle(cfg.statserveur_auto ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId("cfg_stat_interval").setLabel("⏱️ Intervalle").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("cfg_stat_salon").setLabel("📡 Définir salon (ID)").setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_back").setLabel("◀ Retour").setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  if (cat === "falix") {
    const cached = loadBedrock();
    return {
      embed: makeEmbed({
        color:       C.ORANGE,
        author:      { name: "Configuration — FalixNodes", iconURL: C.LOGO_URL },
        title:       "🍪 FalixNodes — Bedrock",
        description: "Gestion du cookie de session FalixNodes pour le watcher Bedrock.",
        fields: [
          { name: "🌐 Serveur ID",  value: `\`${C.FALIX_SERVER}\``,                                                           inline: true },
          { name: "🔌 Port cache",  value: cached.port ? `\`${cached.port}\`` : "*inconnu*",                                  inline: true },
          { name: "📅 Dernière MAJ",value: cached.updatedAt ? `<t:${Math.floor(cached.updatedAt / 1000)}:R>` : "*jamais*",    inline: true },
          { name: "🍪 Cookie",      value: process.env.FALIX_SESSION ? "`✅ Défini`" : "`❌ Manquant`",                        inline: true },
        ],
      }),
      rows: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_falix_cookie").setLabel("🍪 Nouveau cookie").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("cfg_falix_check").setLabel("🔄 Vérifier port maintenant").setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_back").setLabel("◀ Retour").setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  if (cat === "blagues") {
    const blagues = loadBlagues();
    return {
      embed: makeEmbed({
        color:       C.ORANGE,
        author:      { name: "Configuration — Blagues", iconURL: C.LOGO_URL },
        title:       "😂 Gestion des blagues",
        description: `**${blagues.length} blague(s)** dans la base.\n\nAjoute, consulte ou supprime des blagues utilisées par \`/blague\`.`,
        fields:      blagues.slice(0, 5).map((b, i) => ({ name: `${i + 1}. ${b.joke}`, value: `> ${b.answer}`, inline: false }))
          .concat(blagues.length > 5 ? [{ name: "...", value: `*${blagues.length - 5} blague(s) supplémentaire(s) non affichée(s)*`, inline: false }] : []),
      }),
      rows: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_blague_add").setLabel("➕ Ajouter une blague").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("cfg_blague_del").setLabel("🗑️ Supprimer (n°)").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("cfg_blague_reset").setLabel("🔄 Réinitialiser").setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cfg_back").setLabel("◀ Retour").setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  return { embed: makeEmbed({ color: C.RED, title: "❌ Catégorie inconnue" }), rows: [] };
}

// ============================================================
//  BOT PRÊT
// ============================================================

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} connecté — Soulakri BOT v13`);
  client.user.setActivity("Soulakri 🎮 | /help", { type: 0 });
  await registerCommands();
  startVittelBot();
  startDescampsBot();
  startTarnecBot();
  startStatServeurAuto();
  restoreGiveaways();
  await startBedrockWatcher();
  startBirthdayChecker();
});

// ============================================================
//  XP — messages
// ============================================================

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const now = Date.now();
  if (now - (xpCooldowns.get(message.author.id) || 0) < C.XP_COOLDOWN_MS) return;
  xpCooldowns.set(message.author.id, now);
  const amount = Math.floor(Math.random() * (C.XP_MAX - C.XP_MIN + 1)) + C.XP_MIN;
  const { user, leveledUp } = addXP(message.author.id, amount);
  if (leveledUp) {
    message.channel.send({ embeds: [makeEmbed({ color: C.GOLD, title: "🎉 Level Up !", description: `${message.author} passe au **niveau ${user.level}** ! 🚀`, thumbnail: message.author.displayAvatarURL({ dynamic: true }) })] }).catch(() => {});
  }
});

// ============================================================
//  ACCUEIL
// ============================================================

client.on("guildMemberAdd", async (member) => {
  try {
    const roleNV = member.guild.roles.cache.get(C.ROLE_NON_VERIFIE);
    if (roleNV) await member.roles.add(roleNV);
    const ch = member.guild.channels.cache.get(C.CHANNEL_BIENVENUE);
    if (!ch) return;
    const embed = makeEmbed({
      color: C.BLUE,
      author: { name: "✨ Nouveau joueur sur Soulakri !", iconURL: C.LOGO_URL },
      title: `👋 Bienvenue, ${member.user.username} !`,
      description: `> Tu es le **${member.guild.memberCount}ème** joueur à rejoindre l'aventure Soulakri !\n\nAvant de commencer, **une seule étape** :\n➡️ Rends-toi dans <#${C.CHANNEL_REGLEMENT}>, lis les règles et clique **✅ J'accepte** pour tout débloquer.`,
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
      fields: [
        { name: "📋 Par où commencer ?", value: `1️⃣ Règlement → <#${C.CHANNEL_REGLEMENT}>\n2️⃣ Rôles → <#${C.CHANNEL_ROLES}>\n3️⃣ Minecraft → \`${C.MC_IP}\`` },
        { name: "👥 Membres",           value: `**${member.guild.memberCount}**`, inline: true },
        { name: "🎮 Version",           value: "`Java & Bedrock`",                inline: true },
        { name: "🌍 Mode",              value: "`Survie Crossplay`",              inline: true },
      ],
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("show_ip").setLabel("🎮 Voir l'IP").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("show_reglement_link").setLabel("📜 Règlement").setStyle(ButtonStyle.Secondary),
    );
    await ch.send({ content: `> 🎊 Bienvenue ${member} !`, embeds: [embed], components: [row] });
    logAction(member.guild, { title: "📥 Nouveau membre", description: `**${member.user.tag}** a rejoint`, color: C.GREEN, fields: [{ name: "ID", value: member.user.id, inline: true }, { name: "Compte créé", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true }] });
  } catch (err) { console.error("guildMemberAdd :", err); }
});

client.on("guildMemberRemove", (member) => {
  logAction(member.guild, { title: "📤 Membre parti", description: `**${member.user.tag}** a quitté`, color: C.RED, fields: [{ name: "ID", value: member.user.id, inline: true }] });
});

// ============================================================
//  ANNIVERSAIRES — checker
// ============================================================

function startBirthdayChecker() {
  const check = async () => {
    try {
      const now   = new Date();
      const today = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`;
      const bdays = loadBirthdays();
      const guild = client.guilds.cache.get(C.GUILD_ID);
      if (!guild) return;
      const bienvenueChannel = guild.channels.cache.get(C.CHANNEL_BIENVENUE);

      for (const [userId, date] of Object.entries(bdays)) {
        if (date !== today) continue;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) continue;
        if (bienvenueChannel) {
          await bienvenueChannel.send({ content: `🎂 ${member}`, embeds: [makeEmbed({ color: C.PINK, title: "🎉 Joyeux anniversaire !", description: `Toute la communauté Soulakri souhaite un **joyeux anniversaire** à ${member} ! 🎂🎊\n\n*Bonne journée et bon courage sur le serveur !* 🥳`, thumbnail: member.user.displayAvatarURL({ dynamic: true }) })] });
        }
      }
    } catch (err) { console.error("[Birthday] Erreur :", err); }
  };
  setInterval(check, 60 * 60 * 1000);
  check();
}

// ============================================================
//  INTERACTIONS
// ============================================================

client.on("interactionCreate", async (interaction) => {

  // ── MODALES ──
  if (interaction.isModalSubmit()) {
    // Blague add
    if (interaction.customId === "modal_blague_add") {
      const joke   = interaction.fields.getTextInputValue("blague_joke").trim();
      const answer = interaction.fields.getTextInputValue("blague_answer").trim();
      if (!joke) return interaction.reply({ content: "❌ La question ne peut pas être vide.", ephemeral: true });
      const blagues = loadBlagues();
      blagues.push({ joke, answer: answer || "*(pas de réponse)*" });
      saveBlagues(blagues);
      const cfg = loadConfig();
      const { embed, rows } = buildCategoryEmbed("blagues", cfg);
      return interaction.update({ embeds: [embed], components: rows });
    }

    // Blague supprimer
    if (interaction.customId === "modal_blague_del") {
      const n = parseInt(interaction.fields.getTextInputValue("blague_num").trim());
      const blagues = loadBlagues();
      if (isNaN(n) || n < 1 || n > blagues.length) return interaction.reply({ content: `❌ Numéro invalide (1–${blagues.length}).`, ephemeral: true });
      blagues.splice(n - 1, 1);
      saveBlagues(blagues);
      const cfg = loadConfig();
      const { embed, rows } = buildCategoryEmbed("blagues", cfg);
      return interaction.update({ embeds: [embed], components: rows });
    }

    // FalixNodes cookie
    if (interaction.customId === "modal_falix_cookie") {
      const cookie = interaction.fields.getTextInputValue("falix_cookie_value").trim();
      process.env.FALIX_SESSION = cookie;
      fs.writeFileSync("./falix_session.txt", cookie);
      checkBedrockPort().catch(console.error);
      const cfg = loadConfig();
      const { embed, rows } = buildCategoryEmbed("falix", cfg);
      return interaction.update({ embeds: [embed], components: rows });
    }

    // Intervalle generique
    if (interaction.customId.startsWith("modal_interval_")) {
      const bot = interaction.customId.replace("modal_interval_", "");
      const val = parseInt(interaction.fields.getTextInputValue("interval_value").trim());
      if (isNaN(val) || val < 1) return interaction.reply({ content: "❌ Valeur invalide (minimum 1).", ephemeral: true });
      const cfg = loadConfig();
      if (bot === "vittel")    { cfg.vittel.interval_minutes     = val; saveConfig(cfg); startVittelBot(); }
      if (bot === "descamps")  { cfg.descamps.interval_minutes   = val; saveConfig(cfg); startDescampsBot(); }
      if (bot === "tarnec")    { cfg.tarnec.interval_minutes     = val; saveConfig(cfg); startTarnecBot(); }
      if (bot === "statserveur") { cfg.statserveur_interval_minutes = Math.max(5, val); saveConfig(cfg); startStatServeurAuto(); }
      const { embed, rows } = buildCategoryEmbed(bot === "statserveur" ? "statserveur" : bot, loadConfig());
      return interaction.update({ embeds: [embed], components: rows });
    }

    // Thème (vittel ou tarnec)
    if (interaction.customId.startsWith("modal_theme_")) {
      const bot   = interaction.customId.replace("modal_theme_", "");
      const theme = interaction.fields.getTextInputValue("theme_value").trim();
      const cfg   = loadConfig();
      if (bot === "vittel")  { cfg.vittel.theme  = theme; saveConfig(cfg); }
      if (bot === "tarnec")  { cfg.tarnec.theme  = theme; tarnecFactIndex = 0; saveConfig(cfg); startTarnecBot(); }
      const { embed, rows } = buildCategoryEmbed(bot, loadConfig());
      return interaction.update({ embeds: [embed], components: rows });
    }

    // Salon statserveur
    if (interaction.customId === "modal_stat_salon") {
      const id  = interaction.fields.getTextInputValue("stat_salon_id").trim().replace(/[<#>]/g, "");
      const ch  = interaction.guild.channels.cache.get(id);
      if (!ch)  return interaction.reply({ content: "❌ Salon introuvable avec cet ID.", ephemeral: true });
      const cfg = loadConfig();
      cfg.statserveur_channel = id;
      saveConfig(cfg);
      startStatServeurAuto();
      const { embed, rows } = buildCategoryEmbed("statserveur", loadConfig());
      return interaction.update({ embeds: [embed], components: rows });
    }

    return;
  }

  // ── SELECT MENU — rôles ──
  if (interaction.isStringSelectMenu() && interaction.customId === "role_selector") {
    try {
      const optionalRoles = [C.ROLE_BUILDER, C.ROLE_PVP, C.ROLE_SURVIE, C.ROLE_NOTIFS];
      for (const id of optionalRoles) {
        const role = interaction.guild.roles.cache.get(id);
        if (role && interaction.member.roles.cache.has(id)) await interaction.member.roles.remove(role).catch(() => {});
      }
      const added = [];
      for (const id of interaction.values) {
        const role = interaction.guild.roles.cache.get(id);
        if (role) { await interaction.member.roles.add(role).catch(() => {}); added.push(role.name); }
      }
      return interaction.reply({ embeds: [makeEmbed({ color: C.CYAN, title: "✅ Rôles mis à jour !", description: added.length ? `Tu as maintenant : ${added.map(r => `**${r}**`).join(", ")} !` : "Tous tes rôles optionnels ont été retirés." })], ephemeral: true });
    } catch (err) {
      console.error("role_selector :", err);
      if (!interaction.replied) await interaction.reply({ content: "❌ Erreur. Contacte un admin.", ephemeral: true });
    }
    return;
  }

  // ── SELECT MENU — config catégorie ──
  if (interaction.isStringSelectMenu() && interaction.customId === "config_category") {
    const cat = interaction.values[0];
    const cfg = loadConfig();
    const { embed, rows } = buildCategoryEmbed(cat, cfg);
    return interaction.update({ embeds: [embed], components: rows });
  }

  // ── BOUTONS ──
  if (interaction.isButton()) {

    // ─ Config : retour accueil ─
    if (interaction.customId === "cfg_back") {
      const cfg = loadConfig();
      return interaction.update({ embeds: [buildConfigMainEmbed(cfg)], components: [buildConfigMainRow()] });
    }

    // ─ Config : toggles ─
    if (interaction.customId.startsWith("cfg_") && interaction.customId.endsWith("_toggle")) {
      const bot = interaction.customId.replace("cfg_", "").replace("_toggle", "");
      const cfg = loadConfig();
      if (bot === "vittel")    { cfg.vittel.enabled    = !cfg.vittel.enabled;    saveConfig(cfg); startVittelBot(); }
      if (bot === "descamps")  { cfg.descamps.enabled  = !cfg.descamps.enabled;  saveConfig(cfg); startDescampsBot(); }
      if (bot === "tarnec")    { cfg.tarnec.enabled    = !cfg.tarnec.enabled;    saveConfig(cfg); startTarnecBot(); }
      if (bot === "stat")      { cfg.statserveur_auto  = !cfg.statserveur_auto;  saveConfig(cfg); startStatServeurAuto(); }
      const realCat = bot === "stat" ? "statserveur" : bot;
      const { embed, rows } = buildCategoryEmbed(realCat, loadConfig());
      return interaction.update({ embeds: [embed], components: rows });
    }

    // ─ Config : intervalle (ouvre modale) ─
    if (interaction.customId.startsWith("cfg_") && interaction.customId.endsWith("_interval")) {
      const bot = interaction.customId.replace("cfg_", "").replace("_interval", "");
      const cfg = loadConfig();
      const current = bot === "vittel" ? cfg.vittel.interval_minutes : bot === "descamps" ? cfg.descamps.interval_minutes : bot === "tarnec" ? cfg.tarnec.interval_minutes : cfg.statserveur_interval_minutes;
      const modal = new ModalBuilder()
        .setCustomId(`modal_interval_${bot}`)
        .setTitle(`⏱️ Intervalle — ${bot}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("interval_value").setLabel(`Intervalle en minutes (actuel: ${current})`).setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Ex: 30"),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─ Config : thème ─
    if (interaction.customId.startsWith("cfg_") && interaction.customId.endsWith("_theme")) {
      const bot = interaction.customId.replace("cfg_", "").replace("_theme", "");
      const cfg = loadConfig();
      const current = bot === "vittel" ? cfg.vittel.theme : cfg.tarnec.theme;
      const modal = new ModalBuilder()
        .setCustomId(`modal_theme_${bot}`)
        .setTitle(`🎯 Thème — ${bot}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("theme_value").setLabel(`Thème actuel : ${current}`).setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Ex: La France, L'Inde..."),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─ Config : salon statserveur ─
    if (interaction.customId === "cfg_stat_salon") {
      const modal = new ModalBuilder().setCustomId("modal_stat_salon").setTitle("📡 Salon StatServeur");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("stat_salon_id").setLabel("ID du salon (colle l'ID Discord)").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Ex: 1487136083132284951"),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─ Config : cookie Falix ─
    if (interaction.customId === "cfg_falix_cookie") {
      const modal = new ModalBuilder().setCustomId("modal_falix_cookie").setTitle("🍪 Cookie FalixNodes");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("falix_cookie_value").setLabel("Cookie de session FalixNodes").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder("Colle ton cookie ici..."),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─ Config : vérifier port Falix ─
    if (interaction.customId === "cfg_falix_check") {
      await interaction.deferUpdate();
      await checkBedrockPort();
      const cfg = loadConfig();
      const { embed, rows } = buildCategoryEmbed("falix", cfg);
      return interaction.editReply({ embeds: [embed], components: rows });
    }

    // ─ Config : blague add (ouvre modale) ─
    if (interaction.customId === "cfg_blague_add") {
      const modal = new ModalBuilder().setCustomId("modal_blague_add").setTitle("➕ Ajouter une blague");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("blague_joke").setLabel("La question / la blague").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Ex: Pourquoi Creeper est triste ?"),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("blague_answer").setLabel("La réponse (optionnel)").setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder("Ex: Parce qu'il explose ses amitiés 💥"),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─ Config : blague supprimer ─
    if (interaction.customId === "cfg_blague_del") {
      const blagues = loadBlagues();
      const modal   = new ModalBuilder().setCustomId("modal_blague_del").setTitle("🗑️ Supprimer une blague");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("blague_num").setLabel(`Numéro à supprimer (1–${blagues.length})`).setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Ex: 3"),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─ Config : blague reset ─
    if (interaction.customId === "cfg_blague_reset") {
      saveBlagues([...BLAGUES_DEFAULT]);
      const cfg = loadConfig();
      const { embed, rows } = buildCategoryEmbed("blagues", cfg);
      return interaction.update({ embeds: [embed], components: rows });
    }

    // ─ Règlement ─
    if (interaction.customId === "accept_rules") {
      try {
        const roleJoueur = interaction.guild.roles.cache.get(C.ROLE_JOUEUR);
        const roleNV     = interaction.guild.roles.cache.get(C.ROLE_NON_VERIFIE);
        if (!roleJoueur) return interaction.reply({ content: "❌ Rôle Joueur introuvable.", ephemeral: true });
        if (interaction.member.roles.cache.has(C.ROLE_JOUEUR)) return interaction.reply({ content: "✅ Tu as déjà accepté le règlement !", ephemeral: true });
        await interaction.member.roles.add(roleJoueur);
        if (roleNV) await interaction.member.roles.remove(roleNV).catch(() => {});
        return interaction.reply({ embeds: [makeEmbed({ color: C.GREEN, author: "Soulakri", title: "✅ Bienvenue dans la communauté !", description: `**${interaction.user.username}**, tu fais maintenant partie de **Soulakri** ! 🎉\n\n➡️ Choisis tes rôles dans <#${C.CHANNEL_ROLES}>\n🎮 Rejoins le MC : \`${C.MC_IP}:${C.MC_PORT}\`` })], ephemeral: true });
      } catch (err) {
        console.error("accept_rules :", err);
        if (!interaction.replied) await interaction.reply({ content: "❌ Erreur.", ephemeral: true });
      }
      return;
    }

    if (interaction.customId === "show_ip") {
      return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, title: "🎮 IP du serveur Soulakri", thumbnail: C.LOGO_URL, fields: [{ name: "📡 Adresse", value: `\`\`\`${C.MC_IP}\`\`\``, inline: false }, { name: "🔌 Port Java", value: `\`\`\`${C.MC_PORT}\`\`\``, inline: false }] })], ephemeral: true });
    }
    if (interaction.customId === "show_reglement_link") {
      return interaction.reply({ content: `📜 Le règlement : <#${C.CHANNEL_REGLEMENT}>`, ephemeral: true });
    }

    // ─ Fermer ticket ─
    if (interaction.customId === "close_ticket") {
      await interaction.reply({ content: "📄 Génération du transcript..." });
      try {
        const channel   = interaction.channel;
        const messages  = await channel.messages.fetch({ limit: 100 });
        const sorted    = [...messages.values()].reverse();
        const lines     = sorted.map(m => `[${new Date(m.createdTimestamp).toLocaleString("fr-FR")}] ${m.author.tag}: ${m.content || "(embed/attachment)"}`);
        const transcript = `=== TRANSCRIPT — ${channel.name} ===\nFermé par : ${interaction.user.tag}\nDate : ${new Date().toLocaleString("fr-FR")}\n\n${lines.join("\n")}`;
        const buf        = Buffer.from(transcript, "utf8");
        const attachment = new AttachmentBuilder(buf, { name: `transcript-${channel.name}.txt` });
        const logCh      = interaction.guild.channels.cache.get(C.CHANNEL_LOGS);
        if (logCh) {
          await logCh.send({ embeds: [makeEmbed({ color: C.PURPLE, title: "📄 Ticket fermé — Transcript", description: `**Salon :** \`${channel.name}\`\nFermé par : ${interaction.user}\nMessages : **${sorted.length}**` })], files: [attachment] });
        }
      } catch (err) { console.error("[Ticket] Transcript :", err); }
      await interaction.followUp({ content: "🔒 Fermeture dans 5 secondes..." }).catch(() => {});
      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
      return;
    }

    // ─ Blague suivante ─
    if (interaction.customId === "another_joke") {
      const blagues = loadBlagues();
      const b = blagues[Math.floor(Math.random() * blagues.length)];
      return interaction.update({ embeds: [makeEmbed({ color: C.ORANGE, title: "😂 Blague aléatoire", fields: [{ name: "❓", value: b.joke }, { name: "💡", value: b.answer }] })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary))] });
    }

    // ─ Sondage : fermer ─
    if (interaction.customId === "poll_close") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: "❌ Seul un modérateur peut fermer le sondage.", ephemeral: true });
      }
      const oldEmbed = interaction.message.embeds[0];
      const closedEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(C.RED)
        .setFooter({ text: `Sondage fermé par ${interaction.user.tag}` });
      return interaction.update({ embeds: [closedEmbed], components: [] });
    }

    // ─ Sondage : résultats ─
    if (interaction.customId === "poll_results") {
      const msg       = interaction.message;
      const reactions = msg.reactions.cache;
      const emojis    = ["1️⃣","2️⃣","3️⃣","4️⃣","✅","❌"];
      let results     = "";
      for (const emoji of emojis) {
        const r = reactions.get(emoji);
        if (r) results += `${emoji} — **${r.count - 1}** vote(s)\n`;
      }
      return interaction.reply({ embeds: [makeEmbed({ color: C.PURPLE, title: "📊 Résultats en direct", description: results || "*Aucun vote pour l'instant.*" })], ephemeral: true });
    }

    // ─ Serverinfo : catégorie ─
    if (interaction.customId.startsWith("sinfo_")) {
      const cat   = interaction.customId.replace("sinfo_", "");
      const guild = interaction.guild;
      await guild.fetch(); await guild.members.fetch();

      let embed;
      if (cat === "membres") {
        const bots   = guild.members.cache.filter(m => m.user.bot).size;
        const humans = guild.memberCount - bots;
        const online = guild.members.cache.filter(m => m.presence?.status === "online").size;
        embed = makeEmbed({ color: C.CYAN, title: "👥 Membres — Soulakri", fields: [{ name: "👤 Humains", value: `**${humans}**`, inline: true }, { name: "🤖 Bots", value: `**${bots}**`, inline: true }, { name: "🟢 En ligne", value: `**${online}**`, inline: true }, { name: "👑 Propriétaire", value: `<@${guild.ownerId}>`, inline: true }] });
      } else if (cat === "salons") {
        const texts    = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voices   = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const cats     = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        embed = makeEmbed({ color: C.BLUE, title: "💬 Salons — Soulakri", fields: [{ name: "📝 Texte", value: `**${texts}**`, inline: true }, { name: "🔊 Vocal", value: `**${voices}**`, inline: true }, { name: "📁 Catégories", value: `**${cats}**`, inline: true }] });
      } else if (cat === "roles") {
        const roleList = guild.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position).first(15).map(r => r.toString()).join(" ");
        embed = makeEmbed({ color: C.PURPLE, title: "🎭 Rôles — Soulakri", description: roleList || "*Aucun rôle*" });
      } else if (cat === "boost") {
        embed = makeEmbed({ color: C.PINK, title: "🚀 Boosts — Soulakri", fields: [{ name: "🚀 Boosts", value: `**${guild.premiumSubscriptionCount}**`, inline: true }, { name: "📊 Niveau", value: `**${guild.premiumTier}**`, inline: true }] });
      }

      const row = buildServerInfoRow();
      return interaction.update({ embeds: [embed], components: [row] });
    }

    // ─ Pagination TOP ─
    if (interaction.customId.startsWith("top_page_")) {
      const page = parseInt(interaction.customId.replace("top_page_", ""));
      return handleTopPage(interaction, page, true);
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;

  // ══════════════════════════════════════════════════════════
  //  HELP
  // ══════════════════════════════════════════════════════════
  if (cmd === "help") {
    return interaction.reply({ embeds: [makeEmbed({
      color: C.BLUE, author: { name: "Soulakri Bot v13 — Aide", iconURL: C.LOGO_URL },
      title: "📖 Commandes disponibles", thumbnail: C.LOGO_URL,
      fields: [
        { name: "── 🎮 Minecraft ──",   value: "`/ip` `/bedrock` `/stats` `/joueurs` `/statserveur`", inline: false },
        { name: "── 🌐 Serveur ──",     value: "`/serverinfo`", inline: false },
        { name: "── 🏅 Profil ──",      value: "`/grade` `/niveau` `/top`", inline: false },
        { name: "── 🎉 Giveaway ──",    value: "`/giveaway`", inline: false },
        { name: "── 😂 Fun ──",         value: "`/blague` `/soules` `/giry` `/67` `/cassandre` `/ratio` `/cracked` `/bakri` `/naim` `/raoudi` `/obled` `/bourgin` `/bobard` `/dodge`", inline: false },
        { name: "── 🔧 Utilitaires ──", value: "`/objectif` `/sondage` `/rappel` `/ticket` `/anniversaire`", inline: false },
        { name: "── 🔨 Modération ──",  value: "`/ban` `/kick` `/mute` `/unmute` `/warn` `/warns` `/clearwarn`", inline: false },
        { name: "── ⚙️ Admin ──",       value: "`/reglement` `/roles` `/vittel` `/mc-objectif` `/set-cookie` `/tarnec-theme` `/config`", inline: false },
      ],
    })], ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  IP
  // ══════════════════════════════════════════════════════════
  if (cmd === "ip") {
    return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, author: { name: "Soulakri — Serveur Minecraft", iconURL: C.LOGO_URL }, title: "🎮 Rejoins le serveur !", thumbnail: C.LOGO_URL, description: "Compatible **Java & Bedrock** ⚔️", fields: [{ name: "📡 Adresse IP", value: `\`\`\`${C.MC_IP}\`\`\``, inline: false }, { name: "🔌 Port Java", value: `\`\`\`${C.MC_PORT}\`\`\``, inline: false }, { name: "📱 Port Bedrock", value: "Utilise `/bedrock` — change à chaque redémarrage !", inline: false }, { name: "📦 Version", value: "`1.20.1`", inline: true }, { name: "🌍 Mode", value: "`Survie Crossplay`", inline: true }] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  BEDROCK
  // ══════════════════════════════════════════════════════════
  if (cmd === "bedrock") {
    await interaction.deferReply();
    const nr = await getFalixNetworkInfo();
    if (!nr.ok) {
      const bd = loadBedrock();
      if (bd.port) return interaction.editReply({ embeds: [makeEmbed({ color: C.ORANGE, title: "📱 Connexion Bedrock — cache", thumbnail: C.LOGO_URL, fields: [{ name: "📡 IP", value: `\`\`\`${bd.ip}\`\`\``, inline: false }, { name: "🔌 Port", value: `\`\`\`${bd.port}\`\`\``, inline: false }, { name: "📅 Mis à jour", value: `<t:${Math.floor((bd.updatedAt || Date.now()) / 1000)}:R>`, inline: true }] })] });
      return interaction.editReply({ embeds: [makeEmbed({ color: C.RED, title: "❌ Bedrock indisponible", description: nr.reason === "cookie_expired" ? "Cookie expiré. Admin → `/set-cookie`" : "Impossible de récupérer les infos Bedrock." })] });
    }
    saveBedrock({ ip: nr.ip, port: nr.port, updatedAt: Date.now() });
    return interaction.editReply({ embeds: [makeEmbed({ color: C.GREEN, title: "📱 Connexion Bedrock — Soulakri", thumbnail: C.LOGO_URL, fields: [{ name: "📡 Adresse IP", value: `\`\`\`${nr.ip}\`\`\``, inline: false }, { name: "🔌 Port", value: `\`\`\`${nr.port}\`\`\``, inline: false }, { name: "⚠️ Important", value: "Le port change à chaque redémarrage MC.", inline: false }] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  SERVERINFO — avec boutons catégories
  // ══════════════════════════════════════════════════════════
  if (cmd === "serverinfo") {
    await interaction.deferReply();
    const guild = interaction.guild;
    await guild.fetch(); await guild.members.fetch();
    const bots   = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;
    const texts  = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voices = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const owner  = await guild.fetchOwner();
    const verif  = ["Aucune", "Faible", "Moyenne", "Élevée", "Très élevée"][guild.verificationLevel] ?? "Inconnue";

    const embed = makeEmbed({
      color:       C.CYAN,
      author:      { name: guild.name, iconURL: guild.iconURL({ dynamic: true }) || C.LOGO_URL },
      title:       "🌐 Informations du serveur Soulakri",
      description: `> Serveur fondé le <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,
      thumbnail:   guild.iconURL({ dynamic: true, size: 256 }) || C.LOGO_URL,
      fields: [
        { name: "👑 Propriétaire",  value: owner.toString(),                         inline: true },
        { name: "🆔 ID",            value: `\`${guild.id}\``,                        inline: true },
        { name: "🔒 Vérification",  value: verif,                                    inline: true },
        { name: "👥 Membres",       value: `👤 ${humans} humains · 🤖 ${bots} bots`, inline: true },
        { name: "💬 Salons",        value: `📝 ${texts} · 🔊 ${voices}`,             inline: true },
        { name: "🎭 Rôles",         value: `${guild.roles.cache.size - 1}`,          inline: true },
        { name: "🚀 Boosts",        value: `${guild.premiumSubscriptionCount} — Niv. ${guild.premiumTier}`, inline: true },
        { name: "🎮 Serveur MC",    value: `\`${C.MC_IP}:${C.MC_PORT}\``,           inline: true },
      ],
    });

    return interaction.editReply({ embeds: [embed], components: [buildServerInfoRow()] });
  }

  // ══════════════════════════════════════════════════════════
  //  GRADE
  // ══════════════════════════════════════════════════════════
  if (cmd === "grade") {
    const gradeRoles = ["Admin", "Mod", "Builder", "MVP", "VIP", "Joueur"];
    let found = null;
    for (const name of gradeRoles) {
      const role = interaction.guild.roles.cache.find(r => r.name === name);
      if (role && interaction.member.roles.cache.has(role.id)) { found = role; break; }
    }
    const user = getUser(interaction.user.id), needed = xpForLevel(user.level), bar = progressBar(user.xp, needed), pct = Math.round((user.xp / needed) * 100);
    return interaction.reply({ embeds: [makeEmbed({ color: found ? (found.color || C.BLUE) : C.RED, author: { name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }, title: "🏅 Ton profil Soulakri", thumbnail: interaction.user.displayAvatarURL({ dynamic: true }), fields: [{ name: "🎖️ Grade", value: found ? found.toString() : "*Aucun grade*", inline: true }, { name: "⭐ Niveau", value: `**${user.level}**`, inline: true }, { name: "💬 Messages", value: `${user.messages}`, inline: true }, { name: `📊 XP — ${user.xp} / ${needed} (${pct}%)`, value: `\`${bar}\``, inline: false }] })], ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  NIVEAU
  // ══════════════════════════════════════════════════════════
  if (cmd === "niveau") {
    const target = interaction.options.getUser("joueur") || interaction.user;
    const user = getUser(target.id), needed = xpForLevel(user.level), bar = progressBar(user.xp, needed), pct = Math.round((user.xp / needed) * 100);
    return interaction.reply({ embeds: [makeEmbed({ color: C.PURPLE, author: { name: target.username, iconURL: target.displayAvatarURL({ dynamic: true }) }, title: `⭐ Niveau de ${target.username}`, thumbnail: target.displayAvatarURL({ dynamic: true }), fields: [{ name: "⭐ Niveau", value: `**${user.level}**`, inline: true }, { name: "✨ XP", value: `${user.xp} / ${needed}`, inline: true }, { name: "💬 Messages", value: `${user.messages}`, inline: true }, { name: `📊 Progression — ${pct}%`, value: `\`${bar}\``, inline: false }] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  TOP
  // ══════════════════════════════════════════════════════════
  if (cmd === "top") {
    return handleTopPage(interaction, 1, false);
  }

  // ══════════════════════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════════════════════
  if (cmd === "stats") {
    const pseudo = interaction.options.getString("pseudo");
    await interaction.deferReply();
    try {
      const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${pseudo}`);
      if (!res.ok) return interaction.editReply({ content: `❌ Joueur **${pseudo}** introuvable.` });
      const { id: uuid, name } = await res.json();
      return interaction.editReply({ embeds: [makeEmbed({ color: C.GREEN, author: { name: `Stats de ${name}`, iconURL: `https://mc-heads.net/avatar/${uuid}/32` }, title: `📊 ${name}`, thumbnail: `https://mc-heads.net/avatar/${uuid}/64`, image: `https://mc-heads.net/body/${uuid}/128`, fields: [{ name: "🎮 Pseudo", value: `\`${name}\``, inline: true }, { name: "🔑 UUID", value: `\`${uuid.substring(0, 8)}...\``, inline: true }, { name: "🌐 NameMC", value: `[Voir le profil](https://namemc.com/profile/${uuid})`, inline: true }] })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Voir sur NameMC").setURL(`https://namemc.com/profile/${uuid}`).setStyle(ButtonStyle.Link))] });
    } catch { return interaction.editReply({ content: "❌ Erreur API Mojang." }); }
  }

  // ══════════════════════════════════════════════════════════
  //  BLAGUE — charge depuis le fichier JSON
  // ══════════════════════════════════════════════════════════
  if (cmd === "blague") {
    const blagues = loadBlagues();
    const b = blagues[Math.floor(Math.random() * blagues.length)];
    return interaction.reply({ embeds: [makeEmbed({ color: C.ORANGE, title: "😂 Blague", thumbnail: C.LOGO_URL, fields: [{ name: "❓ Question", value: b.joke }, { name: "💡 Réponse", value: b.answer }] })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary))] });
  }

  // ══════════════════════════════════════════════════════════
  //  SOULES
  // ══════════════════════════════════════════════════════════
  if (cmd === "soules") {
    await interaction.deferReply();
    setDodgeWindow(interaction.user.id, "soules");
    return interaction.editReply({ embeds: [makeEmbed({ color: 0xFF6600, title: "🔥 FLASH OUT ! Soules balance une flash !", description: `${interaction.user} invoque **SOULES** ! 🌟\n*Run it back !*\n\n💡 Tape \`/dodge\` dans les 10s pour esquiver !`, image: "https://i.imgur.com/FLkhWWO.gif" })] });
  }

  // ══════════════════════════════════════════════════════════
  //  GIRY
  // ══════════════════════════════════════════════════════════
  if (cmd === "giry") {
    await interaction.deferReply();
    setDodgeWindow(interaction.user.id, "giry");
    return interaction.editReply({ embeds: [makeEmbed({ color: 0x4CAF50, title: "💚 SEEKERS OUT ! Giry envoie la flash de Skye !", description: `${interaction.user} joue **GIRY** ! 🦅\n*T'as les yeux dans ta poche !*\n\n💡 Tape \`/dodge\` dans les 10s !`, image: "https://i.imgur.com/3h3Y01m.gif" })] });
  }

  // ══════════════════════════════════════════════════════════
  //  DODGE
  // ══════════════════════════════════════════════════════════
  if (cmd === "dodge") {
    const w = canDodge(interaction.user.id);
    if (!w) return interaction.reply({ embeds: [makeEmbed({ color: C.RED, title: "❌ Pas de flash à esquiver !", description: "Aucune flash active dans ta fenêtre. Trop lent ou personne ne t'a ciblé. 😎" })], ephemeral: true });
    return interaction.reply({ embeds: [makeEmbed({ color: C.CYAN, title: "🌀 ESQUIVE ! Matrix mode activé !", description: `${interaction.user} esquive la **${w.commandName}** de justesse ! 💨\n\n> *"Tu m'auras pas."* 😎`, thumbnail: interaction.user.displayAvatarURL({ dynamic: true }) })] });
  }

  // ══════════════════════════════════════════════════════════
  //  67 / CASSANDRE
  // ══════════════════════════════════════════════════════════
  if (cmd === "67")        return interaction.reply({ embeds: [makeEmbed({ color: 0xFFD700, title: "🎲 SIX SEVEN ! 67 !", description: `${interaction.user} sort le **67** ! 🎵`, image: "https://i.imgur.com/tTLkRlr.gif" })] });
  if (cmd === "cassandre") return interaction.reply({ embeds: [makeEmbed({ color: 0xB8860B, title: "🔗 NEURAL THEFT ! Cassandre sort Deadlock !", description: `${interaction.user} joue **CASSANDRE** ! ⛓️\n*GravNet lancé !*`, image: "https://i.imgur.com/3D8zQTb.gif" })] });

  // ══════════════════════════════════════════════════════════
  //  RATIO
  // ══════════════════════════════════════════════════════════
  if (cmd === "ratio") {
    const cible = interaction.options.getUser("cible");
    if (cible.id === interaction.user.id) return interaction.reply({ content: "❌ Tu peux pas te ratio toi-même...", ephemeral: true });
    const reactions = ["noooon", "comment osez-vous", "j'y crois pas", "c'est injuste", "touchée", "impossible", "je suis choqué"];
    return interaction.reply({ embeds: [makeEmbed({ color: C.CYAN, title: "☑️ Ratio", description: `${interaction.user} vient de **ratio** ${cible} ! 📉\n\n> *${cible.username} : "${reactions[Math.floor(Math.random() * reactions.length)]}"*`, thumbnail: cible.displayAvatarURL({ dynamic: true }) })] });
  }

  // ══════════════════════════════════════════════════════════
  //  CRACKED
  // ══════════════════════════════════════════════════════════
  if (cmd === "cracked") {
    const pseudo = interaction.options.getString("pseudo");
    return interaction.reply({ embeds: [makeEmbed({ color: C.RED, title: "💀 CRACKED !", description: `**${pseudo}** vient de se faire **crack** par ${interaction.user} ! 😭\n\n> *T'as même pas de licence originale frère...*`, thumbnail: `https://mc-heads.net/avatar/${pseudo}/64`, fields: [{ name: "👤 Victime", value: `\`${pseudo}\``, inline: true }, { name: "⚖️ Verdict", value: "`Piraté ✅`", inline: true }, { name: "🔑 Licence", value: "`Introuvable 💀`", inline: true }] })] });
  }// ══════════════════════════════════════════════════════════
  //  BAKRI
  // ══════════════════════════════════════════════════════════
  if (cmd === "bakri") {
    await interaction.deferReply();
    const attachment = await sendMp3Attachment(interaction, "bakri", "bakri.mp3");
    const payload = {
      embeds: [makeEmbed({
        color: 0x00BFFF, title: "⚛️ M. Bakri — Cours de Physique",
        description: `${interaction.user} invoque **M. Bakri** ! 🧪\n\n> *"Alors, qui peut me rappeler la formule ?"*\n> *RKO depuis le bureau* 🪑💥`,
        thumbnail: C.LOGO_URL,
        fields: [
          { name: "📚 Matière", value: "`Physique-Chimie`", inline: true },
          { name: "🥋 Technique", value: "`RKO niveau 5`", inline: true },
          { name: "🔊 Audio", value: "🎵 Son ci-dessous !", inline: true },
        ],
      })],
    };
    if (attachment) payload.files = [attachment];
    return interaction.editReply(payload);
  }

  // ══════════════════════════════════════════════════════════
  //  NAIM
  // ══════════════════════════════════════════════════════════
  if (cmd === "naim") {
    await interaction.deferReply();
    const attachment = await sendMp3Attachment(interaction, "naim", "naim.mp3");
    const payload = {
      embeds: [makeEmbed({
        color: C.PURPLE, title: "🎤 Naim — Le son du goat",
        description: `${interaction.user} balance le son de **Naim** ! 🔥\n\n> *C'est lui le vrai goat, tout le monde le sait.*\n> *Le son résonne dans tout le vocal.* 🎵`,
        thumbnail: C.LOGO_URL,
        fields: [
          { name: "🎤 Artiste", value: "`Naim`", inline: true },
          { name: "🎵 Qualité", value: "`Banger absolu`", inline: true },
          { name: "🔊 Audio", value: "🎵 Son ci-dessous !", inline: true },
        ],
      })],
    };
    if (attachment) payload.files = [attachment];
    return interaction.editReply(payload);
  }
  // ══════════════════════════════════════════════════════════
  //  BOBARD — sans son
  // ══════════════════════════════════════════════════════════
  if (cmd === "bobard") {
    const bobards = [
      { claim: "Elsa Bobert a dit que les maths c'est facile", verdict: "BOBARD 🤥", detail: "Personne ayant un cerveau ne dirait ça." },
      { claim: "Elsa Bobert a rendu son devoir à l'heure", verdict: "BOBARD 🤥", detail: "Impossible. Scientifiquement prouvé." },
      { claim: "Elsa Bobert connaît la différence entre offre et demande", verdict: "BOBARD 🤥", detail: "Même Descamps en doute." },
      { claim: "Elsa Bobert a passé une journée sans bobard", verdict: "BOBARD QUANTIQUE 🌀", detail: "Le simple fait d'énoncer ceci est un bobard." },
      { claim: "Elsa Bobert a trouvé la réponse à la question de Vittel", verdict: "VRAI POSSIBLE ✅", detail: "...mais le hasard peut faire des miracles." },
    ];
    const b = bobards[Math.floor(Math.random() * bobards.length)];
    return interaction.reply({ embeds: [makeEmbed({ color: C.PINK, title: "🤥 BOBARD DÉTECTEUR — Elsa Bobert Edition", description: `**Affirmation :** *"${b.claim}"*\n\n**Verdict : ${b.verdict}**\n\n> ${b.detail}`, thumbnail: C.LOGO_URL, fields: [{ name: "🎭 Sujet", value: "`Elsa Bobert`", inline: true }, { name: "🔬 Source", value: "`Bobard-o-mètre v2`", inline: true }] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  RAOUDI — sans son
  // ══════════════════════════════════════════════════════════
  if (cmd === "raoudi") {
    await interaction.deferReply();
    const target = await interaction.guild.members.fetch("852993628242575390").catch(() => null);
    return interaction.editReply({ embeds: [makeEmbed({ color: C.GOLD, title: "🎰 Le Compte de Raoudi", author: target ? { name: target.user.username, iconURL: target.user.displayAvatarURL({ dynamic: true }) } : { name: "Raoudi", iconURL: C.LOGO_URL }, description: target ? `Voilà le fameux **${target.user.username}** ! 👀\n\n> *"C'est moi le vrai Raoudi."* 😎` : `❌ Raoudi s'est **barré** ou est introuvable...`, thumbnail: target ? target.user.displayAvatarURL({ dynamic: true }) : C.LOGO_URL, fields: target ? [{ name: "🏷️ Tag", value: `\`${target.user.tag}\``, inline: true }, { name: "📅 Sur le serveur depuis", value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true }, { name: "🎭 Rôles", value: `${target.roles.cache.size - 1}`, inline: true }] : [] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  OBLED — sans son
  // ══════════════════════════════════════════════════════════
  if (cmd === "obled") {
    const codes = [
      "print('Bonjour M. Obled')",
      "while True:\n    print('Thonny crash encore')",
      "import thonny\nthonny.launch()  # ça marche jamais",
      "x = input('Entrez une valeur : ')\nprint(x * 2)  # TypeError intensifies",
      "def cours_python():\n    pass  # TODO: comprendre",
    ];
    const code = codes[Math.floor(Math.random() * codes.length)];
    return interaction.reply({ embeds: [makeEmbed({ color: 0x3776AB, title: "🐍 M. Obled — Cours de Python", description: `${interaction.user} ouvre **Thonny**... 💻\n\n\`\`\`python\n${code}\n\`\`\`\n> *"Alors, vous voyez l'erreur ?"* 🤓`, thumbnail: C.LOGO_URL, fields: [{ name: "🛠️ IDE", value: "`Thonny 4.x`", inline: true }, { name: "🐍 Langage", value: "`Python 3`", inline: true }, { name: "📊 TPS cours", value: "`2.0 (ça lag)`", inline: true }] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  BOURGIN — sans son
  // ══════════════════════════════════════════════════════════
  if (cmd === "bourgin") {
    const reussi = Math.random() > 0.4;
    return interaction.reply({ embeds: [makeEmbed({ color: 0x8B4513, title: "🧱 WALL JUMP !!!", description: `${interaction.user} tente le **WALL JUMP** ! 🏃💨\n\n${reussi ? "**BOING** 🚀 — Saut réussi ! M. Bourgin est fier." : "**SPLAT** 💀 — Raté. Le mur dit non."}`, thumbnail: C.LOGO_URL, fields: [{ name: "🧱 Mur touché", value: "`Oui`", inline: true }, { name: "🦘 Saut réussi", value: reussi ? "`OUI 🎉`" : "`NON 💀`", inline: true }, { name: "📐 Angle", value: `\`${Math.floor(Math.random() * 90)}°\``, inline: true }] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  JOUEURS
  // ══════════════════════════════════════════════════════════
  if (cmd === "joueurs") {
    await interaction.deferReply();
    const data = await getServerData();
    if (!data || !data.online) return interaction.editReply({ embeds: [makeEmbed({ color: C.RED, title: "❌ Serveur hors ligne", fields: [{ name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }] })] });
    const players = data.players?.list?.map(p => `• \`${p.name}\``).join("\n") || "*Aucun joueur connecté*";
    return interaction.editReply({ embeds: [makeEmbed({ color: C.GREEN, title: "👥 Joueurs connectés sur Soulakri", thumbnail: C.LOGO_URL, description: players, fields: [{ name: "👤 En ligne", value: `**${data.players?.online ?? 0}** / ${data.players?.max ?? 0}`, inline: true }, { name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }, { name: "📦 Version", value: `\`${data.version ?? "?"}\``, inline: true }] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  STATSERVEUR
  // ══════════════════════════════════════════════════════════
  if (cmd === "statserveur") {
    await interaction.deferReply();
    const data = await getServerData();
    if (!data || !data.online) return interaction.editReply({ embeds: [makeEmbed({ color: C.RED, title: "❌ Serveur hors ligne", fields: [{ name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }] })] });
    return interaction.editReply({ embeds: [makeEmbed({ color: C.CYAN, title: "🌐 Statut du serveur Soulakri", thumbnail: C.LOGO_URL, description: "Le serveur est **en ligne** ✅", fields: [{ name: "👤 Joueurs", value: `${data.players?.online ?? 0} / ${data.players?.max ?? 0}`, inline: true }, { name: "📦 Version", value: `\`${data.version ?? "?"}\``, inline: true }, { name: "🏓 MOTD", value: data.motd?.clean?.[0] ?? "Soulakri MC", inline: false }, { name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  OBJECTIF
  // ══════════════════════════════════════════════════════════
  if (cmd === "objectif") {
    const obj = loadObjectif();
    return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, title: "🎯 Objectif actuel — Soulakri", description: `> ${obj.texte}`, thumbnail: C.LOGO_URL, fields: obj.updatedBy ? [{ name: "✏️ Mis à jour par", value: `<@${obj.updatedBy}>`, inline: true }, { name: "📅 Le", value: `<t:${Math.floor(obj.updatedAt / 1000)}:D>`, inline: true }] : [] })] });
  }

  // ══════════════════════════════════════════════════════════
  //  SONDAGE — interface améliorée avec boutons
  // ══════════════════════════════════════════════════════════
  if (cmd === "sondage") {
    const question = interaction.options.getString("question");
    const choix    = [1, 2, 3, 4].map(i => interaction.options.getString(`choix${i}`)).filter(Boolean);
    const emojis   = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

    const embed = makeEmbed({
      color:       C.PURPLE,
      author:      { name: `📊 Sondage — ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) },
      title:       question,
      description: choix.length
        ? choix.map((c, i) => `${emojis[i]} **${c}**`).join("\n\n")
        : "Réponds avec ✅ ou ❌",
      fields:      [
        { name: "📣 Lancé par",    value: interaction.user.toString(), inline: true },
        { name: "🗳️ Participation", value: "Réagis ci-dessous !",       inline: true },
      ],
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("poll_results").setLabel("📊 Voir résultats").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("poll_close").setLabel("🔒 Fermer").setStyle(ButtonStyle.Danger),
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    if (choix.length) {
      for (let i = 0; i < choix.length; i++) await msg.react(emojis[i]).catch(() => {});
    } else {
      await msg.react("✅").catch(() => {});
      await msg.react("❌").catch(() => {});
    }
    return;
  }

  // ══════════════════════════════════════════════════════════
  //  RAPPEL
  // ══════════════════════════════════════════════════════════
  if (cmd === "rappel") {
    const minutes = interaction.options.getInteger("minutes"), message = interaction.options.getString("message");
    if (minutes < 1 || minutes > 1440) return interaction.reply({ content: "❌ Entre 1 et 1440 minutes.", ephemeral: true });
    await interaction.reply({ embeds: [makeEmbed({ color: C.CYAN, title: "⏰ Rappel enregistré !", description: `Je te rappellerai dans **${minutes} min**.\n📌 *${message}*` })], ephemeral: true });
    setTimeout(async () => {
      try { await interaction.user.send({ embeds: [makeEmbed({ color: C.GOLD, title: "🔔 Rappel Soulakri !", description: `Tu m'avais demandé de te rappeler :\n\n> **${message}**` })] }); }
      catch { const ch = interaction.channel; if (ch) await ch.send({ content: `${interaction.user} 🔔 Rappel : **${message}**` }).catch(() => {}); }
    }, minutes * 60 * 1000);
    return;
  }

  // ══════════════════════════════════════════════════════════
  //  ANNIVERSAIRE
  // ══════════════════════════════════════════════════════════
  if (cmd === "anniversaire") {
    const date = interaction.options.getString("date");
    if (!/^\d{2}\/\d{2}$/.test(date)) return interaction.reply({ content: "❌ Format invalide. Utilise **JJ/MM** (ex: `25/12`).", ephemeral: true });
    const [d, m] = date.split("/").map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return interaction.reply({ content: "❌ Date invalide.", ephemeral: true });
    const bdays = loadBirthdays();
    bdays[interaction.user.id] = date;
    saveBirthdays(bdays);
    return interaction.reply({ embeds: [makeEmbed({ color: C.PINK, title: "🎂 Anniversaire enregistré !", description: `Ton anniversaire est le **${date}**.\nJe t'enverrai un message spécial ce jour-là ! 🎉` })], ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  TICKET
  // ══════════════════════════════════════════════════════════
  if (cmd === "ticket") {
    try {
      const guild     = interaction.guild, member = interaction.member;
      const ticketName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const existing  = guild.channels.cache.find(c => c.name === ticketName);
      if (existing) return interaction.reply({ content: `❌ Ticket déjà ouvert : ${existing}`, ephemeral: true });
      const category  = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("support"));
      const adminR    = guild.roles.cache.get(C.ROLE_ADMIN), modR = guild.roles.cache.get(C.ROLE_MOD);
      const allow     = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];
      const overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: member.id, allow }];
      if (adminR) overwrites.push({ id: adminR.id, allow });
      if (modR)   overwrites.push({ id: modR.id, allow });
      const ticketCh = await guild.channels.create({ name: ticketName, type: ChannelType.GuildText, parent: category?.id ?? null, permissionOverwrites: overwrites, topic: `Ticket de ${member.user.tag}` });
      await ticketCh.send({ content: `${member}${adminR ? " " + adminR : ""}`, embeds: [makeEmbed({ color: C.BLUE, author: { name: "Support Soulakri", iconURL: C.LOGO_URL }, title: "🎫 Ticket de support", description: `Bonjour **${member.user.username}** ! 👋\nUn modérateur va te répondre dès que possible.\n\n**Explique ton problème ci-dessous.**` })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger))] });
      return interaction.reply({ content: `✅ Ticket créé : ${ticketCh}`, ephemeral: true });
    } catch (err) { console.error("/ticket :", err); if (!interaction.replied) return interaction.reply({ content: "❌ Impossible de créer le ticket.", ephemeral: true }); }
  }

  // ══════════════════════════════════════════════════════════
  //  WARN / WARNS / CLEARWARN
  // ══════════════════════════════════════════════════════════
  if (cmd === "warn") {
    const target = interaction.options.getMember("membre");
    const raison  = interaction.options.getString("raison");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: "❌ Tu ne peux pas te warn toi-même.", ephemeral: true });

    const warns = addWarn(target.id, interaction.user.id, raison);
    const count = warns.length;

    await interaction.reply({ embeds: [makeEmbed({ color: C.ORANGE, title: `⚠️ Avertissement — ${target.user.username}`, description: `**${target}** a reçu un avertissement.`, fields: [{ name: "📝 Raison", value: raison, inline: false }, { name: "👮 Par", value: interaction.user.toString(), inline: true }, { name: "🔢 Warns total", value: `**${count}** / ${C.MAX_WARNS}`, inline: true }] })] });
    logAction(interaction.guild, { title: "⚠️ Warn", description: `**${target.user.tag}** averti par **${interaction.user.tag}**`, color: C.ORANGE, fields: [{ name: "Raison", value: raison }, { name: "Warns total", value: `${count}/${C.MAX_WARNS}` }] });

    try { await target.user.send({ embeds: [makeEmbed({ color: C.ORANGE, title: `⚠️ Tu as reçu un avertissement sur Soulakri`, description: `**Raison :** ${raison}\n**Warns :** ${count} / ${C.MAX_WARNS}\n\n${count >= C.MAX_WARNS ? "⛔ **Tu as atteint le maximum — un ban a été appliqué automatiquement.**" : ""}` })] }); } catch {}

    if (count >= C.MAX_WARNS) {
      try {
        await target.ban({ reason: `Auto-ban — ${C.MAX_WARNS} avertissements accumulés` });
        await interaction.followUp({ embeds: [makeEmbed({ color: C.RED, title: "🔨 Ban automatique !", description: `**${target.user.tag}** a atteint **${C.MAX_WARNS} warns** et a été banni automatiquement.` })] });
        logAction(interaction.guild, { title: "🔨 Auto-Ban (3 warns)", description: `**${target.user.tag}** banni automatiquement`, color: C.RED });
        clearWarns(target.id);
      } catch (err) { console.error("[Warn] Auto-ban :", err); }
    }
    return;
  }

  if (cmd === "warns") {
    const target = interaction.options.getMember("membre");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const warns = getWarns(target.id);
    if (!warns.length) return interaction.reply({ embeds: [makeEmbed({ color: C.GREEN, title: `✅ ${target.user.username} — Aucun warn`, description: "Ce membre est clean !" })], ephemeral: true });
    const warnList = warns.map((w, i) => `**${i + 1}.** \`ID:${w.id}\`\n> ${w.raison}\n> Par <@${w.moderatorId}> — <t:${Math.floor(w.date / 1000)}:D>`).join("\n\n");
    return interaction.reply({ embeds: [makeEmbed({ color: C.ORANGE, title: `⚠️ Warns de ${target.user.username}`, description: warnList, fields: [{ name: "🔢 Total", value: `**${warns.length}** / ${C.MAX_WARNS}`, inline: true }], thumbnail: target.user.displayAvatarURL({ dynamic: true }) })], ephemeral: true });
  }

  if (cmd === "clearwarn") {
    const target = interaction.options.getMember("membre");
    const warnId = interaction.options.getString("warn_id");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (warnId) {
      const id = parseInt(warnId);
      if (isNaN(id)) return interaction.reply({ content: "❌ ID invalide.", ephemeral: true });
      const removed = removeWarn(target.id, id);
      if (!removed) return interaction.reply({ content: "❌ Warn introuvable avec cet ID.", ephemeral: true });
      await interaction.reply({ embeds: [makeEmbed({ color: C.GREEN, title: "🧹 Warn supprimé", description: `Le warn \`${id}\` de **${target.user.tag}** a été supprimé.` })], ephemeral: true });
    } else {
      clearWarns(target.id);
      await interaction.reply({ embeds: [makeEmbed({ color: C.GREEN, title: "🧹 Warns effacés", description: `Tous les warns de **${target.user.tag}** ont été supprimés.` })], ephemeral: true });
    }
    logAction(interaction.guild, { title: "🧹 Clearwarn", description: `Warns de **${target.user.tag}** effacés par **${interaction.user.tag}**`, color: C.GREEN });
    return;
  }

  // ══════════════════════════════════════════════════════════
  //  GIVEAWAY
  // ══════════════════════════════════════════════════════════
  if (cmd === "giveaway") {
    const prize    = interaction.options.getString("lot");
    const duration = interaction.options.getInteger("duree");
    const winners  = interaction.options.getInteger("gagnants") ?? 1;
    if (duration < 1) return interaction.reply({ content: "❌ Durée minimum : 1 minute.", ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    const endsAt  = Date.now() + duration * 60 * 1000;
    const channel = interaction.channel;

    const embed = makeEmbed({ color: C.GOLD, title: "🎉 GIVEAWAY !", description: `Réagis avec 🎉 pour participer !\n\n**Lot :** ${prize}\n**Gagnant(s) :** ${winners}\n**Se termine :** <t:${Math.floor(endsAt / 1000)}:R>`, thumbnail: C.LOGO_URL, fields: [{ name: "⏳ Durée", value: formatDuration(duration * 60 * 1000), inline: true }, { name: "🎁 Lot", value: prize, inline: true }, { name: "🏆 Gagnants", value: String(winners), inline: true }, { name: "👤 Lancé par", value: interaction.user.toString(), inline: true }] });
    const msg = await channel.send({ embeds: [embed] });
    await msg.react("🎉");

    const giveawayId = `${msg.id}`;
    const giveaways  = loadGiveaways();
    giveaways[giveawayId] = { messageId: msg.id, channelId: channel.id, prize, winners, endsAt, hostId: interaction.user.id, ended: false };
    saveGiveaways(giveaways);
    scheduleGiveaway(giveawayId, endsAt);
    return interaction.editReply({ content: `✅ Giveaway lancé dans ${channel} ! Se termine <t:${Math.floor(endsAt / 1000)}:R>.` });
  }

  // ══════════════════════════════════════════════════════════
  //  BAN / KICK / MUTE / UNMUTE
  // ══════════════════════════════════════════════════════════
  if (cmd === "ban") {
    const target = interaction.options.getMember("membre"), raison = interaction.options.getString("raison") || "Aucune raison";
    if (!target?.bannable) return interaction.reply({ content: "❌ Impossible de bannir.", ephemeral: true });
    try {
      await target.ban({ reason: raison });
      await interaction.reply({ embeds: [makeEmbed({ color: C.RED, title: "🔨 Membre banni", fields: [{ name: "👤 Membre", value: target.user.tag, inline: true }, { name: "👮 Par", value: interaction.user.tag, inline: true }, { name: "📝 Raison", value: raison }] })] });
      logAction(interaction.guild, { title: "🔨 Ban", description: `**${target.user.tag}** banni par **${interaction.user.tag}**`, color: C.RED, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur ban.", ephemeral: true }); }
    return;
  }
  if (cmd === "kick") {
    const target = interaction.options.getMember("membre"), raison = interaction.options.getString("raison") || "Aucune raison";
    if (!target?.kickable) return interaction.reply({ content: "❌ Impossible d'expulser.", ephemeral: true });
    try {
      await target.kick(raison);
      await interaction.reply({ embeds: [makeEmbed({ color: C.ORANGE, title: "👢 Membre expulsé", fields: [{ name: "👤 Membre", value: target.user.tag, inline: true }, { name: "👮 Par", value: interaction.user.tag, inline: true }, { name: "📝 Raison", value: raison }] })] });
      logAction(interaction.guild, { title: "👢 Kick", description: `**${target.user.tag}** expulsé par **${interaction.user.tag}**`, color: C.ORANGE, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur kick.", ephemeral: true }); }
    return;
  }
  if (cmd === "mute") {
    const target = interaction.options.getMember("membre"), minutes = interaction.options.getInteger("minutes"), raison = interaction.options.getString("raison") || "Aucune raison";
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (minutes < 1 || minutes > 40320) return interaction.reply({ content: "❌ Durée invalide.", ephemeral: true });
    try {
      await target.timeout(minutes * 60 * 1000, raison);
      await interaction.reply({ embeds: [makeEmbed({ color: C.PURPLE, title: "🔇 Membre mute", fields: [{ name: "👤 Membre", value: target.user.tag, inline: true }, { name: "👮 Par", value: interaction.user.tag, inline: true }, { name: "⏱️ Durée", value: `${minutes} min`, inline: true }, { name: "📝 Raison", value: raison }] })] });
      logAction(interaction.guild, { title: "🔇 Mute", description: `**${target.user.tag}** mute ${minutes}min par **${interaction.user.tag}**`, color: C.PURPLE, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur mute.", ephemeral: true }); }
    return;
  }
  if (cmd === "unmute") {
    const target = interaction.options.getMember("membre");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    try {
      await target.timeout(null);
      return interaction.reply({ embeds: [makeEmbed({ color: C.GREEN, title: "🔊 Mute retiré", fields: [{ name: "👤 Membre", value: target.user.tag, inline: true }, { name: "👮 Par", value: interaction.user.tag, inline: true }] })] });
    } catch { return interaction.reply({ content: "❌ Erreur unmute.", ephemeral: true }); }
  }

  // ══════════════════════════════════════════════════════════
  //  MC-OBJECTIF
  // ══════════════════════════════════════════════════════════
  if (cmd === "mc-objectif") {
    const texte = interaction.options.getString("texte");
    const obj   = { texte, updatedBy: interaction.user.id, updatedAt: Date.now() };
    saveObjectif(obj);
    await updateObjectifChannel(interaction.guild, obj);
    return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, title: "🎯 Objectif mis à jour !", description: `> ${texte}\n\n✅ Salon <#${C.CHANNEL_OBJECTIF}> mis à jour.` })], ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  SET-COOKIE
  // ══════════════════════════════════════════════════════════
  if (cmd === "set-cookie") {
    const cookie = interaction.options.getString("cookie");
    process.env.FALIX_SESSION = cookie;
    fs.writeFileSync("./falix_session.txt", cookie);
    checkBedrockPort().catch(console.error);
    return interaction.reply({ embeds: [makeEmbed({ color: C.GREEN, title: "🍪 Cookie FalixNodes mis à jour !", description: "✅ Cookie mis à jour.\n🔄 Vérification du port Bedrock relancée.\n⚠️ Mets aussi à jour `FALIX_SESSION` dans Railway." })], ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  REGLEMENT — amélioré
  // ══════════════════════════════════════════════════════════
  if (cmd === "reglement") {
    const ch = interaction.guild.channels.cache.get(C.CHANNEL_REGLEMENT);
    if (!ch) return interaction.reply({ content: "❌ Salon règlement introuvable.", ephemeral: true });
    const embed = makeEmbed({
      color:       C.GOLD,
      author:      { name: "Soulakri — Règlement officiel", iconURL: C.LOGO_URL },
      title:       "📜 Règlement du serveur Soulakri",
      thumbnail:   C.LOGO_URL,
      description: "Bienvenue sur **Soulakri** ! 🎮\nLis les règles ci-dessous et clique **✅ J'accepte** pour débloquer l'accès complet.\n\u200b",
      fields: [
        { name: "1️⃣  Respect mutuel",     value: "Insultes, harcèlement et discriminations → **ban immédiat**.",              inline: false },
        { name: "2️⃣  Anti-cheat",         value: "Tout hack, client modifié ou exploit est **strictement interdit**.",        inline: false },
        { name: "3️⃣  Anti-grief",         value: "Détruire ou voler les constructions d'autrui est **interdit**.",            inline: false },
        { name: "4️⃣  Langage",            value: "Pas de spam, flood, caps excessif ni contenu inapproprié.",                 inline: false },
        { name: "5️⃣  Pas de publicité",   value: "Aucune pub pour un autre serveur sans autorisation préalable.",             inline: false },
        { name: "6️⃣  Respect des admins", value: "Les décisions des modérateurs sont **définitives**.",                      inline: false },
        { name: "7️⃣  Fair-play",          value: "Soulakri est un serveur fun. Joue dans l'esprit de la commu ! 🌟",         inline: false },
        { name: "\u200b",                  value: "✅ **Si tu acceptes, clique sur le bouton ci-dessous.**",                   inline: false },
      ],
    }).setFooter({ text: `${C.FOOTER} • Règlement v2.0`, iconURL: C.LOGO_URL });

    await ch.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("accept_rules").setLabel("✅  J'accepte le règlement").setStyle(ButtonStyle.Success))] });
    return interaction.reply({ content: `✅ Règlement posté dans <#${C.CHANNEL_REGLEMENT}> !`, ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  ROLES — amélioré
  // ══════════════════════════════════════════════════════════
  if (cmd === "roles") {
    const ch = interaction.guild.channels.cache.get(C.CHANNEL_ROLES);
    if (!ch) return interaction.reply({ content: "❌ Salon rôles introuvable.", ephemeral: true });
    const embed = makeEmbed({
      color:       C.PURPLE,
      author:      { name: "Soulakri — Choisir ses rôles", iconURL: C.LOGO_URL },
      title:       "🎭 Personnalise ton profil Soulakri",
      thumbnail:   C.LOGO_URL,
      description: "Sélectionne tes rôles dans le menu déroulant. Tu peux en choisir **plusieurs** et changer à tout moment !\n\u200b",
      fields: [
        { name: "🔨 Builder",        value: "Tu aimes construire des structures impressionnantes.",  inline: true },
        { name: "⚔️ PvP",            value: "Tu adores les combats et la compétition.",              inline: true },
        { name: "🌲 Survie",          value: "Joueur survie pur, tu aimes explorer et survivre.",    inline: true },
        { name: "🔔 Notifications",   value: "Reçois les annonces importantes du serveur.",          inline: true },
      ],
    });
    const menu = new StringSelectMenuBuilder()
      .setCustomId("role_selector")
      .setPlaceholder("🎭 Sélectionne tes rôles...")
      .setMinValues(0)
      .setMaxValues(4)
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("🔨 Builder").setDescription("Tu aimes construire").setValue(C.ROLE_BUILDER).setEmoji("🔨"),
        new StringSelectMenuOptionBuilder().setLabel("⚔️ PvP").setDescription("Tu adores les combats").setValue(C.ROLE_PVP).setEmoji("⚔️"),
        new StringSelectMenuOptionBuilder().setLabel("🌲 Survie").setDescription("Joueur survie pur").setValue(C.ROLE_SURVIE).setEmoji("🌲"),
        new StringSelectMenuOptionBuilder().setLabel("🔔 Notifications").setDescription("Recevoir les annonces").setValue(C.ROLE_NOTIFS).setEmoji("🔔"),
      );
    await ch.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
    return interaction.reply({ content: `✅ Sélecteur posté dans <#${C.CHANNEL_ROLES}> !`, ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  VITTEL
  // ══════════════════════════════════════════════════════════
  if (cmd === "vittel") {
    const cfg = loadConfig();
    const ch  = interaction.guild.channels.cache.get(cfg.vittel.channel || C.CHANNEL_MATHS);
    if (!ch) return interaction.reply({ content: "❌ Salon maths introuvable.", ephemeral: true });
    if (vittelActive) return interaction.reply({ content: "⚠️ Une question est déjà en cours !", ephemeral: true });
    await runVittelQuestion(ch);
    return interaction.reply({ content: `✅ Question lancée dans ${ch} !`, ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  TARNEC-THEME
  // ══════════════════════════════════════════════════════════
  if (cmd === "tarnec-theme") {
    const theme = interaction.options.getString("theme");
    const cfg   = loadConfig();
    cfg.tarnec.theme = theme;
    saveConfig(cfg);
    tarnecFactIndex = 0;
    startTarnecBot();
    return interaction.reply({ embeds: [makeEmbed({ color: 0x8E44AD, title: "🗺️ Thème LeTarnec mis à jour !", description: `Nouveau thème : **${theme}**${!TARNEC_FACTS[theme] ? "\n\n⚠️ Thème personnalisé — facts par défaut utilisés." : ""}` })], ephemeral: true });
  }

  // ══════════════════════════════════════════════════════════
  //  CONFIG — panneau global
  // ══════════════════════════════════════════════════════════
  if (cmd === "config") {
    const cfg = loadConfig();
    return interaction.reply({ embeds: [buildConfigMainEmbed(cfg)], components: [buildConfigMainRow()], ephemeral: true });
  }

});

// ============================================================
//  HELPER — ServerInfo row
// ============================================================

function buildServerInfoRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("sinfo_membres").setLabel("👥 Membres").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("sinfo_salons").setLabel("💬 Salons").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("sinfo_roles").setLabel("🎭 Rôles").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("sinfo_boost").setLabel("🚀 Boosts").setStyle(ButtonStyle.Secondary),
  );
}

// ============================================================
//  HELPER — TOP avec pagination
// ============================================================

async function handleTopPage(interaction, page, isUpdate) {
  const sorted = Object.entries(xpData)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp);

  const totalPages = Math.max(1, Math.ceil(sorted.length / C.TOP_PAGE_SIZE));
  const safePage   = Math.max(1, Math.min(page, totalPages));
  const slice      = sorted.slice((safePage - 1) * C.TOP_PAGE_SIZE, safePage * C.TOP_PAGE_SIZE);
  const medals     = ["🥇", "🥈", "🥉"];
  const offset     = (safePage - 1) * C.TOP_PAGE_SIZE;

  const embed = makeEmbed({
    color:  C.GOLD,
    author: { name: "Soulakri — Classement XP", iconURL: C.LOGO_URL },
    title:  `🏆 Top joueurs — Page ${safePage}/${totalPages}`,
    thumbnail: C.LOGO_URL,
    description: slice.length
      ? slice.map((u, i) => `${medals[offset + i] || `**${offset + i + 1}.**`} <@${u.id}> — Niv. **${u.level}** · ${u.xp} XP`).join("\n")
      : "*Aucun joueur dans le classement.*",
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`top_page_${safePage - 1}`).setLabel("◀ Précédent").setStyle(ButtonStyle.Secondary).setDisabled(safePage <= 1),
    new ButtonBuilder().setCustomId(`top_page_${safePage + 1}`).setLabel("Suivant ▶").setStyle(ButtonStyle.Secondary).setDisabled(safePage >= totalPages),
  );

  const payload = { embeds: [embed], components: [row] };
  if (isUpdate) return interaction.update(payload);
  return interaction.reply(payload);
}

// ============================================================
//  CONNEXION
// ============================================================

if (!process.env.FALIX_SESSION && fs.existsSync("./falix_session.txt")) {
  process.env.FALIX_SESSION = fs.readFileSync("./falix_session.txt", "utf8").trim();
  console.log("[Falix] Cookie chargé depuis falix_session.txt");
}

client.login(TOKEN);
