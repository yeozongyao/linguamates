import React, { useState, useRef, useEffect } from "react";
import {
  Star,
  Phone,
  MessageCircle,
  Calendar,
  Globe2,
  Video,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const TutorCard = ({ tutor, isConnected, onConnect }) => {
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const startCall = async () => {
    try {
      setLoading(true);
      
      // Get local video stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer connection
      const configuration = { 
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ] 
      };
      
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setRemoteStream(event.streams[0]);
        }
      };

      setInCall(true);
      setLoading(false);
    } catch (err) {
      console.error('Error starting call:', err);
      setError("Failed to start video call. Please check your camera permissions.");
      setLoading(false);
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setInCall(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [localStream]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-md overflow-hidden relative"
    >
      {/* Video Call Modal */}
      {inCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-4xl relative">
            <button
              onClick={endCall}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-gray-900"
                />
                <span className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  You
                </span>
              </div>
              <div className="relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-gray-900"
                />
                <span className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  {tutor.username}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular card content */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-[#fff5d6] to-[#ffe4a0]" />
        <div className="absolute bottom-0 transform translate-y-1/2 left-6">
          <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
            <div className="w-full h-full rounded-full bg-[#8B4513] flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {tutor.username.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-16 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-[#8B4513] mb-1">
              {tutor.username}
            </h3>
            <div className="flex items-center text-[#6B4423]">
              <Star className="w-4 h-4 fill-current text-yellow-400 mr-1" />
              <span>
                {tutor.rating || "4.5"} ({tutor.reviewCount || "24"} reviews)
              </span>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm ${
              tutor.isOnline
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {tutor.isOnline ? "Online" : "Offline"}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {isConnected(tutor._id) ? (
            <>
              <Link
                to={`/book/${tutor._id}`}
                className="flex-1 bg-[#8B4513] text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Session</span>
              </Link>
              <button
                onClick={startCall}
                disabled={loading || inCall}
                className="flex-1 border-2 border-[#8B4513] text-[#8B4513] px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-[#fff5d6] disabled:opacity-50"
              >
                <Video className="w-4 h-4" />
                <span>
                  {loading ? "Starting..." : inCall ? "In Call" : "Start Call"}
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={loading}
              className="w-full bg-[#8B4513] text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-[#6B4423] disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{loading ? "Connecting..." : "Connect"}</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TutorCard;