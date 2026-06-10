document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startCapture');
  const status = document.getElementById('status');
  const hintText = document.getElementById('hintText');

  const manifest = chrome.runtime.getManifest();
  status.textContent = `v${manifest.version} \u2013 `;
  const link = document.createElement('a');
  link.href = 'https://github.com/hemme/goshawk-extension';
  link.target = '_blank';
  link.textContent = 'GitHub';
  status.appendChild(link);

  /*
   * Try each platform strategy to detect whether the active tab is a
   * live game with analysis disabled. The first matching strategy wins.
   */
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
          hintText.textContent = `💡 ${reason}`;
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
        status.textContent = 'Select an area on the page…';
        setTimeout(() => window.close(), 800);
      }
    });
  });
});
