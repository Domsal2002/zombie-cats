const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    pingInterval: 2000,  // Send ping every 2 seconds
    pingTimeout: 5000,   // Consider connection lost after 5 seconds of no response
    transports: ['websocket'], // Force WebSocket transport
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');

// Serve static files from both dist and src directories
app.use(express.static('dist'));
app.use('/src', express.static('src'));

// Serve socket.io client from node_modules
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.js'));
});

// Store connected players
const players = new Map();
const MAX_PLAYERS = 5;

// Broadcast player count to all clients
function broadcastPlayerCount() {
    const count = {
        current: players.size,
        max: MAX_PLAYERS
    };
    console.log('Broadcasting player count:', count);
    io.emit('player_count', count);
}

io.on('connection', (socket) => {
    console.log('A user connected. Socket ID:', socket.id);
    
    // Immediately send current player count
    socket.emit('player_count', {
        current: players.size,
        max: MAX_PLAYERS
    });

    // Check server capacity before joining
    socket.on('check_capacity', () => {
        const response = {
            canJoin: players.size < MAX_PLAYERS,
            current: players.size,
            max: MAX_PLAYERS
        };
        console.log('Capacity check requested. Response:', response);
        socket.emit('capacity_response', response);
    });

    // Handle new player joining
    socket.on('join', (playerData) => {
        console.log('Player attempting to join:', playerData);
        
        if (players.size >= MAX_PLAYERS) {
            console.log('Server full, rejecting player:', socket.id);
            socket.emit('server_full');
            return;
        }

        players.set(socket.id, {
            id: socket.id,
            position: playerData.position,
            rotation: playerData.rotation,
            color: playerData.color,
            name: playerData.name,
            lastUpdate: Date.now()
        });

        console.log('Player joined successfully:', socket.id);
        console.log('Current player count:', players.size);

        // Send existing players to new player
        const existingPlayers = Array.from(players.values());
        socket.emit('existing_players', existingPlayers);
        
        // Broadcast new player to others
        socket.broadcast.emit('player_joined', players.get(socket.id));

        // Broadcast updated player count
        broadcastPlayerCount();
    });

    // Handle player movement
    socket.on('player_move', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = data.position;
            player.rotation = data.rotation;
            player.lastUpdate = Date.now();
            socket.broadcast.emit('player_moved', {
                id: socket.id,
                position: data.position,
                rotation: data.rotation
            });
        }
    });

    // Handle player color change
    socket.on('player_color_change', (color) => {
        const player = players.get(socket.id);
        if (player) {
            player.color = color;
            socket.broadcast.emit('player_color_changed', {
                id: socket.id,
                color: color
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        players.delete(socket.id);
        io.emit('player_left', socket.id);
        broadcastPlayerCount();
    });
});

// Clean up stale connections every 30 seconds
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, player] of players.entries()) {
        if (now - player.lastUpdate > 10000) {
            players.delete(id);
            io.emit('player_left', id);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} stale connections`);
        broadcastPlayerCount();
    }
}, 30000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 