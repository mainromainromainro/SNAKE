const DEFAULT_COLS = 20;
const DEFAULT_ROWS = 20;
const DEFAULT_LENGTH = 3;
const DEFAULT_DIRECTION = "right";
const DEFAULT_SEED = 123456789;
const DEFAULT_TICK_DELAY = 120;
const DEFAULT_MIN_TICK_DELAY = 55;
const DEFAULT_TICK_STEP = 6;
const DEFAULT_POWER_DURATION_MS = 5000;
const DEFAULT_BOOST_MULTIPLIER = 0.68;
const DEFAULT_SLOW_MULTIPLIER = 1.55;
const DEFAULT_MIN_BOOST_DELAY = 35;
const DEFAULT_GROWTH_BUFFER_GAIN = 4;

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

const POWER_EFFECTS = [
  { kind: "boost", label: "Turbo Boost", polarity: "positive" },
  { kind: "ghost", label: "Ghost Walls", polarity: "positive" },
  { kind: "slow", label: "Slow Motion", polarity: "positive" },
  { kind: "reverse", label: "Reverse Controls", polarity: "negative" },
  { kind: "growth", label: "Growth Spurt", polarity: "negative" }
];

const POWER_EFFECTS_BY_KIND = Object.fromEntries(
  POWER_EFFECTS.map((effect) => [effect.kind, effect])
);

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

function wrapPosition(position, cols, rows) {
  return {
    x: (position.x + cols) % cols,
    y: (position.y + rows) % rows
  };
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

function normalizeElapsedMs(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_TICK_DELAY;
  }

  return Math.max(1, Math.trunc(value));
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

function createPowerItemPosition(occupied, cols, rows, rngState = DEFAULT_SEED) {
  const { food, rngState: nextRngState } = createFoodPosition(
    occupied,
    cols,
    rows,
    rngState
  );

  return {
    powerItem: food,
    rngState: nextRngState
  };
}

function createActiveEffect(kind) {
  const effect = POWER_EFFECTS_BY_KIND[kind];

  if (!effect) {
    throw new RangeError(`Unsupported effect kind: ${kind}`);
  }

  return {
    kind: effect.kind,
    label: effect.label,
    polarity: effect.polarity,
    remainingMs: DEFAULT_POWER_DURATION_MS
  };
}

function pickPowerEffect(rngState) {
  const nextRngState = nextSeed(rngState);
  const effect = POWER_EFFECTS[nextRngState % POWER_EFFECTS.length];

  return {
    effect,
    rngState: nextRngState
  };
}

function countdownActiveEffect(activeEffect, elapsedMs) {
  if (!activeEffect) {
    return { activeEffect: null, expiredEffect: null };
  }

  const remainingMs = activeEffect.remainingMs - elapsedMs;

  if (remainingMs <= 0) {
    return {
      activeEffect: null,
      expiredEffect: activeEffect
    };
  }

  return {
    activeEffect: {
      ...activeEffect,
      remainingMs
    },
    expiredEffect: null
  };
}

export function getTickDelay(score, options = {}, activeEffect = null) {
  const baseDelay = options.baseDelay ?? DEFAULT_TICK_DELAY;
  const minDelay = options.minDelay ?? DEFAULT_MIN_TICK_DELAY;
  const stepDelay = options.stepDelay ?? DEFAULT_TICK_STEP;
  const boostMultiplier = options.boostMultiplier ?? DEFAULT_BOOST_MULTIPLIER;
  const slowMultiplier = options.slowMultiplier ?? DEFAULT_SLOW_MULTIPLIER;
  const minBoostDelay = options.minBoostDelay ?? DEFAULT_MIN_BOOST_DELAY;
  const normalizedScore = Math.max(0, Math.trunc(score));

  assertPositiveInteger(baseDelay, "baseDelay");
  assertPositiveInteger(minDelay, "minDelay");

  if (!Number.isInteger(stepDelay) || stepDelay < 0) {
    throw new RangeError("stepDelay must be a non-negative integer.");
  }

  if (!Number.isFinite(boostMultiplier) || boostMultiplier <= 0) {
    throw new RangeError("boostMultiplier must be a positive number.");
  }

  if (!Number.isFinite(slowMultiplier) || slowMultiplier <= 0) {
    throw new RangeError("slowMultiplier must be a positive number.");
  }

  assertPositiveInteger(minBoostDelay, "minBoostDelay");

  const delay = Math.max(minDelay, baseDelay - normalizedScore * stepDelay);

  if (activeEffect?.kind === "boost") {
    return Math.max(minBoostDelay, Math.round(delay * boostMultiplier));
  }

  if (activeEffect?.kind === "slow") {
    return Math.round(delay * slowMultiplier);
  }

  return delay;
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
  const { powerItem, rngState: nextRngState } = food
    ? createPowerItemPosition([...snake, food], cols, rows, rngState)
    : { powerItem: null, rngState };

  return {
    cols,
    rows,
    snake,
    direction,
    pendingDirection: direction,
    food,
    powerItem,
    score: 0,
    status: food === null ? "won" : "running",
    rngState: nextRngState,
    activeEffect: null,
    growthBuffer: 0,
    lastEvent: null
  };
}

export function queueDirection(state, direction) {
  if (state.status !== "running" || !(direction in DIRECTION_VECTORS)) {
    return state;
  }

  const appliedDirection =
    state.activeEffect?.kind === "reverse" ? OPPOSITES[direction] : direction;

  if (state.pendingDirection !== state.direction) {
    return state;
  }

  if (
    appliedDirection === state.direction ||
    OPPOSITES[appliedDirection] === state.direction
  ) {
    return state;
  }

  return {
    ...state,
    pendingDirection: appliedDirection
  };
}

export function stepGame(state, options = {}) {
  if (state.status !== "running") {
    return state;
  }

  const elapsedMs = normalizeElapsedMs(options.elapsedMs ?? DEFAULT_TICK_DELAY);
  const currentEffect = state.activeEffect ?? null;
  const direction = state.pendingDirection ?? state.direction;
  const vector = DIRECTION_VECTORS[direction];
  let nextHead = {
    x: state.snake[0].x + vector.x,
    y: state.snake[0].y + vector.y
  };

  if (currentEffect?.kind === "ghost") {
    nextHead = wrapPosition(nextHead, state.cols, state.rows);
  } else if (isOutOfBounds(nextHead, state.cols, state.rows)) {
    return {
      ...state,
      direction,
      pendingDirection: direction,
      lastEvent: null,
      status: "gameover"
    };
  }

  const ateFood = state.food !== null && positionsEqual(nextHead, state.food);
  const atePowerItem =
    state.powerItem !== null && positionsEqual(nextHead, state.powerItem);
  const growthBuffer = state.growthBuffer ?? 0;
  const extendsTail = ateFood || growthBuffer > 0;
  const blockingSegments = extendsTail ? state.snake : state.snake.slice(0, -1);

  if (blockingSegments.some((segment) => positionsEqual(segment, nextHead))) {
    return {
      ...state,
      direction,
      pendingDirection: direction,
      lastEvent: null,
      status: "gameover"
    };
  }

  const snake = extendsTail
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];
  let nextGrowthBuffer =
    growthBuffer > 0 && !ateFood ? growthBuffer - 1 : growthBuffer;
  let score = state.score;
  let food = state.food ?? null;
  let powerItem = state.powerItem ?? null;
  let rngState = state.rngState;
  let activeEffect = currentEffect;
  let lastEvent = null;

  if (!atePowerItem) {
    const effectCountdown = countdownActiveEffect(currentEffect, elapsedMs);
    activeEffect = effectCountdown.activeEffect;

    if (effectCountdown.expiredEffect) {
      lastEvent = {
        type: "power-ended",
        effect: effectCountdown.expiredEffect
      };
    }
  }

  if (ateFood) {
    score += 1;

    const nextFoodPlacement = createFoodPosition(
      powerItem ? [...snake, powerItem] : snake,
      state.cols,
      state.rows,
      rngState
    );

    food = nextFoodPlacement.food;
    rngState = nextFoodPlacement.rngState;
  }

  if (atePowerItem) {
    const powerResult = pickPowerEffect(rngState);
    activeEffect = createActiveEffect(powerResult.effect.kind);
    rngState = powerResult.rngState;

    if (activeEffect.kind === "growth") {
      nextGrowthBuffer += DEFAULT_GROWTH_BUFFER_GAIN;
    }

    lastEvent = {
      type: "power-activated",
      effect: activeEffect
    };
  }

  if (food === null) {
    powerItem = null;
  } else if (atePowerItem || powerItem === null) {
    const nextPowerPlacement = createPowerItemPosition(
      food ? [...snake, food] : snake,
      state.cols,
      state.rows,
      rngState
    );

    powerItem = nextPowerPlacement.powerItem;
    rngState = nextPowerPlacement.rngState;
  }

  return {
    ...state,
    snake,
    direction,
    pendingDirection: direction,
    food,
    powerItem,
    score,
    status: food === null ? "won" : "running",
    rngState,
    activeEffect,
    growthBuffer: nextGrowthBuffer,
    lastEvent
  };
}
