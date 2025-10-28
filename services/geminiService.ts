

import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { MacroData, Recipe, ChatMessage, IngredientRecipeSuggestion, FeaturedRecipe, UserProfile, MealPlan } from '../types';
import { fallbackFeaturedRecipes, fallbackSearchResults } from './fallbackData';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = async (file: File | Blob) => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error("Failed to read file as data URL"));
        }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const analyzeImageForMacros = async (imageFile: File | Blob): Promise<MacroData[]> => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);
    
    const prompt = "You are an expert nutritionist. Analyze the food in this image and provide a detailed nutritional breakdown. Identify each distinct food item, estimate its quantity in grams or a common unit, and return a precise breakdown of its calories, protein, carbohydrates, fat, and sugar in grams. Return the data in the specified JSON format.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [imagePart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              foodName: {
                type: Type.STRING,
                description: 'The name of the food item.',
              },
              calories: {
                type: Type.NUMBER,
                description: 'Total calories for the item.',
              },
              protein: {
                type: Type.NUMBER,
                description: 'Grams of protein.',
              },
              carbohydrates: {
                type: Type.NUMBER,
                description: 'Grams of carbohydrates.',
              },
              fat: {
                type: Type.NUMBER,
                description: 'Grams of fat.',
              },
              sugar: {
                type: Type.NUMBER,
                description: 'Grams of sugar.',
              },
            },
            required: ['foodName', 'calories', 'protein', 'carbohydrates', 'fat', 'sugar'],
          },
        },
      },
    });

    try {
        const parsedResponse = JSON.parse(response.text);
        return parsedResponse as MacroData[];
    } catch (parseError) {
        console.error("Error parsing JSON response from Gemini API in analyzeImageForMacros:", {
            responseText: response.text,
            parseError,
        });
        throw new Error("The AI returned an unexpected response format. Please try again.");
    }

  } catch (error) {
    console.error("Error in analyzeImageForMacros service:", error);
    throw new Error("Failed to analyze the image. The AI service may be temporarily unavailable or unable to identify the food. Please try a clearer picture or check your connection.");
  }
};

export const findRecipes = async (query: string): Promise<Recipe[]> => {
  try {
    const prompt = `You are an expert recipe finder. Use your search tool to find 5-8 healthy and appealing recipes based on the following query: "${query}". 
For each recipe, provide:
1.  A title.
2.  A short, enticing description.
3.  A complete list of ingredients.
4.  Step-by-step instructions.
5.  A direct and valid URL to the source recipe, if available.
6.  A simple, descriptive search query (3-4 words) for an image.

IMPORTANT: Return ONLY a single JSON array of objects inside a markdown code block. Do not include any other text or explanation.
Example format:
\`\`\`json
[
  {
    "title": "Classic Chocolate Chip Cookies",
    "description": "The perfect chewy and delicious chocolate chip cookies, straight from your oven.",
    "ingredients": [
      "1 cup (2 sticks) unsalted butter, softened",
      "3/4 cup granulated sugar",
      "3/4 cup packed brown sugar",
      "1 teaspoon vanilla extract",
      "2 large eggs",
      "2 1/4 cups all-purpose flour",
      "1 teaspoon baking soda",
      "1 teaspoon salt",
      "2 cups semi-sweet chocolate chips"
    ],
    "instructions": [
      "Preheat oven to 375°F (190°C). Line baking sheets with parchment paper.",
      "In a large bowl, cream together the butter, granulated sugar, and brown sugar until light and fluffy.",
      "Beat in the vanilla extract and eggs, one at a time.",
      "In a separate bowl, whisk together the flour, baking soda, and salt. Gradually add the dry ingredients to the wet ingredients and mix until just combined.",
      "Stir in the chocolate chips.",
      "Drop rounded tablespoons of dough onto the prepared baking sheets, about 2 inches apart.",
      "Bake for 9 to 11 minutes, or until the edges are golden brown and the centers are set.",
      "Let cool on the baking sheets for a few minutes before transferring to wire racks to cool completely."
    ],
    "url": "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/",
    "imageSearchQuery": "classic chocolate chip cookies"
  }
]
\`\`\`
`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    
    if (!response.candidates || response.candidates.length === 0 || !response.text) {
        console.warn(`Gemini returned no candidates or text for recipe query "${query}". Serving fallback data.`);
        return fallbackSearchResults;
    }
    
    let jsonText = response.text.trim();
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
    }

    let parsedRecipes;
    try {
        parsedRecipes = JSON.parse(jsonText);
    } catch(parseError) {
        console.error(`Failed to parse JSON for recipe query "${query}"`, { responseText: jsonText, parseError });
        return fallbackSearchResults; // Fallback on parse error
    }

    // Generate a high-quality image for each recipe to avoid broken links
    const recipesWithImages = await Promise.all(
        parsedRecipes.map(async (recipe: any) => {
            const imageUrl = await generateRecipeImage(recipe.imageSearchQuery || recipe.title);
            return {
                ...recipe,
                imageUrl,
            };
        })
    );
    
    return recipesWithImages;

  } catch (error) {
    console.error(`Error in findRecipes service for query "${query}". Serving fallback data.`, { originalError: error });
    return fallbackSearchResults;
  }
}

export const getFeaturedRecipes = async (): Promise<FeaturedRecipe[]> => {
    try {
        const month = new Date().toLocaleString('default', { month: 'long' });
        const prompt = `You are an expert recipe curator. Use your search tool to find 3 healthy, seasonal, and visually appealing recipes for the current month (${month}). 
For each recipe, provide:
1.  A title.
2.  A short, enticing description.
3.  A complete list of ingredients.
4.  Step-by-step instructions.
5.  A direct and valid URL to the source recipe, if available.
6.  A simple, descriptive search query (3-4 words) for an image.

IMPORTANT: Return ONLY a single JSON array of objects inside a markdown code block. Do not include any other text or explanation.
Example format:
\`\`\`json
[
  {
    "title": "Seasonal Berry Tart",
    "description": "A beautiful and delicious tart featuring fresh berries of the season.",
    "ingredients": ["1 pre-made pie crust", "8 oz cream cheese, softened", "1/2 cup powdered sugar", "1 tsp vanilla extract", "2 cups mixed fresh berries"],
    "instructions": ["Bake pie crust according to package directions and let cool.", "Beat cream cheese, powdered sugar, and vanilla until smooth.", "Spread cream cheese mixture into the cooled crust.", "Arrange fresh berries on top.", "Chill for at least 1 hour before serving."],
    "url": "https://www.example.com/seasonal-berry-tart",
    "imageSearchQuery": "fresh berry tart"
  }
]
\`\`\`
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        
        if (!response.candidates || response.candidates.length === 0 || !response.text) {
            console.warn("Gemini returned no candidates or text for featured recipes. Serving fallback data.");
            return fallbackFeaturedRecipes;
        }

        let jsonText = response.text.trim();
        const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        }
        
        let parsedRecipes;
        try {
            parsedRecipes = JSON.parse(jsonText);
        } catch(parseError) {
            console.error(`Failed to parse JSON for featured recipes`, { responseText: jsonText, parseError });
            return fallbackFeaturedRecipes; // Fallback on parse error
        }


        const recipesWithImages = await Promise.all(
            parsedRecipes.map(async (recipe: any) => {
                const imageUrl = await generateRecipeImage(recipe.imageSearchQuery || recipe.title);
                return {
                    ...recipe,
                    imageUrl,
                };
            })
        );
        
        return recipesWithImages;

    } catch (error) {
        console.error("Error in getFeaturedRecipes service. Serving fallback data.", { originalError: error });
        return fallbackFeaturedRecipes;
    }
};

export const generateRecipeImage = async (query: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: `A high-quality, delicious-looking photo of ${query}, professionally shot for a recipe book with a clean, bright background.`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    return `data:image/png;base64,${base64ImageBytes}`;
                }
            }
        }

        // Fallback if no image is generated
        console.warn("Gemini did not return an image, falling back to Unsplash.");
        return `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;
    } catch (error) {
        console.error(`Error generating recipe image for query "${query}". Falling back to Unsplash.`, { originalError: error });
        // Fallback to Unsplash on error
        return `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;
    }
};

export const getRecipesFromIngredientsImage = async (imageFile: File | Blob): Promise<IngredientRecipeSuggestion[]> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const prompt = "You are a creative chef. Analyze the ingredients in this image and suggest 1-3 simple, healthy, and delicious meal ideas. For each idea, provide a recipe name, a short description, a list of ingredients (including those not pictured, like spices or oil, if necessary), and step-by-step instructions. Return the data in the specified JSON format.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [imagePart, { text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            recipeName: { type: Type.STRING },
                            description: { type: Type.STRING },
                            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ['recipeName', 'description', 'ingredients', 'instructions'],
                    },
                },
            },
        });

        try {
            const parsedResponse = JSON.parse(response.text);
            return parsedResponse as IngredientRecipeSuggestion[];
        } catch (parseError) {
             console.error("Error parsing JSON response from Gemini API in getRecipesFromIngredientsImage:", {
                responseText: response.text,
                parseError,
            });
            throw new Error("The AI returned an unexpected response format. Please try again.");
        }

    } catch (error) {
        console.error("Error in getRecipesFromIngredientsImage service:", error);
        throw new Error("Failed to generate meal ideas from the image. The AI service may be temporarily unavailable. Please try a clearer picture or check your connection.");
    }
};


export const getAiHealthAdvice = async (history: ChatMessage[]): Promise<string> => {
  const model = 'gemini-2.5-flash';
  
  const systemInstruction = "You are a friendly, knowledgeable, and encouraging AI nutritionist named 'Nutri'. Provide safe, evidence-based health and food advice. Always be positive and supportive. Keep your answers concise and easy to understand. Do not provide medical advice, and if a question seems to be about a medical condition, advise the user to consult a doctor. Format your responses using markdown for better readability (e.g., using lists, bold text).";

  const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error in getAiHealthAdvice service:", { originalError: error });
    throw new Error("Sorry, I'm having trouble connecting right now. Please check your internet connection and try again later.");
  }
};

export const generateMealPlan = async (profile: UserProfile): Promise<Omit<MealPlan, 'id' | 'createdAt'>> => {
    if (!profile.age || !profile.currentWeight || !profile.goalWeight || !profile.height || !profile.activityLevel || !profile.fitnessGoal) {
        throw new Error("Please complete all profile fields to generate a personalized meal plan.");
    }
    
    try {
        const dietaryPreferencePrompt = 
            profile.dietaryPreferences && profile.dietaryPreferences !== 'None' 
            ? `- Dietary Preferences: ${profile.dietaryPreferences}` 
            : '';

        const calorieGoalPrompt = profile.calorieGoal ? `- Specific Daily Calorie Goal: Approximately ${profile.calorieGoal} kcal.` : '';

        const calorieInstruction = profile.calorieGoal 
            ? `3.  Crucially, the total calories for each day must be very close to the user's goal of ${profile.calorieGoal} kcal.`
            : `3.  Based on the user's profile, calculate an appropriate daily calorie total to help them achieve their goal (${profile.fitnessGoal}).`;

        const prompt = `
            You are an expert AI nutritionist. Based on the following user profile, create a personalized 3-day meal plan.
            
            **User Profile:**
            - Age: ${profile.age}
            - Height: ${profile.height} cm
            - Current Weight: ${profile.currentWeight} kg
            - Goal Weight: ${profile.goalWeight} kg
            - Activity Level: ${profile.activityLevel}
            - Primary Fitness Goal: ${profile.fitnessGoal}
            ${dietaryPreferencePrompt}
            ${calorieGoalPrompt}

            **Instructions:**
            1.  The meal plan should be healthy, balanced, and delicious.
            2.  It must align with the user's fitness goal (${profile.fitnessGoal}) and dietary preferences.
            ${calorieInstruction}
            4.  For each of the 3 days, provide specific meal suggestions for breakfast, lunch, and dinner.
            5.  For each meal, provide a name, a short description, and an estimated calorie and protein count.
            6.  Calculate and provide the total estimated calories for each day.
            7.  Include some general nutritional advice or notes at the end.
            8.  Return the response in the specified JSON format.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        plan: {
                            type: Type.ARRAY,
                            description: "Array of daily meal plans for 3 days.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    day: { type: Type.STRING, description: "e.g., Day 1" },
                                    breakfast: { 
                                        type: Type.OBJECT, 
                                        properties: {
                                            name: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            calories: { type: Type.NUMBER },
                                            protein: { type: Type.NUMBER },
                                        },
                                        required: ['name', 'description', 'calories', 'protein']
                                    },
                                    lunch: { 
                                        type: Type.OBJECT, 
                                        properties: {
                                            name: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            calories: { type: Type.NUMBER },
                                            protein: { type: Type.NUMBER },
                                        },
                                        required: ['name', 'description', 'calories', 'protein']
                                    },
                                    dinner: { 
                                        type: Type.OBJECT, 
                                        properties: {
                                            name: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            calories: { type: Type.NUMBER },
                                            protein: { type: Type.NUMBER },
                                        },
                                        required: ['name', 'description', 'calories', 'protein']
                                    },
                                    totalCalories: { type: Type.NUMBER, description: "Total calories for the day." },
                                },
                                required: ['day', 'breakfast', 'lunch', 'dinner', 'totalCalories']
                            }
                        },
                        notes: { type: Type.STRING, description: "General nutritional advice." }
                    },
                    required: ['plan', 'notes']
                }
            }
        });

        try {
            const parsedResponse = JSON.parse(response.text);
            return parsedResponse as Omit<MealPlan, 'id' | 'createdAt'>;
        } catch (parseError) {
            console.error("Error parsing JSON response from Gemini API in generateMealPlan:", {
                responseText: response.text,
                parseError,
            });
            throw new Error("The AI returned an unexpected response format for the meal plan. Please try again.");
        }

    } catch (error) {
        console.error("Error in generateMealPlan service:", error);
        throw new Error("Failed to generate your meal plan. The AI service may be temporarily unavailable. Please check your profile information and try again.");
    }
};


export const lookupBarcode = async (barcode: string): Promise<MacroData | null> => {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        
        if (!response.ok) {
            console.warn(`Could not fetch data for barcode ${barcode}. Status: ${response.status}`);
            return null;
        }
        
        const data = await response.json();

        if (data.status === 0 || !data.product) {
            console.warn(`Barcode ${barcode} not found in Open Food Facts database.`);
            return null;
        }

        const product = data.product;
        const nutriments = product.nutriments;
        
        const servingSizeStr = product.serving_size || '100g';
        
        // Prefer serving-specific values, fall back to 100g values.
        const calories = nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || 0;
        const protein = nutriments['proteins_serving'] || nutriments['proteins_100g'] || 0;
        const carbohydrates = nutriments['carbohydrates_serving'] || nutriments['carbohydrates_100g'] || 0;
        const fat = nutriments['fat_serving'] || nutriments['fat_100g'] || 0;
        const sugar = nutriments['sugars_serving'] || nutriments['sugars_100g'] || 0;

        if (!product.product_name || calories === 0) {
            console.warn(`Incomplete data for barcode ${barcode}.`);
            return null; // Not enough data to be useful
        }

        return {
            foodName: `${product.product_name} (${servingSizeStr})`,
            calories: Math.round(calories),
            protein: Math.round(protein * 10) / 10,
            carbohydrates: Math.round(carbohydrates * 10) / 10,
            fat: Math.round(fat * 10) / 10,
            sugar: Math.round(sugar * 10) / 10,
        };

    } catch (error) {
        console.error("Error looking up barcode in service:", error);
        throw new Error("Could not connect to the food database. Please check your internet connection.");
    }
};
