export interface LevelConfig {
  ball: {
    x: number;
    y: number;
  };
  goal: {
    x: number;
    y: number;
  };
}

export const levels: LevelConfig[] = [
  // Level 1
  {
    ball: { x: 100, y: 100 },
    goal: { x: 500, y: 500 },
  },

  // Level 2
  {
    ball: { x: 150, y: 200 },
    goal: { x: 600, y: 450 },
  },
    // Level 3
  {
    ball: { x: 250, y: 200 },
    goal: { x: 400, y: 450 },
  }
];