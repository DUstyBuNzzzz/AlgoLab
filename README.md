# AlgoLab

A unified, interactive single-page application merging algorithmic laboratories into one seamless suite:
1. **Path Finder** (Graph Traversal & Shortest Path Heuristics)
2. **Sudoku Solver** (Constraint Satisfaction & Recursive Backtracking)
3. **AI Game Arena** (Minimax & Alpha-Beta Pruning)

---

## 🌟 Quick Start

Launch the unified project with one command:

```bash
npm start
```

This starts a lightweight, zero-dependency local development server and automatically opens **AlgoLab** at `http://localhost:3000`.

Alternatively, you can simply double-click `index.html` or open it in any modern browser without any server or installation.

---

## 📁 Project Structure

```text
AlgoLab/
├── index.html                   # Unified Single-Page Application (Landing Hub + Path Finder + Sudoku Solver)
├── enhance.css                  # Modern UI styling & theme definitions
├── enhance.js                   # Interactive particle canvas & command palette
├── games.js                     # Game Arena with Minimax & Alpha-Beta pruning
├── projects.js                  # Save & Load project state manager
├── server.js                    # Zero-dependency local development server
├── package.json                 # Consolidated scripts (start)
└── README.md                    # Project documentation
```

---

## 🚀 Unified Features & Views

The entire suite runs within [index.html](file:///A:/SEM_5/EAI/Project/AlgoLab/index.html) with fast, responsive tab navigation and URL hash routing:

### 1. Home Hub (`/#home`)
- Landing page with overview of both tools.
- Direct launch cards for **Path Finder** and **Sudoku Solver**.
- Theoretical directory explaining A*, Dijkstra, BFS, and Recursive Backtracking.
- Quick start instructions and feature tags.

### 2. Path Finder (`/#pathfinder`)
- **8 Search Algorithms:**
  - **A\* Search:** Heuristic-driven optimal pathfinding with Manhattan/Euclidean metrics.
  - **Dijkstra's Algorithm:** Classic shortest path guarantee on weighted graphs.
  - **Breadth-First Search (BFS):** Unweighted shortest-path exploration.
  - **Depth-First Search (DFS):** Deep traversal exploration.
  - **Greedy Best-First Search:** Fast heuristic-prioritized search.
  - **Bidirectional BFS:** Dual-ended simultaneous frontier expansion.
  - **Jump Point Search (JPS):** Pruned grid acceleration.
  - **Swarm Algorithm:** Heuristic/Dijkstra hybrid exploration.
- **Dynamic Maze Generation:** Recursive Division, Eller's, Prim's, Spiral, and Random Mazes.
- **Interactive Controls:** Draggable Start & Target nodes, weighted nodes, wall drawing, variable playback speed.
- **Live Statistics & Benchmark Mode:** Head-to-head comparison of all algorithms with runtime and path metrics.

### 3. Sudoku Solver (`/#sudoku`)
- **Recursive Backtracking:** Visualizes depth-first state search across 9×9 grids.
- **Constraint Pruning:** Validates rows, columns, and 3×3 boxes; immediately rollbacks invalid candidate digits.
- **Speed Controls:** 4 configurable playback speeds (Slow, Average, Fast, Fastest).
- **Interactive Editing:** Enter custom puzzles directly on the grid with keyboard navigation.
- **Puzzle Generator:** Generates solvable Sudoku puzzles across 4 difficulty tiers (Easy, Medium, Hard, Expert).
- **Real-Time Telemetry:** Step counter, backtrack rollbacks, board completion %, execution time.
- **Step-by-Step Debugging:** Pause and single-step through recursive tree exploration.

---

## ♿ Design System & Accessibility
- **HTML5 Semantic Structure:** Clean landmark regions (`header`, `nav`, `main`, `section`, `article`, `footer`).
- **8px Grid System:** Consistent spacing throughout the design (`--space-1` through `--space-6`).
- **Prefers Reduced Motion:** Supports `prefers-reduced-motion` to disable animations for motion-sensitive users.
- **Theme Switching:** Dynamic Dark and Light themes driven by CSS variables with persistent `localStorage` preference.

---

## 📜 License
MIT License.

---

## ✨ Enhancement Layer (`enhance.css` + `enhance.js`)
- **Animated graph background** (drifting nodes/edges, theme-aware)
- **Glassmorphism header, gradient buttons, ripple clicks, card spotlight glow, scroll-reveal**
- **Command palette** (`Ctrl/Cmd + K`): jump views, switch algorithm, run, toggle theme
- **Toast notifications** for feedback and success events
- **Sudoku Smart Hint** 💡: finds naked/hidden singles and explains the reasoning (constraint propagation) before you place the digit

## 🎮 Game Arena (`games.js`)
Play **Tic-Tac-Toe** or **Connect-4** against a **Minimax AI with Alpha-Beta pruning**.
- Adjustable search depth, "AI moves first", and an alpha-beta on/off switch
- Live stats: nodes searched, cut-offs, and how many nodes plain minimax would need (e.g. Tic-Tac-Toe first move: 20,865 vs 549,945)
- Score bar for every candidate move; evaluation uses window-based heuristics (Connect-4 also prefers the centre column)
- Tested: Tic-Tac-Toe AI never lost in 150 games vs random play; Connect-4 AI blocks and takes immediate wins

## ✅ Benchmark fixes
- Timings are now the median of 5 runs after a warm-up, so the first algorithm is no longer penalised by JIT compilation
- Added a note explaining why Bellman-Ford explores more cells and why Greedy/DFS may "win" on cells explored without being optimal
