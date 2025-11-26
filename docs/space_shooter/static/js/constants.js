export const SCREEN_WIDTH = 1200;
export const SCREEN_HEIGHT = 900;

export const GAME_SETTINGS = {
    SHIP_SPEED: 5,
    SCROLL_SPEED: 1,
    MODERATE_PROJECTILE_VERTICAL_RATIO: 0.2,
    STAR_COUNT: 50,
    SHIELD: {
        MAX_CHARGES: 5,
        REGEN_TIME: 600, // 10 seconds at 60fps
        FIRE_RATE_MODIFIER: 0.25
    },
    DIFFICULTY: {
        EASY: {
            SHIP_HP: 25,
            SHIP_SHIELD: 10,
            FIRE_RATE_MULTIPLIER: 0.5 // 2x interval
        },
        NORMAL: {
            SHIP_HP: 10,
            SHIP_SHIELD: 5,
            FIRE_RATE_MULTIPLIER: 1.0
        },
        HARD: {
            SHIP_HP: 10,
            SHIP_SHIELD: 5,
            FIRE_RATE_MULTIPLIER: 1.5 // 0.66x interval
        }
    }
};

export const SHIP_STATS = {
    WIDTH: 80,
    HEIGHT: 40,
    HP: 10,
    COOLDOWN: 20,
    BULLET_SPEED: 5,
    X: 50,
    Y_OFFSET: 20
};

export const ASSETS = {
    SHIP: '/static/assets/ship.png',
    ALIEN_BASIC: '/static/assets/alien_basic.png',
    ALIEN_MODERATE: '/static/assets/alien_moderate.png',
    ALIEN_MODERATE: '/static/assets/alien_moderate.png',
    ALIEN_STRONG: '/static/assets/alien_strong.png',
    ALIEN_BOSS_ONE: '/static/assets/alien_boss_one.png'
};

export const ALIEN_STATS = {
    BASIC: {
        width: 50, height: 32, hp: 1, score: 10, soulValue: 1,
        fireInterval: 240, fireIntervalVariance: 60, bulletSpeed: -2,
        moveAmp: 50, moveFreq: 0.01
    },
    MODERATE: {
        width: 145, height: 80, hp: 5, score: 50, soulValue: 5,
        fireInterval: 180, fireIntervalVariance: 40, bulletSpeed: -3,
        moveAmp: 100, moveFreq: 0.02
    },
    STRONG: {
        width: 300, height: 160, hp: 80, score: 100, soulValue: 10,
        fireInterval: 150, fireIntervalVariance: 30, bulletSpeed: -1.5
    },
    BOSS_ONE: {
        width: 500, height: 300, hp: 200, score: 1000, soulValue: 100,
        fireInterval: 60, fireIntervalVariance: 10, bulletSpeed: -4, // Fast seeking bullets
        bounceBulletSpeed: 2, // Positive because it's speed magnitude, direction is random
        bounceBulletInterval: 360
    }
};

export const BULLET_STATS = {
    PLAYER: { speed: 5, damage: 1, width: 8, height: 4, color: '#0ff' },
    ENEMY_BASIC: { speed: -2, damage: 1, width: 8, height: 4, color: '#f00' },
    ENEMY_MODERATE: { speed: -3, damage: 1, width: 8, height: 4, color: '#f00', turnRate: 0.1 },
    ENEMY_STRONG: { speed: -1.5, damage: 1, width: 16, height: 16, color: '#ff00ff', explodeTimeBase: 60, explodeTimeVar: 40, fragmentCount: 12 },
    BOSS_BOUNCE: { speed: 2, damage: 2, width: 40, height: 20, color: '#ffff00', bounceCount: 4, explodeTimeBase: 0, explodeTimeVar: 0, fragmentCount: 20 },
    FRAGMENT: { speed: 1.5, damage: 1, width: 8, height: 4, color: '#f00' }
};

export const LEVELS = [
    [ // Level 1
        { count: 10, type: 'basic', interval: 60 },
        { count: 15, type: 'basic', interval: 50 },
        { count: 3, type: 'moderate', interval: 120 },
        { count: 5, type: 'moderate', interval: 100, sub: { count: 10, type: 'basic', interval: 60 } },
        { count: 1, type: 'strong', interval: 1 },
        { count: 20, type: 'basic', interval: 30 },
        { count: 2, type: 'strong', interval: 300 },
        { count: 8, type: 'moderate', interval: 80 },
        { count: 1, type: 'strong', interval: 1, sub: { count: 4, type: 'moderate', interval: 100 } },
        { count: 2, type: 'strong', interval: 300, sub: [{ count: 6, type: 'basic', interval: 50 }, { count: 2, type: 'moderate', interval: 100 }] },
    ],
    [ //Boss 1
        { count: 1, type: 'boss_one', interval: 1 } // Wave 11: Boss
    ],
    [ // Level 2 (Harder)
        { count: 20, type: 'basic', interval: 40 },
        { count: 5, type: 'moderate', interval: 100 },
        { count: 2, type: 'strong', interval: 300 },
        { count: 10, type: 'moderate', interval: 80, sub: { count: 20, type: 'basic', interval: 40 } },
        { count: 3, type: 'strong', interval: 250 },
        { count: 30, type: 'basic', interval: 20 },
        { count: 5, type: 'strong', interval: 200, sub: { count: 10, type: 'moderate', interval: 80 } }
    ],
    [ //Boss 2
        { count: 1, type: 'boss_one', interval: 1, sub: { count: 4, type: 'strong', interval: 400 } },
    ],
    [ // Level 3 (Insane)
        { count: 50, type: 'basic', interval: 10 },
        { count: 10, type: 'moderate', interval: 60 },
        { count: 5, type: 'strong', interval: 150 },
        { count: 20, type: 'moderate', interval: 50, sub: { count: 50, type: 'basic', interval: 20 } },
        { count: 6, type: 'strong', interval: 100, sub: { count: 20, type: 'moderate', interval: 60 } },
    ],
    [ //Boss 3
        { count: 1, type: 'boss_one', interval: 10000, sub: [{ count: 1, type: 'boss_one', interval: 12500 }, { count: 30, type: 'basic', interval: 80 }, { count: 20, type: 'moderate', interval: 800 }, { count: 10, type: 'moderate', interval: 500 }, { count: 3, type: 'strong', interval: 3000 }] }
    ]
];

export const UPGRADES = {
    HEAL: { cost: 5, value: 1 },
    MAX_HP: { cost: 15, value: 1 },
    SHIELD_REGEN: { cost: 20, value: 60, max: 9 }, // -1 second (60 frames), max 9 (1s min)
    SHIELD_FIRE_RATE: { cost: 20, value: 0.05, max: 15 }, // +5%, max 15 (+75%)
    LASER_SIZE: { cost: 10, value: 1.2, max: 10 }, // +20%, max 10
    CANNON_DAMAGE: { costs: [200, 400], value: 1, max: 2 } // +1 damage, variable pricing
};


