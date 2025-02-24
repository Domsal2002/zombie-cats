import * as THREE from 'three';
import { SceneSetup } from './utils/SceneSetup.js';
import { InputController } from './controllers/InputController.js';
import { CameraController } from './controllers/CameraController.js';
import { Cat } from './models/Cat.js';
import { Billboard } from './models/Billboard.js';
import { Walkway } from './models/Walkway.js';
import { ColorSelector } from './models/ColorSelector.js';
import { Coin } from './models/Coin.js';
import { Zombie } from './models/Zombie.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { Cookie } from './models/Cookie.js';
import { initializeMenu } from './menu.js';

class Game {
    constructor(options = {}) {
        const { isSoloMode = true, playerName = '', socket = null } = options;
        
        this.isSoloMode = isSoloMode;
        this.playerName = playerName;
        this.socket = socket;
        
        // Setup scene
        this.sceneSetup = new SceneSetup();
        
        // Setup controllers
        this.inputController = new InputController();
        this.cameraController = new CameraController(this.sceneSetup.camera);
        
        // Create damage overlay
        this.createDamageOverlay();
        
        // Create game objects
        this.createGameObjects();
        
        // Setup score and FPS
        this.score = 0;
        this.scoreDiv = document.getElementById("score");
        this.fpsDiv = document.getElementById("fps");
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Start animation loop
        this.lastTime = 0;

        // Zombie parameters
        this.zombies = [];
        this.maxZombies = 15;
        this.zombieSpawnInterval = 2000;
        this.lastZombieSpawn = 0;
        this.spawnRadius = 50;
        this.gameStartTime = Date.now();
        this.difficultyIncreaseInterval = 30000;
        this.zombieLevel = 1;
        this.zombiesKilled = 0;
        this.lastBossSpawn = 0;
        this.bossSpawnInterval = 45000;
        this.isMouseDown = false;

        // Cookie parameters
        this.cookies = [];
        this.maxCookies = 10;
        this.cookieSpawnInterval = 5000;
        this.lastCookieSpawn = 0;
        this.cookieSpawnRange = 100;

        // Create powerup status display
        this.setupPowerupDisplay();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize multiplayer if needed
        if (!this.isSoloMode) {
            this.initializeMultiplayer();
        }

        // Start game systems
        this.spawnZombie();
        this.spawnCookies();
        this.animate(0);
    }

    createDamageOverlay() {
        // Create damage overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.0)';
        overlay.style.pointerEvents = 'none';
        overlay.style.transition = 'background-color 0.1s ease-out';
        overlay.style.zIndex = '1000';
        document.body.appendChild(overlay);
        this.damageOverlay = overlay;
    }

    showDamageEffect() {
        this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
            this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.0)';
        }, 100);
    }

    setupPowerupDisplay() {
        this.powerupDiv = document.createElement("div");
        this.powerupDiv.style.position = "fixed";
        this.powerupDiv.style.left = "20px";
        this.powerupDiv.style.top = "50%";
        this.powerupDiv.style.transform = "translateY(-50%)";
        this.powerupDiv.style.color = "white";
        this.powerupDiv.style.fontFamily = "Arial, sans-serif";
        this.powerupDiv.style.fontSize = "18px";
        this.powerupDiv.style.textShadow = "2px 2px 2px black";
        document.body.appendChild(this.powerupDiv);
    }

    setupEventListeners() {
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.isMouseDown = true;
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isMouseDown = false;
        });
    }

    initializeMultiplayer() {
        if (!this.socket) return;

        // Store other players
        this.otherPlayers = new Map();
        this.zombieMap = new Map();

        // Update connection status immediately
        const connectionStatus = document.getElementById('connection-status');
        connectionStatus.textContent = 'Connected';
        connectionStatus.style.color = '#4CAF50';

        // Handle initial game state
        this.socket.on('game_state', (state) => {
            // Handle existing players
            state.players.forEach(player => {
                if (player.id !== this.socket.id) {
                    this.addOtherPlayer(player);
                }
            });

            // Handle existing zombies
            state.zombies.forEach(zombie => {
                this.addZombie(zombie);
            });
        });
        
        // Handle new player joining
        this.socket.on('player_joined', (player) => {
            if (player.id !== this.socket.id) {
                this.addOtherPlayer(player);
            }
        });

        // Handle player movement
        this.socket.on('player_moved', (data) => {
            const otherCat = this.otherPlayers.get(data.id);
            if (otherCat) {
                otherCat.group.position.lerp(new THREE.Vector3(
                    data.position.x,
                    data.position.y,
                    data.position.z
                ), 0.3);
                otherCat.group.rotation.y = data.rotation.y;
            }
        });

        // Handle player color change
        this.socket.on('player_color_changed', (data) => {
            if (data.id === this.socket.id) {
                this.cat.setColor(parseInt(data.color.replace('#', '0x')));
            } else {
                const otherCat = this.otherPlayers.get(data.id);
                if (otherCat) {
                    otherCat.setColor(parseInt(data.color.replace('#', '0x')));
                }
            }
        });

        // Handle player shots
        this.socket.on('player_shot', (data) => {
            const otherCat = this.otherPlayers.get(data.id);
            if (otherCat) {
                otherCat.shootLaser();
            }
        });
        
        // Handle zombie spawning
        this.socket.on('zombie_spawned', (zombie) => {
            this.addZombie(zombie);
        });

        // Handle zombie health updates
        this.socket.on('zombie_health_update', (data) => {
            const zombie = this.zombieMap.get(data.id);
            if (zombie) {
                zombie.health = data.health;
            }
        });

        // Handle zombie death
        this.socket.on('zombie_died', (zombieId) => {
            const zombie = this.zombieMap.get(zombieId);
            if (zombie) {
                this.sceneSetup.scene.remove(zombie.group);
                this.zombieMap.delete(zombieId);
                this.zombies = this.zombies.filter(z => z !== zombie);
                this.zombiesKilled++;
                this.scoreDiv.textContent = "Zombies Killed: " + this.zombiesKilled;
            }
        });
        
        // Handle player disconnection
        this.socket.on('player_left', (playerId) => {
            const otherCat = this.otherPlayers.get(playerId);
            if (otherCat) {
                this.sceneSetup.scene.remove(otherCat.group);
                this.otherPlayers.delete(playerId);
            }
        });

        // Send initial player data
        this.socket.emit('join', {
            name: this.playerName,
            position: this.cat.group.position,
            rotation: { y: this.cat.group.rotation.y },
            color: '#' + Math.floor(Math.random()*16777215).toString(16)
        });

        // Setup periodic position updates
        setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('player_move', {
                    position: this.cat.group.position,
                    rotation: { y: this.cat.group.rotation.y }
                });
            }
        }, 50);
    }

    addOtherPlayer(player) {
        const otherCat = new Cat(player.name);
        otherCat.group.position.set(player.position.x, player.position.y, player.position.z);
        otherCat.group.rotation.y = player.rotation.y;
        otherCat.setColor(parseInt(player.color.replace('#', '0x')));
        this.otherPlayers.set(player.id, otherCat);
        this.sceneSetup.add(otherCat.group);
        this.updatePlayerCount(this.otherPlayers.size + 1);
    }

    addZombie(zombieData) {
        const zombie = new Zombie(
            new THREE.Vector3(zombieData.position.x, zombieData.position.y, zombieData.position.z),
            zombieData.level,
            zombieData.isBoss
        );
        zombie.health = zombieData.health;
        this.zombieMap.set(zombieData.id, zombie);
        this.zombies.push(zombie);
        this.sceneSetup.add(zombie.group);
    }

    spawnZombie(isBoss = false) {
        if (!this.isSoloMode) {
            // In multiplayer, only spawn if we're the first player
            if (this.socket.id !== Array.from(this.otherPlayers.keys())[0]) {
                return;
            }
        }

        if (this.zombies.length < this.maxZombies || isBoss) {
            const angle = Math.random() * Math.PI * 2;
            const position = new THREE.Vector3(
                Math.cos(angle) * this.spawnRadius,
                0,
                Math.sin(angle) * this.spawnRadius
            );
            position.add(this.cat.group.position);

            if (this.isSoloMode) {
                const zombie = new Zombie(position, this.zombieLevel, isBoss);
                this.zombies.push(zombie);
                this.sceneSetup.add(zombie.group);
            } else {
                // In multiplayer, emit spawn event
                this.socket.emit('spawn_zombie', {
                    position: position,
                    level: this.zombieLevel,
                    isBoss: isBoss,
                    health: isBoss ? 500 + this.zombieLevel * 100 : 100 + this.zombieLevel * 20
                });
            }
        }
    }

    shootLaser() {
        this.cat.shootLaser();
        this.cat.lasers.forEach(laser => this.sceneSetup.add(laser));

        // Emit shoot event in multiplayer
        if (!this.isSoloMode && this.socket) {
            this.socket.emit('player_shoot', {
                position: this.cat.group.position,
                direction: this.cat.group.rotation
            });
        }
    }

    spawnCookies() {
        if (this.cookies.length < this.maxCookies) {
            const cookie = new Cookie(new THREE.Vector3(
                (Math.random() - 0.5) * this.cookieSpawnRange,
                0.5,
                (Math.random() - 0.5) * this.cookieSpawnRange
            ));
            this.cookies.push(cookie);
            this.sceneSetup.add(cookie.group);
        }
    }

    updateCookies(dt) {
        const now = Date.now();

        // Spawn new cookies
        if (now - this.lastCookieSpawn > this.cookieSpawnInterval) {
            this.spawnCookies();
            this.lastCookieSpawn = now;
        }

        // Update existing cookies
        for (let i = this.cookies.length - 1; i >= 0; i--) {
            const cookie = this.cookies[i];
            cookie.update(dt);

            // Check for collection
            const cookieBox = new THREE.Box3().setFromObject(cookie.group);
            if (cookieBox.intersectsBox(new THREE.Box3().setFromObject(this.cat.group))) {
                cookie.applyPowerup(this.cat);
                this.sceneSetup.scene.remove(cookie.group);
                this.cookies.splice(i, 1);
            }
        }
    }

    updateZombies(dt) {
        const now = Date.now();

        // Increase difficulty over time
        const timeSinceStart = now - this.gameStartTime;
        const difficultyLevel = Math.floor(timeSinceStart / this.difficultyIncreaseInterval);
        
        if (difficultyLevel > this.zombieLevel - 1) {
            this.zombieLevel = difficultyLevel + 1;
            this.maxZombies = 15 + Math.floor(difficultyLevel * 3);
            this.zombieSpawnInterval = Math.max(1000, 2000 - difficultyLevel * 100);
        }

        // Spawn new zombies if needed
        if (now - this.lastZombieSpawn > this.zombieSpawnInterval) {
            const spawnCount = Math.min(3, this.maxZombies - this.zombies.length);
            for (let i = 0; i < spawnCount; i++) {
                this.spawnZombie();
            }
            this.lastZombieSpawn = now;
        }

        // Spawn boss zombie
        if (now - this.lastBossSpawn > this.bossSpawnInterval) {
            this.spawnZombie(true);
            this.lastBossSpawn = now;
        }

        // Update existing zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            zombie.update(dt, this.cat.group.position, this.sceneSetup.camera.position);

            // Check for collision with cat
            if (zombie.collisionBox.intersectsBox(new THREE.Box3().setFromObject(this.cat.group))) {
                if (zombie.canAttack()) {
                    this.cat.takeDamage(zombie.damage);
                    this.showDamageEffect();
                }
            }

            // Check for laser hits
            for (let j = this.cat.lasers.length - 1; j >= 0; j--) {
                const laser = this.cat.lasers[j];
                if (zombie.collisionBox.containsPoint(laser.position)) {
                    zombie.takeDamage(laser.userData.damage);
                    this.sceneSetup.scene.remove(laser);
                    this.cat.lasers.splice(j, 1);

                    // In multiplayer, emit zombie damage
                    if (!this.isSoloMode) {
                        const zombieId = Array.from(this.zombieMap.entries())
                            .find(([_, z]) => z === zombie)?.[0];
                        if (zombieId) {
                            this.socket.emit('zombie_damaged', {
                                zombieId: zombieId,
                                health: zombie.health
                            });
                        }
                    }
                }
            }

            // Remove dead zombies
            if (zombie.health <= 0) {
                if (this.isSoloMode) {
                    this.sceneSetup.scene.remove(zombie.group);
                    this.zombies.splice(i, 1);
                    this.zombiesKilled++;
                    this.scoreDiv.textContent = "Zombies Killed: " + this.zombiesKilled;
                }
                // In multiplayer, zombie removal is handled by the 'zombie_died' event
            }
        }
    }

    updatePowerups() {
        const now = Date.now();
        let powerupText = "<strong>Active Powerups:</strong><br>";
        
        // Update and clean expired powerups
        for (let i = this.cat.activePowerups.length - 1; i >= 0; i--) {
            const powerup = this.cat.activePowerups[i];
            const timeLeft = Math.ceil((powerup.endTime - now) / 1000);
            
            if (timeLeft <= 0) {
                if (powerup.cleanup) {
                    powerup.cleanup();
                }
                this.cat.activePowerups.splice(i, 1);
            } else {
                powerupText += `${powerup.name}: ${timeLeft}s<br>`;
            }
        }
        
        if (this.cat.activePowerups.length === 0) {
            powerupText += "None";
        }
        
        this.powerupDiv.innerHTML = powerupText;
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        // Update other players
        if (this.otherPlayers) {
            this.otherPlayers.forEach(otherCat => {
                otherCat.update(dt, new THREE.Vector3(), this.sceneSetup.camera.position, this.sceneSetup.scene);
            });
        }

        // Handle continuous laser firing
        if (this.isMouseDown) {
            this.shootLaser();
        }

        // Update FPS counter
        this.frameCount++;
        if (time - this.lastFpsUpdate > 1000) {
            this.fpsDiv.textContent = `FPS: ${this.frameCount}`;
            this.frameCount = 0;
            this.lastFpsUpdate = time;
        }

        // Update mirror environment map
        if (this.updateMirror) {
            this.updateMirror();
        }

        // Update collision boxes
        this.billboard.updateCollisionBoxes();
        this.walkway.updateCollisionBox();

        // Update cookies
        this.updateCookies(dt);

        // Check collisions
        const catBox = new THREE.Box3().setFromObject(this.cat.group);
        
        // Initialize collision states
        let isOnLadder = false;
        let isOnPlatform = false;
        let isOnTrampoline = false;
        let isCollidingWithPole = false;
        let isOnWalkway = false;

        // Safely check each collision box
        if (this.billboard.ladderBox) {
            isOnLadder = catBox.intersectsBox(this.billboard.ladderBox);
        }
        if (this.billboard.platformBox) {
            isOnPlatform = catBox.intersectsBox(this.billboard.platformBox);
        }
        if (this.billboard.trampolineBox && this.billboard.updateTrampolineBox) {
            this.billboard.updateTrampolineBox();
            isOnTrampoline = catBox.intersectsBox(this.billboard.trampolineBox);
        }
        if (this.billboard.poleBox) {
            isCollidingWithPole = catBox.intersectsBox(this.billboard.poleBox);
        }
        if (this.walkway.walkwayBox) {
            isOnWalkway = catBox.intersectsBox(this.walkway.walkwayBox);
        }

        // Handle ladder climbing
        if (isOnLadder && this.inputController.moveKeys.forward) {
            this.cat.group.position.y += 5 * dt;
            this.cat.group.position.z = this.billboard.group.position.z + 2.3;
            this.cat.group.userData.velocityY = 0;
            this.cat.group.userData.isJumping = false;
        } 
        // Handle platform collision
        else if (isOnPlatform) {
            this.cat.group.userData.velocityY = 0;
            this.cat.group.userData.isJumping = false;
            this.cat.group.position.y = 41;
            if (this.inputController.moveKeys.Space) {
                this.cat.group.userData.velocityY = 12;
                this.cat.group.userData.isJumping = true;
            }
        } 
        // Handle trampoline
        else if (isOnTrampoline) {
            // If we're landing on the trampoline or already bouncing
            if (this.cat.group.position.y <= 2.25) {
                this.cat.group.position.y = 2.25;
                // Much higher bounce velocity for more fun!
                this.cat.group.userData.velocityY = 30;
                this.cat.group.userData.isJumping = true;
            }
            // Apply gravity while in the air
            this.cat.group.position.y += this.cat.group.userData.velocityY * dt;
            this.cat.group.userData.velocityY += -30 * dt;
        } 
        // Handle normal gravity
        else if (!isOnLadder && !isOnPlatform) {
            this.cat.group.position.y += this.cat.group.userData.velocityY * dt;
            this.cat.group.userData.velocityY += -30 * dt;
            if (this.cat.group.position.y <= 0) {
                this.cat.group.position.y = 0;
                this.cat.group.userData.velocityY = 0;
                this.cat.group.userData.isJumping = false;
                
                // Check for jump input when on ground
                if (this.inputController.moveKeys.Space) {
                    // Increased initial jump velocity for higher jumps
                    this.cat.group.userData.velocityY = 15;
                    this.cat.group.userData.isJumping = true;
                }
            }
        }

        // Handle pole collision
        if (isCollidingWithPole) {
            const poleCenterX = this.billboard.group.position.x;
            const poleCenterZ = this.billboard.group.position.z;
            const dx = this.cat.group.position.x - poleCenterX;
            const dz = this.cat.group.position.z - poleCenterZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 2.5) {
                const angle = Math.atan2(dz, dx);
                this.cat.group.position.x = poleCenterX + Math.cos(angle) * 2.5;
                this.cat.group.position.z = poleCenterZ + Math.sin(angle) * 2.5;
            }
        }

        // Handle walkway movement
        if (isOnWalkway) {
            const movement = new THREE.Vector3(0, 0, -8 * dt);
            this.cat.group.position.add(movement);
        }

        // Update zombies
        this.updateZombies(dt);

        // Update camera and cat movement
        const yaw = this.cameraController.update(dt, this.cat.group, this.inputController);
        this.cat.group.rotation.y = yaw;
        const movement = this.calculateMovement(dt, yaw);
        this.cat.update(dt, movement, this.sceneSetup.camera.position, this.sceneSetup.scene);

        // Update walkway animation
        this.walkway.update(dt);

        // Check color selector collision
        this.colorSelector.checkCollision(catBox, this.cat);

        // Update powerups status
        this.updatePowerups();

        // Render scene
        this.sceneSetup.render();
    }

    calculateMovement(dt, yaw) {
        const movement = new THREE.Vector3(0, 0, 0);
        
        // Get camera direction vectors
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const rightVector = new THREE.Vector3(1, 0, 0);
        rightVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

        // Apply movement based on input
        if (this.inputController.moveKeys.forward) {
            movement.add(cameraDirection.clone().multiplyScalar(this.cat.moveSpeed * dt));
        }
        if (this.inputController.moveKeys.backward) {
            movement.add(cameraDirection.clone().multiplyScalar(-this.cat.moveSpeed * dt));
        }
        if (this.inputController.moveKeys.left) {
            movement.add(rightVector.clone().multiplyScalar(-this.cat.strafeSpeed * dt));
        }
        if (this.inputController.moveKeys.right) {
            movement.add(rightVector.clone().multiplyScalar(this.cat.strafeSpeed * dt));
        }

        return movement;
    }

    updatePlayerCount(count) {
        const playersDiv = document.getElementById('players');
        if (playersDiv) {
            playersDiv.textContent = `Players Online: ${count}/5`;
        }
    }

    createGameObjects() {
        // Create cat (player)
        this.cat = new Cat(this.playerName);
        this.cat.activePowerups = []; // Initialize powerups array
        this.sceneSetup.add(this.cat.group);

        // Create mirror
        this.createMirror();

        // Create billboard with instructions
        this.billboard = new Billboard();
        this.billboard.group.position.set(0, 0, -60);
        this.sceneSetup.add(this.billboard.group);

        // Create moving walkway
        this.walkway = new Walkway();
        this.walkway.group.position.set(0, 0, -30);
        this.walkway.group.rotation.y = Math.PI/2;
        this.sceneSetup.add(this.walkway.group);

        // Create color selector
        this.colorSelector = new ColorSelector();
        this.colorSelector.group.position.set(8, 0, -30);
        this.colorSelector.group.rotation.y = Math.PI/2;
        this.sceneSetup.add(this.colorSelector.group);
    }

    createMirror() {
        // Create mirror frame
        const frameGeometry = new THREE.BoxGeometry(20, 12, 0.3);
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            metalness: 0.5,
            roughness: 0.2
        });
        this.mirrorFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        this.mirrorFrame.position.set(25, 3, -40);
        this.mirrorFrame.rotation.y = Math.PI/2;
        this.sceneSetup.add(this.mirrorFrame);

        // Create mirror surface
        const geometry = new THREE.PlaneGeometry(19, 11);
        const mirrorMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 1.0,
            roughness: 0.0,
            reflectivity: 1.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            side: THREE.DoubleSide
        });

        this.mirror = new THREE.Mesh(geometry, mirrorMaterial);
        this.mirror.position.copy(this.mirrorFrame.position);
        this.mirror.position.x -= 0.2;
        this.mirror.rotation.y = Math.PI/2;
        this.sceneSetup.add(this.mirror);

        // Add environment map to enhance reflection
        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512);
        const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
        this.mirror.material.envMap = cubeRenderTarget.texture;
        
        // Update environment map in animation loop
        this.updateMirror = () => {
            this.mirror.visible = false;
            cubeCamera.position.copy(this.mirror.position);
            cubeCamera.update(this.sceneSetup.renderer, this.sceneSetup.scene);
            this.mirror.visible = true;
        };
    }
}

// Initialize menu system
document.addEventListener('DOMContentLoaded', () => {
    initializeMenu();
});

// Export game initialization function
export function initGame(options) {
    // Remove any existing game instance
    const existingPowerupDiv = document.querySelector('div[style*="position: fixed"]');
    if (existingPowerupDiv) {
        existingPowerupDiv.remove();
    }

    // Create new game instance
    new Game(options);
} 