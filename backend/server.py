from flask import Flask, request, jsonify
from flask_cors import CORS
import ollama
import json

app = Flask(__name__)
CORS(app)

@app.route("/ai_hint", methods=["POST"])
def ai_hint():
    data = request.get_json()
    
    game_type = data.get("game_type", "physics")
    user_message = data.get("user_message", "")
    context = data.get("context", {})
    
    if game_type == "chemistry_generation":
        elements = context.get("elements", [])

        system_prompt = """
        You are an expert chemistry engine for an educational sandbox. 
        When given a list of elements, generate a chemically plausible (or fun, sci-fi but logically consistent) compound.
        You MUST return ONLY a valid JSON object matching this exact schema:
        {
            "formula": "String (use unicode subscripts if needed, e.g., H₂O)",
            "commonName": "String",
            "physicalState": "Must be exactly one of: 'solid', 'liquid', 'gas', 'plasma', 'unknown'",
            "color": "String (a valid hex code, e.g., '#ffd54f')",
            "dangerLevel": "Must be exactly one of: 'safe', 'low', 'moderate', 'high', 'extreme'",
            "stability": "String (e.g., 'stable', 'highly reactive')",
            "uses": "String (Brief description of what it is used for)",
            "reactionDescription": "String (Briefly describe how these atoms bonded)"
        }
        """

        try:
            response = ollama.chat(
                model="phi3",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Combine these elements: {elements}"}
                ],
                format ="json",
                options={"temperature": 0.5}
            )

            generated_compound = json.loads(response['message']['content'])
            return jsonify({"reply": generated_compound})

        except Exception as e:
            print(f"Generation Error: {e}")
            return jsonify({"error": "Failed to generate compound"}), 500

    else:
        prompt = f"Game: {game_type}\nContext: {context}\nQuestion: {user_message}" 
        
        try:
            response = ollama.chat(
                model="phi3",
                messages=[{"role": "user", "content": prompt}]
            )
            return jsonify({"reply": response['message']['content']})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
    
