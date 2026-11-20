/**
 * PATHLAB — Save & Load Projects Module
 * 
 * Architecture: IndexedDB for persistence (algviz_projects DB, projects store).
 * Integration: Reads/writes the same global variables that the main app uses:
 *   Path Finder: grid[][], startR, startC, endR, endC, ROWS, COLS, build(), paint()
 *   Sudoku: sudoku (SudokuState), renderSudokuBoardUI(), initSudokuModule()
 * 
 * Exposes: window.ProjectsDB (the storage API)
 * Schema version: 1
 */
(function () {
  'use strict';

  /* =====================================================================
     1. IndexedDB Storage Engine
     ===================================================================== */
  const DB_NAME = 'algviz_projects';
  const DB_VERSION = 1;
  const STORE_NAME = 'projects';

  let _db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function txn(mode) {
    return _db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  function idbGet(id) {
    return new Promise((res, rej) => {
      const req = txn('readonly').get(id);
      req.onsuccess = () => res(req.result || null);
      req.onerror = (e) => rej(e.target.error);
    });
  }

  function idbGetAll() {
    return new Promise((res, rej) => {
      const req = txn('readonly').getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = (e) => rej(e.target.error);
    });
  }

  function idbPut(record) {
    return new Promise((res, rej) => {
      const req = txn('readwrite').put(record);
      req.onsuccess = () => res(req.result);
      req.onerror = (e) => rej(e.target.error);
    });
  }

  function idbDelete(id) {
    return new Promise((res, rej) => {
      const req = txn('readwrite').delete(id);
      req.onsuccess = () => res();
      req.onerror = (e) => rej(e.target.error);
    });
  }

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /* =====================================================================
     2. Data Capture — serialize current app state
     ===================================================================== */

  function capturePathfinderState() {
    // Access the global variables directly
    const walls = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c].wall) walls.push([r, c]);
      }
    }
    return {
      rows: ROWS,
      cols: COLS,
      startR, startC,
      endR, endC,
      walls,
      algorithm: document.getElementById('algo') ? document.getElementById('algo').value : 'astar'
    };
  }

  function captureSudokuState() {
    const board = [];
    const given = [];
    for (let r = 0; r < 9; r++) {
      board.push([...sudoku.board[r]]);
      given.push([...sudoku.given[r]]);
    }
    const diffEl = document.getElementById('selSudokuDifficulty');
    const presetEl = document.getElementById('selSudokuPreset');
    return {
      board,
      given,
      difficulty: diffEl ? diffEl.value : 'medium',
      preset: presetEl ? presetEl.value : 'custom',
      speedMs: sudoku.speedMs
    };
  }

  /* =====================================================================
     3. Data Restore — deserialize a saved record into the app
     ===================================================================== */

  function restorePathfinderState(data) {
    // Validate
    if (!data || typeof data.rows !== 'number' || typeof data.cols !== 'number') {
      throw new Error('Invalid Path Finder project data');
    }
    if (data.rows < 5 || data.rows > 60 || data.cols < 5 || data.cols > 100) {
      throw new Error('Grid dimensions out of valid range');
    }

    ROWS = data.rows;
    COLS = data.cols;
    startR = data.startR;
    startC = data.startC;
    endR = data.endR;
    endC = data.endC;

    // Rebuild grid with given dimensions
    build();

    // Restore walls
    if (Array.isArray(data.walls)) {
      for (const [r, c] of data.walls) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          grid[r][c].wall = true;
        }
      }
    }

    // Re-paint to show restored state
    paint();

    // Restore algorithm selection if present
    if (data.algorithm) {
      const algoEl = document.getElementById('algo');
      if (algoEl) {
        const opt = algoEl.querySelector(`option[value="${data.algorithm}"]`);
        if (opt) algoEl.value = data.algorithm;
      }
    }
  }

  function restoreSudokuState(data) {
    if (!data || !Array.isArray(data.board) || data.board.length !== 9) {
      throw new Error('Invalid Sudoku project data');
    }

    // Validate cell values
    for (let r = 0; r < 9; r++) {
      if (!Array.isArray(data.board[r]) || data.board[r].length !== 9) {
        throw new Error('Corrupted board row at index ' + r);
      }
      for (let c = 0; c < 9; c++) {
        const v = data.board[r][c];
        if (typeof v !== 'number' || v < 0 || v > 9) {
          throw new Error(`Invalid cell value ${v} at [${r}][${c}]`);
        }
      }
    }

    // Make sure Sudoku module is initialized
    if (!sudokuInitialized) {
      initSudokuModule();
    }

    // Restore board and given arrays
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        sudoku.board[r][c] = data.board[r][c];
        sudoku.given[r][c] = Array.isArray(data.given) ? !!data.given[r][c] : data.board[r][c] !== 0;
      }
    }
    sudoku.resetStats();

    // Restore UI controls
    if (data.difficulty) {
      const diffEl = document.getElementById('selSudokuDifficulty');
      if (diffEl) diffEl.value = data.difficulty;
    }
    if (data.speedMs !== undefined) {
      sudoku.speedMs = data.speedMs;
    }

    renderSudokuBoardUI();
  }

  /* =====================================================================
     4. Public ProjectsDB API
     ===================================================================== */

  window.ProjectsDB = {
    async init() {
      await openDB();
    },

    async savePathfinderProject(name) {
      const data = capturePathfinderState();
      const now = Date.now();
      const record = {
        id: generateId(),
        type: 'pathfinder',
        name: name.trim() || 'Untitled Path Finder',
        createdAt: now,
        modifiedAt: now,
        version: 1,
        data
      };
      await idbPut(record);
      return record;
    },

    async saveSudokuProject(name) {
      const data = captureSudokuState();
      const now = Date.now();
      const record = {
        id: generateId(),
        type: 'sudoku',
        name: name.trim() || 'Untitled Sudoku',
        createdAt: now,
        modifiedAt: now,
        version: 1,
        data
      };
      await idbPut(record);
      return record;
    },

    async loadProject(id) {
      const record = await idbGet(id);
      if (!record) throw new Error('Project not found');

      if (record.type === 'pathfinder') {
        restorePathfinderState(record.data);
        switchAppMode('pathfinding');
      } else if (record.type === 'sudoku') {
        restoreSudokuState(record.data);
        switchAppMode('sudoku');
      } else {
        throw new Error('Unknown project type: ' + record.type);
      }
      return record;
    },

    async getAllProjects() {
      return idbGetAll();
    },

    async renameProject(id, newName) {
      const record = await idbGet(id);
      if (!record) throw new Error('Project not found');
      record.name = newName.trim() || record.name;
      record.modifiedAt = Date.now();
      await idbPut(record);
      return record;
    },

    async deleteProject(id) {
      await idbDelete(id);
    },

    exportJSON(record) {
      const payload = {
        appVersion: 1,
        exportedAt: new Date().toISOString(),
        type: record.type,
        name: record.name,
        createdAt: record.createdAt,
        modifiedAt: record.modifiedAt,
        data: record.data
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = record.name.replace(/[^a-z0-9_\-]/gi, '_');
      a.href = url;
      a.download = `algviz_${record.type}_${safeName}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },

    async importJSON(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          let payload;
          try {
            payload = JSON.parse(e.target.result);
          } catch {
            return reject(new Error('Invalid JSON: File is not valid JSON.'));
          }

          // Structure validation
          if (!payload.type || !payload.data) {
            return reject(new Error('Invalid format: Missing required fields (type, data).'));
          }
          if (payload.type !== 'pathfinder' && payload.type !== 'sudoku') {
            return reject(new Error(`Unknown project type "${payload.type}". Expected "pathfinder" or "sudoku".`));
          }
          if (payload.appVersion !== 1) {
            return reject(new Error(`Incompatible version ${payload.appVersion}. This app supports version 1.`));
          }

          // Type-specific validation
          if (payload.type === 'pathfinder') {
            const d = payload.data;
            if (typeof d.rows !== 'number' || typeof d.cols !== 'number' ||
                typeof d.startR !== 'number' || typeof d.startC !== 'number' ||
                typeof d.endR !== 'number' || typeof d.endC !== 'number') {
              return reject(new Error('Path Finder data is missing required grid fields.'));
            }
            if (!Array.isArray(d.walls)) {
              return reject(new Error('Path Finder data has invalid walls array.'));
            }
          }

          if (payload.type === 'sudoku') {
            if (!Array.isArray(payload.data.board) || payload.data.board.length !== 9) {
              return reject(new Error('Sudoku data has an invalid board (expected 9×9).'));
            }
            for (let r = 0; r < 9; r++) {
              const row = payload.data.board[r];
              if (!Array.isArray(row) || row.length !== 9) {
                return reject(new Error(`Sudoku board row ${r} is invalid.`));
              }
              for (const v of row) {
                if (typeof v !== 'number' || v < 0 || v > 9) {
                  return reject(new Error(`Invalid cell value "${v}" in Sudoku board.`));
                }
              }
            }
          }

          // Persist to DB
          const now = Date.now();
          const record = {
            id: generateId(),
            type: payload.type,
            name: payload.name || 'Imported Project',
            createdAt: payload.createdAt || now,
            modifiedAt: now,
            version: 1,
            data: payload.data
          };
          await idbPut(record);
          resolve(record);
        };
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsText(file);
      });
    }
  };

  /* =====================================================================
     5. Projects Dashboard UI
     ===================================================================== */

  function formatDate(ts) {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  }

  function typeIcon(type) {
    return type === 'pathfinder' ? '🗺️' : '🧩';
  }

  function typeLabel(type) {
    return type === 'pathfinder' ? 'Path Finder' : 'Sudoku Solver';
  }

  function typeBadgeClass(type) {
    return type === 'pathfinder' ? 'proj-badge-path' : 'proj-badge-sudoku';
  }

  function showToast(msg, isError = false) {
    const t = document.getElementById('projToast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'proj-toast ' + (isError ? 'proj-toast-error' : 'proj-toast-success');
    t.style.display = 'block';
    clearTimeout(t._tid);
    t._tid = setTimeout(() => { t.style.display = 'none'; }, 3200);
  }

  async function renderProjectsDashboard() {
    const container = document.getElementById('projectsListContainer');
    const searchEl = document.getElementById('projSearch');
    const filterEl = document.getElementById('projFilter');
    if (!container) return;

    let projects = await ProjectsDB.getAllProjects();
    projects.sort((a, b) => b.modifiedAt - a.modifiedAt);

    // Search filter
    const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const f = filterEl ? filterEl.value : 'all';
    if (q) projects = projects.filter(p => p.name.toLowerCase().includes(q));
    if (f !== 'all') projects = projects.filter(p => p.type === f);

    // Update count badge
    const all = await ProjectsDB.getAllProjects();
    const badge = document.getElementById('projCountBadge');
    if (badge) badge.textContent = all.length;

    if (projects.length === 0) {
      container.innerHTML = `
        <div class="proj-empty">
          <div class="proj-empty-icon">📂</div>
          <h3 class="proj-empty-title">${q || f !== 'all' ? 'No projects match your filter' : 'No Saved Projects Yet'}</h3>
          <p class="proj-empty-desc">${q || f !== 'all'
            ? 'Try a different search or filter.'
            : 'Save your current Path Finder grid or Sudoku puzzle using the <strong>Save Project</strong> button in each visualizer.'}</p>
        </div>`;
      return;
    }

    container.innerHTML = projects.map(p => `
      <article class="proj-card" data-id="${p.id}" data-type="${p.type}">
        <div class="proj-card-left">
          <div class="proj-card-icon">${typeIcon(p.type)}</div>
          <div class="proj-card-info">
            <span class="proj-badge ${typeBadgeClass(p.type)}">${typeLabel(p.type)}</span>
            <div class="proj-name" id="proj-name-${p.id}">${escapeHtml(p.name)}</div>
            <div class="proj-meta">
              <span title="Created">📅 ${formatDate(p.createdAt)}</span>
              <span title="Last Modified" style="margin-left:12px">✏️ Modified ${formatDate(p.modifiedAt)}</span>
              ${p.type === 'pathfinder' && p.data
                ? `<span style="margin-left:12px">📐 ${p.data.cols}×${p.data.rows} grid • ${(p.data.walls || []).length} walls</span>` : ''}
              ${p.type === 'sudoku' && p.data
                ? `<span style="margin-left:12px">🎯 ${p.data.difficulty || 'custom'} difficulty</span>` : ''}
            </div>
          </div>
        </div>
        <div class="proj-card-actions">
          <button class="btn btn-sm btn-primary proj-load-btn" data-id="${p.id}" title="Load this project">
            ▶ Load
          </button>
          <button class="btn btn-sm proj-export-btn" data-id="${p.id}" title="Export as JSON">
            ⬇ Export
          </button>
          <button class="btn btn-sm proj-rename-btn" data-id="${p.id}" title="Rename">
            ✏️
          </button>
          <button class="btn btn-sm btn-danger proj-delete-btn" data-id="${p.id}" title="Delete">
            🗑️
          </button>
        </div>
      </article>
    `).join('');

    // Wire buttons
    container.querySelectorAll('.proj-load-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          const record = await ProjectsDB.loadProject(id);
          switchAppMode(record.type === 'pathfinder' ? 'pathfinding' : 'sudoku');
          showToast(`✅ Loaded: "${record.name}"`);
        } catch (err) {
          showToast(`❌ Load failed: ${err.message}`, true);
        }
      });
    });

    container.querySelectorAll('.proj-export-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const record = await idbGet(btn.dataset.id);
          ProjectsDB.exportJSON(record);
          showToast('✅ Exported successfully');
        } catch (err) {
          showToast(`❌ Export failed: ${err.message}`, true);
        }
      });
    });

    container.querySelectorAll('.proj-rename-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const record = await idbGet(id);
        const nameEl = document.getElementById(`proj-name-${id}`);
        const oldName = record.name;

        // Inline rename
        nameEl.innerHTML = `<input class="proj-inline-rename" type="text" value="${escapeHtml(oldName)}" maxlength="80" />`;
        const inp = nameEl.querySelector('input');
        inp.focus(); inp.select();

        const commit = async () => {
          const newName = inp.value.trim();
          if (newName && newName !== oldName) {
            try {
              await ProjectsDB.renameProject(id, newName);
              showToast(`✅ Renamed to "${newName}"`);
            } catch (err) {
              showToast(`❌ Rename failed: ${err.message}`, true);
            }
          }
          renderProjectsDashboard();
        };
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') renderProjectsDashboard(); });
      });
    });

    container.querySelectorAll('.proj-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const record = await idbGet(id);
        const modal = document.getElementById('projDeleteModal');
        const msgEl = document.getElementById('projDeleteMsg');
        msgEl.textContent = `Delete "${record.name}"? This cannot be undone.`;
        modal.style.display = 'flex';
        document.getElementById('projDeleteConfirm').onclick = async () => {
          modal.style.display = 'none';
          try {
            await ProjectsDB.deleteProject(id);
            showToast('🗑️ Project deleted');
            renderProjectsDashboard();
          } catch (err) {
            showToast(`❌ Delete failed: ${err.message}`, true);
          }
        };
        document.getElementById('projDeleteCancel').onclick = () => { modal.style.display = 'none'; };
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* =====================================================================
     6. Save Dialog (Modal for naming the project)
     ===================================================================== */

  function openSaveDialog(type) {
    const modal = document.getElementById('projSaveModal');
    const title = document.getElementById('projSaveTitle');
    const inp = document.getElementById('projSaveNameInput');
    const confirmBtn = document.getElementById('projSaveConfirm');
    const errEl = document.getElementById('projSaveError');

    title.textContent = type === 'pathfinder' ? '💾 Save Path Finder Grid' : '💾 Save Sudoku Puzzle';

    // Smart default name
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    inp.value = type === 'pathfinder' ? `Path Finder – ${dateStr}` : `Sudoku – ${dateStr}`;

    errEl.textContent = '';
    modal.style.display = 'flex';
    setTimeout(() => { inp.focus(); inp.select(); }, 50);

    // Remove old handlers
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
      const name = inp.value.trim();
      if (!name) { errEl.textContent = 'Please enter a project name.'; return; }

      try {
        newConfirmBtn.disabled = true;
        newConfirmBtn.textContent = 'Saving…';
        let record;
        if (type === 'pathfinder') {
          record = await ProjectsDB.savePathfinderProject(name);
        } else {
          record = await ProjectsDB.saveSudokuProject(name);
        }
        modal.style.display = 'none';
        showToast(`✅ Saved: "${record.name}"`);
        // If projects view is open, refresh it
        if (currentAppMode === 'projects') renderProjectsDashboard();
      } catch (err) {
        errEl.textContent = 'Save failed: ' + err.message;
        newConfirmBtn.disabled = false;
        newConfirmBtn.textContent = 'Save';
      }
    });
  }

  /* =====================================================================
     7. Import file handler
     ===================================================================== */

  function triggerImport() {
    const inp = document.getElementById('projImportFileInput');
    inp.value = '';
    inp.click();
  }

  async function handleImportFile(file) {
    if (!file) return;
    try {
      const record = await ProjectsDB.importJSON(file);
      showToast(`✅ Imported: "${record.name}"`);
      if (currentAppMode === 'projects') renderProjectsDashboard();
    } catch (err) {
      showToast(`❌ Import failed: ${err.message}`, true);
    }
  }

  /* =====================================================================
     8. Wire everything after DOM is ready
     ===================================================================== */

  async function init() {
    try {
      await ProjectsDB.init();
    } catch (err) {
      console.error('[ProjectsDB] IndexedDB init failed:', err);
      showToast('⚠️ Projects storage unavailable: ' + err.message, true);
      return;
    }

    // Nav tab – My Projects
    const navBtn = document.getElementById('btnNavProjects');
    if (navBtn) {
      navBtn.addEventListener('click', () => switchAppMode('projects'));
    }

    // Save buttons in Path Finder toolbar
    const savePathBtn = document.getElementById('btnSavePathProject');
    if (savePathBtn) {
      savePathBtn.addEventListener('click', () => openSaveDialog('pathfinder'));
    }

    // Save button in Sudoku toolbar
    const saveSudokuBtn = document.getElementById('btnSaveSudokuProject');
    if (saveSudokuBtn) {
      saveSudokuBtn.addEventListener('click', () => openSaveDialog('sudoku'));
    }

    // Import button (global, works from projects view)
    const importBtn = document.getElementById('btnImportJSON');
    if (importBtn) {
      importBtn.addEventListener('click', triggerImport);
    }

    // Hidden file input for import
    const fileInput = document.getElementById('projImportFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => handleImportFile(e.target.files[0]));
    }

    // Projects search & filter
    const searchEl = document.getElementById('projSearch');
    const filterEl = document.getElementById('projFilter');
    if (searchEl) searchEl.addEventListener('input', renderProjectsDashboard);
    if (filterEl) filterEl.addEventListener('change', renderProjectsDashboard);

    // Save modal cancel
    const saveModalCancel = document.getElementById('projSaveCancel');
    if (saveModalCancel) {
      saveModalCancel.addEventListener('click', () => {
        document.getElementById('projSaveModal').style.display = 'none';
      });
    }

    // Save modal Enter key on input
    const saveNameInp = document.getElementById('projSaveNameInput');
    if (saveNameInp) {
      saveNameInp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('projSaveConfirm').click();
        if (e.key === 'Escape') document.getElementById('projSaveModal').style.display = 'none';
      });
    }

    // Modal backdrop click to close
    ['projSaveModal', 'projDeleteModal'].forEach(id => {
      const m = document.getElementById(id);
      if (m) m.addEventListener('click', (e) => { if (e.target === m) m.style.display = 'none'; });
    });

    // Expose renderProjectsDashboard for switchAppMode to call
    window._renderProjectsDashboard = renderProjectsDashboard;

    console.log('[ProjectsDB] Save & Load module ready');
  }

  // Run after page load (or immediately if already loaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
