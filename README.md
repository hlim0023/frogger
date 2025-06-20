# 🐸 Frogger Game

A TypeScript-powered browser game inspired by the classic arcade game *Frogger*. Navigate the frog from the bottom of the screen to the top while avoiding obstacles and managing your score, lives, and levels.

## 🎮 Gameplay Overview

The player controls a frog using keyboard inputs (`W`, `A`, `S`, `D`) to move up, left, down, and right respectively. The objective is to reach the destination zone at the top of the screen while avoiding hazards and progressing through levels.

### Features

- **Dynamic Score and Level System**  
  Tracks current score, highest score, and level progression.

- **Life Management**  
  Players start with 5 lives. Collisions or falling off the screen reduce lives.

- **Game Reset**  
  Press `'r'` at any time to reset the game.

- **UI Elements**  
  SVG-based rendering includes start zone, middle zone, destination, and the frog character.

- **Stylized Design**  
  Clean interface using CSS with SVG canvas rendering for game elements.

## 🧑‍💻 Tech Stack

- **TypeScript** – Game logic and reactive interactions.
- **HTML5 & SVG** – Structuring and rendering game visuals.
- **CSS** – Styling of text and layout.

## 📂 Project Structure
.
├── index.html # Main game HTML structure
├── style.css # Styles for UI and SVG canvas
├── frog.ts # TypeScript game logic


## 🚀 Getting Started

1. **Clone the repository** (or download the files):
   ```bash
   git clone https://github.com/your-username/frogger-game.git
   cd frogger-game
   
tsc frog.ts
