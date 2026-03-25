// $lib/circuitry/game.svelte.ts

export type ComponentType =
    | 'empty'
    | 'wire'
    | 'battery'
    | 'switch'
    | 'light'
    | 'resistor'
    | 'and'
    | 'or'
    | 'not';

export interface PlacedComponent {
    type: Exclude<ComponentType, 'empty'>;
    rotation: number;   // 0 = horizontal (E↔W), 1 = vertical (N↔S)
    closed:   boolean;  // switches: true = closed = conducts
    powered:  boolean;  // set by solver
    lit:      boolean;  // lights only
}

// ── Reactive state ────────────────────────────────────────────────────────────
export const gameState = $state({
    components:   {} as Record<string, PlacedComponent>, // "r,c"
    wires:        {} as Record<string, true>,             // wireKey
    poweredEdges: {} as Record<string, true>,             // wireKey
    solved:        false,
    shortCircuit:  false,
    hint:          'Place a battery, connect wires, and add a bulb.',
    activeLights:  0,
    totalLights:   0,
    sandboxMode:   true,
    // UI state
    currentTool: 'wire' as ComponentType | 'delete',
    rotation:    0,
    wireStart:   null as { r: number; c: number } | null,
    mouseCell:   null as { r: number; c: number } | null,
});

// ── Wire key (normalised so r1≤r2, then c1≤c2) ───────────────────────────────
export function wireKey(r1: number, c1: number, r2: number, c2: number): string {
    if (r1 > r2 || (r1 === r2 && c1 > c2)) return `${r2},${c2},${r1},${c1}`;
    return `${r1},${c1},${r2},${c2}`;
}

// ── Directions ────────────────────────────────────────────────────────────────
type Dir = 'N' | 'S' | 'E' | 'W';
const DELTA: Record<Dir, [number, number]> = {
    N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1],
};
const OPP: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const ALL_DIRS: Dir[] = ['N', 'S', 'E', 'W'];

// Component terminals based on rotation
// rotation 0 → E & W (horizontal)
// rotation 1 → N & S (vertical)
function terminals(rotation: number): [Dir, Dir] {
    return rotation % 2 === 0 ? ['E', 'W'] : ['N', 'S'];
}

// ── BFS Circuit Solver ────────────────────────────────────────────────────────
//
// RULES:
//  1. Power only comes from a battery.
//  2. Current travels along wire edges OR through components whose terminals
//     face the direction of travel.
//  3. A switch blocks current when open (closed === false).
//  4. A valid circuit = closed loop from battery (+) back to battery (−).
//  5. Without a load (light/resistor) in the loop → short-circuit (unless sandbox).
//  6. Nothing glows unless a valid loop is found.
//
export function solveCircuit(): void {
    const { components, wires, sandboxMode } = gameState;

    // Reset powered state on all components
    for (const c of Object.values(components)) {
        c.powered = false;
        c.lit     = false;
    }

    const poweredEdges: Record<string, true> = {};
    let solved       = false;
    let shortCircuit = false;
    let hint         = '';

    const batteries = Object.entries(components).filter(([, c]) => c.type === 'battery');

    if (batteries.length === 0) {
        _apply(poweredEdges, false, false, 'Place a battery to power the circuit.');
        return;
    }

    outer:
    for (const [batKey, bat] of batteries) {
        const [br, bc] = batKey.split(',').map(Number);
        const [posDir, negDir] = terminals(bat.rotation); // + terminal, − terminal

        // Positive terminal leads to this neighbour cell
        const [pdr, pdc] = DELTA[posDir];
        const posR = br + pdr, posC = bc + pdc;

        // ── BFS ──────────────────────────────────────────────────────────────
        type Node = { r: number; c: number; path: string[]; edges: string[]; hasLoad: boolean };

        const visited = new Set<string>([batKey]);
        const queue: Node[] = [];

        // Seed: try to leave battery via positive terminal
        _tryEnqueue(posR, posC, br, bc, posDir, [], [], false, visited, queue, components, wires, hint);

        while (queue.length > 0) {
            const node = queue.shift()!;
            const { r, c, path, edges, hasLoad } = node;
            const cellComp = components[`${r},${c}`];

            for (const dir of ALL_DIRS) {
                const [dr, dc] = DELTA[dir];
                const nr = r + dr, nc = c + dc;
                const nKey = `${nr},${nc}`;
                const ek = wireKey(r, c, nr, nc);

                // Can we EXIT current cell in direction `dir`?
                if (!_canExit(r, c, dir, components, wires)) continue;

                // Is this cell the battery's negative terminal neighbour?
                const [ndr2, ndc2] = DELTA[negDir];
                const negR = br + ndr2, negC = bc + ndc2;
                if (nr === negR && nc === negC) {
                    // Must be able to enter the battery from this side
                    if (dir !== negDir) continue;

                    if (!hasLoad && !sandboxMode) {
                        shortCircuit = true;
                        hint = 'Short circuit! Add a bulb or resistor to the loop.';
                        break outer;
                    }

                    // ✓ LOOP CLOSED — energise path
                    solved = true;
                    for (const ck of path) {
                        const cc = components[ck];
                        if (cc) { cc.powered = true; if (cc.type === 'light') cc.lit = true; }
                    }
                    for (const e of edges) poweredEdges[e as keyof typeof poweredEdges] = true;
                    poweredEdges[ek as keyof typeof poweredEdges] = true;
                    bat.powered = true;
                    break outer;
                }

                if (nKey === batKey || visited.has(nKey)) continue;

                // Can we ENTER neighbour cell from direction `dir`?
                const nComp = components[nKey];
                let canEnter = !!wires[ek]; // wire carries us in
                if (!canEnter && nComp && nComp.type !== 'battery') {
                    // entering nComp from dir — it needs a terminal facing OPP[dir]
                    const [t0, t1] = terminals(nComp.rotation);
                    canEnter = t0 === OPP[dir] || t1 === OPP[dir];
                    if (canEnter && nComp.type === 'switch' && !nComp.closed) {
                        hint = hint || 'A switch is open — click it to close the circuit.';
                        canEnter = false;
                    }
                }
                if (!canEnter) continue;

                visited.add(nKey);
                const isLoad = nComp && (nComp.type === 'light' || nComp.type === 'resistor');
                queue.push({
                    r: nr, c: nc,
                    path:  [...path, nKey],
                    edges: [...edges, ek],
                    hasLoad: hasLoad || !!isLoad,
                });
            }
        }
    }

    if (!solved && !shortCircuit && !hint) {
        hint = 'Circuit is open — connect all components into a closed loop.';
    }
    if (solved) {
        const al = Object.values(components).filter(c => c.type === 'light' && c.lit).length;
        const tl = Object.values(components).filter(c => c.type === 'light').length;
        hint = tl > 0 ? `Circuit complete! All bulbs are powered.` : 'Circuit complete!';
    }

    _apply(poweredEdges, solved, shortCircuit, hint);
}

// Can we exit cell (r,c) in direction dir?
function _canExit(
    r: number, c: number, dir: Dir,
    components: Record<string, PlacedComponent>,
    wires: Record<string, true>,
): boolean {
    const [dr, dc] = DELTA[dir];
    const ek = wireKey(r, c, r + dr, c + dc);
    if (wires[ek]) {
        // If there's a component here it must have a terminal in dir
        const comp = components[`${r},${c}`];
        if (!comp || comp.type === 'battery') return true;
        const [t0, t1] = terminals(comp.rotation);
        return t0 === dir || t1 === dir;
    }
    // No wire — can we exit through the component itself?
    const comp = components[`${r},${c}`];
    if (!comp || comp.type === 'battery') return false;
    const [t0, t1] = terminals(comp.rotation);
    return t0 === dir || t1 === dir;
}

function _tryEnqueue(
    r: number, c: number,
    fromR: number, fromC: number,
    exitDir: Dir,
    path: string[], edges: string[], hasLoad: boolean,
    visited: Set<string>,
    queue: { r: number; c: number; path: string[]; edges: string[]; hasLoad: boolean }[],
    components: Record<string, PlacedComponent>,
    wires: Record<string, true>,
    hint: string,
) {
    if (r < 0 || c < 0) return;
    const key = `${r},${c}`;
    if (visited.has(key)) return;

    const ek = wireKey(fromR, fromC, r, c);
    const hasWire = !!wires[ek];
    const comp    = components[key];

    let canEnter = hasWire;
    if (!canEnter && comp && comp.type !== 'battery') {
        const [t0, t1] = terminals(comp.rotation);
        canEnter = t0 === OPP[exitDir] || t1 === OPP[exitDir];
        if (canEnter && comp.type === 'switch' && !comp.closed) canEnter = false;
    }
    if (!canEnter) return;

    visited.add(key);
    const isLoad = comp && (comp.type === 'light' || comp.type === 'resistor');
    queue.push({ r, c, path: [...path, key], edges: [...edges, ek], hasLoad: hasLoad || !!isLoad });
}

function _apply(pe: Record<string, true>, solved: boolean, sc: boolean, hint: string) {
    gameState.poweredEdges = pe;
    gameState.solved       = solved;
    gameState.shortCircuit = sc;
    gameState.hint         = hint;
    gameState.activeLights = Object.values(gameState.components).filter(c => c.type === 'light' && c.lit).length;
    gameState.totalLights  = Object.values(gameState.components).filter(c => c.type === 'light').length;
}

// ── Public actions ────────────────────────────────────────────────────────────

export function selectTool(tool: ComponentType | 'delete') {
    gameState.currentTool = tool;
    gameState.wireStart   = null;
}

export function rotateTool() {
    gameState.rotation = (gameState.rotation + 1) % 2;
}

export function placeComponent(r: number, c: number, type: Exclude<ComponentType, 'empty'>) {
    gameState.components[`${r},${c}`] = {
        type,
        rotation: gameState.rotation,
        closed:   type === 'switch' ? false : true,
        powered:  false,
        lit:      false,
    };
    solveCircuit();
}

export function removeCell(r: number, c: number) {
    const key = `${r},${c}`;
    delete gameState.components[key];
    // Remove all wire edges touching this cell
    for (const wk of Object.keys(gameState.wires)) {
        const [r1, c1, r2, c2] = wk.split(',').map(Number);
        if ((r1 === r && c1 === c) || (r2 === r && c2 === c)) delete gameState.wires[wk];
    }
    solveCircuit();
}

export function addWireLine(r1: number, c1: number, r2: number, c2: number) {
    if (r1 === r2) {
        const [lo, hi] = [Math.min(c1, c2), Math.max(c1, c2)];
        for (let c = lo; c < hi; c++) gameState.wires[wireKey(r1, c, r1, c + 1)] = true;
    } else if (c1 === c2) {
        const [lo, hi] = [Math.min(r1, r2), Math.max(r1, r2)];
        for (let r = lo; r < hi; r++) gameState.wires[wireKey(r, c1, r + 1, c1)] = true;
    } else {
        // L-shape: horizontal first, then vertical
        const [loC, hiC] = [Math.min(c1, c2), Math.max(c1, c2)];
        for (let c = loC; c < hiC; c++) gameState.wires[wireKey(r1, c, r1, c + 1)] = true;
        const [loR, hiR] = [Math.min(r1, r2), Math.max(r1, r2)];
        for (let r = loR; r < hiR; r++) gameState.wires[wireKey(r, c2, r + 1, c2)] = true;
    }
    solveCircuit();
}

export function removeWiresAtCell(r: number, c: number) {
    for (const wk of Object.keys(gameState.wires)) {
        const [r1, c1, r2, c2] = wk.split(',').map(Number);
        if ((r1 === r && c1 === c) || (r2 === r && c2 === c)) delete gameState.wires[wk];
    }
    gameState.wireStart = null;
    solveCircuit();
}

export function toggleSwitch(r: number, c: number) {
    const comp = gameState.components[`${r},${c}`];
    if (comp?.type !== 'switch') return;
    comp.closed = !comp.closed;
    solveCircuit();
}

export function clearAll() {
    gameState.components   = {};
    gameState.wires        = {};
    gameState.poweredEdges = {};
    gameState.solved       = false;
    gameState.shortCircuit = false;
    gameState.hint         = 'Board cleared. Place components and connect them.';
    gameState.activeLights = 0;
    gameState.totalLights  = 0;
    gameState.wireStart    = null;
}

// ── AI (re-exported so AIPanel can import from here for circuitry) ─────────────
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
