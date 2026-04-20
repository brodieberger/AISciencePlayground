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
        description: 'Light both bulbs. Branch the circuit to power multiple lights.',
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

// ── Adjacency helpers ─────────────────────────────────────────────────────────

const DIRS: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]];

function inBounds(grid: Cell[][], r: number, c: number): boolean {
    return r >= 0 && r < grid.length && c >= 0 && c < (grid[0]?.length ?? 0);
}

// A cell conducts if it is non-empty AND (not a switch OR switch is closed)
function conducts(cell: Cell): boolean {
    if (cell.type === 'empty') return false;
    if (cell.type === 'switch') return cell.switchClosed;
    return true;
}

// ── BFS Circuit Solver ────────────────────────────────────────────────────────
//
// Two adjacent non-empty cells that both conduct are automatically connected —
// no manual direction/connection setting needed. This fixes all wiring issues.
//
// A valid circuit = a closed loop that starts AND ends at the same battery cell,
// passing through at least one load (light/resistor) unless sandboxMode is on.
// Only cells on a confirmed closed loop are energised — never on open paths.

function solveCircuit(): void {
    const grid     = gameState.grid;
    const sandbox  = gameState.sandboxMode;
    const rows     = grid.length;
    const cols     = grid[0]?.length ?? 0;

    // Reset all powered state
    for (const row of grid)
        for (const cell of row) { cell.energized = false; cell.lit = false; }

    let solved       = false;
    let shortCircuit = false;
    let hint         = '';

    // Find batteries
    const batteries: [number,number][] = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (grid[r][c].type === 'battery') batteries.push([r,c]);

    if (batteries.length === 0) {
        _commit(false, false, 'Place a Battery to power the circuit.');
        return;
    }

    outerBat:
    for (const [br, bc] of batteries) {

        // BFS from every conducting neighbour of the battery.
        // We look for a path that returns to the battery → closed loop.
        type Node = { r: number; c: number; path: [number,number][]; hasLoad: boolean };

        const visited = new Set<string>([`${br},${bc}`]);
        const queue: Node[] = [];

        for (const [dr, dc] of DIRS) {
            const nr = br+dr, nc = bc+dc;
            if (!inBounds(grid, nr, nc)) continue;
            if (!conducts(grid[nr][nc]))  continue;
            const k = `${nr},${nc}`;
            if (visited.has(k))           continue;
            visited.add(k);
            const isLoad = grid[nr][nc].type === 'light' || grid[nr][nc].type === 'resistor';
            queue.push({ r: nr, c: nc, path: [[nr,nc]], hasLoad: isLoad });
        }

        while (queue.length > 0) {
            const { r, c, path, hasLoad } = queue.shift()!;

            for (const [dr, dc] of DIRS) {
                const nr = r+dr, nc = c+dc;

                // Loop back to battery → closed loop found!
                if (nr === br && nc === bc) {
                    if (!hasLoad && !sandbox) {
                        shortCircuit = true;
                        hint = 'Short circuit! Add a Bulb or Resistor to the loop.';
                        break outerBat;
                    }
                    // Energise everything on this path
                    solved = true;
                    grid[br][bc].energized = true;
                    for (const [pr, pc] of path) {
                        grid[pr][pc].energized = true;
                        if (grid[pr][pc].type === 'light') grid[pr][pc].lit = true;
                    }
                    break outerBat;
                }

                if (!inBounds(grid, nr, nc))         continue;
                const nk = `${nr},${nc}`;
                if (visited.has(nk))                  continue;
                if (!conducts(grid[nr][nc]))           continue;

                visited.add(nk);
                const isLoad = grid[nr][nc].type === 'light' || grid[nr][nc].type === 'resistor';
                queue.push({ r: nr, c: nc, path: [...path, [nr,nc]], hasLoad: hasLoad || isLoad });
            }
        }
    }

    // Build hint
    if (!solved && !shortCircuit) {
        const hasSwitch = gameState.grid.flat().some(c => c.type === 'switch');
        const hasOpenSwitch = gameState.grid.flat().some(c => c.type === 'switch' && !c.switchClosed);
        if (hasSwitch && hasOpenSwitch) {
            hint = 'A switch is open — click it to close the circuit.';
        } else {
            hint = 'Circuit is open. Connect components into a closed loop.';
        }
    }
    if (solved) {
        const al = grid.flat().filter(c => c.type === 'light' && c.lit).length;
        const tl = grid.flat().filter(c => c.type === 'light').length;
        hint = tl > 0 ? `✓ Circuit complete! All bulbs are lit.` : '✓ Circuit complete!';
    }

    _commit(solved, shortCircuit, hint);
}

function _commit(solved: boolean, sc: boolean, hint: string): void {
    const flat = gameState.grid.flat();
    gameState.solved       = solved;
    gameState.shortCircuit = sc;
    gameState.hint         = hint;
    gameState.activeLights = flat.filter(c => c.type === 'light' && c.lit).length;
    gameState.totalLights  = flat.filter(c => c.type === 'light').length;

    // Win condition: all lights on
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
export function startGame(_el: HTMLElement, opts?: { onGoal?: () => void }): void {
    uiState.gameType = 'circuitry';
    resetLevel();
}
export function resetGame(): void  { resetLevel(); }
export function levelUp():   void  { nextLevel();  }

// ── AI ────────────────────────────────────────────────────────────────────────

export async function askAI(userMessage: string): Promise<string> {
    try {
        const res = await fetch('http://www.brodieberger.com/ai_hint', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ game_type: 'circuitry', user_message: userMessage }),
        });
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
