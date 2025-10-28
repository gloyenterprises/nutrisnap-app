import React, { useState, useCallback, useRef, useEffect } from 'react';
import { findRecipes, getRecipesFromIngredientsImage, getFeaturedRecipes, generateRecipeImage } from '../services/geminiService';
import type { Recipe, FeaturedRecipe, IngredientRecipeSuggestion } from '../types';
import { Search, ChefHat, X, Heart, Plus, Trash2 } from 'lucide-react';
import { Spinner } from './Spinner';
import { RecipeModal } from './RecipeModal';

const SearchSuggestion = ({ text, onClick }: { text: string, onClick: (query: string) => void }) => (
    <button onClick={() => onClick(text)} className="px-4 py-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 rounded-full text-sm hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"> {text} </button>
);

export const RecipeFinder: React.FC = () => {
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | FeaturedRecipe | null>(null);
    const [favorites, setFavorites] = useState<Recipe[]>([]);
    const [favoritingId, setFavoritingId] = useState<string | null>(null);
    const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newRecipeData, setNewRecipeData] = useState({ title: '', description: '', ingredients: '', instructions: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [featuredRecipes, setFeaturedRecipes] = useState<FeaturedRecipe[]>([]);
    const [featuredLoading, setFeaturedLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Recipe[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [ingredientFile, setIngredientFile] = useState<File | null>(null);
    const [ingredientPreview, setIngredientPreview] = useState<string | null>(null);
    const [ingredientRecipes, setIngredientRecipes] = useState<IngredientRecipeSuggestion[] | null>(null);
    const [ingredientLoading, setIngredientLoading] = useState(false);
    const [ingredientError, setIngredientError] = useState<string | null>(null);
    const ingredientFileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('nutrisnap_favorites');
            if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
            
            const savedCustom = localStorage.getItem('nutrisnap_customRecipes');
            if (savedCustom) setCustomRecipes(JSON.parse(savedCustom));

        } catch (error) {
            console.error("Could not load recipes from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('nutrisnap_favorites', JSON.stringify(favorites));
        } catch (error) {
            console.error("Could not save favorite recipes to localStorage", error);
        }
    }, [favorites]);
    
    useEffect(() => {
        try {
            localStorage.setItem('nutrisnap_customRecipes', JSON.stringify(customRecipes));
        } catch (error) {
            console.error("Could not save custom recipes to localStorage", error);
        }
    }, [customRecipes]);


    useEffect(() => {
        const loadFeatured = async () => {
            try {
                setFeaturedLoading(true);
                const initialRecipes = await getFeaturedRecipes();
                setFeaturedRecipes(initialRecipes);

                initialRecipes.forEach((recipe) => {
                    if (recipe.imageUrl.startsWith('https://source.unsplash.com') && recipe.imageSearchQuery) {
                        generateRecipeImage(recipe.imageSearchQuery).then(newImageUrl => {
                            setFeaturedRecipes(currentRecipes => {
                                return currentRecipes.map(r => r.url === recipe.url ? { ...r, imageUrl: newImageUrl } : r);
                            });
                        });
                    }
                });
            } finally {
                setFeaturedLoading(false);
            }
        };
        loadFeatured();
    }, []);

    const isFavorite = (recipe: Recipe | FeaturedRecipe | null) => {
        if (!recipe) return false;
        const id = recipe.url || (recipe as Recipe).id;
        if (!id) return false;
        return favorites.some(fav => (fav.url || fav.id) === id);
    };

    const toggleFavorite = async (recipe: Recipe | FeaturedRecipe) => {
        const id = recipe.url || (recipe as Recipe).id;
        if (!id) return;
        
        if (isFavorite(recipe)) {
            setFavorites(prev => prev.filter(fav => (fav.url || fav.id) !== id));
            return;
        }

        if (favoritingId) return;
        setFavoritingId(id);

        try {
            let finalImageUrl = recipe.imageUrl;
            
            if (recipe.imageUrl.startsWith('https://source.unsplash.com') && recipe.imageSearchQuery) {
                finalImageUrl = await generateRecipeImage(recipe.imageSearchQuery);
            }
            
            const newFavorite: Recipe = {
                id: (recipe as Recipe).id,
                isCustom: (recipe as Recipe).isCustom,
                title: recipe.title,
                description: recipe.description,
                url: recipe.url,
                imageUrl: finalImageUrl,
                imageSearchQuery: recipe.imageSearchQuery,
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
            };

            setFavorites(prev => [...prev, newFavorite]);
        } catch (error) {
            console.error(`Failed to favorite recipe "${recipe.title}".`, error);
        } finally {
            setFavoritingId(null);
        }
    };

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        setSearchResults([]);
        try {
            const initialRecipes = await findRecipes(searchQuery);
            setSearchResults(initialRecipes);

            initialRecipes.forEach((recipe) => {
                if (recipe.imageUrl.startsWith('https://source.unsplash.com') && recipe.imageSearchQuery) {
                    generateRecipeImage(recipe.imageSearchQuery).then(newImageUrl => {
                        setSearchResults(currentResults => {
                           return currentResults.map(r => r.url === recipe.url ? { ...r, imageUrl: newImageUrl } : r);
                        });
                    });
                }
            });
        } finally {
            setSearchLoading(false);
        }
    }, []);
    
    const handleIngredientFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIngredientRecipes(null);
            setIngredientError(null);
            setIngredientFile(file);
            setIngredientPreview(URL.createObjectURL(file));
        }
    };

    const handleIngredientAnalyzeClick = async () => {
        if (!ingredientFile) return;
        setIngredientLoading(true);
        setIngredientError(null);
        setIngredientRecipes(null);
        try {
            const analysisResults = await getRecipesFromIngredientsImage(ingredientFile);
            setIngredientRecipes(analysisResults);
        } catch (err: any) {
            setIngredientError(err.message || 'An unknown error occurred.');
        } finally {
            setIngredientLoading(false);
        }
    };
    
    const clearIngredientSelection = () => {
        setIngredientFile(null);
        setIngredientPreview(null);
        setIngredientRecipes(null);
        setIngredientError(null);
        if (ingredientFileInputRef.current) {
            ingredientFileInputRef.current.value = "";
        }
    };
    
    const handleNewRecipeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewRecipeData(prev => ({...prev, [name]: value}));
    };

    const handleSaveCustomRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        const { title, description, ingredients, instructions } = newRecipeData;
        if (!title.trim() || !description.trim() || !ingredients.trim() || !instructions.trim()) {
            alert("Please fill out all fields.");
            return;
        }
        setIsSaving(true);
        try {
            const imageUrl = await generateRecipeImage(title);
            const newCustomRecipe: Recipe = {
                id: `custom_${Date.now()}`,
                isCustom: true,
                title,
                description,
                imageUrl,
                ingredients: ingredients.split('\n').filter(i => i.trim() !== ''),
                instructions: instructions.split('\n').filter(i => i.trim() !== ''),
            };
            setCustomRecipes(prev => [newCustomRecipe, ...prev]);
            setIsAddModalOpen(false);
            setNewRecipeData({ title: '', description: '', ingredients: '', instructions: '' });
        } catch (error) {
            console.error("Failed to save custom recipe", error);
            alert("Sorry, there was an error saving your recipe. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteCustomRecipe = (id: string) => {
        if (window.confirm("Are you sure you want to delete this recipe?")) {
            setCustomRecipes(prev => prev.filter(r => r.id !== id));
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12">
             <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6">Recipe Finder</h1>
            
            <div>
                 <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-4">Your Saved Recipes</h2>
                 {favorites.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map(recipe => (
                            <div key={recipe.url || recipe.id} onClick={() => setSelectedRecipe(recipe)} className="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-transform transform hover:-translate-y-1 flex flex-col cursor-pointer">
                                <div className="relative">
                                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-40 object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe); }}
                                        className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5 shadow-md text-red-500 hover:scale-110 transition-transform"
                                        aria-label="Remove from favorites"
                                    >
                                        <Heart size={20} fill="currentColor" />
                                    </button>
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">{recipe.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm flex-grow line-clamp-3">{recipe.description}</p>
                                    <div className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold flex items-center self-start"> View Recipe </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        <p>No saved recipes yet.</p>
                        <p className="text-sm">Click the ❤️ on any recipe to save it here!</p>
                    </div>
                 )}
            </div>
            
            <div>
                <div className="flex justify-between items-center mb-4 mt-8">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Your Custom Recipes</h2>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-teal-500 text-white font-bold py-2 px-4 rounded-full hover:bg-teal-600 transition-colors flex items-center gap-2">
                        <Plus size={18} /> Add Recipe
                    </button>
                </div>
                 {customRecipes.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {customRecipes.map(recipe => (
                            <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-transform transform hover:-translate-y-1 flex flex-col cursor-pointer">
                                <div className="relative">
                                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-40 object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (recipe.id) handleDeleteCustomRecipe(recipe.id); }}
                                        className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5 shadow-md text-gray-500 hover:text-red-500 hover:scale-110 transition-all"
                                        aria-label="Delete recipe"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">{recipe.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm flex-grow line-clamp-3">{recipe.description}</p>
                                    <div className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold flex items-center self-start"> View Recipe </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        <p>No custom recipes yet.</p>
                        <p className="text-sm">Click "Add Recipe" to create your own!</p>
                    </div>
                 )}
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mt-8 mb-4">Top Nutritionist Picks</h2>
                {featuredLoading && <div className="flex justify-center"><Spinner borderColor="border-teal-500" /></div>}
                {!featuredLoading && (
                    <div className="grid md:grid-cols-3 gap-6">
                        {featuredRecipes.map(recipe => (
                            <div key={recipe.url} onClick={() => setSelectedRecipe(recipe)} className="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-transform transform hover:-translate-y-1 flex flex-col cursor-pointer">
                                <div className="relative">
                                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (recipe.url) toggleFavorite(recipe); }}
                                        disabled={!!favoritingId || !recipe.url}
                                        className="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1.5 shadow-md hover:scale-110 transition-transform disabled:cursor-not-allowed disabled:opacity-70"
                                        aria-label="Save to favorites"
                                    >
                                        {favoritingId === recipe.url ? 
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500" /> :
                                            <Heart size={20} className={`transition-colors ${isFavorite(recipe) ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} fill={isFavorite(recipe) ? 'currentColor' : 'none'} />
                                        }
                                    </button>
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400">{recipe.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm flex-grow line-clamp-3">{recipe.description}</p>
                                    <div className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold flex items-center self-start"> View Recipe </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 mt-8">Create a Meal from Your Ingredients</h2>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    {!ingredientPreview ? (
                      <div className="border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-xl p-8 text-center cursor-pointer hover:bg-teal-100 dark:hover:bg-gray-700/50 transition-colors" onClick={() => ingredientFileInputRef.current?.click()}>
                          <ChefHat size={48} className="mx-auto mb-4 text-teal-500" />
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Snap Your Ingredients</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Upload a photo of what you have, and we'll suggest a recipe!</p>
                          <input type="file" accept="image/*" className="hidden" ref={ingredientFileInputRef} onChange={handleIngredientFileChange} />
                      </div>
                    ) : (
                      <div className="relative">
                          <img src={ingredientPreview} alt="Ingredients preview" className="w-full h-auto max-h-60 object-contain rounded-xl" />
                          <button onClick={clearIngredientSelection} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70"><X size={20} /></button>
                      </div>
                    )}
                    {ingredientFile && <button onClick={handleIngredientAnalyzeClick} disabled={ingredientLoading} className="mt-6 w-full sm:w-auto mx-auto flex items-center justify-center bg-teal-500 text-white font-bold py-3 px-8 rounded-full hover:bg-teal-600 transition-transform transform hover:scale-105 disabled:bg-teal-300"> {ingredientLoading ? <Spinner /> : 'Generate Meal Ideas'} </button>}
                </div>
                {ingredientLoading && <div className="text-center my-4"><p>Creating recipes for you...</p></div>}
                {ingredientError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg my-4" role="alert">{ingredientError}</div>}
                {ingredientRecipes && (
                    <div className="mt-6 space-y-4">
                        {ingredientRecipes.map((recipe, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
                                <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">{recipe.recipeName}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{recipe.description}</p>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <h4 className="font-semibold mb-1">Ingredients:</h4>
                                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                            {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Instructions:</h4>
                                        <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                            {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 mt-8">Or, Search for a Recipe</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} className="flex gap-2 mb-4">
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., 'high-protein vegan lunch'" className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500" />
                    <button type="submit" disabled={searchLoading} className="bg-teal-500 text-white font-bold p-3 rounded-full hover:bg-teal-600 transition-transform transform hover:scale-105 disabled:bg-teal-300 flex items-center justify-center w-12 h-12"> {searchLoading ? <Spinner /> : <Search size={20}/>} </button>
                </form>
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                    <SearchSuggestion text="Quick Breakfast" onClick={(q) => { setQuery(q); handleSearch(q); }} />
                    <SearchSuggestion text="Low-Carb Dinner" onClick={(q) => { setQuery(q); handleSearch(q); }} />
                    <SearchSuggestion text="Vegetarian Salad" onClick={(q) => { setQuery(q); handleSearch(q); }} />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map((recipe, index) => (
                        <div key={recipe.url || index} onClick={() => setSelectedRecipe(recipe)} className="bg-white dark:bg-gray-800 rounded-xl shadow-md flex flex-col justify-between overflow-hidden transition-transform transform hover:-translate-y-1 cursor-pointer">
                            <div className="relative">
                                <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-40 object-cover" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (recipe.url) toggleFavorite(recipe); }}
                                    disabled={!!favoritingId || !recipe.url}
                                    className="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1.5 shadow-md hover:scale-110 transition-transform disabled:cursor-not-allowed disabled:opacity-70"
                                    aria-label="Save to favorites"
                                >
                                    {favoritingId === recipe.url ? 
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500" /> :
                                        <Heart size={20} className={`transition-colors ${isFavorite(recipe) ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} fill={isFavorite(recipe) ? 'currentColor' : 'none'} />
                                    }
                                </button>
                            </div>
                            <div className='p-4 flex flex-col flex-grow'>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2">{recipe.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm flex-grow line-clamp-3">{recipe.description}</p>
                                <div className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold flex items-center self-start"> View Recipe </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedRecipe && (
                <RecipeModal
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                    isFavorite={isFavorite(selectedRecipe)}
                    onToggleFavorite={toggleFavorite}
                />
            )}
            
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-300">
                    <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add Your Recipe</h3>
                             <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCustomRecipe} className="p-6 space-y-4 overflow-y-auto">
                             <input type="text" name="title" value={newRecipeData.title} onChange={handleNewRecipeChange} placeholder="Recipe Title" required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700" />
                             <textarea name="description" value={newRecipeData.description} onChange={handleNewRecipeChange} placeholder="A short, enticing description" required rows={3} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700" />
                             <textarea name="ingredients" value={newRecipeData.ingredients} onChange={handleNewRecipeChange} placeholder="Ingredients (one per line)" required rows={6} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700" />
                             <textarea name="instructions" value={newRecipeData.instructions} onChange={handleNewRecipeChange} placeholder="Instructions (one step per line)" required rows={6} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700" />
                        </form>
                        <div className="p-6 flex justify-end gap-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-600 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            <button type="submit" onClick={handleSaveCustomRecipe} disabled={isSaving} className="bg-teal-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-600 transition-colors disabled:bg-teal-300 flex items-center justify-center w-32">
                                {isSaving ? <Spinner /> : 'Save Recipe'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
