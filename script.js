
// GUESSIT! — Game Engine

const settings = {
  easy:   { max: 50, attempts: 10, points: 1000 },
  medium: { max: 100, attempts: 8, points: 1500 },
  hard:   { max: 500, attempts: 7, points: 2000 }
};

const $ = id => document.getElementById(id);

const elements = {
  form: $("guessForm"),
  input: $("guessInput"),
  guessButton: $("guessButton"),
  message: $("message"),
  mystery: $("mystery"),
  board: $("board"),
  score: $("score"),
  attempts: $("attempts"),
  streak: $("streak"),
  lives: $("lives"),
  progress: $("progress"),
  attemptText: $("attemptText"),
  rangeText: $("rangeText"),
  lowBound: $("lowBound"),
  highBound: $("highBound"),
  rangeFill: $("rangeFill"),
  hintButton: $("hintButton"),
  restartButton: $("restartButton"),
  soundButton: $("soundButton"),
  bestScore: $("bestScore"),
  result: $("result")
};

let difficulty = "medium";
let secret;
let attempts;
let score;
let gameOver;
let hintUsed;
let streak = 0;
let low;
let high;
let soundEnabled = true;
let audioContext;

function loadBest() {
  try {
    return Number(localStorage.getItem("guessit-best")) || 0;
  } catch {
    return 0;
  }
}

let bestScore = loadBest();

function saveBest(value) {
  bestScore = Math.max(bestScore, value);
  elements.bestScore.textContent = bestScore;

  try {
    localStorage.setItem("guessit-best", String(bestScore));
  } catch {
    // The game still works if browser storage is unavailable.
  }
}

function playSound(type) {
  if (!soundEnabled) return;

  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;

    if (!audioContext) audioContext = new Audio();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.type = type === "win" ? "triangle" : "sine";

    oscillator.frequency.value =
      type === "win" ? 650 :
      type === "wrong" ? 220 : 440;

    const now = audioContext.currentTime;

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch {
    // Audio is optional.
  }
}

function animate(element, animation) {
  element.classList.remove(animation);
  void element.offsetWidth;
  element.classList.add(animation);
}

function setMessage(text, type = "") {
  elements.message.textContent = text;
  elements.message.className = "feedback " + type;
}

function render() {
  const config = settings[difficulty];

  elements.score.textContent = score;
  elements.attempts.textContent = attempts;
  elements.streak.textContent = streak;
  elements.attemptText.textContent =
    `${attempts} / ${config.attempts}`;

  elements.progress.style.width =
    `${attempts / config.attempts * 100}%`;

  elements.rangeText.textContent = `1 — ${config.max}`;
  elements.lowBound.textContent = low;
  elements.highBound.textContent = high;

  const remaining = Math.max(0, config.attempts - attempts);

  elements.lives.innerHTML = "";

  for (let i = 0; i < config.attempts; i++) {
    const life = document.createElement("span");
    life.className = "life" + (i >= remaining ? " used" : "");
    life.textContent = "❤️";
    elements.lives.appendChild(life);
  }

  elements.lives.setAttribute(
    "aria-label",
    `${remaining} of ${config.attempts} attempts remaining`
  );

  elements.rangeFill.style.width =
    `${Math.max(0, (high - low + 1) / config.max * 100)}%`;

  elements.hintButton.disabled = hintUsed || gameOver;
}

function startGame(level = difficulty) {
  difficulty = level;

  const config = settings[difficulty];

  secret = Math.floor(Math.random() * config.max) + 1;
  attempts = 0;
  score = config.points;
  gameOver = false;
  hintUsed = false;
  low = 1;
  high = config.max;

  elements.input.min = 1;
  elements.input.max = config.max;
  elements.input.value = "";
  elements.input.disabled = false;
  elements.guessButton.disabled = false;

  elements.mystery.textContent = "?";
  $("boardCaption").textContent = "THE NUMBER IS HIDING...";
  $("roundStatus").textContent = "SECRET NUMBER";

  elements.board.classList.remove("win", "lose");
  elements.result.hidden = true;

  document.querySelectorAll(".mode").forEach(button => {
    const active = button.dataset.level === difficulty;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  setMessage("Pick a number and take your shot!");
  render();
}

function finishGame(won) {
  gameOver = true;
  elements.input.disabled = true;
  elements.guessButton.disabled = true;
  elements.mystery.textContent = secret;

  elements.board.classList.add(won ? "win" : "lose");
  $("roundStatus").textContent = won ? "NUMBER CRACKED!" : "GAME OVER";
  $("boardCaption").textContent = won ? "YOU FOUND IT!" : "BETTER LUCK NEXT TIME";

  $("resultEmoji").textContent = won ? "🏆" : "💔";
  $("resultTitle").textContent = won ? "YOU GOT IT!" : "GAME OVER";

  $("resultDescription").textContent = won
    ? `You found ${secret} in ${attempts} ${attempts === 1 ? "guess" : "guesses"}!`
    : `The secret number was ${secret}. Try another round!`;

  $("resultScore").textContent = `${score} POINTS`;

  elements.result.hidden = false;
  render();
}

function checkGuess(event) {
  event.preventDefault();

  if (gameOver) return;

  const raw = elements.input.value.trim();
  const guess = Number(raw);
  const config = settings[difficulty];

  if (
    raw === "" ||
    !Number.isInteger(guess) ||
    guess < 1 ||
    guess > config.max
  ) {
    setMessage(`Enter a whole number from 1 to ${config.max}.`, "error");
    return;
  }

  attempts++;

  if (guess === secret) {
    const bonus = (config.attempts - attempts) * 100;
    streak++;

    score += bonus + streak * 25;

    saveBest(score);
    setMessage("🎉 BULLSEYE! YOU CRACKED IT!", "success");
    animate(elements.mystery, "pop");
    playSound("win");
    finishGame(true);
    return;
  }

  score = Math.max(0, score - 50);

  if (guess < secret) {
    low = Math.max(low, guess + 1);
    setMessage("⬆️ TOO LOW! AIM HIGHER!", "low");
  } else {
    high = Math.min(high, guess - 1);
    setMessage("⬇️ TOO HIGH! GO LOWER!", "high");
  }

  animate(elements.board, "shake");
  playSound("wrong");

  if (attempts >= config.attempts) {
    streak = 0;
    setMessage(`GAME OVER! THE NUMBER WAS ${secret}.`, "error");
    finishGame(false);
  } else {
    elements.input.value = "";
    elements.input.focus();
    render();
  }
}

function giveHint() {
  if (gameOver || hintUsed) return;

  hintUsed = true;
  score = Math.max(0, score - 150);

  const parity = secret % 2 === 0 ? "EVEN" : "ODD";

  setMessage(`💡 HINT: THE NUMBER IS ${parity}!`);
  playSound("hint");
  render();
}

elements.form.addEventListener("submit", checkGuess);
elements.hintButton.addEventListener("click", giveHint);

elements.restartButton.addEventListener("click", () => {
  streak = 0;
  startGame();
});

$("playAgain").addEventListener("click", () => startGame());

document.querySelectorAll(".mode").forEach(button => {
  button.addEventListener("click", () => {
    streak = 0;
    startGame(button.dataset.level);
  });
});

elements.soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  elements.soundButton.textContent = soundEnabled ? "🔊" : "🔇";
  elements.soundButton.setAttribute("aria-pressed", String(soundEnabled));
});

elements.bestScore.textContent = bestScore;
startGame("medium");