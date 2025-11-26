import { Entity } from './entity.js';
import { Bullet, BombBullet, BouncingBullet } from './bullet.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT, GAME_SETTINGS, ALIEN_STATS, BULLET_STATS } from '../constants.js';

export class Alien extends Entity {
    constructor(x, y, type, assets, difficulty = 'NORMAL') {
        let w, h, img, hp;
        if (type === 'basic') {
            w = ALIEN_STATS.BASIC.width;
            h = ALIEN_STATS.BASIC.height;
            img = assets.alienBasic;
            hp = ALIEN_STATS.BASIC.hp;
        } else if (type === 'moderate') {
            w = ALIEN_STATS.MODERATE.width;
            h = ALIEN_STATS.MODERATE.height;
            img = assets.alienModerate;
            hp = ALIEN_STATS.MODERATE.hp;
        } else if (type === 'strong') {
            w = ALIEN_STATS.STRONG.width;
            h = ALIEN_STATS.STRONG.height;
            img = assets.alienStrong;
            hp = ALIEN_STATS.STRONG.hp;
        } else if (type === 'boss_one') {
            w = ALIEN_STATS.BOSS_ONE.width;
            h = ALIEN_STATS.BOSS_ONE.height;
            img = assets.alienBossOne; // Ensure this is loaded in game.js
            hp = ALIEN_STATS.BOSS_ONE.hp;
        }

        super(x, y, w, h, img);
        this.type = type;
        this.hp = hp;
        this.soulValue = ALIEN_STATS[type.toUpperCase()].soulValue;
        this.initialY = y;
        this.time = 0;
        this.movingLeft = true;

        // Fire Rate Logic
        const stats = ALIEN_STATS[type.toUpperCase()];
        const diffSettings = GAME_SETTINGS.DIFFICULTY[difficulty];
        // Lower multiplier = faster fire rate (smaller interval)
        // Wait, logic in constants says: 0.5x multiplier for EASY (2x interval), 1.5x for HARD (0.66x interval)
        // So we should DIVIDE base interval by multiplier?
        // EASY: 0.5 multiplier -> Interval / 0.5 = 2x Interval (Slower fire) - CORRECT
        // HARD: 1.5 multiplier -> Interval / 1.5 = 0.66x Interval (Faster fire) - CORRECT

        this.fireIntervalBase = stats.fireInterval / diffSettings.FIRE_RATE_MULTIPLIER;
        this.fireVariance = stats.fireIntervalVariance / diffSettings.FIRE_RATE_MULTIPLIER;
        this.nextFireTime = this.getRandomFireInterval(); // Initial delay

        if (type === 'boss_one') {
            this.nextBounceFireTime = stats.bounceBulletInterval;
        }
    }

    getRandomFireInterval() {
        // Returns a random interval based on base + variance
        const variance = (Math.random() * this.fireVariance * 2) - this.fireVariance;
        return this.fireIntervalBase + variance;
    }

    update(bullets, ship) {
        if (this.movingLeft) {
            this.x -= GAME_SETTINGS.SCROLL_SPEED;
            if (this.x < SCREEN_WIDTH / 2) {
                this.movingLeft = false;
            }
        } else {
            this.x += GAME_SETTINGS.SCROLL_SPEED;
            if (this.x > SCREEN_WIDTH - this.width) {
                this.movingLeft = true;
            }
        }
        this.time++;

        // Movement patterns
        if (this.type === 'basic') {
            // Full screen vertical movement
            this.y = (SCREEN_HEIGHT / 2 - this.height / 2) + Math.sin(this.time * ALIEN_STATS.BASIC.moveFreq) * (SCREEN_HEIGHT / 2 - ALIEN_STATS.BASIC.moveAmp);
            if (this.time >= this.nextFireTime) {
                bullets.push(new Bullet(this.x, this.y + this.height / 2, ALIEN_STATS.BASIC.bulletSpeed, 0, 'enemy', BULLET_STATS.ENEMY_BASIC));
                this.nextFireTime = this.time + this.getRandomFireInterval();
            }
        } else if (this.type === 'moderate') {
            this.y = this.initialY + Math.cos(this.time * ALIEN_STATS.MODERATE.moveFreq) * ALIEN_STATS.MODERATE.moveAmp;
            if (this.time >= this.nextFireTime) {
                bullets.push(new Bullet(this.x, this.y + this.height / 2, ALIEN_STATS.MODERATE.bulletSpeed, 0, 'enemy', BULLET_STATS.ENEMY_MODERATE, true, ship));
                this.nextFireTime = this.time + this.getRandomFireInterval();
            }
        } else if (this.type === 'strong') {
            if (this.time >= this.nextFireTime) {
                bullets.push(new BombBullet(this.x, this.y + this.height / 2, ALIEN_STATS.STRONG.bulletSpeed, 0, BULLET_STATS.ENEMY_STRONG));
                this.nextFireTime = this.time + this.getRandomFireInterval();
            }
        } else if (this.type === 'boss_one') {
            // Boss Movement: Hover on right side, move up and down
            // Target Y is ship Y, but with lag/smoothing? Or just sine wave?
            // Let's do sine wave for now, maybe slower
            this.y = (SCREEN_HEIGHT / 2 - this.height / 2) + Math.sin(this.time * 0.01) * (SCREEN_HEIGHT / 3);

            // Limit X movement to stay on screen
            if (this.x < SCREEN_WIDTH - this.width - 50) {
                this.x = SCREEN_WIDTH - this.width - 50;
            }

            // Fire Seeking Bullets (Top)
            if (this.time >= this.nextFireTime) {
                // Fire from top weapon port (approx 1/4 down?)
                // Actually, let's fire from center for now, or multiple ports?
                // "originate from the top of the asset"
                const fireY = this.y + (this.height * 0.2);
                bullets.push(new Bullet(this.x, fireY, ALIEN_STATS.BOSS_ONE.bulletSpeed, 0, 'enemy', BULLET_STATS.ENEMY_MODERATE, true, ship));
                this.nextFireTime = this.time + this.getRandomFireInterval();
            }

            // Fire Bouncing Bullets (Bottom)
            if (this.time >= this.nextBounceFireTime) {
                // "originate from the bottom of the ship"
                const fireY = this.y + (this.height * 0.8);
                // "random angle between 180 and 270 degrees" (PI to 1.5 PI)
                const angle = Math.PI + Math.random() * (Math.PI / 2);
                const speed = ALIEN_STATS.BOSS_ONE.bounceBulletSpeed;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;

                // Need to import BouncingBullet
                // We need to ensure BouncingBullet is available. It is exported from bullet.js
                // But we only imported Bullet and BombBullet. Need to update imports.
                bullets.push(new BouncingBullet(this.x, fireY, vx, vy, BULLET_STATS.BOSS_BOUNCE));

                this.nextBounceFireTime = this.time + ALIEN_STATS.BOSS_ONE.bounceBulletInterval;
            }
        }

        if (this.x + this.width < 0) this.markedForDeletion = true;
    }
}
