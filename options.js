const setSection = document.getElementById('set-password-section');
const changeSection = document.getElementById('change-password-section');
const status = document.getElementById('status');

const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const saveBtn = document.getElementById('save-password-btn');

const currentPasswordInput = document.getElementById('current-password');
const newPasswordChangeInput = document.getElementById('new-password-change');
const confirmPasswordChangeInput = document.getElementById('confirm-password-change');
const changeBtn = document.getElementById('change-password-btn');

const removeBtn = document.getElementById('remove-password-btn');

// Load existing password to determine UI state
chrome.storage.local.get(['emergencyPassword'], data => {
  if (data.emergencyPassword) {
    setSection.style.display = 'none';
    changeSection.style.display = 'block';
    status.textContent = 'Password is currently set.';
  } else {
    setSection.style.display = 'block';
    changeSection.style.display = 'none';
    status.textContent = 'No password set yet.';
  }
});

// Save new password (first time setup)
saveBtn.addEventListener('click', () => {
  const pwd = newPasswordInput.value.trim();
  const confirmPwd = confirmPasswordInput.value.trim();

  if (pwd.length < 4) {
    status.textContent = 'Password must be at least 4 characters.';
    return;
  }
  if (pwd !== confirmPwd) {
    status.textContent = 'Passwords do not match.';
    return;
  }

  chrome.storage.local.set({ emergencyPassword: pwd }, () => {
    status.textContent = 'Password saved successfully!';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
    setSection.style.display = 'none';
    changeSection.style.display = 'block';
  });
});

// Change existing password
changeBtn.addEventListener('click', () => {
  const currentPwd = currentPasswordInput.value.trim();
  const newPwd = newPasswordChangeInput.value.trim();
  const confirmNewPwd = confirmPasswordChangeInput.value.trim();

  if (newPwd.length < 4) {
    status.textContent = 'New password must be at least 4 characters.';
    return;
  }
  if (newPwd !== confirmNewPwd) {
    status.textContent = 'New passwords do not match.';
    return;
  }

  chrome.storage.local.get(['emergencyPassword'], data => {
    if (currentPwd !== data.emergencyPassword) {
      status.textContent = 'Current password is incorrect.';
      return;
    }

    chrome.storage.local.set({ emergencyPassword: newPwd }, () => {
      status.textContent = 'Password changed successfully!';
      currentPasswordInput.value = '';
      newPasswordChangeInput.value = '';
      confirmPasswordChangeInput.value = '';
    });
  });
});

// Remove password
removeBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to remove the emergency password? This will disable emergency access security.')) {
    chrome.storage.local.remove('emergencyPassword', () => {
      status.textContent = 'Password removed.';
      setSection.style.display = 'block';
      changeSection.style.display = 'none';
    });
  }
});
