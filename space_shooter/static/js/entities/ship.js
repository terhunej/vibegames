import { Entity } from './entity.js';
import { Bullet } from './bullet.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT, GAME_SETTINGS, ASSETS, SHIP_STATS, BULLET_STATS } from '../constants.js';

export class Ship extends Entity {
    constructor(assets) {
        super(SHIP_STATS.X, SCREEN_HEIGHT / 2 - SHIP_STATS.Y_OFFSET, SHIP_STATS.WIDTH, SHIP_STATS.HEIGHT, assets.ship);
        this.maxHp = SHIP_STATS.HP;
        this.hp = this.maxHp;
        this.cooldown = 0;

        // Shield properties
        this.shieldActive = false;
        this.shieldCharges = GAME_SETTINGS.SHIELD.MAX_CHARGES;
        this.shieldRegenTimer = 0;

        // Upgradeable Stats
        this.shieldRegenTime = GAME_SETTINGS.SHIELD.REGEN_TIME;
        this.shieldFireRateModifier = GAME_SETTINGS.SHIELD.FIRE_RATE_MODIFIER;
        this.laserSizeMultiplier = 1.0;
        this.cannonDamage = 1; // Base damage
    }

    upgrade(type, value) {
        if (type === 'HEAL') {
            this.hp = Math.min(this.hp + value, this.maxHp);
        } else if (type === 'MAX_HP') {
            this.maxHp += value;
            this.hp += value; // Heal the added amount
        } else if (type === 'SHIELD_REGEN') {
            this.shieldRegenTime = Math.max(60, this.shieldRegenTime - value); // Min 1 second
        } else if (type === 'SHIELD_FIRE_RATE') {
            this.shieldFireRateModifier += value;
        } else if (type === 'LASER_SIZE') {
            this.laserSizeMultiplier *= value;
        } else if (type === 'CANNON_DAMAGE') {
            this.cannonDamage += value;
        }
    }

    update(keys, bullets) {
        // Shield Logic
        if (keys.Shift && this.shieldCharges > 0) {
            this.shieldActive = true;
        } else {
            this.shieldActive = false;
        }

        // Shield Regen
        if (!this.shieldActive && this.shieldCharges < GAME_SETTINGS.SHIELD.MAX_CHARGES) {
            this.shieldRegenTimer++;
            if (this.shieldRegenTimer >= this.shieldRegenTime) {
                this.shieldCharges++;
                this.shieldRegenTimer = 0;
            }
        } else {
            this.shieldRegenTimer = 0;
        }

        if (keys.ArrowUp && this.y > 0) this.y -= GAME_SETTINGS.SHIP_SPEED;
        if (keys.ArrowDown && this.y < SCREEN_HEIGHT - this.height) this.y += GAME_SETTINGS.SHIP_SPEED;
        if (keys.ArrowLeft && this.x > 0) this.x -= GAME_SETTINGS.SHIP_SPEED;
        if (keys.ArrowRight && this.x < (SCREEN_WIDTH / 2) - this.width) this.x += GAME_SETTINGS.SHIP_SPEED; // Restricted to left half

        if (keys.Space && this.cooldown <= 0) {
            this.shoot(bullets);
            // Fire rate penalty: 0.25x speed means 4x cooldown
            const baseCooldown = SHIP_STATS.COOLDOWN;
            this.cooldown = this.shieldActive ? baseCooldown / this.shieldFireRateModifier : baseCooldown;
        }
        if (this.cooldown > 0) this.cooldown--;
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.shieldActive) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${this.shieldCharges / GAME_SETTINGS.SHIELD.MAX_CHARGES})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 1.2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    shoot(bullets) {
        const bulletStats = { ...BULLET_STATS.PLAYER };
        bulletStats.width *= this.laserSizeMultiplier;
        bulletStats.height *= this.laserSizeMultiplier;
        bulletStats.damage = this.cannonDamage; // Use upgraded damage
        // Center bullet vertically relative to ship
        // Ship center Y = this.y + this.height / 2
        // Bullet center Y = bulletY + bulletHeight / 2
        // So bulletY = (this.y + this.height / 2) - (bulletStats.height / 2)
        const bulletY = (this.y + this.height / 2) - (bulletStats.height / 2);
        bullets.push(new Bullet(this.x + this.width, bulletY, SHIP_STATS.BULLET_SPEED, 0, 'player', bulletStats));
    }
}
