import React from 'react';
import type { Recipe, FeaturedRecipe } from '../types';
import { X, ExternalLink, Heart, ChefHat } from 'lucide-react';

interface RecipeModalProps {
    recipe: Recipe | FeaturedRecipe;
    onClose: () => void;
    isFavorite: boolean;
    onToggleFavorite: (recipe: Recipe | FeaturedRecipe) => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose, isFavorite, onToggleFavorite }) => {
    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-300"
            onClick={onClose}
        >
            <div 
                className="relative bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-shrink-0">
                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-48 object-cover rounded-t-2xl" />
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-start gap-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{recipe.title}</h2>
                        <button
                            onClick={() => onToggleFavorite(recipe)}
                            disabled={!recipe.url}
                            className="flex-shrink-0 text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <Heart size={24} fill={isFavorite ? '#ef4444' : 'none'} stroke={isFavorite ? '#ef4444' : 'currentColor'} />
                        </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{recipe.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><ChefHat size={20} /> Ingredients</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
                                {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Instructions</h3>
                            <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2 text-sm">
                                {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                        </div>
                    </div>
                </div>

                {recipe.url && (
                    <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                        <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold">
                            View Original Source <ExternalLink size={14} />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};