import React, { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import VideoDock from "../components/VideoDock";
import { initSocket } from "../socket";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();

  // Extract User Info
  const username = location.state?.username || "Guest";
  const email = location.state?.email || "guest@example.com";

  // --- WeCode State ---
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  // --- WebRTC Video State ---
  const [myStream, setMyStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [remoteUsersInfo, setRemoteUsersInfo] = useState({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peersRef = useRef({});
  const myStreamRef = useRef();

  // WebRTC: Create a Peer Connection
  const createPeer = useCallback((targetSocketId, socket) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });
    if (myStreamRef.current)
      myStreamRef.current
        .getTracks()
        .forEach((t) => peer.addTrack(t, myStreamRef.current));

    peer.onicecandidate = (event) => {
      if (event.candidate)
        socket.emit("ice:candidate", {
          to: targetSocketId,
          candidate: event.candidate,
        });
    };

    peer.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: event.streams[0],
      }));
    };

    peersRef.current[targetSocketId] = peer;
    return peer;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // 1. Initialize Socket
      socketRef.current = initSocket();
      const socket = socketRef.current;

      socket.on("connect_error", (err) => handleErrors(err));
      socket.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      // ==========================================
      // A. START WECODE CODE LOGIC
      // ==========================================
      socket.emit(ACTIONS.JOIN, { roomId, username });

      socket.on(
        ACTIONS.JOINED,
        ({ clients, username: joinedName, socketId }) => {
          if (joinedName !== username) {
            toast.success(`${joinedName} joined the code room.`);
          }
          setClients(clients);
          socket.emit(ACTIONS.SYNC_CODE, { code: codeRef.current, socketId });
        },
      );

      socket.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftName }) => {
        toast.success(`${leftName} left the room.`);
        setClients((prev) =>
          prev.filter((client) => client.socketId !== socketId),
        );
      });

      // ==========================================
      // B. START WEBRTC VIDEO LOGIC
      // ==========================================
      try {
        // Request Camera & Mic
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setMyStream(stream);
        myStreamRef.current = stream;
      } catch (err) {
        console.warn("Camera access denied or no camera found.", err);
        toast.error(
          "Camera/Mic not found or permission denied. You joined as audio/video off.",
        );
      }

      // Join Video Room
      socket.emit("room:join", { email, room: roomId });

      // Listeners for WebRTC
      socket.on("all:users", async (users) => {
        const usersInfoObj = {};
        for (const user of users) {
          usersInfoObj[user.id] = {
            email: user.email,
            isAudioMuted: user.isAudioMuted,
            isVideoOff: user.isVideoOff,
          };
          const peer = createPeer(user.id, socket);
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit("user:call", { to: user.id, offer });
        }
        setRemoteUsersInfo(usersInfoObj);
      });

      socket.on("user:joined", (user) => {
        toast.success(`${user.email} joined video call`, { icon: "📹" });
        setRemoteUsersInfo((prev) => ({ ...prev, [user.id]: user }));
      });

      socket.on("user:toggled-media", ({ id, type, state }) => {
        setRemoteUsersInfo((prev) => ({
          ...prev,
          [id]: { ...prev[id], [type]: state },
        }));
      });

      socket.on("incomming:call", async ({ from, offer }) => {
        let peer = peersRef.current[from] || createPeer(from, socket);
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const ans = await peer.createAnswer();
        await peer.setLocalDescription(ans);
        socket.emit("call:accepted", { to: from, ans });
      });

      socket.on("call:accepted", async ({ from, ans }) => {
        if (peersRef.current[from])
          await peersRef.current[from].setRemoteDescription(
            new RTCSessionDescription(ans),
          );
      });

      socket.on("ice:candidate", async ({ from, candidate }) => {
        if (peersRef.current[from])
          await peersRef.current[from].addIceCandidate(
            new RTCIceCandidate(candidate),
          );
      });

      socket.on("user:left", (socketId) => {
        if (peersRef.current[socketId]) {
          peersRef.current[socketId].close();
          delete peersRef.current[socketId];
        }
        setRemoteStreams((prev) => {
          const s = { ...prev };
          delete s[socketId];
          return s;
        });
        setRemoteUsersInfo((prev) => {
          const s = { ...prev };
          delete s[socketId];
          return s;
        });
      });
    };

    if (username) init();

    // CLEANUP
    return () => {
      isMounted = false;
      if (myStreamRef.current)
        myStreamRef.current.getTracks().forEach((track) => track.stop());
      Object.values(peersRef.current).forEach((peer) => peer.close());
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
      }
    };
  }, []);

  // --- WebRTC Controls ---
  const toggleAudio = () => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsAudioMuted(!isAudioMuted);
      socketRef.current.emit("user:toggle-media", {
        type: "isAudioMuted",
        state: !isAudioMuted,
      });
    }
  };

  const toggleVideo = () => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsVideoOff(!isVideoOff);
      socketRef.current.emit("user:toggle-media", {
        type: "isVideoOff",
        state: !isVideoOff,
      });
    }
  };

  // --- Code Execution ---
  const runCode = async () => {
    setIsRunning(true);
    setActiveTab("terminal");
    setOutput((prev) => `> Compiling...\n`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeRef.current, language, input }),
        },
      );

      const data = await response.json();
      if (data.error) {
        setOutput(`> Error:\n${data.output}`);
        toast.error("Execution failed");
      } else {
        setOutput(data.output || "> Program executed successfully (No output)");
        toast.success("Code ran successfully");
      }
    } catch (error) {
      setOutput(`> Server Connection Error: ${error.message}`);
      toast.error("Failed to connect to server");
    } finally {
      setIsRunning(false);
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID Copied!");
    } catch (err) {
      toast.error("Could not copy Room ID");
    }
  };

  if (!location.state) return <Navigate to="/" />;

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0f111a] text-[#e0e0e0] font-sans relative">
      
      {/* --- INJECT THE NEW VIDEO DOCK COMPONENT HERE --- */}
      <VideoDock
        myStream={myStream}
        remoteStreams={remoteStreams}
        remoteUsersInfo={remoteUsersInfo}
        email={email}
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        toggleAudio={toggleAudio}
        toggleVideo={toggleVideo}
      />

      {/* Mobile Sidebar Toggle */}
      <div
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-[#1a1d2d] rounded-lg border border-[#2b3040] shadow-lg cursor-pointer hover:bg-[#2b3040]"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </div>

      {/* SIDEBAR */}
      <div
        className={`fixed md:static top-0 left-0 h-full w-[260px] bg-[#1a1d2d] flex flex-col border-r border-[#2b3040] transition-transform z-[40] shadow-2xl md:shadow-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-4 border-b border-[#2b3040] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <img src="/wecode.png" alt="logo" className="h-6" />
            <span className="font-bold text-lg tracking-wide text-white">
              WeCode
            </span>
          </div>
          <button
            className="md:hidden text-gray-400"
            onClick={() => setIsSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Connected Members
          </h3>
          <div className="flex flex-col gap-3">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#2b3040] flex flex-col gap-3 shrink-0">
          <button
            className="w-full py-2.5 rounded-lg font-semibold bg-[#2b3040] hover:bg-[#3b4252] text-white transition-all text-sm border border-transparent"
            onClick={copyRoomId}
          >
            Copy Room ID
          </button>
          <button
            className="w-full py-2.5 rounded-lg font-semibold bg-[#ef4444] hover:bg-[#dc2626] text-white transition-all text-sm shadow-lg shadow-red-500/20"
            onClick={() => setShowLeaveModal(true)}
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[30] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-[#0f111a] z-0">
        <div className="h-14 md:h-16 bg-[#1a1d2d] border-b border-[#2b3040] flex items-center justify-end md:justify-between px-4 md:px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-2 bg-[#0f111a] px-2 md:px-3 py-1.5 rounded-md border border-[#2b3040] ml-10 md:ml-0">
            <span className="text-xs font-bold text-gray-400 uppercase hidden sm:inline">
              Lang:
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-white text-xs md:text-sm outline-none cursor-pointer font-medium hover:text-[#4aee88] transition-colors"
            >
              <option value="javascript" className="bg-[#0f111a] text-white">
                JavaScript
              </option>
              <option value="python" className="bg-[#0f111a] text-white">
                Python 3
              </option>
              <option value="cpp" className="bg-[#0f111a] text-white">
                C++ (GCC)
              </option>
              <option value="java" className="bg-[#0f111a] text-white">
                Java
              </option>
            </select>
          </div>

          <button
            onClick={runCode}
            disabled={isRunning}
            className={`group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 font-bold text-white transition-all duration-200 rounded-lg shadow-lg ${isRunning ? "bg-gray-600 cursor-not-allowed opacity-75" : "bg-gradient-to-r from-[#4aee88] to-[#2ecc71] hover:from-[#3ddc7c] hover:to-[#27ae60] active:scale-95"}`}
          >
            {isRunning ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-sm tracking-wide">Executing...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 fill-current group-hover:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="text-sm tracking-wide">Run Code</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden flex border-b border-[#2b3040] bg-[#1a1d2d] shrink-0">
          <button
            className={`flex-1 py-2 text-sm font-bold ${activeTab === "editor" ? "text-[#4aee88] border-b-2 border-[#4aee88]" : "text-gray-400"}`}
            onClick={() => setActiveTab("editor")}
          >
            Code
          </button>
          <button
            className={`flex-1 py-2 text-sm font-bold ${activeTab === "terminal" ? "text-[#4aee88] border-b-2 border-[#4aee88]" : "text-gray-400"}`}
            onClick={() => setActiveTab("terminal")}
          >
            Input / Output
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          <div
            className={`flex-1 h-full md:border-r border-[#2b3040] relative ${activeTab === "editor" ? "block" : "hidden md:block"}`}
          >
            <Editor
              socketRef={socketRef}
              roomId={roomId}
              onCodeChange={(code) => {
                codeRef.current = code;
              }}
              language={language}
            />
          </div>
          <div
            className={`h-full md:w-[400px] bg-[#0f111a] flex flex-col border-l border-[#2b3040] ${activeTab === "terminal" ? "block" : "hidden md:flex"}`}
          >
            <div className="flex-1 flex flex-col border-b border-[#2b3040] relative group min-h-[150px]">
              <div className="absolute top-0 left-0 right-0 bg-[#1a1d2d] px-4 py-2 text-xs font-bold text-gray-400 border-b border-[#2b3040] flex items-center justify-between">
                <span>STDIN (Input)</span>
              </div>
              <textarea
                className="flex-1 bg-[#0f111a] text-white p-4 pt-10 resize-none outline-none font-mono text-sm custom-scrollbar"
                placeholder="Enter input..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <div className="flex-[1.5] flex flex-col relative min-h-[150px]">
              <div className="absolute top-0 left-0 right-0 bg-[#1a1d2d] px-4 py-2 text-xs font-bold text-gray-400 border-b border-[#2b3040] flex items-center justify-between">
                <span>TERMINAL (Output)</span>
                <button
                  onClick={() => setOutput("")}
                  className="hover:text-white transition-colors text-xs"
                >
                  Clear
                </button>
              </div>
              <pre
                className={`flex-1 p-4 pt-10 overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap custom-scrollbar ${output.includes("Error") ? "text-red-400" : "text-gray-300"}`}
              >
                {output || (
                  <span className="text-gray-600 italic">
                    // Output will appear here...
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Room Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-[#1a1d2d] p-6 rounded-xl border border-[#2b3040] shadow-2xl w-[90%] max-w-[350px] text-center transform scale-100">
            <h3 className="text-xl font-bold text-white mb-2">Leave Room?</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to leave the collaboration session?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                className="flex-1 py-2.5 rounded-lg font-bold bg-[#2b3040] hover:bg-[#3b4252] text-white transition-all border border-transparent"
                onClick={() => setShowLeaveModal(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 rounded-lg font-bold bg-[#ef4444] hover:bg-[#dc2626] text-white transition-all shadow-lg shadow-red-500/20"
                onClick={() => reactNavigator("/")}
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;