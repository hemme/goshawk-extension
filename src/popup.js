document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startCapture');
  const status = document.getElementById('status');

  const manifest = chrome.runtime.getManifest();
  status.textContent = `v${manifest.version} \u2013 `;
  const link = document.createElement('a');
  link.href = 'https://github.com/hemme/goshawk-extension';
  link.target = '_blank';
  link.textContent = 'GitHub';
  status.appendChild(link);

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
