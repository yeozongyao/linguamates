const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const os = require("os");
const fs = require('fs');
const { getFeedback, transcribeAudio } = require('./openai');
const uploadsDir = './uploads';
const { Readable } = require("stream");

if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);

}
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const bcrypt = require("bcrypt");

const { google } = require("googleapis");
const CalendarService = require("./services/calendar-service");
const Booking = require("./models/booking");

const OAuth2 = google.auth.OAuth2;

// Initialize OAuth2 client
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

mongoose
  .connect("mongodb://localhost/linguamates", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Multer configuration with file filter
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const fileFilter = function (req, file, cb) {
  // Allowed ext
  const filetypes = /flac|m4a|mp3|mp4|mpeg|mpga|oga|ogg|wav|webm/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);
  ("");
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      "Error: Unsupported file format. Supported formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm"
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
}).single("audio");

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let users = [];
let sessions = {};

app.post("/api/signup", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      learningLanguages,
      teachingLanguages,
    } = req.body;

    console.log("Signup attempt:", {
      username,
      email,
      role,
      learningLanguages,
      teachingLanguages,
    });

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log("User already exists:", existingUser.username);
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      learningLanguages,
      teachingLanguages,
    });

    await newUser.save();

    console.log("New user created:", newUser);

    res
      .status(201)
      .json({ message: "User created successfully", userId: newUser._id });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "An error occurred during signup" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const sessionId = Math.random().toString(36).substr(2, 9);
    sessions[sessionId] = {
      username: user.username,
      role: user.role,
      id: user._id,
    };

    res.json({ sessionId, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
});

app.post("/api/logout", (req, res) => {
  const { sessionId } = req.body;
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    res.json({ message: "Logged out successfully" });
  } else {
    res.status(400).json({ error: "Invalid session" });
  }
});

// Simple middleware to check if user is logged in
const isAuthenticated = async (req, res, next) => {
  const sessionId = req.headers["x-session-id"];
  console.log("Received session ID:", sessionId);

  if (!sessionId) {
    console.log("No session ID provided");
    return res.status(401).json({ error: "No session ID provided" });
  }

  if (!sessions[sessionId]) {
    console.log("Invalid session ID");
    return res.status(401).json({ error: "Invalid session" });
  }

  try {
    const user = await User.findOne({ username: sessions[sessionId].username });
    if (user) {

      console.log('User authenticated:', user.username);
      console.log('User authenticated:', user.id);

      req.user = { id: user._id, ...sessions[sessionId] };
      next();
    } else {
      console.log("User not found in database");
      res.status(401).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error in isAuthenticated middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

app.get("/api/user", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching user data" });
  }
});

app.get("/api/protected", isAuthenticated, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

app.get("/api/tutors/my-availability", isAuthenticated, async (req, res) => {
  try {
    const { date } = req.query;
    const tutorId = req.user.id;

    const availability = await Availability.findOne({
      tutorId,
      date: new Date(date),
    });

    if (!availability) {
      return res.json(null);
    }

    // Get booked slots
    const bookedSlots = await calendarService.getBookedSlots(tutorId, date);

    // Mark slots as booked or available
    const timeSlots = availability.timeSlots.map((slot) => ({
      ...slot,
      status: bookedSlots.some(
        (bookedSlot) =>
          slot.start === bookedSlot.start ||
          (slot.start < bookedSlot.end && slot.end > bookedSlot.start)
      )
        ? "booked"
        : "available",
    }));

    res.json({
      ...availability.toObject(),
      timeSlots,
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

app.get("/api/tutors", isAuthenticated, async (req, res) => {
  try {
    const { language } = req.query;
    console.log("Fetching tutors. Requested language:", language);

    let query = { $or: [{ role: "tutor" }, { role: "both" }] };
    if (language) {
      query.teachingLanguages = language;
    }

    const tutors = await User.find(query).select("-password");

    console.log("Tutor query:", query);
    console.log("Found tutors:", tutors);

    res.json(tutors);
  } catch (error) {
    console.error("Error in /api/tutors:", error);
    res.status(500).json({ error: "An error occurred while fetching tutors" });
  }
});

app.get("/api/tutors/:id", isAuthenticated, async (req, res) => {
  try {
    const tutor = await User.findOne({
      _id: req.params.id,
      $or: [{ role: "tutor" }, { role: "both" }],
    }).select("-password");

    if (!tutor) {
      return res.status(404).json({ error: "Tutor not found" });
    }

    // Return formatted tutor information
    const tutorInfo = {
      _id: tutor._id,
      username: tutor.username,
      email: tutor.email,
      role: tutor.role,
      teachingLanguages: tutor.teachingLanguages || [],
      isOnline: tutor.isOnline || false,
    };

    res.json(tutorInfo);
  } catch (error) {
    console.error("Error fetching tutor:", error);
    res.status(500).json({ error: "Failed to fetch tutor information" });
  }
});

app.get("/api/students", isAuthenticated, async (req, res) => {
  try {
    const { language } = req.query;
    console.log("Fetching students. Requested language:", language);

    let query = { $or: [{ role: "student" }, { role: "both" }] };
    if (language) {
      query.learningLanguages = language;
    }

    const students = await User.find(query).select("-password");

    console.log("Filtered students:", students);

    res.json(students);
  } catch (error) {
    console.error("Error in /api/students:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching students" });
  }
});

// app.post('/api/get-feedback', async (req, res) => {
//   try {
//     const { transcript, language, feedbackLanguage } = req.body;
//     const completion = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         { 
//           role: "system", 
//           content: `You are an expert language tutor specializing in ${language}. Your task is to analyze the SENTENCE STRUCTURE, GRAMMAR, and VOCABULARY of the following text, ignoring any transcription errors or pronunciation issues. 

//           Focus ONLY on these areas:

//           1. Sentence Structure Analysis:
//              - Evaluate how ideas are connected within sentences
//              - Identify any run-on sentences or fragments
//              - Suggest better ways to combine or separate ideas
//              - Comment on sentence variety and complexity

//           2. Grammar Focus:
//              - Identify grammatical patterns that need improvement
//              - Point out incorrect verb tenses or agreement issues
//              - Highlight problems with articles, prepositions, or conjunctions
//              - Provide correct grammatical alternatives

//           3. Vocabulary Enhancement:
//              - Suggest more sophisticated or appropriate word choices
//              - Identify overused words and provide alternatives
//              - Point out informal words that could be replaced with formal ones
//              - Recommend idiomatic expressions where appropriate

//           Format your feedback as follows:
//           - Sentence Structure: [Your analysis]
//           - Grammar Patterns: [Your analysis]
//           - Vocabulary Suggestions: [Your analysis]
//           - Example Improvements: [Provide 2-3 revised sentences as examples]

//           Important:
//           - IGNORE any spelling mistakes or transcription errors
//           - DO NOT comment on pronunciation or accent
//           - Focus ONLY on how ideas are structured and expressed
//           - Be encouraging while providing constructive feedback
//           - Provide specific examples for improvement`
//         },
//         { 
//           role: "system", 
//           content: `Provide your feedback in ${feedbackLanguage}.` 
//         },
//         { 
//           role: "user", 
//           content: transcript 
//         }
//       ],
//     });
//     res.json({ feedback: completion.choices[0].message.content });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'An error occurred while getting feedback' });
//   }
// });;

const saveFeedback = async (userId, transcript, feedback, language, feedbackLanguage) => {
  try {
    const aiFeedback = new AIFeedback({
      userId,
      transcript,
      feedback: {
        sentenceStructure: feedback.sentenceStructure,
        grammarPatterns: feedback.grammarPatterns,
        vocabularySuggestions: feedback.vocabularySuggestions,
        exampleImprovements: feedback.exampleImprovements,
      },
      language,
      feedbackLanguage,
    });
    console.log("aifeedbacktosave:", aiFeedback)

    await aiFeedback.save();
    console.log('AI feedback saved successfully');
    return aiFeedback;
  } catch (error) {
    console.error('Error saving AI feedback:', error);
    throw error;
  }
};



// app.post('/api/get-feedback', async (req, res) => {
//   try {
//     const { transcript, language, feedbackLanguage } = req.body;
//     console.log(req.body)
//     const feedback = await getFeedback(transcript, language, feedbackLanguage);
//     res.json({ feedback });
//   } catch (error) {
//     res.status(500).json({ error: 'An error occurred while getting feedback' });
//   }
// });

app.post('/api/get-feedback', isAuthenticated, async (req, res) => {
  try {
    const { transcript, language, feedbackLanguage } = req.body;

    console.log('Request body:', req.body);

    // Generate feedback using OpenAI
    const feedback = await getFeedback(transcript, language, feedbackLanguage);
    console.log(feedback)
    // Save the generated feedback to the database
    console.log("req.user.id:", req.user.id)
    const savedFeedback = await saveFeedback(
      req.user.id,       // Pass the authenticated user's ID
      transcript,        // Original transcript
      feedback,          // Generated feedback
      language,          // Language of the transcript
      feedbackLanguage   // Language in which feedback is provided
    );

    // Respond with the saved feedback
    res.json({ feedback: savedFeedback });
  } catch (error) {
    console.error('Error in /api/get-feedback:', error);
    res.status(500).json({ error: 'An error occurred while generating and saving feedback' });
  }
});

app.get('/api/retrieve-feedback', isAuthenticated, async (req, res) => {
  try {
    const userId  = req.user.id;
    console.log("retrieval userid:", userId)
    // Fetch all feedback related to the authenticated user
    const feedbackEntries = await AIFeedback.find({ userId }).sort({ createdAt: -1 });

    if (!feedbackEntries || feedbackEntries.length === 0) {
      return res.status(404).json({ message: 'No feedback found for this user.' });
    }

    res.json({ feedback: feedbackEntries });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'An error occurred while fetching feedback.' });
  }
});


const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const ISO6391 = require("iso-639-1");

function convertLanguageCode(code) {
  // Extract the first part of the code (e.g., 'en' from 'en-US')
  const baseCode = code.split("-")[0].toLowerCase();

  // Validate if it's a valid ISO 639-1 code
  if (ISO6391.validate(baseCode)) {
    return baseCode;
  } else {
    console.warn(`Invalid language code: ${code}. Defaulting to English.`);
    return "en";
  }
}

app.post("/api/transcribe", (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({ error: err.toString() });
    }
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File uploaded successfully:", req.file);
    console.log("File path:", req.file.path);
    console.log("File size:", req.file.size);
    console.log("File mime type:", req.file.mimetype);

    try {
      console.log("Attempting to transcribe file...");
      console.log("Language:", req.body.language);
      const language = convertLanguageCode(req.body.language || "en");

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: "whisper-1",
        language: language,
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      console.log("Transcription successful");
      console.log("Transcription result:", transcription);

      // Post-process the transcription to separate speakers
      const processedTranscript = processTranscription(transcription.segments);

      fs.unlinkSync(req.file.path); // Delete the temporary file
      res.json({ transcript: processedTranscript });
    } catch (error) {
      console.error("Transcription error:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      if (error.response) {
        console.error("OpenAI API response:", error.response.data);
      }
      res.status(500).json({
        error: "An error occurred while transcribing the audio",
        details: error.message,
        openAIError: error.response ? error.response.data : null,
      });
    }
  });
});

function processTranscription(segments) {
  let processedTranscript = [];
  let currentSpeaker = "Speaker 1";

  segments.forEach((segment, index) => {
    if (index > 0) {
      const pauseDuration = segment.start - segments[index - 1].end;
      if (pauseDuration > 1.5) {
        // Assume speaker change if pause is longer than 1.5 seconds
        currentSpeaker =
          currentSpeaker === "Speaker 1" ? "Speaker 2" : "Speaker 1";
      }
    }
    processedTranscript.push(`${currentSpeaker}: ${segment.text}`);
  });

  return processedTranscript.join("\n");
}

app.put("/api/user/update", isAuthenticated, (req, res) => {
  const { username, email, learningLanguages, teachingLanguages } = req.body;
  const user = users.find((u) => u.username === req.user.username);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Update user information
  user.username = username;
  user.email = email;
  user.learningLanguages = learningLanguages;
  user.teachingLanguages = teachingLanguages;

  // Update the session info if username has changed
  if (username !== req.user.username) {
    const sessionId = Object.keys(sessions).find(
      (key) => sessions[key].username === req.user.username
    );
    if (sessionId) {
      sessions[sessionId].username = username;
    }
  }

  res.json({
    username: user.username,
    email: user.email,
    role: user.role,
    learningLanguages: user.learningLanguages,
    teachingLanguages: user.teachingLanguages,
  });
});

// Define Mongoose schemas
const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  content: String,
  read: { type: Boolean, default: false, index: true },
  timestamp: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  learningLanguages: [String],
  teachingLanguages: [String],
  tutors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const AIFeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user
  transcript: { type: String, required: true }, // Original transcript
  feedback: {
    sentenceStructure: String, // Feedback on sentence structure
    grammarPatterns: String,   // Feedback on grammar
    vocabularySuggestions: String, // Vocabulary suggestions
    exampleImprovements: [String] // Example revised sentences
  },
  language: { type: String, required: true }, // Language of the transcript
  feedbackLanguage: { type: String, required: true }, // Language in which feedback is provided
  createdAt: { type: Date, default: Date.now }, // Timestamp of feedback generation
});

MessageSchema.index({ recipient: 1, read: 1 });


const Message = mongoose.model('Message', MessageSchema);
const User = mongoose.model('User', UserSchema);
const AIFeedback = mongoose.model('AIFeedback', AIFeedbackSchema);

const connectionExists = async (studentId, tutorId) => {
  const student = await User.findById(studentId);
  return student.tutors.includes(tutorId);
};

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

// New API endpoints
app.post("/api/connect", isAuthenticated, async (req, res) => {
  try {
    const { tutorId, studentId } = req.body;
    const currentUserId = req.user.id;

    let tutor, student;

    if (tutorId) {
      // Student is initiating the connection
      tutor = await User.findById(tutorId);
      student = await User.findById(currentUserId);
    } else if (studentId) {
      // Tutor is initiating the connection
      tutor = await User.findById(currentUserId);
      student = await User.findById(studentId);
    } else {
      return res.status(400).json({ error: "Missing tutorId or studentId" });
    }

    if (!tutor || !student) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if connection already exists
    if (
      student.tutors.includes(tutor._id) ||
      tutor.students.includes(student._id)
    ) {
      return res.status(400).json({ error: "Connection already exists" });
    }

    // Update the connections
    student.tutors.push(tutor._id);
    tutor.students.push(student._id);

    await Promise.all([student.save(), tutor.save()]);

    res.json({ message: "Connection established successfully" });
  } catch (error) {
    console.error("Error in /api/connect:", error);
    res
      .status(500)
      .json({ error: "An error occurred while establishing connection" });
  }
});

// In server.js, modify the connections endpoint
app.get("/api/connections", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("tutors", "username email teachingLanguages")
      .populate("students", "username email learningLanguages");

    // Return just the tutors array if the user is a student
    if (user.role === "student") {
      return res.json(user.tutors || []);
    }

    // Return just the students array if the user is a tutor
    if (user.role === "tutor") {
      return res.json(user.students || []);
    }

    // For users with role 'both', return both arrays
    if (user.role === "both") {
      return res.json({
        tutors: user.tutors || [],
        students: user.students || [],
      });
    }

    return res.json([]);
  } catch (error) {
    console.error("Error in /api/connections:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching connections" });
  }
});

app.post("/api/message", isAuthenticated, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user.id;

    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content,
    });

    await message.save();

    io.to(recipientId).emit("new message", message);

    res.json({ message: "Message sent successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while sending the message" });
  }
});

app.get("/api/messages", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching messages" });
  }
});

app.get("/api/messages/:recipientId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipientId = req.params.recipientId;
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ],
    })
      .sort({ timestamp: 1 })
      .limit(50);

    res.json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching messages" });
  }
});

app.get("/api/check-users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    console.log("All users in database:", users);
    res.json(users);
  } catch (error) {
    console.error("Error checking users:", error);
    res.status(500).json({ error: "An error occurred while checking users" });
  }
});

app.get("/api/unread-messages", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadMessages = await Message.aggregate([
      {
        $match: {
          recipient: new mongoose.Types.ObjectId(userId),
          read: false,
        },
      },
      {
        $group: {
          _id: "$sender",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadCounts = {};
    unreadMessages.forEach((item) => {
      unreadCounts[item._id.toString()] = item.count;
    });

    res.json(unreadCounts);
  } catch (error) {
    console.error("Error fetching unread message counts:", error);
    res.status(500).json({
      error: "An error occurred while fetching unread message counts",
    });
  }
});

app.post("/api/mark-messages-read", isAuthenticated, async (req, res) => {
  try {
    const { senderId } = req.body;
    const recipientId = req.user.id;

    await Message.updateMany(
      {
        sender: new mongoose.Types.ObjectId(senderId),
        recipient: new mongoose.Types.ObjectId(recipientId),
        read: false,
      },
      { $set: { read: true } }
    );

    res.json({ message: "Messages marked as read successfully" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res
      .status(500)
      .json({ error: "An error occurred while marking messages as read" });
  }
});

const calendarService = new CalendarService({
  private_key: process.env.GOOGLE_PRIVATE_KEY,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  project_id: process.env.GOOGLE_PROJECT_ID,
});

app.post("/api/bookings", isAuthenticated, async (req, res) => {
  try {
    const { tutorId, date, time, language, duration } = req.body;

    if (!tutorId || !date || !time || !language) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const studentId = req.user.id;

    // Fetch tutor and student details
    const [student, tutor] = await Promise.all([
      User.findById(studentId),
      User.findById(tutorId),
    ]);

    if (!student || !tutor) {
      return res.status(404).json({ error: "Student or tutor not found" });
    }

    // Create booking record first
    const booking = new Booking({
      studentId,
      tutorId,
      date,
      time,
      duration: duration || 60,
      language,
      status: "scheduled",
    });

    // Create calendar event
    try {
      const calendarData = await calendarService.createCalendarEvent(
        booking,
        student.email,
        tutor.email
      );

      booking.calendarEventId = calendarData.eventId;
      booking.meetingLink = calendarData.meetingLink;
    } catch (calendarError) {
      console.error("Calendar integration error:", calendarError);
      // Continue with booking creation even if calendar fails
      booking.calendarError = calendarError.message;
    }

    await booking.save();

    // Notify users
    io.to(tutorId.toString()).emit("newBooking", {
      booking: booking.toObject(),
      student: {
        username: student.username,
        email: student.email,
      },
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({
      error: "Failed to create booking",
      details: error.message,
    });
  }
});

// Get user's bookings
app.get("/api/bookings", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    if (userRole === "student") {
      query = { studentId: userId };
    } else if (userRole === "tutor") {
      query = { tutorId: userId };
    } else {
      query = { $or: [{ studentId: userId }, { tutorId: userId }] };
    }

    const bookings = await Booking.find(query)
      .populate("tutorId", "username email")
      .populate("studentId", "username email")
      .sort({ date: 1, time: 1 });

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.put("/api/bookings/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.json(booking);
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server is ready for connections`);
});

// Cancel booking
app.post("/api/bookings/:id/cancel", isAuthenticated, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("tutorId", "email")
      .populate("studentId", "email");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Delete calendar event
    if (booking.calendarEventId) {
      await calendar.events.delete({
        calendarId: booking.tutorId.email,
        eventId: booking.calendarEventId,
        sendUpdates: "all",
      });
    }

    // Update booking status
    booking.status = "cancelled";
    await booking.save();

    // Notify users through socket
    io.to(booking.tutorId._id.toString()).emit("bookingCancelled", booking);
    io.to(booking.studentId._id.toString()).emit("bookingCancelled", booking);

    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Add this schema with your other mongoose schemas
const AvailabilitySchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: { type: Date, required: true },
  timeSlots: [
    {
      start: { type: String, required: true }, // Format: "HH:mm"
      end: { type: String, required: true }, // Format: "HH:mm"
      status: {
        type: String,
        enum: ["available", "booked", "cancelled"],
        default: "available",
      },
    },
  ],
});

AvailabilitySchema.index({ tutorId: 1, date: 1 });

// Add methods to handle booking status
AvailabilitySchema.methods.bookTimeSlot = async function (slotIndex) {
  if (this.timeSlots[slotIndex].status === "available") {
    this.timeSlots[slotIndex].status = "booked";
    await this.save();
    return true;
  }
  return false;
};

const Availability = mongoose.model("Availability", AvailabilitySchema);

// Helper function to create calendar events for availability
async function createAvailabilityEvents(tutorEmail, date, timeSlots) {
  try {
    const events = [];

    for (const slot of timeSlots) {
      const [startHours, startMinutes] = slot.start.split(":");
      const [endHours, endMinutes] = slot.end.split(":");

      const startDateTime = new Date(date);
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0);

      const endDateTime = new Date(date);
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0);

      const event = {
        summary: `Tutoring Availability`,
        description: `Available time slot for ${tutorEmail}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "UTC",
        },
        transparency: "transparent",
        // Remove attendees and just store the tutor email in extendedProperties
        extendedProperties: {
          private: {
            tutorEmail: tutorEmail,
          },
        },
      };

      try {
        const createdEvent = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CLIENT_EMAIL,
          requestBody: event,
        });

        events.push({
          start: slot.start,
          end: slot.end,
          calendarEventId: createdEvent.data.id,
        });
      } catch (eventError) {
        console.error("Error creating individual event:", eventError);
        // Continue with other slots even if one fails
        console.log("Continuing with remaining slots...");
      }
    }

    return events;
  } catch (error) {
    console.error("Error creating calendar events:", error);
    throw error;
  }
}

app.post("/api/tutors/availability", isAuthenticated, async (req, res) => {
  try {
    const { date, timeSlots } = req.body;
    const tutorId = req.user.id;

    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({ error: "Invalid time slots provided" });
    }

    const tutor = await User.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({ error: "Tutor not found" });
    }

    // Delete existing availability and calendar events
    const existingAvailability = await Availability.findOne({
      tutorId,
      date: new Date(date),
    });

    if (existingAvailability) {
      for (const slot of existingAvailability.timeSlots) {
        if (slot.calendarEventId) {
          try {
            await calendarService.deleteEvent(slot.calendarEventId);
          } catch (deleteError) {
            console.error("Error deleting calendar event:", deleteError);
          }
        }
      }
      await existingAvailability.deleteOne();
    }

    // Create calendar events for new time slots
    const calendarEvents = await calendarService.createAvailabilityEvents(
      tutor.email,
      date,
      timeSlots
    );

    // Save availability in database
    const availability = new Availability({
      tutorId,
      date: new Date(date),
      timeSlots: calendarEvents,
    });

    await availability.save();
    res.status(201).json(availability);
  } catch (error) {
    console.error("Error setting availability:", error);
    res.status(500).json({ error: "Failed to set availability" });
  }
});

app.get(
  "/api/tutors/:tutorId/availability",
  isAuthenticated,
  async (req, res) => {
    try {
      const { tutorId } = req.params;
      const { date } = req.query;

      // Get availability from database
      const availability = await Availability.findOne({
        tutorId,
        date: new Date(date),
      });

      if (!availability) {
        return res.json([]);
      }

      // Get booked slots
      const bookedSlots = await calendarService.getBookedSlots(tutorId, date);

      // Filter out booked slots
      const availableSlots = availability.timeSlots.filter((slot) => {
        return !bookedSlots.some(
          (bookedSlot) =>
            slot.start === bookedSlot.start ||
            (slot.start < bookedSlot.end && slot.end > bookedSlot.start)
        );
      });

      res.json(
        availableSlots.map((slot) => ({
          start: slot.start,
          end: slot.end,
        }))
      );
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  }
);

// Add an endpoint to handle bookings
app.post(
  "/api/bookings/:availabilityId/:slotIndex",
  isAuthenticated,
  async (req, res) => {
    try {
      const { availabilityId, slotIndex } = req.params;
      const studentId = req.user.id;

      const availability = await Availability.findById(availabilityId);
      if (!availability) {
        return res.status(404).json({ error: "Availability not found" });
      }

      const booked = await availability.bookTimeSlot(slotIndex);
      if (!booked) {
        return res.status(400).json({ error: "Time slot is not available" });
      }

      // Create booking record
      const booking = new Booking({
        studentId,
        tutorId: availability.tutorId,
        date: availability.date,
        time: availability.timeSlots[slotIndex].start,
        duration: 60, // default duration
        language: req.body.language,
      });

      await booking.save();
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error booking time slot:", error);
      res.status(500).json({ error: "Failed to book time slot" });
    }
  }
);

// Get tutor's calendar
app.get("/api/tutor/calendar", isAuthenticated, async (req, res) => {
  try {
    const tutorId = req.user.id;
    const { startDate, endDate } = req.query;

    // Get all availabilities within date range
    const availabilities = await Availability.find({
      tutorId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });

    // Get all bookings within date range
    const bookings = await Booking.find({
      tutorId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).populate("studentId", "username email");

    res.json({
      availabilities,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching calendar:", error);
    res.status(500).json({ error: "Failed to fetch calendar" });
  }
});

// Delete availability
app.delete(
  "/api/tutors/availability/:id",
  isAuthenticated,
  async (req, res) => {
    try {
      const availability = await Availability.findOneAndDelete({
        _id: req.params.id,
        tutorId: req.user.id,
      });

      if (!availability) {
        return res.status(404).json({ error: "Availability not found" });
      }

      res.json({ message: "Availability deleted successfully" });
    } catch (error) {
      console.error("Error deleting availability:", error);
      res.status(500).json({ error: "Failed to delete availability" });
    }
  }
);

const supportedLanguages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
];

// Helper function to convert audio buffer to stream
function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

// Add language routes
app.get("/api/languages", (req, res) => {
  res.json(supportedLanguages);
});

// Add this at the top level of your server.js, after your imports
const activeRooms = new Map();

// Helper function for handling user leaving
function handleUserLeaving(socket, roomId, userId = null) {
  try {
    console.log(`User ${userId || socket.id} leaving room ${roomId}`);

    const roomParticipants = activeRooms.get(roomId);
    if (roomParticipants) {
      roomParticipants.delete(socket.id);
      console.log(
        `Removed ${socket.id} from room ${roomId}. Remaining participants: ${roomParticipants.size}`
      );

      if (roomParticipants.size === 0) {
        activeRooms.delete(roomId);
        console.log(`Removed empty room ${roomId}`);
      } else {
        io.to(roomId).emit("participantUpdate", {
          participants: Array.from(roomParticipants),
          count: roomParticipants.size,
        });
      }
    }

    socket.leave(roomId);
  } catch (error) {
    console.error("Error in handleUserLeaving:", error);
  }
}

// Socket connection handler
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("joinCall", async ({ sessionId, userId }) => {
    try {
      const roomId = `session_${sessionId}`;
      console.log(`User ${userId} (${socket.id}) joining room ${roomId}`);

      await socket.join(roomId);

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Set());
      }
      const roomParticipants = activeRooms.get(roomId);
      roomParticipants.add(socket.id);

      console.log(
        `Added ${socket.id} to room ${roomId}. Total participants: ${roomParticipants.size}`
      );

      // Notify everyone in the room about the participants
      io.to(roomId).emit("participantUpdate", {
        participants: Array.from(roomParticipants),
        count: roomParticipants.size,
      });
    } catch (error) {
      console.error("Error in joinCall:", error);
    }
  });

  socket.on("callSignal", ({ sessionId, signal, targetSocketId }) => {
    try {
      const roomId = `session_${sessionId}`;

      if (targetSocketId) {
        socket.to(targetSocketId).emit("callSignal", {
          fromSocketId: socket.id,
          signal,
        });
        console.log(
          `Sending direct signal from ${socket.id} to ${targetSocketId}`
        );
      } else {
        socket.to(roomId).emit("callSignal", {
          fromSocketId: socket.id,
          signal,
        });
        console.log(`Broadcasting signal from ${socket.id} to room ${roomId}`);
      }
    } catch (error) {
      console.error("Error in callSignal:", error);
    }
  });

  socket.on("leaveCall", ({ sessionId, userId }) => {
    try {
      const roomId = `session_${sessionId}`;
      handleUserLeaving(socket, roomId, userId);
    } catch (error) {
      console.error("Error in leaveCall:", error);
    }
  });

  socket.on("disconnect", () => {
    try {
      console.log("Client disconnected:", socket.id);
      activeRooms.forEach((participants, roomId) => {
        if (participants.has(socket.id)) {
          handleUserLeaving(socket, roomId);
        }
      });
    } catch (error) {
      console.error("Error in disconnect:", error);
    }
  });

  const FormData = require('form-data');

  // Create temp directory
  const tempDir = path.join(os.tmpdir(), 'audio-chunks');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  socket.on('audioChunk', async ({ audioBlob, fromLanguage, toLanguage, sessionId }) => {
    let tempFile = null;
    let fileStream = null;  // Declare fileStream at the top level of the handler
  
    try {
      console.log(`[Translation] Processing audio from ${fromLanguage} to ${toLanguage}`);
  
      // Generate unique filename with proper extension
      const fileName = `chunk-${Date.now()}.webm`;
      tempFile = path.join(tempDir, fileName);
  
      // Write base64 audio to file
      const buffer = Buffer.from(audioBlob, 'base64');
      fs.writeFileSync(tempFile, buffer);
  
      // Verify file exists and has content
      const stats = fs.statSync(tempFile);
      console.log(`[Translation] Audio file size: ${stats.size} bytes`);
  
      if (stats.size === 0) {
        throw new Error('Empty audio file');
      }
  
      // Create file stream for OpenAI
      fileStream = fs.createReadStream(tempFile);
      
      // Log the file details
      console.log('[Translation] Sending file to OpenAI:', {
        name: fileName,
        size: stats.size,
        path: tempFile
      });
  
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: fromLanguage,
        response_format: "text"
      });
  
      console.log('[Translation] Transcription received:', transcription);
  
      if (transcription && transcription.trim()) {
        // Translate
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `Translate the following text from ${fromLanguage} to ${toLanguage}. Respond only with the translation.`
            },
            {
              role: "user",
              content: transcription
            }
          ]
        });
  
        const translation = completion.choices[0].message.content;
        console.log('[Translation] Translation:', translation);
  
        // Emit to room
        io.to(`session_${sessionId}`).emit('translation', {
          original: transcription,
          translated: translation,
          fromLanguage,
          toLanguage
        });
      }
  
    } catch (error) {
      console.error('[Translation] Error:', error);
      // Only emit error if it's not an empty transcription
      if (error.message !== 'Empty audio file') {
        socket.emit('translationError', { error: error.message });
      }
    } finally {
      // Clean up file stream
      if (fileStream) {
        fileStream.destroy();
      }
      
      // Clean up temporary file
      if (tempFile && fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (err) {
          console.error('Error deleting temp file:', err);
        }
      }
    }
  });
});

// Make sure you export your server (add this at the end)
module.exports = { app, server, io };
