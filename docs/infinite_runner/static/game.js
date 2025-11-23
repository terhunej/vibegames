const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY = 0.5;
const JUMP_FORCE = -8; // Increased jump impulse (was -8)
const JUMP_HOLD_FORCE = -0.7; // Increased hold force (was -0.4)
const MAX_JUMP_TIME = 19; // Frames you can hold space for
const SPEED = 5;
const SPAWN_RATE = 70; // Closer platforms (was 120)

// Game State
let gameRunning = true;
let score = 0;
let frameCount = 0;
let platformWidth = 300; // Wider start
let lastPlatformY = 0; // Track last platform height for fairness

// Background State
let trees = [];

// Player Object
const player = {
    x: 100,
    y: 300,
    width: 30,
    height: 60,
    dy: 0,
    grounded: false,
    isJumping: false,
    jumpTimer: 0,
    jumpCount: 0, // Track number of jumps
    maxJumps: 2,  // Double jump
    color: 'red',
    draw: function () {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Animation Math
        // Cycle for running: -1 to 1
        const runCycle = Math.sin(frameCount * 0.2);
        const legAngle = this.grounded ? runCycle * 0.5 : 0.2; // Freeze if jumping
        const armAngle = this.grounded ? -runCycle * 0.5 : -0.5; // Opposite to legs

        // Stick figure drawing
        ctx.beginPath();

        // Head
        const headX = this.x + this.width / 2;
        const headY = this.y + 10;
        ctx.arc(headX, headY, 10, 0, Math.PI * 2);

        // Body
        const bodyTopY = headY + 10;
        const bodyBottomY = this.y + 45;
        ctx.moveTo(headX, bodyTopY);
        ctx.lineTo(headX, bodyBottomY);

        // Arms (Pivot at shoulder)
        const shoulderY = bodyTopY + 5;
        // Left Arm
        ctx.moveTo(headX, shoulderY);
        ctx.lineTo(headX + Math.sin(armAngle) * 20, shoulderY + Math.cos(armAngle) * 20);
        // Right Arm
        ctx.moveTo(headX, shoulderY);
        ctx.lineTo(headX + Math.sin(-armAngle) * 20, shoulderY + Math.cos(-armAngle) * 20);

        // Legs (Pivot at hips)
        const hipY = bodyBottomY;
        // Left Leg
        ctx.moveTo(headX, hipY);
        ctx.lineTo(headX + Math.sin(legAngle) * 20, hipY + Math.cos(legAngle) * 20);
        // Right Leg
        ctx.moveTo(headX, hipY);
        ctx.lineTo(headX + Math.sin(-legAngle) * 20, hipY + Math.cos(-legAngle) * 20);

        ctx.stroke();
    },
    update: function () {
        // Variable Jump Logic
        if (this.isJumping && this.jumpTimer < MAX_JUMP_TIME) {
            this.dy += JUMP_HOLD_FORCE;
            this.jumpTimer++;
        }

        // Apply gravity
        this.dy += GRAVITY;
        this.y += this.dy;

        // Ground collision (temporary floor for testing, will be removed later or kept as death zone)
        if (this.y + this.height > canvas.height) {
            // Game Over condition
            gameOver();
        }
    },
    jump: function () {
        if (this.jumpCount < this.maxJumps) {
            this.dy = JUMP_FORCE;
            this.grounded = false;
            this.isJumping = true;
            this.jumpTimer = 0;
            this.jumpCount++;
        }
    },
    stopJump: function () {
        this.isJumping = false;
    }
};

// Platforms Array
let platforms = [];

// Input Handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameRunning) {
            player.jump();
        } else {
            resetGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        player.stopJump();
    }
});

// Resize Handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    lastPlatformY = canvas.height - 50;
    // Initial platform
    if (platforms.length === 0) {
        platforms.push({
            x: 0,
            y: canvas.height - 50,
            width: canvas.width,
            height: 50
        });
        player.y = canvas.height - 150;
    }

    // Init trees if empty
    if (trees.length === 0) {
        for (let i = 0; i < canvas.width; i += 100) {
            spawnTree(i);
        }
    }
}
window.addEventListener('resize', resize);
resize();

function spawnPlatform() {
    // Allow platforms to spawn much higher now that we have a double jump
    const minHeight = 200; // Higher up (smaller Y value)
    const maxHeight = canvas.height - 50;

    // Constrain random Y to be reachable from last platform
    // With double jump, we can reach much higher, so we relax the constraints
    let y = Math.random() * (maxHeight - minHeight) + minHeight;

    // Clamp to prevent impossible jumps, but allow more verticality
    // Jump height is roughly 300-400px now, so we can allow ~300px difference
    if (y < lastPlatformY - 300) {
        y = lastPlatformY - 300;
    }
    if (y > lastPlatformY + 300) {
        y = lastPlatformY + 300;
    }

    // Clamp to screen bounds
    y = Math.max(minHeight, Math.min(maxHeight, y));

    lastPlatformY = y;

    // Decrease width over time - faster shrinking
    if (platformWidth > 50) {
        platformWidth -= 2.0; // Was 0.5
    }

    platforms.push({
        x: canvas.width,
        y: y,
        width: platformWidth,
        height: 20
    });
}

function updatePlatforms() {
    for (let i = 0; i < platforms.length; i++) {
        let p = platforms[i];
        p.x -= SPEED;

        // Collision Detection
        if (
            player.dy > 0 && // Falling
            player.x + player.width > p.x &&
            player.x < p.x + p.width &&
            player.y + player.height > p.y &&
            player.y + player.height < p.y + p.height + 10 // Tolerance
        ) {
            player.dy = 0;
            player.y = p.y - player.height;
            player.grounded = true;
            player.jumpCount = 0; // Reset jumps on landing
        }

        // Remove off-screen platforms
        if (p.x + p.width < 0) {
            platforms.splice(i, 1);
            i--;
            score++;
        }
    }
}

function drawPlatforms() {
    ctx.fillStyle = '#333';
    for (let p of platforms) {
        ctx.fillRect(p.x, p.y, p.width, p.height);
    }
}

function spawnTree(xOffset) {
    // Random tree properties
    const height = 200 + Math.random() * 300;
    const width = 60 + Math.random() * 60;
    trees.push({
        x: xOffset !== undefined ? xOffset : canvas.width + Math.random() * 100,
        y: canvas.height, // Base at bottom
        width: width,
        height: height,
        color: `hsl(${100 + Math.random() * 100}, 60%, 30%)` // Varying greens
    });
}

function updateBackground() {
    // Move trees
    for (let i = 0; i < trees.length; i++) {
        let t = trees[i];
        t.x -= SPEED * 0.5; // Parallax effect (slower than foreground)

        if (t.x + t.width < 0) {
            trees.splice(i, 1);
            i--;
        }
    }

    // Spawn new trees
    if (Math.random() < 0.02) {
        spawnTree();
    }
}

function drawBackground() {
    // Sky
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Trees
    for (let t of trees) {
        // Trunk
        ctx.fillStyle = '#8B4513'; // Brown
        ctx.fillRect(t.x + t.width / 3, t.y - t.height / 3, t.width / 3, t.height / 3);

        // Leaves (Triangle)
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - t.height / 3);
        ctx.lineTo(t.x + t.width / 2, t.y - t.height);
        ctx.lineTo(t.x + t.width, t.y - t.height / 3);
        ctx.fill();
    }
}

function gameOver() {
    gameRunning = false;
}

function resetGame() {
    gameRunning = true;
    score = 0;
    frameCount = 0;
    platformWidth = 300;
    platforms = [];
    trees = []; // Reset trees
    player.dy = 0;
    player.grounded = false;
    player.isJumping = false;
    resize(); // Resets initial platform and trees
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 20, 40);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.font = '24px Arial';
    ctx.fillText('Press Space to Restart', canvas.width / 2, canvas.height / 2 + 50);
    ctx.textAlign = 'left'; // Reset
}

function gameLoop() {
    if (gameRunning) {
        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update
        frameCount++;
        if (frameCount % SPAWN_RATE === 0) {
            spawnPlatform();
        }

        // Logic
        updateBackground();
        drawBackground(); // Draw background first

        player.update();
        updatePlatforms();

        // Draw
        drawPlatforms();
        player.draw();
        drawScore();
    } else {
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
