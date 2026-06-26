let currentOptions = { rememberParams: true, henViewerUrl: 'https://play.goshawk.cc/playgo/goban.html#$hen$', sgfViewerUrl: 'https://play.goshawk.cc/playgo/goban.html?sgf=$sgf$' };

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

    currentOptions = result.goshawk_options || currentOptions;
    const source = result.currentSnapshotSource || '';
    const paramMemory = result.goshawk_param_memory || {};
    const sourceKey = source ? getSourceKey(source) : 'local';

    if (currentOptions.rememberParams !== false && paramMemory[sourceKey]) {
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

    if (currentOptions.rememberParams !== false) {
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

    setupViewerButtons();
    setupPreviewButton();

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.goshawk_options) {
        currentOptions = changes.goshawk_options.newValue || { rememberParams: true, henViewerUrl: 'https://play.goshawk.cc/playgo/goban.html#$hen$', sgfViewerUrl: 'https://play.goshawk.cc/playgo/goban.html?sgf=$sgf$' };
        if (typeof updateViewerButtonState === 'function') {
          updateViewerButtonState();
        }
      }
    });
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

function isViewerUrlValid(url, placeholder) {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;
  if (!trimmed.includes(placeholder)) return false;
  try {
    new URL(trimmed.replace(placeholder, 'dummy'));
    return true;
  } catch (e) {
    return false;
  }
}

function updateViewerButtonState() {
  const openViewerBtn = document.getElementById('open_viewer');
  if (!openViewerBtn) return;

  const activeFormat = document.querySelector('input[name="copy_format"]:checked')?.value || 'sgf';
  let url = '';
  let placeholder = '';

  if (activeFormat === 'hen') {
    url = currentOptions.henViewerUrl || '';
    placeholder = '$hen$';
  } else {
    url = currentOptions.sgfViewerUrl || '';
    placeholder = '$sgf$';
  }

  const isValid = isViewerUrlValid(url, placeholder);
  openViewerBtn.disabled = !isValid;
  openViewerBtn.title = isValid ? `Open in ${activeFormat.toUpperCase()} viewer` : `Viewer URL for ${activeFormat.toUpperCase()} is invalid or not configured`;
}

function setupViewerButtons() {
  const openViewerBtn = document.getElementById('open_viewer');
  if (!openViewerBtn) return;

  // Initial check
  updateViewerButtonState();

  // Listen for copy format changes
  document.querySelectorAll('input[name="copy_format"]').forEach(radio => {
    radio.addEventListener('change', updateViewerButtonState);
  });

  // Handle click on the open viewer button
  openViewerBtn.addEventListener('click', () => {
    if (openViewerBtn.disabled) return;
    const activeFormat = document.querySelector('input[name="copy_format"]:checked')?.value || 'sgf';
    const sgf = typeof get_sgf === 'function' ? get_sgf() : '';

    if (activeFormat === 'hen') {
      try {
        const hen = window.Hen ? Hen.sgf2hen(sgf) : '';
        const url = currentOptions.henViewerUrl.replace(/\$hen\$/g, encodeURIComponent(hen));
        window.open(url, '_blank');
      } catch (e) {
        console.error('GoShawk: failed to open HEN viewer:', e);
      }
    } else {
      const url = currentOptions.sgfViewerUrl.replace(/\$sgf\$/g, encodeURIComponent(sgf));
      window.open(url, '_blank');
    }
  });
}

function setupPreviewButton() {
  const previewBtn = document.getElementById('preview_btn');
  const modal = document.getElementById('preview_modal');
  if (!previewBtn || !modal) return;

  previewBtn.addEventListener('click', () => {
    if (previewBtn.disabled) return;
    const sgf = typeof get_sgf === 'function' ? get_sgf() : '';
    const hen = window.Hen ? Hen.sgf2hen(sgf) : '';
    if (!hen) {
      openPreviewModal(null, 'No position to preview.');
      return;
    }
    const url = `https://wrk.GoShawk.cc/cx/hen${encodeURIComponent(hen)}.gif`;
    openPreviewModal(url);
  });

  modal.querySelectorAll('[data-preview-close]').forEach(el => {
    el.addEventListener('click', closePreviewModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closePreviewModal();
  });
}

function openPreviewModal(url, message) {
  const modal = document.getElementById('preview_modal');
  const img = document.getElementById('preview_img');
  const msg = document.getElementById('preview_msg');
  if (!modal || !img || !msg) return;

  if (url) {
    img.onload = () => { img.hidden = false; msg.textContent = ''; };
    img.onerror = () => { img.hidden = true; msg.textContent = 'Image not available.'; };
    msg.textContent = 'Loading...';
    img.hidden = true;
    img.src = url;
    if (img.complete && img.naturalWidth > 0) { img.hidden = false; msg.textContent = ''; }
  } else {
    img.onload = null;
    img.onerror = null;
    img.removeAttribute('src');
    img.hidden = true;
    msg.textContent = message || '';
  }
  modal.hidden = false;
}

function closePreviewModal() {
  const modal = document.getElementById('preview_modal');
  if (!modal) return;
  modal.hidden = true;
  const img = document.getElementById('preview_img');
  const msg = document.getElementById('preview_msg');
  if (img) { img.onload = null; img.onerror = null; img.removeAttribute('src'); img.hidden = true; }
  if (msg) msg.textContent = '';
}
