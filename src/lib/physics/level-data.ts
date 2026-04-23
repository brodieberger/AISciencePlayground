export type PrefabType = 'bridge' | 'bouncepad' | 'bumper' | 'seesaw';

export interface PrefabConfig {
    type: PrefabType;
    count: number;
}

export interface GeometryRect {
    type: 'rect';
    x: number;
    y: number;
    w: number;
    h: number;
    angle?: number; // radians
    color?: string;
}

export interface GeometryCircle {
    type: 'circle';
    x: number;
    y: number;
    r: number;
    color?: string;
}

export type Geometry = GeometryRect | GeometryCircle;

export interface LevelConfig {
    ball: {
        x: number;
        y: number;
    };
    goal?: {
        x: number;
        y: number;
    };
    prefabs: PrefabConfig[];
    geometry?: Geometry[];
    solution?: string;
}

export const levels: LevelConfig[] = [
    // Level 1 — Three Steps Down
    // Three descending shelves split the canvas. The player must bridge two gaps
    // to carry the ball across, then launch it upward to the elevated goal.
    {
        ball: { x: 80, y: 80 },
        goal: { x: 700, y: 430 },
        prefabs: [
            { type: 'bridge', count: 3 },
        ],
        geometry: [
            { type: 'rect', x: 155, y: 250, w: 170, h: 14 },
            { type: 'rect', x: 400, y: 350, w: 150, h: 14 },
            { type: 'rect', x: 590, y: 440, w: 160, h: 14 },
        ],
        solution: 'The ball lands on the upper-left shelf. Place the first bridge to connect the upper shelf to the middle shelf across the gap. Place the second bridge from the middle shelf to the lower-right shelf. Finally, put the bounce pad on the lower shelf directly below the goal to launch the ball upward.',
    },

    // Level 2 — Two Walls
    // Two vertical dividers cut the arena into three zones. The player must use
    // angled bridges to deflect the ball sideways around each wall and bumpers to
    // fine-tune direction so the ball reaches the platform near the goal.
    {
        ball: { x: 150, y: 80 },
        goal: { x: 555, y: 441 },
        prefabs: [
            { type: 'bridge', count: 3 },
            { type: 'bouncepad', count: 2 },
        ],
        geometry: [
            { type: 'rect', x: 295, y: 230, w: 14, h: 260 },
            { type: 'rect', x: 465, y: 340, w: 14, h: 220 },
            { type: 'rect', x: 557, y: 459, w: 200, h: 14 },
            { type: 'rect', x: 650, y: 290, w: 14, h: 350 },
        ],
        solution: 'Two walls block the straight path to the goal. Place a bridge to the left of the first wall and rotate it to an angle to deflect the falling ball sideways past the wall. Use bounce pads near the second wall to redirect the ball. Place the second bridge angled to guide the ball down onto the platform where the goal sits.',
    },

    // Level 3 — The Channel
    // A central dividing wall creates left and right corridors. Mixed inventory
    // forces the player to combine platform-building with launch mechanics.
    {
        ball: { x: 120, y: 80 },
        goal: { x: 560, y: 440 },
        prefabs: [
            { type: 'bridge', count: 2 },
            { type: 'bouncepad', count: 1 },
            { type: 'bumper', count: 1 },
        ],
        geometry: [
            { type: 'rect', x: 155, y: 280, w: 200, h: 14 },
            { type: 'rect', x: 400, y: 180, w: 14, h: 220 },
            { type: 'rect', x: 490, y: 370, w: 200, h: 14 },
        ],
        solution: 'The ball lands on the left shelf. Rotate a bridge to an angle on the shelf to deflect the ball toward the gap near the central wall. Place the second bridge flat to span the gap so the ball crosses to the right side. Use the bounce pad on the right shelf to launch the ball up toward the goal, and place the bumper to redirect it if needed.',
    },

    // Level 4 — Fulcrum
    // A pre-placed seesaw sits in the arena. The player drops the main ball onto
    // one cup, tipping the beam and launching the seesaw's own ball toward the goal.
    {
        ball: { x: 300, y: 80 },
        goal: { x: 690, y: 440 },
        prefabs: [
            { type: 'seesaw', count: 1 },
        ],
        geometry: [
            { type: 'rect', x: 540, y: 200, w: 14, h: 300 },
            { type: 'rect', x: 540, y: 600, w: 14, h: 300 },
            { type: 'rect', x: 639, y: 457, w: 180, h: 14 },
            { type: 'rect', x: 290, y: 600, w: 480, h: 14 },
        ],
        solution: 'Place the seesaw in the open area so its right cup is under the ball\'s drop path. When you release the ball it falls onto the right cup, tipping the beam and launching the yellow ball out of the left cup. The launched ball will arc over the shelf and land on the goal.',
    },
];