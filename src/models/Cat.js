import * as THREE from 'three';
import { HealthBar } from './HealthBar.js';

export class Cat {
    constructor(playerName = '') {
        this.group = new THREE.Group();
        this.group.position.y = 0;
        this.group.userData.velocityY = 0;
        this.group.userData.isJumping = false;

        // Movement parameters
        this.moveSpeed = 10;
        this.strafeSpeed = 8;
        this.walkCycle = 0;
        this.legAmplitude = 0.3;

        // Combat parameters
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 1; // seconds
        this.spawnPoint = new THREE.Vector3(0, 0, 0);
        
        // Laser parameters
        this.laserDamage = 25;
        this.laserSpeed = 50;
        this.lasers = [];
        this.laserCooldown = 0.1; // Reduced cooldown for rapid fire
        this.lastLaserTime = 0;
        this.eyePositions = [
            new THREE.Vector3(-0.2, 0.1, -0.4), // Left eye relative to head
            new THREE.Vector3(0.2, 0.1, -0.4)   // Right eye relative to head
        ];

        // Create health bar with player name
        this.healthBar = new HealthBar(this.maxHealth, playerName);
        this.healthBar.group.position.y = 3;
        this.group.add(this.healthBar.group);

        this.createCatModel();
    }

    createCatModel() {
        // Colors
        const baseColor = 0xd3d3d3;   // light grey
        const stripeColor = 0x000000; // black

        // Create sub-group for body parts
        const legHeight = 0.5;
        this.catBody = new THREE.Group();
        this.catBody.position.y = legHeight;
        this.group.add(this.catBody);

        // Body
        const bodyWidth = 1.2, bodyHeight = 0.7, bodyDepth = 1.5;
        const bodyGeom = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
        this.bodyMesh = new THREE.Mesh(bodyGeom, new THREE.MeshLambertMaterial({ color: baseColor }));
        this.bodyMesh.position.y = bodyHeight/2;
        this.catBody.add(this.bodyMesh);

        // Create all body parts...
        this.createStripes(bodyDepth, baseColor, stripeColor);
        this.createLegs(legHeight, baseColor);
        this.createHead(bodyHeight, bodyDepth, baseColor, stripeColor);
        this.createTail(bodyHeight, bodyDepth, baseColor);
    }

    createStripes(bodyDepth, baseColor, stripeColor) {
        const stripeGeom = new THREE.BoxGeometry(0.1, 0.02, bodyDepth * 0.9);
        const stripeMat = new THREE.MeshLambertMaterial({ color: stripeColor });
        
        const leftStripe = new THREE.Mesh(stripeGeom, stripeMat);
        leftStripe.position.set(-0.3, this.bodyMesh.position.y * 0.8, 0);
        
        const rightStripe = new THREE.Mesh(stripeGeom, stripeMat);
        rightStripe.position.set(0.3, this.bodyMesh.position.y * 0.8, 0);
        
        this.catBody.add(leftStripe, rightStripe);
    }

    createLegs(legHeight, baseColor) {
        const legWidth = 0.15, legDepth = 0.15;
        const legGeom = new THREE.BoxGeometry(legWidth, legHeight, legDepth);
        legGeom.translate(0, -legHeight/2, 0);
        const legMat = new THREE.MeshLambertMaterial({ color: baseColor });

        const marginX = 0.2, marginZ = 0.2;
        const frontZ = -0.75 + marginZ;
        const backZ = 0.75 - marginZ;
        const leftX = -0.6 + marginX;
        const rightX = 0.6 - marginX;

        this.frontLeftLeg = new THREE.Mesh(legGeom, legMat);
        this.frontRightLeg = new THREE.Mesh(legGeom, legMat);
        this.backLeftLeg = new THREE.Mesh(legGeom, legMat);
        this.backRightLeg = new THREE.Mesh(legGeom, legMat);

        this.frontLeftLeg.position.set(leftX, 0, frontZ);
        this.frontRightLeg.position.set(rightX, 0, frontZ);
        this.backLeftLeg.position.set(leftX, 0, backZ);
        this.backRightLeg.position.set(rightX, 0, backZ);

        this.catBody.add(this.frontLeftLeg, this.frontRightLeg, this.backLeftLeg, this.backRightLeg);
    }

    createHead(bodyHeight, bodyDepth, baseColor, stripeColor) {
        const headSize = 0.8;
        const headGeom = new THREE.BoxGeometry(headSize, headSize, headSize);
        this.headMesh = new THREE.Mesh(headGeom, new THREE.MeshLambertMaterial({ color: baseColor }));
        this.headMesh.position.set(0, bodyHeight + headSize/2 - 0.1, -bodyDepth/2 - headSize/2 + 0.1);
        this.catBody.add(this.headMesh);

        // Add facial features
        this.addFacialFeatures(headSize, stripeColor);
    }

    addFacialFeatures(headSize, stripeColor) {
        // Eyes
        const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const eyeWhiteGeom = new THREE.SphereGeometry(0.03, 8, 8);
        const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
        leftEye.position.set(-0.2, 0.1, -headSize/2 - 0.01);
        rightEye.position.set(0.2, 0.1, -headSize/2 - 0.01);

        const leftEyeWhite = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
        const rightEyeWhite = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
        leftEyeWhite.position.set(0.02, 0, 0.02);
        rightEyeWhite.position.set(0.02, 0, 0.02);

        leftEye.add(leftEyeWhite);
        rightEye.add(rightEyeWhite);
        this.headMesh.add(leftEye, rightEye);

        // Add other facial features (nose, mouth, whiskers)
        this.addNoseAndMouth(headSize);
        this.addWhiskers(headSize);
    }

    addNoseAndMouth(headSize) {
        // Nose
        const noseGeom = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const noseMat = new THREE.MeshLambertMaterial({ color: 0xFFA07A });
        const nose = new THREE.Mesh(noseGeom, noseMat);
        nose.position.set(0, -0.1, -headSize/2 - 0.05);
        this.headMesh.add(nose);

        // Mouth
        const mouthGroup = new THREE.Group();
        const mouthGeom = new THREE.BoxGeometry(0.05, 0.02, 0.01);
        const mouthMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const mouthSegments = 5;
        for(let i = 0; i < mouthSegments; i++) {
            const segment = new THREE.Mesh(mouthGeom, mouthMat);
            const angle = (i - (mouthSegments-1)/2) * 0.2;
            segment.position.set(angle * 0.8, -Math.abs(angle * 0.3) - 0.2, -headSize/2 - 0.02);
            mouthGroup.add(segment);
        }
        this.headMesh.add(mouthGroup);
    }

    addWhiskers(headSize) {
        const whiskerGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.3, 8);
        const whiskerMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        // Left whiskers
        for(let i = 0; i < 3; i++) {
            const whisker = new THREE.Mesh(whiskerGeom, whiskerMat);
            whisker.rotation.z = Math.PI/2 + (i-1) * 0.2;
            whisker.position.set(-0.3, -0.15 + i*0.08, -headSize/2 - 0.02);
            this.headMesh.add(whisker);
        }
        
        // Right whiskers
        for(let i = 0; i < 3; i++) {
            const whisker = new THREE.Mesh(whiskerGeom, whiskerMat);
            whisker.rotation.z = -Math.PI/2 + (i-1) * 0.2;
            whisker.position.set(0.3, -0.15 + i*0.08, -headSize/2 - 0.02);
            this.headMesh.add(whisker);
        }
    }

    createTail(bodyHeight, bodyDepth, baseColor) {
        const tailLength = 1.0;
        const tailGeom = new THREE.BoxGeometry(0.15, 0.15, tailLength);
        tailGeom.translate(0, 0, tailLength/2);
        this.tailMesh = new THREE.Mesh(tailGeom, new THREE.MeshLambertMaterial({ color: baseColor }));
        this.tailMesh.position.set(0, bodyHeight * 0.75, bodyDepth/2 + 0.1);
        this.catBody.add(this.tailMesh);
    }

    takeDamage(amount) {
        if (!this.isInvulnerable) {
            this.health = Math.max(0, this.health - amount);
            this.isInvulnerable = true;
            
            // Reset invulnerability after delay
            setTimeout(() => {
                this.isInvulnerable = false;
            }, this.invulnerabilityTime * 1000);

            if (this.health <= 0) {
                this.respawn();
            }
        }
    }

    respawn() {
        this.health = this.maxHealth;
        this.group.position.copy(this.spawnPoint);
        this.group.userData.velocityY = 0;
        this.group.userData.isJumping = false;
    }

    shootLaser() {
        const now = Date.now();
        if (now - this.lastLaserTime < this.laserCooldown * 1000) return;
        this.lastLaserTime = now;

        // Create laser beams from both eyes
        const laserGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        laserGeometry.rotateX(Math.PI / 2);
        const laserMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 2
        });

        this.eyePositions.forEach(eyePos => {
            // Convert eye position from head-local to world coordinates
            const worldEyePos = eyePos.clone();
            worldEyePos.add(this.headMesh.position); // Add head offset
            worldEyePos.applyMatrix4(this.catBody.matrixWorld); // Transform to world space

            const laser = new THREE.Mesh(laserGeometry, laserMaterial);
            laser.position.copy(worldEyePos);

            // Set laser direction based on cat's facing direction
            laser.direction = new THREE.Vector3(0, 0, -1);
            laser.direction.applyQuaternion(this.group.quaternion);
            laser.direction.normalize();

            // Align laser with direction
            laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), laser.direction);
            
            laser.userData.damage = this.laserDamage;
            this.lasers.push(laser);
        });
    }

    updateLasers(dt, scene) {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            const movement = laser.direction.clone().multiplyScalar(this.laserSpeed * dt);
            laser.position.add(movement);
            
            // Remove lasers that have traveled too far
            if (laser.position.distanceTo(this.group.position) > 100) {
                scene.remove(laser);
                this.lasers.splice(i, 1);
            }
        }
    }

    update(dt, movement, cameraPosition, scene) {
        // Update health bar
        this.healthBar.update(this.health, cameraPosition);

        // Update lasers
        this.updateLasers(dt, scene);

        // Apply movement
        if (movement.length() > 0) {
            this.group.position.add(movement);
            this.walkCycle += movement.length();
            this.animateLegs();
        } else {
            this.resetLegs();
        }

        // Animate tail
        this.animateTail(movement);
    }

    animateLegs() {
        if (!this.group.userData.isJumping) {
            this.frontLeftLeg.rotation.x = Math.sin(this.walkCycle * 2) * this.legAmplitude;
            this.backRightLeg.rotation.x = Math.sin(this.walkCycle * 2) * this.legAmplitude;
            this.frontRightLeg.rotation.x = -Math.sin(this.walkCycle * 2) * this.legAmplitude;
            this.backLeftLeg.rotation.x = -Math.sin(this.walkCycle * 2) * this.legAmplitude;
        }
    }

    resetLegs() {
        this.frontLeftLeg.rotation.x = 0;
        this.frontRightLeg.rotation.x = 0;
        this.backLeftLeg.rotation.x = 0;
        this.backRightLeg.rotation.x = 0;
    }

    animateTail(movement) {
        if (this.group.userData.isJumping) {
            this.tailMesh.rotation.x = -Math.PI/2;
        } else if (movement.length() > 0) {
            this.tailMesh.rotation.x = Math.sin(this.walkCycle * 2) * 0.3;
        } else {
            this.tailMesh.rotation.x = 0;
        }
    }

    jump() {
        if (!this.group.userData.isJumping) {
            this.group.userData.velocityY = 12;
            this.group.userData.isJumping = true;
        }
    }

    setColor(color) {
        const newMaterial = new THREE.MeshLambertMaterial({ color });
        this.bodyMesh.material.color.setHex(color);
        this.frontLeftLeg.material.color.setHex(color);
        this.frontRightLeg.material.color.setHex(color);
        this.backLeftLeg.material.color.setHex(color);
        this.backRightLeg.material.color.setHex(color);
        this.headMesh.material.color.setHex(color);
        this.tailMesh.material.color.setHex(color);
    }
} 