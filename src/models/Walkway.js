import * as THREE from 'three';

export class Walkway {
    constructor() {
        this.group = new THREE.Group();
        this.beltSegments = [];
        this.createWalkway();
    }

    createWalkway() {
        // Base structure
        const baseGeometry = new THREE.BoxGeometry(60, 0.5, 4);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        this.group.add(base);

        // Moving belt segments
        const segmentWidth = 1;
        const numSegments = 60;
        const segmentGeometry = new THREE.BoxGeometry(segmentWidth, 0.1, 3.8);
        
        const blackMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x000000,
            metalness: 0.8,
            roughness: 0.2
        });
        const whiteMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF,
            metalness: 0.8,
            roughness: 0.2
        });

        for(let i = 0; i < numSegments; i++) {
            const segment = new THREE.Group();
            const beltPart = new THREE.Mesh(
                segmentGeometry, 
                i % 2 === 0 ? whiteMaterial : blackMaterial
            );
            segment.add(beltPart);
            segment.position.set(-30 + i * segmentWidth, 0.3, 0);
            this.group.add(segment);
            this.beltSegments.push(segment);
        }

        // Side rails
        this.createSideRails();
        
        // Safety strips
        this.createSafetyStrips();

        // Setup collision box
        this.walkwayBox = new THREE.Box3();
        this.walkwayBounds = new THREE.Box3().setFromObject(base);
    }

    createSideRails() {
        const railGeometry = new THREE.BoxGeometry(60, 0.8, 0.2);
        const railMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x666666,
            metalness: 0.6,
            roughness: 0.3
        });
        
        const frontRail = new THREE.Mesh(railGeometry, railMaterial);
        frontRail.position.set(0, 0.4, 2);
        this.group.add(frontRail);
        
        const backRail = new THREE.Mesh(railGeometry, railMaterial);
        backRail.position.set(0, 0.4, -2);
        this.group.add(backRail);
    }

    createSafetyStrips() {
        const stripGeometry = new THREE.BoxGeometry(60, 0.1, 0.3);
        const stripMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
        
        const frontStrip = new THREE.Mesh(stripGeometry, stripMaterial);
        frontStrip.position.set(0, 0.31, 1.9);
        this.group.add(frontStrip);
        
        const backStrip = new THREE.Mesh(stripGeometry, stripMaterial);
        backStrip.position.set(0, 0.31, -1.9);
        this.group.add(backStrip);
    }

    update(dt) {
        // Animate belt segments
        this.beltSegments.forEach(segment => {
            segment.position.x += 8 * dt;
            if (segment.position.x > 30) {
                segment.position.x = -30;
            }
        });
    }

    updateCollisionBox() {
        this.walkwayBox.copy(this.walkwayBounds).applyMatrix4(this.group.matrixWorld);
    }
} 