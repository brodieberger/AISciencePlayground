// $lib/chemistry/game.svelte.ts

// ── Types ─────────────────────────────────────────────────────────────────────

export type PhysicalState = 'solid' | 'liquid' | 'gas' | 'plasma' | 'unknown';
export type DangerLevel = 'safe' | 'low' | 'moderate' | 'high' | 'extreme';

export interface Element {
    symbol: string;
    name: string;
    atomicNumber: number;
    atomicMass: number;
    valence: number;          // valence electrons
    reactivity: number;       // 1–5 scale
    category: ElementCategory;
    color: string;            // display color for tile
    description: string;
}

export type ElementCategory =
    | 'alkali'
    | 'alkaline'
    | 'transition'
    | 'nonmetal'
    | 'noble'
    | 'halogen'
    | 'metalloid'
    | 'metal';

export interface CompoundResult {
    formula: string;
    commonName: string;
    physicalState: PhysicalState;
    color: string;             // hex or css color for renderer
    dangerLevel: DangerLevel;
    stability: string;         // e.g. "stable", "unstable", "highly reactive"
    uses: string;              // real-world notes
    reactionDescription: string;
    fromCache: boolean;
}

export interface ReactionSlot {
    element: Element;
    quantity: number;
}

export interface ChemistryLevel {
    id: string;
    name: string;
    description: string;
    targetFormula?: string;    // optional goal compound
    allowedElements: string[]; // element symbols
    maxSlots: number;          // how many distinct elements can be combined
    sandboxMode: boolean;
}

// ── Reactive state ────────────────────────────────────────────────────────────

export const gameState = $state({
    currentLevelIndex: 0,
    selectedSlots: [] as ReactionSlot[],   // elements staged for reaction
    lastResult: null as CompoundResult | null,
    inspecting: null as Element | null,    // element card being inspected
    reacting: false,                       // loading state during API call
    error: '',
    goalReached: false,
});

// ── Element library ───────────────────────────────────────────────────────────

export const ELEMENTS: Element[] = [
    {
        symbol: 'H',  name: 'Hydrogen',  atomicNumber: 1,  atomicMass: 1.008,
        valence: 1, reactivity: 4, category: 'nonmetal',
        color: '#4fc3f7',
        description: 'The lightest and most abundant element in the universe.',
    },
    {
        symbol: 'He', name: 'Helium',    atomicNumber: 2,  atomicMass: 4.003,
        valence: 0, reactivity: 1, category: 'noble',
        color: '#b2ebf2',
        description: 'Noble gas. Nearly unreactive. Used in balloons and cooling.',
    },
    {
        symbol: 'Li', name: 'Lithium',   atomicNumber: 3,  atomicMass: 6.941,
        valence: 1, reactivity: 5, category: 'alkali',
        color: '#ef9a9a',
        description: 'Soft alkali metal. Highly reactive with water.',
    },
    {
        symbol: 'C',  name: 'Carbon',    atomicNumber: 6,  atomicMass: 12.011,
        valence: 4, reactivity: 2, category: 'nonmetal',
        color: '#616161',
        description: 'Basis of all organic chemistry. Forms diamond and graphite.',
    },
    {
        symbol: 'N',  name: 'Nitrogen',  atomicNumber: 7,  atomicMass: 14.007,
        valence: 3, reactivity: 2, category: 'nonmetal',
        color: '#90caf9',
        description: 'Makes up 78% of Earth\'s atmosphere. Essential for life.',
    },
    {
        symbol: 'O',  name: 'Oxygen',    atomicNumber: 8,  atomicMass: 15.999,
        valence: 2, reactivity: 3, category: 'nonmetal',
        color: '#ef5350',
        description: 'Essential for respiration and combustion.',
    },
    {
        symbol: 'Na', name: 'Sodium',    atomicNumber: 11, atomicMass: 22.990,
        valence: 1, reactivity: 5, category: 'alkali',
        color: '#ffcc80',
        description: 'Highly reactive metal. Explodes on contact with water.',
    },
    {
        symbol: 'Mg', name: 'Magnesium', atomicNumber: 12, atomicMass: 24.305,
        valence: 2, reactivity: 3, category: 'alkaline',
        color: '#a5d6a7',
        description: 'Burns with a brilliant white flame.',
    },
    {
        symbol: 'Cl', name: 'Chlorine',  atomicNumber: 17, atomicMass: 35.453,
        valence: 7, reactivity: 4, category: 'halogen',
        color: '#dce775',
        description: 'Toxic yellow-green gas. Used in disinfection.',
    },
    {
        symbol: 'K',  name: 'Potassium', atomicNumber: 19, atomicMass: 39.098,
        valence: 1, reactivity: 5, category: 'alkali',
        color: '#ce93d8',
        description: 'Essential for nerve function. Reacts violently with water.',
    },
    {
        symbol: 'Ca', name: 'Calcium',   atomicNumber: 20, atomicMass: 40.078,
        valence: 2, reactivity: 3, category: 'alkaline',
        color: '#fff9c4',
        description: 'Key component of bones and limestone.',
    },
    {
        symbol: 'Fe', name: 'Iron',      atomicNumber: 26, atomicMass: 55.845,
        valence: 2, reactivity: 2, category: 'transition',
        color: '#bcaaa4',
        description: 'Most common transition metal. Rusts in moist air.',
    },
    {
        symbol: 'Cu', name: 'Copper',    atomicNumber: 29, atomicMass: 63.546,
        valence: 2, reactivity: 2, category: 'transition',
        color: '#ff8a65',
        description: 'Excellent electrical conductor. Turns green when oxidized.',
    },
    {
        symbol: 'Zn', name: 'Zinc',      atomicNumber: 30, atomicMass: 65.38,
        valence: 2, reactivity: 2, category: 'transition',
        color: '#80cbc4',
        description: 'Used in galvanizing steel and in batteries.',
    },
    {
        symbol: 'Br', name: 'Bromine',   atomicNumber: 35, atomicMass: 79.904,
        valence: 7, reactivity: 4, category: 'halogen',
        color: '#a1887f',
        description: 'One of only two liquid elements at room temperature.',
    },
    {
        symbol: 'Ag', name: 'Silver',    atomicNumber: 47, atomicMass: 107.868,
        valence: 1, reactivity: 1, category: 'transition',
        color: '#e0e0e0',
        description: 'Best electrical conductor of all elements.',
    },
    {
        symbol: 'Au', name: 'Gold',      atomicNumber: 79, atomicMass: 196.967,
        valence: 1, reactivity: 1, category: 'transition',
        color: '#ffd54f',
        description: 'Noble metal. Highly unreactive. Used in electronics.',
    },
    {
        symbol: 'Hg', name: 'Mercury',   atomicNumber: 80, atomicMass: 200.592,
        valence: 2, reactivity: 2, category: 'transition',
        color: '#b0bec5',
        description: 'Only metal liquid at room temperature. Highly toxic.',
    },
];

const ELEMENT_MAP = new Map(ELEMENTS.map(e => [e.symbol, e]));
export function getElementById(symbol: string): Element | undefined {
    return ELEMENT_MAP.get(symbol);
}

// ── Levels ────────────────────────────────────────────────────────────────────

export const levels: ChemistryLevel[] = [
    {
        id: 'level_1',
        name: 'Water & Salt',
        description: 'Combine elements to form common compounds. Try H + O, or Na + Cl.',
        targetFormula: 'H₂O',
        allowedElements: ['H', 'O', 'Na', 'Cl', 'Ca', 'C'],
        maxSlots: 2,
        sandboxMode: false,
    },
    {
        id: 'level_2',
        name: 'Metals & Reactions',
        description: 'Explore what happens when reactive metals meet other elements.',
        targetFormula: 'Fe₂O₃',
        allowedElements: ['Fe', 'Cu', 'Zn', 'Mg', 'O', 'Cl', 'N'],
        maxSlots: 3,
        sandboxMode: false,
    },
    {
        id: 'level_3',
        name: 'Sandbox',
        description: 'Use any element freely. Experiment without limits.',
        allowedElements: ELEMENTS.map(e => e.symbol),
        maxSlots: 4,
        sandboxMode: true,
    },
];

// ── Public API ────────────────────────────────────────────────────────────────

let _onGoal: (() => void) | undefined;

export function startGame(_container: HTMLElement, opts?: { onGoal?: () => void }) {
    _onGoal = opts?.onGoal;
    loadLevel(gameState.currentLevelIndex);
    updateAIContext();
}

function loadLevel(index: number) {
    const level = levels[index];
    if (!level) return;
    gameState.selectedSlots = [];
    gameState.lastResult = null;
    gameState.inspecting = null;
    gameState.reacting = false;
    gameState.error = '';
    gameState.goalReached = false;
}

export function resetGame() {
    loadLevel(gameState.currentLevelIndex);
}

export function levelUp() {
    const next = (gameState.currentLevelIndex + 1) % levels.length;
    gameState.currentLevelIndex = next;
    loadLevel(next);
}

export function inspectElement(element: Element | null) {
    gameState.inspecting = element;
}

export function addToReaction(symbol: string) {
    const element = getElementById(symbol);
    if (!element) return;

    const level = levels[gameState.currentLevelIndex];
    const existing = gameState.selectedSlots.find(s => s.element.symbol === symbol);

    if (existing) {
        existing.quantity += 1;
    } else {
        if (gameState.selectedSlots.length >= level.maxSlots) return;
        gameState.selectedSlots.push({ element, quantity: 1 });
    }
}

export function removeFromReaction(symbol: string) {
    const idx = gameState.selectedSlots.findIndex(s => s.element.symbol === symbol);
    if (idx === -1) return;
    const slot = gameState.selectedSlots[idx];
    if (slot.quantity > 1) {
        slot.quantity -= 1;
    } else {
        gameState.selectedSlots.splice(idx, 1);
    }
}

export function clearReaction() {
    gameState.selectedSlots = [];
    gameState.lastResult = null;
    gameState.error = '';
}

export async function triggerReaction() {
    if (gameState.selectedSlots.length < 2) {
        gameState.error = 'Add at least 2 elements to attempt a reaction.';
        return;
    }

    gameState.reacting = true;
    gameState.error = '';
    gameState.lastResult = null;

    try {
        const result = await fetchReaction(gameState.selectedSlots);
        gameState.lastResult = result;

        const level = levels[gameState.currentLevelIndex];
        if (
            level.targetFormula &&
            result.formula.replace(/[₀-₉]/g, s => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(s)))
                === level.targetFormula.replace(/[₀-₉]/g, s => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(s)))
        ) {
            gameState.goalReached = true;
            _onGoal?.();
        }
    } catch (e: unknown) {
        gameState.error = e instanceof Error ? e.message : 'Reaction failed.';
    } finally {
        gameState.reacting = false;
    }
}

// ── Hardcoded reactions ───────────────────────────────────────────────────────

// Keys encode both symbol and quantity: `SYMBOL:QTY` parts sorted alphabetically.
// e.g. 2×H + 1×O → 'H:2-O:1'   |   1×H + 1×O → 'H:1-O:1' (goes to AI)
const KNOWN_REACTIONS: Record<string, CompoundResult> = {
    'H:2-O:1': {
        formula: 'H₂O', commonName: 'Water', physicalState: 'liquid',
        color: '#64b5f6', dangerLevel: 'safe', stability: 'stable',
        uses: 'Universal solvent. Essential for all known life.',
        reactionDescription: 'Two hydrogen atoms bond with one oxygen via covalent bonds.',
        fromCache: true,
    },
    'Cl:1-Na:1': {
        formula: 'NaCl', commonName: 'Table Salt', physicalState: 'solid',
        color: '#f5f5f5', dangerLevel: 'safe', stability: 'stable',
        uses: 'Food seasoning, food preservation, industrial chemical.',
        reactionDescription: 'Sodium donates its valence electron to chlorine, forming an ionic bond.',
        fromCache: true,
    },
    'Cl:1-H:1': {
        formula: 'HCl', commonName: 'Hydrochloric Acid', physicalState: 'gas',
        color: '#e8f5e9', dangerLevel: 'high', stability: 'stable',
        uses: 'Industrial acid production, stomach acid component, metal cleaning.',
        reactionDescription: 'Hydrogen and chlorine form a polar covalent bond. Dissolves in water to form a strong acid.',
        fromCache: true,
    },
    'Fe:2-O:3': {
        formula: 'Fe₂O₃', commonName: 'Iron Oxide (Rust)', physicalState: 'solid',
        color: '#bf360c', dangerLevel: 'safe', stability: 'stable',
        uses: 'Pigment, thermite reactions, magnetic recording.',
        reactionDescription: 'Iron slowly oxidizes in the presence of oxygen and moisture.',
        fromCache: true,
    },
    'C:1-O:2': {
        formula: 'CO₂', commonName: 'Carbon Dioxide', physicalState: 'gas',
        color: '#e0f2f1', dangerLevel: 'low', stability: 'stable',
        uses: 'Photosynthesis, carbonated drinks, fire suppression.',
        reactionDescription: 'Carbon combustion with sufficient oxygen produces CO₂.',
        fromCache: true,
    },
    'H:3-N:1': {
        formula: 'NH₃', commonName: 'Ammonia', physicalState: 'gas',
        color: '#f3e5f5', dangerLevel: 'moderate', stability: 'stable',
        uses: 'Fertilizer production, cleaning agents, refrigerant.',
        reactionDescription: 'Nitrogen and hydrogen combine under pressure via the Haber process.',
        fromCache: true,
    },
    'Na:2-O:1': {
        formula: 'Na₂O', commonName: 'Sodium Oxide', physicalState: 'solid',
        color: '#fff3e0', dangerLevel: 'moderate', stability: 'unstable',
        uses: 'Reacts vigorously with water to form sodium hydroxide (NaOH).',
        reactionDescription: 'Sodium reduces oxygen, forming a basic oxide that reacts violently with water.',
        fromCache: true,
    },
    'H:1-Na:1-O:1': {
        formula: 'NaOH', commonName: 'Sodium Hydroxide (Lye)', physicalState: 'solid',
        color: '#e8eaf6', dangerLevel: 'high', stability: 'stable',
        uses: 'Soap making, drain cleaner, paper production.',
        reactionDescription: 'Sodium oxide reacts with water to produce this strongly caustic base.',
        fromCache: true,
    },
    'Mg:1-O:1': {
        formula: 'MgO', commonName: 'Magnesium Oxide', physicalState: 'solid',
        color: '#fafafa', dangerLevel: 'low', stability: 'stable',
        uses: 'Refractory material, antacid, electrical insulator.',
        reactionDescription: 'Magnesium burns brilliantly in oxygen, producing a blinding white flame.',
        fromCache: true,
    },
    'Ca:1-O:1': {
        formula: 'CaO', commonName: 'Quicklime', physicalState: 'solid',
        color: '#f9fbe7', dangerLevel: 'moderate', stability: 'stable',
        uses: 'Cement production, water treatment, steel making.',
        reactionDescription: 'Calcium reacts exothermically with oxygen to form calcium oxide.',
        fromCache: true,
    },
    'Cu:1-O:1': {
        formula: 'CuO', commonName: 'Copper Oxide', physicalState: 'solid',
        color: '#1a237e', dangerLevel: 'low', stability: 'stable',
        uses: 'Pigment, catalysis, semiconductors.',
        reactionDescription: 'Copper oxidizes when heated, forming a black copper oxide layer.',
        fromCache: true,
    },
    'Br:1-Na:1': {
        formula: 'NaBr', commonName: 'Sodium Bromide', physicalState: 'solid',
        color: '#fce4ec', dangerLevel: 'low', stability: 'stable',
        uses: 'Sedative (historical), photography, flame retardants.',
        reactionDescription: 'Sodium and bromine undergo an ionic reaction similar to table salt formation.',
        fromCache: true,
    },
    'Au:1-Cl:3': {
        formula: 'AuCl₃', commonName: 'Gold(III) Chloride', physicalState: 'solid',
        color: '#ff6f00', dangerLevel: 'moderate', stability: 'unstable',
        uses: 'Gilding, photography toning, catalysis.',
        reactionDescription: 'Even noble gold can be dissolved by chlorine under the right conditions.',
        fromCache: true,
    },
};

// ── API layer ─────────────────────────────────────────────────────────────────

async function fetchReaction(slots: ReactionSlot[]): Promise<CompoundResult> {
    // Check hardcoded results first — key encodes symbol AND quantity
    const key = slots.map(s => `${s.element.symbol}:${s.quantity}`).sort().join('-');
    if (KNOWN_REACTIONS[key]) return KNOWN_REACTIONS[key];

    const url = uiState.aiMode === 'local'
        ? 'http://localhost:8080/ai_hint'
        : 'https://www.brodieberger.com/ai_hint';

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game_type: 'chemistry_generation',
            user_prompt: '',
            context: {
                elements: slots.map(s => ({ symbol: s.element.symbol, quantity: s.quantity })),
            },
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Server error ${res.status}`);
    }
    const data = await res.json();
    return { ...data.reply, fromCache: false };
}


import { uiState } from '$lib/game-ui.svelte';

function updateAIContext() {
    uiState.gameType = "chemistry";
}

export function buildChemistryContext() {
    const level = levels[gameState.currentLevelIndex];
    return {
        level: level.name,
        goal: level.targetFormula ?? 'sandbox',
        sandboxMode: level.sandboxMode,
        availableElements: level.allowedElements.map(sym => {
            const el = ELEMENT_MAP.get(sym);
            return el ? { symbol: el.symbol, name: el.name, category: el.category, reactivity: el.reactivity } : { symbol: sym };
        }),
        selectedElements: gameState.selectedSlots.map(s => ({
            symbol: s.element.symbol,
            quantity: s.quantity,
        })),
        lastResult: gameState.lastResult
            ? { formula: gameState.lastResult.formula, name: gameState.lastResult.commonName }
            : null,
        goalReached: gameState.goalReached,
    };
}