import { FitnessGoals, User, Recipe } from '@prisma/client';
import { RecipeGenerator } from '../services/recipeGenerator';

export async function generateRecipe(
  user: User, 
  fitnessGoals: FitnessGoals, 
  ingredients: string[],
  skillLevel: number = 2,
  preferences?: {
    vegetarian?: boolean;
    vegan?: boolean;
    lowCarb?: boolean;
    highProtein?: boolean;
  },
  maxCookingTime?: number
): Promise<Omit<Recipe, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>> {
  const generator = new RecipeGenerator();
  
  const result = await generator.generateRecipe({
    goals: `Maintain a diet of ${fitnessGoals.calories} calories, with ${fitnessGoals.protein}g protein, ${fitnessGoals.carbs}g carbs, and ${fitnessGoals.fat}g fat`,
    ingredients,
    skill: skillLevel,
    restrictions: fitnessGoals.allergies,
    calories: fitnessGoals.calories,
    preferences,
    maxCookingTime
  });

  return {
    name: result.name,
    ingredients: JSON.stringify(result.ingredients),
    steps: result.instructions.join('\n'),
    image: '',
    savedByUserId: null,
    viewedByUserId: null
  };
} 