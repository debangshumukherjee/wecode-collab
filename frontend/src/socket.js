import { io } from 'socket.io-client';

// Removed 'async' to prevent race conditions in React Strict Mode
export const initSocket = () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    return io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', options);
};