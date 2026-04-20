export const uiState = $state({
	goalReached: false,
	aiPrompt: '',
	aiResponse: '',
	gameType: 'physics',
	aiContext: {} as Record<string, unknown>,
});

export const physicsGameState = $state({
	currentLevelIndex: 0,
	inventory: [] as { type: PrefabType; count: number }[],
	activePrefab: null as PrefabType | null // what's currently being dragged
});

export async function askAI(gameType: string, userPrompt: string, context: any) {
	const payload = {
		game_type: gameType,
		user_prompt: userPrompt,
		context: JSON.parse(JSON.stringify(context))
	};

	console.log('PAYLOAD:', payload);

	const res = await fetch('http://127.0.0.1:8080/ai_hint', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});

	const data = await res.json();
	return data.reply;
}
