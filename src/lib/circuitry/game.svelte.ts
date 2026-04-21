// $lib/circuitry/game.svelte.ts
import { uiState } from '$lib/game-ui.svelte';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComponentType =
    | 'empty'
    | 'wire'
    | 'battery'
    | 'switch'
    | 'light'
    | 'resistor';

export interface Cell {
    type:         ComponentType;
    switchClosed: boolean;   // switch only: true = closed = conducts
    energized:    boolean;   // set by solver
    lit:          boolean;   // light only: set by solver
}

export interface CircuitLevel {
    id:          string;
    name:        string;
    description: string;
    rows:        number;
    cols:        number;
    available:   ComponentType[];
}

// ── Levels ────────────────────────────────────────────────────────────────────

export const levels: CircuitLevel[] = [
    {
        id:          'level_1',
        name:        'Light the Bulb',
        description: 'Place a Battery and a Bulb, then connect them with Wires to complete the loop.',
        rows: 6, cols: 9,
        available: ['battery', 'wire', 'light', 'empty'],
    },
    {
        id:          'level_2',
        name:        'Switch Control',
        description: 'Add a Switch to the path. Click the switch to toggle the bulb on and off.',
        rows: 6, cols: 9,
        available: ['battery', 'wire', 'switch', 'light', 'empty'],
    },
    {
        id:          'level_3',
        name:        'Two Bulbs',
        description: 'Light both bulbs. You can wire them in series or build parallel branches.',
        rows: 8, cols: 9,
        available: ['battery', 'wire', 'switch', 'light', 'resistor', 'empty'],
    },
];

// ── Grid factory ──────────────────────────────────────────────────────────────

function emptyGrid(rows: number, cols: number): Cell[][] {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, (): Cell => ({
            type: 'empty', switchClosed: false, energized: false, lit: false,
        }))
    );
}

// ── Reactive state ────────────────────────────────────────────────────────────

export const gameState = $state({
    levelIndex:   0,
    grid:         emptyGrid(levels[0].rows, levels[0].cols),
    solved:       false,
    shortCircuit: false,
    hint:         levels[0].description,
    activeLights: 0,
    totalLights:  0,
    sandboxMode:  false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIRS: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]];

function inBounds(grid: Cell[][], r: number, c: number): boolean {
    return r >= 0 && r < grid.length && c >= 0 && c < (grid[0]?.length ?? 0);
}

// A cell conducts if it is non-empty AND (not a switch OR switch is closed)
function conducts(cell: Cell): boolean {
    if (cell.type === 'empty')  return false;
    if (cell.type === 'switch') return cell.switchClosed;
    return true;
}

function openCircuitHint(grid: Cell[][]): string {
    return grid.flat().some(c => c.type === 'switch' && !c.switchClosed)
        ? 'A switch is open — click it to close the circuit.'
        : 'Circuit is open. Connect components into a closed loop.';
}

// ── Circuit Solver ────────────────────────────────────────────────────────────
//
// Phase 1 — 2-core decomposition (dead-end elimination):
//   Iteratively remove any conducting cell whose degree in the conducting graph
//   is less than 2.  What remains is the "2-core": every surviving cell lies on
//   at least one simple cycle.  Wires on open arms never carry real current.
//
// Phase 2 — BFS within the 2-core from each battery:
//   All cells reachable from a battery through cycle cells are energised.
//   If any load (light / resistor) is reachable the circuit is valid;
//   if not it is a short.  Multiple batteries are each processed independently
//   so parallel and series topologies all work correctly.

function solveCircuit(): void {
    const grid    = gameState.grid;
    const sandbox = gameState.sandboxMode;
    const rows    = grid.length;
    const cols    = grid[0]?.length ?? 0;

    // Reset powered state
    for (const row of grid)
        for (const cell of row) { cell.energized = false; cell.lit = false; }

    // ── Phase 1: compute degree in the conducting graph ───────────────────────
    const deg     = Array.from({length: rows}, () => new Array<number>(cols).fill(0));
    const removed = Array.from({length: rows}, () => new Array<boolean>(cols).fill(false));

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            if (!conducts(grid[r][c])) continue;
            for (const [dr, dc] of DIRS) {
                const nr = r+dr, nc = c+dc;
                if (inBounds(grid, nr, nc) && conducts(grid[nr][nc])) deg[r][c]++;
            }
        }

    // Iteratively strip dead ends; survivors all lie on cycles
    const deadQ: [number, number][] = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (conducts(grid[r][c]) && deg[r][c] < 2) deadQ.push([r, c]);

    let dHead = 0;
    while (dHead < deadQ.length) {
        const [r, c] = deadQ[dHead++];
        if (removed[r][c] || !conducts(grid[r][c]) || deg[r][c] >= 2) continue;
        removed[r][c] = true;
        for (const [dr, dc] of DIRS) {
            const nr = r+dr, nc = c+dc;
            if (!inBounds(grid, nr, nc) || removed[nr][nc] || !conducts(grid[nr][nc])) continue;
            if (--deg[nr][nc] < 2) deadQ.push([nr, nc]);
        }
    }

    // ── Phase 2: classify batteries, early-out if none in a cycle ────────────
    let hasBattery  = false;
    let cycleHasBat = false;

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (grid[r][c].type === 'battery') {
                hasBattery = true;
                if (!removed[r][c]) cycleHasBat = true;
            }

    if (!hasBattery) {
        _commit(false, false, 'Place a Battery to power the circuit.');
        return;
    }
    if (!cycleHasBat) {
        _commit(false, false, openCircuitHint(grid));
        return;
    }

    // ── Phase 2: BFS per battery through cycle cells ──────────────────────────
    let anySolved = false;
    let anyShort  = false;
    // Track batteries already covered by a previous BFS to avoid duplicate work
    const coveredBats = new Set<string>();

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            if (grid[r][c].type !== 'battery' || removed[r][c]) continue;
            const startKey = `${r},${c}`;
            if (coveredBats.has(startKey)) continue;

            const visited   = new Set<string>([startKey]);
            const q: [number, number][] = [[r, c]];
            const component: [number, number][] = [[r, c]];
            let hasLoad = false;
            let qi = 0;

            while (qi < q.length) {
                const [cr, cc] = q[qi++];
                for (const [dr, dc] of DIRS) {
                    const nr = cr+dr, nc = cc+dc;
                    if (!inBounds(grid, nr, nc) || removed[nr][nc]) continue;
                    if (!conducts(grid[nr][nc])) continue;
                    const k = `${nr},${nc}`;
                    if (visited.has(k)) continue;
                    visited.add(k);
                    component.push([nr, nc]);
                    const t = grid[nr][nc].type;
                    if (t === 'light' || t === 'resistor') hasLoad = true;
                    // Mark co-located batteries so we don't double-process same component
                    if (t === 'battery') coveredBats.add(k);
                    q.push([nr, nc]);
                }
            }
            coveredBats.add(startKey);

            if (!hasLoad && !sandbox) {
                anyShort = true;
            } else {
                anySolved = true;
                for (const [er, ec] of component) {
                    grid[er][ec].energized = true;
                    if (grid[er][ec].type === 'light') grid[er][ec].lit = true;
                }
            }
        }

    // ── Build hint ────────────────────────────────────────────────────────────
    let hint: string;
    if (anyShort && !anySolved) {
        hint = 'Short circuit! Add a Bulb or Resistor to the loop.';
    } else if (anySolved) {
        const al = grid.flat().filter(c => c.type === 'light' && c.lit).length;
        const tl = grid.flat().filter(c => c.type === 'light').length;
        hint = tl > 0 ? `✓ Circuit complete! ${al}/${tl} bulbs lit.` : '✓ Circuit complete!';
    } else {
        hint = openCircuitHint(grid);
    }

    _commit(anySolved, anyShort && !anySolved, hint);
}

function _commit(solved: boolean, sc: boolean, hint: string): void {
    const flat = gameState.grid.flat();
    gameState.solved       = solved;
    gameState.shortCircuit = sc;
    gameState.hint         = hint;
    gameState.activeLights = flat.filter(c => c.type === 'light' && c.lit).length;
    gameState.totalLights  = flat.filter(c => c.type === 'light').length;

    if (solved && !sc && gameState.activeLights > 0 &&
        gameState.activeLights === gameState.totalLights) {
        uiState.goalReached = true;
    }
}

// ── Public actions ────────────────────────────────────────────────────────────

export function placeCell(r: number, c: number, type: ComponentType): void {
    const cell = gameState.grid[r]?.[c];
    if (!cell) return;
    cell.type         = type;
    cell.switchClosed = false;
    cell.energized    = false;
    cell.lit          = false;
    solveCircuit();
}

export function eraseCell(r: number, c: number): void {
    placeCell(r, c, 'empty');
}

export function toggleSwitch(r: number, c: number): void {
    const cell = gameState.grid[r]?.[c];
    if (!cell || cell.type !== 'switch') return;
    cell.switchClosed = !cell.switchClosed;
    solveCircuit();
}

export function resetLevel(): void {
    const lvl = levels[gameState.levelIndex];
    gameState.grid         = emptyGrid(lvl.rows, lvl.cols);
    gameState.solved       = false;
    gameState.shortCircuit = false;
    gameState.hint         = lvl.description;
    gameState.activeLights = 0;
    gameState.totalLights  = 0;
    uiState.goalReached    = false;
    uiState.aiResponse     = '';
}

export function nextLevel(): void {
    gameState.levelIndex = (gameState.levelIndex + 1) % levels.length;
    resetLevel();
}

export function toggleSandbox(): void {
    gameState.sandboxMode = !gameState.sandboxMode;
    solveCircuit();
}

// Legacy shims so existing imports don't break
export function startGame(_el: HTMLElement, _opts?: { onGoal?: () => void }): void {
    uiState.gameType = 'circuitry';
    resetLevel();
}
export function resetGame(): void { resetLevel(); }
export function levelUp():   void { nextLevel();  }

// ── AI ────────────────────────────────────────────────────────────────────────

export async function askAI(userMessage: string): Promise<string> {
    try {
        const res = await fetch('https://www.brodieberger.com/ai_hint', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ game_type: 'circuitry', user_message: userMessage }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        return data.reply || 'No reply received.';
    } catch {
        return 'AI request failed.';
    }
}

export function buildCircuitryContext() {
    return {
        goal:         gameState.solved ? 'Complete!' : gameState.hint,
        solved:       gameState.solved,
        shortCircuit: gameState.shortCircuit,
        activeLights: gameState.activeLights,
        totalLights:  gameState.totalLights,
    };
}
