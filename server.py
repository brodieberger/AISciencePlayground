from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

client = OpenAI()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AIRequest(BaseModel):
    user_message: str
    ball: dict
    goal: dict
    lines: list

@app.post("/ai_hint")
def ai_hint(req: AIRequest):
    prompt = f"""
You are a team of scientists inside a 2D physics sandbox demo for kids.

User question:
{req.user_message}

Ball position: {req.ball}
Goal position: {req.goal}
Drawn lines: {req.lines}

Explain clearly and briefly use simple words that a child could understand. No more than three small sentences.
Do not speak in terms of coordinates. Use relative positions of objects on the screen.
The player is unable to remove lines on the screen. 
Sometimes the level is not completable, and they will have to click restart. The ball cannot gain momentum, and can only drop. 
The player has to click "Release Ball" in order for the game to begin.
"""

    response = client.responses.create(
        model="o4-mini",
        input=prompt
    )

    return {"reply": response.output_text}
