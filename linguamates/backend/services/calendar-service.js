const { google } = require('googleapis');
const Booking = require('../models/booking');

class CalendarService {
  constructor(credentials) {
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: credentials.private_key.replace(/\\n/g, '\n'),
        client_email: credentials.client_email,
        project_id: credentials.project_id
      },
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ]
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    this.serviceEmail = credentials.client_email;
  }

  async createCalendarEvent(booking, studentEmail, tutorEmail) {
    try {
      const calendarId = 'primary'; // Change to use primary calendar instead of service account email
      
      const startDateTime = new Date(booking.date);
      const [hours, minutes] = booking.time.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const endDateTime = new Date(startDateTime.getTime() + booking.duration * 60000);

      const event = {
        summary: `Language Lesson: ${booking.language}`,
        description: 'Language tutoring session',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'UTC',
        },
        // Remove attendees and use visibility instead
        visibility: 'public',
        conferenceData: {
          createRequest: {
            requestId: `${booking._id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 } // Remove email reminder since we can't send emails
          ]
        }
      };

      const calendarEvent = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: 1
      });

      return {
        eventId: calendarEvent.data.id,
        meetingLink: calendarEvent.data.hangoutLink,
        eventLink: calendarEvent.data.htmlLink // Add event link for users to add to their calendars
      };
    } catch (error) {
      console.error('Calendar event creation error:', error);
      throw new Error('Failed to create calendar event. Users can still connect via the booking details.');
    }
  }

  async createAvailabilityEvents(tutorEmail, date, timeSlots) {
    try {
      const calendarId = 'primary'; // Change to use primary calendar
      const events = [];

      for (const slot of timeSlots) {
        const [startHours, startMinutes] = slot.start.split(':');
        const [endHours, endMinutes] = slot.end.split(':');

        const startDateTime = new Date(date);
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0);

        const endDateTime = new Date(date);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0);

        const event = {
          summary: `Available for Tutoring`,
          description: `Tutoring availability slot`,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'UTC'
          },
          transparency: 'transparent',
          visibility: 'public'
        };

        try {
          const createdEvent = await this.calendar.events.insert({
            calendarId,
            requestBody: event
          });

          events.push({
            start: slot.start,
            end: slot.end,
            calendarEventId: createdEvent.data.id,
            status: 'available'
          });
        } catch (eventError) {
          console.error('Error creating individual event:', eventError);
          // Continue with next slot if one fails
        }
      }

      return events;
    } catch (error) {
      console.error('Error creating availability events:', error);
      // Return the slots without calendar integration if it fails
      return timeSlots.map(slot => ({
        ...slot,
        status: 'available'
      }));
    }
  }


  async ensureCalendarExists(calendarId) {
    try {
      await this.calendar.calendars.get({ calendarId });
    } catch (error) {
      if (error.code === 404) {
        await this.calendar.calendars.insert({
          requestBody: {
            summary: 'Language Tutoring Sessions',
            timeZone: 'UTC'
          }
        });
      }
    }
  }

  async getBookedSlots(tutorId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const bookings = await Booking.find({
        tutorId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: 'scheduled'
      }).lean();

      return bookings.map(booking => ({
        start: booking.time,
        end: this.calculateEndTime(booking.time, booking.duration)
      }));
    } catch (error) {
      console.error('Error fetching booked slots:', error);
      return [];
    }
  }

  calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  }

  async shareCalendar(calendarId, userEmail) {
    try {
      // First check if the user already has access
      const aclList = await this.calendar.acl.list({ calendarId });
      const existingRule = aclList.data.items?.find(
        item => item.scope.type === 'user' && item.scope.value === userEmail
      );

      if (!existingRule) {
        await this.calendar.acl.insert({
          calendarId,
          requestBody: {
            role: 'reader',
            scope: {
              type: 'user',
              value: userEmail
            }
          }
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not share calendar with ${userEmail}:`, error.message);
    }
  }

  async verifyServiceAccount() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items && response.data.items.length > 0;
    } catch (error) {
      console.error('Service account verification failed:', error);
      return false;
    }
  }

  async deleteEvent(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId
      });
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }
}

module.exports = CalendarService;