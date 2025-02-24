const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from the dist directory
app.use(express.static('dist'));

// Store connected players
const players = new Map();
const MAX_PLAYERS = 5;

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send current player count to all clients
    const updatePlayerCount = () => {
        io.emit('player_count', {
            current: players.size,
            max: MAX_PLAYERS
        });
    };

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
            name: playerData.name
        });

        // Send existing players to new player
        socket.emit('existing_players', Array.from(players.values()));
        
        // Broadcast new player to others
        socket.broadcast.emit('player_joined', players.get(socket.id));

        // Update player count for all clients
        updatePlayerCount();
    });

    // Handle player movement
    socket.on('player_move', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = data.position;
            player.rotation = data.rotation;
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
        console.log('User disconnected');
        players.delete(socket.id);
        io.emit('player_left', socket.id);
        updatePlayerCount();
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 