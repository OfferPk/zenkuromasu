/**
 * ZenKuromasu - Game Controller & SVG Board Renderer
 */

(function () {
  'use strict';

  // Game State
  let packs = [];
  let currentPackIdx = 0;
  let currentLevelIdx = 0;
  let engine = null;
  let currentLevelData = null;

  let toolMode = 'cycle'; // 'cycle' | 'stone' | 'dot'
  let selectedClue = null;
  let highlightedCell = null;
  let undoStack = [];
  let moveCount = 0;
  let timerInterval = null;
  let elapsedSeconds = 0;
  let isLevelCompleted = false;

  // LocalStorage keys
  const STORAGE_COMPLETED = 'zenkuromasu_completed';
  const STORAGE_CURRENT = 'zenkuromasu_current';

  function getCompletedSet() {
    try {
      const data = localStorage.getItem(STORAGE_COMPLETED);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  function markLevelCompleted(levelId) {
    try {
      const set = getCompletedSet();
      set.add(levelId);
      localStorage.setItem(STORAGE_COMPLETED, JSON.stringify([...set]));
    } catch (e) {}
  }

  function saveCurrentLevel(packIdx, levelIdx) {
    try {
      localStorage.setItem(STORAGE_CURRENT, JSON.stringify({ packIdx, levelIdx }));
    } catch (e) {}
  }

  function loadCurrentLevel() {
    try {
      const data = localStorage.getItem(STORAGE_CURRENT);
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed.packIdx === 'number' && typeof parsed.levelIdx === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { packIdx: 0, levelIdx: 0 };
  }

  // DOM Elements
  const elGrid = document.getElementById('grid-container');
  const elPackName = document.getElementById('pack-name');
  const elLevelName = document.getElementById('level-name');
  const elStatClues = document.getElementById('stat-clues');
  const elStatStones = document.getElementById('stat-stones');
  const elStatTime = document.getElementById('stat-time');

  const elBtnSound = document.getElementById('btn-sound');
  const elBtnRules = document.getElementById('btn-rules');
  const elBtnLevels = document.getElementById('btn-levels');
  const elBtnUndo = document.getElementById('btn-undo');
  const elBtnHint = document.getElementById('btn-hint');
  const elBtnReset = document.getElementById('btn-reset');

  const elToolCycle = document.getElementById('tool-cycle');
  const elToolStone = document.getElementById('tool-stone');
  const elToolDot = document.getElementById('tool-dot');

  const elHintBanner = document.getElementById('hint-banner');
  const elHintText = document.getElementById('hint-text');
  const elBtnCloseHint = document.getElementById('btn-close-hint');

  const elRulesModal = document.getElementById('rules-modal');
  const elBtnCloseRules = document.getElementById('btn-close-rules');
  const elBtnStartPlaying = document.getElementById('btn-start-playing');

  const elLevelsModal = document.getElementById('levels-modal');
  const elBtnCloseLevels = document.getElementById('btn-close-levels');
  const elPackTabs = document.getElementById('pack-tabs');
  const elLevelsGrid = document.getElementById('levels-grid');

  const elVictoryModal = document.getElementById('victory-modal');
  const elVstatTime = document.getElementById('vstat-time');
  const elVstatMoves = document.getElementById('vstat-moves');
  const elVstatStones = document.getElementById('vstat-stones');
  const elBtnNextLevel = document.getElementById('btn-next-level');
  const elBtnReplay = document.getElementById('btn-replay');

  // Initialization
  function init() {
    if (typeof LEVEL_PACKS !== 'undefined') {
      packs = LEVEL_PACKS;
    } else {
      console.error('LEVEL_PACKS not loaded');
      return;
    }

    const saved = loadCurrentLevel();
    currentPackIdx = Math.min(saved.packIdx, packs.length - 1);
    currentLevelIdx = Math.min(saved.levelIdx, packs[currentPackIdx].levels.length - 1);

    updateSoundButton();
    setupEventListeners();
    loadLevel(currentPackIdx, currentLevelIdx);

    // Register Service Worker for offline PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }

  function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateTimerDisplay() {
    if (elStatTime) elStatTime.textContent = formatTime(elapsedSeconds);
  }

  function loadLevel(packIdx, levelIdx) {
    currentPackIdx = packIdx;
    currentLevelIdx = levelIdx;
    saveCurrentLevel(packIdx, levelIdx);

    const pack = packs[packIdx];
    currentLevelData = pack.levels[levelIdx];
    engine = new KuromasuEngine(currentLevelData.width, currentLevelData.height, currentLevelData.clues);

    undoStack = [];
    moveCount = 0;
    isLevelCompleted = false;
    selectedClue = null;
    highlightedCell = null;
    hideHint();

    elPackName.textContent = pack.name;
    elLevelName.textContent = `Level ${currentLevelData.number} (${currentLevelData.width}×${currentLevelData.height})`;

    startTimer();
    renderBoard();
    updateStats();
  }

  function saveUndoState() {
    undoStack.push(engine.cloneGrid());
    if (undoStack.length > 50) undoStack.shift();
  }

  function handleUndo() {
    if (undoStack.length === 0 || isLevelCompleted) return;
    const prev = undoStack.pop();
    engine.setGrid(prev);
    sound.playCellClear();
    renderBoard();
    updateStats();
  }

  function handleReset() {
    if (isLevelCompleted) return;
    saveUndoState();
    const blank = Array.from({ length: engine.height }, () => Array(engine.width).fill(CELL_EMPTY));
    engine.setGrid(blank);
    sound.playCellClear();
    renderBoard();
    updateStats();
  }

  function setToolMode(mode) {
    toolMode = mode;
    [elToolCycle, elToolStone, elToolDot].forEach(btn => btn && btn.classList.remove('active'));
    if (mode === 'cycle' && elToolCycle) elToolCycle.classList.add('active');
    if (mode === 'stone' && elToolStone) elToolStone.classList.add('active');
    if (mode === 'dot' && elToolDot) elToolDot.classList.add('active');
  }

  // Cell Interaction
  function handleCellClick(r, c) {
    if (isLevelCompleted) return;

    // If clicking a clue cell, toggle sightline ray highlighting
    if (engine.isClue(r, c)) {
      if (selectedClue && selectedClue.r === r && selectedClue.c === c) {
        selectedClue = null;
      } else {
        selectedClue = { r, c };
        sound.playDotPlace();
      }
      renderBoard();
      return;
    }

    // Normal cell click
    saveUndoState();
    moveCount++;
    const oldState = engine.getCell(r, c);
    let newState = oldState;

    if (toolMode === 'cycle') {
      newState = engine.cycleCell(r, c);
    } else if (toolMode === 'stone') {
      newState = oldState === CELL_BLACK ? CELL_EMPTY : CELL_BLACK;
      engine.setCell(r, c, newState);
    } else if (toolMode === 'dot') {
      newState = oldState === CELL_WHITE ? CELL_EMPTY : CELL_WHITE;
      engine.setCell(r, c, newState);
    }

    // Audio feedback
    if (newState === CELL_BLACK) {
      sound.playStonePlace();
      // Check for adjacent conflict
      const adj = engine.checkNoAdjacentBlack();
      if (!adj.valid) {
        sound.playConflictWarning();
      }
    } else if (newState === CELL_WHITE) {
      sound.playDotPlace();
    } else {
      sound.playCellClear();
    }

    // Hide hint if acted on
    if (highlightedCell && highlightedCell.r === r && highlightedCell.c === c) {
      hideHint();
    }

    renderBoard();
    updateStats();
    checkVictory();
  }

  function checkVictory() {
    const val = engine.validate();
    if (val.isComplete) {
      isLevelCompleted = true;
      stopTimer();
      markLevelCompleted(currentLevelData.id);
      sound.playVictoryGong();

      // Show victory modal after brief acoustic pause
      setTimeout(() => {
        elVstatTime.textContent = formatTime(elapsedSeconds);
        elVstatMoves.textContent = moveCount.toString();
        // Count black stones
        let blackCount = 0;
        for (let r = 0; r < engine.height; r++) {
          for (let c = 0; c < engine.width; c++) {
            if (engine.getCell(r, c) === CELL_BLACK) blackCount++;
          }
        }
        elVstatStones.textContent = blackCount.toString();
        elVictoryModal.classList.remove('hidden');
      }, 400);
    }
  }

  function updateStats() {
    const clueStatuses = engine.getClueStatuses();
    const satisfiedCount = clueStatuses.filter(s => s.state === 'satisfied').length;
    elStatClues.textContent = `${satisfiedCount} / ${clueStatuses.length}`;

    let blackCount = 0;
    for (let r = 0; r < engine.height; r++) {
      for (let c = 0; c < engine.width; c++) {
        if (engine.getCell(r, c) === CELL_BLACK) blackCount++;
      }
    }
    elStatStones.textContent = blackCount.toString();
  }

  // SVG Board Rendering
  function renderBoard() {
    const w = engine.width;
    const h = engine.height;
    const cellSize = 60;
    const totalW = w * cellSize;
    const totalH = h * cellSize;

    // Collect ray cells to highlight if a clue is selected
    const rayCellKeys = new Set();
    if (selectedClue) {
      const vis = engine.getVisibility(selectedClue.r, selectedClue.c);
      for (const cell of vis.cells) {
        rayCellKeys.add(`${cell.r},${cell.c}`);
      }
    }

    // Build SVG markup
    let svg = `<svg viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">`;

    // Gradients and Filters
    svg += `
      <defs>
        <radialGradient id="stoneGradient" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stop-color="#4a5359" />
          <stop offset="50%" stop-color="#202428" />
          <stop offset="100%" stop-color="#0e1012" />
        </radialGradient>
        <filter id="stoneDropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.45" />
        </filter>
        <filter id="hintGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    `;

    // 1. Cells Background & Sightline Highlights
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const isRay = rayCellKeys.has(`${r},${c}`);
        const rayClass = isRay ? 'svg-ray-active' : '';

        svg += `<rect class="svg-cell ${rayClass}" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${isRay ? 'rgba(212,175,55,0.2)' : 'transparent'}" stroke="#dad3c5" stroke-width="1.2" data-r="${r}" data-c="${c}" />`;
      }
    }

    // 2. Hint Highlight Rect (if active)
    if (highlightedCell) {
      const hx = highlightedCell.c * cellSize + 2;
      const hy = highlightedCell.r * cellSize + 2;
      svg += `<rect x="${hx}" y="${hy}" width="${cellSize - 4}" height="${cellSize - 4}" rx="8" fill="rgba(212,175,55,0.3)" stroke="#d4af37" stroke-width="3" filter="url(#hintGlow)" />`;
    }

    // 3. Grid Contents: Stones, Dots, Clues
    const clueStatuses = engine.getClueStatuses();
    const clueStatusMap = new Map();
    for (const st of clueStatuses) {
      clueStatusMap.set(`${st.r},${st.c}`, st);
    }

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const cx = c * cellSize + cellSize / 2;
        const cy = r * cellSize + cellSize / 2;
        const state = engine.getCell(r, c);
        const isClueCell = engine.isClue(r, c);

        if (isClueCell) {
          const clueVal = engine.getClue(r, c);
          const st = clueStatusMap.get(`${r},${c}`) || { state: 'under' };
          const isSel = selectedClue && selectedClue.r === r && selectedClue.c === c;
          const radius = cellSize * 0.38;

          svg += `
            <g class="svg-clue ${st.state} ${isSel ? 'selected' : ''}" data-r="${r}" data-c="${c}">
              <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#ffffff" stroke="${isSel ? '#d4af37' : '#22272a'}" stroke-width="${isSel ? 3 : 2}" />
              <text x="${cx}" y="${cy + 5}" font-family="-apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="${cellSize * 0.42}" font-weight="700" text-anchor="middle" fill="#1b2024">${clueVal}</text>
            </g>
          `;
        } else if (state === CELL_BLACK) {
          const radius = cellSize * 0.40;
          svg += `
            <g class="svg-stone" data-r="${r}" data-c="${c}">
              <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#stoneGradient)" filter="url(#stoneDropShadow)" />
              <!-- Highlight Crescent -->
              <ellipse cx="${cx - radius * 0.28}" cy="${cy - radius * 0.28}" rx="${radius * 0.35}" ry="${radius * 0.22}" fill="rgba(255,255,255,0.18)" transform="rotate(-30 ${cx - radius * 0.28} ${cy - radius * 0.28})" />
            </g>
          `;
        } else if (state === CELL_WHITE) {
          const radius = cellSize * 0.16;
          svg += `
            <g class="svg-dot" data-r="${r}" data-c="${c}">
              <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#5a6872" stroke="#ffffff" stroke-width="2" />
            </g>
          `;
        }
      }
    }

    svg += '</svg>';
    elGrid.innerHTML = svg;

    // Attach click listeners to SVG elements
    elGrid.querySelectorAll('.svg-cell, .svg-clue, .svg-stone, .svg-dot').forEach(el => {
      el.addEventListener('click', (e) => {
        const r = parseInt(el.getAttribute('data-r'), 10);
        const c = parseInt(el.getAttribute('data-c'), 10);
        if (!isNaN(r) && !isNaN(c)) {
          handleCellClick(r, c);
        }
      });
    });
  }

  // Hint Logic
  function handleHint() {
    if (isLevelCompleted) return;
    const hint = engine.getHint();
    if (!hint) {
      showHint('The garden is in balance so far! Keep observing sightlines.');
      return;
    }

    highlightedCell = { r: hint.r, c: hint.c };
    renderBoard();
    showHint(hint.message);
  }

  function showHint(msg) {
    elHintText.textContent = msg;
    elHintBanner.classList.remove('hidden');
  }

  function hideHint() {
    highlightedCell = null;
    elHintBanner.classList.add('hidden');
  }

  // Sound Button
  function updateSoundButton() {
    if (elBtnSound) {
      elBtnSound.textContent = sound.isSoundEnabled() ? '🔊' : '🔇';
    }
  }

  // Level Selector Modal
  function showLevelsModal() {
    renderPackTabs();
    renderLevelsGrid(currentPackIdx);
    elLevelsModal.classList.remove('hidden');
  }

  function hideLevelsModal() {
    elLevelsModal.classList.add('hidden');
  }

  function renderPackTabs() {
    elPackTabs.innerHTML = '';
    packs.forEach((pack, idx) => {
      const tab = document.createElement('button');
      tab.className = `pack-tab ${idx === currentPackIdx ? 'active' : ''}`;
      tab.textContent = `${pack.name} (${pack.width}×${pack.height})`;
      tab.addEventListener('click', () => {
        elPackTabs.querySelectorAll('.pack-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLevelsGrid(idx);
      });
      elPackTabs.appendChild(tab);
    });
  }

  function renderLevelsGrid(packIdx) {
    elLevelsGrid.innerHTML = '';
    const completedSet = getCompletedSet();
    const pack = packs[packIdx];

    pack.levels.forEach((lvl, lvlIdx) => {
      const tile = document.createElement('div');
      const isDone = completedSet.has(lvl.id);
      const isCur = packIdx === currentPackIdx && lvlIdx === currentLevelIdx;

      tile.className = `level-tile ${isDone ? 'completed' : ''} ${isCur ? 'active' : ''}`;
      tile.innerHTML = `
        <span class="level-num">${lvl.number}</span>
        <span class="level-check">${isDone ? '✓ Done' : ''}</span>
      `;
      tile.addEventListener('click', () => {
        hideLevelsModal();
        loadLevel(packIdx, lvlIdx);
      });
      elLevelsGrid.appendChild(tile);
    });
  }

  // Event Listeners
  function setupEventListeners() {
    elBtnSound.addEventListener('click', () => {
      sound.toggleSound();
      updateSoundButton();
    });

    elBtnRules.addEventListener('click', () => {
      elRulesModal.classList.remove('hidden');
    });

    elBtnCloseRules.addEventListener('click', () => {
      elRulesModal.classList.add('hidden');
    });

    elBtnStartPlaying.addEventListener('click', () => {
      elRulesModal.classList.add('hidden');
    });

    elBtnLevels.addEventListener('click', showLevelsModal);
    elBtnCloseLevels.addEventListener('click', hideLevelsModal);

    elBtnUndo.addEventListener('click', handleUndo);
    elBtnReset.addEventListener('click', handleReset);
    elBtnHint.addEventListener('click', handleHint);
    elBtnCloseHint.addEventListener('click', hideHint);

    elToolCycle.addEventListener('click', () => setToolMode('cycle'));
    elToolStone.addEventListener('click', () => setToolMode('stone'));
    elToolDot.addEventListener('click', () => setToolMode('dot'));

    // Victory Actions
    elBtnNextLevel.addEventListener('click', () => {
      elVictoryModal.classList.add('hidden');
      const pack = packs[currentPackIdx];
      if (currentLevelIdx + 1 < pack.levels.length) {
        loadLevel(currentPackIdx, currentLevelIdx + 1);
      } else if (currentPackIdx + 1 < packs.length) {
        loadLevel(currentPackIdx + 1, 0);
      } else {
        // All completed! Loop back or show modal
        loadLevel(0, 0);
      }
    });

    elBtnReplay.addEventListener('click', () => {
      elVictoryModal.classList.add('hidden');
      loadLevel(currentPackIdx, currentLevelIdx);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        sound.toggleSound();
        updateSoundButton();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReset();
      } else if (e.key === 'h' || e.key === 'H') {
        handleHint();
      } else if (e.key === '1') {
        setToolMode('cycle');
      } else if (e.key === '2') {
        setToolMode('stone');
      } else if (e.key === '3') {
        setToolMode('dot');
      }
    });
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
