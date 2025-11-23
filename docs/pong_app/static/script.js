const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game State & Settings
const defaultSettings = {
    orientation: 'horizontal', // 'horizontal' or 'vertical'
    hardMode: false,
    speedMultiplier: 1.0,
    p1: { up: 'a', down: 's' },
    p2: { up: 'k', down: 'l' }
};

let settings = JSON.parse(localStorage.getItem('pongSettings')) || JSON.parse(JSON.stringify(defaultSettings));

// Game objects
let balls = [];
let bounceCount = 0;

const paddleLong = 100;
const paddleShort = 10;

const player1 = {
    x: 0,
    y: 0, // Initialized in resetGame
    width: paddleShort,
    height: paddleLong,
    color: '#f472b6',
    d: 0, // generic delta
    score: 0
};

const player2 = {
    x: 0,
    y: 0, // Initialized in resetGame
    width: paddleShort,
    height: paddleLong,
    color: '#4ade80',
    d: 0,
    score: 0
};

// Input handling
const keys = {};
let listeningForKey = null; // { player: 1|2, action: 'up'|'down', btnElement: elem }

document.addEventListener('keydown', (e) => {
    if (listeningForKey) {
        e.preventDefault();
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        settings[`p${listeningForKey.player}`][listeningForKey.action] = key;

        // Update UI
        listeningForKey.btnElement.textContent = key.toUpperCase();
        listeningForKey.btnElement.classList.remove('listening');
        updateControlHints();
        saveSettings();

        listeningForKey = null;
        return;
    }
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function saveSettings() {
    localStorage.setItem('pongSettings', JSON.stringify(settings));
}

function createBall() {
    let dx, dy;
    if (settings.orientation === 'horizontal') {
        dx = (Math.random() > 0.5 ? 1 : -1) * 3;
        dy = (Math.random() * 6 - 3);
    } else {
        dx = (Math.random() * 6 - 3);
        dy = (Math.random() > 0.5 ? 1 : -1) * 3;
    }

    return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 10,
        dx: dx,
        dy: dy,
        color: '#fff'
    };
}

function resetGame() {
    // Reset positions based on orientation
    if (settings.orientation === 'horizontal') {
        player1.width = paddleShort;
        player1.height = paddleLong;
        player1.x = 0;
        player1.y = (canvas.height - paddleLong) / 2;

        player2.width = paddleShort;
        player2.height = paddleLong;
        player2.x = canvas.width - paddleShort;
        player2.y = (canvas.height - paddleLong) / 2;
    } else {
        player1.width = paddleLong;
        player1.height = paddleShort;
        player1.x = (canvas.width - paddleLong) / 2;
        player1.y = 0;

        player2.width = paddleLong;
        player2.height = paddleShort;
        player2.x = (canvas.width - paddleLong) / 2;
        player2.y = canvas.height - paddleShort;
    }
    resetBalls();
}

function resetBalls() {
    balls = [createBall()];
    bounceCount = 0;
}

function handleInput() {
    const p1Up = keys[settings.p1.up];
    const p1Down = keys[settings.p1.down];
    const p2Up = keys[settings.p2.up];
    const p2Down = keys[settings.p2.down];

    player1.d = 0;
    player2.d = 0;

    if (p1Up) player1.d = -8;
    if (p1Down) player1.d = 8;

    if (p2Up) player2.d = -8;
    if (p2Down) player2.d = 8;
}

function updatePaddle(paddle) {
    if (settings.orientation === 'horizontal') {
        paddle.y += paddle.d;
        if (paddle.y < 0) paddle.y = 0;
        if (paddle.y + paddle.height > canvas.height) paddle.y = canvas.height - paddle.height;
    } else {
        paddle.x += paddle.d; // 'Up' (left) is negative, 'Down' (right) is positive logic
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    }
}

function updateBalls() {
    for (let i = 0; i < balls.length; i++) {
        let ball = balls[i];

        // Apply speed multiplier
        let moveX = ball.dx * settings.speedMultiplier;
        let moveY = ball.dy * settings.speedMultiplier;

        ball.x += moveX;
        ball.y += moveY;

        let hitPaddle = false;

        if (settings.orientation === 'horizontal') {
            // Top/Bottom walls
            if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
                ball.dy *= -1;
            }

            // Paddles
            // P1 (Left)
            if (ball.x - ball.radius < player1.x + player1.width &&
                ball.y > player1.y && ball.y < player1.y + player1.height) {
                ball.dx = Math.abs(ball.dx); // Force positive
                ball.speed += 0.2;
                ball.dx += 0.2;
                let hitPoint = ball.y - (player1.y + player1.height / 2);
                ball.dy = hitPoint * 0.1;
                hitPaddle = true;
            }
            // P2 (Right)
            if (ball.x + ball.radius > player2.x &&
                ball.y > player2.y && ball.y < player2.y + player2.height) {
                ball.dx = -Math.abs(ball.dx); // Force negative
                ball.speed += 0.2;
                ball.dx -= 0.2;
                let hitPoint = ball.y - (player2.y + player2.height / 2);
                ball.dy = hitPoint * 0.1;
                hitPaddle = true;
            }

            // Scoring
            if (ball.x + ball.radius < 0) {
                player2.score++;
                resetBalls();
                return; // Stop updating other balls if reset happens
            } else if (ball.x - ball.radius > canvas.width) {
                player1.score++;
                resetBalls();
                return;
            }

        } else { // Vertical
            // Left/Right walls
            if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
                ball.dx *= -1;
            }

            // Paddles
            // P1 (Top)
            if (ball.y - ball.radius < player1.y + player1.height &&
                ball.x > player1.x && ball.x < player1.x + player1.width) {
                ball.dy = Math.abs(ball.dy); // Force down (positive)
                ball.speed += 0.2;
                ball.dy += 0.2;
                let hitPoint = ball.x - (player1.x + player1.width / 2);
                ball.dx = hitPoint * 0.1;
                hitPaddle = true;
            }
            // P2 (Bottom)
            if (ball.y + ball.radius > player2.y &&
                ball.x > player2.x && ball.x < player2.x + player2.width) {
                ball.dy = -Math.abs(ball.dy); // Force up (negative)
                ball.speed += 0.2;
                ball.dy -= 0.2;
                let hitPoint = ball.x - (player2.x + player2.width / 2);
                ball.dx = hitPoint * 0.1;
                hitPaddle = true;
            }

            // Scoring
            if (ball.y + ball.radius < 0) {
                player2.score++;
                resetBalls();
                return;
            } else if (ball.y - ball.radius > canvas.height) {
                player1.score++;
                resetBalls();
                return;
            }
        }

        if (hitPaddle && settings.hardMode) {
            bounceCount++;
            if (bounceCount % 3 === 0) {
                balls.push(createBall());
            }
        }
    }
}

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
}

function drawCircle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawText(text, x, y, color) {
    ctx.fillStyle = color;
    ctx.font = "50px 'Outfit', sans-serif";
    ctx.fillText(text, x, y);
}

function drawNet() {
    ctx.fillStyle = "#334155";
    if (settings.orientation === 'horizontal') {
        for (let i = 0; i <= canvas.height; i += 30) {
            ctx.fillRect(canvas.width / 2 - 1, i, 2, 20);
        }
    } else {
        for (let i = 0; i <= canvas.width; i += 30) {
            ctx.fillRect(i, canvas.height / 2 - 1, 20, 2);
        }
    }
}

function render() {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawNet();

    if (settings.orientation === 'horizontal') {
        drawText(player1.score, canvas.width / 4, 80, player1.color);
        drawText(player2.score, 3 * canvas.width / 4, 80, player2.color);
    } else {
        // Scores on sides for vertical? Or maybe just top/bottom corners?
        // Let's put them on the right side, stacked
        drawText(player1.score, 50, canvas.height / 2 - 50, player1.color);
        drawText(player2.score, 50, canvas.height / 2 + 80, player2.color);
    }

    drawRect(player1.x, player1.y, player1.width, player1.height, player1.color);
    drawRect(player2.x, player2.y, player2.width, player2.height, player2.color);

    balls.forEach(ball => {
        drawCircle(ball.x, ball.y, ball.radius, ball.color);
    });
}

function gameLoop() {
    handleInput();
    updatePaddle(player1);
    updatePaddle(player2);
    updateBalls();
    render();
    requestAnimationFrame(gameLoop);
}

// Settings UI Logic
const modal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettings');
const orientHorizontalBtn = document.getElementById('orientHorizontal');
const orientVerticalBtn = document.getElementById('orientVertical');
const hardModeToggle = document.getElementById('hardModeToggle');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

settingsBtn.addEventListener('click', () => {
    modal.classList.add('open');
});

closeSettingsBtn.addEventListener('click', () => {
    modal.classList.remove('open');
    listeningForKey = null;
    document.querySelectorAll('.key-bind-btn').forEach(btn => btn.classList.remove('listening'));
});

orientHorizontalBtn.addEventListener('click', () => {
    setOrientation('horizontal');
});

orientVerticalBtn.addEventListener('click', () => {
    setOrientation('vertical');
});

hardModeToggle.addEventListener('click', () => {
    settings.hardMode = !settings.hardMode;
    updateHardModeUI();
    saveSettings();
    resetGame();
});

speedSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    settings.speedMultiplier = val;
    speedValue.textContent = val.toFixed(1) + 'x';
    saveSettings();
});

function updateHardModeUI() {
    hardModeToggle.textContent = `Hard Mode: ${settings.hardMode ? 'ON' : 'OFF'}`;
    hardModeToggle.classList.toggle('active', settings.hardMode);
}

function updateSpeedUI() {
    speedSlider.value = settings.speedMultiplier;
    speedValue.textContent = settings.speedMultiplier.toFixed(1) + 'x';
}

function setOrientation(orient) {
    settings.orientation = orient;
    orientHorizontalBtn.classList.toggle('active', orient === 'horizontal');
    orientVerticalBtn.classList.toggle('active', orient === 'vertical');

    // Update labels
    const labels = {
        horizontal: { up: 'Up', down: 'Down' },
        vertical: { up: 'Left', down: 'Right' }
    };

    document.getElementById('p1-up-label').textContent = labels[orient].up + ':';
    document.getElementById('p1-down-label').textContent = labels[orient].down + ':';
    document.getElementById('p2-up-label').textContent = labels[orient].up + ':';
    document.getElementById('p2-down-label').textContent = labels[orient].down + ':';

    saveSettings();
    resetGame();
}

document.querySelectorAll('.key-bind-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Clear other listeners
        document.querySelectorAll('.key-bind-btn').forEach(b => b.classList.remove('listening'));

        btn.classList.add('listening');
        listeningForKey = {
            player: btn.dataset.player,
            action: btn.dataset.action,
            btnElement: btn
        };
    });
});

function updateControlHints() {
    document.getElementById('p1-up-display').textContent = settings.p1.up.toUpperCase();
    document.getElementById('p1-down-display').textContent = settings.p1.down.toUpperCase();
    document.getElementById('p2-up-display').textContent = settings.p2.up.toUpperCase();
    document.getElementById('p2-down-display').textContent = settings.p2.down.toUpperCase();

    // Update buttons in modal too
    document.querySelector(`button[data-player="1"][data-action="up"]`).textContent = settings.p1.up.toUpperCase();
    document.querySelector(`button[data-player="1"][data-action="down"]`).textContent = settings.p1.down.toUpperCase();
    document.querySelector(`button[data-player="2"][data-action="up"]`).textContent = settings.p2.up.toUpperCase();
    document.querySelector(`button[data-player="2"][data-action="down"]`).textContent = settings.p2.down.toUpperCase();
}

// Initialize
setOrientation(settings.orientation);
updateHardModeUI();
updateSpeedUI();
updateControlHints();
resetGame();
gameLoop();
