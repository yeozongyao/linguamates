import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const Evaluation = () => {
  // State management
  const [feedback, setFeedback] = useState("AI Feedback here");
  const [rating, setRating] = useState(null);
  const [comments, setComments] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        console.log("evaluation: , ",localStorage.getItem("sessionId"))
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/retrieve-feedback`, {
          headers: {
            "Content-Type": "application/json",
            "x-session-id": localStorage.getItem("sessionId"), // Send session ID for authentication
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Set the most recent feedback object
          console.log("data:", data)
          if (data.feedback.length > 0) {
            setFeedback(data.feedback[0].feedback); // Extract `feedback` object
          } else {
            setFeedback("No feedback available.");
          }        
        } else {
          const errorData = await response.json();
          setFeedback(errorData.message || "Failed to fetch feedback.");
        }
      } catch (err) {
        console.error("Error fetching feedback:", err);
        setFeedback("An error occurred while fetching feedback.");
      }
    };

    fetchFeedback();
  }, []); // Runs once on component mount

  // Handle rating selection
  const handleRating = (value) => {
    setRating(value);
    setError("");
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!rating) {
      setError("Please provide a rating before submitting.");
      return;
    }

    // Simulate submission
    setTimeout(() => {
      setSuccessMessage("Your evaluation has been submitted successfully!");
      setRating(null);
      setComments("");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <BookOpen className="w-16 h-16 text-[#8B4513] mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-[#8B4513] mb-2">Evaluate Feedback</h1>
            <p className="text-[#6B4423]">Help us improve by assessing AI-generated feedback</p>
          </motion.div>
        </div>

        {/* Feedback Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-[#8B4513] font-medium mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            AI Tutor Feedback
          </h3>
          <div className="bg-[#fff5d6] rounded-lg p-4">
            {typeof feedback === "string" ? (
              <p className="text-[#6B4423] whitespace-pre-line">{feedback}</p>
            ) : (
              <ul className="text-[#6B4423] space-y-2">
                <li><strong>Sentence Structure:</strong> {feedback.sentenceStructure || "N/A"}</li>
                <li><strong>Grammar Patterns:</strong> {feedback.grammarPatterns || "N/A"}</li>
                <li><strong>Vocabulary Suggestions:</strong> {feedback.vocabularySuggestions || "N/A"}</li>
                <li><strong>Example Improvements:</strong></li>
                <ul className="list-disc pl-6">
                  {feedback.exampleImprovements?.length > 0
                    ? feedback.exampleImprovements.map((example, index) => (
                        <li key={index}>{example}</li>
                      ))
                    : <li>N/A</li>}
                </ul>
              </ul>
            )}
          </div>
        </motion.div>


        {/* Rating Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-[#8B4513] font-medium mb-4">Rate the Feedback</h3>
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRating("positive")}
              className={`py-3 px-6 rounded-lg text-white ${
                rating === "positive" ? "bg-[#8B4513]" : "bg-[#6B4423]"
              }`}
            >
              <ThumbsUp className="w-5 h-5 mr-2 inline-block" />
              Positive
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRating("negative")}
              className={`py-3 px-6 rounded-lg text-white ${
                rating === "negative" ? "bg-[#8B4513]" : "bg-[#6B4423]"
              }`}
            >
              <ThumbsDown className="w-5 h-5 mr-2 inline-block" />
              Negative
            </motion.button>
          </div>
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-[#8B4513] font-medium mb-4">Provide Additional Comments</h3>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full h-32 bg-[#fff5d6] rounded-lg p-4 border-2 border-[#DEB887] focus:border-[#8B4513] focus:outline-none text-[#8B4513]"
            placeholder="Share your feedback here..."
          ></textarea>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            className="py-3 px-6 bg-[#8B4513] text-white rounded-lg hover:bg-[#6B4423] transition-colors disabled:opacity-50"
          >
            <Check className="w-5 h-5 mr-2 inline-block" />
            Submit Evaluation
          </motion.button>
        </motion.div>

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center mt-4"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center mt-4"
          >
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Evaluation;
