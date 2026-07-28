document.addEventListener('DOMContentLoaded', () => {
  const focusToggle = document.getElementById('focusToggle');
  const noteInput = document.getElementById('noteInput');
  const siteInput = document.getElementById('siteInput');
  const addSiteBtn = document.getElementById('addSiteBtn');
  const siteListContainer = document.getElementById('siteListContainer');
  const customTimerInput = document.getElementById('customTimerInput');
  const startTimerBtn = document.getElementById('startTimerBtn');
  const timeLeftBadge = document.getElementById('timeLeftBadge');

  let countdownInterval = null;

  // Load Initial State
  chrome.storage.local.get(['focusMode', 'blockedSites', 'blockNote', 'selectedTimer', 'timerEndTime'], (result) => {
    focusToggle.checked = result.focusMode || false;
    noteInput.value = result.blockNote || '';
    renderSiteList(result.blockedSites || []);
    
    if (result.selectedTimer) {
      customTimerInput.value = result.selectedTimer;
    }

    checkTimerStatus(result.timerEndTime, result.focusMode);
  });

  function checkTimerStatus(timerEndTime, isFocusOn) {
    if (countdownInterval) clearInterval(countdownInterval);

    if (isFocusOn && timerEndTime && timerEndTime > Date.now()) {
      startTimerBtn.innerText = 'Active';
      startTimerBtn.classList.add('active'); // Turn button Orange
      updateMinutesLeft(timerEndTime);

      countdownInterval = setInterval(() => {
        const remainingMs = timerEndTime - Date.now();
        if (remainingMs <= 0) {
          clearInterval(countdownInterval);
          resetTimerUI();
          focusToggle.checked = false;
        } else {
          updateMinutesLeft(timerEndTime);
        }
      }, 2000);
    } else {
      resetTimerUI();
    }
  }

  function updateMinutesLeft(endTime) {
    const diffMs = endTime - Date.now();
    const minutesLeft = Math.ceil(diffMs / (1000 * 60));
    
    if (minutesLeft > 0) {
      timeLeftBadge.innerText = `${minutesLeft}m left`;
    } else {
      resetTimerUI();
    }
  }

  function resetTimerUI() {
    startTimerBtn.innerText = 'Start';
    startTimerBtn.classList.remove('active'); // Revert back to Blue
    timeLeftBadge.innerText = '';
  }

  // Toggle Focus Mode Switch
  focusToggle.addEventListener('change', () => {
    const isEnabled = focusToggle.checked;
    chrome.storage.local.set({ focusMode: isEnabled });

    if (!isEnabled) {
      chrome.alarms.clear('focusTimerAlarm');
      chrome.storage.local.set({ timerEndTime: null });
      if (countdownInterval) clearInterval(countdownInterval);
      resetTimerUI();
    }
  });

  // Start Timer Button
  startTimerBtn.addEventListener('click', () => {
    const minutes = parseFloat(customTimerInput.value);

    if (isNaN(minutes) || minutes <= 0) return;

    const endTime = Date.now() + (minutes * 60 * 1000);

    // Save state
    chrome.storage.local.set({ 
      focusMode: true, 
      selectedTimer: minutes,
      timerEndTime: endTime
    }, () => {
      focusToggle.checked = true;
      chrome.alarms.create('focusTimerAlarm', { delayInMinutes: minutes });
      checkTimerStatus(endTime, true);
    });
  });

  // Save Note
  noteInput.addEventListener('input', () => {
    chrome.storage.local.set({ blockNote: noteInput.value });
  });

  // Add Site
  addSiteBtn.addEventListener('click', addSite);
  siteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
  });

  function addSite() {
    const rawUrl = siteInput.value.trim().toLowerCase();
    if (!rawUrl) return;

    const domain = rawUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];

    chrome.storage.local.get(['blockedSites'], (result) => {
      const currentSites = result.blockedSites || [];
      if (!currentSites.includes(domain)) {
        const updatedSites = [...currentSites, domain];
        chrome.storage.local.set({ blockedSites: updatedSites }, () => {
          renderSiteList(updatedSites);
          siteInput.value = '';
        });
      }
    });
  }

  function renderSiteList(sites) {
    siteListContainer.innerHTML = '';
    sites.forEach(site => {
      const item = document.createElement('div');
      item.className = 'site-item';
      item.innerHTML = `
        <span>${site}</span>
        <button class="delete-btn" data-site="${site}">Delete</button>
      `;
      siteListContainer.appendChild(item);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetSite = e.target.dataset.site;
        removeSite(targetSite);
      });
    });
  }

  function removeSite(siteToRemove) {
    chrome.storage.local.get(['blockedSites'], (result) => {
      const currentSites = result.blockedSites || [];
      const updatedSites = currentSites.filter(s => s !== siteToRemove);
      chrome.storage.local.set({ blockedSites: updatedSites }, () => {
        renderSiteList(updatedSites);
      });
    });
  }
});