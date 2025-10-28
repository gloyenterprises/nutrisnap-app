import React, { useState, useEffect } from 'react';
import { Camera, UtensilsCrossed, Users, ExternalLink, Heart } from 'lucide-react';
import { getFeaturedRecipes, generateRecipeImage } from '../services/geminiService';
import type { FeaturedRecipe, Recipe } from '../types';
import { Spinner } from './Spinner';
import { RecipeModal } from './RecipeModal';

interface HomeProps {
    setActiveView: (view: 'dashboard' | 'recipes' | 'community' | 'progress') => void;
}

const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonText: string;
    onClick: () => void;
    className?: string;
}> = ({ icon, title, description, buttonText, onClick, className }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center flex flex-col items-center justify-between cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${className}`}
    >
        <div>
            <div className="flex justify-center mb-3">{icon}</div>
            <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100">{title}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{description}</p>
        </div>
        <div className="mt-auto bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold py-2 px-6 rounded-full group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300">
            {buttonText}
        </div>
    </div>
);


export const Home: React.FC<HomeProps> = ({ setActiveView }) => {
  const [featuredRecipes, setFeaturedRecipes] = useState<FeaturedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRecipe, setSelectedRecipe] = useState<FeaturedRecipe | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [favoritingId, setFavoritingId] = useState<string | null>(null);

  useEffect(() => {
    try {
        const savedFavorites = localStorage.getItem('nutrisnap_favorites');
        if (savedFavorites) {
            setFavorites(JSON.parse(savedFavorites));
        }
    } catch (error) {
        console.error("Could not load favorites from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('nutrisnap_favorites', JSON.stringify(favorites));
    } catch (error) {
        console.error("Could not save favorites to localStorage", error);
    }
  }, [favorites]);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        setLoading(true);
        const initialRecipes = await getFeaturedRecipes();
        setFeaturedRecipes(initialRecipes);

        // Asynchronously update any placeholder images with AI-generated ones
        initialRecipes.forEach((recipe) => {
            if (recipe.imageUrl.startsWith('https://source.unsplash.com')) {
                generateRecipeImage(recipe.imageSearchQuery || recipe.title).then(newImageUrl => {
                    setFeaturedRecipes(currentRecipes => {
                        const newRecipes = [...currentRecipes];
                        const recipeIndex = newRecipes.findIndex(r => r.url === recipe.url);
                        if (recipeIndex !== -1) {
                             newRecipes[recipeIndex] = { ...newRecipes[recipeIndex], imageUrl: newImageUrl };
                        }
                        return newRecipes;
                    });
                });
            }
        });
      } finally {
        setLoading(false);
      }
    };
    loadFeatured();
  }, []);

  const isFavorite = (recipe: FeaturedRecipe | null) => {
    if (!recipe || !recipe.url) return false;
    return favorites.some(fav => fav.url === recipe.url);
  };

  const toggleFavorite = async (recipe: FeaturedRecipe) => {
    if (!recipe.url) return;

    if (isFavorite(recipe)) {
      setFavorites(prev => prev.filter(fav => fav.url !== recipe.url));
      return;
    }
    if (favoritingId) return;
    setFavoritingId(recipe.url);
    try {
      let finalImageUrl = recipe.imageUrl;
      if (recipe.imageUrl.startsWith('https://source.unsplash.com')) {
          const query = recipe.imageSearchQuery || recipe.title;
          finalImageUrl = await generateRecipeImage(query);
      }
      const newFavorite: Recipe = {
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

  return (
    <div className="w-full">
      <div className="relative text-center p-12 md:p-20 rounded-2xl shadow-lg overflow-hidden bg-gray-700">
         <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop" 
            alt="A spread of healthy food" 
            className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-md">Welcome to NutriSnap</h1>
          <p className="text-lg text-gray-100 max-w-2xl mx-auto drop-shadow-md">
            Your supportive partner in building a healthy, balanced relationship with food. 
            Snap a photo, find inspiration, and join a community that cheers you on.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <FeatureCard
            icon={<Camera size={32} className="text-teal-500 group-hover:scale-110 transition-transform"/>}
            title="Snap Your Meal"
            description="Instantly see calories and macros by taking a photo of your food."
            buttonText="Start Snapping"
            onClick={() => setActiveView('dashboard')}
            className="md:col-span-1"
        />
        
        <FeatureCard
           icon={<UtensilsCrossed size={32} className="text-teal-500 group-hover:scale-110 transition-transform"/>}
           title="Find Inspiration"
           description="Discover nutritionist-picked recipes or create meals from ingredients you already have."
           buttonText="Explore Recipes"
           onClick={() => setActiveView('recipes')}
           className="md:col-span-2"
        />

        <FeatureCard
           icon={<Users size={32} className="text-teal-500 group-hover:scale-110 transition-transform"/>}
           title="Join Our Community"
           description="Share your wins, find support, and connect with others on a similar journey. You're not alone!"
           buttonText="See Community"
           onClick={() => setActiveView('community')}
           className="md:col-span-3"
        />
      </div>
      
       <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6">Featured Recipes</h3>
            {loading && <div className="flex justify-center p-8"><Spinner borderColor="border-teal-500" /></div>}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredRecipes.map(recipe => (
                    <div key={recipe.url} onClick={() => setSelectedRecipe(recipe)} className="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-transform transform hover:-translate-y-1 flex flex-col cursor-pointer">
                        <div className="relative">
                            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity" />
                            <button
                                onClick={(e) => { e.stopPropagation(); if(recipe.url) toggleFavorite(recipe); }}
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
                            <div className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold flex items-center self-start">
                                View Recipe
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>

      {selectedRecipe && (
        <RecipeModal 
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          isFavorite={isFavorite(selectedRecipe)}
          onToggleFavorite={toggleFavorite}
        />
      )}

    </div>
  );
};