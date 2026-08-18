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
  ],
  // Give Discord REST requests more time before they are aborted.
  rest: {
    timeout: 30000
  }
});

// Prevent temporary Discord client/API errors from crashing the entire bot.
client.on("error", error => {
  console.error("Discord client error:", error);
});

// Helpful logging for Discord warnings without stopping the bot.
client.on("warn", warning => {
  console.warn("Discord client warning:", warning);
});

// Log REST rate limits so they can be diagnosed if Discord starts slowing requests.
client.rest.on("rateLimited", info => {
  console.warn("Discord REST rate limit:", info);
});

// Keep rejected async work from silently killing the process.
process.on("unhandledRejection", reason => {
  console.error("Unhandled Promise Rejection:", reason);
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

// ==================== SEASON 2 QUALITY-OF-LIFE OVERHAUL ====================
const FETCH_COOLDOWN = 2 * 60 * 60 * 1000;
const FETCH_DURATION = 10 * 60 * 1000;
const FETCH_COMPANION_XP = 5;
const ABILITY_XP_PER_HUNT = 5;
const ABILITY_XP_PER_FETCH = 5;
const WEEKLY_COMPETITION_START_AT = Date.UTC(2026, 7, 10, 11, 0, 0); // Aug 10, 2026, 5:00 AM Mountain Daylight Time
const WEEKLY_WINNER_BAIT_REWARD = 1;
const PERFECT_CATCH_TITLE = "Perfectly Executed";
const CRITICAL_CATCH_TITLE = "Against All Odds";
const CRITICAL_CATCH_BONUS_POINTS = 10;
const PET_COMBINE_XP = { Common: 50, Rare: 75, Epic: 125, Legendary: 200 };
const PET_INHERIT_CHANCE = { Common: 15, Rare: 20, Epic: 25, Legendary: 30 };
const PET_XP_BASE = { Common: 50, Rare: 65, Epic: 80, Legendary: 100 };
const PET_ABILITY_COMBINE_XP = { Common: 25, Rare: 40, Epic: 65, Legendary: 100 };
const HATCH_SACRIFICE_WINDOW = 5 * 60 * 1000;

// ==================== DAILY QUEST REROLLS ====================
const DAILY_FREE_REROLLS = 1;
const DAILY_MAX_REROLLS = 2;
const DAILY_SECOND_REROLL_BERRY_COST = 1;

// ==================== HIDDEN COMMUNITY WORLD PROGRESS ====================
// These thresholds are intentionally ADMIN-ONLY. Do not expose them in player help/announcements.
const COMMUNITY_WORLD_THRESHOLDS = [3000, 5000, 7500, 10000, 15000];
const FETCH_WORLD_RELIC_CHANCE = 0.35; // 0.35% per completed Fetch, only while undiscovered Relics remain.
const COMMUNITY_BLESSING_DURATION = 24 * 60 * 60 * 1000;

const COMMUNITY_BLESSINGS = {
  fragmentOfOblivion: {
    name: "Oblivion's Fortune",
    icon: "🌑",
    type: "points",
    description: "+25% Hunter Points",
    pointMultiplier: 1.25
  },
  livingEye: {
    name: "All-Seeing Favor",
    icon: "👁️",
    type: "shiny",
    description: "Increased Shiny Chance",
    shinyBonus: 5
  },
  distortedHourglass: {
    name: "Time's Mercy",
    icon: "⌛",
    type: "cooldown",
    description: "30-minute reduction to normal !hunt cooldowns",
    cooldownReductionMs: 30 * 60 * 1000
  },
  fallenStarCore: {
    name: "Starborn Nests",
    icon: "⭐",
    type: "eggs",
    description: "Increased Egg Discovery",
    eggBonus: 8
  },
  soulEmber: {
    name: "Ember of Fortune",
    icon: "🔥",
    type: "fetch",
    description: "Improved Fetch Luck",
    fetchQualityBonus: 10
  }
};

const MIXER_MONSTER_ENCOUNTER_CHANCE = 0.25;
const MIXER_MONSTER = {
  key: "mixermonster",
  name: "🌌 Mixer Monster",
  habitat: "The Rift",
  rarity: "Mythic",
  points: 100,
  chance: 1,
  image: "mixer_monster.png",
  description: "A mysterious cosmic creature said to appear only to the luckiest hunters. It wanders between worlds collecting forgotten stories, enchanted dice, and legendary cards. Many hunters believe seeing one is a once-in-a-lifetime event.",
  secretAchievement: "Beyond the Rift",
  titleReward: "The Chosen Mixer"
};


// ==================== PET & EGG SYSTEM ====================
const EGG_DROP_CHANCES = {
  Common: 50,
  Rare: 30,
  Epic: 20,
  Legendary: 10
};
const PET_REACTION_CHANCE = 15;
const PET_AFFECTION_EVENT_CHANCE = 12;
const COMPANION_XP_PER_SUCCESSFUL_HUNT = 10;
const COMPANION_XP_AFFECTION_BONUS = 5;
const MAX_COMPANION_LEVEL = 25;
const MAX_PET_BOND_LEVEL = 5;

const EGG_TYPES = {
  Common: { icon: "🥚", incubationMs: 30 * 60 * 1000 },
  Rare: { icon: "🔵", incubationMs: 1 * 60 * 60 * 1000 },
  Epic: { icon: "🟣", incubationMs: 2 * 60 * 60 * 1000 },
  Legendary: { icon: "🟡", incubationMs: 4 * 60 * 60 * 1000 }
};

const DISTORTION_HUNT_COOLDOWN = 30 * 60 * 1000;
const DISTORTION_DURATION = 3 * 60 * 60 * 1000;
const DISTORTION_EVENT_MONSTER_CHANCE = 60;
const DISTORTION_EGG_DROP_CHANCE = 40;
const DISTORTION_EVENTS_PER_WEEK = 4;
const DISTORTION_WARNING_MINUTES = 5;
const DISTORTION_FINAL_RESET_MINUTES = 10;
const UNMADE_REPLACEMENT_CHANCE = 3;

// ==================== WORLD STORY / WORLD SHATTER ====================
const WORLD_EVENT_FEED_CHANNEL_ID = "1521536122239586456";
const WORLD_SHATTER_HUNT_COOLDOWN = 10 * 60 * 1000;
const WORLD_SHATTER_COLLISION_DURATION = 20 * 60 * 1000;
const WORLD_SHATTER_STABILIZE_MAX_DURATION = 2 * 60 * 60 * 1000;
const WORLD_SHATTER_UNMADE_DURATION = 30 * 60 * 1000;
const WORLD_SHATTER_BOSS_DURATION = 45 * 60 * 1000;
const WORLD_SHATTER_BOSS_COOLDOWN = 2 * 60 * 1000;
const ARCHITECT_IMAGE = "architect_of_nothing.png";
const WORLD_SHATTER_VICTORY_UNMADE_CHANCE = 3;
const WORLD_SHATTER_FAILURE_UNMADE_CHANCE = 10;
const WORLD_SHATTER_PARTICIPATION_POINTS = 100;
const WORLD_SHATTER_REMATCH_MIN_DELAY = 48 * 60 * 60 * 1000;
const WORLD_SHATTER_STABILITY_GOAL = 10;
const WORLD_SHATTER_IMPOSSIBLE_EGG_CHANCE = 12;
const WORLD_SHATTER_MIN_NOTICE = 24 * 60 * 60 * 1000;
const WORLD_SHATTER_START_GRACE_MS = 10 * 60 * 1000;
const WORLD_STORY_PROCESS_BOOT_AT = Date.now();
const WORLD_KNOWN_DISTORTION_KEYS = ["infernal","frost","arcane","hollow","astral"];

// Startup safety: automatic Distortions never catch up events that were already due before this process started.
const DISTORTION_PROCESS_BOOT_AT = Date.now();
const DISTORTION_START_GRACE_MS = 2 * 60 * 1000;

const DISTORTION_EGGS = {
  scorched_rift: { name: "Scorched Rift Egg", icon: "🔥🥚", plane: "infernal", incubationMs: 2 * 60 * 60 * 1000, image: "scorched_rift_egg.png", hatchingImage: "scorched_rift_hatching.png", pets: [{ key: "ember_imp", weight: 70 }, { key: "ashbound_familiar", weight: 30 }] },
  shardbound: { name: "Shardbound Egg", icon: "❄️🥚", plane: "frost", incubationMs: 2 * 60 * 60 * 1000, image: "shardbound_egg.png", hatchingImage: "shardbound_hatching.png", pets: [{ key: "frost_mephit", weight: 70 }, { key: "rime_sprite", weight: 30 }] },
  drowned_rune: { name: "Drowned Rune Egg", icon: "🌊🥚", plane: "arcane", incubationMs: 2 * 60 * 60 * 1000, image: "drowned_rune_egg.png", hatchingImage: "drowned_rune_hatching.png", pets: [{ key: "runeclaw_familiar", weight: 70 }, { key: "glyph_wisp", weight: 30 }] },
  soulbound: { name: "Soulbound Egg", icon: "👻🥚", plane: "hollow", incubationMs: 2 * 60 * 60 * 1000, image: "soulbound_egg.png", hatchingImage: "soulbound_hatching.png", pets: [{ key: "bone_familiar", weight: 70 }, { key: "veilkin", weight: 30 }] },
  paradox: { name: "Paradox Egg", icon: "🌌🥚", plane: "astral", incubationMs: 2 * 60 * 60 * 1000, image: "paradox_egg.png", hatchingImage: "paradox_hatching.png", pets: [{ key: "star_familiar", weight: 70 }, { key: "paradox_imp", weight: 30 }] },
  impossible: { name: "??? Egg", trueName: "The Impossible Egg", icon: "❓🥚", plane: "unmade", incubationMs: 4 * 60 * 60 * 1000, image: "impossible_egg.png", hatchingImage: null, pets: [{ key: "mimicling", weight: 70 }, { key: "the_unwritten", weight: 30 }] }
};

const DISTORTIONS = {
  infernal: {
    name: "The Infernal Rift", icon: "🔥", eggKey: "scorched_rift",
    openingImage: "infernal_rift_opening.png", closingImage: "infernal_rift_closing.png",
    monsters: [
      { name: "Cinderkin", habitat: "Infernal Rift", rarity: "Common", points: 3, chance: 75, image: "cinderkin.png" },
      { name: "Brimstone Mauler", habitat: "Infernal Rift", rarity: "Rare", points: 5, chance: 50, image: "brimstone_mauler.png" },
      { name: "Ashfang Ravager", habitat: "Infernal Rift", rarity: "Rare", points: 5, chance: 45, image: "ashfang_ravager.png" },
      { name: "Furnace Beholder", habitat: "Infernal Rift", rarity: "Epic", points: 8, chance: 28, image: "furnace_beholder.png" },
      { name: "Dreadflame Tyrant", habitat: "Infernal Rift", rarity: "Legendary", points: 15, chance: 10, image: "dreadflame_tyrant.png" }
    ]
  },
  frost: {
    name: "The Shattered Frost", icon: "❄️", eggKey: "shardbound",
    openingImage: "shattered_frost_opening.png", closingImage: "shattered_frost_closing.png",
    monsters: [
      { name: "Shardling", habitat: "Shattered Frost", rarity: "Common", points: 3, chance: 75, image: "shardling.png" },
      { name: "Frostgaze Watcher", habitat: "Shattered Frost", rarity: "Rare", points: 5, chance: 50, image: "frostgaze_watcher.png" },
      { name: "Rimeclaw Horror", habitat: "Shattered Frost", rarity: "Rare", points: 5, chance: 45, image: "rimeclaw_horror.png" },
      { name: "Glacial Runegolem", habitat: "Shattered Frost", rarity: "Epic", points: 8, chance: 28, image: "glacial_runegolem.png" },
      { name: "Aurora Wyrm", habitat: "Shattered Frost", rarity: "Legendary", points: 15, chance: 10, image: "aurora_wyrm.png" }
    ]
  },
  arcane: {
    name: "The Sunken Arcane", icon: "🌊", eggKey: "drowned_rune",
    openingImage: "sunken_arcane_opening.png", closingImage: "sunken_arcane_closing.png",
    monsters: [
      { name: "Glimmerglob", habitat: "Sunken Arcane", rarity: "Common", points: 3, chance: 75, image: "glimmerglob.png" },
      { name: "Runespine Crawler", habitat: "Sunken Arcane", rarity: "Rare", points: 5, chance: 50, image: "runespine_crawler.png" },
      { name: "Drownveil Phantom", habitat: "Sunken Arcane", rarity: "Rare", points: 5, chance: 45, image: "drownveil_phantom.png" },
      { name: "Abyssal Oracle", habitat: "Sunken Arcane", rarity: "Epic", points: 8, chance: 28, image: "abyssal_oracle.png" },
      { name: "Leviathan of the Deep Rune", habitat: "Sunken Arcane", rarity: "Legendary", points: 15, chance: 10, image: "deep_rune_leviathan.png" }
    ]
  },
  hollow: {
    name: "The Hollow Veil", icon: "👻", eggKey: "soulbound",
    openingImage: "hollow_veil_opening.png", closingImage: "hollow_veil_closing.png",
    monsters: [
      { name: "Skitterbone", habitat: "Hollow Veil", rarity: "Common", points: 3, chance: 75, image: "skitterbone.png" },
      { name: "Lantern Wretch", habitat: "Hollow Veil", rarity: "Rare", points: 5, chance: 50, image: "lantern_wretch.png" },
      { name: "Gravebound Sentinel", habitat: "Hollow Veil", rarity: "Rare", points: 5, chance: 45, image: "gravebound_sentinel.png" },
      { name: "Memory Eater", habitat: "Hollow Veil", rarity: "Epic", points: 8, chance: 28, image: "memory_eater.png" },
      { name: "The Hollow Sovereign", habitat: "Hollow Veil", rarity: "Legendary", points: 15, chance: 10, image: "hollow_sovereign.png" }
    ]
  },
  astral: {
    name: "The Astral Fracture", icon: "🌌", eggKey: "paradox",
    openingImage: "astral_fracture_opening.png", closingImage: "astral_fracture_closing.png",
    monsters: [
      { name: "Orbitling", habitat: "Astral Fracture", rarity: "Common", points: 3, chance: 75, image: "orbitling.png" },
      { name: "Voidstepper", habitat: "Astral Fracture", rarity: "Rare", points: 5, chance: 50, image: "voidstepper.png" },
      { name: "Constellation Weaver", habitat: "Astral Fracture", rarity: "Rare", points: 5, chance: 45, image: "constellation_weaver.png" },
      { name: "Paradox Watcher", habitat: "Astral Fracture", rarity: "Epic", points: 8, chance: 28, image: "paradox_watcher.png" },
      { name: "The Starless One", habitat: "Astral Fracture", rarity: "Legendary", points: 15, chance: 10, image: "starless_one.png" }
    ]
  },
  unmade: {
    name: "UNKNOWN DISTORTION", icon: "🕳️", eggKey: "impossible",
    openingImage: "unmade_opening.png", closingImage: null, secret: true,
    monsters: [
      { name: "The Misplaced", habitat: "The Unmade", rarity: "???", points: 8, chance: 55, image: "the_misplaced.png" },
      { name: "Stitchmaw", habitat: "The Unmade", rarity: "???", points: 10, chance: 40, image: "stitchmaw.png" },
      { name: "The Empty Knight", habitat: "The Unmade", rarity: "???", points: 12, chance: 30, image: "empty_knight.png" },
      { name: "The Forgotten", habitat: "The Unmade", rarity: "???", points: 18, chance: 15, image: "the_forgotten.png" },
      { name: "NULL", habitat: "The Unmade", rarity: "UNKNOWN", points: 30, chance: 5, image: "null.png" }
    ]
  }
};

const MAX_INCUBATORS = 5;
const POINTS_PER_INCUBATOR = 100;
const HATCH_POINT_REWARDS = {
  Common: 2,
  Rare: 5,
  Epic: 10,
  Legendary: 20
};
const NEW_PET_SPECIES_BONUS = 5;

const PET_PERSONALITIES = ["Cheerful", "Curious", "Loyal", "Mischievous", "Sleepy", "Brave"];

const pets = [
  // 🌲 FOREST
  { key: "briar_pup", name: "Briar Pup", icon: "🌿", habitat: "Forest", rarity: "Common", ability: "capture", baseBonus: 1, description: "Slightly increases normal monster capture chance." },
  { key: "myceling", name: "Myceling", icon: "🍄", habitat: "Forest", rarity: "Rare", ability: "eggFinder", baseBonus: 2, description: "Increases the chance to discover eggs." },
  { key: "rootling_guardian", name: "Rootling Guardian", icon: "🌳", habitat: "Forest", rarity: "Epic", ability: "itemFinder", baseBonus: 6, description: "Finds useful hunting supplies after successful hunts." },
  { key: "verdant_sentinel", name: "Verdant Sentinel", icon: "🦉", habitat: "Forest", rarity: "Legendary", ability: "shiny", baseBonus: 3, description: "Greatly increases shiny monster odds." },

  // 🌊 OCEAN
  { key: "reef_snapper", name: "Reef Snapper", icon: "🪸", habitat: "Ocean", rarity: "Common", ability: "points", baseBonus: 2, description: "Earns bonus points from successful hunts." },
  { key: "abyss_prowler", name: "Abyss Prowler", icon: "🌊", habitat: "Ocean", rarity: "Rare", ability: "cooldown", baseBonus: 2, description: "Reduces the normal hunt cooldown." },
  { key: "inkfiend_hatchling", name: "Inkfiend Hatchling", icon: "🦑", habitat: "Ocean", rarity: "Epic", ability: "itemFinder", baseBonus: 7, description: "Frequently finds useful hunting supplies." },
  { key: "leviacub", name: "Leviacub", icon: "🐉", habitat: "Ocean", rarity: "Legendary", ability: "points", baseBonus: 6, description: "Earns a large point bonus from successful hunts." },

  // 🏔️ MOUNTAIN
  { key: "pebble_maw", name: "Pebble Maw", icon: "🪨", habitat: "Mountain", rarity: "Common", ability: "itemFinder", baseBonus: 3, description: "Occasionally finds capture items after successful hunts." },
  { key: "crystal_burrower", name: "Crystal Burrower", icon: "💎", habitat: "Mountain", rarity: "Rare", ability: "eggFinder", baseBonus: 2, description: "Increases the chance to discover eggs." },
  { key: "ironhide_cub", name: "Ironhide Cub", icon: "🦍", habitat: "Mountain", rarity: "Epic", ability: "capture", baseBonus: 2, description: "Increases normal monster capture chance." },
  { key: "titan_spawn", name: "Titan Spawn", icon: "⛰️", habitat: "Mountain", rarity: "Legendary", ability: "points", baseBonus: 7, description: "Earns a large point bonus from successful hunts." },

  // 🌋 VOLCANO
  { key: "cinderling", name: "Cinderling", icon: "🔥", habitat: "Volcano", rarity: "Common", ability: "points", baseBonus: 2, description: "Earns bonus points from successful hunts." },
  { key: "ashfang", name: "Ashfang", icon: "🌋", habitat: "Volcano", rarity: "Rare", ability: "itemFinder", baseBonus: 5, description: "Finds useful items after successful hunts." },
  { key: "ember_drake", name: "Ember Drake", icon: "🐉", habitat: "Volcano", rarity: "Epic", ability: "eggFinder", baseBonus: 3, description: "Greatly increases the chance to discover eggs." },
  { key: "infernal_wyrmling", name: "Infernal Wyrmling", icon: "🌋", habitat: "Volcano", rarity: "Legendary", ability: "shiny", baseBonus: 3, description: "Greatly increases shiny monster odds." },

  // ❄️ ARCTIC
  { key: "ice_crawler", name: "Ice Crawler", icon: "❄️", habitat: "Arctic", rarity: "Common", ability: "cooldown", baseBonus: 1, description: "Slightly reduces the normal hunt cooldown." },
  { key: "frost_wretch", name: "Frost Wretch", icon: "🐺", habitat: "Arctic", rarity: "Rare", ability: "capture", baseBonus: 2, description: "Increases normal monster capture chance." },
  { key: "glacier_horror", name: "Glacier Horror", icon: "🐻", habitat: "Arctic", rarity: "Epic", ability: "points", baseBonus: 5, description: "Earns additional points from successful hunts." },
  { key: "white_tyrant_cub", name: "White Tyrant Cub", icon: "👑", habitat: "Arctic", rarity: "Legendary", ability: "capture", baseBonus: 4, description: "Greatly increases normal monster capture chance." },

  // 🌌 VOID
  { key: "living_eye", name: "Living Eye", icon: "👁️", habitat: "Void", rarity: "Common", ability: "eggFinder", baseBonus: 1, description: "Slightly increases the chance to discover eggs." },
  { key: "night_skitter", name: "Night Skitter", icon: "🕷️", habitat: "Void", rarity: "Rare", ability: "shiny", baseBonus: 1, description: "Slightly increases shiny monster odds." },
  { key: "void_watcher", name: "Void Watcher", icon: "🌌", habitat: "Void", rarity: "Epic", ability: "eggFinder", baseBonus: 3, description: "Greatly increases the chance to discover eggs." },
  { key: "astral_spawn", name: "Astral Spawn", icon: "🌠", habitat: "Void", rarity: "Legendary", ability: "shiny", baseBonus: 4, description: "Massively increases shiny monster odds." },

  // ☁️ SKY
  { key: "storm_imp", name: "Storm Imp", icon: "⚡", habitat: "Sky", rarity: "Common", ability: "itemFinder", baseBonus: 3, description: "Occasionally finds capture items after successful hunts." },
  { key: "cloud_ripper", name: "Cloud Ripper", icon: "☁️", habitat: "Sky", rarity: "Rare", ability: "cooldown", baseBonus: 3, description: "Reduces the normal hunt cooldown." },
  { key: "tempest_hatchling", name: "Tempest Hatchling", icon: "🌩️", habitat: "Sky", rarity: "Epic", ability: "capture", baseBonus: 3, description: "Greatly increases normal monster capture chance." },
  { key: "storm_emperor_cub", name: "Storm Emperor Cub", icon: "👑", habitat: "Sky", rarity: "Legendary", ability: "cooldown", baseBonus: 5, description: "Greatly reduces the normal hunt cooldown." },

  // 🪦 UNDEAD
  { key: "bone_gnawer", name: "Bone Gnawer", icon: "🦴", habitat: "Undead", rarity: "Common", ability: "points", baseBonus: 2, description: "Earns bonus points from successful hunts." },
  { key: "grave_whisper", name: "Grave Whisper", icon: "👻", habitat: "Undead", rarity: "Rare", ability: "eggFinder", baseBonus: 2, description: "Increases the chance to discover eggs." },
  { key: "crypt_fiend", name: "Crypt Fiend", icon: "⚔️", habitat: "Undead", rarity: "Epic", ability: "itemFinder", baseBonus: 7, description: "Frequently finds valuable hunting supplies." },
  { key: "hollow_prince", name: "Hollow Prince", icon: "👑", habitat: "Undead", rarity: "Legendary", ability: "points", baseBonus: 8, description: "Earns a massive point bonus from successful hunts." },

  // 🌀 WORLD DISTORTION COMPANIONS
  { key: "ember_imp", name: "Ember Imp", icon: "🔥", habitat: "Infernal Rift", rarity: "Rare", ability: "points", baseBonus: 4, signatureAbility: "kindled_hunt", signatureName: "Kindled Hunt", description: "A naturally tiny infernal familiar whose anger kindles the next capture after a failure.", image: "ember_imp.png" },
  { key: "ashbound_familiar", name: "Ashbound Familiar", icon: "🌋", habitat: "Infernal Rift", rarity: "Legendary", ability: "itemFinder", baseBonus: 9, signatureAbility: "from_the_ashes", signatureName: "From the Ashes", description: "A living ash-and-obsidian familiar that manifests rewards from the remains of successful hunts.", image: "ashbound_familiar.png" },
  { key: "frost_mephit", name: "Frost Mephit", icon: "❄️", habitat: "Shattered Frost", rarity: "Rare", ability: "cooldown", baseBonus: 3, signatureAbility: "frozen_time", signatureName: "Frozen Time", description: "A frost elemental familiar that periodically freezes the passage of time between hunts.", image: "frost_mephit.png" },
  { key: "rime_sprite", name: "Rime Sprite", icon: "💎", habitat: "Shattered Frost", rarity: "Legendary", ability: "shiny", baseBonus: 4, signatureAbility: "second_chance", signatureName: "Second Chance", description: "An ancient frost-fae spirit capable of freezing a fleeing monster long enough for fate to roll again.", image: "rime_sprite.png" },
  { key: "runeclaw_familiar", name: "Runeclaw Familiar", icon: "🔮", habitat: "Sunken Arcane", rarity: "Rare", ability: "eggFinder", baseBonus: 3, signatureAbility: "rune_reader", signatureName: "Rune Reader", description: "A rune-marked planar familiar that reads a creature’s true pattern and strengthens Species Knowledge.", image: "runeclaw_familiar.png" },
  { key: "glyph_wisp", name: "Glyph Wisp", icon: "🌀", habitat: "Sunken Arcane", rarity: "Legendary", ability: "capture", baseBonus: 4, signatureAbility: "arcane_duplication", signatureName: "Arcane Duplication", description: "A living arcane spell that can duplicate the magical signature of a newly discovered egg.", image: "glyph_wisp.png" },
  { key: "bone_familiar", name: "Bone Familiar", icon: "💀", habitat: "Hollow Veil", rarity: "Rare", ability: "itemFinder", baseBonus: 6, signatureAbility: "grave_scavenger", signatureName: "Grave Scavenger", description: "A mismatched undead familiar that periodically digs useful supplies from places best left undisturbed.", image: "bone_familiar.png" },
  { key: "veilkin", name: "Veilkin", icon: "👻", habitat: "Hollow Veil", rarity: "Legendary", ability: "cooldown", baseBonus: 5, signatureAbility: "veilwalk", signatureName: "Veilwalk", description: "A spectral companion that can pull a fleeing encounter halfway through the Veil and keep it from ending.", image: "veilkin.png" },
  { key: "star_familiar", name: "Star Familiar", icon: "✨", habitat: "Astral Fracture", rarity: "Rare", ability: "shiny", baseBonus: 2, signatureAbility: "written_in_the_stars", signatureName: "Written in the Stars", description: "A planar familiar that occasionally foresees a fortunate hunt before the monster even appears.", image: "star_familiar.png" },
  { key: "paradox_imp", name: "Paradox Imp", icon: "🌌", habitat: "Astral Fracture", rarity: "Legendary", ability: "eggFinder", baseBonus: 5, signatureAbility: "paradox", signatureName: "Paradox", description: "A reality-bending planar familiar that sometimes causes one successful capture to have happened twice.", image: "paradox_imp.png" },

  // 🕳️ SECRET UNMADE COMPANIONS
  { key: "mimicling", name: "Mimicling", icon: "🪨", habitat: "The Unmade", rarity: "Rare", ability: "itemFinder", baseBonus: 8, signatureAbility: "borrowed_talent", signatureName: "Borrowed Talent", description: "A shapeshifting dungeon familiar that sometimes steals another companion’s natural talent for a single hunt.", image: "mimicling.png", secret: true },
  { key: "the_unwritten", name: "The Unwritten", icon: "✒️", habitat: "The Unmade", rarity: "Legendary", ability: "capture", baseBonus: 5, signatureAbility: "this_wasnt_supposed_to_happen", signatureName: "THIS WASN’T SUPPOSED TO HAPPEN", description: "An unfinished planar familiar that can rewrite a successful hunt and create an encounter that was never supposed to exist.", image: "the_unwritten.png", secret: true }
];

const PET_COLLECTIONS = {
  Forest: { icon: "🌲", achievement: "Forest Companion Collection", title: "Forest Keeper" },
  Ocean: { icon: "🌊", achievement: "Ocean Companion Collection", title: "Tidecaller" },
  Mountain: { icon: "🏔️", achievement: "Mountain Companion Collection", title: "Peak Walker" },
  Volcano: { icon: "🌋", achievement: "Volcano Companion Collection", title: "Flamebound" },
  Arctic: { icon: "❄️", achievement: "Arctic Companion Collection", title: "Winter's Chosen" },
  Void: { icon: "🌌", achievement: "Void Companion Collection", title: "Void Touched" },
  Sky: { icon: "☁️", achievement: "Sky Companion Collection", title: "Storm Rider" },
  Undead: { icon: "🪦", achievement: "Undead Companion Collection", title: "Grave Warden" }
};

const GRAND_PET_COLLECTION_REWARD = {
  achievement: "Complete Companion Collection",
  title: "Master Beast Tamer",
  pointReward: 100,
  eggRarity: "Legendary",
  legendaryTitles: [
    "Warden of Every Habitat",
    "The Thirty-Twofold Bond",
    "Keeper of the Wild Covenant"
  ]
};

const LEGACY_PET_KEY_MIGRATION = {
  sproutling: "briar_pup",
  embercub: "cinderling",
  frostpup: "ice_crawler",
  tideotter: "reef_snapper",
  spiritfox: "myceling",
  mysticowl: "grave_whisper",
  direwolfpup: "frost_wretch",
  tinygolem: "pebble_maw",
  stormhatchling: "tempest_hatchling",
  ghostwisp: "void_watcher",
  reefdrake: "inkfiend_hatchling",
  voidling: "night_skitter",
  phoenixhatchling: "infernal_wyrmling",
  celestialdragonling: "astral_spawn",
  ancientguardian: "verdant_sentinel",
  minileviathan: "leviacub"
};

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
const MONSTER_CHANNEL_ID = "1533218205496115471";
const EGGS_PETS_CHANNEL_ID = "1539117649840046140";

// ==================== BIG GAME HUNT & TRAVELING MERCHANT ====================
// Official schedule: every Sunday, 12:00 PM-2:00 PM Mountain Time.
// All dates are evaluated in America/Denver so the event remains at noon through DST.
const BIG_GAME_TIMEZONE = "America/Denver";
const BIG_GAME_COOLDOWN = 30 * 60 * 1000;
const BIG_GAME_START_HOUR = 12;
const BIG_GAME_END_HOUR = 14;
const BIG_GAME_TOKEN_REWARDS = {
  Common: 1,
  Rare: 2,
  Epic: 4,
  Legendary: 8,
  Mythic: 15,
  "Ultra Rare": 15,
  Event: 4,
  Secret: 15
};
const BIG_GAME_PLACEMENT_REWARDS = [50, 30, 15];
const BIG_GAME_IMAGE = "big_game_hunt.png";
const BIG_GAME_AWARD_IMAGES = ["big_game_first.png", "big_game_second.png", "big_game_third.png"];

const MERCHANT_TYPE_DEFINITIONS = {
  aldric: { name: "Aldric, the Traveling Hunter", icon: "🧙", weight: 55, durationHours: 8, image: "merchant_arrival.png" },
  gribble: { name: "Gribble", icon: "🎲", weight: 20, durationHours: 6, image: "gribbles_gamble.png" },
  beastkeeper: { name: "The Beastkeeper", icon: "🐲", weight: 12, durationHours: 8, image: "beastkeeper.png" },
  pale_collector: { name: "The Pale Collector", icon: "👻", weight: 7, durationHours: 6, image: "pale_collector.png" },
  riftwalker: { name: "The Riftwalker", icon: "🌌", weight: 5, durationHours: 4, image: "riftwalker.png" },
  nameless: { name: "The Nameless Merchant", icon: "❓", weight: 1, durationHours: 2, image: "nameless_merchant.png" }
};

// Item behavior is intentionally data-driven. Add or rebalance stock here without
// rewriting the purchase command. "grant" sends supplies into the existing game
// inventory; other items live in merchantCollection until used or traded later.
const MERCHANT_ITEMS = {
  hunter_berry: { name: "Hunter Berry", icon: "🍓", image: "hunter_berry.png", price: 3, unlimited: true, kind: "supply", grant: { captureItem: "berry", amount: 1 }, description: "+10% capture item." },
  sticky_honey: { name: "Sticky Honey", icon: "🍯", image: "sticky_honey.png", price: 5, unlimited: true, kind: "supply", grant: { captureItem: "honey", amount: 1 }, description: "+20% capture item." },
  enchanted_net: { name: "Enchanted Net", icon: "🕸️", image: "enchanted_net.png", price: 8, unlimited: true, kind: "supply", grant: { captureItem: "net", amount: 1 }, description: "+30% capture item." },
  master_charm: { name: "Master Charm", icon: "🌟", image: "master_charm.png", price: 25, stock: 1, kind: "supply", grant: { captureItem: "masterCharm", amount: 1 }, description: "Guarantees one capture." },
  rare_bait: { name: "Rare Bait", icon: "🔵", image: "rare_bait.png", price: 4, unlimited: true, kind: "supply", grant: { bait: "rare", amount: 1 }, description: "Improves the next hunt's Rare odds." },
  epic_bait: { name: "Epic Bait", icon: "🟣", image: "epic_bait.png", price: 7, unlimited: true, kind: "supply", grant: { bait: "epic", amount: 1 }, description: "Improves the next hunt's Epic odds." },
  legendary_bait: { name: "Legendary Bait", icon: "🟠", image: "legendary_bait.png", price: 12, stock: 4, kind: "supply", grant: { bait: "legendary", amount: 1 }, description: "Improves the next hunt's Legendary odds." },
  hunters_compass: { name: "Hunter's Compass", icon: "🧭", image: "hunters_compass.png", price: 10, stock: 5, kind: "consumable", description: "Makes the next ordinary encounter Rare or better." },
  golden_lure: { name: "Golden Lure", icon: "🟡", image: "golden_lure.png", price: 15, stock: 3, kind: "consumable", description: "Makes the next ordinary encounter Legendary." },
  fresh_tracks: { name: "Fresh Tracks", icon: "🐾", image: "fresh_tracks.png", price: 8, stock: 5, kind: "consumable", description: "Immediately clears your normal hunt cooldown." },
  mystery_sack: { name: "Mystery Sack", icon: "🎒", image: "mystery_sack.png", price: 8, stock: 7, kind: "consumable", description: "Contains an unknown reward." },
  rusted_key: { name: "Rusted Key", icon: "🗝️", image: "rusted_key.png", price: 15, stock: 1, kind: "collectible", description: "Its lock and purpose are unknown." },
  strange_map: { name: "Strange Map", icon: "🗺️", image: "strange_map.png", price: 18, stock: 2, kind: "consumable", description: "Leads toward an unusually strong trail." },
  sealed_bottle: { name: "Sealed Bottle", icon: "🍾", image: "sealed_bottle.png", price: 12, stock: 3, kind: "consumable", description: "Something magical moves inside." },
  monster_whistle: { name: "Monster Whistle", icon: "📯", image: "monster_whistle.png", price: 20, stock: 2, kind: "collectible", description: "A distant creature sometimes answers it." },
  merchants_dice: { name: "Merchant's Dice", icon: "🎲", image: "merchants_dice.png", price: 10, stock: 4, kind: "consumable", description: "One die looks suspiciously weighted." },
  do_not_open: { name: "DO NOT OPEN", icon: "⛓️", image: "do_not_open.png", price: 35, stock: 1, kind: "consumable", description: "Gribble strongly recommends that you do not open it." },
  common_mystery_egg: { name: "Common Mystery Egg", icon: "🥚", image: "common_mystery_egg.png", price: 12, stock: 5, kind: "egg", description: "A friendly-looking unknown egg." },
  rare_mystery_egg: { name: "Rare Mystery Egg", icon: "🔵🥚", image: "rare_mystery_egg.png", price: 25, stock: 3, kind: "egg", description: "A valuable egg covered in magical markings." },
  ancient_egg: { name: "Ancient Egg", icon: "🗿🥚", image: "ancient_egg.png", price: 40, stock: 2, kind: "egg", description: "It feels impossibly old." },
  merchants_egg: { name: "Merchant's Egg", icon: "🧳🥚", image: "merchants_egg.png", price: 50, stock: 1, kind: "egg", description: "Only a Traveling Merchant could have found this." },
  monster_trophy: { name: "Monster Trophy", icon: "🏆", image: "monster_trophy.png", price: 22, stock: 3, kind: "collectible", description: "A prestigious hunter's achievement." },
  golden_monster_trophy: { name: "Golden Monster Trophy", icon: "🥇", image: "golden_monster_trophy.png", price: 55, stock: 1, kind: "collectible", description: "Exceptionally prestigious and expensive." },
  mystery_relic: { name: "Mystery Relic", icon: "🔮", image: "mystery_relic.png", price: 30, stock: 1, kind: "collectible", description: "Its original purpose is impossible to determine." },
  black_egg: { name: "Black Egg", icon: "⚫🥚", image: "black_egg.png", price: 100, stock: 1, kind: "egg", description: "Its surface seems to absorb the surrounding light." },
  impossible_key: { name: "Impossible Key", icon: "🗝️", image: "impossible_key.png", price: 75, stock: 1, kind: "collectible", description: "It could unlock something that should not have a door." },
  torn_page: { name: "Torn Page", icon: "📜", image: "torn_page.png", price: 12, stock: 4, kind: "collectible", description: "The writing changes whenever you look away." },
  watchers_eye: { name: "Watcher's Eye", icon: "👁️", image: "watchers_eye.png", price: 45, stock: 1, kind: "collectible", description: "It gives the impression that it is watching you." },
  broken_compass: { name: "Broken Compass", icon: "🧭", image: "broken_compass.png", price: 28, stock: 2, kind: "collectible", description: "The floating needle points somewhere impossible." },
  fractured_compass: { name: "Fractured Compass", icon: "💠🧭", image: "fractured_compass.png", price: 35, stock: 2, kind: "collectible", description: "Every needle points in a different direction." },
  reality_anchor: { name: "Reality Anchor", icon: "⚓", image: "reality_anchor.png", price: 60, stock: 1, kind: "collectible", description: "Nearby reality feels unusually stable." },
  unmarked_relic: { name: "Unmarked Relic", icon: "⬛", image: "unmarked_relic.png", price: 42, stock: 1, kind: "collectible", description: "It belongs to no recognizable culture." },
  voidglass_shard: { name: "Voidglass Shard", icon: "🌌", image: "voidglass_shard.png", price: 50, stock: 1, kind: "collectible", description: "It reflects places that are not nearby." },
  unidentified_object: { name: "Unidentified Object", icon: "❔", image: "unidentified_object.png", price: 80, stock: 1, kind: "collectible", description: "Its true shape cannot be determined." }
};

const MERCHANT_POOLS = {
  aldric: ["hunter_berry", "sticky_honey", "enchanted_net", "rare_bait", "epic_bait", "legendary_bait", "hunters_compass", "golden_lure", "fresh_tracks", "mystery_sack", "rusted_key", "ancient_egg", "monster_trophy", "mystery_relic"],
  gribble: ["hunter_berry", "mystery_sack", "sealed_bottle", "merchants_dice", "do_not_open", "common_mystery_egg", "rusted_key", "torn_page", "unidentified_object"],
  beastkeeper: ["rare_bait", "epic_bait", "legendary_bait", "golden_lure", "monster_whistle", "common_mystery_egg", "rare_mystery_egg", "ancient_egg", "merchants_egg", "monster_trophy", "golden_monster_trophy"],
  pale_collector: ["torn_page", "monster_trophy", "golden_monster_trophy", "mystery_relic", "watchers_eye", "broken_compass", "sealed_bottle"],
  riftwalker: ["fractured_compass", "reality_anchor", "unmarked_relic", "voidglass_shard", "broken_compass", "mystery_relic", "unidentified_object"],
  nameless: ["black_egg", "impossible_key", "watchers_eye", "broken_compass", "torn_page", "voidglass_shard", "unidentified_object"]
};

// The Pale Collector can demand collectibles instead of tokens.
const PALE_COLLECTOR_BARTERS = {
  watchers_eye: { torn_page: 3, monster_trophy: 1 },
  golden_monster_trophy: { monster_trophy: 2, mystery_relic: 1 },
  broken_compass: { torn_page: 2 },
  mystery_relic: { torn_page: 2, monster_trophy: 1 }
};

// ==================== ONE-TIME SEASON 2 LAUNCH ====================
// Opens both launch channels for both launch roles at 12:00 PM Mountain Time.
const SEASON_LAUNCH_DATE = "2026-08-02";
const SEASON_LAUNCH_TIMEZONE = "America/Denver";

const SEASON_LAUNCH_ROLE_IDS = [
  "1521532551339180122", // Monster Hunter
  "1531471045805084743"  // Monster Hunt Notifications
];

const SEASON_LAUNCH_CHANNEL_IDS = [
  "1521536122239586456", // Rules
  "1533218205496115471"  // Monster Hunt Room
];

const SEASON_LAUNCH_ANNOUNCEMENT_CHANNEL_ID = "1533218205496115471";

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
    abilityName: "Reality Collapse",
    abilityDescription: "Every 5 minutes, its base catch chance permanently falls by 1%, to a minimum of 1%.",
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
    abilityName: "All-Seeing Gaze",
    abilityDescription: "Every 5 minutes, a random participant is marked. Their next Ultra attempt suffers -5% catch chance.",
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
    abilityName: "Time Distortion",
    abilityDescription: "Every 5 minutes, time shifts and the Ultra Hunt cooldown becomes either 3 or 7 minutes until the next shift.",
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
    abilityName: "Falling Stars",
    abilityDescription: "Every 5 minutes, a random participant receives +5% catch chance on their next Ultra attempt.",
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
    abilityName: "Soul Flight",
    abilityDescription: "After 15 minutes, it has a 20% chance to flee early every 5 minutes.",
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
  { name: "Habitat Explorer", check: p => new Set((p.caught || []).map(m => m.habitat).filter(Boolean)).size >= 8 },
  { name: "Beyond the Rift", check: p => p.caught.some(m => cleanMonsterName(m.name) === "Mixer Monster") }
];

const ULTRA_META_ACHIEVEMENTS = {
  allCaught: { achievement: "Masters of the Beyond", title: "Ultra Hunter" },
  allRelics: { achievement: "Relic Master", title: "Relic Keeper" },
  allSummoned: { achievement: "The Summoner", title: "World Summoner" },
  veteran: { achievement: "Veteran Monster Hunter", title: "Legendary Hunter" }
};

const TITLE_RARITY_ICONS = {
  Common: "⚪",
  Rare: "🔵",
  Epic: "🟣",
  Legendary: "🟠",
  Mythic: "🌈"
};

const HIDDEN_TITLE_DEFINITIONS = [
  // Hunts and captures
  { name: "First Footfall", rarity: "Common", check: p => (p.huntCount || 0) >= 1 },
  { name: "Trail Reader", rarity: "Common", check: p => (p.huntCount || 0) >= 10 },
  { name: "Wildpath Seeker", rarity: "Rare", check: p => (p.huntCount || 0) >= 25 },
  { name: "Untiring Pursuer", rarity: "Epic", check: p => (p.huntCount || 0) >= 100 },
  { name: "Footprints Without End", rarity: "Legendary", check: p => (p.huntCount || 0) >= 250 },
  { name: "Creature Keeper", rarity: "Common", check: p => (p.caught || []).length >= 10 },
  { name: "Menagerie Maker", rarity: "Rare", check: p => (p.caught || []).length >= 25 },
  { name: "Warden of the Wild", rarity: "Epic", check: p => (p.caught || []).length >= 50 },
  { name: "Hundredfold Hunter", rarity: "Legendary", check: p => (p.caught || []).length >= 100 },

  // Points
  { name: "Rising Mark", rarity: "Common", check: p => (p.points || 0) >= 100 },
  { name: "Silver Trail", rarity: "Rare", check: p => (p.points || 0) >= 250 },
  { name: "Guild Proven", rarity: "Epic", check: p => (p.points || 0) >= 500 },
  { name: "Crown of the Chase", rarity: "Legendary", check: p => (p.points || 0) >= 1000 },
  { name: "Beyond the Scoreboard", rarity: "Mythic", check: p => (p.points || 0) >= 2500 },

  // Shiny and rarity accomplishments
  { name: "Spark-Touched", rarity: "Rare", check: p => (p.caught || []).filter(m => m.shiny).length >= 1 },
  { name: "Prism Pursuer", rarity: "Epic", check: p => (p.caught || []).filter(m => m.shiny).length >= 5 },
  { name: "Radiance Bound", rarity: "Legendary", check: p => (p.caught || []).filter(m => m.shiny).length >= 10 },
  { name: "Rare Resonance", rarity: "Rare", check: p => (p.caught || []).filter(m => m.rarity === "Rare").length >= 10 },
  { name: "Epic Echo", rarity: "Epic", check: p => (p.caught || []).filter(m => m.rarity === "Epic").length >= 10 },
  { name: "Legend Magnet", rarity: "Legendary", check: p => (p.caught || []).filter(m => m.rarity === "Legendary").length >= 5 },

  // Knowledge
  { name: "Field Notes", rarity: "Common", check: p => Object.values(p.knowledge || {}).filter(v => v >= 3).length >= 5 },
  { name: "Beast Linguist", rarity: "Rare", check: p => Object.values(p.knowledge || {}).filter(v => v >= 5).length >= 5 },
  { name: "Living Archive", rarity: "Epic", check: p => Object.values(p.knowledge || {}).filter(v => v >= 10).length >= 5 },
  { name: "Keeper of True Names", rarity: "Legendary", check: p => Object.values(p.knowledge || {}).filter(v => v >= 20).length >= 10 },

  // Eggs and companions
  { name: "Nestfinder", rarity: "Common", check: p => (p.titleProgress?.eggsFound || 0) >= 1 },
  { name: "Shell Cartographer", rarity: "Rare", check: p => (p.titleProgress?.eggsFound || 0) >= 10 },
  { name: "Keeper of Warmth", rarity: "Common", check: p => (p.titleProgress?.eggsHatched || 0) >= 1 },
  { name: "Cradle of Wonders", rarity: "Epic", check: p => (p.titleProgress?.eggsHatched || 0) >= 10 },
  { name: "Golden Cradle", rarity: "Legendary", check: p => (p.pets || []).some(x => getOwnedPetDefinition(x)?.rarity === "Legendary") },
  { name: "Chosen Companion", rarity: "Common", check: p => Boolean(getEquippedPet(p)) },
  { name: "Bondforged", rarity: "Rare", check: p => (p.pets || []).some(x => getPetBondLevel(x) >= 2) },
  { name: "Kindred Pulse", rarity: "Epic", check: p => (p.pets || []).some(x => getPetBondLevel(x) >= 3) },
  { name: "Soulbound Pair", rarity: "Legendary", check: p => (p.pets || []).some(x => getPetBondLevel(x) >= 5) },
  { name: "Companion Ascendant", rarity: "Legendary", check: p => (p.pets || []).some(x => getCompanionLevelInfo(x).level >= MAX_COMPANION_LEVEL) },
  { name: "Heartheard", rarity: "Epic", check: p => (p.pets || []).reduce((n, x) => n + (x.affectionEvents || 0), 0) >= 25 },

  // Ultra progression
  { name: "Rift Witness", rarity: "Rare", check: p => (p.ultraParticipationCount || 0) >= 1 },
  { name: "Beyond the Veil", rarity: "Epic", check: p => (p.ultraParticipationCount || 0) >= 10 },
  { name: "Rift-Hardened", rarity: "Legendary", check: p => (p.ultraParticipationCount || 0) >= 25 },
  { name: "Impossible Aim", rarity: "Epic", check: p => (p.titleProgress?.ultraAttempts || 0) >= 25 },
  { name: "Titan Taker", rarity: "Legendary", check: p => (p.ultraCaughtKeys || []).length >= 1 },
  { name: "Relic Awakened", rarity: "Rare", check: p => Object.values(p.relics || {}).some(v => v > 0) },
  { name: "Caller from Beyond", rarity: "Epic", check: p => (p.ultraSummonedKeys || []).length >= 1 },

  // Item, bait, and unusual secret accomplishments
  { name: "Well Supplied", rarity: "Rare", check: p => (p.titleProgress?.captureItemsUsed || 0) >= 10 },
  { name: "Empty Satchel", rarity: "Epic", check: p => (p.titleProgress?.captureItemsUsed || 0) >= 50 },
  { name: "Charmburner", rarity: "Legendary", check: p => (p.titleProgress?.masterCharmUsed || 0) >= 1 },
  { name: "Scentweaver", rarity: "Rare", check: p => (p.titleProgress?.baitUsed || 0) >= 10 },
  { name: "Professional Escape Artist", rarity: "Rare", check: p => (p.titleProgress?.failedCaptureStreak || 0) >= 10 },
  { name: "Almost Certain", rarity: "Epic", check: p => Boolean(p.titleProgress?.failedAtNinety) },
  { name: "The One Percent", rarity: "Mythic", check: p => Boolean(p.titleProgress?.mixerWithoutCharm) },
  { name: "Against the Cosmos", rarity: "Mythic", check: p => Boolean(p.titleProgress?.ultraAtFiveOrLess) },
  { name: CRITICAL_CATCH_TITLE, rarity: "Mythic", check: p => Boolean(p.titleProgress?.criticalCatch) },
  { name: PERFECT_CATCH_TITLE, rarity: "Mythic", check: p => Boolean(p.titleProgress?.perfectCatch) },
  { name: "Should Not Exist", rarity: "Legendary", check: p => ["The Misplaced","Stitchmaw","The Empty Knight","The Forgotten","NULL"].every(name => (p.caught||[]).some(m => cleanMonsterName(m.name) === name)) },
  { name: "You Were Never Here", rarity: "Mythic", check: p => ["The Misplaced","Stitchmaw","The Empty Knight","The Forgotten","NULL"].every(name => (p.caught||[]).some(m => cleanMonsterName(m.name) === name)) && ["mimicling","the_unwritten"].every(key => (p.pets||[]).some(x => x.key === key)) }
];

function getTitleDefinition(titleName) {
  const builtIn = HIDDEN_TITLE_DEFINITIONS.find(title => title.name === titleName);
  if (builtIn) return builtIn;

  const specialRarity = [
    "The Chosen Mixer", "Master Beast Tamer", "You Were Never Here"
  ].includes(titleName) ? "Mythic" :
  ["Worldbreaker", "The All-Seeing", "Timewalker", "Starforged", "Soulkeeper", "Ultra Hunter", "Relic Keeper", "World Summoner", "Legendary Hunter", "Shatterborn", "World Mender", "Should Not Exist", "Warden of Every Habitat", "The Thirty-Twofold Bond", "Keeper of the Wild Covenant"].includes(titleName)
    ? "Legendary"
    : "Epic";

  return { name: titleName, rarity: specialRarity };
}

function formatTitle(titleName) {
  const definition = getTitleDefinition(titleName);
  return `${TITLE_RARITY_ICONS[definition.rarity] || "⚪"} ${titleName}`;
}

function checkTitleUnlocks(player) {
  const newlyUnlocked = [];
  if (!Array.isArray(player.unlockedTitles)) player.unlockedTitles = [];

  for (const definition of HIDDEN_TITLE_DEFINITIONS) {
    if (!player.unlockedTitles.includes(definition.name) && definition.check(player)) {
      player.unlockedTitles.push(definition.name);
      newlyUnlocked.push(definition);
    }
  }

  return newlyUnlocked;
}

async function announceTitleUnlocks(message, unlocks) {
  if (!unlocks || unlocks.length === 0) return;

  for (const unlock of unlocks) {
    await message.channel.send(
      `🏆 **SECRET TITLE UNLOCKED!**\n\n` +
      `${TITLE_RARITY_ICONS[unlock.rarity] || "⚪"} **${unlock.name}**\n\n` +
      `Use \`!title ${unlock.name}\` to equip it.`
    );
  }
}

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
  if (!Array.isArray(data.worldCommunityMilestonesAwarded)) data.worldCommunityMilestonesAwarded = [];
  if (!data.communityBlessings || typeof data.communityBlessings !== "object") data.communityBlessings = {};
  if (data.ultraWeeklySchedule === undefined) data.ultraWeeklySchedule = null;
  if (data.ultraAdminPauseUntil === undefined) data.ultraAdminPauseUntil = 0;
  if (!data.weeklyCompetition || typeof data.weeklyCompetition !== "object") {
    data.weeklyCompetition = {
      startsAt: WEEKLY_COMPETITION_START_AT,
      active: false,
      weekStartedAt: 0,
      lastResultsAt: 0
    };
  }

  if (data.overhaulAnnouncementSent === undefined) data.overhaulAnnouncementSent = false;
  if (!data.distortionSchedule || typeof data.distortionSchedule !== "object") data.distortionSchedule = { weekKey: null, events: [] };
  if (data.activeDistortion === undefined) data.activeDistortion = null;
  if (!data.distortionHistory || typeof data.distortionHistory !== "object") data.distortionHistory = { firstOpened: {}, firstCaught: {}, firstEgg: {} };
  if (!data.worldStory || typeof data.worldStory !== "object") {
    data.worldStory = {
      phase: "dormant", anomalyIndex: 0, nextAnomalyAt: 0, finalWarningStartedAt: 0,
      shatterScheduledAt: 0, shatterScheduleManual: false, beats: [], event: null, postShatter: false, completedAt: 0,
      outcome: null, unmadeReplacementChance: 0, architectRematchAt: 0, rematch24hSent: false, rematch2hSent: false,
      worldMenderEligible: [], architectDefeats: 0, architectFailures: 0
    };
  }
  if (!Array.isArray(data.worldStory.beats)) data.worldStory.beats = [];
  if (data.worldStory.postShatter === undefined) data.worldStory.postShatter = false;
  if (data.worldStory.outcome === undefined) data.worldStory.outcome = null;
  if (data.worldStory.unmadeReplacementChance === undefined) data.worldStory.unmadeReplacementChance = data.worldStory.postShatter ? UNMADE_REPLACEMENT_CHANCE : 0;
  if (data.worldStory.architectRematchAt === undefined) data.worldStory.architectRematchAt = 0;
  if (data.worldStory.rematch24hSent === undefined) data.worldStory.rematch24hSent = false;
  if (data.worldStory.rematch2hSent === undefined) data.worldStory.rematch2hSent = false;
  if (!Array.isArray(data.worldStory.worldMenderEligible)) data.worldStory.worldMenderEligible = [];
  if (data.worldStory.architectDefeats === undefined) data.worldStory.architectDefeats = 0;
  if (data.worldStory.architectFailures === undefined) data.worldStory.architectFailures = 0;
  if (!Array.isArray(data.seasonMoments)) data.seasonMoments = [];
  if (!data.seasonMomentFlags || typeof data.seasonMomentFlags !== "object") {
    data.seasonMomentFlags = {};
  }
  if (!Number.isInteger(data.nextSeasonMomentId) || data.nextSeasonMomentId < 1) {
    data.nextSeasonMomentId = data.seasonMoments.reduce(
      (max, moment) => Math.max(max, Number(moment.id) || 0),
      0
    ) + 1;
  }

  if (!data.seasonLaunch || typeof data.seasonLaunch !== "object") {
    data.seasonLaunch = {
      channelsOpened: false,
      announcementSent: false
    };
  }

  if (data.seasonLaunch.channelsOpened === undefined) {
    data.seasonLaunch.channelsOpened = false;
  }

  if (data.seasonLaunch.announcementSent === undefined) {
    data.seasonLaunch.announcementSent = false;
  }

  ensureBigGameMerchantData(data);

  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function addSeasonMoment(data, {
  type = "community",
  playerId = null,
  text,
  icon = "📜",
  uniqueKey = null,
  metadata = {}
}) {
  if (!Array.isArray(data.seasonMoments)) data.seasonMoments = [];
  if (!data.seasonMomentFlags || typeof data.seasonMomentFlags !== "object") {
    data.seasonMomentFlags = {};
  }
  if (!Number.isInteger(data.nextSeasonMomentId) || data.nextSeasonMomentId < 1) {
    data.nextSeasonMomentId = 1;
  }

  if (uniqueKey && data.seasonMomentFlags[uniqueKey]) return null;

  const moment = {
    id: data.nextSeasonMomentId++,
    timestamp: Date.now(),
    type,
    playerId,
    text: String(text || "").trim(),
    icon,
    metadata
  };

  data.seasonMoments.push(moment);
  if (uniqueKey) data.seasonMomentFlags[uniqueKey] = moment.id;

  return moment;
}

function seasonMomentDate(timestamp) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function seasonMomentPlayerName(data, userId) {
  if (!userId) return "";
  const member = client.guilds.cache
    .map(guild => guild.members.cache.get(userId))
    .find(Boolean);

  return member?.displayName || member?.user?.username || `Hunter ${userId}`;
}

function formatSeasonMoment(data, moment, includeNumber = true) {
  const number = includeNumber ? `**#${moment.id}** ` : "";
  return (
    `${number}${moment.icon || "📜"} **${seasonMomentDate(moment.timestamp)}** — ` +
    `${moment.text}`
  );
}

function recordPointMilestoneMoments(data, playerId, previousPoints, currentPoints) {
  const milestones = [
    { points: 100, icon: "⭐", label: "reached 100 Hunter Points" },
    { points: 250, icon: "🌟", label: "reached 250 Hunter Points" },
    { points: 500, icon: "💫", label: "reached 500 Hunter Points" },
    { points: 1000, icon: "👑", label: "reached 1,000 Hunter Points" }
  ];

  const name = seasonMomentPlayerName(data, playerId);

  for (const milestone of milestones) {
    if (previousPoints < milestone.points && currentPoints >= milestone.points) {
      addSeasonMoment(data, {
        type: "point_milestone",
        playerId,
        icon: milestone.icon,
        text: `${name} ${milestone.label}.`,
        uniqueKey: `points:${playerId}:${milestone.points}`
      });
    }
  }
}

function getPlayer(data, userId) {
  if (!data.players[userId]) {
    data.players[userId] = {
      points: 0,
      caught: [],
      lifetimeCaught: [],
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
      dailyRerollsUsed: 0,
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
      eggs: [],
      incubatingEggs: [],
      lastIncubatorSlots: 1,
      pets: [],
      discoveredPetKeys: [],
      grandPetCollectionRewardClaimed: false,
      equippedPetId: null,
      nextPetId: 1,
      lastFetch: 0,
      fetchState: null,
      pendingHatchChoice: null,
      cooldownReminders: { hunt: false, fetch: false },
      reminderState: { huntDueAt: 0, huntSent: false, fetchDueAt: 0, fetchSent: false, channelId: null },
      weeklyStats: { points: 0, catches: 0, shinies: 0, legendaries: 0, startRank: null },
      titleProgress: {
        eggsFound: 0,
        eggsHatched: 0,
        ultraAttempts: 0,
        captureItemsUsed: 0,
        masterCharmUsed: 0,
        baitUsed: 0,
        failedCaptureStreak: 0,
        failedAtNinety: false,
        mixerWithoutCharm: false,
        ultraAtFiveOrLess: false,
        criticalCatch: false,
        perfectCatch: false
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
      },
      huntTokens: 0,
      lifetimeTokens: 0,
      tokensSpent: 0,
      bigGameWins: 0,
      bigGamePlacements: [],
      merchantCollection: {},
      merchantPurchases: [],
      merchantEffects: {},
      merchantGambles: 0
    };
  }

  

  const player = data.players[userId];

  // Lifetime collection is display-only and never affects seasonal scoring.
  if (!Array.isArray(player.lifetimeCaught)) player.lifetimeCaught = [];

  if (player.lastHunt === undefined) player.lastHunt = 0;
  if (player.title === undefined) player.title = null;
  if (!Array.isArray(player.unlockedTitles)) player.unlockedTitles = [];
  if (!Array.isArray(player.secretAchievements)) player.secretAchievements = [];
  if (!Array.isArray(player.ultraCaughtKeys)) player.ultraCaughtKeys = [];
  if (!Array.isArray(player.ultraSummonedKeys)) player.ultraSummonedKeys = [];
  if (player.ultraParticipationCount === undefined) player.ultraParticipationCount = 0;
  if (player.dailyQuests === undefined) player.dailyQuests = [];
  if (player.dailyClaimed === undefined) player.dailyClaimed = false;
  if (!Number.isInteger(player.dailyRerollsUsed) || player.dailyRerollsUsed < 0) {
    player.dailyRerollsUsed = 0;
  }
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
  if (!Array.isArray(player.eggs)) player.eggs = [];

  // Migrate the previous single-incubator format without losing an active egg.
  if (!Array.isArray(player.incubatingEggs)) {
    player.incubatingEggs = player.incubatingEgg
      ? [{ ...player.incubatingEgg, notified: Boolean(player.incubatingEgg.notified) }]
      : [];
  }
  delete player.incubatingEgg;

  for (const incubation of player.incubatingEggs) {
    if (incubation.notified === undefined) incubation.notified = false;
  }

  if (!Number.isInteger(player.lastIncubatorSlots) || player.lastIncubatorSlots < 1) {
    player.lastIncubatorSlots = Math.min(
      MAX_INCUBATORS,
      1 + Math.floor((player.points || 0) / POINTS_PER_INCUBATOR)
    );
  }

  if (!Array.isArray(player.pets)) player.pets = [];
  if (!player.titleProgress || typeof player.titleProgress !== "object") player.titleProgress = {};
  const titleProgressDefaults = {
    eggsFound: 0, eggsHatched: 0, ultraAttempts: 0,
    captureItemsUsed: 0, masterCharmUsed: 0, baitUsed: 0,
    failedCaptureStreak: 0, failedAtNinety: false,
    mixerWithoutCharm: false, ultraAtFiveOrLess: false
  };
  for (const [key, value] of Object.entries(titleProgressDefaults)) {
    if (player.titleProgress[key] === undefined) player.titleProgress[key] = value;
  }
  if (player.lastFetch === undefined) player.lastFetch = 0;
  if (player.fetchState === undefined) player.fetchState = null;
  if (player.pendingHatchChoice === undefined) player.pendingHatchChoice = null;
  if (player.pendingHatchChoice && Number(player.pendingHatchChoice.expiresAt || 0) <= Date.now()) {
    player.pendingHatchChoice = null;
  }
  if (!player.cooldownReminders || typeof player.cooldownReminders !== "object") player.cooldownReminders = { hunt: false, fetch: false };
  if (player.cooldownReminders.hunt === undefined) player.cooldownReminders.hunt = false;
  if (player.cooldownReminders.fetch === undefined) player.cooldownReminders.fetch = false;
  if (!player.reminderState || typeof player.reminderState !== "object") player.reminderState = { huntDueAt: 0, huntSent: false, fetchDueAt: 0, fetchSent: false, channelId: null };
  if (!player.weeklyStats || typeof player.weeklyStats !== "object") player.weeklyStats = { points: 0, catches: 0, shinies: 0, legendaries: 0, startRank: null };
  for (const key of ["points", "catches", "shinies", "legendaries"]) if (!Number.isFinite(player.weeklyStats[key])) player.weeklyStats[key] = 0;
  if (player.titleProgress.criticalCatch === undefined) player.titleProgress.criticalCatch = false;
  if (player.titleProgress.perfectCatch === undefined) player.titleProgress.perfectCatch = false;
  if (player.equippedPetId === undefined) player.equippedPetId = null;
  if (!Number.isInteger(player.nextPetId) || player.nextPetId < 1) {
    player.nextPetId = player.pets.reduce((max, pet) => Math.max(max, Number(pet.id) || 0), 0) + 1;
  }
  for (const ownedPet of player.pets) {
    if (LEGACY_PET_KEY_MIGRATION[ownedPet.key]) {
      ownedPet.key = LEGACY_PET_KEY_MIGRATION[ownedPet.key];
    }

    // Convert the previous hunt-based Bond progress into Companion XP.
    if (ownedPet.companionXp === undefined) {
      ownedPet.companionXp = Math.max(0, Number(ownedPet.bondXp || 0) * COMPANION_XP_PER_SUCCESSFUL_HUNT);
    }
    delete ownedPet.bondXp;

    if (ownedPet.affectionEvents === undefined) ownedPet.affectionEvents = 0;
    if (ownedPet.timesHelped === undefined) ownedPet.timesHelped = 0;
    if (!ownedPet.personality) ownedPet.personality = "Curious";
    if (ownedPet.nickname === undefined) ownedPet.nickname = null;
    if (ownedPet.nickname !== null && typeof ownedPet.nickname !== "string") ownedPet.nickname = null;
    if (!Array.isArray(ownedPet.inheritedAbilities)) ownedPet.inheritedAbilities = [];
    for (const inherited of ownedPet.inheritedAbilities) {
      if (!Number.isFinite(inherited.xp)) inherited.xp = 0;
      if (!inherited.sourceRarity) inherited.sourceRarity = "Common";
    }
    if (!ownedPet.progressionV2) {
      const legacy = getLegacyCompanionLevelInfo(ownedPet.companionXp || 0);
      const definition = getOwnedPetDefinition(ownedPet);
      ownedPet.companionXp = companionTotalXpForLevel(legacy.level, definition?.rarity || "Common") +
        Math.floor((legacy.xpNeeded ? legacy.xpIntoLevel / legacy.xpNeeded : 0) * companionXpRequiredForLevel(legacy.level, definition?.rarity || "Common"));
      ownedPet.progressionV2 = true;
    }
  }
  if (!Array.isArray(player.discoveredPetKeys)) player.discoveredPetKeys = [];
  player.discoveredPetKeys = [...new Set([
    ...player.discoveredPetKeys.map(key => LEGACY_PET_KEY_MIGRATION[key] || key),
    ...player.pets.map(pet => pet.key)
  ].filter(key => pets.some(definition => definition.key === key)))];
  if (player.grandPetCollectionRewardClaimed === undefined) player.grandPetCollectionRewardClaimed = false;
  if (!player.adminTest || typeof player.adminTest !== "object") {
    player.adminTest = { distortionKey: null, cooldownBypass: false, generatedPetIds: [], generatedEggIds: [], generatedCatchIds: [] };
  }
  if (!Array.isArray(player.adminTest.generatedPetIds)) player.adminTest.generatedPetIds = [];
  if (!Array.isArray(player.adminTest.generatedEggIds)) player.adminTest.generatedEggIds = [];
  if (!Array.isArray(player.adminTest.generatedCatchIds)) player.adminTest.generatedCatchIds = [];

  if (!Number.isFinite(player.huntTokens)) player.huntTokens = 0;
  if (!Number.isFinite(player.lifetimeTokens)) player.lifetimeTokens = 0;
  if (!Number.isFinite(player.tokensSpent)) player.tokensSpent = 0;
  if (!Number.isFinite(player.bigGameWins)) player.bigGameWins = 0;
  if (!Array.isArray(player.bigGamePlacements)) player.bigGamePlacements = [];
  if (!player.merchantCollection || typeof player.merchantCollection !== "object") player.merchantCollection = {};
  if (!Array.isArray(player.merchantPurchases)) player.merchantPurchases = [];
  if (!player.merchantEffects || typeof player.merchantEffects !== "object") player.merchantEffects = {};
  if (!Number.isFinite(player.merchantGambles)) player.merchantGambles = 0;

  if (player.relics === undefined) player.relics = {};
  for (const relicKey of RELIC_KEYS) {
    if (player.relics[relicKey] === undefined) player.relics[relicKey] = 0;
  }

  return player;
}



function getPetDefinition(keyOrName) {
  const wanted = String(keyOrName || "").trim().toLowerCase();
  return pets.find(pet => pet.key === wanted || pet.name.toLowerCase() === wanted) || null;
}

function getOwnedPetDefinition(ownedPet) {
  return ownedPet ? getPetDefinition(ownedPet.key) : null;
}

// Nicknames are display-only. Species identity, abilities, artwork, Pet Dex
// progress, combining, and every gameplay calculation continue using ownedPet.key.
function getOwnedPetName(ownedPet) {
  const definition = getOwnedPetDefinition(ownedPet);
  const nickname = String(ownedPet?.nickname || "").trim();
  return nickname || definition?.name || ownedPet?.key || "Unknown Pet";
}

function getOwnedPetIdentity(ownedPet) {
  const definition = getOwnedPetDefinition(ownedPet);
  const nickname = String(ownedPet?.nickname || "").trim();
  if (nickname && definition) return `${nickname} (${definition.name})`;
  return definition?.name || nickname || ownedPet?.key || "Unknown Pet";
}

function getPetDisplayIcon(definitionOrKey) {
  const definition = typeof definitionOrKey === "string"
    ? getPetDefinition(definitionOrKey)
    : definitionOrKey;

  if (!definition) return "🐾";

  // Automatically use the custom Discord emoji whose name matches the pet key.
  // Example: pet key "reef_snapper" uses the server emoji named reef_snapper.
  const customEmoji = client.emojis.cache.find(
    emoji => emoji.name?.toLowerCase() === definition.key.toLowerCase()
  );

  return customEmoji
    ? `<:${customEmoji.name}:${customEmoji.id}>`
    : definition.icon;
}

function getPetArtworkUrl(definitionOrKey) {
  const definition = typeof definitionOrKey === "string"
    ? getPetDefinition(definitionOrKey)
    : definitionOrKey;

  if (!definition) return null;

  const customEmoji = client.emojis.cache.find(
    emoji => emoji.name?.toLowerCase() === definition.key.toLowerCase()
  );

  if (!customEmoji) return null;
  return `https://cdn.discordapp.com/emojis/${customEmoji.id}.png?size=512&quality=lossless`;
}

function getPetArtworkPath(definitionOrKey) {
  const definition = typeof definitionOrKey === "string"
    ? getPetDefinition(definitionOrKey)
    : definitionOrKey;
  if (!definition) return null;
  return findImageFile(definition.image || `${definition.key}.png`);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getEquippedPet(player) {
  if (!player || player.equippedPetId === null || player.equippedPetId === undefined) return null;
  return player.pets.find(pet => String(pet.id) === String(player.equippedPetId)) || null;
}

function getLegacyCompanionLevelInfo(totalXp) {
  let level = 1;
  let xpIntoLevel = Math.max(0, Number(totalXp || 0));
  while (level < MAX_COMPANION_LEVEL) {
    const needed = 40 + Math.max(0, level - 1) * 20;
    if (xpIntoLevel < needed) break;
    xpIntoLevel -= needed;
    level++;
  }
  return { level, xpIntoLevel, xpNeeded: level >= MAX_COMPANION_LEVEL ? 0 : 40 + Math.max(0, level - 1) * 20 };
}

function companionXpRequiredForLevel(level, rarity = "Common") {
  return (PET_XP_BASE[rarity] || PET_XP_BASE.Common) + Math.max(0, level - 1) * 10;
}

function companionTotalXpForLevel(level, rarity = "Common") {
  let total = 0;
  for (let current = 1; current < level; current++) total += companionXpRequiredForLevel(current, rarity);
  return total;
}

function getCompanionLevelInfo(ownedPet) {
  const definition = getOwnedPetDefinition(ownedPet);
  const rarity = definition?.rarity || "Common";
  let level = 1;
  let xpIntoLevel = Math.max(0, Number(ownedPet?.companionXp || 0));
  while (level < MAX_COMPANION_LEVEL) {
    const needed = companionXpRequiredForLevel(level, rarity);
    if (xpIntoLevel < needed) break;
    xpIntoLevel -= needed;
    level++;
  }
  return { level, xpIntoLevel, xpNeeded: level >= MAX_COMPANION_LEVEL ? 0 : companionXpRequiredForLevel(level, rarity), rarity };
}

function getPetBondLevel(ownedPet) {
  const { level } = getCompanionLevelInfo(ownedPet);
  return Math.min(MAX_PET_BOND_LEVEL, 1 + Math.floor((level - 1) / 5));
}

function companionXpBar(ownedPet, length = 10) {
  const info = getCompanionLevelInfo(ownedPet);
  if (info.level >= MAX_COMPANION_LEVEL) return `Level **${info.level}** | **MAX LEVEL**\n${"█".repeat(length)}`;
  const filled = Math.max(0, Math.min(length, Math.floor((info.xpIntoLevel / info.xpNeeded) * length)));
  return `Level **${info.level}** | **${info.xpIntoLevel}/${info.xpNeeded} XP**\n${"█".repeat(filled)}${"░".repeat(length - filled)}`;
}

function abilityXpRequiredForLevel(level, rarity = "Common") {
  return (PET_XP_BASE[rarity] || PET_XP_BASE.Common) + Math.max(0, level - 1) * 10;
}

function getInheritedAbilityLevelInfo(inherited) {
  let level = 1;
  let xpIntoLevel = Math.max(0, Number(inherited?.xp || 0));
  const rarity = inherited?.sourceRarity || "Common";
  while (level < MAX_COMPANION_LEVEL) {
    const needed = abilityXpRequiredForLevel(level, rarity);
    if (xpIntoLevel < needed) break;
    xpIntoLevel -= needed;
    level++;
  }
  return { level, xpIntoLevel, xpNeeded: level >= MAX_COMPANION_LEVEL ? 0 : abilityXpRequiredForLevel(level, rarity) };
}

function awardInheritedAbilityXp(ownedPet, amount) {
  if (!ownedPet || !Array.isArray(ownedPet.inheritedAbilities) || amount <= 0) return [];
  const leveled = [];
  for (const inherited of ownedPet.inheritedAbilities) {
    const before = getInheritedAbilityLevelInfo(inherited).level;
    inherited.xp = Math.max(0, Number(inherited.xp || 0)) + amount;
    const after = getInheritedAbilityLevelInfo(inherited).level;
    if (after > before) leveled.push(`${abilityDisplayName(inherited.ability)} reached Ability Level ${after}`);
  }
  return leveled;
}

function distributePetXpAcrossAbilities(ownedPet, totalXp) {
  const definition = getOwnedPetDefinition(ownedPet);
  const amount = Math.max(0, Math.floor(Number(totalXp || 0)));
  if (!ownedPet || !definition || amount <= 0) {
    return { totalXp: 0, abilityCount: 0, allocations: [], levelUps: [] };
  }

  const inheritedAbilities = Array.isArray(ownedPet.inheritedAbilities)
    ? ownedPet.inheritedAbilities
    : [];
  const abilityCount = 1 + inheritedAbilities.length;
  const baseShare = Math.floor(amount / abilityCount);
  let remainder = amount % abilityCount;
  const allocations = [];
  const levelUps = [];

  // The natural passive is powered by Companion XP.
  const naturalBefore = getCompanionLevelInfo(ownedPet).level;
  const naturalShare = baseShare + (remainder > 0 ? 1 : 0);
  if (remainder > 0) remainder--;
  ownedPet.companionXp = Math.max(0, Number(ownedPet.companionXp || 0)) + naturalShare;
  const naturalAfter = getCompanionLevelInfo(ownedPet).level;
  allocations.push({
    ability: definition.ability,
    natural: true,
    amount: naturalShare
  });
  if (naturalAfter > naturalBefore) {
    levelUps.push(`${abilityDisplayName(definition.ability)} reached Ability Level ${naturalAfter}`);
  }

  // Every inherited ability receives an equal share of the same XP pool.
  for (const inherited of inheritedAbilities) {
    const share = baseShare + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    const before = getInheritedAbilityLevelInfo(inherited).level;
    inherited.xp = Math.max(0, Number(inherited.xp || 0)) + share;
    const after = getInheritedAbilityLevelInfo(inherited).level;
    allocations.push({
      ability: inherited.ability,
      natural: false,
      amount: share
    });
    if (after > before) {
      levelUps.push(`${abilityDisplayName(inherited.ability)} reached Ability Level ${after}`);
    }
  }

  return { totalXp: amount, abilityCount, allocations, levelUps };
}

function formatDistributedPetXp(distribution) {
  if (!distribution || !distribution.allocations?.length) return "";
  return distribution.allocations
    .map(entry => `${entry.natural ? "✨" : "🧬"} **${abilityDisplayName(entry.ability)}:** +${entry.amount} XP`)
    .join("\n");
}

function formatAllPetAbilityProgress(ownedPet) {
  const definition = getOwnedPetDefinition(ownedPet);
  if (!ownedPet || !definition) return "";

  const naturalInfo = getCompanionLevelInfo(ownedPet);
  const naturalXp = naturalInfo.level >= MAX_COMPANION_LEVEL
    ? "MAX"
    : `${naturalInfo.xpIntoLevel}/${naturalInfo.xpNeeded} XP`;

  const lines = [
    `✨ **${abilityDisplayName(definition.ability)}** — Ability Lv. **${naturalInfo.level}** | **${naturalXp}**`
  ];

  for (const inherited of ownedPet.inheritedAbilities || []) {
    const info = getInheritedAbilityLevelInfo(inherited);
    const xp = info.level >= MAX_COMPANION_LEVEL
      ? "MAX"
      : `${info.xpIntoLevel}/${info.xpNeeded} XP`;

    lines.push(
      `🧬 **${abilityDisplayName(inherited.ability)}** — Ability Lv. **${info.level}** | **${xp}**`
    );
  }

  return lines.join("\n");
}

function awardCompanionXp(player, amount, reason = "Companion XP") {
  const ownedPet = getEquippedPet(player);
  const definition = getOwnedPetDefinition(ownedPet);
  if (!ownedPet || !definition || amount <= 0) return "";

  const before = getCompanionLevelInfo(ownedPet).level;
  ownedPet.companionXp = Math.max(0, Number(ownedPet.companionXp || 0)) + amount;
  const after = getCompanionLevelInfo(ownedPet).level;

  const inheritedXpAmount = reason.includes("Fetch") ? ABILITY_XP_PER_FETCH : ABILITY_XP_PER_HUNT;
  const abilityLevels = awardInheritedAbilityXp(ownedPet, inheritedXpAmount);

  const displayName = getOwnedPetName(ownedPet);
  return `${getPetDisplayIcon(definition)} **${displayName} gained ${amount} Companion XP!** (${reason})\n` +
    `${companionXpBar(ownedPet)}\n\n` +
    `**Ability Progress**\n${formatAllPetAbilityProgress(ownedPet)}` +
    `${after > before ? `\n🎉 **LEVEL UP! ${displayName} reached Level ${after}!**\n${definition.signatureAbility ? `❖ Its **${definition.signatureName}** signature ability grew stronger.` : `✨ Its natural ${abilityDisplayName(definition.ability)} ability grew stronger.`}` : ""}` +
    `${abilityLevels.length ? `\n🧬 **ABILITY LEVEL UP!** ${abilityLevels.join("\n🧬 **ABILITY LEVEL UP!** ")}` : ""}`;
}

function abilityDisplayName(ability) {
  return ({ eggFinder: "Egg Finder", shiny: "Shiny Finder", capture: "Capture", cooldown: "Cooldown", points: "Bonus Points", itemFinder: "Item Finder" })[ability] || ability;
}

function abilityBonusAtLevel(ability, baseBonus, level) {
  const extraLevels = Math.max(0, level - 1);
  if (ability === "shiny") return +(baseBonus + extraLevels * 0.25).toFixed(2);
  if (ability === "eggFinder") return +(baseBonus + extraLevels * 0.5).toFixed(2);
  if (ability === "cooldown") return +(baseBonus + Math.floor(extraLevels / 2)).toFixed(2);
  return +(baseBonus + extraLevels).toFixed(2);
}

function getPetAbilityEntries(ownedPet) {
  const definition = getOwnedPetDefinition(ownedPet);
  if (!ownedPet || !definition) return [];
  const naturalLevel = getCompanionLevelInfo(ownedPet).level;
  const entries = [{ ability: definition.ability, level: naturalLevel, baseBonus: definition.baseBonus, natural: true, rarity: definition.rarity }];
  for (const inherited of ownedPet.inheritedAbilities || []) {
    entries.push({ ability: inherited.ability, level: getInheritedAbilityLevelInfo(inherited).level, baseBonus: inherited.baseBonus || 1, natural: false, rarity: inherited.sourceRarity || "Common", inherited });
  }
  return entries;
}

function getKnownPetAbility(ownedPet, ability) {
  const definition = getOwnedPetDefinition(ownedPet);
  if (!ownedPet || !definition) return null;

  if (definition.ability === ability) {
    return {
      natural: true,
      ability,
      definition
    };
  }

  const inherited = (ownedPet.inheritedAbilities || []).find(entry => entry.ability === ability);
  if (inherited) {
    return {
      natural: false,
      ability,
      inherited
    };
  }

  return null;
}

function addSameAbilityCombineXp(ownedPet, ability, sacrificeRarity) {
  const known = getKnownPetAbility(ownedPet, ability);
  if (!known) return null;

  const amount = PET_ABILITY_COMBINE_XP[sacrificeRarity] || PET_ABILITY_COMBINE_XP.Common;
  const distribution = distributePetXpAcrossAbilities(ownedPet, amount);

  return {
    type: "distributed",
    amount,
    distribution,
    text:
      `🧬 **ABILITY TRAINING!**\n` +
      `This companion already knows **${abilityDisplayName(ability)}**.\n` +
      `The sacrificed pet became **${amount} XP**, evenly distributed across all **${distribution.abilityCount}** abilities this companion owns.\n\n` +
      `${formatDistributedPetXp(distribution)}\n\n` +
      `**Ability Progress**\n${formatAllPetAbilityProgress(ownedPet)}` +
      `${distribution.levelUps.length ? `\n🎉 **ABILITY LEVEL UP!** ${distribution.levelUps.join("\n🎉 **ABILITY LEVEL UP!** ")}` : ""}`
  };
}

function getPetBonus(player, ability) {
  const ownedPet = getEquippedPet(player);
  const definition = getOwnedPetDefinition(ownedPet);
  const entries = getPetAbilityEntries(ownedPet).filter(entry => entry.ability === ability && !(entry.natural && definition?.signatureAbility));
  const normal = entries.reduce((sum, entry) => sum + abilityBonusAtLevel(entry.ability, entry.baseBonus, entry.level), 0);
  return normal + copiedPetBonus(player, ability);
}

function getPlayerPetIcon(player) {
  const ownedPet = getEquippedPet(player);
  const definition = getOwnedPetDefinition(ownedPet);
  return definition ? getPetDisplayIcon(definition) : "";
}

function formatPlayerMention(data, userId) {
  const icon = getPlayerPetIcon(getPlayer(data, userId));
  return `${icon ? `${icon} ` : ""}<@${userId}>`;
}

function formatPlayerName(player, username) {
  const icon = getPlayerPetIcon(player);
  return `${icon ? `${icon} ` : ""}${username}`;
}

function getDistortionForPlayer(data, userId) {
  const player = getPlayer(data, userId);
  if (player.adminTest?.distortionKey && DISTORTIONS[player.adminTest.distortionKey]) {
    return { key: player.adminTest.distortionKey, definition: DISTORTIONS[player.adminTest.distortionKey], test: true };
  }
  const active = data.activeDistortion;
  if (active && !active.ended && Date.now() >= active.startAt && Date.now() < active.endAt && DISTORTIONS[active.key]) {
    return { key: active.key, definition: DISTORTIONS[active.key], test: false };
  }
  return null;
}

// ==================== DISTORTION COMPANION SIGNATURE ABILITIES ====================
function getSignaturePet(player) {
  const owned = getEquippedPet(player);
  const definition = getOwnedPetDefinition(owned);
  return owned && definition?.signatureAbility ? { owned, definition, level: getCompanionLevelInfo(owned).level } : null;
}

function ensureSignatureState(ownedPet) {
  if (!ownedPet) return {};
  if (!ownedPet.signatureState || typeof ownedPet.signatureState !== "object") ownedPet.signatureState = {};
  return ownedPet.signatureState;
}

function signatureTier(level, low, mid, high) {
  if (level >= 10) return high;
  if (level >= 5) return mid;
  return low;
}

function signatureAbilityText(ownedPet) {
  const definition = getOwnedPetDefinition(ownedPet);
  if (!ownedPet || !definition?.signatureAbility) return null;
  const level = getCompanionLevelInfo(ownedPet).level;
  const name = definition.signatureName || definition.signatureAbility;
  let effect = "";
  let next = "";
  switch (definition.signatureAbility) {
    case "kindled_hunt": effect = `After a failed catch, your next capture gains **+${signatureTier(level,5,7,10)}%**.`; break;
    case "from_the_ashes": effect = `Every **${signatureTier(level,6,5,4)} successful catches**, gain **+10 Hunter Points** and a bonus egg roll.`; break;
    case "frozen_time": effect = `Every **${signatureTier(level,4,3,3)} successful catches**, your next hunt cooldown is reduced by **${level>=10?60:50}%**.`; break;
    case "second_chance": effect = `Failed captures at 25%+ have a **${signatureTier(level,15,20,25)}%** chance to immediately reroll.`; break;
    case "rune_reader": effect = `Species Knowledge is treated as **${level>=10?2:1} tier${level>=10?'s':''} higher** for capture chance.`; break;
    case "arcane_duplication": effect = `Egg discoveries have a **${signatureTier(level,10,13,16)}%** chance to duplicate. Impossible Eggs cannot be copied.`; break;
    case "grave_scavenger": effect = `Every **${signatureTier(level,5,4,3)} successful catches**, uncover a random capture item or bait.`; break;
    case "veilwalk": effect = `Every **${signatureTier(level,8,7,6)} hunts**, Veilwalk can prevent one failed capture from ending the encounter.`; break;
    case "written_in_the_stars": effect = `Each hunt has a **${signatureTier(level,10,15,20)}%** chance to gain **+8% capture chance**.`; break;
    case "paradox": effect = `Successful captures have a **${signatureTier(level,5,7,10)}%** chance to duplicate. Mythic, Ultra Rare, and Unmade creatures are excluded.`; break;
    case "borrowed_talent": effect = `Each hunt has a **${signatureTier(level,20,30,40)}%** chance to copy another owned companion's natural passive for that hunt.`; break;
    case "this_wasnt_supposed_to_happen": effect = `Successful normal catches have a **${signatureTier(level,1,2,3)}%** chance to create an immediate Rare-or-better bonus encounter.`; break;
  }
  if (level < 5) next = "Level 5 unlocks the next signature upgrade.";
  else if (level < 10) next = "Level 10 unlocks the final signature upgrade.";
  else next = "Final signature tier unlocked.";
  return `❖ **SIGNATURE ABILITY — ${name}**\n${effect}\n*${next}*`;
}

function getRuneReaderKnowledgeBonus(player, monster) {
  const sig = getSignaturePet(player);
  if (!sig || sig.definition.signatureAbility !== "rune_reader") return 0;
  const encounters = getKnowledgeCount(player, monster);
  const thresholds = [0,3,5,10,20];
  const bonuses = [0,5,10,15,20];
  let idx = 0;
  for (let i=0;i<thresholds.length;i++) if (encounters >= thresholds[i]) idx=i;
  const jump = sig.level >= 10 ? 2 : 1;
  const upgraded = bonuses[Math.min(bonuses.length-1, idx+jump)];
  return Math.max(0, upgraded - getKnowledgeBonus(encounters));
}

function getSignatureCaptureBonus(player) {
  const sig = getSignaturePet(player);
  if (!sig) return 0;
  const state = ensureSignatureState(sig.owned);
  let bonus = 0;
  if (sig.definition.signatureAbility === "kindled_hunt" && state.kindledReady) bonus += signatureTier(sig.level,5,7,10);
  if (sig.definition.signatureAbility === "written_in_the_stars" && state.starBonusActive) bonus += 8;
  return bonus;
}

function consumeAttemptSignatureState(player) {
  const sig = getSignaturePet(player);
  if (!sig) return;
  const state = ensureSignatureState(sig.owned);
  if (sig.definition.signatureAbility === "kindled_hunt") state.kindledReady = false;
  if (sig.definition.signatureAbility === "written_in_the_stars") state.starBonusActive = false;
}

function prepareSignatureForHunt(player) {
  const sig = getSignaturePet(player);
  if (!sig) return "";
  const state = ensureSignatureState(sig.owned);
  if (sig.definition.signatureAbility === "written_in_the_stars") {
    const chance = signatureTier(sig.level,10,15,20);
    state.starBonusActive = Math.random()*100 < chance;
    return state.starBonusActive ? `\n\n✨ **WRITTEN IN THE STARS**\n${getOwnedPetName(sig.owned)} foresaw fortune around this hunt. **Capture Chance +8%**` : "";
  }
  if (sig.definition.signatureAbility === "borrowed_talent") {
    state.copiedAbility = null;
    const chance = signatureTier(sig.level,20,30,40);
    if (Math.random()*100 < chance) {
      const candidates = (player.pets||[]).filter(p=>String(p.id)!==String(sig.owned.id)).map(p=>({owned:p,def:getOwnedPetDefinition(p)})).filter(x=>x.def && !x.def.signatureAbility && x.def.ability !== "cooldown");
      if (candidates.length) {
        const picked = candidates[Math.floor(Math.random()*candidates.length)];
        const level = getCompanionLevelInfo(picked.owned).level;
        state.copiedAbility = { ability:picked.def.ability, baseBonus:picked.def.baseBonus, level, sourceName:getOwnedPetName(picked.owned) };
        return `\n\n🎭 **BORROWED TALENT**\n${getOwnedPetName(sig.owned)} copied **${getOwnedPetName(picked.owned)}'s ${abilityDisplayName(picked.def.ability)} Lv. ${level}** for this hunt.`;
      }
    }
  }
  if (sig.definition.signatureAbility === "veilwalk") {
    state.hunts = (state.hunts||0)+1;
    const every = signatureTier(sig.level,8,7,6);
    if (state.hunts >= every) { state.hunts=0; state.veilwalkReady=true; return `\n\n👻 **VEILWALK READY**\nVeilkin can prevent the next failed capture from ending this encounter.`; }
  }
  return "";
}

function copiedPetBonus(player, ability) {
  const sig = getSignaturePet(player);
  if (!sig || sig.definition.signatureAbility !== "borrowed_talent") return 0;
  const copied = ensureSignatureState(sig.owned).copiedAbility;
  if (!copied || copied.ability !== ability) return 0;
  return abilityBonusAtLevel(copied.ability,copied.baseBonus,copied.level);
}

function rollSignatureScavenge(player, sig) {
  const state=ensureSignatureState(sig.owned); state.successes=(state.successes||0)+1;
  const every=signatureTier(sig.level,5,4,3); if(state.successes<every) return ""; state.successes=0;
  const options=["berry","honey","net","rareBait","epicBait"];
  const pick=options[Math.floor(Math.random()*options.length)];
  if(pick==="rareBait"){player.bait.rare++; return "💀 **GRAVE SCAVENGER!** Bone Familiar unearthed **1 Rare Bait**.";}
  if(pick==="epicBait"){player.bait.epic++; return "💀 **GRAVE SCAVENGER!** Bone Familiar unearthed **1 Epic Bait**.";}
  player.captureItems[pick]++; return `💀 **GRAVE SCAVENGER!** Bone Familiar unearthed **${CAPTURE_ITEMS[pick].name}**.`;
}

function duplicateDiscoveredEgg(player, distortionEggFound, eggFound) {
  const sig=getSignaturePet(player); if(!sig || sig.definition.signatureAbility!=="arcane_duplication") return "";
  const chance=signatureTier(sig.level,10,13,16); if(Math.random()*100>=chance) return "";
  if(distortionEggFound){
    const key=Object.entries(DISTORTION_EGGS).find(([,e])=>e===distortionEggFound)?.[0];
    if(!key || key==="impossible") return "";
    player.eggs.push({id:`glyph-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,eggKey:key,rarity:"Distortion",foundAt:Date.now(),source:"Arcane Duplication"});
    player.titleProgress.eggsFound=(player.titleProgress.eggsFound||0)+1;
    return `🌀 **ARCANE DUPLICATION!** Glyph Wisp copied the egg's magical signature. **You received a second ${distortionEggFound.name}!**`;
  }
  if(eggFound){ player.eggs.push({rarity:eggFound,foundAt:Date.now(),source:"Arcane Duplication"}); player.titleProgress.eggsFound=(player.titleProgress.eggsFound||0)+1; return `🌀 **ARCANE DUPLICATION!** Glyph Wisp copied the egg's magical signature. **You received a second ${eggFound} Egg!**`; }
  return "";
}

function bonusEggRollFromAshes(player,data,userId) {
  const distortion=getDistortionForPlayer(data,userId);
  if(distortion && Math.random()*100 < DISTORTION_EGG_DROP_CHANCE){
    const key=distortion.definition.eggKey; const egg=DISTORTION_EGGS[key];
    player.eggs.push({id:`ashes-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,eggKey:key,rarity:"Distortion",foundAt:Date.now(),source:"From the Ashes",adminTest:Boolean(distortion.test)});
    player.titleProgress.eggsFound=(player.titleProgress.eggsFound||0)+1;
    return `${egg.icon} **Bonus Egg Roll:** ${egg.name} discovered!`;
  }
  const rarity=rollEggRarity(player,data); if(!rarity) return "🥚 **Bonus Egg Roll:** No egg answered the call this time.";
  player.eggs.push({rarity,foundAt:Date.now(),source:"From the Ashes"}); player.titleProgress.eggsFound=(player.titleProgress.eggsFound||0)+1;
  return `🥚 **Bonus Egg Roll:** ${rarity} Egg discovered!`;
}

function createUnwrittenBonusMonster() {
  const rare=monsters.filter(m=>m.rarity==="Rare"), epic=monsters.filter(m=>m.rarity==="Epic"), legendary=monsters.filter(m=>m.rarity==="Legendary");
  const roll=Math.random()*100; const pool=roll<55?rare:roll<85?epic:legendary;
  return pool.length ? {...pool[Math.floor(Math.random()*pool.length)],unwrittenBonus:true} : null;
}

function getPlayerHuntCooldown(player, data = null, userId = null) {
  const currentData = data || loadData();
  if (player.adminTest?.cooldownBypass) return 0;
  const distortion = userId ? getDistortionForPlayer(currentData, userId) : null;
  const shatterActive = Boolean(currentData.worldStory?.event?.active && ["collision","stabilize","unmade"].includes(currentData.worldStory.event.stage));
  let baseCooldown = shatterActive ? WORLD_SHATTER_HUNT_COOLDOWN : (distortion ? DISTORTION_HUNT_COOLDOWN : HUNT_COOLDOWN);
  if (isBigGameActive(currentData)) baseCooldown = Math.min(baseCooldown, BIG_GAME_COOLDOWN);
  const sig = getSignaturePet(player);
  if (sig?.definition.signatureAbility === "frozen_time" && ensureSignatureState(sig.owned).frozenTimeReady) {
    baseCooldown = Math.floor(baseCooldown * (sig.level >= 10 ? 0.40 : 0.50));
  }
  const reductionMinutes = getPetBonus(player, "cooldown") * 5;
  const blessing = getActiveCommunityBlessing(currentData, "cooldown");
  const blessingReduction = blessing?.definition?.cooldownReductionMs || 0;
  const minimumCooldown = shatterActive ? 5 * 60 * 1000 : 30 * 60 * 1000;
  return Math.max(
    minimumCooldown,
    baseCooldown - reductionMinutes * 60 * 1000 - blessingReduction
  );
}

function formatAbilityEffect(entry) {
  const bonus = abilityBonusAtLevel(entry.ability, entry.baseBonus, entry.level);
  const labels = {
    eggFinder: `+${bonus}% egg discovery chance`,
    shiny: `+${bonus}% shiny chance`,
    capture: `+${bonus}% normal capture chance`,
    cooldown: `${bonus * 5} minute hunt cooldown reduction`,
    points: `+${bonus} points on successful catches`,
    itemFinder: `+${bonus}% companion item-find chance`
  };
  return labels[entry.ability] || abilityDisplayName(entry.ability);
}

function petPassiveText(player) {
  const ownedPet = getEquippedPet(player);
  if (!ownedPet) return "No pet equipped.";
  const signature = signatureAbilityText(ownedPet);
  const inherited = getPetAbilityEntries(ownedPet).filter(entry=>!entry.natural).map(entry => `🧬 ${abilityDisplayName(entry.ability)} Lv. ${entry.level}: ${formatAbilityEffect(entry)}`).join("\n");
  return signature ? `${signature}${inherited ? `\n${inherited}` : ""}` : getPetAbilityEntries(ownedPet).map(entry => `${entry.natural ? "✨" : "🧬"} ${abilityDisplayName(entry.ability)} Lv. ${entry.level}: ${formatAbilityEffect(entry)}`).join("\n");
}

function petPassiveTextForOwned(ownedPet) {
  if (!ownedPet) return "Unknown passive.";
  const signature = signatureAbilityText(ownedPet);
  const inherited = getPetAbilityEntries(ownedPet).filter(entry=>!entry.natural).map(entry => `Inherited ${abilityDisplayName(entry.ability)} Lv. ${entry.level}: ${formatAbilityEffect(entry)}`).join(" | ");
  return signature ? `${signature}${inherited ? `\n${inherited}` : ""}` : getPetAbilityEntries(ownedPet).map(entry => `${entry.natural ? "Natural" : "Inherited"} ${abilityDisplayName(entry.ability)} Lv. ${entry.level}: ${formatAbilityEffect(entry)}`).join(" | ");
}

function getIncubatorSlots(player) {
  return Math.min(
    MAX_INCUBATORS,
    1 + Math.floor((player?.points || 0) / POINTS_PER_INCUBATOR)
  );
}

function getNewIncubatorUnlockText(player, previousPoints) {
  const before = Math.min(
    MAX_INCUBATORS,
    1 + Math.floor((previousPoints || 0) / POINTS_PER_INCUBATOR)
  );
  const after = getIncubatorSlots(player);
  player.lastIncubatorSlots = after;

  if (after <= before) return "";

  return (
    `\n\n🎉 **NEW INCUBATOR UNLOCKED!**\n` +
    `You reached **${(after - 1) * POINTS_PER_INCUBATOR} Hunter Points**.\n` +
    `Incubators: **${before} → ${after}**`
  );
}

function isNormalEggPet(definition) {
  if (!definition) return false;

  // CRITICAL POOL SAFETY:
  // Normal Common/Rare/Epic/Legendary Eggs may ONLY hatch companions from
  // the original known habitat collections. Distortion companions and
  // secret Unmade companions are registered in the master `pets` array so
  // !pets / !pet / !viewpet / passives can use them, but they must never
  // leak into the normal egg hatch pool.
  return Object.prototype.hasOwnProperty.call(PET_COLLECTIONS, definition.habitat);
}

function choosePetFromEgg(rarity) {
  const pool = pets.filter(
    pet => pet.rarity === rarity && isNormalEggPet(pet)
  );

  if (pool.length === 0) return null;

  if (rarity !== "Legendary") {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Legendary normal Eggs use ONLY the original Legendary habitat companions.
  // Keeping this explicit list also provides a second layer of protection
  // against future Distortion/secret pets entering the normal egg pool.
  const weighted = [
    { key: "verdant_sentinel", weight: 15 },
    { key: "leviacub", weight: 15 },
    { key: "titan_spawn", weight: 15 },
    { key: "infernal_wyrmling", weight: 15 },
    { key: "white_tyrant_cub", weight: 15 },
    { key: "storm_emperor_cub", weight: 10 },
    { key: "hollow_prince", weight: 10 },
    { key: "astral_spawn", weight: 5 }
  ].filter(entry => {
    const definition = getPetDefinition(entry.key);
    return definition && isNormalEggPet(definition) && definition.rarity === "Legendary";
  });

  if (weighted.length === 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll < 0) return getPetDefinition(entry.key);
  }

  return getPetDefinition(weighted[0].key);
}

function rollEggRarity(player, data = null) {
  const petBonus = getPetBonus(player, "eggFinder");
  const emptySlots = Math.max(0, getIncubatorSlots(player) - (player.incubatingEggs || []).length);
  const nestBonus = Math.min(8, emptySlots * 2);
  const blessing = getActiveCommunityBlessing(data || loadData(), "eggs");
  const blessingBonus = blessing?.definition?.eggBonus || 0;
  const bonus = petBonus + nestBonus + blessingBonus;
  // A modest global increase keeps unlocked incubators useful without flooding inventories.
  if (Math.random() * 100 < 12 + Math.floor(bonus / 4)) return "Legendary";
  if (Math.random() * 100 < 24 + Math.floor(bonus / 3)) return "Epic";
  if (Math.random() * 100 < 36 + Math.floor(bonus / 2)) return "Rare";
  if (Math.random() * 100 < 60 + bonus) return "Common";
  return null;
}

function maybeFindEgg(player, data = null) {
  const rarity = rollEggRarity(player, data);
  if (!rarity) return null;
  player.eggs.push({ rarity, foundAt: Date.now() });
  player.titleProgress.eggsFound = (player.titleProgress.eggsFound || 0) + 1;
  return rarity;
}

function rollPetAffectionEvent(player) {
  const ownedPet = getEquippedPet(player);
  const definition = getOwnedPetDefinition(ownedPet);
  if (!ownedPet || !definition || Math.random() * 100 >= PET_AFFECTION_EVENT_CHANCE) {
    return { text: "", bonusXp: 0 };
  }

  const displayName = getOwnedPetName(ownedPet);
  const events = {
    Cheerful: `${getPetDisplayIcon(definition)} **${displayName}** celebrates the victory and refuses to leave your side.`,
    Curious: `${getPetDisplayIcon(definition)} **${displayName}** studies the monster's tracks, then proudly returns to you.`,
    Loyal: `${getPetDisplayIcon(definition)} **${displayName}** guards you while you recover from the hunt.`,
    Mischievous: `${getPetDisplayIcon(definition)} **${displayName}** steals a trophy from the battlefield and presents it to you.`,
    Sleepy: `${getPetDisplayIcon(definition)} **${displayName}** curls up beside you after the hunt, looking unusually content.`,
    Brave: `${getPetDisplayIcon(definition)} **${displayName}** steps between you and danger without hesitation.`
  };

  ownedPet.affectionEvents = (ownedPet.affectionEvents || 0) + 1;
  return {
    text: events[ownedPet.personality] || events.Curious,
    bonusXp: COMPANION_XP_AFFECTION_BONUS
  };
}

function companionReaction(player, caughtMonster) {
  const ownedPet = getEquippedPet(player);
  const definition = getOwnedPetDefinition(ownedPet);
  if (!ownedPet || !definition || Math.random() * 100 >= PET_REACTION_CHANCE) return { text: "", rewards: [] };
  const displayName = getOwnedPetName(ownedPet);

  const reactions = {
    Cheerful: `${getPetDisplayIcon(definition)} **${displayName}** cheers excitedly beside you!`,
    Curious: `${getPetDisplayIcon(definition)} **${displayName}** carefully inspects the tracks left behind.`,
    Loyal: `${getPetDisplayIcon(definition)} **${displayName}** stands proudly at your side.`,
    Mischievous: `${getPetDisplayIcon(definition)} **${displayName}** darts around your new catch and causes a little chaos.`,
    Sleepy: `${getPetDisplayIcon(definition)} **${displayName}** wakes up just long enough to celebrate.`,
    Brave: `${getPetDisplayIcon(definition)} **${displayName}** lets out a fearless victory cry!`
  };

  const rewards = [];
  const findChance = 3 + getPetBonus(player, "itemFinder");
  if (Math.random() * 100 < findChance) {
    const roll = Math.random() * 100;
    if (roll < 55) {
      player.captureItems.berry++;
      rewards.push(`${getPetDisplayIcon(definition)} ${displayName} found a ${CAPTURE_ITEMS.berry.name}!`);
    } else if (roll < 82) {
      player.captureItems.honey++;
      rewards.push(`${getPetDisplayIcon(definition)} ${displayName} found a ${CAPTURE_ITEMS.honey.name}!`);
    } else if (roll < 96) {
      player.captureItems.net++;
      rewards.push(`${getPetDisplayIcon(definition)} ${displayName} found an ${CAPTURE_ITEMS.net.name}!`);
    } else {
      player.points += 10;
      rewards.push(`${getPetDisplayIcon(definition)} ${displayName} found **10 Hunter Points**!`);
    }
    ownedPet.timesHelped = (ownedPet.timesHelped || 0) + 1;
  }

  return { text: reactions[ownedPet.personality] || reactions.Curious, rewards };
}

function resolveOwnedPet(player, input) {
  const wanted = String(input || "").trim();
  const numeric = Number(wanted);
  if (Number.isInteger(numeric) && numeric > 0) return player.pets[numeric - 1] || null;
  return player.pets.find(owned =>
    getOwnedPetDefinition(owned)?.name.toLowerCase() === wanted.toLowerCase() ||
    String(owned.nickname || "").toLowerCase() === wanted.toLowerCase()
  ) || null;
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

function getCommunitySeasonPoints(data) {
  return Object.values(data.players || {}).reduce(
    (sum, player) => sum + Math.max(0, Number(player.points || 0)),
    0
  );
}

function cleanupExpiredCommunityBlessings(data) {
  if (!data.communityBlessings || typeof data.communityBlessings !== "object") {
    data.communityBlessings = {};
  }

  const now = Date.now();
  for (const [relicKey, blessing] of Object.entries(data.communityBlessings)) {
    if (!blessing || Number(blessing.expiresAt || 0) <= now) {
      delete data.communityBlessings[relicKey];
    }
  }
}

function getActiveCommunityBlessing(data, type) {
  cleanupExpiredCommunityBlessings(data);
  return Object.entries(data.communityBlessings || {})
    .map(([relicKey, saved]) => ({
      relicKey,
      saved,
      definition: COMMUNITY_BLESSINGS[relicKey]
    }))
    .find(entry =>
      entry.definition &&
      entry.definition.type === type &&
      Number(entry.saved?.expiresAt || 0) > Date.now()
    ) || null;
}

function applyCommunityPointBlessing(data, points) {
  const base = Math.max(0, Number(points || 0));
  const blessing = getActiveCommunityBlessing(data, "points");
  if (!blessing) return base;
  return Math.max(base, Math.ceil(base * (blessing.definition.pointMultiplier || 1)));
}

function getUndiscoveredWorldRelics(data) {
  return ultraRareMonsters.filter(monster => !data.worldProgress?.[monster.relicKey]);
}

function discoverWorldRelic(data, relicMonster, source = "community", player = null) {
  if (!relicMonster || data.worldProgress?.[relicMonster.relicKey]) return null;

  data.worldProgress[relicMonster.relicKey] = true;

  if (player) {
    player.relics[relicMonster.relicKey] = (player.relics[relicMonster.relicKey] || 0) + 1;
  }

  const discoveredCount = RELIC_KEYS.filter(key => data.worldProgress?.[key]).length;
  const allDiscovered = discoveredCount === RELIC_KEYS.length;

  if (allDiscovered) {
    data.worldShatterUnlocked = true;
    initializeFinalWarningState(data);
  } else if (discoveredCount >= 4) {
    initializeFourOfFiveAnomalyState(data);
  }

  let blessing = null;
  if (source === "community" && !allDiscovered) {
    const definition = COMMUNITY_BLESSINGS[relicMonster.relicKey];
    if (definition) {
      blessing = {
        relicKey: relicMonster.relicKey,
        name: definition.name,
        type: definition.type,
        description: definition.description,
        startedAt: Date.now(),
        expiresAt: Date.now() + COMMUNITY_BLESSING_DURATION
      };
      data.communityBlessings[relicMonster.relicKey] = blessing;
    }
  }

  return {
    monster: relicMonster,
    source,
    discoveredCount,
    allDiscovered,
    blessing
  };
}

function maybeDiscoverRelicFromFetch(data, player) {
  const undiscovered = getUndiscoveredWorldRelics(data);
  if (undiscovered.length === 0) return null;
  if (Math.random() * 100 >= FETCH_WORLD_RELIC_CHANCE) return null;

  const relicMonster = undiscovered[Math.floor(Math.random() * undiscovered.length)];
  return discoverWorldRelic(data, relicMonster, "fetch", player);
}

async function announceWorldRelicDiscovery(channel, result, userId = null) {
  if (!result || !channel?.isTextBased()) return;

  const monster = result.monster;
  const progress = `${result.discoveredCount}/${RELIC_KEYS.length}`;
  const worldData = loadData();
  const shatterWhen = worldData.worldStory?.shatterScheduledAt ? `<t:${Math.floor(worldData.worldStory.shatterScheduledAt/1000)}:F> (<t:${Math.floor(worldData.worldStory.shatterScheduledAt/1000)}:R>)` : "the next available weekend";

  if (result.source === "community") {
    if (result.allDiscovered) {
      await sendWorldEvent(channel, 
        `# ⚠️ THE WORLD HAS STOPPED MOVING.\n\n` +
        `For one impossible moment, every monster falls silent.\n` +
        `Every companion looks toward the horizon.\n\n` +
        `${monster.relicName} has awakened through the combined efforts of the entire Monster Hunt community.\n\n` +
        `🌍 **WORLD PROGRESS: ${progress}**\n\n` +
        `The five World Relics begin to resonate.\n` +
        `Ancient seals crack somewhere beyond sight...\n\n` +
        `**The fragments were never pieces of a key. They were pieces of a seal.**\n\n` +
        `🚨 A major community event is being prepared for **${shatterWhen}**.`
      ).catch(() => null);
      return;
    }

    const blessing = COMMUNITY_BLESSINGS[monster.relicKey];
    await sendWorldEvent(channel, 
      `# 🌍 THE WORLD TREMBLES...\n\n` +
      `Across every habitat, monsters suddenly grow restless. Companions stop in their tracks and stare toward the horizon...\n\n` +
      `Then a pulse of ancient energy erupts from somewhere deep beneath the world.\n\n` +
      `💎 **A WORLD RELIC HAS BEEN DISCOVERED!**\n` +
      `${monster.relicName}\n\n` +
      `The relic was not discovered by a single Hunter.\n` +
      `**It was awakened by the combined efforts of the entire Monster Hunt community.**\n\n` +
      `🌍 **WORLD PROGRESS: ${progress}**\n\n` +
      `✨ **COMMUNITY BLESSING ACTIVATED — 24 HOURS**\n` +
      `${blessing?.icon || "✨"} **${blessing?.name || "World Blessing"}:** ${blessing?.description || "The world favors the Hunters."}\n\n` +
      `Whatever is sleeping beyond the world has noticed you.`
    ).catch(() => null);
    return;
  }

  if (result.source === "fetch") {
    await sendWorldEvent(channel, 
      `# 🌍 A WORLD RELIC HAS BEEN DISCOVERED!\n\n` +
      `${userId ? `<@${userId}>'s companion` : "A companion"} returned carrying something that should not have been found...\n\n` +
      `💎 **${monster.relicName}**\n` +
      `*${monster.relicDescription}*\n\n` +
      `🌍 **WORLD PROGRESS: ${progress}**\n\n` +
      `${result.allDiscovered
        ? `The final unknown Relic has been uncovered. Ancient seals begin to crack...\n\n**The fragments were never pieces of a key. They were pieces of a seal.**\n\n🚨 A major community event is being prepared for **${shatterWhen}**.`
        : result.discoveredCount === 4 ? `Four Relics now resonate at once.\n\n🚨 **WORLD STABILITY: CRITICAL**\nSomething remains missing.` : `Something beyond the world stirs.`}`
    ).catch(() => null);
    return;
  }

  if (result.source === "ultra") {
    await sendWorldEvent(channel,
      `# 💎 A WORLD RELIC HAS BEEN RECOVERED!\n\n` +
      `${userId ? `<@${userId}>` : "A Hunter"} recovered **${monster.relicName}** from ${cleanMonsterName(monster.name)}.\n\n` +
      `🌍 **WORLD PROGRESS: ${progress}**\n\n` +
      `${result.allDiscovered
        ? `For one impossible moment, every monster falls silent.\n\nThe five Relics begin to resonate.\n\n**The fragments were never pieces of a key. They were pieces of a seal.**\n\n🚨 A major community event is being prepared for **${shatterWhen}**.`
        : result.discoveredCount === 4 ? `Four Relics now resonate somewhere within the hunting grounds.\n\n🚨 **WORLD STABILITY: CRITICAL**\nReality is no longer repairing itself cleanly.` : `Something beyond the world has noticed you.`}`
    ).catch(() => null);
  }
}

async function processCommunityWorldProgress() {
  const data = loadData();
  cleanupExpiredCommunityBlessings(data);

  const totalPoints = getCommunitySeasonPoints(data);
  const awarded = new Set((data.worldCommunityMilestonesAwarded || []).map(Number));
  const nextThreshold = COMMUNITY_WORLD_THRESHOLDS.find(value => totalPoints >= value && !awarded.has(value));

  if (!nextThreshold) {
    saveData(data);
    return;
  }

  const undiscovered = getUndiscoveredWorldRelics(data);
  if (undiscovered.length === 0) {
    data.worldCommunityMilestonesAwarded.push(nextThreshold);
    saveData(data);
    return;
  }

  // A hidden community milestone always discovers a currently-undiscovered Relic.
  const relicMonster = undiscovered[Math.floor(Math.random() * undiscovered.length)];
  const result = discoverWorldRelic(data, relicMonster, "community");

  data.worldCommunityMilestonesAwarded.push(nextThreshold);
  saveData(data);

  const channel = client.channels.cache.get(MONSTER_CHANNEL_ID);
  await announceWorldRelicDiscovery(channel, result);
}

function getLeaderPoints(data, excludedId = null) {
  return Math.max(0, ...Object.entries(data.players || {}).filter(([id]) => id !== excludedId).map(([, p]) => Number(p.points || 0)));
}

function getComebackTier(data, player, userId = null) {
  const behind = Math.max(0, getLeaderPoints(data, userId) - Number(player.points || 0));
  if (behind >= 200) return { behind, pointMultiplier: 1.75, catchBonus: 8, label: "+75%" };
  if (behind >= 100) return { behind, pointMultiplier: 1.40, catchBonus: 5, label: "+40%" };
  if (behind >= 50) return { behind, pointMultiplier: 1.20, catchBonus: 2, label: "+20%" };
  return { behind, pointMultiplier: 1, catchBonus: 0, label: null };
}

function isWeeklyCompetitionActive(data) {
  return Boolean(data.weeklyCompetition?.active && Date.now() >= data.weeklyCompetition.startsAt);
}

function addWeeklyProgress(data, player, points, monster = null) {
  if (!isWeeklyCompetitionActive(data)) return;
  player.weeklyStats.points += Math.max(0, points || 0);
  if (monster) {
    player.weeklyStats.catches++;
    if (monster.shiny) player.weeklyStats.shinies++;
    if (monster.rarity === "Legendary") player.weeklyStats.legendaries++;
  }
}

function petAbilityCapacity(player) {
  return 1 + Math.floor(Math.max(0, Number(player.points || 0)) / 100);
}

function perfectCatchLoot(player) {
  const roll = Math.random() * 100;
  if (roll < 35) { player.captureItems.berry++; return CAPTURE_ITEMS.berry.name; }
  if (roll < 58) { player.captureItems.honey++; return CAPTURE_ITEMS.honey.name; }
  if (roll < 73) { player.captureItems.net++; return CAPTURE_ITEMS.net.name; }
  if (roll < 85) { player.bait.rare++; return "🔵 Rare Bait"; }
  if (roll < 93) { player.bait.epic++; return "🟣 Epic Bait"; }
  if (roll < 98) { player.bait.legendary++; return "🟠 Legendary Bait"; }
  if (roll < 99.5) { player.captureItems.masterCharm++; return CAPTURE_ITEMS.masterCharm.name; }
  const rarity = rollEggRarity(player) || "Common";
  player.eggs.push({ rarity, foundAt: Date.now(), source: "Perfect Catch" });
  player.titleProgress.eggsFound = (player.titleProgress.eggsFound || 0) + 1;
  return `${EGG_TYPES[rarity]?.icon || "🥚"} ${rarity} Egg`;
}

function fetchFlavor(definition, personality, returning = false, ownedPet = null) {
  const displayName = ownedPet ? getOwnedPetName(ownedPet) : definition.name;
  const starts = {
    Cheerful: `${displayName} bounds away with unstoppable enthusiasm!`,
    Curious: `${displayName} follows a mysterious trail into the distance.`,
    Loyal: `${displayName} gives you one last determined look before setting out.`,
    Mischievous: `${displayName} vanishes suspiciously quickly. This is probably fine.`,
    Sleepy: `${displayName} yawns, stretches, and slowly wanders off to search.`,
    Brave: `${displayName} charges into the wilds without a second thought!`
  };
  const returns = {
    Cheerful: `${displayName} comes racing back, proudly showing off its haul!`,
    Curious: `${displayName} returns after investigating every strange sound along the way.`,
    Loyal: `${displayName} returns directly to your side with supplies carefully protected.`,
    Mischievous: `${displayName} returns looking far too innocent and drops its findings at your feet.`,
    Sleepy: `${displayName} returns with supplies... and immediately curls up for a nap.`,
    Brave: `${displayName} marches back triumphantly from its adventure!`
  };
  return (returning ? returns : starts)[personality] || (returning ? returns.Curious : starts.Curious);
}

function rollFetchRewards(data, player, ownedPet, definition) {
  const relicDiscovery = maybeDiscoverRelicFromFetch(data, player);

  // A World Relic jackpot replaces the normal Fetch haul so the moment stays special
  // and does not add another large stack of regular supplies.
  if (relicDiscovery) {
    return {
      rewards: [`💎 **${relicDiscovery.monster.relicName}**`],
      relicDiscovery
    };
  }

  const rewards = [];

  // Fetch quantity stays conservative. Rarity mostly improves QUALITY.
  const quantityRoll = Math.random() * 100;
  const quantityChances = {
    Common:    { two: 5,  three: 0.25 },
    Rare:      { two: 8,  three: 0.5 },
    Epic:      { two: 12, three: 1 },
    Legendary: { two: 16, three: 2 }
  };
  const quantity = quantityChances[definition.rarity] || quantityChances.Common;
  const count = quantityRoll < quantity.three
    ? 3
    : (quantityRoll < quantity.three + quantity.two ? 2 : 1);

  const rarityQualityBoost = {
    Common: 0,
    Rare: 4,
    Epic: 8,
    Legendary: 12
  }[definition.rarity] || 0;

  const fetchBlessing = getActiveCommunityBlessing(data, "fetch");
  const blessingQualityBoost = fetchBlessing?.definition?.fetchQualityBonus || 0;
  const ability = definition.ability;

  for (let i = 0; i < count; i++) {
    let roll = Math.random() * 100 + rarityQualityBoost + blessingQualityBoost;

    // Hidden specialties influence what the pet tends to find, not quantity.
    if (ability === "eggFinder") roll -= 12;
    if (ability === "itemFinder") roll += 3;
    if (ability === "capture") roll += 2;

    roll = Math.max(0, Math.min(100, roll));

    if (roll < 8) {
      const rarity = rollEggRarity(player, data) || "Common";
      player.eggs.push({ rarity, foundAt: Date.now(), source: "Fetch" });
      player.titleProgress.eggsFound = (player.titleProgress.eggsFound || 0) + 1;
      rewards.push(`${EGG_TYPES[rarity]?.icon || "🥚"} **${rarity} Egg**`);
    } else if (roll < 38) {
      player.captureItems.berry++;
      rewards.push(CAPTURE_ITEMS.berry.name);
    } else if (roll < 57) {
      player.captureItems.honey++;
      rewards.push(CAPTURE_ITEMS.honey.name);
    } else if (roll < 70) {
      player.bait.rare++;
      rewards.push("🔵 Rare Bait");
    } else if (roll < 80) {
      player.captureItems.net++;
      rewards.push(CAPTURE_ITEMS.net.name);
    } else if (roll < 88) {
      player.bait.epic++;
      rewards.push("🟣 Epic Bait");
    } else if (roll < 94) {
      player.bait.legendary++;
      rewards.push("🟠 Legendary Bait");
    } else if (roll < 96) {
      player.captureItems.masterCharm++;
      rewards.push(CAPTURE_ITEMS.masterCharm.name);
    } else {
      const basePts = 5 + Math.floor(Math.random() * 6);
      const pts = applyCommunityPointBlessing(data, basePts);
      player.points += pts;
      addWeeklyProgress(data, player, pts);
      rewards.push(`⭐ **${pts} Hunter Points**`);
    }
  }

  return { rewards, relicDiscovery: null };
}

function calculateCaptureChance(player, monster, itemKey = null, data = null, userId = null) {
  const event = getActiveEvent();
  const comeback = getComebackTier(data || loadData(), player, userId);
  const isMixerMonster = cleanMonsterName(monster.name) === "Mixer Monster";
  const encounters = getKnowledgeCount(player, monster);
  const runeReaderBonus = isMixerMonster ? 0 : getRuneReaderKnowledgeBonus(player, monster);
  const knowledgeBonus = isMixerMonster ? 0 : getKnowledgeBonus(encounters) + runeReaderBonus;
  const eventBonus = isMixerMonster ? 0 : (event?.captureBoost ? 10 : 0);
  const petBonus = isMixerMonster ? 0 : getPetBonus(player, "capture") + getSignatureCaptureBonus(player);
  const comebackBonus = isMixerMonster ? 0 : comeback.catchBonus;
  const item = itemKey ? CAPTURE_ITEMS[itemKey] : null;

  if (item?.guaranteed) {
    return {
      total: 100,
      base: monster.chance,
      knowledgeBonus,
      eventBonus,
      itemBonus: item.bonus,
      petBonus,
      comebackBonus,
      guaranteed: true
    };
  }

  const total = Math.min(
    MAX_CAPTURE_CHANCE,
    monster.chance + knowledgeBonus + eventBonus + petBonus + comebackBonus + (item?.bonus || 0)
  );

  return {
    total,
    base: monster.chance,
    knowledgeBonus,
    eventBonus,
    itemBonus: item?.bonus || 0,
    petBonus,
    comebackBonus,
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
  const chanceInfo = calculateCaptureChance(player, monster, itemKey, data, userId);
  let roll = Math.floor(Math.random() * 100) + 1;
  let criticalCatch = roll === 100;
  let perfectCatch = roll === 1;
  let signatureAttemptText = "";

  if (itemKey) {
    player.captureItems[itemKey]--;
    player.titleProgress.captureItemsUsed = (player.titleProgress.captureItemsUsed || 0) + 1;
    if (itemKey === "masterCharm") {
      player.titleProgress.masterCharmUsed = (player.titleProgress.masterCharmUsed || 0) + 1;
    }
  }

  let caught = criticalCatch || chanceInfo.guaranteed || roll <= chanceInfo.total;
  const rimeSig = getSignaturePet(player);
  if (!caught && chanceInfo.total >= 25 && rimeSig?.definition.signatureAbility === "second_chance") {
    const procChance = signatureTier(rimeSig.level,15,20,25);
    if (Math.random()*100 < procChance) {
      const firstRoll = roll;
      roll = Math.floor(Math.random()*100)+1;
      criticalCatch = roll === 100; perfectCatch = roll === 1;
      caught = criticalCatch || chanceInfo.guaranteed || roll <= chanceInfo.total;
      signatureAttemptText = `\n\n❄️ **RIME SPRITE — SECOND CHANCE!**\nThe monster began to escape, but time froze. **Reroll: ${firstRoll} → ${roll}**`;
    }
  }
  consumeAttemptSignatureState(player);
  const event = getActiveEvent();

  if (caught) {
    let pointsEarned = monster.points;
    if (event?.doublePoints) pointsEarned *= 2;
    pointsEarned += getPetBonus(player, "points");
    const comeback = getComebackTier(data, player, userId);
    const baseBeforeComeback = pointsEarned;
    pointsEarned = Math.max(pointsEarned, Math.ceil(pointsEarned * comeback.pointMultiplier));
    if (criticalCatch) pointsEarned += CRITICAL_CATCH_BONUS_POINTS;
    pointsEarned = applyCommunityPointBlessing(data, pointsEarned);
    const comebackExtra = pointsEarned - baseBeforeComeback - (criticalCatch ? CRITICAL_CATCH_BONUS_POINTS : 0);

    const previousPoints = player.points;
    player.points += pointsEarned;
    addWeeklyProgress(data, player, pointsEarned, monster);
    player.caught.push(monster);
    player.lifetimeCaught.push({ ...monster });
    player.currentMonster = null;
    updateQuestProgress(player, "catch", monster);

    const bonusRewards = giveCatchBonusBait(player, monster);
    const perfectLoot = perfectCatch ? perfectCatchLoot(player) : null;
    if (criticalCatch) player.titleProgress.criticalCatch = true;
    if (perfectCatch) player.titleProgress.perfectCatch = true;
    const distortionEggFound = maybeFindDistortionEgg(player, monster, data);
    const eggFound = distortionEggFound ? null : maybeFindEgg(player, data);
    const worldShatterCatch = registerWorldShatterCatch(data, userId, monster);
    const signatureMessages = [];
    if (worldShatterCatch.text) signatureMessages.push(worldShatterCatch.text);
    const sig = getSignaturePet(player);
    if (sig?.definition.signatureAbility === "from_the_ashes") {
      const state=ensureSignatureState(sig.owned); state.successes=(state.successes||0)+1;
      const every=signatureTier(sig.level,6,5,4);
      if(state.successes>=every){ state.successes=0; player.points+=10; addWeeklyProgress(data,player,10); signatureMessages.push(`🔥 **FROM THE ASHES!** Ashbound Familiar manifested **+10 Hunter Points**.\n${bonusEggRollFromAshes(player,data,userId)}`); }
    }
    if (sig?.definition.signatureAbility === "frozen_time") {
      const state=ensureSignatureState(sig.owned); state.successes=(state.successes||0)+1; const every=signatureTier(sig.level,4,3,3);
      if(state.successes>=every){state.successes=0;state.frozenTimeReady=true;signatureMessages.push(`❄️ **FROZEN TIME!** Your next hunt cooldown is reduced by **${sig.level>=10?60:50}%**.`);}
    }
    if (sig?.definition.signatureAbility === "grave_scavenger") { const text=rollSignatureScavenge(player,sig); if(text) signatureMessages.push(text); }
    const dupEggText = duplicateDiscoveredEgg(player,distortionEggFound,eggFound); if(dupEggText) signatureMessages.push(dupEggText);
    if (sig?.definition.signatureAbility === "paradox" && monster.rarity !== "Mythic" && monster.rarity !== "Ultra Rare" && monster.habitat !== "The Unmade" && Math.random()*100 < signatureTier(sig.level,5,7,10)) {
      const duplicate={...monster,paradoxDuplicate:true}; player.caught.push(duplicate); player.lifetimeCaught.push({...duplicate}); player.points += pointsEarned; addWeeklyProgress(data,player,pointsEarned,duplicate); updateQuestProgress(player,"catch",duplicate); signatureMessages.push(`🌀 **PARADOX**\nReality stutters. You remember catching **${cleanMonsterName(monster.name)}** twice. Apparently... **you did.**\n**Second copy added +${pointsEarned} points.**`);
    }
    let unwrittenBonusMonster = null;
    if (sig?.definition.signatureAbility === "this_wasnt_supposed_to_happen" && !monster.distortionEncounter && monster.rarity !== "Mythic" && Math.random()*100 < signatureTier(sig.level,1,2,3)) {
      unwrittenBonusMonster=createUnwrittenBonusMonster();
      if(unwrittenBonusMonster) signatureMessages.push(`✒️ **THIS WASN'T SUPPOSED TO HAPPEN**\nThe Unwritten reaches toward the Monster Dex. Something that wasn't there before... **is.**\nA Rare-or-better bonus encounter has been created.`);
    }
    const reaction = companionReaction(player, monster);
    const affectionEvent = rollPetAffectionEvent(player);
    const companionXpText = awardCompanionXp(
      player,
      COMPANION_XP_PER_SUCCESSFUL_HUNT + affectionEvent.bonusXp,
      affectionEvent.bonusXp > 0 ? "Successful Hunt + Affection Event" : "Successful Hunt"
    );
    const incubatorUnlockText = getNewIncubatorUnlockText(player, previousPoints);
    const isMixerMonster = cleanMonsterName(monster.name) === "Mixer Monster";
    player.titleProgress.failedCaptureStreak = 0;
    if (isMixerMonster && itemKey !== "masterCharm") {
      player.titleProgress.mixerWithoutCharm = true;
    }

    const mixerUnlocks = isMixerMonster
      ? unlockSecretReward(
          player,
          MIXER_MONSTER.secretAchievement,
          MIXER_MONSTER.titleReward
        )
      : [];

    const automaticTitleUnlocks = checkTitleUnlocks(player);

    const hunterName = seasonMomentPlayerName(data, message.author.id);
    addSeasonMoment(data, {
      type: "first_catch",
      playerId: message.author.id,
      icon: "🐾",
      text: `${hunterName} made the first successful catch of the season: ${cleanMonsterName(monster.name)}.`,
      uniqueKey: "season:first_catch"
    });

    if (monster.shiny) {
      addSeasonMoment(data, {
        type: "first_shiny",
        playerId: message.author.id,
        icon: "✨",
        text: `${hunterName} discovered the season's first Shiny: ${cleanMonsterName(monster.name)}!`,
        uniqueKey: "season:first_shiny"
      });
    }

    if (monster.rarity === "Legendary") {
      addSeasonMoment(data, {
        type: "first_legendary",
        playerId: message.author.id,
        icon: "🐉",
        text: `${hunterName} captured the season's first Legendary monster: ${cleanMonsterName(monster.name)}!`,
        uniqueKey: "season:first_legendary"
      });
    }

    if (eggFound) {
      addSeasonMoment(data, {
        type: "first_egg",
        playerId: message.author.id,
        icon: "🥚",
        text: `${hunterName} uncovered the season's first ${eggFound} Egg.`,
        uniqueKey: "season:first_egg"
      });
    }

    if (isMixerMonster) {
      addSeasonMoment(data, {
        type: "mixer_capture",
        playerId: message.author.id,
        icon: "🌌",
        text: `${hunterName} captured the mythical Mixer Monster!`
      });
    }

    if (criticalCatch) addSeasonMoment(data, { type: "critical_catch", playerId: userId, icon: "💯", text: `${hunterName} rolled a Natural 100 and made a Critical Catch on ${cleanMonsterName(monster.name)}!` });
    if (perfectCatch) addSeasonMoment(data, { type: "perfect_catch", playerId: userId, icon: "🎯", text: `${hunterName} rolled a Natural 1 and made a Perfect Catch on ${cleanMonsterName(monster.name)}!` });
    recordPointMilestoneMoments(data, message.author.id, previousPoints, player.points);
    const huntTokenText = awardHuntTokens(data, player, userId, monster);
    if (unwrittenBonusMonster) {
      player.currentMonster = unwrittenBonusMonster;
      player.lastHunt = 0;
    }
    saveData(data);
    await announceTitleUnlocks(message, automaticTitleUnlocks);

    if (isMixerMonster) {
      await message.channel.send(
        `🌌━━━━━━━━━━━━━━━━━━━━━━🌌\n\n` +
        `✨ **THE MIXER MONSTER HAS BEEN CAPTURED!** ✨\n\n` +
        `${formatPlayerMention(data, message.author.id)} captured the rarest creature in Monster Hunt!\n` +
        `🏆 **+${pointsEarned} Hunter Points**\n` +
        `🌌 **Achievement:** ${MIXER_MONSTER.secretAchievement}\n` +
        `✨ **Title:** ${MIXER_MONSTER.titleReward}\n\n` +
        `🌌━━━━━━━━━━━━━━━━━━━━━━🌌`
      );
    }

    const captureReply = await message.reply(
      buildMonsterEmbed(
        monster,
        `✅ You caught ${monster.name}!`,
        `${itemKey ? `**Item Used:** ${CAPTURE_ITEMS[itemKey].name}\n` : "**Method:** Normal Throw\n"}` +
        `**Final Capture Chance:** ${chanceInfo.total}%\n` +
        `**Roll:** ${roll}\n` +
        `${criticalCatch ? `\n💯 **CRITICAL CATCH!** A Natural 100 overrides the odds!\n🏆 **Critical Bonus: +${CRITICAL_CATCH_BONUS_POINTS} points**\n` : ""}` +
        `${perfectCatch ? `\n🎯 **PERFECT CATCH!** Natural 1 bonus loot: **${perfectLoot}**\n` : ""}` +
        `${comebackExtra > 0 ? `🔥 **Comeback Bonus: +${comebackExtra} points**\n` : ""}` +
        `**+${pointsEarned} points**` +
        `${huntTokenText}` +
        `${signatureAttemptText}` +
        `${signatureMessages.length ? `\n\n❖ **SIGNATURE ABILITY**\n${signatureMessages.join("\n\n")}` : ""}` +
        `${distortionEggFound ? `\n\n🌀 **DISTORTION EGG FOUND!**\n${distortionEggFound.icon} You discovered a **${distortionEggFound.name}**!` : ""}` +
        `${eggFound ? `\n\n🥚 **EGG FOUND!**\n${EGG_TYPES[eggFound]?.icon || "🥚"} You discovered a **${eggFound} Egg**!` : ""}` +
        `${reaction.text ? `\n\n🐾 **Companion Reaction**\n${reaction.text}` : ""}` +
        `${reaction.rewards.length > 0 ? `\n${reaction.rewards.join("\n")}` : ""}` +
        `${affectionEvent.text ? `\n\n❤️ **Affection Event**\n${affectionEvent.text}` : ""}` +
        `${companionXpText ? `\n\n⭐ **Companion Progress**\n${companionXpText}` : ""}` +
        `${bonusRewards.length > 0 ? `\n\n**Bonus Rewards:**\n${bonusRewards.join("\n")}` : ""}` +
        `${incubatorUnlockText}` +
        `${formatSecretUnlocks(mixerUnlocks)}`
      )
    );
    if (unwrittenBonusMonster) {
      const bonusChance = calculateCaptureChance(player, unwrittenBonusMonster, null, data, userId);
      await message.channel.send(buildMonsterEmbed(unwrittenBonusMonster, `✒️ UNWRITTEN BONUS ENCOUNTER — ${unwrittenBonusMonster.name}`, `**Rarity:** ${unwrittenBonusMonster.rarity}\n**Capture Chance:** ${bonusChance.total}%\n\nThis encounter ignores the hunt cooldown. Use \`!catch\` to attempt the capture.`));
    }
    if (worldShatterCatch.reveal) {
      const freshShatterData = loadData();
      await revealUnmade(freshShatterData, false);
    }
    return captureReply;
  }

  const failureSig = getSignaturePet(player);
  const failureMessages = [];
  let keepEncounter = false;
  if (failureSig?.definition.signatureAbility === "kindled_hunt") { ensureSignatureState(failureSig.owned).kindledReady = true; failureMessages.push(`🔥 **KINDLED HUNT!** Your failed catch fuels Ember Imp. Your next capture attempt gains **+${signatureTier(failureSig.level,5,7,10)}%**.`); }
  if (failureSig?.definition.signatureAbility === "veilwalk" && ensureSignatureState(failureSig.owned).veilwalkReady) { ensureSignatureState(failureSig.owned).veilwalkReady=false; keepEncounter=true; failureMessages.push(`👻 **VEILWALK!** The monster starts to escape, but Veilkin pulls it back through the Veil. **The encounter remains active — use \`!catch\` to try again.**`); }
  player.currentMonster = keepEncounter ? monster : null;
  saveData(data);

  const encounters = getKnowledgeCount(player, monster);
  const knowledgeBonus = getKnowledgeBonus(encounters);

  return message.reply(
    buildMonsterEmbed(
      monster,
      `❌ ${monster.name} escaped!`,
      `${itemKey ? `**Item Used:** ${CAPTURE_ITEMS[itemKey].name}\n` : "**Method:** Normal Throw\n"}` +
      `**Final Capture Chance:** ${chanceInfo.total}%\n` +
      `**Roll:** ${roll}` +
      `${signatureAttemptText}` +
      `${failureMessages.length ? `\n\n❖ **SIGNATURE ABILITY**\n${failureMessages.join("\n")}` : ""}` +
      `\n\n📚 You learned from the encounter!\n` +
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
  if (!filename) return null;

  const searchFolders = [
    __dirname,
    path.join(__dirname, "images"),
    path.join(__dirname, "images", "merchant"),
    path.join(__dirname, "assets"),
    path.join(__dirname, "assets", "images"),
    path.join(__dirname, "assets", "images", "merchant"),
    path.join(__dirname, "public"),
    path.join(__dirname, "public", "images"),
    path.join(__dirname, "src"),
    path.join(__dirname, "src", "images")
  ];

  const wanted = path.basename(filename).toLowerCase();
  for (const folder of searchFolders) {
    if (!fs.existsSync(folder)) continue;
    const exactPath = path.join(folder, filename);
    if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) return exactPath;
    try {
      const matchingFile = fs.readdirSync(folder).find(file => file.toLowerCase() === wanted);
      if (matchingFile) {
        const matchedPath = path.join(folder, matchingFile);
        if (fs.statSync(matchedPath).isFile()) return matchedPath;
      }
    } catch (error) {
      console.error(`Could not search image folder ${folder}:`, error.message);
    }
  }
  return null;
}

function getMonsterImage(monster) {
  if (!monster) return null;
  const cleanName = cleanMonsterName(monster.name || "");
  const distortionMonsters = Object.values(DISTORTIONS).flatMap(definition => definition.monsters || []);
  const allMonsters = [...monsters, MIXER_MONSTER, ...eventMonsters, ...ultraRareMonsters, ...distortionMonsters];
  const match = allMonsters.find(candidate =>
    candidate.key === monster.key ||
    cleanMonsterName(candidate.name).toLowerCase() === cleanName.toLowerCase()
  );
  return findImageFile(monster.image || match?.image);
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

function applyShiny(monster, player = null, data = null) {
  const event = getActiveEvent();
  const blessing = getActiveCommunityBlessing(data || loadData(), "shiny");
  const blessingBonus = blessing?.definition?.shinyBonus || 0;

  const chance =
    (event?.shinyBoost ? SHINY_CHANCE * 3 : SHINY_CHANCE) +
    getPetBonus(player, "shiny") +
    blessingBonus;

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

function weightedDistortionMonster(definition) {
  const weighted = [];
  for (const monster of definition.monsters) {
    const weight = monster.rarity === "Common" ? 40 :
      monster.rarity === "Rare" ? 25 :
      monster.rarity === "Epic" ? 8 :
      monster.rarity === "Legendary" ? 2 :
      monster.name === "NULL" ? 1 : 12;
    for (let i = 0; i < weight; i++) weighted.push(monster);
  }
  return { ...weighted[Math.floor(Math.random() * weighted.length)] };
}

function getRandomMonsterForPlayer(player, data, userId) {
  const ws = data.worldStory?.event;
  if (ws?.active && ["collision","stabilize","unmade"].includes(ws.stage)) {
    if (!ws.participants || typeof ws.participants !== "object") ws.participants = {};
    if (!ws.participants[userId]) ws.participants[userId] = { planes: {}, catches: 0, attacks: 0 };
    const roll = Math.random() * 100;
    if (ws.stage === "unmade") {
      if (roll < 60) {
        const monster = weightedDistortionMonster(DISTORTIONS.unmade);
        monster.distortionKey = "unmade"; monster.distortionEncounter = true; monster.worldShatterEncounter = true;
        return monster;
      }
      if (roll < 90) {
        const key = WORLD_KNOWN_DISTORTION_KEYS[Math.floor(Math.random()*WORLD_KNOWN_DISTORTION_KEYS.length)];
        const monster = weightedDistortionMonster(DISTORTIONS[key]);
        monster.distortionKey = key; monster.distortionEncounter = true; monster.worldShatterEncounter = true;
        return monster;
      }
      return { ...getRandomMonster(player), worldShatterEncounter: true };
    }
    if (roll < 80) {
      const key = WORLD_KNOWN_DISTORTION_KEYS[Math.floor(Math.random()*WORLD_KNOWN_DISTORTION_KEYS.length)];
      const monster = weightedDistortionMonster(DISTORTIONS[key]);
      monster.distortionKey = key; monster.distortionEncounter = true; monster.worldShatterEncounter = true;
      return monster;
    }
    return { ...getRandomMonster(player), worldShatterEncounter: true };
  }
  const distortion = getDistortionForPlayer(data, userId);
  if (distortion && Math.random() * 100 < DISTORTION_EVENT_MONSTER_CHANCE) {
    const monster = weightedDistortionMonster(distortion.definition);
    monster.distortionKey = distortion.key;
    monster.distortionEncounter = true;
    monster.adminTest = distortion.test;
    return monster;
  }
  return getRandomMonster(player);
}

function getEggDisplay(egg) {
  if (egg?.eggKey && DISTORTION_EGGS[egg.eggKey]) {
    const d = DISTORTION_EGGS[egg.eggKey];
    return `${d.icon} **${d.name}**`;
  }
  return `${EGG_TYPES[egg?.rarity]?.icon || "🥚"} **${egg?.rarity || "Unknown"} Egg**`;
}

function chooseDistortionPet(eggKey) {
  const egg = DISTORTION_EGGS[eggKey];
  if (!egg) return null;
  const roll = Math.random() * 100;
  let total = 0;
  for (const choice of egg.pets) {
    total += choice.weight;
    if (roll < total) return getPetDefinition(choice.key);
  }
  return getPetDefinition(egg.pets[egg.pets.length - 1].key);
}

function maybeFindDistortionEgg(player, monster, data) {
  if (!monster?.distortionEncounter || !monster.distortionKey) return null;
  const inUnmadeShatter = Boolean(monster.worldShatterEncounter && data.worldStory?.event?.active && data.worldStory.event.stage === "unmade" && monster.distortionKey === "unmade");
  const dropChance = inUnmadeShatter ? WORLD_SHATTER_IMPOSSIBLE_EGG_CHANCE : DISTORTION_EGG_DROP_CHANCE;
  if (Math.random() * 100 >= dropChance) return null;
  const definition = DISTORTIONS[monster.distortionKey];
  if (!definition) return null;
  const eggKey = definition.eggKey;
  const id = `dist-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  player.eggs.push({ id, eggKey, rarity: "Distortion", foundAt: Date.now(), source: definition.name, adminTest: Boolean(monster.adminTest) });
  player.titleProgress.eggsFound = (player.titleProgress.eggsFound || 0) + 1;
  if (monster.adminTest) player.adminTest.generatedEggIds.push(id);
  return DISTORTION_EGGS[eggKey];
}

function getRandomMonster(player) {
  const event = getActiveEvent();

  // The Mixer Monster is a separate Mythic encounter and is unaffected by
  // events, habitat boosts, bait, and shiny rolls.
  if (Math.random() * 100 < MIXER_MONSTER_ENCOUNTER_CHANCE) {
    return { ...MIXER_MONSTER };
  }

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
    }, player);
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
    }, player);
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

  return applyShiny(monster, player);
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

function rerollUnfinishedDailyQuests(player) {
  const completed = (player.dailyQuests || []).filter(q => q.progress >= q.goal);
  const unfinished = (player.dailyQuests || []).filter(q => q.progress < q.goal);

  if (unfinished.length === 0) {
    return { changed: false, reason: "complete" };
  }

  const usedIds = new Set(completed.map(q => q.id));
  const oldUnfinishedIds = new Set(unfinished.map(q => q.id));
  const replacements = [];

  for (const oldQuest of unfinished) {
    let candidates = questPool.filter(q =>
      !usedIds.has(q.id) &&
      !oldUnfinishedIds.has(q.id)
    );

    if (candidates.length === 0) {
      candidates = questPool.filter(q =>
        !usedIds.has(q.id) &&
        q.id !== oldQuest.id
      );
    }

    if (candidates.length === 0) {
      candidates = questPool.filter(q => q.id !== oldQuest.id);
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    if (!chosen) {
      replacements.push({ ...oldQuest });
      usedIds.add(oldQuest.id);
      continue;
    }

    replacements.push({ ...chosen, progress: 0 });
    usedIds.add(chosen.id);
  }

  player.dailyQuests = [...completed, ...replacements];

  return {
    changed: true,
    completed,
    unfinished,
    replacements
  };
}

function formatDailyQuestList(player) {
  return (player.dailyQuests || [])
    .map(q =>
      `${q.progress >= q.goal ? "✅" : "⬜"} ${q.text} (${q.progress}/${q.goal})`
    )
    .join("\n");
}

function getDailyRerollStatus(player) {
  const used = Math.max(0, Number(player.dailyRerollsUsed || 0));

  if (used < DAILY_FREE_REROLLS) {
    return {
      available: true,
      costType: "free",
      text: "🎟️ **Next reroll: FREE**"
    };
  }

  if (used < DAILY_MAX_REROLLS) {
    return {
      available: true,
      costType: "berry",
      text: `🍓 **Next reroll: ${DAILY_SECOND_REROLL_BERRY_COST} Hunter Berry**`
    };
  }

  return {
    available: false,
    costType: "none",
    text: "🔒 **No rerolls remaining today.**"
  };
}

function getResetDate(date = new Date()) {
  const mountainTime = new Date(
    date.toLocaleString("en-US", {
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

function hasClaimedDailyRewardToday(player) {
  const currentResetDate = getResetDate();

  // New format: the reset-date string is stored directly.
  if (typeof player.dailyReward === "string") {
    return player.dailyReward === currentResetDate;
  }

  // Backward compatibility for existing save data that stored a timestamp.
  if (typeof player.dailyReward === "number" && player.dailyReward > 0) {
    return getResetDate(new Date(player.dailyReward)) === currentResetDate;
  }

  return false;
}

function resetDaily(player) {
  const today = getResetDate();

  if (player.lastDaily !== today) {
    player.dailyQuests = generateDailyQuests();
    player.dailyClaimed = false;
    player.dailyRerollsUsed = 0;
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

function giveRandomDailyReward(player, data = null) {
  const roll = Math.floor(Math.random() * 100) + 1;

  if (roll <= 25) {
    const points = applyCommunityPointBlessing(data || loadData(), 5);
    player.points += points;
    return `💰 +${points} Points`;
  }

  if (roll <= 45) {
    const points = applyCommunityPointBlessing(data || loadData(), 10);
    player.points += points;
    return `💰 +${points} Points`;
  }

  if (roll <= 55) {
    const points = applyCommunityPointBlessing(data || loadData(), 20);
    player.points += points;
    return `💰 +${points} Points`;
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
  checkTitleUnlocks(player);
  return [...new Set(player.unlockedTitles || [])];
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

function evaluatePetCollectionRewards(data, player) {
  const unlocked = [];
  unlocked.grandRewardGranted = false;
  const discoveredKeys = new Set(player.discoveredPetKeys || []);

  for (const [habitat, reward] of Object.entries(PET_COLLECTIONS)) {
    const habitatKeys = pets
      .filter(pet => pet.habitat === habitat)
      .map(pet => pet.key);

    if (habitatKeys.length > 0 && habitatKeys.every(key => discoveredKeys.has(key))) {
      unlocked.push(...unlockSecretReward(player, reward.achievement, reward.title));
    }
  }

  const knownCollectionPets = pets.filter(pet => Object.prototype.hasOwnProperty.call(PET_COLLECTIONS, pet.habitat));
  if (knownCollectionPets.every(pet => discoveredKeys.has(pet.key))) {
    unlocked.push(...unlockSecretReward(
      player,
      GRAND_PET_COLLECTION_REWARD.achievement,
      GRAND_PET_COLLECTION_REWARD.title
    ));

    if (!player.grandPetCollectionRewardClaimed) {
      player.grandPetCollectionRewardClaimed = true;
      player.points += GRAND_PET_COLLECTION_REWARD.pointReward;
      addWeeklyProgress(data, player, GRAND_PET_COLLECTION_REWARD.pointReward);
      player.eggs.push({
        rarity: GRAND_PET_COLLECTION_REWARD.eggRarity,
        foundAt: Date.now(),
        source: GRAND_PET_COLLECTION_REWARD.achievement
      });
      player.titleProgress.eggsFound = (player.titleProgress.eggsFound || 0) + 1;

      for (const title of GRAND_PET_COLLECTION_REWARD.legendaryTitles) {
        unlocked.push(...unlockSecretReward(
          player,
          `${GRAND_PET_COLLECTION_REWARD.achievement}: ${title}`,
          title
        ));
      }
      unlocked.grandRewardGranted = true;
    }
  }

  const unmadeMonsterNames = new Set(["The Misplaced", "Stitchmaw", "The Empty Knight", "The Forgotten", "NULL"]);
  const unmadeMonstersCaught = new Set(
    [...(player.caught || []), ...(player.lifetimeCaught || [])]
      .map(monster => cleanMonsterName(monster.name))
      .filter(name => unmadeMonsterNames.has(name))
  );
  const hasUnmadePets = discoveredKeys.has("mimicling") && discoveredKeys.has("the_unwritten");
  if (unmadeMonstersCaught.size === 5 && hasUnmadePets) {
    unlocked.push(...unlockSecretReward(
      player,
      "What Was Never Made",
      "You Were Never Here"
    ));
  }

  return unlocked;
}

function petCollectionProgressText(player) {
  const discoveredKeys = new Set(player.discoveredPetKeys || []);

  return Object.entries(PET_COLLECTIONS).map(([habitat, reward]) => {
    const habitatPets = pets.filter(pet => pet.habitat === habitat);
    const collected = habitatPets.filter(pet => discoveredKeys.has(pet.key)).length;
    const complete = collected === habitatPets.length;

    return (
      `${complete ? "✅" : "⬜"} ${reward.icon} **${habitat}: ${collected}/${habitatPets.length}**` +
      `${complete ? ` — Title: **${reward.title}**` : ""}`
    );
  }).join("\n");
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

async function announceGrandPetCollectionReward(channel, data, userId) {
  const titleLines = GRAND_PET_COLLECTION_REWARD.legendaryTitles
    .map(title => `🟠 **${title}**`)
    .join("\n");
  return sendRoleImageAnnouncement(
    channel,
    `🏆━━━━━━━━━━━━━━━━━━━━━━🏆\n\n` +
    `# MASTER BEAST TAMER\n\n` +
    `${formatPlayerMention(data, userId)} has permanently discovered all **32 standard habitat companions!**\n\n` +
    `⭐ **+${GRAND_PET_COLLECTION_REWARD.pointReward} Hunter Points**\n` +
    `🟡 **+1 Legendary Egg**\n` +
    `🌈 **Master Beast Tamer** — Mythic Title\n` +
    `${titleLines}\n\n` +
    `Every standard habitat species will remain permanently checked in their Pet Dex.\n\n` +
    `🏆━━━━━━━━━━━━━━━━━━━━━━🏆`,
    null,
    false
  );
}

function getDexStats(data) {
  const stats = {};

  [...monsters, MIXER_MONSTER, ...eventMonsters, ...ultraRareMonsters].forEach(m => {
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
  if (monster.key === "worldeater") {
    const elapsedTicks = Math.floor((now - state.startAt) / (5 * 60 * 1000));
    return Math.max(1, monster.catchChance - elapsedTicks);
  }

  return monster.catchChance;
}

function getUltraParticipantReward(monster, state) {
  return ULTRA_PARTICIPANT_REWARD;
}

function getUltraCooldownMs(monster, state) {
  if (monster.key === "chronovore") {
    const modifierMinutes = Number(state.cooldownModifierMinutes || 0);
    return Math.max(60 * 1000, ULTRA_HUNT_COOLDOWN + modifierMinutes * 60 * 1000);
  }

  return ULTRA_HUNT_COOLDOWN;
}

function ensureUltraAbilityState(state) {
  if (!state.personalEffects || typeof state.personalEffects !== "object") {
    state.personalEffects = {};
  }
  if (state.cooldownModifierMinutes === undefined) state.cooldownModifierMinutes = 0;
  if (state.abilityTickCount === undefined) state.abilityTickCount = 0;
}

function getUltraPersonalEffect(state, userId) {
  ensureUltraAbilityState(state);
  if (!state.personalEffects[userId]) {
    state.personalEffects[userId] = {
      markedPenalty: 0,
      starBlessing: 0
    };
  }
  return state.personalEffects[userId];
}

function getUltraPersonalBonusText(monster, state, userId) {
  const effect = getUltraPersonalEffect(state, userId);
  const lines = [];

  if (effect.markedPenalty > 0) {
    lines.push(`👁️ **All-Seeing Mark:** -${effect.markedPenalty}% on your next attempt`);
  }
  if (effect.starBlessing > 0) {
    lines.push(`🌠 **Fallen Star Blessing:** +${effect.starBlessing}% on your next attempt`);
  }

  if (monster.key === "chronovore") {
    const cooldownMinutes = Math.round(getUltraCooldownMs(monster, state) / 60000);
    lines.push(`⏳ **Time Distortion:** Ultra Hunt cooldown is currently ${cooldownMinutes} minutes`);
  }

  return lines.length > 0 ? lines.join("\n") : "No temporary Ultra effects.";
}

function calculateUltraCaptureChance(monster, state, itemKey = null, userId = null) {
  const baseChance = getUltraCatchChance(monster, state);
  const item = itemKey ? CAPTURE_ITEMS[itemKey] : null;
  const effect = userId
    ? getUltraPersonalEffect(state, userId)
    : { markedPenalty: 0, starBlessing: 0 };

  const personalBonus = (effect.starBlessing || 0) - (effect.markedPenalty || 0);

  if (item?.guaranteed) {
    return {
      total: 100,
      base: baseChance,
      itemBonus: item.bonus,
      personalBonus,
      guaranteed: true
    };
  }

  return {
    total: Math.max(
      1,
      Math.min(MAX_CAPTURE_CHANCE, baseChance + (item?.bonus || 0) + personalBonus)
    ),
    base: baseChance,
    itemBonus: item?.bonus || 0,
    personalBonus,
    guaranteed: false
  };
}

function buildUltraCaptureChoices(player, monster, state, userId = null) {
  const choices = [{
    number: 1,
    itemKey: null,
    label: "🎯 Normal Throw",
    chance: calculateUltraCaptureChance(monster, state, null, userId).total
  }];

  for (const itemKey of ["berry", "honey", "net", "masterCharm"]) {
    if ((player.captureItems[itemKey] || 0) <= 0) continue;
    const item = CAPTURE_ITEMS[itemKey];
    choices.push({
      number: choices.length + 1,
      itemKey,
      label: `${item.name} x${player.captureItems[itemKey]}`,
      chance: calculateUltraCaptureChance(monster, state, itemKey, userId).total
    });
  }

  return choices;
}

function ultraAbilityText(monster) {
  if (!monster?.abilityName) return "";
  return (
    `\n\n⚠️ **Special Ability: ${monster.abilityName}**\n` +
    `${monster.abilityDescription}`
  );
}

function buildUltraMonsterEmbed(monster, title, description, { thumbnail = false } = {}) {
  const imagePath = getMonsterImage(monster);
  const files = [];
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description);

  if (imagePath) {
    const filename = path.basename(imagePath);
    const attachment = new AttachmentBuilder(imagePath, { name: filename });
    files.push(attachment);

    const attachmentUrl = `attachment://${filename}`;
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
  const ultraCooldownMs = getUltraCooldownMs(monster, state);
  const timeLeft = ultraCooldownMs - (Date.now() - participant.lastAttempt);

  if (timeLeft > 0) {
    return message.reply(`⏳ You can use \`!ultrahunt\` again in **${formatTime(timeLeft)}**.`);
  }

  if (itemKey && (player.captureItems[itemKey] || 0) <= 0) {
    return message.reply(`You no longer have any ${CAPTURE_ITEMS[itemKey].name}.`);
  }

  const chanceInfo = calculateUltraCaptureChance(monster, state, itemKey, message.author.id);
  const roll = Math.floor(Math.random() * 100) + 1;

  if (itemKey) player.captureItems[itemKey]--;

  participant.attempts++;
  participant.lastAttempt = Date.now();
  state.participants[message.author.id] = participant;
  player.titleProgress.ultraAttempts = (player.titleProgress.ultraAttempts || 0) + 1;
  if (chanceInfo.total <= 5 && (chanceInfo.guaranteed || roll <= chanceInfo.total)) {
    player.titleProgress.ultraAtFiveOrLess = true;
  }

  const personalEffect = getUltraPersonalEffect(state, message.author.id);
  personalEffect.markedPenalty = 0;
  personalEffect.starBlessing = 0;

  if (chanceInfo.guaranteed || roll <= chanceInfo.total) {
    saveData(data);
    return resolveUltraCatch(message, monster, state, roll, chanceInfo.total, itemKey);
  }

  state.failedAttempts = (state.failedAttempts || 0) + 1;
  const automaticTitleUnlocks = checkTitleUnlocks(player);
  saveData(data);
  await announceTitleUnlocks(message, automaticTitleUnlocks);

  let personalityText = "";
  if (monster.key === "worldeater") {
    personalityText = `\n🌑 Reality continues collapsing. Current base chance: **${getUltraCatchChance(monster, state)}%**.`;
  } else if (monster.key === "thousandeyes") {
    personalityText = "\n👁️ Its gaze searches for another hunter to mark.";
  } else if (monster.key === "chronovore") {
    personalityText = `\n⏳ Current Ultra cooldown: **${Math.round(getUltraCooldownMs(monster, state) / 60000)} minutes**.`;
  } else if (monster.key === "astralcolossus") {
    personalityText = "\n🌠 Another fallen star may soon choose a hunter.";
  } else if (monster.key === "harbinger") {
    personalityText = "\n💀 After the halfway point, it may vanish without warning.";
  }

  return message.reply(buildUltraMonsterEmbed(
    monster,
    `❌ ${monster.name} escaped your attempt!`,
    `${itemKey ? `**Item Used:** ${CAPTURE_ITEMS[itemKey].name}\n` : "**Method:** Normal Throw\n"}` +
    `**Base Catch Chance:** ${chanceInfo.base}%\n` +
    `${chanceInfo.itemBonus > 0 ? `**Item Bonus:** +${chanceInfo.itemBonus}%\n` : ""}` +
    `${chanceInfo.personalBonus !== 0 ? `**Ultra Ability Modifier:** ${chanceInfo.personalBonus > 0 ? "+" : ""}${chanceInfo.personalBonus}%\n` : ""}` +
    `**Final Catch Chance:** ${chanceInfo.total}%\n` +
    `**Roll:** ${roll}${personalityText}\n\n` +
    `Try again when your Ultra cooldown ends while the event remains active.`,
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

async function getEggsPetsChannel() {
  const cached = client.channels.cache.get(EGGS_PETS_CHANNEL_ID);
  if (cached && cached.isTextBased()) return cached;

  const fetched = await client.channels.fetch(EGGS_PETS_CHANNEL_ID).catch(error => {
    console.error("Failed to fetch Eggs & Pets channel:", error);
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
    personalEffects: {},
    cooldownModifierMinutes: 0,
    abilityTickCount: 0,
    lastPersonalityTick: startAt,
    sourceUserId,
    resolved: false,
    returnScheduled: false
  };
  saveData(data);

  const ultraMessage = buildUltraMonsterEmbed(
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
    `${monster.description}` +
    `${ultraAbilityText(monster)}

` +
    `Use \`!ultrahunt\` to view your available catch choices.

` +
    `🏆 Catcher Reward: **${ULTRA_CATCHER_REWARD} points**
` +
    `🎉 Other participants earn at least **${ULTRA_PARTICIPANT_REWARD} points** if it is caught.`
  );

  await channel.send({
    content: `<@&${MONSTER_NOTIFY_ROLE}>`,
    embeds: ultraMessage.embeds,
    files: ultraMessage.files
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
    personalEffects: {},
    cooldownModifierMinutes: 0,
    abilityTickCount: 0,
    lastPersonalityTick: startAt,
    sourceUserId: userId,
    resolved: false,
    summoned: true,
    announcedActive: false,
    returnScheduled: false
  };
  addSeasonMoment(data, {
    type: "ultra_summon",
    playerId: userId,
    icon: "🔮",
    text: `${seasonMomentPlayerName(data, userId)} sacrificed ${monster.relicName} to summon ${cleanMonsterName(monster.name)}.`
  });

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

  addSeasonMoment(data, {
    type: "ultra_escape",
    icon: "💨",
    text: `${cleanMonsterName(monster.name)} ${reason === "fled" ? "fled early" : "escaped"} after facing ${participantIds.length} hunter${participantIds.length === 1 ? "" : "s"}.`
  });

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
      `${formatPlayerMention(data, rewardMessage.userId)}${formatSecretUnlocks(rewardMessage.unlocks)}`
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
      personalEffects: {},
      cooldownModifierMinutes: 0,
      abilityTickCount: 0,
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
      const ultraMessage = buildUltraMonsterEmbed(
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
        `${monster.description}` +
        `${ultraAbilityText(monster)}

` +
        `Use \`!ultrahunt\` to view your available catch choices.`
      );

      await channel.send({
        content: `<@&${MONSTER_NOTIFY_ROLE}>`,
        embeds: ultraMessage.embeds,
        files: ultraMessage.files
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

  ensureUltraAbilityState(state);

  const elapsedTicks = Math.floor((now - state.lastPersonalityTick) / (5 * 60 * 1000));
  if (elapsedTicks <= 0) return;

  for (let tick = 0; tick < elapsedTicks; tick++) {
    state.lastPersonalityTick += 5 * 60 * 1000;
    state.abilityTickCount++;

    const participantIds = Object.keys(state.participants || {});

    if (monster.key === "worldeater") {
      await channel.send(
        `🌑 **REALITY COLLAPSE!**\n\n` +
        `${monster.name} consumes another piece of the battlefield.\n` +
        `Base catch chance is now **${getUltraCatchChance(monster, state, state.lastPersonalityTick)}%**.`
      );
    }

    if (monster.key === "thousandeyes" && participantIds.length > 0) {
      const targetId = participantIds[Math.floor(Math.random() * participantIds.length)];
      const effect = getUltraPersonalEffect(state, targetId);
      effect.markedPenalty = 5;

      await channel.send(
        `👁️ **ALL-SEEING GAZE!**\n\n` +
        `${formatPlayerMention(data, targetId)} has been marked by ${monster.name}.\n` +
        `Their next Ultra attempt suffers **-5% catch chance**.`
      );
    }

    if (monster.key === "chronovore") {
      state.cooldownModifierMinutes = Math.random() < 0.5 ? -2 : 2;
      const cooldownMinutes = Math.round(getUltraCooldownMs(monster, state) / 60000);
      const accelerated = state.cooldownModifierMinutes < 0;

      await channel.send(
        `⏳ **TIME DISTORTION!**\n\n` +
        `${accelerated ? "Time accelerates around the battlefield." : "Time slows to a painful crawl."}\n` +
        `Ultra Hunt cooldown is now **${cooldownMinutes} minutes** until the next distortion.`
      );
    }

    if (monster.key === "astralcolossus" && participantIds.length > 0) {
      const targetId = participantIds[Math.floor(Math.random() * participantIds.length)];
      const effect = getUltraPersonalEffect(state, targetId);
      effect.starBlessing = 5;

      await channel.send(
        `🌠 **FALLING STAR!**\n\n` +
        `A fallen star chooses ${formatPlayerMention(data, targetId)}!\n` +
        `Their next Ultra attempt gains **+5% catch chance**.`
      );
    }

    if (monster.key === "harbinger") {
      const elapsedFromStart = state.lastPersonalityTick - state.startAt;
      if (elapsedFromStart >= 15 * 60 * 1000) {
        await channel.send(
          `💀 **SOUL FLIGHT!**\n\n` +
          `${monster.name} raises its lantern as the wandering souls pull it toward the darkness...`
        );

        if (Math.random() < 0.2) {
          saveData(data);
          return finishUltraHunt(channel, "fled");
        }

        await channel.send(`${monster.name} remains for now—but the lantern burns brighter.`);
      }
    }
  }

  saveData(data);
}

function maybeAwardUltraRelic(data, player, monster) {
  const roll = Math.floor(Math.random() * 100) + 1;
  if (roll > ULTRA_RELIC_DROP_CHANCE) return null;

  const firstDiscovery = !data.worldProgress?.[monster.relicKey];

  // If this Relic was already discovered, the catcher can still receive another physical copy.
  if (!firstDiscovery) {
    player.relics[monster.relicKey] = (player.relics[monster.relicKey] || 0) + 1;
    return { firstDiscovery: false, worldShatterUnlockedNow: false };
  }

  const result = discoverWorldRelic(data, monster, "ultra", player);
  return {
    firstDiscovery: true,
    worldShatterUnlockedNow: Boolean(result?.allDiscovered),
    discoveryResult: result
  };
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

  const catcherPointReward = applyCommunityPointBlessing(data, ULTRA_CATCHER_REWARD);
  catcher.points += catcherPointReward;
  catcher.caught.push(caughtMonster);
  catcher.lifetimeCaught.push({ ...caughtMonster });

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
      participant.points += applyCommunityPointBlessing(data, participantReward);
    }

    const newUnlocks = evaluateUltraSecretRewards(participant);
    if (newUnlocks.length > 0) {
      participantUnlockMessages.push({ userId, unlocks: newUnlocks });
    }
  }

  const relicResult = maybeAwardUltraRelic(data, catcher, monster);
  catcherUnlocks.push(...evaluateUltraSecretRewards(catcher));
  const automaticTitleUnlocks = checkTitleUnlocks(catcher);

  const ultraHunterName = seasonMomentPlayerName(data, message.author.id);
  addSeasonMoment(data, {
    type: "ultra_capture",
    playerId: message.author.id,
    icon: "⚔️",
    text: `${ultraHunterName} captured ${cleanMonsterName(monster.name)} during an Ultra Hunt!`
  });

  if (relicResult) {
    addSeasonMoment(data, {
      type: "first_relic",
      playerId: message.author.id,
      icon: "💎",
      text: `${ultraHunterName} recovered the season's first Ultra Relic: ${monster.relicName}.`,
      uniqueKey: "season:first_relic"
    });
  }

  recordPointMilestoneMoments(
    data,
    message.author.id,
    catcher.points - ULTRA_CATCHER_REWARD,
    catcher.points
  );

  // If an Ultra Hunt overlaps Big Game Hunt, only the successful catcher earns
  // the Ultra Rare token reward. Participation points remain unchanged.
  const ultraTokenText = awardHuntTokens(data, catcher, message.author.id, caughtMonster);

  saveData(data);
  await announceTitleUnlocks(message, automaticTitleUnlocks);

  await message.channel.send(
    buildMonsterEmbed(
      caughtMonster,
      `🎉 ${formatPlayerName(catcher, message.author.username)} captured ${caughtMonster.name}!`,
      `**Catch Chance:** ${chance}%\n` +
      `**Roll:** ${roll}\n\n` +
      `🏆 ${formatPlayerMention(data, message.author.id)} earned **${catcherPointReward} points**!\n` +
      `${otherParticipants.length > 0
        ? `🎉 ${otherParticipants.length} other participant${otherParticipants.length === 1 ? "" : "s"} earned **${participantReward} points each**!`
        : "You were the only participant in the hunt."}` +
      `${ultraTokenText}` +
      formatSecretUnlocks(catcherUnlocks)
    )
  );

  for (const rewardMessage of participantUnlockMessages) {
    await message.channel.send(
      `${formatPlayerMention(data, rewardMessage.userId)}${formatSecretUnlocks(rewardMessage.unlocks)}`
    );
  }

  if (relicResult) {
    await message.channel.send(
      `💎 **RELIC FOUND!**\n\n` +
      `${formatPlayerMention(data, message.author.id)} received **${monster.relicName}**!\n` +
      `*${monster.relicDescription}*\n\n` +
      `Sacrifice it later with \`!summon ${monster.relicCommand}\`.`
    );
    if (relicResult.firstDiscovery && relicResult.discoveryResult) {
      await announceWorldRelicDiscovery(message.channel, relicResult.discoveryResult, message.author.id);
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

async function checkReadyEggNotifications() {
  const data = loadData();
  const channel = await getEggsPetsChannel();
  if (!channel) return;

  const now = Date.now();
  let changed = false;

  for (const [userId, rawPlayer] of Object.entries(data.players || {})) {
    const player = getPlayer(data, userId);

    for (const incubation of player.incubatingEggs || []) {
      if (incubation.readyAt > now || incubation.notified) continue;

      incubation.notified = true;
      changed = true;

      await channel.send(
        `🥚 **EGG READY!**\n\n` +
        `${formatPlayerMention(data, userId)}, your **${incubation.rarity} Egg** has finished incubating!\n` +
        `Use \`!hatch\` to reveal your new companion.`
      ).catch(error => {
        console.error(`Failed to send egg-ready notification for ${userId}:`, error);
        incubation.notified = false;
        changed = true;
      });
    }
  }

  if (changed) saveData(data);
}


function getMountainDateTimeParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SEASON_LAUNCH_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(date)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

async function fetchLaunchChannels() {
  const channels = [];

  for (const channelId of SEASON_LAUNCH_CHANNEL_IDS) {
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel || !channel.isTextBased?.() || !channel.guild) {
      console.error(`Season launch: channel ${channelId} could not be found or is not a guild text channel.`);
      continue;
    }

    channels.push(channel);
  }

  return channels;
}

async function openSeasonLaunchChannels() {
  const channels = await fetchLaunchChannels();

  if (channels.length !== SEASON_LAUNCH_CHANNEL_IDS.length) {
    throw new Error(
      `Only ${channels.length}/${SEASON_LAUNCH_CHANNEL_IDS.length} launch channels could be loaded.`
    );
  }

  for (const channel of channels) {
    for (const roleId of SEASON_LAUNCH_ROLE_IDS) {
      await channel.permissionOverwrites.edit(roleId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AddReactions: true
      });
    }

    console.log(`Season launch: opened #${channel.name} (${channel.id}).`);
  }
}

async function sendSeasonLaunchAnnouncement() {
  const channel = await client.channels
    .fetch(SEASON_LAUNCH_ANNOUNCEMENT_CHANNEL_ID)
    .catch(() => null);

  if (!channel?.isTextBased?.()) {
    throw new Error("Season launch announcement channel could not be found.");
  }

  await channel.send({
    content:
      `<@&${MONSTER_NOTIFY_ROLE}>\n\n` +
      `🌌━━━━━━━━━━━━━━━━━━━━━━🌌\n\n` +
      `🐉 **MONSTER HUNT: SEASON 2 HAS BEGUN!** 🐉\n\n` +
      `The world is alive once again...\n\n` +
      `🌲 **40 brand-new monsters** await discovery.\n` +
      `🥚 Find mysterious **Eggs**.\n` +
      `🐾 Hatch and train powerful **Companions**.\n` +
      `⭐ Earn Companion XP and strengthen pet abilities.\n` +
      `🏆 Unlock exclusive **Titles and Achievements**.\n` +
      `📖 Complete your **Monster Dex and Pet Dex**.\n` +
      `🌌 Discover creatures hidden beyond the known world.\n` +
      `⚔️ Face **Ultra Monsters** with unique abilities.\n\n` +
      `🎯 **Use \`!hunt\` to begin your first adventure.**\n\n` +
      `❓ **Need help or a refresher?**\n` +
      `📖 Start with \`!monsterhelp\`\n` +
      `🐉 Read the rules with \`!monsterrules\`\n` +
      `🥚 Learn about eggs and pets with \`!pethelp\`\n\n` +
      `Good luck, Hunters...\n` +
      `May fortune be on your side. 🌌\n\n` +
      `🌌━━━━━━━━━━━━━━━━━━━━━━🌌`,
    allowedMentions: {
      roles: [MONSTER_NOTIFY_ROLE]
    }
  });

  console.log("Season launch: announcement sent.");
}

async function checkOneTimeSeasonLaunch() {
  const now = getMountainDateTimeParts();

  if (now.date !== SEASON_LAUNCH_DATE) return;

  const currentMinutes = now.hour * 60 + now.minute;
  const launchMinutes = 12 * 60;

  if (currentMinutes < launchMinutes) return;

  const data = loadData();

  if (!data.seasonLaunch.channelsOpened) {
    await openSeasonLaunchChannels();
    data.seasonLaunch.channelsOpened = true;
    saveData(data);
  }

  if (!data.seasonLaunch.announcementSent) {
    await sendSeasonLaunchAnnouncement();
    data.seasonLaunch.announcementSent = true;
    saveData(data);
  }
}

async function processFetchReturnsAndReminders() {
  const data = loadData();
  const huntChannel = await getMonsterHuntChannel();
  const petChannel = await getEggsPetsChannel();
  let changed = false;

  for (const [userId, playerRaw] of Object.entries(data.players || {})) {
    const player = getPlayer(data, userId);

    // Pet fetch returns always belong in the dedicated Eggs & Pets channel.
    if (player.fetchState && !player.fetchState.completed && Date.now() >= player.fetchState.readyAt) {
      const ownedPet = player.pets.find(p => String(p.id) === String(player.fetchState.petId));
      const definition = getOwnedPetDefinition(ownedPet);
      if (ownedPet && definition && petChannel?.isTextBased()) {
        const fetchResult = rollFetchRewards(data, player, ownedPet, definition);
        const rewards = fetchResult.rewards;
        const xpText = awardCompanionXp(player, FETCH_COMPANION_XP, "Fetch Adventure");
        const embed = new EmbedBuilder()
          .setTitle(`🐾 ${getOwnedPetName(ownedPet)} Returned!`)
          .setDescription(`${fetchFlavor(definition, ownedPet.personality, true, ownedPet)}\n\n**Found:**\n${rewards.map(x => `• ${x}`).join("\n")}\n\n⭐ ${xpText}`);
        const art = getPetArtworkUrl(definition); if (art) embed.setImage(art);
        await petChannel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => null);

        if (fetchResult.relicDiscovery) {
          await announceWorldRelicDiscovery(petChannel, fetchResult.relicDiscovery, userId);
        }
      }
      player.fetchState.completed = true;
      changed = true;
    }

    // Cooldown alerts are routed by system instead of whichever channel the player last used.
    for (const type of ["hunt", "fetch"]) {
      const dueKey = `${type}DueAt`, sentKey = `${type}Sent`;
      if (player.cooldownReminders?.[type] && player.reminderState?.[dueKey] && !player.reminderState[sentKey] && Date.now() >= player.reminderState[dueKey]) {
        const notificationChannel = type === "hunt" ? huntChannel : petChannel;
        if (notificationChannel?.isTextBased()) {
          await notificationChannel.send(
            type === "hunt"
              ? `<@${userId}> 🏹 Your **\`!hunt\` cooldown is over!** The wilds are ready again.`
              : `<@${userId}> 🐾 Your pet is ready to use **\`!fetch\`** again!`
          ).catch(() => null);
        }
        player.reminderState[sentKey] = true;
        changed = true;
      }
    }
  }
  if (changed) saveData(data);
}

function currentRanks(data) {
  return Object.entries(data.players || {}).sort((a,b) => (b[1].points||0)-(a[1].points||0)).reduce((acc,[id],i) => (acc[id]=i+1,acc),{});
}

async function processWeeklyCompetition() {
  const data = loadData();
  const weekly = data.weeklyCompetition;
  const channel = client.channels.cache.get(MONSTER_CHANNEL_ID);
  if (!weekly.active && Date.now() >= weekly.startsAt) {
    weekly.active = true; weekly.weekStartedAt = weekly.startsAt; weekly.lastResultsAt = 0;
    const ranks = currentRanks(data);
    for (const [id,p] of Object.entries(data.players || {})) p.weeklyStats = { points:0,catches:0,shinies:0,legendaries:0,startRank:ranks[id]||null };
    saveData(data);
    if (channel?.isTextBased()) await channel.send(`# 🏆 WEEKLY MONSTER HUNT HAS BEGUN!\n\nEveryone starts at **0 Weekly Points** while Season Points remain untouched.\nResults will be announced next Monday after the **5:00 AM Mountain Time** reset. Good luck, Hunters! 🏹`).catch(()=>null);
    return;
  }
  if (!weekly.active) return;
  const weekMs = 7*24*60*60*1000;
  if (Date.now() < weekly.weekStartedAt + weekMs) return;
  const entries = Object.entries(data.players || {}).sort((a,b)=>(b[1].weeklyStats?.points||0)-(a[1].weeklyStats?.points||0));
  const ranksNow = currentRanks(data);
  const winner = entries[0];
  let text = `# 🏆 Weekly Monster Hunt Results!\n\n`;
  entries.slice(0,3).forEach(([id,p],i)=> text += `${["🥇","🥈","🥉"][i]} <@${id}> — **${p.weeklyStats?.points||0} points**\n`);
  if (winner && (winner[1].weeklyStats?.points||0)>0) { winner[1].bait.epic += WEEKLY_WINNER_BAIT_REWARD; text += `\n🏅 <@${winner[0]}> earned **1 Epic Bait** and the honor of **Hunter of the Week!**`; }
  const shiny = [...entries].sort((a,b)=>(b[1].weeklyStats?.shinies||0)-(a[1].weeklyStats?.shinies||0))[0];
  const legends = [...entries].sort((a,b)=>(b[1].weeklyStats?.legendaries||0)-(a[1].weeklyStats?.legendaries||0))[0];
  const comeback = [...entries].sort((a,b)=>((a[1].weeklyStats?.startRank||ranksNow[a[0]]||0)-ranksNow[a[0]])-((b[1].weeklyStats?.startRank||ranksNow[b[0]]||0)-ranksNow[b[0]]))[0];
  if (shiny && (shiny[1].weeklyStats?.shinies||0)>0) text += `\n✨ Most Shinies: <@${shiny[0]}> — **${shiny[1].weeklyStats.shinies}**`;
  if (legends && (legends[1].weeklyStats?.legendaries||0)>0) text += `\n🐉 Most Legendaries: <@${legends[0]}> — **${legends[1].weeklyStats.legendaries}**`;
  if (comeback) text += `\n📈 Biggest Comeback: <@${comeback[0]}>`;
  text += `\n\nA brand-new weekly hunt begins now. Weekly scores reset; Season Points remain.`;
  if (channel?.isTextBased()) await channel.send(text).catch(()=>null);
  const ranks = currentRanks(data);
  for (const [id,p] of Object.entries(data.players || {})) p.weeklyStats = { points:0,catches:0,shinies:0,legendaries:0,startRank:ranks[id]||null };
  weekly.lastResultsAt = Date.now(); weekly.weekStartedAt += weekMs;
  while (weekly.weekStartedAt + weekMs <= Date.now()) weekly.weekStartedAt += weekMs;
  saveData(data);
}

// ==================== WORLD STORY / WORLD SHATTER ENGINE ====================
async function getTextChannel(channelId) {
  const cached = client.channels.cache.get(channelId);
  if (cached?.isTextBased()) return cached;
  const fetched = await client.channels.fetch(channelId).catch(() => null);
  return fetched?.isTextBased() ? fetched : null;
}

async function sendWorldEvent(sourceChannel, content, filename = null, pingEveryone = false) {
  const source = sourceChannel?.isTextBased() ? sourceChannel : await getTextChannel(MONSTER_CHANNEL_ID);
  const mirror = await getTextChannel(WORLD_EVENT_FEED_CHANNEL_ID);
  const imagePath = filename ? findImageFile(filename) : null;
  async function sendTo(channel, allowPing) {
    if (!channel?.isTextBased()) return null;
    const payload = { content, allowedMentions: allowPing ? { parse: ["everyone","roles"] } : { parse: [] } };
    if (imagePath) payload.files = [new AttachmentBuilder(imagePath)];
    return channel.send(payload).catch(error => { console.error("World event send failed:", error); return null; });
  }
  const first = await sendTo(source, pingEveryone);
  if (mirror && (!source || mirror.id !== source.id)) await sendTo(mirror, false);
  return first;
}

function nextWorldShatterSaturday(now = Date.now()) {
  const minAt = now + WORLD_SHATTER_MIN_NOTICE;
  const parts = getMountainDateTimeParts(new Date(now));
  const base = new Date(`${parts.date}T12:00:00Z`);
  for (let add=0; add<15; add++) {
    const d = new Date(base); d.setUTCDate(base.getUTCDate()+add);
    if (d.getUTCDay() !== 6) continue;
    const dateString = d.toISOString().slice(0,10);
    const ts = mountainLocalTimestamp(dateString,19,0);
    if (ts >= minAt) return ts;
  }
  return now + 7*24*60*60*1000;
}

function initializeFourOfFiveAnomalyState(data) {
  const ws = data.worldStory;
  if (!ws || ws.postShatter || ["final_warning","scheduled","event","complete"].includes(ws.phase)) return;
  if (ws.phase !== "anomaly") {
    ws.phase = "anomaly";
    ws.anomalyIndex = 0;
    ws.nextAnomalyAt = Date.now() + (45 + Math.floor(Math.random()*46))*60*1000;
  }
}

function buildFinalWarningBeats(startAt, shatterAt) {
  const span = Math.max(1, shatterAt-startAt);
  const candidates = [
    { at:startAt+Math.floor(span*.20), key:"fluctuation" },
    { at:startAt+Math.floor(span*.45), key:"collision" },
    { at:startAt+Math.floor(span*.70), key:"stability" },
    { at:shatterAt-24*60*60*1000, key:"24h" },
    { at:shatterAt-2*60*60*1000, key:"2h" },
    { at:shatterAt-15*60*1000, key:"15m" }
  ].filter(x=>x.at > startAt + 5*60*1000 && x.at < shatterAt);
  const seen = new Set();
  return candidates.sort((a,b)=>a.at-b.at).filter(x=>{const bucket=Math.floor(x.at/(10*60*1000)); if(seen.has(bucket)) return false; seen.add(bucket); return true;}).map(x=>({...x,sent:false,skipped:false}));
}

function initializeFinalWarningState(data) {
  const ws = data.worldStory;
  if (!ws || ws.postShatter || ws.phase === "complete" || ws.event?.active) return;
  if (!ws.finalWarningStartedAt) ws.finalWarningStartedAt = Date.now();
  if (!ws.shatterScheduledAt) ws.shatterScheduledAt = nextWorldShatterSaturday(ws.finalWarningStartedAt);
  ws.phase = "final_warning";
  ws.beats = buildFinalWarningBeats(ws.finalWarningStartedAt, ws.shatterScheduledAt);
}

function worldStabilityForBeat(key) {
  return ({ fluctuation:72, collision:41, stability:17, "24h":8, "2h":4, "15m":1 })[key] ?? 50;
}

function finalWarningBeatText(beat, ws) {
  const eventTs = Math.floor(ws.shatterScheduledAt/1000);
  if (beat.key === "fluctuation") return `⚠️ **REALITY FLUCTUATION**\n\nA breach appeared for less than a second.\nNo known planar signature was detected.\n\n**WORLD STABILITY: ${worldStabilityForBeat(beat.key)}%**`;
  if (beat.key === "collision") return `🚨 **PLANAR COLLISION DETECTED**\n\nShattered Frost energy has been detected inside an Infernal Rift.\nThis should be impossible.\n\n**WORLD STABILITY: ${worldStabilityForBeat(beat.key)}%**`;
  if (beat.key === "stability") return `🚨 **WORLD STABILITY: ${worldStabilityForBeat(beat.key)}%**\n\nDistortions are no longer closing completely.\nSomething is pushing against reality from the other side.`;
  if (beat.key === "24h") return `# 🚨 EMERGENCY HUNT NOTICE\n\nWorld stability has reached critical failure.\nAll available Monster Hunters are requested to report <t:${eventTs}:F> (<t:${eventTs}:R>).\n\n**This is not a normal Distortion.**\nCome prepared.`;
  if (beat.key === "2h") return `# 🚨 WORLD SHATTER — 2 HOURS\n\n**WORLD STABILITY: 4%**\nHunters are advised to prepare bait, capture items, and companions.\n\n**All available hunters will be needed.**`;
  return `# ⛔ WORLD SHATTER — 15 MINUTES\n\n**WORLD STABILITY: 1%**\n\nWe can't stop it anymore.`;
}

const FOUR_OF_FIVE_ANOMALIES = [
  `⚠️ **REALITY FLUCTUATION DETECTED**\n\nFor exactly eleven seconds, every shadow in the hunting grounds pointed in the same direction.\n\nThere was nothing there.\n\n**World stability continues to deteriorate.**`,
  `⚠️ **UNKNOWN PHENOMENON**\n\nHunters reported seeing creatures from the Shattered Frost wandering near traces of Infernal Rift energy.\n\nThese creatures should not be capable of existing in the same environment.\n\n**Something is causing the planes to overlap.**`,
  `🚨 **WORLD STABILITY: CRITICAL**\n\nFour unknown Relic signatures now resonate within the hunting grounds.\nReality is no longer repairing itself cleanly after Distortions.\n\n**Whatever happens next may be permanent.**`,
  `⚠️ **PLANAR ECHO**\n\nA doorway appeared in the ruins today.\nIt opened onto five different skies at once.\n\nThe doorway vanished before anyone could cross it.`
];

function worldShatterStatusText(data) {
  const ws=data.worldStory||{}; const ev=ws.event;
  const schedule=ws.shatterScheduledAt ? `<t:${Math.floor(ws.shatterScheduledAt/1000)}:F> (<t:${Math.floor(ws.shatterScheduledAt/1000)}:R>)` : "Not scheduled";
  let text=`🌎 **WORLD SHATTER STATUS**\nPhase: **${ws.phase||"dormant"}**\nScheduled: ${schedule}\nPost-Shatter: **${ws.postShatter?"Yes":"No"}**\nOutcome: **${ws.outcome||"Pending"}**\nUnmade replacement chance: **${Number(ws.unmadeReplacementChance||0)}%**${ws.architectRematchAt?`\nArchitect rematch: <t:${Math.floor(ws.architectRematchAt/1000)}:F>`:""}`;
  if(ev?.active){ text += `\n\n💥 Event Stage: **${ev.stage}**\nParticipants: **${Object.keys(ev.participants||{}).length}**`; if(ev.stage==="stabilize") text += `\n${WORLD_KNOWN_DISTORTION_KEYS.map(k=>`${DISTORTIONS[k].icon} ${DISTORTIONS[k].name}: **${ev.stability?.[k]||0}/${WORLD_SHATTER_STABILITY_GOAL}**`).join("\n")}`; if(ev.stage==="boss") text += `\n👁️ Architect HP: **${Math.max(0,ev.bossHp||0)}/${ev.bossMaxHp||0}**`; }
  return text;
}

async function startWorldShatter(data, forced=false) {
  const ws=data.worldStory; if(ws.event?.active) return false;
  const now=Date.now();
  ws.phase="event"; ws.event={active:true,stage:"collision",startedAt:now,stageEndsAt:now+WORLD_SHATTER_COLLISION_DURATION,participants:{},stability:Object.fromEntries(WORLD_KNOWN_DISTORTION_KEYS.map(k=>[k,0])),bossHp:0,bossMaxHp:0,bossEndsAt:0,stabilizationFailed:false};
  data.activeDistortion=null;
  for(const p of Object.values(data.players||{})) p.lastHunt=0;
  addSeasonMoment(data,{type:"world_shatter",icon:"💥",text:"The five World Relics shattered the seal and the World Shatter began.",uniqueKey:"world:shatter:start"});
  saveData(data);
  const channel=await getTextChannel(MONSTER_CHANNEL_ID);
  await sendWorldEvent(channel,`@everyone\n\n# 💥 WORLD SHATTER\n\nThe sky fractures.\nInfernal flame pours through frozen ruins. Arcane oceans hang above spectral kingdoms while stars burn through daylight.\n\n**The five known planes are collapsing into ours.**\n\n⚡ \`!hunt\` cooldown: **10 minutes**\n🔄 Everyone can hunt **RIGHT NOW.**\n\nFor the next phase, creatures from every known Distortion can appear.\n\n**And something else is pushing through.**`,`distortion_critical.png`,true);
  return true;
}

async function beginStabilization(data) {
  const ev=data.worldStory?.event; if(!ev?.active) return;
  ev.stage="stabilize"; ev.stageStartedAt=Date.now(); ev.stageEndsAt=Date.now()+WORLD_SHATTER_STABILIZE_MAX_DURATION;
  saveData(data); const channel=await getTextChannel(MONSTER_CHANNEL_ID);
  await sendWorldEvent(channel,`# 🌀 STABILIZE THE BREACHES\n\nThe collision can be slowed—but only by capturing creatures tied to each plane.\n\n${WORLD_KNOWN_DISTORTION_KEYS.map(k=>`${DISTORTIONS[k].icon} **${DISTORTIONS[k].name}** — 0/${WORLD_SHATTER_STABILITY_GOAL}`).join("\n")}\n\nEvery successful Distortion catch adds **+1 Stability** to its matching breach.\n⚡ \`!hunt\` remains **10 minutes**.`,null,false);
}

async function revealUnmade(data, timedOut=false) {
  const ev=data.worldStory?.event; if(!ev?.active || ev.stage==="unmade" || ev.stage==="boss") return;
  ev.stage="unmade"; ev.stageStartedAt=Date.now(); ev.stageEndsAt=Date.now()+WORLD_SHATTER_UNMADE_DURATION; ev.stabilizationFailed=Boolean(timedOut);
  for(const p of Object.values(data.players||{})) p.lastHunt=0;
  saveData(data); const channel=await getTextChannel(MONSTER_CHANNEL_ID);
  await sendWorldEvent(channel,`@everyone\n\n# ❓ UNKNOWN BREACH DETECTED\n\n${WORLD_KNOWN_DISTORTION_KEYS.map(k=>`✅ ${DISTORTIONS[k].name.toUpperCase()} — ${timedOut?"FORCED CLOSED":"SEALED"}`).join("\n")}\n\n**WORLD STABILITY: 99%**\n\nWhy isn't it 100%?\n\nClassification: **NONE**\nOrigin: **NONE**\nAge: **ERROR**\n\nThis breach was not created by the World Shatter.\n\n**It was already here.**\n\n🕳️ **THE UNMADE HAS OPENED.**\n⚡ Hunt cooldown reset.\n❓ Impossible Egg signatures have been detected.`,`unmade_opening.png`,true);
}

async function beginArchitectBoss(data, { rematch = false } = {}) {
  const ev=data.worldStory?.event; if(!ev?.active) return;
  const participants=Math.max(1,Object.keys(ev.participants||{}).length);
  const maxHp=rematch ? Math.max(600,participants*150) : Math.max(500,participants*125);
  ev.stage="boss"; ev.stageStartedAt=Date.now(); ev.bossMaxHp=maxHp; ev.bossHp=maxHp; ev.bossEndsAt=Date.now()+WORLD_SHATTER_BOSS_DURATION;
  ev.rematch=Boolean(rematch); ev.nextHunterBonus=0; ev.finalBlowUserId=null;
  for(const state of Object.values(ev.participants||{})) {
    state.lastBossAttack=0; state.hunterDamage=state.hunterDamage||0; state.petDamage=state.petDamage||0;
    state.totalDamage=state.totalDamage||0; state.attacks=state.attacks||0;
  }
  saveData(data); const channel=await getTextChannel(MONSTER_CHANNEL_ID);
  await sendWorldEvent(channel,`@everyone\n\n# 👁️ ${rematch?"THE ARCHITECT RETURNS":"THE ARCHITECT OF NOTHING"}\n\n${rematch?"The wound in reality opens again. The Architect remembers the hunters who drove it back.":"The Unmade breach folds inward—and something enormous steps through."}\n\nThis creature is not in the Monster Dex.\nIt does not belong to any plane.\n\n❤️ **Community HP: ${maxHp}**\n⚔️ Use **\`!shatterattack\`** every **2 minutes**.\n🐾 Your equipped companion attacks beside you.\n⏳ You have **45 minutes**.\n\n**If it remains, the breach remains.**`,ARCHITECT_IMAGE,true);
}

function architectPetDamageRange(rarity) {
  return ({ Common:[2,5], Rare:[4,8], Epic:[6,11], Legendary:[9,15] })[rarity] || [2,5];
}

function rollArchitectAttack(player, ev) {
  let hunterDamage=10+Math.floor(Math.random()*11);
  const inheritedBonus=Math.max(0,Number(ev.nextHunterBonus||0));
  if(inheritedBonus>0){ hunterDamage+=inheritedBonus; ev.nextHunterBonus=0; }
  const equipped=getEquippedPet(player); const definition=getOwnedPetDefinition(equipped);
  let petDamage=0; const effects=[];
  if(definition && equipped){
    const info=getCompanionLevelInfo(equipped); const [min,max]=architectPetDamageRange(definition.rarity);
    const base=min+Math.floor(Math.random()*(max-min+1)); petDamage=base+Math.max(0,info.level-1);
    if(definition.key==="paradox_imp"){
      const chance=signatureTier(info.level,5,7,10);
      if(Math.random()*100<chance){ petDamage+=base+Math.max(0,info.level-1); effects.push(`🌀 **PARADOX!** ${getOwnedPetName(equipped)} struck in two realities at once.`); }
    }
    if(definition.key==="rime_sprite"){
      const chance=signatureTier(info.level,15,20,25);
      if(Math.random()*100<chance){ ev.nextHunterBonus=Math.max(Number(ev.nextHunterBonus||0),10); effects.push(`❄️ **SECOND CHANCE — FROZEN OPENING!** The Architect freezes for an instant. The **next hunter** gains **+10 Hunter Damage**.`); }
    }
    if(definition.key==="the_unwritten"){
      const chance=signatureTier(info.level,1,2,3);
      if(Math.random()*100<chance){ petDamage+=50; effects.push(`✒️ **THIS WASN'T SUPPOSED TO HAPPEN.** The Unwritten edits the battle itself: **+50 impossible damage**.`); }
    }
  }
  return { hunterDamage, petDamage, total:hunterDamage+petDamage, equipped, definition, inheritedBonus, effects };
}

function worldShatterHeroSummary(data, ev) {
  const entries=Object.entries(ev.participants||{});
  if(!entries.length) return "No hunter contributions were recorded.";
  const best=(scoreFn)=>entries.slice().sort((a,b)=>scoreFn(b[1])-scoreFn(a[1]))[0];
  const total=best(s=>Number(s.totalDamage||0));
  const pet=best(s=>Number(s.petDamage||0));
  const breaches=best(s=>Object.values(s.planes||{}).reduce((a,b)=>a+Number(b||0),0));
  const hunts=best(s=>Number(s.catches||0));
  const lines=[];
  if(total && Number(total[1].totalDamage||0)>0) lines.push(`⚔️ **Most Total Damage:** ${formatPlayerMention(data,total[0])} — **${total[1].totalDamage}**`);
  if(pet && Number(pet[1].petDamage||0)>0) lines.push(`🐾 **Most Companion Damage:** ${formatPlayerMention(data,pet[0])} — **${pet[1].petDamage}**`);
  if(breaches && Object.values(breaches[1].planes||{}).some(v=>Number(v)>0)) lines.push(`🌀 **Most Breaches Stabilized:** ${formatPlayerMention(data,breaches[0])} — **${Object.values(breaches[1].planes||{}).reduce((a,b)=>a+Number(b||0),0)}**`);
  if(hunts && Number(hunts[1].catches||0)>0) lines.push(`🌎 **Most World Shatter Hunts:** ${formatPlayerMention(data,hunts[0])} — **${hunts[1].catches}**`);
  if(ev.finalBlowUserId) lines.push(`👁️ **Final Blow:** ${formatPlayerMention(data,ev.finalBlowUserId)}`);
  return lines.join("\n") || "No hunter contributions were recorded.";
}

function grantWorldShatterTitlesAndRewards(data, success, { rematch = false } = {}) {
  const ws=data.worldStory, ev=ws?.event; if(!ev) return;
  const eligibleNow=[];
  for(const [userId,state] of Object.entries(ev.participants||{})) {
    const p=getPlayer(data,userId); if(!Array.isArray(p.unlockedTitles)) p.unlockedTitles=[];
    if(!p.unlockedTitles.includes("Shatterborn")) p.unlockedTitles.push("Shatterborn");
    const allPlanes=WORLD_KNOWN_DISTORTION_KEYS.every(k=>Number(state.planes?.[k]||0)>0);
    if(allPlanes) eligibleNow.push(userId);
    const rematchEligible=rematch && Array.isArray(ws.worldMenderEligible) && ws.worldMenderEligible.includes(userId);
    if(success && (allPlanes || rematchEligible) && !p.unlockedTitles.includes("World Mender")) p.unlockedTitles.push("World Mender");
    if(success){
      p.points=(p.points||0)+WORLD_SHATTER_PARTICIPATION_POINTS;
      if(!Array.isArray(p.eggs)) p.eggs=[];
      p.eggs.push({id:`shatter-${Date.now()}-${userId}-${Math.random().toString(36).slice(2,7)}`,rarity:"Legendary",foundAt:Date.now(),source:rematch?"Architect Rematch Victory":"World Shatter Victory"});
      p.captureItems.masterCharm=(p.captureItems.masterCharm||0)+1;
    }
  }
  if(!success && !rematch) ws.worldMenderEligible=eligibleNow;
}

function scheduleArchitectRematch(data) {
  const ws=data.worldStory; if(!ws) return 0;
  const earliest=Date.now()+WORLD_SHATTER_REMATCH_MIN_DELAY;
  ws.architectRematchAt=nextWorldShatterSaturday(earliest);
  ws.rematch24hSent=false; ws.rematch2hSent=false;
  return ws.architectRematchAt;
}

async function startArchitectRematch(data) {
  const ws=data.worldStory; if(!ws || ws.outcome!=="failure" || ws.event?.active) return false;
  ws.phase="rematch";
  ws.event={active:true,stage:"boss",startedAt:Date.now(),stageEndsAt:0,participants:{},stability:{},bossHp:0,bossMaxHp:0,bossEndsAt:0,rematch:true,nextHunterBonus:0,finalBlowUserId:null};
  saveData(data);
  await beginArchitectBoss(data,{rematch:true});
  return true;
}

async function finishWorldShatter(data, success=true) {
  const ws=data.worldStory, ev=ws?.event; if(!ev?.active) return;
  const rematch=Boolean(ev.rematch);
  const heroSummary=worldShatterHeroSummary(data,ev);
  grantWorldShatterTitlesAndRewards(data,success,{rematch});
  ev.active=false; ev.stage=success?"victory":"failed"; ws.phase="complete"; ws.postShatter=true; ws.completedAt=Date.now(); data.worldShatterUnlocked=true;
  ws.outcome=success?"victory":"failure";
  ws.unmadeReplacementChance=success?WORLD_SHATTER_VICTORY_UNMADE_CHANCE:WORLD_SHATTER_FAILURE_UNMADE_CHANCE;
  if(success){ ws.architectDefeats=(ws.architectDefeats||0)+1; ws.architectRematchAt=0; ws.rematch24hSent=false; ws.rematch2hSent=false; }
  else { ws.architectFailures=(ws.architectFailures||0)+1; scheduleArchitectRematch(data); }
  addSeasonMoment(data,{type:"world_shatter_end",icon:success?"🌅":"🕳️",text:success?`The Architect of Nothing was defeated${rematch?" in the rematch":""} and the World Shatter was survived.`:`The Architect of Nothing survived. The Unmade took root in the hunting grounds.`,uniqueKey:`world:shatter:end:${ws.architectDefeats||0}:${ws.architectFailures||0}`});
  if(ev.finalBlowUserId) addSeasonMoment(data,{type:"architect_final_blow",icon:"👁️",text:`${formatPlayerMention(data,ev.finalBlowUserId)} struck the final blow against the Architect of Nothing.`});
  saveData(data); const channel=await getTextChannel(MONSTER_CHANNEL_ID);
  if(success){
    await sendWorldEvent(channel,`@everyone\n\n# ⚔️ THE ARCHITECT HAS FALLEN\n\nThe final blow tears through the Architect's hollow core.\nViolet-white fractures race across its impossible body.\n\nThe Architect reaches toward the breach...\n\n**and misses.**`,null,true);
    await wait(2500);
    await sendWorldEvent(channel,`# 🌌 THE UNMADE IS COLLAPSING\n\nThe Architect fractures into thousands of pieces.\nSome fall. Some disappear. Some were apparently never there at all.\n\nFor the first time in weeks... **the sky is quiet.**\n\n🏆 **Shatterborn** — every participant\n🌎 **World Mender** — hunters who helped all five planes${rematch?" and returned for the rematch":""}\n🎁 **Victory Bundle:** +${WORLD_SHATTER_PARTICIPATION_POINTS} Hunter Points, 1 Legendary Egg, 1 Master Charm\n\n### WORLD SHATTER HEROES\n${heroSummary}\n\n🕳️ Future Unmade Distortion chance: **${WORLD_SHATTER_VICTORY_UNMADE_CHANCE}%**`,null,false);
    setTimeout(async()=>{const ch=await getTextChannel(MONSTER_CHANNEL_ID);if(ch)await sendWorldEvent(ch,"...\n\n*something moved inside the closed breach.*",null,false);},30000);
  } else {
    const rematchAt=ws.architectRematchAt;
    await sendWorldEvent(channel,`@everyone\n\n# ⬛ WE FAILED\n\nThe Architect was not defeated.\nThe breach does not close.\n\nInstead...\n\n**it stabilizes.**\n\n# ❓ THE UNMADE HAS TAKEN ROOT\nThe world survived the Shatter.\n**But it did not survive unchanged.**\n\n🏆 Participants unlocked **Shatterborn**.\n🌎 **World Mender was not awarded.**\n🕳️ Future Unmade Distortion chance: **${WORLD_SHATTER_FAILURE_UNMADE_CHANCE}%**\n\nThe Architect will return <t:${Math.floor(rematchAt/1000)}:F> (<t:${Math.floor(rematchAt/1000)}:R>).\n\n### WORLD SHATTER HEROES\n${heroSummary}`,ARCHITECT_IMAGE,true);
    setTimeout(async()=>{const ch=await getTextChannel(MONSTER_CHANNEL_ID);if(ch)await sendWorldEvent(ch,"...\n\n*it wasn't alone.*",null,false);},30000);
  }
}

function registerWorldShatterCatch(data,userId,monster) {
  const ev=data.worldStory?.event; if(!ev?.active) return {text:"",reveal:false};
  if(!ev.participants[userId]) ev.participants[userId]={planes:{},catches:0,attacks:0}; const ps=ev.participants[userId]; ps.catches=(ps.catches||0)+1;
  if(ev.stage!=="stabilize" || !WORLD_KNOWN_DISTORTION_KEYS.includes(monster.distortionKey)) return {text:"",reveal:false};
  const key=monster.distortionKey; const before=ev.stability[key]||0; ev.stability[key]=Math.min(WORLD_SHATTER_STABILITY_GOAL,before+1); ps.planes[key]=(ps.planes[key]||0)+1;
  const allDone=WORLD_KNOWN_DISTORTION_KEYS.every(k=>(ev.stability[k]||0)>=WORLD_SHATTER_STABILITY_GOAL);
  return {text:`🌎 **BREACH STABILITY:** ${DISTORTIONS[key].name} **${ev.stability[key]}/${WORLD_SHATTER_STABILITY_GOAL}**`,reveal:allDone};
}

async function processWorldStorySystem() {
  const data=loadData(); const count=discoveredWorldRelicCount(data); const ws=data.worldStory; const now=Date.now(); let dirty=false;
  if(count===4 && !ws.postShatter && ws.phase==="dormant"){initializeFourOfFiveAnomalyState(data);dirty=true;}
  if(count>=5 && !ws.postShatter && !ws.event?.active && !["final_warning","event","complete"].includes(ws.phase)){initializeFinalWarningState(data);dirty=true;}
  if(ws.phase==="anomaly" && count===4 && now>=Number(ws.nextAnomalyAt||0)){
    const text=FOUR_OF_FIVE_ANOMALIES[ws.anomalyIndex%FOUR_OF_FIVE_ANOMALIES.length]; ws.anomalyIndex=(ws.anomalyIndex||0)+1; ws.nextAnomalyAt=now+(4+Math.floor(Math.random()*5))*60*60*1000; saveData(data); const ch=await getTextChannel(MONSTER_CHANNEL_ID); await sendWorldEvent(ch,text,"distortion_warning.png",false); return;
  }
  if(ws.phase==="final_warning" && !ws.event?.active){
    for(const beat of ws.beats||[]){ if(beat.sent||beat.skipped) continue; if(beat.at < WORLD_STORY_PROCESS_BOOT_AT-10*60*1000){beat.skipped=true;dirty=true;continue;} if(now>=beat.at){beat.sent=true;saveData(data);const ch=await getTextChannel(MONSTER_CHANNEL_ID);await sendWorldEvent(ch,finalWarningBeatText(beat,ws),beat.key==="15m"?"distortion_critical.png":"distortion_warning.png",beat.key==="24h"||beat.key==="2h"||beat.key==="15m");return;} }
    if(now>=ws.shatterScheduledAt && now<=ws.shatterScheduledAt+WORLD_SHATTER_START_GRACE_MS){await startWorldShatter(data);return;}
    if(now>ws.shatterScheduledAt+WORLD_SHATTER_START_GRACE_MS && !ws.missedStart){ws.missedStart=true;dirty=true;console.log("World Shatter safety: scheduled start was missed; awaiting admin !worldshatter start.");}
  }
  const ev=ws.event;
  if(ev?.active){
    if(ev.stage==="collision" && now>=ev.stageEndsAt){await beginStabilization(data);return;}
    if(ev.stage==="stabilize" && now>=ev.stageEndsAt){await revealUnmade(data,true);return;}
    if(ev.stage==="unmade" && now>=ev.stageEndsAt){await beginArchitectBoss(data);return;}
    if(ev.stage==="boss" && now>=ev.bossEndsAt){await finishWorldShatter(data,false);return;}
  }
  if(ws.postShatter && ws.outcome==="failure" && ws.architectRematchAt && !ws.event?.active){
    const ch=await getTextChannel(MONSTER_CHANNEL_ID);
    if(!ws.rematch24hSent && now>=ws.architectRematchAt-24*60*60*1000 && now<ws.architectRematchAt){ws.rematch24hSent=true;saveData(data);await sendWorldEvent(ch,`@everyone\n\n# 👁️ THE ARCHITECT RETURNS — 24 HOURS\n\nThe breach is moving.\n\nThe Architect has been sighted again.\nIt remembers you.\n\nHunters are requested <t:${Math.floor(ws.architectRematchAt/1000)}:F>.`,ARCHITECT_IMAGE,true);return;}
    if(!ws.rematch2hSent && now>=ws.architectRematchAt-2*60*60*1000 && now<ws.architectRematchAt){ws.rematch2hSent=true;saveData(data);await sendWorldEvent(ch,`@everyone\n\n# 👁️ ARCHITECT REMATCH — 2 HOURS\n\nThe Unmade breach is reopening.\n\n**This time, finish it.**`,ARCHITECT_IMAGE,true);return;}
    if(now>=ws.architectRematchAt && now<=ws.architectRematchAt+WORLD_SHATTER_START_GRACE_MS){await startArchitectRematch(data);return;}
  }
  if(dirty) saveData(data);
}

function discoveredWorldRelicCount(data) {
  return RELIC_KEYS.filter(key => Boolean(data.worldProgress?.[key])).length;
}

function mountainWeekKey(date = new Date()) {
  const parts = getMountainDateTimeParts(date);
  const local = new Date(`${parts.date}T12:00:00Z`);
  const day = local.getUTCDay();
  const diff = (day + 6) % 7;
  local.setUTCDate(local.getUTCDate() - diff);
  return local.toISOString().slice(0,10);
}

function mountainLocalTimestamp(dateString, hour, minute) {
  // Mountain Time is UTC-6 during MDT and UTC-7 during MST. Resolve by trying both.
  for (const offsetHours of [6,7]) {
    const [y,m,d] = dateString.split("-").map(Number);
    const candidate = Date.UTC(y,m-1,d,hour + offsetHours,minute,0);
    const parts = getMountainDateTimeParts(new Date(candidate));
    if (parts.date === dateString && parts.hour === hour && parts.minute === minute) return candidate;
  }
  return Date.parse(`${dateString}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00-06:00`);
}

function generateDistortionSchedule(data) {
  const weekKey = mountainWeekKey();
  if (data.distortionSchedule?.weekKey === weekKey && Array.isArray(data.distortionSchedule.events) && data.distortionSchedule.events.length) return false;
  if (discoveredWorldRelicCount(data) < 3) return false;

  const monday = new Date(`${weekKey}T12:00:00Z`);
  const dayIndexes = [0,1,2,3,4,5,6].sort(() => Math.random() - 0.5).slice(0, DISTORTION_EVENTS_PER_WEEK).sort((a,b)=>a-b);
  const realmKeys = ["infernal","frost","arcane","hollow","astral"].sort(() => Math.random() - 0.5);
  const now = Date.now();

  const events = dayIndexes.map((dayIndex, i) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + dayIndex);
    const dateString = date.toISOString().slice(0,10);
    const weekend = dayIndex >= 5;
    const startHour = weekend ? 12 + Math.floor(Math.random()*9) : 17 + Math.floor(Math.random()*4);
    const minute = Math.floor(Math.random()*60);
    const startAt = mountainLocalTimestamp(dateString,startHour,minute);
    const alreadyPast = startAt <= now;

    return {
      id: `${weekKey}-${i+1}`,
      scheduledKey: realmKeys[i % realmKeys.length],
      startAt,
      warned: alreadyPast,
      criticalWarned: alreadyPast,
      started: false,
      ended: alreadyPast,
      skipped: alreadyPast,
      skipReason: alreadyPast ? "schedule-created-after-start" : null
    };
  });

  data.distortionSchedule = { weekKey, events };
  return true;
}

async function sendImageAnnouncement(channel, content, filename, pingEveryone = false) {
  const imagePath = filename ? findImageFile(filename) : null;
  const payload = { content, allowedMentions: pingEveryone ? { parse: ["everyone"] } : { parse: [] } };
  if (imagePath) payload.files = [new AttachmentBuilder(imagePath)];
  return channel.send(payload);
}

// ==================== BIG GAME / MERCHANT ENGINE ====================
function ensureBigGameMerchantData(data) {
  if (!data.bigGame || typeof data.bigGame !== "object") data.bigGame = {};
  const big = data.bigGame;
  if (big.active === undefined) big.active = false;
  if (big.weekKey === undefined) big.weekKey = null;
  if (!Number.isFinite(big.startedAt)) big.startedAt = 0;
  if (!Number.isFinite(big.endsAt)) big.endsAt = 0;
  if (!big.scores || typeof big.scores !== "object") big.scores = {};
  if (!big.reachedAt || typeof big.reachedAt !== "object") big.reachedAt = {};
  if (big.halftimeSent === undefined) big.halftimeSent = false;
  if (big.resultsSent === undefined) big.resultsSent = false;
  if (big.lastCompletedWeek === undefined) big.lastCompletedWeek = null;
  if (!Array.isArray(big.history)) big.history = [];
  if (!big.reminders || typeof big.reminders !== "object") big.reminders = {};

  if (!data.merchant || typeof data.merchant !== "object") data.merchant = {};
  const merchant = data.merchant;
  if (merchant.active === undefined) merchant.active = false;
  if (merchant.type === undefined) merchant.type = null;
  if (merchant.scheduledWeekKey === undefined) merchant.scheduledWeekKey = null;
  if (!Number.isFinite(merchant.arrivalAt)) merchant.arrivalAt = 0;
  if (!Number.isFinite(merchant.departureAt)) merchant.departureAt = 0;
  if (!Array.isArray(merchant.inventory)) merchant.inventory = [];
  if (merchant.reminderSent === undefined) merchant.reminderSent = false;
  if (!Number.isFinite(merchant.specialAt)) merchant.specialAt = 0;
  if (merchant.specialDone === undefined) merchant.specialDone = false;
  if (merchant.clearance === undefined) merchant.clearance = false;
  if (!Number.isFinite(merchant.lastVisitAt)) merchant.lastVisitAt = 0;
  if (!Array.isArray(merchant.history)) merchant.history = [];

  if (!data.tokenSurge || typeof data.tokenSurge !== "object") data.tokenSurge = {};
  const surge = data.tokenSurge;
  if (surge.active === undefined) surge.active = false;
  if (!Number.isFinite(surge.startsAt)) surge.startsAt = 0;
  if (!Number.isFinite(surge.endsAt)) surge.endsAt = 0;
  if (surge.announced === undefined) surge.announced = false;
  if (surge.scheduledWeekKey === undefined) surge.scheduledWeekKey = null;
}

function mountainClock(date = new Date()) {
  const base = getMountainDateParts(date);
  return { ...base, weekKey: getMountainWeekKey(date), totalMinutes: base.hour * 60 + base.minute };
}

function nextBigGameStartAt(now = Date.now()) {
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    let candidate = now + dayOffset * 24 * 60 * 60 * 1000;
    const parts = getMountainDateParts(new Date(candidate));
    if (parts.weekdayIndex !== 6) continue;
    candidate += (BIG_GAME_START_HOUR - parts.hour) * 60 * 60 * 1000 - parts.minute * 60 * 1000 - new Date(candidate).getSeconds() * 1000;
    if (candidate > now) return candidate;
  }
  return now + 7 * 24 * 60 * 60 * 1000;
}

function isBigGameActive(data, now = Date.now()) {
  return Boolean(data.bigGame?.active && now >= data.bigGame.startedAt && now < data.bigGame.endsAt);
}

function getBigGameRanking(data) {
  const scores = data.bigGame?.scores || {};
  const reachedAt = data.bigGame?.reachedAt || {};
  return Object.entries(scores)
    .filter(([, score]) => Number(score) > 0)
    .map(([userId, score]) => ({ userId, score: Number(score), reachedAt: Number(reachedAt[userId] || Number.MAX_SAFE_INTEGER) }))
    .sort((a, b) => b.score - a.score || a.reachedAt - b.reachedAt || a.userId.localeCompare(b.userId));
}

function bigGameLeaderboardText(data, limit = 5) {
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const ranked = getBigGameRanking(data).slice(0, limit);
  if (!ranked.length) return "No successful catches yet. The board is wide open.";
  return ranked.map((entry, index) => `${medals[index] || `#${index + 1}`} ${formatPlayerMention(data, entry.userId)} — **${entry.score} 🪙**`).join("\n");
}

function activateBigGame(data, { weekKey = getMountainWeekKey(), startedAt = Date.now(), endsAt = Date.now() + 2 * 60 * 60 * 1000 } = {}) {
  ensureBigGameMerchantData(data);
  data.bigGame.active = true;
  data.bigGame.weekKey = weekKey;
  data.bigGame.startedAt = startedAt;
  data.bigGame.endsAt = endsAt;
  data.bigGame.scores = {};
  data.bigGame.reachedAt = {};
  data.bigGame.halftimeSent = false;
  data.bigGame.resultsSent = false;
  for (const userId of Object.keys(data.players || {})) {
    const player = getPlayer(data, userId);
    player.lastHunt = 0;
    player.currentMonster = null;
    player.reminderState.huntDueAt = 0;
    player.reminderState.huntSent = false;
  }
}

function awardHuntTokens(data, player, userId, monster) {
  const now = Date.now();
  let amount = 0;
  let source = null;
  if (isBigGameActive(data, now)) {
    amount = BIG_GAME_TOKEN_REWARDS[monster.rarity] || 1;
    source = "Big Game Hunt";
    data.bigGame.scores[userId] = Number(data.bigGame.scores[userId] || 0) + amount;
    data.bigGame.reachedAt[userId] = now;
  } else if (data.tokenSurge?.active && now < data.tokenSurge.endsAt && Math.random() < 0.5) {
    amount = Math.max(1, Math.ceil((BIG_GAME_TOKEN_REWARDS[monster.rarity] || 1) / 2));
    source = "Token Surge";
  }
  if (!amount) return "";
  player.huntTokens += amount;
  player.lifetimeTokens += amount;
  const eventTotal = source === "Big Game Hunt" ? `\n🎯 **Big Game Total:** ${data.bigGame.scores[userId]} 🪙` : "";
  return `\n\n🪙 **${source}: +${amount} Hunt Token${amount === 1 ? "" : "s"}**${eventTotal}\n💰 **Token Balance:** ${player.huntTokens} 🪙`;
}

function applyMerchantEncounterEffect(player, monster) {
  if (!player.merchantEffects || monster.distortionEncounter || ["Mythic", "Secret", "Event"].includes(monster.rarity)) {
    return { monster, text: "" };
  }
  if (player.merchantEffects.goldenLure) {
    player.merchantEffects.goldenLure = false;
    const pool = monsters.filter(candidate => candidate.rarity === "Legendary");
    const replacement = applyShiny({ ...pool[Math.floor(Math.random() * pool.length)] }, player);
    return { monster: replacement, text: "\n🟡 **Golden Lure:** A Legendary trail answered your lure.\n" };
  }
  if (player.merchantEffects.huntersCompass) {
    player.merchantEffects.huntersCompass = false;
    if (monster.rarity === "Common") {
      const pool = monsters.filter(candidate => ["Rare", "Epic", "Legendary"].includes(candidate.rarity));
      monster = applyShiny({ ...pool[Math.floor(Math.random() * pool.length)] }, player);
    }
    return { monster, text: "\n🧭 **Hunter's Compass:** The compass led you to a Rare-or-better trail.\n" };
  }
  return { monster, text: "" };
}

function weightedMerchantType(data) {
  const entries = Object.entries(MERCHANT_TYPE_DEFINITIONS).map(([key, definition]) => ({
    key,
    weight: definition.weight * (key === "riftwalker" && (data.activeDistortion || data.worldStory?.event?.active) ? 4 : 1)
  }));
  let roll = Math.random() * entries.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.key;
  }
  return "aldric";
}

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateMerchantInventory(type, clearance = false) {
  const pool = MERCHANT_POOLS[type] || MERCHANT_POOLS.aldric;
  let chosen;
  if (type === "aldric") {
    const fixed = ["hunter_berry", "sticky_honey", "enchanted_net", "rare_bait"];
    chosen = [...fixed, ...shuffled(pool.filter(key => !fixed.includes(key))).slice(0, 6)];
  } else {
    const size = type === "nameless" ? 4 : type === "riftwalker" ? 5 : 7;
    chosen = shuffled(pool).slice(0, size);
  }
  return [...new Set(chosen)].map(key => {
    const definition = MERCHANT_ITEMS[key];
    const barter = type === "pale_collector" ? PALE_COLLECTOR_BARTERS[key] || null : null;
    const discounted = clearance && ["supply", "consumable"].includes(definition.kind);
    const price = barter ? null : Math.max(1, Math.floor(definition.price * (discounted ? 0.75 : 1)));
    const stock = definition.unlimited ? null : Math.max(1, Number(definition.stock || 1));
    return { key, price, barter, stock, initialStock: stock, sold: 0 };
  });
}

function chooseMerchantArrival(baseAt = Date.now()) {
  const dayOffset = 1 + Math.floor(Math.random() * 6);
  const desiredHour = 9 + Math.floor(Math.random() * 11);
  const desiredMinute = Math.floor(Math.random() * 60);
  let target = baseAt + dayOffset * 24 * 60 * 60 * 1000;
  const parts = getMountainDateParts(new Date(target));
  target += (desiredHour - parts.hour) * 60 * 60 * 1000 + (desiredMinute - parts.minute) * 60 * 1000;
  return target;
}

function scheduleMerchantAfterBigGame(data, weekKey, baseAt = Date.now()) {
  ensureBigGameMerchantData(data);
  if (data.merchant.active || (data.merchant.arrivalAt > Date.now() && data.merchant.scheduledWeekKey === weekKey)) return;
  const type = weightedMerchantType(data);
  const arrivalAt = chooseMerchantArrival(baseAt);
  const definition = MERCHANT_TYPE_DEFINITIONS[type];
  const clearance = ["aldric", "gribble"].includes(type) && Math.random() < 0.12;
  data.merchant = {
    ...data.merchant,
    active: false,
    type,
    scheduledWeekKey: weekKey,
    arrivalAt,
    departureAt: arrivalAt + definition.durationHours * 60 * 60 * 1000,
    inventory: generateMerchantInventory(type, clearance),
    reminderSent: false,
    specialAt: Math.random() < 0.18 ? arrivalAt + Math.floor(definition.durationHours / 2) * 60 * 60 * 1000 : 0,
    specialDone: false,
    clearance
  };
  // Rare surprise: tokens can also leak from normal catches for one hour this week.
  if (!data.tokenSurge.active && !data.tokenSurge.startsAt && Math.random() < 0.08) {
    const startsAt = chooseMerchantArrival(baseAt);
    data.tokenSurge = { active: false, startsAt, endsAt: startsAt + 60 * 60 * 1000, announced: false, scheduledWeekKey: weekKey };
  }
}

function merchantBarterText(barter) {
  return Object.entries(barter || {}).map(([key, amount]) => `${amount}× ${MERCHANT_ITEMS[key]?.name || key}`).join(" + ");
}

function merchantInventoryText(data, userId = null) {
  const merchant = data.merchant;
  if (!merchant?.active || Date.now() >= merchant.departureAt) return "No merchant is currently visiting the hunting grounds.";
  const definition = MERCHANT_TYPE_DEFINITIONS[merchant.type];
  const player = userId ? getPlayer(data, userId) : null;
  const lines = merchant.inventory.map(offer => {
    const item = MERCHANT_ITEMS[offer.key];
    const price = offer.barter ? merchantBarterText(offer.barter) : `${offer.price} 🪙`;
    const stock = offer.stock === null ? "Unlimited" : offer.stock > 0 ? `${offer.stock} left` : "SOLD OUT";
    return `${item.icon} **${item.name}** — ${price}\n↳ ${item.description} • ${stock}`;
  });
  return `${definition.icon} **${definition.name.toUpperCase()}'S WARES**\n\n` +
    `${player ? `🪙 Your Balance: **${player.huntTokens}**\n\n` : ""}` +
    `${lines.join("\n\n")}\n\n` +
    `Merchant leaves <t:${Math.floor(merchant.departureAt / 1000)}:R>.\n` +
    `Buy with \`!buy item name\`.${merchant.type === "gribble" ? "\n🎲 Gribble is also accepting `!gamble`." : ""}`;
}

function resolveMerchantOffer(data, query) {
  const wanted = String(query || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (data.merchant?.inventory || []).find(offer => {
    const item = MERCHANT_ITEMS[offer.key];
    return offer.key.replace(/[^a-z0-9]/g, "") === wanted || item.name.toLowerCase().replace(/[^a-z0-9]/g, "") === wanted;
  }) || null;
}

function collectionCount(player, key) {
  return Math.max(0, Number(player.merchantCollection?.[key] || 0));
}

function addCollectionItem(player, key, amount = 1) {
  player.merchantCollection[key] = collectionCount(player, key) + amount;
}

function removeCollectionItem(player, key, amount = 1) {
  if (collectionCount(player, key) < amount) return false;
  player.merchantCollection[key] -= amount;
  if (player.merchantCollection[key] <= 0) delete player.merchantCollection[key];
  return true;
}

function grantPurchasedItem(player, key) {
  const item = MERCHANT_ITEMS[key];
  if (item.grant?.captureItem) player.captureItems[item.grant.captureItem] += item.grant.amount;
  else if (item.grant?.bait) player.bait[item.grant.bait] += item.grant.amount;
  else addCollectionItem(player, key, 1);
}

function merchantCollectionText(player) {
  const entries = Object.entries(player.merchantCollection || {}).filter(([, amount]) => amount > 0);
  if (!entries.length) return "No merchant collectibles yet.";
  return entries.sort(([a], [b]) => MERCHANT_ITEMS[a].name.localeCompare(MERCHANT_ITEMS[b].name))
    .map(([key, amount]) => `${MERCHANT_ITEMS[key].icon} **${MERCHANT_ITEMS[key].name}** ×${amount}`).join("\n");
}

async function sendRoleImageAnnouncement(channel, content, filename = null, pingRole = false) {
  if (!channel?.isTextBased()) return null;
  const imagePath = filename ? findImageFile(filename) : null;
  const payload = {
    content,
    allowedMentions: pingRole ? { roles: [MONSTER_NOTIFY_ROLE] } : { parse: [] }
  };
  if (imagePath) payload.files = [new AttachmentBuilder(imagePath)];
  return channel.send(payload).catch(error => { console.error("Big Game/Merchant announcement failed:", error); return null; });
}

async function announceBigGameStart(channel, data) {
  return sendRoleImageAnnouncement(channel,
    `<@&${MONSTER_NOTIFY_ROLE}>\n\n🚨 **BIG GAME HUNT HAS BEGUN!**\n\n` +
    `For the next **2 HOURS**, monster activity has surged!\n\n` +
    `⏱️ \`!hunt\` every **30 minutes**\n🪙 Successful catches earn **Hunt Tokens**\n` +
    `🥇 1st — **+50 Hunter Points**\n🥈 2nd — **+30 Hunter Points**\n🥉 3rd — **+15 Hunter Points**\n\n` +
    `Everyone can hunt **RIGHT NOW**. Tokens remain yours after the event.\n` +
    `**Ends at 2:00 PM Mountain Time. GO!**`, BIG_GAME_IMAGE, true);
}

async function finishBigGameHunt(data, channel, { forced = false } = {}) {
  ensureBigGameMerchantData(data);
  if (!data.bigGame.active) return false;
  const endedAt = Date.now();
  const weekKey = data.bigGame.weekKey || getMountainWeekKey();
  data.bigGame.active = false;
  const ranking = getBigGameRanking(data);
  const winners = ranking.slice(0, 3).map((entry, index) => ({ ...entry, place: index + 1, reward: BIG_GAME_PLACEMENT_REWARDS[index] }));
  for (const [userId] of Object.entries(data.players || {})) {
    const player = getPlayer(data, userId);
    player.lastHunt = endedAt;
    player.reminderState.huntDueAt = endedAt + HUNT_COOLDOWN;
    player.reminderState.huntSent = false;
  }
  for (const winner of winners) {
    const player = getPlayer(data, winner.userId);
    const previousPoints = player.points;
    player.points += winner.reward;
    addWeeklyProgress(data, player, winner.reward);
    if (winner.place === 1) player.bigGameWins++;
    player.bigGamePlacements.push({ weekKey, place: winner.place, score: winner.score, reward: winner.reward, at: endedAt });
    recordPointMilestoneMoments(data, winner.userId, previousPoints, player.points);
  }
  const record = { weekKey, startedAt: data.bigGame.startedAt, endedAt, forced, winners };
  data.bigGame.history.push(record);
  data.bigGame.lastCompletedWeek = weekKey;
  data.bigGame.resultsSent = true;
  scheduleMerchantAfterBigGame(data, weekKey, endedAt);
  saveData(data);

  const resultLines = winners.length ? winners.map(winner =>
    `${["🥇", "🥈", "🥉"][winner.place - 1]} ${formatPlayerMention(data, winner.userId)} — **${winner.score} Hunt Tokens** — **+${winner.reward} Hunter Points**`
  ).join("\n\n") : "No hunter completed a successful catch during this event.";
  await sendRoleImageAnnouncement(channel,
    `🏆 **BIG GAME HUNT COMPLETE**\n\nThe hunting grounds have grown quiet.\n\n${resultLines}\n\n` +
    `Every hunter keeps the Hunt Tokens they collected.\n\n` +
    `The Traveling Merchants have heard rumors about today's haul... **spend wisely.**`, BIG_GAME_IMAGE, false);
  for (const winner of winners) {
    await sendRoleImageAnnouncement(channel,
      `${["🥇 FIRST PLACE", "🥈 SECOND PLACE", "🥉 THIRD PLACE"][winner.place - 1]}\n` +
      `${formatPlayerMention(data, winner.userId)} — **${winner.score} 🪙** — **+${winner.reward} Hunter Points**`,
      BIG_GAME_AWARD_IMAGES[winner.place - 1], false);
  }
  return true;
}

const merchantPurchaseLocks = new Set();
// Admin economy sandboxes are intentionally memory-only. They vanish on restart
// and can never enter data.json, the live scheduler, or a player's real wallet.
const economyTestSessions = new Map();

function getEconomyTestSession(channelId) {
  return economyTestSessions.get(channelId) || null;
}

function testEconomyLeaderboardText(session, limit = 10) {
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const ranked = Object.entries(session.scores || {})
    .map(([key, score]) => ({ key, score: Number(score || 0), reachedAt: Number(session.reachedAt?.[key] || Number.MAX_SAFE_INTEGER) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.reachedAt - b.reachedAt || a.key.localeCompare(b.key))
    .slice(0, limit);
  if (!ranked.length) return "No simulated catches yet.";
  return ranked.map((entry, index) => `${medals[index] || `#${index + 1}`} **${session.labels[entry.key] || entry.key}** — **${entry.score} 🪙**`).join("\n");
}

function testMerchantInventoryText(session) {
  if (!session.merchant) return "No test merchant is active. Use `!testeconomy merchant aldric`.";
  const definition = MERCHANT_TYPE_DEFINITIONS[session.merchant.type];
  const lines = session.merchant.inventory.map(offer => {
    const item = MERCHANT_ITEMS[offer.key];
    const price = offer.barter ? merchantBarterText(offer.barter) : `${offer.price} 🪙`;
    const stock = offer.stock === null ? "Unlimited" : offer.stock > 0 ? `${offer.stock} left` : "SOLD OUT";
    return `${item.icon} **${item.name}** — ${price}\n↳ ${stock}`;
  });
  return `🧪 ${definition.icon} **TEST SHOP — ${definition.name.toUpperCase()}**\n\n` +
    `🪙 Test Wallet: **${session.wallet}**\n\n${lines.join("\n\n")}\n\n` +
    `Use \`!testeconomy buy item name\`. Nothing here affects the live game.`;
}

let bigGameMerchantMonitorBusy = false;
async function processBigGameMerchantSystem() {
  if (bigGameMerchantMonitorBusy) return;
  bigGameMerchantMonitorBusy = true;
  try {
    const data = loadData();
    ensureBigGameMerchantData(data);
    const now = Date.now();
    const clock = mountainClock(new Date(now));
    const channel = await getMonsterHuntChannel();
    let dirty = false;
    if (!data.bigGame.reminders[clock.weekKey]) data.bigGame.reminders[clock.weekKey] = {};
    const reminders = data.bigGame.reminders[clock.weekKey];

    if (clock.weekdayIndex === 6 && clock.totalMinutes >= 9 * 60 && clock.totalMinutes < 11 * 60 + 30 && !reminders.morning) {
      reminders.morning = true; dirty = true; saveData(data);
      await sendRoleImageAnnouncement(channel,
        `<@&${MONSTER_NOTIFY_ROLE}>\n\n🎯 **BIG GAME HUNT TODAY**\n\nMonster activity will surge from **12:00-2:00 PM Mountain Time**.\n\n` +
        `⚔️ Hunt every 30 minutes\n🪙 Earn Hunt Tokens\n🏆 Compete for 50 / 30 / 15 Hunter Points\n\nGet your bait ready.`, BIG_GAME_IMAGE, true);
    }
    if (clock.weekdayIndex === 6 && clock.totalMinutes >= 11 * 60 + 30 && clock.totalMinutes < 12 * 60 && !reminders.warning) {
      reminders.warning = true; dirty = true; saveData(data);
      await sendRoleImageAnnouncement(channel,
        `<@&${MONSTER_NOTIFY_ROLE}>\n\n⚠️ **30 MINUTES UNTIL BIG GAME HUNT**\n\n` +
        `At noon, hunt cooldowns drop to 30 minutes and successful catches begin awarding Hunt Tokens.\n\nCheck your bait. Check your inventory.`, BIG_GAME_IMAGE, true);
    }
    if (clock.weekdayIndex === 6 && clock.totalMinutes >= BIG_GAME_START_HOUR * 60 && clock.totalMinutes < BIG_GAME_END_HOUR * 60 && (!data.bigGame.active || data.bigGame.weekKey !== clock.weekKey) && data.bigGame.lastCompletedWeek !== clock.weekKey) {
      const elapsedMinutes = clock.totalMinutes - BIG_GAME_START_HOUR * 60;
      const startedAt = now - elapsedMinutes * 60 * 1000 - new Date(now).getSeconds() * 1000;
      const endsAt = startedAt + 2 * 60 * 60 * 1000;
      activateBigGame(data, { weekKey: clock.weekKey, startedAt, endsAt });
      // A late Railway recovery after halftime should not emit an empty halftime
      // board immediately after the recovered start announcement.
      if (elapsedMinutes >= 60) data.bigGame.halftimeSent = true;
      reminders.start = true; dirty = true; saveData(data);
      await announceBigGameStart(channel, data);
    }
    if (data.bigGame.active && now >= data.bigGame.startedAt + 60 * 60 * 1000 && now < data.bigGame.endsAt && !data.bigGame.halftimeSent) {
      data.bigGame.halftimeSent = true; dirty = true; saveData(data);
      await sendRoleImageAnnouncement(channel,
        `⚔️ **BIG GAME HUNT — HALFTIME**\n\nOne hour remains!\n\n${bigGameLeaderboardText(data, 3)}\n\n**The hunt ends at 2:00 PM Mountain Time.**`, BIG_GAME_IMAGE, false);
    }
    if (data.bigGame.active && now >= data.bigGame.endsAt) {
      await finishBigGameHunt(data, channel);
      dirty = false;
    }

    const merchant = data.merchant;
    if (!merchant.active && merchant.arrivalAt && now >= merchant.arrivalAt && now < merchant.departureAt) {
      merchant.active = true;
      merchant.lastVisitAt = now;
      dirty = true; saveData(data);
      const definition = MERCHANT_TYPE_DEFINITIONS[merchant.type];
      const arrivalText = merchant.type === "nameless"
        ? `No wagon approached. No footsteps were heard. Yet a figure with no name is standing at the edge of the hunting grounds.`
        : `A ${definition.icon} merchant has appeared along the edge of the hunting grounds.`;
      await sendRoleImageAnnouncement(channel,
        `<@&${MONSTER_NOTIFY_ROLE}>\n\n${merchant.type === "nameless" ? "❓ **SOMETHING HAS ARRIVED**" : "🛒 **A TRAVELING MERCHANT HAS ARRIVED**"}\n\n` +
        `${arrivalText}\n\n**${definition.name}** will remain <t:${Math.floor(merchant.departureAt / 1000)}:R>.\n` +
        `Some merchandise is server-wide limited stock. Type \`!merchant\` to browse.${merchant.clearance ? "\n\n🔥 **CLEARANCE PRICES ARE ACTIVE!**" : ""}`,
        merchant.clearance ? "merchant_clearance.png" : definition.image, true);
    }
    if (merchant.active && merchant.specialAt && now >= merchant.specialAt && !merchant.specialDone && now < merchant.departureAt) {
      merchant.specialDone = true;
      for (const offer of merchant.inventory) {
        if (offer.stock !== null && Math.random() < 0.45) offer.stock += 1;
      }
      dirty = true; saveData(data);
      await sendRoleImageAnnouncement(channel,
        `📦 **MERCHANT RESTOCK**\n\nThe wagon doors swing open. New merchandise has arrived and several limited items have been replenished.\n\nUse \`!merchant\` to check the stock.`,
        "merchant_restock.png", false);
    }
    if (merchant.active && now >= merchant.departureAt - 2 * 60 * 60 * 1000 && now < merchant.departureAt && !merchant.reminderSent) {
      merchant.reminderSent = true; dirty = true; saveData(data);
      await sendRoleImageAnnouncement(channel,
        `🛒 **THE MERCHANT LEAVES SOON**\n\nOnly two hours remain. Any unpurchased limited inventory disappears with the merchant.`,
        merchant.type === "nameless" ? "midnight_merchant.png" : MERCHANT_TYPE_DEFINITIONS[merchant.type].image, false);
    }
    if (merchant.active && now >= merchant.departureAt) {
      const definition = MERCHANT_TYPE_DEFINITIONS[merchant.type];
      merchant.history.push({ type: merchant.type, arrivalAt: merchant.arrivalAt, departureAt: merchant.departureAt });
      merchant.active = false;
      merchant.type = null;
      merchant.arrivalAt = 0;
      merchant.departureAt = 0;
      merchant.inventory = [];
      merchant.specialAt = 0;
      merchant.specialDone = false;
      merchant.reminderSent = false;
      merchant.clearance = false;
      dirty = true; saveData(data);
      await sendRoleImageAnnouncement(channel,
        `🛒 **THE MERCHANT HAS DEPARTED**\n\n${definition.name}'s wagon disappears down the road and into the mist. Unsold merchandise is gone.`,
        "merchant_departure.png", false);
    }

    const surge = data.tokenSurge;
    if (!surge.active && surge.startsAt && now >= surge.startsAt && now < surge.endsAt) {
      surge.active = true; surge.announced = true; dirty = true; saveData(data);
      await sendRoleImageAnnouncement(channel,
        `<@&${MONSTER_NOTIFY_ROLE}>\n\n🪙 **TOKEN SURGE**\n\nStrange energy is affecting the hunting grounds. For the next hour, successful normal catches may produce Hunt Tokens.`,
        "token_surge.png", true);
    }
    if ((surge.active || surge.startsAt) && now >= surge.endsAt && surge.endsAt > 0) {
      surge.active = false; surge.startsAt = 0; surge.endsAt = 0; surge.announced = false; dirty = true; saveData(data);
      await sendRoleImageAnnouncement(channel, `🪙 **TOKEN SURGE ENDED**\n\nThe unusual energy has faded from the hunting grounds.`, "token_surge.png", false);
    }
    if (dirty) saveData(data);
  } catch (error) {
    console.error("Big Game / Merchant monitor failed:", error);
  } finally {
    bigGameMerchantMonitorBusy = false;
  }
}

async function startLiveDistortion(data, event, forcedKey = null) {
  if (data.activeDistortion && !data.activeDistortion.ended && Date.now() < data.activeDistortion.endAt) return false;
  let key = forcedKey || event.scheduledKey;
  const postShatterUnmadeChance = Number(data.worldStory?.unmadeReplacementChance ?? UNMADE_REPLACEMENT_CHANCE);
  if (!forcedKey && data.worldStory?.postShatter && Math.random()*100 < postShatterUnmadeChance) key = "unmade";
  const definition = DISTORTIONS[key];
  if (!definition) return false;
  const now = Date.now();
  data.activeDistortion = { key, startAt: now, endAt: now + DISTORTION_DURATION, finalResetDone:false, ended:false, scheduleId:event?.id || null, publicAnnounced:false };
  if (event) event.started = true;
  for (const p of Object.values(data.players || {})) p.lastHunt = 0;
  addSeasonMoment(data,{type:"distortion_open",icon:definition.icon,text:key==="unmade"?"Reality failed. A plane that should not exist appeared.":`${definition.name} opened across the hunting grounds.`});
  saveData(data);

  const channel = client.channels.cache.get(MONSTER_CHANNEL_ID);
  if (!channel?.isTextBased()) return true;
  const openText = key === "unmade"
    ? `@everyone\n\n⚠️ **DISTORTION DETECTED**\nAttempting planar identification...\n❌ **UNKNOWN**\n\n**This plane does not exist.**\n\n⏱️ Event duration: **3 hours**\n⚡ \`!hunt\` cooldown: **30 minutes**\n🔄 Everyone can hunt **RIGHT NOW.**\n🥚 An unidentified egg signature has been detected.`
    : `@everyone\n\n${definition.icon} **WORLD DISTORTION DETECTED — ${definition.name.toUpperCase()}**\n\nUnknown creatures are crossing into our world.\n\n⏱️ Event duration: **3 hours**\n⚡ \`!hunt\` cooldown: **30 minutes**\n🔄 Everyone's hunt cooldown has been reset — hunt **RIGHT NOW.**\n🥚 Strange eggs can be discovered during successful Distortion catches.\n\nThe breach will not remain open forever.`;
  await sendWorldEvent(channel,openText,definition.openingImage,true);
  data.activeDistortion.publicAnnounced = true;
  saveData(data);
  return true;
}

async function endLiveDistortion(data, reason="natural") {
  const active=data.activeDistortion;
  if (!active || active.ended) return false;
  const definition=DISTORTIONS[active.key];
  active.ended=true;
  const event=(data.distortionSchedule?.events||[]).find(e=>e.id===active.scheduleId);
  if(event) event.ended=true;
  addSeasonMoment(data,{type:"distortion_close",icon:definition?.icon||"🌀",text:active.key==="unmade"?"The unknown distortion vanished. No one remembers seeing it close.":`${definition?.name||"The Distortion"} collapsed and normal hunting returned.`});
  saveData(data);
  const channel=client.channels.cache.get(MONSTER_CHANNEL_ID);
  if(channel?.isTextBased()){
    const txt=active.key==="unmade"
      ? `**The distortion is gone.**\n\n*You don't remember seeing it close.*\n\n⏱️ Normal \`!hunt\` cooldown has returned to **2 hours**.`
      : `@everyone\n\n${definition.icon} **${definition.name.toUpperCase()} IS COLLAPSING...**\n\nThe breach has sealed.\n⏱️ Normal \`!hunt\` cooldown has returned to **2 hours**.\nAny creatures and eggs you recovered are yours to keep.`;
    await sendWorldEvent(channel,txt,definition.closingImage,active.key!=="unmade");
  }
  data.activeDistortion=null;
  saveData(data);
  return true;
}

async function processDistortionSystem() {
  const data = loadData();
  // World Shatter owns the hunting grounds while its live event is active.
  if (data.worldStory?.event?.active) return;
  const changed = generateDistortionSchedule(data);
  const now = Date.now();
  let dirty = changed;

  // HARD SAFETY: Railway deploy/restart must never cause a stale scheduled Distortion to fire publicly.
  for (const event of data.distortionSchedule?.events || []) {
    if (event.started || event.ended) continue;
    if (event.startAt < DISTORTION_PROCESS_BOOT_AT) {
      event.warned = true;
      event.criticalWarned = true;
      event.ended = true;
      event.skipped = true;
      event.skipReason = "bot-restarted-after-event-time";
      dirty = true;
      console.log(`Distortion safety: skipped stale event ${event.id}.`);
    }
  }

  if (dirty) saveData(data);

  // One-time migration safety for active states created by the earlier Distortion build.
  // If the state does not prove that its public opening completed, clear it silently instead of posting follow-up messages.
  if (data.activeDistortion && data.activeDistortion.publicAnnounced !== true) {
    console.log("Distortion safety: cleared unverified legacy active Distortion state without posting.");
    data.activeDistortion = null;
    saveData(data);
  }

  if (data.activeDistortion && now >= data.activeDistortion.endAt) {
    await endLiveDistortion(data);
    return;
  }

  if (data.activeDistortion && !data.activeDistortion.finalResetDone && data.activeDistortion.endAt-now <= DISTORTION_FINAL_RESET_MINUTES*60*1000 && data.activeDistortion.endAt-now > 0) {
    data.activeDistortion.finalResetDone = true;
    for (const p of Object.values(data.players || {})) p.lastHunt = 0;
    saveData(data);
    const channel = client.channels.cache.get(MONSTER_CHANNEL_ID);
    if (channel?.isTextBased()) {
      await sendWorldEvent(channel, `@everyone

⚠️ **DISTORTION COLLAPSE DETECTED**
The breach will close in **10 minutes!**
🔄 Everyone has been given **one final hunt**.
Use \`!hunt\` NOW.`, null, true);
    }
  }

  if (data.activeDistortion) return;

  for (const event of data.distortionSchedule?.events || []) {
    if (event.ended || event.started) continue;

    if (now > event.startAt + DISTORTION_START_GRACE_MS) {
      event.warned = true;
      event.criticalWarned = true;
      event.ended = true;
      event.skipped = true;
      event.skipReason = "missed-live-start-window";
      saveData(data);
      console.log(`Distortion safety: skipped missed event ${event.id}; nothing was posted.`);
      continue;
    }

    if (!event.warned && now >= event.startAt - DISTORTION_WARNING_MINUTES*60*1000 && now < event.startAt) {
      event.warned = true;
      saveData(data);
      const channel = client.channels.cache.get(MONSTER_CHANNEL_ID);
      if (channel?.isTextBased()) await sendWorldEvent(channel,`⚠️ **Something is wrong...**

The air around the hunting grounds has begun to change.
Reality instability is increasing.

**BREACH IMMINENT: 5 MINUTES**`,`distortion_warning.png`,false);
    }

    if (!event.criticalWarned && now >= event.startAt - 60*1000 && now < event.startAt) {
      event.criticalWarned = true;
      saveData(data);
      const channel = client.channels.cache.get(MONSTER_CHANNEL_ID);
      if (channel?.isTextBased()) await sendWorldEvent(channel,`🚨 **REALITY INSTABILITY: CRITICAL**

The fractures are spreading.
The hunting grounds are seconds from a planar breach.

**BREACH IMMINENT: 1 MINUTE**`,`distortion_critical.png`,false);
    }

    if (!event.started && now >= event.startAt && now <= event.startAt + DISTORTION_START_GRACE_MS) {
      await startLiveDistortion(data,event);
      return;
    }
  }
}

async function sendOverhaulAnnouncementOnce() {
  const data = loadData();
  if (data.overhaulAnnouncementSent) return;
  const channel = client.channels.cache.get(MONSTER_CHANNEL_ID);
  if (!channel?.isTextBased()) return;
  await channel.send(
    `# 🐉 MONSTER HUNT UPDATE!\n\n` +
    `🐾 Send your equipped pet adventuring with \`!fetch\`\n` +
    `🧬 Combine pets for Companion XP, Ability XP, or inherited abilities with \`!combine\`\n` +
    `📈 Pet abilities now grow every level, with rarer pets requiring more XP\n` +
    `🔥 Comeback bonuses help hunters close large leaderboard gaps\n` +
    `🏆 Weekly competition begins Monday at **5:00 AM Mountain Time**\n` +
    `🥚 Eggs have more discovery sources and empty incubators quietly help\n` +
    `💯 Natural 100 creates a Critical Catch; Natural 1 creates a Perfect Catch\n` +
    `🔔 Use \`!remind all\` for personal hunt and fetch cooldown tags\n\n` +
    `**All existing progress has been preserved.**`
  );
  data.overhaulAnnouncementSent = true;
  saveData(data);
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
  sendOverhaulAnnouncementOnce().catch(error => console.error("Overhaul announcement failed:", error));

  // Checks every minute for the one-time Season 2 launch.
  cron.schedule("* * * * *", async () => {
    try {
      await checkOneTimeSeasonLaunch();
    } catch (error) {
      console.error("One-time Season 2 launch check failed:", error);
    }
  });

  // Catch up immediately if Railway starts after the scheduled launch time.
  checkOneTimeSeasonLaunch().catch(error =>
    console.error("Initial Season 2 launch check failed:", error)
  );

  // Check once per minute for eggs that have completed incubation.
  cron.schedule("* * * * *", async () => {
    try {
      await checkReadyEggNotifications();
    } catch (error) {
      console.error("Egg-ready notification check failed:", error);
    }
  });

  // Catch eggs that finished while the bot was restarting.
  checkReadyEggNotifications().catch(error =>
    console.error("Initial egg-ready notification check failed:", error)
  );

  cron.schedule("* * * * *", async () => {
    try {
      await processFetchReturnsAndReminders();
      await processWeeklyCompetition();
      await processCommunityWorldProgress();
    }
    catch (error) { console.error("Fetch/reminder/weekly/world monitor failed:", error); }
  });
  processFetchReturnsAndReminders().catch(error => console.error("Initial fetch/reminder check failed:", error));
  processWeeklyCompetition().catch(error => console.error("Initial weekly check failed:", error));
  processCommunityWorldProgress().catch(error => console.error("Initial hidden world progress check failed:", error));
  cron.schedule("* * * * *", async () => {
    await processBigGameMerchantSystem();
  });
  // Recover an active Sunday event, merchant visit, or Token Surge immediately after a redeploy.
  processBigGameMerchantSystem().catch(error => console.error("Initial Big Game / Merchant check failed:", error));
  cron.schedule("* * * * *", async () => {
    try { await processDistortionSystem(); }
    catch (error) { console.error("World Distortion monitor failed:", error); }
  });
  cron.schedule("* * * * *", async () => {
    try { await processWorldStorySystem(); }
    catch (error) { console.error("World Story / World Shatter monitor failed:", error); }
  });
  // Initialize story state safely on startup without immediately posting or starting the finale.
  { const startupWorldData=loadData(); const c=discoveredWorldRelicCount(startupWorldData); if(c===4) initializeFourOfFiveAnomalyState(startupWorldData); if(c>=5 && !startupWorldData.worldStory?.postShatter) initializeFinalWarningState(startupWorldData); saveData(startupWorldData); }
  // No immediate Distortion processing on startup; the minute cron handles only live future schedule windows.

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
      // On launch day, the one-time Season 2 launch system replaces
      // the normal noon reminder with the channel unlock and launch message.
      if (getMountainDateTimeParts().date === SEASON_LAUNCH_DATE) return;
      // Sunday's noon post is replaced by the Big Game Hunt start announcement.
      if (getMountainDateParts().weekdayIndex === 6) return;

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

  // ==================== BIG GAME / MERCHANT PLAYER COMMANDS ====================
  if (command === "!testeconomy" || command.startsWith("!testeconomy ") || command === "!testbiggame" || command.startsWith("!testbiggame ")) {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can use the isolated economy sandbox.");
    }

    const input = content.replace(/^!test(?:economy|biggame)\s*/i, "").trim();
    const [subRaw, ...remaining] = input.split(/\s+/).filter(Boolean);
    const sub = (subRaw || "help").toLowerCase();
    const argsText = remaining.join(" ").trim();
    let session = getEconomyTestSession(message.channel.id);

    const createSession = () => {
      const ownerKey = `admin:${message.author.id}`;
      const collection = Object.fromEntries(Object.keys(MERCHANT_ITEMS).map(key => [key, 10]));
      const created = {
        channelId: message.channel.id,
        ownerId: message.author.id,
        createdAt: Date.now(),
        bigGameActive: false,
        scores: {},
        reachedAt: {},
        labels: { [ownerKey]: message.member?.displayName || message.author.username },
        wallet: 100,
        collection,
        merchant: null,
        purchases: []
      };
      economyTestSessions.set(message.channel.id, created);
      return created;
    };

    if (sub === "help") {
      return message.reply(
        `🧪 **ISOLATED BIG GAME + MERCHANT SANDBOX**\n\n` +
        `Everything stays only in **this channel** and only in temporary memory. No role pings, live points, wallets, items, stock, schedules, or data.json values are changed.\n\n` +
        `**Event previews**\n` +
        `\`!testeconomy morning\` — Morning reminder\n` +
        `\`!testeconomy warning\` — 30-minute warning\n` +
        `\`!testeconomy start\` — Start a test Big Game Hunt\n` +
        `\`!testeconomy catch legendary\` — Simulate your successful catch\n` +
        `\`!testeconomy add Nick 12\` — Add a fake hunter/score\n` +
        `\`!testeconomy halftime\` — Post test standings\n` +
        `\`!testeconomy end\` — Post test results\n\n` +
        `**Merchant previews**\n` +
        `\`!testeconomy merchant aldric\` — Spawn a test merchant\n` +
        `Types: aldric, gribble, beastkeeper, pale_collector, riftwalker, nameless\n` +
        `\`!testeconomy shop\` — View test inventory\n` +
        `\`!testeconomy buy ancient egg\` — Simulate a purchase\n` +
        `\`!testeconomy gamble\` — Simulate Gribble's gamble\n` +
        `\`!testeconomy restock\` — Restock test items\n` +
        `\`!testeconomy leave\` — Test merchant departure\n\n` +
        `\`!testeconomy status\` — View sandbox state\n` +
        `\`!testeconomy reset\` — Erase this channel's sandbox`
      );
    }

    if (sub === "reset") {
      economyTestSessions.delete(message.channel.id);
      return message.reply("🧹 This channel's isolated economy sandbox has been erased. No live data was touched.");
    }

    if (sub === "morning") {
      return sendRoleImageAnnouncement(message.channel,
        `🧪 **PRIVATE TEST — NO ROLE PING**\n\n🎯 **BIG GAME HUNT TODAY**\n\n` +
        `Monster activity will surge from **12:00-2:00 PM Mountain Time**.\n\n` +
        `⚔️ Hunt every 30 minutes\n🪙 Earn Hunt Tokens\n🏆 Compete for 50 / 30 / 15 Hunter Points\n\nGet your bait ready.`,
        BIG_GAME_IMAGE, false);
    }

    if (sub === "warning") {
      return sendRoleImageAnnouncement(message.channel,
        `🧪 **PRIVATE TEST — NO ROLE PING**\n\n⚠️ **30 MINUTES UNTIL BIG GAME HUNT**\n\n` +
        `At noon, hunt cooldowns drop to 30 minutes and successful catches begin awarding Hunt Tokens.\n\nCheck your bait. Check your inventory.`,
        BIG_GAME_IMAGE, false);
    }

    if (sub === "start" || sub === "biggame") {
      session = createSession();
      session.bigGameActive = true;
      session.startedAt = Date.now();
      session.endsAt = Date.now() + 2 * 60 * 60 * 1000;
      return sendRoleImageAnnouncement(message.channel,
        `🧪 **PRIVATE TEST EVENT — NO ROLE PING / NO LIVE REWARDS**\n\n🚨 **BIG GAME HUNT HAS BEGUN!**\n\n` +
        `⏱️ Test duration: **2 hours**\n🪙 Simulated catches award test Hunt Tokens\n` +
        `🥇 1st — 50 Hunter Points\n🥈 2nd — 30 Hunter Points\n🥉 3rd — 15 Hunter Points\n\n` +
        `Use \`!testeconomy catch common/rare/epic/legendary/ultra\` to build the board.`,
        BIG_GAME_IMAGE, false);
    }

    if (!session && sub === "merchant") session = createSession();

    if (!session) {
      return message.reply("No sandbox exists in this channel. Start with `!testeconomy start` or `!testeconomy merchant aldric`.");
    }

    if (sub === "catch") {
      if (!session.bigGameActive) return message.reply("Start the test event first with `!testeconomy start`.");
      const rarityAliases = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary", mythic: "Mythic", ultra: "Ultra Rare", ultrarare: "Ultra Rare", event: "Event" };
      const rarity = rarityAliases[argsText.toLowerCase().replace(/[^a-z]/g, "")];
      if (!rarity) return message.reply("Use `!testeconomy catch common/rare/epic/legendary/mythic/ultra`.");
      const amount = BIG_GAME_TOKEN_REWARDS[rarity] || 1;
      const key = `admin:${message.author.id}`;
      session.scores[key] = Number(session.scores[key] || 0) + amount;
      session.reachedAt[key] = Date.now();
      session.wallet += amount;
      return message.reply(
        `🧪 **SIMULATED ${rarity.toUpperCase()} CATCH**\n\n🪙 +${amount} Test Hunt Tokens\n` +
        `🎯 Test Event Score: **${session.scores[key]}**\n💰 Test Wallet: **${session.wallet}**\n\nNo live data changed.`
      );
    }

    if (sub === "add") {
      const match = argsText.match(/^(.+?)\s+(\d+)$/);
      if (!match) return message.reply("Usage: `!testeconomy add Nick 12`");
      const label = match[1].trim().slice(0, 40);
      const amount = Math.max(0, Number(match[2]));
      const key = `fake:${label.toLowerCase()}`;
      session.labels[key] = label;
      session.scores[key] = Number(session.scores[key] || 0) + amount;
      session.reachedAt[key] = Date.now();
      return message.reply(`🧪 Added **${amount} test tokens** to **${label}**.\n\n${testEconomyLeaderboardText(session)}`);
    }

    if (sub === "halftime") {
      return sendRoleImageAnnouncement(message.channel,
        `🧪 **PRIVATE TEST — NO ROLE PING / NO LIVE REWARDS**\n\n⚔️ **BIG GAME HUNT — HALFTIME**\n\n` +
        `One hour remains!\n\n${testEconomyLeaderboardText(session, 3)}\n\n**The test hunt ends when you use \`!testeconomy end\`.**`,
        BIG_GAME_IMAGE, false);
    }

    if (sub === "end") {
      if (!session.bigGameActive) return message.reply("No test Big Game Hunt is active.");
      session.bigGameActive = false;
      const ranked = Object.entries(session.scores)
        .map(([key, score]) => ({ key, score, reachedAt: session.reachedAt[key] || Number.MAX_SAFE_INTEGER }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.reachedAt - b.reachedAt)
        .slice(0, 3);
      const resultText = ranked.length ? ranked.map((entry, index) =>
        `${["🥇", "🥈", "🥉"][index]} **${session.labels[entry.key] || entry.key}** — ${entry.score} Test Tokens — **+${BIG_GAME_PLACEMENT_REWARDS[index]} simulated HP**`
      ).join("\n\n") : "No simulated catches were recorded.";
      await sendRoleImageAnnouncement(message.channel,
        `🧪 **PRIVATE TEST RESULTS — NOTHING AWARDED**\n\n🏆 **BIG GAME HUNT COMPLETE**\n\n${resultText}\n\n` +
        `The test wallet remains available for merchant testing.`, BIG_GAME_IMAGE, false);
      for (let index = 0; index < ranked.length; index++) {
        await sendRoleImageAnnouncement(message.channel,
          `🧪 ${["🥇 TEST FIRST PLACE", "🥈 TEST SECOND PLACE", "🥉 TEST THIRD PLACE"][index]}\n` +
          `**${session.labels[ranked[index].key] || ranked[index].key}** — ${ranked[index].score} Test Tokens — no live reward`,
          BIG_GAME_AWARD_IMAGES[index], false);
      }
      return;
    }

    if (sub === "merchant") {
      const normalized = argsText.toLowerCase().replace(/[^a-z]/g, "_") || "aldric";
      const aliases = { pale: "pale_collector", collector: "pale_collector", rift: "riftwalker", midnight: "nameless" };
      const type = MERCHANT_TYPE_DEFINITIONS[normalized] ? normalized : aliases[normalized];
      if (!type) return message.reply(`Merchant types: ${Object.keys(MERCHANT_TYPE_DEFINITIONS).join(", ")}`);
      const definition = MERCHANT_TYPE_DEFINITIONS[type];
      session.merchant = { type, inventory: generateMerchantInventory(type, false), startedAt: Date.now() };
      return sendRoleImageAnnouncement(message.channel,
        `🧪 **PRIVATE TEST MERCHANT — NO ROLE PING / NO LIVE STOCK**\n\n🛒 **A TRAVELING MERCHANT HAS ARRIVED**\n\n` +
        `**${definition.name}** has opened a simulated shop in this channel.\nUse \`!testeconomy shop\` to browse.`,
        definition.image, false);
    }

    if (sub === "shop") return message.reply(testMerchantInventoryText(session));

    if (sub === "buy") {
      if (!session.merchant) return message.reply("Spawn a test merchant first.");
      const wanted = argsText.toLowerCase().replace(/[^a-z0-9]/g, "");
      const offer = session.merchant.inventory.find(entry => {
        const item = MERCHANT_ITEMS[entry.key];
        return entry.key.replace(/[^a-z0-9]/g, "") === wanted || item.name.toLowerCase().replace(/[^a-z0-9]/g, "") === wanted;
      });
      if (!offer) return message.reply("That item is not in the test shop. Use `!testeconomy shop`.");
      if (offer.stock !== null && offer.stock <= 0) return message.reply("🧪 ❌ **TEST ITEM SOLD OUT**");
      if (offer.barter) {
        const missing = Object.entries(offer.barter).filter(([key, amount]) => Number(session.collection[key] || 0) < amount);
        if (missing.length) return message.reply(`Missing test barter items: ${merchantBarterText(offer.barter)}.`);
        for (const [key, amount] of Object.entries(offer.barter)) session.collection[key] -= amount;
      } else {
        if (session.wallet < offer.price) return message.reply(`The test wallet needs ${offer.price} tokens but has ${session.wallet}.`);
        session.wallet -= offer.price;
      }
      if (offer.stock !== null) offer.stock--;
      session.purchases.push({ key: offer.key, at: Date.now() });
      const item = MERCHANT_ITEMS[offer.key];
      return sendRoleImageAnnouncement(message.channel,
        `🧪 ${item.icon} **SIMULATED PURCHASE COMPLETE**\n\nPurchased **${item.name}** from the test shop.\n` +
        `Test Wallet: **${session.wallet} 🪙**\n\nNo tokens, stock, or items changed in the live game.`,
        item.image, false);
    }

    if (sub === "gamble") {
      if (!session.merchant || session.merchant.type !== "gribble") return message.reply("Spawn Gribble with `!testeconomy merchant gribble` first.");
      if (session.wallet < 5) return message.reply("The test wallet needs 5 tokens.");
      session.wallet -= 5;
      const roll = Math.floor(Math.random() * 100) + 1;
      let result = "Gribble keeps the tokens. The test won nothing.";
      if (roll > 28 && roll <= 70) result = "The test won hunting supplies.";
      if (roll > 70 && roll <= 94) { session.wallet += 8; result = "The test won 8 Hunt Tokens."; }
      if (roll > 94) result = "The test hit a rare jackpot item!";
      return sendRoleImageAnnouncement(message.channel,
        `🧪 🎲 **SIMULATED GRIBBLE GAMBLE**\n\nRoll: **${roll}**\n${result}\nTest Wallet: **${session.wallet} 🪙**\n\nNo live data changed.`,
        "gribbles_gamble.png", false);
    }

    if (sub === "restock") {
      if (!session.merchant) return message.reply("No test merchant is active.");
      for (const offer of session.merchant.inventory) if (offer.stock !== null) offer.stock += Math.max(1, Math.ceil((offer.initialStock || 1) / 2));
      return sendRoleImageAnnouncement(message.channel,
        `🧪 📦 **SIMULATED MERCHANT RESTOCK**\n\nLimited test inventory has been replenished. No live stock changed.`,
        "merchant_restock.png", false);
    }

    if (sub === "leave") {
      if (!session.merchant) return message.reply("No test merchant is active.");
      const definition = MERCHANT_TYPE_DEFINITIONS[session.merchant.type];
      session.merchant = null;
      return sendRoleImageAnnouncement(message.channel,
        `🧪 🛒 **SIMULATED MERCHANT DEPARTURE**\n\n${definition.name}'s test shop has closed. No live merchant was affected.`,
        "merchant_departure.png", false);
    }

    if (sub === "status") {
      return message.reply(
        `🧪 **THIS CHANNEL'S ECONOMY SANDBOX**\n\n` +
        `Test Big Game Active: **${session.bigGameActive}**\n` +
        `Test Wallet: **${session.wallet} 🪙**\n` +
        `Test Merchant: **${session.merchant ? MERCHANT_TYPE_DEFINITIONS[session.merchant.type].name : "None"}**\n` +
        `Simulated Purchases: **${session.purchases.length}**\n\n${testEconomyLeaderboardText(session)}`
      );
    }

    return message.reply("Unknown sandbox option. Use `!testeconomy help`.");
  }

  if (command === "!biggame") {
    if (!isBigGameActive(data)) {
      const nextAt = nextBigGameStartAt();
      return message.reply(
        `🎯 **BIG GAME HUNT**\n\nNext event: <t:${Math.floor(nextAt / 1000)}:F> (<t:${Math.floor(nextAt / 1000)}:R>)\n` +
        `Every Sunday from **12:00-2:00 PM Mountain Time**.\n\n` +
        `⏱️ 30-minute hunts • 🪙 Hunt Tokens • 🏆 50 / 30 / 15 Hunter Points\n` +
        `Your Token Balance: **${player.huntTokens} 🪙**`
      );
    }
    const remaining = Math.max(0, data.bigGame.endsAt - Date.now());
    return message.reply(
      `🎯 **BIG GAME HUNT — LIVE**\n\n⏱️ Time Remaining: **${formatTime(remaining)}**\n\n` +
      `${bigGameLeaderboardText(data, 5)}\n\n` +
      `Your Event Score: **${data.bigGame.scores[message.author.id] || 0} 🪙**\n` +
      `Your Token Balance: **${player.huntTokens} 🪙**\n` +
      `Next Hunt: **${Math.max(0, getPlayerHuntCooldown(player, data, message.author.id) - (Date.now() - player.lastHunt)) > 0 ? formatTime(Math.max(0, getPlayerHuntCooldown(player, data, message.author.id) - (Date.now() - player.lastHunt))) : "Ready now"}**`
    );
  }

  if (command === "!tokens") {
    const best = Math.max(0, ...(player.bigGamePlacements || []).map(entry => Number(entry.score || 0)));
    return sendRoleImageAnnouncement(message.channel,
      `🪙 **HUNT TOKEN WALLET**\n\n` +
      `Current Balance: **${player.huntTokens}**\n` +
      `Lifetime Earned: **${player.lifetimeTokens}**\n` +
      `Lifetime Spent: **${player.tokensSpent}**\n` +
      `Best Big Game Hunt: **${best}**\n` +
      `Big Game Victories: **${player.bigGameWins}**`,
      "hunt_token.png", false
    );
  }

  if (command === "!merchant") {
    return message.reply(merchantInventoryText(data, message.author.id));
  }

  if (command === "!merchantcollection" || command === "!collectibles") {
    return message.reply(
      `🎒 **${formatPlayerName(player, message.author.username)}'S MERCHANT COLLECTION**\n\n` +
      `${merchantCollectionText(player)}\n\n🪙 Hunt Tokens: **${player.huntTokens}**`
    );
  }

  if (command.startsWith("!buy ")) {
    if (!data.merchant?.active || Date.now() >= data.merchant.departureAt) return message.reply("No merchant is currently accepting purchases.");
    if (merchantPurchaseLocks.has(message.author.id)) return message.reply("Your previous merchant transaction is still processing.");
    const offer = resolveMerchantOffer(data, content.slice(5));
    if (!offer) return message.reply("That item is not in the merchant's current inventory. Use `!merchant` to browse.");
    if (offer.stock !== null && offer.stock <= 0) return message.reply("❌ **SOLD OUT**\n\nSomeone got there before you.");
    merchantPurchaseLocks.add(message.author.id);
    try {
      if (offer.barter) {
        const missing = Object.entries(offer.barter).filter(([key, amount]) => collectionCount(player, key) < amount);
        if (missing.length) return message.reply(`The Pale Collector refuses your offer. Required: **${merchantBarterText(offer.barter)}**.`);
        for (const [key, amount] of Object.entries(offer.barter)) removeCollectionItem(player, key, amount);
      } else {
        if (player.huntTokens < offer.price) return message.reply(`You need **${offer.price} Hunt Tokens**, but only have **${player.huntTokens}**.`);
        player.huntTokens -= offer.price;
        player.tokensSpent += offer.price;
      }
      if (offer.stock !== null) offer.stock--;
      offer.sold = Number(offer.sold || 0) + 1;
      grantPurchasedItem(player, offer.key);
      player.merchantPurchases.push({ key: offer.key, price: offer.price, barter: offer.barter, merchant: data.merchant.type, at: Date.now() });
      const item = MERCHANT_ITEMS[offer.key];
      saveData(data);
      const costText = offer.barter ? merchantBarterText(offer.barter) : `${offer.price} Hunt Tokens`;
      return sendRoleImageAnnouncement(message.channel,
        `${item.icon} **PURCHASE COMPLETE**\n\n${formatPlayerMention(data, message.author.id)} purchased **${item.name}**!\n` +
        `Cost: **${costText}**\nRemaining Token Balance: **${player.huntTokens} 🪙**\n\n*${item.description}*`,
        item.image, false);
    } finally {
      merchantPurchaseLocks.delete(message.author.id);
    }
  }

  if (command === "!gamble") {
    if (!data.merchant?.active || data.merchant.type !== "gribble" || Date.now() >= data.merchant.departureAt) {
      return message.reply("🎲 Gribble is not here to take your terrible financial advice right now.");
    }
    if (player.huntTokens < 5) return message.reply("Gribble demands **5 Hunt Tokens** per gamble.");
    player.huntTokens -= 5; player.tokensSpent += 5; player.merchantGambles++;
    const roll = Math.floor(Math.random() * 100) + 1;
    let result;
    if (roll <= 28) result = "Gribble keeps the tokens and hands you lint. **You won nothing.**";
    else if (roll <= 52) { player.captureItems.berry++; result = `You won ${CAPTURE_ITEMS.berry.name}!`; }
    else if (roll <= 70) { player.bait.rare++; result = "You won 🔵 **Rare Bait**!"; }
    else if (roll <= 84) { player.huntTokens += 8; player.lifetimeTokens += 8; result = "The dice spit out **8 Hunt Tokens**!"; }
    else if (roll <= 94) { addCollectionItem(player, "mystery_sack"); result = "You won a 🎒 **Mystery Sack**!"; }
    else if (roll <= 99) { player.captureItems.masterCharm++; result = `JACKPOT: ${CAPTURE_ITEMS.masterCharm.name}!`; }
    else { addCollectionItem(player, "unidentified_object"); result = "IMPOSSIBLE JACKPOT: ❔ **Unidentified Object**!"; }
    saveData(data);
    return sendRoleImageAnnouncement(message.channel,
      `🎲 **GRIBBLE'S GAMBLE**\n\nThe glowing dice tumble across the counter... **${roll}**\n\n${result}\n\nToken Balance: **${player.huntTokens} 🪙**`,
      "gribbles_gamble.png", false);
  }

  if (command.startsWith("!use ")) {
    const wanted = content.slice(5).toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = Object.keys(MERCHANT_ITEMS).find(itemKey =>
      itemKey.replace(/[^a-z0-9]/g, "") === wanted || MERCHANT_ITEMS[itemKey].name.toLowerCase().replace(/[^a-z0-9]/g, "") === wanted
    );
    if (!key || collectionCount(player, key) <= 0) return message.reply("You do not own that merchant item. Use `!merchantcollection` to view your collection.");
    const item = MERCHANT_ITEMS[key];
    if (item.kind === "egg") return message.reply(`${item.icon} **${item.name}** remains sealed. Whatever is inside is not ready to hatch.`);
    if (item.kind === "collectible") {
      const special = key === "impossible_key" ? "\n\nYou turn the key in your hand. Nothing happens. **There is no lock here.**" :
        key === "monster_whistle" ? "\n\nA faint answer echoes from very far away, but nothing approaches." : "\n\nIt reacts faintly, but its purpose remains unknown.";
      return sendRoleImageAnnouncement(message.channel, `${item.icon} **${item.name.toUpperCase()}**\n\n*${item.description}*${special}`, item.image, false);
    }

    removeCollectionItem(player, key, 1);
    let result = "The item was used.";
    if (key === "hunters_compass") { player.merchantEffects.huntersCompass = true; result = "The compass locks onto a powerful trail. Your next ordinary encounter will be **Rare or better**."; }
    else if (key === "golden_lure") { player.merchantEffects.goldenLure = true; result = "Golden light spills across the trail. Your next ordinary encounter will be **Legendary**."; }
    else if (key === "fresh_tracks") { player.lastHunt = 0; player.reminderState.huntDueAt = 0; result = "Fresh tracks cross your path. Your `!hunt` cooldown has been **cleared**."; }
    else if (key === "strange_map") { player.lastHunt = 0; player.merchantEffects.huntersCompass = true; result = "The map redraws itself. Your cooldown is cleared and your next ordinary encounter will be **Rare or better**."; }
    else if (key === "mystery_sack") {
      const roll = Math.random() * 100;
      if (roll < 30) { player.captureItems.berry += 2; result = `The sack contained **2 ${CAPTURE_ITEMS.berry.name}s**.`; }
      else if (roll < 55) { player.huntTokens += 5; player.lifetimeTokens += 5; result = "The sack contained **5 Hunt Tokens**."; }
      else if (roll < 75) { player.bait.epic++; result = "The sack contained 🟣 **Epic Bait**."; }
      else if (roll < 92) { player.captureItems.net++; result = `The sack contained ${CAPTURE_ITEMS.net.name}.`; }
      else { player.captureItems.masterCharm++; result = `The sack contained ${CAPTURE_ITEMS.masterCharm.name}!`; }
    }
    else if (key === "sealed_bottle") {
      const rewards = ["berry", "honey", "net"];
      const rewardKey = rewards[Math.floor(Math.random() * rewards.length)];
      player.captureItems[rewardKey]++;
      result = `The seal breaks in a flash. Inside was ${CAPTURE_ITEMS[rewardKey].name}.`;
    }
    else if (key === "merchants_dice") {
      const roll = Math.floor(Math.random() * 6) + 1;
      if (roll === 1) result = "The weighted die rolls off the table. Nothing happens.";
      if (roll === 2) { player.captureItems.berry++; result = `Roll 2: ${CAPTURE_ITEMS.berry.name}.`; }
      if (roll === 3) { player.huntTokens += 3; player.lifetimeTokens += 3; result = "Roll 3: **3 Hunt Tokens**."; }
      if (roll === 4) { player.captureItems.net++; result = `Roll 4: ${CAPTURE_ITEMS.net.name}.`; }
      if (roll === 5) { player.huntTokens += 8; player.lifetimeTokens += 8; result = "Roll 5: **8 Hunt Tokens**!"; }
      if (roll === 6) { addCollectionItem(player, "mystery_relic"); result = "Roll 6: 🔮 **Mystery Relic**!"; }
    }
    else if (key === "do_not_open") {
      const roll = Math.random() * 100;
      if (roll < 25) { player.huntTokens += 20; player.lifetimeTokens += 20; result = "The chains snap. Inside: **20 Hunt Tokens**."; }
      else if (roll < 50) { player.captureItems.masterCharm++; result = `The darkness releases ${CAPTURE_ITEMS.masterCharm.name}.`; }
      else if (roll < 75) { player.points += 25; result = "Something marks your shadow. **+25 Hunter Points.**"; }
      else { addCollectionItem(player, "unidentified_object"); result = "The box was empty. A moment later, an ❔ **Unidentified Object** appeared behind you."; }
    }
    saveData(data);
    return sendRoleImageAnnouncement(message.channel,
      `${item.icon} **${item.name.toUpperCase()} USED**\n\n${result}\n\n🪙 Token Balance: **${player.huntTokens}**`, item.image, false);
  }

  // ==================== BIG GAME / MERCHANT ADMIN COMMANDS ====================
  if (command === "!announcebiggame") {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Only admins can post the Big Game announcement.");
    const nextAt = nextBigGameStartAt();
    return sendRoleImageAnnouncement(message.channel,
      `<@&${MONSTER_NOTIFY_ROLE}>\n\n🎯 **BIG GAME HUNT HAS ARRIVED!**\n\n` +
      `Every Sunday from **12:00-2:00 PM Mountain Time**, hunt every 30 minutes, earn Hunt Tokens, and compete for bonus Hunter Points.\n\n` +
      `🥇 50 HP • 🥈 30 HP • 🥉 15 HP\n\nNext hunt: <t:${Math.floor(nextAt / 1000)}:F>.`, BIG_GAME_IMAGE, true);
  }

  if (["!startbiggame", "!endbiggame", "!biggamestatus", "!merchantstatus", "!endmerchant", "!restockmerchant", "!starttokensurge", "!endtokensurge"].includes(command) || command.startsWith("!spawnmerchant") || command.startsWith("!testmerchant") || command.startsWith("!settokens ") || command.startsWith("!addtokens ") || command.startsWith("!removetokens ") || command.startsWith("!giveitem ") || command.startsWith("!removeitem ")) {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Only admins can use that command.");
  }

  if (command === "!startbiggame") {
    if (data.bigGame.active) return message.reply("A Big Game Hunt is already active.");
    const clock = mountainClock();
    const manualWeekKey = clock.weekdayIndex === 6 ? clock.weekKey : `manual-${Date.now()}`;
    activateBigGame(data, { weekKey: manualWeekKey, startedAt: Date.now(), endsAt: Date.now() + 2 * 60 * 60 * 1000 });
    saveData(data);
    await announceBigGameStart(message.channel, data);
    return;
  }
  if (command === "!endbiggame") {
    if (!data.bigGame.active) return message.reply("No Big Game Hunt is active.");
    await finishBigGameHunt(data, message.channel, { forced: true });
    return;
  }
  if (command === "!biggamestatus") {
    return message.reply(
      `🛠️ **BIG GAME ADMIN STATUS**\nActive: **${data.bigGame.active}**\nWeek: **${data.bigGame.weekKey || "None"}**\n` +
      `Started: ${data.bigGame.startedAt ? `<t:${Math.floor(data.bigGame.startedAt / 1000)}:F>` : "None"}\n` +
      `Ends: ${data.bigGame.endsAt ? `<t:${Math.floor(data.bigGame.endsAt / 1000)}:F>` : "None"}\nParticipants: **${getBigGameRanking(data).length}**\n\n${bigGameLeaderboardText(data, 10)}`
    );
  }

  if (command.startsWith("!settokens ") || command.startsWith("!addtokens ") || command.startsWith("!removetokens ")) {
    const target = message.mentions.users.first();
    const amountMatch = content.match(/(-?\d+)\s*$/);
    const amount = amountMatch ? Math.max(0, Number(amountMatch[1])) : NaN;
    if (!target || !Number.isFinite(amount)) return message.reply("Usage: `!settokens @user 25`, `!addtokens @user 5`, or `!removetokens @user 5`.");
    const targetPlayer = getPlayer(data, target.id);
    if (command.startsWith("!settokens ")) targetPlayer.huntTokens = amount;
    if (command.startsWith("!addtokens ")) { targetPlayer.huntTokens += amount; targetPlayer.lifetimeTokens += amount; }
    if (command.startsWith("!removetokens ")) targetPlayer.huntTokens = Math.max(0, targetPlayer.huntTokens - amount);
    saveData(data);
    return message.reply(`🪙 ${formatPlayerMention(data, target.id)} now has **${targetPlayer.huntTokens} Hunt Tokens**.`);
  }

  if (command.startsWith("!spawnmerchant")) {
    if (data.merchant.active) return message.reply("A merchant is already active. Use `!endmerchant` first.");
    const input = content.slice("!spawnmerchant".length).trim().toLowerCase().replace(/[^a-z]/g, "_");
    const aliases = { pale: "pale_collector", collector: "pale_collector", pale_collector: "pale_collector", rift: "riftwalker", midnight: "nameless", nameless_merchant: "nameless" };
    const type = MERCHANT_TYPE_DEFINITIONS[input] ? input : aliases[input] || (input ? null : weightedMerchantType(data));
    if (!type) return message.reply(`Merchant types: ${Object.keys(MERCHANT_TYPE_DEFINITIONS).join(", ")}`);
    const definition = MERCHANT_TYPE_DEFINITIONS[type];
    data.merchant = {
      ...data.merchant, active: true, type, scheduledWeekKey: `manual-${Date.now()}`, arrivalAt: Date.now(),
      departureAt: Date.now() + definition.durationHours * 60 * 60 * 1000, inventory: generateMerchantInventory(type, false),
      reminderSent: false, specialAt: 0, specialDone: false, clearance: false, lastVisitAt: Date.now()
    };
    saveData(data);
    await sendRoleImageAnnouncement(message.channel,
      `<@&${MONSTER_NOTIFY_ROLE}>\n\n🛒 **A TRAVELING MERCHANT HAS ARRIVED**\n\n**${definition.name}** is now open. Type \`!merchant\` to browse.`, definition.image, true);
    return;
  }

  if (command === "!endmerchant") {
    if (!data.merchant.active) return message.reply("No merchant is active.");
    data.merchant.departureAt = Date.now(); saveData(data);
    await processBigGameMerchantSystem();
    return;
  }
  if (command === "!merchantstatus") {
    const merchant = data.merchant;
    return message.reply(
      `🛠️ **MERCHANT ADMIN STATUS**\nActive: **${merchant.active}**\nType: **${merchant.type || "None"}**\n` +
      `Arrival: ${merchant.arrivalAt ? `<t:${Math.floor(merchant.arrivalAt / 1000)}:F>` : "Not scheduled"}\n` +
      `Departure: ${merchant.departureAt ? `<t:${Math.floor(merchant.departureAt / 1000)}:F>` : "Not scheduled"}\n` +
      `Inventory Generated: **${merchant.inventory.length > 0}**\nOffers: **${merchant.inventory.length}**\nClearance: **${merchant.clearance}**`
    );
  }
  if (command === "!restockmerchant") {
    if (!data.merchant.active) return message.reply("No merchant is active.");
    for (const offer of data.merchant.inventory) if (offer.stock !== null) offer.stock += Math.max(1, Math.ceil((offer.initialStock || 1) / 2));
    data.merchant.specialDone = true; saveData(data);
    return sendRoleImageAnnouncement(message.channel, `📦 **MERCHANT RESTOCK**\n\nLimited stock has been replenished. Use \`!merchant\` to browse.`, "merchant_restock.png", false);
  }
  if (command.startsWith("!testmerchant")) {
    const input = content.slice("!testmerchant".length).trim().toLowerCase().replace(/[^a-z]/g, "_") || "aldric";
    const type = MERCHANT_TYPE_DEFINITIONS[input] ? input : "aldric";
    const preview = { merchant: { active: true, type, departureAt: Date.now() + 8 * 60 * 60 * 1000, inventory: generateMerchantInventory(type, false) }, players: data.players };
    return message.reply(`🧪 **PRIVATE MERCHANT PREVIEW — NO DATA CHANGED**\n\n${merchantInventoryText(preview, message.author.id)}`);
  }

  if (command.startsWith("!giveitem ") || command.startsWith("!removeitem ")) {
    const target = message.mentions.users.first();
    const itemInput = content.replace(/^!(giveitem|removeitem)\s+<@!?\d+>\s*/i, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = Object.keys(MERCHANT_ITEMS).find(itemKey => itemKey.replace(/[^a-z0-9]/g, "") === itemInput || MERCHANT_ITEMS[itemKey].name.toLowerCase().replace(/[^a-z0-9]/g, "") === itemInput);
    if (!target || !key) return message.reply("Usage: `!giveitem @user rusted key` or `!removeitem @user rusted key`.");
    const targetPlayer = getPlayer(data, target.id);
    if (command.startsWith("!giveitem ")) grantPurchasedItem(targetPlayer, key);
    else if (!removeCollectionItem(targetPlayer, key, 1)) return message.reply("That player does not own that collectible.");
    saveData(data);
    return message.reply(`✅ ${command.startsWith("!giveitem ") ? "Gave" : "Removed"} **${MERCHANT_ITEMS[key].name}** ${command.startsWith("!giveitem ") ? "to" : "from"} ${formatPlayerMention(data, target.id)}.`);
  }

  if (command === "!starttokensurge") {
    data.tokenSurge = { active: true, startsAt: Date.now(), endsAt: Date.now() + 60 * 60 * 1000, announced: true, scheduledWeekKey: `manual-${Date.now()}` };
    saveData(data);
    return sendRoleImageAnnouncement(message.channel, `<@&${MONSTER_NOTIFY_ROLE}>\n\n🪙 **TOKEN SURGE**\n\nFor the next hour, successful normal catches may produce Hunt Tokens.`, "token_surge.png", true);
  }
  if (command === "!endtokensurge") {
    data.tokenSurge = { active: false, startsAt: 0, endsAt: 0, announced: false, scheduledWeekKey: null };
    saveData(data);
    return message.reply("🪙 Token Surge ended.");
  }

  if (command === "!importdex") {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can import the lifetime Dex.");
    }

    if (data.dexImportCompleted) {
      return message.reply(
        "✅ The lifetime Dex has already been imported. No changes were made."
      );
    }

    const attachment = message.attachments.first();
    if (!attachment) {
      return message.reply(
        "Attach `dex_export.json` to the same message as `!importdex`."
      );
    }

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);

      const exportData = JSON.parse(await response.text());
      const exportedPlayers = exportData?.players;

      if (!exportedPlayers || typeof exportedPlayers !== "object" || Array.isArray(exportedPlayers)) {
        return message.reply("❌ That file is not a valid Dex export.");
      }

      let playersImported = 0;
      let creaturesImported = 0;

      for (const [userId, exportedPlayer] of Object.entries(exportedPlayers)) {
        const creatures = Array.isArray(exportedPlayer?.caught) ? exportedPlayer.caught : [];
        if (creatures.length === 0) continue;

        const targetPlayer = getPlayer(data, userId);
        targetPlayer.lifetimeCaught = creatures.map(creature => ({ ...creature }));
        playersImported++;
        creaturesImported += creatures.length;
      }

      data.dexImportCompleted = true;
      data.dexImportedAt = new Date().toISOString();
      data.dexImportPlayerCount = playersImported;
      data.dexImportCreatureCount = creaturesImported;
      saveData(data);

      return message.reply(
        `✅ **Lifetime Dex imported successfully!**\n\n` +
        `Players imported: **${playersImported}**\n` +
        `Creatures imported: **${creaturesImported}**\n\n` +
        `Only lifetime collections were imported. No points, quests, achievements, titles, items, pets, eggs, relics, cooldowns, or seasonal catches were changed.`
      );
    } catch (error) {
      console.error("Dex import failed:", error);
      return message.reply(
        "❌ The Dex import failed. Make sure the attached file is the `dex_export.json` created by the old bot."
      );
    }
  }

  resetDaily(player);

  if (["!remind", "!remindme", "!reminders"].includes(command)) {
    return message.reply(
      `🔔 **Cooldown Reminders**\n\n` +
      `🏹 Hunt: **${player.cooldownReminders.hunt ? "ON" : "OFF"}**\n` +
      `🐾 Fetch: **${player.cooldownReminders.fetch ? "ON" : "OFF"}**\n\n` +
      `Use \`!remind hunt\`, \`!remind fetch\`, \`!remind all\`, or \`!remind off\`.\n` +
      `\`!remindme\` also works as an alias.`
    );
  }

  if (command.startsWith("!remind ") || command.startsWith("!remindme ")) {
    const prefix = command.startsWith("!remindme ") ? "!remindme " : "!remind ";
    const choice = command.slice(prefix.length).trim();

    if (!["hunt", "fetch", "all", "off"].includes(choice)) {
      return message.reply("Use `!remind hunt`, `!remind fetch`, `!remind all`, or `!remind off`.");
    }

    if (choice === "off") {
      player.cooldownReminders = { hunt: false, fetch: false };
    } else if (choice === "all") {
      player.cooldownReminders = { hunt: true, fetch: true };
    } else {
      player.cooldownReminders[choice] = !player.cooldownReminders[choice];
    }

    player.reminderState.channelId = message.channel.id;
    saveData(data);

    return message.reply(
      `🔔 **Cooldown Reminders Updated!**\n\n` +
      `🏹 Hunt: **${player.cooldownReminders.hunt ? "ON" : "OFF"}**\n` +
      `🐾 Fetch: **${player.cooldownReminders.fetch ? "ON" : "OFF"}**\n\n` +
      `I'll tag only you in this channel when your enabled cooldowns are ready.`
    );
  }

  if (command === "!keep") {
    const choice = player.pendingHatchChoice;

    if (!choice || Number(choice.expiresAt || 0) <= Date.now()) {
      player.pendingHatchChoice = null;
      saveData(data);
      return message.reply(
        "🐾 You do not have a newly hatched companion waiting for a keep/sacrifice choice."
      );
    }

    const hatchedPet = player.pets.find(
      pet => String(pet.id) === String(choice.petId)
    );
    const definition = getOwnedPetDefinition(hatchedPet);

    player.pendingHatchChoice = null;
    saveData(data);

    return message.reply(
      `💚 **COMPANION KEPT!**\n` +
      `${definition ? `${getPetDisplayIcon(definition)} **${definition.name}**` : "Your newly hatched companion"} ` +
      `will remain in your pet collection.`
    );
  }

  if (command === "!sacrifice") {
    const choice = player.pendingHatchChoice;

    if (!choice || Number(choice.expiresAt || 0) <= Date.now()) {
      player.pendingHatchChoice = null;
      saveData(data);
      return message.reply(
        "⏳ You do not have a recent hatch available to sacrifice. " +
        "The quick sacrifice option lasts **5 minutes** after hatching."
      );
    }

    const hatchedPet = player.pets.find(
      pet => String(pet.id) === String(choice.petId)
    );

    if (!hatchedPet) {
      player.pendingHatchChoice = null;
      saveData(data);
      return message.reply(
        "That newly hatched pet is no longer in your collection."
      );
    }

    const equippedPet = getEquippedPet(player);
    const equippedDefinition = getOwnedPetDefinition(equippedPet);
    const hatchDefinition = getOwnedPetDefinition(hatchedPet);

    if (!equippedPet || !equippedDefinition) {
      return message.reply(
        "⭐ Equip the companion you want to strengthen first, then use `!sacrifice` again."
      );
    }

    if (String(equippedPet.id) === String(hatchedPet.id)) {
      return message.reply(
        "⚠️ Your newly hatched pet is currently equipped. " +
        "Equip a different companion first if you want to sacrifice this hatch."
      );
    }

    if (!hatchDefinition) {
      return message.reply("That hatch could not be identified.");
    }

    const xp = PET_COMBINE_XP[hatchDefinition.rarity] || 50;
    const distribution = distributePetXpAcrossAbilities(equippedPet, xp);

    player.pets = player.pets.filter(
      pet => String(pet.id) !== String(hatchedPet.id)
    );
    player.pendingHatchChoice = null;

    saveData(data);

    return message.reply(
      `✨ **HATCH SACRIFICED!**\n\n` +
      `${getPetDisplayIcon(hatchDefinition)} **${hatchDefinition.name}** was converted into ` +
      `**${xp} XP** for your equipped companion:\n` +
      `${getPetDisplayIcon(equippedDefinition)} **${getOwnedPetIdentity(equippedPet)}**\n\n` +
      `⚖️ XP was evenly distributed across all **${distribution.abilityCount}** owned abilities:\n` +
      `${formatDistributedPetXp(distribution)}\n\n` +
      `**Ability Progress**\n${formatAllPetAbilityProgress(equippedPet)}` +
      `${distribution.levelUps.length ? `\n🎉 **ABILITY LEVEL UP!** ${distribution.levelUps.join("\n🎉 **ABILITY LEVEL UP!** ")}` : ""}\n\n` +
      `The sacrificed hatch does **not** transfer its ability through this quick option.`
    );
  }

  if (command === "!fetch") {
    const ownedPet = getEquippedPet(player), definition = getOwnedPetDefinition(ownedPet);
    if (!ownedPet || !definition) return message.reply("Equip a pet before using `!fetch`.");
    if (player.fetchState && !player.fetchState.completed) return message.reply(`🐾 ${getOwnedPetName(ownedPet)} is still fetching and will return <t:${Math.floor(player.fetchState.readyAt/1000)}:R>.`);
    const left = FETCH_COOLDOWN - (Date.now() - (player.lastFetch || 0));
    if (left > 0) return message.reply(`⏳ Your pet can fetch again in **${formatTime(left)}**.`);
    player.lastFetch = Date.now();
    player.fetchState = { petId: ownedPet.id, startedAt: Date.now(), readyAt: Date.now()+FETCH_DURATION, completed:false, channelId: EGGS_PETS_CHANNEL_ID };
    player.reminderState.channelId = EGGS_PETS_CHANNEL_ID; player.reminderState.fetchDueAt = Date.now()+FETCH_COOLDOWN; player.reminderState.fetchSent = false;
    saveData(data);
    const embed = new EmbedBuilder().setTitle(`🐾 ${getOwnedPetName(ownedPet)} Went Fetching!`).setDescription(`${fetchFlavor(definition, ownedPet.personality, false, ownedPet)}\n\nIt will return <t:${Math.floor(player.fetchState.readyAt/1000)}:R> with whatever it finds.`);
    const art=getPetArtworkUrl(definition); if(art) embed.setImage(art);
    return message.reply({embeds:[embed]});
  }

  if (command.startsWith("!combine ")) {
    const args = content.slice("!combine ".length).trim().split(/\s+/);

    if (args.length < 2) {
      return message.reply(
        "Use `!combine keepPet# sacrificePet#`. Example: `!combine 1 3`."
      );
    }

    const keeper = resolveOwnedPet(player, args[0]);
    const sacrifice = resolveOwnedPet(player, args[1]);

    if (!keeper || !sacrifice || keeper === sacrifice) {
      return message.reply("Choose two different valid pet numbers from `!pets`.");
    }

    if (String(player.equippedPetId) === String(sacrifice.id)) {
      return message.reply(
        "You cannot sacrifice your currently equipped pet. Equip another pet first."
      );
    }

    const keepDef = getOwnedPetDefinition(keeper);
    const sacrificeDef = getOwnedPetDefinition(sacrifice);

    if (!keepDef || !sacrificeDef) {
      return message.reply("One of those pets could not be found.");
    }

    const sameSpecies = keeper.key === sacrifice.key;
    const keeperName = getOwnedPetIdentity(keeper);
    const sacrificeName = getOwnedPetIdentity(sacrifice);
    const knownAbility = getKnownPetAbility(keeper, sacrificeDef.ability);
    const capacity = petAbilityCapacity(player);
    const currentAbilities = 1 + (keeper.inheritedAbilities || []).length;

    let combineMode;
    let confirmationResult;

    if (sameSpecies) {
      const xp = PET_COMBINE_XP[sacrificeDef.rarity] || 50;
      combineMode = "sameSpecies";
      confirmationResult =
        `Result: **${xp} XP**, evenly split across all **${currentAbilities}** abilities owned by ${keeperName}.`;
    } else if (knownAbility) {
      const xp = PET_ABILITY_COMBINE_XP[sacrificeDef.rarity] || 25;
      combineMode = "sameAbility";

      confirmationResult =
        `Result: ${keeperName} already knows **${abilityDisplayName(sacrificeDef.ability)}**, so the duplicate ability becomes **${xp} XP**, evenly split across all **${currentAbilities}** owned abilities.`;
    } else {
      if (currentAbilities >= capacity) {
        return message.reply(
          `🧬 This pet currently has **${currentAbilities}/${capacity} ability slots**. ` +
          `Earn another 100 Hunter Points before adding another inherited ability.`
        );
      }

      const chance = PET_INHERIT_CHANCE[sacrificeDef.rarity] || 15;
      const xp = PET_COMBINE_XP[sacrificeDef.rarity] || 50;
      combineMode = "inherit";

      confirmationResult =
        `Result: **${chance}% chance** to inherit **${abilityDisplayName(sacrificeDef.ability)}**. ` +
        `Failure grants **${Math.floor(xp / 3)} XP**, evenly split across all **${currentAbilities}** currently owned abilities.`;
    }

    const prompt = await message.reply(
      `⚠️ **PET COMBINATION CONFIRMATION**\n\n` +
      `Keep: **${keeperName}**\n` +
      `Sacrifice forever: **${sacrificeName}**\n\n` +
      `${confirmationResult}\n\n` +
      `Type **CONFIRM** within 30 seconds.`
    );

    try {
      const collected = await message.channel.awaitMessages({
        filter: reply =>
          reply.author.id === message.author.id &&
          reply.content.trim().toUpperCase() === "CONFIRM",
        max: 1,
        time: 30000,
        errors: ["time"]
      });

      await collected.first().delete().catch(() => null);
    } catch {
      return prompt.reply("Combination canceled.");
    }

    const fresh = loadData();
    const freshPlayer = getPlayer(fresh, message.author.id);
    const freshKeeper = freshPlayer.pets.find(
      pet => String(pet.id) === String(keeper.id)
    );
    const freshSacrifice = freshPlayer.pets.find(
      pet => String(pet.id) === String(sacrifice.id)
    );

    if (!freshKeeper || !freshSacrifice) {
      return message.reply(
        "The pets changed before confirmation. No combination occurred."
      );
    }

    if (String(freshPlayer.equippedPetId) === String(freshSacrifice.id)) {
      return message.reply(
        "That pet became your equipped companion before confirmation, so it was NOT sacrificed."
      );
    }

    const freshKeeperDef = getOwnedPetDefinition(freshKeeper);
    const freshSacrificeDef = getOwnedPetDefinition(freshSacrifice);

    if (!freshKeeperDef || !freshSacrificeDef) {
      return message.reply("One of those pets could no longer be found.");
    }

    let result;

    if (freshKeeper.key === freshSacrifice.key) {
      const xp = PET_COMBINE_XP[freshSacrificeDef.rarity] || 50;
      const distribution = distributePetXpAcrossAbilities(freshKeeper, xp);

      result =
        `🧬 **COMPANION ENHANCED!**\n` +
        `${getOwnedPetIdentity(freshKeeper)} absorbed ${getOwnedPetIdentity(freshSacrifice)} and gained ` +
        `**${xp} XP**, evenly distributed across all **${distribution.abilityCount}** owned abilities.\n\n` +
        `${formatDistributedPetXp(distribution)}\n\n` +
        `**Ability Progress**\n${formatAllPetAbilityProgress(freshKeeper)}` +
        `${distribution.levelUps.length ? `\n🎉 **ABILITY LEVEL UP!** ${distribution.levelUps.join("\n🎉 **ABILITY LEVEL UP!** ")}` : ""}`;
    } else {
      const duplicateAbility = getKnownPetAbility(
        freshKeeper,
        freshSacrificeDef.ability
      );

      if (duplicateAbility) {
        const training = addSameAbilityCombineXp(
          freshKeeper,
          freshSacrificeDef.ability,
          freshSacrificeDef.rarity
        );

        result = training?.text ||
          "The sacrificed pet's familiar ability was converted into XP.";
      } else {
        const freshCapacity = petAbilityCapacity(freshPlayer);
        const freshCurrentAbilities =
          1 + (freshKeeper.inheritedAbilities || []).length;

        if (freshCurrentAbilities >= freshCapacity) {
          return message.reply(
            "Your ability capacity changed before confirmation. No pet was sacrificed."
          );
        }

        const chance = PET_INHERIT_CHANCE[freshSacrificeDef.rarity] || 15;

        if (Math.random() * 100 < chance) {
          freshKeeper.inheritedAbilities.push({
            ability: freshSacrificeDef.ability,
            baseBonus: freshSacrificeDef.baseBonus,
            sourcePetKey: freshSacrificeDef.key,
            sourceRarity: freshSacrificeDef.rarity,
            xp: 0,
            inheritedAt: Date.now()
          });

          result =
            `🧬 **ABILITY INHERITED!**\n` +
            `${getOwnedPetName(freshKeeper)} learned **${abilityDisplayName(freshSacrificeDef.ability)}**!\n\n` +
            `The new ability begins at **Ability Level 1 — 0 XP**.\n` +
            `A companion can only know each ability once; future pets with this same ability will strengthen it with XP instead.`;
        } else {
          const consolation = Math.floor(
            (PET_COMBINE_XP[freshSacrificeDef.rarity] || 50) / 3
          );

          const distribution = distributePetXpAcrossAbilities(freshKeeper, consolation);

          result =
            `💨 **INHERITANCE FAILED**\n` +
            `The ability did not transfer, but ${getOwnedPetName(freshKeeper)} absorbed ` +
            `**${consolation} XP**, evenly distributed across all **${distribution.abilityCount}** owned abilities.\n\n` +
            `${formatDistributedPetXp(distribution)}\n\n` +
            `**Ability Progress**\n${formatAllPetAbilityProgress(freshKeeper)}` +
            `${distribution.levelUps.length ? `\n🎉 **ABILITY LEVEL UP!** ${distribution.levelUps.join("\n🎉 **ABILITY LEVEL UP!** ")}` : ""}`;
        }
      }
    }

    freshPlayer.pets = freshPlayer.pets.filter(
      pet => String(pet.id) !== String(freshSacrifice.id)
    );

    // If the sacrificed pet happened to be the current post-hatch choice,
    // clear that choice so !sacrifice cannot target it again.
    if (
      freshPlayer.pendingHatchChoice &&
      String(freshPlayer.pendingHatchChoice.petId) === String(freshSacrifice.id)
    ) {
      freshPlayer.pendingHatchChoice = null;
    }

    saveData(fresh);
    return message.reply(result);
  }

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
    const ultraCooldownMs = getUltraCooldownMs(monster, state);
    const timeLeft = ultraCooldownMs - (Date.now() - participant.lastAttempt);

    if (timeLeft > 0) {
      return message.reply(`⏳ You can use \`!ultrahunt\` again in **${formatTime(timeLeft)}**.`);
    }

    const choices = buildUltraCaptureChoices(ultraPlayer, monster, state, message.author.id);
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
      `**Special Ability:** ${monster.abilityName}
` +
      `${monster.abilityDescription}

` +
      `**Your Current Ultra Effects:**
${getUltraPersonalBonusText(monster, state, message.author.id)}

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
      `🎒 **${formatPlayerName(player, message.author.username)}'s Inventory**\n\n` +
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
    const automaticTitleUnlocks = checkTitleUnlocks(summoner);
    saveData(summonData);
    await announceTitleUnlocks(message, automaticTitleUnlocks);

    return message.reply(
      `💎 You sacrificed **${monster.relicName}**.\n` +
      `${monster.name} will arrive in **5 minutes**!` +
      formatSecretUnlocks(summonUnlocks)
    );
  }

  if (command === "!world") {
    const fresh=loadData(); const count=discoveredWorldRelicCount(fresh); const ws=fresh.worldStory||{};
    const stability = ws.postShatter ? (ws.outcome==="failure" ? "🟠 FRACTURED" : "🟢 STABLE") : count>=5 ? "🔴 FAILURE IMMINENT" : count===4 ? "🔴 CRITICAL" : count===3 ? "🟠 UNSTABLE" : "🟢 STABLE";
    const bar = `${"█".repeat(Math.min(10,count*2))}${"░".repeat(Math.max(0,10-count*2))}`;
    const schedule = ws.shatterScheduledAt && !ws.postShatter ? `\n\n🚨 Emergency gathering: <t:${Math.floor(ws.shatterScheduledAt/1000)}:F> (<t:${Math.floor(ws.shatterScheduledAt/1000)}:R>)` : "";
    const postText = ws.postShatter ? (ws.outcome==="failure" ? `An unknown planar presence remains embedded within reality.\n**Removal attempts have failed.**${ws.architectRematchAt?`\n\n👁️ Architect rematch: <t:${Math.floor(ws.architectRematchAt/1000)}:F>`:""}` : "The World Shatter has ended. Scars between realities remain.\nSomething beyond them is still watching.") : (count>=5?"The world is no longer repairing itself.":count===4?"Something remains missing.":"The world is watching.");
    return message.reply(`🌎 **WORLD STATUS**\n\n**Stability:** ${stability}\nUnknown Relic signatures: **${count}**\nPlanar boundaries: **${ws.postShatter?(ws.outcome==="failure"?"FRACTURED":"SCARRED"):count>=4?"FAILING":"Fluctuating"}**\n\n${bar}\n\n${postText}${schedule}`);
  }

  if (command.startsWith("!worldshatter")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Only admins can control the World Shatter.");
    const args=content.split(/\s+/).slice(1); const sub=(args.shift()||"status").toLowerCase(); const fresh=loadData(); const ws=fresh.worldStory;
    if(sub==="status") return message.reply(worldShatterStatusText(fresh));
    if(sub==="preview") {
      const type=(args.shift()||"anomaly").toLowerCase(); const samples={anomaly:FOUR_OF_FIVE_ANOMALIES[0],final:`🔥 **THE FIFTH RELIC HAS BEEN DISCOVERED**\n\n**WORLD PROGRESS: 5/5 — COMPLETE**\n\nThe five Relics begin to resonate.\n\n**The fragments were never pieces of a key. They were pieces of a seal.**`,shatter:`💥 **WORLD SHATTER**\n\nThe sky fractures. The five known planes begin collapsing into ours.`};
      return message.reply({content:`🧪 **PRIVATE PREVIEW**\n\n${samples[type]||samples.anomaly}`,allowedMentions:{parse:[]}});
    }
    if(sub==="schedule") {
      let target=0; const joined=args.join(" ").toLowerCase();
      if(joined==="saturday 7pm" || joined==="sat 7pm") target=nextWorldShatterSaturday(Date.now());
      else if(/^\d{10,13}$/.test(joined)) target=Number(joined.length===10?Number(joined)*1000:joined);
      if(!target) return message.reply("Use `!worldshatter schedule saturday 7pm` or provide a Unix timestamp.");
      ws.shatterScheduledAt=target; ws.shatterScheduleManual=true; ws.finalWarningStartedAt=ws.finalWarningStartedAt||Date.now(); ws.phase="final_warning"; ws.beats=buildFinalWarningBeats(ws.finalWarningStartedAt,target); ws.missedStart=false; saveData(fresh);
      return message.reply(`✅ World Shatter scheduled for <t:${Math.floor(target/1000)}:F> (<t:${Math.floor(target/1000)}:R>).`);
    }
    if(sub==="delay") {
      const raw=(args[0]||"").toLowerCase(); const m=raw.match(/^(\d+)(h|d)$/); if(!m) return message.reply("Use `!worldshatter delay 6h` or `!worldshatter delay 1d`.");
      const ms=Number(m[1])*(m[2]==="d"?24:1)*60*60*1000; ws.shatterScheduledAt=(ws.shatterScheduledAt||Date.now())+ms; ws.beats=buildFinalWarningBeats(ws.finalWarningStartedAt||Date.now(),ws.shatterScheduledAt); ws.missedStart=false; saveData(fresh); return message.reply(`✅ World Shatter delayed to <t:${Math.floor(ws.shatterScheduledAt/1000)}:F>.`);
    }
    if(sub==="start") { await startWorldShatter(fresh,true); return message.reply("✅ World Shatter start command processed."); }
    if(sub==="stage") {
      const stage=(args[0]||"").toLowerCase(); if(!ws.event?.active) return message.reply("The World Shatter is not active.");
      if(stage==="stabilize") await beginStabilization(fresh); else if(stage==="unmade") await revealUnmade(fresh,false); else if(stage==="boss") await beginArchitectBoss(fresh); else return message.reply("Stages: `stabilize`, `unmade`, `boss`."); return message.reply(`✅ Forced World Shatter stage: **${stage}**.`);
    }
    if(sub==="end") { if(!ws.event?.active) return message.reply("No World Shatter event is active."); const result=(args[0]||"victory").toLowerCase(); const success=result!=="failure"; await finishWorldShatter(fresh,success); return message.reply(`✅ World Shatter ended as a **${success?"victory":"failure"}**.`); }
    if(sub==="rematch") { if(ws.outcome!=="failure") return message.reply("A rematch is only available after an Architect failure."); if(ws.event?.active) return message.reply("A World Shatter event is already active."); await startArchitectRematch(fresh); return message.reply("✅ Architect rematch started."); }
    return message.reply("World Shatter admin: `!worldshatter status`, `schedule saturday 7pm`, `delay 1d`, `start`, `stage stabilize|unmade|boss`, `end victory|failure`, `rematch`, `preview anomaly|final|shatter`.");
  }

  if (command === "!shatterattack") {
    const fresh=loadData(); const ev=fresh.worldStory?.event; if(!ev?.active || ev.stage!=="boss") return message.reply("There is no World Shatter boss to attack right now.");
    const ps=ev.participants[message.author.id] || (ev.participants[message.author.id]={planes:{},catches:0,attacks:0,lastBossAttack:0,hunterDamage:0,petDamage:0,totalDamage:0});
    const now=Date.now(); const left=WORLD_SHATTER_BOSS_COOLDOWN-(now-(ps.lastBossAttack||0)); if(left>0) return message.reply(`⏳ You can strike the Architect again in **${formatTime(left)}**.`);
    const attackPlayer=getPlayer(fresh,message.author.id); const result=rollArchitectAttack(attackPlayer,ev);
    ps.lastBossAttack=now; ps.attacks=(ps.attacks||0)+1; ps.hunterDamage=(ps.hunterDamage||0)+result.hunterDamage; ps.petDamage=(ps.petDamage||0)+result.petDamage; ps.totalDamage=(ps.totalDamage||0)+result.total;
    const before=Number(ev.bossHp||0); ev.bossHp=Math.max(0,before-result.total); if(before>0 && ev.bossHp<=0) ev.finalBlowUserId=message.author.id;
    saveData(fresh);
    const petLine=result.definition ? `${getPetDisplayIcon(result.definition)} **${getOwnedPetName(result.equipped)}** attacks beside you!\n🐾 Companion Damage: **${result.petDamage}**` : `🐾 **No companion equipped** — Companion Damage: **0**`;
    const bonusLine=result.inheritedBonus>0 ? `\n❄️ Frozen Opening Bonus: **+${result.inheritedBonus} Hunter Damage**` : "";
    const effectText=result.effects.length?`\n\n${result.effects.join("\n")}`:"";
    await message.reply(`⚔️ **WORLD SHATTER ATTACK**\n\n🏹 Hunter Damage: **${result.hunterDamage}**${bonusLine}\n${petLine}${effectText}\n\n💥 **TOTAL DAMAGE: ${result.total}**\n👁️ Architect of Nothing: **${ev.bossHp}/${ev.bossMaxHp} HP**`);
    if(ev.bossHp<=0){const finalData=loadData();await finishWorldShatter(finalData,true);} return;
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
      ? `⚠️ **FINAL WARNING ACTIVE** — ${freshData.worldStory?.shatterScheduledAt ? `World Shatter scheduled <t:${Math.floor(freshData.worldStory.shatterScheduledAt/1000)}:R>.` : "World Shatter is unlocked."}`
      : discoveredCount === RELIC_KEYS.length-1
        ? "🚨 **CRITICAL — 4/5 Relics discovered. Reality Anomalies are active.**"
        : `🔒 Locked — **${RELIC_KEYS.length - discoveredCount}** unique Relic${RELIC_KEYS.length - discoveredCount === 1 ? "" : "s"} still undiscovered.`;

    cleanupExpiredCommunityBlessings(freshData);
    const communityPoints = getCommunitySeasonPoints(freshData);
    const awardedMilestones = new Set((freshData.worldCommunityMilestonesAwarded || []).map(Number));
    const nextCommunityThreshold = COMMUNITY_WORLD_THRESHOLDS.find(value => !awardedMilestones.has(value));
    const communityActivityText = nextCommunityThreshold
      ? `Current Community Season Points: **${communityPoints.toLocaleString()}**\nNext hidden guaranteed Relic threshold: **${nextCommunityThreshold.toLocaleString()}**\nMilestones consumed: **${[...awardedMilestones].sort((a,b)=>a-b).join(", ") || "None"}**`
      : `Current Community Season Points: **${communityPoints.toLocaleString()}**\nAll hidden guaranteed Relic milestones have been consumed.`;

    const activeBlessings = Object.entries(freshData.communityBlessings || {})
      .filter(([, blessing]) => Number(blessing?.expiresAt || 0) > Date.now())
      .map(([relicKey, blessing]) => {
        const definition = COMMUNITY_BLESSINGS[relicKey];
        return `${definition?.icon || "✨"} **${blessing.name || definition?.name || relicKey}** — ${blessing.description || definition?.description || "Active"} | Ends <t:${Math.floor(blessing.expiresAt / 1000)}:R>`;
      })
      .join("\n") || "None active.";

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
      `📊 **Hidden Community Activity**\n${communityActivityText}\n\n` +
      `✨ **Active Community Blessings**\n${activeBlessings}\n\n` +
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

  if (command === "!distortionstatus") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Only admins can view the hidden Distortion schedule.");
    generateDistortionSchedule(data); saveData(data);
    const events=(data.distortionSchedule?.events||[]).map((e,i)=>`${i+1}. <t:${Math.floor(e.startAt/1000)}:F> — ${e.skipped?"SKIPPED":e.started?"STARTED":e.ended?"ENDED":"scheduled"}`).join("\n") || "No schedule yet.";
    const active=data.activeDistortion ? `${DISTORTIONS[data.activeDistortion.key]?.name||data.activeDistortion.key} until <t:${Math.floor(data.activeDistortion.endAt/1000)}:R>` : "None";
    return message.reply(`🌀 **DISTORTION ADMIN STATUS**\nHidden Progress: **${discoveredWorldRelicCount(data)}/5**\nActive: **${active}**\n\n**This Week (realm identities stay classified):**\n${events}`);
  }

  if (command.startsWith("!startdistortion")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Only admins can start a live Distortion.");
    const requested=content.slice("!startdistortion".length).trim().toLowerCase();
    const key=requested && DISTORTIONS[requested] ? requested : ["infernal","frost","arcane","hollow","astral"][Math.floor(Math.random()*5)];
    const ok=await startLiveDistortion(data,null,key);
    return message.reply(ok?`✅ Live Distortion started: **${DISTORTIONS[key].name}**.`:"A live Distortion is already active.");
  }

  if (command === "!enddistortion") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Only admins can end a live Distortion.");
    const ok=await endLiveDistortion(data,"admin");
    return message.reply(ok?"✅ Live Distortion ended.":"No live Distortion is active.");
  }

  if (command.startsWith("!testhunt")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Only admins can use the Monster Hunt sandbox.");
    const args=content.slice("!testhunt".length).trim().split(/\s+/).filter(Boolean);
    const sub=(args.shift()||"help").toLowerCase();

    if(sub==="help"){
      return message.reply(
        `🧪 **PRIVATE ADMIN TEST SANDBOX**\n`+
        `Nothing here activates for other players.\n\n`+
        `\`!testhunt distortion infernal/frost/arcane/hollow/astral/unmade\`\n`+
        `\`!testhunt preview warning|critical|opening|closing [distortion]\`\n`+
        `\`!testhunt end\`\n\`!testhunt cooldown on/off\`\n`+
        `\`!testhunt egg scorched_rift/shardbound/drowned_rune/soulbound/paradox/impossible\`\n`+
        `\`!testhunt pet pet_key\`\n\`!testhunt monster monster_name\`\n`+
        `\`!testhunt assets\`\n\`!testhunt status\`\n\`!testhunt cleanup\``
      );
    }
    if(sub==="distortion"){
      const key=(args[0]||"").toLowerCase();
      if(!DISTORTIONS[key]) return message.reply("Unknown test Distortion.");
      player.adminTest.distortionKey=key;
      player.lastHunt=0;
      saveData(data);
      const def=DISTORTIONS[key];
      const img=findImageFile(def.openingImage);
      const embed=new EmbedBuilder().setTitle(`🧪 PRIVATE ADMIN TEST • ${def.name}`).setDescription(`This simulation exists **only for you** and stays in **this channel**.\n\n⚡ Your test \`!hunt\` cooldown: **30 minutes**\n🌀 Test pool: **60% Distortion / 40% normal**\n🥚 Distortion egg testing is enabled on your catches.\n\n🚫 No @everyone ping\n🚫 No global event state\n🚫 No other-player cooldown reset\n🚫 No weekly schedule changes\n\nUse \`!testhunt end\` when finished.`);
      const files=[]; if(img){embed.setImage(`attachment://${path.basename(img)}`);files.push(new AttachmentBuilder(img));}
      return message.reply({embeds:[embed],files,allowedMentions:{parse:[]}});
    }
    if(sub==="preview"){
      const type=(args.shift()||"").toLowerCase();
      const key=(args.shift()||player.adminTest.distortionKey||"").toLowerCase();
      const def=DISTORTIONS[key];
      if(!def) return message.reply("Choose a test Distortion first or provide one: `!testhunt preview opening frost`.");
      if(type==="warning") return sendImageAnnouncement(message.channel,`🧪 **PRIVATE ADMIN TEST — 5 MINUTE WARNING**\n\n⚠️ **Something is wrong...**\n\nThe air around the hunting grounds has begun to change.\nReality instability is increasing.\n\n**BREACH IMMINENT: 5 MINUTES**`,`distortion_warning.png`,false);
      if(type==="critical") return sendImageAnnouncement(message.channel,`🧪 **PRIVATE ADMIN TEST — CRITICAL WARNING**\n\n🚨 **REALITY INSTABILITY: CRITICAL**\n\nThe fractures are spreading.\nThe hunting grounds are seconds from a planar breach.\n\n**BREACH IMMINENT: 1 MINUTE**`,`distortion_critical.png`,false);
      if(type==="opening"){
        const txt=key==="unmade" ? `🧪 **PRIVATE ADMIN TEST — UNKNOWN DISTORTION OPENING**\n\n⚠️ **DISTORTION DETECTED**\nAttempting planar identification...\n❌ **UNKNOWN**\n\n**This plane does not exist.**\n\n⏱️ Event duration: **3 hours**\n⚡ \`!hunt\` cooldown: **30 minutes**` : `🧪 **PRIVATE ADMIN TEST — OPENING**\n\n${def.icon} **WORLD DISTORTION DETECTED — ${def.name.toUpperCase()}**\n\n⏱️ Event duration: **3 hours**\n⚡ \`!hunt\` cooldown: **30 minutes**\n🥚 Strange eggs can be discovered.`;
        return sendImageAnnouncement(message.channel,txt,def.openingImage,false);
      }
      if(type==="closing"){
        const txt=key==="unmade" ? `🧪 **PRIVATE ADMIN TEST — CLOSING**\n\n**The distortion is gone.**\n\n*You don't remember seeing it close.*` : `🧪 **PRIVATE ADMIN TEST — CLOSING**\n\n${def.icon} **${def.name.toUpperCase()} IS COLLAPSING...**\n\nThe breach has sealed.`;
        return sendImageAnnouncement(message.channel,txt,def.closingImage,false);
      }
      return message.reply("Use `!testhunt preview warning|critical|opening|closing [distortion]`.");
    }
    if(sub==="end"){ player.adminTest.distortionKey=null; saveData(data); return message.reply("🧪 Your private Distortion simulation has ended."); }
    if(sub==="cooldown"){ player.adminTest.cooldownBypass=(args[0]||"").toLowerCase()==="off"; saveData(data); return message.reply(`🧪 Admin cooldown bypass: **${player.adminTest.cooldownBypass?"ON":"OFF"}**.`); }
    if(sub==="egg"){
      const key=(args[0]||"").toLowerCase(); const egg=DISTORTION_EGGS[key];
      if(!egg) return message.reply("Unknown Distortion egg key.");
      const id=`testegg-${Date.now()}`; player.eggs.push({id,eggKey:key,rarity:"Distortion",foundAt:Date.now(),source:"Admin Test",adminTest:true}); player.adminTest.generatedEggIds.push(id); saveData(data);
      return message.reply(`🧪 Added ${egg.icon} **${egg.name}** to your inventory. Use \`!eggs\`, \`!incubate #\`, then \`!hatch\`.`);
    }
    if(sub==="pet"){
      const key=(args[0]||"").toLowerCase(); const def=getPetDefinition(key);
      if(!def) return message.reply("Unknown pet key.");
      const owned={id:player.nextPetId++,key:def.key,personality:PET_PERSONALITIES[Math.floor(Math.random()*PET_PERSONALITIES.length)],companionXp:0,affectionEvents:0,timesHelped:0,hatchedAt:Date.now(),adminTest:true};
      player.pets.push(owned); player.adminTest.generatedPetIds.push(owned.id); saveData(data);
      return message.reply(`🧪 Added **${def.name}** as test pet #${player.pets.length}. Try \`!viewpet ${player.pets.length}\`.`);
    }
    if(sub==="monster"){
      const wanted=args.join(" ").toLowerCase();
      const pool=Object.values(DISTORTIONS).flatMap(d=>d.monsters);
      const monster=pool.find(m=>m.name.toLowerCase()===wanted || m.image.replace(".png","")===wanted.replace(/\s+/g,"_"));
      if(!monster) return message.reply("Unknown Distortion monster.");
      player.currentMonster={...monster,distortionEncounter:true,distortionKey:Object.keys(DISTORTIONS).find(k=>DISTORTIONS[k].monsters.some(m=>m.name===monster.name)),adminTest:true};
      player.lastHunt=0; saveData(data);
      return message.reply(buildMonsterEmbed(player.currentMonster,`🧪 ADMIN TEST • ${monster.name}`,`**Rarity:** ${monster.rarity}\n**Capture Chance:** ${monster.chance}%\nThis test encounter exists only for your account.`));
    }
    if(sub==="assets"){
      const names=[
        "distortion_warning.png","distortion_critical.png",
        ...Object.values(DISTORTIONS).flatMap(d=>[d.openingImage,d.closingImage,...d.monsters.map(m=>m.image)]).filter(Boolean),
        ...Object.values(DISTORTION_EGGS).flatMap(e=>[e.image,e.hatchingImage]).filter(Boolean),
        ...pets.filter(p=>["Infernal Rift","Shattered Frost","Sunken Arcane","Hollow Veil","Astral Fracture","The Unmade"].includes(p.habitat)).map(p=>p.image||`${p.key}.png`)
      ];
      const unique=[...new Set(names)]; const missing=unique.filter(name=>!findImageFile(name));
      return message.reply(`🧪 **ASSET AUDIT**\nFound: **${unique.length-missing.length}/${unique.length}**\nMissing: **${missing.length}**${missing.length?`\\n\\n${missing.map(x=>`❌ ${x}`).join("\\n")}`:"\\n✅ All configured assets were found."}`);
    }
    if(sub==="status") return message.reply(`🧪 **TEST STATUS**\nPrivate Distortion: **${player.adminTest.distortionKey||"Off"}**\nCooldown bypass: **${player.adminTest.cooldownBypass?"On":"Off"}**\nTest pets: **${player.adminTest.generatedPetIds.length}**\nTest eggs: **${player.adminTest.generatedEggIds.length}**`);
    if(sub==="cleanup"){
      const petIds=new Set(player.adminTest.generatedPetIds.map(String)); const eggIds=new Set(player.adminTest.generatedEggIds.map(String));
      player.pets=player.pets.filter(p=>!petIds.has(String(p.id))&&!p.adminTest);
      player.eggs=player.eggs.filter(e=>!eggIds.has(String(e.id))&&!e.adminTest);
      player.incubatingEggs=player.incubatingEggs.filter(e=>!e.adminTest);
      if(player.equippedPetId && petIds.has(String(player.equippedPetId))) player.equippedPetId=null;
      player.currentMonster=null; player.adminTest={distortionKey:null,cooldownBypass:false,generatedPetIds:[],generatedEggIds:[],generatedCatchIds:[]}; saveData(data);
      return message.reply("🧹 All private admin-test pets, eggs, incubations, encounters, and test state were removed.");
    }
    return message.reply("Unknown sandbox option. Use `!testhunt help`.");
  }

  if (command === "!hunt") {
    if (message.channel.id === EGGS_PETS_CHANNEL_ID) {
      return message.reply(
        `🏹 **Hunting happens in <#${MONSTER_CHANNEL_ID}>!**\n` +
        `Please use \`!hunt\` there so the Eggs & Pets channel stays clean.`
      );
    }

    const now = Date.now();
    const huntCooldown = getPlayerHuntCooldown(player, data, message.author.id);
    const timeLeft = huntCooldown - (now - player.lastHunt);

    if (timeLeft > 0) {
      return message.reply(`⏳ You can hunt again in **${formatTime(timeLeft)}**.`);
    }

    const usedBait = player.activeBait;
    const signatureHuntText = prepareSignatureForHunt(player);
    let monster = getRandomMonsterForPlayer(player, data, message.author.id);
    const merchantEncounter = applyMerchantEncounterEffect(player, monster);
    monster = merchantEncounter.monster;
    const encounters = addEncounterKnowledge(player, monster);
    const chanceInfo = calculateCaptureChance(player, monster, null, data, message.author.id);

    player.currentMonster = monster;
    player.activeBait = null;
    player.lastHunt = now;
    const huntSig = getSignaturePet(player);
    if (huntSig?.definition.signatureAbility === "frozen_time" && ensureSignatureState(huntSig.owned).frozenTimeReady) ensureSignatureState(huntSig.owned).frozenTimeReady = false;
    player.reminderState.channelId = MONSTER_CHANNEL_ID;
    player.reminderState.huntDueAt = now + huntCooldown;
    player.reminderState.huntSent = false;
    player.huntCount++;
    if (usedBait) player.titleProgress.baitUsed = (player.titleProgress.baitUsed || 0) + 1;

    updateQuestProgress(player, "hunt");
    const automaticTitleUnlocks = checkTitleUnlocks(player);
    saveData(data);
    await announceTitleUnlocks(message, automaticTitleUnlocks);

    const choices = buildCaptureChoices(player, monster);
    const validNumbers = choices.map(choice => choice.number);

    const encounterMessage = await message.reply(
      buildMonsterEmbed(
        monster,
        `${monster.distortionEncounter ? `${monster.adminTest ? "🧪 ADMIN TEST • " : ""}🌀 DISTORTION ENCOUNTER — ` : "🐾 A wild "}${monster.name}${monster.distortionEncounter ? "" : " appeared!"}`,
        `**Rarity:** ${monster.rarity}\n` +
        `**Base Capture Chance:** ${monster.chance}%\n` +
        `**Knowledge:** ${encounters} encounter${encounters === 1 ? "" : "s"} (${getKnowledgeRank(encounters)}, +${chanceInfo.knowledgeBonus}%)\n` +
        `${chanceInfo.eventBonus > 0 ? `**Event Bonus:** +${chanceInfo.eventBonus}%\n` : ""}` +
        `**Current Catch Chance:** ${chanceInfo.total}%\n` +
        `${usedBait ? `**Bait Used:** ${usedBait.toUpperCase()} (improved encounter odds)\n` : ""}` +
        `${merchantEncounter.text}` +
        `${signatureHuntText}` +
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


  // ==================== EGGS & PETS CHANNEL ROUTING ====================
  // Keep egg/pet management out of the Hunt channel.
  const eggsAndPetsOnlyCommand =
    command === "!eggs" ||
    command === "!egg" ||
    command === "!hatch" ||
    command.startsWith("!hatch ") ||
    command === "!pets" ||
    command === "!petdex" ||
    command === "!pethelp" ||
    command.startsWith("!pet ") ||
    command.startsWith("!equippet ") ||
    command.startsWith("!namepet ") ||
    command.startsWith("!resetpetname ") ||
    command.startsWith("!incubate ") ||
    command.startsWith("!combinepet ") ||
    command.startsWith("!fetch");

  if (eggsAndPetsOnlyCommand && message.channel.id === MONSTER_CHANNEL_ID) {
    return message.reply(
      `🥚🐾 **Eggs & Pets commands belong in <#${EGGS_PETS_CHANNEL_ID}>!**\n` +
      `Please use that channel so the Hunt channel stays focused on hunting.`
    );
  }

  if (command === "!eggs" || command === "!egg") {
    const slots = getIncubatorSlots(player);
    const active = player.incubatingEggs || [];

    const incubatorLines = Array.from({ length: slots }, (_, index) => {
      const incubation = active[index];
      if (!incubation) return `**Incubator Slot ${index + 1}:** Empty`;

      const status = Date.now() >= incubation.readyAt
        ? "✅ **Ready to hatch!**"
        : `⏳ Ready <t:${Math.floor(incubation.readyAt / 1000)}:R>`;

      return (
        `**Incubator Slot ${index + 1}:** ` +
        `${getEggDisplay(incubation)} — ${status}`
      );
    }).join("\n");

    const inventory = player.eggs.length > 0
      ? player.eggs.map((egg, index) =>
          `**${index + 1}.** ${getEggDisplay(egg)}`
        ).join("\n")
      : "You do not currently own any unincubated eggs.";

    return message.reply(
      `🥚 **${formatPlayerName(player, message.author.username)}'s Egg Nursery**\n\n` +
      `⏳ **Incubators: ${active.length}/${slots} in use**\n${incubatorLines}\n\n` +
      `🎒 **Egg Inventory**\n${inventory}\n\n` +
      `Use \`!incubate common\`, \`!incubate rare\`, \`!incubate epic\`, or \`!incubate legendary\`.\n` +
      `You can also use an egg number, such as \`!incubate 4\`.\n` +
      `Use \`!hatch\` to hatch the first ready egg or \`!hatch slot#\` to choose one.`
    );
  }

  if (command.startsWith("!incubate")) {
    const slots = getIncubatorSlots(player);

    if ((player.incubatingEggs || []).length >= slots) {
      return message.reply(
        `All **${slots} incubator${slots === 1 ? "" : "s"}** are currently in use. ` +
        `Use \`!eggs\` to check their timers.`
      );
    }

    if (player.eggs.length === 0) {
      return message.reply("You do not have any eggs available to incubate.");
    }

    const input = content.slice("!incubate".length).trim();
    let eggIndex = -1;

    if (/^\d+$/.test(input)) {
      eggIndex = Number(input) - 1;
    } else {
      const requestedRarity = Object.keys(EGG_TYPES).find(
        rarity => rarity.toLowerCase() === input.toLowerCase()
      );

      if (requestedRarity) {
        eggIndex = player.eggs.findIndex(egg => egg.rarity === requestedRarity);
      }
    }

    if (eggIndex < 0 || !player.eggs[eggIndex]) {
      return message.reply(
        "Egg not found.\n" +
        "Use `!incubate common`, `!incubate rare`, `!incubate epic`, or `!incubate legendary`.\n" +
        "You can also use an egg number shown by `!eggs`, such as `!incubate 4`."
      );
    }

    const [egg] = player.eggs.splice(eggIndex, 1);
    const distortionEgg = egg.eggKey ? DISTORTION_EGGS[egg.eggKey] : null;
    const duration = distortionEgg?.incubationMs || EGG_TYPES[egg.rarity]?.incubationMs || EGG_TYPES.Common.incubationMs;
    const incubation = {
      id: egg.id,
      rarity: egg.rarity,
      eggKey: egg.eggKey || null,
      adminTest: Boolean(egg.adminTest),
      startedAt: Date.now(),
      readyAt: Date.now() + duration,
      notified: false
    };

    player.incubatingEggs.push(incubation);
    saveData(data);

    const slotNumber = player.incubatingEggs.length;

    return message.reply(
      `${distortionEgg ? distortionEgg.icon : (EGG_TYPES[egg.rarity]?.icon || "🥚")} Your **${distortionEgg?.name || `${egg.rarity} Egg`}** is now incubating!\n` +
      `**Incubator Slot ${slotNumber} of ${slots}**\n` +
      `It will be ready <t:${Math.floor(incubation.readyAt / 1000)}:R>.`
    );
  }

  if (command === "!hatch" || command.startsWith("!hatch ")) {
    const requested = Number(content.slice("!hatch".length).trim());
    let incubationIndex = Number.isInteger(requested) && requested > 0
      ? requested - 1
      : player.incubatingEggs.findIndex(egg => Date.now() >= egg.readyAt);

    if (player.incubatingEggs.length === 0) {
      return message.reply("You do not have any eggs incubating. Use `!eggs` to view your eggs.");
    }

    if (incubationIndex < 0 || !player.incubatingEggs[incubationIndex]) {
      const next = [...player.incubatingEggs].sort((a, b) => a.readyAt - b.readyAt)[0];
      return message.reply(
        `⏳ None of your eggs are ready yet. Your next ${getEggDisplay(next)} will be ready ` +
        `<t:${Math.floor(next.readyAt / 1000)}:R>.`
      );
    }

    const incubation = player.incubatingEggs[incubationIndex];
    if (Date.now() < incubation.readyAt) {
      return message.reply(
        `⏳ Your ${getEggDisplay(incubation)} in Slot ${incubationIndex + 1} will be ready ` +
        `<t:${Math.floor(incubation.readyAt / 1000)}:R>.`
      );
    }

    const distortionEgg = incubation.eggKey ? DISTORTION_EGGS[incubation.eggKey] : null;
    const rarity = incubation.rarity;
    const definition = distortionEgg ? chooseDistortionPet(incubation.eggKey) : choosePetFromEgg(rarity);

    if (!definition) {
      return message.reply("That egg could not find a matching pet. Please contact an admin.");
    }

    // Final safety gate: even if the master pet registry is expanded later,
    // a normal egg is never allowed to resolve into a Distortion or secret pet.
    if (!distortionEgg && !isNormalEggPet(definition)) {
      console.error(
        `[EGG POOL SAFETY] Blocked normal ${rarity} Egg from hatching restricted pet ${definition.key} (${definition.habitat}).`
      );
      return message.reply(
        "⚠️ That egg rolled an invalid companion pool entry and was safely blocked. Please contact an admin."
      );
    }

    // Distortion eggs are equally strict: the resulting companion must be one
    // of the two pet keys explicitly configured for that exact egg.
    if (distortionEgg && !distortionEgg.pets.some(choice => choice.key === definition.key)) {
      console.error(
        `[DISTORTION EGG SAFETY] Blocked ${incubation.eggKey} from hatching invalid pet ${definition.key}.`
      );
      return message.reply(
        "⚠️ That Distortion Egg rolled an invalid companion entry and was safely blocked. Please contact an admin."
      );
    }

    const alreadyDiscoveredSpecies = player.discoveredPetKeys.includes(definition.key);
    const ownedPet = {
      id: player.nextPetId++,
      key: definition.key,
      nickname: null,
      personality: PET_PERSONALITIES[Math.floor(Math.random() * PET_PERSONALITIES.length)],
      companionXp: 0,
      affectionEvents: 0,
      timesHelped: 0,
      hatchedAt: Date.now(),
      adminTest: Boolean(incubation.adminTest)
    };

    const previousPoints = player.points;
    const hatchPoints = HATCH_POINT_REWARDS[distortionEgg ? definition.rarity : rarity] || 0;
    const dexBonus = alreadyDiscoveredSpecies ? 0 : NEW_PET_SPECIES_BONUS;

    player.pets.push(ownedPet);
    if (!player.discoveredPetKeys.includes(definition.key)) player.discoveredPetKeys.push(definition.key);
    if (ownedPet.adminTest) player.adminTest.generatedPetIds.push(ownedPet.id);
    player.incubatingEggs.splice(incubationIndex, 1);
    const hatchTotalPoints = applyCommunityPointBlessing(data, hatchPoints + dexBonus);
    player.points += hatchTotalPoints;
    addWeeklyProgress(data, player, hatchTotalPoints);
    player.titleProgress.eggsHatched = (player.titleProgress.eggsHatched || 0) + 1;

    const hadEquippedPetBeforeHatch = player.equippedPetId !== null;

    if (player.equippedPetId === null) {
      player.equippedPetId = ownedPet.id;
      player.pendingHatchChoice = null;
    } else {
      player.pendingHatchChoice = {
        petId: ownedPet.id,
        hatchedAt: Date.now(),
        expiresAt: Date.now() + HATCH_SACRIFICE_WINDOW,
        channelId: message.channel.id
      };
    }

    const incubatorUnlockText = getNewIncubatorUnlockText(player, previousPoints);
    const petCollectionUnlocks = evaluatePetCollectionRewards(data, player);
    const automaticTitleUnlocks = checkTitleUnlocks(player);

    const hatchHunterName = seasonMomentPlayerName(data, message.author.id);
    addSeasonMoment(data, {
      type: "first_pet",
      playerId: message.author.id,
      icon: "🐾",
      text: `${hatchHunterName} hatched the season's first companion: ${definition.name}.`,
      uniqueKey: "season:first_pet"
    });

    if (rarity === "Legendary") {
      addSeasonMoment(data, {
        type: "legendary_pet",
        playerId: message.author.id,
        icon: "🌟",
        text: `${hatchHunterName} hatched a Legendary companion: ${definition.name}!`
      });
    }

    for (const unlock of petCollectionUnlocks) {
      addSeasonMoment(data, {
        type: "pet_collection",
        playerId: message.author.id,
        icon: "🏆",
        text: `${hatchHunterName} completed a companion collection and unlocked ${unlock.title || unlock.name || "a secret title"}!`
      });
    }

    recordPointMilestoneMoments(data, message.author.id, previousPoints, player.points);
    saveData(data);
    await announceTitleUnlocks(message, automaticTitleUnlocks);

    const hatchMessage = await message.reply(
      `${distortionEgg?.icon || EGG_TYPES[rarity]?.icon || "🥚"} **The ${distortionEgg?.name || `${rarity} Egg`} begins to shake...**`
    );

    await wait(1000);

    const hatchingPath = distortionEgg?.hatchingImage ? findImageFile(distortionEgg.hatchingImage) : null;
    if (hatchingPath) {
      const hatchingEmbed = new EmbedBuilder()
        .setTitle(`✨ ${distortionEgg.name.toUpperCase()} — HATCHING`)
        .setDescription("The shell fractures as impossible magic erupts from within...");
      hatchingEmbed.setImage(`attachment://${path.basename(hatchingPath)}`);
      await hatchMessage.edit({ content: "", embeds: [hatchingEmbed], files: [new AttachmentBuilder(hatchingPath)] });
    } else {
      await hatchMessage.edit(`✨ **Cracks spread across the ${distortionEgg?.name || `${rarity} Egg`}...**\nSomething inside is trying to break free!`);
    }

    await wait(1500);

    const artworkPath = getPetArtworkPath(definition);
    const artworkUrl = getPetArtworkUrl(definition);
    const hatchEmbed = new EmbedBuilder()
      .setTitle(`🥚 YOUR ${(distortionEgg?.name || `${rarity} Egg`).toUpperCase()} HATCHED!`)
      .setDescription(
        `${getPetDisplayIcon(definition)} **${definition.name}** has joined your companions!\n\n` +
        `**Rarity:** ${definition.rarity}\n` +
        `**Habitat:** ${definition.habitat}\n` +
        `**Personality:** ${ownedPet.personality}\n` +
        `**Companion Level:** 1\n` +
        `✨ **Passive:** ${petPassiveTextForOwned(ownedPet)}\n\n` +
        `💰 **Hatch Reward:** +${applyCommunityPointBlessing(data, hatchPoints)} Hunter Points` +
        `${dexBonus ? `\n📖 **NEW PET DEX SPECIES:** +${dexBonus} Hunter Points` : ""}` +
        `${incubatorUnlockText}` +
        `${formatSecretUnlocks(petCollectionUnlocks)}\n\n` +
        `${player.equippedPetId === ownedPet.id
          ? "⭐ It has been equipped as your first companion!"
          : `Use \`!equippet ${player.pets.length}\` to equip it.`}` +
        `${hadEquippedPetBeforeHatch
          ? `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
            `⚖️ **KEEP OR SACRIFICE?**\n` +
            `You have **5 minutes** to decide what to do with this new hatch.\n\n` +
            `💚 Type **\`!keep\`** to keep it in your collection.\n` +
            `✨ Type **\`!sacrifice\`** to permanently convert it into ` +
            `**${PET_COMBINE_XP[rarity] || 50} Companion XP** for your currently equipped pet.\n\n` +
            `*Quick sacrifice gives XP only — it does NOT transfer the hatch's ability.*\n` +
            `If you do nothing, the pet is automatically kept.`
          : ""}`
      );

    const hatchFiles = [];
    if (artworkPath) {
      hatchEmbed.setImage(`attachment://${path.basename(artworkPath)}`);
      hatchFiles.push(new AttachmentBuilder(artworkPath));
    } else if (artworkUrl) {
      hatchEmbed.setImage(artworkUrl);
    }

    const finalHatchMessage = await hatchMessage.edit({
      content: "",
      embeds: [hatchEmbed],
      files: hatchFiles
    });
    if (petCollectionUnlocks.grandRewardGranted) {
      await announceGrandPetCollectionReward(message.channel, data, message.author.id);
    }
    return finalHatchMessage;
  }

  if (command === "!namepet" || command.startsWith("!namepet ")) {
    const match = content.match(/^!namepet\s+(\d+)\s+(.+)$/i);
    if (!match) return message.reply("Usage: `!namepet pet# New Name` — Example: `!namepet 2 Snowball`");

    const petNumber = Number(match[1]);
    const owned = player.pets[petNumber - 1];
    if (!owned) return message.reply("That pet number does not exist. Use `!pets` to view your pet numbers.");

    const nickname = match[2].replace(/\s+/g, " ").trim();
    const nicknameLength = [...nickname].length;
    if (nicknameLength < 2 || nicknameLength > 24) {
      return message.reply("Pet names must contain **2-24 characters**.");
    }
    if (/[@`*_~|<>\\\r\n]/u.test(nickname)) {
      return message.reply("Pet names cannot contain mentions, Discord formatting characters, angle brackets, backslashes, or line breaks.");
    }

    const definition = getOwnedPetDefinition(owned);
    const previousName = getOwnedPetName(owned);
    owned.nickname = nickname;
    saveData(data);

    return message.reply(
      `${getPetDisplayIcon(definition)} **PET RENAMED!**\n\n` +
      `Pet #${petNumber}: **${previousName}** → **${nickname}**\n` +
      `Species: **${definition?.name || owned.key}**\n\n` +
      `The nickname is cosmetic; abilities, levels, artwork, and Pet Dex progress are unchanged.`
    );
  }

  if (command === "!resetpetname" || command.startsWith("!resetpetname ")) {
    const match = content.match(/^!resetpetname\s+(\d+)$/i);
    if (!match) return message.reply("Usage: `!resetpetname pet#` — Example: `!resetpetname 2`");
    const petNumber = Number(match[1]);
    const owned = player.pets[petNumber - 1];
    if (!owned) return message.reply("That pet number does not exist. Use `!pets` to view your pet numbers.");
    const definition = getOwnedPetDefinition(owned);
    if (!owned.nickname) return message.reply(`Pet #${petNumber} is already using its species name: **${definition?.name || owned.key}**.`);
    const oldNickname = owned.nickname;
    owned.nickname = null;
    saveData(data);
    return message.reply(
      `${getPetDisplayIcon(definition)} **PET NAME RESET**\n\n` +
      `**${oldNickname}** is now displayed as **${definition?.name || owned.key}** again.`
    );
  }

  if (command === "!pets") {
    if (player.pets.length === 0) {
      return message.reply("🐾 You have not hatched any pets yet. Find eggs during successful hunts!");
    }

    // Keep the original compact pet-list appearance while safely splitting
    // very large collections across multiple Discord messages.
    const entries = player.pets.map((owned, index) => {
      const definition = getOwnedPetDefinition(owned);
      const info = getCompanionLevelInfo(owned);
      const marker = `${index + 1}. ${player.equippedPetId === owned.id ? "⭐ " : ""}`;
      const xpText = info.level >= MAX_COMPANION_LEVEL
        ? "MAX"
        : `${info.xpIntoLevel}/${info.xpNeeded}`;

      return (
        `${marker}${definition ? getPetDisplayIcon(definition) : "🐾"} **${getOwnedPetIdentity(owned)}** — ` +
        `${definition?.rarity || "Unknown"} | Level ${info.level} | Bond ${getPetBondLevel(owned)} | ${owned.personality} ` +
        `✨ Passive: **${petPassiveTextForOwned(owned)}** ⭐ XP: **${xpText}**`
      );
    });

    const header = `🐾 **${formatPlayerName(player, message.author.username)}'s Pets**\n\n`;
    const footer =
      `\n\n⭐ = Equipped\n` +
      `Use \`!pet number\` for details or \`!equippet number\` to equip one.\n` +
      `Use \`!namepet pet# New Name\` to give a pet a nickname.\n` +
      `Use \`!combine keep# sacrifice#\` to combine companions.`;

    const chunks = [];
    let current = header;

    for (const entry of entries) {
      const addition = `${current === header ? "" : "\n\n"}${entry}`;
      const reservedFooterLength = chunks.length === 0 ? footer.length : 0;

      if (current.length + addition.length + reservedFooterLength > 1950 && current !== header) {
        chunks.push(current);
        current = entry;
      } else {
        current += addition;
      }
    }

    chunks.push(current);
    chunks[chunks.length - 1] += footer;

    await message.reply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
      await message.channel.send(chunks[i]);
    }
    return;
  }

  if (command === "!petdex" || command.startsWith("!petdex ")) {
    const petDexUnlocks = evaluatePetCollectionRewards(data, player);
    if (petDexUnlocks.length || petDexUnlocks.grandRewardGranted) saveData(data);
    for (const unlock of petDexUnlocks) {
      await message.channel.send(formatSecretUnlocks([unlock]));
    }
    if (petDexUnlocks.grandRewardGranted) {
      await announceGrandPetCollectionReward(message.channel, data, message.author.id);
    }

    const discoveredKeys = new Set(player.discoveredPetKeys || []);
    const habitatNames = Object.keys(PET_COLLECTIONS);
    const habitatsPerPage = 2;
    const totalPages = Math.ceil(habitatNames.length / habitatsPerPage);
    const requestedPage = Number(content.slice("!petdex".length).trim() || "1");
    const page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(totalPages, requestedPage)) : 1;
    const pageHabitats = habitatNames.slice((page - 1) * habitatsPerPage, page * habitatsPerPage);

    const habitatSections = pageHabitats.map(habitat => {
      const habitatPets = pets.filter(pet => pet.habitat === habitat);
      const reward = PET_COLLECTIONS[habitat];
      const collected = habitatPets.filter(pet => discoveredKeys.has(pet.key)).length;
      const entries = habitatPets.map(definition =>
        `${discoveredKeys.has(definition.key) ? "✅" : "⬜"} ${getPetDisplayIcon(definition)} **${definition.name}** — ${definition.rarity}`
      ).join("\n");
      return `${reward.icon} **${habitat} Companions — ${collected}/${habitatPets.length}**\n${entries}`;
    }).join("\n\n");

    const knownPets = pets.filter(pet => Object.prototype.hasOwnProperty.call(PET_COLLECTIONS, pet.habitat));
    const knownOwnedCount = knownPets.filter(pet => discoveredKeys.has(pet.key)).length;
    const discoveredBeyond = pets.filter(
      pet => !Object.prototype.hasOwnProperty.call(PET_COLLECTIONS, pet.habitat) && discoveredKeys.has(pet.key)
    );
    const beyondText = discoveredBeyond.length
      ? `\n\n🌀 **Discoveries Beyond the Known Habitats**\n` +
        discoveredBeyond.map(pet => `${getPetDisplayIcon(pet)} **${pet.name}** — ${pet.rarity}`).join("\n")
      : "";

    return message.reply(
      `📖 **${formatPlayerName(player, message.author.username)}'s Pet Dex**\n` +
      `Known Habitat Collection: **${knownOwnedCount}/${knownPets.length} companions** | Page **${page}/${totalPages}**\n\n` +
      `${habitatSections}` +
      `${beyondText}\n\n` +
      `Use \`!petdex ${page < totalPages ? page + 1 : 1}\` to ${page < totalPages ? "view the next page" : "return to page 1"}.`
    );
  }

  if (command.startsWith("!viewpet ")) {
    const owned = resolveOwnedPet(player, content.slice("!viewpet".length));
    if (!owned) return message.reply("Pet not found. Use `!pets` to view your personal pet numbers.");
    const definition = getOwnedPetDefinition(owned);
    if (!definition) return message.reply("That pet definition could not be found.");

    const artworkPath = getPetArtworkPath(definition);
    const artworkUrl = getPetArtworkUrl(definition);
    const embed = new EmbedBuilder()
      .setTitle(`${getPetDisplayIcon(definition)} ${getOwnedPetIdentity(owned)}`)
      .setDescription(
        `**${definition.rarity} Companion**\n` +
        `Habitat: **${definition.habitat}**\n` +
        `${companionXpBar(owned)}\n\n` +
        `✨ **Passive:** ${petPassiveTextForOwned(owned)}\n\n` +
        `*Only pets you personally own can be viewed with this command.*`
      );

    const files = [];
    if (artworkPath) {
      embed.setImage(`attachment://${path.basename(artworkPath)}`);
      files.push(new AttachmentBuilder(artworkPath));
    } else if (artworkUrl) {
      embed.setImage(artworkUrl);
    }

    return message.reply({ embeds: [embed], files });
  }

  if (command.startsWith("!pet ")) {
    const owned = resolveOwnedPet(player, content.slice(5));
    if (!owned) return message.reply("Pet not found. Use `!pets` to view your pet numbers.");
    const definition = getOwnedPetDefinition(owned);
    return message.reply(
      `${getPetDisplayIcon(definition)} **${getOwnedPetIdentity(owned)}**

` +
      `Rarity: **${definition.rarity}**
` +
      `Habitat: **${definition.habitat}**
` +
      `Personality: **${owned.personality}**
` +
      `${companionXpBar(owned)}
` +
      `Bond Level: **${getPetBondLevel(owned)}/${MAX_PET_BOND_LEVEL}**
` +
      `Passive: **${petPassiveTextForOwned(owned)}**
` +
      `Affection Events: **${owned.affectionEvents || 0}**
` +
      `Times Helped: **${owned.timesHelped || 0}**
` +
      `Equipped: **${player.equippedPetId === owned.id ? "Yes" : "No"}**`
    );
  }

  if (command.startsWith("!equippet ")) {
    const owned = resolveOwnedPet(player, content.slice(10));
    if (!owned) return message.reply("Pet not found. Use `!pets` to view your pet numbers.");
    player.equippedPetId = owned.id;
    const automaticTitleUnlocks = checkTitleUnlocks(player);
    saveData(data);
    await announceTitleUnlocks(message, automaticTitleUnlocks);
    const definition = getOwnedPetDefinition(owned);
    return message.reply(`${getPetDisplayIcon(definition)} You equipped **${getOwnedPetIdentity(owned)}**!\nPassive: **${petPassiveText(player)}**\nIts icon will now appear beside your name in Monster Hunt messages.`);
  }

  if (command === "!unequippet") {
    player.equippedPetId = null;
    saveData(data);
    return message.reply("🐾 Your companion has been unequipped.");
  }

  if (command.startsWith("!giveegg ")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Only admins can give eggs.");
    const target = message.mentions.users.first();
    const rarityInput = content.replace(/!giveegg\s+<@!?\d+>\s*/i, "").trim();
    const rarity = Object.keys(EGG_TYPES).find(value => value.toLowerCase() === rarityInput.toLowerCase());
    if (!target || !rarity) return message.reply("Usage: `!giveegg @user common/rare/epic/legendary`");
    const targetPlayer = getPlayer(data, target.id);
    targetPlayer.eggs.push({ rarity, foundAt: Date.now() });
    saveData(data);
    return message.reply(`🥚 Gave a **${rarity} Egg** to ${formatPlayerMention(data, target.id)}.`);
  }

  if (command === "!catch" || command.startsWith("!catch ")) {
    return message.reply(
      "The `!catch` command has been retired. Use `!hunt`, then reply with one of the numbered choices shown by the bot."
    );
  }

  if (command === "!daily") {
    let text = `🎯 **${formatPlayerName(player, message.author.username)}'s Daily Quests**\n\n`;
    let totalReward = 0;

    player.dailyQuests.forEach(q => {
      totalReward += q.reward;
      text += `${q.progress >= q.goal ? "✅" : "⬜"} ${q.text} (${q.progress}/${q.goal})\n`;
    });

    const rerollStatus = getDailyRerollStatus(player);

    text += `\nReward: **+${totalReward} bonus points**`;
    text += `\nChance for bonus bait when claimed.`;
    text += `\nClaim with \`!claimdaily\` when complete.`;
    text += `\n\n🔄 **Daily Rerolls**`;
    text += `\n${rerollStatus.text}`;
    text += `\nUse \`!rerolldaily\` to replace unfinished challenges.`;
    text += `\n✅ Completed challenges are never removed.`;

    return message.reply(text);
  }

  if (command === "!rerolldaily" || command === "!dailyreroll") {
    if (player.dailyClaimed) {
      return message.reply(
        "✅ You already completed and claimed today's Daily Quests. " +
        "Your rerolls reset with tomorrow's quests at **5:00 AM Mountain Time**."
      );
    }

    const unfinished = (player.dailyQuests || []).filter(q => q.progress < q.goal);

    if (unfinished.length === 0) {
      return message.reply(
        "🎉 All of today's Daily Quests are already complete! " +
        "Use `!claimdaily` to collect your reward."
      );
    }

    const rerollStatus = getDailyRerollStatus(player);

    if (!rerollStatus.available) {
      return message.reply(
        "🔒 **You've used both Daily Quest rerolls for today.**\n" +
        "Your rerolls reset with the new Daily Quests at **5:00 AM Mountain Time**."
      );
    }

    if (rerollStatus.costType === "berry") {
      const berries = Number(player.captureItems?.berry || 0);

      if (berries < DAILY_SECOND_REROLL_BERRY_COST) {
        return message.reply(
          `🍓 Your free reroll has already been used.\n\n` +
          `A second reroll costs **${DAILY_SECOND_REROLL_BERRY_COST} Hunter Berry**, ` +
          `but you currently have **${berries}**.\n\n` +
          `Your rerolls reset at **5:00 AM Mountain Time**.`
        );
      }
    }

    const completedBefore = (player.dailyQuests || []).filter(
      q => q.progress >= q.goal
    );

    let costText = "🎟️ **Free Daily Reroll used!**";

    if (rerollStatus.costType === "berry") {
      player.captureItems.berry -= DAILY_SECOND_REROLL_BERRY_COST;
      costText =
        `🍓 **Second Daily Reroll used!** ` +
        `-${DAILY_SECOND_REROLL_BERRY_COST} Hunter Berry`;
    }

    const result = rerollUnfinishedDailyQuests(player);

    if (!result.changed) {
      if (rerollStatus.costType === "berry") {
        player.captureItems.berry += DAILY_SECOND_REROLL_BERRY_COST;
      }

      return message.reply(
        "I couldn't generate replacement quests, so nothing was changed or charged."
      );
    }

    player.dailyRerollsUsed =
      Math.max(0, Number(player.dailyRerollsUsed || 0)) + 1;

    saveData(data);

    const nextStatus = getDailyRerollStatus(player);

    let text = `🔄 **DAILY QUESTS REROLLED!**\n\n`;
    text += `${costText}\n\n`;

    if (completedBefore.length > 0) {
      text += `✅ **Completed quests kept:**\n`;
      completedBefore.forEach(q => {
        text += `• ${q.text} (${q.goal}/${q.goal})\n`;
      });
      text += `\n`;
    }

    text += `🆕 **Your Daily Quests:**\n`;
    text += `${formatDailyQuestList(player)}\n\n`;
    text += `${nextStatus.text}`;

    if (
      player.dailyRerollsUsed === DAILY_FREE_REROLLS &&
      nextStatus.costType === "berry"
    ) {
      text +=
        `\nUse \`!rerolldaily\` again if needed. ` +
        `Your second reroll costs **${DAILY_SECOND_REROLL_BERRY_COST} Hunter Berry**.`;
    } else if (!nextStatus.available) {
      text += `\nYour rerolls reset at **5:00 AM Mountain Time**.`;
    }

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

    const baseReward = player.dailyQuests.reduce((sum, q) => sum + q.reward, 0);
    const reward = applyCommunityPointBlessing(data, baseReward);
    player.points += reward;
    addWeeklyProgress(data, player, reward);
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
        "🌙 Daily rewards reset every day at 5:00 AM Mountain Time. Come back after 5:00 AM!"
      );
    }

    if (hasClaimedDailyRewardToday(player)) {
      return message.reply(
        "🎁 You already claimed today's reward! It resets at 5:00 AM Mountain Time."
      );
    }

    const reward = giveRandomDailyReward(player, data);

    // Store the current 5:00 AM Mountain Time reset date instead of a rolling timestamp.
    player.dailyReward = getResetDate();
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
      `📚 **${formatPlayerName(player, message.author.username)}'s Monster Knowledge**\n\n${text}\n\n` +
      `Knowledge bonuses: 3 encounters = +5%, 5 = +10%, 10 = +15%, 20 = +20%.`
    );
  }

  if (command.startsWith("!knowledge ")) {
    const search = cleanMonsterName(content.slice(11).trim()).toLowerCase();
    const allMonsters = [...monsters, MIXER_MONSTER, ...eventMonsters, ...ultraRareMonsters];
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
    if (isBigGameActive(data)) {
      return message.reply(`🎯 **BIG GAME HUNT — LIVE**\n\nEnds <t:${Math.floor(data.bigGame.endsAt / 1000)}:R>. Use \`!biggame\` for standings.`);
    }
    if (data.tokenSurge?.active) {
      return message.reply(`🪙 **TOKEN SURGE — LIVE**\n\nSuccessful catches may yield Hunt Tokens until <t:${Math.floor(data.tokenSurge.endsAt / 1000)}:R>.`);
    }
    const event = getActiveEvent();
    if (!event) return message.reply("📅 No special event is active today.");

    return message.reply(`🎉 **${event.name}**\n\n${event.description}`);
  }

  if (command === "!collection" || command === "!lifetimecollection") {
    const lifetime = player.lifetimeCaught || [];
    const season = player.caught || [];
    const merchantItems = Object.entries(player.merchantCollection || {}).filter(([, amount]) => amount > 0);
    const merchantItemCount = merchantItems.reduce((sum, [, amount]) => sum + amount, 0);

    if (lifetime.length === 0 && season.length === 0 && merchantItemCount === 0) {
      return message.reply("You haven't collected any monsters or merchant items yet!");
    }

    const lifetimeList = lifetime
      .slice(-25)
      .map((m, i) => `${lifetime.length - Math.min(25, lifetime.length) + i + 1}. ${m.name} — ${m.rarity}`)
      .join("\n");

    return message.reply(
      `🏛️ **${formatPlayerName(player, message.author.username)}'s Lifetime Monster Collection**\n` +
      `Lifetime Creatures: **${lifetime.length}**\n` +
      `Current Season Catches: **${season.length}**\n` +
      `Current Season Points: **${player.points}**\n\n` +
      `${lifetimeList || "No lifetime creatures have been imported or caught yet."}\n\n` +
      `🎒 Merchant Collectibles: **${merchantItemCount} items across ${merchantItems.length} types**\n` +
      `Use \`!merchantcollection\` to view merchant collectibles and eggs.\n\n` +
      `*Imported creatures are for collection and bragging rights only. They do not affect points, quests, achievements, or the leaderboard.*`
    );
  }

  if (command === "!achievements") {
    const unlocked = unlockedAchievements(player);

    let text = `🏆 **${formatPlayerName(player, message.author.username)}'s Achievements**\n\n`;

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

  if (command === "!title" || command === "!titles" || command.startsWith("!titles ")) {
    const newlyUnlocked = checkTitleUnlocks(player);
    saveData(data);
    await announceTitleUnlocks(message, newlyUnlocked);

    const unlocked = getAvailableTitles(player);
    if (unlocked.length === 0) {
      return message.reply(
        "🎖️ You have not discovered any secret titles yet. Keep hunting, hatching, exploring, and facing the unknown."
      );
    }

    const pageSize = 10;
    const requestedPage = command.startsWith("!titles ")
      ? Number(content.slice("!titles".length).trim())
      : 1;
    const totalPages = Math.max(1, Math.ceil(unlocked.length / pageSize));
    const page = Number.isInteger(requestedPage)
      ? Math.max(1, Math.min(totalPages, requestedPage))
      : 1;
    const pageTitles = unlocked.slice((page - 1) * pageSize, page * pageSize);

    return message.reply(
      `🎖️ **${formatPlayerName(player, message.author.username)}'s Discovered Titles**\n` +
      `Page **${page}/${totalPages}**\n\n` +
      pageTitles.map(title => `${player.title === title ? "⭐" : "•"} ${formatTitle(title)}`).join("\n") +
      `\n\n⭐ = Equipped\nUse \`!title Title Name\` to equip one.` +
      `${page < totalPages ? `\nUse \`!titles ${page + 1}\` for the next page.` : ""}`
    );
  }

  if (command.startsWith("!title ")) {
    const wantedTitle = content.slice(7).trim();
    const unlocked = getAvailableTitles(player);
    const match = unlocked.find(t => t.toLowerCase() === wantedTitle.toLowerCase());

    if (!match) return message.reply("You have not discovered that title. Undiscovered titles and their requirements remain secret.");

    player.title = match;
    saveData(data);

    return message.reply(`🎖️ You equipped ${formatTitle(match)}!`);
  }

  if (command === "!dex" || command.startsWith("!dex ")) {
    const input = content.slice("!dex".length).trim();
    const stats = getDexStats(data);

    // The Dex is discovery-based. Only species this player has actually
    // caught are visible; undiscovered monsters remain completely secret.
    const discoveredMap = new Map();

    for (const caughtMonster of player.lifetimeCaught || []) {
      const cleanName = cleanMonsterName(caughtMonster.name);
      if (!cleanName || discoveredMap.has(cleanName.toLowerCase())) continue;

      discoveredMap.set(cleanName.toLowerCase(), {
        name: cleanName,
        rarity: caughtMonster.rarity || stats[cleanName]?.rarity || "Unknown",
        shinyCaught: Boolean(caughtMonster.shiny)
      });
    }

    const discoveredNames = [...discoveredMap.values()]
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (discoveredNames.length === 0) {
      return message.reply(
        `📖 **${formatPlayerName(player, message.author.username)}'s Monster Dex**\n\n` +
        `You have not discovered any monsters yet.\n` +
        `Use \`!hunt\` and successfully capture a creature to add it to your Dex.`
      );
    }

    if (input && !/^\d+$/.test(input)) {
      const search = cleanMonsterName(input).toLowerCase();
      const matchName = discoveredNames.find(
        name => cleanMonsterName(name).toLowerCase() === search
      );

      if (!matchName) {
        return message.reply(
          "That creature has not been discovered in your Monster Dex."
        );
      }

      const info = stats[matchName];
      const ownedCopies = (player.lifetimeCaught || []).filter(
        monster => cleanMonsterName(monster.name) === cleanMonsterName(matchName)
      );
      const shinyCopies = ownedCopies.filter(monster => monster.shiny).length;
      const rarity = info?.rarity || ownedCopies[0]?.rarity || "Unknown";
      const baseChance = info?.chance;

      return message.reply(
        `📖 **${matchName}**\n\n` +
        `Rarity: **${rarity}**\n` +
        `${baseChance !== undefined ? `Base Capture Chance: **${baseChance}%**\n` : ""}` +
        `Your Lifetime Catches: **${ownedCopies.length}**\n` +
        `Your Shiny Catches: **${shinyCopies}**\n` +
        `Your Encounters: **${getKnowledgeCount(player, matchName)}**\n` +
        `Your Knowledge Bonus: **+${getKnowledgeBonus(getKnowledgeCount(player, matchName))}%**\n` +
        `${info ? `Times Caught Server-Wide: **${info.caught}**\n` : ""}` +
        `${info?.firstCaughtBy
          ? `First Caught By: ${formatPlayerMention(data, info.firstCaughtBy)}`
          : "First Caught By: Unknown"}`
      );
    }

    const pageSize = 10;
    const requestedPage = Number(input || "1");
    const totalPages = Math.max(1, Math.ceil(discoveredNames.length / pageSize));
    const page = Number.isInteger(requestedPage)
      ? Math.max(1, Math.min(totalPages, requestedPage))
      : 1;

    const pageNames = discoveredNames.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    const lines = pageNames.map(name => {
      const info = stats[name];
      const ownedCopies = (player.lifetimeCaught || []).filter(
        monster => cleanMonsterName(monster.name) === cleanMonsterName(name)
      );
      const shinyCopies = ownedCopies.filter(monster => monster.shiny).length;
      const rarity = info?.rarity || ownedCopies[0]?.rarity || "Unknown";

      return (
        `✅ **${name}** — ${rarity}` +
        ` | Caught: ${ownedCopies.length}` +
        `${shinyCopies > 0 ? ` | ✨ Shiny: ${shinyCopies}` : ""}`
      );
    });

    return message.reply(
      `📖 **${formatPlayerName(player, message.author.username)}'s Monster Dex**\n` +
      `Discovered Species: **${discoveredNames.length}**\n` +
      `Page **${page}/${totalPages}**\n\n` +
      `${lines.join("\n")}\n\n` +
      `Only monsters you have personally caught are shown.\n` +
      `Use \`!dex ${page < totalPages ? page + 1 : 1}\` to ${page < totalPages ? "view the next page" : "return to page 1"}.\n` +
      `Use \`!dex monster name\` for details about a discovered creature.`
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

    if (isWeeklyCompetitionActive(data)) {
      const weekly = Object.entries(data.players).sort((a,b)=>(b[1].weeklyStats?.points||0)-(a[1].weeklyStats?.points||0)).slice(0,5);
      text += `\n🏅 **This Week**\n`; weekly.forEach(([id,p],i)=> text += `${i+1}. <@${id}> — **${p.weeklyStats?.points||0} weekly points**\n`);
    } else { text += `\n🏅 Weekly competition begins Monday at **5:00 AM Mountain Time**.`; }
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
      `🤝 Trade sent to ${formatPlayerMention(data, target.id)}!\n` +
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

    const allMonsters = [...monsters, MIXER_MONSTER, ...eventMonsters, ...ultraRareMonsters];

    const match = allMonsters.find(m =>
      m.name.toLowerCase() === monsterName.toLowerCase() ||
      m.name.replace(/[🎆🇺🇸🦅🌌🐉🔥❄️⚡👻🌳🌠]/gu, "").trim().toLowerCase() === monsterName.toLowerCase()
    );

    if (!match) return message.reply("Monster not found.");

    const targetPlayer = getPlayer(data, target.id);
    const grantedMonster = { ...match, shiny: false };
    targetPlayer.caught.push(grantedMonster);
    targetPlayer.lifetimeCaught.push({ ...grantedMonster });
    targetPlayer.points += match.points;

    saveData(data);

    return message.reply(`✅ Gave **${match.name}** to ${formatPlayerMention(data, target.id)}.`);
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

  if (command === "!pethelp" || command === "!petshelp") {
    return message.reply(
      `🥚 **EGGS & COMPANION GUIDE**\n\n` +
      `🥚 **Finding Eggs**\n` +
      `Eggs may appear after successful normal hunts.\n` +
      `Common roll: **50%** | Rare: **30%** | Epic: **20%** | Legendary: **10%**\n\n` +
      `⏳ **Incubation Times**\n` +
      `Common = **30 minutes**\nRare = **1 hour**\nEpic = **2 hours**\nLegendary = **4 hours**\n\n` +
      `Use \`!eggs\` to view eggs and incubators.\n` +
      `Use \`!incubate rarity\` or \`!incubate egg#\` to begin incubation.\n` +
      `Use \`!hatch\` when an egg is ready.\n\n` +
      `🏗️ **Incubator Progression**\n` +
      `You begin with **1 incubator** and unlock another every **100 Hunter Points**, up to **5**.\n\n` +
      `🐾 **Companions**\n` +
      `Every habitat has Common, Rare, Epic, and Legendary companions. Only one can be equipped at a time.\n` +
      `Use \`!pets\`, \`!pet number\`, and \`!equippet number\`.\n` +
      `Give a companion a cosmetic nickname with \`!namepet pet# New Name\`.\n` +
      `Restore its species name with \`!resetpetname pet#\`.\n\n` +
      `⭐ **Companion Progression**\n` +
      `The equipped pet earns **10 Companion XP** after successful hunts. Affection Events can award **5 bonus XP**.\n` +
      `Pets can reach **Level 25**. Bond increases every five levels, up to Bond 5, strengthening the passive.\n\n` +
      `✨ **Pet Passives**\n` +
      `Passives can improve capture chance, egg discovery, shiny odds, points, item finds, or hunt cooldowns.\n\n` +
      `📖 **Pet Dex Collections**\n` +
      `Use \`!petdex\` to track all **32 standard habitat companions**. Once hatched, a species remains permanently checked—even if that pet is later combined or sacrificed.\n` +
      `Collect all four pets from a habitat for a unique title. Complete all 32 to receive **100 Hunter Points**, **1 Legendary Egg**, the Mythic **Master Beast Tamer** title, and **3 additional Legendary titles**.`
    );
  }

  if (command === "!monstercommands" || command === "!commands") {
    return message.reply(
      `📜 **MONSTER HUNT PLAYER COMMANDS**\n\n` +
      `🎯 **Hunting**\n` +
      `\`!hunt\` — Find a monster\n\`!captureitems\` — View capture items\n` +
      `\`!usebait rare/epic/legendary\` — Activate bait\n\`!knowledge\` — View species knowledge\n\n` +
      `📚 **Collection & Progress**\n` +
      `\`!dex\` — Monster Dex\n\`!stats\` — Hunter statistics\n\`!leaderboard\` — Rankings\n` +
      `\`!achievements\` — Achievements\n\`!titles\` — View and equip titles\n\`!collection\` — Lifetime collection summary\n\n` +
      `🪙 **Big Game & Merchants**\n` +
      `\`!biggame\` — Event timer and leaderboard\n\`!tokens\` — Hunt Token wallet\n` +
      `\`!merchant\` — Browse an active merchant\n\`!buy item name\` — Purchase an item\n` +
      `\`!merchantcollection\` — Merchant collection\n\`!use item name\` — Use an interactive item\n\`!gamble\` — Play when Gribble is visiting\n\n` +
      `🥚 **Eggs & Pets**\n` +
      `\`!eggs\` — Eggs and incubators\n\`!incubate rarity\` or \`!incubate egg#\`\n` +
      `\`!hatch\` or \`!hatch slot#\`\n\`!pets\` — Companion list\n` +
      `\`!pet number\` — Pet details\n\`!equippet number\` — Equip pet\n` +
      `\`!namepet pet# New Name\` — Name a pet\n\`!resetpetname pet#\` — Restore species name\n` +
      `\`!petdex\` — Pet collections\n\n` +
      `🌌 **Ultra Hunts**\n` +
      `\`!ultrahunt\` — Join active Ultra event\n\`!relics\` — View Relics\n\`!world\` — View the current public World Status\n` +
      `\`!summon relic name\` — Summon an Ultra\n\n` +
      `🎯 **Daily & Events**\n` +
      `\`!daily\` — Daily quests\n\`!claimdaily\` — Claim quest rewards\n` +
      `\`!dailyreward\` — Login reward\n\`!events\` — Current event\n\n` +
      `🤝 **Social & Notifications**\n` +
      `\`!trade @user your# their#\` — Trade monsters\n` +
      `\`!monsternotify on/off\` — Toggle reminders\n\n` +
      `📖 **Help**\n` +
      `\`!monsterhelp\` | \`!monsterrules\` | \`!pethelp\``
    );
  }

  if (command === "!monsterrules" || command === "!rules") {
    return message.reply(
      `🐉 **MONSTER HUNT RULES & GUIDE**\n\n` +
      `🎯 **Hunting**\n` +
      `Use \`!hunt\` to encounter a monster. Reply with one of the numbered capture choices shown by the bot.\n` +
      `You can normally hunt once every **2 hours**. Equipped pets with cooldown abilities can reduce this timer.\n\n` +
      `⭐ **Hunter Points**\n` +
      `Common = **1** | Rare = **3** | Epic = **5** | Legendary = **10**\n` +
      `Mythic and secret creatures have special rewards. Shiny monsters award **+10 points**.\n\n` +
      `📚 **Species Knowledge**\n` +
      `3 encounters = **+5%** | 5 = **+10%** | 10 = **+15%** | 20 = **+20%**\n\n` +
      `🎒 **Capture Items**\n` +
      `🍓 Hunter Berry = **+10%**\n🍯 Sticky Honey = **+20%**\n` +
      `🕸️ Enchanted Net = **+30%**\n🌟 Master Charm = **Guaranteed capture**\n` +
      `Use \`!captureitems\` to view your inventory.\n\n` +
      `🪤 **Bait**\n` +
      `Use \`!usebait rare\`, \`!usebait epic\`, or \`!usebait legendary\` to improve the rarity of your next normal encounter.\n\n` +
      `🌌 **Ultra Rare Hunts**\n` +
      `Ultra monsters appear through random weekly events or Relic summons. Use \`!ultrahunt\` during an active event.\n` +
      `Each Ultra has a unique ability. Catchers earn **50 points** and participating hunters earn at least **25 points** when it is caught.\n` +
      `View Relics with \`!relics\` and summon with \`!summon relic name\`.\n\n` +
      `🥚 **Eggs & Companions**\n` +
      `Successful hunts can uncover eggs. Incubate and hatch them to collect pets with passive abilities.\n` +
      `Use \`!pethelp\` for the complete companion guide.\n\n` +
      `🎯 **Daily Progress**\n` +
      `Use \`!daily\`, \`!claimdaily\`, and \`!dailyreward\`.\n\n` +
      `🪙 **Big Game Hunt**\n` +
      `Every Sunday from **12:00-2:00 PM Mountain Time**, the hunt cooldown becomes **30 minutes**. ` +
      `Successful catches award Hunt Tokens by rarity. The Top 3 earn **50 / 30 / 15 Hunter Points**, and everyone keeps their tokens.\n` +
      `Traveling Merchants appear unpredictably afterward. Use \`!merchant\`, \`!buy\`, \`!tokens\`, and \`!merchantcollection\`.\n\n` +
      `🏆 **Collections & Rewards**\n` +
      `Complete the Monster Dex, unlock achievements and titles, collect habitat pet sets, and climb the leaderboard.\n\n` +
      `Use \`!monstercommands\` for the complete command list.`
    );
  }

  if (command === "!moments" || command.startsWith("!moments ")) {
    const input = content.slice("!moments".length).trim().toLowerCase();
    const moments = [...(data.seasonMoments || [])].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    if (moments.length === 0) {
      return message.reply(
        "📜 No Season Chronicle moments have been recorded yet."
      );
    }

    const pageSize = 10;
    const requestedPage = input === "all" ? 1 : Number(input || "1");
    const totalPages = Math.max(1, Math.ceil(moments.length / pageSize));
    const page = Number.isInteger(requestedPage)
      ? Math.max(1, Math.min(totalPages, requestedPage))
      : 1;

    const pageMoments = moments.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    return message.reply(
      `📜 **SEASON CHRONICLE**\n` +
      `Recorded Moments: **${moments.length}**\n` +
      `Page **${page}/${totalPages}**\n\n` +
      `${pageMoments.map(moment => formatSeasonMoment(data, moment)).join("\n\n")}\n\n` +
      `${page < totalPages
        ? `Use \`!moments ${page + 1}\` for the next page.`
        : `Use \`!moments 1\` to return to the beginning.`}`
    );
  }

  if (command === "!story") {
    const moments = [...(data.seasonMoments || [])]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-15);

    if (moments.length === 0) {
      return message.reply(
        "📖 The season's story has not begun yet. Meaningful moments will appear here as hunters make history."
      );
    }

    const storyLines = moments.map((moment, index) => {
      const transitions = [
        "The season began when",
        "Not long after,",
        "As the hunt continued,",
        "Then came a moment few expected:",
        "The chronicles also remember when",
        "Later,",
        "Before long,",
        "The wilderness changed again when"
      ];
      const transition = transitions[Math.min(index, transitions.length - 1)];
      const sentence = moment.text.replace(/[.!]+$/, "");
      return `${transition} ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}.`;
    });

    return message.reply(
      `📖 **THE MONSTER HUNT SEASON CHRONICLE**\n\n` +
      `${storyLines.join("\n\n")}\n\n` +
      `*This story was created from the ${moments.length} most recent recorded moments.*`
    );
  }

  if (command.startsWith("!addmoment ")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can add Chronicle moments.");
    }

    const momentText = content.slice("!addmoment".length).trim();
    if (!momentText) {
      return message.reply("Usage: `!addmoment Describe the special moment here`");
    }

    const moment = addSeasonMoment(data, {
      type: "manual",
      playerId: message.author.id,
      icon: "📝",
      text: momentText
    });

    saveData(data);
    return message.reply(
      `✅ Added Chronicle Moment **#${moment.id}**:\n${moment.text}`
    );
  }

  if (command.startsWith("!removemoment ")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can remove Chronicle moments.");
    }

    const momentId = Number(content.slice("!removemoment".length).trim());
    if (!Number.isInteger(momentId)) {
      return message.reply("Usage: `!removemoment moment#`");
    }

    const index = (data.seasonMoments || []).findIndex(
      moment => Number(moment.id) === momentId
    );

    if (index < 0) {
      return message.reply("That Chronicle moment could not be found.");
    }

    const [removed] = data.seasonMoments.splice(index, 1);
    for (const [key, value] of Object.entries(data.seasonMomentFlags || {})) {
      if (Number(value) === momentId) delete data.seasonMomentFlags[key];
    }

    saveData(data);
    return message.reply(
      `🗑️ Removed Chronicle Moment **#${removed.id}**:\n${removed.text}`
    );
  }

  if (command === "!clearmoments") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can clear the Season Chronicle.");
    }

    data.seasonMoments = [];
    data.seasonMomentFlags = {};
    data.nextSeasonMomentId = 1;
    saveData(data);

    return message.reply("🧹 The Season Chronicle has been cleared.");
  }

  if (command === "!resetseason") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can reset the season.");
    }

    let preservedPlayers = 0;
    let preservedCreatures = 0;

    for (const [userId, oldPlayerData] of Object.entries(data.players)) {
      // Permanent collections and the cross-season Hunt Token economy are preserved.
      const lifetimeCaught = Array.isArray(oldPlayerData.lifetimeCaught)
        ? oldPlayerData.lifetimeCaught.map(monster => ({ ...monster }))
        : [];
      const preservedMerchantCollection = { ...(oldPlayerData.merchantCollection || {}) };
      const preservedMerchantPurchases = Array.isArray(oldPlayerData.merchantPurchases) ? [...oldPlayerData.merchantPurchases] : [];
      const preservedDiscoveredPetKeys = [...new Set([
        ...(oldPlayerData.discoveredPetKeys || []),
        ...(oldPlayerData.pets || []).map(pet => pet.key)
      ])];
      const grandPetCollectionRewardClaimed = Boolean(oldPlayerData.grandPetCollectionRewardClaimed);
      const permanentPetTitles = new Set([
        ...Object.values(PET_COLLECTIONS).map(reward => reward.title),
        GRAND_PET_COLLECTION_REWARD.title,
        ...GRAND_PET_COLLECTION_REWARD.legendaryTitles
      ]);
      const preservedPetTitles = (oldPlayerData.unlockedTitles || []).filter(title => permanentPetTitles.has(title));
      if (grandPetCollectionRewardClaimed) {
        for (const title of [GRAND_PET_COLLECTION_REWARD.title, ...GRAND_PET_COLLECTION_REWARD.legendaryTitles]) {
          if (!preservedPetTitles.includes(title)) preservedPetTitles.push(title);
        }
      }
      const permanentPetAchievements = new Set([
        ...Object.values(PET_COLLECTIONS).map(reward => reward.achievement),
        GRAND_PET_COLLECTION_REWARD.achievement,
        ...GRAND_PET_COLLECTION_REWARD.legendaryTitles.map(title => `${GRAND_PET_COLLECTION_REWARD.achievement}: ${title}`)
      ]);
      const preservedPetAchievements = (oldPlayerData.secretAchievements || []).filter(achievement => permanentPetAchievements.has(achievement));

      if (lifetimeCaught.length > 0 || preservedDiscoveredPetKeys.length > 0) {
        preservedPlayers++;
        preservedCreatures += lifetimeCaught.length;
      }

      data.players[userId] = {
        points: 0,
        caught: [],
        lifetimeCaught,
        currentMonster: null,
        lastHunt: 0,
        title: null,
        unlockedTitles: preservedPetTitles,
        secretAchievements: preservedPetAchievements,
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
        eggs: [],
        incubatingEggs: [],
        lastIncubatorSlots: 1,
        pets: [],
        discoveredPetKeys: preservedDiscoveredPetKeys,
        grandPetCollectionRewardClaimed,
        equippedPetId: null,
        nextPetId: 1,
        titleProgress: {
          eggsFound: 0, eggsHatched: 0, ultraAttempts: 0,
          captureItemsUsed: 0, masterCharmUsed: 0, baitUsed: 0,
          failedCaptureStreak: 0, failedAtNinety: false,
          mixerWithoutCharm: false, ultraAtFiveOrLess: false
        },
        relics: Object.fromEntries(RELIC_KEYS.map(relicKey => [relicKey, 0])),
        huntTokens: Math.max(0, Number(oldPlayerData.huntTokens || 0)),
        lifetimeTokens: Math.max(0, Number(oldPlayerData.lifetimeTokens || 0)),
        tokensSpent: Math.max(0, Number(oldPlayerData.tokensSpent || 0)),
        bigGameWins: Math.max(0, Number(oldPlayerData.bigGameWins || 0)),
        bigGamePlacements: Array.isArray(oldPlayerData.bigGamePlacements) ? [...oldPlayerData.bigGamePlacements] : [],
        merchantCollection: preservedMerchantCollection,
        merchantPurchases: preservedMerchantPurchases,
        merchantEffects: {},
        merchantGambles: Math.max(0, Number(oldPlayerData.merchantGambles || 0))
      };
    }

    // Reset all shared seasonal systems.
    data.pendingTrades = {};
    data.ultraRareState = null;
    data.worldProgress = Object.fromEntries(
      RELIC_KEYS.map(relicKey => [relicKey, false])
    );
    data.worldShatterUnlocked = false;
    data.worldCommunityMilestonesAwarded = [];
    data.communityBlessings = {};
    data.ultraWeeklySchedule = null;
    data.ultraAdminPauseUntil = 0;
    data.seasonMoments = [];
    data.seasonMomentFlags = {};
    data.nextSeasonMomentId = 1;
    data.bigGame = { active: false, weekKey: null, startedAt: 0, endsAt: 0, scores: {}, reachedAt: {}, halftimeSent: false, resultsSent: false, lastCompletedWeek: null, history: [], reminders: {} };
    data.merchant = { active: false, type: null, scheduledWeekKey: null, arrivalAt: 0, departureAt: 0, inventory: [], reminderSent: false, specialAt: 0, specialDone: false, clearance: false, lastVisitAt: 0, history: [] };
    data.tokenSurge = { active: false, startsAt: 0, endsAt: 0, announced: false, scheduledWeekKey: null };

    // Keep Dex-import records so the same old-bot export cannot be
    // accidentally imported over the permanent collection a second time.
    saveData(data);

    return message.reply(
      `🔄 **Monster Hunt season has been fully reset!**\n\n` +
      `✅ Preserved permanent Monster Dex, Pet Dex discoveries, and merchant collections for **${preservedPlayers} players**\n` +
      `✅ Preserved **${preservedCreatures} lifetime monster catches**\n\n` +
      `✅ Preserved Hunt Token wallets, lifetime token history, Big Game records, purchased collectibles, and permanent pet-collection titles\n\n` +
      `Reset: points, seasonal catches, hunt timers, quests, bait, capture items, active merchant effects, ` +
      `knowledge, titles, achievements, eggs, incubators, pets, Companion XP, ` +
      `Relics, trades, Ultra records, world progress, and the random Ultra schedule.`
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
          dailyRerollsUsed: 0,
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
          dailyRerollsUsed: 0,
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
  if (command === "!monsterhelp" || command === "!help" || command === "!guide") {
    return message.reply(
      `🌌 **MONSTER HUNT HELP**\n\n` +
      `Welcome, Hunter! Choose the guide you need:\n\n` +
      `🐉 **Game Rules & Core Systems**\nUse \`!monsterrules\`\n\n` +
      `🥚 **Eggs, Incubators & Companions**\nUse \`!pethelp\`\n\n` +
      `📜 **Complete Player Command List**\nUse \`!monstercommands\`\n\n` +
      `⭐ **Popular Commands**\n` +
      `\`!hunt\` — Find a monster\n` +
      `\`!eggs\` — View eggs and incubators\n` +
      `\`!pets\` — View your companions\n` +
      `\`!petdex\` — View companion collections\n` +
      `\`!dex\` — View your Monster Dex\n` +
      `\`!leaderboard\` — View the rankings\n` +
      `\`!events\` — View the current event\n` +
      `\`!relics\` — View Ultra Relics\n` +
      `\`!biggame\` — Big Game Hunt status\n` +
      `\`!tokens\` — Hunt Token wallet\n` +
      `\`!merchant\` — Traveling Merchant\n\n` +
      `New players should begin with \`!monsterrules\` and \`!pethelp\`.`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
