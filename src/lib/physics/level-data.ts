export type PrefabType = 'bridge' | 'bouncepad' | 'ramp' | 'bumper' | 'seesaw';

export interface PrefabConfig {
    type: PrefabType;
    count: number;
}

export interface LevelConfig {
    ball: {
        x: number;
        y: number;
    };
    goal: {
        x: number;
        y: number;
    };
    prefabs: PrefabConfig[];
}

export const levels: LevelConfig[] = [
    // Level 1
    {
        ball: { x: 100, y: 100 },
        goal: { x: 500, y: 500 },
        prefabs: [
            { type: 'bridge', count: 2 },
            { type: 'bouncepad', count: 1 },
        ]
    },

    // Level 2
    {
        ball: { x: 150, y: 200 },
        goal: { x: 600, y: 450 },
        prefabs: [
            { type: 'ramp', count: 2 },
            { type: 'bumper', count: 2 },
        ]
    },

    // Level 3
    {
        ball: { x: 250, y: 200 },
        goal: { x: 400, y: 450 },
        prefabs: [
            { type: 'bridge', count: 1 },
            { type: 'ramp', count: 1 },
            { type: 'bouncepad', count: 1 },
            { type: 'bumper', count: 1 },
        ]
    },

    // Level 4 — Fulcrum
    // A seesaw sits pre-placed in the level. The caged ball is on one side.
    // The player must release the cage so the ball drops onto the heavy side,
    // tipping the seesaw and launching the ball on the other cup toward the goal.
    {
        ball: { x: 300, y: 80 },
        goal: { x: 520, y: 420 },
        prefabs: [
            { type: 'seesaw', count: 1 },
        ]
    }
];