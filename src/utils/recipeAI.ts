import { spawn } from 'child_process';
import { FitnessGoals, User, Recipe } from '@prisma/client';
import { Recipe as AIRecipe } from '../types/api';

interface AIRecipeInput {
  goals: string;
  ingredients: string[];
  skill: number;
  restrictions: string[];
  calories: number;
  preferences: {
    vegetarian?: boolean;
    vegan?: boolean;
    lowCarb?: boolean;
    highProtein?: boolean;
  };
  maxCookingTime?: number;
}

function generateGoalsString(fitnessGoals: FitnessGoals, preferences?: AIRecipeInput['preferences']): string {
  const goals = [
    `Maintain a diet of ${fitnessGoals.calories} calories`,
    `with ${fitnessGoals.protein}g protein`,
    `${fitnessGoals.carbs}g carbs`,
    `and ${fitnessGoals.fat}g fat`
  ];

  if (preferences) {
    if (preferences.vegetarian) goals.push('vegetarian diet');
    if (preferences.vegan) goals.push('vegan diet');
    if (preferences.lowCarb) goals.push('low-carb diet');
    if (preferences.highProtein) goals.push('high-protein diet');
  }

  return goals.join(', ');
}

export async function generateRecipe(
  user: User, 
  fitnessGoals: FitnessGoals, 
  ingredients: string[],
  skillLevel: number = 2,
  preferences?: AIRecipeInput['preferences'],
  maxCookingTime?: number
): Promise<Omit<Recipe, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>> {
  const input: AIRecipeInput = {
    goals: generateGoalsString(fitnessGoals, preferences),
    ingredients,
    skill: skillLevel,
    restrictions: fitnessGoals.allergies,
    calories: fitnessGoals.calories,
    preferences: preferences || {},
    maxCookingTime
  };

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['ai.py'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${error}`));
      } else {
        try {
          const aiRecipe = JSON.parse(result);
          // Convert AI recipe format to Prisma Recipe format
          const recipe = {
            name: aiRecipe.name,
            ingredients: JSON.stringify(aiRecipe.ingredients),
            steps: aiRecipe.instructions.join('\n'),
            image: '', // We could potentially generate this
            savedByUserId: null,
            viewedByUserId: null
          };
          resolve(recipe);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${result}`));
        }
      }
    });

    pythonProcess.stdin.write(JSON.stringify(input));
    pythonProcess.stdin.end();
  });
} 