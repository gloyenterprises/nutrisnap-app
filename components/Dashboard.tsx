import React, { useState, useRef, useEffect } from 'react';
import { analyzeImageForMacros, lookupBarcode } from '../services/geminiService';
import type { MacroData, DailyLogEntry, LoggedMealItem, LoggedExerciseItem } from '../types';
import { Camera, X, Trash2, Zap, Edit, GlassWater, PlusCircle, MinusCircle, Save, Barcode, Dumbbell } from 'lucide-react';
import { Spinner } from './Spinner';
import { ProgressRing } from './ProgressRing';
import { BrowserMultiFormatReader } from '@zxing/browser';

// Mock daily goals
const DAILY_GOALS = {
  calories: 2000,
  protein: 120,
  carbohydrates: 250,
  fat: 65,
  water: 8, // in glasses
};

const COMMON_ACTIVITIES = [
  { name: 'Running', caloriesPerMinute: 11.5 },
  { name: 'Weightlifting (vigorous)', caloriesPerMinute: 6 },
  { name: 'Yoga', caloriesPerMinute: 4 },
  { name: 'Cycling (moderate)', caloriesPerMinute: 8 },
  { name: 'Swimming (freestyle)', caloriesPerMinute: 9 },
  { name: 'Walking (brisk)', caloriesPerMinute: 5 },
  { name: 'HIIT', caloriesPerMinute: 14 },
  { name: 'Jumping Rope', caloriesPerMinute: 12 },
  { name: 'Rowing', caloriesPerMinute: 10 },
  { name: 'Stair Climbing', caloriesPerMinute: 9 },
];

interface EditingItemState {
  mealId: string;
  itemIndex: number;
  data: MacroData;
}

interface ActivityItem {
  name: string;
  duration: number | '';
  caloriesBurned: number | '';
}


// Image Compression Helper
const compressImage = (file: File, quality = 0.7, maxWidth = 1024): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scaleFactor = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleFactor;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to Blob conversion failed'));
                }, 'image/jpeg', quality);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

const BarcodeScanner: React.FC<{
  onScan: (result: string) => void;
  onClose: () => void;
}> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef(new BrowserMultiFormatReader());
  const [error, setError] = useState<string | null>(null);

  // Fix: Replaced useEffect with a more robust implementation for scanner cleanup.
  useEffect(() => {
    const codeReader = codeReaderRef.current;
    let stream: MediaStream | undefined;

    const startScanner = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          // The 'controls' object returned by decodeFromStream is not used here,
          // as we are handling cleanup with reset() in the return function,
          // which is a more reliable approach for stopping everything.
          await codeReader.decodeFromStream(stream, videoRef.current, (result, err) => {
            if (result) {
              onScan(result.getText());
            }
            if (err && err.name !== 'NotFoundException') {
              console.error(err);
              setError('An error occurred during scanning.');
            }
          });
        }
      } catch (err) {
        console.error(err);
        setError('Could not access camera. Please grant permission and try again.');
      }
    };

    startScanner();

    return () => {
      // `reset()` is the recommended method to stop scanning and release resources.
      // It also stops the stream tracks internally.
      // We cast to `any` to bypass a potential TypeScript error from outdated type definitions.
      (codeReader as any).reset();

      // As a fallback, ensure stream is stopped, in case reset() call fails or is incomplete.
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-300">
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg h-auto overflow-hidden">
        <video ref={videoRef} className="w-full h-auto" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-sm h-32 border-4 border-white/50 rounded-lg" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)' }}></div>
            <p className="mt-4 text-white text-lg font-semibold drop-shadow-md">Place barcode inside the frame</p>
            {error && <p className="mt-2 text-red-400 bg-black/50 p-2 rounded">{error}</p>}
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70">
          <X size={24} />
        </button>
      </div>
    </div>
  );
};


export const Dashboard: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLogEntry[]>([]);
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [logMode, setLogMode] = useState<'snap' | 'manual' | 'activity'>('snap');
  const [manualItems, setManualItems] = useState<(Partial<MacroData> & { isLoading?: boolean })[]>([
    { foodName: '', calories: undefined, protein: undefined, carbohydrates: undefined, fat: undefined, sugar: undefined, isLoading: false }
  ]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([{ name: '', duration: '', caloriesBurned: '' }]);

  
  const [isScannerOpen, setIsScannerOpen] = useState(false);


  const [editingItem, setEditingItem] = useState<EditingItemState | null>(null);

  const getTodaysDateKey = () => new Date().toISOString().slice(0, 10);
  
  useEffect(() => {
    const today = getTodaysDateKey();
    const allLogsRaw = localStorage.getItem('nutrisnap_dailyLogs');
    const allLogs = allLogsRaw ? JSON.parse(allLogsRaw) : {};
    
    setDailyLog(allLogs[today] || []);

    const savedWater = localStorage.getItem('nutrisnap_waterIntake');
    const savedDate = localStorage.getItem('nutrisnap_logDate');

    if (savedDate === today) {
        setWaterIntake(savedWater ? JSON.parse(savedWater) : 0);
    } else {
        localStorage.removeItem('nutrisnap_waterIntake');
        localStorage.removeItem('nutrisnap_logDate');
        setWaterIntake(0);
    }
  }, []);
  
  const saveLog = (log: DailyLogEntry[]) => {
      const today = getTodaysDateKey();
      const allLogsRaw = localStorage.getItem('nutrisnap_dailyLogs');
      const allLogs = allLogsRaw ? JSON.parse(allLogsRaw) : {};
      allLogs[today] = log;

      localStorage.setItem('nutrisnap_dailyLogs', JSON.stringify(allLogs));
      setDailyLog(log);
  }

  const saveWaterIntake = (glasses: number) => {
    const today = getTodaysDateKey();
    const newIntake = Math.max(0, glasses);
    localStorage.setItem('nutrisnap_waterIntake', JSON.stringify(newIntake));
    localStorage.setItem('nutrisnap_logDate', today);
    setWaterIntake(newIntake);
  }

  const handleWaterChange = (amount: number) => {
    saveWaterIntake(waterIntake + amount);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAnalyzeClick = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    try {
      const compressedBlob = await compressImage(imageFile);
      const analysisResults = await analyzeImageForMacros(compressedBlob);
      const newLogEntry: LoggedMealItem = {
          type: 'meal',
          id: `meal_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: analysisResults
      }
      saveLog([newLogEntry, ...dailyLog]);
      clearSelection();
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const clearDailyLog = () => {
      if (window.confirm("Are you sure you want to clear your entire log for today? This action cannot be undone.")) {
        saveLog([]);
        saveWaterIntake(0);
      }
  }

  // --- Manual Log Functions ---

  const handleManualItemChange = (index: number, field: keyof MacroData, value: string) => {
    const newItems = [...manualItems];
    const isNumericField = field !== 'foodName';
    
    newItems[index] = {
      ...newItems[index],
      [field]: isNumericField ? (value === '' ? undefined : parseFloat(value)) : value
    };
    
    setManualItems(newItems);
  };

  const addManualItem = () => {
    setManualItems([...manualItems, { foodName: '', calories: undefined, protein: undefined, carbohydrates: undefined, fat: undefined, sugar: undefined, isLoading: false }]);
  };

  const removeManualItem = (index: number) => {
    if (manualItems.length > 1) {
      const newItems = manualItems.filter((_, i) => i !== index);
      setManualItems(newItems);
    }
  };

  const handleManualLogSubmit = () => {
    setError(null);
    const validItems = manualItems.filter(item => item.foodName && item.calories !== undefined && item.calories > 0)
      .map(item => ({
          foodName: item.foodName!,
          calories: item.calories!,
          protein: item.protein || 0,
          carbohydrates: item.carbohydrates || 0,
          fat: item.fat || 0,
          sugar: item.sugar || 0,
      }));

    if (validItems.length === 0) {
      setError("Please enter at least one food item with a name and calories.");
      return;
    }

    const newLogEntry: LoggedMealItem = {
      type: 'meal',
      id: `meal_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: validItems,
    };

    saveLog([newLogEntry, ...dailyLog]);
    
    // Reset form
    setManualItems([{ foodName: '', calories: undefined, protein: undefined, carbohydrates: undefined, fat: undefined, sugar: undefined, isLoading: false }]);
  };

    // --- Activity Log Functions ---
  const handleActivityItemChange = (index: number, field: keyof ActivityItem, value: string) => {
    const newItems = [...activityItems];
    const currentItem = { ...newItems[index] };

    // 1. Update the field that was actually changed by the user
    if (field === 'name') {
        currentItem.name = value;
    } else if (field === 'duration') {
        currentItem.duration = value === '' ? '' : parseInt(value, 10);
    } else { // caloriesBurned
        currentItem.caloriesBurned = value === '' ? '' : parseInt(value, 10);
        // If user manually changes calories, we stop here to respect their input.
        newItems[index] = currentItem;
        setActivityItems(newItems);
        return;
    }

    // 2. If name or duration changed, try to auto-calculate calories
    const selectedActivity = COMMON_ACTIVITIES.find(act => act.name.toLowerCase() === currentItem.name.toLowerCase());

    if (selectedActivity && currentItem.duration && Number(currentItem.duration) > 0) {
        // We have a known activity and a duration, so we can calculate calories
        currentItem.caloriesBurned = Math.round(selectedActivity.caloriesPerMinute * Number(currentItem.duration));
    } else if (field === 'name' && !selectedActivity) {
        // If the user types a custom activity name, clear calories to prompt manual entry.
        currentItem.caloriesBurned = '';
    }
    
    newItems[index] = currentItem;
    setActivityItems(newItems);
  };

  const addActivityItem = () => {
    setActivityItems([...activityItems, { name: '', duration: '', caloriesBurned: '' }]);
  };

  const removeActivityItem = (index: number) => {
    if (activityItems.length > 1) {
      setActivityItems(activityItems.filter((_, i) => i !== index));
    }
  };
  
  const handleActivityLogSubmit = () => {
    setError(null);
    const validItems = activityItems.filter(item => item.name.trim() && item.caloriesBurned && Number(item.caloriesBurned) > 0);

    if (validItems.length === 0) {
        setError("Please enter at least one activity with a name and calories burned.");
        return;
    }
    
    const newActivityEntries: LoggedExerciseItem[] = validItems.map((item, i) => ({
        type: 'exercise',
        id: `ex_${Date.now()}_${i}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        name: item.name,
        caloriesBurned: Number(item.caloriesBurned),
    }));
    
    saveLog([...newActivityEntries, ...dailyLog]);

    setActivityItems([{ name: '', duration: '', caloriesBurned: '' }]);
  };

  // --- Barcode Scan Function ---
  const handleBarcodeScanned = async (barcode: string) => {
    setIsScannerOpen(false);
    setLoading(true);
    setError(null);
    try {
        const foodData = await lookupBarcode(barcode);
        if (foodData) {
            const newLogEntry: LoggedMealItem = {
                type: 'meal',
                id: `meal_barcode_${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                items: [foodData],
            };
            saveLog([newLogEntry, ...dailyLog]);
        } else {
            setError(`Product not found for barcode ${barcode}. Please try logging it manually.`);
        }
    } catch (err: any) {
        setError(err.message || 'An unknown error occurred while looking up the barcode.');
    } finally {
        setLoading(false);
    }
  };

  // --- Log Item Edit/Delete Functions ---
  const handleDeleteItem = (entryId: string, itemIndex?: number) => {
    if (!window.confirm("Are you sure you want to delete this log entry?")) {
        return;
    }
    
    let newLog: DailyLogEntry[];

    if (itemIndex !== undefined) { // Deleting a food item from a meal
        newLog = dailyLog.map(entry => {
            if (entry.id === entryId && entry.type === 'meal') {
                const newItems = entry.items.filter((_, index) => index !== itemIndex);
                return { ...entry, items: newItems };
            }
            return entry;
        }).filter(entry => entry.type === 'exercise' || (entry.type === 'meal' && entry.items.length > 0));
    } else { // Deleting a whole meal or exercise
        newLog = dailyLog.filter(entry => entry.id !== entryId);
    }
    
    saveLog(newLog);
  };

  const handleStartEdit = (mealId: string, item: MacroData, itemIndex: number) => {
      setEditingItem({ mealId, itemIndex, data: { ...item } });
  };

  const handleCancelEdit = () => {
      setEditingItem(null);
  };

  const handleSaveEdit = () => {
      if (!editingItem) return;

      const newLog = dailyLog.map(entry => {
          if (entry.id === editingItem.mealId && entry.type === 'meal') {
              const newItems = [...entry.items];
              newItems[editingItem.itemIndex] = editingItem.data;
              return { ...entry, items: newItems };
          }
          return entry;
      });

      saveLog(newLog);
      setEditingItem(null);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingItem) return;
      const { name, value } = e.target;
      const isNumeric = name !== 'foodName';
      setEditingItem({
          ...editingItem,
          data: {
              ...editingItem.data,
              [name]: isNumeric ? (value === '' ? 0 : parseFloat(value)) : value
          }
      });
  };

  const totals = dailyLog.reduce((acc, entry) => {
    if (entry.type === 'meal') {
      entry.items.forEach(item => {
          acc.calories += item.calories;
          acc.protein += item.protein;
          acc.carbohydrates += item.carbohydrates;
          acc.fat += item.fat;
      });
    } else if (entry.type === 'exercise') {
        acc.calories -= entry.caloriesBurned;
    }
    return acc;
  }, { calories: 0, protein: 0, carbohydrates: 0, fat: 0 });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       {isScannerOpen && <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setIsScannerOpen(false)} />}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Your Daily Dashboard</h1>
        <p className="text-md text-gray-500 dark:text-gray-400 mt-1">Keep track of your nutrition, one snap at a time.</p>
      </div>

      {/* Today's Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Today's Overview</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
            <ProgressRing label="Net Calories" value={totals.calories} goal={DAILY_GOALS.calories} color="text-teal-500" />
            <div className="flex flex-col items-center justify-center">
                <GlassWater size={32} className="text-blue-400"/>
                <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">Water</p>
                <p className="text-xl font-bold text-gray-700 dark:text-gray-200 my-1">{waterIntake} / {DAILY_GOALS.water}</p>
                 <p className="text-xs text-gray-400 mb-2">glasses</p>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => handleWaterChange(-1)} 
                        disabled={waterIntake <= 0} 
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Remove one glass of water"
                    >
                        <MinusCircle size={28} />
                    </button>
                    <button 
                        onClick={() => handleWaterChange(1)} 
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        aria-label="Add one glass of water"
                    >
                        <PlusCircle size={28} />
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      {/* Macronutrient Breakdown */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Macronutrient Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <ProgressRing label="Protein" value={totals.protein} goal={DAILY_GOALS.protein} unit="g" color="text-sky-500" />
            <ProgressRing label="Carbs" value={totals.carbohydrates} goal={DAILY_GOALS.carbohydrates} unit="g" color="text-amber-500" />
            <ProgressRing label="Fat" value={totals.fat} goal={DAILY_GOALS.fat} unit="g" color="text-red-500" />
        </div>
      </div>
      
      {/* Add Entry Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Log an Entry</h2>
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1">
                <button onClick={() => setLogMode('snap')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${logMode === 'snap' ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-300 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Snap</button>
                <button onClick={() => setLogMode('manual')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${logMode === 'manual' ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-300 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Manual</button>
                <button onClick={() => setLogMode('activity')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${logMode === 'activity' ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-300 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Activity</button>
            </div>
        </div>

        {logMode === 'snap' && (
            <div className="space-y-4">
                <div 
                    className="border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-xl p-8 text-center cursor-pointer hover:bg-teal-100/60 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex flex-col items-center text-gray-600 dark:text-gray-400">
                    <Camera size={40} className="mb-3 text-teal-500" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Snap Your Meal</h3>
                    <p className="text-sm">Click to upload a photo for analysis.</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} aria-label="Upload meal photo"/>
                </div>
                {previewUrl &&
                    <div className="space-y-4">
                        <div className="relative">
                            <img src={previewUrl} alt="Food preview" className="w-full h-auto max-h-60 object-contain rounded-xl" />
                            <button onClick={clearSelection} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70" aria-label="Clear image selection"><X size={20} /></button>
                        </div>
                         <button onClick={handleAnalyzeClick} disabled={loading} className="w-full sm:w-auto flex items-center justify-center bg-teal-500 text-white font-bold py-3 px-8 rounded-full hover:bg-teal-600 transition-transform transform hover:scale-105 disabled:bg-teal-300 disabled:cursor-not-allowed">
                                {loading ? <Spinner /> : <><Zap size={18} className="mr-2"/> Analyze & Log</>}
                         </button>
                    </div>
                }
                 <div className="text-center pt-2">
                     <button onClick={() => setIsScannerOpen(true)} className="w-full sm:w-auto flex items-center justify-center bg-gray-500 text-white font-bold py-3 px-8 rounded-full hover:bg-gray-600 transition-transform transform hover:scale-105">
                        <Barcode size={18} className="mr-2"/> Scan Barcode
                    </button>
                 </div>
            </div>
        )}

        {logMode === 'manual' && (
            <div className="space-y-4 animate-in fade-in-0 duration-300">
                 {manualItems.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg border border-teal-100 dark:border-teal-800 bg-teal-50/50 dark:bg-gray-700/30 space-y-3">
                        <div className="flex items-center gap-2">
                             <input
                                type="text"
                                placeholder="Food Name"
                                value={item.foodName || ''}
                                onChange={(e) => handleManualItemChange(index, 'foodName', e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800"
                            />
                             <button onClick={() => removeManualItem(index)} disabled={manualItems.length <= 1} className="text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={20}/></button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                             <input type="number" placeholder="Cals" value={item.calories ?? ''} onChange={(e) => handleManualItemChange(index, 'calories', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800" />
                             <input type="number" placeholder="Protein (g)" value={item.protein ?? ''} onChange={(e) => handleManualItemChange(index, 'protein', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800" />
                             <input type="number" placeholder="Carbs (g)" value={item.carbohydrates ?? ''} onChange={(e) => handleManualItemChange(index, 'carbohydrates', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800" />
                             <input type="number" placeholder="Fat (g)" value={item.fat ?? ''} onChange={(e) => handleManualItemChange(index, 'fat', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800" />
                             <input type="number" placeholder="Sugar (g)" value={item.sugar ?? ''} onChange={(e) => handleManualItemChange(index, 'sugar', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800" />
                        </div>
                    </div>
                ))}

                <button onClick={addManualItem} className="text-teal-600 dark:text-teal-400 font-semibold text-sm flex items-center gap-1 hover:text-teal-800 dark:hover:text-teal-300"> <PlusCircle size={16}/> Add another item </button>

                <div className="text-center mt-4">
                    <button onClick={handleManualLogSubmit} className="bg-teal-500 text-white font-bold py-3 px-8 rounded-full hover:bg-teal-600 transition-transform transform hover:scale-105 w-full sm:w-auto flex items-center justify-center mx-auto">
                        <Edit size={18} className="mr-2"/> Add to Log
                    </button>
                </div>
            </div>
        )}

        {logMode === 'activity' && (
             <div className="space-y-4 animate-in fade-in-0 duration-300">
                {activityItems.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg border border-teal-100 dark:border-teal-800 bg-teal-50/50 dark:bg-gray-700/30 space-y-3">
                        <div className="flex items-center gap-2">
                             <input
                                type="text"
                                list="common-activities"
                                placeholder="Select or type an activity..."
                                value={item.name}
                                onChange={(e) => handleActivityItemChange(index, 'name', e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800"
                            />
                             <datalist id="common-activities">
                                {COMMON_ACTIVITIES.map((act) => <option key={act.name} value={act.name} />)}
                            </datalist>
                             <button onClick={() => removeActivityItem(index)} disabled={activityItems.length <= 1} className="text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={20}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <input
                                type="number"
                                min="0"
                                placeholder="Duration (min)"
                                value={item.duration}
                                onChange={(e) => handleActivityItemChange(index, 'duration', e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800"
                            />
                             <input
                                type="number"
                                min="0"
                                placeholder="Calories Burned"
                                value={item.caloriesBurned}
                                onChange={(e) => handleActivityItemChange(index, 'caloriesBurned', e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>
                ))}
                <button onClick={addActivityItem} className="text-teal-600 dark:text-teal-400 font-semibold text-sm flex items-center gap-1 hover:text-teal-800 dark:hover:text-teal-300"> <PlusCircle size={16}/> Add another activity </button>
                 <div className="text-center mt-4">
                    <button onClick={handleActivityLogSubmit} className="bg-teal-500 text-white font-bold py-3 px-8 rounded-full hover:bg-teal-600 transition-transform transform hover:scale-105 w-full sm:w-auto flex items-center justify-center mx-auto">
                        <Dumbbell size={18} className="mr-2"/> Log Activities
                    </button>
                </div>
             </div>
        )}


        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-4" role="alert">{error}</div>}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in slide-in-from-bottom-5 duration-300">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Edit Food Item</h3>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="foodName" value={editingItem.data.foodName} onChange={handleEditFormChange} placeholder="Food Name" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none col-span-2 bg-white dark:bg-gray-700"/>
                    <input type="number" name="calories" value={editingItem.data.calories} onChange={handleEditFormChange} placeholder="Calories" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700" />
                    <input type="number" name="protein" value={editingItem.data.protein} onChange={handleEditFormChange} placeholder="Protein (g)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700" />
                    <input type="number" name="carbohydrates" value={editingItem.data.carbohydrates} onChange={handleEditFormChange} placeholder="Carbs (g)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700" />
                    <input type="number" name="fat" value={editingItem.data.fat} onChange={handleEditFormChange} placeholder="Fat (g)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700" />
                    <input type="number" name="sugar" value={editingItem.data.sugar} onChange={handleEditFormChange} placeholder="Sugar (g)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none col-span-2 bg-white dark:bg-gray-700" />
                </div>
                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={handleCancelEdit} className="text-gray-600 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} className="bg-teal-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2"><Save size={16}/> Save</button>
                </div>
            </div>
        </div>
      )}

      {/* Today's Log */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Today's Log</h2>
            {dailyLog.length > 0 && 
                <button onClick={clearDailyLog} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors">
                    <Trash2 size={14} /> Clear Log
                </button>
            }
        </div>
        <div className="space-y-4">
            {dailyLog.length > 0 ? (
                dailyLog.map(entry => (
                    <div key={entry.id}>
                    {entry.type === 'meal' ? (
                        <div className="bg-teal-50/50 dark:bg-gray-700/30 p-4 rounded-lg border border-teal-100 dark:border-teal-900">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-teal-700 dark:text-teal-300">Meal at {entry.timestamp}</h4>
                            </div>
                            <div className="space-y-3">
                              {entry.items.map((item, index) => (
                                  <div key={index} className="flex justify-between items-start group">
                                      <div>
                                          <p className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{item.foodName}</p>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                              {Math.round(item.calories)} kcal &bull; P: {Math.round(item.protein)}g | C: {Math.round(item.carbohydrates)}g | F: {Math.round(item.fat)}g
                                          </p>
                                      </div>
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                          <button onClick={() => handleStartEdit(entry.id, item, index)} className="text-gray-400 hover:text-teal-500 p-1" title="Edit item"><Edit size={16} /></button>
                                          <button onClick={() => handleDeleteItem(entry.id, index)} className="text-gray-400 hover:text-red-500 p-1" title="Delete item"><Trash2 size={16} /></button>
                                      </div>
                                  </div>
                              ))}
                            </div>
                        </div>
                    ) : (
                         <div className="bg-sky-50/50 dark:bg-gray-700/30 p-4 rounded-lg border border-sky-100 dark:border-sky-900 flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                               <Dumbbell className="text-sky-500" size={20}/>
                               <div>
                                  <p className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{entry.name}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Activity at {entry.timestamp}</p>
                               </div>
                            </div>
                             <div className="flex items-center gap-2">
                                <p className="font-semibold text-red-500">- {entry.caloriesBurned} kcal</p>
                                <button onClick={() => handleDeleteItem(entry.id)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete activity">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                         </div>
                    )}
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No meals logged yet today.</p>
                    <p className="text-sm">Log a meal or drink some water to get started!</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};