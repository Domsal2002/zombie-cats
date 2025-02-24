import * as THREE from 'three';
import { Trampoline } from './Trampoline.js';

export class Billboard {
    constructor() {
        this.group = new THREE.Group();
        this.createBillboard();
    }

    createBillboard() {
        // Create canvas for billboard texture
        const canvas = document.createElement('canvas');
        canvas.width = 8192;
        canvas.height = 4096;
        const context = canvas.getContext('2d');
        
        // Create billboard background
        context.fillStyle = '#1a1a1a';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add border
        context.strokeStyle = '#333333';
        context.lineWidth = 100;
        context.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
        
        // Set text properties
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 400px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add a text glow effect
        context.shadowColor = 'rgba(255, 255, 255, 0.5)';
        context.shadowBlur = 20;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Draw credits text
        context.fillText('Created by @donavichsalami on X', canvas.width/2, canvas.height/2 - 300);
        context.fillText('A game created entirely by Claude', canvas.width/2, canvas.height/2 + 300);

        const texture = new THREE.CanvasTexture(canvas);
        
        // Create support pole
        this.createPole();
        
        // Create billboard back
        const billboardBackGeometry = new THREE.BoxGeometry(80, 40, 1);
        const billboardBackMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const billboardBack = new THREE.Mesh(billboardBackGeometry, billboardBackMaterial);
        billboardBack.position.y = 60;
        this.group.add(billboardBack);

        // Create sign
        const signGeometry = new THREE.PlaneGeometry(80, 40);
        const signMaterial = new THREE.MeshLambertMaterial({ 
            map: texture,
            side: THREE.FrontSide
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.y = 60;
        sign.position.z = 0.51;
        this.group.add(sign);

        // Add platform
        this.createPlatform();
        
        // Add ladder
        this.createLadder();
        
        // Add trampoline
        const trampoline = new Trampoline();
        trampoline.group.position.set(-45, 0, 0);
        this.group.add(trampoline.group);

        // Store collision boxes
        this.setupCollisionBoxes();
    }

    createPole() {
        const poleColor = 0x666666;
        const poleGeometry = new THREE.CylinderGeometry(2, 2, 40, 32);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: poleColor });
        this.pole = new THREE.Mesh(poleGeometry, poleMaterial);
        this.pole.position.y = 20;
        this.group.add(this.pole);

        // Add sphere at top
        const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
        const sphereMaterial = new THREE.MeshLambertMaterial({ color: poleColor });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.y = 40;
        this.group.add(sphere);
    }

    createPlatform() {
        const platformGeometry = new THREE.BoxGeometry(82, 2, 10);
        const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
        this.platform.position.set(0, 40, 0);
        this.group.add(this.platform);
    }

    createLadder() {
        const ladderGroup = new THREE.Group();
        const ladderColor = 0xff0000;
        const ladderHeight = 40;
        const ladderWidth = 2;
        const ladderDepth = 0.4;
        const rungSpacing = 2;
        const numRungs = Math.floor(ladderHeight / rungSpacing);
        
        // Side rails
        const railGeometry = new THREE.BoxGeometry(0.2, ladderHeight, 0.2);
        const railMaterial = new THREE.MeshLambertMaterial({ color: ladderColor });
        
        const leftRail = new THREE.Mesh(railGeometry, railMaterial);
        leftRail.position.set(-ladderWidth/2, ladderHeight/2, 2.3);
        ladderGroup.add(leftRail);
        
        const rightRail = new THREE.Mesh(railGeometry, railMaterial);
        rightRail.position.set(ladderWidth/2, ladderHeight/2, 2.3);
        ladderGroup.add(rightRail);
        
        // Rungs
        const rungGeometry = new THREE.CylinderGeometry(0.1, 0.1, ladderWidth + 0.2, 8);
        const rungMaterial = new THREE.MeshLambertMaterial({ color: ladderColor });
        
        for(let i = 0; i < numRungs; i++) {
            const rung = new THREE.Mesh(rungGeometry, rungMaterial);
            rung.rotation.z = Math.PI/2;
            rung.position.set(0, i * rungSpacing + rungSpacing/2, 2.3);
            ladderGroup.add(rung);
        }

        // Collision box
        const ladderBackGeometry = new THREE.BoxGeometry(ladderWidth + 1, ladderHeight, ladderDepth);
        const ladderBackMaterial = new THREE.MeshLambertMaterial({ 
            transparent: true,
            opacity: 0
        });
        this.ladder = new THREE.Mesh(ladderBackGeometry, ladderBackMaterial);
        this.ladder.position.set(0, ladderHeight/2, 2.3);
        ladderGroup.add(this.ladder);
        
        this.group.add(ladderGroup);
    }

    setupCollisionBoxes() {
        // Ladder collision box
        this.ladderBox = new THREE.Box3();
        this.ladderBounds = new THREE.Box3().setFromObject(this.ladder);

        // Platform collision box
        this.platformBox = new THREE.Box3();
        this.platformBounds = new THREE.Box3().setFromObject(this.platform);

        // Pole collision box
        this.poleBox = new THREE.Box3();
        this.poleBounds = new THREE.Box3().setFromObject(this.pole);

        // Trampoline collision box
        this.trampolineBox = new THREE.Box3();
        const trampoline = this.group.children.find(child => 
            child instanceof THREE.Group && 
            child.position.x === -45
        );
        if (trampoline) {
            // Find the collision mesh (the transparent cylinder)
            const collisionMesh = trampoline.children.find(child => 
                child instanceof THREE.Mesh && 
                child.geometry instanceof THREE.CylinderGeometry &&
                child.material.transparent === true
            );
            if (collisionMesh) {
                this.trampolineBounds = new THREE.Box3().setFromObject(collisionMesh);
                // Make the collision box slightly larger for better detection
                this.trampolineBounds.min.y -= 0.5;
                this.trampolineBounds.max.y += 0.5;
                this.trampolineBounds.min.x -= 0.5;
                this.trampolineBounds.max.x += 0.5;
                this.trampolineBounds.min.z -= 0.5;
                this.trampolineBounds.max.z += 0.5;
            }
        }
    }

    updateCollisionBoxes() {
        this.ladderBox.copy(this.ladderBounds).applyMatrix4(this.group.matrixWorld);
        this.platformBox.copy(this.platformBounds).applyMatrix4(this.group.matrixWorld);
        this.poleBox.copy(this.poleBounds).applyMatrix4(this.group.matrixWorld);
        if (this.trampolineBounds) {
            this.trampolineBox.copy(this.trampolineBounds).applyMatrix4(this.group.matrixWorld);
        }
    }
} 