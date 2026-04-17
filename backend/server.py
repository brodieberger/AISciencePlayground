from flask import Flask, request, jsonify
from flask_cors import CORS
import ollama
import json

app = Flask(__name__)
CORS(app)

@app.route("ai/hint", methods=["POST"])
def ai_hint():
    data = request.get_json()
    
    game_type = data.get("game_type", "physics")
    user_message = data.get("user_message", "")
    context = data.get("context", {})
    
    if game_type == "chemistry_generation"
    