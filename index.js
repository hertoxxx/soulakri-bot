// ============================================================
//  SOULAKRI BOT v2 — discord.js v14
//  Fichier unique : index.js
// ============================================================
//  CONFIGURATION — modifie uniquement cette section
// ============================================================

const CONFIG = {
  GUILD_ID:           "TON_ID_SERVEUR",
  CHANNEL_REGLEMENT:  "ID_SALON_REGLEMENT",
  CHANNEL_BIENVENUE:  "ID_SALON_GENERAL",
  CHANNEL_LOGS:       "ID_SALON_LOGS",
  ROLE_JOUEUR:        "ID_ROLE_JOUEUR",
  ROLE_NON_VERIFIE:   "ID_ROLE_NON_VERIFIE",
  ROLE_ADMIN:         "ID_ROLE_ADMIN",
  ROLE_MOD:           "ID_ROLE_MOD",

  MC_IP:   "play.soulakri.fr",
  MC_PORT: "25565",

  // Couleurs par contexte
  COLOR_BLUE:   0x5DADE2,
  COLOR_GOLD:   0xF4D03F,
  COLOR_RED:    0xE74C3C,
  COLOR_GREEN:  0x2ECC71,
  COLOR_PURPLE: 0x9B59B6,
  COLOR_ORANGE: 0xE67E22,
  COLOR_DARK:   0x2C3E50,

  FOOTER:    "Soulakri • Survie & Fun Crossplay",
  THUMBNAIL: "https://i.imgur.com/REMPLACE_PAR_TON_LOGO.png",

  // XP : nb de points par message (entre MIN et MAX)
  XP_MIN: 15,
  XP_MAX: 40,
  XP_COOLDOWN_MS: 60000, // 1 minute entre chaque gain XP
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
});

const TOKEN = process.env.DISCORD_TOKEN;

// ============================================================
//  BASE DE DONNÉES XP (en mémoire — persist via fichier JSON)
// ============================================================

const fs = require("fs");
const XP_FILE = "./xp_data.json";

function loadXP() {
  if (!fs.existsSync(XP_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(XP_FILE, "utf8")); }
  catch { return {}; }
}

function saveXP(data) {
  fs.writeFileSync(XP_FILE, JSON.stringify(data, null, 2));
}

let xpData = loadXP();
const xpCooldowns = new Map(); // userId → timestamp dernier gain

function getUser(userId) {
  if (!xpData[userId]) xpData[userId] = { xp: 0, level: 1, messages: 0 };
  return xpData[userId];
}

function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function progressBar(current, max, length = 10) {
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
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
//  DÉFINITION DES COMMANDES SLASH
// ============================================================

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche la liste des commandes"),

  new SlashCommandBuilder()
    .setName("ip")
    .setDescription("Affiche l'IP du serveur Minecraft"),

  new SlashCommandBuilder()
    .setName("grade")
    .setDescription("Affiche ton grade et ton niveau XP"),

  new SlashCommandBuilder()
    .setName("niveau")
    .setDescription("Affiche ton niveau XP actuel")
    .addUserOption(o =>
      o.setName("joueur").setDescription("Joueur à inspecter").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("top")
    .setDescription("Classement XP des 10 meilleurs joueurs"),

  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Affiche les stats d'un joueur Minecraft")
    .addStringOption(o =>
      o.setName("pseudo").setDescription("Pseudo Minecraft du joueur").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("blague")
    .setDescription("Affiche une blague aléatoire 😂"),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre (Mod uniquement)")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à bannir").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison du ban").setRequired(false)),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulser un membre (Mod uniquement)")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à expulser").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison du kick").setRequired(false)),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Rendre muet un membre (Mod uniquement)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à mute").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Durée en minutes (max 40320)").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),

  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Retirer le mute d'un membre (Mod uniquement)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à unmute").setRequired(true)),

  new SlashCommandBuilder()
    .setName("reglement")
    .setDescription("Poste le règlement (Admin uniquement)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ouvre un ticket support privé"),
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
    console.log("✅ Commandes slash enregistrées !");
  } catch (err) {
    console.error("❌ Erreur commandes :", err);
  }
}

// ============================================================
//  BOT PRÊT
// ============================================================

client.once("ready", async () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  client.user.setActivity("Soulakri 🎮", { type: 0 });
  await registerCommands();
});

// ============================================================
//  SYSTÈME XP — gain sur chaque message
// ============================================================

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const now = Date.now();
  const lastXP = xpCooldowns.get(userId) || 0;

  if (now - lastXP < CONFIG.XP_COOLDOWN_MS) return;
  xpCooldowns.set(userId, now);

  const amount = Math.floor(Math.random() * (CONFIG.XP_MAX - CONFIG.XP_MIN + 1)) + CONFIG.XP_MIN;
  const { user, leveledUp } = addXP(userId, amount);

  if (leveledUp) {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("🎉 Level Up !")
      .setDescription(`Félicitations ${message.author.toString()} ! Tu passes au **niveau ${user.level}** ! 🚀`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();
    message.channel.send({ embeds: [embed] }).catch(() => {});
  }
});

// ============================================================
//  ACCUEIL DES NOUVEAUX MEMBRES
// ============================================================

client.on("guildMemberAdd", async (member) => {
  try {
    const roleNonVerifie = member.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);
    if (roleNonVerifie) await member.roles.add(roleNonVerifie);

    const channel = member.guild.channels.cache.get(CONFIG.CHANNEL_BIENVENUE);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setTitle("🎉 Nouveau joueur sur Soulakri !")
      .setDescription(
        `Bienvenue **${member.user.username}** sur le serveur ! 🌟\n\n` +
        `➡️ Lis le <#${CONFIG.CHANNEL_REGLEMENT}> et clique **J'accepte** pour débloquer tous les salons.\n\n` +
        `On est ravis de t'avoir parmi nous ! 🎮`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "📜 Règlement", value: `<#${CONFIG.CHANNEL_REGLEMENT}>`, inline: true },
        { name: "🎮 IP Minecraft", value: `\`${CONFIG.MC_IP}\``, inline: true },
        { name: "👥 Membres", value: `${member.guild.memberCount} joueurs`, inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    // Boutons d'accueil
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("show_ip")
        .setLabel("🎮 IP du serveur")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("show_reglement_link")
        .setLabel("📜 Voir le règlement")
        .setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ embeds: [embed], components: [row] });

    // Log
    logAction(member.guild, {
      title: "📥 Nouveau membre",
      description: `**${member.user.tag}** a rejoint le serveur`,
      color: CONFIG.COLOR_GREEN,
      fields: [{ name: "ID", value: member.user.id, inline: true }],
    });

  } catch (err) {
    console.error("Erreur guildMemberAdd :", err);
  }
});

// ============================================================
//  DÉPART D'UN MEMBRE
// ============================================================

client.on("guildMemberRemove", async (member) => {
  logAction(member.guild, {
    title: "📤 Membre parti",
    description: `**${member.user.tag}** a quitté le serveur`,
    color: CONFIG.COLOR_RED,
    fields: [{ name: "ID", value: member.user.id, inline: true }],
  });
});

// ============================================================
//  LOGS HELPER
// ============================================================

async function logAction(guild, { title, description, color, fields = [] }) {
  try {
    const logChannel = guild.channels.cache.get(CONFIG.CHANNEL_LOGS);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .addFields(fields)
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  } catch {}
}

// ============================================================
//  BLAGUES (liste locale)
// ============================================================

const blagues = [
  { joke: "Pourquoi les plongeurs plongent-ils toujours en arrière ?", answer: "Parce que sinon ils tomberaient dans le bateau ! 😂" },
  { joke: "Qu'est-ce qu'un canif ?", answer: "Le petit fils du caniche ! 🐩" },
  { joke: "Pourquoi les vampires sont nuls en informatique ?", answer: "Parce qu'ils ont peur des octets ! 🧛" },
  { joke: "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ?", answer: "Un chat-peint de Noël ! 🎄" },
  { joke: "Qu'est-ce qu'un crocodile qui surveille la cour d'école ?", answer: "Un sac à dents ! 🐊" },
  { joke: "Pourquoi les poissons vivent dans l'eau salée ?", answer: "Parce que le poivre les ferait éternuer ! 🐟" },
  { joke: "Qu'est-ce qu'un homme suspendu au plafond ?", answer: "Luc (l'accroc) ! 😄" },
  { joke: "Quel est le comble pour un électricien ?", answer: "De ne pas être au courant ! ⚡" },
  { joke: "Pourquoi le scarabée n'est pas invité aux fêtes ?", answer: "Parce qu'il est coléoptère ! 🪲" },
  { joke: "Qu'est-ce qu'un Minecraft sans creeper ?", answer: "Une thérapie ! 💚" },
];

// ============================================================
//  INTERACTIONS
// ============================================================

client.on("interactionCreate", async (interaction) => {

  // ── BOUTONS ────────────────────────────────────────────────

  // Bouton J'accepte le règlement
  if (interaction.isButton() && interaction.customId === "accept_rules") {
    try {
      const member = interaction.member;
      const roleJoueur = interaction.guild.roles.cache.get(CONFIG.ROLE_JOUEUR);
      const roleNonVerifie = interaction.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);

      if (!roleJoueur) return interaction.reply({ content: "❌ Rôle Joueur introuvable. Contacte un admin.", ephemeral: true });
      if (member.roles.cache.has(CONFIG.ROLE_JOUEUR)) return interaction.reply({ content: "✅ Tu as déjà accepté le règlement !", ephemeral: true });

      await member.roles.add(roleJoueur);
      if (roleNonVerifie) await member.roles.remove(roleNonVerifie);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN)
        .setTitle("✅ Règlement accepté !")
        .setDescription(`Bienvenue dans la communauté **Soulakri**, ${member.user.username} ! 🎉\nTu as maintenant accès à tous les salons. Bonne aventure ! ⚔️`)
        .addFields(
          { name: "🎮 IP Minecraft", value: `\`${CONFIG.MC_IP}\``, inline: true },
          { name: "💬 Discussion", value: "Rejoins le chat général !", inline: true },
        )
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      logAction(interaction.guild, {
        title: "✅ Règlement accepté",
        description: `**${member.user.tag}** a accepté le règlement`,
        color: CONFIG.COLOR_GREEN,
        fields: [{ name: "ID", value: member.user.id, inline: true }],
      });
    } catch (err) {
      console.error("Erreur accept_rules :", err);
      await interaction.reply({ content: "❌ Erreur. Contacte un admin.", ephemeral: true });
    }
    return;
  }

  // Bouton IP depuis le message de bienvenue
  if (interaction.isButton() && interaction.customId === "show_ip") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("🎮 IP du serveur Soulakri")
      .addFields(
        { name: "📡 Adresse", value: `\`\`\`${CONFIG.MC_IP}\`\`\``, inline: false },
        { name: "🔌 Port", value: `\`\`\`${CONFIG.MC_PORT}\`\`\``, inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Bouton lien règlement
  if (interaction.isButton() && interaction.customId === "show_reglement_link") {
    return interaction.reply({
      content: `📜 Le règlement est ici : <#${CONFIG.CHANNEL_REGLEMENT}>`,
      ephemeral: true,
    });
  }

  // Bouton fermer ticket
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    try {
      await interaction.reply({ content: "🔒 Fermeture du ticket dans 5 secondes..." });
      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
    } catch (err) { console.error("Erreur close_ticket :", err); }
    return;
  }

  // ── COMMANDES SLASH ────────────────────────────────────────
  if (!interaction.isChatInputCommand()) return;

  // /help
  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setTitle("📖 Commandes Soulakri")
      .setDescription("Toutes les commandes disponibles sur le bot :")
      .addFields(
        { name: "─── 🎮 Minecraft ───", value: "\u200b", inline: false },
        { name: "🌐 `/ip`",       value: "Affiche l'IP du serveur MC",         inline: true },
        { name: "📊 `/stats`",    value: "Stats d'un joueur Minecraft",         inline: true },
        { name: "─── 🏅 Profil ───", value: "\u200b", inline: false },
        { name: "🏅 `/grade`",   value: "Ton grade + niveau XP",               inline: true },
        { name: "⭐ `/niveau`",  value: "Niveau XP (toi ou un autre)",          inline: true },
        { name: "🏆 `/top`",     value: "Classement XP du serveur",            inline: true },
        { name: "─── 🎫 Utilitaires ───", value: "\u200b", inline: false },
        { name: "😂 `/blague`",  value: "Une blague aléatoire",                inline: true },
        { name: "🎫 `/ticket`",  value: "Ouvre un ticket support",             inline: true },
        { name: "─── 🔨 Modération ───", value: "\u200b", inline: false },
        { name: "🔨 `/ban`",     value: "*(Mod)* Bannir un membre",            inline: true },
        { name: "👢 `/kick`",    value: "*(Mod)* Expulser un membre",          inline: true },
        { name: "🔇 `/mute`",    value: "*(Mod)* Mettre en sourdine",          inline: true },
        { name: "🔊 `/unmute`",  value: "*(Mod)* Retirer le mute",             inline: true },
        { name: "📜 `/reglement`",value: "*(Admin)* Poster le règlement",      inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("show_ip").setLabel("🎮 IP Serveur").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("close_ticket").setLabel("🎫 Ticket").setStyle(ButtonStyle.Secondary),
    );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // /ip
  if (interaction.commandName === "ip") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("🎮 Rejoins le serveur Soulakri !")
      .setDescription("Lance Minecraft et connecte-toi avec l'adresse ci-dessous ! ⚔️")
      .addFields(
        { name: "📡 Adresse IP",  value: `\`\`\`${CONFIG.MC_IP}\`\`\``,  inline: false },
        { name: "🔌 Port",        value: `\`\`\`${CONFIG.MC_PORT}\`\`\``, inline: false },
        { name: "📦 Version",     value: "`Java & Bedrock 1.20.1`",        inline: true },
        { name: "🌍 Mode",        value: "`Survie Crossplay`",             inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
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

    const embed = new EmbedBuilder()
      .setColor(foundGrade ? (foundGrade.color || CONFIG.COLOR_BLUE) : CONFIG.COLOR_RED)
      .setTitle("🏅 Ton profil Soulakri")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "🎖️ Grade",    value: foundGrade ? foundGrade.toString() : "Aucun grade", inline: true },
        { name: "⭐ Niveau",   value: `**${user.level}**`, inline: true },
        { name: "💬 Messages", value: `${user.messages}`, inline: true },
        { name: `📊 XP — ${user.xp} / ${xpNeeded}`, value: `\`${bar}\``, inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // /niveau
  if (interaction.commandName === "niveau") {
    const target = interaction.options.getUser("joueur") || interaction.user;
    const user = getUser(target.id);
    const xpNeeded = xpForLevel(user.level);
    const bar = progressBar(user.xp, xpNeeded);

    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_PURPLE)
      .setTitle(`⭐ Niveau de ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "⭐ Niveau",   value: `**${user.level}**`, inline: true },
        { name: "✨ XP",       value: `${user.xp} / ${xpNeeded}`, inline: true },
        { name: "💬 Messages", value: `${user.messages}`, inline: true },
        { name: "📊 Progression", value: `\`${bar}\` ${Math.round((user.xp / xpNeeded) * 100)}%`, inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // /top
  if (interaction.commandName === "top") {
    const sorted = Object.entries(xpData)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    const medals = ["🥇", "🥈", "🥉"];
    const lines = sorted.map((u, i) => {
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} <@${u.id}> — Niv. **${u.level}** · ${u.xp} XP`;
    });

    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("🏆 Classement XP — Soulakri")
      .setDescription(lines.length ? lines.join("\n") : "Aucun joueur dans le classement pour l'instant.")
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // /stats
  if (interaction.commandName === "stats") {
    const pseudo = interaction.options.getString("pseudo");
    await interaction.deferReply();

    try {
      // Récupère l'UUID depuis l'API Mojang
      const uuidRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${pseudo}`);
      if (!uuidRes.ok) {
        return interaction.editReply({ content: `❌ Joueur **${pseudo}** introuvable. Vérifie le pseudo.` });
      }
      const { id: uuid, name } = await uuidRes.json();

      // Récupère le skin
      const skinUrl = `https://mc-heads.net/avatar/${uuid}/64`;
      const bodyUrl = `https://mc-heads.net/body/${uuid}/128`;

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN)
        .setTitle(`📊 Stats de ${name}`)
        .setThumbnail(skinUrl)
        .setImage(bodyUrl)
        .addFields(
          { name: "🎮 Pseudo",  value: `\`${name}\``,  inline: true },
          { name: "🔑 UUID",    value: `\`${uuid.substring(0, 8)}...\``, inline: true },
          { name: "🌐 Skin",    value: `[Voir le skin](https://namemc.com/profile/${uuid})`, inline: true },
        )
        .setDescription("*Les statistiques de jeu seront disponibles quand le serveur MC sera configuré.*")
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Voir sur NameMC")
          .setURL(`https://namemc.com/profile/${uuid}`)
          .setStyle(ButtonStyle.Link),
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
      .setTitle("😂 Blague du jour !")
      .addFields(
        { name: "❓ Question", value: b.joke,   inline: false },
        { name: "💡 Réponse",  value: b.answer, inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("another_joke")
        .setLabel("😂 Une autre !")
        .setStyle(ButtonStyle.Primary),
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  // /ban
  if (interaction.commandName === "ban") {
    const target = interaction.options.getMember("membre");
    const raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: "❌ Je ne peux pas bannir ce membre.", ephemeral: true });

    try {
      await target.ban({ reason: raison });
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_RED)
        .setTitle("🔨 Membre banni")
        .addFields(
          { name: "👤 Membre",  value: `${target.user.tag}`, inline: true },
          { name: "👮 Mod",     value: `${interaction.user.tag}`, inline: true },
          { name: "📝 Raison",  value: raison, inline: false },
        )
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, {
        title: "🔨 Ban",
        description: `**${target.user.tag}** a été banni par **${interaction.user.tag}**`,
        color: CONFIG.COLOR_RED,
        fields: [{ name: "Raison", value: raison }],
      });
    } catch (err) {
      return interaction.reply({ content: "❌ Erreur lors du ban.", ephemeral: true });
    }
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
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_ORANGE)
        .setTitle("👢 Membre expulsé")
        .addFields(
          { name: "👤 Membre",  value: `${target.user.tag}`, inline: true },
          { name: "👮 Mod",     value: `${interaction.user.tag}`, inline: true },
          { name: "📝 Raison",  value: raison, inline: false },
        )
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, {
        title: "👢 Kick",
        description: `**${target.user.tag}** a été expulsé par **${interaction.user.tag}**`,
        color: CONFIG.COLOR_ORANGE,
        fields: [{ name: "Raison", value: raison }],
      });
    } catch {
      return interaction.reply({ content: "❌ Erreur lors du kick.", ephemeral: true });
    }
    return;
  }

  // /mute
  if (interaction.commandName === "mute") {
    const target = interaction.options.getMember("membre");
    const minutes = interaction.options.getInteger("minutes");
    const raison = interaction.options.getString("raison") || "Aucune raison fournie";
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });

    try {
      await target.timeout(minutes * 60 * 1000, raison);
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_PURPLE)
        .setTitle("🔇 Membre mis en sourdine")
        .addFields(
          { name: "👤 Membre",  value: `${target.user.tag}`, inline: true },
          { name: "👮 Mod",     value: `${interaction.user.tag}`, inline: true },
          { name: "⏱️ Durée",   value: `${minutes} minute(s)`, inline: true },
          { name: "📝 Raison",  value: raison, inline: false },
        )
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      logAction(interaction.guild, {
        title: "🔇 Mute",
        description: `**${target.user.tag}** a été mute ${minutes} min par **${interaction.user.tag}**`,
        color: CONFIG.COLOR_PURPLE,
        fields: [{ name: "Raison", value: raison }],
      });
    } catch {
      return interaction.reply({ content: "❌ Erreur lors du mute.", ephemeral: true });
    }
    return;
  }

  // /unmute
  if (interaction.commandName === "unmute") {
    const target = interaction.options.getMember("membre");
    if (!target) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });

    try {
      await target.timeout(null);
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN)
        .setTitle("🔊 Mute retiré")
        .addFields(
          { name: "👤 Membre", value: `${target.user.tag}`, inline: true },
          { name: "👮 Mod",    value: `${interaction.user.tag}`, inline: true },
        )
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch {
      return interaction.reply({ content: "❌ Erreur lors du unmute.", ephemeral: true });
    }
    return;
  }

  // /reglement
  if (interaction.commandName === "reglement") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("📜 Règlement du serveur Soulakri")
      .setDescription("Bienvenue sur **Soulakri** ! Lis attentivement les règles avant de rejoindre la communauté.")
      .addFields(
        { name: "1️⃣ Respect",         value: "Respecte tous les joueurs. Insultes, harcèlement et discriminations sont interdits.", inline: false },
        { name: "2️⃣ No Cheat",         value: "Tout hack, cheat ou exploit est interdit et entraîne un ban immédiat.", inline: false },
        { name: "3️⃣ No Grief",         value: "Détruire les constructions des autres joueurs est interdit.", inline: false },
        { name: "4️⃣ Langage",          value: "Pas de spam, flood ni langage inapproprié dans les salons.", inline: false },
        { name: "5️⃣ Pub interdite",    value: "Toute publicité pour d'autres serveurs ou Discord est interdite.", inline: false },
        { name: "6️⃣ Obéir aux admins", value: "Les décisions des administrateurs et modérateurs sont finales.", inline: false },
        { name: "7️⃣ Bonne ambiance",   value: "Soulakri est un serveur fun et familial. Profite et fais profiter les autres ! 🎮", inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER + " • En cliquant J'accepte, tu t'engages à respecter ces règles." })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("accept_rules")
        .setLabel("✅  J'accepte le règlement")
        .setStyle(ButtonStyle.Success),
    );

    const channel = interaction.guild.channels.cache.get(CONFIG.CHANNEL_REGLEMENT);
    if (channel) {
      await channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "✅ Règlement posté !", ephemeral: true });
    } else {
      return interaction.reply({ content: "❌ Salon règlement introuvable.", ephemeral: true });
    }
  }

  // /ticket
  if (interaction.commandName === "ticket") {
    try {
      const guild = interaction.guild;
      const member = interaction.member;
      const ticketName = `ticket-${member.user.username.toLowerCase().replace(/\s/g, "-")}`;

      const existing = guild.channels.cache.find(c => c.name === ticketName);
      if (existing) return interaction.reply({ content: `❌ Tu as déjà un ticket : ${existing.toString()}`, ephemeral: true });

      const category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("support"));
      const adminRole = guild.roles.cache.get(CONFIG.ROLE_ADMIN);
      const modRole = guild.roles.cache.get(CONFIG.ROLE_MOD);

      const overwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ];
      if (adminRole) overwrites.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
      if (modRole) overwrites.push({ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });

      const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        permissionOverwrites: overwrites,
      });

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_BLUE)
        .setTitle("🎫 Ticket de support")
        .setDescription(`Bonjour **${member.user.username}** ! 👋\nUn modérateur va te répondre rapidement.\nExplique ton problème en détail ci-dessous.`)
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger),
      );

      await ticketChannel.send({ content: `${member.toString()} ${adminRole ? adminRole.toString() : ""}`, embeds: [embed], components: [row] });
      return interaction.reply({ content: `✅ Ticket créé : ${ticketChannel.toString()}`, ephemeral: true });

    } catch (err) {
      console.error("Erreur /ticket :", err);
      return interaction.reply({ content: "❌ Impossible de créer le ticket. Vérifie les permissions du bot.", ephemeral: true });
    }
  }
});

// ── Bouton "Une autre blague" ────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== "another_joke") return;
  const b = blagues[Math.floor(Math.random() * blagues.length)];
  const embed = new EmbedBuilder()
    .setColor(CONFIG.COLOR_ORANGE)
    .setTitle("😂 Blague du jour !")
    .addFields(
      { name: "❓ Question", value: b.joke,   inline: false },
      { name: "💡 Réponse",  value: b.answer, inline: false },
    )
    .setFooter({ text: CONFIG.FOOTER })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("another_joke").setLabel("😂 Une autre !").setStyle(ButtonStyle.Primary),
  );

  return interaction.update({ embeds: [embed], components: [row] });
});

// ============================================================
//  CONNEXION
// ============================================================

client.login(TOKEN);
