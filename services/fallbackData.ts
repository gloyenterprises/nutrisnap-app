
import type { Recipe, FeaturedRecipe } from '../types';

export const fallbackFeaturedRecipes: FeaturedRecipe[] = [
    {
        title: "Classic Avocado Toast",
        description: "A simple, quick, and delicious breakfast that's packed with healthy fats and fiber to start your day right.",
        imageUrl: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=1000&auto=format&fit=crop",
        url: "#avocado-toast",
        imageSearchQuery: "delicious avocado toast",
        ingredients: [
            "1 slice of whole-wheat bread, toasted",
            "1/2 ripe avocado",
            "1 pinch of red pepper flakes",
            "1 pinch of sea salt",
            "1/2 tsp lemon juice",
            "Everything bagel seasoning (optional)"
        ],
        instructions: [
            "Toast the slice of bread to your liking.",
            "In a small bowl, mash the avocado with a fork. Mix in the salt and lemon juice.",
            "Spread the mashed avocado evenly on the toast.",
            "Sprinkle with red pepper flakes and everything bagel seasoning, if using.",
            "Serve immediately and enjoy!"
        ],
    },
    {
        title: "Mediterranean Quinoa Salad",
        description: "A vibrant and refreshing salad, perfect for a light lunch or side dish. It's full of flavor and nutrients.",
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop",
        url: "#quinoa-salad",
        imageSearchQuery: "vibrant quinoa salad",
        ingredients: [
            "1 cup cooked quinoa, cooled",
            "1 cup cherry tomatoes, halved",
            "1/2 cup cucumber, diced",
            "1/4 cup red onion, thinly sliced",
            "1/4 cup Kalamata olives, halved",
            "1/4 cup crumbled feta cheese",
            "2 tbsp fresh parsley, chopped",
            "For the dressing: 3 tbsp olive oil, 1 tbsp lemon juice, 1 tsp dried oregano, salt and pepper to taste"
        ],
        instructions: [
            "In a large bowl, combine the cooked quinoa, cherry tomatoes, cucumber, red onion, and olives.",
            "In a small bowl, whisk together the olive oil, lemon juice, oregano, salt, and pepper.",
            "Pour the dressing over the salad and toss gently to combine.",
            "Stir in the feta cheese and fresh parsley.",
            "Serve chilled or at room temperature."
        ],
    },
    {
        title: "Sheet Pan Lemon Herb Chicken",
        description: "An easy and flavorful one-pan dinner. The chicken and veggies roast together for a healthy meal with minimal cleanup.",
        imageUrl: "https://images.unsplash.com/photo-1604503468813-176c1d1b54f4?q=80&w=1000&auto=format&fit=crop",
        url: "#lemon-chicken",
        imageSearchQuery: "sheet pan lemon chicken and vegetables",
        ingredients: [
            "2 boneless, skinless chicken breasts",
            "1 lb broccoli florets",
            "1 lb baby potatoes, halved",
            "1 lemon, thinly sliced",
            "2 tbsp olive oil",
            "1 tsp dried oregano",
            "1 tsp dried thyme",
            "2 cloves garlic, minced",
            "Salt and pepper to taste"
        ],
        instructions: [
            "Preheat oven to 400°F (200°C).",
            "On a large baking sheet, toss the baby potatoes with 1 tbsp of olive oil, salt, and pepper. Roast for 15 minutes.",
            "In a bowl, toss the broccoli with the remaining 1 tbsp of olive oil.",
            "Push the potatoes to one side of the pan. Add the chicken breasts and broccoli to the baking sheet.",
            "In a small bowl, mix together the oregano, thyme, and minced garlic. Rub this mixture over the chicken breasts.",
            "Arrange lemon slices over the chicken and vegetables. Season everything with salt and pepper.",
            "Bake for 20-25 minutes, or until the chicken is cooked through and the vegetables are tender.",
            "Serve hot."
        ],
    },
];

export const fallbackSearchResults: Recipe[] = [
    ...fallbackFeaturedRecipes,
    {
        title: "Simple Berry Smoothie",
        description: "A refreshing and antioxidant-rich smoothie that's perfect for a quick breakfast or a post-workout snack.",
        imageUrl: "https://images.unsplash.com/photo-1502741224143-94386982b831?q=80&w=1000&auto=format=fit&crop",
        url: "#berry-smoothie",
        imageSearchQuery: "refreshing berry smoothie",
        ingredients: [
            "1 cup mixed frozen berries (strawberries, blueberries, raspberries)",
            "1/2 banana",
            "1/2 cup Greek yogurt",
            "1/2 cup milk (dairy or non-dairy)",
            "1 tbsp honey or maple syrup (optional)"
        ],
        instructions: [
            "Place all ingredients in a blender.",
            "Blend on high until smooth and creamy.",
            "If the smoothie is too thick, add a little more milk until it reaches your desired consistency.",
            "Pour into a glass and serve immediately."
        ],
    },
    {
        title: "Hearty Lentil Soup",
        description: "A warm and comforting vegetarian soup that is both filling and incredibly nutritious. Perfect for a chilly day.",
        imageUrl: "https://images.unsplash.com/photo-1598214886383-9b6a187c3a79?q=80&w=1000&auto=format=fit&crop",
        url: "#lentil-soup",
        imageSearchQuery: "hearty vegetarian lentil soup",
        ingredients: [
            "1 tbsp olive oil",
            "1 large onion, chopped",
            "2 carrots, diced",
            "2 celery stalks, diced",
            "2 cloves garlic, minced",
            "1 cup brown or green lentils, rinsed",
            "6 cups vegetable broth",
            "1 (14.5 ounce) can diced tomatoes, undrained",
            "1 tsp dried thyme",
            "Salt and pepper to taste"
        ],
        instructions: [
            "Heat olive oil in a large pot or Dutch oven over medium heat.",
            "Add onion, carrots, and celery and cook until softened, about 5-7 minutes.",
            "Stir in garlic and cook for another minute until fragrant.",
            "Add the rinsed lentils, vegetable broth, diced tomatoes, and thyme.",
            "Bring to a boil, then reduce heat and let it simmer for 40-50 minutes, or until lentils are tender.",
            "Season with salt and pepper to taste before serving."
        ]
    }
];
