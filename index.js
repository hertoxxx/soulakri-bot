// ============================================================
//  SOULAKRI BOT — discord.js v14
//  Fichier unique : index.js
// ============================================================
//  CONFIGURATION — modifie uniquement cette section
// ============================================================

const CONFIG = {
  // IDs à récupérer dans Discord (clic droit → Copier l'identifiant)
  // Active le "Mode développeur" dans Paramètres > Avancés > Mode développeur
  GUILD_ID:           "1487136081152577556",          
  CHANNEL_REGLEMENT:  "1487136083627086010",      
  CHANNEL_BIENVENUE:  "1487136083627086009",       
  ROLE_JOUEUR:        "1489335006290776174",           
  ROLE_NON_VERIFIE:   "1489335084568936498",     

  // Infos du serveur Minecraft
  MC_IP:   "soulakri.falix.gg",   
  MC_PORT: "23932",              

  // Style des embeds
  COLOR_BLUE: 0x5DADE2,
  COLOR_GOLD: 0xF4D03F,
  COLOR_RED:  0xE74C3C,
  COLOR_GREEN:0x2ECC71,
  FOOTER:     "Soulakri • Survie & Fun Crossplay",
  THUMBNAIL:  "https://www.noelshack.com/2026-14-4-1775156368-t-l-chargement.png", 
};

// ============================================================
//  IMPORTS & INITIALISATION
// ============================================================

require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType,
  PermissionFlagsBits,
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
//  DÉFINITION DES COMMANDES SLASH
// ============================================================

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche la liste des commandes disponibles"),

  new SlashCommandBuilder()
    .setName("ip")
    .setDescription("Affiche l'adresse IP du serveur Minecraft"),

  new SlashCommandBuilder()
    .setName("grade")
    .setDescription("Affiche ton grade actuel sur le serveur"),

  new SlashCommandBuilder()
    .setName("reglement")
    .setDescription("Poste le règlement avec le bouton d'acceptation (Admin uniquement)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ouvre un ticket support privé"),
];

// ============================================================
//  ENREGISTREMENT DES COMMANDES AU DÉMARRAGE
// ============================================================

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("⏳ Enregistrement des commandes slash...");
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, CONFIG.GUILD_ID),
      { body: commands.map((c) => c.toJSON()) }
    );
    console.log("✅ Commandes slash enregistrées !");
  } catch (error) {
    console.error("❌ Erreur enregistrement commandes :", error);
  }
}

// ============================================================
//  BOT PRÊT
// ============================================================

client.once("ready", async () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  client.user.setActivity("Soulakri 🎮", { type: 0 }); // 0 = "Playing"
  await registerCommands();
});

// ============================================================
//  ACCUEIL DES NOUVEAUX MEMBRES
// ============================================================

client.on("guildMemberAdd", async (member) => {
  try {
    // 1. Donner le rôle Non-vérifié
    const roleNonVerifie = member.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);
    if (roleNonVerifie) await member.roles.add(roleNonVerifie);

    // 2. Envoyer le message d'accueil dans #général
    const channel = member.guild.channels.cache.get(CONFIG.CHANNEL_BIENVENUE);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setTitle("🎉 Nouveau joueur sur Soulakri !")
      .setDescription(
        `Bienvenue **${member.user.username}** sur le serveur Soulakri ! 🌟\n\n` +
        `➡️ Commence par lire le <#${CONFIG.CHANNEL_REGLEMENT}> et clique sur **J'accepte** pour débloquer tous les salons.\n\n` +
        `On est contents de t'avoir parmi nous ! 🎮`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "📜 Règlement", value: `<#${CONFIG.CHANNEL_REGLEMENT}>`, inline: true },
        { name: "🎮 IP Minecraft", value: `\`${CONFIG.MC_IP}\``, inline: true }
      )
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Erreur guildMemberAdd :", err);
  }
});

// ============================================================
//  GESTION DES INTERACTIONS (commandes + boutons)
// ============================================================

client.on("interactionCreate", async (interaction) => {

  // ── BOUTON "J'accepte" ──────────────────────────────────
  if (interaction.isButton() && interaction.customId === "accept_rules") {
    try {
      const member = interaction.member;
      const roleJoueur = interaction.guild.roles.cache.get(CONFIG.ROLE_JOUEUR);
      const roleNonVerifie = interaction.guild.roles.cache.get(CONFIG.ROLE_NON_VERIFIE);

      if (!roleJoueur) {
        return interaction.reply({
          content: "❌ Le rôle Joueur est introuvable. Contacte un admin.",
          ephemeral: true,
        });
      }

      // Vérifie si déjà vérifié
      if (member.roles.cache.has(CONFIG.ROLE_JOUEUR)) {
        return interaction.reply({
          content: "✅ Tu as déjà accepté le règlement !",
          ephemeral: true,
        });
      }

      // Donne le rôle Joueur, retire Non-vérifié
      await member.roles.add(roleJoueur);
      if (roleNonVerifie) await member.roles.remove(roleNonVerifie);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_GREEN)
        .setTitle("✅ Règlement accepté !")
        .setDescription(
          `Bienvenue dans la communauté **Soulakri**, ${member.user.username} ! 🎉\n\n` +
          `Tu as maintenant accès à tous les salons. Bonne aventure ! ⚔️`
        )
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error("Erreur bouton accept_rules :", err);
      await interaction.reply({
        content: "❌ Une erreur s'est produite. Contacte un admin.",
        ephemeral: true,
      });
    }
    return;
  }

  // ── COMMANDES SLASH ────────────────────────────────────
  if (!interaction.isChatInputCommand()) return;

  // /help
  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_BLUE)
      .setTitle("📖 Commandes Soulakri")
      .setThumbnail(CONFIG.THUMBNAIL)
      .setDescription("Voici toutes les commandes disponibles :")
      .addFields(
        { name: "🌐 `/ip`",       value: "Affiche l'IP du serveur Minecraft",    inline: false },
        { name: "🏅 `/grade`",    value: "Affiche ton grade actuel",              inline: false },
        { name: "🎫 `/ticket`",   value: "Ouvre un ticket support privé",         inline: false },
        { name: "📜 `/reglement`",value: "*(Admin)* Poste le règlement",          inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // /ip
  if (interaction.commandName === "ip") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("🎮 Rejoins le serveur Soulakri !")
      .setThumbnail(CONFIG.THUMBNAIL)
      .addFields(
        { name: "📡 Adresse IP",  value: `\`\`\`${CONFIG.MC_IP}\`\`\``,  inline: false },
        { name: "🔌 Port",        value: `\`\`\`${CONFIG.MC_PORT}\`\`\``, inline: false },
        { name: "📦 Version",     value: "`Java & Bedrock 1.20.1`",        inline: false },
      )
      .setDescription("Lance Minecraft et connecte-toi avec l'adresse ci-dessus ! ⚔️")
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // /grade
  if (interaction.commandName === "grade") {
    const member = interaction.member;
    const gradeRoles = ["Admin", "Mod", "Builder", "MVP", "VIP", "Joueur"];

    // Cherche le grade le plus élevé que le membre possède
    let foundGrade = null;
    for (const gradeName of gradeRoles) {
      const role = interaction.guild.roles.cache.find((r) => r.name === gradeName);
      if (role && member.roles.cache.has(role.id)) {
        foundGrade = role;
        break;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(foundGrade ? foundGrade.color || CONFIG.COLOR_BLUE : CONFIG.COLOR_RED)
      .setTitle("🏅 Ton grade Soulakri")
      .setDescription(
        foundGrade
          ? `Tu es **${foundGrade.name}** sur le serveur ! ${foundGrade.toString()}`
          : "Tu n'as aucun grade pour l'instant. Accepte le règlement pour commencer !"
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: CONFIG.FOOTER })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // /reglement (Admin uniquement)
  if (interaction.commandName === "reglement") {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.COLOR_GOLD)
      .setTitle("📜 Règlement du serveur Soulakri")
      .setThumbnail(CONFIG.THUMBNAIL)
      .setDescription(
        "Bienvenue sur **Soulakri** ! Merci de lire attentivement les règles ci-dessous avant de rejoindre la communauté."
      )
      .addFields(
        { name: "1️⃣ Respect",          value: "Respecte tous les joueurs. Les insultes, harcèlements et discriminations sont interdits.", inline: false },
        { name: "2️⃣ No Cheat",          value: "Tout hack, cheat ou exploit est strictement interdit et entraîne un ban immédiat.", inline: false },
        { name: "3️⃣ No Grief",          value: "Il est interdit de détruire les constructions des autres joueurs.", inline: false },
        { name: "4️⃣ Langage",           value: "Pas de spam, de flood ni de langage inapproprié dans les salons.", inline: false },
        { name: "5️⃣ Pub interdite",     value: "Toute publicité pour d'autres serveurs ou Discord est interdite.", inline: false },
        { name: "6️⃣ Obéir aux admins",  value: "Les décisions des administrateurs et modérateurs sont finales.", inline: false },
        { name: "7️⃣ Bonne ambiance",    value: "Soulakri est un serveur fun et familial. Profite du jeu et fais-en profiter les autres ! 🎮", inline: false },
      )
      .setFooter({ text: CONFIG.FOOTER + " • En cliquant J'accepte, tu t'engages à respecter ces règles." })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("accept_rules")
      .setLabel("✅  J'accepte le règlement")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    // Poste dans le salon règlement
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

      // Vérifie si un ticket existe déjà
      const existingChannel = guild.channels.cache.find(
        (c) => c.name === `ticket-${member.user.username.toLowerCase().replace(/\s/g, "-")}`
      );
      if (existingChannel) {
        return interaction.reply({
          content: `❌ Tu as déjà un ticket ouvert : ${existingChannel.toString()}`,
          ephemeral: true,
        });
      }

      // Cherche la catégorie SUPPORT (ou crée le ticket à la racine)
      const category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("support")
      );

      // Crée le salon ticket
      const ticketChannel = await guild.channels.create({
        name: `ticket-${member.user.username.toLowerCase().replace(/\s/g, "-")}`,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone ne voit pas
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: member.id, // Le créateur voit
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
          // Les admins/mods voient aussi (ajoute leurs IDs si besoin)
        ],
      });

      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR_BLUE)
        .setTitle("🎫 Ticket de support")
        .setDescription(
          `Bonjour **${member.user.username}** ! 👋\n\n` +
          `Un modérateur va te répondre rapidement.\n` +
          `Explique ton problème en détail ci-dessous.`
        )
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒  Fermer le ticket")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeButton);

      await ticketChannel.send({ content: `${member.toString()}`, embeds: [embed], components: [row] });

      return interaction.reply({
        content: `✅ Ton ticket a été créé : ${ticketChannel.toString()}`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Erreur /ticket :", err);
      return interaction.reply({
        content: "❌ Impossible de créer le ticket. Vérifie les permissions du bot.",
        ephemeral: true,
      });
    }
  }
});

// ── Fermeture de ticket ─────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== "close_ticket") return;

  try {
    await interaction.reply({ content: "🔒 Fermeture du ticket dans 5 secondes..." });
    setTimeout(async () => {
      await interaction.channel.delete().catch(console.error);
    }, 5000);
  } catch (err) {
    console.error("Erreur close_ticket :", err);
  }
});

// ============================================================
//  CONNEXION DU BOT
// ============================================================

client.login(TOKEN);
