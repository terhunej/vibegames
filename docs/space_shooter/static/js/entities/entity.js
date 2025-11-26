import { pixelPerfectCollision } from '../collisionUtils.js';

export class Entity {
    constructor(x, y, width, height, img) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.img = img;
        this.markedForDeletion = false;
    }

    draw(ctx) {
        if (this.img) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update() { }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    isColliding(other) {
        // Use pixel-perfect collision detection
        return pixelPerfectCollision(this, other);
    }
}
