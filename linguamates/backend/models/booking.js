const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number, default: 60 }, // in minutes
  language: { type: String, required: true },
  status: {
    type: String,
    enum: ["scheduled", "completed", "cancelled"],
    default: "scheduled",
  },
  calendarEventId: String,
  meetingLink: String,
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Booking", BookingSchema);
