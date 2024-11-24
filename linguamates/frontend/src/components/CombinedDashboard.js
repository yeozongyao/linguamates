import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from './UserContext';
import StudentDashboard from './StudentDashboard';
import TutorDashboard from './TutorDashboard';
import { BookOpen, Users } from 'lucide-react';

const CombinedDashboard = () => {
  const { user } = useUser();
  const [activeRole, setActiveRole] = useState(user?.role === 'both' ? 'student' : user?.role);

  // Update active role when user changes
  useEffect(() => {
    if (user?.role !== 'both') {
      setActiveRole(user?.role);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0]">
      {user?.role === 'both' && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="flex gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveRole('student')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${
                activeRole === 'student'
                  ? 'bg-[#8B4513] text-white'
                  : 'bg-white text-[#8B4513]'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Student Dashboard</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveRole('tutor')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${
                activeRole === 'tutor'
                  ? 'bg-[#8B4513] text-white'
                  : 'bg-white text-[#8B4513]'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Tutor Dashboard</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Render the appropriate dashboard based on activeRole */}
      {activeRole === 'student' ? <StudentDashboard /> : <TutorDashboard />}
    </div>
  );
};

export default CombinedDashboard;