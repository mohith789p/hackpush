/**
 * Background Service Worker
 * Handles GitHub API operations and message routing
 */
import { GitHubAPI } from './github-api.js';
import { StorageManager } from './storage.js';

// Keep-alive pattern to prevent service worker from sleeping
let keepAliveInterval;

function keepAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo();
  }, 20000); // Every 20 seconds
}

self.addEventListener('activate', keepAlive);
keepAlive();

/**
 * Handle messages from content script and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[HackPush] Background received message:', request.action);

  if (request.action === 'pushToGitHub') {
    handlePushToGitHub(request.data)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[HackPush] Error pushing to GitHub:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async response
  }

  if (request.action === 'testConnection') {
    handleTestConnection()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ connected: false, error: error.message }));
    return true;
  }

  if (request.action === 'validateToken') {
    handleValidateToken(request.token)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ valid: false, error: error.message }));
    return true;
  }
});

/**
 * Handle push to GitHub
 */
async function handlePushToGitHub(data) {
  try {
    // Get configuration
    const config = await StorageManager.getConfig();

    if (!config.github_token || !config.github_repo) {
      throw new Error('GitHub not configured. Please set up your token and repository in options.');
    }

    // Validate token
    const api = new GitHubAPI(config.github_token);
    const isValid = await api.validateToken();
    
    if (!isValid) {
      throw new Error('Invalid GitHub token. Please update your token in options.');
    }

    // Parse repository (format: owner/repo)
    const [owner, repo] = config.github_repo.split('/');
    if (!owner || !repo) {
      throw new Error('Invalid repository format. Use format: owner/repo');
    }

    // Generate file path
    const fileStructure = config.file_structure || 'hackerrank/{category}/{filename}';
    const extension = DOMParser.getFileExtension(data.language);
    const filename = `${data.problemSlug}.${extension}`;
    
    const filePath = GitHubAPI.generateFilePath(fileStructure, {
      category: data.category,
      filename: filename,
      slug: data.problemSlug,
      language: data.language
    });

    // Format code with metadata
    const formattedCode = GitHubAPI.formatFileContent(data.code, {
      problemTitle: data.problemTitle,
      language: data.language,
      timestamp: data.timestamp,
      url: data.url
    });

    // Create commit message
    const commitMessage = `Add solution for ${data.problemTitle} (${data.language})`;

    // Push to GitHub
    const branch = config.branch || 'main';
    const result = await api.createOrUpdateFile(
      owner,
      repo,
      filePath,
      formattedCode,
      commitMessage,
      branch
    );

    // Save submission record
    await StorageManager.addSubmissionRecord({
      problemSlug: data.problemSlug,
      problemTitle: data.problemTitle,
      language: data.language,
      category: data.category,
      timestamp: data.timestamp,
      githubUrl: result.html_url,
      filePath: filePath
    });

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'HackPush',
      message: `Solution synced to GitHub!\n${data.problemTitle}`
    }).catch(() => {
      // Notifications permission not granted, that's ok
    });

    return result;

  } catch (error) {
    console.error('[HackPush] Error in handlePushToGitHub:', error);
    throw error;
  }
}

/**
 * Test connection to GitHub
 */
async function handleTestConnection() {
  try {
    const config = await StorageManager.getConfig();

    if (!config.github_token || !config.github_repo) {
      return { connected: false, error: 'Not configured' };
    }

    const api = new GitHubAPI(config.github_token);
    
    // Validate token
    const isValid = await api.validateToken();
    if (!isValid) {
      return { connected: false, error: 'Invalid token' };
    }

    // Test repository access
    const [owner, repo] = config.github_repo.split('/');
    if (!owner || !repo) {
      return { connected: false, error: 'Invalid repository format' };
    }

    const repoTest = await api.testRepository(owner, repo);
    
    if (repoTest.success) {
      const submissions = await StorageManager.getSubmissions();
      return {
        connected: true,
        repo: repoTest.full_name,
        branch: repoTest.default_branch,
        submissionCount: submissions.length
      };
    } else {
      return { connected: false, error: repoTest.error };
    }

  } catch (error) {
    return { connected: false, error: error.message };
  }
}

/**
 * Validate GitHub token
 */
async function handleValidateToken(token) {
  try {
    const api = new GitHubAPI(token);
    const isValid = await api.validateToken();
    return { valid: isValid };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Helper: Import DOMParser methods (since we're in service worker, we need a simple version)
// Note: This is a minimal implementation for background script
const DOMParser = {
  getFileExtension: (language) => {
    const extensionMap = {
      'python3': 'py',
      'java': 'java',
      'javascript': 'js',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'cs',
      'go': 'go',
      'ruby': 'rb',
      'swift': 'swift',
      'kotlin': 'kt',
      'scala': 'scala',
      'rust': 'rs',
      'php': 'php',
      'typescript': 'ts',
      'r': 'r',
      'sql': 'sql',
      'bash': 'sh'
    };
    return extensionMap[language] || 'txt';
  }
};

