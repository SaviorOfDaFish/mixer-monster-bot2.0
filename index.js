require("dotenv").config();
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  AttachmentBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DATA_DIRECTORY = fs.existsSync("/data") ? "/data" : __dirname;
const DATA_FILE = path.join(DATA_DIRECTORY, "data.json");

console.log(`Monster Hunt data file: ${DATA_FILE}`);
const HUNT_COOLDOWN = 2 * 60 * 60 * 1000;
const SHINY_CHANCE = 5;
const MAX_CAPTURE_CHANCE = 95;
const ULTRA_HUNT_COOLDOWN = 5 * 60 * 1000;
const ULTRA_RELIC_DROP_CHANCE = 25;
const ULTRA_CATCHER_REWARD = 50;
const ULTRA_PARTICIPANT_REWARD = 25;
const ULTRA_ESCAPE_REWARD = 10;
const ULTRA_RANDOM_EVENTS_PER_WEEK = 3;
const ULTRA_SUMMON_DELAY = 5 * 60 * 1000;

const CAPTURE_ITEMS = {
  berry: {
    name: "🍓 Hunter Berry",
    bonus: 10,
    aliases: ["berry", "hunter berry"]
  },
  honey: {
    name: "🍯 Sticky Honey",
    bonus: 20,
    aliases: ["honey", "sticky honey"]
  },
  net: {
    name: "🕸️ Enchanted Net",
    bonus: 30,
    aliases: ["net", "enchanted net"]
  },
  masterCharm: {
    name: "🌟 Master Charm",
    bonus: 100,
    guaranteed: true,
    aliases: ["master", "master charm", "charm"]
  }
};

const MONSTER_NOTIFY_ROLE = "1531471045805084743";
const MONSTER_CHANNEL_ID = "1508543158521168093";

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify({ players: {}, pendingTrades: {}, ultraRareState: null, worldProgress: {}, ultraWeeklySchedule: null }, null, 2)
  );
}

const monsters = [
  // 🌲 FOREST
  { name: "Bramble Creeper", habitat: "Forest", rarity: "Common", points: 1, chance: 85, image: "bramble_creeper.png", description: "A twisted mass of thorn-covered vines that drags itself silently across the forest floor. Its tangled body blends perfectly into thick undergrowth until jagged wooden jaws suddenly snap shut. Many hunters mistake it for an ordinary bush—only once." },
  { name: "Hollow Stalker", habitat: "Forest", rarity: "Common", points: 1, chance: 82, image: "hollow_stalker.png", description: "A walking shell of ancient bark with glowing amber eyes burning deep inside its hollow chest. It wanders forgotten forests searching for lost travelers, leaving eerie wooden footprints that vanish by sunrise." },
  { name: "Rotfang Beast", habitat: "Forest", rarity: "Rare", points: 3, chance: 55, image: "rotfang_beast.png", description: "A savage predator whose body is fused with twisted roots, sharpened bone, and jagged bark. Its terrifying roar causes birds to flee miles before the beast ever appears." },
  { name: "Ancient Thornlord", habitat: "Forest", rarity: "Epic", points: 5, chance: 32, image: "ancient_thornlord.png", description: "A towering guardian born from cursed forests. Massive branches serve as its arms while razor-sharp thorns constantly grow across its body. Entire villages have vanished after disturbing one of these ancient protectors." },
  { name: "Verdant Colossus", habitat: "Forest", rarity: "Legendary", points: 10, chance: 12, image: "verdant_colossus.png", description: "A mountain-sized forest titan said to awaken only when nature itself is threatened. Entire trees grow from its shoulders, and rivers change course beneath its thunderous footsteps." },

  // 🌊 OCEAN
  { name: "Reef Maw", habitat: "Ocean", rarity: "Common", points: 1, chance: 85, image: "reef_maw.png", description: "A living coral predator whose brightly colored shell disguises rows of razor-sharp teeth. Divers often mistake it for a harmless reef formation until the ocean floor suddenly lunges upward." },
  { name: "Inkfiend", habitat: "Ocean", rarity: "Common", points: 1, chance: 82, image: "inkfiend.png", description: "A many-eyed abyssal horror that fills the surrounding waters with magical black ink. Entire schools of fish disappear whenever one drifts through the deep." },
  { name: "Razorclaw Crusher", habitat: "Ocean", rarity: "Rare", points: 3, chance: 55, image: "razorclaw_crusher.png", description: "A hulking crustacean horror with obsidian claws powerful enough to shatter solid stone. Ancient shipwrecks often bear massive claw marks left behind by these relentless monsters." },
  { name: "Abyss Serpent", habitat: "Ocean", rarity: "Epic", points: 5, chance: 32, image: "abyss_serpent.png", description: "A colossal sea serpent whose glowing scales illuminate the deepest trenches. Legends claim its body stretches for miles beneath the waves." },
  { name: "Tidemaw Leviathan", habitat: "Ocean", rarity: "Legendary", points: 10, chance: 12, image: "tidemaw_leviathan.png", description: "A legendary ocean behemoth capable of swallowing entire ships whole. Violent tidal waves are often blamed on nothing more than the creature changing direction beneath the sea." },

  // 🏔️ MOUNTAIN
  { name: "Stone Maw", habitat: "Mountain", rarity: "Common", points: 1, chance: 85, image: "stone_maw.png", description: "A rock-covered ambush predator that remains perfectly motionless until prey wanders within striking distance. By then, escape is rarely possible." },
  { name: "Crystal Burrower", habitat: "Mountain", rarity: "Common", points: 1, chance: 82, image: "crystal_burrower.png", description: "A heavily armored tunneling monster whose crystalline shell slices effortlessly through solid mountains. The tunnels it leaves behind glitter with razor-sharp gemstones." },
  { name: "Cliff Reaper", habitat: "Mountain", rarity: "Rare", points: 3, chance: 55, image: "cliff_reaper.png", description: "A terrifying winged hunter that silently dives from towering cliffs. Victims often hear nothing more than rushing wind before it strikes." },
  { name: "Ironhide Ravager", habitat: "Mountain", rarity: "Epic", points: 5, chance: 32, image: "ironhide_ravager.png", description: "A colossal beast covered in metallic scales harder than forged steel. Even seasoned hunters struggle to leave a scratch upon its armored hide." },
  { name: "Titan of the Peaks", habitat: "Mountain", rarity: "Legendary", points: 10, chance: 12, image: "titan_of_the_peaks.png", description: "A living mountain awakened by forgotten magic. Every step triggers avalanches, while entire cliffs crumble from the sheer weight of its ancient body." },

  // 🌋 VOLCANO
  { name: "Cinderling", habitat: "Volcano", rarity: "Common", points: 1, chance: 85, image: "cinderling.png", description: "A lava-born horror with burning claws and molten cracks glowing across its rocky body. It scurries through volcanic tunnels and swarms anything that disturbs its nest." },
  { name: "Magma Maw", habitat: "Volcano", rarity: "Common", points: 1, chance: 82, image: "magma_maw.png", description: "A molten predator that swims beneath rivers of lava as though they were water. Only its blazing eyes break the fiery surface before it attacks." },
  { name: "Ashfang Brute", habitat: "Volcano", rarity: "Rare", points: 3, chance: 55, image: "ashfang_brute.png", description: "A heavily muscled monster with obsidian tusks and burning horns. Each furious charge scatters molten rock across the battlefield." },
  { name: "Infernal Drake", habitat: "Volcano", rarity: "Epic", points: 5, chance: 32, image: "infernal_drake.png", description: "A volcanic dragon constantly dripping molten lava from its wings. Every beat of those wings fills the sky with burning ash." },
  { name: "World Furnace", habitat: "Volcano", rarity: "Legendary", points: 10, chance: 12, image: "world_furnace.png", description: "A colossal magma titan believed to sleep beneath the world's largest volcanoes. Entire eruptions are thought to be nothing more than the beast turning in its endless slumber." },

  // ❄️ ARCTIC
  { name: "Ice Crawler", habitat: "Arctic", rarity: "Common", points: 1, chance: 85, image: "ice_crawler.png", description: "A six-legged predator perfectly adapted to frozen wastelands. Its icy shell reflects the snow, making it nearly invisible until it lunges." },
  { name: "Frost Wretch", habitat: "Arctic", rarity: "Common", points: 1, chance: 82, image: "frost_wretch.png", description: "A frozen horror whose brittle body constantly sheds razor-sharp shards of enchanted ice. The air around it is painfully cold." },
  { name: "Glacier Horror", habitat: "Arctic", rarity: "Rare", points: 3, chance: 55, image: "glacier_horror.png", description: "A massive beast imprisoned within ancient blue ice. Each movement causes enormous frozen spikes to erupt from the ground." },
  { name: "Blizzard Reaper", habitat: "Arctic", rarity: "Epic", points: 5, chance: 32, image: "blizzard_reaper.png", description: "A towering monster hidden inside endless blizzards. Hunters often realize too late that the storm itself is alive." },
  { name: "The White Tyrant", habitat: "Arctic", rarity: "Legendary", points: 10, chance: 12, image: "the_white_tyrant.png", description: "An ancient ruler of eternal winter whose frozen breath buries entire kingdoms beneath endless snow. Few have seen it and lived to tell the tale." },

  // 🌌 VOID
  { name: "Void Watcher", habitat: "Void", rarity: "Common", points: 1, chance: 85, image: "void_watcher.png", description: "A floating nightmare covered in blinking eyes that never seem to look in the same direction. Staring back for too long fills the mind with unsettling whispers." },
  { name: "Night Skitter", habitat: "Void", rarity: "Common", points: 1, chance: 82, image: "night_skitter.png", description: "A spider-like horror capable of slipping between shadows. Victims often discover its presence only after glowing eyes appear behind them." },
  { name: "Null Reaver", habitat: "Void", rarity: "Rare", points: 3, chance: 55, image: "null_reaver.png", description: "A terrifying predator that consumes light itself. Torches extinguish as it approaches, leaving only endless darkness behind." },
  { name: "Cosmic Wraith", habitat: "Void", rarity: "Epic", points: 5, chance: 32, image: "cosmic_wraith.png", description: "A ghostly entity forged from shattered stars and endless darkness. Its haunting cries echo across the empty void between worlds." },
  { name: "Star Devourer", habitat: "Void", rarity: "Legendary", points: 10, chance: 12, image: "star_devourer.png", description: "A celestial horror of unimaginable size said to consume dying stars. Entire civilizations blame vanished constellations upon its endless hunger." },

  // ☁️ SKY
  { name: "Storm Imp", habitat: "Sky", rarity: "Common", points: 1, chance: 85, image: "storm_imp.png", description: "A crackling elemental born inside thunderclouds. Though smaller than most sky monsters, its wild bolts can scorch entire hunting parties." },
  { name: "Cloud Ripper", habitat: "Sky", rarity: "Common", points: 1, chance: 82, image: "cloud_ripper.png", description: "A winged predator that slices through storm clouds with bladed wings. The skies grow strangely silent before one appears." },
  { name: "Thunder Reaver", habitat: "Sky", rarity: "Rare", points: 3, chance: 55, image: "thunder_reaver.png", description: "A fearsome aerial hunter constantly surrounded by arcs of blue lightning. Every screech rolls across the heavens like thunder." },
  { name: "Tempest Tyrant", habitat: "Sky", rarity: "Epic", points: 5, chance: 32, image: "tempest_tyrant.png", description: "A massive dragon that commands hurricanes with every beat of its wings. Entire fleets have disappeared beneath storms it created." },
  { name: "Storm Sovereign", habitat: "Sky", rarity: "Legendary", points: 10, chance: 12, image: "storm_sovereign.png", description: "The ancient ruler of every storm ever born. It rides towering thunderheads while lightning dances endlessly across its colossal wings." },

  // 🪦 UNDEAD
  { name: "Bone Gnawer", habitat: "Undead", rarity: "Common", points: 1, chance: 85, image: "bone_gnawer.png", description: "A relentless skeletal scavenger that searches forgotten battlefields for fresh bones to add to its ever-growing body." },
  { name: "Grave Whisper", habitat: "Undead", rarity: "Common", points: 1, chance: 82, image: "grave_whisper.png", description: "A wandering spirit that lures unsuspecting travelers toward abandoned graveyards with distant whispers carried on the wind." },
  { name: "Crypt Fiend", habitat: "Undead", rarity: "Rare", points: 3, chance: 55, image: "crypt_fiend.png", description: "A monstrous undead lurking beneath ancient tombs. It waits in absolute silence until intruders disturb its eternal resting place." },
  { name: "Dread Sentinel", habitat: "Undead", rarity: "Epic", points: 5, chance: 32, image: "dread_sentinel.png", description: "A cursed knight bound forever to defend a kingdom that no longer exists. Its rusted armor echoes through forgotten ruins long after midnight." },
  { name: "The Hollow King", habitat: "Undead", rarity: "Legendary", points: 10, chance: 12, image: "the_hollow_king.png", description: "An immortal monarch whose shattered throne commands an endless army of the dead. Though his kingdom has crumbled into dust, his reign is said to continue until the last living soul falls." }
];

const ultraRareMonsters = [
  {
    key: "worldeater",
    name: "🌑 The World Eater",
    rarity: "Ultra Rare",
    image: "the_world_eater.png",
    relicKey: "fragmentOfOblivion",
    relicName: "🌑 Fragment of Oblivion",
    relicCommand: "fragment of oblivion",
    relicDescription: "A piece of reality that should not exist. It absorbs light, warmth, and even sound.",
    catchChance: 5,
    durationMinutes: 30,
    personality: "steadfast",
    spawnText: "Reality trembles as the skies begin to darken...",
    description: "An impossibly ancient creature that exists only to consume worlds. Wherever it travels, stars fade, forests wither, and even magic begins to unravel.",
    secretAchievement: "The End Has Begun",
    titleReward: "Worldbreaker"
  },
  {
    key: "thousandeyes",
    name: "👁️ The Thousand Eyes",
    rarity: "Ultra Rare",
    image: "the_thousand_eyes.png",
    relicKey: "livingEye",
    relicName: "👁️ Living Eye",
    relicCommand: "living eye",
    relicDescription: "An enormous eye that never blinks. No matter where it is placed, it always seems to be watching someone.",
    catchChance: 12,
    durationMinutes: 30,
    personality: "watching",
    spawnText: "You feel as though something is watching from every direction...",
    description: "A nightmare formed from countless living eyes drifting around a massive floating core. It sees every hunt, every secret, and every movement made beneath its endless gaze.",
    secretAchievement: "Nothing Escapes",
    titleReward: "The All-Seeing"
  },
  {
    key: "chronovore",
    name: "⏳ Chronovore",
    rarity: "Ultra Rare",
    image: "chronovore.png",
    relicKey: "distortedHourglass",
    relicName: "⌛ Distorted Hourglass",
    relicCommand: "distorted hourglass",
    relicDescription: "The sand inside flows upward one moment and sideways the next. Looking at it too long makes minutes disappear.",
    catchChance: 10,
    durationMinutes: 30,
    personality: "shifting",
    spawnText: "Time itself begins to twist and fracture...",
    description: "A colossal beast that feeds upon time itself. Flowers bloom and decay in seconds wherever it walks, while ancient ruins become new before crumbling again.",
    secretAchievement: "Master of Time",
    titleReward: "Timewalker"
  },
  {
    key: "astralcolossus",
    name: "🌠 Astral Colossus",
    rarity: "Ultra Rare",
    image: "astral_colossus.png",
    relicKey: "fallenStarCore",
    relicName: "⭐ Fallen Star Core",
    relicCommand: "fallen star core",
    relicDescription: "A glowing fragment of a dead star that hums with cosmic energy.",
    catchChance: 8,
    durationMinutes: 30,
    personality: "generous",
    spawnText: "A brilliant light tears across the sky as meteors begin to fall...",
    description: "A titan forged from shattered stars and drifting constellations. Meteor showers follow in its wake while fragments of distant galaxies orbit its colossal body.",
    secretAchievement: "Among the Stars",
    titleReward: "Starforged"
  },
  {
    key: "harbinger",
    name: "💀 The Harbinger",
    rarity: "Ultra Rare",
    image: "the_harbinger.png",
    relicKey: "soulEmber",
    relicName: "🔥 Soul Ember",
    relicCommand: "soul ember",
    relicDescription: "A tiny blue flame that never burns out. Whispering voices can sometimes be heard within it.",
    catchChance: 15,
    durationMinutes: 30,
    personality: "flee",
    spawnText: "An unnatural silence falls across the world...",
    description: "A mysterious figure wrapped in endless black robes, carrying a lantern filled with wandering souls. Entire kingdoms have vanished shortly after crossing its path.",
    secretAchievement: "Death's Witness",
    titleReward: "Soulkeeper"
  }
];

const RELIC_KEYS = ultraRareMonsters.map(monster => monster.relicKey);

const eventMonsters = [
  { name: "🎆 Firework Dragon", rarity: "Event", points: 12, chance: 20, image: "firework_dragon.png" },
  { name: "🇺🇸 Liberty Mimic", rarity: "Event", points: 8, chance: 35, image: "liberty_mimic.png" },
  { name: "🦅 Star-Spangled Griffon", rarity: "Event", points: 10, chance: 25, image: "star_spangled_griffon.png" }
];

const questPool = [
  { id: "hunt3", text: "Hunt 3 times", goal: 3, reward: 5 },
  { id: "catch2", text: "Catch 2 monsters", goal: 2, reward: 5 },
  { id: "catchRare", text: "Catch 1 Rare monster", goal: 1, reward: 10 },
  { id: "catchEpic", text: "Catch 1 Epic monster", goal: 1, reward: 15 },
  { id: "catchLegendary", text: "Catch 1 Legendary monster", goal: 1, reward: 25 }
];

const achievements = [
  { name: "Novice Hunter", check: p => p.caught.length >= 1 },
  { name: "Monster Collector", check: p => p.caught.length >= 10 },
  { name: "Monster Master", check: p => p.caught.length >= 25 },
  { name: "Rare Collector", check: p => p.caught.filter(m => m.rarity === "Rare").length >= 3 },
  { name: "Epic Tamer", check: p => p.caught.filter(m => m.rarity === "Epic").length >= 2 },
  { name: "Legend Seeker", check: p => p.caught.filter(m => m.rarity === "Legendary").length >= 1 },
  { name: "Shiny Hunter", check: p => p.caught.filter(m => m.shiny).length >= 1 },
  { name: "Event Hunter", check: p => p.caught.filter(m => m.rarity === "Event").length >= 1 },
  { name: "Habitat Explorer", check: p => new Set((p.caught || []).map(m => m.habitat).filter(Boolean)).size >= 8 }
];

const ULTRA_META_ACHIEVEMENTS = {
  allCaught: { achievement: "Masters of the Beyond", title: "Ultra Hunter" },
  allRelics: { achievement: "Relic Master", title: "Relic Keeper" },
  allSummoned: { achievement: "The Summoner", title: "World Summoner" },
  veteran: { achievement: "Veteran Monster Hunter", title: "Legendary Hunter" }
};
function loadData() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  if (!data.players) data.players = {};
  if (!data.pendingTrades) data.pendingTrades = {};
  if (data.ultraRareState === undefined) data.ultraRareState = null;
  if (!data.worldProgress) data.worldProgress = {};
  for (const relicKey of RELIC_KEYS) {
    if (data.worldProgress[relicKey] === undefined) {
      data.worldProgress[relicKey] = false;
    }
  }
  if (data.worldShatterUnlocked === undefined) data.worldShatterUnlocked = false;
  if (data.ultraWeeklySchedule === undefined) data.ultraWeeklySchedule = null;
  if (data.ultraAdminPauseUntil === undefined) data.ultraAdminPauseUntil = 0;

  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getPlayer(data, userId) {
  if (!data.players[userId]) {
    data.players[userId] = {
      points: 0,
      caught: [],
      currentMonster: null,
      lastHunt: 0,
      title: null,
      unlockedTitles: [],
      secretAchievements: [],
      ultraCaughtKeys: [],
      ultraSummonedKeys: [],
      ultraParticipationCount: 0,
      dailyQuests: [],
      dailyClaimed: false,
      lastDaily: null,
      huntCount: 0,
      dailyReward: 0,
      bait: {
        rare: 0,
        epic: 0,
        legendary: 0
      },
      activeBait: null,
      knowledge: {},
      captureItems: {
        berry: 0,
        honey: 0,
        net: 0,
        masterCharm: 0
      },
      relics: {
        abyssalInk: 0,
        ancientDragonScale: 0,
        phoenixFeather: 0,
        frozenCore: 0,
        stormCrystal: 0,
        shadowEssence: 0,
        heartwoodSeed: 0,
        starFeather: 0
      }
    };
  }

  

  const player = data.players[userId];

  if (player.lastHunt === undefined) player.lastHunt = 0;
  if (player.title === undefined) player.title = null;
  if (!Array.isArray(player.unlockedTitles)) player.unlockedTitles = [];
  if (!Array.isArray(player.secretAchievements)) player.secretAchievements = [];
  if (!Array.isArray(player.ultraCaughtKeys)) player.ultraCaughtKeys = [];
  if (!Array.isArray(player.ultraSummonedKeys)) player.ultraSummonedKeys = [];
  if (player.ultraParticipationCount === undefined) player.ultraParticipationCount = 0;
  if (player.dailyQuests === undefined) player.dailyQuests = [];
  if (player.dailyClaimed === undefined) player.dailyClaimed = false;
  if (player.lastDaily === undefined) player.lastDaily = null;
  if (player.huntCount === undefined) player.huntCount = 0;
  if (player.dailyReward === undefined) player.dailyReward = 0;
  if (player.bait === undefined) {
    player.bait = {
      rare: 0,
      epic: 0,
      legendary: 0
    };
  }
  if (player.activeBait === undefined) player.activeBait = null;
  if (player.knowledge === undefined) player.knowledge = {};
  if (player.captureItems === undefined) {
    player.captureItems = {
      berry: 0,
      honey: 0,
      net: 0,
      masterCharm: 0
    };
  }
  if (player.captureItems.berry === undefined) player.captureItems.berry = 0;
  if (player.captureItems.honey === undefined) player.captureItems.honey = 0;
  if (player.captureItems.net === undefined) player.captureItems.net = 0;
  if (player.captureItems.masterCharm === undefined) player.captureItems.masterCharm = 0;
  if (player.relics === undefined) player.relics = {};
  for (const relicKey of RELIC_KEYS) {
    if (player.relics[relicKey] === undefined) player.relics[relicKey] = 0;
  }

  return player;
}


function cleanMonsterName(name) {
  return String(name || "")
    .replace("✨ Shiny ", "")
    .replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/gu, "")
    .trim();
}

function getKnowledgeCount(player, monsterOrName) {
  const name = typeof monsterOrName === "string"
    ? cleanMonsterName(monsterOrName)
    : cleanMonsterName(monsterOrName.name);

  return player.knowledge[name] || 0;
}

function addEncounterKnowledge(player, monster) {
  const name = cleanMonsterName(monster.name);
  player.knowledge[name] = (player.knowledge[name] || 0) + 1;
  return player.knowledge[name];
}

function getKnowledgeBonus(encounters) {
  if (encounters >= 20) return 20;
  if (encounters >= 10) return 15;
  if (encounters >= 5) return 10;
  if (encounters >= 3) return 5;
  return 0;
}

function getKnowledgeRank(encounters) {
  if (encounters >= 20) return "Mastered";
  if (encounters >= 10) return "Expert";
  if (encounters >= 5) return "Experienced";
  if (encounters >= 3) return "Familiar";
  return "Learning";
}

function resolveCaptureItem(input) {
  if (!input) return null;

  const wanted = input.trim().toLowerCase();

  return Object.entries(CAPTURE_ITEMS).find(([, item]) =>
    item.aliases.includes(wanted)
  )?.[0] || null;
}

function calculateCaptureChance(player, monster, itemKey = null) {
  const event = getActiveEvent();
  const encounters = getKnowledgeCount(player, monster);
  const knowledgeBonus = getKnowledgeBonus(encounters);
  const eventBonus = event?.captureBoost ? 10 : 0;
  const item = itemKey ? CAPTURE_ITEMS[itemKey] : null;

  if (item?.guaranteed) {
    return {
      total: 100,
      base: monster.chance,
      knowledgeBonus,
      eventBonus,
      itemBonus: item.bonus,
      guaranteed: true
    };
  }

  const total = Math.min(
    MAX_CAPTURE_CHANCE,
    monster.chance + knowledgeBonus + eventBonus + (item?.bonus || 0)
  );

  return {
    total,
    base: monster.chance,
    knowledgeBonus,
    eventBonus,
    itemBonus: item?.bonus || 0,
    guaranteed: false
  };
}


function buildCaptureChoices(player, monster) {
  const choices = [
    {
      number: 1,
      itemKey: null,
      label: "🎯 Normal Throw",
      chance: calculateCaptureChance(player, monster).total
    }
  ];

  for (const itemKey of ["berry", "honey", "net", "masterCharm"]) {
    if ((player.captureItems[itemKey] || 0) <= 0) continue;

    const item = CAPTURE_ITEMS[itemKey];
    choices.push({
      number: choices.length + 1,
      itemKey,
      label: `${item.name} x${player.captureItems[itemKey]}`,
      chance: calculateCaptureChance(player, monster, itemKey).total
    });
  }

  return choices;
}

function captureChoicesText(choices) {
  return choices
    .map(choice =>
      `${choice.number}️⃣ ${choice.label} — **${choice.chance}%**`
    )
    .join("\n");
}

async function performCaptureAttempt(message, userId, itemKey = null) {
  const data = loadData();
  const player = getPlayer(data, userId);

  if (!player.currentMonster) {
    return message.reply("That monster is no longer available. Use `!hunt` to find another one.");
  }

  if (itemKey && (player.captureItems[itemKey] || 0) <= 0) {
    return message.reply(`You no longer have any ${CAPTURE_ITEMS[itemKey].name}.`);
  }

  const monster = player.currentMonster;
  const chanceInfo = calculateCaptureChance(player, monster, itemKey);
  const roll = Math.floor(Math.random() * 100) + 1;

  if (itemKey) player.captureItems[itemKey]--;

  const caught = chanceInfo.guaranteed || roll <= chanceInfo.total;
  const event = getActiveEvent();

  if (caught) {
    let pointsEarned = monster.points;
    if (event?.doublePoints) pointsEarned *= 2;

    player.points += pointsEarned;
    player.caught.push(monster);
    player.currentMonster = null;
    updateQuestProgress(player, "catch", monster);

    const bonusRewards = giveCatchBonusBait(player, monster);
    saveData(data);

    if (monster.name.includes("Mixer Monster")) {
      await message.channel.send(
        `🌌🎉 **INCREDIBLE! ${message.author} has discovered the legendary MIXER MONSTER!** 🎉🌌`
      );
    }

    return message.reply(
      buildMonsterEmbed(
        monster,
        `✅ You caught ${monster.name}!`,
        `${itemKey ? `**Item Used:** ${CAPTURE_ITEMS[itemKey].name}\n` : "**Method:** Normal Throw\n"}` +
        `**Final Capture Chance:** ${chanceInfo.total}%\n` +
        `**Roll:** ${roll}\n` +
        `**+${pointsEarned} points**` +
        `${bonusRewards.length > 0 ? `\n\n**Bonus Rewards:**\n${bonusRewards.join("\n")}` : ""}`
      )
    );
  }

  player.currentMonster = null;
  saveData(data);

  const encounters = getKnowledgeCount(player, monster);
  const knowledgeBonus = getKnowledgeBonus(encounters);

  return message.reply(
    buildMonsterEmbed(
      monster,
      `❌ ${monster.name} escaped!`,
      `${itemKey ? `**Item Used:** ${CAPTURE_ITEMS[itemKey].name}\n` : "**Method:** Normal Throw\n"}` +
      `**Final Capture Chance:** ${chanceInfo.total}%\n` +
      `**Roll:** ${roll}\n\n` +
      `📚 You learned from the encounter!\n` +
      `**${cleanMonsterName(monster.name)} Knowledge:** ${encounters} encounter${encounters === 1 ? "" : "s"}\n` +
      `**Future Catch Bonus:** +${knowledgeBonus}%`
    )
  );
}

function captureItemInventoryText(player) {
  return (
    `${CAPTURE_ITEMS.berry.name}: **${player.captureItems.berry}** (+10%)\n` +
    `${CAPTURE_ITEMS.honey.name}: **${player.captureItems.honey}** (+20%)\n` +
    `${CAPTURE_ITEMS.net.name}: **${player.captureItems.net}** (+30%)\n` +
    `${CAPTURE_ITEMS.masterCharm.name}: **${player.captureItems.masterCharm}** (guaranteed)`
  );
}

function findImageFile(filename) {
  if (!filename) {
    console.log("IMAGE DEBUG — No filename was provided to findImageFile().");
    return null;
  }

  const searchFolders = [
    __dirname,
    path.join(__dirname, "images"),
    path.join(__dirname, "assets"),
    path.join(__dirname, "assets", "images"),
    path.join(__dirname, "public"),
    path.join(__dirname, "public", "images"),
    path.join(__dirname, "src"),
    path.join(__dirname, "src", "images")
  ];

  const wanted = path.basename(filename).toLowerCase();
  console.log(`IMAGE DEBUG — Looking for filename: ${filename}`);
  console.log(`IMAGE DEBUG — Bot directory: ${__dirname}`);

  for (const folder of searchFolders) {
    console.log(`IMAGE DEBUG — Checking folder: ${folder}`);

    if (!fs.existsSync(folder)) {
      console.log(`IMAGE DEBUG — Folder does not exist: ${folder}`);
      continue;
    }

    const exactPath = path.join(folder, filename);
    console.log(`IMAGE DEBUG — Checking exact path: ${exactPath}`);

    if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) {
      console.log(`IMAGE DEBUG — FOUND exact image: ${exactPath}`);
      return exactPath;
    }

    try {
      const filesInFolder = fs.readdirSync(folder);
      const matchingFile = filesInFolder.find(file =>
        file.toLowerCase() === wanted
      );

      if (matchingFile) {
        const matchedPath = path.join(folder, matchingFile);
        if (fs.statSync(matchedPath).isFile()) {
          console.log(`IMAGE DEBUG — FOUND case-insensitive image: ${matchedPath}`);
          return matchedPath;
        }
      }
    } catch (error) {
      console.error(`IMAGE DEBUG — Could not search folder ${folder}:`, error.message);
    }
  }

  console.log(`IMAGE DEBUG — NOT FOUND: ${filename}`);
  console.log(`IMAGE DEBUG — Checked folders: ${searchFolders.join(", ")}`);
  return null;
}

function getMonsterImage(monster) {
  console.log("IMAGE DEBUG — Monster received:", {
    key: monster?.key || null,
    name: monster?.name || null,
    rarity: monster?.rarity || null,
    image: monster?.image || null
  });

  if (!monster) {
    console.log("IMAGE DEBUG — No monster object was provided.");
    return null;
  }

  const cleanName = cleanMonsterName(monster.name || "");
  const allMonsters = [...monsters, ...eventMonsters, ...ultraRareMonsters];

  const match = allMonsters.find(candidate =>
    candidate.key === monster.key ||
    cleanMonsterName(candidate.name).toLowerCase() === cleanName.toLowerCase()
  );

  console.log("IMAGE DEBUG — Matching stored monster:", match
    ? { key: match.key || null, name: match.name, image: match.image || null }
    : null
  );

  const filename = monster.image || match?.image;

  if (!filename) {
    console.log(`IMAGE DEBUG — No image filename found for ${monster.name || monster.key || "unknown monster"}.`);
    return null;
  }

  return findImageFile(filename);
}

function buildMonsterEmbed(
  monster,
  title,
  description
) {
  const imagePath = getMonsterImage(monster);

  const files = imagePath
    ? [new AttachmentBuilder(imagePath)]
    : [];

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description);

  if (imagePath) {
    embed.setImage(
      `attachment://${path.basename(imagePath)}`
    );
  }

  return {
    embeds: [embed],
    files
  };
}

function dateKey() {
  const now = new Date();
  return `${now.getMonth() + 1}-${now.getDate()}`;
}

function dailySeed() {
  const d = new Date().toDateString();

  return d
    .split("")
    .reduce(
      (sum, char) => sum + char.charCodeAt(0),
      0
    );
}

function getActiveEvent() {
  const today = dateKey();

  if (today === "7-4") {
    return {
      id: "july4",
      name: "🎆 4th of July Event",
      description: "Special event monsters can appear during hunts!",
      eventMonsterChance: 35
    };
  }

  const seed = dailySeed();
  const roll = seed % 100;

  if (roll < 10) return { id: "shinyStorm", name: "✨ Shiny Storm Day", description: "Shiny odds are boosted today!", shinyBoost: true };
  if (roll < 18) return { id: "legendaryRift", name: "🐉 Legendary Rift Day", description: "Legendary monsters are easier to find today!", legendaryBoost: true };
  if (roll < 26) return { id: "doublePoints", name: "💰 Double Points Day", description: "Caught monsters give double points today!", doublePoints: true };
  if (roll < 34) return { id: "forestFrenzy", name: "🌲 Forest Frenzy Day", description: "Forest monsters are much more common today!", habitatBoost: "Forest" };
  if (roll < 42) return { id: "baitBonanza", name: "🪤 Bait Bonanza", description: "All bait rewards are doubled today!", doubleBait: true };
  if (roll < 50) return { id: "treasureDay", name: "💎 Treasure Hunter Day", description: "Treasure drops are three times more likely today!", treasureBoost: true };
  if (roll < 58) return { id: "hunterLuck", name: "🍀 Lucky Hunter Day", description: "All capture chances are increased by 10% today!", captureBoost: true };

  return null;
}

function applyShiny(monster) {
  const event = getActiveEvent();

  const chance = event?.shinyBoost
    ? SHINY_CHANCE * 3
    : SHINY_CHANCE;

  const shinyRoll =
    Math.floor(Math.random() * 100) + 1;

  if (
    monster.rarity !== "Event" &&
    shinyRoll <= chance
  ) {
    monster.shiny = true;
    monster.points += 10;
    monster.name = `✨ Shiny ${monster.name}`;
  } else {
    monster.shiny = false;
  }

  return monster;
}

function getRandomMonster(player) {
  const event = getActiveEvent();

  let monster = null;

  if (
    event?.eventMonsterChance &&
    Math.random() * 100 <
      event.eventMonsterChance
  ) {
    return {
      ...eventMonsters[
        Math.floor(
          Math.random() *
            eventMonsters.length
        )
      ]
    };
  }

  if (
    event?.legendaryBoost &&
    Math.random() < 0.25
  ) {
    const legendaries = monsters.filter(
      m => m.rarity === "Legendary"
    );

    return applyShiny({
      ...legendaries[
        Math.floor(
          Math.random() *
            legendaries.length
        )
      ]
    });
  }

  if (
    event?.habitatBoost &&
    Math.random() < 0.4
  ) {
    const habitatPool = monsters.filter(
      m => m.habitat === event.habitatBoost
    );

    return applyShiny({
      ...habitatPool[
        Math.floor(Math.random() * habitatPool.length)
      ]
    });
  }

  if (
    player?.activeBait === "rare" &&
    Math.random() < 0.5
  ) {
    const rares = monsters.filter(
      m => m.rarity === "Rare"
    );

    monster = {
      ...rares[
        Math.floor(
          Math.random() *
            rares.length
        )
      ]
    };
  } else if (
    player?.activeBait === "epic" &&
    Math.random() < 0.35
  ) {
    const epics = monsters.filter(
      m => m.rarity === "Epic"
    );

    monster = {
      ...epics[
        Math.floor(
          Math.random() *
            epics.length
        )
      ]
    };
  } else if (
    player?.activeBait === "legendary" &&
    Math.random() < 0.25
  ) {
    const legendaries = monsters.filter(
      m => m.rarity === "Legendary"
    );

    monster = {
      ...legendaries[
        Math.floor(
          Math.random() *
            legendaries.length
        )
      ]
    };
  } else {
    monster = {
      ...monsters[
        Math.floor(
          Math.random() *
            monsters.length
        )
      ]
    };
  }

  return applyShiny(monster);
}

function formatTime(ms) {
  const mins = Math.ceil(ms / 60000);

  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;

  return hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;
}

function generateDailyQuests() {
  return [...questPool]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(q => ({
      ...q,
      progress: 0
    }));
}

function getResetDate() {
  const now = new Date();

  const mountainTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/Denver"
    })
  );

  if (mountainTime.getHours() < 5) {
    mountainTime.setDate(
      mountainTime.getDate() - 1
    );
  }

  return mountainTime.toDateString();
}

function resetDaily(player) {
  const today = getResetDate();

  if (player.lastDaily !== today) {
    player.dailyQuests = generateDailyQuests();
    player.dailyClaimed = false;
    player.lastDaily = today;
    player.huntCount = 0;
  }
}
function canClaimDaily() {
  const now = new Date();

  const mountainTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/Denver"
    })
  );

  return mountainTime.getHours() >= 5;
}
function updateQuestProgress(player, type, monster = null) {
  player.dailyQuests.forEach(q => {
    if (type === "hunt" && q.id === "hunt3") q.progress++;
    if (type === "catch" && q.id === "catch2") q.progress++;
    if (type === "catch" && q.id === "catchRare" && monster.rarity === "Rare") q.progress++;
    if (type === "catch" && q.id === "catchEpic" && monster.rarity === "Epic") q.progress++;
    if (type === "catch" && q.id === "catchLegendary" && monster.rarity === "Legendary") q.progress++;

    if (q.progress > q.goal) q.progress = q.goal;
  });
}

function giveRandomDailyReward(player) {
  const roll = Math.floor(Math.random() * 100) + 1;

  if (roll <= 25) {
    player.points += 5;
    return "💰 +5 Points";
  }

  if (roll <= 45) {
    player.points += 10;
    return "💰 +10 Points";
  }

  if (roll <= 55) {
    player.points += 20;
    return "💰 +20 Points";
  }

  if (roll <= 68) {
    player.bait.rare++;
    return "🪤 1 Rare Bait";
  }

  if (roll <= 76) {
    player.bait.epic++;
    return "🪤 1 Epic Bait";
  }

  if (roll <= 80) {
    player.bait.legendary++;
    return "🪤 1 Legendary Bait";
  }

  if (roll <= 90) {
    player.captureItems.berry++;
    return `${CAPTURE_ITEMS.berry.name}`;
  }

  if (roll <= 96) {
    player.captureItems.honey++;
    return `${CAPTURE_ITEMS.honey.name}`;
  }

  if (roll <= 99) {
    player.captureItems.net++;
    return `${CAPTURE_ITEMS.net.name}`;
  }

  player.captureItems.masterCharm++;
  return `${CAPTURE_ITEMS.masterCharm.name}`;
}

function unlockedAchievements(player) {
  return achievements.filter(a => a.check(player)).map(a => a.name);
}

function getAvailableTitles(player) {
  return [...new Set([
    ...unlockedAchievements(player),
    ...(player.unlockedTitles || [])
  ])];
}

function unlockSecretReward(player, achievementName, titleName) {
  const unlocked = [];

  if (!player.secretAchievements.includes(achievementName)) {
    player.secretAchievements.push(achievementName);
  }

  if (!player.unlockedTitles.includes(titleName)) {
    player.unlockedTitles.push(titleName);
    unlocked.push({ achievement: achievementName, title: titleName });
  }

  return unlocked;
}

function evaluateUltraSecretRewards(player) {
  const unlocked = [];

  if (RELIC_KEYS.every(key => (player.relics[key] || 0) > 0)) {
    const reward = ULTRA_META_ACHIEVEMENTS.allRelics;
    unlocked.push(...unlockSecretReward(player, reward.achievement, reward.title));
  }

  if (ultraRareMonsters.every(monster => player.ultraCaughtKeys.includes(monster.key))) {
    const reward = ULTRA_META_ACHIEVEMENTS.allCaught;
    unlocked.push(...unlockSecretReward(player, reward.achievement, reward.title));
  }

  if (ultraRareMonsters.every(monster => player.ultraSummonedKeys.includes(monster.key))) {
    const reward = ULTRA_META_ACHIEVEMENTS.allSummoned;
    unlocked.push(...unlockSecretReward(player, reward.achievement, reward.title));
  }

  if ((player.ultraParticipationCount || 0) >= 100) {
    const reward = ULTRA_META_ACHIEVEMENTS.veteran;
    unlocked.push(...unlockSecretReward(player, reward.achievement, reward.title));
  }

  return unlocked;
}

function formatSecretUnlocks(unlocks) {
  if (!unlocks.length) return "";

  return unlocks.map(unlock =>
    `\n\n🏆 **SECRET ACHIEVEMENT UNLOCKED!**\n` +
    `**${unlock.achievement}**\n` +
    `✨ **New Equipable Title:** **${unlock.title}**\n` +
    `Use \`!title ${unlock.title}\` to equip it.`
  ).join("");
}

function getDexStats(data) {
  const stats = {};

  [...monsters, ...eventMonsters, ...ultraRareMonsters].forEach(m => {
    stats[m.name] = {
      rarity: m.rarity,
      chance: m.chance ?? m.catchChance,
      caught: 0,
      firstCaughtBy: null
    };
  });

  for (const [userId, player] of Object.entries(data.players)) {
    for (const monster of player.caught || []) {
      const cleanName = monster.name.replace("✨ Shiny ", "");
      if (!stats[cleanName]) continue;

      stats[cleanName].caught += 1;

      if (!stats[cleanName].firstCaughtBy) {
        stats[cleanName].firstCaughtBy = userId;
      }
    }
  }

  return stats;
}

function giveCatchBonusBait(player, monster) {
  const rewards = [];
  const event = getActiveEvent();

  if (monster.rarity === "Legendary" || monster.rarity === "Mythic" || monster.rarity === "Secret") {
    const roll = Math.floor(Math.random() * 100) + 1;

    if (roll <= 50) {
      player.bait.rare++;
      rewards.push("🪤 1 Rare Bait");
    }

    if (roll <= 15) {
      player.bait.epic++;
      rewards.push("🪤 1 Epic Bait");
    }

    if (roll <= 5) {
      player.bait.legendary++;
      rewards.push("🪤 1 Legendary Bait");
    }
  }

  



const treasureChance =
  event?.treasureBoost ? 15 : 5;

const treasure =
  Math.floor(Math.random() * 100) + 1;

  if (treasure <= treasureChance) {
    player.bait.rare++;
    rewards.push("🎁 Treasure Drop: 1 Rare Bait");
  }

  if (treasure <= 2) {
    player.bait.epic++;
    rewards.push("🎁 Treasure Drop: 1 Epic Bait");
  }

  if (treasure <= 1) {
    player.bait.legendary++;
    rewards.push("🎁 Treasure Drop: 1 Legendary Bait");
  }


if (event?.doubleBait) {
  const extraRewards = [...rewards];

  extraRewards.forEach(reward => {
    if (reward.includes("Rare Bait")) {
      player.bait.rare++;
      rewards.push("🪤 Bonus Rare Bait");
    }

    if (reward.includes("Epic Bait")) {
      player.bait.epic++;
      rewards.push("🪤 Bonus Epic Bait");
    }

    if (reward.includes("Legendary Bait")) {
      player.bait.legendary++;
      rewards.push("🪤 Bonus Legendary Bait");
    }
  });
}
  const captureItemRoll = Math.floor(Math.random() * 100) + 1;

  if (captureItemRoll <= 12) {
    player.captureItems.berry++;
    rewards.push(CAPTURE_ITEMS.berry.name);
  }

  if (captureItemRoll <= 5) {
    player.captureItems.honey++;
    rewards.push(CAPTURE_ITEMS.honey.name);
  }

  if (captureItemRoll <= 2) {
    player.captureItems.net++;
    rewards.push(CAPTURE_ITEMS.net.name);
  }

  if (captureItemRoll === 1 && ["Legendary", "Mythic", "Secret"].includes(monster.rarity)) {
    player.captureItems.masterCharm++;
    rewards.push(CAPTURE_ITEMS.masterCharm.name);
  }

  return rewards;
}


function getUltraMonster(keyOrName) {
  const wanted = String(keyOrName || "").trim().toLowerCase();
  return ultraRareMonsters.find(monster =>
    monster.key.toLowerCase() === wanted ||
    cleanMonsterName(monster.name).toLowerCase() === wanted ||
    monster.relicCommand.toLowerCase() === wanted ||
    cleanMonsterName(monster.relicName).toLowerCase() === wanted
  ) || null;
}

function getMountainHour() {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    hour12: false
  }).format(new Date()));
}

function isMountainNight() {
  const hour = getMountainHour();
  return hour >= 19 || hour < 7;
}

function ultraRelicInventoryText(player) {
  const owned = ultraRareMonsters
    .filter(monster => (player.relics[monster.relicKey] || 0) > 0)
    .map(monster =>
      `${monster.relicName}: **${player.relics[monster.relicKey]}**\n` +
      `↳ Sacrifice with \`!summon ${monster.relicCommand}\``
    );

  return owned.length > 0
    ? owned.join("\n\n")
    : "You do not currently own any Ultra Rare Relics.";
}

function getUltraStateStatus(state, now = Date.now()) {
  if (!state) return "none";
  if (state.resolved) return "resolved";
  if (now < state.startAt) return "scheduled";
  if (now >= state.endAt) return "expired";
  return "active";
}

function getUltraCatchChance(monster, state, now = Date.now()) {
  if (monster.personality === "weakening") {
    return Math.min(50, monster.catchChance + (state.failedAttempts || 0) * 2);
  }

  if (monster.personality === "shifting") {
    const phases = [5, 10, 15, 20];
    const phase = Math.floor((now - state.startAt) / (5 * 60 * 1000));
    return phases[Math.max(0, phase) % phases.length];
  }

  return monster.catchChance;
}

function getUltraParticipantReward(monster, state) {
  if (monster.personality !== "generous") return ULTRA_PARTICIPANT_REWARD;
  return Math.min(50, ULTRA_PARTICIPANT_REWARD + (state.failedAttempts || 0) * 2);
}

function calculateUltraCaptureChance(monster, state, itemKey = null) {
  const baseChance = getUltraCatchChance(monster, state);
  const item = itemKey ? CAPTURE_ITEMS[itemKey] : null;

  if (item?.guaranteed) {
    return { total: 100, base: baseChance, itemBonus: item.bonus, guaranteed: true };
  }

  return {
    total: Math.min(MAX_CAPTURE_CHANCE, baseChance + (item?.bonus || 0)),
    base: baseChance,
    itemBonus: item?.bonus || 0,
    guaranteed: false
  };
}

function buildUltraCaptureChoices(player, monster, state) {
  const choices = [{
    number: 1,
    itemKey: null,
    label: "🎯 Normal Throw",
    chance: calculateUltraCaptureChance(monster, state).total
  }];

  for (const itemKey of ["berry", "honey", "net", "masterCharm"]) {
    if ((player.captureItems[itemKey] || 0) <= 0) continue;
    const item = CAPTURE_ITEMS[itemKey];
    choices.push({
      number: choices.length + 1,
      itemKey,
      label: `${item.name} x${player.captureItems[itemKey]}`,
      chance: calculateUltraCaptureChance(monster, state, itemKey).total
    });
  }

  return choices;
}

function buildUltraMonsterEmbed(monster, title, description, { thumbnail = false } = {}) {
  const imagePath = getMonsterImage(monster);
  const files = imagePath ? [new AttachmentBuilder(imagePath)] : [];
  const embed = new EmbedBuilder().setTitle(title).setDescription(description);

  if (imagePath) {
    const attachmentUrl = `attachment://${path.basename(imagePath)}`;
    if (thumbnail) embed.setThumbnail(attachmentUrl);
    else embed.setImage(attachmentUrl);
  }

  return { embeds: [embed], files };
}

async function performUltraCaptureAttempt(message, monsterKey, itemKey = null) {
  const data = loadData();
  const state = data.ultraRareState;
  const monster = getUltraMonster(monsterKey);

  if (!state || getUltraStateStatus(state) !== "active" || state.resolved || !monster || state.monsterKey !== monsterKey) {
    return message.reply("That Ultra Rare Hunt has already ended.");
  }

  if (monster.personality === "night" && !isMountainNight()) {
    return message.reply("👻 The Shadow Wraith can only be hunted at night in Mountain Time.");
  }

  const player = getPlayer(data, message.author.id);
  const participant = state.participants[message.author.id] || { attempts: 0, lastAttempt: 0 };
  const timeLeft = ULTRA_HUNT_COOLDOWN - (Date.now() - participant.lastAttempt);

  if (timeLeft > 0) {
    return message.reply(`⏳ You can use \`!ultrahunt\` again in **${formatTime(timeLeft)}**.`);
  }

  if (itemKey && (player.captureItems[itemKey] || 0) <= 0) {
    return message.reply(`You no longer have any ${CAPTURE_ITEMS[itemKey].name}.`);
  }

  const chanceInfo = calculateUltraCaptureChance(monster, state, itemKey);
  const roll = Math.floor(Math.random() * 100) + 1;

  if (itemKey) player.captureItems[itemKey]--;

  participant.attempts++;
  participant.lastAttempt = Date.now();
  state.participants[message.author.id] = participant;

  if (chanceInfo.guaranteed || roll <= chanceInfo.total) {
    saveData(data);
    return resolveUltraCatch(message, monster, state, roll, chanceInfo.total, itemKey);
  }

  state.failedAttempts = (state.failedAttempts || 0) + 1;
  saveData(data);

  let personalityText = "";
  if (monster.personality === "weakening") {
    personalityText = `\n❄️ The Frost Titan weakens! The next server-wide chance is now **${getUltraCatchChance(monster, state)}%**.`;
  } else if (monster.personality === "shifting") {
    personalityText = "\n⚡ The storm shifts every five minutes. Its chance may be different on your next attempt.";
  } else if (monster.personality === "generous") {
    personalityText = `\n🌠 The community reward has grown to **${getUltraParticipantReward(monster, state)} points**.`;
  }

  return message.reply(buildUltraMonsterEmbed(
    monster,
    `❌ ${monster.name} escaped your attempt!`,
    `${itemKey ? `**Item Used:** ${CAPTURE_ITEMS[itemKey].name}\n` : "**Method:** Normal Throw\n"}` +
    `**Base Catch Chance:** ${chanceInfo.base}%\n` +
    `${chanceInfo.itemBonus > 0 ? `**Item Bonus:** +${chanceInfo.itemBonus}%\n` : ""}` +
    `**Final Catch Chance:** ${chanceInfo.total}%\n` +
    `**Roll:** ${roll}${personalityText}\n\n` +
    `Try again in **5 minutes** while the event remains active.`,
    { thumbnail: true }
  ));
}


function getMountainDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  );

  const weekdayIndexes = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6
  };

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekdayIndex: weekdayIndexes[parts.weekday]
  };
}

function getMountainWeekKey(date = new Date()) {
  const parts = getMountainDateParts(date);
  const localNoonUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  localNoonUtc.setUTCDate(localNoonUtc.getUTCDate() - parts.weekdayIndex);

  const year = localNoonUtc.getUTCFullYear();
  const month = String(localNoonUtc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(localNoonUtc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeightedUltraSpawnMinute() {
  const roll = Math.random() * 100;

  // 25% chance: Morning, 5:00 AM-10:59 AM Mountain Time.
  if (roll < 25) {
    return 5 * 60 + Math.floor(Math.random() * (6 * 60));
  }

  // 35% chance: Afternoon, 11:00 AM-4:59 PM Mountain Time.
  if (roll < 60) {
    return 11 * 60 + Math.floor(Math.random() * (6 * 60));
  }

  // 40% chance: Evening, 5:00 PM-11:59 PM Mountain Time.
  return 17 * 60 + Math.floor(Math.random() * (7 * 60));
}

function createUltraWeeklySchedule(date = new Date()) {
  const availableDays = [0, 1, 2, 3, 4, 5, 6];
  const selectedDays = [];

  while (selectedDays.length < ULTRA_RANDOM_EVENTS_PER_WEEK) {
    const index = Math.floor(Math.random() * availableDays.length);
    selectedDays.push(availableDays.splice(index, 1)[0]);
  }

  const events = selectedDays
    .sort((a, b) => a - b)
    .map(dayIndex => ({
      dayIndex,
      minuteOfDay: getWeightedUltraSpawnMinute(),
      completed: false
    }));

  return {
    weekKey: getMountainWeekKey(date),
    events
  };
}

function ensureUltraWeeklySchedule(data, date = new Date()) {
  const weekKey = getMountainWeekKey(date);

  if (!data.ultraWeeklySchedule || data.ultraWeeklySchedule.weekKey !== weekKey) {
    data.ultraWeeklySchedule = createUltraWeeklySchedule(date);
    return true;
  }

  return false;
}

function getDueWeeklyUltraEvent(schedule, date = new Date()) {
  if (!schedule?.events) return null;

  const parts = getMountainDateParts(date);
  const currentMinuteOfWeek = parts.weekdayIndex * 1440 + parts.hour * 60 + parts.minute;

  return schedule.events
    .filter(event => !event.completed)
    .sort((a, b) => (a.dayIndex * 1440 + a.minuteOfDay) - (b.dayIndex * 1440 + b.minuteOfDay))
    .find(event => currentMinuteOfWeek >= event.dayIndex * 1440 + event.minuteOfDay) || null;
}

function completeDueWeeklyUltraEvents(data, date = new Date()) {
  ensureUltraWeeklySchedule(data, date);

  const parts = getMountainDateParts(date);
  const currentMinuteOfWeek = parts.weekdayIndex * 1440 + parts.hour * 60 + parts.minute;
  let completedCount = 0;

  for (const event of data.ultraWeeklySchedule?.events || []) {
    const eventMinuteOfWeek = event.dayIndex * 1440 + event.minuteOfDay;
    if (!event.completed && currentMinuteOfWeek >= eventMinuteOfWeek) {
      event.completed = true;
      completedCount++;
    }
  }

  return completedCount;
}

async function processWeeklyUltraSchedule(channel) {
  const data = loadData();
  const scheduleChanged = ensureUltraWeeklySchedule(data);
  if (scheduleChanged) saveData(data);

  if ((data.ultraAdminPauseUntil || 0) > Date.now()) {
    return;
  }

  const dueEvent = getDueWeeklyUltraEvent(data.ultraWeeklySchedule);

  if (!dueEvent) {
    return;
  }

  const currentStatus = getUltraStateStatus(data.ultraRareState);
  if (["scheduled", "active"].includes(currentStatus)) {
    return;
  }

  const monster = selectRandomUltraMonster();
  const started = await announceUltraHunt(channel, monster);
  if (!started) return;

  const freshData = loadData();
  ensureUltraWeeklySchedule(freshData);
  const matchingEvent = freshData.ultraWeeklySchedule.events.find(event =>
    !event.completed &&
    event.dayIndex === dueEvent.dayIndex &&
    event.minuteOfDay === dueEvent.minuteOfDay
  );

  if (matchingEvent) matchingEvent.completed = true;
  saveData(freshData);
}

function selectRandomUltraMonster({ summoned = false } = {}) {
  let pool = [...ultraRareMonsters];
  if (!isMountainNight()) {
    pool = pool.filter(monster => monster.personality !== "night");
  }
  if (summoned) pool = [...ultraRareMonsters];
  return pool[Math.floor(Math.random() * pool.length)];
}

async function getMonsterHuntChannel() {
  const cached = client.channels.cache.get(MONSTER_CHANNEL_ID);
  if (cached && cached.isTextBased()) return cached;

  const fetched = await client.channels.fetch(MONSTER_CHANNEL_ID).catch(error => {
    console.error("Failed to fetch Monster Hunt channel:", error);
    return null;
  });

  return fetched && fetched.isTextBased() ? fetched : null;
}

function scheduleUltraArrivalCheck(startAt) {
  const delay = Math.max(0, startAt - Date.now() + 1000);

  setTimeout(async () => {
    try {
      const channel = await getMonsterHuntChannel();
      if (!channel) {
        console.error("Ultra Rare arrival timer could not find the Monster Hunt channel.");
        return;
      }

      await processUltraState(channel);
    } catch (error) {
      console.error("Ultra Rare dedicated arrival timer failed:", error);
    }
  }, delay);
}

async function announceUltraHunt(channel, monster, sourceUserId = null) {
  const data = loadData();
  const existingStatus = getUltraStateStatus(data.ultraRareState);
  if (["scheduled", "active"].includes(existingStatus)) return false;

  const now = Date.now();
  const startAt = now;
  const durationMs = monster.durationMinutes * 60 * 1000;

  data.ultraRareState = {
    monsterKey: monster.key,
    startAt,
    endAt: startAt + durationMs,
    participants: {},
    failedAttempts: 0,
    lastPersonalityTick: startAt,
    sourceUserId,
    resolved: false,
    returnScheduled: false
  };
  saveData(data);

  await channel.send({
    content: `<@&${MONSTER_NOTIFY_ROLE}>`,
    ...buildUltraMonsterEmbed(
      monster,
      `🚨 ULTRA RARE HUNT — ${monster.name} has appeared!`,
      `*${monster.spawnText}*

` +
      `**Starting Catch Chance:** ${monster.catchChance}%
` +
      `**Event Length:** ${monster.durationMinutes} minutes
` +
      `**Ultra Hunt Cooldown:** 5 minutes

` +
      `${monster.description}

` +
      `Use \`!ultrahunt\` to view your available catch choices.

` +
      `🏆 Catcher Reward: **${ULTRA_CATCHER_REWARD} points**
` +
      `🎉 Other participants earn at least **${ULTRA_PARTICIPANT_REWARD} points** if it is caught.`
    )
  });
  return true;
}

async function scheduleSummonedUltra(channel, monster, userId) {
  const data = loadData();
  const existingStatus = getUltraStateStatus(data.ultraRareState);
  if (["scheduled", "active"].includes(existingStatus)) return false;

  const now = Date.now();
  const startAt = now + ULTRA_SUMMON_DELAY;
  data.ultraRareState = {
    monsterKey: monster.key,
    startAt,
    endAt: startAt + monster.durationMinutes * 60 * 1000,
    participants: {},
    failedAttempts: 0,
    lastPersonalityTick: startAt,
    sourceUserId: userId,
    resolved: false,
    summoned: true,
    announcedActive: false,
    returnScheduled: false
  };
  saveData(data);

  // Use a dedicated timer for this summon. The saved-state monitor remains
  // as a fallback if the bot restarts before the five-minute timer ends.
  scheduleUltraArrivalCheck(startAt);

  await channel.send(
    `<@&${MONSTER_NOTIFY_ROLE}>\n\n` +
    `💎 **A RELIC HAS BEEN SACRIFICED!**\n\n` +
    `<@${userId}> sacrificed **${monster.relicName}**.\n` +
    `*${monster.spawnText}*\n\n` +
    `${monster.name} will appear <t:${Math.floor(startAt / 1000)}:R>!\n` +
    `Prepare to use \`!ultrahunt\`.`
  );
  return true;
}

async function finishUltraHunt(channel, reason = "expired") {
  const data = loadData();
  const state = data.ultraRareState;
  if (!state || state.resolved) return;

  const monster = getUltraMonster(state.monsterKey);
  if (!monster) {
    data.ultraRareState = null;
    saveData(data);
    return;
  }

  state.resolved = true;
  const participantIds = Object.keys(state.participants || {});

  const participationUnlockMessages = [];

  for (const userId of participantIds) {
    const participant = getPlayer(data, userId);
    participant.points += ULTRA_ESCAPE_REWARD;
    participant.ultraParticipationCount = (participant.ultraParticipationCount || 0) + 1;

    const newUnlocks = evaluateUltraSecretRewards(participant);
    if (newUnlocks.length > 0) {
      participationUnlockMessages.push({ userId, unlocks: newUnlocks });
    }
  }

  saveData(data);

  const reasonText = reason === "fled"
    ? `${monster.name} sensed danger and vanished before the hunt ended!`
    : `${monster.name} escaped before anyone could capture it.`;

  await channel.send(
    `💨 **THE ULTRA RARE ESCAPED!**\n\n` +
    `${reasonText}\n\n` +
    `${participantIds.length > 0
      ? `Everyone who participated earned **${ULTRA_ESCAPE_REWARD} points** for the effort.`
      : "No hunters were able to attempt the event."}`
  );

  for (const rewardMessage of participationUnlockMessages) {
    await channel.send(
      `<@${rewardMessage.userId}>${formatSecretUnlocks(rewardMessage.unlocks)}`
    );
  }

  if (monster.personality === "return" && !state.returnScheduled && Math.random() < 0.5) {
    const returnAt = Date.now() + (60 + Math.floor(Math.random() * 121)) * 60 * 1000;
    const returnData = loadData();
    returnData.ultraRareState = {
      monsterKey: monster.key,
      startAt: returnAt,
      endAt: returnAt + monster.durationMinutes * 60 * 1000,
      participants: {},
      failedAttempts: 0,
      lastPersonalityTick: returnAt,
      sourceUserId: null,
      resolved: false,
      summoned: false,
      announcedActive: false,
      returning: true,
      returnScheduled: true
    };
    saveData(returnData);

    await channel.send(
      `🔥 A trail of embers remains in the sky...\n` +
      `The Phoenix Queen may not be finished with this world.`
    );
  } else {
    const fresh = loadData();
    if (fresh.ultraRareState?.resolved) {
      fresh.ultraRareState = null;
      saveData(fresh);
    }
  }
}

async function processUltraState(channel) {
  const data = loadData();
  const state = data.ultraRareState;
  if (!state) return;

  const monster = getUltraMonster(state.monsterKey);
  if (!monster) {
    data.ultraRareState = null;
    saveData(data);
    return;
  }

  const now = Date.now();
  const status = getUltraStateStatus(state, now);

  if (status === "scheduled") return;

  if (status === "expired") {
    return finishUltraHunt(channel, "expired");
  }

  if (status !== "active") return;

  if (!state.announcedActive) {
    // Post the arrival first. Only mark it announced after Discord confirms
    // the message was sent, so a temporary send failure can retry next minute.
    try {
      await channel.send({
        content: `<@&${MONSTER_NOTIFY_ROLE}>`,
        ...buildUltraMonsterEmbed(
          monster,
          `🚨 THE SUMMONED ULTRA RARE HAS ARRIVED — ${monster.name}`,
          `*${monster.spawnText}*

` +
          `**Current Catch Chance:** ${getUltraCatchChance(monster, state)}%
` +
          `**Event Length:** ${monster.durationMinutes} minutes
` +
          `**Ultra Hunt Cooldown:** 5 minutes

` +
          `${monster.description}

` +
          `Use \`!ultrahunt\` to view your available catch choices.`
        )
      });

      const announcedData = loadData();
      if (
        announcedData.ultraRareState &&
        announcedData.ultraRareState.monsterKey === monster.key &&
        !announcedData.ultraRareState.resolved
      ) {
        announcedData.ultraRareState.announcedActive = true;
        announcedData.ultraRareState.activeAnnouncementSentAt = Date.now();
        saveData(announcedData);
      }
    } catch (error) {
      console.error("Failed to post Ultra Rare arrival announcement. It will retry next minute:", error);
      return;
    }
  }

  if (monster.personality === "flee") {
    const elapsedTicks = Math.floor((now - state.lastPersonalityTick) / (5 * 60 * 1000));
    if (elapsedTicks > 0) {
      state.lastPersonalityTick += elapsedTicks * 5 * 60 * 1000;
      if (Math.random() < 0.2) {
        saveData(data);
        return finishUltraHunt(channel, "fled");
      }
      saveData(data);
      await channel.send(`🌊 ${monster.name} dives beneath the waves... but it is still nearby!`);
    }
  }
}

function maybeAwardUltraRelic(data, player, monster) {
  const roll = Math.floor(Math.random() * 100) + 1;
  if (roll > ULTRA_RELIC_DROP_CHANCE) return null;

  player.relics[monster.relicKey] = (player.relics[monster.relicKey] || 0) + 1;
  const firstDiscovery = !data.worldProgress[monster.relicKey];
  data.worldProgress[monster.relicKey] = true;

  const allDiscovered = RELIC_KEYS.every(key => data.worldProgress[key]);
  if (allDiscovered && !data.worldShatterUnlocked) {
    data.worldShatterUnlocked = true;
  }

  return { firstDiscovery, worldShatterUnlockedNow: allDiscovered };
}

async function resolveUltraCatch(message, monster, state, roll, chance, itemKey = null) {
  const data = loadData();
  const freshState = data.ultraRareState;

  if (!freshState || freshState.resolved || freshState.monsterKey !== monster.key) {
    return message.reply("That Ultra Rare Hunt has already ended.");
  }

  freshState.resolved = true;

  const catcher = getPlayer(data, message.author.id);
  const caughtMonster = {
    name: monster.name,
    rarity: "Ultra Rare",
    points: ULTRA_CATCHER_REWARD,
    chance,
    image: monster.image,
    shiny: false
  };

  catcher.points += ULTRA_CATCHER_REWARD;
  catcher.caught.push(caughtMonster);

  if (!catcher.ultraCaughtKeys.includes(monster.key)) {
    catcher.ultraCaughtKeys.push(monster.key);
  }

  const catcherUnlocks = [
    ...unlockSecretReward(catcher, monster.secretAchievement, monster.titleReward)
  ];

  const participantReward = getUltraParticipantReward(monster, freshState);
  const participantIds = Object.keys(freshState.participants || {});
  const otherParticipants = participantIds.filter(userId => userId !== message.author.id);
  const participantUnlockMessages = [];

  for (const userId of participantIds) {
    const participant = getPlayer(data, userId);
    participant.ultraParticipationCount = (participant.ultraParticipationCount || 0) + 1;

    if (userId !== message.author.id) {
      participant.points += participantReward;
    }

    const newUnlocks = evaluateUltraSecretRewards(participant);
    if (newUnlocks.length > 0) {
      participantUnlockMessages.push({ userId, unlocks: newUnlocks });
    }
  }

  const relicResult = maybeAwardUltraRelic(data, catcher, monster);
  catcherUnlocks.push(...evaluateUltraSecretRewards(catcher));

  saveData(data);

  await message.channel.send(
    buildMonsterEmbed(
      caughtMonster,
      `🎉 ${message.author.username} captured ${caughtMonster.name}!`,
      `**Catch Chance:** ${chance}%\n` +
      `**Roll:** ${roll}\n\n` +
      `🏆 ${message.author} earned **${ULTRA_CATCHER_REWARD} points**!\n` +
      `${otherParticipants.length > 0
        ? `🎉 ${otherParticipants.length} other participant${otherParticipants.length === 1 ? "" : "s"} earned **${participantReward} points each**!`
        : "You were the only participant in the hunt."}` +
      formatSecretUnlocks(catcherUnlocks)
    )
  );

  for (const rewardMessage of participantUnlockMessages) {
    await message.channel.send(
      `<@${rewardMessage.userId}>${formatSecretUnlocks(rewardMessage.unlocks)}`
    );
  }

  if (relicResult) {
    await message.channel.send(
      `💎 **RELIC FOUND!**\n\n` +
      `${message.author} received **${monster.relicName}**!\n` +
      `*${monster.relicDescription}*\n\n` +
      `Sacrifice it later with \`!summon ${monster.relicCommand}\`.`
    );

    if (relicResult.worldShatterUnlockedNow) {
      await message.channel.send(
        `🌌 **The world feels... different.**\n\n` +
        `As the final unknown Relic is uncovered, ancient seals begin to crack.\n` +
        `Reality itself feels unstable...`
      );
    }
  }

  const cleanupData = loadData();
  if (cleanupData.ultraRareState?.resolved) {
    cleanupData.ultraRareState = null;
    saveData(cleanupData);
  }
}

function giveQuestBonusBait(player) {
  const bonusRoll = Math.floor(Math.random() * 100) + 1;
  const rewards = [];

  if (bonusRoll <= 25) {
    player.bait.rare++;
    rewards.push("🪤 1 Rare Bait");
  }

  if (bonusRoll <= 10) {
    player.bait.epic++;
    rewards.push("🪤 1 Epic Bait");
  }

  if (bonusRoll <= 2) {
    player.bait.legendary++;
    rewards.push("🪤 1 Legendary Bait");
  }

  return rewards;
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  //
  // 🌅 7:00 AM MST Reminder
  //
  cron.schedule(
    "0 7 * * *",
    async () => {
      const guild = client.guilds.cache.first();
      if (!guild) return;

      const channel = guild.channels.cache.get(MONSTER_CHANNEL_ID);
      if (!channel) return;

      const event = getActiveEvent();

      let eventMessage = "";

      if (event) {
        eventMessage =
          `\n🎉 **Today's Event:** ${event.name}\n` +
          `${event.description}\n`;
      }

      channel.send(
        `<@&${MONSTER_NOTIFY_ROLE}>\n\n` +
          `🌅 **Monster Hunt is live!**\n\n` +
          `${eventMessage}` +
          `🎯 Daily quests are available\n` +
          `🎁 Daily reward is ready\n` +
          `🐉 Time to start hunting!\n\n` +
          `Type \`!hunt\` to begin your adventure!`
      );
    },
    {
      timezone: "America/Denver"
    }
  );

  //
  // ☀️ 12:00 PM MST Reminder
  //
  cron.schedule(
    "0 12 * * *",
    async () => {
      const guild = client.guilds.cache.first();
      if (!guild) return;

      const channel = guild.channels.cache.get(MONSTER_CHANNEL_ID);
      if (!channel) return;

      const event = getActiveEvent();

      let eventMessage = "";

      if (event) {
        eventMessage =
          `\n🎉 **Today's Event:** ${event.name}\n` +
          `${event.description}\n`;
      }

      channel.send(
        `<@&${MONSTER_NOTIFY_ROLE}>\n\n` +
          `☀️ **Midday Monster Hunt Reminder!**\n\n` +
          `${eventMessage}` +
          `🎯 Keep working on today's quests\n` +
          `🐉 Hunt more monsters\n` +
          `📚 Increase your Monster Knowledge\n\n` +
          `Type \`!hunt\` to continue your adventure!`
      );
    },
    {
      timezone: "America/Denver"
    }
  );

  //
  // 🌙 6:00 PM MST Reminder
  //
  cron.schedule(
    "0 18 * * *",
    async () => {
      const guild = client.guilds.cache.first();
      if (!guild) return;

      const channel = guild.channels.cache.get(MONSTER_CHANNEL_ID);
      if (!channel) return;

      channel.send(
        `<@&${MONSTER_NOTIFY_ROLE}>\n\n` +
          `🌙 **Final Monster Hunt reminder!**\n\n` +
          `🎯 Finish your daily quests\n` +
          `🎁 Don't forget your daily reward\n` +
          `🪤 Use your bait before tomorrow!\n\n` +
          `Type \`!hunt\` and continue your collection!`
      );
    },
    {
      timezone: "America/Denver"
    }
  );


  // Ultra Rare state monitor.
  // This runs independently of node-cron so summoned arrivals are announced
  // promptly and reliably on Railway. Saved state still survives redeploys.
  let ultraMonitorBusy = false;

  const runUltraMonitor = async () => {
    if (ultraMonitorBusy) return;
    ultraMonitorBusy = true;

    try {
      const channel = await getMonsterHuntChannel();
      if (!channel) {
        console.error(`Ultra Rare monitor could not access channel ${MONSTER_CHANNEL_ID}.`);
        return;
      }

      await processUltraState(channel);
      await processWeeklyUltraSchedule(channel);
    } catch (error) {
      console.error("Ultra Rare monitor error:", error);
    } finally {
      ultraMonitorBusy = false;
    }
  };

  // Recover a dedicated timer for a saved scheduled summon after a redeploy.
  const startupData = loadData();
  if (getUltraStateStatus(startupData.ultraRareState) === "scheduled") {
    scheduleUltraArrivalCheck(startupData.ultraRareState.startAt);
  }

  // Check immediately after login, then every 10 seconds.
  runUltraMonitor();
  setInterval(runUltraMonitor, 10 * 1000);
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const command = content.toLowerCase();
  const data = loadData();
  const player = getPlayer(data, message.author.id);

  resetDaily(player);

  if (command === "!monsternotify on") {
    const role = message.guild.roles.cache.get(MONSTER_NOTIFY_ROLE);
    if (!role) return message.reply("Notification role not found.");

    await message.member.roles.add(role);
    return message.reply("🔔 Monster Hunt notifications enabled!");
  }

  if (command === "!monsternotify off") {
    const role = message.guild.roles.cache.get(MONSTER_NOTIFY_ROLE);
    if (!role) return message.reply("Notification role not found.");

    await message.member.roles.remove(role);
    return message.reply("🔕 Monster Hunt notifications disabled.");
  }

  if (command === "!testreminder") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can test reminders.");
    }

    return message.channel.send(
      `<@&${MONSTER_NOTIFY_ROLE}>\n\n` +
      `🧪 **Test Monster Hunt Reminder!**\n\n` +
      `🎯 Daily quests are available\n` +
      `🎁 Daily reward is ready\n` +
      `🐉 Type \`!hunt\` to begin!`
    );
  }

  if (command === "!ultrahunt") {
    await processUltraState(message.channel);

    const freshData = loadData();
    const state = freshData.ultraRareState;
    const status = getUltraStateStatus(state);

    if (status === "scheduled") {
      return message.reply(`⏳ The Ultra Rare will arrive <t:${Math.floor(state.startAt / 1000)}:R>.`);
    }

    if (status !== "active") {
      return message.reply("There is no active Ultra Rare Hunt right now.");
    }

    const monster = getUltraMonster(state.monsterKey);
    if (!monster) return message.reply("The active Ultra Rare could not be found.");

    if (monster.personality === "night" && !isMountainNight()) {
      return message.reply("👻 The Shadow Wraith can only be hunted at night in Mountain Time.");
    }

    const ultraPlayer = getPlayer(freshData, message.author.id);
    const participant = state.participants[message.author.id] || { attempts: 0, lastAttempt: 0 };
    const timeLeft = ULTRA_HUNT_COOLDOWN - (Date.now() - participant.lastAttempt);

    if (timeLeft > 0) {
      return message.reply(`⏳ You can use \`!ultrahunt\` again in **${formatTime(timeLeft)}**.`);
    }

    const choices = buildUltraCaptureChoices(ultraPlayer, monster, state);
    const validNumbers = choices.map(choice => choice.number);
    const currentChance = getUltraCatchChance(monster, state);
    const remainingMs = Math.max(0, state.endAt - Date.now());

    const choiceMessage = await message.reply(buildUltraMonsterEmbed(
      monster,
      `🌌 Ultra Rare Encounter — ${monster.name}`,
      `**Rarity:** ${monster.rarity}
` +
      `**Current Base Catch Chance:** ${currentChance}%
` +
      `**Time Remaining:** ${formatTime(remainingMs)}
` +
      `**Your Previous Attempts:** ${participant.attempts || 0}

` +
      `**Choose how to catch it:**
${captureChoicesText(choices)}

` +
      `Reply with **${validNumbers.join(", ")}** within 5 minutes.
` +
      `Only capture items you currently own are shown.`,
      { thumbnail: true }
    ));

    const filter = response =>
      response.author.id === message.author.id &&
      validNumbers.includes(Number(response.content.trim()));

    try {
      const collected = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 5 * 60 * 1000,
        errors: ["time"]
      });

      const response = collected.first();
      const selected = choices.find(choice => choice.number === Number(response.content.trim()));
      await response.delete().catch(() => null);
      return performUltraCaptureAttempt(message, monster.key, selected.itemKey);
    } catch {
      return choiceMessage.reply(
        `⌛ No catch choice was made. Your Ultra Hunt attempt was **not used**, and no item was consumed.`
      );
    }
  }

  if (command === "!relics" || command === "!inventory") {
    return message.reply(
      `🎒 **${message.author.username}'s Inventory**\n\n` +
      `## 🪤 Bait\n` +
      `Rare Bait: **${player.bait.rare}**\n` +
      `Epic Bait: **${player.bait.epic}**\n` +
      `Legendary Bait: **${player.bait.legendary}**\n\n` +
      `## 🎯 Capture Items\n` +
      `${captureItemInventoryText(player)}\n\n` +
      `## 💎 Ultra Rare Relics\n` +
      `${ultraRelicInventoryText(player)}\n\n` +
      `Relics are single-use. Using \`!summon relic name\` sacrifices one to summon its matching Ultra Rare.`
    );
  }

  if (command.startsWith("!summon ")) {
    const relicInput = content.slice(8).trim();
    const monster = getUltraMonster(relicInput);

    if (!monster || monster.relicCommand.toLowerCase() !== relicInput.toLowerCase()) {
      return message.reply(
        "That Relic was not recognized. Use `!relics` to see the exact summon commands for the Relics you own."
      );
    }

    const currentStatus = getUltraStateStatus(data.ultraRareState);
    if (["scheduled", "active"].includes(currentStatus)) {
      return message.reply("⚠️ The world cannot sustain two Ultra Rare monsters at once. Wait for the current event to end.");
    }

    if ((player.relics[monster.relicKey] || 0) <= 0) {
      return message.reply(`You do not possess ${monster.relicName}.`);
    }

    player.relics[monster.relicKey]--;
    saveData(data);

    const scheduled = await scheduleSummonedUltra(message.channel, monster, message.author.id);
    if (!scheduled) {
      const refundData = loadData();
      getPlayer(refundData, message.author.id).relics[monster.relicKey]++;
      saveData(refundData);
      return message.reply("The summon could not begin, so your Relic was returned.");
    }

    const summonData = loadData();
    const summoner = getPlayer(summonData, message.author.id);
    if (!summoner.ultraSummonedKeys.includes(monster.key)) {
      summoner.ultraSummonedKeys.push(monster.key);
    }
    const summonUnlocks = evaluateUltraSecretRewards(summoner);
    saveData(summonData);

    return message.reply(
      `💎 You sacrificed **${monster.relicName}**.\n` +
      `${monster.name} will arrive in **5 minutes**!` +
      formatSecretUnlocks(summonUnlocks)
    );
  }

  if (command === "!ultrastatus") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can view the hidden Ultra Rare status.");
    }

    await processUltraState(message.channel);

    const freshData = loadData();
    const state = freshData.ultraRareState;
    const status = getUltraStateStatus(state);

    const discoveredCount = RELIC_KEYS.filter(
      relicKey => freshData.worldProgress?.[relicKey]
    ).length;

    const progressPercent = Math.floor(
      (discoveredCount / RELIC_KEYS.length) * 100
    );

    const relicProgress = ultraRareMonsters
      .map(monster => {
        const discovered = Boolean(
          freshData.worldProgress?.[monster.relicKey]
        );

        let currentlyOwned = 0;
        for (const savedPlayer of Object.values(freshData.players || {})) {
          currentlyOwned += savedPlayer.relics?.[monster.relicKey] || 0;
        }

        return (
          `${discovered ? "✅" : "⬜"} **${monster.relicName}**` +
          ` — ${discovered ? "Discovered" : "Not Discovered"}` +
          ` | Currently Held: **${currentlyOwned}**`
        );
      })
      .join("\n");

    let eventText = "No Ultra Rare Hunt is currently active or scheduled.";

    if (["scheduled", "active"].includes(status)) {
      const monster = getUltraMonster(state.monsterKey);
      const when = status === "scheduled"
        ? `Arrives <t:${Math.floor(state.startAt / 1000)}:R>`
        : `Ends <t:${Math.floor(state.endAt / 1000)}:R>`;

      eventText =
        `${monster?.name || "Unknown Ultra Rare"}\n` +
        `Status: **${status === "scheduled" ? "Scheduled" : "Active"}**\n` +
        `${when}\n` +
        `Participants: **${Object.keys(state.participants || {}).length}**\n` +
        `Failed Attempts: **${state.failedAttempts || 0}**`;
    }

    const worldEaterStatus = discoveredCount === RELIC_KEYS.length
      ? "⚠️ **READY — Every Relic has been discovered. The World Eater storyline can begin.**"
      : `🔒 Locked — **${RELIC_KEYS.length - discoveredCount}** unique Relic${RELIC_KEYS.length - discoveredCount === 1 ? "" : "s"} still undiscovered.`;

    const schedulerText = (freshData.ultraAdminPauseUntil || 0) > Date.now()
      ? `Paused until <t:${Math.floor(freshData.ultraAdminPauseUntil / 1000)}:T> (<t:${Math.floor(freshData.ultraAdminPauseUntil / 1000)}:R>)`
      : "Running normally";

    return message.reply(
      `🛡️ **ADMIN ULTRA RARE STATUS**\n\n` +
      `🚨 **Current Event**\n${eventText}\n\n` +
      `⏱️ **Automatic Scheduler**\n${schedulerText}\n\n` +
      `🌍 **Hidden World Progress**\n` +
      `Progress: **${discoveredCount}/${RELIC_KEYS.length} (${progressPercent}%)**\n\n` +
      `${relicProgress}\n\n` +
      `👁️ **World Eater Status**\n${worldEaterStatus}`
    );
  }

  if (command === "!endultra") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can end an Ultra Rare Hunt.");
    }

    const freshData = loadData();
    const state = freshData.ultraRareState;
    const status = getUltraStateStatus(state);

    if (!["scheduled", "active"].includes(status)) {
      return message.reply("There is no active or scheduled Ultra Rare Hunt to end.");
    }

    const monster = getUltraMonster(state.monsterKey);
    freshData.ultraRareState = null;
    const skippedAutomaticEvents = completeDueWeeklyUltraEvents(freshData);
    freshData.ultraAdminPauseUntil = Date.now() + 10 * 60 * 1000;
    saveData(freshData);

    return message.channel.send(
      `🛑 **Ultra Rare Hunt ended by an administrator.**
` +
      `${monster ? monster.name : "The Ultra Rare"} has been removed.
` +
      `No participation or escape rewards were awarded.
` +
      `${skippedAutomaticEvents > 0 ? `🗓️ Skipped **${skippedAutomaticEvents}** overdue automatic spawn${skippedAutomaticEvents === 1 ? "" : "s"} so another event will not immediately replace it.
` : ""}` +
      `⏸️ Automatic Ultra Rare spawning is paused for **10 minutes**.`
    );
  }

  if (command === "!ultraclear") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can clear Ultra Rare event data.");
    }

    const freshData = loadData();
    const hadEvent = ["scheduled", "active"].includes(
      getUltraStateStatus(freshData.ultraRareState)
    );

    freshData.ultraRareState = null;
    const skippedAutomaticEvents = completeDueWeeklyUltraEvents(freshData);
    freshData.ultraAdminPauseUntil = Date.now() + 10 * 60 * 1000;
    saveData(freshData);

    return message.reply(
      `🧹 **Ultra Rare event data cleared.**
` +
      `Current event removed: **${hadEvent ? "Yes" : "No"}**
` +
      `Overdue automatic spawns skipped: **${skippedAutomaticEvents}**
` +
      `Automatic spawning paused: **10 minutes**

` +
      `Collections, points, Relics, and hidden world progress were preserved.`
    );
  }

  if (command.startsWith("!startultra")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can start an Ultra Rare Hunt.");
    }

    const requested = content.slice("!startultra".length).trim();
    const monster = requested ? getUltraMonster(requested) : selectRandomUltraMonster();
    if (!monster) {
      return message.reply("Ultra Rare not found. Example: `!startultra Void Kraken`");
    }

    const started = await announceUltraHunt(message.channel, monster, message.author.id);
    return message.reply(started ? `✅ Started the ${monster.name} event.` : "An Ultra Rare is already active or scheduled.");
  }

  if (command === "!hunt") {
    const now = Date.now();
    const timeLeft = HUNT_COOLDOWN - (now - player.lastHunt);

    if (timeLeft > 0) {
      return message.reply(`⏳ You can hunt again in **${formatTime(timeLeft)}**.`);
    }

    const usedBait = player.activeBait;
    const monster = getRandomMonster(player);
    const encounters = addEncounterKnowledge(player, monster);
    const chanceInfo = calculateCaptureChance(player, monster);

    player.currentMonster = monster;
    player.activeBait = null;
    player.lastHunt = now;
    player.huntCount++;

    updateQuestProgress(player, "hunt");
    saveData(data);

    const choices = buildCaptureChoices(player, monster);
    const validNumbers = choices.map(choice => choice.number);

    const encounterMessage = await message.reply(
      buildMonsterEmbed(
        monster,
        `🐾 A wild ${monster.name} appeared!`,
        `**Rarity:** ${monster.rarity}\n` +
        `**Base Capture Chance:** ${monster.chance}%\n` +
        `**Knowledge:** ${encounters} encounter${encounters === 1 ? "" : "s"} (${getKnowledgeRank(encounters)}, +${chanceInfo.knowledgeBonus}%)\n` +
        `${chanceInfo.eventBonus > 0 ? `**Event Bonus:** +${chanceInfo.eventBonus}%\n` : ""}` +
        `**Current Catch Chance:** ${chanceInfo.total}%\n` +
        `${usedBait ? `**Bait Used:** ${usedBait.toUpperCase()} (improved encounter odds)\n` : ""}` +
        `\n**Choose how to catch it:**\n${captureChoicesText(choices)}\n\n` +
        `Reply with **${validNumbers.join(", ")}** within 5 minutes.\n` +
        `Only items you currently own are shown.`
      )
    );

    const filter = response =>
      response.author.id === message.author.id &&
      validNumbers.includes(Number(response.content.trim()));

    try {
      const collected = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 5 * 60 * 1000,
        errors: ["time"]
      });

      const response = collected.first();
      const selected = choices.find(
        choice => choice.number === Number(response.content.trim())
      );

      await response.delete().catch(() => null);
      return performCaptureAttempt(message, message.author.id, selected.itemKey);
    } catch {
      const freshData = loadData();
      const freshPlayer = getPlayer(freshData, message.author.id);

      if (!freshPlayer.currentMonster) {
        return;
      }

      freshPlayer.currentMonster = null;
      saveData(freshData);

      return encounterMessage.reply(
        `⌛ **The ${cleanMonsterName(monster.name)} escaped because no choice was made within 5 minutes.**`
      );
    }
  }

  if (command === "!catch" || command.startsWith("!catch ")) {
    return message.reply(
      "The `!catch` command has been retired. Use `!hunt`, then reply with one of the numbered choices shown by the bot."
    );
  }

  if (command === "!daily") {
    let text = `🎯 **${message.author.username}'s Daily Quests**\n\n`;
    let totalReward = 0;

    player.dailyQuests.forEach(q => {
      totalReward += q.reward;
      text += `${q.progress >= q.goal ? "✅" : "⬜"} ${q.text} (${q.progress}/${q.goal})\n`;
    });

    text += `\nReward: **+${totalReward} bonus points**`;
    text += `\nChance for bonus bait when claimed.`;
    text += `\nClaim with \`!claimdaily\` when complete.`;

    return message.reply(text);
  }

  if (command === "!claimdaily") {
  if (!canClaimDaily()) {
    return message.reply(
      "🌙 Daily quest rewards can only be claimed between 5:00 AM and 11:59 PM MST."
    );
  }

  if (player.dailyClaimed)
    return message.reply(
      "You already claimed today's reward!"
    );

    const complete = player.dailyQuests.every(q => q.progress >= q.goal);
    if (!complete) return message.reply("You haven't completed all your daily quests yet!");

    const reward = player.dailyQuests.reduce((sum, q) => sum + q.reward, 0);
    player.points += reward;
    player.dailyClaimed = true;

    const bonusRewards = giveQuestBonusBait(player);

    saveData(data);

    return message.reply(
      `🎉 **Daily quests complete!**\n` +
      `+${reward} bonus points!` +
      `${bonusRewards.length > 0 ? `\n\nBonus Bait:\n${bonusRewards.join("\n")}` : ""}`
    );
  }

  if (command === "!dailyreward") {
  if (!canClaimDaily()) {
    return message.reply(
      "🌙 Daily rewards can only be claimed between 5:00 AM and 11:59 PM MST."
    );
  }

  const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const timeLeft = cooldown - (now - player.dailyReward);

    if (timeLeft > 0) return message.reply("🎁 You already claimed today's reward! Come back tomorrow.");

    const reward = giveRandomDailyReward(player);

    player.dailyReward = now;
    saveData(data);

    return message.reply(`🎁 **Daily Reward!**\n\nYou received:\n${reward}`);
  }

  if (command === "!bait") {
    return message.reply(
      `🪤 **Your Bait Inventory**\n\n` +
      `Rare Bait: **${player.bait.rare}**\n` +
      `Epic Bait: **${player.bait.epic}**\n` +
      `Legendary Bait: **${player.bait.legendary}**\n\n` +
      `Active Bait: **${player.activeBait || "None"}**`
    );
  }

  if (["!captureitems", "!captureitem", "!items", "!item"].includes(command)) {
    return message.reply(
      `🎒 **Your Capture Items**\n\n` +
      `${captureItemInventoryText(player)}\n\n` +
      `Capture items appear automatically after \`!hunt\`.\n` +
      `Reply with the numbered choice shown by the bot to use one.\n\n` +
      `Capture items improve the monster you already encountered. Bait only improves what rarity you may encounter.`
    );
  }

  if (command === "!knowledge") {
    const entries = Object.entries(player.knowledge)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      return message.reply("📚 You have not encountered any monsters yet.");
    }

    const text = entries
      .slice(0, 25)
      .map(([name, encounters]) =>
        `**${name}** — ${encounters} encounter${encounters === 1 ? "" : "s"} | ${getKnowledgeRank(encounters)} | +${getKnowledgeBonus(encounters)}%`
      )
      .join("\n");

    return message.reply(
      `📚 **${message.author.username}'s Monster Knowledge**\n\n${text}\n\n` +
      `Knowledge bonuses: 3 encounters = +5%, 5 = +10%, 10 = +15%, 20 = +20%.`
    );
  }

  if (command.startsWith("!knowledge ")) {
    const search = cleanMonsterName(content.slice(11).trim()).toLowerCase();
    const allMonsters = [...monsters, ...eventMonsters, ...ultraRareMonsters];
    const match = allMonsters.find(m => cleanMonsterName(m.name).toLowerCase() === search);

    if (!match) {
      return message.reply("That monster is not in the Monster Dex.");
    }

    const encounters = getKnowledgeCount(player, match);
    const bonus = getKnowledgeBonus(encounters);

    return message.reply(
      `📚 **${cleanMonsterName(match.name)} Knowledge**\n\n` +
      `Encounters: **${encounters}**\n` +
      `Rank: **${getKnowledgeRank(encounters)}**\n` +
      `Catch Bonus: **+${bonus}%**\n\n` +
      `Next milestones: 3 = +5%, 5 = +10%, 10 = +15%, 20 = +20%.`
    );
  }

  if (command.startsWith("!usebait ")) {
    const type = content.slice(9).trim().toLowerCase();

    if (!["rare", "epic", "legendary"].includes(type)) {
      return message.reply("Use `!usebait rare`, `!usebait epic`, or `!usebait legendary`.");
    }

    if (player.bait[type] <= 0) return message.reply(`You don't have any ${type} bait.`);

    player.bait[type]--;
    player.activeBait = type;

    saveData(data);

    return message.reply(`🪤 **${type.toUpperCase()} bait activated!**\nYour next hunt has improved odds.`);
  }

  if (command === "!events") {
    const event = getActiveEvent();
    if (!event) return message.reply("📅 No special event is active today.");

    return message.reply(`🎉 **${event.name}**\n\n${event.description}`);
  }

  if (command === "!collection") {
    if (player.caught.length === 0) return message.reply("You haven't caught any monsters yet!");

    const list = player.caught
      .slice(-25)
      .map((m, i) => `${i + 1}. ${m.name} — ${m.rarity}`)
      .join("\n");

    return message.reply(
      `🐉 **Your Monster Collection**\n` +
      `Title: **${player.title || "None"}**\n` +
      `Points: **${player.points}**\n` +
      `Total Caught: **${player.caught.length}**\n\n${list}`
    );
  }

  if (command === "!achievements") {
    const unlocked = unlockedAchievements(player);

    let text = `🏆 **${message.author.username}'s Achievements**\n\n`;

    achievements.forEach(a => {
      text += `${unlocked.includes(a.name) ? "✅" : "🔒"} ${a.name}\n`;
    });

    if (player.secretAchievements.length > 0) {
      text += `\n🌌 **Discovered Secret Achievements**\n`;
      text += player.secretAchievements.map(name => `✅ ${name}`).join("\n");
    } else {
      text += `\n🌌 **Secret Achievements:** None discovered yet.`;
    }

    return message.reply(text);
  }

  if (command === "!title") {
    const unlocked = getAvailableTitles(player);
    if (unlocked.length === 0) return message.reply("You haven't unlocked any titles yet!");

    return message.reply(
      `🎖️ **Your Available Titles**\n\n` +
      unlocked.map(t => `• ${t}`).join("\n") +
      `\n\nUse \`!title Title Name\` to equip one.`
    );
  }

  if (command.startsWith("!title ")) {
    const wantedTitle = content.slice(7).trim();
    const unlocked = getAvailableTitles(player);
    const match = unlocked.find(t => t.toLowerCase() === wantedTitle.toLowerCase());

    if (!match) return message.reply("You haven't unlocked that title yet. Use `!achievements` to see your progress.");

    player.title = match;
    saveData(data);

    return message.reply(`🎖️ You equipped the title **${match}**!`);
  }

  if (command === "!dex") {
    const stats = getDexStats(data);
    let text = "📖 **Monster Dex**\n\n";

    for (const [name, info] of Object.entries(stats)) {
      text += `**${name}** — ${info.rarity} | Caught: ${info.caught}\n`;
    }

    text += `\nUse \`!dex monster name\` for details.`;

    return message.reply(text);
  }

  if (command.startsWith("!dex ")) {
    const search = content.slice(5).trim().toLowerCase();
    const stats = getDexStats(data);
    const matchName = Object.keys(stats).find(name => name.toLowerCase() === search);

    if (!matchName) return message.reply("That monster is not in the Dex.");

    const info = stats[matchName];

    return message.reply(
      `📖 **${matchName}**\n\n` +
      `Rarity: **${info.rarity}**\n` +
      `Base Capture Chance: **${info.chance}%**\n` +
      `Your Encounters: **${getKnowledgeCount(player, matchName)}**\n` +
      `Your Knowledge Bonus: **+${getKnowledgeBonus(getKnowledgeCount(player, matchName))}%**\n` +
      `Times Caught Server-Wide: **${info.caught}**\n` +
      `First Caught By: ${info.firstCaughtBy ? `<@${info.firstCaughtBy}>` : "Nobody yet"}`
    );
  }

  if (command === "!leaderboard") {
    const leaderboard = Object.entries(data.players)
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10);

    let text = "🏆 **Monster Collector Leaderboard**\n\n";

    leaderboard.forEach(([userId, stats], index) => {
      const title = stats.title ? ` [${stats.title}]` : "";
      text += `${index + 1}. <@${userId}>${title} — **${stats.points} points** | ${stats.caught.length} caught\n`;
    });

    return message.reply(text);
  }

  if (command.startsWith("!trade ")) {
    const target = message.mentions.users.first();

    if (!target) return message.reply("Mention a player to trade with. Example: `!trade @user 2 1`");
    if (target.bot) return message.reply("You can't trade with bots.");
    if (target.id === message.author.id) return message.reply("You can't trade with yourself.");

    const args = content.split(/\s+/);
    const myIndex = parseInt(args[2]) - 1;
    const theirIndex = parseInt(args[3]) - 1;

    if (Number.isNaN(myIndex) || Number.isNaN(theirIndex)) {
      return message.reply("Usage: `!trade @user yourMonster# theirMonster#`");
    }

    const otherPlayer = getPlayer(data, target.id);

    if (!player.caught[myIndex] || !otherPlayer.caught[theirIndex]) {
      return message.reply("Invalid monster number. Use `!collection` to check numbers.");
    }

    data.pendingTrades[target.id] = {
      from: message.author.id,
      myIndex,
      theirIndex
    };

    saveData(data);

    return message.reply(
      `🤝 Trade sent to ${target}!\n` +
      `You offered **${player.caught[myIndex].name}** for **${otherPlayer.caught[theirIndex].name}**.\n` +
      `They can use \`!accepttrade\` or \`!declinetrade\`.`
    );
  }

  if (command === "!accepttrade") {
    const trade = data.pendingTrades[message.author.id];

    if (!trade) return message.reply("You have no pending trades.");

    const fromPlayer = getPlayer(data, trade.from);
    const toPlayer = getPlayer(data, message.author.id);

    const myMonster = fromPlayer.caught[trade.myIndex];
    const theirMonster = toPlayer.caught[trade.theirIndex];

    if (!myMonster || !theirMonster) {
      delete data.pendingTrades[message.author.id];
      saveData(data);
      return message.reply("Trade failed. One of the monsters no longer exists.");
    }

    fromPlayer.caught[trade.myIndex] = theirMonster;
    toPlayer.caught[trade.theirIndex] = myMonster;

    delete data.pendingTrades[message.author.id];
    saveData(data);

    return message.reply(
      `🤝 Trade completed!\n` +
      `You traded **${theirMonster.name}** for **${myMonster.name}**.`
    );
  }

  if (command === "!declinetrade") {
    if (!data.pendingTrades[message.author.id]) return message.reply("You have no pending trades.");

    delete data.pendingTrades[message.author.id];
    saveData(data);

    return message.reply("❌ Trade declined.");
  }

  if (command.startsWith("!givemonster ")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can give monsters.");
    }

    const target = message.mentions.users.first();

    if (!target) return message.reply("Usage: `!givemonster @user Goblin`");

    const monsterName = content
      .replace(/!givemonster\s+<@!?\d+>\s*/i, "")
      .trim();

    const allMonsters = [...monsters, ...eventMonsters, ...ultraRareMonsters];

    const match = allMonsters.find(m =>
      m.name.toLowerCase() === monsterName.toLowerCase() ||
      m.name.replace(/[🎆🇺🇸🦅🌌🐉🔥❄️⚡👻🌳🌠]/gu, "").trim().toLowerCase() === monsterName.toLowerCase()
    );

    if (!match) return message.reply("Monster not found.");

    const targetPlayer = getPlayer(data, target.id);
    targetPlayer.caught.push({ ...match, shiny: false });
    targetPlayer.points += match.points;

    saveData(data);

    return message.reply(`✅ Gave **${match.name}** to ${target}.`);
  }

  if (command.startsWith("!removemonster ")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can remove monsters.");
    }

    const target = message.mentions.users.first();
    if (!target) {
      return message.reply("Usage: `!removemonster @user Monster Name [amount]`");
    }

    const remainder = content
      .replace(/!removemonster\s+<@!?\d+>\s*/i, "")
      .trim();

    const parts = remainder.split(/\s+/);
    const possibleAmount = parseInt(parts[parts.length - 1]);
    const amount = Number.isNaN(possibleAmount) ? 1 : possibleAmount;
    const monsterInput = Number.isNaN(possibleAmount)
      ? remainder
      : parts.slice(0, -1).join(" ");

    if (!monsterInput || amount <= 0) {
      return message.reply("Usage: `!removemonster @user Monster Name [amount]`");
    }

    const targetPlayer = getPlayer(data, target.id);
    const wanted = cleanMonsterName(monsterInput).toLowerCase();
    const matchingIndexes = [];

    for (let i = targetPlayer.caught.length - 1; i >= 0; i--) {
      if (cleanMonsterName(targetPlayer.caught[i].name).toLowerCase() === wanted) {
        matchingIndexes.push(i);
        if (matchingIndexes.length >= amount) break;
      }
    }

    if (matchingIndexes.length === 0) {
      return message.reply(`${target} does not have a monster named **${monsterInput}**.`);
    }

    let pointsRemoved = 0;
    const removedNames = [];

    for (const index of matchingIndexes) {
      const [removed] = targetPlayer.caught.splice(index, 1);
      pointsRemoved += Number(removed.points) || 0;
      removedNames.push(removed.name);
    }

    targetPlayer.points = Math.max(0, targetPlayer.points - pointsRemoved);
    saveData(data);

    return message.reply(
      `🗑️ Removed **${removedNames.length}** ${cleanMonsterName(monsterInput)} monster${removedNames.length === 1 ? "" : "s"} from ${target}.\n` +
      `Removed **${pointsRemoved} points** connected to those catches.`
    );
  }

  if (command === "!monsterrules" || command === "!rules") {
    return message.reply(
      `🐉 **MONSTER COLLECTOR CHALLENGE RULES**\n\n` +
      `Use \`!hunt\` to find a monster.\n` +
      `The bot will show numbered catch choices. Reply with a number to immediately attempt the catch.\n` +
      `Only capture items you currently own will be shown.\n\n` +
      `⏳ You can hunt once every **2 hours**.\n\n` +
      `**Points:**\n` +
      `Common = 1\nRare = 3\nEpic = 5\nLegendary = 10\nMythic = 25\nSecret = 100\nEvent = varies\n✨ Shiny = +10 bonus\n\n` +
      `🎯 Complete daily quests with \`!daily\` and claim rewards with \`!claimdaily\`.\n` +
      `🎁 Claim daily login rewards with \`!dailyreward\`.\n` +
      `🪤 Bait improves the rarity of your next encounter. Use \`!usebait rare\`, \`!usebait epic\`, or \`!usebait legendary\`.\n` +
      `🎒 Capture items improve catch chance after a monster appears. View them with \`!captureitems\`.\n` +
      `📚 Repeated encounters build species knowledge: 3 = +5%, 5 = +10%, 10 = +15%, and 20 = +20%.\n` +
      `🤝 Trade monsters with \`!trade @user your# their#\`.\n` +
      `🌌 Join active Ultra Rare events with \`!ultrahunt\` every 5 minutes.\n` +
      `💎 View Relics with \`!relics\` and sacrifice one with \`!summon relic name\`.\n` +
      `🎉 Check events with \`!events\`.\n` +
      `🔔 Use \`!monsternotify on\` for hunt reminders.\n\n` +
      `Unlock titles with achievements and climb the leaderboard!`
    );
  }

  if (command === "!resetseason") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can reset the season.");
    }

    for (const playerData of Object.values(data.players)) {
      playerData.points = 0;
      playerData.currentMonster = null;
      playerData.lastHunt = 0;
      playerData.dailyQuests = [];
      playerData.dailyClaimed = false;
      playerData.lastDaily = null;
      playerData.huntCount = 0;
      playerData.dailyReward = 0;
      playerData.activeBait = null;
    }
    data.pendingTrades = {};
    data.ultraRareState = null;
    saveData(data);

    return message.reply(
      `🔄 **Monster Collector season has been reset!**\n` +
      `Leaderboard points and seasonal timers were reset. Monster collections, shinies, knowledge, items, Relics, titles, and hidden world progress were preserved.`
    );
  }
if (command.startsWith("!givepoints ")) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("Only admins can give points.");
  }

  const target = message.mentions.users.first();
  const amount = parseInt(content.split(/\s+/)[2]);

  if (!target || Number.isNaN(amount)) {
    return message.reply("Usage: `!givepoints @user 100`");
  }

  const targetPlayer = getPlayer(data, target.id);
  targetPlayer.points += amount;

  saveData(data);

  return message.reply(`✅ Gave **${amount} points** to ${target}.`);
}
  if (command.startsWith("!giverelic ")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can give Relics.");
    }

    const target = message.mentions.users.first();
    const withoutCommandAndMention = content
      .replace(/!giverelic\s+<@!?\d+>\s*/i, "")
      .trim();
    const parts = withoutCommandAndMention.split(/\s+/);
    const possibleAmount = parseInt(parts[parts.length - 1]);
    const amount = Number.isNaN(possibleAmount) ? 1 : possibleAmount;
    const relicInput = Number.isNaN(possibleAmount)
      ? withoutCommandAndMention
      : parts.slice(0, -1).join(" ");
    const monster = getUltraMonster(relicInput);

    if (!target || !monster || monster.relicCommand.toLowerCase() !== relicInput.toLowerCase() || amount <= 0) {
      return message.reply("Usage: `!giverelic @user abyssal ink 1`");
    }

    const targetPlayer = getPlayer(data, target.id);
    targetPlayer.relics[monster.relicKey] += amount;
    saveData(data);

    return message.reply(`✅ Gave **${amount} ${monster.relicName}** to ${target}.`);
  }

  if (command.startsWith("!givecapture ")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can give capture items.");
    }

    const target = message.mentions.users.first();
    const args = content.split(/\s+/);
    const itemKey = resolveCaptureItem(args[2] || "");
    const amount = parseInt(args[3]);

    if (!target || !itemKey || Number.isNaN(amount) || amount <= 0) {
      return message.reply("Usage: `!givecapture @user berry/honey/net/master amount`");
    }

    const targetPlayer = getPlayer(data, target.id);
    targetPlayer.captureItems[itemKey] += amount;

    saveData(data);

    return message.reply(
      `✅ Gave **${amount} ${CAPTURE_ITEMS[itemKey].name}** to ${target}.`
    );
  }

  if (command.startsWith("!givebait ")) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("Only admins can give bait.");
  }

  const target = message.mentions.users.first();
  const args = content.split(/\s+/);
  const baitType = args[2]?.toLowerCase();
  const amount = parseInt(args[3]);

  if (!target || !["rare", "epic", "legendary"].includes(baitType) || Number.isNaN(amount)) {
    return message.reply("Usage: `!givebait @user rare 3`");
  }

  const targetPlayer = getPlayer(data, target.id);
  targetPlayer.bait[baitType] += amount;

  saveData(data);

  return message.reply(`✅ Gave **${amount} ${baitType} bait** to ${target}.`);
}
  if (command === "!rebuildhistory2") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("Only admins can use this command.");
  }

  await message.reply("🔄 Starting full recovery scan. This may take a minute...");

  const oldData = loadData();
  fs.writeFileSync(
    `data-backup-${Date.now()}.json`,
    JSON.stringify(oldData, null, 2)
  );

  const rebuilt = {
    players: {},
    pendingTrades: {},
    ultraRareState: null,
    worldProgress: Object.fromEntries(RELIC_KEYS.map(key => [key, false])),
    worldShatterUnlocked: false
  };

  let recovered = 0;
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await message.channel.messages.fetch(options);
    if (messages.size === 0) break;

    for (const [, msg] of messages) {
      lastId = msg.id;

      if (msg.author.id !== client.user.id) continue;
      if (!msg.embeds || msg.embeds.length === 0) continue;

      const embed = msg.embeds[0];
      if (!embed.title || !embed.title.startsWith("✅ You caught")) continue;
      if (!msg.reference?.messageId) continue;

      const original = await message.channel.messages
        .fetch(msg.reference.messageId)
        .catch(() => null);

      if (!original || original.author.bot) continue;

      const userId = original.author.id;

      if (!rebuilt.players[userId]) {
        rebuilt.players[userId] = {
          points: 0,
          caught: [],
          currentMonster: null,
          lastHunt: 0,
          title: null,
          dailyQuests: [],
          dailyClaimed: false,
          lastDaily: null,
          huntCount: 0,
          dailyReward: 0,
          bait: {
            rare: 0,
            epic: 0,
            legendary: 0
          },
          activeBait: null,
          knowledge: {},
          captureItems: {
            berry: 0,
            honey: 0,
            net: 0,
            masterCharm: 0
          },
          relics: {
            abyssalInk: 0,
            ancientDragonScale: 0,
            phoenixFeather: 0,
            frozenCore: 0,
            stormCrystal: 0,
            shadowEssence: 0,
            heartwoodSeed: 0,
            starFeather: 0
          }
        };
      }

      const player = rebuilt.players[userId];

      const monsterName = embed.title
        .replace("✅ You caught ", "")
        .replace("!", "")
        .trim();

      const description = embed.description || "";

      const rarityMatch = description.match(/\*\*Rarity:\*\*\s(.+)/);
      const pointsMatch = description.match(/\*\*\+(\d+)\spoints/);

      const rarity = rarityMatch ? rarityMatch[1].trim() : "Common";
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;

      const isShiny = monsterName.includes("Shiny");

      player.points += points;

      player.caught.push({
        name: monsterName,
        rarity,
        points,
        shiny: isShiny
      });

      const rareBaitMatches = description.match(/1 Rare Bait/g) || [];
      const epicBaitMatches = description.match(/1 Epic Bait/g) || [];
      const legendaryBaitMatches = description.match(/1 Legendary Bait/g) || [];

      player.bait.rare += rareBaitMatches.length;
      player.bait.epic += epicBaitMatches.length;
      player.bait.legendary += legendaryBaitMatches.length;

      recovered++;
    }

    if (messages.size < 100) break;
  }

  for (const [, player] of Object.entries(rebuilt.players)) {
    const unlocked = unlockedAchievements(player);
    if (unlocked.length > 0) {
      player.title = unlocked[unlocked.length - 1];
    }
  }

  saveData(rebuilt);

  return message.channel.send(
    `✅ **Full recovery complete!**\n` +
    `Recovered **${recovered} caught monsters** from channel history.\n\n` +
    `A backup of the current data was created before replacing it.`
  );
}
  if (command === "!rebuildhistory3") {
  if (
    !message.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  ) {
    return message.reply(
      "Only admins can use this command."
    );
  }

  await message.reply(
    "🔄 Starting full recovery scan. This may take a few minutes..."
  );

  const rebuilt = {
    players: {},
    pendingTrades: {},
    ultraRareState: null,
    worldProgress: Object.fromEntries(RELIC_KEYS.map(key => [key, false])),
    worldShatterUnlocked: false
  };

  let recoveredCatches = 0;
  let recoveredDailyPoints = 0;
  let recoveredQuestPoints = 0;

  let lastId = null;

  while (true) {
    const options = {
      limit: 100
    };

    if (lastId) {
      options.before = lastId;
    }

    const messages =
      await message.channel.messages.fetch(
        options
      );

    if (messages.size === 0) break;

    for (const [, msg] of messages) {
      lastId = msg.id;

      if (
        msg.author.id !== client.user.id
      ) {
        continue;
      }

      if (
        !msg.reference?.messageId
      ) {
        continue;
      }

      const original =
        await message.channel.messages
          .fetch(msg.reference.messageId)
          .catch(() => null);

      if (
        !original ||
        original.author.bot
      ) {
        continue;
      }

      const userId =
        original.author.id;

      if (
        !rebuilt.players[userId]
      ) {
        rebuilt.players[userId] = {
          points: 0,
          caught: [],
          currentMonster: null,
          lastHunt: 0,
          title: null,
          dailyQuests: [],
          dailyClaimed: false,
          lastDaily: null,
          huntCount: 0,
          dailyReward: 0,
          bait: {
            rare: 0,
            epic: 0,
            legendary: 0
          },
          activeBait: null,
          knowledge: {},
          captureItems: {
            berry: 0,
            honey: 0,
            net: 0,
            masterCharm: 0
          },
          relics: {
            abyssalInk: 0,
            ancientDragonScale: 0,
            phoenixFeather: 0,
            frozenCore: 0,
            stormCrystal: 0,
            shadowEssence: 0,
            heartwoodSeed: 0,
            starFeather: 0
          }
        };
      }

      const player =
        rebuilt.players[userId];

      let text = "";

      if (
        msg.embeds.length > 0
      ) {
        const embed =
          msg.embeds[0];

        text =
          `${embed.title || ""}\n${embed.description || ""}`;
      } else {
        text =
          msg.content || "";
      }

      //
      // RECOVER MONSTER CATCHES
      //
      if (
        text.includes(
          "✅ You caught"
        )
      ) {
        const embed =
          msg.embeds[0];

        const monsterName =
          embed.title
            .replace(
              "✅ You caught ",
              ""
            )
            .replace(
              "!",
              ""
            )
            .trim();

        const description =
          embed.description || "";

        const rarityMatch =
          description.match(
            /\*\*Rarity:\*\*\s(.+)/
          );

        const pointsMatch =
          description.match(
            /\*\*\+(\d+)\spoints/
          );

        const rarity =
          rarityMatch
            ? rarityMatch[1].trim()
            : "Common";

        const points =
          pointsMatch
            ? parseInt(
                pointsMatch[1]
              )
            : 0;

        player.points +=
          points;

        player.caught.push({
          name: monsterName,
          rarity,
          points,
          shiny:
            monsterName.includes(
              "Shiny"
            )
        });

        const rare =
          description.match(
            /1 Rare Bait/g
          ) || [];

        const epic =
          description.match(
            /1 Epic Bait/g
          ) || [];

        const legendary =
          description.match(
            /1 Legendary Bait/g
          ) || [];

        player.bait.rare +=
          rare.length;

        player.bait.epic +=
          epic.length;

        player.bait.legendary +=
          legendary.length;

        recoveredCatches++;
      }

      //
      // RECOVER DAILY REWARDS
      //
      if (
        text.includes(
          "🎁 Daily Reward!"
        )
      ) {
        const pointsMatch =
          text.match(
            /\+(\d+)\sPoints/
          );

        if (pointsMatch) {
          const points =
            parseInt(
              pointsMatch[1]
            );

          player.points +=
            points;

          recoveredDailyPoints +=
            points;
        }

        if (
          text.includes(
            "Rare Bait"
          )
        ) {
          player.bait.rare++;
        }

        if (
          text.includes(
            "Epic Bait"
          )
        ) {
          player.bait.epic++;
        }

        if (
          text.includes(
            "Legendary Bait"
          )
        ) {
          player.bait.legendary++;
        }
      }

      //
      // RECOVER DAILY QUEST CLAIMS
      //
      if (
        text.includes(
          "Daily quests complete!"
        )
      ) {
        const pointsMatch =
          text.match(
            /\+(\d+) bonus points/
          );

        if (pointsMatch) {
          const points =
            parseInt(
              pointsMatch[1]
            );

          player.points +=
            points;

          recoveredQuestPoints +=
            points;
        }

        const rare =
          text.match(
            /1 Rare Bait/g
          ) || [];

        const epic =
          text.match(
            /1 Epic Bait/g
          ) || [];

        const legendary =
          text.match(
            /1 Legendary Bait/g
          ) || [];

        player.bait.rare +=
          rare.length;

        player.bait.epic +=
          epic.length;

        player.bait.legendary +=
          legendary.length;
      }
    }

    if (
      messages.size < 100
    ) {
      break;
    }
  }

  //
  // RECALCULATE TITLES
  //
  for (const [, player] of Object.entries(
    rebuilt.players
  )) {
    const unlocked =
      unlockedAchievements(
        player
      );

    if (
      unlocked.length > 0
    ) {
      player.title =
        unlocked[
          unlocked.length - 1
        ];
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIRECTORY, "recovered-data.json"),
    JSON.stringify(
      rebuilt,
      null,
      2
    )
  );

  return message.channel.send(
    `✅ Recovery complete!\n\n` +
      `Recovered Catches: ${recoveredCatches}\n` +
      `Recovered Daily Points: ${recoveredDailyPoints}\n` +
      `Recovered Quest Points: ${recoveredQuestPoints}\n\n` +
      `A file called recovered-data.json has been created. Review it before replacing data.json.`
  );
}
  if (command === "!downloadrecovery") {
  return message.channel.send({
    files: [path.join(DATA_DIRECTORY, "recovered-data.json")]
  });
}
  if (command === "!monsterhelp") {
    return message.reply(
      `🐉 **Monster Collector Commands**\n\n` +
      `\`!givepoints @user amount\` — Admin only\n` +
      `\`!givebait @user rare/epic/legendary amount\` — Admin only\n` +
      `\`!givecapture @user berry/honey/net/master amount\` — Admin only\n` +
      `\`!hunt\` — Find a monster and receive numbered catch choices\n` +
      `\`!ultrahunt\` — Attempt the active Ultra Rare Hunt every 5 minutes\n` +
      `\`!ultrastatus\` — Admin only: view the active event and hidden world progress\n` +
      `\`!endultra\` — Admin only: end the current or scheduled Ultra Rare Hunt\n` +
      `\`!ultraclear\` — Admin only: hard-clear event state and overdue automatic spawns\n` +
      `\`!inventory\` / \`!relics\` — View bait, capture items, and Relics\n` +
      `\`!summon relic name\` — Sacrifice a Relic to summon its matching Ultra Rare\n` +
      `Reply with the shown number — Immediately attempt the catch\n` +
      `The old \`!catch\` command is retired. Use the numbered choices after \`!hunt\`.\n` +
      `\`!rebuildhistory2\` — Admin recovery scan\n` +
      `\`!daily\` — View daily quests\n` +
      `\`!claimdaily\` — Claim daily quest rewards\n` +
      `\`!dailyreward\` — Claim your daily login reward\n` +
      `\`!bait\` — View your bait inventory\n` +
      `\`!captureitems\` / \`!items\` / \`!item\` — View capture items\n` +
      `\`!knowledge\` — View all species knowledge\n` +
      `\`!knowledge Monster Name\` — View knowledge for one monster\n` +
      `\`!usebait rare\` — Use Rare Bait\n` +
      `\`!usebait epic\` — Use Epic Bait\n` +
      `\`!usebait legendary\` — Use Legendary Bait\n` +
      `\`!events\` — View today's special event\n` +
      `\`!collection\` — View your monsters\n` +
      `\`!leaderboard\` — View rankings\n` +
      `\`!achievements\` — View achievements\n` +
      `\`!title\` — View titles\n` +
      `\`!title Title Name\` — Equip a title\n` +
      `\`!dex\` — View the Monster Dex\n` +
      `\`!dex Monster Name\` — View monster details\n` +
      `\`!trade @user your# their#\` — Offer a trade\n` +
      `\`!accepttrade\` — Accept incoming trade\n` +
      `\`!declinetrade\` — Decline incoming trade\n` +
      `\`!monsternotify on\` — Enable hunt reminders\n` +
      `\`!monsternotify off\` — Disable hunt reminders\n` +
      `\`!testreminder\` — Admin only\n` +
      `\`!startultra Monster Name\` — Admin only; starts an Ultra Rare Hunt\n` +
      `\`!givemonster @user MonsterName\` — Admin only\n` +
      `\`!removemonster @user Monster Name [amount]\` — Admin only; removes catches and their points\n` +
      `\`!monsterrules\` — View rules\n` +
      `\`!resetseason\` — Admin only`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
