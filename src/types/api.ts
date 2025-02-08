/**
 * API Types for Recipe Application
 * @packageDocumentation
 */

/**
 * Authentication Requests/Responses
 * @category Authentication
 */
export namespace Auth {
  /** Register user request body */
  export interface RegisterRequest {
    /** User's email address */
    email: string;
    /** User's password (will be hashed) */
    password: string;
    /** Optional user's display name */
    name?: string;
  }

  /** Login request body */
  export interface LoginRequest {
    /** User's email address */
    email: string;
    /** User's password */
    password: string;
  }

  /** Authentication response */
  export interface AuthResponse {
    /** JWT token for authentication */
    token: string;
  }
}

/**
 * Recipe Requests/Responses
 * @category Recipes
 */
export namespace Recipe {
  /** Create recipe request body */
  export interface CreateRequest {
    /** Recipe name */
    name: string;
    /** List of ingredients */
    ingredients: string;
    /** Cooking steps */
    steps: string;
    /** Recipe image URL */
    image: string;
  }

  /** Update recipe request body */
  export interface UpdateRequest {
    /** Recipe name */
    name?: string;
    /** List of ingredients */
    ingredients?: string;
    /** Cooking steps */
    steps?: string;
    /** Recipe image URL */
    image?: string;
  }

  /** Recipe response object */
  export interface RecipeResponse {
    /** Unique recipe ID */
    id: string;
    /** Recipe name */
    name: string;
    /** List of ingredients */
    ingredients: string;
    /** Cooking steps */
    steps: string;
    /** Recipe image URL */
    image: string;
    /** Author's user ID */
    authorId: string | null;
  }
}

/**
 * Fitness Goals Requests/Responses
 * @category Fitness
 */
export namespace Fitness {
  /** Create/Update fitness goals request body */
  export interface GoalsRequest {
    /** Daily calorie target */
    calories: number;
    /** Daily protein target in grams */
    protein: number;
    /** Daily carbs target in grams */
    carbs: number;
    /** Daily fat target in grams */
    fat: number;
    /** Daily water target in ml */
    water: number;
    /** List of food allergies */
    allergies: string[];
  }

  /** Fitness goals response object */
  export interface GoalsResponse {
    /** Unique goals ID */
    id: string;
    /** User ID */
    userId: string;
    /** Daily calorie target */
    calories: number;
    /** Daily protein target in grams */
    protein: number;
    /** Daily carbs target in grams */
    carbs: number;
    /** Daily fat target in grams */
    fat: number;
    /** Daily water target in ml */
    water: number;
    /** List of food allergies */
    allergies: string[];
  }
} 