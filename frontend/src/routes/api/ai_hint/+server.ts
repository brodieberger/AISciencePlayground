import { json } from '@sveltejs/kit';
import OpenAI from 'openai';

// Point the client to your Mac's local Ollama instance
const openai = new OpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama-local', // Required by the SDK, but ignored by Ollama
});

export async function POST({ request }) {
    try {
        // 1. Get the payload from the game
        const { user_message, ball, goal, lines } = await request.json();

        // 2. Construct the system prompt
        const prompt = `
You are a team of scientists inside a 2D physics sandbox demo for kids.

User question:
${user_message}

Ball position: ${JSON.stringify(ball)}
Goal position: ${JSON.stringify(goal)}
Drawn lines: ${JSON.stringify(lines)}

Explain clearly and briefly use simple words that a child could understand. No more than three small sentences.
Do not speak in terms of coordinates. Use relative positions of objects on the screen.
The player is unable to remove lines on the screen. 
Sometimes the level is not completable, and they will have to click restart. The ball cannot gain momentum, and can only drop. 
The player has to click "Release Ball" in order for the game to begin.
`;

        // 3. Make the call to your local Phi-3.5 model
        const response = await openai.chat.completions.create({
            model: 'phi3.5',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2, // Keeps the model focused and logical
            stop: ['####', 'User question:'] // Prevents the synthetic data hallucination we saw earlier!
        });

        // 4. Return the AI's reply to the frontend
        return json({ reply: response.choices[0].message.content });

    } catch (error) {
        console.error("AI Request failed:", error);
        return json({ reply: "The Science Team is currently offline. Please try again." }, { status: 500 });
    }
}