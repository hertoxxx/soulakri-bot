// ============================================================
//  SOULAKRI BOT v5 — discord.js v14
// ============================================================

const CONFIG = {
  GUILD_ID:           "1487136081152577556",
  CHANNEL_REGLEMENT:  "1487136083627086010",
  CHANNEL_BIENVENUE:  "1487136083627086009",
  CHANNEL_LOGS:       "1487136083132284951",
  CHANNEL_ROLES:      "1487136083627086011",
  CHANNEL_MATHS:      "1487136084986040467",

  ROLE_JOUEUR:        "1489335006290776174",
  ROLE_NON_VERIFIE:   "1489335084568936498",
  ROLE_ADMIN:         "1487136081198448730",
  ROLE_MOD:           "1487136081198448729",
  ROLE_BUILDER:       "1489909890246905866",
  ROLE_PVP:           "1489909976070750279",
  ROLE_SURVIE:        "1489910021876875354",
  ROLE_NOTIFS:        "1489910094287077466",

  MC_IP:   "soulakri.falix.gg",
  MC_PORT: "22608",

  LOGO_URL: "https://i.imgur.com/igybOpU.png",

  COLOR_BLUE:   0x5DADE2,
  COLOR_GOLD:   0xF4D03F,
  COLOR_RED:    0xE74C3C,
  COLOR_GREEN:  0x2ECC71,
  COLOR_PURPLE: 0x9B59B6,
  COLOR_ORANGE: 0xE67E22,
  COLOR_DARK:   0x2C3E50,
  COLOR_CYAN:   0x1ABC9C,

  FOOTER: "Soulakri • Survie & Fun Crossplay",

  XP_MIN: 15,
  XP_MAX: 40,
  XP_COOLDOWN_MS: 60000,

  VITTEL_INTERVAL_MS: 5 * 60 * 1000,
  VITTEL_TIMEOUT_MS:  60 * 1000,
};

// ============================================================
//  IMPORTS
// ============================================================

require("dotenv").config();
const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, SlashCommandBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  REST, Routes, ChannelType, PermissionFlagsBits,
} = require("discord.js");

const fs   = require("fs");
const path = require("path");
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
//  PERSISTANCE — helper générique JSON
// ============================================================

function loadJSON(file, def = {}) {
  if (!fs.existsSync(file)) return def;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return def; }
}
function saveJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// ============================================================
//  XP
// ============================================================

const XP_FILE = "./xp_data.json";
let xpData = loadJSON(XP_FILE);
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
  saveJSON(XP_FILE, xpData);
  return { user, leveledUp };
}

// ============================================================
//  AVERTISSEMENTS
// ============================================================

const WARN_FILE = "./warn_data.json";
let warnData = loadJSON(WARN_FILE);

function addWarn(guildId, userId, reason, modId) {
  if (!warnData[guildId]) warnData[guildId] = {};
  if (!warnData[guildId][userId]) warnData[guildId][userId] = [];
  warnData[guildId][userId].push({ reason, modId, date: Date.now() });
  saveJSON(WARN_FILE, warnData);
  return warnData[guildId][userId];
}
function getWarns(guildId, userId) {
  return (warnData[guildId] || {})[userId] || [];
}
function clearWarns(guildId, userId) {
  if (warnData[guildId]) warnData[guildId][userId] = [];
  saveJSON(WARN_FILE, warnData);
}

// ============================================================
//  CONFIG SERVEUR (style DraftBot)
// ============================================================

const SERVER_CONFIG_FILE = "./server_config.json";
let serverConfig = loadJSON(SERVER_CONFIG_FILE);

function getServerConfig(guildId) {
  if (!serverConfig[guildId]) serverConfig[guildId] = {
    welcome_channel: null,
    welcome_message: "Bienvenue {user} sur {server} ! Tu es le membre n°{count}.",
    welcome_enabled: true,
    logs_channel: null,
    logs_enabled: true,
    autorole: null,
    autorole_enabled: false,
    xp_enabled: true,
    xp_levelup_channel: null,
    xp_levelup_message: "{user} passe au niveau {level} ! 🎉",
    antispam_enabled: false,
    antispam_max: 5,
    antispam_interval: 5,
    prefix: "/",
    color: "#5DADE2",
    ticket_category: null,
    ticket_logs: null,
  };
  return serverConfig[guildId];
}
function saveServerConfig() { saveJSON(SERVER_CONFIG_FILE, serverConfig); }

// ============================================================
//  GIVEAWAYS
// ============================================================

const GIVEAWAY_FILE = "./giveaway_data.json";
let giveawayData = loadJSON(GIVEAWAY_FILE, {});

function saveGiveaways() { saveJSON(GIVEAWAY_FILE, giveawayData); }

// ============================================================
//  VITTEL BOT — Générateur de questions maths
// ============================================================

let vitelActive = null;

function generateMathQuestion() {
  const types = [
    () => {
      const a = [6, 7, 66, 77, 67, 76][Math.floor(Math.random() * 6)];
      const b = [6, 7, 6, 7, 6, 7][Math.floor(Math.random() * 6)];
      const op = ["+", "-", "×"][Math.floor(Math.random() * 3)];
      let answer;
      if (op === "+") answer = a + b;
      else if (op === "-") answer = a - b;
      else answer = a * b;
      return { question: `${a} ${op} ${b} = ?`, answer: String(answer) };
    },
    () => {
      const vars = ["v", "b", "s"];
      const varName = vars[Math.floor(Math.random() * vars.length)];
      const x = Math.floor(Math.random() * 7) + 1;
      const b = [6, 7, 6, 7, 14, 12][Math.floor(Math.random() * 6)];
      const result = x + b;
      return { question: `${varName} + ${b} = ${result}, que vaut ${varName} ?`, answer: String(x) };
    },
    () => {
      const vars = ["v", "b", "s"];
      const varName = vars[Math.floor(Math.random() * vars.length)];
      const factor = [6, 7][Math.floor(Math.random() * 2)];
      const x = Math.floor(Math.random() * 6) + 1;
      const result = x * factor;
      return { question: `${factor}${varName} = ${result}, que vaut ${varName} ?`, answer: String(x) };
    },
    () => {
      const vars = ["v", "b", "s"];
      const varName = vars[Math.floor(Math.random() * vars.length)];
      const threshold = [6, 7, 12, 14][Math.floor(Math.random() * 4)];
      const correct = threshold - 1;
      return {
        question: `${varName} < ${threshold} — quelle valeur est possible pour ${varName} ? (donne un exemple)`,
        answer: null,
        checkFn: (resp) => {
          const n = parseInt(resp);
          return !isNaN(n) && n < threshold && n >= 0;
        },
        hint: `(n'importe quel entier entre 0 et ${threshold - 1})`,
      };
    },
    () => {
      const h = [6, 7][Math.floor(Math.random() * 2)];
      const m = [0, 6, 7, 12, 30, 42][Math.floor(Math.random() * 6)];
      const addM = [6, 7, 30, 60][Math.floor(Math.random() * 4)];
      const totalMin = h * 60 + m + addM;
      const rH = Math.floor(totalMin / 60) % 24;
      const rM = totalMin % 60;
      const pad = n => String(n).padStart(2, "0");
      return {
        question: `Il est ${pad(h)}h${pad(m)}. Dans ${addM} minutes, quelle heure sera-t-il ?`,
        answer: `${pad(rH)}h${pad(rM)}`,
        altAnswer: `${pad(rH)}:${pad(rM)}`,
      };
    },
  ];
  const gen = types[Math.floor(Math.random() * types.length)];
  return gen();
}

// ============================================================
//  GIFs
// ============================================================

const SOULES_GIFS    = ["https://i.imgur.com/FLkhWWO.gif"];
const GIRY_GIFS      = ["https://media.tenor.com/p6YaFHZhJdUAAAAd/valorant-skye-flash-irl.gif"];
const CASSANDRE_GIFS = ["https://media.tenor.com/d8reZxUl6rX.gif"];
const SIX_SEPT_GIFS  = ["https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTkzaWhxN3Rtbzd3M2c1bWM2cGg0bHQyYXlkMmM1N3FxdjZvczIxaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/XMMUWcz4XtDTNgZj22/giphy.gif"];

// ============================================================
//  BLAGUES
// ============================================================

const blagues = [
  { joke: "Pourquoi Creeper est toujours seul ?",               answer: "Parce qu'il fait exploser toutes ses relations ! 💥" },
  { joke: "Comment s'appelle un joueur Minecraft qui pleure ?", answer: "Un mineur en larmes ! ⛏️" },
  { joke: "Quel est le sport préféré des Endermen ?",           answer: "La téléportation marathon ! 🏃" },
  { joke: "Pourquoi Steve ne sourit jamais ?",                  answer: "Parce qu'il a perdu ses diamonds dans la lave ! 💎" },
  { joke: "Pourquoi les zombies sont nuls en maths ?",          answer: "Parce qu'ils perdent la tête ! 🧟" },
  { joke: "Que dit un bloc de TNT philosophe ?",                answer: "L'existence, c'est explosif. 💣" },
  { joke: "C'est quoi un joueur Minecraft qui fait du sport ?", answer: "Un speed-runner ! 🏃‍♂️" },
];

// ============================================================
//  ANTI-SPAM
// ============================================================

const spamTracker = new Map(); // userId → { count, firstMsg, warned }

// ============================================================
//  COMMANDES SLASH
// ============================================================

const commands = [
  // Fun
  new SlashCommandBuilder().setName("help").setDescription("Affiche toutes les commandes"),
  new SlashCommandBuilder().setName("ip").setDescription("IP du serveur Minecraft"),
  new SlashCommandBuilder().setName("blague").setDescription("Blague aléatoire 😂"),
  new SlashCommandBuilder().setName("soules").setDescription("🔥 Soules lance une flash !"),
  new SlashCommandBuilder().setName("giry").setDescription("⚡ Giry balance une flash de Skye !"),
  new SlashCommandBuilder().setName("67").setDescription("6️⃣7️⃣ Six Seven !"),
  new SlashCommandBuilder().setName("cassandre").setDescription("🔗 Cassandre déploie Deadlock !"),
  new SlashCommandBuilder()
    .setName("sondage").setDescription("Créer un sondage rapide")
    .addStringOption(o => o.setName("question").setDescription("Ta question").setRequired(true))
    .addStringOption(o => o.setName("choix1").setDescription("Choix 1").setRequired(false))
    .addStringOption(o => o.setName("choix2").setDescription("Choix 2").setRequired(false))
    .addStringOption(o => o.setName("choix3").setDescription("Choix 3").setRequired(false))
    .addStringOption(o => o.setName("choix4").setDescription("Choix 4").setRequired(false)),

  // Infos
  new SlashCommandBuilder().setName("serverinfo").setDescription("Infos du serveur Discord"),
  new SlashCommandBuilder().setName("ping").setDescription("🏓 Latence du bot"),
  new SlashCommandBuilder()
    .setName("userinfo").setDescription("Infos d'un membre")
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(false)),
  new SlashCommandBuilder()
    .setName("avatar").setDescription("Avatar d'un membre")
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(false)),
  new SlashCommandBuilder()
    .setName("stats").setDescription("Stats d'un joueur Minecraft")
    .addStringOption(o => o.setName("pseudo").setDescription("Pseudo Minecraft").setRequired(true)),

  // XP
  new SlashCommandBuilder().setName("grade").setDescription("Ton grade et niveau XP"),
  new SlashCommandBuilder()
    .setName("niveau").setDescription("Niveau XP d'un joueur")
    .addUserOption(o => o.setName("joueur").setDescription("Joueur").setRequired(false)),
  new SlashCommandBuilder().setName("top").setDescription("Classement XP Top 10"),

  // Modération
  new SlashCommandBuilder()
    .setName("ban").setDescription("Bannir (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("kick").setDescription("Expulser (Mod)")
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
  new SlashCommandBuilder()
    .setName("warn").setDescription("Avertir un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(true)),
  new SlashCommandBuilder()
    .setName("infractions").setDescription("Voir les warns d'un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)),
  new SlashCommandBuilder()
    .setName("clearwarns").setDescription("Effacer les warns d'un membre (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)),
  new SlashCommandBuilder()
    .setName("clear").setDescription("Supprimer des messages (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName("nombre").setDescription("Nombre de messages (1-100)").setRequired(true))
    .addUserOption(o => o.setName("membre").setDescription("Filtrer par membre").setRequired(false)),

  // Giveaway
  new SlashCommandBuilder()
    .setName("giveaway").setDescription("Gérer les giveaways (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("lancer").setDescription("Lancer un giveaway")
        .addStringOption(o => o.setName("lot").setDescription("Ce qu'on gagne").setRequired(true))
        .addIntegerOption(o => o.setName("minutes").setDescription("Durée en minutes").setRequired(true))
        .addIntegerOption(o => o.setName("gagnants").setDescription("Nombre de gagnants").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("reroll").setDescription("Reroll un giveaway")
        .addStringOption(o => o.setName("message_id").setDescription("ID du message giveaway").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("terminer").setDescription("Terminer un giveaway manuellement")
        .addStringOption(o => o.setName("message_id").setDescription("ID du message giveaway").setRequired(true))
    ),

  // Admin
  new SlashCommandBuilder()
    .setName("reglement").setDescription("Poster le règlement (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("roles").setDescription("Poster le sélecteur de rôles (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("vittel").setDescription("Lancer Vittel BOT (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("config").setDescription("⚙️ Configurer le bot (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("voir").setDescription("Voir la configuration actuelle")
    )
    .addSubcommand(sub =>
      sub.setName("welcome").setDescription("Configurer le message de bienvenue")
        .addChannelOption(o => o.setName("salon").setDescription("Salon de bienvenue").setRequired(false))
        .addStringOption(o => o.setName("message").setDescription("Message ({user} {server} {count})").setRequired(false))
        .addBooleanOption(o => o.setName("activer").setDescription("Activer/désactiver").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("logs").setDescription("Configurer les logs")
        .addChannelOption(o => o.setName("salon").setDescription("Salon de logs").setRequired(false))
        .addBooleanOption(o => o.setName("activer").setDescription("Activer/désactiver").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("autorole").setDescription("Rôle auto à l'arrivée")
        .addRoleOption(o => o.setName("role").setDescription("Rôle à attribuer").setRequired(false))
        .addBooleanOption(o => o.setName("activer").setDescription("Activer/désactiver").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("xp").setDescription("Configurer le système XP")
        .addBooleanOption(o => o.setName("activer").setDescription("Activer/désactiver").setRequired(false))
        .addChannelOption(o => o.setName("salon").setDescription("Salon annonce level up").setRequired(false))
        .addStringOption(o => o.setName("message").setDescription("Message ({user} {level})").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("antispam").setDescription("Configurer l'anti-spam")
        .addBooleanOption(o => o.setName("activer").setDescription("Activer/désactiver").setRequired(false))
        .addIntegerOption(o => o.setName("max").setDescription("Nb messages max").setRequired(false))
        .addIntegerOption(o => o.setName("intervalle").setDescription("Intervalle en secondes").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("couleur").setDescription("Couleur des embeds du bot")
        .addStringOption(o => o.setName("hex").setDescription("Code hex ex: #FF6600").setRequired(true))
    ),

  // Ticket
  new SlashCommandBuilder().setName("ticket").setDescription("Ouvre un ticket support"),
];

// ============================================================
//  ENREGISTREMENT COMMANDES
// ============================================================

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("⏳ Enregistrement des commandes...");
    await rest.put(Routes.applicationGuildCommands(client.user.id, CONFIG.GUILD_ID), { body: commands.map(c => c.toJSON()) });
    console.log("✅ Commandes enregistrées !");
  } catch (err) { console.error("❌ Erreur :", err); }
}

// ============================================================
//  BOT PRÊT
// ============================================================

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} est en ligne !`);
  client.user.setActivity("Soulakri 🎮 | /help", { type: 0 });
  await registerCommands();
  startVittelBot();
  checkGiveaways();
});

// ============================================================
//  LOGS
// ============================================================

async function logAction(guild, { title, description, color, fields = [] }) {
  try {
    const cfg = getServerConfig(guild.id);
    const chId = cfg.logs_channel || CONFIG.CHANNEL_LOGS;
    if (!cfg.logs_enabled) return;
    const ch = guild.channels.cache.get(chId);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(color).setTitle(title).setDescription(description)
      .addFields(fields).setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    await ch.send({ embeds: [embed] });
  } catch {}
}

// ============================================================
//  VITTEL BOT
// ============================================================

function startVittelBot() {
  setInterval(async () => {
    try {
      const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
      if (!guild) return;
      const channel = guild.channels.cache.get(CONFIG.CHANNEL_MATHS);
      if (!channel || vitelActive) return;
      await launchVittelQuestion(channel);
    } catch (err) { console.error("Erreur Vittel BOT :", err); }
  }, CONFIG.VITTEL_INTERVAL_MS);
}

async function launchVittelQuestion(channel) {
  const q = generateMathQuestion();
  const embed = new EmbedBuilder()
    .setColor(0x00BFFF)
    .setAuthor({ name: "Vittel BOT", iconURL: CONFIG.LOGO_URL })
    .setTitle("🧮 Question mathématique !")
    .setDescription(`**${q.question}**\n\n⏱️ Vous avez **60 secondes** pour répondre !`)
    .setFooter({ text: "Tapez votre réponse directement dans ce salon" })
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  const filter = m => !m.author.bot;
  const collector = channel.createMessageCollector({ filter, time: CONFIG.VITTEL_TIMEOUT_MS });
  vitelActive = { q, collector };

  collector.on("collect", async (m) => {
    const resp = m.content.trim().toLowerCase().replace(/\s/g, "");
    let correct = false;
    if (q.checkFn) {
      correct = q.checkFn(resp);
    } else {
      const expected = String(q.answer).toLowerCase().replace(/\s/g, "");
      const alt = q.altAnswer ? String(q.altAnswer).toLowerCase().replace(/\s/g, "") : null;
      correct = resp === expected || (alt && resp === alt);
    }

    if (correct) {
      const winEmbed = new EmbedBuilder()
        .setColor(0x2ECC71).setAuthor({ name: "Vittel BOT", iconURL: CONFIG.LOGO_URL })
        .setTitle("✅ Oui, correct !")
        .setDescription(`**${m.author.toString()}** a trouvé la bonne réponse ! 🎉\n📌 Réponse : **${q.checkFn ? resp : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}`)
        .setFooter({ text: "Prochaine question dans quelques minutes..." }).setTimestamp();
      await channel.send({ embeds: [winEmbed] });
      collector.stop("answered");
    } else {
      const wrongEmbed = new EmbedBuilder()
        .setColor(0xE74C3C).setAuthor({ name: "Vittel BOT", iconURL: CONFIG.LOGO_URL })
        .setTitle("❌ Non, c'est faux !")
        .setDescription(`${m.author.toString()}, **${m.content}** est incorrect. Réessaie ! 💪`)
        .setTimestamp();
      await channel.send({ embeds: [wrongEmbed] });
    }
  });

  collector.on("end", async (_, reason) => {
    vitelActive = null;
    if (reason !== "answered") {
      const timeEmbed = new EmbedBuilder()
        .setColor(0xE67E22).setAuthor({ name: "Vittel BOT", iconURL: CONFIG.LOGO_URL })
        .setTitle("⏰ Temps écoulé !")
        .setDescription(`Personne n'a trouvé ! La réponse était : **${q.checkFn ? "voir énoncé" : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}`)
        .setTimestamp();
      await channel.send({ embeds: [timeEmbed] }).catch(() => {});
    }
  });
}

// ============================================================
//  GIVEAWAY — système complet
// ============================================================

async function endGiveaway(messageId, channelId, guildId, announce = true) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;

    const gw = giveawayData[messageId];
    if (!gw || gw.ended) return;
    gw.ended = true;
    saveGiveaways();

    const reaction = message.reactions.cache.get("🎉");
    const users = reaction ? (await reaction.users.fetch()).filter(u => !u.bot) : new Map();
    const winnerCount = gw.winners || 1;
    const pool = [...users.values()];

    const winners = [];
    const poolCopy = [...pool];
    for (let i = 0; i < Math.min(winnerCount, poolCopy.length); i++) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      winners.push(poolCopy.splice(idx, 1)[0]);
    }

    const endEmbed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("🎉 GIVEAWAY TERMINÉ !")
      .setDescription(
        `**Lot : ${gw.lot}**\n\n` +
        (winners.length
          ? `🏆 Gagnant(s) : ${winners.map(w => w.toString()).join(", ")}`
          : "😢 Personne n'a participé...")
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL })
      .setTimestamp();

    await message.edit({ embeds: [endEmbed], components: [] });
    if (winners.length && announce) {
      await channel.send({ content: `🎊 Félicitations ${winners.map(w => w.toString()).join(", ")} ! Vous gagnez **${gw.lot}** !` });
    }
    return winners;
  } catch (err) { console.error("Erreur endGiveaway :", err); }
}

function checkGiveaways() {
  setInterval(async () => {
    const now = Date.now();
    for (const [msgId, gw] of Object.entries(giveawayData)) {
      if (!gw.ended && gw.endsAt <= now) {
        await endGiveaway(msgId, gw.channelId, gw.guildId);
      }
    }
  }, 15000);
}

// ============================================================
//  XP SYSTÈME + ANTI-SPAM
// ============================================================

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const userId = message.author.id;
  const cfg = getServerConfig(message.guild.id);

  // Anti-spam
  if (cfg.antispam_enabled) {
    const now = Date.now();
    if (!spamTracker.has(userId)) spamTracker.set(userId, { count: 1, firstMsg: now, warned: false });
    else {
      const tracker = spamTracker.get(userId);
      const elapsed = (now - tracker.firstMsg) / 1000;
      if (elapsed > cfg.antispam_interval) {
        spamTracker.set(userId, { count: 1, firstMsg: now, warned: false });
      } else {
        tracker.count++;
        if (tracker.count >= cfg.antispam_max && !tracker.warned) {
          tracker.warned = true;
          try {
            await message.member.timeout(30000, "Anti-spam automatique");
            const embed = new EmbedBuilder()
              .setColor(CONFIG.COLOR_RED).setTitle("🚫 Anti-spam déclenché")
              .setDescription(`${message.author.toString()} a été mute 30 secondes pour spam.`)
              .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL });
            message.channel.send({ embeds: [embed] }).catch(() => {});
            logAction(message.guild, {
              title: "🚫 Anti-spam",
              description: `**${message.author.tag}** a été mute (spam)`,
              color: CONFIG.COLOR_RED,
              fields: [{ name: "Messages", value: `${tracker.count} en ${elapsed.toFixed(1)}s`, inline: true }],
            });
          } catch {}
        }
      }
    }
  }

  // XP
  if (!cfg.xp_enabled) return;
  const now = Date.now();
  if (now - (xpCooldowns.get(userId) || 0) < CONFIG.XP_COOLDOWN_MS) return;
  xpCooldowns.set(userId, now);
  const amount = Math.floor(Math.random() * (CONFIG.XP_MAX - CONFIG.XP_MIN + 1)) + CONFIG.XP_MIN;
  const { user, leveledUp } = addXP(userId, amount);

  if (leveledUp) {
    const lvlMsg = (cfg.xp_levelup_message || "{user} passe au niveau {level} ! 🎉")
      .replace("{user}", message.author.toString())
      .replace("{level}", user.level);
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD).setTitle("🎉 Level Up !")
      .setDescription(lvlMsg)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    const lvlCh = cfg.xp_levelup_channel
      ? message.guild.channels.cache.get(cfg.xp_levelup_channel)
      : message.channel;
    if (lvlCh) lvlCh.send({ embeds: [embed] }).catch(() => {});
  }
});

// ============================================================
//  ACCUEIL
// ============================================================

client.on("guildMemberAdd", async (member) => {
  try {
    const cfg = getServerConfig(member.guild.id);

    // Autorole
    if (cfg.autorole_enabled && cfg.autorole) {
      const role = member.guild.roles.cache.get(cfg.autorole);
      if (role) await member.roles.add(role).catch(() => {});
    } else {
      const roleNV = member.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);
      if (roleNV) await member.roles.add(roleNV).catch(() => {});
    }

    if (!cfg.welcome_enabled) return;
    const chId = cfg.welcome_channel || CONFIG.CHANNEL_BIENVENUE;
    const ch = member.guild.channels.cache.get(chId);
    if (!ch) return;

    const welcomeMsg = (cfg.welcome_message || "Bienvenue {user} sur {server} !")
      .replace("{user}", member.toString())
      .replace("{server}", member.guild.name)
      .replace("{count}", member.guild.memberCount);

    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setAuthor({ name: "✨ Nouveau joueur sur Soulakri !", iconURL: CONFIG.LOGO_URL })
      .setTitle(`👋 Bienvenue, ${member.user.username} !`)
      .setDescription(
        `> Tu es le **${member.guild.memberCount}ème** joueur à rejoindre l'aventure Soulakri !\n\n` +
        `Avant de commencer, il y a **une seule étape** :\n` +
        `➡️ Rends-toi dans <#${CONFIG.CHANNEL_REGLEMENT}>, lis les règles et clique **✅ J'accepte** pour débloquer tout le serveur.`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "📋 Par où commencer ?", value: `1️⃣ Lis le règlement → <#${CONFIG.CHANNEL_REGLEMENT}>\n2️⃣ Choisis tes rôles → <#${CONFIG.CHANNEL_ROLES}>\n3️⃣ Lance Minecraft → \`${CONFIG.MC_IP}\``, inline: false },
        { name: "👥 Membres",    value: `**${member.guild.memberCount}** joueurs`, inline: true },
        { name: "🎮 Version MC", value: "`Java & Bedrock`", inline: true },
        { name: "🌍 Mode",       value: "`Survie Crossplay`", inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER + " • On est ravis de t'accueillir !", iconURL: CONFIG.LOGO_URL })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("show_ip").setLabel("🎮 Voir l'IP").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("show_reglement_link").setLabel("📜 Règlement").setStyle(ButtonStyle.Secondary),
    );

    await ch.send({ content: welcomeMsg, embeds: [embed], components: [row] });

    logAction(member.guild, {
      title: "📥 Nouveau membre",
      description: `**${member.user.tag}** a rejoint le serveur`,
      color: CONFIG.COLOR_GREEN,
      fields: [
        { name: "ID", value: member.user.id, inline: true },
        { name: "Compte créé le", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true },
      ],
    });
  } catch (err) { console.error("Erreur guildMemberAdd :", err); }
});

client.on("guildMemberRemove", (member) => {
  logAction(member.guild, {
    title: "📤 Membre parti",
    description: `**${member.user.tag}** a quitté le serveur`,
    color: CONFIG.COLOR_RED,
    fields: [{ name: "ID", value: member.user.id, inline: true }],
  });
});

// ============================================================
//  INTERACTIONS
// ============================================================

client.on("interactionCreate", async (interaction) => {

  // ── MENU DÉROULANT (rôles) ────────────────────────────────

  if (interaction.isStringSelectMenu() && interaction.customId === "role_selector") {
    try {
      const member = interaction.member;
      const optionalRoles = [CONFIG.ROLE_BUILDER, CONFIG.ROLE_PVP, CONFIG.ROLE_SURVIE, CONFIG.ROLE_NOTIFS];
      const selected = interaction.values;
      for (const roleId of optionalRoles) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role && member.roles.cache.has(roleId)) await member.roles.remove(role).catch(() => {});
      }
      const added = [];
      for (const roleId of selected) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) { await member.roles.add(role).catch(() => {}); added.push(role.name); }
      }
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_CYAN).setTitle("✅ Rôles mis à jour !")
        .setDescription(added.length ? `Tu as maintenant : ${added.map(r => `**${r}**`).join(", ")} !` : "Tous tes rôles optionnels ont été retirés.")
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error("Erreur role_selector :", err);
      if (!interaction.replied) await interaction.reply({ content: "❌ Erreur.", ephemeral: true });
    }
    return;
  }

  // ── BOUTONS ───────────────────────────────────────────────

  if (interaction.isButton()) {

    if (interaction.customId === "accept_rules") {
      try {
        const member = interaction.member;
        const roleJoueur = interaction.guild.roles.cache.get(CONFIG.ROLE_JOUEUR);
        const roleNV = interaction.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);
        if (!roleJoueur) return interaction.reply({ content: "❌ Rôle Joueur introuvable.", ephemeral: true });
        if (member.roles.cache.has(CONFIG.ROLE_JOUEUR)) return interaction.reply({ content: "✅ Tu as déjà accepté le règlement !", ephemeral: true });
        await member.roles.add(roleJoueur);
        if (roleNV) await member.roles.remove(roleNV).catch(() => {});
        const embed = new EmbedBuilder()
          .setColor(CONFIG.COLOR_GREEN).setAuthor({ name: "Soulakri", iconURL: CONFIG.LOGO_URL })
          .setTitle("✅ Bienvenue dans la communauté !")
          .setDescription(`**${member.user.username}**, tu fais maintenant partie de **Soulakri** ! 🎉`)
          .addFields(
            { name: "🎭 Étape suivante", value: `Choisis tes rôles dans <#${CONFIG.CHANNEL_ROLES}>`, inline: false },
            { name: "🎮 Rejoins le MC",  value: `\`${CONFIG.MC_IP}:${CONFIG.MC_PORT}\``, inline: false },
          )
          .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
        logAction(interaction.guild, {
          title: "✅ Règlement accepté",
          description: `**${member.user.tag}** a accepté le règlement`,
          color: CONFIG.COLOR_GREEN,
          fields: [{ name: "ID", value: member.user.id, inline: true }],
        });
      } catch (err) {
        console.error("Erreur accept_rules :", err);
        if (!interaction.replied) await interaction.reply({ content: "❌ Erreur.", ephemeral: true });
      }
      return;
    }

    if (interaction.customId === "show_ip") {
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GOLD).setTitle("🎮 IP du serveur Soulakri").setThumbnail(CONFIG.LOGO_URL)
        .addFields(
          { name: "📡 Adresse", value: `\`\`\`${CONFIG.MC_IP}\`\`\``, inline: false },
          { name: "🔌 Port",    value: `\`\`\`${CONFIG.MC_PORT}\`\`\``, inline: false },
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === "show_reglement_link") {
      return interaction.reply({ content: `📜 Le règlement est ici : <#${CONFIG.CHANNEL_REGLEMENT}>`, ephemeral: true });
    }

    if (interaction.customId === "close_ticket") {
      await interaction.reply({ content: "🔒 Fermeture du ticket dans 5 secondes..." });
      logAction(interaction.guild, {
        title: "🎫 Ticket fermé",
        description: `Le ticket **${interaction.channel.name}** a été fermé par **${interaction.user.tag}**`,
        color: CONFIG.COLOR_RED,
      });
      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
      return;
    }

    if (interaction.customId === "another_joke") {
      const b = blagues[Math.floor(Math.random() * blagues.length)];
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_ORANGE).setTitle("😂 Blague aléatoire")
        .addFields({ name: "❓", value: b.joke }, { name: "💡", value: b.answer })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary),
      );
      return interaction.update({ embeds: [embed], components: [row] });
    }

    if (interaction.customId === "giveaway_enter") {
      return interaction.reply({ content: "🎉 Réagis avec 🎉 pour participer !", ephemeral: true });
    }

    return;
  }

  // ── COMMANDES SLASH ───────────────────────────────────────
  if (!interaction.isChatInputCommand()) return;

  // /ping
  if (interaction.commandName === "ping") {
    const sent = await interaction.reply({ content: "🏓 Calcul...", fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = client.ws.ping;
    const embed = new EmbedBuilder()
      .setColor(latency < 100 ? CONFIG.COLOR_GREEN : latency < 300 ? CONFIG.COLOR_GOLD : CONFIG.COLOR_RED)
      .setTitle("🏓 Pong !")
      .addFields(
        { name: "📡 Latence bot",       value: `**${latency}ms**`, inline: true },
        { name: "💓 Latence WebSocket", value: `**${wsLatency}ms**`, inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.editReply({ content: null, embeds: [embed] });
  }

  // /userinfo
  if (interaction.commandName === "userinfo") {
    const target = interaction.options.getMember("membre") || interaction.member;
    const user = target.user;
    await user.fetch();
    const roles = target.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position);
    const topRole = roles.first();
    const status = { online: "🟢 En ligne", idle: "🌙 Absent", dnd: "🔴 Ne pas déranger", offline: "⚫ Hors ligne" };
    const presence = target.presence?.status || "offline";
    const warns = getWarns(interaction.guild.id, user.id);
    const embed = new EmbedBuilder()
      .setColor(topRole?.color || CONFIG.COLOR_BLUE)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle("👤 Informations du membre")
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "🪪 Pseudo serveur", value: target.displayName, inline: true },
        { name: "🆔 ID",             value: `\`${user.id}\``, inline: true },
        { name: "📶 Statut",         value: status[presence] || "⚫ Hors ligne", inline: true },
        { name: "📅 Compte créé",    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "📥 A rejoint",       value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`, inline: true },
        { name: "⚠️ Avertissements", value: `${warns.length}`, inline: true },
        { name: `🎭 Rôles (${roles.size})`, value: roles.size ? roles.map(r => r.toString()).slice(0, 10).join(" ") : "*Aucun*", inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /avatar
  if (interaction.commandName === "avatar") {
    const target = interaction.options.getUser("membre") || interaction.user;
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setTitle(`🖼️ Avatar de ${target.username}`)
      .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: "📥 PNG",  value: `[Télécharger](${target.displayAvatarURL({ format: "png",  size: 1024 })})`, inline: true },
        { name: "📥 WEBP", value: `[Télécharger](${target.displayAvatarURL({ format: "webp", size: 1024 })})`, inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /help
  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setAuthor({ name: "Soulakri Bot v5 — Aide", iconURL: CONFIG.LOGO_URL })
      .setTitle("📖 Liste des commandes")
      .setThumbnail(CONFIG.LOGO_URL)
      .addFields(
        { name: "── 🎮 Minecraft ──",      value: "\u200b" },
        { name: "`/ip`",        value: "IP du serveur MC",                  inline: true },
        { name: "`/stats`",     value: "Stats d'un joueur MC",              inline: true },
        { name: "── 🌐 Serveur ──",         value: "\u200b" },
        { name: "`/serverinfo`",value: "Infos du serveur Discord",          inline: true },
        { name: "`/ping`",      value: "Latence du bot",                    inline: true },
        { name: "`/userinfo`",  value: "Infos d'un membre",                 inline: true },
        { name: "`/avatar`",    value: "Avatar d'un membre",                inline: true },
        { name: "── 🏅 Profil ──",          value: "\u200b" },
        { name: "`/grade`",     value: "Ton grade + XP",                    inline: true },
        { name: "`/niveau`",    value: "Niveau XP (toi ou autre)",          inline: true },
        { name: "`/top`",       value: "Classement XP Top 10",              inline: true },
        { name: "── 🎲 Fun ──",             value: "\u200b" },
        { name: "`/blague`",    value: "Blague aléatoire 😂",              inline: true },
        { name: "`/soules`",    value: "🔥 Soules flash !",                 inline: true },
        { name: "`/giry`",      value: "⚡ Giry flash Skye !",              inline: true },
        { name: "`/67`",        value: "6️⃣7️⃣ Six Seven !",                 inline: true },
        { name: "`/cassandre`", value: "🔗 Deadlock !",                     inline: true },
        { name: "`/sondage`",   value: "Créer un sondage",                  inline: true },
        { name: "── 🎉 Giveaway ──",        value: "\u200b" },
        { name: "`/giveaway lancer`",  value: "*(Admin)* Lancer un giveaway",   inline: true },
        { name: "`/giveaway reroll`",  value: "*(Admin)* Reroll",               inline: true },
        { name: "`/giveaway terminer`",value: "*(Admin)* Terminer",             inline: true },
        { name: "── 🎫 Support ──",         value: "\u200b" },
        { name: "`/ticket`",    value: "Ouvre un ticket support",           inline: true },
        { name: "── 🔨 Modération ──",      value: "\u200b" },
        { name: "`/ban`",        value: "*(Mod)* Bannir",                   inline: true },
        { name: "`/kick`",       value: "*(Mod)* Expulser",                 inline: true },
        { name: "`/mute`",       value: "*(Mod)* Mute temporaire",          inline: true },
        { name: "`/unmute`",     value: "*(Mod)* Retirer mute",             inline: true },
        { name: "`/warn`",       value: "*(Mod)* Avertir",                  inline: true },
        { name: "`/infractions`",value: "*(Mod)* Voir les warns",           inline: true },
        { name: "`/clearwarns`", value: "*(Admin)* Effacer les warns",      inline: true },
        { name: "`/clear`",      value: "*(Mod)* Supprimer des messages",   inline: true },
        { name: "── ⚙️ Configuration ──",   value: "\u200b" },
        { name: "`/config voir`",      value: "*(Admin)* Config actuelle",  inline: true },
        { name: "`/config welcome`",   value: "*(Admin)* Bienvenue",        inline: true },
        { name: "`/config logs`",      value: "*(Admin)* Logs",             inline: true },
        { name: "`/config autorole`",  value: "*(Admin)* Auto-rôle",        inline: true },
        { name: "`/config xp`",        value: "*(Admin)* Système XP",       inline: true },
        { name: "`/config antispam`",  value: "*(Admin)* Anti-spam",        inline: true },
        { name: "`/config couleur`",   value: "*(Admin)* Couleur embeds",   inline: true },
        { name: "`/reglement`",        value: "*(Admin)* Poster règlement", inline: true },
        { name: "`/roles`",            value: "*(Admin)* Sélecteur rôles",  inline: true },
        { name: "`/vittel`",           value: "*(Admin)* Lancer Vittel BOT",inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER + " • v5", iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // /ip
  if (interaction.commandName === "ip") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setAuthor({ name: "Soulakri — Serveur Minecraft", iconURL: CONFIG.LOGO_URL })
      .setTitle("🎮 Rejoins le serveur !")
      .setThumbnail(CONFIG.LOGO_URL)
      .setDescription("Compatible **Java & Bedrock** — Lance Minecraft et connecte-toi ! ⚔️")
      .addFields(
        { name: "📡 Adresse IP", value: `\`\`\`${CONFIG.MC_IP}\`\`\``, inline: false },
        { name: "🔌 Port",       value: `\`\`\`${CONFIG.MC_PORT}\`\`\``, inline: false },
        { name: "📦 Version",    value: "`1.20.1`", inline: true },
        { name: "🌍 Mode",       value: "`Survie Crossplay`", inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /serverinfo
  if (interaction.commandName === "serverinfo") {
    await interaction.deferReply();
    const guild = interaction.guild;
    await guild.fetch();
    await guild.members.fetch();
    const totalMembers  = guild.memberCount;
    const botCount      = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount    = totalMembers - botCount;
    const textChannels  = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const totalRoles    = guild.roles.cache.size - 1;
    const boosts        = guild.premiumSubscriptionCount || 0;
    const boostLevel    = guild.premiumTier;
    const owner         = await guild.fetchOwner();
    const verif = ["Aucune", "Faible", "Moyenne", "Élevée", "Très élevée"][guild.verificationLevel] ?? "Inconnue";
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_CYAN)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) || CONFIG.LOGO_URL })
      .setTitle("🌐 Informations du serveur").setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || CONFIG.LOGO_URL)
      .addFields(
        { name: "👑 Propriétaire", value: owner.toString(), inline: true },
        { name: "📅 Créé le",      value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "🆔 ID",           value: `\`${guild.id}\``, inline: true },
        { name: "👥 Membres",      value: `👤 ${humanCount} humains\n🤖 ${botCount} bots`, inline: true },
        { name: "💬 Salons",       value: `📝 ${textChannels} texte\n🔊 ${voiceChannels} vocal`, inline: true },
        { name: "🎭 Rôles",        value: `${totalRoles} rôles`, inline: true },
        { name: "🚀 Boosts",       value: `${boosts} boost(s) — Niveau ${boostLevel}`, inline: true },
        { name: "🔒 Vérification", value: verif, inline: true },
        { name: "🎮 Serveur MC",   value: `\`${CONFIG.MC_IP}:${CONFIG.MC_PORT}\``, inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  }

  // /grade
  if (interaction.commandName === "grade") {
    const member = interaction.member;
    const gradeRoles = ["Admin", "Mod", "Builder", "MVP", "VIP", "Joueur"];
    let foundGrade = null;
    for (const name of gradeRoles) {
      const role = interaction.guild.roles.cache.find(r => r.name === name);
      if (role && member.roles.cache.has(role.id)) { foundGrade = role; break; }
    }
    const user = getUser(member.user.id);
    const xpNeeded = xpForLevel(user.level);
    const bar = progressBar(user.xp, xpNeeded);
    const percent = Math.round((user.xp / xpNeeded) * 100);
    const embed = new EmbedBuilder()
      .setColor(foundGrade ? (foundGrade.color || CONFIG.COLOR_BLUE) : CONFIG.COLOR_RED)
      .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
      .setTitle("🏅 Ton profil Soulakri").setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "🎖️ Grade",    value: foundGrade ? foundGrade.toString() : "*Aucun grade*", inline: true },
        { name: "⭐ Niveau",   value: `**${user.level}**`, inline: true },
        { name: "💬 Messages", value: `${user.messages}`, inline: true },
        { name: `📊 XP — ${user.xp} / ${xpNeeded} (${percent}%)`, value: `\`${bar}\``, inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // /niveau
  if (interaction.commandName === "niveau") {
    const target = interaction.options.getUser("joueur") || interaction.user;
    const user = getUser(target.id);
    const xpNeeded = xpForLevel(user.level);
    const bar = progressBar(user.xp, xpNeeded);
    const percent = Math.round((user.xp / xpNeeded) * 100);
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_PURPLE)
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setTitle(`⭐ Niveau de ${target.username}`).setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "⭐ Niveau",   value: `**${user.level}**`, inline: true },
        { name: "✨ XP",       value: `${user.xp} / ${xpNeeded}`, inline: true },
        { name: "💬 Messages", value: `${user.messages}`, inline: true },
        { name: `📊 Progression — ${percent}%`, value: `\`${bar}\``, inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /top
  if (interaction.commandName === "top") {
    const sorted = Object.entries(xpData)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);
    const medals = ["🥇", "🥈", "🥉"];
    const lines = sorted.length
      ? sorted.map((u, i) => `${medals[i] || `**${i + 1}.**`} <@${u.id}> — Niv. **${u.level}** · ${u.xp} XP`)
      : ["*Aucun joueur dans le classement.*"];
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setAuthor({ name: "Soulakri — Classement XP", iconURL: CONFIG.LOGO_URL })
      .setTitle("🏆 Top 10 joueurs").setThumbnail(CONFIG.LOGO_URL)
      .setDescription(lines.join("\n"))
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /stats
  if (interaction.commandName === "stats") {
    const pseudo = interaction.options.getString("pseudo");
    await interaction.deferReply();
    try {
      const uuidRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${pseudo}`);
      if (!uuidRes.ok) return interaction.editReply({ content: `❌ Joueur **${pseudo}** introuvable.` });
      const { id: uuid, name } = await uuidRes.json();
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN)
        .setAuthor({ name: `Stats de ${name}`, iconURL: `https://mc-heads.net/avatar/${uuid}/32` })
        .setTitle(`📊 ${name}`).setThumbnail(`https://mc-heads.net/avatar/${uuid}/64`).setImage(`https://mc-heads.net/body/${uuid}/128`)
        .addFields(
          { name: "🎮 Pseudo", value: `\`${name}\``, inline: true },
          { name: "🔑 UUID",   value: `\`${uuid.substring(0, 8)}...\``, inline: true },
          { name: "🌐 NameMC", value: `[Voir le profil](https://namemc.com/profile/${uuid})`, inline: true },
        )
        .setDescription("*Stats de jeu disponibles une fois le serveur MC configuré.*")
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Voir sur NameMC").setURL(`https://namemc.com/profile/${uuid}`).setStyle(ButtonStyle.Link),
      );
      return interaction.editReply({ embeds: [embed], components: [row] });
    } catch { return interaction.editReply({ content: "❌ Erreur. Réessaie plus tard." }); }
  }

  // /blague
  if (interaction.commandName === "blague") {
    const b = blagues[Math.floor(Math.random() * blagues.length)];
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_ORANGE).setTitle("😂 Blague aléatoire").setThumbnail(CONFIG.LOGO_URL)
      .addFields({ name: "❓ Question", value: b.joke }, { name: "💡 Réponse", value: b.answer })
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary),
    );
    return interaction.reply({ embeds: [embed], components: [row] });
  }

  // /soules
  if (interaction.commandName === "soules") {
    const embed = new EmbedBuilder()
      .setColor(0xFF6600).setTitle("🔥 FLASH OUT ! Soules balance une flash !")
      .setDescription(`${interaction.user.toString()} invoque **Soules** ! 🌟\n*Run it back !*`)
      .setImage(SOULES_GIFS[Math.floor(Math.random() * SOULES_GIFS.length)])
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /giry
  if (interaction.commandName === "giry") {
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71).setTitle("⚡ FLASH OUT ! Giry balance une flash de Skye !")
      .setDescription(`${interaction.user.toString()} invoque **Giry** ! 🦅\n*Blinded !*`)
      .setImage(GIRY_GIFS[Math.floor(Math.random() * GIRY_GIFS.length)])
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /67
  if (interaction.commandName === "67") {
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6).setTitle("6️⃣7️⃣ Six Seven !")
      .setDescription(`${interaction.user.toString()} balance du **67** ! 🎵`)
      .setImage(SIX_SEPT_GIFS[Math.floor(Math.random() * SIX_SEPT_GIFS.length)])
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /cassandre
  if (interaction.commandName === "cassandre") {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C).setTitle("🔗 Cassandre déploie Deadlock !")
      .setDescription(`${interaction.user.toString()} invoque **Cassandre** ! ⛓️\n*GG !*`)
      .setImage(CASSANDRE_GIFS[Math.floor(Math.random() * CASSANDRE_GIFS.length)])
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /sondage
  if (interaction.commandName === "sondage") {
    const question = interaction.options.getString("question");
    const choix = [1,2,3,4].map(i => interaction.options.getString(`choix${i}`)).filter(Boolean);
    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_CYAN)
      .setAuthor({ name: `Sondage de ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`📊 ${question}`)
      .setDescription(
        choix.length
          ? choix.map((c, i) => `${emojis[i]} ${c}`).join("\n\n")
          : "👍 Pour  ·  👎 Contre"
      )
      .setFooter({ text: CONFIG.FOOTER + " • Votez !", iconURL: CONFIG.LOGO_URL })
      .setTimestamp();
    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    if (choix.length) {
      for (let i = 0; i < choix.length; i++) await msg.react(emojis[i]).catch(() => {});
    } else {
      await msg.react("👍").catch(() => {});
      await msg.react("👎").catch(() => {});
    }
  }

  // /warn
  if (interaction.commandName === "warn") {
    const target = interaction.options.getMember("membre");
    const raison = interaction.options.getString("raison");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const warns = addWarn(interaction.guild.id, target.user.id, raison, interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_ORANGE).setTitle("⚠️ Avertissement")
      .addFields(
        { name: "👤 Membre",           value: target.user.tag, inline: true },
        { name: "👮 Modérateur",       value: interaction.user.tag, inline: true },
        { name: "📝 Raison",           value: raison, inline: false },
        { name: "⚠️ Total warns",      value: `${warns.length}`, inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    // DM au membre
    target.user.send({
      embeds: [new EmbedBuilder().setColor(CONFIG.COLOR_ORANGE).setTitle(`⚠️ Tu as reçu un avertissement sur ${interaction.guild.name}`)
        .addFields({ name: "📝 Raison", value: raison }, { name: "⚠️ Total", value: `${warns.length} warn(s)` })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp()]
    }).catch(() => {});
    logAction(interaction.guild, {
      title: "⚠️ Warn",
      description: `**${target.user.tag}** averti par **${interaction.user.tag}**`,
      color: CONFIG.COLOR_ORANGE,
      fields: [{ name: "Raison", value: raison, inline: true }, { name: "Total warns", value: `${warns.length}`, inline: true }],
    });
    return;
  }

  // /infractions
  if (interaction.commandName === "infractions") {
    const target = interaction.options.getMember("membre");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const warns = getWarns(interaction.guild.id, target.user.id);
    const embed = new EmbedBuilder()
      .setColor(warns.length ? CONFIG.COLOR_ORANGE : CONFIG.COLOR_GREEN)
      .setTitle(`⚠️ Infractions de ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        warns.length
          ? warns.map((w, i) =>
              `**${i + 1}.** ${w.reason}\n> 👮 <@${w.modId}> · <t:${Math.floor(w.date / 1000)}:R>`
            ).join("\n\n")
          : "✅ Aucune infraction enregistrée."
      )
      .setFooter({ text: `${warns.length} avertissement(s) au total`, iconURL: CONFIG.LOGO_URL })
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // /clearwarns
  if (interaction.commandName === "clearwarns") {
    const target = interaction.options.getMember("membre");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    clearWarns(interaction.guild.id, target.user.id);
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GREEN).setTitle("✅ Warns effacés")
      .setDescription(`Tous les avertissements de **${target.user.tag}** ont été supprimés.`)
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /clear
  if (interaction.commandName === "clear") {
    const nombre = interaction.options.getInteger("nombre");
    const membre = interaction.options.getMember("membre");
    if (nombre < 1 || nombre > 100) return interaction.reply({ content: "❌ Entre 1 et 100 messages.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    try {
      let messages = await interaction.channel.messages.fetch({ limit: 100 });
      if (membre) messages = messages.filter(m => m.member?.id === membre.id);
      messages = [...messages.values()].slice(0, nombre);
      const deleted = await interaction.channel.bulkDelete(messages, true);
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN).setTitle("🧹 Messages supprimés")
        .setDescription(`**${deleted.size}** message(s) supprimé(s)${membre ? ` de **${membre.user.tag}**` : ""}.`)
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      logAction(interaction.guild, {
        title: "🧹 Clear",
        description: `**${deleted.size}** message(s) supprimé(s) par **${interaction.user.tag}** dans <#${interaction.channel.id}>`,
        color: CONFIG.COLOR_BLUE,
      });
    } catch { await interaction.editReply({ content: "❌ Impossible de supprimer (messages > 14j ?)." }); }
    return;
  }

  // /giveaway
  if (interaction.commandName === "giveaway") {
    const sub = interaction.options.getSubcommand();

    if (sub === "lancer") {
      const lot      = interaction.options.getString("lot");
      const minutes  = interaction.options.getInteger("minutes");
      const winners  = interaction.options.getInteger("gagnants") || 1;
      const endsAt   = Date.now() + minutes * 60 * 1000;

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GOLD)
        .setTitle("🎉 GIVEAWAY !")
        .setDescription(
          `**${lot}**\n\n` +
          `🕐 Fin : <t:${Math.floor(endsAt / 1000)}:R>\n` +
          `🏆 Gagnant(s) : **${winners}**\n` +
          `🎟️ Réagis avec 🎉 pour participer !`
        )
        .addFields({ name: "Organisé par", value: interaction.user.toString(), inline: true })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL })
        .setTimestamp(endsAt);

      const msg = await interaction.channel.send({ embeds: [embed] });
      await msg.react("🎉");

      giveawayData[msg.id] = {
        lot, winners, endsAt,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id,
        ended: false,
      };
      saveGiveaways();

      return interaction.reply({ content: `✅ Giveaway lancé ! Fin <t:${Math.floor(endsAt / 1000)}:R>`, ephemeral: true });
    }

    if (sub === "terminer") {
      const msgId = interaction.options.getString("message_id");
      const gw = giveawayData[msgId];
      if (!gw || gw.ended) return interaction.reply({ content: "❌ Giveaway introuvable ou déjà terminé.", ephemeral: true });
      await endGiveaway(msgId, gw.channelId, gw.guildId);
      return interaction.reply({ content: "✅ Giveaway terminé !", ephemeral: true });
    }

    if (sub === "reroll") {
      const msgId = interaction.options.getString("message_id");
      const gw = giveawayData[msgId];
      if (!gw) return interaction.reply({ content: "❌ Giveaway introuvable.", ephemeral: true });
      const winners = await endGiveaway(msgId, gw.channelId, gw.guildId, false);
      if (winners?.length) {
        await interaction.channel.send({ content: `🎊 Reroll ! Nouveau(x) gagnant(s) : ${winners.map(w => w.toString()).join(", ")} ! Félicitations !` });
      }
      return interaction.reply({ content: "✅ Reroll effectué !", ephemeral: true });
    }
  }

  // /reglement
  if (interaction.commandName === "reglement") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setAuthor({ name: "Soulakri — Règlement officiel", iconURL: CONFIG.LOGO_URL })
      .setTitle("📜 Règlement du serveur Soulakri").setThumbnail(CONFIG.LOGO_URL)
      .setDescription("Bienvenue sur **Soulakri** ! 🎮\nLis et accepte les règles ci-dessous pour accéder au serveur.\n\u200b")
      .addFields(
        { name: "1️⃣ Respect mutuel",    value: "Respecte tous les joueurs. Insultes, harcèlement et discriminations → ban immédiat.", inline: false },
        { name: "2️⃣ Anti-cheat",         value: "Tout hack, client modifié ou exploit est strictement interdit. Tolérance zéro.", inline: false },
        { name: "3️⃣ Anti-grief",         value: "Détruire, voler ou modifier les constructions d'autrui est interdit.", inline: false },
        { name: "4️⃣ Langage correct",    value: "Pas de spam, flood, caps excessif ni langage inapproprié.", inline: false },
        { name: "5️⃣ Pas de pub",         value: "Toute pub pour un autre serveur Discord ou MC est interdite.", inline: false },
        { name: "6️⃣ Respect des admins", value: "Les décisions des modérateurs et administrateurs sont définitives.", inline: false },
        { name: "7️⃣ Fair-play",          value: "Soulakri est un serveur fun et familial. Joue dans l'esprit de la communauté ! 🌟", inline: false },
        { name: "\u200b",                 value: "✅ **Si tu acceptes, clique sur le bouton ci-dessous.**" },
      )
      .setFooter({ text: CONFIG.FOOTER + " • Règlement v1.0", iconURL: CONFIG.LOGO_URL }).setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("accept_rules").setLabel("✅  J'accepte le règlement").setStyle(ButtonStyle.Success),
    );
    const channel = interaction.guild.channels.cache.get(CONFIG.CHANNEL_REGLEMENT);
    if (!channel) return interaction.reply({ content: "❌ Salon règlement introuvable.", ephemeral: true });
    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `✅ Règlement posté dans <#${CONFIG.CHANNEL_REGLEMENT}> !`, ephemeral: true });
  }

  // /roles
  if (interaction.commandName === "roles") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_PURPLE)
      .setAuthor({ name: "Soulakri — Choisir ses rôles", iconURL: CONFIG.LOGO_URL })
      .setTitle("🎭 Choisir ses rôles").setThumbnail(CONFIG.LOGO_URL)
      .setDescription("Sélectionne les rôles qui te correspondent. Tu peux en choisir **plusieurs** et changer à tout moment !\n\u200b")
      .addFields(
        { name: "🔨 Builder",       value: "Tu aimes construire", inline: true },
        { name: "⚔️ PvP",           value: "Tu adores les combats", inline: true },
        { name: "🌲 Survie",        value: "Joueur survie pur", inline: true },
        { name: "🔔 Notifications", value: "Annonces importantes", inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER + " • Modifiable à tout moment", iconURL: CONFIG.LOGO_URL });
    const menu = new StringSelectMenuBuilder()
      .setCustomId("role_selector").setPlaceholder("Sélectionne tes rôles...")
      .setMinValues(0).setMaxValues(4)
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("🔨 Builder").setDescription("Tu aimes construire").setValue(CONFIG.ROLE_BUILDER).setEmoji("🔨"),
        new StringSelectMenuOptionBuilder().setLabel("⚔️ PvP").setDescription("Tu adores les combats").setValue(CONFIG.ROLE_PVP).setEmoji("⚔️"),
        new StringSelectMenuOptionBuilder().setLabel("🌲 Survie").setDescription("Joueur survie pur").setValue(CONFIG.ROLE_SURVIE).setEmoji("🌲"),
        new StringSelectMenuOptionBuilder().setLabel("🔔 Notifications").setDescription("Recevoir les annonces").setValue(CONFIG.ROLE_NOTIFS).setEmoji("🔔"),
      );
    const row = new ActionRowBuilder().addComponents(menu);
    const channel = interaction.guild.channels.cache.get(CONFIG.CHANNEL_ROLES);
    if (!channel) return interaction.reply({ content: "❌ Salon rôles introuvable.", ephemeral: true });
    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `✅ Sélecteur posté dans <#${CONFIG.CHANNEL_ROLES}> !`, ephemeral: true });
  }

  // /vittel
  if (interaction.commandName === "vittel") {
    const channel = interaction.guild.channels.cache.get(CONFIG.CHANNEL_MATHS);
    if (!channel) return interaction.reply({ content: "❌ Salon maths introuvable.", ephemeral: true });
    if (vitelActive) return interaction.reply({ content: "⚠️ Une question est déjà en cours !", ephemeral: true });
    await launchVittelQuestion(channel);
    return interaction.reply({ content: `✅ Question lancée dans <#${CONFIG.CHANNEL_MATHS}> !`, ephemeral: true });
  }

  // /ticket
  if (interaction.commandName === "ticket") {
    try {
      const guild = interaction.guild;
      const member = interaction.member;
      const ticketName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const existing = guild.channels.cache.find(c => c.name === ticketName);
      if (existing) return interaction.reply({ content: `❌ Ticket déjà ouvert : ${existing.toString()}`, ephemeral: true });
      const category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("support"));
      const adminRole = guild.roles.cache.get(CONFIG.ROLE_ADMIN);
      const modRole   = guild.roles.cache.get(CONFIG.ROLE_MOD);
      const overwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ];
      if (adminRole) overwrites.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (modRole)   overwrites.push({ id: modRole.id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      const ticketChannel = await guild.channels.create({
        name: ticketName, type: ChannelType.GuildText,
        parent: category ? category.id : null,
        permissionOverwrites: overwrites,
        topic: `Ticket de ${member.user.tag}`,
      });
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_BLUE).setAuthor({ name: "Support Soulakri", iconURL: CONFIG.LOGO_URL })
        .setTitle("🎫 Ticket de support")
        .setDescription(`Bonjour **${member.user.username}** ! 👋\nUn modérateur va te répondre dès que possible.\n\n**Explique ton problème ci-dessous.**`)
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger),
      );
      await ticketChannel.send({ content: `${member.toString()}${adminRole ? " " + adminRole.toString() : ""}`, embeds: [embed], components: [row] });
      return interaction.reply({ content: `✅ Ticket créé : ${ticketChannel.toString()}`, ephemeral: true });
    } catch (err) {
      console.error("Erreur /ticket :", err);
      if (!interaction.replied) return interaction.reply({ content: "❌ Impossible de créer le ticket.", ephemeral: true });
    }
  }

  // ── /config ───────────────────────────────────────────────

  if (interaction.commandName === "config") {
    const sub = interaction.options.getSubcommand();
    const cfg = getServerConfig(interaction.guild.id);

    if (sub === "voir") {
      const boolEmoji = v => v ? "✅" : "❌";
      const chMention = id => id ? `<#${id}>` : "*Non défini*";
      const roleMention = id => id ? `<@&${id}>` : "*Non défini*";

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_BLUE)
        .setAuthor({ name: "⚙️ Configuration de Soulakri Bot", iconURL: CONFIG.LOGO_URL })
        .setTitle(`⚙️ Config — ${interaction.guild.name}`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || CONFIG.LOGO_URL)
        .addFields(
          { name: "── 👋 Bienvenue ──", value: "\u200b" },
          { name: "Activé",    value: boolEmoji(cfg.welcome_enabled), inline: true },
          { name: "Salon",     value: chMention(cfg.welcome_channel), inline: true },
          { name: "Message",   value: `\`\`\`${cfg.welcome_message}\`\`\``, inline: false },

          { name: "── 📋 Logs ──", value: "\u200b" },
          { name: "Activé", value: boolEmoji(cfg.logs_enabled), inline: true },
          { name: "Salon",  value: chMention(cfg.logs_channel), inline: true },

          { name: "── 🤖 Auto-rôle ──", value: "\u200b" },
          { name: "Activé", value: boolEmoji(cfg.autorole_enabled), inline: true },
          { name: "Rôle",   value: roleMention(cfg.autorole), inline: true },

          { name: "── ⭐ Système XP ──", value: "\u200b" },
          { name: "Activé",          value: boolEmoji(cfg.xp_enabled), inline: true },
          { name: "Salon level up",  value: chMention(cfg.xp_levelup_channel), inline: true },
          { name: "Message level up",value: `\`\`\`${cfg.xp_levelup_message}\`\`\``, inline: false },

          { name: "── 🚫 Anti-spam ──", value: "\u200b" },
          { name: "Activé",    value: boolEmoji(cfg.antispam_enabled), inline: true },
          { name: "Max msgs",  value: `${cfg.antispam_max}`, inline: true },
          { name: "Intervalle",value: `${cfg.antispam_interval}s`, inline: true },

          { name: "── 🎨 Apparence ──", value: "\u200b" },
          { name: "Couleur embeds", value: `\`${cfg.color}\``, inline: true },
        )
        .setFooter({ text: CONFIG.FOOTER + " • /config <option> pour modifier", iconURL: CONFIG.LOGO_URL })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "welcome") {
      const salon  = interaction.options.getChannel("salon");
      const msg    = interaction.options.getString("message");
      const active = interaction.options.getBoolean("activer");
      if (salon)  cfg.welcome_channel = salon.id;
      if (msg)    cfg.welcome_message = msg;
      if (active !== null) cfg.welcome_enabled = active;
      saveServerConfig();
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN).setTitle("✅ Bienvenue mis à jour !")
        .addFields(
          { name: "Activé",  value: cfg.welcome_enabled ? "✅" : "❌", inline: true },
          { name: "Salon",   value: cfg.welcome_channel ? `<#${cfg.welcome_channel}>` : "*Non défini*", inline: true },
          { name: "Message", value: cfg.welcome_message, inline: false },
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "logs") {
      const salon  = interaction.options.getChannel("salon");
      const active = interaction.options.getBoolean("activer");
      if (salon)  cfg.logs_channel = salon.id;
      if (active !== null) cfg.logs_enabled = active;
      saveServerConfig();
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN).setTitle("✅ Logs mis à jour !")
        .addFields(
          { name: "Activé", value: cfg.logs_enabled ? "✅" : "❌", inline: true },
          { name: "Salon",  value: cfg.logs_channel ? `<#${cfg.logs_channel}>` : "*Non défini*", inline: true },
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "autorole") {
      const role   = interaction.options.getRole("role");
      const active = interaction.options.getBoolean("activer");
      if (role)   cfg.autorole = role.id;
      if (active !== null) cfg.autorole_enabled = active;
      saveServerConfig();
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN).setTitle("✅ Auto-rôle mis à jour !")
        .addFields(
          { name: "Activé", value: cfg.autorole_enabled ? "✅" : "❌", inline: true },
          { name: "Rôle",   value: cfg.autorole ? `<@&${cfg.autorole}>` : "*Non défini*", inline: true },
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "xp") {
      const active = interaction.options.getBoolean("activer");
      const salon  = interaction.options.getChannel("salon");
      const msg    = interaction.options.getString("message");
      if (active !== null) cfg.xp_enabled = active;
      if (salon) cfg.xp_levelup_channel = salon.id;
      if (msg)   cfg.xp_levelup_message = msg;
      saveServerConfig();
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN).setTitle("✅ XP mis à jour !")
        .addFields(
          { name: "Activé",         value: cfg.xp_enabled ? "✅" : "❌", inline: true },
          { name: "Salon level up", value: cfg.xp_levelup_channel ? `<#${cfg.xp_levelup_channel}>` : "*Même salon*", inline: true },
          { name: "Message",        value: cfg.xp_levelup_message, inline: false },
        )
        .setFooter({ text: "Variables : {user} {level}", iconURL: CONFIG.LOGO_URL }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "antispam") {
      const active    = interaction.options.getBoolean("activer");
      const max       = interaction.options.getInteger("max");
      const intervalle= interaction.options.getInteger("intervalle");
      if (active !== null) cfg.antispam_enabled = active;
      if (max)       cfg.antispam_max = max;
      if (intervalle)cfg.antispam_interval = intervalle;
      saveServerConfig();
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN).setTitle("✅ Anti-spam mis à jour !")
        .addFields(
          { name: "Activé",    value: cfg.antispam_enabled ? "✅" : "❌", inline: true },
          { name: "Max msgs",  value: `${cfg.antispam_max}`, inline: true },
          { name: "Intervalle",value: `${cfg.antispam_interval}s`, inline: true },
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "couleur") {
      const hex = interaction.options.getString("hex");
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return interaction.reply({ content: "❌ Format invalide. Exemple : `#FF6600`", ephemeral: true });
      cfg.color = hex;
      saveServerConfig();
      const color = parseInt(hex.replace("#", ""), 16);
      const embed = new EmbedBuilder()
        .setColor(color).setTitle("✅ Couleur mise à jour !")
        .setDescription(`La couleur des embeds est maintenant \`${hex}\`.`)
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // /ban /kick /mute /unmute
  if (interaction.commandName === "ban") {
    const target = interaction.options.getMember("membre");
    const raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target || !target.bannable) return interaction.reply({ content: "❌ Impossible de bannir ce membre.", ephemeral: true });
    try {
      await target.ban({ reason: raison });
      const embed = new EmbedBuilder().setColor(CONFIG.COLOR_RED).setTitle("🔨 Membre banni")
        .addFields({ name: "👤", value: target.user.tag, inline: true }, { name: "👮", value: interaction.user.tag, inline: true }, { name: "📝 Raison", value: raison })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, { title: "🔨 Ban", description: `**${target.user.tag}** banni par **${interaction.user.tag}**`, color: CONFIG.COLOR_RED, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du ban.", ephemeral: true }); }
    return;
  }

  if (interaction.commandName === "kick") {
    const target = interaction.options.getMember("membre");
    const raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target || !target.kickable) return interaction.reply({ content: "❌ Impossible d'expulser ce membre.", ephemeral: true });
    try {
      await target.kick(raison);
      const embed = new EmbedBuilder().setColor(CONFIG.COLOR_ORANGE).setTitle("👢 Membre expulsé")
        .addFields({ name: "👤", value: target.user.tag, inline: true }, { name: "👮", value: interaction.user.tag, inline: true }, { name: "📝 Raison", value: raison })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, { title: "👢 Kick", description: `**${target.user.tag}** expulsé par **${interaction.user.tag}**`, color: CONFIG.COLOR_ORANGE, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du kick.", ephemeral: true }); }
    return;
  }

  if (interaction.commandName === "mute") {
    const target  = interaction.options.getMember("membre");
    const minutes = interaction.options.getInteger("minutes");
    const raison  = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (minutes < 1 || minutes > 40320) return interaction.reply({ content: "❌ Durée invalide (1–40320 min).", ephemeral: true });
    try {
      await target.timeout(minutes * 60 * 1000, raison);
      const embed = new EmbedBuilder().setColor(CONFIG.COLOR_PURPLE).setTitle("🔇 Membre mute")
        .addFields({ name: "👤", value: target.user.tag, inline: true }, { name: "👮", value: interaction.user.tag, inline: true }, { name: "⏱️", value: `${minutes} min`, inline: true }, { name: "📝 Raison", value: raison })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, { title: "🔇 Mute", description: `**${target.user.tag}** mute ${minutes}min par **${interaction.user.tag}**`, color: CONFIG.COLOR_PURPLE, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du mute.", ephemeral: true }); }
    return;
  }

  if (interaction.commandName === "unmute") {
    const target = interaction.options.getMember("membre");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    try {
      await target.timeout(null);
      const embed = new EmbedBuilder().setColor(CONFIG.COLOR_GREEN).setTitle("🔊 Mute retiré")
        .addFields({ name: "👤", value: target.user.tag, inline: true }, { name: "👮", value: interaction.user.tag, inline: true })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du unmute.", ephemeral: true }); }
    return;
  }
});

// ============================================================
//  CONNEXION
// ============================================================
client.login(TOKEN);
