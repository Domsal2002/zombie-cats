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

// Game state
const players = new Map();
const zombies = new Map();
const MAX_PLAYERS = 5;
let lastZombieId = 0;

// Broadcast player count to all clients
function broadcastPlayerCount() {
    const count = {
        current: players.size,
        max: MAX_PLAYERS
    };
    console.log('Broadcasting player count:', count);
    io.emit('player_count', count);
}

// Generate unique zombie ID
function generateZombieId() {
    return `zombie_${++lastZombieId}`;
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Send initial state
    socket.emit('player_count', {
        current: players.size,
        max: MAX_PLAYERS
    });

    // Check server capacity
    socket.on('check_capacity', () => {
        socket.emit('capacity_response', {
            canJoin: players.size < MAX_PLAYERS,
            current: players.size,
            max: MAX_PLAYERS
        });
    });

    // Handle player join
    socket.on('join', (playerData) => {
        if (players.size >= MAX_PLAYERS) {
            socket.emit('server_full');
            return;
        }

        // Store player data
        players.set(socket.id, {
            id: socket.id,
            position: playerData.position,
            rotation: playerData.rotation,
            color: playerData.color,
            name: playerData.name,
            lastUpdate: Date.now()
        });

        // Send existing game state to new player
        socket.emit('game_state', {
            players: Array.from(players.values()),
            zombies: Array.from(zombies.values())
        });
        
        // Broadcast new player to others
        socket.broadcast.emit('player_joined', players.get(socket.id));
        broadcastPlayerCount();
    });

    // Handle zombie spawn request
    socket.on('spawn_zombie', (zombieData) => {
        const zombieId = generateZombieId();
        const zombie = {
            id: zombieId,
            position: zombieData.position,
            level: zombieData.level,
            isBoss: zombieData.isBoss,
            health: zombieData.health,
            spawnTime: Date.now()
        };
        
        zombies.set(zombieId, zombie);
        io.emit('zombie_spawned', zombie);
    });

    // Handle zombie damage
    socket.on('zombie_damaged', (data) => {
        const zombie = zombies.get(data.zombieId);
        if (zombie) {
            zombie.health = data.health;
            if (zombie.health <= 0) {
                zombies.delete(data.zombieId);
                io.emit('zombie_died', data.zombieId);
            } else {
                io.emit('zombie_health_update', {
                    id: data.zombieId,
                    health: zombie.health
                });
            }
        }
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
            io.emit('player_color_changed', {
                id: socket.id,
                color: color
            });
        }
    });

    // Handle player shoot
    socket.on('player_shoot', (data) => {
        socket.broadcast.emit('player_shot', {
            id: socket.id,
            position: data.position,
            direction: data.direction
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        players.delete(socket.id);
        io.emit('player_left', socket.id);
        broadcastPlayerCount();
    });
});

// Clean up stale data
setInterval(() => {
    const now = Date.now();
    
    // Clean up stale players
    for (const [id, player] of players.entries()) {
        if (now - player.lastUpdate > 10000) {
            players.delete(id);
            io.emit('player_left', id);
            broadcastPlayerCount();
        }
    }
    
    // Clean up old zombies (5 minutes old)
    for (const [id, zombie] of zombies.entries()) {
        if (now - zombie.spawnTime > 300000) {
            zombies.delete(id);
            io.emit('zombie_died', id);
        }
    }
}, 30000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});