import * as THREE from 'three';

export class Coin {
    constructor(x, z) {
        this.mesh = this.createCoin();
        this.mesh.position.set(x, 0.3, z);
        this.mesh.rotation.x = Math.PI/2;
    }

    createCoin() {
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        return new THREE.Mesh(geometry, material);
    }

    checkCollision(catBox) {
        const coinBox = new THREE.Box3().setFromObject(this.mesh);
        return catBox.intersectsBox(coinBox);
    }

    static createRandomCoins(count, range) {
        const coins = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * range;
            const z = (Math.random() - 0.5) * range;
            coins.push(new Coin(x, z));
        }
        return coins;
    }
} 