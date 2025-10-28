

import React, { useState, useEffect, useContext } from 'react';
import type { UserProfile, MealPlan } from '../types';
import { User, Edit3, Save, Zap, Heart, Utensils, Target, Leaf, History, ChevronDown, Flame, Moon, Sun } from 'lucide-react';
import { generateMealPlan } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ThemeContext } from '../App';


interface ProfileProps {
    userProfile: UserProfile;
    onUpdateProfile: (profile: UserProfile) => void;
}

// --- Unit Conversion Helpers ---
const LBS_IN_KG = 2.20462;
const CM_IN_INCH = 2.54;

const kgToLbs = (kg: number) => kg * LBS_IN_KG;
const lbsToKg = (lbs: number) => lbs / LBS_IN_KG;
const cmToIn = (cm: number) => cm / CM_IN_INCH;
const inToCm = (inches: number) => inches * CM_IN_INCH;

// --- Sub-components ---

const UnitSwitch: React.FC<{
    options: readonly string[];
    selected: string;
    onSelect: (unit: any) => void;
}> = ({ options, selected, onSelect }) => (
    <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
        {options.map(opt => (
            <button
                key={opt}
                type="button"
                onClick={() => onSelect(opt)}
                className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${selected === opt ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-300 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
                {opt}
            </button>
        ))}
    </div>
);


const InfoCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number | undefined;
    unit?: string;
    isEditing: boolean;
    name: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    inputType?: 'text' | 'number' | 'select';
    options?: readonly string[];
    unitOptions?: readonly ('kg' | 'lbs')[];
    selectedUnit?: 'kg' | 'lbs';
    onUnitChange?: (unit: any) => void;
}> = ({ icon, label, value, unit, isEditing, name, onChange, inputType = 'number', options, unitOptions, selectedUnit, onUnitChange }) => {
    return (
        <div className="bg-teal-50/70 dark:bg-gray-700/30 p-4 rounded-lg flex items-center">
            <div className="mr-4 text-teal-500">{icon}</div>
            <div className="flex-grow">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                {isEditing ? (
                    inputType === 'select' && options ? (
                        <select name={name} value={value || ''} onChange={onChange} className="w-full bg-white dark:bg-gray-700 border border-teal-200 dark:border-gray-600 rounded-md p-1 mt-1 text-gray-800 dark:text-gray-200 font-semibold focus:ring-teal-400 focus:border-teal-400">
                           <option value="" disabled>Select...</option>
                           {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : (
                         <div className="flex items-center gap-2">
                            <input
                                type={inputType}
                                name={name}
                                value={value || ''}
                                onChange={onChange}
                                placeholder={label}
                                className="w-full bg-white dark:bg-gray-700 border border-teal-200 dark:border-gray-600 rounded-md p-1 mt-1 text-gray-800 dark:text-gray-200 font-semibold focus:ring-teal-400 focus:border-teal-400"
                            />
                            {unitOptions && selectedUnit && onUnitChange &&
                                <UnitSwitch options={unitOptions} selected={selectedUnit} onSelect={onUnitChange} />
                            }
                        </div>
                    )
                ) : (
                    <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                        {value ? `${value} ${unit || ''}`.trim() : <span className="text-gray-400 font-normal">Not set</span>}
                    </p>
                )}
            </div>
        </div>
    );
};


export const Profile: React.FC<ProfileProps> = ({ userProfile, onUpdateProfile }) => {
    const themeContext = useContext(ThemeContext);
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState<UserProfile>({
        ...userProfile,
        heightUnit: userProfile.heightUnit || 'cm',
        weightUnit: userProfile.weightUnit || 'kg',
    });
    
    const [imperialHeight, setImperialHeight] = useState({ feet: '', inches: '' });
    const [weightInputValues, setWeightInputValues] = useState({ currentWeight: '', goalWeight: '' });

    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [mealPlanHistory, setMealPlanHistory] = useState<MealPlan[]>([]);
    const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

    const [mealPlanLoading, setMealPlanLoading] = useState(false);
    const [mealPlanError, setMealPlanError] = useState<string | null>(null);

    // Sync formData with props
    useEffect(() => {
        setFormData({
            ...userProfile,
            heightUnit: userProfile.heightUnit || 'cm',
            weightUnit: userProfile.weightUnit || 'kg',
        });
    }, [userProfile]);
    
    // Load history from local storage
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('nutrisnap_mealPlanHistory');
            if (savedHistory) {
                setMealPlanHistory(JSON.parse(savedHistory));
            }
        } catch (error) {
            console.error("Could not load meal plan history from localStorage", error);
        }
    }, []);

    const displayCurrentWeight = formData.currentWeight !== undefined
        ? (formData.weightUnit === 'lbs' ? kgToLbs(formData.currentWeight).toFixed(1) : formData.currentWeight.toFixed(1))
        : '';
    const displayGoalWeight = formData.goalWeight !== undefined
        ? (formData.weightUnit === 'lbs' ? kgToLbs(formData.goalWeight).toFixed(1) : formData.goalWeight.toFixed(1))
        : '';
    
    useEffect(() => {
        if (isEditing) {
            setWeightInputValues({
                currentWeight: displayCurrentWeight,
                goalWeight: displayGoalWeight,
            });
        }
    }, [isEditing, formData.weightUnit, userProfile]);
    
    useEffect(() => {
        if (isEditing && formData.height && formData.heightUnit === 'in') {
            const totalInches = cmToIn(formData.height);
            const feet = Math.floor(totalInches / 12);
            const inches = (totalInches % 12).toFixed(1);
            setImperialHeight({ feet: String(feet), inches: inches });
        }
    }, [isEditing, formData.height, formData.heightUnit]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const processedValue = e.target.type === 'number' ? (value ? parseFloat(value) : undefined) : value;
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };
    
    const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setWeightInputValues(prev => ({ ...prev, [name]: value }));
        
        const numericValue = parseFloat(value);
        if (value === '' || isNaN(numericValue)) {
            setFormData(prev => ({ ...prev, [name]: undefined }));
        } else {
            const valueInKg = formData.weightUnit === 'lbs' ? lbsToKg(numericValue) : numericValue;
            setFormData(prev => ({ ...prev, [name]: valueInKg }));
        }
    };
    
    const handleImperialHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newImperialHeight = { ...imperialHeight, [name]: value };
        setImperialHeight(newImperialHeight);

        const feet = parseFloat(newImperialHeight.feet) || 0;
        const inches = parseFloat(newImperialHeight.inches) || 0;
        
        if (!isNaN(feet) && !isNaN(inches)) {
            const totalInches = feet * 12 + inches;
            setFormData(prev => ({...prev, height: inToCm(totalInches) }));
        }
    };

    const handleUnitChange = (field: 'height' | 'weight', unit: 'cm' | 'in' | 'kg' | 'lbs') => {
        const unitProp = `${field}Unit` as 'heightUnit' | 'weightUnit';
        setFormData(prev => ({ ...prev, [unitProp]: unit }));
    };

    const handleSave = () => {
        let updatedProfile = { ...formData };
        
        // If current weight has changed, add it to history
        if (formData.currentWeight !== undefined && formData.currentWeight !== userProfile.currentWeight) {
            const newHistoryEntry = {
                date: new Date().toISOString().slice(0, 10),
                weight: formData.currentWeight
            };
            const existingHistory = updatedProfile.weightHistory || [];
            // Avoid duplicate entries for the same day
            const filteredHistory = existingHistory.filter(entry => entry.date !== newHistoryEntry.date);
            updatedProfile.weightHistory = [...filteredHistory, newHistoryEntry];
        }

        onUpdateProfile(updatedProfile);
        setIsEditing(false);
    };

    const handleGenerateMealPlan = async () => {
        setMealPlanLoading(true);
        setMealPlanError(null);
        setMealPlan(null);
        try {
            const planData = await generateMealPlan(formData);
            const newPlan: MealPlan = {
                ...planData,
                id: `plan_${Date.now()}`,
                createdAt: new Date().toISOString(),
            };
            setMealPlan(newPlan);

            const updatedHistory = [newPlan, ...mealPlanHistory];
            setMealPlanHistory(updatedHistory);
            localStorage.setItem('nutrisnap_mealPlanHistory', JSON.stringify(updatedHistory));

        } catch (err: any) {
            setMealPlanError(err.message);
        } finally {
            setMealPlanLoading(false);
        }
    };

    const displayHeightFormatted = formData.height
        ? (formData.heightUnit === 'cm'
            ? `${formData.height.toFixed(0)} cm`
            : `${Math.floor(cmToIn(formData.height) / 12)}' ${(cmToIn(formData.height) % 12).toFixed(0)}"`)
        : '';


    const isProfileComplete = formData.age && formData.height && formData.currentWeight && formData.goalWeight && formData.activityLevel && formData.fitnessGoal;
    
    const activityLevels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active'] as const;
    const fitnessGoals = ['Lose Weight', 'Maintain Weight', 'Build Muscle'] as const;
    const dietaryOptions = ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Pescatarian', 'Low-Carb', 'Keto', 'Carnivore'] as const;


    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img src={userProfile.avatarUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">{userProfile.name}</h1>
                        <p className="text-md text-gray-500 dark:text-gray-400">{userProfile.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className="flex items-center justify-center gap-2 bg-teal-500 text-white font-bold py-2 px-6 rounded-full hover:bg-teal-600 transition-colors w-full sm:w-auto"
                >
                    {isEditing ? <><Save size={18} /> Save Changes</> : <><Edit3 size={18} /> Edit Profile</>}
                </button>
            </div>
            
            {/* Health Profile */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Your Health Profile</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <InfoCard label="Age" name="age" value={formData.age} isEditing={isEditing} onChange={handleInputChange} icon={<User size={20} />} />
                    
                    {/* Custom Height Input */}
                    <div className="bg-teal-50/70 dark:bg-gray-700/30 p-4 rounded-lg flex items-center">
                        <div className="mr-4 text-teal-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V2"/><path d="M5 5h14"/><path d="M5 19h14"/></svg></div>
                        <div className="flex-grow">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Height</p>
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    {formData.heightUnit === 'cm' ? (
                                        <input
                                            type="number"
                                            name="height"
                                            value={formData.height?.toFixed(0) || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-white dark:bg-gray-700 border border-teal-200 dark:border-gray-600 rounded-md p-1 mt-1 text-gray-800 dark:text-gray-200 font-semibold focus:ring-teal-400 focus:border-teal-400"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 w-full">
                                            <input type="number" name="feet" value={imperialHeight.feet} onChange={handleImperialHeightChange} placeholder="ft" className="w-1/2 bg-white dark:bg-gray-700 border border-teal-200 dark:border-gray-600 rounded-md p-1 mt-1 text-gray-800 dark:text-gray-200 font-semibold focus:ring-teal-400 focus:border-teal-400"/>
                                            <input type="number" name="inches" value={imperialHeight.inches} onChange={handleImperialHeightChange} placeholder="in" className="w-1/2 bg-white dark:bg-gray-700 border border-teal-200 dark:border-gray-600 rounded-md p-1 mt-1 text-gray-800 dark:text-gray-200 font-semibold focus:ring-teal-400 focus:border-teal-400"/>
                                        </div>
                                    )}
                                    <UnitSwitch options={['cm', 'in']} selected={formData.heightUnit!} onSelect={(unit) => handleUnitChange('height', unit)} />
                                </div>
                            ) : (
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                                    {displayHeightFormatted || <span className="text-gray-400 font-normal">Not set</span>}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <InfoCard label={`Current Weight`} name="currentWeight" value={isEditing ? weightInputValues.currentWeight : (formData.currentWeight ? displayCurrentWeight : undefined)} unit={isEditing ? '' : formData.weightUnit} isEditing={isEditing} onChange={handleWeightInputChange} icon={<Heart size={20} />} unitOptions={['kg', 'lbs']} selectedUnit={formData.weightUnit} onUnitChange={(unit) => handleUnitChange('weight', unit)}/>
                    <InfoCard label={`Goal Weight`} name="goalWeight" value={isEditing ? weightInputValues.goalWeight : (formData.goalWeight ? displayGoalWeight : undefined)} unit={isEditing ? '' : formData.weightUnit} isEditing={isEditing} onChange={handleWeightInputChange} icon={<Target size={20} />} unitOptions={['kg', 'lbs']} selectedUnit={formData.weightUnit} onUnitChange={(unit) => handleUnitChange('weight', unit)}/>
                    <InfoCard label="Activity Level" name="activityLevel" value={formData.activityLevel} isEditing={isEditing} onChange={handleInputChange} inputType="select" options={activityLevels} icon={<Zap size={20} />} />
                    <InfoCard label="Fitness Goal" name="fitnessGoal" value={formData.fitnessGoal} isEditing={isEditing} onChange={handleInputChange} inputType="select" options={fitnessGoals} icon={<Utensils size={20} />} />
                    <InfoCard label="Dietary Preferences" name="dietaryPreferences" value={formData.dietaryPreferences} isEditing={isEditing} onChange={handleInputChange} inputType="select" options={dietaryOptions} icon={<Leaf size={20} />} />
                    <InfoCard label="Daily Calorie Goal (Optional)" name="calorieGoal" value={formData.calorieGoal} unit="kcal" isEditing={isEditing} onChange={handleInputChange} icon={<Flame size={20} />} />
                </div>
            </div>
             {/* Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Settings</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-teal-50/70 dark:bg-gray-700/30 p-4 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="text-teal-500">{themeContext?.theme === 'light' ? <Sun size={20}/> : <Moon size={20} />}</div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Dark Mode</p>
                        </div>
                        <button 
                            onClick={themeContext?.toggleTheme} 
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${themeContext?.theme === 'dark' ? 'bg-teal-500' : 'bg-gray-300'}`}
                            aria-label={`Switch to ${themeContext?.theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${themeContext?.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Meal Plan Generator */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                 <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Personalized Meal Plan</h2>
                 <p className="text-gray-600 dark:text-gray-400 mb-4">Let our AI craft a custom meal plan based on your profile and goals.</p>
                 <button onClick={handleGenerateMealPlan} disabled={!isProfileComplete || mealPlanLoading} className="bg-teal-500 text-white font-bold py-3 px-8 rounded-full hover:bg-teal-600 transition-transform transform hover:scale-105 disabled:bg-teal-300 disabled:cursor-not-allowed">
                    {mealPlanLoading ? <Spinner /> : 'Generate My Plan'}
                 </button>
                 {!isProfileComplete && !isEditing && <p className="text-xs text-red-500 mt-2">Please complete all health profile fields to enable this feature.</p>}
            </div>

            {mealPlanLoading && <div className="flex justify-center p-8"><Spinner borderColor="border-teal-500" /></div>}
            {mealPlanError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center" role="alert">{mealPlanError}</div>}
            {mealPlan && !mealPlanLoading && (
                 <div className="space-y-6 animate-in fade-in-0 duration-500">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center">Your New Meal Plan</h2>
                    {mealPlan.plan.map((daily, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                               <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400">{daily.day}</h3>
                               <p className="font-semibold text-gray-700 dark:text-gray-200">{daily.totalCalories} kcal</p>
                            </div>
                            <div className="space-y-4">
                                <MealCard meal={daily.breakfast} mealType="Breakfast" />
                                <MealCard meal={daily.lunch} mealType="Lunch" />
                                <MealCard meal={daily.dinner} mealType="Dinner" />
                            </div>
                        </div>
                    ))}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Nutritional Notes</h3>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{mealPlan.notes}</p>
                    </div>
                </div>
            )}
            
            {/* Meal Plan History */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><History size={20} /> Meal Plan History</h2>
                {mealPlanHistory.length > 0 ? (
                    <div className="space-y-2">
                        {mealPlanHistory.map(plan => (
                             <div key={plan.id} className="border border-teal-100 dark:border-gray-700 rounded-lg">
                                <button onClick={() => setActiveHistoryId(activeHistoryId === plan.id ? null : plan.id)} className="w-full flex justify-between items-center p-4 text-left">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">Plan from {new Date(plan.createdAt).toLocaleDateString()}</span>
                                    <ChevronDown size={20} className={`transition-transform ${activeHistoryId === plan.id ? 'rotate-180' : ''}`} />
                                </button>
                                {activeHistoryId === plan.id && (
                                     <div className="p-4 border-t border-teal-100 dark:border-gray-700 space-y-4 bg-teal-50/30 dark:bg-gray-700/30">
                                        {plan.plan.map((daily, index) => (
                                            <div key={index}>
                                                <div className="flex justify-between items-center mb-2">
                                                   <h3 className="font-bold text-teal-600 dark:text-teal-400">{daily.day}</h3>
                                                   <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">{daily.totalCalories} kcal</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <MealCard meal={daily.breakfast} mealType="Breakfast" />
                                                    <MealCard meal={daily.lunch} mealType="Lunch" />
                                                    <MealCard meal={daily.dinner} mealType="Dinner" />
                                                </div>
                                            </div>
                                        ))}
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Nutritional Notes</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{plan.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No meal plans saved yet.</p>
                )}
            </div>
        </div>
    );
};

const MealCard: React.FC<{ meal: MealPlan['plan'][0]['breakfast'], mealType: string }> = ({ meal, mealType }) => (
    <div className="bg-teal-50/70 dark:bg-gray-700/50 p-4 rounded-lg border border-teal-100 dark:border-teal-800">
        <p className="font-bold text-teal-800 dark:text-teal-300">{mealType}</p>
        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-1">{meal.name}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{meal.description}</p>
        <p className="text-xs text-gray-500 mt-2">{meal.calories} kcal &bull; {meal.protein}g Protein</p>
    </div>
);