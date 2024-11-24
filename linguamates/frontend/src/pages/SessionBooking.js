import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, ChevronRight, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';

// Set axios defaults
axios.defaults.baseURL = `${process.env.REACT_APP_API_URL}`;

const SessionBooking = () => {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tutorInfo, setTutorInfo] = useState(null);

  useEffect(() => {
    fetchTutorInfo();
  }, [tutorId]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability();
    }
  }, [selectedDate]);

  const fetchTutorInfo = async () => {
    try {
      const response = await axios.get(`/api/tutors/${tutorId}`, {
        headers: { 'x-session-id': localStorage.getItem('sessionId') }
      });
      setTutorInfo(response.data);
      if (response.data.teachingLanguages?.length > 0) {
        setSelectedLanguage(response.data.teachingLanguages[0]);
      }
    } catch (error) {
      console.error('Error fetching tutor info:', error);
      setError('Failed to fetch tutor information');
    }
  };

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tutors/${tutorId}/availability`, {
        params: { date: selectedDate },
        headers: { 'x-session-id': localStorage.getItem('sessionId') }
      });
      console.log('Available slots:', response.data);
      setAvailableSlots(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Failed to fetch availability');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      setError('');
  
      const bookingPayload = {
        tutorId,
        date: selectedDate,
        time: selectedSlot.start,
        duration: 60,
        language: selectedLanguage,
      };
  
      console.log('Booking payload:', bookingPayload);
  
      const response = await axios.post(
        '/api/bookings',
        bookingPayload,
        {
          headers: { 'x-session-id': localStorage.getItem('sessionId') },
        }
      );
  
      console.log('Booking response:', response.data);
      setSuccess(true);
      setTimeout(() => navigate('/schedule'), 2000);
    } catch (error) {
      console.error('Booking error:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Failed to book session');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] py-8">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold text-[#8B4513] mb-6">Book a Session</h2>

          {tutorInfo && (
            <div className="mb-6 p-4 bg-[#fff5d6] rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#8B4513] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {tutorInfo.username.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#8B4513]">{tutorInfo.username}</h3>
                  <p className="text-sm text-[#6B4423]">
                    Teaching: {tutorInfo.teachingLanguages?.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-[#6B4423] mb-2">Select Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#8B4513]"
            >
              {tutorInfo?.teachingLanguages?.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="mb-6">
            <label className="block text-[#6B4423] mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#8B4513]"
            />
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="mb-6">
              <label className="block text-[#6B4423] mb-2">Available Times</label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#8B4513] animate-spin" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-[#8B4513] mx-auto mb-4" />
                  <p className="text-[#6B4423]">
                    No available slots for this date.
                    <br />
                    Please select another date.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableSlots.map((slot, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-lg ${
                        selectedSlot === slot
                          ? 'bg-[#8B4513] text-white'
                          : 'bg-[#fff5d6] text-[#8B4513] hover:bg-[#DEB887]'
                      }`}
                    >
                      {slot.start} - {slot.end}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Booking Button */}
          <AnimatePresence>
            {selectedSlot && !success && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={handleBooking}
                disabled={loading}
                className="w-full py-3 bg-[#8B4513] text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Calendar className="w-5 h-5" />
                    <span>Confirm Booking</span>
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-6 bg-green-100 text-green-700 rounded-lg text-center"
            >
              <Check className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Booking Confirmed!</h3>
              <p className="mb-4">
                Your session has been scheduled successfully.
                <br />
                Redirecting to your schedule...
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SessionBooking;
