const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('./Actions');
const cors = require('cors');
const { executeCode } = require('./execute'); // <--- Import Executor

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// ==========================================
// --- STATE MANAGEMENT ---
// ==========================================

// 1. WeCode Editor State
const userSocketMap = {};

function getAllClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

// 2. WebRTC Video State
const usersInRoom = new Map();  // Map: roomName -> Array of { id, email, isAudioMuted, isVideoOff }
const socketToRoom = new Map(); // Map: socket.id -> roomName

// ==========================================
// --- SOCKET CONNECTIONS ---
// ==========================================

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // ------------------------------------------
    // A. WECODE EDITOR EVENTS
    // ------------------------------------------
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // ------------------------------------------
    // B. WEBRTC VIDEO & CHAT EVENTS
    // ------------------------------------------
    socket.on("room:join", ({ email, room }) => {
        if (!room || !email) return; 

        socket.join(room);
        socketToRoom.set(socket.id, room);

        let existingUsers = usersInRoom.get(room) || [];
        existingUsers = existingUsers.filter((user) => user.id !== socket.id);
        
        socket.emit("all:users", existingUsers);

        const newUser = { id: socket.id, email, isAudioMuted: false, isVideoOff: false };
        usersInRoom.set(room, [...existingUsers, newUser]);

        socket.broadcast.to(room).emit("user:joined", newUser);
    });

    socket.on("user:toggle-media", ({ type, state }) => {
        const roomID = socketToRoom.get(socket.id);
        if (!roomID) return;

        const users = usersInRoom.get(roomID);
        if (users) {
            const userIndex = users.findIndex((u) => u.id === socket.id);
            if (userIndex !== -1) {
                users[userIndex][type] = state; 
                usersInRoom.set(roomID, users);
            }
        }
        socket.broadcast.to(roomID).emit("user:toggled-media", { id: socket.id, type, state });
    });

    socket.on("chat:message", ({ room, message, senderEmail }) => {
        if (!room) return;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        socket.broadcast.to(room).emit("chat:message", { senderEmail, message, time });
    });

    // WebRTC Peer Routing
    socket.on("user:call", ({ to, offer }) => io.to(to).emit("incomming:call", { from: socket.id, offer }));
    socket.on("call:accepted", ({ to, ans }) => io.to(to).emit("call:accepted", { from: socket.id, ans }));
    socket.on("ice:candidate", ({ to, candidate }) => io.to(to).emit("ice:candidate", { from: socket.id, candidate }));
    socket.on("peer:nego:needed", ({ to, offer }) => io.to(to).emit("peer:nego:needed", { from: socket.id, offer }));
    socket.on("peer:nego:done", ({ to, ans }) => io.to(to).emit("peer:nego:final", { from: socket.id, ans }));

    // ------------------------------------------
    // C. UNIFIED DISCONNECT LOGIC
    // ------------------------------------------
    socket.on('disconnecting', () => {
        // 1. Cleanup Editor State
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];

        // 2. Cleanup Video State
        const roomID = socketToRoom.get(socket.id);
        if (roomID) {
            let roomUsers = usersInRoom.get(roomID);
            if (roomUsers) {
                roomUsers = roomUsers.filter((user) => user.id !== socket.id);
                if (roomUsers.length === 0) {
                    usersInRoom.delete(roomID);
                } else {
                    usersInRoom.set(roomID, roomUsers);
                }
                socket.broadcast.to(roomID).emit("user:left", socket.id);
            }
            socketToRoom.delete(socket.id);
        }

        socket.leave();
    });

    socket.on("room:leave", () => {
        socket.disconnect();
    });
});

// ==========================================
// --- EXECUTION API ---
// ==========================================
app.post('/execute', async (req, res) => {
    const { code, language, input } = req.body;
    
    if (!code || !language) {
        return res.status(400).json({ error: "Code and language are required" });
    }

    try {
        const result = await executeCode(language, code, input);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});