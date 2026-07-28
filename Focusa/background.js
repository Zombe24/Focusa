// Top-level listener so Chrome MV3 never misses the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusTimerAlarm') {
    // 1. Clear Focus Mode in Storage
    chrome.storage.local.set({ 
      focusMode: false,
      timerEndTime: null 
    }, () => {
      // 2. Notify content script in all open tabs to immediately remove overlay
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'DISABLE_FOCUS_MODE' }).catch(() => {
              // Ignore tabs that don't host content scripts (e.g. chrome:// settings)
            });
          }
        });
      });
    });
  }
});

// React to storage changes directly as a failsafe
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.focusMode) {
    if (changes.focusMode.newValue === false) {
      chrome.alarms.clear('focusTimerAlarm');
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'DISABLE_FOCUS_MODE' }).catch(() => {});
          }
        });
      });
    }
  }
});