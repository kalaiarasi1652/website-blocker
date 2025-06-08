// Show a random motivational quote
const quotes = [
  "Focus is the key to success.",
  "Every minute saved is a minute earned.",
  "Stay strong, stay productive!",
  "Distraction is the enemy of creativity."
];
document.getElementById('quote').innerText =
  quotes[Math.floor(Math.random() * quotes.length)];

// We cannot get blocked URL from query params now; instead read it from storage
async function getBlockedUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get(['currentlyBlockedUrls'], data => {
      if (data.currentlyBlockedUrls && data.currentlyBlockedUrls.length > 0) {
        resolve(data.currentlyBlockedUrls[0]); // You can improve logic here if multiple URLs
      } else {
        resolve(null);
      }
    });
  });
}

document.getElementById('emergency-btn').addEventListener('click', async () => {
  const blockedUrl = await getBlockedUrl();
  if (!blockedUrl) {
    alert('Blocked URL not found.');
    return;
  }

  const password = prompt('Enter emergency password:');
  if (!password) return;

  chrome.storage.local.get(['emergencyPassword'], (data) => {
    const storedPassword = data.emergencyPassword;
    if (storedPassword && password === storedPassword) {
      chrome.runtime.sendMessage({ action: 'unblockSite', url: blockedUrl }, () => {
        chrome.runtime.sendMessage({ action: 'blockSite', url: blockedUrl, durationMinutes: 5 }, () => {
          alert('Emergency access granted for 5 minutes.');
          window.location.href = blockedUrl;
        });
      });
    } else {
      alert('Incorrect password');
    }
  });
});

document.getElementById('unblock-btn').addEventListener('click', async () => {
  const password = document.getElementById('password-input').value;
  const blockedUrl = await getBlockedUrl();

  if (!blockedUrl) {
    document.getElementById('unblock-message').innerText = 'Blocked URL not found.';
    return;
  }

  chrome.storage.local.get(['emergencyPassword'], (data) => {
    const storedPassword = data.emergencyPassword;
    if (storedPassword && password === storedPassword) {
      chrome.runtime.sendMessage({ action: 'unblockSite', url: blockedUrl }, response => {
        if (response.success) {
          document.getElementById('unblock-message').innerText = 'Site unblocked! Reloading...';
          setTimeout(() => {
            window.location.href = blockedUrl;
          }, 1000);
        } else {
          document.getElementById('unblock-message').innerText = 'Failed to unblock.';
        }
      });
    } else {
      document.getElementById('unblock-message').innerText = 'Incorrect password!';
    }
  });
});
