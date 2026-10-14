/**
 * ZenKuromasu: Main Game Controller & Interactive UI
 */

(function () {
  'use strict';

  // Game State
  let currentLevelId = 1;
  let currentLevel = null;
  let gameState = null;
  let completedLevels = new Set();
  let selectedPackIndex = 0;
  let activeHint = null;
  let currentMode = 'black'; // 'black' or 'white'

  // DOM Elements
  const boardSvg = document.getElementById('board-svg');
  const packNameEl = document.getElementById('pack-name');
  const levelNameEl = document.getElementById('level-name');
  const statBlackEl = document.getElementById('stat-black');
  const statWhiteEl = document.getElementById('stat-white');
  const statCluesEl = document.getElementById('stat-clues');
  const hintBannerEl = document.getElementById('hint-banner');
  const hintTextEl = document.getElementById('hint-text');

  // Mode Buttons
  const modeStoneBtn = document.getElementById('mode-stone');
  const modeDotBtn = document.getElementById('mode-dot');

  // Modals
  const modalLevels = document.getElementById('modal-levels');
  const modalRules = document.getElementById('modal-rules');
  const modalWin = document.getElementById('modal-win');
  const packTabsContainer = document.getElementById('pack-tabs');
  const levelGridContainer = document.getElementById('level-grid');
  const winLevelNameEl = document.getElementById('win-level-name');
  const winStonesCountEl = document.getElementById('win-stones-count');

  // Persistence
  function loadPersistedData() {
    try {
      const savedLevel = localStorage.getItem('zenkuromasu_current_level');
      if (savedLevel) {
        const parsed = parseInt(savedLevel, 10);
        if (parsed >= 1 && parsed <= KuromasuLevels.TOTAL_LEVELS) {
          currentLevelId = parsed;
        }
      }

      const savedCompleted = localStorage.getItem('zenkuromasu_completed_levels');
      if (savedCompleted) {
        const arr = JSON.parse(savedCompleted);
        completedLevels = new Set(arr);
      }
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }

  function savePersistedData() {
    try {
      localStorage.setItem('zenkuromasu_current_level', currentLevelId.toString());
      localStorage.setItem('zenkuromasu_completed_levels', JSON.stringify(Array.from(completedLevels)));
    } catch (e) {}
  }

  // Audio helper
  const audio = window.ZenAudio || {
    toggleMute: () => false,
    isAudioMuted: () => false,
    playStonePlace: () => {},
    playDotPlace: () => {},
    playCellClear: () => {},
    playClueSatisfied: () => {},
    playHintChime: () => {},
    playTempleGong: () => {}
  };

  function updateSoundButton() {
    const btn = document.getElementById('btn-sound');
    if (btn) {
      btn.textContent = audio.isAudioMuted() ? '🔇' : '🔊';
    }
  }

  // Load Level
  function loadLevel(id) {
    currentLevelId = id;
    currentLevel = KuromasuLevels.getLevel(id);
    if (!currentLevel) return;

    gameState = KuromasuEngine.createGameState(currentLevel);
    activeHint = null;

    if (hintBannerEl) hintBannerEl.classList.add('hidden');

    savePersistedData();
    updateHeaderUI();
    renderBoard();
  }

  function updateHeaderUI() {
    if (!currentLevel) return;
    packNameEl.textContent = currentLevel.pack;
    levelNameEl.textContent = `Level ${currentLevel.id} (${currentLevel.width}×${currentLevel.height})`;
    updateStatsUI();
  }

  function updateStatsUI() {
    if (!gameState || !currentLevel) return;

    const boardCheck = KuromasuEngine.checkBoardState(gameState, currentLevel);
    statBlackEl.textContent = boardCheck.blackCount.toString();
    statWhiteEl.textContent = boardCheck.whiteCount.toString();
    statCluesEl.textContent = `${boardCheck.satisfiedClues}/${currentLevel.clues.length}`;
  }

  // SVG Board Rendering
  function renderBoard() {
    if (!currentLevel || !gameState) return;

    const svgSize = 500;
    const padding = 20;
    const boardArea = svgSize - padding * 2;
    const cellW = boardArea / currentLevel.width;
    const cellH = boardArea / currentLevel.height;

    const boardCheck = KuromasuEngine.checkBoardState(gameState, currentLevel);

    // Map clue status
    const clueStatusMap = new Map();
    boardCheck.clueEvaluations.forEach(ev => {
      clueStatusMap.set(`${ev.clue.r},${ev.clue.c}`, ev);
    });

    let html = '';

    // Board Frame
    html += `<rect x="${padding - 4}" y="${padding - 4}" width="${boardArea + 8}" height="${boardArea + 8}" rx="12" fill="#202722" stroke="#3b483e" stroke-width="3" />`;

    // Raycast Sightline Glow Beams for Satisfied Clues
    boardCheck.clueEvaluations.forEach(ev => {
      if (ev.status === 'SATISFIED') {
        const cx = padding + ev.clue.c * cellW + cellW / 2;
        const cy = padding + ev.clue.r * cellH + cellH / 2;

        // Draw horizontal beam
        let minC = ev.clue.c;
        let maxC = ev.clue.c;
        ev.rays.left.forEach(c => minC = Math.min(minC, c.c));
        ev.rays.right.forEach(c => maxC = Math.max(maxC, c.c));

        const bx = padding + minC * cellW + 2;
        const by = cy - cellH * 0.28;
        const bw = (maxC - minC + 1) * cellW - 4;
        const bh = cellH * 0.56;
        html += `<rect class="raycast-beam" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${cellH * 0.2}" fill="rgba(120, 184, 133, 0.16)" />`;

        // Draw vertical beam
        let minR = ev.clue.r;
        let maxR = ev.clue.r;
        ev.rays.up.forEach(c => minR = Math.min(minR, c.r));
        ev.rays.down.forEach(c => maxR = Math.max(maxR, c.r));

        const vbx = cx - cellW * 0.28;
        const vby = padding + minR * cellH + 2;
        const vbw = cellW * 0.56;
        const vbh = (maxR - minR + 1) * cellH - 4;
        html += `<rect class="raycast-beam" x="${vbx}" y="${vby}" width="${vbw}" height="${vbh}" rx="${cellW * 0.2}" fill="rgba(120, 184, 133, 0.16)" />`;
      }
    });

    // Tatami Grid Lines
    for (let i = 0; i <= currentLevel.width; i++) {
      const x = padding + i * cellW;
      html += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + boardArea}" class="grid-line" stroke-width="1.2" />`;
    }
    for (let j = 0; j <= currentLevel.height; j++) {
      const y = padding + j * cellH;
      html += `<line x1="${padding}" y1="${y}" x2="${padding + boardArea}" y2="${y}" class="grid-line" stroke-width="1.2" />`;
    }

    // Interactive Cells & State
    for (let r = 0; r < currentLevel.height; r++) {
      for (let c = 0; c < currentLevel.width; c++) {
        const x = padding + c * cellW;
        const y = padding + r * cellH;
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;
        const stateVal = gameState.grid[r][c];
        const isClueCell = KuromasuEngine.isClue(currentLevel, r, c);

        // Clickable cell backdrop
        html += `<rect class="cell-bg" data-r="${r}" data-c="${c}" x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" />`;

        // Black Stone
        if (stateVal === KuromasuEngine.CELL_BLACK) {
          const stoneRadius = Math.min(cellW, cellH) * 0.38;
          html += `<circle class="stone-circle" data-r="${r}" data-c="${c}" cx="${cx}" cy="${cy}" r="${stoneRadius}" fill="#111412" stroke="#556258" stroke-width="2.5" />`;
          // Subtle stone highlight arc
          html += `<ellipse cx="${cx - stoneRadius * 0.3}" cy="${cy - stoneRadius * 0.3}" rx="${stoneRadius * 0.35}" ry="${stoneRadius * 0.2}" fill="rgba(255, 255, 255, 0.2)" transform="rotate(-30 ${cx - stoneRadius * 0.3} ${cy - stoneRadius * 0.3})" pointer-events="none" />`;
        }

        // White Garden Path Dot
        if (stateVal === KuromasuEngine.CELL_WHITE && !isClueCell) {
          const dotRadius = Math.min(cellW, cellH) * 0.16;
          html += `<circle class="path-circle" data-r="${r}" data-c="${c}" cx="${cx}" cy="${cy}" r="${dotRadius}" fill="#78b885" opacity="0.85" />`;
        }

        // Numbered Clue Circle
        if (isClueCell) {
          const clueObj = currentLevel.clues.find(cl => cl.r === r && cl.c === c);
          const ev = clueStatusMap.get(`${r},${c}`);
          const clueRadius = Math.min(cellW, cellH) * 0.36;

          let clueClass = 'clue-pending';
          if (ev) {
            if (ev.status === 'SATISFIED') clueClass = 'clue-satisfied';
            else if (ev.status === 'VIOLATED') clueClass = 'clue-violated';
          }

          html += `<g class="${clueClass}" data-r="${r}" data-c="${c}">`;
          html += `<circle class="clue-circle" cx="${cx}" cy="${cy}" r="${clueRadius}" />`;
          html += `<text class="clue-text" x="${cx}" y="${cy}" font-size="${Math.round(clueRadius * 1.15)}">${clueObj.val}</text>`;
          html += `</g>`;
        }
      }
    }

    // Hint Highlights
    if (activeHint && activeHint.highlight && activeHint.highlight.length > 0) {
      activeHint.highlight.forEach(h => {
        const hx = padding + h.c * cellW + 2;
        const hy = padding + h.r * cellH + 2;
        html += `<rect x="${hx}" y="${hy}" width="${cellW - 4}" height="${cellH - 4}" rx="8" fill="rgba(226, 176, 83, 0.28)" stroke="#e2b053" stroke-width="3" stroke-dasharray="5 3" pointer-events="none" />`;
      });
    }

    boardSvg.innerHTML = html;
  }

  // Cell Interaction Handler
  function handleCellClick(r, c) {
    if (!currentLevel || !gameState) return;
    if (KuromasuEngine.isClue(currentLevel, r, c)) return;

    const prevState = gameState.grid[r][c];

    // Tool Mode logic:
    // If user clicked 'mode-stone', toggle black stone on/off
    // If user clicked 'mode-dot', toggle white dot on/off
    // Default fallback: cycle EMPTY -> BLACK -> WHITE -> EMPTY
    if (currentMode === 'black') {
      if (prevState === KuromasuEngine.CELL_BLACK) {
        KuromasuEngine.setCell(gameState, currentLevel, r, c, KuromasuEngine.CELL_EMPTY);
        audio.playCellClear();
      } else {
        KuromasuEngine.setCell(gameState, currentLevel, r, c, KuromasuEngine.CELL_BLACK);
        audio.playStonePlace();
      }
    } else if (currentMode === 'white') {
      if (prevState === KuromasuEngine.CELL_WHITE) {
        KuromasuEngine.setCell(gameState, currentLevel, r, c, KuromasuEngine.CELL_EMPTY);
        audio.playCellClear();
      } else {
        KuromasuEngine.setCell(gameState, currentLevel, r, c, KuromasuEngine.CELL_WHITE);
        audio.playDotPlace();
      }
    } else {
      KuromasuEngine.cycleCell(gameState, currentLevel, r, c);
      const nextState = gameState.grid[r][c];
      if (nextState === KuromasuEngine.CELL_BLACK) audio.playStonePlace();
      else if (nextState === KuromasuEngine.CELL_WHITE) audio.playDotPlace();
      else audio.playCellClear();
    }

    activeHint = null;
    updateHeaderUI();
    renderBoard();
    checkVictoryCondition();
  }

  function checkVictoryCondition() {
    if (!gameState || !currentLevel) return;
    const boardCheck = KuromasuEngine.checkBoardState(gameState, currentLevel);

    if (boardCheck.solved) {
      completedLevels.add(currentLevel.id);
      savePersistedData();
      audio.playTempleGong();

      setTimeout(() => {
        showVictoryModal();
      }, 400);
    }
  }

  function showVictoryModal() {
    winLevelNameEl.textContent = `${currentLevel.pack} • Level ${currentLevel.id}`;
    const boardCheck = KuromasuEngine.checkBoardState(gameState, currentLevel);
    winStonesCountEl.textContent = `${boardCheck.blackCount} stones placed`;
    modalWin.classList.add('active');
  }

  // Modals
  function openLevelModal() {
    const packs = KuromasuLevels.getPacks();

    // Render pack tabs
    packTabsContainer.innerHTML = packs.map((pack, idx) => `
      <button class="pack-tab ${idx === selectedPackIndex ? 'active' : ''}" data-pack-idx="${idx}">
        ${pack.name} (${pack.size})
      </button>
    `).join('');

    renderLevelGrid();
    modalLevels.classList.add('active');
  }

  function renderLevelGrid() {
    const packs = KuromasuLevels.getPacks();
    const pack = packs[selectedPackIndex];
    if (!pack) return;

    let html = '';
    for (let id = pack.levels[0]; id <= pack.levels[1]; id++) {
      const isCompleted = completedLevels.has(id);
      const isCurrent = id === currentLevelId;

      html += `
        <div class="level-card ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}" data-level-id="${id}">
          <span class="level-card-num">${id}</span>
          ${isCompleted ? '<span class="level-card-star">★</span>' : ''}
        </div>
      `;
    }
    levelGridContainer.innerHTML = html;
  }

  // Event Listeners
  function initEvents() {
    // Board click delegation
    boardSvg.addEventListener('click', e => {
      const target = e.target.closest('[data-r]');
      if (!target) return;
      const r = parseInt(target.dataset.r, 10);
      const c = parseInt(target.dataset.c, 10);
      handleCellClick(r, c);
    });

    // Mode Selector Buttons
    modeStoneBtn.addEventListener('click', () => {
      currentMode = 'black';
      modeStoneBtn.classList.add('active');
      modeDotBtn.classList.remove('active');
    });

    modeDotBtn.addEventListener('click', () => {
      currentMode = 'white';
      modeDotBtn.classList.add('active');
      modeStoneBtn.classList.remove('active');
    });

    // Header buttons
    document.getElementById('btn-sound').addEventListener('click', () => {
      audio.toggleMute();
      updateSoundButton();
    });

    document.getElementById('btn-rules').addEventListener('click', () => {
      modalRules.classList.add('active');
    });

    document.getElementById('btn-levels').addEventListener('click', openLevelModal);

    // Modal close buttons
    document.getElementById('close-levels').addEventListener('click', () => {
      modalLevels.classList.remove('active');
    });
    document.getElementById('close-rules').addEventListener('click', () => {
      modalRules.classList.remove('active');
    });
    document.getElementById('btn-rules-start').addEventListener('click', () => {
      modalRules.classList.remove('active');
    });

    // Pack tabs click
    packTabsContainer.addEventListener('click', e => {
      const tab = e.target.closest('.pack-tab');
      if (!tab) return;
      selectedPackIndex = parseInt(tab.dataset.packIdx, 10);
      document.querySelectorAll('.pack-tab').forEach((t, i) => {
        t.classList.toggle('active', i === selectedPackIndex);
      });
      renderLevelGrid();
    });

    // Level select click
    levelGridContainer.addEventListener('click', e => {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const id = parseInt(card.dataset.levelId, 10);
      modalLevels.classList.remove('active');
      loadLevel(id);
    });

    // Victory modal buttons
    document.getElementById('btn-replay').addEventListener('click', () => {
      modalWin.classList.remove('active');
      loadLevel(currentLevelId);
    });

    document.getElementById('btn-win-next').addEventListener('click', () => {
      modalWin.classList.remove('active');
      const nextId = currentLevelId < KuromasuLevels.TOTAL_LEVELS ? currentLevelId + 1 : 1;
      loadLevel(nextId);
    });

    // Controls Bar Action Buttons
    document.getElementById('btn-undo').addEventListener('click', () => {
      if (KuromasuEngine.undo(gameState)) {
        audio.playCellClear();
        activeHint = null;
        updateHeaderUI();
        renderBoard();
      }
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      KuromasuEngine.resetBoard(gameState, currentLevel);
      audio.playCellClear();
      activeHint = null;
      updateHeaderUI();
      renderBoard();
    });

    document.getElementById('btn-hint').addEventListener('click', () => {
      const hint = KuromasuEngine.getDeductiveHint(gameState, currentLevel);
      if (hint) {
        activeHint = hint;
        hintTextEl.textContent = hint.message;
        hintBannerEl.classList.remove('hidden');
        audio.playHintChime();
        renderBoard();
      }
    });

    document.getElementById('btn-close-hint').addEventListener('click', () => {
      hintBannerEl.classList.add('hidden');
      activeHint = null;
      renderBoard();
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
      const prevId = currentLevelId > 1 ? currentLevelId - 1 : KuromasuLevels.TOTAL_LEVELS;
      loadLevel(prevId);
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      const nextId = currentLevelId < KuromasuLevels.TOTAL_LEVELS ? currentLevelId + 1 : 1;
      loadLevel(nextId);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'u' || e.key === 'U') {
        document.getElementById('btn-undo').click();
      } else if (e.key === 'r' || e.key === 'R') {
        document.getElementById('btn-reset').click();
      } else if (e.key === 'h' || e.key === 'H') {
        document.getElementById('btn-hint').click();
      } else if (e.key === 'm' || e.key === 'M') {
        document.getElementById('btn-sound').click();
      } else if (e.key === '1') {
        modeStoneBtn.click();
      } else if (e.key === '2') {
        modeDotBtn.click();
      } else if (e.key === 'ArrowRight') {
        document.getElementById('btn-next').click();
      } else if (e.key === 'ArrowLeft') {
        document.getElementById('btn-prev').click();
      } else if (e.key === 'Escape') {
        modalLevels.classList.remove('active');
        modalRules.classList.remove('active');
        modalWin.classList.remove('active');
        hintBannerEl.classList.add('hidden');
        activeHint = null;
        renderBoard();
      }
    });

    // Close modals on overlay backdrop tap
    [modalLevels, modalRules, modalWin].forEach(m => {
      m.addEventListener('click', e => {
        if (e.target === m) {
          m.classList.remove('active');
        }
      });
    });

    // Service Worker Registration for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  // Initialization
  function init() {
    loadPersistedData();
    updateSoundButton();
    initEvents();
    loadLevel(currentLevelId);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
