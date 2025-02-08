import { spawn } from 'child_process';
import { FitnessGoals, User, Recipe } from '@prisma/client';
import { Recipe as AIRecipe } from '../types/api';
import path from 'path';

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
    // Get absolute path to Python script
    const scriptPath = path.resolve(__dirname, '../../../ai.py');
    console.log('Python script path:', scriptPath);

    const pythonProcess = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1' // Enable unbuffered output
      }
    });

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      console.log('Python stdout:', data.toString());
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python stderr:', data.toString());
      error += data.toString();
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${error}`));
      } else {
        try {
          const aiRecipe = JSON.parse(result);
          const recipe = {
            name: aiRecipe.name,
            ingredients: JSON.stringify(aiRecipe.ingredients),
            steps: aiRecipe.instructions.join('\n'),
            image: '',
            savedByUserId: null,
            viewedByUserId: null
          };
          resolve(recipe);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${result}\nError: ${e.message}`));
        }
      }
    });

    // Write input to Python process
    const inputStr = JSON.stringify(input);
    console.log('Sending input to Python:', inputStr);
    pythonProcess.stdin.write(inputStr);
    pythonProcess.stdin.end();
  });
} 