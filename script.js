const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const replayButton = document.getElementById('replayButton');
const homeButton = document.getElementById('homeButton');
const gameOverStats = document.getElementById('gameOverStats');
const scoreDisplay = document.getElementById('scoreDisplay');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const finalRankDisplay = document.getElementById('finalRankDisplay');
const welcomeScreen = document.getElementById('welcomeScreen');
const startButton = document.getElementById('startButton');
const playerNameInput = document.getElementById('playerName');
const nameError = document.getElementById('nameError');
const leaderboardBody = document.getElementById('leaderboardBody');
const firebaseConfig = window.firebaseConfig;

let playerPos = 0;
let lasers = [];
let aliens = [];
let alienSpeed = 0.7;
let gameOver = false;
let score = 0;
let playerName = '';
let scoreSubmitted = false;
let leaderboard = loadLeaderboard();
let highScore = leaderboard[0]?.score || 0;
let database = null;
let lives = 3;
let keys = {};
let canShoot = true;
let roundStartTime = 0;
let nextAlienSpawnTime = 0;

highScoreDisplay.textContent = `High Score: ${highScore}`;
renderLeaderboard();
initializeFirebase();

function loadLeaderboard() {
  try {
    const savedScores = JSON.parse(localStorage.getItem('alienLeaderboard'));
    if (Array.isArray(savedScores)) {
      return savedScores
        .filter(entry => entry && typeof entry.name === 'string' && Number.isFinite(entry.score))
        .sort((first, second) => second.score - first.score)
        .slice(0, 10);
    }
  } catch (error) {
    localStorage.removeItem('alienLeaderboard');
  }

  const oldHighScore = Number(localStorage.getItem('alienHighScore')) || 0;
  return oldHighScore > 0 ? [{ name: 'Pilot', score: oldHighScore }] : [];
}

function renderLeaderboard() {
  leaderboardBody.innerHTML = '';

  if (leaderboard.length === 0) {
    leaderboardBody.innerHTML = '<tr><td colspan="3">No scores yet</td></tr>';
    return;
  }

  leaderboard.forEach((entry, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${index + 1}</td><td>${escapeHtml(entry.name)}</td><td>${entry.score}</td>`;
    leaderboardBody.appendChild(row);
  });
}

function updateGameOverStats() {
  finalScoreDisplay.textContent = `Score: ${score}`;
  const rank = leaderboard.findIndex(entry => entry.name === playerName && entry.score === score);
  finalRankDisplay.textContent = rank === -1 ? 'Rank: Not ranked' : `Rank: #${rank + 1}`;
}

async function initializeFirebase() {
  if (!firebaseConfig?.apiKey || !firebaseConfig.projectId) return;

  try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.firestore();
    const snapshot = await database.collection('leaderboard')
      .orderBy('score', 'desc')
      .limit(10)
      .get();

    leaderboard = snapshot.docs.map(document => document.data());
    highScore = leaderboard[0]?.score || 0;
    highScoreDisplay.textContent = `High Score: ${highScore}`;
    renderLeaderboard();
  } catch (error) {
    database = null;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

async function saveScore() {
  if (scoreSubmitted) return;
  scoreSubmitted = true;

  if (score === 0 || !playerName) return;

  leaderboard.push({ name: playerName, score });
  leaderboard.sort((first, second) => second.score - first.score);
  leaderboard = leaderboard.slice(0, 10);
  highScore = leaderboard[0].score;
  localStorage.setItem('alienLeaderboard', JSON.stringify(leaderboard));
  localStorage.setItem('alienHighScore', highScore);
  highScoreDisplay.textContent = `High Score: ${highScore}`;
  renderLeaderboard();
  updateGameOverStats();

  if (!database) return;

  try {
    await database.collection('leaderboard').add({
      name: playerName,
      score,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const snapshot = await database.collection('leaderboard')
      .orderBy('score', 'desc')
      .limit(10)
      .get();
    leaderboard = snapshot.docs.map(document => document.data());
    highScore = leaderboard[0]?.score || 0;
    highScoreDisplay.textContent = `High Score: ${highScore}`;
    renderLeaderboard();
  } catch (error) {
    database = null;
  }
}

function movePlayer() {
  if (gameOver) return;

  if (keys.left) {
    playerPos -= 7;
    if (playerPos < 0) playerPos = 0;
  }
  if (keys.right) {
    playerPos += 7;
    if (playerPos + player.offsetWidth > gameArea.clientWidth) {
      playerPos = gameArea.clientWidth - player.offsetWidth;
    }
  }
  player.style.left = `${playerPos}px`;
}

function shootLaser() {
  if (gameOver || !canShoot) return;

  const laser = document.createElement('div');
  laser.classList.add('laser');
  laser.style.bottom = '70px';
  gameArea.appendChild(laser);
  laser.style.left = `${playerPos + (player.offsetWidth - laser.offsetWidth) / 2}px`;
  lasers.push(laser);

  canShoot = false;
  setTimeout(() => canShoot = true, 300);
}

function spawnAlien() {
  if (gameOver) return;

  const alien = document.createElement('div');
  alien.classList.add('alien');
  alien.style.left = `${Math.random() * (gameArea.clientWidth - 50)}px`;
  alien.style.top = '76px';
  gameArea.appendChild(alien);
  aliens.push(alien);
}

function updateLasers() {
  lasers.forEach((laser, index) => {
    let laserBottom = parseInt(laser.style.bottom);
    laserBottom += 5;
    laser.style.bottom = `${laserBottom}px`;

    if (laserBottom > gameArea.clientHeight) {
      laser.remove();
      lasers.splice(index, 1);
    }
  });
}

function updateAliens() {
  for (let index = aliens.length - 1; index >= 0; index -= 1) {
    const alien = aliens[index];
    let alienTop = parseInt(alien.style.top);
    alienTop += alienSpeed;
    alien.style.top = `${alienTop}px`;

    if (alienTop + 50 >= gameArea.clientHeight) {
      alien.remove();
      aliens.splice(index, 1);
      loseLife();
      if (gameOver) return;
    }
  }
}

function detectCollisions() {
  lasers.forEach((laser, laserIndex) => {
    aliens.forEach((alien, alienIndex) => {
      const laserRect = laser.getBoundingClientRect();
      const alienRect = alien.getBoundingClientRect();

      if (
        laserRect.left < alienRect.right &&
        laserRect.right > alienRect.left &&
        laserRect.top < alienRect.bottom &&
        laserRect.bottom > alienRect.top
      ) {
        alien.remove();
        laser.remove();
        aliens.splice(alienIndex, 1);
        lasers.splice(laserIndex, 1);
        incrementScore();
      }
    });
  });
}

function incrementScore() {
  score += 1;
  scoreDisplay.textContent = `Score: ${score}`;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('alienHighScore', highScore);
    highScoreDisplay.textContent = `High Score: ${highScore}`;
  }
}

function loseLife() {
  lives -= 1;
  livesDisplay.innerHTML = '&hearts;'.repeat(lives);
  livesDisplay.setAttribute('aria-label', `Lives: ${lives}`);

  if (lives <= 0) {
    endGame();
  }
}

function gameLoop(timestamp) {
  if (!gameOver) {
    const elapsedSeconds = (timestamp - roundStartTime) / 1000;
    alienSpeed = Math.min(4, 0.7 + elapsedSeconds * 0.06);

    movePlayer();
    updateLasers();
    updateAliens();
    detectCollisions();

    if (keys.shoot) shootLaser();

    if (timestamp >= nextAlienSpawnTime) {
      spawnAlien();
      const spawnInterval = Math.max(450, 1800 - elapsedSeconds * 35);
      nextAlienSpawnTime = timestamp + spawnInterval;
    }

    requestAnimationFrame(gameLoop);
  }
}

function endGame() {
  saveScore();
  updateGameOverStats();
  gameOver = true;
  replayButton.style.display = 'block';
  homeButton.style.display = 'block';
  gameOverStats.style.display = 'block';
}

function replayGame() {
  saveScore();
  lasers.forEach(laser => laser.remove());
  aliens.forEach(alien => alien.remove());

  lasers = [];
  aliens = [];
  playerPos = (gameArea.clientWidth - player.offsetWidth) / 2;
  player.style.left = `${playerPos}px`;
  score = 0;
  lives = 3;
  alienSpeed = 0.7;
  scoreDisplay.textContent = `Score: ${score}`;
  livesDisplay.innerHTML = '&hearts;'.repeat(lives);
  livesDisplay.setAttribute('aria-label', `Lives: ${lives}`);

  gameOver = false;
  scoreSubmitted = false;
  replayButton.style.display = 'none';
  homeButton.style.display = 'none';
  gameOverStats.style.display = 'none';
  roundStartTime = performance.now();
  nextAlienSpawnTime = roundStartTime + 1800;
  requestAnimationFrame(gameLoop);
}

function goHome() {
  saveScore();
  lasers.forEach(laser => laser.remove());
  aliens.forEach(alien => alien.remove());

  lasers = [];
  aliens = [];
  keys = {};
  gameOver = true;
  gameArea.style.display = 'none';
  welcomeScreen.style.display = 'block';
  replayButton.style.display = 'none';
  homeButton.style.display = 'none';
  gameOverStats.style.display = 'none';
}

function startGame() {
  playerName = playerNameInput.value.trim();
  if (!playerName) {
    nameError.textContent = 'Enter a callsign before launching.';
    playerNameInput.focus();
    return;
  }

  nameError.textContent = '';
  scoreSubmitted = false;
  welcomeScreen.style.display = 'none';
  gameArea.style.display = 'block';
  playerPos = (gameArea.clientWidth - player.offsetWidth) / 2;
  player.style.left = `${playerPos}px`;
  roundStartTime = performance.now();
  nextAlienSpawnTime = roundStartTime + 1800;
  requestAnimationFrame(gameLoop);
}

startButton.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      keys.left = true;
      break;
    case 'ArrowRight':
      keys.right = true;
      break;
    case ' ':
      keys.shoot = true;
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'ArrowRight':
      keys.right = false;
      break;
    case ' ':
      keys.shoot = false;
      break;
  }
});

// Add touch controls for mobile devices
function handleTouch(e) {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    
    // Check if touch is in the left half of the screen
    if (touchX < window.innerWidth / 2) {
      keys.left = true;
      keys.right = false;
    } else {
      keys.right = true;
      keys.left = false;
    }
    
    // Check if touch is on the bottom quarter of the screen
    if (touchY > window.innerHeight * 0.75) {
      keys.shoot = true;
    } else {
      keys.shoot = false;
    }
  }
}

function handleTouchEnd(e) {
  keys.left = false;
  keys.right = false;
  keys.shoot = false;
}

document.addEventListener('touchstart', handleTouch);
document.addEventListener('touchend', handleTouchEnd);
document.addEventListener('touchmove', handleTouch);
