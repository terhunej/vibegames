import { Ship } from './entities/ship.js';
import { Alien } from './entities/alien.js';
import { Bullet } from './entities/bullet.js';
import { Soul } from './entities/soul.js';
import { Star } from './entities/star.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT, ASSETS, LEVELS, UPGRADES, GAME_SETTINGS } from './constants.js';

const canvas = document.getElementById('gameCanvas');
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;
const ctx = canvas.getContext('2d');

// Assets
const assets = {
    ship: new Image(),
    alienBasic: new Image(),
    alienModerate: new Image(),
    alienStrong: new Image(),
    alienBossOne: new Image()
};

assets.ship.src = ASSETS.SHIP;
assets.alienBasic.src = ASSETS.ALIEN_BASIC;
assets.alienModerate.src = ASSETS.ALIEN_MODERATE;
assets.alienStrong.src = ASSETS.ALIEN_STRONG;
assets.alienBossOne.src = ASSETS.ALIEN_BOSS_ONE;

// Game State
let game = {
    active: false,
    over: false,
    victory: false,
    score: 0,
    level: 1,
    wave: 1,
    frame: 0,
    difficulty: 'NORMAL',
    upgrades: {
        SHIELD_REGEN: 0,
        SHIELD_FIRE_RATE: 0,
        LASER_SIZE: 0
    }
};

// Input
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    Shift: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') keys.Space = true;
    if (e.key === 'Shift') keys.Shift = true;
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') keys.Space = false;
    if (e.key === 'Shift') keys.Shift = false;
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// Global Lists
let ship;
let aliens = [];
let bullets = [];
let souls = [];
let stars = [];

function init() {
    ship = new Ship(assets);
    aliens = [];
    bullets = [];
    souls = [];
    stars = [];
    for (let i = 0; i < GAME_SETTINGS.STAR_COUNT; i++) stars.push(new Star());

    game.active = true;
    game.over = false;
    game.victory = false;
    game.score = 0;
    game.level = 1;
    game.wave = 1;
    game.frame = 0;

    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('shop-screen').classList.add('hidden');
    // loop(); // Don't start loop yet
}

function startGame(difficulty) {
    game.difficulty = difficulty;
    const settings = GAME_SETTINGS.DIFFICULTY[difficulty];

    // Apply difficulty settings
    ship.maxHp = settings.SHIP_HP;
    ship.hp = ship.maxHp;
    ship.shieldCharges = settings.SHIP_SHIELD;
    // Note: Alien fire rate is handled in Alien class using game.difficulty or passing multiplier

    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('ui-layer').classList.remove('hidden');
    updateUI();
    game.active = true;
    startWave();
    loop();
}

// Title Screen Listeners
document.getElementById('btn-easy').onclick = () => startGame('EASY');
document.getElementById('btn-normal').onclick = () => startGame('NORMAL');
document.getElementById('btn-hard').onclick = () => startGame('HARD');

// Shop Logic
function showShop() {
    game.active = false;

    // Clear all bullets when shop opens
    bullets.length = 0;

    document.getElementById('shop-screen').classList.remove('hidden');
    updateShopUI();
}

function hideShop() {
    document.getElementById('shop-screen').classList.add('hidden');
    game.active = true;
    loop();
}

function updateShopUI() {
    document.getElementById('shop-souls').innerText = `Souls: ${game.score}`;
    document.getElementById('shop-hp').innerText = `HP: ${ship.hp}/${ship.maxHp}`;

    const updateBtn = (id, upgradeKey, name) => {
        const btn = document.getElementById(id);
        const upgrade = UPGRADES[upgradeKey];
        const currentCount = game.upgrades[upgradeKey] || 0;
        const maxCount = upgrade.max || Infinity;

        let label = `${name} (${upgrade.cost} Souls)`;
        if (maxCount !== Infinity) {
            label += ` [${currentCount}/${maxCount}]`;
        }

        btn.innerText = label;
        const canAfford = game.score >= upgrade.cost;
        const notMaxed = currentCount < maxCount;

        btn.disabled = !canAfford || !notMaxed;
        btn.style.opacity = (!canAfford || !notMaxed) ? 0.5 : 1;
    };

    // Special handling for heal button - disable if at max HP
    const healBtn = document.getElementById('btn-heal');
    const healUpgrade = UPGRADES['HEAL'];
    healBtn.innerText = `Heal 1 HP (${healUpgrade.cost} Soul)`;
    healBtn.disabled = game.score < healUpgrade.cost || ship.hp >= ship.maxHp;
    healBtn.style.opacity = (game.score < healUpgrade.cost || ship.hp >= ship.maxHp) ? 0.5 : 1;

    updateBtn('btn-max-hp', 'MAX_HP', 'Max HP +1');
    updateBtn('btn-shield-regen', 'SHIELD_REGEN', 'Shield Regen -1s');
    updateBtn('btn-shield-fire', 'SHIELD_FIRE_RATE', 'Shield Fire Rate +5%');
    updateBtn('btn-laser-size', 'LASER_SIZE', 'Laser Size +20%');

    // Special handling for cannon damage with variable pricing
    const cannonBtn = document.getElementById('btn-cannon-damage');
    const cannonUpgrade = UPGRADES['CANNON_DAMAGE'];
    const cannonCount = game.upgrades['CANNON_DAMAGE'] || 0;
    const cannonCost = cannonUpgrade.costs[cannonCount] || cannonUpgrade.costs[cannonUpgrade.costs.length - 1];
    const cannonMaxed = cannonCount >= cannonUpgrade.max;
    cannonBtn.innerText = `Cannon Damage +1 (${cannonCost} Souls) [${cannonCount}/${cannonUpgrade.max}]`;
    cannonBtn.disabled = game.score < cannonCost || cannonMaxed;
    cannonBtn.style.opacity = (game.score < cannonCost || cannonMaxed) ? 0.5 : 1;
}

function buyUpgrade(type) {
    const upgrade = UPGRADES[type];
    const currentCount = game.upgrades[type] || 0;
    const maxCount = upgrade.max || Infinity;

    // Get cost - handle variable pricing for CANNON_DAMAGE
    let cost = upgrade.cost;
    if (type === 'CANNON_DAMAGE' && upgrade.costs) {
        cost = upgrade.costs[currentCount] || upgrade.costs[upgrade.costs.length - 1];
    }

    if (game.score >= cost && currentCount < maxCount) {
        game.score -= cost;
        ship.upgrade(type, upgrade.value);

        // Track upgrade counts
        if (game.upgrades.hasOwnProperty(type)) {
            game.upgrades[type]++;
        } else {
            game.upgrades[type] = 1;
        }

        updateUI();
        updateShopUI();
    }
}

// Event Listeners for Shop
document.getElementById('btn-heal').onclick = () => buyUpgrade('HEAL');
document.getElementById('btn-max-hp').onclick = () => buyUpgrade('MAX_HP');
document.getElementById('btn-shield-regen').onclick = () => buyUpgrade('SHIELD_REGEN');
document.getElementById('btn-shield-fire').onclick = () => buyUpgrade('SHIELD_FIRE_RATE');
document.getElementById('btn-laser-size').onclick = () => buyUpgrade('LASER_SIZE');
document.getElementById('btn-cannon-damage').onclick = () => buyUpgrade('CANNON_DAMAGE');
document.getElementById('btn-next-level').onclick = () => {
    startNextLevel();
};

function startNextLevel() {
    // Hide shop first
    document.getElementById('shop-screen').classList.add('hidden');

    currentLevelIndex++;
    if (currentLevelIndex >= LEVELS.length) {
        victory();
        return;
    }

    currentWaveIndex = 0;
    game.level = currentLevelIndex + 1;
    game.wave = 1;

    // Show transition and keep game paused
    game.active = false;
    const transitionScreen = document.getElementById('level-transition-screen');
    document.getElementById('level-title').innerText = `Level ${game.level}`;
    transitionScreen.classList.remove('hidden');

    setTimeout(() => {
        transitionScreen.classList.add('hidden');
        startWave();
        game.active = true;
        loop();
    }, 2000);
}

// Wave Logic
let currentLevelIndex = 0;
let currentWaveIndex = 0;
let enemiesToSpawn = 0;
let spawnTimer = 0;
let subWaveTrackers = [];
let waitingForClear = false;

function manageWaves() {
    const currentLevelWaves = LEVELS[currentLevelIndex];
    if (currentWaveIndex >= currentLevelWaves.length) {
        // Level Complete - wait only for souls to clear (bullets auto-cleared on shop open)
        if (aliens.length === 0 && souls.length === 0) {
            // Check if this is the final level
            if (currentLevelIndex >= LEVELS.length - 1) {
                // Final level complete - go directly to victory
                victory();
            } else {
                // Not final level - show shop
                showShop();
            }
        }
        return;
    }

    if (waitingForClear) {
        if (aliens.length === 0) {
            waitingForClear = false;
            currentWaveIndex++;
            game.wave = currentWaveIndex + 1;
            updateUI();
            startWave();
        }
        return;
    }

    const wave = currentLevelWaves[currentWaveIndex];

    if (enemiesToSpawn > 0) {
        spawnTimer++;
        if (spawnTimer >= wave.interval) {
            spawnTimer = 0;
            aliens.push(new Alien(SCREEN_WIDTH, Math.random() * (SCREEN_HEIGHT - 100) + 50, wave.type, assets, game.difficulty));
            enemiesToSpawn--;
        }
    }

    if (subWaveTrackers.length > 0) {
        subWaveTrackers.forEach(tracker => {
            if (tracker.count > 0) {
                tracker.timer++;
                if (tracker.timer >= tracker.config.interval) {
                    tracker.timer = 0;
                    aliens.push(new Alien(SCREEN_WIDTH, Math.random() * (SCREEN_HEIGHT - 100) + 50, tracker.config.type, assets, game.difficulty));
                    tracker.count--;
                }
            }
        });
    }

    const allSubWavesDone = subWaveTrackers.every(t => t.count === 0);
    if (enemiesToSpawn === 0 && allSubWavesDone) {
        waitingForClear = true;
    }
}

function startWave() {
    const currentLevelWaves = LEVELS[currentLevelIndex];
    if (currentWaveIndex >= currentLevelWaves.length) return;
    const wave = currentLevelWaves[currentWaveIndex];
    enemiesToSpawn = wave.count;
    spawnTimer = 0;

    subWaveTrackers = [];
    if (wave.sub) {
        const subs = Array.isArray(wave.sub) ? wave.sub : [wave.sub];
        subWaveTrackers = subs.map(subConfig => ({
            count: subConfig.count,
            timer: 0,
            config: subConfig
        }));
    }
}

function updateUI() {
    document.getElementById('score').innerText = `Souls: ${game.score}`;
    document.getElementById('health').innerText = `HP: ${ship.hp}`;
    document.getElementById('shield').innerText = `Shield: ${ship.shieldCharges}`;
    document.getElementById('wave').innerText = `Level: ${game.level} - Wave: ${game.wave}`;
}

function gameOver() {
    game.active = false;
    game.over = true;
    document.getElementById('final-score').innerText = `Souls Collected: ${game.score}`;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function victory() {
    game.active = false;
    game.victory = true;
    document.getElementById('victory-score').innerText = `Souls Collected: ${game.score}`;
    document.getElementById('victory-screen').classList.remove('hidden');
}

function loop() {
    if (!game.active) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Update & Draw Stars
    stars.forEach(star => {
        star.update();
        star.draw(ctx);
    });

    // Update & Draw Ship
    ship.update(keys, bullets);
    ship.draw(ctx);

    // Wave Management
    manageWaves();

    // Update & Draw Aliens
    aliens.forEach(alien => {
        alien.update(bullets, ship);
        alien.draw(ctx);
        if (ship.isColliding(alien)) {
            if (ship.shieldActive) {
                ship.shieldCharges--;
                if (ship.shieldCharges <= 0) ship.shieldActive = false;
            } else {
                ship.hp -= 1; // Collision damage
            }
            alien.markedForDeletion = true;
            updateUI();
            if (ship.hp <= 0) gameOver();
        }
    });

    // Update & Draw Bullets
    bullets.forEach(bullet => {
        bullet.update(bullets); // Pass bullets array for BombBullet fragmentation
        bullet.draw(ctx);

        if (bullet.type === 'player') {
            aliens.forEach(alien => {
                if (bullet.isColliding(alien)) {
                    alien.hp -= bullet.damage;
                    bullet.markedForDeletion = true;
                    if (alien.hp <= 0) {
                        alien.markedForDeletion = true;
                        souls.push(new Soul(alien.x, alien.y, alien.soulValue));
                    }
                }
            });
        } else {
            if (bullet.isColliding(ship)) {
                if (ship.shieldActive) {
                    ship.shieldCharges--;
                    if (ship.shieldCharges <= 0) ship.shieldActive = false;
                } else {
                    ship.hp -= bullet.damage;
                }
                bullet.markedForDeletion = true;
                updateUI();
                if (ship.hp <= 0) gameOver();
            }
        }
    });

    // Update & Draw Souls
    souls.forEach(soul => {
        soul.update();
        soul.draw(ctx);
        if (ship.isColliding(soul)) {
            game.score += soul.value;
            soul.markedForDeletion = true;
            updateUI();
        }
    });

    // Cleanup
    aliens = aliens.filter(a => !a.markedForDeletion);
    bullets = bullets.filter(b => !b.markedForDeletion);
    souls = souls.filter(s => !s.markedForDeletion);

    requestAnimationFrame(loop);
}

// Start
init();
