import axios from 'axios';

class AvailabilityService {
  constructor(baseURL = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}`) {
    this.axios = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async fetchAvailabilityForDate(date, sessionId) {
    if (!date) {
      throw new Error('Date is required');
    }

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    try {
      const response = await this.axios.get('/api/tutors/my-availability', {
        params: { date },
        headers: { 
          'x-session-id': sessionId
        }
      });

      return response.data;
    } catch (error) {
      // Handle specific error cases
      if (error.response) {
        switch (error.response.status) {
          case 400:
            throw new Error('Invalid request: ' + error.response.data.error);
          case 401:
            throw new Error('Authentication required. Please log in again.');
          case 404:
            throw new Error('Availability data not found');
          default:
            throw new Error('Failed to fetch availability: ' + error.response.data.error);
        }
      }
      throw new Error('Network error while fetching availability');
    }
  }

  async saveAvailability(date, timeSlots, sessionId) {
    if (!date || !timeSlots) {
      throw new Error('Date and time slots are required');
    }

    try {
      const response = await this.axios.post('/api/tutors/availability', 
        { date, timeSlots },
        { 
          headers: { 'x-session-id': sessionId }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Failed to save availability');
      }
      throw new Error('Network error while saving availability');
    }
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
