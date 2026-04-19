import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def call_gemini(prompt: str):
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text