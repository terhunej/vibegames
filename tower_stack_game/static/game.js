const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const gameOverModal = document.getElementById('game-over-modal');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const INITIAL_BLOCK_SIZE = 200;
const BLOCK_HEIGHT = 30;
const SCROLL_SPEED_BASE = 1;
const SCROLL_SPEED_INCREMENT = 0.25;

// Game State
let stack = [];
let currentBlock = null;
let score = 0;
let gameRunning = false;
let scrollSpeed = SCROLL_SPEED_BASE;
let hue = 0;

class Block {
    constructor(x, y, width, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = BLOCK_HEIGHT;
        this.color = color;
        this.direction = 1; // 1 for right, -1 for left
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Add a subtle highlight for 3D effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x, this.y, this.width, 4);

        // Add a subtle shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(this.x, this.y + this.height - 4, this.width, 4);
    }

    update() {
        this.x += this.direction * scrollSpeed;

        // Bounce off walls
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
            this.direction = -1;
        } else if (this.x < 0) {
            this.x = 0;
            this.direction = 1;
        }
    }
}

function initGame() {
    stack = [];
    score = 0;
    scrollSpeed = SCROLL_SPEED_BASE;
    hue = Math.random() * 360;
    scoreElement.textContent = score;
    gameOverModal.classList.add('hidden');
    gameRunning = true;

    // Initial base block
    const baseBlock = new Block(
        (canvas.width - INITIAL_BLOCK_SIZE) / 2,
        canvas.height - BLOCK_HEIGHT,
        INITIAL_BLOCK_SIZE,
        `hsl(${hue}, 70%, 50%)`
    );
    stack.push(baseBlock);

    spawnBlock();
    animate();
}

function spawnBlock() {
    const prevBlock = stack[stack.length - 1];
    hue = (hue + 20) % 360;
    const color = `hsl(${hue}, 70%, 50%)`;

    // Spawn new block at a random x, but ensure it's fully on screen initially if possible
    // Actually, standard tower stack games spawn from the side. Let's spawn from left or right edge.
    // For simplicity in this version, let's spawn it at 0 and let it scroll.

    // Calculate Y position. If stack gets too high, we need to shift the camera (move everything down).
    let y = prevBlock.y - BLOCK_HEIGHT;

    // Camera shift logic
    if (y < 200) {
        stack.forEach(block => block.y += BLOCK_HEIGHT);
        y += BLOCK_HEIGHT;
    }

    currentBlock = new Block(0, y, prevBlock.width, color);

    // Randomize start direction and position
    if (Math.random() > 0.5) {
        currentBlock.x = -currentBlock.width;
        currentBlock.direction = 1;
    } else {
        currentBlock.x = canvas.width;
        currentBlock.direction = -1;
    }
}

function placeBlock() {
    if (!gameRunning) return;

    const prevBlock = stack[stack.length - 1];
    const overlap = getOverlap(currentBlock, prevBlock);

    if (overlap > 0) {
        // Cut the block
        const newWidth = overlap;

        // Determine new X based on which side was cut
        let newX = currentBlock.x;
        if (currentBlock.x < prevBlock.x) {
            // Left side hanging off
            newX = prevBlock.x;
        }
        // If right side hanging off, x stays same (but width is reduced)

        currentBlock.width = newWidth;
        currentBlock.x = newX;
        currentBlock.direction = 0; // Stop moving

        stack.push(currentBlock);
        score++;
        scoreElement.textContent = score;
        scrollSpeed += SCROLL_SPEED_INCREMENT;

        spawnBlock();
    } else {
        gameOver();
    }
}

function getOverlap(b1, b2) {
    // Calculate overlap between current block (b1) and previous block (b2)
    const b1Left = b1.x;
    const b1Right = b1.x + b1.width;
    const b2Left = b2.x;
    const b2Right = b2.x + b2.width;

    const overlapLeft = Math.max(b1Left, b2Left);
    const overlapRight = Math.min(b1Right, b2Right);

    return Math.max(0, overlapRight - overlapLeft);
}

function gameOver() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverModal.classList.remove('hidden');
}

function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw stack
    stack.forEach(block => block.draw());

    // Update and draw current block
    if (currentBlock) {
        currentBlock.update();
        currentBlock.draw();
    }

    requestAnimationFrame(animate);
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent scrolling
        if (gameRunning) {
            placeBlock();
        } else if (!gameOverModal.classList.contains('hidden')) {
            // Optional: Space to restart if game over
            initGame();
        }
    }
});

restartBtn.addEventListener('click', initGame);

// Start the game
initGame();
