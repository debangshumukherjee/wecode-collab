import React, { useState, useRef, useEffect } from "react";
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

  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [videoToken, setVideoToken] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch LiveKit Video Token
    const fetchToken = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/get-video-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: roomId, email, participantName: username }),
        });
        const data = await response.json();

        if (isMounted) setVideoToken(data.token);
      } catch (error) {
        toast.error("Failed to connect to video server");
      }
    };
    
    if (username && roomId) fetchToken();

    // 2. Initialize WeCode Code Sync Socket
    const init = async () => {
      socketRef.current = initSocket();
      const socket = socketRef.current;

      socket.on("connect_error", (err) => handleErrors(err));
      socket.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socket.on("join_error", ({ message }) => {
        toast.error(message);
        reactNavigator("/");
      });

      socket.emit(ACTIONS.JOIN, { roomId, email, username });

      socket.on(ACTIONS.JOINED, ({ clients, username: joinedName, socketId }) => {
        if (socketId !== socketRef.current.id) toast.success(`${joinedName} joined the room.`);
        setClients(clients);
        socket.emit(ACTIONS.SYNC_CODE, { code: codeRef.current, socketId });
      });

      socket.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftName }) => {
        toast.success(`${leftName} left the room.`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
      });
    };
    
    if (username) init();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off("join_error");
      }
    };
  }, []);

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
        }
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
      
      {/* Video Dock */}
      <VideoDock token={videoToken} />

      {/* Mobile Sidebar Toggle */}
      {!isSidebarOpen && (
        <div
          className="md:hidden fixed top-3 left-3 z-50 p-2 bg-[#1a1d2d] rounded-lg border border-[#2b3040] shadow-lg cursor-pointer hover:bg-[#2b3040] transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(true)}
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
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed md:static top-0 left-0 h-full w-[260px] bg-[#1a1d2d] flex flex-col border-r border-[#2b3040] transition-transform z-[40] shadow-2xl md:shadow-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-4 border-b border-[#2b3040] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <img src="/wecode.png" alt="logo" className="h-6" />
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
              <Client key={client.socketId} username={client.socketId === socketRef.current.id ? `${client.username}(You)`: client.username} />
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