// UI to add block and list current blocked sites

const urlInput = document.getElementById('url-input');
const durationInput = document.getElementById('duration-input');
const blockBtn = document.getElementById('block-btn');
const blockedList = document.getElementById('blocked-list');

function refreshBlockedList() {
  chrome.runtime.sendMessage({ action: 'getBlockedSites' }, response => {
    blockedList.innerHTML = '';
    if (!response.sites.length) {
      blockedList.innerHTML = '<li>No blocked sites</li>';
      return;
    }
    response.sites.forEach(site => {
      const li = document.createElement('li');
      const expireTime = new Date(site.expiresAt).toLocaleTimeString();
      li.textContent = `${site.url} - until ${expireTime}`;
      blockedList.appendChild(li);
    });
  });
}
document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

blockBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  const duration = parseInt(durationInput.value, 10);
  if (!url || !duration || duration <= 0) {
    alert('Please enter a valid URL and duration.');
    return;
  }

  chrome.runtime.sendMessage({ action: 'blockSite', url, durationMinutes: duration }, response => {
    if (response.success) {
      alert('Site blocked!');
      urlInput.value = '';
      durationInput.value = '';
      refreshBlockedList();
    }
  });
});
document.getElementById('showInsightsBtn').addEventListener('click', () => {
  chrome.storage.local.get('domainAnalytics', data => {
    const analytics = data.domainAnalytics || {};
    const container = document.getElementById('insightsContainer');
    container.innerHTML = ''; // clear previous

    if (Object.keys(analytics).length === 0) {
      container.textContent = 'No data available yet.';
      return;
    }

    const list = document.createElement('ul');

    for (const [domain, stats] of Object.entries(analytics)) {
      const timeSpentSeconds = Math.round(stats.timeSpent / 1000);
      const visits = stats.visits;
      const item = document.createElement('li');
      item.textContent = `${domain}: ${timeSpentSeconds} seconds over ${visits} visits`;
      list.appendChild(item);
    }

    container.appendChild(list);
  });
});


refreshBlockedList();
