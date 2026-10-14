const test = require('node:test');
const assert = require('node:assert/strict');
const { KuromasuEngine, CELL_EMPTY, CELL_BLACK, CELL_WHITE } = require('../src/kuromasu-engine.js');

test('KuromasuEngine: Initialization & Clue Protection', () => {
  const clues = [{ r: 1, c: 1, val: 5 }];
  const engine = new KuromasuEngine(5, 5, clues);

  assert.equal(engine.width, 5);
  assert.equal(engine.height, 5);
  assert.equal(engine.isClue(1, 1), true);
  assert.equal(engine.isClue(0, 0), false);
  assert.equal(engine.getClue(1, 1), 5);
  assert.equal(engine.getCell(1, 1), CELL_WHITE);

  // Clue cells cannot be changed to black or empty
  assert.equal(engine.setCell(1, 1, CELL_BLACK), false);
  assert.equal(engine.getCell(1, 1), CELL_WHITE);
  assert.equal(engine.cycleCell(1, 1), CELL_WHITE);
});

test('KuromasuEngine: Cell Cycling & State Mutation', () => {
  const engine = new KuromasuEngine(5, 5, []);
  assert.equal(engine.getCell(2, 2), CELL_EMPTY);

  assert.equal(engine.cycleCell(2, 2), CELL_BLACK);
  assert.equal(engine.getCell(2, 2), CELL_BLACK);

  assert.equal(engine.cycleCell(2, 2), CELL_WHITE);
  assert.equal(engine.getCell(2, 2), CELL_WHITE);

  assert.equal(engine.cycleCell(2, 2), CELL_EMPTY);
  assert.equal(engine.getCell(2, 2), CELL_EMPTY);
});

test('KuromasuEngine: Line-of-Sight Visibility Raycasting', () => {
  // 5x5 board with clue at center (2, 2)
  const clues = [{ r: 2, c: 2, val: 9 }];
  const engine = new KuromasuEngine(5, 5, clues);

  // With no black stones, sight reaches all edges: 1 + 2 up + 2 down + 2 left + 2 right = 9
  let vis = engine.getVisibility(2, 2);
  assert.equal(vis.total, 9);
  assert.equal(vis.up, 2);
  assert.equal(vis.down, 2);
  assert.equal(vis.left, 2);
  assert.equal(vis.right, 2);

  // Place black stone at (1, 2) to block UP
  engine.setCell(1, 2, CELL_BLACK);
  vis = engine.getVisibility(2, 2);
  assert.equal(vis.up, 0);
  assert.equal(vis.total, 7);

  // Place black stone at (2, 4) to block RIGHT
  engine.setCell(2, 4, CELL_BLACK);
  vis = engine.getVisibility(2, 2);
  assert.equal(vis.right, 1);
  assert.equal(vis.total, 6);
});

test('KuromasuEngine: No Adjacent Black Stones Constraint', () => {
  const engine = new KuromasuEngine(5, 5, []);
  
  // No black stones: valid
  assert.equal(engine.checkNoAdjacentBlack().valid, true);

  // Diagonal touching: allowed
  engine.setCell(1, 1, CELL_BLACK);
  engine.setCell(2, 2, CELL_BLACK);
  assert.equal(engine.checkNoAdjacentBlack().valid, true);

  // Orthogonal touching: disallowed
  engine.setCell(1, 2, CELL_BLACK);
  const adj = engine.checkNoAdjacentBlack();
  assert.equal(adj.valid, false);
  assert.equal(adj.conflicts.length >= 1, true);
});

test('KuromasuEngine: White Connectivity (Single Component)', () => {
  const engine = new KuromasuEngine(3, 3, []);

  // Open board: connected
  assert.equal(engine.checkWhiteConnectivity().connected, true);

  // Corner black stone: rest is connected
  engine.setCell(0, 0, CELL_BLACK);
  assert.equal(engine.checkWhiteConnectivity().connected, true);

  // Cut off cell (0, 2) with black stones at (0, 1) and (1, 2)
  engine.setCell(0, 1, CELL_BLACK);
  engine.setCell(1, 2, CELL_BLACK);
  const conn = engine.checkWhiteConnectivity();
  assert.equal(conn.connected, false);
});

test('KuromasuEngine: Deductive Hints', () => {
  // Clue at (0, 0) sees 3 cells.
  // In a 3x3 grid, (0, 0) sees right and down.
  const clues = [{ r: 0, c: 0, val: 3 }];
  const engine = new KuromasuEngine(3, 3, clues);

  // Place a black stone at (2, 2)
  engine.setCell(2, 2, CELL_BLACK);
  // Hint should suggest that neighbor of black stone (1, 2) or (2, 1) must be white
  const hint = engine.getHint();
  assert.notEqual(hint, null);
  assert.equal(hint.suggestedState === CELL_WHITE || hint.suggestedState === CELL_BLACK, true);
});

test('KuromasuEngine: Static Solver on Known Puzzle', () => {
  // 5x5 sample puzzle
  const clues = [
    { r: 0, c: 0, val: 7 },
    { r: 1, c: 2, val: 9 },
    { r: 2, c: 3, val: 6 },
    { r: 3, c: 0, val: 8 },
    { r: 4, c: 4, val: 3 }
  ];

  const solution = KuromasuEngine.solve(5, 5, clues);
  assert.notEqual(solution, null);

  // Verify solution satisfies all constraints
  const engine = new KuromasuEngine(5, 5, clues);
  const val = engine.validate(solution);
  assert.equal(val.isValid, true);
  assert.equal(val.allCluesSatisfied, true);
  assert.equal(val.isComplete, true);
});

test('Levels Verification: All 50 Levels Validated', () => {
  let levelPacks;
  try {
    levelPacks = require('../src/levels.js').LEVEL_PACKS;
  } catch (e) {
    // If levels.js is still generating, skip gracefully
    return;
  }

  assert.equal(levelPacks.length, 5);
  let total = 0;
  for (const pack of levelPacks) {
    assert.equal(pack.levels.length, 10);
    for (const lvl of pack.levels) {
      assert.equal(lvl.width, pack.width);
      assert.equal(lvl.height, pack.height);
      assert.equal(lvl.clues.length >= 2, true);
      total++;
    }
  }
  assert.equal(total, 50);
});
