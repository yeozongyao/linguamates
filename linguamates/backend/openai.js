

const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();



const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getFeedback = async (transcript, language, feedbackLanguage) => {
  console.log("inside feedback")
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: `You are an expert language tutor specializing in ${language}. Your task is to analyze the SENTENCE STRUCTURE, GRAMMAR, and VOCABULARY of the following text, ignoring any transcription errors or pronunciation issues. 

          Focus ONLY on these areas:

          1. Sentence Structure Analysis:
             - Evaluate how ideas are connected within sentences
             - Identify any run-on sentences or fragments
             - Suggest better ways to combine or separate ideas
             - Comment on sentence variety and complexity

          2. Grammar Focus:
             - Identify grammatical patterns that need improvement
             - Point out incorrect verb tenses or agreement issues
             - Highlight problems with articles, prepositions, or conjunctions
             - Provide correct grammatical alternatives

          3. Vocabulary Enhancement:
             - Suggest more sophisticated or appropriate word choices
             - Identify overused words and provide alternatives
             - Point out informal words that could be replaced with formal ones
             - Recommend idiomatic expressions where appropriate

          Format your feedback as follows:
          - Sentence Structure: [Your analysis]
          - Grammar Patterns: [Your analysis]
          - Vocabulary Suggestions: [Your analysis]
          - Example Improvements: [Provide 2-3 revised sentences as examples]

          Important:
          - IGNORE any spelling mistakes or transcription errors
          - DO NOT comment on pronunciation or accent
          - Focus ONLY on how ideas are structured and expressed
          - Be encouraging while providing constructive feedback
          - Provide specific examples for improvement`
        },
        { 
          role: "system", 
          content: `Provide your feedback in ${feedbackLanguage} in the following JSON format:
          {
            "sentenceStructure": "Analysis of sentence structure",
            "grammarPatterns": "Analysis of grammar patterns",
            "vocabularySuggestions": "Suggestions for vocabulary",
            "exampleImprovements": ["Improved sentence 1", "Improved sentence 2"]
          }
          Provide the response strictly in JSON format.
          ` 
        },
        { 
          role: "user", 
          content: transcript 
        }
      ],
    });
    try {
      console.log("Parsing")
      const feedback = JSON.parse(completion.choices[0].message.content);
      return feedback;
    } catch (error) {
      console.error("Error parsing feedback JSON:", error);
      throw new Error("Failed to parse structured feedback from OpenAI");
    }
    // return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error in OpenAI getFeedback:', error);
    throw error  }
};

module.exports = { getFeedback };
