import * as THREE from 'three';

export class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.camYaw = 0;
        this.camPitch = 0;
        this.turnSpeed = Math.PI * 0.5;
        
        // Camera follow parameters
        this.cameraHeight = 4;
        this.cameraDistance = 8;
        this.lookAtHeight = 2;
    }

    update(dt, target, inputController) {
        // Update rotation from input
        if (inputController.rotateKeys.left) {
            this.camYaw += this.turnSpeed * dt;
        }
        if (inputController.rotateKeys.right) {
            this.camYaw -= this.turnSpeed * dt;
        }
        if (inputController.rotateKeys.up) {
            this.camPitch = Math.max(-Math.PI/3, this.camPitch - this.turnSpeed * dt);
        }
        if (inputController.rotateKeys.down) {
            this.camPitch = Math.min(Math.PI/6, this.camPitch + this.turnSpeed * dt);
        }

        // Update from mouse movement
        this.camYaw -= inputController.mouseX;
        this.camPitch = Math.max(-Math.PI/3, Math.min(Math.PI/6, this.camPitch - inputController.mouseY));
        
        // Calculate camera position based on rotation
        const cameraOffset = new THREE.Vector3(0, 0, this.cameraDistance);
        cameraOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.camPitch);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);
        
        const targetCameraPos = new THREE.Vector3(
            target.position.x + cameraOffset.x,
            target.position.y + this.cameraHeight + cameraOffset.y,
            target.position.z + cameraOffset.z
        );
        
        // Smoothly move camera
        this.camera.position.lerp(targetCameraPos, 0.1);
        
        // Look at point slightly above target
        const lookAtPoint = new THREE.Vector3(
            target.position.x,
            target.position.y + this.lookAtHeight,
            target.position.z
        );
        this.camera.lookAt(lookAtPoint);

        // Reset mouse movement after applying it
        inputController.resetMouseMovement();

        return this.camYaw; // Return for player rotation
    }
} 