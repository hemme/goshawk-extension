// Mock chrome extension APIs if running outside extension context (e.g. for testing/preview)
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getManifest) {
  window.chrome = {
    runtime: {
      getManifest: () => ({ version: '1.0.0-mock' }),
      lastError: null
    },
    storage: {
      local: {
        get: async () => ({ goshawk_options: { rememberParams: true, henViewerUrl: 'https://play.goshawk.cc/playgo/goban.html#$hen$', sgfViewerUrl: 'https://play.goshawk.cc/playgo/goban.html?sgf=$sgf$' } }),
        set: async () => {}
      }
    },
    tabs: {
      query: async () => [{ id: 1, url: 'https://example.com' }],
      sendMessage: (id, msg, cb) => {
        if (cb) cb({ success: true });
      }
    }
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startCapture');
  const status = document.getElementById('status');
  const hintText = document.getElementById('hintText');
  let defaultHint = hintText.textContent;

  const gearBtn = document.getElementById('gearBtn');
  const optionsPanel = document.getElementById('optionsPanel');
  const rememberParamsCheckbox = document.getElementById('rememberParams');
  const henViewerUrlInput = document.getElementById('henViewerUrl');
  const sgfViewerUrlInput = document.getElementById('sgfViewerUrl');

  gearBtn.addEventListener('click', () => {
    const isOpen = optionsPanel.classList.toggle('open');
    gearBtn.classList.toggle('active', isOpen);

    if (!isOpen) {
      setTimeout(() => {
        // Only trigger redraw and shrink if the panel is still closed
        if (!optionsPanel.classList.contains('open')) {
          const body = document.body;
          const originalHeight = body.style.height;
          const originalWidth = body.style.width;

          body.style.height = '1px';
          body.style.width = '1px';

          // Force a layout reflow
          body.offsetHeight;

          body.style.height = originalHeight;
          body.style.width = originalWidth;
        }
      }, 310); // Wait for the 300ms transition to finish
    }
  });

  const defaultOptions = { rememberParams: true, henViewerUrl: 'https://play.goshawk.cc/playgo/goban.html#$hen$', sgfViewerUrl: 'https://play.goshawk.cc/playgo/goban.html?sgf=$sgf$' };
  const stored = await chrome.storage.local.get(['goshawk_options']);
  const opts = stored.goshawk_options || defaultOptions;
  rememberParamsCheckbox.checked = opts.rememberParams !== false;
  henViewerUrlInput.value = opts.henViewerUrl || '';
  sgfViewerUrlInput.value = opts.sgfViewerUrl || '';

  const saveOptions = () => {
    chrome.storage.local.set({
      goshawk_options: {
        rememberParams: rememberParamsCheckbox.checked,
        henViewerUrl: henViewerUrlInput.value.trim(),
        sgfViewerUrl: sgfViewerUrlInput.value.trim(),
      }
    });
  };
  rememberParamsCheckbox.addEventListener('change', saveOptions);
  henViewerUrlInput.addEventListener('change', saveOptions);
  sgfViewerUrlInput.addEventListener('change', saveOptions);

  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener('click', () => {
      rememberParamsCheckbox.checked = defaultOptions.rememberParams;
      henViewerUrlInput.value = defaultOptions.henViewerUrl;
      sgfViewerUrlInput.value = defaultOptions.sgfViewerUrl;
      saveOptions();
    });
  }

  henViewerUrlInput.addEventListener('focus', () => {
    hintText.textContent = '💡 Enter HEN viewer URL. Use $hen$ as the content placeholder.';
  });
  henViewerUrlInput.addEventListener('blur', () => {
    hintText.textContent = defaultHint;
  });

  sgfViewerUrlInput.addEventListener('focus', () => {
    hintText.textContent = '💡 Enter SGF viewer URL. Use $sgf$ as the content placeholder.';
  });
  sgfViewerUrlInput.addEventListener('blur', () => {
    hintText.textContent = defaultHint;
  });

  const manifest = chrome.runtime.getManifest();
  status.textContent = `v${manifest.version} \u2013 `;
  const link = document.createElement('a');
  link.href = 'https://github.com/hemme/goshawk-extension';
  link.target = '_blank';
  link.textContent = 'GitHub';
  status.appendChild(link);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url?.startsWith('http')) {
      const url = new URL(tab.url);
      const strategy = window.PLATFORM_STRATEGIES.find(s => s.match(url));
      if (strategy) {
        const { disabled, reason } = await strategy.detectDisabled(tab.id);
        if (disabled) {
          startBtn.disabled = true;
          startBtn.title = reason;
          defaultHint = `\ud83d\udca1 ${reason}`;
          if (document.activeElement !== henViewerUrlInput && document.activeElement !== sgfViewerUrlInput) {
            hintText.textContent = defaultHint;
          }
        }
      }
    }
  } catch (e) {
    console.debug('GoShawk: platform detection failed', e);
  }

  if (startBtn.disabled) return;

  startBtn.addEventListener('click', async () => {
    const options = {
      format: 'png',
      highQuality: true,
      copyClipboard: false
    };

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      status.textContent = 'Error: no active tab.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'activateSelectionMode',
      options
    }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = "Error: " + chrome.runtime.lastError.message;
      } else {
        status.textContent = 'Select an area on the page\u2026';
        setTimeout(() => window.close(), 800);
      }
    });
  });
});
