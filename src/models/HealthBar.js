import * as THREE from 'three';

export class HealthBar {
    constructor(maxHealth, playerName = '') {
        this.group = new THREE.Group();
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.width = 1;
        this.height = 0.1;
        this.playerName = playerName;
        this.createHealthBar();
        if (playerName) {
            this.createNameTag(playerName);
        }
    }

    createHealthBar() {
        // Background (black)
        const bgGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.background = new THREE.Mesh(bgGeometry, bgMaterial);
        this.group.add(this.background);

        // Health bar (green)
        const barGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.bar = new THREE.Mesh(barGeometry, barMaterial);
        this.bar.position.z = 0.01; // Slightly in front of background
        this.group.add(this.bar);

        // Make health bar always face camera
        this.group.rotation.x = -Math.PI / 4;
    }

    createNameTag(name) {
        // Create canvas for the name tag
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Set text style
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.lineWidth = 4;

        // Draw text with outline
        context.strokeText(name, canvas.width/2, canvas.height/2);
        context.fillText(name, canvas.width/2, canvas.height/2);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        
        // Create sprite material
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });

        // Create sprite
        this.nameSprite = new THREE.Sprite(spriteMaterial);
        this.nameSprite.scale.set(2, 0.5, 1);
        this.nameSprite.position.y = 0.5; // Position above health bar
        
        this.group.add(this.nameSprite);
    }

    setName(name) {
        if (name !== this.playerName) {
            this.playerName = name;
            if (this.nameSprite) {
                this.group.remove(this.nameSprite);
            }
            this.createNameTag(name);
        }
    }

    update(health, cameraPosition) {
        // Update health bar scale
        const healthPercent = Math.max(0, Math.min(1, health / this.maxHealth));
        this.bar.scale.x = healthPercent;
        this.bar.position.x = -(this.width * (1 - healthPercent)) / 2;

        // Update color based on health
        if (healthPercent > 0.6) {
            this.bar.material.color.setHex(0x00ff00); // Green
        } else if (healthPercent > 0.3) {
            this.bar.material.color.setHex(0xffff00); // Yellow
        } else {
            this.bar.material.color.setHex(0xff0000); // Red
        }

        // Make health bar and name tag face camera
        this.group.lookAt(cameraPosition);
        this.group.rotation.x = -Math.PI / 4;
        if (this.nameSprite) {
            this.nameSprite.lookAt(cameraPosition);
        }
    }
} 