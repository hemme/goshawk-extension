window.addEventListener('DOMContentLoaded', () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['currentSnapshot'], (result) => {
      if (result.currentSnapshot) {
        load_image(result.currentSnapshot);
        chrome.storage.local.remove(['currentSnapshot']);
      }
    });
  }

  // Bind event listeners to replace inline onclicks blocked by CSP
  const bindClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

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
});
