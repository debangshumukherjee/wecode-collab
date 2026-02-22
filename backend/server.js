const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('./Actions');
const cors = require('cors');
const { executeCode } = require('./execute');
const { AccessToken } = require('livekit-server-sdk');

require('dotenv').config();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());


// --- WECODE EDITOR STATE ---

const userSocketMap = {};

function getAllClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId]?.username,
                email: userSocketMap[socketId]?.email,
            };
        }
    );
}


// --- SOCKET CONNECTIONS (Code Sync Only!) ---

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username, email }) => {
        const clients = getAllClients(roomId);
        
        const isEmailTaken = clients.some(client => client.email === email);
        
        if (isEmailTaken) {
            socket.emit('join_error', { message: 'A user with this email is already in the room.' });
            return; 
        }

        userSocketMap[socket.id] = { username, email };
        socket.join(roomId);
        
        // Get updated client list AFTER this user joins
        const updatedClients = getAllClients(roomId);
        updatedClients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients: updatedClients,
                username,
                email,
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

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        const user = userSocketMap[socket.id];
        
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: user?.username,
                email: user?.email,
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});


// --- EXECUTION API (Docker) ---

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


// --- LIVEKIT TOKEN API ---

app.post('/get-video-token', async (req, res) => {
    const { roomName, participantName, email } = req.body;

    if (!roomName || !participantName || !email) {
        return res.status(400).json({ error: 'roomName, participantName, and email are required' });
    }

    try {
        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            {
                identity: email,
                name: participantName,
                ttl: '2h',
            }
        );

        at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

        const token = await at.toJwt();
        
        res.json({ token });
    } catch (error) {
        console.error("LiveKit Token Error:", error);
        res.status(500).json({ error: "Failed to generate video token" });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});