import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe2,
  Users,
  Star,
  Phone,
  MessageCircle,
  Calendar,
  Loader2,
  Filter,
  CheckCircle,
} from "lucide-react";
import TutorCard from "./TutorCard";

const TutorList = () => {
  const [tutors, setTutors] = useState([]);
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [availability, setAvailability] = useState("all");
  const [rating, setRating] = useState("all");
  const [connections, setConnections] = useState(new Set());

  const languageOptions = ["English", "Spanish", "French", "German", "Chinese"];

  // Combined fetch function for both tutors and connections
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch tutors
        const tutorsResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/tutors`,
          {
            headers: { "x-session-id": localStorage.getItem("sessionId") },
          }
        );

        // Fetch connections
        const connectionsResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/connections`,
          {
            headers: { "x-session-id": localStorage.getItem("sessionId") },
          }
        );

        // Set tutors
        setTutors(tutorsResponse.data);
        setFilteredTutors(tutorsResponse.data);

        // Process connections based on response structure
        if (connectionsResponse.data) {
          if (Array.isArray(connectionsResponse.data)) {
            // If it's a direct array of tutors
            setConnections(
              new Set(connectionsResponse.data.map((tutor) => tutor._id))
            );
          } else if (connectionsResponse.data.tutors) {
            // If it has a tutors property
            setConnections(
              new Set(connectionsResponse.data.tutors.map((tutor) => tutor._id))
            );
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(
          "Failed to load data: " +
            (error.response?.data?.error || error.message)
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter effect
  useEffect(() => {
    let filtered = [...tutors];

    if (searchQuery) {
      filtered = filtered.filter(
        (tutor) =>
          tutor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tutor.teachingLanguages?.some((lang) =>
            lang.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    if (filterLanguage) {
      filtered = filtered.filter((tutor) =>
        tutor.teachingLanguages?.includes(filterLanguage)
      );
    }

    if (availability !== "all") {
      filtered = filtered.filter((tutor) =>
        availability === "now" ? tutor.isOnline : true
      );
    }

    if (rating !== "all") {
      filtered = filtered.filter((tutor) => tutor.rating >= parseInt(rating));
    }

    setFilteredTutors(filtered);
  }, [filterLanguage, tutors, searchQuery, availability, rating]);

  const isConnected = (tutorId) => {
    return connections.has(tutorId);
  };

  const connectWithTutor = async (tutorId) => {
    try {
      // console.log("sessionid:",localStorage.getItem("sessionId"))
      // const response = await axios.post(
      //   "http://localhost:3001/api/connect",
      //   { tutorId },
      //   { headers: { "x-session-id": localStorage.getItem("sessionId") } }
      // );
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/connect`,
        { tutorId: tutorId.toString() }, // Ensure tutorId is a string
        {
          headers: {
            "x-session-id": localStorage.getItem("sessionId"),
            "Content-Type": "application/json",
          }
        }
      );
      console.log("responding:", response)
      console.log("made the call")

      // Add to connections if successful
      setConnections((prev) => new Set([...prev, tutorId]));
    } catch (error) {
      console.error("Error connecting with tutor:", error);
      setError(error.response?.data?.error || "Failed to connect with tutor");
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-[#8B4513] animate-spin" />
          <span className="text-[#8B4513] font-medium">
            Finding tutors for you...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[#8B4513] mb-2">
              Find Your Perfect Tutor
            </h2>
            <p className="text-[#6B4423]">
              Connect with experienced language tutors worldwide
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className="mt-4 md:mt-0 flex items-center px-4 py-2 bg-white rounded-lg shadow-md text-[#8B4513]"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </motion.button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl shadow-md p-6 mb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tutors..."
                      className="w-full px-4 py-2 bg-[#fff5d6] rounded-lg border-2 border-[#DEB887] focus:border-[#8B4513] focus:outline-none"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B4513] w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-2">
                    Language
                  </label>
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="w-full px-4 py-2 bg-[#fff5d6] rounded-lg border-2 border-[#DEB887] focus:border-[#8B4513] focus:outline-none"
                  >
                    <option value="">All Languages</option>
                    {languageOptions.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-2">
                    Availability
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full px-4 py-2 bg-[#fff5d6] rounded-lg border-2 border-[#DEB887] focus:border-[#8B4513] focus:outline-none"
                  >
                    <option value="all">Any Time</option>
                    <option value="now">Available Now</option>
                    <option value="today">Available Today</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B4423] mb-2">
                    Rating
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full px-4 py-2 bg-[#fff5d6] rounded-lg border-2 border-[#DEB887] focus:border-[#8B4513] focus:outline-none"
                  >
                    <option value="all">Any Rating</option>
                    <option value="4">4+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredTutors.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-[#8B4513] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#8B4513] mb-2">
              No tutors found
            </h3>
            <p className="text-[#6B4423]">
              Try adjusting your filters to find more tutors
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => (
              // <TutorCard
              //   key={tutor._id}
              //   tutor={tutor}
              //   isConnected={isConnected}
              //   onConnect={connectWithTutor}
              // />
              <TutorCard
                key={tutor._id}
                tutor={tutor}
                isConnected={isConnected}
                onConnect={() => connectWithTutor(tutor._id)}  // Wrap in arrow function to only pass tutorId
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorList;
