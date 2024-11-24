import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from 'axios';
import MessageList from "./MessageList";
import UserInfo from "./UserInfo";
import { useUser } from "./UserContext";
import { 
  X,
  BookOpen, 
  CircleUser, 
  Clock, 
  Calendar, 
  TrendingUp, 
  MessageCircle,
  Award,
  ChevronRight,
  Loader2,
  Check
} from 'lucide-react';
import SessionCard from "./SessionCard";

const DashboardCard = ({ title, icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl shadow-md overflow-visible"
  >
    <div className="p-6">
      <div className="flex items-center mb-4 overflow-visible">
        <Icon className="w-6 h-6 text-[#8B4513] mr-3 overflow-visible" />
        <h3 className="text-lg font-semibold text-[#8B4513] overflow-visible">{title}</h3>
      </div>
      {children}
    </div>
  </motion.div>
);


const ProgressItem = ({ language, progress, level }) => (
  <motion.div whileHover={{ scale: 1.02 }} className="mb-4 last:mb-0">
    <div className="flex justify-between mb-2">
      <span className="text-[#6B4423] font-medium">{language}</span>
      <span className="text-[#8B4513]">Level {level}</span>
    </div>
    <div className="h-2 bg-[#DEB887]/20 rounded-full">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full bg-[#8B4513] rounded-full"
      />
    </div>
  </motion.div>
);

const QuickAction = ({ icon: Icon, title, link }) => (
  <Link to={link}>
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center p-4 bg-[#fff5d6] rounded-xl"
    >
      <Icon className="w-8 h-8 text-[#8B4513] mb-2" />
      <span className="text-sm font-medium text-[#6B4423] text-center">
        {title}
      </span>
    </motion.div>
  </Link>
);

const StudentDashboard = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/bookings', {
        headers: { 'x-session-id': localStorage.getItem('sessionId') }
      });
      setSessions(response.data);
    } catch (err) {
      setError('Failed to fetch sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // useEffect for initial data fetch
  useEffect(() => {
    fetchSessions();
  }, []);

  const cancelSession = async (sessionId) => {
    try {
      await axios.post(
        `/api/bookings/${sessionId}/cancel`,
        {},
        {
          headers: { "x-session-id": localStorage.getItem("sessionId") },
        }
      );
      fetchSessions(); // Refresh sessions after cancellation
    } catch (err) {
      setError("Failed to cancel session");
      console.error("Error canceling session:", err);
    }
  };

  const upcomingSessions = sessions.filter(
    (session) =>
      new Date(session.date) > new Date() && session.status !== "cancelled"
  );

  const recentSessions = sessions
    .filter(
      (session) =>
        new Date(session.date) <= new Date() || session.status === "cancelled"
    )
    .slice(0, 3); // Only show last 3 recent sessions

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-[#8B4513] animate-spin" />
          <span className="text-[#8B4513] font-medium">
            Loading your dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-visible">
        <div className="flex flex-col md:flex-row gap-8 overflow-visible">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full md:w-64 space-y-4"
          >
            <UserInfo />
            <nav className="bg-white rounded-xl p-4 shadow-md">
              <button
                onClick={() => setActiveTab("overview")}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  activeTab === "overview"
                    ? "bg-[#fff5d6] text-[#8B4513]"
                    : "text-[#6B4423] hover:bg-[#fff5d6]/50"
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab("progress")}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  activeTab === "progress"
                    ? "bg-[#fff5d6] text-[#8B4513]"
                    : "text-[#6B4423] hover:bg-[#fff5d6]/50"
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span>Progress</span>
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  activeTab === "messages"
                    ? "bg-[#fff5d6] text-[#8B4513]"
                    : "text-[#6B4423] hover:bg-[#fff5d6]/50"
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                <span>Messages</span>
              </button>
            </nav>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1 space-y-6 overflow-visible">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <QuickAction
                icon={MessageCircle}
                title="Start Practice"
                link="/practice"
              />
              <QuickAction
                icon={CircleUser}
                title="Find Tutor"
                link="/find-tutor"
              />
              <QuickAction
                icon={Calendar}
                title="Schedule Session"
                link="/schedule"
              />
              <QuickAction
                icon={Award}
                title="View Progress"
                link="/progress"
              />
            </motion.div>

            {/* Dashboard Cards */}
            <div className="grid md:grid-cols-2 gap-6 overflow-visible">
              {/* Updated Upcoming Sessions Card */}
              <DashboardCard title="Upcoming Sessions" icon={Clock}>
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 text-[#8B4513] animate-spin" />
                  </div>
                ) : upcomingSessions.length === 0 ? (
                  <div className="text-center py-6 text-[#6B4423]">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-[#8B4513] opacity-50" />
                    <p>No upcoming sessions</p>
                    <Link
                      to="/find-tutor"
                      className="text-[#8B4513] font-medium hover:underline inline-flex items-center mt-2"
                    >
                      Book a session <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-visible">
                    {upcomingSessions.map((session) => (
                      <SessionCard
                        key={session._id}
                        session={session}
                        onShowDetails={setSelectedSession}
                        onCancelSession={cancelSession}
                      />
                    ))}
                  </div>
                )}
              </DashboardCard>

              <DashboardCard title="Language Progress" icon={TrendingUp}>
                <ProgressItem language="Spanish" progress={75} level="B1" />
                <ProgressItem language="French" progress={45} level="A2" />
              </DashboardCard>

              {/* Recent Sessions Card */}
              <DashboardCard title="Recent Sessions" icon={Clock}>
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 text-[#8B4513] animate-spin" />
                  </div>
                ) : recentSessions.length === 0 ? (
                  <div className="text-center py-6 text-[#6B4423]">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-[#8B4513] opacity-50" />
                    <p>No past sessions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentSessions.map((session) => (
                      <div
                        key={session._id}
                        className="flex items-center justify-between p-4 border-b border-[#DEB887]/20 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-[#6B4423]">
                            {new Date(session.date).toLocaleDateString()} -{" "}
                            {session.time}
                          </p>
                          <p className="text-sm text-[#8B4513]">
                            {session.tutorId.username} - {session.language}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            session.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : session.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {session.status.charAt(0).toUpperCase() +
                            session.status.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>

              <DashboardCard title="Study Streak" icon={Award}>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#8B4513] mb-2">
                    7 Days
                  </div>
                  <p className="text-[#6B4423]">Keep up the great work!</p>
                  <div className="flex justify-center space-x-2 mt-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <div
                        key={day}
                        className="w-8 h-8 rounded-full bg-[#fff5d6] flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 text-[#8B4513]" />
                      </div>
                    ))}
                  </div>
                </div>
              </DashboardCard>
            </div>
          </div>
        </div>
      </div>
      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#8B4513]">
                Session Details
              </h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-[#6B4423] hover:text-[#8B4513]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-[#6B4423]">
                <Calendar className="w-5 h-5" />
                <span>
                  {new Date(selectedSession.date).toLocaleDateString()} at{" "}
                  {selectedSession.time}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-[#6B4423]">
                <MessageCircle className="w-5 h-5" />
                <span>
                  {selectedSession.language} Lesson with{" "}
                  {selectedSession.tutorId.username}
                </span>
              </div>

              {selectedSession.meetingLink && (
                <a
                  href={selectedSession.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2 bg-[#8B4513] text-white rounded-lg text-center mt-4"
                >
                  Join Meeting
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
