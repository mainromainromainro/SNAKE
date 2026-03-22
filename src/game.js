const DEFAULT_COLS = 20;
const DEFAULT_ROWS = 20;
const DEFAULT_LENGTH = 3;
const DEFAULT_DIRECTION = "right";
const DEFAULT_SEED = 123456789;
const DEFAULT_TICK_DELAY = 120;
const DEFAULT_MIN_TICK_DELAY = 55;
const DEFAULT_TICK_STEP = 6;

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
}

function assertDirection(direction) {
  if (!(direction in DIRECTION_VECTORS)) {
    throw new RangeError(`Unsupported direction: ${direction}`);
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPositionKey(position) {
  return `${position.x},${position.y}`;
}

function positionsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isOutOfBounds(position, cols, rows) {
  return (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= cols ||
    position.y >= rows
  );
}

function nextSeed(seed) {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

function normalizeOccupied(occupied) {
  if (!occupied) {
    return new Set();
  }

  if (occupied instanceof Set) {
    return occupied;
  }

  return new Set(occupied.map(getPositionKey));
}

export function getTickDelay(score, options = {}) {
  const baseDelay = options.baseDelay ?? DEFAULT_TICK_DELAY;
  const minDelay = options.minDelay ?? DEFAULT_MIN_TICK_DELAY;
  const stepDelay = options.stepDelay ?? DEFAULT_TICK_STEP;
  const normalizedScore = Math.max(0, Math.trunc(score));

  assertPositiveInteger(baseDelay, "baseDelay");
  assertPositiveInteger(minDelay, "minDelay");

  if (!Number.isInteger(stepDelay) || stepDelay < 0) {
    throw new RangeError("stepDelay must be a non-negative integer.");
  }

  return Math.max(minDelay, baseDelay - normalizedScore * stepDelay);
}

function buildInitialSnake(cols, rows, initialLength, direction) {
  const vector = DIRECTION_VECTORS[direction];

  const minHeadX = vector.x === 1 ? initialLength - 1 : 0;
  const maxHeadX = vector.x === -1 ? cols - initialLength : cols - 1;
  const minHeadY = vector.y === 1 ? initialLength - 1 : 0;
  const maxHeadY = vector.y === -1 ? rows - initialLength : rows - 1;

  if (minHeadX > maxHeadX || minHeadY > maxHeadY) {
    throw new RangeError("Board is too small for the initial snake.");
  }

  const head = {
    x: clamp(Math.floor(cols / 2), minHeadX, maxHeadX),
    y: clamp(Math.floor(rows / 2), minHeadY, maxHeadY)
  };

  return Array.from({ length: initialLength }, (_, index) => ({
    x: head.x - vector.x * index,
    y: head.y - vector.y * index
  }));
}

export function createFoodPosition(occupied, cols, rows, rngState = DEFAULT_SEED) {
  assertPositiveInteger(cols, "cols");
  assertPositiveInteger(rows, "rows");

  const occupiedKeys = normalizeOccupied(occupied);
  const emptyCells = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell = { x, y };

      if (!occupiedKeys.has(getPositionKey(cell))) {
        emptyCells.push(cell);
      }
    }
  }

  if (emptyCells.length === 0) {
    return { food: null, rngState: rngState >>> 0 };
  }

  const nextRngState = nextSeed(rngState);
  const index = nextRngState % emptyCells.length;

  return {
    food: emptyCells[index],
    rngState: nextRngState
  };
}

export function createInitialState(options = {}) {
  const cols = options.cols ?? DEFAULT_COLS;
  const rows = options.rows ?? DEFAULT_ROWS;
  const initialLength = options.initialLength ?? DEFAULT_LENGTH;
  const direction = options.direction ?? DEFAULT_DIRECTION;
  const seed = options.seed ?? DEFAULT_SEED;

  assertPositiveInteger(cols, "cols");
  assertPositiveInteger(rows, "rows");
  assertPositiveInteger(initialLength, "initialLength");
  assertDirection(direction);

  const snake = buildInitialSnake(cols, rows, initialLength, direction);
  const { food, rngState } = createFoodPosition(snake, cols, rows, seed);

  return {
    cols,
    rows,
    snake,
    direction,
    pendingDirection: direction,
    food,
    score: 0,
    status: food === null ? "won" : "running",
    rngState
  };
}

export function queueDirection(state, direction) {
  if (state.status !== "running" || !(direction in DIRECTION_VECTORS)) {
    return state;
  }

  if (state.pendingDirection !== state.direction) {
    return state;
  }

  if (
    direction === state.direction ||
    OPPOSITES[direction] === state.direction
  ) {
    return state;
  }

  return {
    ...state,
    pendingDirection: direction
  };
}

export function stepGame(state) {
  if (state.status !== "running") {
    return state;
  }

  const direction = state.pendingDirection ?? state.direction;
  const vector = DIRECTION_VECTORS[direction];
  const nextHead = {
    x: state.snake[0].x + vector.x,
    y: state.snake[0].y + vector.y
  };

  if (isOutOfBounds(nextHead, state.cols, state.rows)) {
    return {
      ...state,
      direction,
      pendingDirection: direction,
      status: "gameover"
    };
  }

  const ateFood = state.food !== null && positionsEqual(nextHead, state.food);
  const blockingSegments = ateFood ? state.snake : state.snake.slice(0, -1);

  if (blockingSegments.some((segment) => positionsEqual(segment, nextHead))) {
    return {
      ...state,
      direction,
      pendingDirection: direction,
      status: "gameover"
    };
  }

  const snake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  if (!ateFood) {
    return {
      ...state,
      snake,
      direction,
      pendingDirection: direction
    };
  }

  const { food, rngState } = createFoodPosition(
    snake,
    state.cols,
    state.rows,
    state.rngState
  );

  return {
    ...state,
    snake,
    direction,
    pendingDirection: direction,
    food,
    score: state.score + 1,
    status: food === null ? "won" : "running",
    rngState
  };
}
