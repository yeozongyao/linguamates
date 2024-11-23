import React, { useState } from 'react';
import './Schedule.css';

const Schedule = () => {
    const [language, setLanguage] = useState('');
    const [tutorPreference, setTutorPreference] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission logic here
        console.log('Searching for tutors:', { language, tutorPreference, date, time });
    };

    const languages = [
        'Spanish',
        'French',
        'German',
        'Italian',
        'Japanese',
        'Mandarin',
        'Korean',
        'Russian'
    ];

    const tutorPreferences = [
        'Native Speaker',
        'Certified Teacher',
        'Conversation Specialist',
        'Grammar Expert',
        'Business Language',
        'No Preference'
    ];

    return (
        <div className="schedule-container">
            <h1 className="schedule-title">Find a Language Tutor</h1>
            <form onSubmit={handleSubmit} className="schedule-form">
                <div className="form-group">
                    <label htmlFor="language">Language to Learn:</label>
                    <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        required
                        className="form-input"
                    >
                        <option value="">Select a language</option>
                        {languages.map((lang) => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="tutorPreference">Tutor Preference:</label>
                    <select
                        id="tutorPreference"
                        value={tutorPreference}
                        onChange={(e) => setTutorPreference(e.target.value)}
                        required
                        className="form-input"
                    >
                        <option value="">Select tutor preference</option>
                        {tutorPreferences.map((pref) => (
                            <option key={pref} value={pref}>{pref}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="date">Preferred Date:</label>
                    <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="form-input"
                        min={new Date().toISOString().split('T')[0]}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="time">Preferred Time:</label>
                    <input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="form-input"
                    />
                </div>
                <button type="submit" className="submit-button">Find Available Tutors</button>
            </form>
        </div>
    );
};

export default Schedule;