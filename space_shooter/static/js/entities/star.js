import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants.js';

export class Star {
    constructor() {
        this.x = Math.random() * SCREEN_WIDTH;
        this.y = Math.random() * SCREEN_HEIGHT;
        this.size = Math.random() * 2 + 1;
        this.speed = Math.random() * 3 + 1;
    }
    update() {
        this.x -= this.speed;
        if (this.x < 0) {
            this.x = SCREEN_WIDTH;
            this.y = Math.random() * SCREEN_HEIGHT;
        }
    }
    draw(ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}
