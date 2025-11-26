import { Entity } from './entity.js';

export class Soul extends Entity {
    constructor(x, y, value = 1) {
        // Use logarithmic scaling to auto-scale for any value
        // log10(value) gives us: 1→0, 10→1, 100→2
        // Formula: 10 + 10 * log10(value)
        // Results: value=1→10px, value=5→16.99px, value=10→20px, value=100→30px
        const size = 10 + (10 * Math.log10(value));

        super(x, y, size, size, null);
        this.value = value;
    }

    draw(ctx) {
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        const radius = this.width / 2;
        ctx.arc(this.x + radius, this.y + radius, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    update() {
        this.x -= 1; // Moves slowly left
        if (this.x < 0) this.markedForDeletion = true;
    }
}
