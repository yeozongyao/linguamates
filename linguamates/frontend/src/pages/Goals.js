import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Clock, LayoutList, Target, Award } from 'lucide-react';

const Goals = () => {
    const [dailyTime, setDailyTime] = useState('30');
    const [flashcardGoal, setFlashcardGoal] = useState('50');
    const [currentGoals, setCurrentGoals] = useState({
        time: '30',
        cards: '50'
    });

    const progressData = [
        { day: 'Mon', mistakes: 12, cardsReviewed: 45 },
        { day: 'Tue', mistakes: 10, cardsReviewed: 50 },
        { day: 'Wed', mistakes: 8, cardsReviewed: 48 },
        { day: 'Thu', mistakes: 6, cardsReviewed: 52 },
        { day: 'Fri', mistakes: 5, cardsReviewed: 55 },
        { day: 'Sat', mistakes: 4, cardsReviewed: 51 },
        { day: 'Sun', mistakes: 3, cardsReviewed: 53 }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        setCurrentGoals({
            time: dailyTime,
            cards: flashcardGoal
        });
    };

    const GoalCard = ({ icon: Icon, title, value }) => (
        <div className="flex items-center p-4 bg-white rounded-lg shadow-md">
            <div className="p-3 rounded-full bg-[#fff5d6]">
                <Icon className="w-6 h-6 text-[#8B4513]" />
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-[#8B4513]">{title}</p>
                <p className="text-lg font-semibold text-[#8B4513]">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fff5d6] to-[#ffe4a0] p-6 space-y-6">
            <h1 className="text-3xl font-bold text-[#8B4513] text-center mb-8">Learning Goals</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                <GoalCard
                    icon={Clock}
                    title="Daily Study Time"
                    value={`${currentGoals.time} min`}
                />
                <GoalCard
                    icon={LayoutList}
                    title="Flashcard Goal"
                    value={`${currentGoals.cards} cards`}
                />
                <GoalCard
                    icon={Target}
                    title="Today's Progress"
                    value="45%"
                />
                <GoalCard
                    icon={Award}
                    title="Weekly Streak"
                    value="5 days"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-[#8B4513]">Set Your Daily Goals</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8B4513]">
                                Daily Study Time (minutes)
                            </label>
                            <div className="space-y-1">
                                <input
                                    type="range"
                                    min="15"
                                    max="120"
                                    step="15"
                                    value={dailyTime}
                                    onChange={(e) => setDailyTime(e.target.value)}
                                    className="w-full bg-[#fff5d6]"
                                />
                                <div className="flex justify-between text-sm text-[#8B4513]">
                                    <span>15</span>
                                    <span>{dailyTime} minutes</span>
                                    <span>120</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8B4513]">
                                Daily Flashcard Goal
                            </label>
                            <div className="space-y-1">
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="10"
                                    value={flashcardGoal}
                                    onChange={(e) => setFlashcardGoal(e.target.value)}
                                    className="w-full bg-[#fff5d6]"
                                />
                                <div className="flex justify-between text-sm text-[#8B4513]">
                                    <span>10</span>
                                    <span>{flashcardGoal} cards</span>
                                    <span>100</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[#8B4513] text-white py-3 px-6 rounded-lg hover:bg-[#6B4423] transition-colors shadow-md hover:scale-102 active:scale-98"
                        >
                            Update Goals
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-[#8B4513]">Weekly Progress</h2>
                    </div>
                    <div className="w-full h-[300px]">
                        <LineChart
                            width={500}
                            height={300}
                            data={progressData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#DEB887" />
                            <XAxis dataKey="day" stroke="#8B4513" />
                            <YAxis stroke="#8B4513" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff5d6',
                                    border: '1px solid #DEB887'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="mistakes"
                                stroke="#dc2626"
                                name="Mistakes"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="cardsReviewed"
                                stroke="#8B4513"
                                name="Cards Reviewed"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Goals;