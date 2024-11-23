import React, { useState } from "react";
import {
  Star,
  Phone,
  MessageCircle,
  Calendar,
  Globe2,
  Video,
} from "lucide-react";
import BookingDialog from "./BookingDialog";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const TutorCard = ({ tutor, isConnected, onConnect }) => {
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    try {
      setLoading(true);
      await onConnect(tutor._id);
    } catch (error) {
      setError("Failed to connect with tutor");
    } finally {
      setLoading(false);
    }
  };

  const startCall = () => {
    // Implement video call functionality
    console.log("Starting call with tutor:", tutor.username);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-md overflow-hidden"
    >
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

        <div className="space-y-4">
          <div className="flex items-center text-[#6B4423]">
            <Globe2 className="w-5 h-5 mr-2 text-[#8B4513]" />
            <span>Teaching: {tutor.teachingLanguages?.join(", ")}</span>
          </div>

          <div className="flex items-center text-[#6B4423]">
            <Calendar className="w-5 h-5 mr-2 text-[#8B4513]" />
            <span>Next available: Today, 3:00 PM</span>
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
                className="flex-1 border-2 border-[#8B4513] text-[#8B4513] px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-[#fff5d6]"
              >
                <Video className="w-4 h-4" />
                <span>Start Call</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-[#8B4513] text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-[#6B4423] disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{loading ? "Connecting..." : "Connect"}</span>
            </button>
          )}
        </div>
      </div>

      <BookingDialog
        tutor={tutor}
        isOpen={showBookingDialog}
        onClose={() => setShowBookingDialog(false)}
      />
    </motion.div>
  );
};

export default TutorCard;
