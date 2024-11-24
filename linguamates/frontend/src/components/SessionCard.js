import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  X,
  FileText,
  Loader2,
  Phone,
  Mic,
  MicOff,
  VideoOff,
} from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import io from "socket.io-client";
import { useUser } from "../components/UserContext";
import TranslationSettings from "./TranslationSettings";
import VideoContainer from "./VideoContainer";

const SessionCard = ({ session, onShowDetails, onCancelSession }) => {
  const { user } = useUser();
  const [inCall, setInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);

  // Translation state
  const [languages, setLanguages] = useState([]);
  const [fromLanguage, setFromLanguage] = useState("");
  const [toLanguage, setToLanguage] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState({
    original: "",
    translated: "",
  });

  // Refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteVideosRef = useRef(new Map());
  const mediaRecorderRef = useRef(null);
  const subtitleTimeoutRef = useRef(null);

  const isUpcoming = isAfter(parseISO(session.date), new Date());

  const setupPeerConnection = async (targetSocketId) => {
    try {
      console.log("[WebRTC] Setting up peer connection for", targetSocketId);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state:", pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
      };

      pc.onnegotiationneeded = async () => {
        try {
          console.log("[WebRTC] Negotiation needed");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("callSignal", {
            sessionId: session._id,
            targetSocketId,
            signal: offer,
          });
        } catch (err) {
          console.error("[WebRTC] Negotiation error:", err);
        }
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          console.log("[WebRTC] Adding local track:", track.kind);
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.ontrack = (event) => {
        console.log("[WebRTC] Received remote track:", event.track.kind);
        const [remoteStream] = event.streams;

        let container = remoteVideosRef.current.get(targetSocketId);
        if (!container) {
          container = document.createElement("div");
          container.className = "relative aspect-video";

          const video = document.createElement("video");
          video.autoplay = true;
          video.playsInline = true;
          video.className = "w-full h-full object-cover rounded-lg bg-gray-900";
          video.srcObject = remoteStream;

          container.appendChild(video);

          const remoteVideosContainer = document.getElementById("remoteVideos");
          if (remoteVideosContainer) {
            remoteVideosContainer.appendChild(container);
            remoteVideosRef.current.set(targetSocketId, container);
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] New ICE candidate");
          socketRef.current?.emit("callSignal", {
            sessionId: session._id,
            targetSocketId,
            signal: {
              type: "ice",
              candidate: event.candidate,
            },
          });
        }
      };

      peerConnectionsRef.current.set(targetSocketId, pc);
      return pc;
    } catch (err) {
      console.error("[WebRTC] Setup error:", err);
      throw err;
    }
  };

  const handleCallSignal = async (fromSocketId, signal) => {
    try {
      let pc = peerConnectionsRef.current.get(fromSocketId);

      if (!pc) {
        pc = await setupPeerConnection(fromSocketId);
      }

      if (signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current?.emit("callSignal", {
          sessionId: session._id,
          targetSocketId: fromSocketId,
          signal: answer,
        });
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === "ice" && signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error("[WebRTC] Signal handling error:", err);
    }
  };

  const cleanup = () => {
    try {
      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Error stopping track:", e);
          }
        });
        localStreamRef.current = null;
      }

      // Stop recording if active
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error("Error stopping recorder:", e);
        }
      }
      mediaRecorderRef.current = null;

      // Clear socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Close peer connections
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch (e) {
          console.error("Error closing peer connection:", e);
        }
      });
      peerConnectionsRef.current.clear();

      // Remove remote videos
      remoteVideosRef.current.forEach((container) => {
        try {
          container.remove();
        } catch (e) {
          console.error("Error removing video container:", e);
        }
      });
      remoteVideosRef.current.clear();

      // Clear timeouts
      if (subtitleTimeoutRef.current) {
        clearTimeout(subtitleTimeoutRef.current);
        subtitleTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  useEffect(() => {
    if (!inCall) return;

    const initializeCall = async () => {
      try {
        setLoading(true);
        console.log("[Call] Initializing call...");

        // Fetch languages
        const langResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/languages`);
        const langData = await langResponse.json();
        setLanguages(langData);

        // Set up media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Set up socket
        const socket = io(`${process.env.REACT_APP_API_URL}`, { withCredentials: true });
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("[Socket] Connected");
          socket.emit("joinCall", {
            sessionId: session._id,
            userId: user._id,
          });
        });

        socket.on("participantUpdate", ({ participants, count }) => {
          console.log("[Call] Participant update:", { count, participants });
          setParticipantCount(count);

          participants.forEach(async (socketId) => {
            if (!peerConnectionsRef.current.has(socketId)) {
              const pc = await setupPeerConnection(socketId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              socket.emit("callSignal", {
                sessionId: session._id,
                targetSocketId: socketId,
                signal: offer,
              });
            }
          });
        });

        socket.on("callSignal", async ({ fromSocketId, signal }) => {
          console.log("[WebRTC] Received signal from", fromSocketId);
          await handleCallSignal(fromSocketId, signal);
        });

        socket.on('translation', (data) => {
            console.log('[Translation] Received:', data);
            
            if (subtitleTimeoutRef.current) {
              clearTimeout(subtitleTimeoutRef.current);
            }
          
            setCurrentSubtitle({
              original: data.original,
              translated: data.translated
            });
          
            subtitleTimeoutRef.current = setTimeout(() => {
              setCurrentSubtitle({ original: '', translated: '' });
            }, 5000);
          });

        setLoading(false);
      } catch (err) {
        console.error("[Call] Initialization error:", err);
        setError(err.message || "Failed to start call");
        setLoading(false);
        setInCall(false);
      }
    };

    initializeCall();
    return cleanup;
  }, [inCall, session._id, user._id]);

// In your SessionCard.js, update the recording setup:

// In SessionCard.js:

// In SessionCard.js, update the recording effect:

// In SessionCard.js:

// In SessionCard.js

// In SessionCard.js:
const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/wav'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log('[Recording] Using MIME type:', type);
      return type;
    }
  }
  throw new Error('No supported audio MIME type found');
};

useEffect(() => {
    if (!inCall || !isTranslating || !fromLanguage || !toLanguage) return;
  
    let recorder = null;
    let audioStream = null;
  
    const setupAudioRecording = async () => {
      try {
        console.log('[Translation] Setting up recording...');
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          }
        });
              // Get supported MIME type
        const mimeType = getSupportedMimeType();
  
        // Explicitly use WebM with opus codec
        recorder = new MediaRecorder(audioStream, {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 16000
        });
  
        let chunks = [];
  
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
  
        recorder.onstop = async () => {
          if (chunks.length > 0 && socketRef.current) {
            try {
              const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
              chunks = []; // Clear chunks for next recording
  
              // Convert blob to base64
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Audio = reader.result.split(',')[1];
                console.log('[Translation] Sending audio chunk:', blob.size, 'bytes');
                socketRef.current.emit('audioChunk', {
                  audioBlob: base64Audio,
                  fromLanguage,
                  toLanguage,
                  sessionId: session._id,
                  mimeType
                });
              };
              reader.readAsDataURL(blob);
            } catch (err) {
              console.error('[Translation] Error processing audio:', err);
            }
          }
          // Start next recording after a short delay
          // setTimeout(() => {
          //   if (recorder.state === 'inactive') {
          //     recorder.start();
          //   }
          // }, 100);
          setTimeout(() => {
            if (recorder && recorder.state === 'inactive' && isTranslating) {
              try {
                recorder.start();
                console.log('[Translation] Started new recording segment');
              } catch (err) {
                console.error('[Translation] Failed to start new recording:', err);
                setError('Failed to restart recording');
                setIsTranslating(false);
              }
            }
          }, 100);
  
        };
  
        // Start recording
        recorder.start();
        console.log('[Translation] Recording started');
  
        // Set up interval to stop/start recording every 3 seconds
        const recordingInterval = setInterval(() => {
          if (recorder && recorder.state === 'recording') {
            recorder.stop(); // This will trigger onstop event
          }
        }, 3000);
  
        // Store interval for cleanup
        recorder.interval = recordingInterval;
  
      } catch (err) {
        console.error('[Translation] Recording error:', err);
        setError('Failed to start translation');
        setIsTranslating(false);
      }
    };
  
    setupAudioRecording();
  
    // Cleanup function
    return () => {
      if (recorder) {
        if (recorder.interval) {
          clearInterval(recorder.interval);
        }
        if (recorder.state === 'recording') {
          try {
            recorder.stop();
          } catch (e) {
            console.error('Error stopping recorder:', e);
          }
        }
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.error('Error stopping track:', e);
          }
        });
      }
    };
  }, [inCall, isTranslating, fromLanguage, toLanguage, session._id]);

  const joinCall = () => setInCall(true);
  const endCall = () => {
    if (socketRef.current) {
      socketRef.current.emit("leaveCall", {
        sessionId: session._id,
        userId: user._id,
      });
    }
    cleanup();
    setInCall(false);
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-[#8B4513]">
              {user.role === "student"
                ? session.tutorId?.username
                : session.studentId?.username}
            </h3>
            <p className="text-sm text-[#6B4423]">{session.language} Lesson</p>
          </div>
          <div className="flex flex-col items-end">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                session.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : session.status === "cancelled"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center text-[#6B4423]">
            <Calendar className="w-4 h-4 mr-2" />
            {format(parseISO(session.date), "MMM d, yyyy")}
          </div>
          <div className="flex items-center text-[#6B4423]">
            <Clock className="w-4 h-4 mr-2" />
            {session.time}
          </div>
        </div>

        {isUpcoming && session.status === "scheduled" && (
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={inCall ? endCall : joinCall}
              disabled={loading}
              className={`flex-1 ${
                inCall ? "bg-red-500 text-white" : "bg-[#8B4513] text-white"
              } px-4 py-2 rounded-lg flex items-center justify-center space-x-2`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : inCall ? (
                <>
                  <Phone className="w-4 h-4" />
                  <span>End Call</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Join Call</span>
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onShowDetails(session)}
              className="flex-1 border-2 border-[#8B4513] text-[#8B4513] px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Details</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCancelSession(session._id)}
              className="flex-1 border-2 border-red-500 text-red-500 px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </motion.button>
          </div>
        )}
      </motion.div>

   
      {inCall && (
  <VideoContainer
    isLocal={true}
    videoRef={localVideoRef}
    username="You"
    isVideoEnabled={isVideoEnabled}
    isAudioEnabled={isAudioEnabled}
    currentSubtitle={currentSubtitle}
  >
    {/* Translation Settings */}
    <div className="absolute top-0 left-0 right-0 p-4 bg-black/50">
      <TranslationSettings
        languages={languages}
        fromLanguage={fromLanguage}
        toLanguage={toLanguage}
        setFromLanguage={setFromLanguage}
        setToLanguage={setToLanguage}
        isTranslating={isTranslating}
        setIsTranslating={setIsTranslating}
      />
    </div>

    {/* Remote Videos */}
    <div 
      id="remoteVideos" 
      className="absolute top-0 right-0 w-1/2 h-full"
    />

    {/* Call Controls */}
    <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center space-x-4 py-6 bg-black/50">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleAudio}
        className={`p-4 rounded-full ${
          isAudioEnabled
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-red-500 hover:bg-red-600"
        }`}
      >
        {isAudioEnabled ? (
          <Mic className="w-6 h-6 text-white" />
        ) : (
          <MicOff className="w-6 h-6 text-white" />
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={endCall}
        className="p-4 rounded-full bg-red-500 hover:bg-red-600"
      >
        <Phone className="w-6 h-6 text-white" />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleVideo}
        className={`p-4 rounded-full ${
          isVideoEnabled
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-red-500 hover:bg-red-600"
        }`}
      >
        {isVideoEnabled ? (
          <Video className="w-6 h-6 text-white" />
        ) : (
          <VideoOff className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </div>
  </VideoContainer>
)}
      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <X className="w-4 h-4 mr-2" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError("")}
            className="absolute top-1 right-1 text-red-700 hover:text-red-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};

export default SessionCard;
