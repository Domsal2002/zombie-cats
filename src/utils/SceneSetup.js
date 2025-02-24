import * as THREE from 'three';

export class SceneSetup {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();
        
        // Ground and boundaries
        this.setupGround();
        this.setupForest();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 50);
        this.scene.add(directionalLight);

        // Add some fog for atmosphere
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);
    }

    setupGround() {
        // Create a smaller, bounded ground
        const groundSize = 200;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI/2;
        this.scene.add(ground);

        // Add boundary walls (invisible)
        const wallHeight = 10;
        const wallGeometry = new THREE.BoxGeometry(2, wallHeight, groundSize);
        const wallMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true, 
            opacity: 0 
        });

        // North wall
        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.position.set(0, wallHeight/2, -groundSize/2);
        this.scene.add(northWall);

        // South wall
        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.position.set(0, wallHeight/2, groundSize/2);
        this.scene.add(southWall);

        // East wall
        const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
        eastWall.rotation.y = Math.PI/2;
        eastWall.position.set(groundSize/2, wallHeight/2, 0);
        this.scene.add(eastWall);

        // West wall
        const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
        westWall.rotation.y = Math.PI/2;
        westWall.position.set(-groundSize/2, wallHeight/2, 0);
        this.scene.add(westWall);
    }

    setupForest() {
        // Create many trees in a dense pattern
        const treeCount = 200;
        const groundSize = 200;
        const minDistance = 8; // Minimum distance between trees

        // Define escalator area to avoid
        const escalatorArea = {
            x: 0,
            z: -30,
            width: 10,
            depth: 60
        };

        const trees = [];
        for (let i = 0; i < treeCount; i++) {
            let validPosition = false;
            let x, z;

            // Try to find a valid position
            for (let attempts = 0; attempts < 50; attempts++) {
                x = (Math.random() - 0.5) * (groundSize - 10);
                z = (Math.random() - 0.5) * (groundSize - 10);

                // Check if position is in escalator area
                if (Math.abs(x - escalatorArea.x) < escalatorArea.width &&
                    Math.abs(z - escalatorArea.z) < escalatorArea.depth) {
                    continue;
                }

                // Check distance from other trees
                validPosition = true;
                for (const tree of trees) {
                    const dx = x - tree.position.x;
                    const dz = z - tree.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }

                // Also check distance from center (player spawn area)
                const distanceFromCenter = Math.sqrt(x * x + z * z);
                if (distanceFromCenter < 15) {
                    validPosition = false;
                    continue;
                }

                if (validPosition) break;
            }

            if (validPosition) {
                const tree = new THREE.Group();

                // Trunk
                const trunkGeom = new THREE.CylinderGeometry(0.5, 0.8, 5 + Math.random() * 3, 8);
                const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const trunk = new THREE.Mesh(trunkGeom, trunkMat);
                trunk.position.y = trunk.geometry.parameters.height / 2;
                tree.add(trunk);

                // Leaves (multiple layers for more realistic look)
                const leafColors = [0x006400, 0x228B22, 0x32CD32];
                const leafLayers = 3;
                for (let j = 0; j < leafLayers; j++) {
                    const leafGeom = new THREE.SphereGeometry(2 - j * 0.3, 8, 8);
                    const leafMat = new THREE.MeshLambertMaterial({ 
                        color: leafColors[j % leafColors.length]
                    });
                    const leaves = new THREE.Mesh(leafGeom, leafMat);
                    leaves.position.y = trunk.geometry.parameters.height + j * 0.5;
                    leaves.scale.y = 0.8;
                    tree.add(leaves);
                }

                tree.position.set(x, 0, z);
                tree.rotation.y = Math.random() * Math.PI * 2;

                // Add collision box for the tree
                const treeBox = new THREE.Box3();
                const treeBounds = new THREE.Box3().setFromObject(tree);
                tree.userData.treeBox = treeBox;
                tree.userData.treeBounds = treeBounds;

                this.scene.add(tree);
                trees.push(tree);
            }
        }
    }

    handleResize() {
        this.camera.aspect = window.innerWidth/window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    add(object) {
        this.scene.add(object);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
} 