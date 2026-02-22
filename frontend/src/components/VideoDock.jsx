import React, { useRef, useState, useEffect } from "react";
import Draggable from "react-draggable";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantTile,
  ControlBar,
  useTracks,
  useLocalParticipant,
  useConnectionState,
} from "@livekit/components-react";
import { Track, ConnectionState } from "livekit-client";
import "@livekit/components-styles";


// MEDIA STATE SAVER (The Connection State Fix)

const MediaStateSaver = () => {
  const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const roomState = useConnectionState();

  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      if (typeof isCameraEnabled === "boolean") {
        localStorage.setItem("wecode_video", isCameraEnabled);
      }
      if (typeof isMicrophoneEnabled === "boolean") {
        localStorage.setItem("wecode_audio", isMicrophoneEnabled);
      }
    }
  }, [isCameraEnabled, isMicrophoneEnabled, roomState]);

  return null;
};


//  THE CUSTOM GRID

const CustomVideoGrid = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const [currentPage, setCurrentPage] = useState(0);
  const tracksPerPage = 4;
  const totalPages = Math.ceil(tracks.length / tracksPerPage);

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  const startIndex = currentPage * tracksPerPage;
  const visibleTracks = tracks.slice(startIndex, startIndex + tracksPerPage);

  let gridContainerClasses = "grid w-full h-full gap-1 p-1 ";
  if (visibleTracks.length === 1) {
    gridContainerClasses += "grid-cols-1 grid-rows-1";
  } else if (visibleTracks.length === 2) {
    gridContainerClasses += "grid-cols-2 grid-rows-1";
  } else if (visibleTracks.length === 3 || visibleTracks.length === 4) {
    gridContainerClasses += "grid-cols-2 grid-rows-2";
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className={gridContainerClasses}>
        {visibleTracks.map((trackRef, index) => {
          const isThree = visibleTracks.length === 3;
          const isBigLeft = isThree && index === 0;

          return (
            <div
              key={trackRef.participant.identity + "_" + trackRef.source}
              className={`overflow-hidden rounded-lg bg-gray-900 ${
                isBigLeft ? "col-span-1 row-span-2" : "col-span-1 row-span-1"
              }`}
            >
              <ParticipantTile
                trackRef={trackRef}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 py-1.5 bg-[#1a1d2d] border-t border-[#2b3040]">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1 rounded-md text-gray-400 hover:text-[#4aee88] hover:bg-[#2b3040] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <span className="text-gray-400 text-xs font-bold tracking-widest">
            {currentPage + 1} / {totalPages}
          </span>

          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
            }
            disabled={currentPage === totalPages - 1}
            className="p-1 rounded-md text-gray-400 hover:text-[#4aee88] hover:bg-[#2b3040] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};


// MAIN DOCK COMPONENT

const VideoDock = ({ token }) => {
  const nodeRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const getInitialState = (key) => {
    const saved = localStorage.getItem(key);
    if (saved !== null) return saved === "true";
    return false;
  };

  const [initialVideo] = useState(() => getInitialState("wecode_video"));
  const [initialAudio] = useState(() => getInitialState("wecode_audio"));

  if (!token) return null;

  return (
    <Draggable bounds="parent" handle=".drag-handle" nodeRef={nodeRef}>
      <div
        ref={nodeRef}
        className={`absolute top-16 right-6 z-50 flex flex-col bg-[#1a1d1d]/95 backdrop-blur-md border border-[#2b3040] shadow-2xl transition-all duration-300 ${
          isMinimized
            ? "rounded-xl w-max h-max p-1"
            : "p-2 rounded-2xl w-[320px]"
        }`}
      >
        <LiveKitRoom
          video={initialVideo}
          audio={initialAudio}
          token={token}
          serverUrl={
            import.meta.env.VITE_LIVEKIT_URL ||
            "wss://wecode-ynqg1jzi.livekit.cloud"
          }
          data-lk-theme="default"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: "transparent",
          }}
        >
          <MediaStateSaver />
          <RoomAudioRenderer />

          {/* --- ULTRA-COMPACT MINIMIZED LAYOUT --- */}
          {isMinimized ? (
            <div className="flex items-center gap-2 px-1">
              {/* Drag Handle */}
              <div
                className="drag-handle cursor-grab active:cursor-grabbing text-gray-500 hover:text-white p-1"
                title="Drag"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 8h16M4 16h16"
                  />
                </svg>
              </div>

              <div className="flex items-center [&_.lk-control-bar]:!bg-transparent [&_.lk-control-bar]:!p-0 [&_.lk-control-bar]:!shadow-none [&_.lk-control-bar]:!border-none [&_.lk-control-bar]:!gap-1.5 [&_.lk-button-group]:!bg-transparent [&_.lk-button-group]:!rounded-md [&_.lk-button-group]:!border-none hover:[&_.lk-button]:!bg-[#1a1d1d] [&_.lk-button]:!p-1.5 [&_.lk-button]:!transition-colors [&_.lk-button]:!outline-none [&_.lk-button:focus]:!outline-none [&_.lk-button:focus-visible]:!outline-none [&_.lk-button]:!ring-0 [&_.lk-button:focus]:!ring-0 [&_.lk-button]:!shadow-none [&_.lk-button_svg]:!w-4 [&_.lk-button_svg]:!h-4">
                <ControlBar
                  controls={{
                    camera: true,
                    microphone: true,
                    screenShare: false,
                    chat: false,
                    leave: false,
                  }}
                />
              </div>

              {/* Expand Button */}
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 text-gray-400 hover:text-[#4aee88] transition-colors rounded-md hover:bg-[#2b3040]"
                title="Expand Video"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                  />
                </svg>
              </button>
            </div>
          ) : (
            /* --- EXPANDED LAYOUT (Default) --- */
            <>
              {/* Top Bar: Drag Handle & Minimize Button */}
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="w-8"></div> {/* Spacer to center the handle */}
                {/* Drag Handle */}
                <div className="drag-handle cursor-grab active:cursor-grabbing text-gray-500 hover:text-white transition-colors p-2 flex justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9h8M8 15h8"
                    />
                  </svg>
                </div>
                {/* Minimize Button */}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#4aee88] hover:bg-[#2b3040] rounded-full transition-colors"
                  title="Minimize Video"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M20 12H4"
                    />
                  </svg>
                </button>
              </div>

              {/* Video Grid & Controls */}
              <div
                className="w-full rounded-xl overflow-hidden bg-black shadow-inner flex flex-col relative"
                style={{ height: "350px" }}
              >
                <CustomVideoGrid />
                <div className="shrink-0 scale-90 origin-bottom pb-1 pt-1 z-10">
                  <ControlBar
                    controls={{
                      camera: true,
                      microphone: true,
                      screenShare: false,
                      chat: false,
                      leave: false,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </LiveKitRoom>
      </div>
    </Draggable>
  );
};

export default VideoDock;
