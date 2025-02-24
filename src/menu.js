let socket = null;
let gameInitialized = false;

// Initialize menu system
function initializeMenu() {
    console.log('Menu initialization started');
    
    // Get DOM elements
    const mainMenu = document.getElementById('main-menu');
    const multiplayerBtn = document.getElementById('join-multiplayer');
    const soloBtn = document.getElementById('play-solo');
    const nameModal = document.getElementById('player-name-modal');
    const joinGameBtn = document.getElementById('join-game-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const serverFullMsg = document.getElementById('server-full-message');
    const gameUI = document.getElementById('game-ui');
    const serverStatus = document.getElementById('server-status');
    const connectionStatus = document.getElementById('connection-status');

    // Initialize socket connection
    try {
        console.log('Initializing socket connection...');
        socket = io({
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
    } catch (error) {
        console.error('Failed to initialize socket:', error);
        connectionStatus.textContent = 'Failed to connect';
        connectionStatus.style.color = '#ff0000';
        return;
    }

    // Socket connection event handlers
    socket.on('connect', () => {
        console.log('Connected to server');
        connectionStatus.textContent = 'Connected';
        connectionStatus.style.color = '#4CAF50';
        serverStatus.style.color = '#4CAF50';
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        connectionStatus.textContent = 'Connection Error';
        connectionStatus.style.color = '#ff0000';
        serverStatus.style.color = '#ff0000';
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.style.color = '#ff0000';
        serverStatus.style.color = '#ff0000';
    });

    // Listen for player count updates
    socket.on('player_count', (data) => {
        console.log('Received player count:', data);
        serverStatus.textContent = `Players Online: ${data.current}/${data.max}`;
    });

    // Handle server capacity response
    socket.on('capacity_response', (data) => {
        console.log('Received capacity response:', data);
        if (data.canJoin) {
            nameModal.classList.add('active');
            serverFullMsg.style.display = 'none';
        } else {
            nameModal.classList.add('active');
            serverFullMsg.style.display = 'block';
        }
    });

    // Handle server full response
    socket.on('server_full', () => {
        console.log('Server is full');
        nameModal.classList.add('active');
        serverFullMsg.style.display = 'block';
    });

    // Multiplayer button click
    multiplayerBtn.addEventListener('click', () => {
        console.log('Multiplayer button clicked');
        if (!socket) {
            console.error('Socket not initialized');
            return;
        }
        
        if (!socket.connected) {
            console.log('Socket not connected, attempting to reconnect...');
            socket.connect();
            return;
        }

        console.log('Checking server capacity...');
        socket.emit('check_capacity');
    });

    // Solo play button click
    soloBtn.addEventListener('click', () => {
        mainMenu.classList.remove('active');
        gameUI.style.display = 'block';
        initializeGame(true);
    });

    // Join game button click
    joinGameBtn.addEventListener('click', () => {
        const playerName = document.getElementById('player-name').value.trim();
        if (playerName) {
            nameModal.classList.remove('active');
            mainMenu.classList.remove('active');
            gameUI.style.display = 'block';
            initializeGame(false, playerName);
        }
    });

    // Back to menu button click
    backToMenuBtn.addEventListener('click', () => {
        nameModal.classList.remove('active');
        serverFullMsg.style.display = 'none';
    });
}

function initializeGame(isSoloMode, playerName = '') {
    if (gameInitialized) return;
    gameInitialized = true;

    // Import and initialize the game
    import('./main.js').then(module => {
        module.initGame({
            isSoloMode,
            playerName,
            socket: isSoloMode ? null : socket
        });
    }).catch(error => {
        console.error('Failed to initialize game:', error);
    });
}

// Initialize menu when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeMenu);

// Export for module usage
export { initializeMenu }; 