import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Video, 
  MessageSquare, 
  X, 
  FileText,
  Loader2
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { useUser } from '../components/UserContext';

const ScheduleManagement = () => {
  const { user } = useUser();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/bookings', {
        headers: { 'x-session-id': localStorage.getItem('sessionId') }
      });
      setSessions(response.data);
    } catch (error) {
      setError('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const cancelSession = async (sessionId) => {
    try {
      await axios.post(`/api/bookings/${sessionId}/cancel`, {}, {
        headers: { 'x-session-id': localStorage.getItem('sessionId') }
      });
      
      fetchSessions();
    } catch (error) {
      setError('Failed to cancel session');
    }
  };

// Update the SessionCard component in ScheduleManagement.jsx
const SessionCard = ({ session }) => {
  const isUpcoming = isAfter(parseISO(session.date), new Date());
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-[#8B4513]">
            {user.role === 'student' || user.role === 'both' ? session.tutorId.username : session.studentId.username}
          </h3>
          <p className="text-sm text-[#6B4423]">{session.language} Lesson</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`px-3 py-1 rounded-full text-sm ${
            session.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : session.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </span>
          {session.meetingLink && (
            <span className="text-xs text-green-600 mt-1">
              Meeting link available
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center text-[#6B4423]">
          <Calendar className="w-4 h-4 mr-2" />
          {format(parseISO(session.date), 'MMM d, yyyy')}
        </div>
        <div className="flex items-center text-[#6B4423]">
          <Clock className="w-4 h-4 mr-2" />
          {session.time}
        </div>
      </div>

      {isUpcoming && session.status === 'scheduled' && (
        <div className="flex space-x-3">
          {session.meetingLink && (
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={session.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#8B4513] text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
            >
              <Video className="w-4 h-4" />
              <span>Join Call</span>
            </motion.a>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedSession(session)}
            className="flex-1 border-2 border-[#8B4513] text-[#8B4513] px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Details</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => cancelSession(session._id)}
            className="flex-1 border-2 border-red-500 text-red-500 px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

  const filteredSessions = sessions.filter(session => {
    const sessionDate = parseISO(session.date);
    return filter === 'upcoming'
      ? isAfter(sessionDate, new Date())
      : !isAfter(sessionDate, new Date());
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#8B4513]">Your Sessions</h2>
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'upcoming'
                ? 'bg-[#8B4513] text-white'
                : 'bg-white text-[#8B4513]'
            }`}
          >
            Upcoming
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'past'
                ? 'bg-[#8B4513] text-white'
                : 'bg-white text-[#8B4513]'
            }`}
          >
            Past
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#8B4513] animate-spin" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-[#8B4513] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#8B4513] mb-2">
            No {filter} sessions found
          </h3>
          <p className="text-[#6B4423]">
            {filter === 'upcoming'
              ? "You don't have any upcoming sessions scheduled"
              : "You haven't completed any sessions yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map(session => (
            <SessionCard key={session._id} session={session} />
          ))}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#8B4513]">Session Details</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-[#6B4423] hover:text-[#8B4513]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Session details content */}
              <div className="flex items-center space-x-2 text-[#6B4423]">
                <Calendar className="w-5 h-5" />
                <span>
                  {format(parseISO(selectedSession.date), 'MMMM d, yyyy')} at {selectedSession.time}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-[#6B4423]">
                <MessageSquare className="w-5 h-5" />
                <span>{selectedSession.language} Lesson</span>
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
    </div>
  );
};

export default ScheduleManagement;