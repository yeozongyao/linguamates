import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Plus, Trash2, Save, Edit, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, set, isAfter } from 'date-fns';
import availabilityService from '../services/availability-service';

axios.defaults.baseURL = `${process.env.REACT_APP_API_URL}`;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const TutorAvailability = () => {
  const [loading, setLoading] = useState(false);
  const [availabilities, setAvailabilities] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState(null);

  useEffect(() => {
    if (selectedDay) {
      const sessionId = localStorage.getItem('sessionId');
      setLoading(true);
      setError('');
      
      availabilityService.fetchAvailabilityForDate(selectedDay, sessionId)
        .then(data => {
          if (data) {
            setTimeSlots(data.timeSlots || []);
            setSelectedAvailability(data);
          } else {
            setTimeSlots([]);
            setSelectedAvailability(null);
          }
        })
        .catch(err => {
          setError(err.message || 'Failed to fetch availability');
          console.error('Availability fetch error:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedDay]);

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 9; hour < 21; hour++) {
      for (let minute of [0, 30]) {
        const time = set(new Date(), { hours: hour, minutes: minute });
        times.push(format(time, 'HH:mm'));
      }
    }
    return times;
  };

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: '09:00', end: '09:30' }]);
  };

  const removeTimeSlot = (index) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index, field, value) => {
    const newSlots = [...timeSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setTimeSlots(newSlots);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    if (selectedAvailability) {
      setTimeSlots(selectedAvailability.timeSlots);
    } else {
      setTimeSlots([]);
    }
  };

  const saveAvailability = async () => {
    try {
      setLoading(true);
      setError('');
      
      const invalidSlots = timeSlots.some(slot => {
        const start = new Date(`2000-01-01T${slot.start}`);
        const end = new Date(`2000-01-01T${slot.end}`);
        return start >= end;
      });

      if (invalidSlots) {
        setError('Invalid time slots. End time must be after start time.');
        return;
      }

      const response = await availabilityService.saveAvailability(
        selectedDay,
        timeSlots,
        localStorage.getItem('sessionId')
      );

      if (response.warning) {
        setSuccess('Availability saved with limited calendar integration');
      } else {
        setSuccess('Availability saved successfully!');
      }

      // Refresh the availability data
      const refreshedData = await availabilityService.fetchAvailabilityForDate(
        selectedDay,
        localStorage.getItem('sessionId')
      );
      
      if (refreshedData) {
        setTimeSlots(refreshedData.timeSlots || []);
        setSelectedAvailability(refreshedData);
      }

      setEditMode(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving availability:', err);
      setError(err.message || 'Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-[#8B4513]">Manage Your Availability</h2>
          <p className="text-[#6B4423] mt-2">Set and manage your available time slots for tutoring sessions.</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Date Selection */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex-1 md:mr-4">
              <label className="block text-[#6B4423] mb-2 font-medium">Select Date</label>
              <input
                type="date"
                value={selectedDay || ''}
                onChange={(e) => setSelectedDay(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
              />
            </div>
            {selectedDay && selectedAvailability && !editMode && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditMode(true)}
                className="mt-4 md:mt-0 flex items-center space-x-2 px-6 py-2 bg-[#8B4513] text-white rounded-lg"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Slots</span>
              </motion.button>
            )}
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#8B4513] animate-spin" />
            </div>
          ) : (
            <>
              {selectedDay ? (
                <>
                  {editMode ? (
                    // Edit Mode
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-[#8B4513]">Edit Time Slots</h3>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={addTimeSlot}
                          className="flex items-center space-x-2 px-4 py-2 bg-[#8B4513] text-white rounded-lg"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Slot</span>
                        </motion.button>
                      </div>

                      {timeSlots.map((slot, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center space-x-4 bg-[#fff5d6] p-4 rounded-lg"
                        >
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-[#6B4423] mb-1">Start Time</label>
                              <select
                                value={slot.start}
                                onChange={(e) => handleTimeChange(index, "start", e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#8B4513]"
                              >
                                {generateTimeOptions().map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm text-[#6B4423] mb-1">End Time</label>
                              <select
                                value={slot.end}
                                onChange={(e) => handleTimeChange(index, "end", e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#8B4513]"
                              >
                                {generateTimeOptions().map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeTimeSlot(index)}
                            className="text-red-500 hover:text-red-600 p-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </motion.button>
                        </motion.div>
                      ))}

                      {/* Action Buttons */}
                      {timeSlots.length > 0 && (
                        <div className="flex space-x-4 mt-6">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={saveAvailability}
                            disabled={loading}
                            className="flex-1 py-3 bg-[#8B4513] text-white rounded-lg flex items-center justify-center space-x-2"
                          >
                            {loading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-5 h-5" />
                                <span>Save Changes</span>
                              </>
                            )}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setEditMode(false)}
                            className="flex-1 py-3 border-2 border-[#8B4513] text-[#8B4513] rounded-lg"
                          >
                            Cancel
                          </motion.button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      {selectedAvailability && selectedAvailability.timeSlots.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedAvailability.timeSlots.map((slot, index) => (
                            <motion.div
                              key={index}
                              whileHover={{ scale: 1.02 }}
                              className={`p-4 rounded-lg ${
                                slot.status === 'booked' 
                                  ? 'bg-yellow-50 border border-yellow-200'
                                  : 'bg-[#fff5d6]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-[#8B4513]" />
                                  <span className="text-[#8B4513] font-medium">
                                    {slot.start} - {slot.end}
                                  </span>
                                </div>
                                <span className={`text-sm px-2 py-1 rounded-full ${
                                  slot.status === 'booked'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {slot.status === 'booked' ? 'Booked' : 'Available'}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Calendar className="w-16 h-16 text-[#8B4513] mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-[#8B4513] mb-2">
                            No Availability Set
                          </h3>
                          <p className="text-[#6B4423] mb-6">
                            You haven't set any available time slots for this date.
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setEditMode(true)}
                            className="px-6 py-2 bg-[#8B4513] text-white rounded-lg"
                          >
                            Set Availability
                          </motion.button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                // No Date Selected
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-[#8B4513] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#8B4513] mb-2">
                    Select a Date
                  </h3>
                  <p className="text-[#6B4423]">
                    Choose a date to view or set your availability.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Error and Success Messages */}
          {error && (
            <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 p-4 bg-green-100 text-green-700 rounded-lg flex items-center">
              <span className="mr-2">✅</span>
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorAvailability;
