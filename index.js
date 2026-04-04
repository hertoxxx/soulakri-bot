// ============================================================
//  SOULAKRI BOT v3 — discord.js v14
// ============================================================
//  CONFIGURATION
// ============================================================

const CONFIG = {
  GUILD_ID:           "1487136081152577556",
  CHANNEL_REGLEMENT:  "1487136083627086010",
  CHANNEL_BIENVENUE:  "1487136083627086009",
  CHANNEL_LOGS:       "1487136083132284951",
  ROLE_JOUEUR:        "1489335006290776174",
  ROLE_NON_VERIFIE:   "1489335084568936498",
  ROLE_ADMIN:         "1487136081198448730",
  ROLE_MOD:           "1487136081198448729",

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
};

// ============================================================
//  IMPORTS & INITIALISATION
// ============================================================

require("dotenv").config();
const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, SlashCommandBuilder,
  REST, Routes, ChannelType, PermissionFlagsBits,
} = require("discord.js");

const fs = require("fs");
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
//  BASE DE DONNÉES XP
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
//  GIFs PHOENIX (Valorant)
// ============================================================

const PHOENIX_GIFS = [
  "https://media.tenor.com/Wd3ypqFhbKcAAAAC/phoenix-valorant.gif",
  "https://media.tenor.com/6Y3pxLqFvVQAAAAC/valorant-phoenix.gif",
  "https://media.tenor.com/4ZfmDqzTR3IAAAAC/phoenix-valorant-flash.gif",
  "https://media.tenor.com/M1lkgzBNb7YAAAAC/phoenix-flash-valorant.gif",
  "https://media.tenor.com/oVF6NREP5LIAAAAC/valorant-phoenix.gif",
];

const PHOENIX_PHRASES = [
  "FLASH OUT ! T'as rien vu 🔥",
  "Run it back ! Phoenix est en feu 🔥",
  "Come on, lemme cook ! 🔥",
  "Aveugle ! Personne ne peut m'arrêter 🔥",
  "Hot hands, what can I say ? 🔥",
];

// ============================================================
//  BLAGUES
// ============================================================

const blagues = [
  { joke: "Pourquoi les plongeurs plongent-ils toujours en arrière ?", answer: "Parce que sinon ils tomberaient dans le bateau ! 😂" },
  { joke: "Qu'est-ce qu'un canif ?", answer: "Le petit fils du caniche ! 🐩" },
  { joke: "Pourquoi les vampires sont nuls en informatique ?", answer: "Parce qu'ils ont peur des octets ! 🧛" },
  { joke: "Quel est le comble pour un électricien ?", answer: "De ne pas être au courant ! ⚡" },
  { joke: "Qu'est-ce qu'un Minecraft sans creeper ?", answer: "Une thérapie ! 💚" },
  { joke: "Pourquoi Creeper est toujours seul ?", answer: "Parce qu'il fait exploser toutes ses relations ! 💥" },
  { joke: "Comment s'appelle un joueur Minecraft qui pleure ?", answer: "Un mineur en larmes ! ⛏️" },
  { joke: "Qu'est-ce qu'un crocodile qui surveille la cour d'école ?", answer: "Un sac à dents ! 🐊" },
  { joke: "Pourquoi les poissons vivent dans l'eau salée ?", answer: "Parce que le poivre les ferait éternuer ! 🐟" },
  { joke: "Quel est le sport préféré des Endermen ?", answer: "La téléportation marathon ! 🏃" },
];

// ============================================================
//  COMMANDES SLASH
// ============================================================

const commands = [
  new SlashCommandBuilder().setName("help").setDescription("Affiche toutes les commandes"),
  new SlashCommandBuilder().setName("ip").setDescription("Affiche l'IP du serveur Minecraft"),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Infos complètes du serveur Discord"),
  new SlashCommandBuilder()
    .setName("grade")
    .setDescription("Affiche ton grade et niveau XP"),
  new SlashCommandBuilder()
    .setName("niveau")
    .setDescription("Niveau XP d'un joueur")
    .addUserOption(o => o.setName("joueur").setDescription("Joueur à inspecter").setRequired(false)),
  new SlashCommandBuilder().setName("top").setDescription("Classement XP des 10 meilleurs"),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Stats d'un joueur Minecraft")
    .addStringOption(o => o.setName("pseudo").setDescription("Pseudo Minecraft").setRequired(true)),
  new SlashCommandBuilder().setName("blague").setDescription("Une blague aléatoire 😂"),
  new SlashCommandBuilder().setName("soules").setDescription("🔥 Phoenix lance une flash !"),
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à bannir").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulser un membre (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à expulser").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mettre en sourdine (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à mute").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Durée en minutes").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Retirer le mute (Mod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à unmute").setRequired(true)),
  new SlashCommandBuilder()
    .setName("reglement")
    .setDescription("Poster le règlement (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("ticket").setDescription("Ouvre un ticket support privé"),
];

// ============================================================
//  ENREGISTREMENT DES COMMANDES
// ============================================================

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("⏳ Enregistrement des commandes slash...");
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, CONFIG.GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log("✅ Commandes enregistrées !");
  } catch (err) { console.error("❌ Erreur commandes :", err); }
}

// ============================================================
//  BOT PRÊT
// ============================================================

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} est en ligne !`);
  client.user.setActivity("Soulakri 🎮 | /help", { type: 0 });
  await registerCommands();
});

// ============================================================
//  LOGS HELPER
// ============================================================

async function logAction(guild, { title, description, color, fields = [] }) {
  try {
    const ch = guild.channels.cache.get(CONFIG.CHANNEL_LOGS);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(color).setTitle(title).setDescription(description)
      .addFields(fields).setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    await ch.send({ embeds: [embed] });
  } catch {}
}

// ============================================================
//  SYSTÈME XP
// ============================================================

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const userId = message.author.id;
  const now = Date.now();
  if (now - (xpCooldowns.get(userId) || 0) < CONFIG.XP_COOLDOWN_MS) return;
  xpCooldowns.set(userId, now);
  const amount = Math.floor(Math.random() * (CONFIG.XP_MAX - CONFIG.XP_MIN + 1)) + CONFIG.XP_MIN;
  const { user, leveledUp } = addXP(userId, amount);
  if (leveledUp) {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("🎉 Level Up !")
      .setDescription(`${message.author.toString()} passe au **niveau ${user.level}** ! 🚀`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
    message.channel.send({ embeds: [embed] }).catch(() => {});
  }
});

// ============================================================
//  ACCUEIL
// ============================================================

client.on("guildMemberAdd", async (member) => {
  try {
    const roleNV = member.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);
    if (roleNV) await member.roles.add(roleNV);

    const ch = member.guild.channels.cache.get(CONFIG.CHANNEL_BIENVENUE);
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setAuthor({ name: "Soulakri • Nouveau joueur !", iconURL: CONFIG.LOGO_URL })
      .setTitle(`🎉 Bienvenue ${member.user.username} !`)
      .setDescription(
        `Hey **${member.user.username}**, tu es le **${member.guild.memberCount}ème** joueur à rejoindre Soulakri ! 🌟\n\n` +
        `➡️ Rends-toi dans <#${CONFIG.CHANNEL_REGLEMENT}>, lis les règles et clique **✅ J'accepte** pour débloquer tous les salons.`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "📜 Règlement", value: `<#${CONFIG.CHANNEL_REGLEMENT}>`, inline: true },
        { name: "🎮 IP Minecraft", value: `\`${CONFIG.MC_IP}\``, inline: true },
        { name: "👥 Membres", value: `${member.guild.memberCount} joueurs`, inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("show_ip").setLabel("🎮 IP du serveur").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("show_reglement_link").setLabel("📜 Règlement").setStyle(ButtonStyle.Secondary),
    );

    await ch.send({ embeds: [embed], components: [row] });
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

  // ── BOUTONS ───────────────────────────────────────────────

  if (interaction.isButton()) {

    if (interaction.customId === "accept_rules") {
      try {
        const member = interaction.member;
        const roleJoueur = interaction.guild.roles.cache.get(CONFIG.ROLE_JOUEUR);
        const roleNV = interaction.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);
        if (!roleJoueur) return interaction.reply({ content: "❌ Rôle Joueur introuvable. Contacte un admin.", ephemeral: true });
        if (member.roles.cache.has(CONFIG.ROLE_JOUEUR)) return interaction.reply({ content: "✅ Tu as déjà accepté le règlement !", ephemeral: true });
        await member.roles.add(roleJoueur);
        if (roleNV) await member.roles.remove(roleNV).catch(() => {});
        const embed = new EmbedBuilder()
          .setColor(CONFIG.COLOR_GREEN)
          .setAuthor({ name: "Soulakri", iconURL: CONFIG.LOGO_URL })
          .setTitle("✅ Règlement accepté !")
          .setDescription(`Bienvenue dans la communauté **Soulakri**, **${member.user.username}** ! 🎉\nTu as maintenant accès à tous les salons. Bonne aventure ! ⚔️`)
          .addFields(
            { name: "🎮 IP Minecraft", value: `\`${CONFIG.MC_IP}:${CONFIG.MC_PORT}\``, inline: true },
            { name: "💬 Chat", value: "Rejoins la discussion générale !", inline: true },
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
        if (!interaction.replied) await interaction.reply({ content: "❌ Erreur. Contacte un admin.", ephemeral: true });
      }
      return;
    }

    if (interaction.customId === "show_ip") {
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GOLD)
        .setTitle("🎮 IP du serveur Soulakri")
        .setThumbnail(CONFIG.LOGO_URL)
        .addFields(
          { name: "📡 Adresse", value: `\`\`\`${CONFIG.MC_IP}\`\`\``, inline: false },
          { name: "🔌 Port", value: `\`\`\`${CONFIG.MC_PORT}\`\`\``, inline: false },
          { name: "📦 Version", value: "`Java & Bedrock 1.20.1`", inline: true },
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === "show_reglement_link") {
      return interaction.reply({ content: `📜 Le règlement est ici : <#${CONFIG.CHANNEL_REGLEMENT}>`, ephemeral: true });
    }

    if (interaction.customId === "close_ticket") {
      await interaction.reply({ content: "🔒 Fermeture du ticket dans 5 secondes..." });
      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
      return;
    }

    if (interaction.customId === "another_joke") {
      const b = blagues[Math.floor(Math.random() * blagues.length)];
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_ORANGE)
        .setTitle("😂 Blague aléatoire")
        .addFields(
          { name: "❓ Question", value: b.joke, inline: false },
          { name: "💡 Réponse", value: b.answer, inline: false },
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary),
      );
      return interaction.update({ embeds: [embed], components: [row] });
    }

    return;
  }

  // ── COMMANDES SLASH ───────────────────────────────────────
  if (!interaction.isChatInputCommand()) return;

  // /help
  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setAuthor({ name: "Soulakri Bot — Aide", iconURL: CONFIG.LOGO_URL })
      .setTitle("📖 Liste des commandes")
      .setThumbnail(CONFIG.LOGO_URL)
      .addFields(
        { name: "── 🎮 Minecraft ──", value: "\u200b" },
        { name: "`/ip`",          value: "IP du serveur MC",              inline: true },
        { name: "`/stats`",       value: "Stats d'un joueur Minecraft",   inline: true },
        { name: "── 🌐 Serveur ──", value: "\u200b" },
        { name: "`/serverinfo`",  value: "Infos du serveur Discord",      inline: true },
        { name: "── 🏅 Profil ──", value: "\u200b" },
        { name: "`/grade`",       value: "Ton grade + niveau XP",         inline: true },
        { name: "`/niveau`",      value: "Niveau XP (toi ou un joueur)",  inline: true },
        { name: "`/top`",         value: "Classement XP du serveur",      inline: true },
        { name: "── 🎲 Fun ──", value: "\u200b" },
        { name: "`/blague`",      value: "Blague aléatoire 😂",           inline: true },
        { name: "`/soules`",      value: "🔥 Phoenix lance une flash !",  inline: true },
        { name: "── 🎫 Support ──", value: "\u200b" },
        { name: "`/ticket`",      value: "Ouvre un ticket support",       inline: true },
        { name: "── 🔨 Modération ──", value: "\u200b" },
        { name: "`/ban`",         value: "*(Mod)* Bannir",                inline: true },
        { name: "`/kick`",        value: "*(Mod)* Expulser",              inline: true },
        { name: "`/mute`",        value: "*(Mod)* Mute temporaire",       inline: true },
        { name: "`/unmute`",      value: "*(Mod)* Retirer mute",          inline: true },
        { name: "`/reglement`",   value: "*(Admin)* Poster le règlement", inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL })
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // /ip
  if (interaction.commandName === "ip") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setAuthor({ name: "Soulakri — Serveur Minecraft", iconURL: CONFIG.LOGO_URL })
      .setTitle("🎮 Rejoins le serveur !")
      .setThumbnail(CONFIG.LOGO_URL)
      .setDescription("Lance Minecraft et connecte-toi ! Compatible Java & Bedrock ⚔️")
      .addFields(
        { name: "📡 Adresse IP", value: `\`\`\`${CONFIG.MC_IP}\`\`\``, inline: false },
        { name: "🔌 Port",       value: `\`\`\`${CONFIG.MC_PORT}\`\`\``, inline: false },
        { name: "📦 Version",    value: "`1.20.1`", inline: true },
        { name: "🌍 Mode",       value: "`Survie Crossplay`", inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL })
      .setTimestamp();
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
    const createdAt     = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`;
    const verif = ["Aucune", "Faible", "Moyenne", "Élevée", "Très élevée"][guild.verificationLevel] ?? "Inconnue";

    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_CYAN)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) || CONFIG.LOGO_URL })
      .setTitle("🌐 Informations du serveur")
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || CONFIG.LOGO_URL)
      .addFields(
        { name: "👑 Propriétaire",  value: owner.toString(),                                       inline: true },
        { name: "📅 Créé le",       value: createdAt,                                              inline: true },
        { name: "🆔 ID",            value: `\`${guild.id}\``,                                      inline: true },
        { name: "👥 Membres",       value: `👤 ${humanCount} humains\n🤖 ${botCount} bots`,        inline: true },
        { name: "💬 Salons",        value: `📝 ${textChannels} texte\n🔊 ${voiceChannels} vocal`,  inline: true },
        { name: "🎭 Rôles",         value: `${totalRoles} rôles`,                                  inline: true },
        { name: "🚀 Boosts",        value: `${boosts} boost(s) — Niveau ${boostLevel}`,            inline: true },
        { name: "🔒 Vérification",  value: verif,                                                  inline: true },
        { name: "🎮 Serveur MC",    value: `\`${CONFIG.MC_IP}:${CONFIG.MC_PORT}\``,                inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL })
      .setTimestamp();

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
      .setTitle("🏅 Ton profil Soulakri")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
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
      .setTitle(`⭐ Niveau de ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
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
      : ["*Aucun joueur dans le classement pour l'instant.*"];

    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setAuthor({ name: "Soulakri — Classement XP", iconURL: CONFIG.LOGO_URL })
      .setTitle("🏆 Top 10 joueurs")
      .setThumbnail(CONFIG.LOGO_URL)
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
      if (!uuidRes.ok) return interaction.editReply({ content: `❌ Joueur **${pseudo}** introuvable. Vérifie le pseudo.` });
      const { id: uuid, name } = await uuidRes.json();

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN)
        .setAuthor({ name: `Stats de ${name}`, iconURL: `https://mc-heads.net/avatar/${uuid}/32` })
        .setTitle(`📊 ${name}`)
        .setThumbnail(`https://mc-heads.net/avatar/${uuid}/64`)
        .setImage(`https://mc-heads.net/body/${uuid}/128`)
        .addFields(
          { name: "🎮 Pseudo", value: `\`${name}\``, inline: true },
          { name: "🔑 UUID",   value: `\`${uuid.substring(0, 8)}...\``, inline: true },
          { name: "🌐 NameMC", value: `[Voir le profil](https://namemc.com/profile/${uuid})`, inline: true },
        )
        .setDescription("*Les statistiques de jeu seront disponibles une fois le serveur MC configuré.*")
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Voir sur NameMC").setURL(`https://namemc.com/profile/${uuid}`).setStyle(ButtonStyle.Link),
      );

      return interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error("Erreur /stats :", err);
      return interaction.editReply({ content: "❌ Impossible de récupérer les stats. Réessaie plus tard." });
    }
  }

  // /blague
  if (interaction.commandName === "blague") {
    const b = blagues[Math.floor(Math.random() * blagues.length)];
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_ORANGE)
      .setTitle("😂 Blague aléatoire")
      .setThumbnail(CONFIG.LOGO_URL)
      .addFields(
        { name: "❓ Question", value: b.joke, inline: false },
        { name: "💡 Réponse", value: b.answer, inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary),
    );
    return interaction.reply({ embeds: [embed], components: [row] });
  }

  // /soules — Phoenix flash
  if (interaction.commandName === "soules") {
    const gif = PHOENIX_GIFS[Math.floor(Math.random() * PHOENIX_GIFS.length)];
    const phrase = PHOENIX_PHRASES[Math.floor(Math.random() * PHOENIX_PHRASES.length)];

    const embed = new EmbedBuilder()
      .setColor(0xFF6600)
      .setAuthor({ name: "Phoenix — Valorant", iconURL: CONFIG.LOGO_URL })
      .setTitle(`🔥 ${phrase}`)
      .setDescription(
        `${interaction.user.toString()} invoque **Phoenix** qui balance une **flash** ! 🌟\n` +
        `*Tout le monde est aveugle... Run it back !*`
      )
      .setImage(gif)
      .setFooter({ text: CONFIG.FOOTER + " • Valorant x Soulakri", iconURL: CONFIG.LOGO_URL })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // /ban
  if (interaction.commandName === "ban") {
    const target = interaction.options.getMember("membre");
    const raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: "❌ Je ne peux pas bannir ce membre.", ephemeral: true });
    try {
      await target.ban({ reason: raison });
      const embed = new EmbedBuilder().setColor(CONFIG.COLOR_RED).setTitle("🔨 Membre banni")
        .addFields({ name: "👤 Membre", value: `${target.user.tag}`, inline: true }, { name: "👮 Mod", value: `${interaction.user.tag}`, inline: true }, { name: "📝 Raison", value: raison, inline: false })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, { title: "🔨 Ban", description: `**${target.user.tag}** banni par **${interaction.user.tag}**`, color: CONFIG.COLOR_RED, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du ban.", ephemeral: true }); }
    return;
  }

  // /kick
  if (interaction.commandName === "kick") {
    const target = interaction.options.getMember("membre");
    const raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (!target.kickable) return interaction.reply({ content: "❌ Je ne peux pas expulser ce membre.", ephemeral: true });
    try {
      await target.kick(raison);
      const embed = new EmbedBuilder().setColor(CONFIG.COLOR_ORANGE).setTitle("👢 Membre expulsé")
        .addFields({ name: "👤 Membre", value: `${target.user.tag}`, inline: true }, { name: "👮 Mod", value: `${interaction.user.tag}`, inline: true }, { name: "📝 Raison", value: raison, inline: false })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, { title: "👢 Kick", description: `**${target.user.tag}** expulsé par **${interaction.user.tag}**`, color: CONFIG.COLOR_ORANGE, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du kick.", ephemeral: true }); }
    return;
  }

  // /mute
  if (interaction.commandName === "mute") {
    const target = interaction.options.getMember("membre");
    const minutes = interaction.options.getInteger("minutes");
    const raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (minutes < 1 || minutes > 40320) return interaction.reply({ content: "❌ Durée invalide (1 à 40320 minutes).", ephemeral: true });
    try {
      await target.timeout(minutes * 60 * 1000, raison);
      const embed = new EmbedBuilder().setColor(CONFIG.COLOR_PURPLE).setTitle("🔇 Membre mis en sourdine")
        .addFields({ name: "👤 Membre", value: `${target.user.tag}`, inline: true }, { name: "👮 Mod", value: `${interaction.user.tag}`, inline: true }, { name: "⏱️ Durée", value: `${minutes} minute(s)`, inline: true }, { name: "📝 Raison", value: raison, inline: false })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, { title: "🔇 Mute", description: `**${target.user.tag}** mute ${minutes}min par **${interaction.user.tag}**`, color: CONFIG.COLOR_PURPLE, fields: [{ name: "Raison", value: raison }] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du mute.", ephemeral: true }); }
    return;
  }

  // /unmute
  if (interaction.commandName === "unmute") {
    const target = interaction.options.getMember("membre");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    try {
      await target.timeout(null);
      const embed = new EmbedBuilder().setColor(CONFIG.COLOR_GREEN).setTitle("🔊 Mute retiré")
        .addFields({ name: "👤 Membre", value: `${target.user.tag}`, inline: true }, { name: "👮 Mod", value: `${interaction.user.tag}`, inline: true })
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch { return interaction.reply({ content: "❌ Erreur lors du unmute.", ephemeral: true }); }
    return;
  }

  // /reglement
  if (interaction.commandName === "reglement") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setAuthor({ name: "Soulakri — Règlement officiel", iconURL: CONFIG.LOGO_URL })
      .setTitle("📜 Règlement du serveur Soulakri")
      .setThumbnail(CONFIG.LOGO_URL)
      .setDescription("Bienvenue sur **Soulakri** ! Lis attentivement les règles avant de rejoindre la communauté.")
      .addFields(
        { name: "1️⃣ Respect",         value: "Respecte tous les joueurs. Insultes, harcèlement et discriminations sont interdits.", inline: false },
        { name: "2️⃣ No Cheat",         value: "Tout hack, cheat ou exploit est interdit et entraîne un ban immédiat.", inline: false },
        { name: "3️⃣ No Grief",         value: "Détruire les constructions des autres joueurs est strictement interdit.", inline: false },
        { name: "4️⃣ Langage",          value: "Pas de spam, flood ni langage inapproprié dans les salons.", inline: false },
        { name: "5️⃣ Pub interdite",    value: "Toute publicité pour d'autres serveurs ou Discord est interdite.", inline: false },
        { name: "6️⃣ Obéir aux admins", value: "Les décisions des administrateurs et modérateurs sont finales.", inline: false },
        { name: "7️⃣ Bonne ambiance",   value: "Soulakri est un serveur fun et familial. Profite et fais profiter les autres ! 🎮", inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER + " • En cliquant J'accepte, tu t'engages à respecter ces règles.", iconURL: CONFIG.LOGO_URL })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("accept_rules").setLabel("✅  J'accepte le règlement").setStyle(ButtonStyle.Success),
    );

    const channel = interaction.guild.channels.cache.get(CONFIG.CHANNEL_REGLEMENT);
    if (!channel) return interaction.reply({ content: "❌ Salon règlement introuvable.", ephemeral: true });
    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `✅ Règlement posté dans <#${CONFIG.CHANNEL_REGLEMENT}> !`, ephemeral: true });
  }

  // /ticket
  if (interaction.commandName === "ticket") {
    try {
      const guild = interaction.guild;
      const member = interaction.member;
      const ticketName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      const existing = guild.channels.cache.find(c => c.name === ticketName);
      if (existing) return interaction.reply({ content: `❌ Tu as déjà un ticket ouvert : ${existing.toString()}`, ephemeral: true });

      const category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("support"));
      const adminRole = guild.roles.cache.get(CONFIG.ROLE_ADMIN);
      const modRole = guild.roles.cache.get(CONFIG.ROLE_MOD);

      const overwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ];
      if (adminRole) overwrites.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (modRole) overwrites.push({ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

      const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        permissionOverwrites: overwrites,
        topic: `Ticket de support pour ${member.user.tag}`,
      });

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_BLUE)
        .setAuthor({ name: "Support Soulakri", iconURL: CONFIG.LOGO_URL })
        .setTitle("🎫 Ticket de support")
        .setDescription(`Bonjour **${member.user.username}** ! 👋\nUn modérateur va te répondre dès que possible.\n\n**Explique ton problème en détail ci-dessous.**`)
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger),
      );

      const ping = `${member.toString()}${adminRole ? " " + adminRole.toString() : ""}`;
      await ticketChannel.send({ content: ping, embeds: [embed], components: [row] });
      return interaction.reply({ content: `✅ Ticket créé : ${ticketChannel.toString()}`, ephemeral: true });
    } catch (err) {
      console.error("Erreur /ticket :", err);
      if (!interaction.replied) return interaction.reply({ content: "❌ Impossible de créer le ticket. Vérifie les permissions du bot.", ephemeral: true });
    }
  }
});

// ============================================================
//  CONNEXION
// ============================================================
client.login(TOKEN);
