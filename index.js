// ============================================================
//  SOULAKRI BOT v4 — discord.js v14
// ============================================================

const CONFIG = {
  GUILD_ID:           "1487136081152577556",
  CHANNEL_REGLEMENT:  "1487136083627086010",
  CHANNEL_BIENVENUE:  "1487136083627086009",
  CHANNEL_LOGS:       "1487136083132284951",
  CHANNEL_ROLES:      "1487136083627086011",   // Crée un salon #🎭-choisir-son-rôle
  CHANNEL_MATHS:      "1487136084986040467",   // Crée un salon #🧮-vittel-bot

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

  LOGO_URL: "https://i.imgur.com/igybOpU.png",  // ← ton logo imgur

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

  // Vittel BOT — intervalle entre deux questions (en ms)
  VITTEL_INTERVAL_MS: 5 * 60 * 1000, // toutes les 5 minutes
  VITTEL_TIMEOUT_MS:  60 * 1000,     // 60 secondes pour répondre
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
//  VITTEL BOT — Générateur de questions maths
// ============================================================

let vitelActive = null; // { answer, collector }

function generateMathQuestion() {
  const types = [
    // Calculs simples avec 6 et 7
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
    // Équations avec v, b, s
    () => {
      const vars = ["v", "b", "s"];
      const varName = vars[Math.floor(Math.random() * vars.length)];
      const x = Math.floor(Math.random() * 7) + 1; // solution entre 1 et 7
      const b = [6, 7, 6, 7, 14, 12][Math.floor(Math.random() * 6)];
      const result = x + b;
      return { question: `${varName} + ${b} = ${result}, que vaut ${varName} ?`, answer: String(x) };
    },
    // Multiplication avec v, b, s
    () => {
      const vars = ["v", "b", "s"];
      const varName = vars[Math.floor(Math.random() * vars.length)];
      const factor = [6, 7][Math.floor(Math.random() * 2)];
      const x = Math.floor(Math.random() * 6) + 1;
      const result = x * factor;
      return { question: `${factor}${varName} = ${result}, que vaut ${varName} ?`, answer: String(x) };
    },
    // Inéquation simple avec v, b, s
    () => {
      const vars = ["v", "b", "s"];
      const varName = vars[Math.floor(Math.random() * vars.length)];
      const threshold = [6, 7, 12, 14][Math.floor(Math.random() * 4)];
      const options = [];
      for (let i = 0; i <= threshold + 3; i++) {
        if (i < threshold) options.push(i);
      }
      const correct = options[Math.floor(Math.random() * options.length)] ?? (threshold - 1);
      return {
        question: `${varName} < ${threshold} — quelle valeur est possible pour ${varName} ? (donne un exemple)`,
        answer: null, // réponse multiple, on vérifie dans le handler
        checkFn: (resp) => {
          const n = parseInt(resp);
          return !isNaN(n) && n < threshold && n >= 0;
        },
        hint: `(n'importe quel entier entre 0 et ${threshold - 1})`,
      };
    },
    // Calcul de temps
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
//  GIFs PHOENIX
// ============================================================

const PHOENIX_GIFS = [
  "https://i.imgur.com/FLkhWWO.gif",
];

// ============================================================
//  BLAGUES
// ============================================================

const blagues = [
  { joke: "Pourquoi Creeper est toujours seul ?", answer: "Parce qu'il fait exploser toutes ses relations ! 💥" },
  { joke: "Comment s'appelle un joueur Minecraft qui pleure ?", answer: "Un mineur en larmes ! ⛏️" },
  { joke: "Quel est le sport préféré des Endermen ?", answer: "La téléportation marathon ! 🏃" },
  { joke: "Pourquoi Steve ne sourit jamais ?", answer: "Parce qu'il a perdu ses diamonds dans la lave ! 💎" },
];

// ============================================================
//  COMMANDES SLASH
// ============================================================

const commands = [
  new SlashCommandBuilder().setName("help").setDescription("Affiche toutes les commandes"),
  new SlashCommandBuilder().setName("ip").setDescription("IP du serveur Minecraft"),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Infos du serveur Discord"),
  new SlashCommandBuilder().setName("grade").setDescription("Ton grade et niveau XP"),
  new SlashCommandBuilder()
    .setName("niveau").setDescription("Niveau XP d'un joueur")
    .addUserOption(o => o.setName("joueur").setDescription("Joueur").setRequired(false)),
  new SlashCommandBuilder().setName("top").setDescription("Classement XP Top 10"),
  new SlashCommandBuilder()
    .setName("stats").setDescription("Stats d'un joueur Minecraft")
    .addStringOption(o => o.setName("pseudo").setDescription("Pseudo Minecraft").setRequired(true)),
  new SlashCommandBuilder().setName("blague").setDescription("Blague aléatoire 😂"),
  new SlashCommandBuilder().setName("soules").setDescription("🔥 Phoenix lance une flash !"),
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
  startVittelBot(); // Lance Vittel BOT automatiquement
});

// ============================================================
//  LOGS
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
//  VITTEL BOT — Système de questions automatiques
// ============================================================

function startVittelBot() {
  setInterval(async () => {
    try {
      const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
      if (!guild) return;
      const channel = guild.channels.cache.get(CONFIG.CHANNEL_MATHS);
      if (!channel) return;

      // Si une question est déjà active, on attend
      if (vitelActive) return;

      const q = generateMathQuestion();

      const embed = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setAuthor({ name: "Vittel BOT", iconURL: CONFIG.LOGO_URL })
        .setTitle("🧮 Question mathématique !")
        .setDescription(`**${q.question}**\n\n⏱️ Vous avez **60 secondes** pour répondre !`)
        .setFooter({ text: "Tapez votre réponse directement dans ce salon" })
        .setTimestamp();

      const msg = await channel.send({ embeds: [embed] });

      // Collecteur de réponses
      const filter = m => !m.author.bot;
      const collector = channel.createMessageCollector({ filter, time: CONFIG.VITTEL_TIMEOUT_MS });
      vitelActive = { q, collector };

      collector.on("collect", async (m) => {
        const resp = m.content.trim().toLowerCase().replace(/\s/g, "");

        let correct = false;

        // Vérification selon le type de question
        if (q.checkFn) {
          // Inéquation — vérifie avec la fonction custom
          correct = q.checkFn(resp);
        } else {
          const expected = String(q.answer).toLowerCase().replace(/\s/g, "");
          const alt = q.altAnswer ? String(q.altAnswer).toLowerCase().replace(/\s/g, "") : null;
          correct = resp === expected || (alt && resp === alt);
        }

        if (correct) {
          const winEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setAuthor({ name: "Vittel BOT", iconURL: CONFIG.LOGO_URL })
            .setTitle("✅ Oui, correct !")
            .setDescription(`**${m.author.toString()}** a trouvé la bonne réponse ! 🎉\n\n📌 Réponse : **${q.checkFn ? resp : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}`)
            .setFooter({ text: "Prochaine question dans quelques minutes..." })
            .setTimestamp();
          await channel.send({ embeds: [winEmbed] });
          collector.stop("answered");
        } else {
          // Mauvaise réponse
          const wrongEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setAuthor({ name: "Vittel BOT", iconURL: CONFIG.LOGO_URL })
            .setTitle("❌ Non, c'est faux !")
            .setDescription(`${m.author.toString()}, ta réponse **${m.content}** est incorrecte. Réessaie ! 💪`)
            .setTimestamp();
          await channel.send({ embeds: [wrongEmbed] });
        }
      });

      collector.on("end", async (_, reason) => {
        vitelActive = null;
        if (reason !== "answered") {
          const timeEmbed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setAuthor({ name: "Vittel BOT", iconURL: CONFIG.LOGO_URL })
            .setTitle("⏰ Temps écoulé !")
            .setDescription(`Personne n'a trouvé ! La réponse était : **${q.checkFn ? "voir la question" : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}`)
            .setTimestamp();
          await channel.send({ embeds: [timeEmbed] }).catch(() => {});
        }
      });

    } catch (err) { console.error("Erreur Vittel BOT :", err); }
  }, CONFIG.VITTEL_INTERVAL_MS);
}

// ============================================================
//  XP SYSTÈME
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
//  ACCUEIL — MESSAGE AMÉLIORÉ
// ============================================================

client.on("guildMemberAdd", async (member) => {
  try {
    const roleNV = member.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);
    if (roleNV) await member.roles.add(roleNV);

    const ch = member.guild.channels.cache.get(CONFIG.CHANNEL_BIENVENUE);
    if (!ch) return;

    // Embed principal de bienvenue — style carte complète
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
        {
          name: "📋 Par où commencer ?",
          value:
            `1️⃣ Lis le règlement → <#${CONFIG.CHANNEL_REGLEMENT}>\n` +
            `2️⃣ Choisis tes rôles → <#${CONFIG.CHANNEL_ROLES}>\n` +
            `3️⃣ Lance Minecraft → \`${CONFIG.MC_IP}\``,
          inline: false,
        },
        { name: "👥 Membres", value: `**${member.guild.memberCount}** joueurs`, inline: true },
        { name: "🎮 Version MC", value: "`Java & Bedrock`", inline: true },
        { name: "🌍 Mode", value: "`Survie Crossplay`", inline: true },
      )
      .setImage("https://i.imgur.com/REMPLACE_BANNER.png") // bannière optionnelle
      .setFooter({ text: CONFIG.FOOTER + " • On est ravis de t'accueillir !", iconURL: CONFIG.LOGO_URL })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("show_ip").setLabel("🎮 Voir l'IP").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("show_reglement_link").setLabel("📜 Règlement").setStyle(ButtonStyle.Secondary),
    );

    await ch.send({ content: `> 🎊 Bienvenue ${member.toString()} !`, embeds: [embed], components: [row] });

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

  // ── MENU DÉROULANT (sélecteur de rôles) ──────────────────

  if (interaction.isStringSelectMenu() && interaction.customId === "role_selector") {
    try {
      const member = interaction.member;
      const optionalRoles = [CONFIG.ROLE_BUILDER, CONFIG.ROLE_PVP, CONFIG.ROLE_SURVIE, CONFIG.ROLE_NOTIFS];
      const selected = interaction.values;

      // Retire d'abord tous les rôles optionnels
      for (const roleId of optionalRoles) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role && member.roles.cache.has(roleId)) {
          await member.roles.remove(role).catch(() => {});
        }
      }

      // Ajoute les rôles sélectionnés
      const added = [];
      for (const roleId of selected) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) {
          await member.roles.add(role).catch(() => {});
          added.push(role.name);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_CYAN)
        .setTitle("✅ Rôles mis à jour !")
        .setDescription(
          added.length
            ? `Tu as maintenant les rôles : ${added.map(r => `**${r}**`).join(", ")} !`
            : "Tous tes rôles optionnels ont été retirés."
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error("Erreur role_selector :", err);
      if (!interaction.replied) await interaction.reply({ content: "❌ Erreur. Contacte un admin.", ephemeral: true });
    }
    return;
  }

  // ── BOUTONS ───────────────────────────────────────────────

  if (interaction.isButton()) {

    // Accepter le règlement
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
          .setColor(CONFIG.COLOR_GREEN)
          .setAuthor({ name: "Soulakri", iconURL: CONFIG.LOGO_URL })
          .setTitle("✅ Bienvenue dans la communauté !")
          .setDescription(
            `**${member.user.username}**, tu fais maintenant partie de **Soulakri** ! 🎉\n\n` +
            `Tu as accès à tous les salons. Voici tes prochaines étapes :`
          )
          .addFields(
            { name: "🎭 Étape suivante", value: `Choisis tes rôles dans <#${CONFIG.CHANNEL_ROLES}>`, inline: false },
            { name: "🎮 Rejoins le MC", value: `\`${CONFIG.MC_IP}:${CONFIG.MC_PORT}\``, inline: false },
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
        .setColor(CONFIG.COLOR_GOLD).setTitle("🎮 IP du serveur Soulakri").setThumbnail(CONFIG.LOGO_URL)
        .addFields(
          { name: "📡 Adresse", value: `\`\`\`${CONFIG.MC_IP}\`\`\``, inline: false },
          { name: "🔌 Port", value: `\`\`\`${CONFIG.MC_PORT}\`\`\``, inline: false },
        )
        .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === "show_reglement_link") {
      return interaction.reply({ content: `📜 Le règlement est ici : <#${CONFIG.CHANNEL_REGLEMENT}>`, ephemeral: true });
    }

    if (interaction.customId === "close_ticket") {
      await interaction.reply({ content: "🔒 Fermeture dans 5 secondes..." });
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
        { name: "`/ip`",         value: "IP du serveur MC",             inline: true },
        { name: "`/stats`",      value: "Stats d'un joueur MC",          inline: true },
        { name: "── 🌐 Serveur ──", value: "\u200b" },
        { name: "`/serverinfo`", value: "Infos du serveur Discord",      inline: true },
        { name: "── 🏅 Profil ──", value: "\u200b" },
        { name: "`/grade`",      value: "Ton grade + XP",               inline: true },
        { name: "`/niveau`",     value: "Niveau XP (toi ou autre)",      inline: true },
        { name: "`/top`",        value: "Classement XP Top 10",          inline: true },
        { name: "── 🎲 Fun ──", value: "\u200b" },
        { name: "`/blague`",     value: "Blague aléatoire 😂",           inline: true },
        { name: "`/soules`",     value: "🔥 Phoenix flash !",            inline: true },
        { name: "── 🎫 Support ──", value: "\u200b" },
        { name: "`/ticket`",     value: "Ouvre un ticket support",       inline: true },
        { name: "── 🔨 Modération ──", value: "\u200b" },
        { name: "`/ban`",        value: "*(Mod)* Bannir",                inline: true },
        { name: "`/kick`",       value: "*(Mod)* Expulser",              inline: true },
        { name: "`/mute`",       value: "*(Mod)* Mute temporaire",       inline: true },
        { name: "`/unmute`",     value: "*(Mod)* Retirer mute",          inline: true },
        { name: "`/reglement`",  value: "*(Admin)* Poster le règlement", inline: true },
        { name: "`/roles`",      value: "*(Admin)* Poster le sélecteur de rôles", inline: true },
        { name: "`/vittel`",     value: "*(Admin)* Lancer Vittel BOT",   inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL }).setTimestamp();
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
      .setTitle("🌐 Informations du serveur")
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || CONFIG.LOGO_URL)
      .addFields(
        { name: "👑 Propriétaire",  value: owner.toString(), inline: true },
        { name: "📅 Créé le",       value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "🆔 ID",            value: `\`${guild.id}\``, inline: true },
        { name: "👥 Membres",       value: `👤 ${humanCount} humains\n🤖 ${botCount} bots`, inline: true },
        { name: "💬 Salons",        value: `📝 ${textChannels} texte\n🔊 ${voiceChannels} vocal`, inline: true },
        { name: "🎭 Rôles",         value: `${totalRoles} rôles`, inline: true },
        { name: "🚀 Boosts",        value: `${boosts} boost(s) — Niveau ${boostLevel}`, inline: true },
        { name: "🔒 Vérification",  value: verif, inline: true },
        { name: "🎮 Serveur MC",    value: `\`${CONFIG.MC_IP}:${CONFIG.MC_PORT}\``, inline: true },
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
        .setTitle(`📊 ${name}`)
        .setThumbnail(`https://mc-heads.net/avatar/${uuid}/64`)
        .setImage(`https://mc-heads.net/body/${uuid}/128`)
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
    const gif = PHOENIX_GIFS[Math.floor(Math.random() * PHOENIX_GIFS.length)];
    const phrase = PHOENIX_PHRASES[Math.floor(Math.random() * PHOENIX_PHRASES.length)];
    const embed = new EmbedBuilder()
      .setColor(0xFF6600)
      .setTitle(`🔥 ${phrase}`)
      .setDescription(`${interaction.user.toString()} balance une **flash** ! 🌟`)
      .setImage(gif)
      .setFooter({ text: CONFIG.FOOTER, iconURL: CONFIG.LOGO_URL })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // /reglement — Embed règlement amélioré
  if (interaction.commandName === "reglement") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setAuthor({ name: "Soulakri — Règlement officiel", iconURL: CONFIG.LOGO_URL })
      .setTitle("📜 Règlement du serveur Soulakri")
      .setThumbnail(CONFIG.LOGO_URL)
      .setDescription(
        "Bienvenue sur **Soulakri** ! 🎮\nPour accéder au serveur, tu dois lire et accepter les règles ci-dessous.\n" +
        "En cliquant **✅ J'accepte**, tu t'engages à les respecter.\n\u200b"
      )
      .addFields(
        { name: "1️⃣ Respect mutuel",     value: "Respecte tous les joueurs. Insultes, harcèlement et discriminations entraînent un ban immédiat.", inline: false },
        { name: "2️⃣ Anti-cheat",          value: "Tout hack, client modifié ou exploit est strictement interdit. Tolérance zéro.", inline: false },
        { name: "3️⃣ Anti-grief",          value: "Détruire, voler ou modifier les constructions d'autrui est interdit.", inline: false },
        { name: "4️⃣ Langage correct",     value: "Pas de spam, flood, caps excessif ni langage inapproprié dans les salons.", inline: false },
        { name: "5️⃣ Pas de pub",          value: "Toute publicité pour un autre serveur Discord ou MC est interdite.", inline: false },
        { name: "6️⃣ Respect des admins",  value: "Les décisions des modérateurs et administrateurs sont définitives.", inline: false },
        { name: "7️⃣ Fair-play",           value: "Soulakri est un serveur fun et familial. Joue dans l'esprit de la communauté ! 🌟", inline: false },
        { name: "\u200b", value: "✅ **Si tu acceptes ces règles, clique sur le bouton ci-dessous.**" },
      )
      .setFooter({ text: CONFIG.FOOTER + " • Règlement version 1.0", iconURL: CONFIG.LOGO_URL })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("accept_rules").setLabel("✅  J'accepte le règlement").setStyle(ButtonStyle.Success),
    );

    const channel = interaction.guild.channels.cache.get(CONFIG.CHANNEL_REGLEMENT);
    if (!channel) return interaction.reply({ content: "❌ Salon règlement introuvable.", ephemeral: true });
    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `✅ Règlement posté dans <#${CONFIG.CHANNEL_REGLEMENT}> !`, ephemeral: true });
  }

  // /roles — Sélecteur de rôles interactif
  if (interaction.commandName === "roles") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_PURPLE)
      .setAuthor({ name: "Soulakri — Choisir ses rôles", iconURL: CONFIG.LOGO_URL })
      .setTitle("🎭 Choisir ses rôles")
      .setThumbnail(CONFIG.LOGO_URL)
      .setDescription(
        "Sélectionne les rôles qui te correspondent dans le menu ci-dessous.\n" +
        "Tu peux en choisir **plusieurs à la fois** — et changer à tout moment !\n\u200b"
      )
      .addFields(
        { name: "🔨 Builder",       value: "Tu aimes construire et créer de belles choses", inline: true },
        { name: "⚔️ PvP",           value: "Tu adores les combats et duels", inline: true },
        { name: "🌲 Survie",        value: "Tu es un joueur survie pur et dur", inline: true },
        { name: "🔔 Notifications", value: "Reçois les annonces importantes du serveur", inline: true },
      )
      .setFooter({ text: CONFIG.FOOTER + " • Tu peux modifier tes rôles à tout moment", iconURL: CONFIG.LOGO_URL });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("role_selector")
      .setPlaceholder("Sélectionne tes rôles...")
      .setMinValues(0)
      .setMaxValues(4)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("🔨 Builder")
          .setDescription("Tu aimes construire")
          .setValue(CONFIG.ROLE_BUILDER)
          .setEmoji("🔨"),
        new StringSelectMenuOptionBuilder()
          .setLabel("⚔️ PvP")
          .setDescription("Tu adores les combats")
          .setValue(CONFIG.ROLE_PVP)
          .setEmoji("⚔️"),
        new StringSelectMenuOptionBuilder()
          .setLabel("🌲 Survie")
          .setDescription("Joueur survie pur")
          .setValue(CONFIG.ROLE_SURVIE)
          .setEmoji("🌲"),
        new StringSelectMenuOptionBuilder()
          .setLabel("🔔 Notifications")
          .setDescription("Recevoir les annonces")
          .setValue(CONFIG.ROLE_NOTIFS)
          .setEmoji("🔔"),
      );

    const row = new ActionRowBuilder().addComponents(menu);
    const channel = interaction.guild.channels.cache.get(CONFIG.CHANNEL_ROLES);
    if (!channel) return interaction.reply({ content: "❌ Salon rôles introuvable. Vérifie CHANNEL_ROLES dans le CONFIG.", ephemeral: true });
    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `✅ Sélecteur de rôles posté dans <#${CONFIG.CHANNEL_ROLES}> !`, ephemeral: true });
  }

  // /vittel — Déclencher une question manuellement
  if (interaction.commandName === "vittel") {
    const channel = interaction.guild.channels.cache.get(CONFIG.CHANNEL_MATHS);
    if (!channel) return interaction.reply({ content: "❌ Salon maths introuvable. Vérifie CHANNEL_MATHS dans le CONFIG.", ephemeral: true });
    if (vitelActive) return interaction.reply({ content: "⚠️ Une question est déjà en cours !", ephemeral: true });

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
          .setDescription(`**${m.author.toString()}** a trouvé ! 🎉\n📌 Réponse : **${q.checkFn ? resp : q.answer}**${q.hint ? `\n💡 ${q.hint}` : ""}`)
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

    return interaction.reply({ content: `✅ Question Vittel BOT lancée dans <#${CONFIG.CHANNEL_MATHS}> !`, ephemeral: true });
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
      const modRole = guild.roles.cache.get(CONFIG.ROLE_MOD);
      const overwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ];
      if (adminRole) overwrites.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      if (modRole) overwrites.push({ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
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
    const target = interaction.options.getMember("membre");
    const minutes = interaction.options.getInteger("minutes");
    const raison = interaction.options.getString("raison") || "Aucune raison fournie";
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
