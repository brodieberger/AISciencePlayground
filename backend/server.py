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
            "REQUIRED: Never give the direct answer."
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
        system_prompt = (
            "You are Lumi, a friendly science helper for kids. "
            "STRICT RULES: "
            "1) Reply in 1-2 SHORT sentences only. "
            "2) Use simple words a 7-year-old would know. "
            "3) Never reveal the answer — only give a small hint. "
            "4) Never mention coordinates — use words like left, right, above, below. "
            "5) Do NOT greet the player or add filler."
        )
        user_msg = (
            f"Question: {user_prompt}\n"
            f"Ball: {ball}, Goal: {goal}\n"
            f"Placed: {placed_prefabs}, Inventory: {inventory}\n"
            f"Solution: {solution}"
        )

    elif game_type == "circuitry":
        goal = context.get("goal", "")
        solved = context.get("solved", False)
        short_circuit = context.get("shortCircuit", False)
        active_lights = context.get("activeLights", 0)
        total_lights = context.get("totalLights", 0)
        system_prompt = (
            "You are Lumi, a friendly science helper for kids. "
            "STRICT RULES: "
            "1) Reply in 1-2 SHORT sentences only. "
            "2) Use simple words a 7-year-old would know. "
            "3) Never reveal the answer — only give a small hint. "
            "4) Do NOT greet the player or add filler."
        )
        user_msg = (
            f"Question: {user_prompt}\n"
            f"Goal: {goal}, Solved: {solved}\n"
            f"Short circuit: {short_circuit}\n"
            f"Lights on: {active_lights}/{total_lights}"
        )

    elif game_type == "chemistry":
        level = context.get("level", "")
        goal = context.get("goal", "")
        sandbox_mode = context.get("sandboxMode", False)
        available_elements = context.get("availableElements", [])
        selected_elements = context.get("selectedElements", [])
        last_result = context.get("lastResult", None)
        goal_reached = context.get("goalReached", False)
        system_prompt = (
            "You are Lumi, a friendly science helper for kids. "
            "STRICT RULES: "
            "1) Reply in 1-2 SHORT sentences only. "
            "2) Use simple words a 7-year-old would know. "
            "3) Never reveal the answer or exact element counts — only give a small hint. "
            "4) Do NOT greet the player or add filler."
        )
        user_msg = (
            f"Question: {user_prompt}\n"
            f"Level: {level}, Target: {goal}\n"
            f"Sandbox: {sandbox_mode}\n"
            f"Available: {available_elements}\n"
            f"Selected: {selected_elements}\n"
            f"Last result: {last_result}, Goal reached: {goal_reached}"
        )

    else:
        system_prompt = "You are Lumi, a friendly science helper for kids. Reply in 1-2 short sentences only."
        user_msg = f"Game: {game_type}\nContext: {context}\nQuestion: {user_prompt}"

    try:
        response = ollama.chat(
            model="phi3",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg}
            ],
            options={"temperature": 0.5, "num_predict": 120}
        )
        return jsonify({"reply": response['message']['content']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
