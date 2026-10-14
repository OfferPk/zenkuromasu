/**
 * ZenKuromasu - Core Kuromasu (Kurodoko / 黒どこ) Logic Engine
 * 
 * Rules of Kuromasu:
 * 1. Each cell is either White (open path) or Black (sumi stone).
 * 2. Clue cells are circled numbers and are always White.
 * 3. Each clue indicates the exact number of White cells visible horizontally
 *    and vertically from that cell (including itself). Black cells block sight.
 * 4. No two Black cells may touch orthogonally (share an edge). Diagonal is allowed.
 * 5. All White cells must remain seamlessly connected in a single orthogonal group.
 */

const CELL_EMPTY = 0;
const CELL_BLACK = 1;
const CELL_WHITE = 2;

class KuromasuEngine {
  constructor(width, height, clues = []) {
    this.width = width;
    this.height = height;
    // clues: array of { r, c, val }
    this.clues = clues;
    this.clueMap = new Map();
    for (const clue of clues) {
      this.clueMap.set(`${clue.r},${clue.c}`, clue.val);
    }
    // grid: 2D array [r][c]
    this.grid = Array.from({ length: height }, () => Array(width).fill(CELL_EMPTY));
    // Clue cells are permanently white
    for (const clue of clues) {
      this.grid[clue.r][clue.c] = CELL_WHITE;
    }
  }

  isClue(r, c) {
    return this.clueMap.has(`${r},${c}`);
  }

  getClue(r, c) {
    return this.clueMap.get(`${r},${c}`) || null;
  }

  getCell(r, c) {
    if (r < 0 || r >= this.height || c < 0 || c >= this.width) return null;
    return this.grid[r][c];
  }

  setCell(r, c, state) {
    if (r < 0 || r >= this.height || c < 0 || c >= this.width) return false;
    // Clue cells can never be changed to Black or Empty
    if (this.isClue(r, c)) {
      this.grid[r][c] = CELL_WHITE;
      return false;
    }
    this.grid[r][c] = state;
    return true;
  }

  cycleCell(r, c) {
    if (this.isClue(r, c)) return this.grid[r][c];
    // Cycle: EMPTY (0) -> BLACK (1) -> WHITE (2) -> EMPTY (0)
    const current = this.getCell(r, c);
    const next = (current + 1) % 3;
    this.setCell(r, c, next);
    return next;
  }

  cloneGrid() {
    return this.grid.map(row => [...row]);
  }

  setGrid(newGrid) {
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.isClue(r, c)) {
          this.grid[r][c] = CELL_WHITE;
        } else {
          this.grid[r][c] = newGrid[r][c];
        }
      }
    }
  }

  /**
   * Calculates visibility from (r, c).
   * Sight extends horizontally and vertically until blocked by CELL_BLACK or grid boundaries.
   * By default, treats CELL_EMPTY and CELL_WHITE as visible (transparent).
   */
  getVisibility(r, c, grid = this.grid) {
    if (grid[r][c] === CELL_BLACK) {
      return { up: 0, down: 0, left: 0, right: 0, total: 0, cells: [] };
    }

    const cells = [{ r, c }];
    let up = 0;
    for (let row = r - 1; row >= 0; row--) {
      if (grid[row][c] === CELL_BLACK) break;
      up++;
      cells.push({ r: row, c });
    }

    let down = 0;
    for (let row = r + 1; row < this.height; row++) {
      if (grid[row][c] === CELL_BLACK) break;
      down++;
      cells.push({ r: row, c });
    }

    let left = 0;
    for (let col = c - 1; col >= 0; col--) {
      if (grid[r][col] === CELL_BLACK) break;
      left++;
      cells.push({ r, c: col });
    }

    let right = 0;
    for (let col = c + 1; col < this.width; col++) {
      if (grid[r][col] === CELL_BLACK) break;
      right++;
      cells.push({ r, c: col });
    }

    const total = 1 + up + down + left + right;
    return { up, down, left, right, total, cells };
  }

  /**
   * Calculates guaranteed minimum visibility (only counting confirmed white cells, stopping at EMPTY or BLACK).
   */
  getConfirmedVisibility(r, c, grid = this.grid) {
    if (grid[r][c] !== CELL_WHITE) {
      return { up: 0, down: 0, left: 0, right: 0, total: 0, cells: [] };
    }

    const cells = [{ r, c }];
    let up = 0;
    for (let row = r - 1; row >= 0; row--) {
      if (grid[row][c] !== CELL_WHITE) break;
      up++;
      cells.push({ r: row, c });
    }

    let down = 0;
    for (let row = r + 1; row < this.height; row++) {
      if (grid[row][c] !== CELL_WHITE) break;
      down++;
      cells.push({ r: row, c });
    }

    let left = 0;
    for (let col = c - 1; col >= 0; col--) {
      if (grid[r][col] !== CELL_WHITE) break;
      left++;
      cells.push({ r, c: col });
    }

    let right = 0;
    for (let col = c + 1; col < this.width; col++) {
      if (grid[r][col] !== CELL_WHITE) break;
      right++;
      cells.push({ r, c: col });
    }

    const total = 1 + up + down + left + right;
    return { up, down, left, right, total, cells };
  }

  /**
   * Check for any orthogonally adjacent black cells.
   */
  checkNoAdjacentBlack(grid = this.grid) {
    const conflicts = [];
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (grid[r][c] === CELL_BLACK) {
          // Check right
          if (c + 1 < this.width && grid[r][c + 1] === CELL_BLACK) {
            conflicts.push({ r1: r, c1: c, r2: r, c2: c + 1 });
          }
          // Check down
          if (r + 1 < this.height && grid[r + 1][c] === CELL_BLACK) {
            conflicts.push({ r1: r, c1: c, r2: r + 1, c2: c });
          }
        }
      }
    }
    return { valid: conflicts.length === 0, conflicts };
  }

  /**
   * Check if all non-black cells form a single connected component.
   */
  checkWhiteConnectivity(grid = this.grid) {
    // Find first non-black cell
    let start = null;
    let totalNonBlack = 0;
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (grid[r][c] !== CELL_BLACK) {
          totalNonBlack++;
          if (!start) start = { r, c };
        }
      }
    }

    if (totalNonBlack === 0) return { connected: true, count: 0, total: 0 };

    const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    const queue = [start];
    visited[start.r][start.c] = true;
    let reachableCount = 0;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      reachableCount++;

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
          if (!visited[nr][nc] && grid[nr][nc] !== CELL_BLACK) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }

    return {
      connected: reachableCount === totalNonBlack,
      count: reachableCount,
      total: totalNonBlack
    };
  }

  /**
   * Check clue status: satisfied, under, or over.
   */
  getClueStatuses(grid = this.grid) {
    const statuses = [];
    for (const clue of this.clues) {
      const vis = this.getVisibility(clue.r, clue.c, grid);
      const conf = this.getConfirmedVisibility(clue.r, clue.c, grid);
      const target = clue.val;
      
      let state = 'under';
      if (vis.total === target) {
        state = 'satisfied';
      } else if (vis.total < target) {
        state = 'under';
      } else {
        // vis.total > target
        state = 'over';
      }

      statuses.push({
        r: clue.r,
        c: clue.c,
        target,
        current: vis.total,
        confirmed: conf.total,
        state,
        cells: vis.cells
      });
    }
    return statuses;
  }

  /**
   * Full validation of the current board state.
   */
  validate(grid = this.grid) {
    const errors = [];
    const adj = this.checkNoAdjacentBlack(grid);
    if (!adj.valid) {
      errors.push('Adjacent black stones are not allowed.');
    }

    const conn = this.checkWhiteConnectivity(grid);
    if (!conn.connected) {
      errors.push('White cells must form a single connected path.');
    }

    let allCluesSatisfied = true;
    const clueStatuses = this.getClueStatuses(grid);
    for (const st of clueStatuses) {
      if (st.current !== st.target) {
        allCluesSatisfied = false;
        errors.push(`Clue ${st.target} at (${st.r + 1}, ${st.c + 1}) sees ${st.current} cells.`);
      }
    }

    // Check if any empty cells remain
    let hasEmpty = false;
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (grid[r][c] === CELL_EMPTY) {
          hasEmpty = true;
          break;
        }
      }
      if (hasEmpty) break;
    }

    const isComplete = !hasEmpty && adj.valid && conn.connected && allCluesSatisfied;
    const isValid = adj.valid && conn.connected;

    return {
      isComplete,
      isValid,
      hasEmpty,
      allCluesSatisfied,
      errors,
      clueStatuses
    };
  }

  /**
   * Deductive Hint Engine
   * Finds the next logical deduction with human-readable explanation.
   */
  getHint(grid = this.grid) {
    // 1. Check for immediate error states first
    const adj = this.checkNoAdjacentBlack(grid);
    if (!adj.valid) {
      const c = adj.conflicts[0];
      return {
        type: 'error',
        r: c.r2,
        c: c.c2,
        message: `Two black stones touch at (${c.r1 + 1}, ${c.c1 + 1}) and (${c.r2 + 1}, ${c.c2 + 1}). Remove one stone.`,
        suggestedState: CELL_EMPTY
      };
    }

    // 2. Rule: Any cell orthogonally adjacent to a black stone MUST be white
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (grid[r][c] === CELL_BLACK) {
          const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
          for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
              if (grid[nr][nc] === CELL_EMPTY) {
                return {
                  type: 'adjacent_to_black',
                  r: nr,
                  c: nc,
                  message: `Cells adjacent to a black stone must be open white paths. Mark (${nr + 1}, ${nc + 1}) with a white dot.`,
                  suggestedState: CELL_WHITE
                };
              }
            }
          }
        }
      }
    }

    // 3. Rule: Clue sightline exact satisfaction -> cell immediately beyond ray must be BLACK
    for (const clue of this.clues) {
      const conf = this.getConfirmedVisibility(clue.r, clue.c, grid);
      if (conf.total === clue.val) {
        // Any empty cell adjacent to the confirmed ray must be black to prevent over-extension
        const dirs = [
          { r: clue.r - conf.up - 1, c: clue.c },
          { r: clue.r + conf.down + 1, c: clue.c },
          { r: clue.r, c: clue.c - conf.left - 1 },
          { r: clue.r, c: clue.c + conf.right + 1 }
        ];
        for (const pos of dirs) {
          if (pos.r >= 0 && pos.r < this.height && pos.c >= 0 && pos.c < this.width) {
            if (grid[pos.r][pos.c] === CELL_EMPTY) {
              return {
                type: 'clue_boundary',
                r: pos.r,
                c: pos.c,
                message: `Clue ${clue.val} at (${clue.r + 1}, ${clue.c + 1}) already has its required sightline. Cell (${pos.r + 1}, ${pos.c + 1}) must be a black stone to close the ray.`,
                suggestedState: CELL_BLACK
              };
            }
          }
        }
      }
    }

    // 4. Rule: Max visibility reachability requirement
    // If a clue's max visibility minus one ray's extension is less than the target,
    // cells in that ray must be white!
    for (const clue of this.clues) {
      const vis = this.getVisibility(clue.r, clue.c, grid);
      if (vis.total > clue.val) {
        const slack = vis.total - clue.val;
        const arms = [
          { dir: 'up', len: vis.up, getPos: (d) => ({ r: clue.r - d, c: clue.c }) },
          { dir: 'down', len: vis.down, getPos: (d) => ({ r: clue.r + d, c: clue.c }) },
          { dir: 'left', len: vis.left, getPos: (d) => ({ r: clue.r, c: clue.c - d }) },
          { dir: 'right', len: vis.right, getPos: (d) => ({ r: clue.r, c: clue.c + d }) }
        ];

        for (const arm of arms) {
          // If this arm has length > slack, cells beyond `slack` MUST be white!
          // because cutting them off would reduce the ray by more than slack
          for (let d = slack + 1; d <= arm.len; d++) {
            const pos = arm.getPos(d);
            if (grid[pos.r][pos.c] === CELL_EMPTY) {
              return {
                type: 'sightline_reach',
                r: pos.r,
                c: pos.c,
                message: `Clue ${clue.val} at (${clue.r + 1}, ${clue.c + 1}) needs to reach at least ${clue.val} cells. Cell (${pos.r + 1}, ${pos.c + 1}) must be white.`,
                suggestedState: CELL_WHITE
              };
            }
          }
        }
      }
    }

    // 5. Rule: Connectivity bottleneck
    // If setting an empty cell to BLACK would disconnect the white cells, it MUST be WHITE!
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (grid[r][c] === CELL_EMPTY) {
          grid[r][c] = CELL_BLACK;
          const conn = this.checkWhiteConnectivity(grid);
          grid[r][c] = CELL_EMPTY;
          if (!conn.connected) {
            return {
              type: 'connectivity_bridge',
              r,
              c,
              message: `Placing a black stone at (${r + 1}, ${c + 1}) would disconnect white paths. It must be a white dot.`,
              suggestedState: CELL_WHITE
            };
          }
        }
      }
    }

    // 6. Fallback: Solver comparison
    const solution = KuromasuEngine.solve(this.width, this.height, this.clues);
    if (solution) {
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          if (grid[r][c] === CELL_EMPTY) {
            const solState = solution[r][c];
            const stateName = solState === CELL_BLACK ? 'black stone' : 'white dot';
            return {
              type: 'deduction',
              r,
              c,
              message: `By logical elimination, cell (${r + 1}, ${c + 1}) must be a ${stateName}.`,
              suggestedState: solState
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Static Exhaustive Solver
   * Solves Kuromasu with constraint propagation & backtracking.
   * Returns 2D grid array if a unique solution exists, or null.
   */
  static solve(width, height, clues, maxSolutions = 2) {
    const grid = Array.from({ length: height }, () => Array(width).fill(CELL_EMPTY));
    const clueMap = new Map();
    for (const clue of clues) {
      clueMap.set(`${clue.r},${clue.c}`, clue.val);
      grid[clue.r][clue.c] = CELL_WHITE;
    }

    const solutions = [];

    function canBeBlack(r, c, currentGrid) {
      if (clueMap.has(`${r},${c}`)) return false;
      // No adjacent black cells
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
          if (currentGrid[nr][nc] === CELL_BLACK) return false;
        }
      }
      return true;
    }

    function propagate(currentGrid) {
      let changed = true;
      while (changed) {
        changed = false;

        // 1. Orthogonal neighbors of black cells must be white
        for (let r = 0; r < height; r++) {
          for (let c = 0; c < width; c++) {
            if (currentGrid[r][c] === CELL_BLACK) {
              const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
              for (const [dr, dc] of dirs) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
                  if (currentGrid[nr][nc] === CELL_EMPTY) {
                    currentGrid[nr][nc] = CELL_WHITE;
                    changed = true;
                  }
                }
              }
            }
          }
        }

        // 2. Clue constraint checks
        for (const clue of clues) {
          // Max possible visibility (counting EMPTY as white)
          let maxVis = 1;
          for (let row = clue.r - 1; row >= 0 && currentGrid[row][clue.c] !== CELL_BLACK; row--) maxVis++;
          for (let row = clue.r + 1; row < height && currentGrid[row][clue.c] !== CELL_BLACK; row++) maxVis++;
          for (let col = clue.c - 1; col >= 0 && currentGrid[clue.r][col] !== CELL_BLACK; col--) maxVis++;
          for (let col = clue.c + 1; col < width && currentGrid[clue.r][col] !== CELL_BLACK; col++) maxVis++;

          if (maxVis < clue.val) return false; // UNSAT: cannot reach target

          // Min confirmed visibility (only counting confirmed WHITE)
          let minVis = 1;
          let upW = 0, downW = 0, leftW = 0, rightW = 0;
          for (let row = clue.r - 1; row >= 0 && currentGrid[row][clue.c] === CELL_WHITE; row--) { minVis++; upW++; }
          for (let row = clue.r + 1; row < height && currentGrid[row][clue.c] === CELL_WHITE; row++) { minVis++; downW++; }
          for (let col = clue.c - 1; col >= 0 && currentGrid[clue.r][col] === CELL_WHITE; col--) { minVis++; leftW++; }
          for (let col = clue.c + 1; col < width && currentGrid[clue.r][col] === CELL_WHITE; col++) { minVis++; rightW++; }

          if (minVis > clue.val) return false; // UNSAT: already exceeded target

          // If min confirmed equals clue value, boundary cells must be black
          if (minVis === clue.val) {
            const ends = [
              { r: clue.r - upW - 1, c: clue.c },
              { r: clue.r + downW + 1, c: clue.c },
              { r: clue.r, c: clue.c - leftW - 1 },
              { r: clue.r, c: clue.c + rightW + 1 }
            ];
            for (const pos of ends) {
              if (pos.r >= 0 && pos.r < height && pos.c >= 0 && pos.c < width) {
                if (currentGrid[pos.r][pos.c] === CELL_EMPTY) {
                  if (!canBeBlack(pos.r, pos.c, currentGrid)) return false;
                  currentGrid[pos.r][pos.c] = CELL_BLACK;
                  changed = true;
                }
              }
            }
          }
        }
      }
      return true;
    }

    function search(r, c, currentGrid) {
      if (solutions.length >= maxSolutions) return;

      // Find next empty cell
      let nextR = -1, nextC = -1;
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          if (currentGrid[row][col] === CELL_EMPTY) {
            nextR = row;
            nextC = col;
            break;
          }
        }
        if (nextR !== -1) break;
      }

      // If no empty cells left, verify solution
      if (nextR === -1) {
        // Validate connectivity
        const engine = new KuromasuEngine(width, height, clues);
        const conn = engine.checkWhiteConnectivity(currentGrid);
        if (!conn.connected) return;

        // Validate all clues
        for (const clue of clues) {
          const vis = engine.getVisibility(clue.r, clue.c, currentGrid);
          if (vis.total !== clue.val) return;
        }

        solutions.push(currentGrid.map(row => [...row]));
        return;
      }

      // Try CELL_WHITE
      {
        const copyGrid = currentGrid.map(row => [...row]);
        copyGrid[nextR][nextC] = CELL_WHITE;
        if (propagate(copyGrid)) {
          search(nextR, nextC, copyGrid);
        }
      }

      // Try CELL_BLACK (if allowed)
      if (canBeBlack(nextR, nextC, currentGrid)) {
        const copyGrid = currentGrid.map(row => [...row]);
        copyGrid[nextR][nextC] = CELL_BLACK;
        if (propagate(copyGrid)) {
          // Check white connectivity quick-fail: ensure non-black cells still form single group
          const engine = new KuromasuEngine(width, height, clues);
          const conn = engine.checkWhiteConnectivity(copyGrid);
          if (conn.connected) {
            search(nextR, nextC, copyGrid);
          }
        }
      }
    }

    // Initial propagation
    if (!propagate(grid)) return null;
    search(0, 0, grid);

    if (solutions.length === 1) {
      return solutions[0];
    }
    return solutions.length > 0 ? solutions[0] : null;
  }
}

// Support both CommonJS (Node.js tests) and browser ES/global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    KuromasuEngine,
    CELL_EMPTY,
    CELL_BLACK,
    CELL_WHITE
  };
}
