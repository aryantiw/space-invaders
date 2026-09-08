# Alien Invasion

A space-themed arcade shooter built with HTML, CSS, and vanilla JavaScript. Destroy alien ships, protect your lives, and compete for a place on the global leaderboard.

## Features

- Responsive space-themed interface for phones, tablets, and desktop screens
- Keyboard and touch controls
- Gradually increasing alien speed and spawn intensity
- Laser shooting and collision detection
- Three-heart lives system
- Current score and persistent high score
- Named top-10 leaderboard
- Firebase Firestore support for shared scores across players
- Local leaderboard fallback when Firebase is unavailable
- Replay and Home controls after game over

## How To Play

1. Enter a callsign on the startup screen.
2. Select **Start Game**.
3. Destroy alien ships with your lasers.
4. Avoid letting aliens reach the bottom of the game area.
5. You lose one heart for each alien that reaches the bottom.
6. The game ends when all hearts are gone.

## Controls

### Keyboard

- `ArrowLeft`: Move left
- `ArrowRight`: Move right
- `Space`: Fire lasers

### Smartphone Touch

- Touch and hold the left half of the screen to move left.
- Touch and hold the right half of the screen to move right.
- Touch the bottom quarter of the screen to fire.
- Release your finger to stop the action.

## Firebase Setup

The project uses Firebase Firestore for the shared leaderboard.

1. Create or open a Firebase project.
2. Create a Firestore Database.
3. Register a Web app in the Firebase project.
4. Copy the Web app configuration into `firebase-config.js`.
5. Create Firestore rules that allow leaderboard reads and validated score creation.

Example configuration shape:

```js
window.firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
```

The game uses a Firestore collection named `leaderboard`. Each score contains a player name, score, and server timestamp.

For local development, the game falls back to browser storage when Firebase is not configured or unavailable.

## Run Locally

This is a static web project. Open `index.html` in a browser, or serve the folder with any local static web server.

For example, with Python installed:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Project Structure

```text
index.html              Game markup and Firebase SDK loading
style.css               Responsive space-themed styling
script.js               Game logic, controls, scoring, and leaderboard
firebase-config.js      Firebase Web app configuration
assets/spaceship.svg    Player ship artwork
assets/alien.svg        Alien ship artwork
```
