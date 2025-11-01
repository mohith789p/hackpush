/**
 * Popup Script
 * Handles popup UI logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkConnection();
  setupEventListeners();
});

/**
 * Check connection status
 */
async function checkConnection() {
  try {
    const response = await sendMessage({ action: 'testConnection' });
    
    if (response.connected) {
      showConnectedView(response);
    } else {
      showNotConnectedView(response.error);
    }
  } catch (error) {
    console.error('[HackPush] Error checking connection:', error);
    showNotConnectedView('Error checking connection');
  }
}

/**
 * Show connected view
 */
function showConnectedView(status) {
  document.getElementById('connected-view').classList.remove('hidden');
  document.getElementById('not-connected-view').classList.add('hidden');
  document.getElementById('error-view').classList.add('hidden');

  document.getElementById('repo-name').textContent = status.repo || 'GitHub';
  document.getElementById('submission-count').textContent = status.submissionCount || 0;
}

/**
 * Show not connected view
 */
function showNotConnectedView(error) {
  if (error && error !== 'Not configured') {
    showErrorView(error);
  } else {
    document.getElementById('connected-view').classList.add('hidden');
    document.getElementById('not-connected-view').classList.remove('hidden');
    document.getElementById('error-view').classList.add('hidden');
  }
}

/**
 * Show error view
 */
function showErrorView(error) {
  document.getElementById('connected-view').classList.add('hidden');
  document.getElementById('not-connected-view').classList.add('hidden');
  document.getElementById('error-view').classList.remove('hidden');
  
  document.getElementById('error-text').textContent = error || 'Unknown error';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Setup button
  document.getElementById('setup').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // View history
  document.getElementById('view-history').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Disconnect
  document.getElementById('disconnect').addEventListener('click', async () => {
    if (confirm('Are you sure you want to disconnect? This will clear your configuration.')) {
      try {
        // Clear storage via message to background
        chrome.storage.local.clear(() => {
          checkConnection();
        });
      } catch (error) {
        console.error('[HackPush] Error disconnecting:', error);
      }
    }
  });

  // Retry connection
  document.getElementById('retry-connection').addEventListener('click', () => {
    checkConnection();
  });

  // Open settings
  document.getElementById('open-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

/**
 * Send message to background script
 */
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

