document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startCapture');
  const status = document.getElementById('status');
  const hintText = document.getElementById('hintText');

  const gearBtn = document.getElementById('gearBtn');
  const optionsPanel = document.getElementById('optionsPanel');
  const rememberParamsCheckbox = document.getElementById('rememberParams');
  const henViewerUrlInput = document.getElementById('henViewerUrl');
  const sgfViewerUrlInput = document.getElementById('sgfViewerUrl');

  gearBtn.addEventListener('click', () => {
    const isOpen = optionsPanel.classList.toggle('open');
    gearBtn.classList.toggle('active', isOpen);
  });

  const defaultOptions = { rememberParams: true, henViewerUrl: '', sgfViewerUrl: '' };
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
          hintText.textContent = `\ud83d\udca1 ${reason}`;
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
