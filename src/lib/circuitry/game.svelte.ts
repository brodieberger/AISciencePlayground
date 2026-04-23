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
    shortPath:    boolean;   // part of the highlighted short-circuit path
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
        rows: 4, cols: 6,
        available: ['battery', 'wire', 'light', 'empty'],
    },
    {
        id:          'level_2',
        name:        'Switch Control',
        description: 'Add a Switch to the path. Click the switch to toggle the bulb on and off.',
        rows: 4, cols: 6,
        available: ['battery', 'wire', 'switch', 'light', 'empty'],
    },
    {
        id:          'level_3',
        name:        'Two Bulbs',
        description: 'Light both bulbs. You can wire them in series or build parallel branches.',
        rows: 4, cols: 6,
        available: ['battery', 'wire', 'switch', 'light', 'resistor', 'empty'],
    },
];

// ── Grid factory ──────────────────────────────────────────────────────────────

function emptyGrid(rows: number, cols: number): Cell[][] {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, (): Cell => ({
            type: 'empty', switchClosed: false,
            energized: false, lit: false, shortPath: false,
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

function conducts(cell: Cell): boolean {
    if (cell.type === 'empty')  return false;
    if (cell.type === 'switch') return cell.switchClosed;
    return true;
}

// Treats lights/resistors as open so we can find load-free cycles (shorts).
function conductsNoLoad(cell: Cell): boolean {
    if (cell.type === 'light' || cell.type === 'resistor') return false;
    return conducts(cell);
}

function openCircuitHint(grid: Cell[][]): string {
    return grid.flat().some(c => c.type === 'switch' && !c.switchClosed)
        ? 'A switch is open — click it to close the circuit.'
        : 'Circuit is open. Connect components into a closed loop.';
}

// ── 2-core decomposition ──────────────────────────────────────────────────────
// Iteratively removes cells whose degree in the given conductance graph is < 2.
// Survivors all lie on at least one simple cycle (the "2-core").

function twoCore(
    grid: Cell[][], rows: number, cols: number,
    conductFn: (cell: Cell) => boolean,
): boolean[][] {
    const deg     = Array.from({length: rows}, () => new Array<number>(cols).fill(0));
    const removed = Array.from({length: rows}, () => new Array<boolean>(cols).fill(false));

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            if (!conductFn(grid[r][c])) continue;
            for (const [dr, dc] of DIRS) {
                const nr = r+dr, nc = c+dc;
                if (inBounds(grid, nr, nc) && conductFn(grid[nr][nc])) deg[r][c]++;
            }
        }

    const q: [number, number][] = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (conductFn(grid[r][c]) && deg[r][c] < 2) q.push([r, c]);

    let head = 0;
    while (head < q.length) {
        const [r, c] = q[head++];
        if (removed[r][c] || !conductFn(grid[r][c]) || deg[r][c] >= 2) continue;
        removed[r][c] = true;
        for (const [dr, dc] of DIRS) {
            const nr = r+dr, nc = c+dc;
            if (!inBounds(grid, nr, nc) || removed[nr][nc] || !conductFn(grid[nr][nc])) continue;
            if (--deg[nr][nc] < 2) q.push([nr, nc]);
        }
    }
    return removed;
}

// ── Short-circuit path finder ─────────────────────────────────────────────────
//
// Finds the shortest load-free cycle through the given battery in the
// load-free 2-core (shortRemoved already computed).
//
// Strategy: BFS from the battery, tagging each reachable cell with which
// "exit" of the battery its subtree originated from.  The moment two cells
// from DIFFERENT exits become adjacent, we have found two vertex-disjoint
// paths from the battery that join up — i.e. a cycle through the battery.
// We reconstruct both paths using parent pointers and return all cells.

function findBatteryCycle(
    grid: Cell[][],
    shortRemoved: boolean[][], br: number, bc: number,
): [number, number][] {
    const mk = (r: number, c: number) => `${r},${c}`;
    const batKey = mk(br, bc);

    type Info = { tag: number; dist: number; pr: number; pc: number };
    const info = new Map<string, Info>();
    info.set(batKey, { tag: -1, dist: 0, pr: -1, pc: -1 });

    const q: [number, number][] = [];
    let tagCount = 0;

    for (const [dr, dc] of DIRS) {
        const nr = br+dr, nc = bc+dc;
        if (!inBounds(grid, nr, nc) || shortRemoved[nr][nc]) continue;
        if (!conductsNoLoad(grid[nr][nc])) continue;
        const k = mk(nr, nc);
        if (!info.has(k)) {
            info.set(k, { tag: tagCount++, dist: 1, pr: br, pc: bc });
            q.push([nr, nc]);
        }
    }

    let foundU: [number, number] | null = null;
    let foundV: [number, number] | null = null;

    let qHead = 0;
    outer:
    while (qHead < q.length) {
        const [r, c] = q[qHead++];
        const curInfo = info.get(mk(r, c))!;

        for (const [dr, dc] of DIRS) {
            const nr = r+dr, nc = c+dc;

            // Back-edge directly to battery (non-trivial cycle)
            if (nr === br && nc === bc) {
                if (curInfo.dist >= 2) {
                    foundU = [r, c];
                    foundV = [br, bc];
                    break outer;
                }
                continue;
            }

            if (!inBounds(grid, nr, nc) || shortRemoved[nr][nc]) continue;
            if (!conductsNoLoad(grid[nr][nc])) continue;
            const nk = mk(nr, nc);

            if (info.has(nk)) {
                const nInfo = info.get(nk)!;
                // Cross-edge connecting two different exit subtrees — cycle found
                if (nInfo.tag !== curInfo.tag && nInfo.tag !== -1) {
                    foundU = [r, c];
                    foundV = [nr, nc];
                    break outer;
                }
            } else {
                info.set(nk, { tag: curInfo.tag, dist: curInfo.dist + 1, pr: r, pc: c });
                q.push([nr, nc]);
            }
        }
    }

    if (!foundU) return [];

    // Reconstruct by tracing each endpoint back to the battery via parents
    const result: [number, number][] = [];
    const seen = new Set<string>();

    function tracePath(r: number, c: number): void {
        const k = mk(r, c);
        if (seen.has(k)) return;
        seen.add(k);
        result.push([r, c]);
        const inf = info.get(k);
        if (inf && inf.pr >= 0) tracePath(inf.pr, inf.pc);
    }

    tracePath(foundU[0], foundU[1]);
    tracePath(foundV![0], foundV![1]);

    return result;
}

// ── Circuit Solver ────────────────────────────────────────────────────────────
//
// Phase 1 — Short-circuit detection:
//   Run 2-core treating loads as open (conductsNoLoad).  If any battery
//   survives, there is a load-free cycle → short circuit.  Find and highlight
//   the shortest such cycle through the battery so the player can see it.
//
// Phase 2 — Valid-circuit detection:
//   Run 2-core with full conductance.  BFS from each cycle battery energises
//   its connected component.  Multiple batteries handled independently.

function solveCircuit(): void {
    const grid    = gameState.grid;
    const sandbox = gameState.sandboxMode;
    const rows    = grid.length;
    const cols    = grid[0]?.length ?? 0;

    for (const row of grid)
        for (const cell of row) {
            cell.energized = false;
            cell.lit       = false;
            cell.shortPath = false;
        }

    let hasBattery = false;
    for (const row of grid)
        for (const cell of row)
            if (cell.type === 'battery') { hasBattery = true; break; }

    if (!hasBattery) {
        _commit(false, false, 'Place a Battery to power the circuit.');
        return;
    }

    // ── Phase 1: short-circuit check ─────────────────────────────────────────
    if (!sandbox) {
        const shortRemoved = twoCore(grid, rows, cols, conductsNoLoad);
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                if (grid[r][c].type === 'battery' && !shortRemoved[r][c]) {
                    const path = findBatteryCycle(grid, shortRemoved, r, c);
                    for (const [pr, pc] of path) grid[pr][pc].shortPath = true;
                    _commit(false, true,
                        'Short circuit! Every path from the battery needs a Bulb or Resistor.');
                    return;
                }
    }

    // ── Phase 2: valid-circuit check ─────────────────────────────────────────
    const fullRemoved = twoCore(grid, rows, cols, conducts);

    let cycleHasBat = false;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (grid[r][c].type === 'battery' && !fullRemoved[r][c])
                cycleHasBat = true;

    if (!cycleHasBat) {
        _commit(false, false, openCircuitHint(grid));
        return;
    }

    const coveredBats = new Set<string>();
    let anySolved = false;

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            if (grid[r][c].type !== 'battery' || fullRemoved[r][c]) continue;
            const startKey = `${r},${c}`;
            if (coveredBats.has(startKey)) continue;

            const visited   = new Set<string>([startKey]);
            const q: [number, number][] = [[r, c]];
            const component: [number, number][] = [[r, c]];
            let qi = 0;

            while (qi < q.length) {
                const [cr, cc] = q[qi++];
                for (const [dr, dc] of DIRS) {
                    const nr = cr+dr, nc = cc+dc;
                    if (!inBounds(grid, nr, nc) || fullRemoved[nr][nc]) continue;
                    if (!conducts(grid[nr][nc])) continue;
                    const k = `${nr},${nc}`;
                    if (visited.has(k)) continue;
                    visited.add(k);
                    component.push([nr, nc]);
                    if (grid[nr][nc].type === 'battery') coveredBats.add(k);
                    q.push([nr, nc]);
                }
            }
            coveredBats.add(startKey);

            anySolved = true;
            for (const [er, ec] of component) {
                grid[er][ec].energized = true;
                if (grid[er][ec].type === 'light') grid[er][ec].lit = true;
            }
        }

    let hint: string;
    if (anySolved) {
        const al = grid.flat().filter(c => c.type === 'light' && c.lit).length;
        const tl = grid.flat().filter(c => c.type === 'light').length;
        hint = tl > 0 ? `✓ Circuit complete! ${al}/${tl} bulbs lit.` : '✓ Circuit complete!';
    } else {
        hint = openCircuitHint(grid);
    }

    _commit(anySolved, false, hint);
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
    cell.shortPath    = false;
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
    uiState.aiPrompt       = '';
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
    gameState.levelIndex = 0;
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
