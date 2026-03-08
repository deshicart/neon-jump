/**
 * levels.js  –  Level configuration for Neon Jump.
 *
 * LevelConfig is an array ordered by scoreThreshold (ascending).
 * Each entry describes difficulty parameters for that score band.
 */
window.LevelConfig = [
  {
    index: 0,
    name: 'NEON CITY',
    scoreThreshold: 0,
    platformSpeed: 80,      // px/s for moving platforms
    platformGap: 125,       // vertical distance between platforms
    platformWidth: 95,      // base platform width
    enemyCount: 0,          // max simultaneous enemies
    bgColor: 0x0a0a0f,
    neonColor: 0x00ffff,
    accentColor: 0x004466,
    platformTypes: {
      normal:    0.72,
      moving:    0.16,
      crumbling: 0.06,
      spring:    0.04,
      coin:      0.02
    }
  },
  {
    index: 1,
    name: 'GRID ZONE',
    scoreThreshold: 600,
    platformSpeed: 100,
    platformGap: 138,
    platformWidth: 88,
    enemyCount: 1,
    bgColor: 0x08080f,
    neonColor: 0xff00ff,
    accentColor: 0x440044,
    platformTypes: {
      normal:    0.55,
      moving:    0.22,
      crumbling: 0.10,
      spring:    0.06,
      coin:      0.07
    }
  },
  {
    index: 2,
    name: 'PLASMA STORM',
    scoreThreshold: 1600,
    platformSpeed: 130,
    platformGap: 152,
    platformWidth: 82,
    enemyCount: 2,
    bgColor: 0x060f08,
    neonColor: 0x00ff88,
    accentColor: 0x003322,
    platformTypes: {
      normal:    0.43,
      moving:    0.28,
      crumbling: 0.13,
      spring:    0.07,
      coin:      0.09
    }
  },
  {
    index: 3,
    name: 'VOID RIFT',
    scoreThreshold: 3200,
    platformSpeed: 160,
    platformGap: 165,
    platformWidth: 76,
    enemyCount: 3,
    bgColor: 0x0f080f,
    neonColor: 0xff8800,
    accentColor: 0x442200,
    platformTypes: {
      normal:    0.33,
      moving:    0.35,
      crumbling: 0.16,
      spring:    0.07,
      coin:      0.09
    }
  },
  {
    index: 4,
    name: 'HYPER CORE',
    scoreThreshold: 5500,
    platformSpeed: 200,
    platformGap: 178,
    platformWidth: 70,
    enemyCount: 4,
    bgColor: 0x0f0808,
    neonColor: 0xff0066,
    accentColor: 0x440022,
    platformTypes: {
      normal:    0.24,
      moving:    0.38,
      crumbling: 0.18,
      spring:    0.08,
      coin:      0.12
    }
  },
  {
    index: 5,
    name: 'SINGULARITY',
    scoreThreshold: 9000,
    platformSpeed: 255,
    platformGap: 192,
    platformWidth: 64,
    enemyCount: 5,
    bgColor: 0x050510,
    neonColor: 0xffff00,
    accentColor: 0x333300,
    platformTypes: {
      normal:    0.18,
      moving:    0.40,
      crumbling: 0.20,
      spring:    0.09,
      coin:      0.13
    }
  }
];

/**
 * Returns the LevelConfig entry appropriate for the given score.
 * @param {number} score
 * @returns {object} level config
 */
window.getCurrentLevel = function (score) {
  const cfg = window.LevelConfig;
  for (let i = cfg.length - 1; i >= 0; i--) {
    if (score >= cfg[i].scoreThreshold) return cfg[i];
  }
  return cfg[0];
};

/**
 * Returns the index (0-based) of the level for the given score.
 */
window.getCurrentLevelIndex = function (score) {
  return window.getCurrentLevel(score).index;
};
