import React, { useRef, useEffect } from "react";
import Draggable from "react-draggable";
import { Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";

// --- Helper Component: Individual Video Player ---
const VideoPlayer = ({ stream, isLocal, userInfo }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative w-[150px] aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-lg shrink-0 group">
            {userInfo?.isVideoOff ? (
                <div className="flex w-full h-full items-center justify-center bg-gray-800">
                    <span className="text-white text-xs opacity-50">Camera Off</span>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
                />
            )}

            {/* User Label Overlay */}
            <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white backdrop-blur-sm truncate max-w-[90%] z-10">
                <span className="truncate">
                    {isLocal ? "You" : userInfo?.email?.split("@")[0]}
                </span>
                {userInfo?.isAudioMuted && (
                    <MicOff size={10} className="text-red-400" />
                )}
            </div>
        </div>
    );
};

// --- Main Component: The Draggable Dock ---
const VideoDock = ({
    myStream,
    remoteStreams,
    remoteUsersInfo,
    email,
    isAudioMuted,
    isVideoOff,
    toggleAudio,
    toggleVideo
}) => {
    // THIS FIXES THE CRASH: The reference for react-draggable
    const nodeRef = useRef(null);

    return (
        <Draggable bounds="parent" handle=".drag-handle" nodeRef={nodeRef}>
            {/* The ref MUST be attached to the immediate child div */}
            <div ref={nodeRef} className="absolute top-16 right-6 z-50 flex flex-col gap-2 p-3 bg-[#1a1d2d]/80 backdrop-blur-md rounded-2xl border border-[#2b3040] shadow-2xl w-max max-w-[90vw] md:max-w-none">
                
                {/* Drag Handle & Controls */}
                <div className="flex items-center justify-between px-1 mb-1">
                    <div className="drag-handle cursor-grab active:cursor-grabbing text-gray-500 hover:text-white transition-colors p-1">
                        {/* Drag Icon */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h8M8 15h8" />
                        </svg>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleAudio}
                            className={`p-2 rounded-lg transition-colors ${isAudioMuted ? "bg-red-500/20 text-red-400" : "bg-gray-700 hover:bg-gray-600 text-white"}`}
                        >
                            {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`p-2 rounded-lg transition-colors ${isVideoOff ? "bg-red-500/20 text-red-400" : "bg-gray-700 hover:bg-gray-600 text-white"}`}
                        >
                            {isVideoOff ? <VideoOff size={16} /> : <VideoIcon size={16} />}
                        </button>
                    </div>
                </div>

                {/* Video Grid */}
                <div className="flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-visible custom-scrollbar pb-2 md:pb-0">
                    <VideoPlayer
                        stream={myStream}
                        isLocal={true}
                        userInfo={{ email, isVideoOff, isAudioMuted }}
                    />
                    {Object.entries(remoteStreams).map(([socketId, stream]) => (
                        <VideoPlayer
                            key={socketId}
                            stream={stream}
                            isLocal={false}
                            userInfo={remoteUsersInfo[socketId] || { email: "User" }}
                        />
                    ))}
                </div>
            </div>
        </Draggable>
    );
};

export default VideoDock;