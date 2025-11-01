/**
 * Options Page Script
 */
import { StorageManager } from '../js/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  setupEventListeners();
  await loadHistory();
});

/**
 * Load saved configuration
 */
async function loadConfig() {
  const config = await StorageManager.getConfig();
  
  if (config.github_token) {
    document.getElementById('token').value = config.github_token;
  }
  if (config.github_repo) {
    document.getElementById('repo').value = config.github_repo;
  }
  if (config.branch) {
    document.getElementById('branch').value = config.branch;
  }
  if (config.file_structure) {
    document.getElementById('structure').value = config.file_structure;
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Form submission
  document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveConfig();
  });

  // Test connection
  document.getElementById('test-connection').addEventListener('click', async () => {
    await testConnection();
  });

  // Toggle token visibility
  document.getElementById('toggle-token').addEventListener('click', () => {
    const tokenInput = document.getElementById('token');
    const toggleBtn = document.getElementById('toggle-token');
    
    if (tokenInput.type === 'password') {
      tokenInput.type = 'text';
      toggleBtn.textContent = 'Hide';
    } else {
      tokenInput.type = 'password';
      toggleBtn.textContent = 'Show';
    }
  });

  // Clear history
  document.getElementById('clear-history').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear submission history?')) {
      await StorageManager.set('submissions', []);
      await loadHistory();
    }
  });
}

/**
 * Save configuration
 */
async function saveConfig() {
  const token = document.getElementById('token').value.trim();
  const repo = document.getElementById('repo').value.trim();
  const branch = document.getElementById('branch').value.trim() || 'main';
  const structure = document.getElementById('structure').value.trim() || 'hackerrank/{category}/{filename}';

  // Validate repository format
  if (repo && !/^[\w\-\.]+\/[\w\-\.]+$/.test(repo)) {
    showTestResult('Invalid repository format. Use format: owner/repo', 'error');
    return;
  }

  try {
    await StorageManager.saveConfig({
      github_token: token,
      github_repo: repo,
      branch: branch,
      file_structure: structure
    });

    showTestResult('Configuration saved successfully!', 'success');
  } catch (error) {
    showTestResult(`Error saving configuration: ${error.message}`, 'error');
  }
}

/**
 * Test connection
 */
async function testConnection() {
  const token = document.getElementById('token').value.trim();
  const repo = document.getElementById('repo').value.trim();

  if (!token || !repo) {
    showTestResult('Please enter token and repository first', 'error');
    return;
  }

  // Validate repository format
  if (!/^[\w\-\.]+\/[\w\-\.]+$/.test(repo)) {
    showTestResult('Invalid repository format. Use format: owner/repo', 'error');
    return;
  }

  showTestResult('Testing connection...', 'success');

  try {
    // First validate token
    const validateResponse = await sendMessage({ 
      action: 'validateToken', 
      token: token 
    });

    if (!validateResponse.valid) {
      showTestResult('Invalid GitHub token. Please check your token.', 'error');
      return;
    }

    // Test repository access
    const testResponse = await sendMessage({ action: 'testConnection' });

    if (testResponse.connected) {
      showTestResult(
        `✅ Connection successful!\n` +
        `Repository: ${testResponse.repo}\n` +
        `Branch: ${testResponse.branch}\n` +
        `Synced submissions: ${testResponse.submissionCount || 0}`,
        'success'
      );
    } else {
      showTestResult(`Connection failed: ${testResponse.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showTestResult(`Error testing connection: ${error.message}`, 'error');
  }
}

/**
 * Load submission history
 */
async function loadHistory() {
  const submissions = await StorageManager.getSubmissions();
  const container = document.getElementById('history-container');

  if (submissions.length === 0) {
    container.innerHTML = '<p class="empty-state">No submissions yet</p>';
    return;
  }

  // Sort by timestamp (newest first)
  submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  container.innerHTML = submissions.map(sub => {
    const date = new Date(sub.timestamp).toLocaleString();
    return `
      <div class="submission-item">
        <h3>${sub.problemTitle || sub.problemSlug}</h3>
        <div class="meta">
          <span>📁 ${sub.category || 'misc'}</span>
          <span>💻 ${sub.language || 'unknown'}</span>
          <span>🕒 ${date}</span>
        </div>
        ${sub.githubUrl ? `<a href="${sub.githubUrl}" target="_blank">View on GitHub →</a>` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Show test result
 */
function showTestResult(message, type) {
  const resultDiv = document.getElementById('test-result');
  resultDiv.textContent = message;
  resultDiv.className = `test-result ${type}`;
  resultDiv.classList.remove('hidden');
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

