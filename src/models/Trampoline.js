import * as THREE from 'three';

export class Trampoline {
    constructor() {
        this.group = new THREE.Group();
        this.createTrampoline();
    }

    createTrampoline() {
        // Colors
        const frameColor = 0x4287f5;    // Bright blue
        const surfaceColor = 0x000000;  // Black
        const padColor = 0xff8c1a;      // Safety orange

        // Dimensions
        const diameter = 12;
        const frameThickness = 0.5;
        const legHeight = 2.0;
        const surfaceY = legHeight + frameThickness/2;

        // Create frame (outer ring)
        const frameGeometry = new THREE.TorusGeometry(diameter/2, frameThickness, 16, 32);
        const frameMaterial = new THREE.MeshLambertMaterial({ color: frameColor });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.rotation.x = Math.PI/2;
        frame.position.y = surfaceY;
        this.group.add(frame);

        // Create legs
        const legGeometry = new THREE.CylinderGeometry(0.3, 0.3, legHeight, 8);
        const legMaterial = new THREE.MeshLambertMaterial({ color: frameColor });
        
        const legPositions = [
            { angle: Math.PI/4 },
            { angle: 3*Math.PI/4 },
            { angle: 5*Math.PI/4 },
            { angle: 7*Math.PI/4 }
        ];

        legPositions.forEach(pos => {
            pos.x = Math.cos(pos.angle) * (diameter/2 - frameThickness);
            pos.z = Math.sin(pos.angle) * (diameter/2 - frameThickness);
            
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos.x, legHeight/2, pos.z);
            this.group.add(leg);

            // Add foot pad
            const padGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8);
            const padMaterial = new THREE.MeshLambertMaterial({ color: padColor });
            const pad = new THREE.Mesh(padGeometry, padMaterial);
            pad.position.set(pos.x, 0.1, pos.z);
            this.group.add(pad);
        });

        // Create bouncy surface
        const surfaceGeometry = new THREE.CircleGeometry(diameter/2 - frameThickness, 32);
        const surfaceMaterial = new THREE.MeshLambertMaterial({ 
            color: surfaceColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
        surface.rotation.x = -Math.PI/2;
        surface.position.y = surfaceY - 0.1;
        this.group.add(surface);

        // Add collision box
        const collisionGeometry = new THREE.CylinderGeometry(
            diameter/2 - frameThickness/2,
            diameter/2 - frameThickness/2,
            0.5,
            32
        );
        const collisionMaterial = new THREE.MeshBasicMaterial({ 
            visible: false,
            transparent: true,
            opacity: 0 
        });
        this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
        this.collisionMesh.position.y = surfaceY;
        this.group.add(this.collisionMesh);

        // Setup collision box
        this.trampolineBox = new THREE.Box3();
        this.trampolineBounds = new THREE.Box3().setFromObject(this.collisionMesh);
    }

    updateCollisionBox() {
        this.trampolineBox.copy(this.trampolineBounds).applyMatrix4(this.group.matrixWorld);
    }
} 