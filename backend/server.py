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
    user_prompt = data.get("user_prompt", "")
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
                format="json",
                options={"temperature": 0.5}
            )
            generated_compound = json.loads(response['message']['content'])
            print(json.dumps(generated_compound, indent=4))
            return jsonify({"reply": generated_compound})
        except Exception as e:
            print(f"Generation Error: {e}")
            return jsonify({"error": "Failed to generate compound"}), 500

    elif game_type == "physics":
        ball = context.get("ball", {})
        goal = context.get("goal", {})
        lines = context.get("lines", [])
        placed_prefabs = context.get("placedPrefabs", [])
        inventory = context.get("inventory", [])
        prompt = f"""You are a team of scientists inside a 2D physics sandbox for kids.

User question: {user_prompt}

Ball position: {ball}
Goal position: {goal}
Drawn lines: {lines}
Placed objects: {placed_prefabs}
Remaining inventory: {inventory}

Explain briefly using simple words a child could understand. No more than three sentences.
Do not use coordinates — describe positions relatively. The ball gains momentum by dropping and rolling.
The player must click "Release Ball" to start.
"""

    elif game_type == "circuitry":
        goal = context.get("goal", "")
        solved = context.get("solved", False)
        short_circuit = context.get("shortCircuit", False)
        active_lights = context.get("activeLights", 0)
        total_lights = context.get("totalLights", 0)
        prompt = f"""You are an electrical engineer inside a circuitry sandbox for kids.

User question: {user_prompt}

Goal: {goal}
Solved: {solved}
Short circuit: {short_circuit}
Active lights: {active_lights} / {total_lights}

Explain briefly using simple words a child could understand. No more than three sentences.
Focus on the circuit state and what the player should do next.
"""

    elif game_type == "chemistry":
        level = context.get("level", "")
        goal = context.get("goal", "")
        sandbox_mode = context.get("sandboxMode", False)
        selected_elements = context.get("selectedElements", [])
        last_result = context.get("lastResult", None)
        goal_reached = context.get("goalReached", False)
        prompt = f"""You are a chemist inside a chemistry sandbox for kids.

User question: {user_prompt}

Level: {level}
Target formula: {goal}
Sandbox mode: {sandbox_mode}
Currently selected elements: {selected_elements}
Last reaction result: {last_result}
Goal reached: {goal_reached}

Explain briefly using simple words a child could understand. No more than three sentences.
Focus on which elements to combine to reach the target formula.
"""

    else:
        prompt = f"Game: {game_type}\nContext: {context}\nQuestion: {user_prompt}"

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
