const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY = 0.5;
const JUMP_FORCE = -10; // Not really jumping, just falling control? User said "helping them jump down". 
// Actually user said "help the cats getting down using the arrow keys". 
// Usually this means moving left/right to find a path. 
// Let's assume they can jump a little bit or just walk off.
// "Jump down" might just mean "descend".
const MOVE_SPEED = 3;
const MAX_FALL_HEIGHT = 250; // Pixels before death
const TILE_SIZE = 40;

// Game State
let game = {
    level: 1,
    cats: [],
    objects: [],
    branches: [],
    keys: {},
    state: 'PLAYING', // PLAYING, GAMEOVER, LEVEL_COMPLETE
    catsRescued: 0,
    totalCats: 0,
    grabbedObject: null
};

// Input Handling
window.addEventListener('keydown', (e) => {
    game.keys[e.key.toLowerCase()] = true;
    game.keys[e.key] = true; // Handle both cases

    if (game.state === 'PLAYING') {
        if (e.key.toLowerCase() === 'q') {
            toggleGrab();
        }
    }
});

window.addEventListener('keyup', (e) => {
    game.keys[e.key.toLowerCase()] = false;
    game.keys[e.key] = false;
});

document.getElementById('next-level-btn').addEventListener('click', nextLevel);
document.getElementById('restart-btn').addEventListener('click', restartLevel);

// Classes
class Cat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.fallStartY = y;
        this.rescued = false;
        this.color = '#8d6e63'; // Brown
        this.active = true; // Only one cat active at a time? Or all move?
        // "you help the cats... using arrow keys". 
        // If multiple cats, maybe we control the one closest to bottom or cycle?
        // Or maybe they follow? 
        // Let's assume we control the "active" cat, or all of them if they are close?
        // Simplest: Control all cats simultaneously with arrow keys? 
        // Or cycle? 
        // Let's implement: Control ALL cats. If one dies, game over.
    }

    update() {
        if (this.rescued) return;

        // Movement
        if (game.keys['ArrowLeft']) this.vx = -MOVE_SPEED;
        else if (game.keys['ArrowRight']) this.vx = MOVE_SPEED;
        else this.vx = 0;

        // Apply Gravity
        this.vy += GRAVITY;

        // Apply Velocity
        this.x += this.vx;
        this.y += this.vy;

        // Screen Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Collision Detection
        this.grounded = false;

        // Check Branches
        for (let branch of game.branches) {
            this.checkPlatformCollision(branch);
        }

        // Check Objects
        for (let obj of game.objects) {
            this.checkPlatformCollision(obj);
        }

        // Check Ground (Win Condition for this cat)
        if (this.y + this.height >= canvas.height) {
            this.y = canvas.height - this.height;
            this.grounded = true;
            if (!this.rescued) {
                this.rescued = true;
                game.catsRescued++;
                checkLevelStatus();
            }
            this.vy = 0;
        }

        // Fall Damage / Death Logic
        if (this.grounded) {
            // Landed
            let fallDistance = this.y - this.fallStartY;
            if (fallDistance > MAX_FALL_HEIGHT) {
                gameOver("Cat fell too far!");
            }
            this.fallStartY = this.y;
            this.vy = 0;
        } else {
            // Falling
            // Update fallStartY if we are just starting to fall (was grounded)
            // Actually, fallStartY should be set when we leave the ground.
            // But we need to track the Y where we last stood.
        }
    }

    checkPlatformCollision(platform) {
        // Simple AABB collision for landing on top
        if (this.vy >= 0 && // Falling down
            this.y + this.height <= platform.y + platform.height && // Was above/inside
            this.y + this.height + this.vy >= platform.y && // Will cross top
            this.x + this.width > platform.x &&
            this.x < platform.x + platform.width) {

            // Snap to top
            this.y = platform.y - this.height;
            this.vy = 0;
            this.grounded = true;
            this.fallStartY = this.y;
        }
    }

    draw() {
        if (this.rescued && this.y >= canvas.height - this.height) {
            // Draw faded or happy near bottom?
            ctx.globalAlpha = 0.5;
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 5, this.y + 5, 8, 8);
        ctx.fillRect(this.x + 17, this.y + 5, 8, 8);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 7, this.y + 7, 4, 4);
        ctx.fillRect(this.x + 19, this.y + 7, 4, 4);

        ctx.globalAlpha = 1.0;
    }
}

class Plank {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 10;
        this.color = '#795548';
        this.selected = false;
    }

    update() {
        if (this.selected) {
            if (game.keys['w']) this.y -= MOVE_SPEED;
            if (game.keys['s']) this.y += MOVE_SPEED;
            if (game.keys['a']) this.x -= MOVE_SPEED;
            if (game.keys['d']) this.x += MOVE_SPEED;
        }
    }

    draw() {
        ctx.fillStyle = this.selected ? '#ffeb3b' : this.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Game Functions
function initLevel(level) {
    game.level = level;
    game.state = 'PLAYING';
    game.cats = [];
    game.objects = [];
    game.branches = [];
    game.catsRescued = 0;
    game.totalCats = level; // "Each level has one more cats than the level before it" (Lvl 1 = 1 cat?)
    // User said: "Each level has one more cats than the level before it."
    // Assuming Level 1 has 1 cat.

    document.getElementById('level-display').innerText = level;
    document.getElementById('cats-total').innerText = game.totalCats;
    document.getElementById('cats-rescued').innerText = 0;
    document.getElementById('message-overlay').classList.add('hidden');

    // Generate Tree (Static for now)
    generateTree();

    // Spawn Cats at top
    for (let i = 0; i < game.totalCats; i++) {
        // Randomize X position on top branches
        let startBranch = game.branches[Math.floor(Math.random() * Math.min(3, game.branches.length))];
        game.cats.push(new Cat(startBranch.x + 10 + i * 40, startBranch.y - 40));
    }

    // Spawn Objects (Level 2+)
    if (level >= 2) {
        let numObjects = level - 1;
        for (let i = 0; i < numObjects; i++) {
            game.objects.push(new Plank(100 + i * 100, canvas.height - 100, 80));
        }
    }
}

function generateTree() {
    // Main Trunk
    // We won't collide with trunk, just visual? Or maybe trunk is a wall?
    // Let's make branches the main platforms.

    // Create branches at various heights
    let startY = 100;
    let gapY = 80;
    let rows = Math.floor((canvas.height - 100) / gapY);

    for (let i = 0; i < rows; i++) {
        let y = startY + i * gapY;
        // Randomize branches
        // Left branch
        if (Math.random() > 0.3) {
            game.branches.push({ x: 0, y: y, width: 200 + Math.random() * 100, height: 10 });
        }
        // Right branch
        if (Math.random() > 0.3) {
            let w = 200 + Math.random() * 100;
            game.branches.push({ x: canvas.width - w, y: y, width: w, height: 10 });
        }
        // Center branch sometimes
        if (Math.random() > 0.7) {
            game.branches.push({ x: 300, y: y, width: 200, height: 10 });
        }
    }

    // Ensure top branch exists for spawn
    if (game.branches.length === 0 || game.branches[0].y > 150) {
        game.branches.unshift({ x: 100, y: 100, width: 600, height: 10 });
    }
}

function toggleGrab() {
    if (game.grabbedObject) {
        // Drop
        game.grabbedObject.selected = false;
        game.grabbedObject = null;
    } else {
        // Pick up nearest
        // Find active cat (or just use mouse? No, user said Q key).
        // "to pick up an object you use the q key... move it up with w..."
        // Does the CAT pick it up? Or is it a "god hand" power?
        // "you help the cats... to pick up an object you use the q key"
        // It sounds like a separate control.
        // Let's assume God Hand (Global control) or based on Cat position?
        // "starting in level 2, there are also objects you have to move around"
        // Usually if the cat picks it up, it moves WITH the cat.
        // But "move it up with w, down with s..." implies independent movement from the cat (Arrow keys).
        // So it's likely a "Cursor" or "Nearest Object" selection.
        // I'll implement: Select nearest object to the center of the screen OR nearest to any cat?
        // Let's just select the nearest object to the center for simplicity, or cycle?
        // Or maybe just the nearest object to the "Mouse"? But no mouse mentioned.
        // Let's try: Find nearest object to the average position of all cats? 
        // Or just cycle through objects?
        // Let's go with: Find object closest to the *first active cat*.

        if (game.cats.length > 0 && game.objects.length > 0) {
            let cat = game.cats[0]; // Use first cat as reference
            let closestObj = null;
            let minDist = 10000;

            for (let obj of game.objects) {
                let dx = (obj.x + obj.width / 2) - (cat.x + cat.width / 2);
                let dy = (obj.y + obj.height / 2) - (cat.y + cat.height / 2);
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) { // Range to grab
                    if (dist < minDist) {
                        minDist = dist;
                        closestObj = obj;
                    }
                }
            }

            if (closestObj) {
                game.grabbedObject = closestObj;
                closestObj.selected = true;
            }
        }
    }
}

function checkLevelStatus() {
    document.getElementById('cats-rescued').innerText = game.catsRescued;
    if (game.catsRescued >= game.totalCats) {
        levelComplete();
    }
}

function levelComplete() {
    game.state = 'LEVEL_COMPLETE';
    document.getElementById('message-title').innerText = "Level " + game.level + " Complete!";
    document.getElementById('next-level-btn').classList.remove('hidden');
    document.getElementById('restart-btn').classList.add('hidden');
    document.getElementById('message-overlay').classList.remove('hidden');
}

function gameOver(reason) {
    game.state = 'GAMEOVER';
    document.getElementById('message-title').innerText = "Game Over! " + reason;
    document.getElementById('next-level-btn').classList.add('hidden');
    document.getElementById('restart-btn').classList.remove('hidden');
    document.getElementById('message-overlay').classList.remove('hidden');
}

function nextLevel() {
    initLevel(game.level + 1);
}

function restartLevel() {
    initLevel(game.level);
}

function update() {
    if (game.state !== 'PLAYING') return;

    // Update Cats
    game.cats.forEach(cat => cat.update());

    // Update Objects
    game.objects.forEach(obj => obj.update());
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Tree Trunk
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(canvas.width / 2 - 40, 0, 80, canvas.height);

    // Draw Branches
    ctx.fillStyle = '#388e3c';
    for (let branch of game.branches) {
        ctx.fillRect(branch.x, branch.y, branch.width, branch.height);
    }

    // Draw Objects
    game.objects.forEach(obj => obj.draw());

    // Draw Cats
    game.cats.forEach(cat => cat.draw());
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start
initLevel(1);
loop();
