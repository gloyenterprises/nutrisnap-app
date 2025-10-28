

export interface MacroData {
  foodName: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  sugar: number;
}

export interface LoggedMealItem {
  type: 'meal';
  id: string;
  timestamp: string;
  items: MacroData[];
}

export interface LoggedExerciseItem {
    type: 'exercise';
    id: string;
    timestamp: string;
    name: string;
    caloriesBurned: number;
}

export type DailyLogEntry = LoggedMealItem | LoggedExerciseItem;


export interface Recipe {
  id?: string;
  isCustom?: boolean;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  url?: string;
  imageUrl: string;
  imageSearchQuery?: string;
}

export interface FeaturedRecipe {
  title: string;
  description: string;
  imageUrl: string;
  url?: string;
  imageSearchQuery?: string;
  ingredients: string[];
  instructions: string[];
}


export interface IngredientRecipeSuggestion {
  recipeName: string;
  description: string;
  ingredients: string[];
  instructions: string[];
}

export interface Comment {
    id: number;
    author: string;
    avatarUrl: string;
    content: string;
    timestamp: string;
}

export interface CommunityPost {
    id: number;
    author: string;
    avatarUrl: string;
    content: string;
    imageUrl?: string;
    timestamp: string;
    likes: number;
    comments: Comment[];
    isLiked?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Meal {
    name: string;
    description: string;
    calories: number;
    protein: number;
}

export interface DailyPlan {
    day: string;
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    totalCalories: number;
}

export interface MealPlan {
    id: string;
    createdAt: string;
    plan: DailyPlan[];
    notes: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  age?: number;
  height?: number; // always stored in cm
  heightUnit?: 'cm' | 'in';
  currentWeight?: number; // always stored in kg
  goalWeight?: number; // always stored in kg
  weightUnit?: 'kg' | 'lbs';
  activityLevel?: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active' | 'Extra Active';
  fitnessGoal?: 'Lose Weight' | 'Maintain Weight' | 'Build Muscle';
  dietaryPreferences?: 'None' | 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Pescatarian' | 'Low-Carb' | 'Keto' | 'Carnivore';
  calorieGoal?: number;
  weightHistory?: { date: string; weight: number; }[]; // weight is in kg
}

export type CustomFood = MacroData;