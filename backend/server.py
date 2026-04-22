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

        system_prompt = (
            "You are an expert chemistry engine for an educational sandbox. "
            "Generate a compound using EXACTLY the element quantities provided — do not adjust or normalize the ratios. "
            "For example, if given 1 H and 1 O, the formula is HO, not H\u2082O. "
            "If given 2 H and 1 O, then the formula is H\u2082O. "
            "Return ONLY a valid JSON object with these exact keys: "
            "formula (string, use unicode subscripts e.g. H\u2082O), "
            "commonName (string), "
            "physicalState (exactly one of: solid, liquid, gas, plasma, unknown), "
            "color (valid hex code e.g. #ffd54f), "
            "dangerLevel (exactly one of: safe, low, moderate, high, extreme), "
            "stability (string e.g. stable or highly reactive), "
            "uses (string, brief real-world description), "
            "reactionDescription (string, brief bonding explanation)."
        )

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
            return jsonify({"error": str(e)}), 500

    elif game_type == "physics":
        ball = context.get("ball", {})
        goal = context.get("goal", {})
        placed_prefabs = context.get("placedPrefabs", [])
        inventory = context.get("inventory", [])
        solution = context.get("solution", "")
        prompt = f"""You are a team of scientists inside a 2D physics sandbox for kids.

User question: {user_prompt}

Ball position: {ball}
Goal position: {goal}
Placed objects: {placed_prefabs}
Remaining inventory: {inventory}
Intended solution: {solution}

Explain briefly using simple words a child could understand. No more than three sentences.
Do not use coordinates - describe positions relatively. The ball gains momentum by dropping and rolling.
Guide the player toward the intended solution without giving it away directly.
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
        available_elements = context.get("availableElements", [])
        selected_elements = context.get("selectedElements", [])
        last_result = context.get("lastResult", None)
        goal_reached = context.get("goalReached", False)
        prompt = f"""You are a chemist inside a chemistry sandbox for kids.

User question: {user_prompt}

Level: {level}
Target formula: {goal}
Sandbox mode: {sandbox_mode}
Available elements: {available_elements}
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
