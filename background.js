const BLOCK_RULE_ID_START = 1000;

let currentTabId = null;
let currentDomain = null;
let startTime = null;

function getDomainFromUrl(url) {
  try {
    const parsed = new URL(url);

    const isInternal =
      parsed.protocol === 'chrome:' ||
      parsed.protocol === 'chrome-extension:' ||
      parsed.protocol === 'edge:' ||
      parsed.protocol === 'moz-extension:' ||
      parsed.hostname === 'chrome.google.com' ||  // Web Store
      parsed.hostname === 'localhost' ||           // dev testing
      parsed.hostname === 'newtab' ||              // new tab page
      parsed.hostname === 'extensions' ||          // internal extensions page
      parsed.hostname.includes('koabhgkfceeecebfhaongbfanmhagedj'); // your extension ID

    if (isInternal) return null;

    const domain = parsed.hostname;
    return domain.startsWith('www.') ? domain.slice(4) : domain;
  } catch (e) {
    return null;
  }
}


function saveTimeSpent(domain, timeSpentMs) {
  chrome.storage.local.get(['domainAnalytics'], data => {
    const analytics = data.domainAnalytics || {};
    if (!analytics[domain]) {
      analytics[domain] = { timeSpent: 0, visits: 0 };
    }
    analytics[domain].timeSpent += timeSpentMs;
    analytics[domain].visits += 1;
    chrome.storage.local.set({ domainAnalytics: analytics });
  });
}

function handleTabChange(tabId) {
  console.log('handleTabChange called for tab:', tabId);
  if (currentDomain && startTime) {
    const timeSpent = Date.now() - startTime;
    console.log(`Saving time spent for ${currentDomain}: ${timeSpent} ms`);
    try {
      saveTimeSpent(currentDomain, timeSpent);
    } catch (e) {
      console.error('Error saving time spent:', e);
    }
  }

  chrome.tabs.get(tabId, tab => {
    if (tab && tab.url) {
      currentTabId = tabId;
      currentDomain = getDomainFromUrl(tab.url);
      startTime = Date.now();
      console.log('Tracking new domain:', currentDomain);
    } else {
      console.warn('Tab info missing or URL unavailable');
      currentDomain = null;
      startTime = null;
    }
  });
}


chrome.tabs.onActivated.addListener(activeInfo => {
  handleTabChange(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.url || changeInfo.status === 'complete')) {
    handleTabChange(tabId);
  }
});


chrome.idle.onStateChanged.addListener(state => {
  if (state === 'idle' || state === 'locked') {
    if (currentDomain && startTime) {
      const timeSpent = Date.now() - startTime;
      saveTimeSpent(currentDomain, timeSpent);
      startTime = null;
      currentDomain = null;
    }
  }
});
// Get blocked sites from storage
async function getBlockedSites() {
  return new Promise(resolve => {
    chrome.storage.local.get(['blockedSites'], data => {
      resolve(data.blockedSites || []);
    });
  });
}

// Save blocked sites back to storage
async function saveBlockedSites(blockedSites) {
  return new Promise(resolve => {
    chrome.storage.local.set({ blockedSites }, () => resolve());
  });
}

// Remove expired blocks and return active blocks
async function cleanupExpiredBlocks() {
  const now = Date.now();
  let blockedSites = await getBlockedSites();

  const activeBlocks = blockedSites.filter(b => b.expiresAt > now);

  if (activeBlocks.length !== blockedSites.length) {
    await saveBlockedSites(activeBlocks);
  }

  return activeBlocks;
}

// Update the dynamic blocking rules based on active blocks
async function updateBlockingRules() {
  const activeBlocks = await cleanupExpiredBlocks();

  // Save the blocked URLs for blocked.html to read
  const urls = activeBlocks.map(block => block.url);
  await chrome.storage.local.set({ currentlyBlockedUrls: urls });

  const rules = activeBlocks.map((block, idx) => ({
    id: BLOCK_RULE_ID_START + idx,
    priority: 1,
    action: { 
      type: 'redirect', 
      redirect: { extensionPath: '/blocked.html' } 
    },
    condition: {
      urlFilter: block.url,
      resourceTypes: ['main_frame']
    }
  }));

  chrome.declarativeNetRequest.getDynamicRules(existingRules => {
    const ruleIdsToRemove = existingRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: rules
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error updating rules:', chrome.runtime.lastError);
      } else {
        console.log('Rules updated successfully');
      }
    });
  });
}

// Block a site for durationMinutes minutes
async function blockSite(urlPattern, durationMinutes) {
  const expiresAt = Date.now() + durationMinutes * 60 * 1000;
  let blockedSites = await getBlockedSites();
  const existingIndex = blockedSites.findIndex(b => b.url === urlPattern);
  if (existingIndex >= 0) {
    blockedSites[existingIndex].expiresAt = expiresAt;
  } else {
    blockedSites.push({ url: urlPattern, expiresAt });
  }
  await saveBlockedSites(blockedSites);
  await updateBlockingRules();
}

// Unblock a site immediately
async function unblockSite(urlPattern) {
  let blockedSites = await getBlockedSites();
  blockedSites = blockedSites.filter(b => b.url !== urlPattern);
  await saveBlockedSites(blockedSites);
  await updateBlockingRules();
}

chrome.alarms.create('checkExpiredBlocks', { periodInMinutes: 0.2 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'checkExpiredBlocks') {
    updateBlockingRules();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'blockSite') {
    blockSite(message.url, message.durationMinutes).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.action === 'unblockSite') {
    unblockSite(message.url).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.action === 'getBlockedSites') {
    getBlockedSites().then(sites => sendResponse({ sites }));
    return true;
  }
});
