/**
 * Content Script
 * Main logic for monitoring HackerRank submissions
 */

let isProcessing = false;
let processedSubmissions = new Set();

/**
 * DOM Parser Utility - Inline to avoid ES module issues
 */
const DOMParser = {
  // Helper function to fetch submission data once
  async fetchSubmissionData() {
    const match = window.location.pathname.match(/\/challenges\/([^\/]+)/);
    const challengeSlug = match ? match[1] : null;

    if (!challengeSlug) {
      throw new Error('Could not extract challenge slug from URL');
    }

    try {
      // Fetch submissions list
      const submissionsResponse = await fetch(
        `https://www.hackerrank.com/rest/contests/master/challenges/${challengeSlug}/submissions`
      );
      
      if (!submissionsResponse.ok) {
        throw new Error(`Failed to fetch submissions: ${submissionsResponse.status}`);
      }

      const submissionsData = await submissionsResponse.json();
      
      if (submissionsData.models && submissionsData.models.length > 0) {
        const latestId = submissionsData.models[0].id;
        
        // Fetch latest submission details
        const submissionResponse = await fetch(
          `https://www.hackerrank.com/rest/contests/master/challenges/${challengeSlug}/submissions/${latestId}`
        );
        
        if (!submissionResponse.ok) {
          throw new Error(`Failed to fetch submission details: ${submissionResponse.status}`);
        }

        const submissionData = await submissionResponse.json();
        
        if (submissionData.model) {
          console.log('[HackPush] Successfully fetched submission data from API');
          return submissionData.model;
        } else {
          throw new Error('Submission response missing model data');
        }
      } else {
        throw new Error('No submissions found for this challenge');
      }
    } catch (error) {
      console.error('[HackPush] Error fetching submission data from API:', error);
      throw error;
    }
  },
  async extractCode(submissionData) {
    if (submissionData && submissionData.code) {
      console.log('[HackPush] Extracted code from submission data');
      return submissionData.code;
    }
    throw new Error('Submission data missing code');
  },



  extractLanguage(submissionData) {
    if (submissionData && submissionData.language) {
      const language = submissionData.language;
      console.log('[HackPush] Extracted language from submission data:', language);
      return this.normalizeLanguage(language);
    }
    console.warn('[HackPush] Could not detect language, using default');
    return 'python3';
  },

  normalizeLanguage(lang) {
    const normalized = lang.toLowerCase().trim();
    const languageMap = {
      'python3': 'python3', 'python': 'python3', 'py': 'python3', 'python2': 'python',
      'java': 'java', 'java8': 'java', 'java7': 'java', 'java15': 'java',
      'javascript': 'javascript', 'js': 'javascript', 'node': 'javascript',
      'cpp': 'cpp', 'cpp14': 'cpp', 'cpp11': 'cpp', 'c++': 'cpp', 'c': 'c',
      'csharp': 'csharp', 'cs': 'csharp',
      'go': 'go', 'golang': 'go',
      'ruby': 'ruby', 'rb': 'ruby',
      'swift': 'swift', 'kotlin': 'kotlin', 'scala': 'scala', 'rust': 'rust',
      'php': 'php', 'typescript': 'typescript', 'ts': 'typescript',
      'r': 'r', 'sql': 'sql', 'bash': 'bash', 'shell': 'bash'
    };
    return languageMap[normalized] || normalized;
  },

  extractProblemTitle(submissionData) {
    if (submissionData && submissionData.name) {
      console.log('[HackPush] Extracted problem title from submission data:', submissionData.name);
      return submissionData.name;
    }

    // Fallback: convert slug to title
    const challengeSlug = this.extractProblemSlug();
    if (challengeSlug && challengeSlug !== 'unknown-problem') {
      return this.slugToTitle(challengeSlug);
    }

    return 'Unknown Problem';
  },

  extractProblemSlug() {
    // Extract challenge-slug from current URL
    const match = window.location.pathname.match(/\/challenges\/([^\/]+)/);
    const challengeSlug = match ? match[1] : null;

    if (challengeSlug) {
      console.log('[HackPush] Extracted problem slug from URL:', challengeSlug);
      return challengeSlug;
    }

    console.warn('[HackPush] Could not extract problem slug from URL:', window.location.pathname);
    return 'unknown-problem';
  },

  extractCategory(submissionData) {
    if (submissionData && submissionData.track) {
      const track = submissionData.track;
      // Use track_name (e.g., "Algorithms") or track slug
      const category = (track.track_name || track.name || '').toLowerCase().replace(/\s+/g, '-');
      if (category) {
        console.log('[HackPush] Extracted category from submission data:', category);
        return category;
      }
    }
    return 'misc';
  },

  findSubmitButton() {
    // HackerRank submit button selectors (based on actual HTML structure)
    const buttonSelectors = [
      'button.hr-monaco-submit',                    // Primary: HackerRank Monaco submit button
      'button.ui-btn-primary.hr-monaco-submit',     // More specific Monaco submit
      'button[class*="hr-monaco-submit"]',          // Any button with hr-monaco-submit class
      'button.ui-btn-primary[class*="submit"]',     // Primary button with submit in class
      'button[data-analytics="SubmitCode"]',        // Analytics attribute
      'button[class*="submit"]',                    // Any button with submit in class
      'button[type="submit"]'                       // Standard submit type
    ];

    for (const selector of buttonSelectors) {
      try {
        const button = document.querySelector(selector);
        if (button && !button.disabled) {
          console.log('[HackPush] Submit button found:', selector);
          return button;
        }
      } catch (e) {
        // Invalid selector, continue to next
        console.warn('[HackPush] Invalid selector:', selector, e);
      }
    }

    // Fallback: find button by text content "Submit Code"
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const text = button.textContent?.toLowerCase() || '';
      if ((text.includes('submit code') || text.includes('submit')) && !button.disabled) {
        console.log('[HackPush] Submit button found by text content');
        return button;
      }
    }

    return null;
  },

  isSubmissionAccepted(submissionData) {
    if (submissionData) {
      const status = submissionData.status;
      const statusCode = submissionData.status_code;
      const isAccepted = status === 'Accepted' && statusCode === 1;
      
      console.log('[HackPush] Submission status:', status, 'Code:', statusCode, 'Accepted:', isAccepted);
      return isAccepted;
    }
    return false;
  },


  slugToTitle(slug) {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
};


/**
 * Initialize monitoring
 */
function init() {
  console.log('[HackPush] Content script loaded');
  console.log('[HackPush] Current URL:', window.location.pathname);
  
  // Check if we're on a problem page (handle both /problem and /problem/)
  const pathname = window.location.pathname.trim();
  const isProblemPage = pathname.includes('/problem') || 
                        pathname.includes('/challenges/') ||
                        /\/challenges\/[^\/]+\/problem/.test(pathname);
  
  console.log('[HackPush] Pathname:', pathname, 'Is problem page:', isProblemPage);
  
  if (!isProblemPage) {
    console.log('[HackPush] Not on a problem page, skipping initialization');
    return;
  }

  console.log('[HackPush] Problem page detected, initializing...');

  // Monitor submit button
  monitorSubmitButton();

  // Also monitor for result panels that might already exist
  checkExistingResults();
}

/**
 * Monitor submit button clicks
 */
function monitorSubmitButton() {
  const button = DOMParser.findSubmitButton();
  
  if (button) {
    console.log('[HackPush] Submit button found');
    button.addEventListener('click', handleSubmitClick, { once: false });
  } else {
    // Wait for submit button to appear
    const observer = new MutationObserver(() => {
      const btn = DOMParser.findSubmitButton();
      if (btn && !btn.hasAttribute('data-hackpush-monitored')) {
        btn.setAttribute('data-hackpush-monitored', 'true');
        btn.addEventListener('click', handleSubmitClick, { once: false });
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup after 30 seconds
    setTimeout(() => observer.disconnect(), 30000);
  }
}

/**
 * Handle submit button click
 */
function handleSubmitClick(event) {
  console.log('[HackPush] Submit button clicked');
  
  if (isProcessing) {
    console.log('[HackPush] Already processing a submission');
    return;
  }

  // No need to cache code - we'll fetch from API after submission
  console.log('[HackPush] Waiting for submission to complete...');
  
  // Wait for submission to complete (give it time to reach HackerRank API)
  setTimeout(() => {
    checkSubmissionStatus();
  }, 3000); // Wait 3 seconds for submission to be processed
}

/**
 * Check submission status via API
 */
async function checkSubmissionStatus() {
  if (isProcessing) {
    console.log('[HackPush] Already processing a submission');
    return;
  }

  isProcessing = true;
  
  try {
    console.log('[HackPush] Fetching submission data from API...');
    // Fetch submission data once
    const submissionData = await DOMParser.fetchSubmissionData();
    
    // Check if accepted
    const isAccepted = DOMParser.isSubmissionAccepted(submissionData);
    
    if (isAccepted) {
      console.log('[HackPush] Submission accepted!');
      
      // Create unique ID for this submission
      const submissionId = `${Date.now()}-${Math.random()}`;
      
      // Check if we've already processed this submission
      if (processedSubmissions.has(submissionId)) {
        console.log('[HackPush] Already processed this submission');
        isProcessing = false;
        return;
      }

      // Small delay to ensure API is fully updated
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Pass the submission data to avoid re-fetching
      await processAcceptedSubmission(submissionId, submissionData);
    } else {
      console.log('[HackPush] Submission not accepted or still processing');
      isProcessing = false;
    }
  } catch (error) {
    console.error('[HackPush] Error checking submission status:', error);
    isProcessing = false;
  }
}


/**
 * Process accepted submission
 */
async function processAcceptedSubmission(submissionId, submissionData) {
  try {
    // Extract all data from the already-fetched submission data
    console.log('[HackPush] Extracting details from submission data...');
    
    const code = await DOMParser.extractCode(submissionData);
    const language = DOMParser.extractLanguage(submissionData);
    const problemTitle = DOMParser.extractProblemTitle(submissionData);
    const problemSlug = DOMParser.extractProblemSlug();
    const category = DOMParser.extractCategory(submissionData);
    const timestamp = new Date().toISOString();
    const url = window.location.href;

    console.log('[HackPush] Extracted data:', {
      problemTitle,
      problemSlug,
      language,
      category,
      codeLength: code.length
    });

    // Mark as processed
    processedSubmissions.add(submissionId);

    // Send to background script
    chrome.runtime.sendMessage(
      {
        action: 'pushToGitHub',
        data: {
          code,
          language,
          problemTitle,
          problemSlug,
          category,
          timestamp,
          url
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[HackPush] Error sending message:', chrome.runtime.lastError);
          showNotification('Error connecting to extension', 'error');
          return;
        }

        if (response && response.success) {
          console.log('[HackPush] Successfully pushed to GitHub:', response);
          showNotification('Solution synced to GitHub!', 'success');
        } else {
          console.error('[HackPush] Failed to push:', response?.error);
          showNotification(`Sync failed: ${response?.error || 'Unknown error'}`, 'error');
        }
        
        isProcessing = false;
      }
    );

  } catch (error) {
    console.error('[HackPush] Error processing submission:', error);
    showNotification(`Error: ${error.message}`, 'error');
    isProcessing = false;
  }
}

/**
 * Check for existing results (in case page was loaded after submission)
 */
async function checkExistingResults() {
  // Don't auto-process on page load to avoid duplicates
  console.log('[HackPush] Skipping auto-check for existing submissions');
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = `[HackPush] ${message}`;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 300);
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

