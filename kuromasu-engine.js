/**
 * ZenKuromasu: Kuromasu / Kurodoko Logic Engine
 * Pure logic engine for Kuromasu (黒どこ / Where is Black)
 *
 * Rules:
 * 1. Number clue indicates the total number of white cells seen horizontally
 *    and vertically from that cell, including itself.
 * 2. Black stones cannot be orthogonally adjacent (diagonal is allowed).
 * 3. All white cells must form a single, contiguous orthogonal group.
 * 4. Numbered cells are permanently white.
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.KuromasuEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Cell States:
  // 0: EMPTY (unshaded, unconfirmed)
  // 1: BLACK (shaded sumi ink stone)
  // 2: WHITE (confirmed white garden dot)
  const CELL_EMPTY = 0;
  const CELL_BLACK = 1;
  const CELL_WHITE = 2;

  /**
   * Create initial game state from a level definition.
   */
  function createGameState(level) {
    const grid = Array.from({ length: level.height }, () => Array(level.width).fill(CELL_EMPTY));

    // Numbered clues are permanently white
    level.clues.forEach(clue => {
      grid[clue.r][clue.c] = CELL_WHITE;
    });

    return {
      levelId: level.id,
      width: level.width,
      height: level.height,
      clues: level.clues.map(c => ({ r: c.r, c: c.c, val: c.val })),
      grid,
      history: []
    };
  }

  /**
   * Check if a coordinate contains a permanent number clue.
   */
  function isClue(level, r, c) {
    return level.clues.some(clue => clue.r === r && clue.c === c);
  }

  /**
   * Cycle cell state: EMPTY -> BLACK -> WHITE -> EMPTY.
   * Clue cells cannot be modified.
   */
  function cycleCell(state, level, r, c) {
    if (isClue(level, r, c)) return false;

    state.history.push(JSON.parse(JSON.stringify(state.grid)));

    const current = state.grid[r][c];
    if (current === CELL_EMPTY) {
      state.grid[r][c] = CELL_BLACK;
    } else if (current === CELL_BLACK) {
      state.grid[r][c] = CELL_WHITE;
    } else {
      state.grid[r][c] = CELL_EMPTY;
    }

    return true;
  }

  /**
   * Set cell state directly (for mode toggle or touch tools).
   */
  function setCell(state, level, r, c, targetState) {
    if (isClue(level, r, c)) return false;
    if (state.grid[r][c] === targetState) {
      // Toggle off to empty if clicked again
      return setCell(state, level, r, c, CELL_EMPTY);
    }

    state.history.push(JSON.parse(JSON.stringify(state.grid)));
    state.grid[r][c] = targetState;
    return true;
  }

  /**
   * Undo last player action.
   */
  function undo(state) {
    if (!state.history || state.history.length === 0) return false;
    state.grid = state.history.pop();
    return true;
  }

  /**
   * Reset board to initial clue-only state.
   */
  function resetBoard(state, level) {
    state.history.push(JSON.parse(JSON.stringify(state.grid)));
    for (let r = 0; r < level.height; r++) {
      for (let c = 0; c < level.width; c++) {
        state.grid[r][c] = isClue(level, r, c) ? CELL_WHITE : CELL_EMPTY;
      }
    }
    return true;
  }

  /**
   * Calculate line-of-sight visibility for a clue (r, c).
   * Returns:
   *   current: number of white/empty cells seen until blocked by a BLACK stone or board edge
   *   confirmed: number of confirmed white cells seen before first unconfirmed/black cell
   *   raycast: { up, down, left, right } ranges
   */
  function getSightline(grid, width, height, r, c) {
    let count = 1; // Count itself
    const rays = { up: [], down: [], left: [], right: [] };

    // UP
    for (let row = r - 1; row >= 0; row--) {
      if (grid[row][c] === CELL_BLACK) break;
      rays.up.push({ r: row, c });
      count++;
    }

    // DOWN
    for (let row = r + 1; row < height; row++) {
      if (grid[row][c] === CELL_BLACK) break;
      rays.down.push({ r: row, c });
      count++;
    }

    // LEFT
    for (let col = c - 1; col >= 0; col--) {
      if (grid[r][col] === CELL_BLACK) break;
      rays.left.push({ r, c: col });
      count++;
    }

    // RIGHT
    for (let col = c + 1; col < width; col++) {
      if (grid[r][col] === CELL_BLACK) break;
      rays.right.push({ r, c: col });
      count++;
    }

    return {
      count,
      rays,
      allSeenCells: [{ r, c }, ...rays.up, ...rays.down, ...rays.left, ...rays.right]
    };
  }

  /**
   * Check if any black stones are orthogonally adjacent.
   * Returns array of conflicting coordinate pairs [{ r1, c1, r2, c2 }].
   */
  function getAdjacentBlackConflicts(grid, width, height) {
    const conflicts = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c] === CELL_BLACK) {
          // Check right
          if (c + 1 < width && grid[r][c + 1] === CELL_BLACK) {
            conflicts.push({ r1: r, c1: c, r2: r, c2: c + 1 });
          }
          // Check down
          if (r + 1 < height && grid[r + 1][c] === CELL_BLACK) {
            conflicts.push({ r1: r, c1: c, r2: r + 1, c2: c });
          }
        }
      }
    }
    return conflicts;
  }

  /**
   * Check if all non-black cells form a single, contiguous orthogonal group.
   * Returns { connected: boolean, componentCount: number, unreachableCells: [] }
   */
  function checkWhiteConnectivity(grid, width, height) {
    const nonBlackCells = [];
    let startCell = null;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c] !== CELL_BLACK) {
          nonBlackCells.push({ r, c });
          if (!startCell) startCell = { r, c };
        }
      }
    }

    if (nonBlackCells.length === 0) {
      return { connected: false, componentCount: 0, unreachableCells: [] };
    }

    // BFS from startCell
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const queue = [startCell];
    visited[startCell.r][startCell.c] = true;
    let visitedCount = 0;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      visitedCount++;

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
          if (!visited[nr][nc] && grid[nr][nc] !== CELL_BLACK) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }

    const connected = visitedCount === nonBlackCells.length;
    const unreachableCells = connected ? [] : nonBlackCells.filter(cell => !visited[cell.r][cell.c]);

    return {
      connected,
      visitedCount,
      totalWhite: nonBlackCells.length,
      unreachableCells
    };
  }

  /**
   * Evaluate full board state: clues satisfied, black adjacency, white connectivity, win status.
   */
  function checkBoardState(gridOrState, level) {
    let grid, width, height, clues;
    if (gridOrState.grid) {
      grid = gridOrState.grid;
      width = gridOrState.width;
      height = gridOrState.height;
      clues = gridOrState.clues;
    } else {
      grid = gridOrState;
      width = level.width;
      height = level.height;
      clues = level.clues;
    }

    let satisfiedClues = 0;
    const clueEvaluations = [];

    clues.forEach(clue => {
      const sight = getSightline(grid, width, height, clue.r, clue.c);
      const isSatisfied = sight.count === clue.val;
      const isViolated = sight.count < clue.val; // can never increase if already under

      if (isSatisfied) satisfiedClues++;

      clueEvaluations.push({
        clue,
        seenCount: sight.count,
        targetVal: clue.val,
        status: isSatisfied ? 'SATISFIED' : (isViolated ? 'VIOLATED' : 'PENDING'),
        rays: sight.rays,
        allSeenCells: sight.allSeenCells
      });
    });

    const blackConflicts = getAdjacentBlackConflicts(grid, width, height);
    const noAdjacentBlacks = blackConflicts.length === 0;

    const connectivity = checkWhiteConnectivity(grid, width, height);
    const whiteConnected = connectivity.connected;

    // Check if any empty cells remain
    let emptyCount = 0;
    let blackCount = 0;
    let whiteCount = 0;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c] === CELL_EMPTY) emptyCount++;
        else if (grid[r][c] === CELL_BLACK) blackCount++;
        else if (grid[r][c] === CELL_WHITE) whiteCount++;
      }
    }

    const allCluesSatisfied = satisfiedClues === clues.length;
    const isSolved = allCluesSatisfied && noAdjacentBlacks && whiteConnected;

    return {
      solved: isSolved,
      isSolved,
      satisfiedClues,
      totalClues: clues.length,
      clueEvaluations,
      noAdjacentBlacks,
      blackConflicts,
      whiteConnected,
      unreachableCells: connectivity.unreachableCells,
      blackCount,
      whiteCount,
      emptyCount
    };
  }

  /**
   * Smart deductive hint engine.
   * Finds forced moves based on Kuromasu constraints:
   * 1. Black adjacency: cells adjacent to a placed black stone MUST be white.
   * 2. Sightline overflow: if a clue sees more than its target, a black stone must be placed.
   * 3. Sightline underflow: if a clue cannot reach its target without opening black cells.
   * 4. Connectivity bottleneck: if turning an unshaded cell black would disconnect the white path.
   */
  function getDeductiveHint(state, level) {
    const grid = state.grid;
    const { width, height, clues } = level;

    // 1. Critical Errors Check: Adjacent Black Stones
    const blackConflicts = getAdjacentBlackConflicts(grid, width, height);
    if (blackConflicts.length > 0) {
      const c = blackConflicts[0];
      return {
        type: 'error',
        title: 'Adjacent Black Stones',
        message: `Two black stones touch at row ${c.r1 + 1}, col ${c.c1 + 1}. Black stones cannot be orthogonally adjacent.`,
        highlight: [{ r: c.r1, c: c.c1 }, { r: c.r2, c: c.c2 }]
      };
    }

    // 2. Critical Errors Check: Disconnected White Cells
    const connectivity = checkWhiteConnectivity(grid, width, height);
    if (!connectivity.connected && connectivity.unreachableCells.length > 0) {
      const u = connectivity.unreachableCells[0];
      return {
        type: 'error',
        title: 'Disconnected Path',
        message: `White cells are disconnected from the garden path. Cell at row ${u.r + 1}, col ${u.c + 1} is isolated.`,
        highlight: connectivity.unreachableCells.slice(0, 3)
      };
    }

    // 3. Forced Whites: Cells next to Black stones must be White
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c] === CELL_BLACK) {
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
              if (grid[nr][nc] === CELL_EMPTY) {
                return {
                  type: 'forced_white',
                  title: 'Adjacent to Black Stone',
                  message: `The cell at row ${nr + 1}, col ${nc + 1} touches a black stone orthogonally, so it must be White.`,
                  highlight: [{ r: nr, c: nc }]
                };
              }
            }
          }
        }
      }
    }

    // 4. Clue sightline bounds deduction
    for (const clue of clues) {
      const sight = getSightline(grid, width, height, clue.r, clue.c);

      // If sightline already equals clue value, all outer cells directly extending the rays MUST be black!
      if (sight.count === clue.val) {
        // Check if any ray could still expand if an empty cell is converted to white
        // e.g. the cell immediately beyond the ray if it's empty
        const boundaryCandidates = [];
        // Check end of UP ray
        const upRow = clue.r - sight.rays.up.length - 1;
        if (upRow >= 0 && grid[upRow][clue.c] === CELL_EMPTY) {
          boundaryCandidates.push({ r: upRow, c: clue.c });
        }
        // Check end of DOWN ray
        const downRow = clue.r + sight.rays.down.length + 1;
        if (downRow < height && grid[downRow][clue.c] === CELL_EMPTY) {
          boundaryCandidates.push({ r: downRow, c: clue.c });
        }
        // Check end of LEFT ray
        const leftCol = clue.c - sight.rays.left.length - 1;
        if (leftCol >= 0 && grid[clue.r][leftCol] === CELL_EMPTY) {
          boundaryCandidates.push({ r: clue.r, c: leftCol });
        }
        // Check end of RIGHT ray
        const rightCol = clue.c + sight.rays.right.length + 1;
        if (rightCol < width && grid[clue.r][rightCol] === CELL_EMPTY) {
          boundaryCandidates.push({ r: clue.r, c: rightCol });
        }

        if (boundaryCandidates.length > 0) {
          const cand = boundaryCandidates[0];
          return {
            type: 'forced_black',
            title: 'Sightline Satisfied',
            message: `Clue ${clue.val} at row ${clue.r + 1}, col ${clue.c + 1} sees its full target. Cell at row ${cand.r + 1}, col ${cand.c + 1} must be Black to cap the ray.`,
            highlight: [cand, { r: clue.r, c: clue.c }]
          };
        }
      }

      // If sightline is too big, check if a distant cell must be black
      if (sight.count > clue.val) {
        const overflow = sight.count - clue.val;
        // The cell at distance >= clue.val along any arm MUST be black
        const arms = [
          { name: 'up', cells: sight.rays.up },
          { name: 'down', cells: sight.rays.down },
          { name: 'left', cells: sight.rays.left },
          { name: 'right', cells: sight.rays.right }
        ];

        for (const arm of arms) {
          if (arm.cells.length >= clue.val) {
            const farCell = arm.cells[clue.val - 1];
            if (grid[farCell.r][farCell.c] === CELL_EMPTY) {
              return {
                type: 'forced_black',
                title: 'Sightline Overflow',
                message: `Clue ${clue.val} at row ${clue.r + 1}, col ${clue.c + 1} cannot see past distance ${clue.val}. Cell at row ${farCell.r + 1}, col ${farCell.c + 1} must be Black.`,
                highlight: [farCell, { r: clue.r, c: clue.c }]
              };
            }
          }
        }
      }
    }

    // 5. Connectivity bridge check: if turning empty cell black disconnects, it must be white
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c] === CELL_EMPTY && !isClue(level, r, c)) {
          // Temporarily test black
          grid[r][c] = CELL_BLACK;
          const testConn = checkWhiteConnectivity(grid, width, height);
          grid[r][c] = CELL_EMPTY;

          if (!testConn.connected) {
            return {
              type: 'forced_white',
              title: 'Connectivity Bottleneck',
              message: `Cell at row ${r + 1}, col ${c + 1} is a crucial bridge. Placing a black stone here would disconnect the white garden path!`,
              highlight: [{ r, c }]
            };
          }
        }
      }
    }

    return {
      type: 'general',
      title: 'Mindful Observation',
      message: 'Observe each numbered clue. Balance white sightlines with dark sumi ink stones.',
      highlight: []
    };
  }

  /**
   * Backtracking solver to verify unique solvability.
   * Returns { solvable: boolean, unique: boolean, solution: grid, count: number }
   */
  function solveLevel(level, maxSolutions = 2) {
    const { width, height, clues } = level;
    const grid = Array.from({ length: height }, () => Array(width).fill(CELL_EMPTY));

    // Permanently fix clues to white
    clues.forEach(c => {
      grid[c.r][c.c] = CELL_WHITE;
    });

    const nonClueCells = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (!isClue(level, r, c)) {
          nonClueCells.push({ r, c });
        }
      }
    }

    const solutions = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    function isValidPartial(r, c, val) {
      // If black, cannot touch another black
      if (val === CELL_BLACK) {
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
            if (grid[nr][nc] === CELL_BLACK) return false;
          }
        }
      }

      // Check all clues affected by this cell
      for (const clue of clues) {
        if (clue.r === r || clue.c === c) {
          const sight = getSightline(grid, width, height, clue.r, clue.c);
          // Sightline count cannot be less than clue value if all cells on that ray are decided
          // In partial state, empty cells still count as visible, so sight.count is the MAXIMUM possible
          if (sight.count < clue.val) return false;
        }
      }

      return true;
    }

    function search(index) {
      if (solutions.length >= maxSolutions) return;

      if (index === nonClueCells.length) {
        // Final check
        const boardCheck = checkBoardState(grid, level);
        if (boardCheck.solved) {
          solutions.push(JSON.parse(JSON.stringify(grid)));
        }
        return;
      }

      const { r, c } = nonClueCells[index];

      // Try WHITE first (statistically most cells are white)
      grid[r][c] = CELL_WHITE;
      if (isValidPartial(r, c, CELL_WHITE)) {
        search(index + 1);
      }

      // Try BLACK
      grid[r][c] = CELL_BLACK;
      if (isValidPartial(r, c, CELL_BLACK)) {
        search(index + 1);
      }

      // Backtrack
      grid[r][c] = CELL_EMPTY;
    }

    search(0);

    return {
      solvable: solutions.length > 0,
      unique: solutions.length === 1,
      count: solutions.length,
      solution: solutions[0] || null
    };
  }

  return {
    CELL_EMPTY,
    CELL_BLACK,
    CELL_WHITE,
    createGameState,
    isClue,
    cycleCell,
    setCell,
    undo,
    resetBoard,
    getSightline,
    getAdjacentBlackConflicts,
    checkWhiteConnectivity,
    checkBoardState,
    getDeductiveHint,
    solveLevel
  };
});
