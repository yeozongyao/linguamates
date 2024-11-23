import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const BookingDialog = ({ tutor, isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/tutors/${tutor._id}/availability`,
        {
          params: { date: selectedDate },
          headers: { 'x-session-id': localStorage.getItem('sessionId') }
        }
      );
      setAvailableSlots(response.data);
    } catch (error) {
      setError('Failed to fetch availability');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (selectedDate) {
      fetchAvailability();
    }
  }, [selectedDate]);
  
  const handleBooking = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post(
        '/api/bookings',
        {
          tutorId: tutor._id,
          date: selectedDate,
          time: format(parseISO(selectedTime), 'HH:mm'),
          language: tutor.teachingLanguages[0],
          duration: 60
        },
        {
          headers: { 'x-session-id': localStorage.getItem('sessionId') }
        }
      );

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to book session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${isOpen ? 'block' : 'hidden'} z-50`}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-4">Book a Session with {tutor?.username}</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            Booking confirmed! Check your email for details.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-medium mb-2">Available Times</label>
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedTime(slot)}
                    className={`p-2 rounded-md text-sm ${
                      selectedTime === slot
                        ? 'bg-[#8B4513] text-white'
                        : 'border border-[#8B4513] text-[#8B4513] hover:bg-[#fff5d6]'
                    }`}
                  >
                    {format(parseISO(slot), 'h:mm a')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime || loading}
            className={`w-full py-2 px-4 rounded-md ${
              loading || !selectedDate || !selectedTime
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[#8B4513] text-white hover:bg-[#6B4423]'
            }`}
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDialog;
