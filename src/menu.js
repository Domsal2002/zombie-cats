let socket = null;
let gameInitialized = false;

export function initializeMenu() {
    const mainMenu = document.getElementById('main-menu');
    const multiplayerBtn = document.getElementById('join-multiplayer');
    const soloBtn = document.getElementById('play-solo');
    const nameModal = document.getElementById('player-name-modal');
    const joinGameBtn = document.getElementById('join-game-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const serverFullMsg = document.getElementById('server-full-message');
    const gameUI = document.getElementById('game-ui');
    const serverStatus = document.getElementById('server-status');

    // Initialize socket connection
    socket = io();

    // Listen for player count updates
    socket.on('player_count', (data) => {
        serverStatus.textContent = `Players Online: ${data.current}/${data.max}`;
    });

    // Handle server capacity response
    socket.on('capacity_response', (data) => {
        if (data.canJoin) {
            nameModal.classList.add('active');
            serverFullMsg.style.display = 'none';
        } else {
            serverFullMsg.style.display = 'block';
        }
    });

    // Handle server full response
    socket.on('server_full', () => {
        serverFullMsg.style.display = 'block';
        nameModal.classList.add('active');
    });

    // Multiplayer button click
    multiplayerBtn.addEventListener('click', () => {
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
    });
} 