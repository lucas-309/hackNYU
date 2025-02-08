from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.messages import HumanMessage, AIMessage
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any 
import requests
import getpass
import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')
if not MISTRAL_API_KEY:
    raise ValueError("MISTRAL_API_KEY not found in environment variables")

from langchain.chat_models import init_chat_model

model = init_chat_model("mistral-small-latest", model_provider="mistralai")

class Recipe(BaseModel):
    name: str
    ingredients: List[Dict[str,str]] = Field(..., description="List of ingredients with quantities")
    instructions: List[str]
    cooking_time: int
    difficulty: str
    nutritional_info: Dict[str,float]

class UserInput(BaseModel):
    goals: str
    ingredients: List[str]
    skill: int = Field(..., ge=1, le=3, description="1: Beginner, 2: Intermediate, 3: Expert")
    restrictions: List[str]
    calories: float
    preferences: Dict[str, bool] = Field(default_factory=dict)
    maxCookingTime: Optional[int] = None

    @field_validator('skill')
    def validate_skill(cls, v):
        if v not in [1,2,3]:
            raise ValueError("Skill must be between 1-3")
        return v 
    
class RecipeGenerator:
    def __init__(self):
        self.parser = PydanticOutputParser(pydantic_object=Recipe)

        self.skill_levels = {
            1: "beginner (simple recipes, <30 mins, basic techniques)",
            2: "intermediate (moderate techniques, 30-60 mins)",
            3: "expert (complex methods, gourmet ingredients, >60 mins)"
        }

        self.prompt = ChatPromptTemplate.from_template(
            """As a professional chef, create a recipe that:
            - Helps achieve: {goals}
            - Uses primarily: {ingredients}
            - Cooking skill level: {skill_description} (user selected level {skill})
            - Target calories: {calories}
            - Dietary restrictions: {restrictions}
            {cooking_time_constraint}
            {dietary_preferences}
            
            Ensure the recipe includes:
            - A descriptive name
            - Detailed ingredients list with quantities
            - Clear step-by-step instructions
            - Cooking time in minutes (must be under {max_cooking_time} minutes)
            - Difficulty level
            - Complete nutritional information

            {format_instructions}

            Return ONLY the JSON, no extra text."""
        )

        self.chain = (
            RunnablePassthrough.assign(
                format_instructions=lambda _: self.parser.get_format_instructions(),
                skill_description=lambda x: self.skill_levels[x["skill"]],
                cooking_time_constraint=lambda x: f"- Must be prepared in under {x['maxCookingTime']} minutes" if x.get('maxCookingTime') else "",
                dietary_preferences=self._format_preferences,
                max_cooking_time=lambda x: x.get('maxCookingTime', 120)
            )
            | self.prompt
            | model
            | RunnableLambda(self._clean_response)
            | self.parser
        )
    
    def generate_recipe(self, user_input: dict) -> Recipe:
        try:
            return self.chain.invoke(user_input)
        except Exception as e:
            print(f'Error generating recipe: {e}')
            return None

    def _clean_response(self, response) -> str:
        content = response.content if hasattr(response, 'content') else response
        cleaned = content.strip().removeprefix('```json').removesuffix('```').strip()
        return cleaned

    def _format_preferences(self, input_data: dict) -> str:
        prefs = input_data.get('preferences', {})
        if not prefs:
            return ""
        
        pref_strings = []
        if prefs.get('vegetarian'): pref_strings.append("Must be vegetarian")
        if prefs.get('vegan'): pref_strings.append("Must be vegan")
        if prefs.get('lowCarb'): pref_strings.append("Should be low in carbohydrates")
        if prefs.get('highProtein'): pref_strings.append("Should be high in protein")
        
        return "- " + "\n- ".join(pref_strings) if pref_strings else ""

if __name__ == "__main__":
    input_data = json.loads(sys.stdin.read())
    generator = RecipeGenerator()
    recipe = generator.generate_recipe(input_data)
    
    if recipe:
        print(json.dumps(recipe.model_dump()))
    else:
        sys.exit(1)
