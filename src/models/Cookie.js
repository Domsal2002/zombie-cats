import * as THREE from 'three';

export class Cookie {
    constructor(position) {
        this.group = new THREE.Group();
        this.healAmount = 25;
        this.powerupDuration = 10000; // 10 seconds
        this.createCookie();
        if (position) {
            position.y = 1.5; // Spawn higher above ground
            this.group.position.copy(position);
        }
        this.initialY = this.group.position.y;
    }

    createCookie() {
        // Create cookie base (cylinder)
        const cookieGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const cookieMaterial = new THREE.MeshLambertMaterial({ color: 0xC4A484 }); // Cookie brown
        this.cookie = new THREE.Mesh(cookieGeometry, cookieMaterial);
        this.cookie.rotation.x = Math.PI / 2;
        
        // Add chocolate chips
        const chipGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const chipMaterial = new THREE.MeshLambertMaterial({ color: 0x3B1C0A }); // Dark chocolate
        
        for (let i = 0; i < 5; i++) {
            const chip = new THREE.Mesh(chipGeometry, chipMaterial);
            const angle = (i / 5) * Math.PI * 2;
            const radius = 0.25;
            chip.position.set(
                Math.cos(angle) * radius,
                0.05,
                Math.sin(angle) * radius
            );
            this.cookie.add(chip);
        }

        // Add glow effect
        const glowGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.3
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glow.rotation.x = Math.PI / 2;

        this.group.add(this.cookie);
        this.group.add(this.glow);

        // Animate cookie floating and spinning
        this.rotationSpeed = 1;
        this.bobSpeed = 2;
        this.bobHeight = 0.2;

        // Set random powerup type
        this.powerupType = Math.floor(Math.random() * 3); // 0: Health, 1: Speed, 2: Giant
    }

    update(dt) {
        // Spin cookie
        this.cookie.rotation.z += this.rotationSpeed * dt;
        
        // Bob up and down
        const newY = this.initialY + Math.sin(Date.now() * 0.002 * this.bobSpeed) * this.bobHeight;
        this.group.position.y = newY;
        
        // Pulse glow
        const glowScale = 1 + Math.sin(Date.now() * 0.003) * 0.2;
        this.glow.scale.set(glowScale, glowScale, 1);
    }

    static powerupNames = [
        'Extra Health',
        'Speed Boost',
        'Giant Mode'
    ];

    applyPowerup(cat) {
        // Always heal
        cat.health = Math.min(cat.maxHealth, cat.health + this.healAmount);

        const powerupEndTime = Date.now() + this.powerupDuration;
        const powerupName = Cookie.powerupNames[this.powerupType];

        // Remove existing powerup of the same type
        const existingPowerupIndex = cat.activePowerups.findIndex(p => p.type === this.powerupType);
        if (existingPowerupIndex !== -1) {
            const existingPowerup = cat.activePowerups[existingPowerupIndex];
            // Don't call cleanup for the existing powerup since we're refreshing it
            cat.activePowerups.splice(existingPowerupIndex, 1);
        }

        // Apply powerup effect
        switch(this.powerupType) {
            case 0: // Extra Health (already applied)
                cat.activePowerups.push({
                    name: powerupName,
                    endTime: powerupEndTime,
                    type: this.powerupType
                });
                break;
            case 1: // Speed Boost
                // Only apply speed boost if not already active
                if (existingPowerupIndex === -1) {
                    cat.moveSpeed *= 2;
                }
                cat.activePowerups.push({
                    name: powerupName,
                    endTime: powerupEndTime,
                    type: this.powerupType,
                    cleanup: () => {
                        cat.moveSpeed = 10; // Reset to default speed
                    }
                });
                break;
            case 2: // Giant Mode
                // Only apply giant mode if not already active
                if (existingPowerupIndex === -1) {
                    cat.group.scale.set(2, 2, 2);
                    cat.laserDamage *= 10; // Increased from 2x to 10x damage
                }
                cat.activePowerups.push({
                    name: powerupName,
                    endTime: powerupEndTime,
                    type: this.powerupType,
                    cleanup: () => {
                        cat.group.scale.set(1, 1, 1);
                        cat.laserDamage = 25; // Reset to default damage
                    }
                });
                break;
        }
    }

    static createRandomCookies(count, range) {
        const cookies = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * range;
            const z = (Math.random() - 0.5) * range;
            cookies.push(new Cookie(new THREE.Vector3(x, 0.5, z)));
        }
        return cookies;
    }
} 