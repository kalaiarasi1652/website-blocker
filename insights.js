function getTodayDateString() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function showInsights() {
  chrome.storage.local.get(['domainAnalytics'], data => {
    const analytics = data.domainAnalytics || {};
    const todayStr = getTodayDateString();

    // Calculate total time spent today
    let totalTimeToday = 0;
    for (const domain in analytics) {
      if (analytics[domain][todayStr]) {
        totalTimeToday += analytics[domain][todayStr].timeSpent;
      }
    }

    // Display total time at the top
    const totalTimeContainer = document.getElementById('total-time-today');
    totalTimeContainer.textContent = `Total Time Spent Today: ${msToHMS(totalTimeToday)}`;

    // Show per-domain stats for today
    const list = document.getElementById('insights-list');
    list.innerHTML = ''; // clear previous

    for (const domain in analytics) {
      if (analytics[domain][todayStr]) {
        const timeSpent = analytics[domain][todayStr].timeSpent;
        const visits = analytics[domain][todayStr].visits;

        const li = document.createElement('li');
        li.textContent = `${domain}: ${msToHMS(timeSpent)} over ${visits} visit(s)`;
        list.appendChild(li);
      }
    }

    if (list.children.length === 0) {
      list.innerHTML = '<li>No insights available for today.</li>';
    }
  });
}

document.addEventListener('DOMContentLoaded', showInsights);

document.addEventListener('DOMContentLoaded', () => {
  const insightsList = document.getElementById('insights-list');

  chrome.storage.local.get(['domainAnalytics'], data => {
    const analytics = data.domainAnalytics || {};

    const isValidDomain = domain =>
      domain &&
      !domain.startsWith('chrome') &&
      !domain.includes('chrome-extension') &&
      !domain.includes('koabhgkfceeecebfhaongbfanmhagedj') &&
      !domain.includes('newtab') &&
      !domain.includes('localhost') &&
      !domain.includes('extensions') &&
      !domain.includes('moz-extension') &&
      !domain.includes('edge') &&
      !domain.includes('devtools');

    const sorted = Object.entries(analytics)
      .filter(([domain]) => isValidDomain(domain))
      .sort((a, b) => b[1].timeSpent - a[1].timeSpent);

    if (sorted.length === 0) {
      insightsList.innerHTML = '<li>No insights available yet.</li>';
      return;
    }

    for (const [domain, stats] of sorted) {
      const item = document.createElement('li');
      const seconds = Math.round(stats.timeSpent / 1000);
      item.textContent = `${domain}  ${stats.visits} visit${stats.visits > 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''}`;
      insightsList.appendChild(item);
    }
  });
});