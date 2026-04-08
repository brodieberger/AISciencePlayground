export const uiState = $state({
    goalReached: false,
    aiPrompt: '',
    aiResponse: '',
    aiContext: {} as Record<string, unknown>,
    gameType: "None" // default
});

export async function askAI(gameType: string, userPrompt: string, context: any) {
    const payload = {
        game_type: gameType,
        user_prompt: userPrompt,
        context: JSON.parse(JSON.stringify(context))
    };

    console.log("PAYLOAD:", payload);

    const res = await fetch("https://www.brodieberger.com/ai_hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data.reply;
}