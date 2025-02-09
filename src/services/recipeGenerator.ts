import { z } from 'zod';
import axios from 'axios';

// Validation schemas
const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.object({
    item: z.string(),
    quantity: z.string()
  })),
  instructions: z.array(z.string()),
  cookingTime: z.number(),
  difficulty: z.string(),
  nutritionalInfo: z.object({
    calories: z.number(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional()
  })
});

const UserInputSchema = z.object({
  goals: z.string(),
  ingredients: z.array(z.string()),
  skill: z.number().min(1).max(3),
  restrictions: z.array(z.string()),
  calories: z.number(),
  preferences: z.object({
    vegetarian: z.boolean().optional(),
    vegan: z.boolean().optional(),
    lowCarb: z.boolean().optional(),
    highProtein: z.boolean().optional()
  }).optional(),
  maxCookingTime: z.number().optional()
});

type Recipe = z.infer<typeof RecipeSchema>;
type UserInput = z.infer<typeof UserInputSchema>;

export class RecipeGenerator {
  private apiKey: string;
  private apiUrl: string;
  
  private skillLevels = {
    1: "beginner (simple recipes, <30 mins, basic techniques)",
    2: "intermediate (moderate techniques, 30-60 mins)",
    3: "expert (complex methods, gourmet ingredients, >60 mins)"
  };

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    const apiUrl = process.env.MISTRAL_API_URL;
    if (!apiKey) throw new Error('MISTRAL_API_KEY not found in environment variables');
    if (!apiUrl) throw new Error('MISTRAL_API_URL not found in environment variables');
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  private formatPreferences(preferences?: UserInput['preferences']): string {
    if (!preferences) return "";
    
    const prefs = [];
    if (preferences.vegetarian) prefs.push("Must be vegetarian");
    if (preferences.vegan) prefs.push("Must be vegan");
    if (preferences.lowCarb) prefs.push("Should be low in carbohydrates");
    if (preferences.highProtein) prefs.push("Should be high in protein");
    
    return prefs.length ? "- " + prefs.join("\n- ") : "";
  }

  async generateRecipe(input: UserInput): Promise<Recipe> {
    // Validate input
    const validatedInput = UserInputSchema.parse(input);
    
    const prompt = `As a professional chef, create a recipe that:
    - Helps achieve: ${validatedInput.goals}
    - Uses primarily: ${validatedInput.ingredients.join(', ')}
    - Cooking skill level: ${this.skillLevels[validatedInput.skill as 1 | 2 | 3]} (user selected level ${validatedInput.skill})
    - Target calories: ${validatedInput.calories}
    - Dietary restrictions: ${validatedInput.restrictions.join(', ')}
    ${validatedInput.maxCookingTime ? `- Must be prepared in under ${validatedInput.maxCookingTime} minutes` : ''}
    ${this.formatPreferences(validatedInput.preferences)}
    
    Ensure the recipe includes:
    - A descriptive name
    - Detailed ingredients list with quantities
    - Clear step-by-step instructions
    - Cooking time in minutes
    - Difficulty level
    - Complete nutritional information
    
    Return ONLY valid JSON matching this TypeScript type:
    {
      name: string;
      ingredients: Array<{ item: string; quantity: string }>;
      instructions: string[];
      cookingTime: number;
      difficulty: string;
      nutritionalInfo: {
        calories: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      }
    }`;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: "mistral-small",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      try {
        const parsed = JSON.parse(content);
        return RecipeSchema.parse(parsed);
      } catch (e) {
        throw new Error(`Failed to parse AI response: ${e}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`API request failed: ${message}`);
      }
      throw error;
    }
  }
} 