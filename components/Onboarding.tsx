import React, { useState, useMemo } from 'react';
import type { UserProfile } from '../types';
import { Grape, Zap, Utensils, Target, Leaf, Flame, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingProps {
    userProfile: UserProfile;
    onComplete: (profile: UserProfile) => void;
}

const activityLevels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active'] as const;
const fitnessGoals = ['Lose Weight', 'Maintain Weight', 'Build Muscle'] as const;
const dietaryOptions = ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Pescatarian', 'Low-Carb', 'Keto', 'Carnivore'] as const;

// --- Unit Conversion Helpers ---
const LBS_IN_KG = 2.20462;
const CM_IN_INCH = 2.54;

const lbsToKg = (lbs: number) => lbs / LBS_IN_KG;
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


export const Onboarding: React.FC<OnboardingProps> = ({ userProfile, onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<UserProfile>>({ 
        ...userProfile,
        heightUnit: 'in',
        weightUnit: 'lbs',
    });
    const [imperialHeight, setImperialHeight] = useState({ feet: '', inches: '' });
    const [weightInputValues, setWeightInputValues] = useState({ currentWeight: '', goalWeight: '' });


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const processedValue = e.target.type === 'number' ? (value ? parseFloat(value) : undefined) : value;
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleUnitChange = (field: 'height' | 'weight', unit: 'cm' | 'in' | 'kg' | 'lbs') => {
        const unitProp = `${field}Unit` as 'heightUnit' | 'weightUnit';
        
        // Clear inputs when switching to avoid confusion
        if (field === 'height') {
            setImperialHeight({ feet: '', inches: '' });
            setFormData(prev => ({ ...prev, height: undefined, [unitProp]: unit }));
        }
        if (field === 'weight') {
            setWeightInputValues({ currentWeight: '', goalWeight: '' });
            setFormData(prev => ({ ...prev, currentWeight: undefined, goalWeight: undefined, [unitProp]: unit }));
        }
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
        
        if (!isNaN(feet) || !isNaN(inches)) {
            const totalInches = feet * 12 + inches;
            setFormData(prev => ({...prev, height: inToCm(totalInches) }));
        }
    };

    const calculatedCalorieGoal = useMemo(() => {
        const { age, height, currentWeight, activityLevel, fitnessGoal } = formData;
        if (!age || !height || !currentWeight || !activityLevel || !fitnessGoal) return 0;
        
        // Simplified Mifflin-St Jeor Equation for BMR
        const bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5; // Assuming male for simplicity, adjust as needed

        const activityMultipliers = {
            'Sedentary': 1.2,
            'Lightly Active': 1.375,
            'Moderately Active': 1.55,
            'Very Active': 1.725,
            'Extra Active': 1.9
        };
        const tdee = bmr * activityMultipliers[activityLevel];

        const goalAdjustments = {
            'Lose Weight': -500,
            'Maintain Weight': 0,
            'Build Muscle': 300
        };
        
        return Math.round(tdee + goalAdjustments[fitnessGoal]);
    }, [formData]);

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleFinish = () => {
        onComplete({
            ...userProfile,
            ...formData,
            calorieGoal: formData.calorieGoal || calculatedCalorieGoal,
        });
    };
    
    const isStep2Valid = !!(formData.age && formData.age > 0 && formData.height && formData.height > 0 && formData.currentWeight && formData.currentWeight > 0 && formData.goalWeight && formData.goalWeight > 0);
    const isStep3Valid = formData.activityLevel && formData.fitnessGoal && formData.dietaryPreferences;


    return (
        <div className="min-h-screen bg-teal-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
                <div className="text-center mb-4">
                    <Grape size={48} className="mx-auto text-teal-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">Welcome, {userProfile.name}!</h1>
                    <p className="text-gray-500 dark:text-gray-400">Let's set up your profile.</p>
                </div>
                
                 {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-teal-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }}></div>
                </div>

                <div className="animate-in fade-in-0 duration-500">
                {step === 1 && (
                    <div className="text-center space-y-4">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Let's Personalize Your Journey</h2>
                        <p className="text-gray-600 dark:text-gray-300">To give you the best recommendations, we need a little more information about you and your goals. This will only take a minute!</p>
                    </div>
                )}
                
                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-center text-gray-700 dark:text-gray-200">Your Biometrics</h2>
                         <input type="number" name="age" value={formData.age || ''} placeholder="Age" onChange={handleInputChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400" />
                         
                         {/* Height Input */}
                        <div className="relative">
                            {formData.heightUnit === 'cm' ? (
                                <input type="number" name="height" value={formData.height ? Math.round(formData.height) : ''} onChange={e => setFormData(prev => ({ ...prev, height: parseFloat(e.target.value) || undefined }))} placeholder="Height" className="w-full p-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"/>
                            ) : (
                                <div className="flex gap-2">
                                    <input type="number" name="feet" value={imperialHeight.feet} onChange={handleImperialHeightChange} placeholder="Feet" className="w-1/2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"/>
                                    <input type="number" name="inches" value={imperialHeight.inches} onChange={handleImperialHeightChange} placeholder="Inches" className="w-1/2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"/>
                                </div>
                            )}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <UnitSwitch options={['cm', 'in']} selected={formData.heightUnit!} onSelect={(unit) => handleUnitChange('height', unit)} />
                            </div>
                        </div>

                         {/* Weight Inputs */}
                         <div className="relative">
                            <input type="number" name="currentWeight" value={weightInputValues.currentWeight} onChange={handleWeightInputChange} placeholder={`Current Weight (${formData.weightUnit})`} className="w-full p-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"/>
                             <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <UnitSwitch options={['kg', 'lbs']} selected={formData.weightUnit!} onSelect={(unit) => handleUnitChange('weight', unit)} />
                            </div>
                         </div>
                         <input type="number" name="goalWeight" value={weightInputValues.goalWeight} onChange={handleWeightInputChange} placeholder={`Goal Weight (${formData.weightUnit})`} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"/>
                    </div>
                )}

                {step === 3 && (
                     <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-center text-gray-700 dark:text-gray-200">Your Lifestyle & Goals</h2>
                        <div>
                             <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Activity Level</label>
                             <select name="activityLevel" value={formData.activityLevel || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"><option value="" disabled>Select...</option>{activityLevels.map(o => <option key={o}>{o}</option>)}</select>
                        </div>
                        <div>
                             <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Primary Fitness Goal</label>
                             <select name="fitnessGoal" value={formData.fitnessGoal || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"><option value="" disabled>Select...</option>{fitnessGoals.map(o => <option key={o}>{o}</option>)}</select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Dietary Preferences</label>
                            <select name="dietaryPreferences" value={formData.dietaryPreferences || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"><option value="" disabled>Select...</option>{dietaryOptions.map(o => <option key={o}>{o}</option>)}</select>
                        </div>
                     </div>
                )}
                
                {step === 4 && (
                     <div className="text-center space-y-4">
                         <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Your Daily Goal</h2>
                         <p className="text-gray-600 dark:text-gray-400">Based on your profile, we recommend a daily calorie goal of:</p>
                         <div className="p-4 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                            <p className="text-4xl font-bold text-teal-600 dark:text-teal-300">{calculatedCalorieGoal}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">kcal / day</p>
                         </div>
                         <p className="text-xs text-gray-500">You can adjust this later in your profile.</p>
                     </div>
                )}
                </div>

                <div className="flex justify-between items-center pt-4">
                    {step > 1 ? (
                        <button onClick={prevStep} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <ArrowLeft size={16}/> Back
                        </button>
                    ) : <div></div>}
                    
                    {step < 4 ? (
                        <button onClick={nextStep} disabled={(step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)} className="flex items-center gap-2 bg-teal-500 text-white font-bold py-2 px-6 rounded-full hover:bg-teal-600 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed">
                            Next <ArrowRight size={16}/>
                        </button>
                    ) : (
                        <button onClick={handleFinish} className="bg-teal-500 text-white font-bold py-2 px-6 rounded-full hover:bg-teal-600 transition-colors">
                            Let's Go!
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};