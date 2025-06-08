chrome.storage.local.get(["blockedSites", "whitelist"], (data) => {
  const url = window.location.hostname;

  if (data.whitelist?.includes(url)) return;

  const now = Date.now();
  const match = (data.blockedSites || []).find(site =>
    site.url === url && site.unblockTime > now
  );

  if (match) {
    chrome.runtime.sendMessage({ action: "block" });
  }
});
