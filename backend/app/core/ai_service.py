import os
import json
from google import genai
from pydantic import BaseModel

def generate_savings_forecast(logs: list, provider: str = "Xcel") -> str:
    """
    Calls the Gemini API to analyze the user's recent energy habits and provide a forecast.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key or api_key == "your_gemini_api_key_here":
        return "Configure your GEMINI_API_KEY in the .env file to unlock AI-powered insights."
        
    if not logs:
        return "No recent activity to analyze. Start logging your appliances to get personalized savings tips!"
        
    try:
        client = genai.Client(api_key=api_key)
        
        # Prepare context
        logs_json = json.dumps(logs, indent=2)
        system_prompt = f"""
You are an expert energy advisor for a Colorado resident using {provider}. 
Your goal is to act like a "fitness tracker" for the grid.
The user provides you with their recent appliance logs.
Analyze their behavior based on Typical Time-of-Use rates:
- Xcel Peak: 5 PM - 9 PM Weekdays
- CORE Peak: 4 PM - 8 PM
- United Power Peak: 4 PM - 8 PM (or 5-9 PM depending on plan)

Provide a short, punchy, friendly piece of advice (2-3 sentences max) on how they can shift their usage to save money, acknowledging any good behavior you see. Do not use markdown if possible, just plain text.
"""
        user_prompt = f"Here are my recent logs:\n{logs_json}\n\nWhat is my forecast and advice?"

        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[system_prompt, user_prompt],
        )
        
        return response.text.strip()
        
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return "Our AI advisor is currently taking a break. Please check back later."
