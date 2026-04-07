import assert from "node:assert/strict";
import test from "node:test";

import {
  createFoodPosition,
  createInitialState,
  getTickDelay,
  queueDirection,
  stepGame
} from "../src/game.js";

test("stepGame moves the snake forward by one cell", () => {
  const state = createInitialState({ cols: 8, rows: 8, seed: 1 });
  const nextState = stepGame(state);

  assert.deepEqual(nextState.snake[0], {
    x: state.snake[0].x + 1,
    y: state.snake[0].y
  });
  assert.equal(nextState.snake.length, state.snake.length);
  assert.equal(nextState.score, 0);
  assert.equal(nextState.status, "running");
});

test("queueDirection rejects an immediate reverse turn and ignores a second queued turn", () => {
  const state = createInitialState({ cols: 8, rows: 8, seed: 2 });
  const reversed = queueDirection(state, "left");

  assert.strictEqual(reversed, state);

  const turned = queueDirection(state, "up");
  assert.equal(turned.pendingDirection, "up");

  const overwritten = queueDirection(turned, "left");
  assert.strictEqual(overwritten, turned);
});

test("createInitialState places the rainbow item away from the snake and food", () => {
  const state = createInitialState({ cols: 8, rows: 8, seed: 3 });

  assert.notEqual(state.powerItem, null);
  assert.ok(
    state.snake.every(
      (segment) =>
        segment.x !== state.powerItem.x || segment.y !== state.powerItem.y
    )
  );
  assert.ok(
    state.food === null ||
      state.food.x !== state.powerItem.x ||
      state.food.y !== state.powerItem.y
  );
});

test("eating food grows the snake and increments score", () => {
  const state = {
    cols: 6,
    rows: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ],
    direction: "right",
    pendingDirection: "right",
    food: { x: 3, y: 2 },
    powerItem: { x: 5, y: 5 },
    score: 0,
    status: "running",
    rngState: 7,
    activeEffect: null,
    growthBuffer: 0,
    lastEvent: null
  };

  const nextState = stepGame(state);

  assert.equal(nextState.score, 1);
  assert.equal(nextState.snake.length, 4);
  assert.deepEqual(nextState.snake[0], { x: 3, y: 2 });
  assert.notEqual(nextState.food, null);
  assert.ok(
    nextState.food === null ||
      nextState.snake.every(
        (segment) =>
          segment.x !== nextState.food.x || segment.y !== nextState.food.y
      )
  );
});

test("eating the rainbow item activates a deterministic power without scoring", () => {
  const state = {
    cols: 6,
    rows: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ],
    direction: "right",
    pendingDirection: "right",
    food: { x: 5, y: 5 },
    powerItem: { x: 3, y: 2 },
    score: 0,
    status: "running",
    rngState: 1,
    activeEffect: null,
    growthBuffer: 0,
    lastEvent: null
  };

  const nextState = stepGame(state);

  assert.equal(nextState.score, 0);
  assert.deepEqual(nextState.snake[0], { x: 3, y: 2 });
  assert.equal(nextState.activeEffect.kind, "reverse");
  assert.equal(nextState.activeEffect.remainingMs, 5000);
  assert.equal(nextState.lastEvent.type, "power-activated");
  assert.notDeepEqual(nextState.powerItem, state.powerItem);
});

test("eating the final food wins the game", () => {
  const state = {
    cols: 2,
    rows: 2,
    snake: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ],
    direction: "right",
    pendingDirection: "right",
    food: { x: 1, y: 0 },
    powerItem: null,
    score: 0,
    status: "running",
    rngState: 13,
    activeEffect: null,
    growthBuffer: 0,
    lastEvent: null
  };

  const nextState = stepGame(state);

  assert.equal(nextState.status, "won");
  assert.equal(nextState.score, 1);
  assert.equal(nextState.snake.length, 4);
  assert.equal(nextState.food, null);
});

test("hitting a wall ends the game", () => {
  const state = {
    cols: 4,
    rows: 4,
    snake: [
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 1 }
    ],
    direction: "right",
    pendingDirection: "right",
    food: { x: 0, y: 0 },
    powerItem: { x: 2, y: 3 },
    score: 0,
    status: "running",
    rngState: 9,
    activeEffect: null,
    growthBuffer: 0,
    lastEvent: null
  };

  const nextState = stepGame(state);

  assert.equal(nextState.status, "gameover");
  assert.deepEqual(nextState.snake, state.snake);
});

test("running into the snake body ends the game", () => {
  const state = {
    cols: 5,
    rows: 5,
    snake: [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ],
    direction: "left",
    pendingDirection: "left",
    food: { x: 4, y: 4 },
    powerItem: { x: 0, y: 4 },
    score: 3,
    status: "running",
    rngState: 4,
    activeEffect: null,
    growthBuffer: 0,
    lastEvent: null
  };

  const nextState = stepGame(state);

  assert.equal(nextState.status, "gameover");
});

test("ghost walls wraps the snake to the opposite side instead of losing", () => {
  const state = {
    cols: 5,
    rows: 5,
    snake: [
      { x: 4, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 2 }
    ],
    direction: "right",
    pendingDirection: "right",
    food: { x: 1, y: 1 },
    powerItem: { x: 0, y: 0 },
    score: 0,
    status: "running",
    rngState: 9,
    activeEffect: {
      kind: "ghost",
      label: "Ghost Walls",
      polarity: "positive",
      remainingMs: 5000
    },
    growthBuffer: 0,
    lastEvent: null
  };

  const nextState = stepGame(state, { elapsedMs: 120 });

  assert.equal(nextState.status, "running");
  assert.deepEqual(nextState.snake[0], { x: 0, y: 2 });
  assert.equal(nextState.activeEffect.remainingMs, 4880);
});

test("reverse controls flips the queued direction", () => {
  const state = {
    cols: 6,
    rows: 6,
    snake: [
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 3, y: 5 }
    ],
    direction: "up",
    pendingDirection: "up",
    food: { x: 0, y: 0 },
    powerItem: { x: 5, y: 5 },
    score: 0,
    status: "running",
    rngState: 2,
    activeEffect: {
      kind: "reverse",
      label: "Reverse Controls",
      polarity: "negative",
      remainingMs: 5000
    },
    growthBuffer: 0,
    lastEvent: null
  };

  const nextState = queueDirection(state, "left");

  assert.equal(nextState.pendingDirection, "right");
});

test("growth buffer makes the snake keep growing on later moves", () => {
  const state = {
    cols: 6,
    rows: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ],
    direction: "right",
    pendingDirection: "right",
    food: { x: 5, y: 5 },
    powerItem: { x: 4, y: 4 },
    score: 0,
    status: "running",
    rngState: 10,
    activeEffect: {
      kind: "growth",
      label: "Growth Spurt",
      polarity: "negative",
      remainingMs: 5000
    },
    growthBuffer: 2,
    lastEvent: null
  };

  const nextState = stepGame(state, { elapsedMs: 120 });

  assert.equal(nextState.snake.length, 4);
  assert.equal(nextState.growthBuffer, 1);
});

test("active powers expire after their duration elapses", () => {
  const state = {
    cols: 6,
    rows: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ],
    direction: "right",
    pendingDirection: "right",
    food: { x: 5, y: 5 },
    powerItem: { x: 0, y: 0 },
    score: 0,
    status: "running",
    rngState: 10,
    activeEffect: {
      kind: "boost",
      label: "Turbo Boost",
      polarity: "positive",
      remainingMs: 80
    },
    growthBuffer: 0,
    lastEvent: null
  };

  const nextState = stepGame(state, { elapsedMs: 120 });

  assert.equal(nextState.activeEffect, null);
  assert.equal(nextState.lastEvent.type, "power-ended");
  assert.equal(nextState.lastEvent.effect.kind, "boost");
});

test("food placement never selects an occupied cell", () => {
  const occupied = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 }
  ];

  const result = createFoodPosition(occupied, 3, 3, 11);

  assert.notEqual(result.food, null);
  assert.ok(
    occupied.every(
      (segment) =>
        segment.x !== result.food.x || segment.y !== result.food.y
    )
  );
});

test("food placement handles a nearly full board deterministically", () => {
  const occupied = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 }
  ];

  const result = createFoodPosition(occupied, 3, 3, 25);

  assert.deepEqual(result.food, { x: 2, y: 2 });
  assert.equal(result.rngState, 1055517348);
});

test("tick delay gets faster as score increases and respects a floor", () => {
  assert.equal(getTickDelay(0), 120);
  assert.equal(getTickDelay(1), 114);
  assert.equal(getTickDelay(5), 90);
  assert.equal(getTickDelay(20), 55);
  assert.equal(getTickDelay(200), 55);
  assert.equal(
    getTickDelay(0, {}, {
      kind: "boost",
      label: "Turbo Boost",
      polarity: "positive",
      remainingMs: 5000
    }),
    82
  );
  assert.equal(
    getTickDelay(0, {}, {
      kind: "slow",
      label: "Slow Motion",
      polarity: "positive",
      remainingMs: 5000
    }),
    186
  );
});
