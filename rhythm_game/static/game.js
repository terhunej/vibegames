const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const mistakesEl = document.getElementById('mistakes');
const finalScoreEl = document.getElementById('finalScore');
const modal = document.getElementById('gameOverModal');

// Game Constants
const KEYS = ['a', 's', 'd', 'f'];
const COLS = 4;
const COL_WIDTH = canvas.width / COLS;
const CIRCLE_RADIUS = 30;
const TARGET_Y = canvas.height - 60;
const HIT_ZONE = 80; // Distance within which a hit counts
const SPAWN_RATE = 80; // Frames between spawns (approx 1 sec at 60fps)

// Colors for each column
const COLORS = ['#ff0055', '#00ccff', '#ffcc00', '#cc00ff'];

// Game State
let score = 0;
let mistakes = 0;
let circles = [];
let frameCount = 0;
let gameOver = false;
let speed = 2;

class Circle {
    constructor(col) {
        this.col = col;
        this.x = col * COL_WIDTH + COL_WIDTH / 2;
        this.y = -CIRCLE_RADIUS;
        this.color = COLORS[col];
        this.hit = false;
    }

    update() {
        this.y += speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // Inner shine
        ctx.beginPath();
        ctx.arc(this.x - 10, this.y - 10, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.closePath();
    }
}

function drawTargetZones() {
    for (let i = 0; i < COLS; i++) {
        const x = i * COL_WIDTH + COL_WIDTH / 2;

        ctx.beginPath();
        ctx.arc(x, TARGET_Y, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS[i];
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.closePath();

        // Key label
        ctx.fillStyle = '#555';
        ctx.font = '20px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(KEYS[i].toUpperCase(), x, TARGET_Y);
    }
}

function spawnCircles() {
    let numCircles = 1;

    if (score >= 25) {
        // 10% base chance + 1% per point over 25
        const chance = 0.10 + (score - 25) * 0.01;
        if (Math.random() < chance) {
            numCircles = 2;
        }
    }

    const cols = [];
    while (cols.length < numCircles) {
        const col = Math.floor(Math.random() * COLS);
        if (!cols.includes(col)) {
            cols.push(col);
            circles.push(new Circle(col));
        }
    }
}

function checkMisses() {
    for (let i = circles.length - 1; i >= 0; i--) {
        if (circles[i].y > canvas.height + CIRCLE_RADIUS) {
            if (!circles[i].hit) {
                addMistake();
            }
            circles.splice(i, 1);
        }
    }
}

function addMistake() {
    mistakes++;
    mistakesEl.textContent = mistakes;

    // Visual feedback for mistake (flash screen red)
    const originalFill = ctx.fillStyle;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = originalFill;

    if (mistakes >= 10) {
        endGame();
    }
}

function endGame() {
    gameOver = true;
    finalScoreEl.textContent = score;
    modal.classList.remove('hidden');
}

function update() {
    if (gameOver) return;

    frameCount++;
    if (frameCount % SPAWN_RATE === 0) {
        spawnCircles();
        // Increase speed slightly over time
        if (frameCount % 600 === 0) speed += 0.2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw guide lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * COL_WIDTH, 0);
        ctx.lineTo(i * COL_WIDTH, canvas.height);
        ctx.stroke();
    }

    drawTargetZones();

    circles.forEach(circle => {
        circle.update();
        circle.draw();
    });

    checkMisses();

    requestAnimationFrame(update);
}

document.addEventListener('keydown', (e) => {
    if (gameOver) return;

    const keyIndex = KEYS.indexOf(e.key.toLowerCase());
    if (keyIndex !== -1) {
        // Find the lowest circle in this column
        let hitCircle = null;
        let minDistance = Infinity;

        // Filter circles in this column that haven't been hit
        const colCircles = circles.filter(c => c.col === keyIndex && !c.hit);

        // Find the one closest to target
        for (let c of colCircles) {
            const dist = Math.abs(c.y - TARGET_Y);
            if (dist < minDistance) {
                minDistance = dist;
                hitCircle = c;
            }
        }

        if (hitCircle && minDistance < HIT_ZONE) {
            // Hit!
            score++;
            scoreEl.textContent = score;

            // Reduce mistakes every 10 points
            if (score > 0 && score % 10 === 0) {
                if (mistakes > 0) {
                    mistakes--;
                    mistakesEl.textContent = mistakes;

                    // Visual feedback for healing (green flash)
                    const originalFill = ctx.fillStyle;
                    ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = originalFill;
                }
            }

            hitCircle.hit = true;
            // Remove immediately for visual clarity or keep falling? 
            // Let's remove it to show it was "caught"
            const index = circles.indexOf(hitCircle);
            if (index > -1) circles.splice(index, 1);

            // Visual feedback
            const x = keyIndex * COL_WIDTH + COL_WIDTH / 2;
            ctx.beginPath();
            ctx.arc(x, TARGET_Y, CIRCLE_RADIUS + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Miss (pressed key but nothing there)
            addMistake();
        }
    }
});

// Start game
update();
