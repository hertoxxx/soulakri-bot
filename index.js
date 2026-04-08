// ============================================================
//  SOULAKRI BOT v9 — discord.js v14
//  + Auto-update port Geyser via FalixNodes API (lecture directe)
// ============================================================

require("dotenv").config();
const fs = require("fs");
const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, SlashCommandBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  REST, Routes, ChannelType, PermissionFlagsBits,
} = require("discord.js");

// ============================================================
//  CONFIG
// ============================================================

const C = {
  GUILD_ID:          "1487136081152577556",
  CHANNEL_REGLEMENT: "1487136083627086010",
  CHANNEL_BIENVENUE: "1487136083627086009",
  CHANNEL_LOGS:      "1487136083132284951",
  CHANNEL_ROLES:     "1487136083627086011",
  CHANNEL_MATHS:     "1487136084986040467",
  CHANNEL_BEDROCK:   "1487136084214157382",

  ROLE_JOUEUR:      "1489335006290776174",
  ROLE_NON_VERIFIE: "1489335084568936498",
  ROLE_ADMIN:       "1487136081198448730",
  ROLE_MOD:         "1487136081198448729",
  ROLE_BUILDER:     "1489909890246905866",
  ROLE_PVP:         "1489909976070750279",
  ROLE_SURVIE:      "1489910021876875354",
  ROLE_NOTIFS:      "1489910094287077466",

  MC_IP:        "soulakri.falix.gg",
  MC_PORT:      "22608",
  MC_BEDROCK_IP: "eu15-free.falixserver.net",
  FALIX_SERVER: "2870153",

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
//  BEDROCK — stockage cache local
// ============================================================

const BEDROCK_FILE = "./bedrock.json";
function loadBedrock() {
  if (!fs.existsSync(BEDROCK_FILE)) return { ip: "", port: "", updatedAt: null };
  try { return JSON.parse(fs.readFileSync(BEDROCK_FILE, "utf8")); } catch { return { ip: "", port: "", updatedAt: null }; }
}
function saveBedrock(data) { fs.writeFileSync(BEDROCK_FILE, JSON.stringify(data, null, 2)); }

// ============================================================
//  FALIX API — headers
// ============================================================

function getFalixHeaders() {
  return {
    "Content-Type": "application/json",
    "Cookie": process.env.FALIX_SESSION || "",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://client.falixnodes.net",
    "Referer": `https://client.falixnodes.net/server/${C.FALIX_SERVER}/edit?path=%2Fplugins%2FGeyser-Spigot%2Fconfig.yml&mime=text%2Fplain`,
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
  } catch (err) {
    return { ok: false, reason: "error", message: err.message };
  }
}

// ============================================================
//  FALIX API — lire le port Bedrock depuis config.yml
// ============================================================

const networkResult = await getFalixNetworkInfo();

if (!networkResult.ok) {
  if (networkResult.reason === "cookie_expired") {
    console.warn("[Bedrock] Cookie expiré — surveillance impossible.");
    const guild = client.guilds.cache.get(C.GUILD_ID);
    const logCh = guild?.channels.cache.get(C.CHANNEL_LOGS);
    if (logCh) {
      const adminRole = guild.roles.cache.get(C.ROLE_ADMIN);
      await logCh.send({
        content: adminRole ? `${adminRole}` : "",
        embeds: [makeEmbed({
          color: C.RED,
          title: "⚠️ Cookie FalixNodes expiré",
          description: "Le bot ne peut plus surveiller le port Bedrock.\nUtilise `/set-cookie`",
        })],
      });
    }
  }
  return;
}

const newIP   = networkResult.ip;
const newPort = networkResult.port;

// ============================================================
//  FALIX API — modifier le port Bedrock dans config.yml
// ============================================================

async function updateGeyserPort(newPort) {
  try {
    const readResult = await getFalixBedrockPort();
    if (!readResult.ok) return readResult;

    const content = readResult.content;

    // Remplace le port dans la section bedrock: uniquement
    let updated = content.replace(
      /(^bedrock:\s*\n(?:.*\n)*?\s+port:\s*)\d+/m,
      `$1${newPort}`
    );

    // Fallback si la regex bedrock n'a rien changé
    if (updated === content) {
      updated = content.replace(/^(\s*port:\s*)\d+/m, `$1${newPort}`);
    }

    if (updated === content) return { ok: false, reason: "port_not_found" };

    const writeRes = await fetch(
      `https://client.falixnodes.net/api/v1/servers/${C.FALIX_SERVER}/files/write`,
      {
        method: "POST",
        headers: getFalixHeaders(),
        body: JSON.stringify({ file: "/plugins/Geyser-Spigot/config.yml", content: updated }),
      }
    );
    if (writeRes.status === 401 || writeRes.status === 403) return { ok: false, reason: "cookie_expired" };
    if (!writeRes.ok) throw new Error(`Écriture HTTP ${writeRes.status}`);
    return { ok: true };
  } catch (err) {
    console.error("[Falix] updateGeyserPort :", err.message);
    return { ok: false, reason: "error", message: err.message };
  }
}

// ============================================================
//  AUTO BEDROCK — détection + mise à jour automatique
// ============================================================

async function checkBedrockPort() {
  try {
    // Lecture directe du config.yml Geyser sur FalixNodes
    const falixResult = await getFalixBedrockPort();

    if (!falixResult.ok) {
      if (falixResult.reason === "cookie_expired") {
        console.warn("[Bedrock] Cookie expiré — surveillance impossible.");
        const guild = client.guilds.cache.get(C.GUILD_ID);
        const logCh = guild?.channels.cache.get(C.CHANNEL_LOGS);
        if (logCh) {
          const adminRole = guild.roles.cache.get(C.ROLE_ADMIN);
          await logCh.send({
            content: adminRole ? `${adminRole}` : "",
            embeds: [makeEmbed({
              color: C.RED,
              title: "⚠️ Cookie FalixNodes expiré",
              description: "Le bot ne peut plus surveiller le port Bedrock.\nUtilise `/set-cookie SESSION=nouveau; LoggedIn=72643100; falix_registered=1`",
            })],
          });
        }
      }
      return;
    }

    const newPort = falixResult.port;
    if (!newPort) return;

    try {
      const falixIPRes = await fetch(
        `https://client.falixnodes.net/api/v1/servers/${C.FALIX_SERVER}`,
        { headers: getFalixHeaders() }
      );
      if (falixIPRes.ok) {
        const falixData = await falixIPRes.json();
        const ip = falixData?.allocation?.ip || falixData?.ip || falixData?.node?.ip;
        if (ip) newIP = ip;
      }
    } catch {}

    const current = loadBedrock();
    if (current.port && current.ip === newIP && current.port === newPort) return;

    console.log(`[Bedrock] Changement détecté : ${current.port} → ${newPort}`);
    const updateResult = await updateGeyserPort(newPort);
    if (!updateResult.ok) {
      console.warn("[Bedrock] Échec écriture config.yml :", updateResult.reason);
    } else {
      console.log("[Bedrock] config.yml mis à jour ✅");
    }
    saveBedrock({ ip: newIP, port: newPort, updatedAt: Date.now() });

    const guild = client.guilds.cache.get(C.GUILD_ID);
    if (!guild) return;

    // Met à jour le message épinglé dans #bedrock
    await postBedrockMessage(newIP, newPort);

    // Log dans #logs
    const logCh = guild.channels.cache.get(C.CHANNEL_LOGS);
    if (logCh) {
      const adminRole = guild.roles.cache.get(C.ROLE_ADMIN);
      await logCh.send({
        content: adminRole ? `${adminRole}` : "",
        embeds: [makeEmbed({
          color: C.ORANGE,
          title: "⚠️ Port Bedrock changé — Redémarre le MC !",
          description:
            `**Ancien port :** \`${current.port || "inconnu"}\`\n` +
            `**Nouveau port :** \`${newPort}\`\n\n` +
            `✅ \`config.yml\` Geyser mis à jour automatiquement.\n` +
            `🔄 **Redémarre le serveur MC** sur FalixNodes pour appliquer le changement.`,
        })],
      });
    }
  } catch (err) {
    console.error("[Bedrock] Erreur checkBedrockPort :", err);
  }
}

// ============================================================
//  POST / EDIT message épinglé #bedrock
// ============================================================

async function postBedrockMessage(ip, port) {
  try {
    const guild = client.guilds.cache.get(C.GUILD_ID);
    const bedrockCh = guild?.channels.cache.get(C.CHANNEL_BEDROCK);
    if (!bedrockCh) return;

    const embed = makeEmbed({
      color: C.GREEN,
      title: "📱 Connexion Bedrock — Soulakri",
      thumbnail: C.LOGO_URL,
      description: "Infos pour rejoindre depuis **Minecraft Bedrock** (PE, Console, Win10) ✅",
      fields: [
        { name: "📡 Adresse IP", value: `\`\`\`${ip}\`\`\``,   inline: false },
        { name: "🔌 Port",       value: `\`\`\`${port}\`\`\``, inline: false },
        { name: "⚠️ Info",       value: "Ces infos changent à chaque redémarrage du serveur MC. Ce message est mis à jour automatiquement.", inline: false },
        { name: "📅 Mis à jour", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      ],
    });

    const pins  = await bedrockCh.messages.fetchPinned();
    const myPin = pins.find(m => m.author.id === client.user.id);
    if (myPin) {
      await myPin.edit({ embeds: [embed] });
    } else {
      const msg = await bedrockCh.send({ embeds: [embed] });
      await msg.pin().catch(() => {});
    }
  } catch (err) {
    console.error("[Bedrock] postBedrockMessage :", err);
  }
}

// ============================================================
//  WATCHER — démarre la surveillance (toutes les 15 min)
// ============================================================

async function startBedrockWatcher() {
  // Affiche les infos en cache au démarrage si dispo
  const cached = loadBedrock();
  if (cached.port) {
    await postBedrockMessage(cached.ip || C.MC_IP, cached.port);
  }
  // Puis vérifie depuis FalixNodes
  await checkBedrockPort();
  setInterval(checkBedrockPort, 15 * 60 * 1000);
}

// ============================================================
//  OBJECTIF
// ============================================================

const OBJECTIF_FILE = "./objectif.json";
function loadObjectif() {
  if (!fs.existsSync(OBJECTIF_FILE)) return { texte: "Aucun objectif défini pour l'instant.", updatedBy: null, updatedAt: null };
  try { return JSON.parse(fs.readFileSync(OBJECTIF_FILE, "utf8")); } catch { return { texte: "Aucun objectif défini.", updatedBy: null, updatedAt: null }; }
}
function saveObjectif(data) { fs.writeFileSync(OBJECTIF_FILE, JSON.stringify(data, null, 2)); }

// ============================================================
//  BLAGUES
// ============================================================

const BLAGUES = [
  { joke: "Pourquoi Creeper est toujours seul ?",               answer: "Parce qu'il fait exploser toutes ses relations ! 💥" },
  { joke: "Comment s'appelle un joueur Minecraft qui pleure ?", answer: "Un mineur en larmes ! ⛏️" },
  { joke: "Quel est le sport préféré des Endermen ?",           answer: "La téléportation marathon ! 🏃" },
  { joke: "Pourquoi Steve ne sourit jamais ?",                  answer: "Parce qu'il a perdu ses diamonds dans la lave ! 💎" },
  { joke: "Pourquoi les Zombies n'aiment pas le soleil ?",      answer: "Parce qu'il leur tape sur les nerfs… et sur la peau ! ☀️" },
];

// ============================================================
//  VITTEL BOT
// ============================================================

let vittelActive = null;

function generateMathQuestion() {
  const types = [
    () => {
      const a = [6, 7, 66, 77, 67, 76][Math.floor(Math.random() * 6)];
      const b = [6, 7, 6, 7, 6, 7][Math.floor(Math.random() * 6)];
      const ops = ["+", "-", "×"];
      const op  = ops[Math.floor(Math.random() * ops.length)];
      const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
      return { question: `${a} ${op} ${b} = ?`, answer: String(answer) };
    },
    () => {
      const vars = ["v", "b", "s"];
      const vn   = vars[Math.floor(Math.random() * vars.length)];
      const x    = Math.floor(Math.random() * 7) + 1;
      const b    = [6, 7, 6, 7, 14, 12][Math.floor(Math.random() * 6)];
      return { question: `${vn} + ${b} = ${x + b}, que vaut ${vn} ?`, answer: String(x) };
    },
    () => {
      const vars   = ["v", "b", "s"];
      const vn     = vars[Math.floor(Math.random() * vars.length)];
      const factor = [6, 7][Math.floor(Math.random() * 2)];
      const x      = Math.floor(Math.random() * 6) + 1;
      return { question: `${factor}${vn} = ${x * factor}, que vaut ${vn} ?`, answer: String(x) };
    },
    () => {
      const vars      = ["v", "b", "s"];
      const vn        = vars[Math.floor(Math.random() * vars.length)];
      const threshold = [6, 7, 12, 14][Math.floor(Math.random() * 4)];
      return {
        question: `${vn} < ${threshold} — donne un exemple de valeur possible pour ${vn}`,
        answer:   null,
        checkFn:  (r) => { const n = parseInt(r); return !isNaN(n) && n >= 0 && n < threshold; },
        hint:     `(entier entre 0 et ${threshold - 1})`,
      };
    },
    () => {
      const pad  = n => String(n).padStart(2, "0");
      const h    = [6, 7][Math.floor(Math.random() * 2)];
      const m    = [0, 6, 7, 12, 30, 42][Math.floor(Math.random() * 6)];
      const addM = [6, 7, 30, 60][Math.floor(Math.random() * 4)];
      const tot  = h * 60 + m + addM;
      return {
        question:  `Il est ${pad(h)}h${pad(m)}. Dans ${addM} min, quelle heure sera-t-il ?`,
        answer:    `${pad(Math.floor(tot / 60) % 24)}h${pad(tot % 60)}`,
        altAnswer: `${pad(Math.floor(tot / 60) % 24)}:${pad(tot % 60)}`,
      };
    },
  ];
  return types[Math.floor(Math.random() * types.length)]();
}

async function runVittelQuestion(channel) {
  if (vittelActive) return;
  const q = generateMathQuestion();
  await channel.send({ embeds: [makeEmbed({ color: 0x00BFFF, author: { name: "Vittel BOT", iconURL: C.LOGO_URL }, title: "🧮 Question mathématique !", description: `**${q.question}**\n\n⏱️ Vous avez **60 secondes** pour répondre !` }).setFooter({ text: "Tapez votre réponse directement dans ce salon" })] });
  const collector = channel.createMessageCollector({ filter: m => !m.author.bot, time: C.VITTEL_TIMEOUT_MS });
  vittelActive = { q, collector };
  collector.on("collect", async (m) => {
    const resp = m.content.trim().toLowerCase().replace(/\s/g, "");
    let correct = false;
    if (q.checkFn) { correct = q.checkFn(resp); }
    else {
      const expected = String(q.answer).toLowerCase().replace(/\s/g, "");
      const alt      = q.altAnswer ? String(q.altAnswer).toLowerCase().replace(/\s/g, "") : null;
      correct = resp === expected || (alt && resp === alt);
    }
    if (correct) {
      await channel.send({ embeds: [makeEmbed({ color: C.GREEN, author: { name: "Vittel BOT", iconURL: C.LOGO_URL }, title: "✅ Correct !", description: `**${m.author}** a trouvé ! 🎉\n📌 Réponse : **${q.checkFn ? resp : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}` }).setFooter({ text: "Prochaine question dans quelques minutes..." })] });
      collector.stop("answered");
    } else {
      await channel.send({ embeds: [makeEmbed({ color: C.RED, author: { name: "Vittel BOT", iconURL: C.LOGO_URL }, title: "❌ Faux !", description: `${m.author}, **${m.content}** est incorrect. Réessaie ! 💪` }).setTimestamp()] });
    }
  });
  collector.on("end", async (_, reason) => {
    vittelActive = null;
    if (reason !== "answered") await channel.send({ embeds: [makeEmbed({ color: C.ORANGE, author: { name: "Vittel BOT", iconURL: C.LOGO_URL }, title: "⏰ Temps écoulé !", description: `Personne n'a trouvé ! Réponse : **${q.checkFn ? "voir énoncé" : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}` })] }).catch(() => {});
  });
}

function startVittelBot() {
  setInterval(async () => {
    try {
      const guild   = client.guilds.cache.get(C.GUILD_ID);
      const channel = guild?.channels.cache.get(C.CHANNEL_MATHS);
      if (channel) await runVittelQuestion(channel);
    } catch (err) { console.error("Vittel BOT erreur :", err); }
  }, C.VITTEL_INTERVAL_MS);
}

// ============================================================
//  COMMANDES SLASH
// ============================================================

const COMMANDS = [
  new SlashCommandBuilder().setName("help").setDescription("Affiche toutes les commandes"),
  new SlashCommandBuilder().setName("ip").setDescription("IP du serveur Minecraft"),
  new SlashCommandBuilder().setName("bedrock").setDescription("📱 Infos connexion Bedrock (lu en direct)"),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Infos du serveur Discord"),
  new SlashCommandBuilder().setName("grade").setDescription("Ton grade et niveau XP"),
  new SlashCommandBuilder()
    .setName("niveau").setDescription("Niveau XP d'un joueur")
    .addUserOption(o => o.setName("joueur").setDescription("Joueur").setRequired(false)),
  new SlashCommandBuilder().setName("top").setDescription("Classement XP Top 10"),
  new SlashCommandBuilder()
    .setName("stats").setDescription("Stats d'un joueur Minecraft")
    .addStringOption(o => o.setName("pseudo").setDescription("Pseudo Minecraft").setRequired(true)),
  new SlashCommandBuilder().setName("blague").setDescription("Blague Minecraft aléatoire 😂"),
  new SlashCommandBuilder().setName("soules").setDescription("🔥 Soules lance une flash !"),
  new SlashCommandBuilder().setName("giry").setDescription("💥 Giry envoie la flash de Skye !"),
  new SlashCommandBuilder().setName("67").setDescription("🎲 Six Seven !"),
  new SlashCommandBuilder().setName("cassandre").setDescription("🔗 Cassandre sort Deadlock !"),
  new SlashCommandBuilder()
    .setName("ratio").setDescription("☑️ Ratio quelqu'un")
    .addUserOption(o => o.setName("cible").setDescription("La victime").setRequired(true)),
  new SlashCommandBuilder().setName("statserveur").setDescription("🌐 Statut du serveur Minecraft"),
  new SlashCommandBuilder().setName("joueurs").setDescription("👥 Joueurs connectés sur le MC"),
  new SlashCommandBuilder().setName("objectif").setDescription("🎯 Objectif actuel du serveur"),
  new SlashCommandBuilder()
    .setName("sondage").setDescription("📊 Créer un sondage rapide")
    .addStringOption(o => o.setName("question").setDescription("Ta question").setRequired(true))
    .addStringOption(o => o.setName("choix1").setDescription("Choix 1").setRequired(false))
    .addStringOption(o => o.setName("choix2").setDescription("Choix 2").setRequired(false))
    .addStringOption(o => o.setName("choix3").setDescription("Choix 3").setRequired(false))
    .addStringOption(o => o.setName("choix4").setDescription("Choix 4").setRequired(false)),
  new SlashCommandBuilder()
    .setName("rappel").setDescription("⏰ Se rappeler quelque chose")
    .addIntegerOption(o => o.setName("minutes").setDescription("Dans combien de minutes").setRequired(true))
    .addStringOption(o => o.setName("message").setDescription("De quoi te rappeler").setRequired(true)),
  new SlashCommandBuilder()
    .setName("mc-objectif").setDescription("🎯 Définir l'objectif du serveur (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("texte").setDescription("Nouvel objectif").setRequired(true)),
  new SlashCommandBuilder()
    .setName("set-cookie").setDescription("🍪 Mettre à jour le cookie FalixNodes (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("cookie").setDescription("Cookie complet : SESSION=xxx; LoggedIn=xxx; falix_registered=1").setRequired(true)),
  new SlashCommandBuilder()
    .setName("reglement").setDescription("Poster le règlement (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("roles").setDescription("Poster le sélecteur de rôles (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("vittel").setDescription("Lancer Vittel BOT dans le salon maths (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("ticket").setDescription("Ouvre un ticket support"),
  new SlashCommandBuilder()
    .setName("ban").setDescription("Bannir un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("kick").setDescription("Expulser un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("mute").setDescription("Mute temporaire (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Durée en minutes").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("unmute").setDescription("Retirer le mute (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)),
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
//  BOT PRÊT
// ============================================================

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} connecté !`);
  client.user.setActivity("Soulakri 🎮 | /help", { type: 0 });
  await registerCommands();
  startVittelBot();
  await startBedrockWatcher();
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
      description:
        `> Tu es le **${member.guild.memberCount}ème** joueur à rejoindre l'aventure Soulakri !\n\n` +
        `Avant de commencer, **une seule étape** :\n` +
        `➡️ Rends-toi dans <#${C.CHANNEL_REGLEMENT}>, lis les règles et clique **✅ J'accepte** pour tout débloquer.`,
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
      fields: [
        { name: "📋 Par où commencer ?", value: `1️⃣ Règlement → <#${C.CHANNEL_REGLEMENT}>\n2️⃣ Rôles → <#${C.CHANNEL_ROLES}>\n3️⃣ Minecraft → \`${C.MC_IP}\`` },
        { name: "👥 Membres", value: `**${member.guild.memberCount}**`, inline: true },
        { name: "🎮 Version", value: "`Java & Bedrock`", inline: true },
        { name: "🌍 Mode",    value: "`Survie Crossplay`", inline: true },
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
//  INTERACTIONS
// ============================================================

client.on("interactionCreate", async (interaction) => {

  // ── MENU DÉROULANT ───────────────────────────────────────
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

  // ── BOUTONS ──────────────────────────────────────────────
  if (interaction.isButton()) {
    if (interaction.customId === "accept_rules") {
      try {
        const roleJoueur = interaction.guild.roles.cache.get(C.ROLE_JOUEUR);
        const roleNV     = interaction.guild.roles.cache.get(C.ROLE_NON_VERIFIE);
        if (!roleJoueur) return interaction.reply({ content: "❌ Rôle Joueur introuvable — contacte un admin.", ephemeral: true });
        if (interaction.member.roles.cache.has(C.ROLE_JOUEUR)) return interaction.reply({ content: "✅ Tu as déjà accepté le règlement !", ephemeral: true });
        await interaction.member.roles.add(roleJoueur);
        if (roleNV) await interaction.member.roles.remove(roleNV).catch(() => {});
        return interaction.reply({ embeds: [makeEmbed({ color: C.GREEN, author: "Soulakri", title: "✅ Bienvenue dans la communauté !", description: `**${interaction.user.username}**, tu fais maintenant partie de **Soulakri** ! 🎉\n\n➡️ Choisis tes rôles dans <#${C.CHANNEL_ROLES}>\n🎮 Rejoins le MC : \`${C.MC_IP}:${C.MC_PORT}\`` })], ephemeral: true });
      } catch (err) {
        console.error("accept_rules :", err);
        if (!interaction.replied) await interaction.reply({ content: "❌ Erreur. Contacte un admin.", ephemeral: true });
      }
      return;
    }
    if (interaction.customId === "show_ip") return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, title: "🎮 IP du serveur Soulakri", thumbnail: C.LOGO_URL, fields: [{ name: "📡 Adresse", value: `\`\`\`${C.MC_IP}\`\`\``, inline: false }, { name: "🔌 Port Java", value: `\`\`\`${C.MC_PORT}\`\`\``, inline: false }] })], ephemeral: true });
    if (interaction.customId === "show_reglement_link") return interaction.reply({ content: `📜 Le règlement : <#${C.CHANNEL_REGLEMENT}>`, ephemeral: true });
    if (interaction.customId === "close_ticket") {
      await interaction.reply({ content: "🔒 Fermeture dans 5 secondes..." });
      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
      return;
    }
    if (interaction.customId === "another_joke") {
      const b = BLAGUES[Math.floor(Math.random() * BLAGUES.length)];
      return interaction.update({ embeds: [makeEmbed({ color: C.ORANGE, title: "😂 Blague aléatoire", fields: [{ name: "❓", value: b.joke }, { name: "💡", value: b.answer }] })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary))] });
    }
    return;
  }

  // ── COMMANDES SLASH ──────────────────────────────────────
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;

  if (cmd === "help") {
    return interaction.reply({ embeds: [makeEmbed({
      color: C.BLUE, author: { name: "Soulakri Bot — Aide", iconURL: C.LOGO_URL },
      title: "📖 Commandes disponibles", thumbnail: C.LOGO_URL,
      fields: [
        { name: "── 🎮 Minecraft ──",   value: "`/ip` · `/bedrock` · `/stats` · `/joueurs` · `/statserveur`", inline: false },
        { name: "── 🌐 Serveur ──",     value: "`/serverinfo`", inline: false },
        { name: "── 🏅 Profil ──",      value: "`/grade` · `/niveau` · `/top`", inline: false },
        { name: "── 😂 Fun ──",         value: "`/blague` · `/soules` · `/giry` · `/67` · `/cassandre` · `/ratio`", inline: false },
        { name: "── 🔧 Utilitaires ──", value: "`/objectif` · `/sondage` · `/rappel`", inline: false },
        { name: "── 🎫 Support ──",     value: "`/ticket`", inline: false },
        { name: "── 🔨 Modération ──",  value: "`/ban` · `/kick` · `/mute` · `/unmute`", inline: false },
        { name: "── ⚙️ Admin ──",       value: "`/reglement` · `/roles` · `/vittel` · `/mc-objectif` · `/set-cookie`", inline: false },
      ],
    })], ephemeral: true });
  }

  if (cmd === "ip") {
    return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, author: { name: "Soulakri — Serveur Minecraft", iconURL: C.LOGO_URL }, title: "🎮 Rejoins le serveur !", thumbnail: C.LOGO_URL, description: "Compatible **Java & Bedrock** ⚔️", fields: [{ name: "📡 Adresse IP", value: `\`\`\`${C.MC_IP}\`\`\``, inline: false }, { name: "🔌 Port Java", value: `\`\`\`${C.MC_PORT}\`\`\``, inline: false }, { name: "📱 Port Bedrock", value: "Utilise `/bedrock` — change à chaque redémarrage !", inline: false }, { name: "📦 Version", value: "`1.20.1`", inline: true }, { name: "🌍 Mode", value: "`Survie Crossplay`", inline: true }] })] });
  }

  // ── /bedrock — lecture directe FalixNodes ────────────────
  if (cmd === "bedrock") {
    await interaction.deferReply();
  
    const networkResult = await getFalixNetworkInfo();
  
    if (!networkResult.ok) {
      const bd = loadBedrock();
      if (bd.port) {
        return interaction.editReply({ embeds: [makeEmbed({
          color: C.ORANGE,
          title: "📱 Connexion Bedrock — Soulakri",
          thumbnail: C.LOGO_URL,
          description: "⚠️ Données en cache (FalixNodes inaccessible)",
          fields: [
            { name: "📡 Adresse IP", value: `\`\`\`${bd.ip}\`\`\``, inline: false },
            { name: "🔌 Port",       value: `\`\`\`${bd.port}\`\`\``, inline: false },
            { name: "📅 Mis à jour", value: `<t:${Math.floor((bd.updatedAt || Date.now()) / 1000)}:R>`, inline: true },
          ],
        })] });
      }
      return interaction.editReply({ embeds: [makeEmbed({
        color: C.RED,
        title: "❌ Bedrock — Données indisponibles",
        description: networkResult.reason === "cookie_expired"
          ? "Cookie FalixNodes expiré. Un admin doit faire `/set-cookie`."
          : "Impossible de récupérer les infos Bedrock.",
      })] });
    }
  
    saveBedrock({ ip: networkResult.ip, port: networkResult.port, updatedAt: Date.now() });
  
    return interaction.editReply({ embeds: [makeEmbed({
      color: C.GREEN,
      title: "📱 Connexion Bedrock — Soulakri",
      thumbnail: C.LOGO_URL,
      description: "Infos pour rejoindre depuis **Minecraft Bedrock** (PE, Console, Win10)",
      fields: [
        { name: "📡 Adresse IP", value: `\`\`\`${networkResult.ip}\`\`\``,   inline: false },
        { name: "🔌 Port",       value: `\`\`\`${networkResult.port}\`\`\``, inline: false },
        { name: "⚠️ Important",  value: "Le port change à chaque redémarrage du serveur MC.", inline: false },
        { name: "📡 Source",     value: "Lu en direct depuis FalixNodes ✅", inline: true },
        { name: "📅 Récupéré",   value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      ],
    })] });
  }

  if (cmd === "serverinfo") {
    await interaction.deferReply();
    const guild = interaction.guild;
    await guild.fetch(); await guild.members.fetch();
    const bots = guild.members.cache.filter(m => m.user.bot).size, humans = guild.memberCount - bots;
    const texts = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size, voices = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const owner = await guild.fetchOwner(), verif = ["Aucune", "Faible", "Moyenne", "Élevée", "Très élevée"][guild.verificationLevel] ?? "Inconnue";
    return interaction.editReply({ embeds: [makeEmbed({ color: C.CYAN, author: { name: guild.name, iconURL: guild.iconURL({ dynamic: true }) || C.LOGO_URL }, title: "🌐 Informations du serveur", thumbnail: guild.iconURL({ dynamic: true, size: 256 }) || C.LOGO_URL, fields: [{ name: "👑 Propriétaire", value: owner.toString(), inline: true }, { name: "📅 Créé le", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }, { name: "🆔 ID", value: `\`${guild.id}\``, inline: true }, { name: "👥 Membres", value: `👤 ${humans} humains\n🤖 ${bots} bots`, inline: true }, { name: "💬 Salons", value: `📝 ${texts} texte\n🔊 ${voices} vocal`, inline: true }, { name: "🎭 Rôles", value: `${guild.roles.cache.size - 1}`, inline: true }, { name: "🚀 Boosts", value: `${guild.premiumSubscriptionCount} — Niv. ${guild.premiumTier}`, inline: true }, { name: "🔒 Vérification", value: verif, inline: true }, { name: "🎮 Serveur MC", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }] })] });
  }

  if (cmd === "grade") {
    const gradeRoles = ["Admin", "Mod", "Builder", "MVP", "VIP", "Joueur"];
    let found = null;
    for (const name of gradeRoles) { const role = interaction.guild.roles.cache.find(r => r.name === name); if (role && interaction.member.roles.cache.has(role.id)) { found = role; break; } }
    const user = getUser(interaction.user.id), needed = xpForLevel(user.level), bar = progressBar(user.xp, needed), pct = Math.round((user.xp / needed) * 100);
    return interaction.reply({ embeds: [makeEmbed({ color: found ? (found.color || C.BLUE) : C.RED, author: { name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }, title: "🏅 Ton profil Soulakri", thumbnail: interaction.user.displayAvatarURL({ dynamic: true }), fields: [{ name: "🎖️ Grade", value: found ? found.toString() : "*Aucun grade*", inline: true }, { name: "⭐ Niveau", value: `**${user.level}**`, inline: true }, { name: "💬 Messages", value: `${user.messages}`, inline: true }, { name: `📊 XP — ${user.xp} / ${needed} (${pct}%)`, value: `\`${bar}\``, inline: false }] })], ephemeral: true });
  }

  if (cmd === "niveau") {
    const target = interaction.options.getUser("joueur") || interaction.user;
    const user = getUser(target.id), needed = xpForLevel(user.level), bar = progressBar(user.xp, needed), pct = Math.round((user.xp / needed) * 100);
    return interaction.reply({ embeds: [makeEmbed({ color: C.PURPLE, author: { name: target.username, iconURL: target.displayAvatarURL({ dynamic: true }) }, title: `⭐ Niveau de ${target.username}`, thumbnail: target.displayAvatarURL({ dynamic: true }), fields: [{ name: "⭐ Niveau", value: `**${user.level}**`, inline: true }, { name: "✨ XP", value: `${user.xp} / ${needed}`, inline: true }, { name: "💬 Messages", value: `${user.messages}`, inline: true }, { name: `📊 Progression — ${pct}%`, value: `\`${bar}\``, inline: false }] })] });
  }

  if (cmd === "top") {
    const sorted = Object.entries(xpData).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.level - a.level || b.xp - a.xp).slice(0, 10);
    const medals = ["🥇", "🥈", "🥉"];
    return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, author: { name: "Soulakri — Classement XP", iconURL: C.LOGO_URL }, title: "🏆 Top 10 joueurs", thumbnail: C.LOGO_URL, description: sorted.length ? sorted.map((u, i) => `${medals[i] || `**${i + 1}.**`} <@${u.id}> — Niv. **${u.level}** · ${u.xp} XP`).join("\n") : "*Aucun joueur dans le classement.*" })] });
  }

  if (cmd === "stats") {
    const pseudo = interaction.options.getString("pseudo");
    await interaction.deferReply();
    try {
      const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${pseudo}`);
      if (!res.ok) return interaction.editReply({ content: `❌ Joueur **${pseudo}** introuvable.` });
      const { id: uuid, name } = await res.json();
      return interaction.editReply({ embeds: [makeEmbed({ color: C.GREEN, author: { name: `Stats de ${name}`, iconURL: `https://mc-heads.net/avatar/${uuid}/32` }, title: `📊 ${name}`, thumbnail: `https://mc-heads.net/avatar/${uuid}/64`, image: `https://mc-heads.net/body/${uuid}/128`, fields: [{ name: "🎮 Pseudo", value: `\`${name}\``, inline: true }, { name: "🔑 UUID", value: `\`${uuid.substring(0, 8)}...\``, inline: true }, { name: "🌐 NameMC", value: `[Voir le profil](https://namemc.com/profile/${uuid})`, inline: true }] })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Voir sur NameMC").setURL(`https://namemc.com/profile/${uuid}`).setStyle(ButtonStyle.Link))] });
    } catch { return interaction.editReply({ content: "❌ Erreur API Mojang. Réessaie." }); }
  }

  if (cmd === "blague") {
    const b = BLAGUES[Math.floor(Math.random() * BLAGUES.length)];
    return interaction.reply({ embeds: [makeEmbed({ color: C.ORANGE, title: "😂 Blague Minecraft", thumbnail: C.LOGO_URL, fields: [{ name: "❓ Question", value: b.joke }, { name: "💡 Réponse", value: b.answer }] })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary))] });
  }

  if (cmd === "soules")    return interaction.reply({ embeds: [makeEmbed({ color: 0xFF6600, title: "🔥 FLASH OUT ! Soules balance une flash !", description: `${interaction.user} invoque **SOULES** ! 🌟\n*Run it back !*`, image: "https://i.imgur.com/FLkhWWO.gif" }).setFooter({ text: C.FOOTER, iconURL: C.LOGO_URL })] });
  if (cmd === "giry")      return interaction.reply({ embeds: [makeEmbed({ color: 0x4CAF50, title: "💚 SEEKERS OUT ! Giry envoie la flash de Skye !", description: `${interaction.user} joue **GIRY** ! 🦅\n*T'as les yeux dans ta poche !*`, image: "https://i.imgur.com/3h3Y01m.gif" }).setFooter({ text: C.FOOTER, iconURL: C.LOGO_URL })] });
  if (cmd === "67")        return interaction.reply({ embeds: [makeEmbed({ color: 0xFFD700, title: "🎲 SIX SEVEN ! 67 !", description: `${interaction.user} sort le **67** ! 🎵`, image: "https://i.imgur.com/tTLkRlr.gif" }).setFooter({ text: C.FOOTER, iconURL: C.LOGO_URL })] });
  if (cmd === "cassandre") return interaction.reply({ embeds: [makeEmbed({ color: 0xB8860B, title: "🔗 NEURAL THEFT ! Cassandre sort Deadlock !", description: `${interaction.user} joue **CASSANDRE** ! ⛓️\n*GravNet lancé !*`, image: "https://i.imgur.com/3D8zQTb.gif" }).setFooter({ text: C.FOOTER, iconURL: C.LOGO_URL })] });

  if (cmd === "ratio") {
    const cible = interaction.options.getUser("cible");
    if (cible.id === interaction.user.id) return interaction.reply({ content: "❌ Tu peux pas te ratio toi-même...", ephemeral: true });
    const reactions = ["noooon", "comment osez-vous", "j'y crois pas", "c'est injuste", "touchée", "impossible", "je suis choqué"];
    return interaction.reply({ embeds: [makeEmbed({ color: C.CYAN, title: "☑️ Ratio", description: `${interaction.user} vient de **ratio** ${cible} ! 📉\n\n> *${cible.username} : "${reactions[Math.floor(Math.random() * reactions.length)]}"*`, thumbnail: cible.displayAvatarURL({ dynamic: true }) })] });
  }

  if (cmd === "joueurs") {
    await interaction.deferReply();
    const data = await getServerData();
    if (!data || !data.online) return interaction.editReply({ embeds: [makeEmbed({ color: C.RED, title: "❌ Serveur hors ligne", description: "Le serveur Minecraft est actuellement **hors ligne**.", fields: [{ name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }] })] });
    const players = data.players?.list?.map(p => `• \`${p.name}\``).join("\n") || "*Aucun joueur connecté*";
    return interaction.editReply({ embeds: [makeEmbed({ color: C.GREEN, title: "👥 Joueurs connectés sur Soulakri", thumbnail: C.LOGO_URL, description: players, fields: [{ name: "👤 En ligne", value: `**${data.players?.online ?? 0}** / ${data.players?.max ?? 0}`, inline: true }, { name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }, { name: "📦 Version", value: `\`${data.version ?? "?"}\``, inline: true }] })] });
  }

  if (cmd === "statserveur") {
    await interaction.deferReply();
    const data = await getServerData();
    if (!data || !data.online) return interaction.editReply({ embeds: [makeEmbed({ color: C.RED, title: "❌ Serveur hors ligne", description: "Impossible de récupérer les infos.", fields: [{ name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }] })] });
    return interaction.editReply({ embeds: [makeEmbed({ color: C.CYAN, title: "🌐 Statut du serveur Soulakri", thumbnail: C.LOGO_URL, description: "Le serveur est **en ligne** ✅", fields: [{ name: "👤 Joueurs", value: `${data.players?.online ?? 0} / ${data.players?.max ?? 0}`, inline: true }, { name: "📦 Version", value: `\`${data.version ?? "?"}\``, inline: true }, { name: "🏓 MOTD", value: data.motd?.clean?.[0] ?? "Soulakri MC", inline: false }, { name: "🎮 IP", value: `\`${C.MC_IP}:${C.MC_PORT}\``, inline: true }] })] });
  }

  if (cmd === "objectif") {
    const obj = loadObjectif();
    return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, title: "🎯 Objectif actuel — Soulakri", description: `> ${obj.texte}`, thumbnail: C.LOGO_URL, fields: obj.updatedBy ? [{ name: "✏️ Mis à jour par", value: `<@${obj.updatedBy}>`, inline: true }, { name: "📅 Le", value: `<t:${Math.floor(obj.updatedAt / 1000)}:D>`, inline: true }] : [] })] });
  }

  if (cmd === "sondage") {
    const question = interaction.options.getString("question");
    const choix = [1,2,3,4].map(i => interaction.options.getString(`choix${i}`)).filter(Boolean);
    const emojis = ["1️⃣","2️⃣","3️⃣","4️⃣"];
    const msg = await interaction.reply({ embeds: [makeEmbed({ color: C.PURPLE, title: `📊 ${question}`, description: choix.length ? choix.map((c, i) => `${emojis[i]} ${c}`).join("\n\n") : "Réponds avec ✅ ou ❌", fields: [{ name: "📣 Lancé par", value: interaction.user.toString(), inline: true }] })], fetchReply: true });
    if (choix.length) { for (let i = 0; i < choix.length; i++) await msg.react(emojis[i]).catch(() => {}); }
    else { await msg.react("✅").catch(() => {}); await msg.react("❌").catch(() => {}); }
    return;
  }

  if (cmd === "rappel") {
    const minutes = interaction.options.getInteger("minutes"), message = interaction.options.getString("message");
    if (minutes < 1 || minutes > 1440) return interaction.reply({ content: "❌ Entre 1 et 1440 minutes (24h max).", ephemeral: true });
    await interaction.reply({ embeds: [makeEmbed({ color: C.CYAN, title: "⏰ Rappel enregistré !", description: `Je te rappellerai dans **${minutes} minute${minutes > 1 ? "s" : ""}**.\n📌 *${message}*` })], ephemeral: true });
    setTimeout(async () => {
      try { await interaction.user.send({ embeds: [makeEmbed({ color: C.GOLD, title: "🔔 Rappel Soulakri !", description: `Tu m'avais demandé de te rappeler :\n\n> **${message}**` })] }); }
      catch { const ch = interaction.channel; if (ch) await ch.send({ content: `${interaction.user} 🔔 Rappel : **${message}**` }).catch(() => {}); }
    }, minutes * 60 * 1000);
    return;
  }

  if (cmd === "mc-objectif") {
    const texte = interaction.options.getString("texte");
    saveObjectif({ texte, updatedBy: interaction.user.id, updatedAt: Date.now() });
    return interaction.reply({ embeds: [makeEmbed({ color: C.GOLD, title: "🎯 Objectif mis à jour !", description: `> ${texte}` })], ephemeral: true });
  }

  if (cmd === "set-cookie") {
    const cookie = interaction.options.getString("cookie");
    process.env.FALIX_SESSION = cookie;
    fs.writeFileSync("./falix_session.txt", cookie);
    // Relance une vérification immédiate avec le nouveau cookie
    checkBedrockPort().catch(console.error);
    return interaction.reply({ embeds: [makeEmbed({
      color: C.GREEN,
      title: "🍪 Cookie FalixNodes mis à jour !",
      description: "✅ Cookie mis à jour en mémoire et sauvegardé.\n🔄 Vérification du port Bedrock relancée...\n⚠️ Pense aussi à mettre à jour `FALIX_SESSION` dans Railway pour persister après redéploiement.",
    })], ephemeral: true });
  }

  if (cmd === "reglement") {
    const ch = interaction.guild.channels.cache.get(C.CHANNEL_REGLEMENT);
    if (!ch) return interaction.reply({ content: "❌ Salon règlement introuvable.", ephemeral: true });
    const embed = makeEmbed({ color: C.GOLD, author: { name: "Soulakri — Règlement officiel", iconURL: C.LOGO_URL }, title: "📜 Règlement du serveur Soulakri", thumbnail: C.LOGO_URL, description: "Bienvenue sur **Soulakri** ! 🎮\nLis les règles ci-dessous et clique **✅ J'accepte** pour débloquer l'accès complet.\n\u200b", fields: [{ name: "1️⃣ Respect mutuel", value: "Insultes, harcèlement et discriminations = ban immédiat.", inline: false }, { name: "2️⃣ Anti-cheat", value: "Tout hack, client modifié ou exploit est interdit. Tolérance zéro.", inline: false }, { name: "3️⃣ Anti-grief", value: "Détruire ou voler les constructions d'autrui est interdit.", inline: false }, { name: "4️⃣ Langage", value: "Pas de spam, flood, caps excessif ni contenu inapproprié.", inline: false }, { name: "5️⃣ Pas de pub", value: "Aucune publicité pour un autre serveur sans autorisation.", inline: false }, { name: "6️⃣ Respect des admins", value: "Les décisions des modérateurs sont définitives.", inline: false }, { name: "7️⃣ Fair-play", value: "Soulakri est un serveur fun. Joue dans l'esprit de la commu ! 🌟", inline: false }, { name: "\u200b", value: "✅ **Si tu acceptes, clique sur le bouton ci-dessous.**" }] }).setFooter({ text: C.FOOTER + " • Règlement v1.0", iconURL: C.LOGO_URL });
    await ch.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("accept_rules").setLabel("✅  J'accepte le règlement").setStyle(ButtonStyle.Success))] });
    return interaction.reply({ content: `✅ Règlement posté dans <#${C.CHANNEL_REGLEMENT}> !`, ephemeral: true });
  }

  if (cmd === "roles") {
    const ch = interaction.guild.channels.cache.get(C.CHANNEL_ROLES);
    if (!ch) return interaction.reply({ content: "❌ Salon rôles introuvable.", ephemeral: true });
    const embed = makeEmbed({ color: C.PURPLE, author: { name: "Soulakri — Choisir ses rôles", iconURL: C.LOGO_URL }, title: "🎭 Choisir ses rôles", thumbnail: C.LOGO_URL, description: "Sélectionne tes rôles dans le menu. Tu peux en choisir **plusieurs** et changer à tout moment !\n\u200b", fields: [{ name: "🔨 Builder", value: "Tu aimes construire et créer", inline: true }, { name: "⚔️ PvP", value: "Tu adores les combats et duels", inline: true }, { name: "🌲 Survie", value: "Joueur survie pur et dur", inline: true }, { name: "🔔 Notifications", value: "Reçois les annonces importantes", inline: true }] }).setFooter({ text: C.FOOTER + " • Modifiable à tout moment", iconURL: C.LOGO_URL });
    const menu = new StringSelectMenuBuilder().setCustomId("role_selector").setPlaceholder("Sélectionne tes rôles...").setMinValues(0).setMaxValues(4).addOptions(
      new StringSelectMenuOptionBuilder().setLabel("🔨 Builder").setDescription("Tu aimes construire").setValue(C.ROLE_BUILDER).setEmoji("🔨"),
      new StringSelectMenuOptionBuilder().setLabel("⚔️ PvP").setDescription("Tu adores les combats").setValue(C.ROLE_PVP).setEmoji("⚔️"),
      new StringSelectMenuOptionBuilder().setLabel("🌲 Survie").setDescription("Joueur survie pur").setValue(C.ROLE_SURVIE).setEmoji("🌲"),
      new StringSelectMenuOptionBuilder().setLabel("🔔 Notifications").setDescription("Recevoir les annonces").setValue(C.ROLE_NOTIFS).setEmoji("🔔"),
    );
    await ch.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
    return interaction.reply({ content: `✅ Sélecteur posté dans <#${C.CHANNEL_ROLES}> !`, ephemeral: true });
  }

  if (cmd === "vittel") {
    const ch = interaction.guild.channels.cache.get(C.CHANNEL_MATHS);
    if (!ch) return interaction.reply({ content: "❌ Salon maths introuvable.", ephemeral: true });
    if (vittelActive) return interaction.reply({ content: "⚠️ Une question est déjà en cours !", ephemeral: true });
    await runVittelQuestion(ch);
    return interaction.reply({ content: `✅ Question lancée dans <#${C.CHANNEL_MATHS}> !`, ephemeral: true });
  }

  if (cmd === "ticket") {
    try {
      const guild = interaction.guild, member = interaction.member;
      const ticketName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const existing = guild.channels.cache.find(c => c.name === ticketName);
      if (existing) return interaction.reply({ content: `❌ Ticket déjà ouvert : ${existing}`, ephemeral: true });
      const category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("support"));
      const adminR = guild.roles.cache.get(C.ROLE_ADMIN), modR = guild.roles.cache.get(C.ROLE_MOD);
      const allow = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];
      const overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: member.id, allow }];
      if (adminR) overwrites.push({ id: adminR.id, allow });
      if (modR)   overwrites.push({ id: modR.id, allow });
      const ticketCh = await guild.channels.create({ name: ticketName, type: ChannelType.GuildText, parent: category?.id ?? null, permissionOverwrites: overwrites, topic: `Ticket de ${member.user.tag}` });
      await ticketCh.send({ content: `${member}${adminR ? " " + adminR : ""}`, embeds: [makeEmbed({ color: C.BLUE, author: { name: "Support Soulakri", iconURL: C.LOGO_URL }, title: "🎫 Ticket de support", description: `Bonjour **${member.user.username}** ! 👋\nUn modérateur va te répondre dès que possible.\n\n**Explique ton problème ci-dessous.**` })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger))] });
      return interaction.reply({ content: `✅ Ticket créé : ${ticketCh}`, ephemeral: true });
    } catch (err) { console.error("/ticket :", err); if (!interaction.replied) return interaction.reply({ content: "❌ Impossible de créer le ticket.", ephemeral: true }); }
  }

  if (cmd === "ban") {
    const target = interaction.options.getMember("membre"), raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target?.bannable) return interaction.reply({ content: "❌ Impossible de bannir ce membre.", ephemeral: true });
    try {
      await target.ban({ reason: raison });
      await interaction.reply({ embeds: [makeEmbed({ color: C.RED, title: "🔨 Membre banni", fields: [{ name: "👤 Membre", value: target.user.tag, inline: true }, { name: "👮 Par", value: interaction.user.tag, inline: true }, { name: "📝 Raison", value: raison }] })] });
      logAction(interaction.guild, { title: "🔨 Ban", description: `**${target.user.tag}** banni par **${interaction.user.tag}**`, color: C.RED, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du ban.", ephemeral: true }); }
    return;
  }

  if (cmd === "kick") {
    const target = interaction.options.getMember("membre"), raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target?.kickable) return interaction.reply({ content: "❌ Impossible d'expulser ce membre.", ephemeral: true });
    try {
      await target.kick(raison);
      await interaction.reply({ embeds: [makeEmbed({ color: C.ORANGE, title: "👢 Membre expulsé", fields: [{ name: "👤 Membre", value: target.user.tag, inline: true }, { name: "👮 Par", value: interaction.user.tag, inline: true }, { name: "📝 Raison", value: raison }] })] });
      logAction(interaction.guild, { title: "👢 Kick", description: `**${target.user.tag}** expulsé par **${interaction.user.tag}**`, color: C.ORANGE, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du kick.", ephemeral: true }); }
    return;
  }

  if (cmd === "mute") {
    const target = interaction.options.getMember("membre"), minutes = interaction.options.getInteger("minutes"), raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (minutes < 1 || minutes > 40320) return interaction.reply({ content: "❌ Durée invalide (1–40320 min).", ephemeral: true });
    try {
      await target.timeout(minutes * 60 * 1000, raison);
      await interaction.reply({ embeds: [makeEmbed({ color: C.PURPLE, title: "🔇 Membre mute", fields: [{ name: "👤 Membre", value: target.user.tag, inline: true }, { name: "👮 Par", value: interaction.user.tag, inline: true }, { name: "⏱️ Durée", value: `${minutes} min`, inline: true }, { name: "📝 Raison", value: raison }] })] });
      logAction(interaction.guild, { title: "🔇 Mute", description: `**${target.user.tag}** mute ${minutes}min par **${interaction.user.tag}**`, color: C.PURPLE, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du mute.", ephemeral: true }); }
    return;
  }

  if (cmd === "unmute") {
    const target = interaction.options.getMember("membre");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    try {
      await target.timeout(null);
      return interaction.reply({ embeds: [makeEmbed({ color: C.GREEN, title: "🔊 Mute retiré", fields: [{ name: "👤 Membre", value: target.user.tag, inline: true }, { name: "👮 Par", value: interaction.user.tag, inline: true }] })] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du unmute.", ephemeral: true }); }
  }

});

// ============================================================
//  CONNEXION
// ============================================================

if (!process.env.FALIX_SESSION && fs.existsSync("./falix_session.txt")) {
  process.env.FALIX_SESSION = fs.readFileSync("./falix_session.txt", "utf8").trim();
  console.log("[Falix] Cookie chargé depuis falix_session.txt");
}

client.login(TOKEN);
