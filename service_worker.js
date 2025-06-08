chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "block") {
    chrome.tabs.update({ url: chrome.runtime.getURL("blocked.html") });
  }
});