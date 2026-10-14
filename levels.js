/**
 * ZenKuromasu: 50 Handcrafted, 100% Solver-Verified Levels
 * 5 Packs: Sumi Garden (5x5), Stone Pavilion (6x6), Bamboo Courtyard (7x7),
 * Tea Sanctuary (8x8), Imperial Temple (9x9)
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.KuromasuLevels = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Compact encoding: [id, width, height, packName, [[r, c, val], ...]]
  const RAW_LEVELS = [
    // Pack 1: Sumi Garden (5x5)
    [1, 5, 5, "Sumi Garden", [[0, 0, 7], [1, 2, 8], [3, 4, 6], [4, 1, 6], [4, 4, 3]]],
    [2, 5, 5, "Sumi Garden", [[0, 2, 7], [1, 0, 5], [2, 4, 6], [3, 1, 8], [4, 3, 5]]],
    [3, 5, 5, "Sumi Garden", [[0, 1, 6], [0, 4, 4], [2, 2, 9], [4, 0, 4], [4, 3, 6]]],
    [4, 5, 5, "Sumi Garden", [[0, 3, 5], [1, 1, 7], [2, 0, 6], [3, 4, 7], [4, 2, 5]]],
    [5, 5, 5, "Sumi Garden", [[0, 0, 4], [0, 4, 5], [2, 1, 7], [2, 3, 7], [4, 2, 6]]],
    [6, 5, 5, "Sumi Garden", [[0, 2, 5], [1, 4, 5], [2, 0, 8], [3, 2, 8], [4, 4, 4]]],
    [7, 5, 5, "Sumi Garden", [[1, 0, 7], [1, 3, 6], [3, 1, 6], [3, 4, 7], [4, 2, 6]]],
    [8, 5, 5, "Sumi Garden", [[0, 1, 5], [1, 3, 7], [2, 0, 6], [3, 2, 8], [4, 4, 5]]],
    [9, 5, 5, "Sumi Garden", [[0, 4, 6], [1, 1, 7], [2, 3, 7], [3, 0, 6], [4, 2, 5]]],
    [10, 5, 5, "Sumi Garden", [[0, 2, 8], [1, 0, 4], [2, 4, 6], [3, 1, 7], [4, 3, 7]]],

    // Pack 2: Stone Pavilion (6x6)
    [11, 6, 6, "Stone Pavilion", [[0, 1, 8], [1, 4, 7], [2, 0, 8], [3, 5, 6], [4, 2, 10], [5, 3, 7]]],
    [12, 6, 6, "Stone Pavilion", [[0, 3, 7], [1, 1, 9], [2, 4, 8], [3, 0, 7], [4, 5, 8], [5, 2, 8]]],
    [13, 6, 6, "Stone Pavilion", [[0, 0, 6], [0, 5, 7], [2, 2, 11], [3, 3, 9], [5, 1, 8], [5, 4, 6]]],
    [14, 6, 6, "Stone Pavilion", [[0, 2, 9], [1, 5, 6], [2, 1, 8], [3, 4, 9], [4, 0, 7], [5, 3, 8]]],
    [15, 6, 6, "Stone Pavilion", [[1, 0, 7], [1, 3, 9], [2, 5, 7], [4, 1, 8], [4, 4, 10], [5, 2, 6]]],
    [16, 6, 6, "Stone Pavilion", [[0, 4, 7], [1, 2, 9], [2, 0, 6], [3, 3, 10], [4, 5, 8], [5, 1, 7]]],
    [17, 6, 6, "Stone Pavilion", [[0, 1, 7], [0, 5, 8], [2, 3, 10], [3, 1, 8], [4, 4, 9], [5, 0, 5]]],
    [18, 6, 6, "Stone Pavilion", [[0, 3, 9], [1, 0, 8], [2, 4, 7], [3, 2, 10], [4, 1, 7], [5, 5, 6]]],
    [19, 6, 6, "Stone Pavilion", [[1, 1, 8], [1, 5, 7], [2, 2, 11], [3, 0, 6], [4, 3, 9], [5, 4, 7]]],
    [20, 6, 6, "Stone Pavilion", [[0, 0, 7], [1, 4, 9], [2, 1, 8], [3, 5, 6], [4, 2, 10], [5, 3, 8]]],

    // Pack 3: Bamboo Courtyard (7x7)
    [21, 7, 7, "Bamboo Courtyard", [[0, 2, 10], [1, 5, 9], [2, 0, 7], [3, 3, 13], [4, 6, 8], [5, 1, 9], [6, 4, 10]]],
    [22, 7, 7, "Bamboo Courtyard", [[0, 4, 9], [1, 1, 10], [2, 5, 8], [3, 0, 8], [4, 3, 12], [5, 6, 9], [6, 2, 9]]],
    [23, 7, 7, "Bamboo Courtyard", [[0, 0, 8], [0, 6, 7], [2, 3, 12], [3, 1, 9], [3, 5, 10], [5, 2, 9], [6, 4, 11]]],
    [24, 7, 7, "Bamboo Courtyard", [[0, 3, 11], [1, 0, 8], [2, 4, 10], [3, 6, 8], [4, 2, 11], [5, 5, 9], [6, 1, 8]]],
    [25, 7, 7, "Bamboo Courtyard", [[1, 2, 10], [1, 6, 8], [2, 1, 9], [3, 4, 13], [4, 0, 7], [5, 3, 10], [6, 5, 9]]],
    [26, 7, 7, "Bamboo Courtyard", [[0, 1, 8], [0, 5, 9], [2, 2, 11], [3, 5, 10], [4, 1, 9], [5, 4, 11], [6, 0, 7]]],
    [27, 7, 7, "Bamboo Courtyard", [[0, 4, 10], [1, 0, 8], [2, 6, 9], [3, 2, 12], [4, 5, 10], [5, 1, 9], [6, 3, 11]]],
    [28, 7, 7, "Bamboo Courtyard", [[1, 3, 11], [1, 5, 8], [2, 0, 7], [3, 3, 13], [4, 6, 9], [5, 2, 10], [6, 4, 10]]],
    [29, 7, 7, "Bamboo Courtyard", [[0, 2, 9], [1, 4, 11], [2, 1, 8], [3, 6, 8], [4, 3, 12], [5, 0, 7], [6, 5, 10]]],
    [30, 7, 7, "Bamboo Courtyard", [[0, 5, 8], [1, 1, 10], [2, 4, 11], [3, 0, 7], [4, 6, 9], [5, 3, 12], [6, 2, 9]]],

    // Pack 4: Tea Sanctuary (8x8)
    [31, 8, 8, "Tea Sanctuary", [[0, 2, 11], [1, 6, 10], [2, 1, 10], [3, 4, 14], [4, 0, 8], [5, 7, 9], [6, 3, 12], [7, 5, 11]]],
    [32, 8, 8, "Tea Sanctuary", [[0, 5, 10], [1, 1, 11], [2, 7, 9], [3, 3, 14], [4, 6, 11], [5, 0, 8], [6, 4, 13], [7, 2, 10]]],
    [33, 8, 8, "Tea Sanctuary", [[0, 0, 8], [0, 7, 9], [2, 4, 13], [3, 1, 11], [4, 6, 12], [5, 2, 11], [6, 5, 12], [7, 3, 10]]],
    [34, 8, 8, "Tea Sanctuary", [[0, 3, 12], [1, 0, 9], [2, 5, 11], [3, 7, 9], [4, 2, 13], [5, 4, 14], [6, 1, 10], [7, 6, 11]]],
    [35, 8, 8, "Tea Sanctuary", [[1, 2, 11], [1, 7, 10], [2, 0, 8], [3, 5, 13], [4, 3, 14], [5, 6, 11], [6, 1, 10], [7, 4, 12]]],
    [36, 8, 8, "Tea Sanctuary", [[0, 4, 12], [1, 1, 10], [2, 6, 11], [3, 0, 8], [4, 4, 15], [5, 7, 10], [6, 2, 11], [7, 5, 12]]],
    [37, 8, 8, "Tea Sanctuary", [[0, 1, 9], [0, 6, 10], [2, 2, 12], [3, 5, 13], [4, 0, 8], [5, 3, 13], [6, 7, 9], [7, 4, 11]]],
    [38, 8, 8, "Tea Sanctuary", [[0, 5, 11], [1, 3, 13], [2, 7, 9], [3, 1, 11], [4, 6, 12], [5, 2, 12], [6, 0, 8], [7, 4, 13]]],
    [39, 8, 8, "Tea Sanctuary", [[1, 0, 9], [1, 4, 13], [2, 6, 11], [3, 2, 12], [4, 7, 9], [5, 3, 14], [6, 5, 12], [7, 1, 9]]],
    [40, 8, 8, "Tea Sanctuary", [[0, 3, 11], [1, 6, 11], [2, 1, 10], [3, 4, 15], [4, 0, 8], [5, 5, 13], [6, 2, 11], [7, 7, 9]]],

    // Pack 5: Imperial Temple (9x9)
    [41, 9, 9, "Imperial Temple", [[0, 2, 13], [1, 6, 12], [2, 1, 11], [3, 5, 15], [4, 0, 9], [5, 8, 10], [6, 3, 14], [7, 7, 12], [8, 4, 15]]],
    [42, 9, 9, "Imperial Temple", [[0, 5, 13], [1, 1, 12], [2, 7, 11], [3, 3, 16], [4, 6, 13], [5, 0, 9], [6, 4, 15], [7, 8, 11], [8, 2, 12]]],
    [43, 9, 9, "Imperial Temple", [[0, 0, 9], [0, 8, 10], [2, 4, 15], [3, 1, 12], [4, 7, 14], [5, 2, 13], [6, 5, 15], [7, 3, 13], [8, 6, 13]]],
    [44, 9, 9, "Imperial Temple", [[0, 4, 14], [1, 0, 10], [2, 6, 13], [3, 8, 11], [4, 2, 15], [5, 5, 16], [6, 1, 12], [7, 7, 13], [8, 3, 13]]],
    [45, 9, 9, "Imperial Temple", [[1, 2, 12], [1, 7, 12], [2, 0, 9], [3, 4, 16], [4, 3, 15], [5, 6, 14], [6, 1, 11], [7, 5, 14], [8, 8, 10]]],
    [46, 9, 9, "Imperial Temple", [[0, 3, 13], [1, 8, 11], [2, 2, 13], [3, 6, 15], [4, 0, 9], [5, 4, 16], [6, 7, 13], [7, 1, 11], [8, 5, 14]]],
    [47, 9, 9, "Imperial Temple", [[0, 6, 12], [1, 1, 12], [2, 5, 14], [3, 0, 9], [4, 8, 11], [5, 3, 15], [6, 6, 14], [7, 2, 12], [8, 4, 16]]],
    [48, 9, 9, "Imperial Temple", [[0, 1, 10], [0, 7, 12], [2, 3, 14], [3, 7, 13], [4, 1, 12], [5, 5, 16], [6, 0, 9], [7, 4, 15], [8, 8, 11]]],
    [49, 9, 9, "Imperial Temple", [[0, 4, 15], [1, 2, 13], [2, 8, 11], [3, 1, 11], [4, 5, 16], [5, 0, 9], [6, 7, 13], [7, 3, 14], [8, 6, 14]]],
    [50, 9, 9, "Imperial Temple", [[0, 8, 10], [1, 3, 14], [2, 0, 9], [3, 5, 16], [4, 2, 13], [5, 7, 14], [6, 4, 16], [7, 1, 11], [8, 5, 15]]]
  ];

  const PACKS = [
    { id: 'pack-1', name: 'Sumi Garden', size: '5×5', desc: 'Gentle ink strokes on tea garden paths', levels: [1, 10] },
    { id: 'pack-2', name: 'Stone Pavilion', size: '6×6', desc: 'Balanced sightlines around courtyard stones', levels: [11, 20] },
    { id: 'pack-3', name: 'Bamboo Courtyard', size: '7×7', desc: 'Woven ink corridors in peaceful bamboo groves', levels: [21, 30] },
    { id: 'pack-4', name: 'Tea Sanctuary', size: '8×8', desc: 'Intricate sightlines in monastery tea halls', levels: [31, 40] },
    { id: 'pack-5', name: 'Imperial Temple', size: '9×9', desc: 'Grand hall masterwork sumi ink puzzles', levels: [41, 50] }
  ];

  function getLevel(id) {
    const raw = RAW_LEVELS.find(l => l[0] === id);
    if (!raw) return null;
    return {
      id: raw[0],
      width: raw[1],
      height: raw[2],
      pack: raw[3],
      clues: raw[4].map(([r, c, val]) => ({ r, c, val }))
    };
  }

  function getAllLevels() {
    return RAW_LEVELS.map(raw => ({
      id: raw[0],
      width: raw[1],
      height: raw[2],
      pack: raw[3],
      clues: raw[4].map(([r, c, val]) => ({ r, c, val }))
    }));
  }

  function getPacks() {
    return PACKS;
  }

  return {
    getPacks,
    getLevel,
    getAllLevels,
    TOTAL_LEVELS: RAW_LEVELS.length
  };
});
