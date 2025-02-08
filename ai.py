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

if not os.environ.get("MISTRAL_API_KEY"):
  os.environ["MISTRAL_API_KEY"] =  "oopsie whoopsie"

from langchain.chat_models import init_chat_model

model = init_chat_model("mistral-small-latest", model_provider="mistralai")

class Recipe(BaseModel):
    name: str
    ingredients: List[Dict[str,str]] = Field(..., description="List of ingredients with quantities")
    instructions: List[str]
    cooking_time: int
    difficulty: str
    nutritional_info: Dict[str,float]

class DayPlan(BaseModel):
    day : str 
    meals: Dict[str, Recipe]
class MealPlan(BaseModel):
    days: List[DayPlan]

class UserInput(BaseModel):
    goals: str
    ingredients: List[str]
    skill: int = Field(..., ge=1, le=3, description="1: Beginner, 2: Intermediate, 3: Expert")
    restrictions: List[str]
    calories: float 

    @field_validator('skill')
    def validate_skill(cls, v):
        if v not in [1,2,3]:
            raise ValueError("Skill must be between 1-3")
        return v 
    
class MealGenerator:
    def __init__(self):
        self.parser = PydanticOutputParser(pydantic_object=MealPlan)

        self.skill_levels = {
            1: "beginner (simple recipes, <30 mins, basic techniques)",
            2: "intermediate (moderate techniques, 30-60 mins)",
            3: "expert (complex methods, gourmet ingredients, >60 mins)"
        }

        self.prompt = ChatPromptTemplate.from_template( 
            """As a professional nutritionist and chef, create a 7-day meal plan that:
        - Helps achieve: {goals}
        - Uses primarily: {ingredients}
        - Cooking skill level: {skill_description} (user selected level {skill})
        - Target daily calories: {calories}
        - Dietary restrictions: {restrictions}
        - Provide different meals for each of the 7 days (Breakfast, Lunch, Dinner).
        - Try to ensure lunch and dinner items have more calories and nutrional value than breakfast. Do not write typically breakfast meals for lunch or dinner.
        - **IMPORTANT**: For each meal, ensure you include:
        - name (string)
        - ingredients (list of dicts)
        - instructions (list of strings)
        - cooking_time (int)
        - difficulty (string)
        - nutritional_info (dict of floats, must include at least "calories")
        - Do not leave any field empty or missing.

        {format_instructions}

        Return ONLY the JSON, no extra text or explanation."""
        )

        self.chain = (
            RunnablePassthrough.assign(
                format_instructions=lambda _: self.parser.get_format_instructions(),
                skill_description=lambda x: self.skill_levels[x["skill"]]
            )
            | self.prompt
            | model
            | RunnableLambda(self._clean_response)
            | self.parser
        )
    
    def generate_meal_plan(self, user_input: dict) -> MealPlan: 
        try: 
            return self.chain.invoke(user_input)
        except Exception as e: 
            print(f'Error generating meal plan: {e}')
            return None 
        
    def _clean_response(self, response) -> str:
        content = response.content if hasattr(response, 'content') else response 
        cleaned = content.strip().removeprefix('```json').removesuffix('```').strip()
        return cleaned 
    
    def print_meal_plan(self, meal_plan: MealPlan):
        for day_plan in meal_plan.days:
            print(f"\n{day_plan.day}:")
        
        # Track the total calories for the day
            daily_calories = 0
        
            for meal_type, recipe in day_plan.meals.items():
                print(f"  {meal_type.capitalize()}: {recipe.name}")
                print(f"    Cooking Time: {recipe.cooking_time} mins")
                print(f"    Difficulty: {recipe.difficulty}")

            # Calories for this recipe
                meal_calories = recipe.nutritional_info.get('calories', 0)
                daily_calories += meal_calories

            # Print full nutritional info (if present)
                if recipe.nutritional_info:
                    print("    Nutritional Info:")
                    for key, value in recipe.nutritional_info.items():
                        print(f"      {key.capitalize()}: {value}")

            # Print ingredient list
                print("    Ingredients:")
                for ingredient_dict in recipe.ingredients:
                # Each dict might look like {"item": "chicken breast", "quantity": "100g"}
                    line_items = [f"{k}: {v}" for k, v in ingredient_dict.items()]
                    print(f"      - {', '.join(line_items)}")

            # Print instructions
                print("    Instructions:")
                for step_num, step in enumerate(recipe.instructions, start=1):
                    print(f"      {step_num}. {step}")

        # After listing all meals, print the daily total calories
            print(f"  Total Daily Calories: {daily_calories}")
test_input = {
    "goals": "Lose weight while maintaining muscle mass",
    "ingredients": [
        "chicken breast",
        "broccoli",
        "brown rice",
        "eggs",
        "oatmeal",
        "avocados",
        "tomatoes",
        "almond milk"
    ],
    "skill": 2,  # 1=Beginner, 2=Intermediate, 3=Expert
    "restrictions": ["gluten-free", "lactose intolerant"],
    "calories": 1800.0
}

if __name__ == "__main__":
    # Create an instance of the MealGenerator
    generator = MealGenerator()

    # Invoke the meal generation with the test input
    meal_plan = generator.generate_meal_plan(test_input)

    # Print the resulting meal plan to verify the structure and content
    if meal_plan:
        generator.print_meal_plan(meal_plan)
    else:
        print("No meal plan generated.")
