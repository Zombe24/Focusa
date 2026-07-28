const currentHost = window.location.hostname.toLowerCase();

function initFocusCheck() {
  chrome.storage.local.get(['focusMode', 'blockedSites', 'blockNote', 'timerEndTime'], (result) => {
    const isEnabled = result.focusMode || false;
    const sites = result.blockedSites || [];
    const userNote = result.blockNote || "Stay focused.";
    const endTime = result.timerEndTime || null;

    // Failsafe: If timer expired in the past, disable focus mode immediately
    if (endTime && Date.now() >= endTime) {
      chrome.storage.local.set({ focusMode: false, timerEndTime: null });
      removeOverlay();
      return;
    }

    const isEntertainment = sites.some(site => currentHost.includes(site));

    if (isEnabled && isEntertainment) {
      blockPage(userNote);
    } else {
      removeOverlay();
    }
  });
}

// Run check on load
initFocusCheck();

// Listen for disable event from background.js
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'DISABLE_FOCUS_MODE') {
    removeOverlay();
  }
});

function removeOverlay() {
  const overlay = document.getElementById('focus-pro-overlay');
  const style = document.getElementById('focus-pro-style');
  if (overlay) overlay.remove();
  if (style) style.remove();
  document.documentElement.style.overflow = '';
}

function blockPage(noteText) {
  if (document.getElementById('focus-pro-overlay')) return;

  const style = document.createElement('style');
  style.id = 'focus-pro-style';
  style.innerHTML = `
    html, body { 
      overflow: hidden !important; 
      height: 100vh !important; 
      margin: 0 !important; 
      padding: 0 !important; 
    }

    @keyframes focusOverlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes focusCardScaleUp {
      from { 
        opacity: 0; 
        transform: scale(0.94); 
      }
      to { 
        opacity: 1; 
        transform: scale(1); 
      }
    }

    #focus-pro-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;

      background: rgba(15, 15, 18, 0.65);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);

      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
      color: #ffffff;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;

      animation: focusOverlayFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Top-Left Logo Styling with Translucency */
    #focus-pro-overlay .overlay-brand-logo {
      position: absolute;
      top: 28px;
      left: 28px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: contain;
      opacity: 0.7;
      transition: opacity 0.25s ease;
    }

    #focus-pro-overlay .overlay-brand-logo:hover {
      opacity: 0.8;
    }

    #focus-pro-card {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-top: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35), 0 0 1px rgba(255, 255, 255, 0.1) inset;
      
      border-radius: 24px;
      padding: 36px 32px;
      max-width: 440px;
      width: 100%;
      box-sizing: border-box;

      display: flex;
      flex-direction: column;
      align-items: center;

      animation: focusCardScaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    #focus-pro-overlay h1 {
      font-size: 32px;
      font-weight: 650;
      color: #ffffff;
      margin: 0 0 14px 0;
      letter-spacing: -0.3px;
    }

    #focus-pro-overlay .user-message { 
      font-size: 16px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.85);
      line-height: 1.5;
      margin: 0;
      word-break: break-word;
    }

    #focus-pro-overlay .footer-tip { 
      font-size: 13px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.45);
      margin-top: 24px;
      letter-spacing: -0.1px;
    }
  `;
  document.documentElement.appendChild(style);

  // Load extension logo dynamically
  const logoUrl = chrome.runtime.getURL('icons/icon128.png');

  const overlay = document.createElement('div');
  overlay.id = 'focus-pro-overlay';
  overlay.innerHTML = `
    <img src="${logoUrl}" alt="Focusa Logo" class="overlay-brand-logo">
    <div id="focus-pro-card">
      <h1>Focus mode active</h1>
      <p class="user-message">${escapeHtml(noteText)}</p>
    </div>
    <div class="footer-tip">You can modify your targets or disable this block via the Focusa menu.</div>
  `;
  
  document.documentElement.appendChild(overlay);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}