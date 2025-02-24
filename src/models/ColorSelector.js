import * as THREE from 'three';

export class ColorSelector {
    constructor() {
        this.group = new THREE.Group();
        this.colors = [
            { name: 'Grey', hex: 0xd3d3d3 },
            { name: 'Orange', hex: 0xFFA500 },
            { name: 'Black', hex: 0x000000 },
            { name: 'White', hex: 0xFFFFFF },
            { name: 'Brown', hex: 0x8B4513 },
            { name: 'Cream', hex: 0xFFEFD5 },
            { name: 'Ginger', hex: 0xFF6347 },
            { name: 'Blue', hex: 0x4169E1 },
            { name: 'Pink', hex: 0xFF69B4 },
            { name: 'Purple', hex: 0x800080 }
        ];
        this.createColorWalkway();
    }

    createColorWalkway() {
        const sectionWidth = 6;
        const walkwayLength = this.colors.length * sectionWidth;
        const walkwayWidth = 8;

        this.colors.forEach((color, index) => {
            // Create colored section
            const sectionGeometry = new THREE.BoxGeometry(sectionWidth, 0.5, walkwayWidth);
            const sectionMaterial = new THREE.MeshPhongMaterial({ 
                color: color.hex,
                shininess: 100,
                specular: 0x444444
            });
            const section = new THREE.Mesh(sectionGeometry, sectionMaterial);
            
            // Position section
            section.position.set(index * sectionWidth - walkwayLength/2, 0.25, 0);
            
            // Add metadata for color changing
            section.userData.isColorSection = true;
            section.userData.color = color.hex;
            
            this.group.add(section);

            // Add text label
            this.createLabel(color.name, section.position.x, section.position.z);
        });
    }

    createLabel(text, x, z) {
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 64;
        const labelContext = labelCanvas.getContext('2d');
        
        // Setup text style
        labelContext.fillStyle = '#FFFFFF';
        labelContext.font = 'bold 48px Arial';
        labelContext.textAlign = 'center';
        labelContext.textBaseline = 'middle';
        labelContext.strokeStyle = '#000000';
        labelContext.lineWidth = 4;
        
        // Draw text
        labelContext.strokeText(text, labelCanvas.width/2, labelCanvas.height/2);
        labelContext.fillText(text, labelCanvas.width/2, labelCanvas.height/2);

        // Create texture and plane
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelGeometry = new THREE.PlaneGeometry(4.8, 1.2);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.rotation.x = -Math.PI/2;
        label.position.set(x, 0.51, z);
        this.group.add(label);
    }

    checkCollision(catBox, cat) {
        this.group.children.forEach(child => {
            if (child.userData.isColorSection) {
                const sectionBox = new THREE.Box3().setFromObject(child);
                if (catBox.intersectsBox(sectionBox)) {
                    const colorHex = child.userData.color;
                    cat.setColor(colorHex);
                }
            }
        });
    }
} 