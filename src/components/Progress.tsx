import React, { useMemo } from 'react';
import type { UserProfile, DailyLogEntry } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Flame, Activity, TrendingUp } from 'lucide-react';

interface ProgressProps {
    userProfile: UserProfile;
}

const COLORS = ['#34d399', '#f59e0b', '#ef4444']; // Emerald, Amber, Red for Protein, Carbs, Fat

export const Progress: React.FC<ProgressProps> = ({ userProfile }) => {
    
    const historicalLogs = useMemo(() => {
        const raw = localStorage.getItem('nutrisnap_dailyLogs');
        return raw ? JSON.parse(raw) : {};
    }, []);

    const last7DaysData = useMemo(() => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().slice(0, 10);
            
            const dayLog: DailyLogEntry[] = historicalLogs[dateKey] || [];
            const totals = dayLog.reduce((acc, entry) => {
                if (entry.type === 'meal') {
                    entry.items.forEach(item => {
                        acc.calories += item.calories;
                        acc.protein += item.protein;
                        acc.carbs += item.carbohydrates;
                        acc.fat += item.fat;
                    });
                } else if (entry.type === 'exercise') {
                    acc.calories -= entry.caloriesBurned;
                }
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
            
            data.push({
                name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                calories: totals.calories,
                protein: totals.protein,
                carbs: totals.carbs,
                fat: totals.fat,
            });
        }
        return data;
    }, [historicalLogs]);

    const macroDistribution = useMemo(() => {
        const totalMacros = last7DaysData.reduce((acc, day) => {
            acc.protein += day.protein;
            acc.carbs += day.carbs;
            acc.fat += day.fat;
            return acc;
        }, { protein: 0, carbs: 0, fat: 0 });

        const total = totalMacros.protein + totalMacros.carbs + totalMacros.fat;
        if (total === 0) return [];
        
        return [
            { name: 'Protein', value: totalMacros.protein },
            { name: 'Carbs', value: totalMacros.carbs },
            { name: 'Fat', value: totalMacros.fat },
        ];
    }, [last7DaysData]);
    
    const loggingStreak = useMemo(() => {
        let streak = 0;
        let currentDate = new Date();
        
        while (true) {
            const dateKey = currentDate.toISOString().slice(0, 10);
            if (historicalLogs[dateKey] && historicalLogs[dateKey].length > 0) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                // If it's not today, and the log is empty, break.
                // If it IS today, and the log is empty, the streak is 0 anyway.
                // We need to check if the break happens on the very first day.
                const today = new Date().toISOString().slice(0, 10);
                if(dateKey !== today || streak > 0) break;
                
                // If we are still on today and streak is 0, check yesterday
                currentDate.setDate(currentDate.getDate() - 1);
                const yesterdayKey = currentDate.toISOString().slice(0, 10);
                 if (!historicalLogs[yesterdayKey] || historicalLogs[yesterdayKey].length === 0) {
                    break;
                 }
            }
        }
        return streak;
    }, [historicalLogs]);
    
    const weightData = userProfile.weightHistory
        ? userProfile.weightHistory.map(entry => ({
            date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            weight: userProfile.weightUnit === 'lbs' ? entry.weight * 2.20462 : entry.weight
        }))
        : [];
        

    return (
        <div className="max-w-4xl mx-auto space-y-8">
             <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Your Progress</h1>
                <p className="text-md text-gray-500 dark:text-gray-400 mt-1">Visualize your journey and celebrate your consistency.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
                    <Flame className="mx-auto text-red-500" size={28}/>
                    <p className="text-2xl font-bold mt-2">{loggingStreak}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Day Streak</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
                    <Activity className="mx-auto text-teal-500" size={28}/>
                    <p className="text-2xl font-bold mt-2">{Object.keys(historicalLogs).length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Days Logged</p>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg col-span-2 md:col-span-1">
                    <TrendingUp className="mx-auto text-sky-500" size={28}/>
                    <p className="text-2xl font-bold mt-2">
                        {userProfile.currentWeight ? `${userProfile.currentWeight.toFixed(1)} ${userProfile.weightUnit}` : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Weight</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Weight History ({userProfile.weightUnit})</h2>
                {weightData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weightData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
                            <YAxis tick={{ fill: '#9ca3af' }} domain={['dataMin - 2', 'dataMax + 2']}/>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem' }}/>
                            <Legend />
                            <Line type="monotone" dataKey="weight" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : <p className="text-center text-gray-500 py-10">Log your weight in your profile for a few days to see a chart.</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Last 7 Days Calories</h2>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={last7DaysData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} />
                            <YAxis tick={{ fill: '#9ca3af' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem' }}/>
                            <Legend />
                            <Bar dataKey="calories" fill="#14b8a6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Average Macro Distribution</h2>
                    {macroDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={macroDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {macroDistribution.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                             <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem' }}/>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                    ) : <p className="text-center text-gray-500 py-10">Log some meals to see your macro breakdown.</p>}
                </div>
            </div>

        </div>
    );
};
