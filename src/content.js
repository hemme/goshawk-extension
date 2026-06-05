// content.js - runs in every page

(function () {
  let overlay = null;
  let selection = null;
  let startX, startY;
  let isSelecting = false;
  let options = {};

  // Listener for messages from popup or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'activateSelectionMode') {
      options = message.options || {};
      activateOverlay();
      sendResponse({ success: true });
    }
    if (message.action === 'cropScreenshot') {
      cropAndSave(message.dataUrl, message.rect, message.options);
    }
  });

  function activateOverlay() {
    if (overlay) return;

    // Create fullscreen overlay
    overlay = document.createElement('div');
    overlay.id = '__snapshot_overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 2147483647;
      cursor: crosshair;
      background: rgba(0,0,0,0.3);
    `;

    // Instruction tooltip
    const tooltip = document.createElement('div');
    tooltip.id = '__snapshot_tooltip';
    
    const tipIcon = document.createElement('img');
    tipIcon.src = chrome.runtime.getURL('icons/icon48.png');
    tipIcon.alt = 'GoShawk';
    tipIcon.style.cssText = 'width: 32px !important; height: 32px !important; display: block !important; flex-shrink: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important;';
    
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: center !important;
      gap: 2px !important;
      text-align: left !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: none !important;
    `;
    
    const line1 = document.createElement('div');
    line1.textContent = 'Drag to select an area';
    line1.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; font-weight: 600 !important; font-size: 13px !important; line-height: 1.2 !important; margin: 0 !important; padding: 0 !important; border: none !important; background: none !important; color: #fff !important;';
    
    const line2 = document.createElement('div');
    line2.textContent = 'ESC to cancel';
    line2.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; font-weight: 400 !important; font-size: 11px !important; opacity: 0.7 !important; line-height: 1.2 !important; margin: 0 !important; padding: 0 !important; border: none !important; background: none !important; color: #fff !important;';
    
    textContainer.appendChild(line1);
    textContainer.appendChild(line2);
    
    tooltip.appendChild(tipIcon);
    tooltip.appendChild(textContainer);
    
    tooltip.style.cssText = `
      position: fixed !important;
      top: 16px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(15, 15, 15, 0.95) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #fff !important;
      padding: 10px 16px !important;
      border-radius: 16px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      white-space: nowrap !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      margin: 0 !important;
    `;

    // Selection rectangle
    selection = document.createElement('div');
    selection.id = '__snapshot_selection';
    selection.style.cssText = `
      position: fixed;
      border: 2px solid #C4956A;
      background: rgba(196, 149, 106, 0.15);
      display: none;
      z-index: 2147483647;
      pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.4);
    `;

    // Size label
    const sizeLabel = document.createElement('div');
    sizeLabel.id = '__snapshot_size';
    sizeLabel.style.cssText = `
      position: fixed;
      background: rgba(196, 149, 106, 0.95);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      display: none;
      z-index: 2147483647;
      pointer-events: none;
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(tooltip);
    document.body.appendChild(selection);
    document.body.appendChild(sizeLabel);

    overlay.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
  }

  function onMouseDown(e) {
    e.preventDefault();
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    selection.style.left = startX + 'px';
    selection.style.top = startY + 'px';
    selection.style.width = '0';
    selection.style.height = '0';
    selection.style.display = 'block';
  }

  function onMouseMove(e) {
    if (!isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selection.style.left = left + 'px';
    selection.style.top = top + 'px';
    selection.style.width = width + 'px';
    selection.style.height = height + 'px';

    // Update size label
    const sizeLabel = document.getElementById('__snapshot_size');
    if (sizeLabel) {
      sizeLabel.style.display = 'block';
      sizeLabel.style.left = (left + width - 80) + 'px';
      sizeLabel.style.top = (top + height + 4) + 'px';
      sizeLabel.textContent = `${width} × ${height}`;
    }
  }

  function onMouseUp(e) {
    if (!isSelecting) return;
    isSelecting = false;

    const rect = selection.getBoundingClientRect();
    const selRect = {
      left: parseInt(selection.style.left),
      top: parseInt(selection.style.top),
      width: parseInt(selection.style.width),
      height: parseInt(selection.style.height)
    };

    if (selRect.width < 10 || selRect.height < 10) {
      cleanup();
      return;
    }

    // Show capturing feedback
    const tooltip = document.getElementById('__snapshot_tooltip');
    if (tooltip) tooltip.textContent = '⏳ Capturing…';

    // Request screenshot from background
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'captureScreenshot',
        tabId: null,
        rect: selRect,
        options
      });
    }, 50); // Small delay to let overlay effects settle
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  function cleanup() {
    isSelecting = false;
    window.__snapshotActive = false;

    ['__snapshot_overlay', '__snapshot_tooltip', '__snapshot_selection', '__snapshot_size'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    overlay = null;
    selection = null;

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);
  }

  // The listener above handles both activateSelectionMode and cropScreenshot

  function cropAndSave(dataUrl, rect, opts) {
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;

      const canvas = document.createElement('canvas');
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        rect.left * dpr,
        rect.top * dpr,
        rect.width * dpr,
        rect.height * dpr,
        0, 0,
        rect.width * dpr,
        rect.height * dpr
      );

      const format = opts?.format || 'png';
      const quality = opts?.highQuality ? 0.95 : 0.75;
      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

      const outputDataUrl = canvas.toDataURL(mimeType, quality);

      // Copy to clipboard if requested
      if (opts?.copyClipboard) {
        canvas.toBlob((blob) => {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).catch(console.error);
        });
      }

      // Open in sgf_from_image
      chrome.runtime.sendMessage({
        action: 'processSgf',
        dataUrl: outputDataUrl,
        options: opts
      });

      // Show success notification
      showNotification('✅ Snapshot captured!');
      cleanup();
    };
    img.src = dataUrl;
  }

  function showNotification(text) {
    const notif = document.createElement('div');
    notif.textContent = text;
    notif.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(196, 149, 106, 0.95);
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(196, 149, 106, 0.5);
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s';
      setTimeout(() => notif.remove(), 300);
    }, 2500);
  }
})();
