window.addEventListener('DOMContentLoaded', async () => {
  const bindClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  bindClick('reset', () => window.reset && reset());
  bindClick('ok', () => window.finish_electron && finish_electron());
  bindClick('revert_image', () => window.revert_to_original_image && revert_to_original_image());
  bindClick('btn_demo_auto', () => window.open_demo && open_demo('demo_auto.png'));
  bindClick('btn_demo_hand', () => window.open_demo && open_demo('demo_hand.png'));
  bindClick('toggle_tuning', () => window.toggle_tuning && toggle_tuning());
  bindClick('btn_reset_param', () => window.reset_param && reset_param());
  bindClick('digitize', () => window.digitize_image && digitize_image());
  bindClick('undigitize', () => window.cancel_digitize && cancel_digitize());
  bindClick('btn_close_tuning', () => window.toggle_tuning && toggle_tuning());

  bindClick('copy_to_clipboard', () => window.update_sgf && update_sgf());
  bindClick('download', () => {
    const btn = document.getElementById('download');
    if (!btn || btn.disabled) return;
    const content = btn.dataset.content;
    const filename = btn.dataset.filename;
    if (content && filename) {
      const a = document.createElement('a');
      a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
      a.download = filename;
      a.click();
    }
  });

  if (typeof chrome !== 'undefined' && chrome.storage) {
    const result = await chrome.storage.local.get([
      'currentSnapshot', 'currentSnapshotSource',
      'goshawk_options', 'goshawk_param_memory'
    ]);

    const options = result.goshawk_options || { rememberParams: true, henViewerUrl: '', sgfViewerUrl: '' };
    const source = result.currentSnapshotSource || '';
    const paramMemory = result.goshawk_param_memory || {};
    const sourceKey = source ? getSourceKey(source) : 'local';

    if (options.rememberParams !== false && paramMemory[sourceKey]) {
      const savedParams = paramMemory[sourceKey];
      const tuningKeys = typeof default_tuning_param !== 'undefined' ? Object.keys(default_tuning_param) : [];
      let changed = false;
      tuningKeys.forEach(key => {
        if (key in savedParams && typeof param[key] === typeof savedParams[key]) {
          param[key] = savedParams[key];
          changed = true;
        }
      });
      if (changed && typeof update_forms === 'function') update_forms();
    }

    if (result.currentSnapshot) {
      load_image(result.currentSnapshot);
      chrome.storage.local.remove(['currentSnapshot', 'currentSnapshotSource']);
    }

    if (options.rememberParams !== false) {
      document.querySelectorAll('.export-button').forEach(btn => {
        btn.addEventListener('click', () => {
          const tuningKeys = typeof default_tuning_param !== 'undefined' ? Object.keys(default_tuning_param) : [];
          const tuningParams = {};
          tuningKeys.forEach(key => { tuningParams[key] = param[key]; });
          paramMemory[sourceKey] = tuningParams;
          chrome.storage.local.set({ goshawk_param_memory: paramMemory });
        });
      });
    }

    setupViewerButtons(options);
  }
});

function getSourceKey(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname || 'local';
  } catch {
    return 'local';
  }
}

function setupViewerButtons(options) {
  const container = document.getElementById('viewer_buttons');
  const henBtn = document.getElementById('view_hen');
  const sgfBtn = document.getElementById('view_sgf');
  if (!container) return;

  const hasHen = !!(options.henViewerUrl);
  const hasSgf = !!(options.sgfViewerUrl);

  if (hasHen || hasSgf) {
    container.style.display = 'flex';
  }

  if (henBtn && hasHen) {
    henBtn.disabled = false;
    henBtn.addEventListener('click', () => {
      const sgf = typeof get_sgf === 'function' ? get_sgf() : '';
      try {
        const hen = window.Hen ? Hen.sgf2hen(sgf) : '';
        const url = options.henViewerUrl.replace(/\$hen\$/g, encodeURIComponent(hen));
        window.open(url, '_blank');
      } catch (e) {
        console.error('GoShawk: failed to open HEN viewer:', e);
      }
    });
  }

  if (sgfBtn && hasSgf) {
    sgfBtn.disabled = false;
    sgfBtn.addEventListener('click', () => {
      const sgf = typeof get_sgf === 'function' ? get_sgf() : '';
      const url = options.sgfViewerUrl.replace(/\$sgf\$/g, encodeURIComponent(sgf));
      window.open(url, '_blank');
    });
  }
}
