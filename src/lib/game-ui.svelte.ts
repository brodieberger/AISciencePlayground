export const uiState = $state({
	goalReached: false,
	aiPrompt: '',
	aiResponse: '',
	gameType: 'physics',
    aiContext: {} as Record<string, unknown>,
	aiMode: 'online' as 'online' | 'local',
});

export const physicsGameState = $state({
	currentLevelIndex: 0,
	inventory: [] as { type: PrefabType; count: number }[],
	activePrefab: null as PrefabType | null,
	cageReleased: false,
	sandboxDrawActive: false,
	mode: 'levels' as 'levels' | 'sandbox',
});

export async function askAI(gameType: string, userPrompt: string, context: Record<string, unknown>) {
	const payload = {
		game_type: gameType,
		user_prompt: userPrompt,
		context: JSON.parse(JSON.stringify(context))
	};

	const url = uiState.aiMode === 'local'
		? 'http://localhost:8080/ai_hint'
		: 'https://www.brodieberger.com/ai_hint';

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) throw new Error(`Server error ${res.status}`);
		const data = await res.json();
		return data.reply;
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		return `Unable to reach the AI (${msg}). Please check your connection.`;
	}
}
