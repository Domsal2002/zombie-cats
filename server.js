const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    pingInterval: 2000,  // Send ping every 2 seconds
    pingTimeout: 5000,   // Consider connection lost after 5 seconds of no response
    transports: ['websocket'], // Force WebSocket transport
});
const path = require('path');

// Serve static files from the dist directory
app.use(express.static('dist'));

// Store connected players
const players = new Map();
const MAX_PLAYERS = 5;

// Broadcast player count to all clients
function broadcastPlayerCount() {
    io.emit('player_count', {
        current: players.size,
        max: MAX_PLAYERS
    });
}

io.on('connection', (socket) => {
    console.log('A user connected');

    // Check server capacity before joining
    socket.on('check_capacity', () => {
        socket.emit('capacity_response', {
            canJoin: players.size < MAX_PLAYERS,
            current: players.size,
            max: MAX_PLAYERS
        });
    });

    // Handle new player joining
    socket.on('join', (playerData) => {
        if (players.size >= MAX_PLAYERS) {
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

        // Send existing players to new player
        socket.emit('existing_players', Array.from(players.values()));
        
        // Broadcast new player to others
        socket.broadcast.emit('player_joined', players.get(socket.id));

        // Broadcast updated player count
        broadcastPlayerCount();
    });

    // Handle player movement with rate limiting
    let lastMovementUpdate = 0;
    const MOVEMENT_THROTTLE = 50; // Minimum time between updates in ms

    socket.on('player_move', (data) => {
        const now = Date.now();
        if (now - lastMovementUpdate >= MOVEMENT_THROTTLE) {
            const player = players.get(socket.id);
            if (player) {
                player.position = data.position;
                player.rotation = data.rotation;
                player.lastUpdate = now;
                socket.broadcast.emit('player_moved', {
                    id: socket.id,
                    position: data.position,
                    rotation: data.rotation
                });
                lastMovementUpdate = now;
            }
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
        console.log('User disconnected');
        players.delete(socket.id);
        io.emit('player_left', socket.id);
        broadcastPlayerCount();
    });
});

// Clean up stale connections every 30 seconds
setInterval(() => {
    const now = Date.now();
    for (const [id, player] of players.entries()) {
        if (now - player.lastUpdate > 10000) { // Remove if no update for 10 seconds
            players.delete(id);
            io.emit('player_left', id);
            broadcastPlayerCount();
        }
    }
}, 30000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 