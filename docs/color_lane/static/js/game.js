// Game Configuration
const CONFIG = {
    laneWidth: 2.5,
    startSpeed: 0.1,
    speedIncrement: 0.005, // Speed increase per second approx
    colors: [
        0xFF0000, // Red
        0x00FF00, // Green
        0x0000FF, // Blue
        0xFFFF00, // Yellow
        0xFF00FF, // Magenta
        0x00FFFF, // Cyan
        0xFFFFFF  // White
    ],
    lanePositions: [-2.5, 0, 2.5] // x-coordinates for Left, Middle, Right
};

// Game State
let state = {
    isPlaying: false,
    score: 0,
    speed: CONFIG.startSpeed,
    playerLane: 1, // 0: Left, 1: Middle, 2: Right
    playerColorIndex: 0,
    obstacles: [],
    powerups: [],
    colorLines: [],
    timeElapsed: 0,
    isRainbow: false,
    rainbowTimer: 0,
    isJumping: false,
    jumpVelocity: 0,
    gravity: -15,
    jumpStrength: 8
};

// Three.js Variables
let scene, camera, renderer;
let playerMesh;
let laneMeshes = [];
let particleSystem;

// DOM Elements
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Logic Variables
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = 1.5; // Seconds between spawns
let colorLineTimer = 0;
let colorLineInterval = 20; // Seconds between color lines (avg 10-30)
let powerUpTimer = 0;
let powerUpInterval = 15; // Seconds between powerups

// Particle System
class ParticleSystem {
    constructor() {
        this.particles = [];
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Points(geometry, material);
        scene.add(this.mesh);
    }

    spawn(position, colorHex, count = 20) {
        const color = new THREE.Color(colorHex);
        for (let i = 0; i < count; i++) {
            this.particles.push({
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5
                ),
                color: color,
                life: 1.0
            });
        }
    }

    update(delta) {
        const positions = [];
        const colors = [];

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta * 2; // Fade out speed

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.position.addScaledVector(p.velocity, delta);

            positions.push(p.position.x, p.position.y, p.position.z);
            colors.push(p.color.r, p.color.g, p.color.b);
        }

        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.attributes.color.needsUpdate = true;
    }
}

// Initialization
function init() {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera (Isometric-ish)
    const aspect = window.innerWidth / window.innerHeight;
    const d = 10;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(scene.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Create Environment
    createLanes();
    createPlayer();

    // Particle System
    particleSystem = new ParticleSystem();

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown, false);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    // Start Loop
    animate();
}

function createLanes() {
    const geometry = new THREE.PlaneGeometry(CONFIG.laneWidth, 100);
    const material = new THREE.MeshStandardMaterial({
        color: 0x2a2a40,
        side: THREE.DoubleSide
    });

    CONFIG.lanePositions.forEach(x => {
        const lane = new THREE.Mesh(geometry, material);
        lane.rotation.x = -Math.PI / 2;
        lane.position.set(x, 0, 0);
        lane.receiveShadow = true;
        scene.add(lane);
        laneMeshes.push(lane);
    });
}

function createPlayer() {
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: CONFIG.colors[0] });
    playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.castShadow = true;
    playerMesh.position.set(CONFIG.lanePositions[1], 0.8, 8); // Start at bottom
    scene.add(playerMesh);
}
function startGame() {
    state.isPlaying = true;
    state.score = 0;
    state.speed = CONFIG.startSpeed;
    state.playerLane = 1;

    // Blur buttons to prevent spacebar from triggering them again
    startBtn.blur();
    restartBtn.blur();

    // Clear existing entities from scene
    state.obstacles.forEach(obs => scene.remove(obs.mesh));
    state.powerups.forEach(pup => scene.remove(pup.mesh));
    state.colorLines.forEach(line => scene.remove(line.mesh));

    state.obstacles = [];
    state.powerups = [];
    state.colorLines = [];

    state.isGameOver = false;
    state.timeElapsed = 0;
    state.isRainbow = false;
    state.rainbowTimer = 0;
    state.isJumping = false;
    state.jumpVelocity = 0;

    // Reset Player
    playerMesh.position.x = CONFIG.lanePositions[1];
    playerMesh.position.y = 0.8;
    updatePlayerColor(Math.floor(Math.random() * CONFIG.colors.length));

    // UI
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    scoreEl.innerText = '0';
}

function updatePlayerColor(index) {
    state.playerColorIndex = index;
    playerMesh.material.color.setHex(CONFIG.colors[index]);
}

function onKeyDown(event) {
    if (!state.isPlaying) return;

    switch (event.key) {
        case 'ArrowLeft':
            if (state.playerLane > 0) {
                state.playerLane--;
                playerMesh.position.x = CONFIG.lanePositions[state.playerLane];
            }
            break;
        case 'ArrowRight':
            if (state.playerLane < 2) {
                state.playerLane++;
                playerMesh.position.x = CONFIG.lanePositions[state.playerLane];
            }
            break;
        case 'ArrowUp': // Jump
        case ' ': // Keep spacebar as alternate but prevent default
            event.preventDefault();
            if (!state.isJumping) {
                state.isJumping = true;
                state.jumpVelocity = state.jumpStrength;
            }
            break;
    }
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = 10;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Entities
class Obstacle {
    constructor(laneIndex, colorIndex) {
        this.laneIndex = laneIndex;
        this.colorIndex = colorIndex;
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 16, 16),
            new THREE.MeshStandardMaterial({ color: CONFIG.colors[colorIndex] })
        );
        this.mesh.position.set(CONFIG.lanePositions[laneIndex], 0.6, -50); // Spawn far back
        this.mesh.castShadow = true;
        scene.add(this.mesh);
        this.active = true;
    }

    update(delta, speed) {
        this.mesh.position.z += speed * delta * 60; // Speed scale
        if (this.mesh.position.z > 15) {
            this.remove();
        }
    }

    remove() {
        this.active = false;
        scene.remove(this.mesh);
    }
}

class ColorLine {
    constructor() {
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.2, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0x555555 })
        );
        this.mesh.position.set(0, 0.1, -50);
        scene.add(this.mesh);
        this.active = true;
        this.passed = false;
    }

    update(delta, speed) {
        this.mesh.position.z += speed * delta * 60;
        if (this.mesh.position.z > 15) {
            this.remove();
        }
    }

    remove() {
        this.active = false;
        scene.remove(this.mesh);
    }
}

class PowerUp {
    constructor(laneIndex) {
        this.laneIndex = laneIndex;
        this.mesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.5, 0),
            new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFaa00, emissiveIntensity: 0.5 })
        );
        this.mesh.position.set(CONFIG.lanePositions[laneIndex], 1.0, -50);
        this.mesh.castShadow = true;
        scene.add(this.mesh);
        this.active = true;
        this.rotationSpeed = 2.0;
    }

    update(delta, speed) {
        this.mesh.position.z += speed * 2 * delta * 60; // Double speed
        this.mesh.rotation.y += this.rotationSpeed * delta;
        this.mesh.rotation.x += this.rotationSpeed * delta;

        if (this.mesh.position.z > 15) {
            this.remove();
        }
    }

    remove() {
        this.active = false;
        scene.remove(this.mesh);
    }
}

function animate(time) {
    requestAnimationFrame(animate);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    if (state.isPlaying && !state.isGameOver) {
        // Difficulty Scaling
        state.speed += CONFIG.speedIncrement * delta;
        state.timeElapsed += delta;

        // Jump Physics
        if (state.isJumping) {
            playerMesh.position.y += state.jumpVelocity * delta;
            state.jumpVelocity += state.gravity * delta;

            if (playerMesh.position.y <= 0.8) {
                playerMesh.position.y = 0.8;
                state.isJumping = false;
                state.jumpVelocity = 0;
            }
        }

        // Spawning Obstacles
        spawnTimer += delta;
        if (spawnTimer > spawnInterval / (state.speed * 5)) { // Spawn faster as speed increases
            spawnObstacle();
            spawnTimer = 0;
        }

        // Spawning Color Lines
        colorLineTimer += delta;
        if (colorLineTimer > colorLineInterval) {
            spawnColorLine();
            colorLineTimer = 0;
            colorLineInterval = 10 + Math.random() * 20; // Random 10-30s
        }

        // Spawning PowerUps
        powerUpTimer += delta;
        if (powerUpTimer > powerUpInterval) {
            spawnPowerUp();
            powerUpTimer = 0;
        }

        // Update Entities
        updateEntities(delta);
        particleSystem.update(delta);

        // Rainbow Mode
        if (state.isRainbow) {
            state.rainbowTimer -= delta;

            // Visuals last for 5 seconds (until timer <= 0.5)
            if (state.rainbowTimer > 0.5) {
                if (state.rainbowTimer <= 1.5) {
                    // Flash Blue and White in last second of visuals
                    const flashSpeed = 10; // Hz
                    const isWhite = Math.floor((state.rainbowTimer - 0.5) * flashSpeed) % 2 === 0;
                    playerMesh.material.color.setHex(isWhite ? 0xFFFFFF : 0x0000FF);
                } else {
                    // Normal Rainbow Cycle
                    playerMesh.material.color.setHSL((Date.now() % 1000) / 1000, 1, 0.5);
                }
            } else {
                // Visuals ended, but grace period active (0.5s)
                // Reset to normal color
                updatePlayerColor(state.playerColorIndex);
            }

            if (state.rainbowTimer <= 0) {
                state.isRainbow = false;
                updatePlayerColor(state.playerColorIndex);
            }
        }
    }

    renderer.render(scene, camera);
}

function spawnObstacle() {
    // 5% chance to spawn in all 3 lanes
    if (Math.random() < 0.05) {
        for (let i = 0; i < 3; i++) {
            const color = Math.floor(Math.random() * CONFIG.colors.length);
            state.obstacles.push(new Obstacle(i, color));
        }
    } else {
        const lane = Math.floor(Math.random() * 3);
        const color = Math.floor(Math.random() * CONFIG.colors.length);
        state.obstacles.push(new Obstacle(lane, color));
    }
}

function spawnColorLine() {
    state.colorLines.push(new ColorLine());
}

function spawnPowerUp() {
    const lane = Math.floor(Math.random() * 3);
    state.powerups.push(new PowerUp(lane));
}

function updateEntities(delta) {
    // Obstacles
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        obs.update(delta, state.speed);

        // Collision
        if (obs.active && Math.abs(obs.mesh.position.z - playerMesh.position.z) < 1.0) {
            if (obs.laneIndex === state.playerLane) {
                // Check if jumping over (y > 1.5 approx)
                if (playerMesh.position.y > 2.0) {
                    // Jumped over!
                } else {
                    if (state.isRainbow || obs.colorIndex === state.playerColorIndex) {
                        // Score
                        state.score += 10;
                        scoreEl.innerText = state.score;
                        particleSystem.spawn(obs.mesh.position, CONFIG.colors[obs.colorIndex]); // Spawn particles
                        obs.remove();
                        state.obstacles.splice(i, 1);
                    } else {
                        // Game Over
                        gameOver();
                    }
                }
            }
        } else if (!obs.active) {
            state.obstacles.splice(i, 1);
        }
    }

    // Color Lines
    for (let i = state.colorLines.length - 1; i >= 0; i--) {
        const line = state.colorLines[i];
        line.update(delta, state.speed);

        if (line.active && !line.passed && line.mesh.position.z > playerMesh.position.z) {
            line.passed = true;
            // Change Player Color
            let newColor = state.playerColorIndex;
            while (newColor === state.playerColorIndex) {
                newColor = Math.floor(Math.random() * CONFIG.colors.length);
            }
            updatePlayerColor(newColor);
        }

        if (!line.active) state.colorLines.splice(i, 1);
    }

    // PowerUps
    for (let i = state.powerups.length - 1; i >= 0; i--) {
        const pup = state.powerups[i];
        pup.update(delta, state.speed);

        if (pup.active && Math.abs(pup.mesh.position.z - playerMesh.position.z) < 1.0) {
            if (pup.laneIndex === state.playerLane) {
                activateRainbow();
                particleSystem.spawn(pup.mesh.position, 0xFFD700, 50); // Gold particles
                pup.remove();
                state.powerups.splice(i, 1);
            }
        } else if (!pup.active) {
            state.powerups.splice(i, 1);
        }
    }
}

function activateRainbow() {
    state.isRainbow = true;
    state.rainbowTimer = 5.5; // 5s Visuals + 0.5s Grace
}

function gameOver() {
    state.isPlaying = false;
    state.isGameOver = true;
    finalScoreEl.innerText = state.score;
    gameOverScreen.classList.remove('hidden');
}

init();
