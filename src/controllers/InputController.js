export class InputController {
    constructor() {
        this.moveKeys = { forward: false, backward: false, left: false, right: false, Space: false };
        this.rotateKeys = { 
            left: false, 
            right: false,
            up: false,
            down: false
        };
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSensitivity = 0.002;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Lock pointer for mouse control
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.mouseX = e.movementX * this.mouseSensitivity;
                this.mouseY = e.movementY * this.mouseSensitivity;
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }

    handleKeyDown(e) {
        switch(e.code) {
            case "KeyW": this.moveKeys.forward = true; break;
            case "KeyS": this.moveKeys.backward = true; break;
            case "KeyA": this.moveKeys.left = true; break;
            case "KeyD": this.moveKeys.right = true; break;
            case "ArrowLeft": this.rotateKeys.left = true; break;
            case "ArrowRight": this.rotateKeys.right = true; break;
            case "ArrowUp": this.rotateKeys.up = true; break;
            case "ArrowDown": this.rotateKeys.down = true; break;
            case "Space": this.moveKeys.Space = true; break;
        }
    }

    handleKeyUp(e) {
        switch(e.code) {
            case "KeyW": this.moveKeys.forward = false; break;
            case "KeyS": this.moveKeys.backward = false; break;
            case "KeyA": this.moveKeys.left = false; break;
            case "KeyD": this.moveKeys.right = false; break;
            case "ArrowLeft": this.rotateKeys.left = false; break;
            case "ArrowRight": this.rotateKeys.right = false; break;
            case "ArrowUp": this.rotateKeys.up = false; break;
            case "ArrowDown": this.rotateKeys.down = false; break;
            case "Space": this.moveKeys.Space = false; break;
        }
    }

    resetMouseMovement() {
        this.mouseX = 0;
        this.mouseY = 0;
    }
} 