import * as THREE from 'three';
import { HealthBar } from './HealthBar.js';

export class Zombie {
    constructor(position, level = 1, isBoss = false) {
        this.group = new THREE.Group();
        this.level = level;
        this.isBoss = isBoss;
        
        // Adjust stats based on whether it's a boss
        if (isBoss) {
            this.moveSpeed = 3 + level * 0.3; // Slower but stronger
            this.health = 500 + level * 100;
            this.maxHealth = this.health;
            this.damage = 50 + level * 10;
            this.attackRange = 4;
            this.scale = 3 + level * 0.2; // Much bigger
        } else {
            this.moveSpeed = 5 + level * 0.5;
            this.health = 100 + level * 20;
            this.maxHealth = this.health;
            this.damage = 20 + level * 5;
            this.attackRange = 2;
            this.scale = 1 + level * 0.1;
        }

        this.attackCooldown = 1;
        this.lastAttackTime = 0;
        this.isAttacking = false;
        this.attackDuration = 0.5;
        this.attackStartTime = 0;
        this.walkCycle = 0;
        this.swayAmount = 0.1; // Amount of side-to-side sway

        // Create health bar
        this.healthBar = new HealthBar(this.maxHealth);
        this.healthBar.group.position.y = 3 * this.scale; // Adjust health bar position for scale
        if (this.isBoss) {
            this.healthBar.group.scale.set(2, 2, 1); // Make boss health bar bigger
        }
        this.group.add(this.healthBar.group);

        this.createZombie();
        if (position) {
            this.group.position.copy(position);
        }
    }

    createZombie() {
        // Body color changes for boss
        const zombieColor = this.isBoss ? 0x8B0000 : 0x2d5a27; // Dark red for boss, dark green for normal

        // Body
        const bodyGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: zombieColor });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1.4;
        this.group.add(this.body);

        // Head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: zombieColor });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 2.3;
        this.group.add(this.head);

        // Eyes (glowing red for boss)
        const eyeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
        const eyeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff0000,
            emissive: this.isBoss ? 0xff0000 : 0,
            emissiveIntensity: this.isBoss ? 2 : 0
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 2.3, 0.4);
        this.group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 2.3, 0.4);
        this.group.add(rightEye);

        // Arms
        const armGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
        const armMaterial = new THREE.MeshLambertMaterial({ color: zombieColor });
        
        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-0.8, 1.6, 0);
        this.group.add(this.leftArm);
        
        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(0.8, 1.6, 0);
        this.group.add(this.rightArm);

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
        const legMaterial = new THREE.MeshLambertMaterial({ color: zombieColor });
        
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.4, 0.6, 0);
        this.group.add(this.leftLeg);
        
        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.4, 0.6, 0);
        this.group.add(this.rightLeg);

        // Create collision box
        this.collisionBox = new THREE.Box3();

        // Scale the zombie
        this.group.scale.set(this.scale, this.scale, this.scale);

        // Add boss crown if it's a boss
        if (this.isBoss) {
            const crownGeometry = new THREE.ConeGeometry(0.4, 0.6, 4);
            const crownMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 }); // Gold
            const crown = new THREE.Mesh(crownGeometry, crownMaterial);
            crown.position.set(0, 3, 0);
            this.group.add(crown);
        }
    }

    update(dt, targetPosition, cameraPosition) {
        // Update health bar
        this.healthBar.update(this.health, cameraPosition);

        // Update collision box
        this.collisionBox.setFromObject(this.group);

        const distanceToTarget = this.group.position.distanceTo(targetPosition);

        // Move towards target if not attacking and not too close
        if (!this.isAttacking && distanceToTarget > this.attackRange) {
            const direction = new THREE.Vector3()
                .subVectors(targetPosition, this.group.position)
                .normalize();
            
            // Keep y-position constant to stay on ground
            direction.y = 0;
            
            this.group.position.add(direction.multiplyScalar(this.moveSpeed * dt));
            
            // Ensure zombie stays at ground level
            this.group.position.y = 0;
            
            // Make zombie look at target but only rotate on Y axis
            const lookAtPos = targetPosition.clone();
            lookAtPos.y = this.group.position.y;
            this.group.lookAt(lookAtPos);

            // Update walk cycle
            this.walkCycle += dt * 5;

            // Walking animation with improved fluidity
            const legAngle = Math.sin(this.walkCycle) * 0.5;
            const armAngle = Math.sin(this.walkCycle) * 0.7;
            const bodyTilt = Math.sin(this.walkCycle) * 0.1;
            const sway = Math.sin(this.walkCycle * 2) * this.swayAmount;

            // Leg movement
            this.leftLeg.rotation.x = legAngle;
            this.rightLeg.rotation.x = -legAngle;

            // Arm movement (opposite to legs)
            this.leftArm.rotation.x = -armAngle;
            this.rightArm.rotation.x = armAngle;
            this.leftArm.rotation.z = sway;
            this.rightArm.rotation.z = -sway;

            // Body and head movement
            this.body.rotation.z = bodyTilt;
            this.head.rotation.z = -bodyTilt * 0.5;

            // Keep body at constant height but add slight bob
            this.body.position.y = 1.4 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.1;
        }

        // Handle attack animation
        if (this.isAttacking) {
            const attackProgress = (Date.now() - this.attackStartTime) / (this.attackDuration * 1000);
            
            if (attackProgress <= 1) {
                // More dynamic attack animation
                const armRotation = Math.sin(attackProgress * Math.PI) * Math.PI * 0.7;
                const bodyLean = Math.sin(attackProgress * Math.PI) * 0.2;
                
                this.leftArm.rotation.x = armRotation;
                this.rightArm.rotation.x = armRotation;
                this.body.rotation.x = bodyLean;
                this.head.rotation.x = bodyLean * 0.5;
            } else {
                // Reset attack state
                this.isAttacking = false;
                this.leftArm.rotation.x = 0;
                this.rightArm.rotation.x = 0;
                this.body.rotation.x = 0;
                this.head.rotation.x = 0;
            }
        }
    }

    canAttack() {
        const now = Date.now();
        if (now - this.lastAttackTime >= this.attackCooldown * 1000) {
            this.lastAttackTime = now;
            this.isAttacking = true;
            this.attackStartTime = now;
            return true;
        }
        return false;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        // Flash red when taking damage
        const originalColor = this.isBoss ? 0x8B0000 : 0x2d5a27;
        this.body.material.color.setHex(0xff0000);
        setTimeout(() => {
            this.body.material.color.setHex(originalColor);
        }, 100);
        return this.health <= 0;
    }
} 