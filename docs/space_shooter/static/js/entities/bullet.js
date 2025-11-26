import { Entity } from './entity.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT, GAME_SETTINGS, BULLET_STATS } from '../constants.js';

export class Bullet extends Entity {
    constructor(x, y, vx, vy, type, stats, isHoming = false, target = null) {
        super(x, y, stats.width, stats.height, null);
        this.vx = vx;
        this.vy = vy;
        this.type = type; // 'player' or 'enemy'
        this.damage = stats.damage;
        this.color = stats.color;
        this.isHoming = isHoming;
        this.target = target;
        this.timer = 0; // For exploding bullets
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        if (this.isHoming && this.target) {
            const dy = this.target.y - this.y;
            const dist = Math.sqrt((this.target.x - this.x) ** 2 + dy ** 2);

            if (dist > 0) {
                const n = Math.abs(this.vx); // Forward speed magnitude
                const turnRate = 0.1;

                if (dy > 10) {
                    this.vy += turnRate;
                } else if (dy < -10) {
                    this.vy -= turnRate;
                }

                // Clamp vy to [-n * ratio, n * ratio]
                const maxVy = n * GAME_SETTINGS.MODERATE_PROJECTILE_VERTICAL_RATIO;
                if (this.vy > maxVy) this.vy = maxVy;
                if (this.vy < -maxVy) this.vy = -maxVy;
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > SCREEN_WIDTH || this.y < 0 || this.y > SCREEN_HEIGHT) {
            this.markedForDeletion = true;
        }
    }
}

export class BombBullet extends Bullet {
    constructor(x, y, vx, vy, stats) {
        super(x, y, vx, vy, 'enemy', stats);
        this.explodeTime = stats.explodeTimeBase + Math.random() * stats.explodeTimeVar;
        this.fragmentStats = GAME_SETTINGS.BULLET_STATS ? GAME_SETTINGS.BULLET_STATS.FRAGMENT : stats.fragmentStats; // Fallback or pass explicitly
        this.fragmentCount = stats.fragmentCount;
        this.time = 0; // Renamed from timer to time for consistency with BouncingBullet
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    update(bullets) {
        this.x += this.vx;
        this.y += this.vy;
        this.time++;

        if (this.time >= this.explodeTime) {
            this.explode(bullets);
            this.markedForDeletion = true;
        }

        if (this.x < 0 || this.x > SCREEN_WIDTH || this.y < 0 || this.y > SCREEN_HEIGHT) {
            this.markedForDeletion = true;
        }
    }

    explode(bullets) {
        const angleStep = (Math.PI * 2) / this.fragmentCount;
        for (let i = 0; i < this.fragmentCount; i++) {
            const angle = i * angleStep;
            const vx = Math.cos(angle) * BULLET_STATS.FRAGMENT.speed;
            const vy = Math.sin(angle) * BULLET_STATS.FRAGMENT.speed;
            bullets.push(new Bullet(this.x, this.y, vx, vy, 'enemy', BULLET_STATS.FRAGMENT));
        }
    }
}

export class BouncingBullet extends BombBullet {
    constructor(x, y, vx, vy, stats) {
        super(x, y, vx, vy, stats);
        this.bounceCount = stats.bounceCount;
        this.bounces = 0;
        this.explodeTime = Infinity; // Don't explode on time, explode on bounce count
    }

    update(bullets) {
        this.x += this.vx;
        this.y += this.vy;
        this.time++;

        // Bounce Logic
        let bounced = false;
        if (this.x <= 0) {
            this.x = 0;
            this.vx = -this.vx;
            bounced = true;
        } else if (this.x + this.width >= SCREEN_WIDTH) {
            this.x = SCREEN_WIDTH - this.width;
            this.vx = -this.vx;
            bounced = true;
        }

        if (this.y <= 0) {
            this.y = 0;
            this.vy = -this.vy;
            bounced = true;
        } else if (this.y + this.height >= SCREEN_HEIGHT) {
            this.y = SCREEN_HEIGHT - this.height;
            this.vy = -this.vy;
            bounced = true;
        }

        if (bounced) {
            this.bounces++;
            if (this.bounces >= this.bounceCount) {
                this.explode(bullets);
                this.markedForDeletion = true;
            }
        }
    }
}
