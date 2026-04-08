// $lib/circuitry/game.svelte.ts

import { uiState } from '$lib/game-ui.svelte';

export type ComponentType =
    | 'empty'
    | 'wire'
    | 'battery'
    | 'switch'
    | 'light'
    | 'resistor';

export type Direction = 'north' | 'east' | 'south' | 'west';

export interface CellComponent {
    type: ComponentType;
    connections: Direction[];
    state: Record<string, unknown>;
    energized: boolean;
    lit?: boolean;
    fixed?: boolean;
}

export interface GridCell {
    row: number;
    col: number;
    component: CellComponent;
}

export interface CircuitLevel {
    id: string;
    name: string;
    description: string;
    goal: string;
    gridRows: number;
    gridCols: number;
    fixedCells: { row: number; col: number; component: CellComponent }[];
    availableComponents: ComponentType[];
}

// ── Reactive game state (mirrors gameState in $lib/physics/game.svelte) ───────

export const gameState = $state({
    currentLevelIndex: 0,
    grid: [] as GridCell[][],
    solved: false,
    shortCircuit: false,
    openLoop: true,
    hint: '',
    activeLights: 0,
    totalLights: 0,
    sandboxMode: false,
});

// ── Levels ────────────────────────────────────────────────────────────────────

export const levels: CircuitLevel[] = [
    {
        id: 'level_1',
        name: 'Light the Bulb',
        description: 'Select Wire from inventory, then click cells to connect the battery to the bulb.',
        goal: 'light_bulbs',
        gridRows: 5,
        gridCols: 7,
        fixedCells: [],
        availableComponents: ['battery', 'wire', 'light', 'empty'],
    },
    {
        id: 'level_2',
        name: 'Switch Control',
        description: 'Place a switch in the wire path, then click it to toggle the light.',
        goal: 'light_bulbs',
        gridRows: 5,
        gridCols: 7,
        fixedCells: [],
        availableComponents: ['battery', 'wire', 'switch', 'light', 'empty'],
    },
    {
        id: 'level_3',
        name: 'Two Bulbs',
        description: 'Light both bulbs. You can place multiple lights and branch the circuit.',
        goal: 'light_bulbs',
        gridRows: 7,
        gridCols: 7,
        fixedCells: [],
        availableComponents: ['battery', 'wire', 'switch', 'light', 'resistor', 'empty'],
    },
];

// ── Grid helpers ──────────────────────────────────────────────────────────────

function createEmptyGrid(rows: number, cols: number): GridCell[][] {
    return Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({
            row: r,
            col: c,
            component: { type: 'empty' as ComponentType, connections: [], state: {}, energized: false },
        }))
    );
}

function applyFixedCells(grid: GridCell[][], fixed: CircuitLevel['fixedCells']): GridCell[][] {
    for (const { row, col, component } of fixed) {
        grid[row][col].component = { ...component };
    }
    return grid;
}

const OPPOSITE: Record<Direction, Direction> = {
    north: 'south', south: 'north', east: 'west', west: 'east',
};

const DIR_DELTA: Record<Direction, [number, number]> = {
    north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1],
};

// ── Circuit solver ────────────────────────────────────────────────────────────

function solveCircuit(grid: GridCell[][], sandbox: boolean) {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    for (const row of grid) {
        for (const cell of row) {
            cell.component.energized = false;
            if (cell.component.type === 'light') cell.component.lit = false;
        }
    }

    let solved = false;
    let shortCircuit = false;
    let openLoop = true;
    let hint = '';
    let activeLights = 0;
    let totalLights = 0;

    const batteries = grid.flat().filter(c => c.component.type === 'battery');

    if (batteries.length === 0) {
        return { solved, shortCircuit, openLoop, hint: 'No battery found.', activeLights, totalLights };
    }

    for (const battery of batteries) {
        const posDir = battery.component.connections[0] as Direction | undefined;
        if (!posDir) continue;

        const sr = battery.row + DIR_DELTA[posDir][0];
        const sc = battery.col + DIR_DELTA[posDir][1];
        if (sr < 0 || sr >= rows || sc < 0 || sc >= cols) continue;

        const startCell = grid[sr][sc];
        if (!startCell.component.connections.includes(OPPOSITE[posDir])) continue;

        type Node = { cell: GridCell; path: GridCell[]; hasLoad: boolean };
        const visited = new Set<string>([`${battery.row},${battery.col}`]);
        const queue: Node[] = [{ cell: startCell, path: [battery, startCell], hasLoad: false }];

        outer: while (queue.length > 0) {
            const { cell, path, hasLoad } = queue.shift()!;
            const key = `${cell.row},${cell.col}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (cell.component.type === 'switch' && cell.component.state.open === true) {
                hint = hint || 'A switch is open — click it to close the circuit.';
                continue;
            }

            const isLoad = cell.component.type === 'light' || cell.component.type === 'resistor';
            const newHasLoad = hasLoad || isLoad;

            for (const dir of cell.component.connections as Direction[]) {
                const nr = cell.row + DIR_DELTA[dir][0];
                const nc = cell.col + DIR_DELTA[dir][1];
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                const neighbor = grid[nr][nc];
                if (!neighbor.component.connections.includes(OPPOSITE[dir])) continue;

                if (neighbor.row === battery.row && neighbor.col === battery.col) {
                    if (!newHasLoad && !sandbox) {
                        shortCircuit = true;
                        hint = 'Short circuit! Add a load (light or resistor) between the terminals.';
                        break outer;
                    }
                    for (const c of path) {
                        c.component.energized = true;
                        if (c.component.type === 'light') c.component.lit = true;
                    }
                    openLoop = false;
                    solved = true;
                    break outer;
                }

                if (!visited.has(`${neighbor.row},${neighbor.col}`)) {
                    queue.push({ cell: neighbor, path: [...path, neighbor], hasLoad: newHasLoad });
                }
            }
        }
    }

    for (const row of grid) {
        for (const cell of row) {
            if (cell.component.type === 'light') {
                totalLights++;
                if (cell.component.lit) activeLights++;
            }
        }
    }

    if (openLoop && !shortCircuit && !hint) {
        hint = 'Circuit is open. Connect all components to complete the loop.';
    }
    if (solved && !shortCircuit) {
        hint = activeLights === totalLights
            ? '✓ Circuit complete! All bulbs are lit.'
            : '✓ Circuit complete!';
    }

    return { solved, shortCircuit, openLoop, hint, activeLights, totalLights };
}

// ── Public API (mirrors $lib/physics/game.svelte) ─────────────────────────────

let _onGoal: (() => void) | undefined;

export function startGame(_container: HTMLElement, opts?: { onGoal?: () => void }) {
    _onGoal = opts?.onGoal;
    loadLevel(gameState.currentLevelIndex);
    updateAIContext();
}

function loadLevel(index: number) {
    const level = levels[index];
    if (!level) return;
    const grid = applyFixedCells(createEmptyGrid(level.gridRows, level.gridCols), level.fixedCells);
    gameState.grid = grid;
    gameState.solved = false;
    gameState.shortCircuit = false;
    gameState.openLoop = true;
    gameState.hint = level.description;
    gameState.activeLights = 0;
    gameState.totalLights = grid.flat().filter(c => c.component.type === 'light').length;
}

export function resetGame() {
    loadLevel(gameState.currentLevelIndex);
}

export function levelUp() {
    const next = (gameState.currentLevelIndex + 1) % levels.length;
    gameState.currentLevelIndex = next;
    loadLevel(next);
}

export function toggleSandbox() {
    gameState.sandboxMode = !gameState.sandboxMode;
    resolve();
}

const DEFAULT_CONNECTIONS: Record<ComponentType, Direction[]> = {
    battery:  ['east', 'west'],
    wire:     ['east', 'west'],
    switch:   ['east', 'west'],
    light:    ['east', 'west'],
    resistor: ['east', 'west'],
    empty:    [],
};

export function placeComponent(
    row: number,
    col: number,
    type: ComponentType,
    connections?: Direction[]
) {
    const cell = gameState.grid[row]?.[col];
    if (!cell || cell.component.fixed) return;
    const conns = connections ?? DEFAULT_CONNECTIONS[type] ?? ['east', 'west'];
    cell.component = {
        type,
        connections: conns,
        state: type === 'switch' ? { open: false } : {},
        energized: false,
        ...(type === 'light' ? { lit: false } : {}),
    };
    resolve();
}

export function removeComponent(row: number, col: number) {
    placeComponent(row, col, 'empty', []);
}

export function toggleSwitch(row: number, col: number) {
    const cell = gameState.grid[row]?.[col];
    if (!cell || cell.component.type !== 'switch') return;
    cell.component.state = { ...cell.component.state, open: !cell.component.state.open };
    resolve();
}

function resolve() {
    const result = solveCircuit(gameState.grid, gameState.sandboxMode);
    gameState.solved      = result.solved;
    gameState.shortCircuit = result.shortCircuit;
    gameState.openLoop    = result.openLoop;
    gameState.hint        = result.hint;
    gameState.activeLights = result.activeLights;
    gameState.totalLights  = result.totalLights;

    const level = levels[gameState.currentLevelIndex];
    const goalMet =
        !result.shortCircuit &&
        result.activeLights > 0 &&
        result.activeLights === result.totalLights &&
        level?.goal !== 'sandbox';

    if (goalMet) _onGoal?.();

}

function updateAIContext() {
    uiState.gameType = "circuitry";
}


export function buildCircuitryContext() {
    return {
        goal: "Complete! Continue to next level.",
        grid: [],
        solved: true,
        shortCircuit: false,
        openLoop: false,
        activeLights: 3,
        totalLights: 3,
    };
}