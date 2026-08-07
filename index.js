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
  { key: "hollow_prince", name: "Hollow Prince", icon: "👑", habitat: "Undead", rarity: "Legendary", ability: "points", baseBonus: 8, description: "Earns a massive point bonus from successful hunts." }
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
  title: "Master Beast Tamer"
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
  { name: PERFECT_CATCH_TITLE, rarity: "Mythic", check: p => Boolean(p.titleProgress?.perfectCatch) }
];

function getTitleDefinition(titleName) {
  const builtIn = HIDDEN_TITLE_DEFINITIONS.find(title => title.name === titleName);
  if (builtIn) return builtIn;

  const specialRarity = [
    "The Chosen Mixer", "Master Beast Tamer"
  ].includes(titleName) ? "Mythic" :
  ["Worldbreaker", "The All-Seeing", "Timewalker", "Starforged", "Soulkeeper", "Ultra Hunter", "Relic Keeper", "World Summoner", "Legendary Hunter"].includes(titleName)
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
      equippedPetId: null,
      nextPetId: 1,
      lastFetch: 0,
      fetchState: null,
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
      }
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

  return `https://cdn.discordapp.com/emojis/${customEmoji.id}.png?size=256&quality=lossless`;
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

  return `${getPetDisplayIcon(definition)} **${definition.name} gained ${amount} Companion XP!** (${reason})\n` +
    `${companionXpBar(ownedPet)}\n\n` +
    `**Ability Progress**\n${formatAllPetAbilityProgress(ownedPet)}` +
    `${after > before ? `\n🎉 **LEVEL UP! ${definition.name} reached Level ${after}!**\n✨ Its natural ${abilityDisplayName(definition.ability)} ability grew stronger.` : ""}` +
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

function getPetBonus(player, ability) {
  const ownedPet = getEquippedPet(player);
  return getPetAbilityEntries(ownedPet)
    .filter(entry => entry.ability === ability)
    .reduce((sum, entry) => sum + abilityBonusAtLevel(entry.ability, entry.baseBonus, entry.level), 0);
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

function getPlayerHuntCooldown(player) {
  const reductionMinutes = getPetBonus(player, "cooldown") * 5;
  return Math.max(30 * 60 * 1000, HUNT_COOLDOWN - reductionMinutes * 60 * 1000);
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
  return getPetAbilityEntries(ownedPet).map(entry => `${entry.natural ? "✨" : "🧬"} ${abilityDisplayName(entry.ability)} Lv. ${entry.level}: ${formatAbilityEffect(entry)}`).join("\n");
}

function petPassiveTextForOwned(ownedPet) {
  if (!ownedPet) return "Unknown passive.";
  return getPetAbilityEntries(ownedPet).map(entry => `${entry.natural ? "Natural" : "Inherited"} ${abilityDisplayName(entry.ability)} Lv. ${entry.level}: ${formatAbilityEffect(entry)}`).join(" | ");
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

function choosePetFromEgg(rarity) {
  const pool = pets.filter(pet => pet.rarity === rarity);
  if (pool.length === 0) return null;

  if (rarity !== "Legendary") {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Legendary Eggs have one especially elusive companion.
  const weighted = [
    { key: "verdant_sentinel", weight: 15 },
    { key: "leviacub", weight: 15 },
    { key: "titan_spawn", weight: 15 },
    { key: "infernal_wyrmling", weight: 15 },
    { key: "white_tyrant_cub", weight: 15 },
    { key: "storm_emperor_cub", weight: 10 },
    { key: "hollow_prince", weight: 10 },
    { key: "astral_spawn", weight: 5 }
  ];

  let roll = Math.random() * 100;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll < 0) return getPetDefinition(entry.key);
  }

  return getPetDefinition("verdant_sentinel");
}

function rollEggRarity(player) {
  const petBonus = getPetBonus(player, "eggFinder");
  const emptySlots = Math.max(0, getIncubatorSlots(player) - (player.incubatingEggs || []).length);
  const nestBonus = Math.min(8, emptySlots * 2);
  const bonus = petBonus + nestBonus;
  // A modest global increase keeps unlocked incubators useful without flooding inventories.
  if (Math.random() * 100 < 12 + Math.floor(bonus / 4)) return "Legendary";
  if (Math.random() * 100 < 24 + Math.floor(bonus / 3)) return "Epic";
  if (Math.random() * 100 < 36 + Math.floor(bonus / 2)) return "Rare";
  if (Math.random() * 100 < 60 + bonus) return "Common";
  return null;
}

function maybeFindEgg(player) {
  const rarity = rollEggRarity(player);
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

  const events = {
    Cheerful: `${getPetDisplayIcon(definition)} **${definition.name}** celebrates the victory and refuses to leave your side.`,
    Curious: `${getPetDisplayIcon(definition)} **${definition.name}** studies the monster's tracks, then proudly returns to you.`,
    Loyal: `${getPetDisplayIcon(definition)} **${definition.name}** guards you while you recover from the hunt.`,
    Mischievous: `${getPetDisplayIcon(definition)} **${definition.name}** steals a trophy from the battlefield and presents it to you.`,
    Sleepy: `${getPetDisplayIcon(definition)} **${definition.name}** curls up beside you after the hunt, looking unusually content.`,
    Brave: `${getPetDisplayIcon(definition)} **${definition.name}** steps between you and danger without hesitation.`
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

  const reactions = {
    Cheerful: `${getPetDisplayIcon(definition)} **${definition.name}** cheers excitedly beside you!`,
    Curious: `${getPetDisplayIcon(definition)} **${definition.name}** carefully inspects the tracks left behind.`,
    Loyal: `${getPetDisplayIcon(definition)} **${definition.name}** stands proudly at your side.`,
    Mischievous: `${getPetDisplayIcon(definition)} **${definition.name}** darts around your new catch and causes a little chaos.`,
    Sleepy: `${getPetDisplayIcon(definition)} **${definition.name}** wakes up just long enough to celebrate.`,
    Brave: `${getPetDisplayIcon(definition)} **${definition.name}** lets out a fearless victory cry!`
  };

  const rewards = [];
  const findChance = 3 + getPetBonus(player, "itemFinder");
  if (Math.random() * 100 < findChance) {
    const roll = Math.random() * 100;
    if (roll < 55) {
      player.captureItems.berry++;
      rewards.push(`${getPetDisplayIcon(definition)} ${definition.name} found a ${CAPTURE_ITEMS.berry.name}!`);
    } else if (roll < 82) {
      player.captureItems.honey++;
      rewards.push(`${getPetDisplayIcon(definition)} ${definition.name} found a ${CAPTURE_ITEMS.honey.name}!`);
    } else if (roll < 96) {
      player.captureItems.net++;
      rewards.push(`${getPetDisplayIcon(definition)} ${definition.name} found an ${CAPTURE_ITEMS.net.name}!`);
    } else {
      player.points += 10;
      rewards.push(`${getPetDisplayIcon(definition)} ${definition.name} found **10 Hunter Points**!`);
    }
    ownedPet.timesHelped = (ownedPet.timesHelped || 0) + 1;
  }

  return { text: reactions[ownedPet.personality] || reactions.Curious, rewards };
}

function resolveOwnedPet(player, input) {
  const wanted = String(input || "").trim();
  const numeric = Number(wanted);
  if (Number.isInteger(numeric) && numeric > 0) return player.pets[numeric - 1] || null;
  return player.pets.find(owned => getOwnedPetDefinition(owned)?.name.toLowerCase() === wanted.toLowerCase()) || null;
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

function fetchFlavor(definition, personality, returning = false) {
  const starts = {
    Cheerful: `${definition.name} bounds away with unstoppable enthusiasm!`,
    Curious: `${definition.name} follows a mysterious trail into the distance.`,
    Loyal: `${definition.name} gives you one last determined look before setting out.`,
    Mischievous: `${definition.name} vanishes suspiciously quickly. This is probably fine.`,
    Sleepy: `${definition.name} yawns, stretches, and slowly wanders off to search.`,
    Brave: `${definition.name} charges into the wilds without a second thought!`
  };
  const returns = {
    Cheerful: `${definition.name} comes racing back, proudly showing off its haul!`,
    Curious: `${definition.name} returns after investigating every strange sound along the way.`,
    Loyal: `${definition.name} returns directly to your side with supplies carefully protected.`,
    Mischievous: `${definition.name} returns looking far too innocent and drops its findings at your feet.`,
    Sleepy: `${definition.name} returns with supplies... and immediately curls up for a nap.`,
    Brave: `${definition.name} marches back triumphantly from its adventure!`
  };
  return (returning ? returns : starts)[personality] || (returning ? returns.Curious : starts.Curious);
}

function rollFetchRewards(data, player, ownedPet, definition) {
  const rewards = [];

  // Fetch quantity is intentionally conservative.
  // Rarer pets improve QUALITY much more than quantity.
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

  // Higher rarity shifts the roll toward better-quality rewards.
  const qualityBoost = {
    Common: 0,
    Rare: 4,
    Epic: 8,
    Legendary: 12
  }[definition.rarity] || 0;

  const ability = definition.ability;

  for (let i = 0; i < count; i++) {
    let roll = Math.random() * 100 + qualityBoost;

    // Hidden specialties affect WHAT is found, not how many items return.
    if (ability === "eggFinder") roll -= 12;
    if (ability === "itemFinder") roll += 3;
    if (ability === "capture") roll += 2;

    roll = Math.max(0, Math.min(100, roll));

    if (roll < 8) {
      const rarity = rollEggRarity(player) || "Common";
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
      const pts = 5 + Math.floor(Math.random() * 6);
      player.points += pts;
      addWeeklyProgress(data, player, pts);
      rewards.push(`⭐ **${pts} Hunter Points**`);
    }
  }
  return rewards;
}

function calculateCaptureChance(player, monster, itemKey = null, data = null, userId = null) {
  const event = getActiveEvent();
  const comeback = getComebackTier(data || loadData(), player, userId);
  const isMixerMonster = cleanMonsterName(monster.name) === "Mixer Monster";
  const encounters = getKnowledgeCount(player, monster);
  const knowledgeBonus = isMixerMonster ? 0 : getKnowledgeBonus(encounters);
  const eventBonus = isMixerMonster ? 0 : (event?.captureBoost ? 10 : 0);
  const petBonus = isMixerMonster ? 0 : getPetBonus(player, "capture");
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
  const roll = Math.floor(Math.random() * 100) + 1;
  const criticalCatch = roll === 100;
  const perfectCatch = roll === 1;

  if (itemKey) {
    player.captureItems[itemKey]--;
    player.titleProgress.captureItemsUsed = (player.titleProgress.captureItemsUsed || 0) + 1;
    if (itemKey === "masterCharm") {
      player.titleProgress.masterCharmUsed = (player.titleProgress.masterCharmUsed || 0) + 1;
    }
  }

  const caught = criticalCatch || chanceInfo.guaranteed || roll <= chanceInfo.total;
  const event = getActiveEvent();

  if (caught) {
    let pointsEarned = monster.points;
    if (event?.doublePoints) pointsEarned *= 2;
    pointsEarned += getPetBonus(player, "points");
    const comeback = getComebackTier(data, player, userId);
    const baseBeforeComeback = pointsEarned;
    pointsEarned = Math.max(pointsEarned, Math.ceil(pointsEarned * comeback.pointMultiplier));
    if (criticalCatch) pointsEarned += CRITICAL_CATCH_BONUS_POINTS;
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
    const eggFound = maybeFindEgg(player);
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

    return message.reply(
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
  if (!filename) return null;

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
  const allMonsters = [...monsters, MIXER_MONSTER, ...eventMonsters, ...ultraRareMonsters];
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

function applyShiny(monster, player = null) {
  const event = getActiveEvent();

  const chance = (event?.shinyBoost ? SHINY_CHANCE * 3 : SHINY_CHANCE) + getPetBonus(player, "shiny");

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

function evaluatePetCollectionRewards(player) {
  const unlocked = [];
  const ownedKeys = new Set((player.pets || []).map(pet => pet.key));

  for (const [habitat, reward] of Object.entries(PET_COLLECTIONS)) {
    const habitatKeys = pets
      .filter(pet => pet.habitat === habitat)
      .map(pet => pet.key);

    if (habitatKeys.length > 0 && habitatKeys.every(key => ownedKeys.has(key))) {
      unlocked.push(...unlockSecretReward(player, reward.achievement, reward.title));
    }
  }

  if (pets.every(pet => ownedKeys.has(pet.key))) {
    unlocked.push(...unlockSecretReward(
      player,
      GRAND_PET_COLLECTION_REWARD.achievement,
      GRAND_PET_COLLECTION_REWARD.title
    ));
  }

  return unlocked;
}

function petCollectionProgressText(player) {
  const ownedKeys = new Set((player.pets || []).map(pet => pet.key));

  return Object.entries(PET_COLLECTIONS).map(([habitat, reward]) => {
    const habitatPets = pets.filter(pet => pet.habitat === habitat);
    const collected = habitatPets.filter(pet => ownedKeys.has(pet.key)).length;
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
      participant.points += participantReward;
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

  saveData(data);
  await announceTitleUnlocks(message, automaticTitleUnlocks);

  await message.channel.send(
    buildMonsterEmbed(
      caughtMonster,
      `🎉 ${formatPlayerName(catcher, message.author.username)} captured ${caughtMonster.name}!`,
      `**Catch Chance:** ${chance}%\n` +
      `**Roll:** ${roll}\n\n` +
      `🏆 ${formatPlayerMention(data, message.author.id)} earned **${ULTRA_CATCHER_REWARD} points**!\n` +
      `${otherParticipants.length > 0
        ? `🎉 ${otherParticipants.length} other participant${otherParticipants.length === 1 ? "" : "s"} earned **${participantReward} points each**!`
        : "You were the only participant in the hunt."}` +
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

async function checkReadyEggNotifications() {
  const data = loadData();
  const channel = await getMonsterHuntChannel();
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
  let changed = false;
  for (const [userId, playerRaw] of Object.entries(data.players || {})) {
    const player = getPlayer(data, userId);
    const channelId = player.reminderState?.channelId || player.fetchState?.channelId || MONSTER_CHANNEL_ID;
    const channel = client.channels.cache.get(channelId) || client.channels.cache.get(MONSTER_CHANNEL_ID);
    if (player.fetchState && !player.fetchState.completed && Date.now() >= player.fetchState.readyAt) {
      const ownedPet = player.pets.find(p => String(p.id) === String(player.fetchState.petId));
      const definition = getOwnedPetDefinition(ownedPet);
      if (ownedPet && definition && channel?.isTextBased()) {
        const rewards = rollFetchRewards(data, player, ownedPet, definition);
        const xpText = awardCompanionXp(player, FETCH_COMPANION_XP, "Fetch Adventure");
        const embed = new EmbedBuilder()
          .setTitle(`🐾 ${definition.name} Returned!`)
          .setDescription(`${fetchFlavor(definition, ownedPet.personality, true)}\n\n**Found:**\n${rewards.map(x => `• ${x}`).join("\n")}\n\n⭐ ${xpText}`);
        const art = getPetArtworkUrl(definition); if (art) embed.setImage(art);
        await channel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => null);
      }
      player.fetchState.completed = true;
      changed = true;
    }
    for (const type of ["hunt", "fetch"]) {
      const dueKey = `${type}DueAt`, sentKey = `${type}Sent`;
      if (player.cooldownReminders?.[type] && player.reminderState?.[dueKey] && !player.reminderState[sentKey] && Date.now() >= player.reminderState[dueKey]) {
        if (channel?.isTextBased()) {
          await channel.send(type === "hunt" ? `<@${userId}> 🏹 Your **\`!hunt\` cooldown is over!** The wilds are ready again.` : `<@${userId}> 🐾 Your pet is ready to use **\`!fetch\`** again!`).catch(() => null);
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

async function sendOverhaulAnnouncementOnce() {
  const data = loadData();
  if (data.overhaulAnnouncementSent) return;
  const channel = client.channels.cache.get(MONSTER_CHANNEL_ID);
  if (!channel?.isTextBased()) return;
  await channel.send(
    `# 🐉 MONSTER HUNT UPDATE!\n\n` +
    `🐾 Send your equipped pet adventuring with \`!fetch\`\n` +
    `🧬 Combine pets for Companion XP or inherited abilities with \`!combine\`\n` +
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

client.once("ready", () => {
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
    try { await processFetchReturnsAndReminders(); await processWeeklyCompetition(); }
    catch (error) { console.error("Fetch/reminder/weekly monitor failed:", error); }
  });
  processFetchReturnsAndReminders().catch(error => console.error("Initial fetch/reminder check failed:", error));
  processWeeklyCompetition().catch(error => console.error("Initial weekly check failed:", error));

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

  if (command === "!fetch") {
    const ownedPet = getEquippedPet(player), definition = getOwnedPetDefinition(ownedPet);
    if (!ownedPet || !definition) return message.reply("Equip a pet before using `!fetch`.");
    if (player.fetchState && !player.fetchState.completed) return message.reply(`🐾 ${definition.name} is still fetching and will return <t:${Math.floor(player.fetchState.readyAt/1000)}:R>.`);
    const left = FETCH_COOLDOWN - (Date.now() - (player.lastFetch || 0));
    if (left > 0) return message.reply(`⏳ Your pet can fetch again in **${formatTime(left)}**.`);
    player.lastFetch = Date.now();
    player.fetchState = { petId: ownedPet.id, startedAt: Date.now(), readyAt: Date.now()+FETCH_DURATION, completed:false, channelId: message.channel.id };
    player.reminderState.channelId = message.channel.id; player.reminderState.fetchDueAt = Date.now()+FETCH_COOLDOWN; player.reminderState.fetchSent = false;
    saveData(data);
    const embed = new EmbedBuilder().setTitle(`🐾 ${definition.name} Went Fetching!`).setDescription(`${fetchFlavor(definition, ownedPet.personality, false)}\n\nIt will return <t:${Math.floor(player.fetchState.readyAt/1000)}:R> with whatever it finds.`);
    const art=getPetArtworkUrl(definition); if(art) embed.setImage(art);
    return message.reply({embeds:[embed]});
  }

  if (command.startsWith("!combine ")) {
    const args = content.slice("!combine ".length).trim().split(/\s+/);
    if (args.length < 2) return message.reply("Use `!combine keepPet# sacrificePet#`. Example: `!combine 1 3`.");
    const keeper = resolveOwnedPet(player,args[0]), sacrifice = resolveOwnedPet(player,args[1]);
    if (!keeper || !sacrifice || keeper === sacrifice) return message.reply("Choose two different valid pet numbers from `!pets`.");
    if (String(player.equippedPetId) === String(sacrifice.id)) return message.reply("You cannot sacrifice your currently equipped pet. Equip another pet first.");
    const keepDef=getOwnedPetDefinition(keeper), sacrificeDef=getOwnedPetDefinition(sacrifice);
    if (!keepDef || !sacrificeDef) return message.reply("One of those pets could not be found.");
    const same = keeper.key === sacrifice.key;
    const capacity = petAbilityCapacity(player), currentAbilities = 1+(keeper.inheritedAbilities||[]).length;
    if (!same && currentAbilities >= capacity) return message.reply(`🧬 This pet currently has **${currentAbilities}/${capacity} ability slots**. Earn another 100 Hunter Points before adding another inherited ability.`);
    if (!same && getPetAbilityEntries(keeper).some(x=>x.ability===sacrificeDef.ability)) return message.reply("That pet already knows this ability.");
    const chance=PET_INHERIT_CHANCE[sacrificeDef.rarity]||15, xp=PET_COMBINE_XP[sacrificeDef.rarity]||50;
    const prompt = await message.reply(`⚠️ **PET COMBINATION CONFIRMATION**\nKeep: **${keepDef.name}**\nSacrifice forever: **${sacrificeDef.name}**\n${same ? `Result: **+${xp} Companion XP**` : `Result: **${chance}% chance** to inherit ${abilityDisplayName(sacrificeDef.ability)}. Failure grants **${Math.floor(xp/3)} XP**.`}\n\nType **CONFIRM** within 30 seconds.`);
    try {
      const c=await message.channel.awaitMessages({filter:r=>r.author.id===message.author.id&&r.content.trim().toUpperCase()==="CONFIRM",max:1,time:30000,errors:["time"]});
      await c.first().delete().catch(()=>null);
    } catch { return prompt.reply("Combination canceled."); }
    const fresh=loadData(), fp=getPlayer(fresh,message.author.id), fk=fp.pets.find(x=>String(x.id)===String(keeper.id)), fsac=fp.pets.find(x=>String(x.id)===String(sacrifice.id));
    if(!fk||!fsac) return message.reply("The pets changed before confirmation. No combination occurred.");
    const fDef=getOwnedPetDefinition(fsac); let result;
    if(fk.key===fsac.key){ fk.companionXp=(fk.companionXp||0)+(PET_COMBINE_XP[fDef.rarity]||50); result=`🧬 **COMPANION ENHANCED!** ${keepDef.name} gained **${PET_COMBINE_XP[fDef.rarity]||50} Companion XP**.\n${companionXpBar(fk)}`; }
    else if(Math.random()*100 < (PET_INHERIT_CHANCE[fDef.rarity]||15)){ fk.inheritedAbilities.push({ability:fDef.ability,baseBonus:fDef.baseBonus,sourcePetKey:fDef.key,sourceRarity:fDef.rarity,xp:0,inheritedAt:Date.now()}); result=`🧬 **ABILITY INHERITED!**\n${keepDef.name} learned **${abilityDisplayName(fDef.ability)}** at **Ability Level 1 — 0 XP**.`; }
    else { const consolation=Math.floor((PET_COMBINE_XP[fDef.rarity]||50)/3); fk.companionXp=(fk.companionXp||0)+consolation; result=`💨 **Inheritance Failed**\nThe ability did not transfer, but ${keepDef.name} absorbed **${consolation} Companion XP**.`; }
    fp.pets=fp.pets.filter(x=>String(x.id)!==String(fsac.id)); saveData(fresh); return message.reply(result);
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
    const huntCooldown = getPlayerHuntCooldown(player);
    const timeLeft = huntCooldown - (now - player.lastHunt);

    if (timeLeft > 0) {
      return message.reply(`⏳ You can hunt again in **${formatTime(timeLeft)}**.`);
    }

    const usedBait = player.activeBait;
    const monster = getRandomMonster(player);
    const encounters = addEncounterKnowledge(player, monster);
    const chanceInfo = calculateCaptureChance(player, monster, null, data, message.author.id);

    player.currentMonster = monster;
    player.activeBait = null;
    player.lastHunt = now;
    player.reminderState.channelId = message.channel.id;
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
        `${EGG_TYPES[incubation.rarity]?.icon || "🥚"} **${incubation.rarity} Egg** — ${status}`
      );
    }).join("\n");

    const inventory = player.eggs.length > 0
      ? player.eggs.map((egg, index) =>
          `**${index + 1}.** ${EGG_TYPES[egg.rarity]?.icon || "🥚"} **${egg.rarity} Egg**`
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
    const duration = EGG_TYPES[egg.rarity]?.incubationMs || EGG_TYPES.Common.incubationMs;
    const incubation = {
      rarity: egg.rarity,
      startedAt: Date.now(),
      readyAt: Date.now() + duration,
      notified: false
    };

    player.incubatingEggs.push(incubation);
    saveData(data);

    const slotNumber = player.incubatingEggs.length;

    return message.reply(
      `${EGG_TYPES[egg.rarity]?.icon || "🥚"} Your **${egg.rarity} Egg** is now incubating!\n` +
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
        `⏳ None of your eggs are ready yet. Your next **${next.rarity} Egg** will be ready ` +
        `<t:${Math.floor(next.readyAt / 1000)}:R>.`
      );
    }

    const incubation = player.incubatingEggs[incubationIndex];
    if (Date.now() < incubation.readyAt) {
      return message.reply(
        `⏳ Your **${incubation.rarity} Egg** in Slot ${incubationIndex + 1} will be ready ` +
        `<t:${Math.floor(incubation.readyAt / 1000)}:R>.`
      );
    }

    const rarity = incubation.rarity;
    const definition = choosePetFromEgg(rarity);
    if (!definition) return message.reply("That egg could not find a matching pet. Please contact an admin.");

    const alreadyOwnedSpecies = player.pets.some(pet => pet.key === definition.key);
    const ownedPet = {
      id: player.nextPetId++,
      key: definition.key,
      personality: PET_PERSONALITIES[Math.floor(Math.random() * PET_PERSONALITIES.length)],
      companionXp: 0,
      affectionEvents: 0,
      timesHelped: 0,
      hatchedAt: Date.now()
    };

    const previousPoints = player.points;
    const hatchPoints = HATCH_POINT_REWARDS[rarity] || 0;
    const dexBonus = alreadyOwnedSpecies ? 0 : NEW_PET_SPECIES_BONUS;

    player.pets.push(ownedPet);
    player.incubatingEggs.splice(incubationIndex, 1);
    player.points += hatchPoints + dexBonus;
    addWeeklyProgress(data, player, hatchPoints + dexBonus);
    player.titleProgress.eggsHatched = (player.titleProgress.eggsHatched || 0) + 1;

    if (player.equippedPetId === null) player.equippedPetId = ownedPet.id;

    const incubatorUnlockText = getNewIncubatorUnlockText(player, previousPoints);
    const petCollectionUnlocks = evaluatePetCollectionRewards(player);
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
      `${EGG_TYPES[rarity]?.icon || "🥚"} **The ${rarity} Egg begins to shake...**`
    );

    await wait(1000);

    await hatchMessage.edit(
      `✨ **Cracks spread across the ${rarity} Egg...**\n` +
      `Something inside is trying to break free!`
    );

    await wait(1000);

    const artworkUrl = getPetArtworkUrl(definition);
    const hatchEmbed = new EmbedBuilder()
      .setTitle(`🥚 YOUR ${rarity.toUpperCase()} EGG HATCHED!`)
      .setDescription(
        `${getPetDisplayIcon(definition)} **${definition.name}** has joined your companions!\n\n` +
        `**Rarity:** ${definition.rarity}\n` +
        `**Habitat:** ${definition.habitat}\n` +
        `**Personality:** ${ownedPet.personality}\n` +
        `**Companion Level:** 1\n` +
        `✨ **Passive:** ${petPassiveTextForOwned(ownedPet)}\n\n` +
        `💰 **Hatch Reward:** +${hatchPoints} Hunter Points` +
        `${dexBonus ? `\n📖 **NEW PET DEX SPECIES:** +${dexBonus} Hunter Points` : ""}` +
        `${incubatorUnlockText}` +
        `${formatSecretUnlocks(petCollectionUnlocks)}\n\n` +
        `${player.equippedPetId === ownedPet.id
          ? "⭐ It has been equipped as your first companion!"
          : `Use \`!equippet ${player.pets.length}\` to equip it.`}`
      );

    if (artworkUrl) {
      hatchEmbed.setImage(artworkUrl);
    }

    return hatchMessage.edit({
      content: "",
      embeds: [hatchEmbed]
    });
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
        `${marker}${definition ? getPetDisplayIcon(definition) : "🐾"} **${definition?.name || owned.key}** — ` +
        `${definition?.rarity || "Unknown"} | Level ${info.level} | Bond ${getPetBondLevel(owned)} | ${owned.personality} ` +
        `✨ Passive: **${petPassiveTextForOwned(owned)}** ⭐ XP: **${xpText}**`
      );
    });

    const header = `🐾 **${formatPlayerName(player, message.author.username)}'s Pets**\n\n`;
    const footer =
      `\n\n⭐ = Equipped\n` +
      `Use \`!pet number\` for details or \`!equippet number\` to equip one.\n` +
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
    const ownedKeys = new Set(player.pets.map(pet => pet.key));
    const habitatNames = Object.keys(PET_COLLECTIONS);
    const habitatsPerPage = 2;
    const totalPages = Math.ceil(habitatNames.length / habitatsPerPage);
    const requestedPage = Number(content.slice("!petdex".length).trim() || "1");
    const page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(totalPages, requestedPage)) : 1;
    const pageHabitats = habitatNames.slice((page - 1) * habitatsPerPage, page * habitatsPerPage);

    const habitatSections = pageHabitats.map(habitat => {
      const habitatPets = pets.filter(pet => pet.habitat === habitat);
      const reward = PET_COLLECTIONS[habitat];
      const collected = habitatPets.filter(pet => ownedKeys.has(pet.key)).length;
      const entries = habitatPets.map(definition =>
        `${ownedKeys.has(definition.key) ? "✅" : "⬜"} ${getPetDisplayIcon(definition)} **${definition.name}** — ${definition.rarity}`
      ).join("\n");
      return `${reward.icon} **${habitat} Companions — ${collected}/${habitatPets.length}**\n${entries}`;
    }).join("\n\n");

    return message.reply(
      `📖 **${formatPlayerName(player, message.author.username)}'s Pet Dex**\n` +
      `Collected: **${ownedKeys.size}/${pets.length} companions** | Page **${page}/${totalPages}**\n\n` +
      `${habitatSections}\n\n` +
      `Use \`!petdex ${page < totalPages ? page + 1 : 1}\` to ${page < totalPages ? "view the next page" : "return to page 1"}.`
    );
  }

  if (command.startsWith("!pet ")) {
    const owned = resolveOwnedPet(player, content.slice(5));
    if (!owned) return message.reply("Pet not found. Use `!pets` to view your pet numbers.");
    const definition = getOwnedPetDefinition(owned);
    return message.reply(
      `${getPetDisplayIcon(definition)} **${definition.name}**

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
    return message.reply(`${getPetDisplayIcon(definition)} You equipped **${definition.name}**!\nPassive: **${petPassiveText(player)}**\nIts icon will now appear beside your name in Monster Hunt messages.`);
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
        "🌙 Daily rewards reset every day at 5:00 AM Mountain Time. Come back after 5:00 AM!"
      );
    }

    if (hasClaimedDailyRewardToday(player)) {
      return message.reply(
        "🎁 You already claimed today's reward! It resets at 5:00 AM Mountain Time."
      );
    }

    const reward = giveRandomDailyReward(player);

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
    const event = getActiveEvent();
    if (!event) return message.reply("📅 No special event is active today.");

    return message.reply(`🎉 **${event.name}**\n\n${event.description}`);
  }

  if (command === "!collection" || command === "!lifetimecollection") {
    const lifetime = player.lifetimeCaught || [];
    const season = player.caught || [];

    if (lifetime.length === 0 && season.length === 0) {
      return message.reply("You haven't collected any monsters yet!");
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
      `Use \`!pets\`, \`!pet number\`, and \`!equippet number\`.\n\n` +
      `⭐ **Companion Progression**\n` +
      `The equipped pet earns **10 Companion XP** after successful hunts. Affection Events can award **5 bonus XP**.\n` +
      `Pets can reach **Level 25**. Bond increases every five levels, up to Bond 5, strengthening the passive.\n\n` +
      `✨ **Pet Passives**\n` +
      `Passives can improve capture chance, egg discovery, shiny odds, points, item finds, or hunt cooldowns.\n\n` +
      `📖 **Pet Dex Collections**\n` +
      `Use \`!petdex\` to track all **32 companions**.\n` +
      `Collect all four pets from a habitat for a unique title. Collect all 32 for **Master Beast Tamer**.`
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
      `\`!achievements\` — Achievements\n\`!titles\` — View and equip titles\n\n` +
      `🥚 **Eggs & Pets**\n` +
      `\`!eggs\` — Eggs and incubators\n\`!incubate rarity\` or \`!incubate egg#\`\n` +
      `\`!hatch\` or \`!hatch slot#\`\n\`!pets\` — Companion list\n` +
      `\`!pet number\` — Pet details\n\`!equippet number\` — Equip pet\n\`!petdex\` — Pet collections\n\n` +
      `🌌 **Ultra Hunts**\n` +
      `\`!ultrahunt\` — Join active Ultra event\n\`!relics\` — View Relics\n` +
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
      // The permanent Monster Dex is the ONLY player progress preserved.
      const lifetimeCaught = Array.isArray(oldPlayerData.lifetimeCaught)
        ? oldPlayerData.lifetimeCaught.map(monster => ({ ...monster }))
        : [];

      if (lifetimeCaught.length > 0) {
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
        eggs: [],
        incubatingEggs: [],
        lastIncubatorSlots: 1,
        pets: [],
        equippedPetId: null,
        nextPetId: 1,
        titleProgress: {
          eggsFound: 0, eggsHatched: 0, ultraAttempts: 0,
          captureItemsUsed: 0, masterCharmUsed: 0, baitUsed: 0,
          failedCaptureStreak: 0, failedAtNinety: false,
          mixerWithoutCharm: false, ultraAtFiveOrLess: false
        },
        relics: Object.fromEntries(RELIC_KEYS.map(relicKey => [relicKey, 0]))
      };
    }

    // Reset all shared seasonal systems.
    data.pendingTrades = {};
    data.ultraRareState = null;
    data.worldProgress = Object.fromEntries(
      RELIC_KEYS.map(relicKey => [relicKey, false])
    );
    data.worldShatterUnlocked = false;
    data.ultraWeeklySchedule = null;
    data.ultraAdminPauseUntil = 0;
    data.seasonMoments = [];
    data.seasonMomentFlags = {};
    data.nextSeasonMomentId = 1;

    // Keep Dex-import records so the same old-bot export cannot be
    // accidentally imported over the permanent collection a second time.
    saveData(data);

    return message.reply(
      `🔄 **Monster Hunt season has been fully reset!**\n\n` +
      `✅ Preserved permanent Monster Dex collections for **${preservedPlayers} players**\n` +
      `✅ Preserved **${preservedCreatures} lifetime monster catches**\n\n` +
      `Reset: points, seasonal catches, hunt timers, quests, bait, capture items, ` +
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
      `\`!relics\` — View Ultra Relics\n\n` +
      `New players should begin with \`!monsterrules\` and \`!pethelp\`.`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
