import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    // NEW: Email state for Video Calling
    const [email, setEmail] = useState(''); 

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidv4();
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        // NEW: Check if email is filled out
        if (!roomId || !username || !email) {
            toast.error('Room ID, username & email are required');
            return;
        }
        navigate(`/editor/${roomId}`, {
            // NEW: Pass email along with username to the editor
            state: { username, email }, 
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') joinRoom();
    };

    return (
        <div className="w-full h-dvh flex items-center justify-center bg-[#0f111a] text-white relative overflow-hidden">
            
            {/* Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />

            {/* Glass Card */}
            <div className="glass w-[90%] max-w-[450px] p-6 md:p-8 rounded-2xl flex flex-col gap-5 md:gap-6 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300 border border-gray-700/50 bg-black/30 backdrop-blur-md">
                
                {/* Logo Section */}
                <div className="flex flex-col items-center gap-3">
                    <img src="/wecode.png" alt="logo" className="h-[60px] md:h-[80px] drop-shadow-xl transition-transform hover:scale-105" />
                    <div className="text-center">
                        <p className="text-gray-400 text-xs md:text-sm mt-1">
                            Real-time collab, execution & video calls
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div className="flex flex-col gap-4">
                    <div className="group">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block tracking-wider">Room ID</label>
                        <input
                            type="text"
                            className="w-full bg-[#0a0c10] text-white p-3 rounded-lg border border-gray-700 focus:border-[#4aee88] focus:ring-1 focus:ring-[#4aee88] outline-none transition-all font-mono text-sm md:text-base placeholder-gray-600"
                            placeholder="Paste Room ID"
                            onChange={(e) => setRoomId(e.target.value)}
                            value={roomId}
                            onKeyUp={handleInputEnter}
                        />
                    </div>
                    
                    <div className="group">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block tracking-wider">Username</label>
                        <input
                            type="text"
                            className="w-full bg-[#0a0c10] text-white p-3 rounded-lg border border-gray-700 focus:border-[#4aee88] focus:ring-1 focus:ring-[#4aee88] outline-none transition-all text-sm md:text-base placeholder-gray-600"
                            placeholder="Enter your name"
                            onChange={(e) => setUsername(e.target.value)}
                            value={username}
                            onKeyUp={handleInputEnter}
                        />
                    </div>

                    {/* NEW: Email Input Field */}
                    <div className="group">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block tracking-wider">Email (For Video Call)</label>
                        <input
                            type="email"
                            className="w-full bg-[#0a0c10] text-white p-3 rounded-lg border border-gray-700 focus:border-[#4aee88] focus:ring-1 focus:ring-[#4aee88] outline-none transition-all text-sm md:text-base placeholder-gray-600"
                            placeholder="you@example.com"
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            onKeyUp={handleInputEnter}
                        />
                    </div>

                    <button 
                        className="mt-2 w-full bg-[#4aee88] hover:bg-[#3ddc7c] text-black font-bold py-3 rounded-lg transition-all transform active:scale-95 hover:shadow-[0_0_15px_rgba(74,238,136,0.3)]"
                        onClick={joinRoom}
                    >
                        Join Room
                    </button>

                    <div className="text-center mt-2">
                        <span className="text-gray-500 text-sm">Don't have an invite? </span>
                        <button 
                            onClick={createNewRoom} 
                            className="text-[#4aee88] hover:text-[#3ddc7c] font-bold text-sm hover:underline transition-all"
                        >
                            Create New Room
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <footer className="absolute bottom-4 text-gray-500 text-[10px] md:text-xs text-center w-full px-4">
                Built with ❤️ by &nbsp;
                <a 
                    href="https://github.com/debangshumukherjee" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#4aee88] hover:underline font-bold transition-all"
                >
                    Debangshu Mukherjee
                </a>
            </footer>
        </div>
    );
};

export default Home;