chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    // Capture the visible tab (use explicit windowId for cross-browser compatibility)
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        // Send screenshot back to content script for cropping
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'cropScreenshot',
          dataUrl,
          rect: message.rect,
          options: message.options
        });
      } catch (err) {
        console.error('captureVisibleTab failed:', err);
      }
    })();
    return true; // keep message channel open for async response
  }

  if (message.action === 'processSgf') {
    const source = sender.tab?.url || '';
    chrome.storage.local.set({ currentSnapshot: message.dataUrl, currentSnapshotSource: source }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('sgf_from_image/sgf_from_image.html') });
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['goshawk_options'], (result) => {
    if (!result.goshawk_options) {
      chrome.storage.local.set({
        goshawk_options: {
          rememberParams: true,
          henViewerUrl: 'https://play.goshawk.cc/playgo/goban.html#$hen$',
          sgfViewerUrl: 'https://play.goshawk.cc/playgo/goban.html?sgf=$sgf$'
        }
      });
    }
  });
});


