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
    score: 0,
    status: "running",
    rngState: 7
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
    score: 0,
    status: "running",
    rngState: 13
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
    score: 0,
    status: "running",
    rngState: 9
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
    score: 3,
    status: "running",
    rngState: 4
  };

  const nextState = stepGame(state);

  assert.equal(nextState.status, "gameover");
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
});
