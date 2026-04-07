import {
  createInitialState,
  getTickDelay,
  queueDirection,
  stepGame
} from "./game.js";

const BOARD_COLS = 20;
const BOARD_ROWS = 20;
const BASE_TICK_DELAY = 120;
const MIN_TICK_DELAY = 55;
const TICK_STEP_DELAY = 6;
const LEADERBOARD_KEY = "snake-leaderboard-v1";
const LEADERBOARD_LIMIT = 5;

const STATUS_LABELS = {
  running: "Running",
  paused: "Paused",
  gameover: "Game over",
  won: "Victory"
};

const KEY_DIRECTIONS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  a: "left",
  A: "left",
  s: "down",
  S: "down",
  d: "right",
  D: "right"
};

const EAT_MESSAGES = ["Snack +1", "Crunch +1", "Miam +1", "Nice bite +1"];
const LOSE_MESSAGES = ["Bonk", "Oops", "Wall hug", "Finito"];
const WIN_MESSAGES = [
  "Full board",
  "Snake legend",
  "Perfect run",
  "Ultimate noodle"
];
const COLOR_PALETTES = [
  {
    snake: "linear-gradient(180deg, #57de88 0%, #2ea35d 100%)",
    snakeHead: "linear-gradient(180deg, #a8ffd0 0%, #54e694 100%)",
    food: "linear-gradient(180deg, #d8ff72 0%, #79d13f 100%)",
    accentSoft: "rgba(88, 240, 154, 0.24)",
    accentGlow: "rgba(88, 240, 154, 0.22)",
    accentGlowStrong: "rgba(88, 240, 154, 0.42)",
    accentLatest: "rgba(152, 255, 210, 0.42)",
    accentLatestSoft: "rgba(88, 240, 154, 0.1)",
    foodGlow: "rgba(184, 255, 79, 0.18)",
    eatColor: "rgba(214, 255, 94, 0.92)",
    eatParticle: "linear-gradient(180deg, #f4ffbb 0%, #b8ff4f 100%)",
    eatLabelBorder: "rgba(214, 255, 94, 0.28)"
  },
  {
    snake: "linear-gradient(180deg, #4ce2c2 0%, #228f80 100%)",
    snakeHead: "linear-gradient(180deg, #bcfff5 0%, #62f0db 100%)",
    food: "linear-gradient(180deg, #a9fbff 0%, #46d6e0 100%)",
    accentSoft: "rgba(76, 226, 194, 0.24)",
    accentGlow: "rgba(76, 226, 194, 0.22)",
    accentGlowStrong: "rgba(76, 226, 194, 0.42)",
    accentLatest: "rgba(156, 255, 239, 0.42)",
    accentLatestSoft: "rgba(76, 226, 194, 0.1)",
    foodGlow: "rgba(112, 241, 255, 0.2)",
    eatColor: "rgba(112, 241, 255, 0.94)",
    eatParticle: "linear-gradient(180deg, #d8ffff 0%, #71efff 100%)",
    eatLabelBorder: "rgba(112, 241, 255, 0.28)"
  },
  {
    snake: "linear-gradient(180deg, #73f2a0 0%, #3ea84a 100%)",
    snakeHead: "linear-gradient(180deg, #d7ffd7 0%, #86f29a 100%)",
    food: "linear-gradient(180deg, #f1ff8c 0%, #b4e842 100%)",
    accentSoft: "rgba(115, 242, 160, 0.24)",
    accentGlow: "rgba(115, 242, 160, 0.22)",
    accentGlowStrong: "rgba(115, 242, 160, 0.42)",
    accentLatest: "rgba(186, 255, 205, 0.42)",
    accentLatestSoft: "rgba(115, 242, 160, 0.1)",
    foodGlow: "rgba(215, 255, 105, 0.22)",
    eatColor: "rgba(215, 255, 105, 0.95)",
    eatParticle: "linear-gradient(180deg, #f7ffcd 0%, #d9ff69 100%)",
    eatLabelBorder: "rgba(215, 255, 105, 0.3)"
  },
  {
    snake: "linear-gradient(180deg, #66d5ff 0%, #2a7bd0 100%)",
    snakeHead: "linear-gradient(180deg, #d7f4ff 0%, #72d9ff 100%)",
    food: "linear-gradient(180deg, #a6fff2 0%, #50e8cb 100%)",
    accentSoft: "rgba(102, 213, 255, 0.24)",
    accentGlow: "rgba(102, 213, 255, 0.22)",
    accentGlowStrong: "rgba(102, 213, 255, 0.42)",
    accentLatest: "rgba(173, 232, 255, 0.42)",
    accentLatestSoft: "rgba(102, 213, 255, 0.1)",
    foodGlow: "rgba(80, 232, 203, 0.22)",
    eatColor: "rgba(80, 232, 203, 0.95)",
    eatParticle: "linear-gradient(180deg, #d8fff8 0%, #62f7d7 100%)",
    eatLabelBorder: "rgba(80, 232, 203, 0.3)"
  },
  {
    snake: "linear-gradient(180deg, #8cf36c 0%, #3ea53a 100%)",
    snakeHead: "linear-gradient(180deg, #e6ffd8 0%, #9af283 100%)",
    food: "linear-gradient(180deg, #fff8a8 0%, #ffd44d 100%)",
    accentSoft: "rgba(140, 243, 108, 0.24)",
    accentGlow: "rgba(140, 243, 108, 0.22)",
    accentGlowStrong: "rgba(140, 243, 108, 0.42)",
    accentLatest: "rgba(204, 255, 168, 0.42)",
    accentLatestSoft: "rgba(140, 243, 108, 0.1)",
    foodGlow: "rgba(255, 212, 77, 0.22)",
    eatColor: "rgba(255, 212, 77, 0.94)",
    eatParticle: "linear-gradient(180deg, #fffbd7 0%, #ffe268 100%)",
    eatLabelBorder: "rgba(255, 212, 77, 0.28)"
  },
  {
    snake: "linear-gradient(180deg, #55f0d2 0%, #2b9d8b 100%)",
    snakeHead: "linear-gradient(180deg, #cdfff5 0%, #73f2dd 100%)",
    food: "linear-gradient(180deg, #c4ffd8 0%, #72f0a7 100%)",
    accentSoft: "rgba(85, 240, 210, 0.24)",
    accentGlow: "rgba(85, 240, 210, 0.22)",
    accentGlowStrong: "rgba(85, 240, 210, 0.42)",
    accentLatest: "rgba(173, 255, 236, 0.42)",
    accentLatestSoft: "rgba(85, 240, 210, 0.1)",
    foodGlow: "rgba(114, 240, 167, 0.22)",
    eatColor: "rgba(114, 240, 167, 0.95)",
    eatParticle: "linear-gradient(180deg, #e0fff0 0%, #86ffc0 100%)",
    eatLabelBorder: "rgba(114, 240, 167, 0.28)"
  }
];

const boardShellElement = document.querySelector("#board-shell");
const boardElement = document.querySelector("#board");
const effectsLayerElement = document.querySelector("#effects-layer");
const eventBannerElement = document.querySelector("#event-banner");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const statusElement = document.querySelector("#status");
const powerStatusElement = document.querySelector("#power-status");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const leaderboardListElement = document.querySelector("#leaderboard-list");
const powerStatusItemElement = powerStatusElement?.closest(".hud__item");

const defaultOptions = {
  cols: BOARD_COLS,
  rows: BOARD_ROWS,
  initialLength: 3
};

let state = createInitialState(defaultOptions);
let cells = [];
let leaderboardEntries = loadLeaderboard();
let latestLeaderboardEntryId = null;
let hasRecordedCurrentRun = false;
let bannerTimeoutId = null;
let tickTimeoutId = null;
let currentPaletteIndex = 0;
const transientTimers = new Map();

function getPositionKey(position) {
  return `${position.x},${position.y}`;
}

function getBestScore() {
  return leaderboardEntries[0]?.score ?? 0;
}

function pickMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function formatPowerStatus(activeEffect) {
  if (!activeEffect) {
    return "None";
  }

  return `${activeEffect.label} ${Math.max(
    1,
    Math.ceil(activeEffect.remainingMs / 1000)
  )}s`;
}

function applyPalette(palette) {
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty("--snake", palette.snake);
  rootStyle.setProperty("--snake-head", palette.snakeHead);
  rootStyle.setProperty("--food", palette.food);
  rootStyle.setProperty("--accent-soft", palette.accentSoft);
  rootStyle.setProperty("--accent-glow", palette.accentGlow);
  rootStyle.setProperty("--accent-glow-strong", palette.accentGlowStrong);
  rootStyle.setProperty("--accent-latest", palette.accentLatest);
  rootStyle.setProperty("--accent-latest-soft", palette.accentLatestSoft);
  rootStyle.setProperty("--food-glow", palette.foodGlow);
  rootStyle.setProperty("--eat-color", palette.eatColor);
  rootStyle.setProperty("--eat-particle", palette.eatParticle);
  rootStyle.setProperty("--eat-label-border", palette.eatLabelBorder);
}

function setPaletteByIndex(index) {
  currentPaletteIndex = ((index % COLOR_PALETTES.length) + COLOR_PALETTES.length) %
    COLOR_PALETTES.length;
  applyPalette(COLOR_PALETTES[currentPaletteIndex]);
}

function advancePalette() {
  setPaletteByIndex(currentPaletteIndex + 1);
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(timestamp);
}

function formatOutcome(outcome) {
  return outcome === "won" ? "Win" : "KO";
}

function sortLeaderboardEntries(entries) {
  return [...entries]
    .sort((left, right) => {
      return right.score - left.score || right.timestamp - left.timestamp;
    })
    .slice(0, LEADERBOARD_LIMIT);
}

function loadLeaderboard() {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validEntries = parsed.filter((entry) => {
      return (
        entry &&
        typeof entry.id === "string" &&
        Number.isFinite(entry.score) &&
        Number.isFinite(entry.timestamp) &&
        (entry.outcome === "won" || entry.outcome === "gameover")
      );
    });

    return sortLeaderboardEntries(
      validEntries.map((entry) => ({
        id: entry.id,
        score: Math.max(0, Math.trunc(entry.score)),
        timestamp: Math.trunc(entry.timestamp),
        outcome: entry.outcome
      }))
    );
  } catch {
    return [];
  }
}

function saveLeaderboard() {
  try {
    window.localStorage.setItem(
      LEADERBOARD_KEY,
      JSON.stringify(leaderboardEntries)
    );
  } catch {
    // Ignore storage failures so the game still runs in private/restricted modes.
  }
}

function renderLeaderboard() {
  leaderboardListElement.replaceChildren();

  if (leaderboardEntries.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "leaderboard__empty";
    emptyItem.textContent = "No scores yet. Go get one.";
    leaderboardListElement.appendChild(emptyItem);
    return;
  }

  leaderboardEntries.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard__item";

    if (entry.id === latestLeaderboardEntryId) {
      item.classList.add("leaderboard__item--latest");
    }

    const rank = document.createElement("span");
    rank.className = "leaderboard__rank";
    rank.textContent = String(index + 1).padStart(2, "0");

    const body = document.createElement("div");
    body.className = "leaderboard__entry";

    const topRow = document.createElement("div");
    topRow.className = "leaderboard__row";

    const score = document.createElement("strong");
    score.className = "leaderboard__score";
    score.textContent = `${entry.score} pts`;

    const badge = document.createElement("span");
    badge.className = `leaderboard__badge leaderboard__badge--${entry.outcome}`;
    badge.textContent = formatOutcome(entry.outcome);

    const meta = document.createElement("span");
    meta.className = "leaderboard__meta";
    meta.textContent = formatTimestamp(entry.timestamp);

    topRow.append(score, badge);
    body.append(topRow, meta);
    item.append(rank, body);
    leaderboardListElement.appendChild(item);
  });
}

function buildBoard(cols, rows) {
  boardElement.replaceChildren();
  boardElement.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  boardElement.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

  cells = Array.from({ length: cols * rows }, (_, index) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = String(index);
    boardElement.appendChild(cell);
    return cell;
  });
}

function render() {
  const snakeKeys = new Set(state.snake.map(getPositionKey));
  const headKey = getPositionKey(state.snake[0]);
  const foodKey = state.food ? getPositionKey(state.food) : null;
  const powerItemKey = state.powerItem ? getPositionKey(state.powerItem) : null;
  const isTerminal = state.status === "gameover" || state.status === "won";
  const powerActive = Boolean(state.activeEffect);

  scoreElement.textContent = String(state.score);
  bestScoreElement.textContent = String(getBestScore());
  statusElement.textContent = STATUS_LABELS[state.status];
  powerStatusElement.textContent = formatPowerStatus(state.activeEffect);
  pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
  pauseButton.disabled = isTerminal;
  powerStatusItemElement?.classList.toggle("hud__item--power-active", powerActive);
  document.body.classList.toggle("body--rainbow-active", powerActive);
  boardShellElement.classList.toggle("board-shell--rainbow-active", powerActive);

  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      const key = `${x},${y}`;
      const cell = cells[y * state.cols + x];
      cell.className = "cell";

      if (powerItemKey === key) {
        cell.classList.add("cell--power-item");
      }

      if (foodKey === key) {
        cell.classList.add("cell--food");
      }

      if (snakeKeys.has(key)) {
        cell.classList.add("cell--snake");

        if (powerActive) {
          cell.classList.add("cell--snake-rainbow");
        }
      }

      if (headKey === key) {
        cell.classList.add("cell--head");

        if (powerActive) {
          cell.classList.add("cell--head-rainbow");
        }
      }
    }
  }
}

function clearScheduledTick() {
  window.clearTimeout(tickTimeoutId);
  tickTimeoutId = null;
}

function scheduleNextTick() {
  clearScheduledTick();

  if (state.status !== "running") {
    return;
  }

  const delay = getTickDelay(state.score, {
    baseDelay: BASE_TICK_DELAY,
    minDelay: MIN_TICK_DELAY,
    stepDelay: TICK_STEP_DELAY
  }, state.activeEffect);

  tickTimeoutId = window.setTimeout(() => {
    tickTimeoutId = null;
    updateState(stepGame(state, { elapsedMs: delay }));
    scheduleNextTick();
  }, delay);
}

function clearBoardEffects() {
  window.clearTimeout(bannerTimeoutId);
  bannerTimeoutId = null;

  for (const timeoutId of transientTimers.values()) {
    window.clearTimeout(timeoutId);
  }

  transientTimers.clear();
  boardShellElement.classList.remove(
    "board-shell--eat",
    "board-shell--lose",
    "board-shell--win",
    "board-shell--power"
  );
  scoreElement.classList.remove("hud__value--pop");
  eventBannerElement.className = "event-banner";
  eventBannerElement.textContent = "";
  effectsLayerElement.replaceChildren();
  document.body.classList.remove("body--rainbow-active");
}

function triggerTransientClass(element, className, duration) {
  const existingTimeoutId = transientTimers.get(className);

  if (existingTimeoutId) {
    window.clearTimeout(existingTimeoutId);
  }

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);

  const timeoutId = window.setTimeout(() => {
    element.classList.remove(className);
    transientTimers.delete(className);
  }, duration);

  transientTimers.set(className, timeoutId);
}

function showBanner(text, type, duration) {
  window.clearTimeout(bannerTimeoutId);
  eventBannerElement.textContent = text;
  eventBannerElement.className = `event-banner event-banner--visible event-banner--${type}`;

  bannerTimeoutId = window.setTimeout(() => {
    eventBannerElement.className = "event-banner";
    eventBannerElement.textContent = "";
  }, duration);
}

function toBoardPercent(position) {
  return {
    x: ((position.x + 0.5) / state.cols) * 100,
    y: ((position.y + 0.5) / state.rows) * 100
  };
}

function spawnBurst(type, coordinates, label = "") {
  const burst = document.createElement("div");
  const particleCount =
    type === "win" ? 14 : type === "lose" ? 10 : type === "power" ? 12 : 8;
  const duration =
    type === "win" ? 1400 : type === "lose" ? 900 : type === "power" ? 1200 : 700;

  burst.className = `burst burst--${type}`;
  burst.style.left = `${coordinates.x}%`;
  burst.style.top = `${coordinates.y}%`;

  const ring = document.createElement("span");
  ring.className = "burst__ring";
  burst.appendChild(ring);

  if (label) {
    const labelElement = document.createElement("span");
    labelElement.className = "burst__label";
    labelElement.textContent = label;
    burst.appendChild(labelElement);
  }

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    particle.className = "burst__particle";
    particle.style.setProperty("--angle", `${(360 / particleCount) * index}deg`);
    particle.style.setProperty(
      "--distance",
      type === "win"
        ? "5.5rem"
        : type === "lose"
          ? "4rem"
          : type === "power"
            ? "4.75rem"
            : "3.1rem"
    );
    particle.style.setProperty("--delay", `${index * 18}ms`);
    burst.appendChild(particle);
  }

  effectsLayerElement.appendChild(burst);

  window.setTimeout(() => {
    burst.remove();
  }, duration);
}

function recordCompletedRun(finalState) {
  if (hasRecordedCurrentRun || finalState.score <= 0) {
    return;
  }

  hasRecordedCurrentRun = true;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    score: finalState.score,
    timestamp: Date.now(),
    outcome: finalState.status
  };

  leaderboardEntries = sortLeaderboardEntries([...leaderboardEntries, entry]);
  latestLeaderboardEntryId = leaderboardEntries.some(
    (leaderboardEntry) => leaderboardEntry.id === entry.id
  )
    ? entry.id
    : null;

  saveLeaderboard();
  renderLeaderboard();
}

function playEatEffect(previousState) {
  triggerTransientClass(boardShellElement, "board-shell--eat", 360);
  triggerTransientClass(scoreElement, "hud__value--pop", 480);
  spawnBurst("eat", toBoardPercent(previousState.food), pickMessage(EAT_MESSAGES));
}

function playLoseEffect(nextState) {
  const message = pickMessage(LOSE_MESSAGES);

  triggerTransientClass(boardShellElement, "board-shell--lose", 720);
  showBanner(message, "lose", 1500);
  spawnBurst("lose", toBoardPercent(nextState.snake[0]), message);
}

function playWinEffect() {
  const message = pickMessage(WIN_MESSAGES);
  const celebrationPoints = [
    { x: 50, y: 48 },
    { x: 22, y: 26 },
    { x: 78, y: 28 },
    { x: 30, y: 74 },
    { x: 70, y: 72 }
  ];

  triggerTransientClass(boardShellElement, "board-shell--win", 1600);
  triggerTransientClass(scoreElement, "hud__value--pop", 700);
  showBanner(message, "win", 2200);

  celebrationPoints.forEach((point, index) => {
    spawnBurst("win", point, index === 0 ? message : "");
  });
}

function playPowerEffect(previousState, nextState) {
  triggerTransientClass(boardShellElement, "board-shell--power", 1150);
  showBanner(nextState.activeEffect.label, "power", 1900);

  if (previousState.powerItem) {
    spawnBurst("power", toBoardPercent(previousState.powerItem), nextState.activeEffect.label);
  }
}

function playPowerEndEffect(previousState) {
  if (!previousState.activeEffect) {
    return;
  }

  showBanner(`${previousState.activeEffect.label} ended`, "power-end", 1200);
}

function handleStateTransition(previousState, nextState) {
  const statusChanged = previousState.status !== nextState.status;
  const ateFood = nextState.score > previousState.score && previousState.food !== null;
  const powerActivated = nextState.lastEvent?.type === "power-activated";
  const powerEnded = nextState.lastEvent?.type === "power-ended";

  if (ateFood) {
    advancePalette();
  }

  if (statusChanged && nextState.status === "won") {
    playWinEffect();
    recordCompletedRun(nextState);
    return;
  }

  if (statusChanged && nextState.status === "gameover") {
    playLoseEffect(nextState);
    recordCompletedRun(nextState);
    return;
  }

  if (powerActivated && nextState.activeEffect) {
    playPowerEffect(previousState, nextState);
    return;
  }

  if (ateFood) {
    playEatEffect(previousState);
    return;
  }

  if (powerEnded) {
    playPowerEndEffect(previousState);
  }
}

function updateState(nextState) {
  const previousState = state;
  state = nextState;
  handleStateTransition(previousState, nextState);
  render();
}

function resetGame() {
  clearScheduledTick();
  clearBoardEffects();
  setPaletteByIndex(0);
  state = createInitialState(defaultOptions);
  hasRecordedCurrentRun = false;
  render();
  scheduleNextTick();
}

function togglePause() {
  if (state.status === "gameover" || state.status === "won") {
    return;
  }

  state = {
    ...state,
    status: state.status === "running" ? "paused" : "running"
  };

  render();

  if (state.status === "running") {
    scheduleNextTick();
    return;
  }

  clearScheduledTick();
}

function handleDirection(direction) {
  const nextState = queueDirection(state, direction);

  if (nextState !== state) {
    state = nextState;
    render();
  }
}

window.addEventListener("keydown", (event) => {
  const direction = KEY_DIRECTIONS[event.key];

  if (direction) {
    event.preventDefault();
    handleDirection(direction);
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    resetGame();
  }
});

pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", resetGame);

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    handleDirection(button.dataset.direction);
  });
});

buildBoard(state.cols, state.rows);
setPaletteByIndex(0);
renderLeaderboard();
render();
scheduleNextTick();
