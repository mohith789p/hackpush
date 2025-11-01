/**
 * Content Script
 * Main logic for monitoring HackerRank submissions
 */

let submissionObserver = null;
let isProcessing = false;
let processedSubmissions = new Set();
let cachedCode = null; // Store code before submission
let cachedLanguage = null; // Store language before submission

/**
 * DOM Parser Utility - Inline to avoid ES module issues
 */
const DOMParser = {
  extractCode() {
    // Primary: Monaco Editor (most common on HackerRank now)
    // Try Monaco API first
    if (window.monaco && window.monaco.editor) {
      try {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          const code = models[0].getValue();
          if (code && code.trim().length > 0) {
            console.log('[HackPush] Extracted from Monaco API');
            return code;
          }
        }
      } catch (e) {
        console.warn('[HackPush] Monaco API access failed:', e);
      }
    }

    // Fallback: Extract from Monaco's view-lines HTML structure
    // Use the main visible view-lines container (prefer the one with cursor text class)
    const viewLines = document.querySelector('.view-lines.monaco-mouse-cursor-text') || 
                      document.querySelector('.view-lines');
    if (viewLines) {
      try {
        const lineDivs = Array.from(viewLines.querySelectorAll('.view-line'));
        if (lineDivs.length > 0) {
          // Map and extract lines with their positions
          const linesWithPosition = lineDivs.map(lineDiv => {
            // Extract top position from style attribute
            const style = lineDiv.getAttribute('style') || '';
            const topMatch = style.match(/top:\s*(\d+)px/);
            const top = topMatch ? parseInt(topMatch[1], 10) : 0;
            
            // Extract text - use textContent directly to avoid span duplication
            // Monaco sometimes has nested spans with duplicate text for syntax highlighting
            let lineText = lineDiv.textContent || lineDiv.innerText || '';
            
            // If textContent doesn't work, try extracting from spans but deduplicate
            if (!lineText || lineText.trim().length === 0) {
              const spans = Array.from(lineDiv.querySelectorAll('span'));
              const uniqueTexts = new Set();
              for (const span of spans) {
                const text = span.textContent || span.innerText || '';
                if (text && text.trim()) {
                  uniqueTexts.add(text.trim());
                }
              }
              lineText = Array.from(uniqueTexts).join('');
            }
            
            // Decode HTML entities if needed
            if (lineText.includes('&')) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = lineText;
              lineText = tempDiv.textContent || tempDiv.innerText || lineText;
            }
            
            return { top, text: lineText.trim() };
          });
          
          // Remove duplicates: keep only one line per top position
          const positionMap = new Map();
          linesWithPosition.forEach(({ top, text }) => {
            if (!text) return; // Skip empty lines
            // Keep the first non-empty line at this position
            if (!positionMap.has(top) || (!positionMap.get(top).text && text)) {
              positionMap.set(top, { top, text });
            }
          });
          
          // Convert to array, sort by top position
          let uniqueLines = Array.from(positionMap.values()).sort((a, b) => a.top - b.top);
          
          // Additional deduplication: remove consecutive duplicate lines
          // This handles cases where Monaco renders the same line twice
          const deduplicatedLines = [];
          const seenTexts = new Set();
          for (const line of uniqueLines) {
            // Normalize text for comparison (trim and lower)
            const normalized = line.text.trim();
            // Only add if we haven't seen this exact text before
            if (normalized && !seenTexts.has(normalized)) {
              seenTexts.add(normalized);
              deduplicatedLines.push(line);
            }
          }
          
          // Extract just the text and join
          const codeLines = deduplicatedLines.map(({ text }) => text).filter(t => t);
          const code = codeLines.join('\n');
          
          if (code && code.trim().length > 0) {
            console.log('[HackPush] Extracted from Monaco view-lines HTML:', codeLines.length, 'unique lines');
            return code;
          }
        }
      } catch (e) {
        console.warn('[HackPush] Monaco view-lines extraction failed:', e);
      }
    }

    // Fallback: CodeMirror
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement && cmElement.CodeMirror) {
      try {
        const code = cmElement.CodeMirror.getValue();
        if (code && code.trim().length > 0) {
          console.log('[HackPush] Extracted from CodeMirror');
          return code;
        }
      } catch (e) {
        console.warn('[HackPush] CodeMirror access failed:', e);
      }
    }

    // Fallback 2: Textarea
    const textarea = document.querySelector('textarea[name="code"]') ||
                     document.querySelector('textarea.code-input') ||
                     document.querySelector('textarea[class*="code"]') ||
                     document.querySelector('textarea[data-id="editor"]');
    if (textarea && textarea.value && textarea.value.trim().length > 0) {
      return textarea.value;
    }

    // Fallback 3: CodeMirror textarea
    const cmTextarea = document.querySelector('.CodeMirror textarea');
    if (cmTextarea && cmTextarea.value && cmTextarea.value.trim().length > 0) {
      return cmTextarea.value;
    }

    throw new Error('Could not extract code from editor');
  },

  cleanCode(code) {
    if (!code) return code;
    
    // Remove line numbers at the start (like "12345678910...#!/bin/python3")
    // Pattern: long sequence of digits at the very start followed by shebang
    if (/^\d{10,}/.test(code)) {
      // Find where the shebang starts (#!/)
      const shebangIndex = code.indexOf('#!/');
      if (shebangIndex !== -1 && shebangIndex < 50) {
        // Remove everything before the shebang
        code = code.substring(shebangIndex);
      } else {
        // Just remove leading digits if no shebang pattern found
        code = code.replace(/^\d{10,}/, '');
      }
    }
    
    // Remove any leading whitespace after cleaning
    code = code.trim();
    
    // Don't remove line numbers from each line automatically
    // This could accidentally remove legitimate numbers in code
    // The issue is likely only at the start
    
    return code;
  },

  extractCodeWithFallbacks() {
    // Try all possible selectors
    const selectors = [
      '.CodeMirror',
      '.monaco-editor',
      'textarea[name="code"]',
      'textarea.code-input',
      'textarea[class*="code"]',
      'textarea[data-id="editor"]',
      '.CodeMirror textarea',
      '[data-testid="code-editor"]',
      '#code-editor',
      '.editor textarea'
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (!element) continue;

        // Try CodeMirror
        if (element.classList.contains('CodeMirror') && element.CodeMirror) {
          const code = element.CodeMirror.getValue();
          if (code && code.trim()) return code;
        }

        // Try Monaco
        if (window.monaco && window.monaco.editor) {
          const models = window.monaco.editor.getModels();
          if (models && models.length > 0) {
            const code = models[0].getValue();
            if (code && code.trim()) return code;
          }
        }

        // Try value property
        if (element.value && element.value.trim()) {
          return element.value;
        }

        // Try textContent for hidden textareas
        if (element.textContent && element.textContent.trim()) {
          return element.textContent.trim();
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    return null;
  },

  extractLanguage() {
    // Strategy 1: Select element (most reliable)
    const selectors = [
      'select[name="language"]',
      '[class*="language"] select',
      '.challenge-selector select',
      '#language-select',
      'select[data-language]',
      '.view-lines[data-language]'
    ];

    for (const sel of selectors) {
      const select = document.querySelector(sel);
      if (select) {
        // Try value attribute
        let value = select.value;
        if (!value && select.options && select.options.length > 0) {
          // Try selected option
          const selectedOption = select.options[select.selectedIndex];
          if (selectedOption) {
            value = selectedOption.value || selectedOption.textContent?.trim();
          }
        }
        
        if (value && value.trim() && value.toLowerCase() !== 'language') {
          const normalized = this.normalizeLanguage(value);
          if (normalized && normalized !== 'language') {
            return normalized;
          }
        }
      }
    }

    // Strategy 2: Data attributes
    const elementsWithLang = document.querySelectorAll('[data-language]');
    for (const el of elementsWithLang) {
      const lang = el.getAttribute('data-language');
      if (lang && lang.trim() && lang.toLowerCase() !== 'language') {
        const normalized = this.normalizeLanguage(lang);
        if (normalized && normalized !== 'language') {
          return normalized;
        }
      }
    }

    // Strategy 3: Monaco editor language
    if (window.monaco && window.monaco.editor) {
      try {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          const languageId = models[0].getLanguageId();
          if (languageId && languageId !== 'plaintext') {
            const normalized = this.normalizeLanguage(languageId);
            if (normalized && normalized !== 'language') {
              return normalized;
            }
          }
        }
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Strategy 4: CodeMirror language mode
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement && cmElement.CodeMirror) {
      try {
        const mode = cmElement.CodeMirror.getOption('mode');
        if (mode && typeof mode === 'string' && mode.toLowerCase() !== 'text') {
          const normalized = this.normalizeLanguage(mode);
          if (normalized && normalized !== 'language') {
            return normalized;
          }
        }
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Strategy 5: URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('language');
    if (langParam && langParam.toLowerCase() !== 'language') {
      const normalized = this.normalizeLanguage(langParam);
      if (normalized && normalized !== 'language') {
        return normalized;
      }
    }

    // Strategy 6: Detect from code content (shebang, imports, etc.)
    if (cachedCode) {
      const code = cachedCode.trim();
      // Check for Python
      if (code.includes('#!/usr/bin/python') || code.includes('#!/bin/python') || 
          code.includes('import sys') || code.includes('def ') && code.includes('if __name__')) {
        return 'python3';
      }
      // Check for Java
      if (code.includes('public class') || code.includes('public static void main')) {
        return 'java';
      }
      // Check for JavaScript
      if (code.includes('process.stdin') || code.includes('require(')) {
        return 'javascript';
      }
      // Check for C++
      if (code.includes('#include') && (code.includes('using namespace') || code.includes('int main'))) {
        return 'cpp';
      }
    }

    console.warn('[HackPush] Could not detect language, using default');
    return 'python3'; // Default fallback
  },

  normalizeLanguage(lang) {
    const normalized = lang.toLowerCase().trim();
    const languageMap = {
      'python3': 'python3', 'python': 'python3', 'py': 'python3',
      'java': 'java',
      'javascript': 'javascript', 'js': 'javascript',
      'cpp': 'cpp', 'c++': 'cpp', 'c': 'c',
      'csharp': 'csharp', 'cs': 'csharp',
      'go': 'go', 'golang': 'go',
      'ruby': 'ruby', 'rb': 'ruby',
      'swift': 'swift', 'kotlin': 'kotlin', 'scala': 'scala', 'rust': 'rust',
      'php': 'php', 'typescript': 'typescript', 'ts': 'typescript',
      'r': 'r', 'sql': 'sql', 'bash': 'bash', 'shell': 'bash'
    };
    return languageMap[normalized] || normalized;
  },

  extractProblemTitle() {
    const titleSelectors = [
      '.challenge-title', 'h1[class*="challenge"]', '.challenge-page-title', 'h1', '[data-attr1="Title"]'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const title = element.textContent?.trim();
        if (title && title.length > 0) {
          return title;
        }
      }
    }

    const urlParts = window.location.pathname.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart !== 'problem') {
      return this.slugToTitle(lastPart);
    }

    return 'Unknown Problem';
  },

  extractProblemSlug() {
    const urlParts = window.location.pathname.split('/').filter(p => p); // Remove empty parts
    
    // Look for pattern: /challenges/problem-name/problem or /challenges/problem-name
    const challengesIndex = urlParts.indexOf('challenges');
    if (challengesIndex !== -1 && challengesIndex < urlParts.length - 1) {
      const problemName = urlParts[challengesIndex + 1];
      if (problemName && problemName !== 'problem') {
        return problemName;
      }
    }
    
    // Fallback: look for 'problem' in path
    const problemIndex = urlParts.indexOf('problem');
    if (problemIndex !== -1 && problemIndex > 0) {
      // The slug is usually before 'problem'
      return urlParts[problemIndex - 1];
    }
    
    // Last resort: last meaningful part
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart !== 'problem' && lastPart !== 'challenges') {
      return lastPart;
    }

    console.warn('[HackPush] Could not extract problem slug from URL:', window.location.pathname);
    return 'unknown-problem';
  },

  extractCategory() {
    const url = window.location.pathname;
    const categories = [
      'algorithms', 'data-structures', 'mathematics', 'python', 'java', 'sql',
      'database', 'artificial-intelligence', 'regex', 'functional-programming'
    ];

    for (const category of categories) {
      if (url.includes(category)) {
        return category;
      }
    }

    const parts = url.split('/');
    const challengesIndex = parts.indexOf('challenges');
    if (challengesIndex !== -1 && challengesIndex < parts.length - 1) {
      const possibleCategory = parts[challengesIndex + 1];
      if (possibleCategory && !possibleCategory.includes('problem')) {
        return possibleCategory;
      }
    }

    return 'misc';
  },

  findSubmitButton() {
    const buttonSelectors = [
      'button[type="submit"]', 'button[class*="submit"]',
      'button[data-analytics*="submit"]', '.challenge-submit-btn',
      'input[type="submit"]'
    ];

    for (const selector of buttonSelectors) {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        return button;
      }
    }

    return null;
  },

  isSubmissionAccepted(element) {
    if (!element) return false;

    const text = element.textContent?.toLowerCase() || '';
    const acceptedKeywords = [
      'accepted', 'success', 'all test cases passed',
      'congratulations', 'passed', 'successfully'
    ];
    const rejectedKeywords = [
      'wrong answer', 'runtime error', 'timeout', 'failed', 'error'
    ];

    if (rejectedKeywords.some(kw => text.includes(kw))) {
      return false;
    }

    return acceptedKeywords.some(kw => text.includes(kw));
  },

  async waitForElement(selector, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for element: ${selector}`));
      }, timeout);
    });
  },

  slugToTitle(slug) {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
};

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

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

  // Cache the code and language BEFORE submission (editor might be hidden after)
  try {
    cachedCode = DOMParser.extractCode();
    // Clean the code to remove line numbers and artifacts
    cachedCode = DOMParser.cleanCode(cachedCode);
    console.log('[HackPush] Code cached:', cachedCode.length, 'characters');
  } catch (error) {
    console.warn('[HackPush] Could not cache code before submission:', error);
    cachedCode = null;
  }

  // Cache language
  try {
    cachedLanguage = DOMParser.extractLanguage();
    console.log('[HackPush] Language cached:', cachedLanguage);
  } catch (error) {
    console.warn('[HackPush] Could not cache language before submission:', error);
    cachedLanguage = null;
  }

  // Wait for result panel to appear
  waitForResultPanel();
}

/**
 * Wait for result panel to appear after submission
 */
async function waitForResultPanel() {
  try {
    // Try multiple selectors for result panel
    const selectors = [
      '[class*="result"]',
      '[class*="submission"]',
      '[class*="test-result"]',
      '.test-results',
      '[data-analytics*="result"]'
    ];

    let resultPanel = null;
    
    for (const selector of selectors) {
      try {
        resultPanel = await DOMParser.waitForElement(selector, 20000);
        if (resultPanel) break;
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!resultPanel) {
      console.log('[HackPush] Result panel not found');
      return;
    }

    console.log('[HackPush] Result panel found, observing...');
    
    // Observe for status changes
    observeResultPanel(resultPanel);
    
  } catch (error) {
    console.error('[HackPush] Error waiting for result panel:', error);
    isProcessing = false;
  }
}

/**
 * Observe result panel for status changes
 */
function observeResultPanel(resultPanel) {
  // Disconnect previous observer if exists
  if (submissionObserver) {
    submissionObserver.disconnect();
  }

  isProcessing = true;

  const debouncedHandler = debounce(handleResultChange, 2000);

  submissionObserver = new MutationObserver((mutations) => {
    debouncedHandler(resultPanel);
  });

  submissionObserver.observe(resultPanel, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-status']
  });

  // Also check immediately
  handleResultChange(resultPanel);

  // Timeout after 30 seconds
  setTimeout(() => {
    if (submissionObserver) {
      submissionObserver.disconnect();
      submissionObserver = null;
    }
    isProcessing = false;
  }, 30000);
}

/**
 * Handle result panel changes
 */
async function handleResultChange(resultPanel) {
  if (!resultPanel) return;

  try {
    const isAccepted = DOMParser.isSubmissionAccepted(resultPanel);
    
    if (isAccepted) {
      console.log('[HackPush] Submission accepted!');
      
      // Create unique ID for this submission
      const submissionId = `${Date.now()}-${Math.random()}`;
      
      // Check if we've already processed this submission
      if (processedSubmissions.has(submissionId)) {
        console.log('[HackPush] Already processed this submission');
        return;
      }

      // Small delay to ensure DOM is fully updated
      await new Promise(resolve => setTimeout(resolve, 1000));

      await processAcceptedSubmission(submissionId);
    }
  } catch (error) {
    console.error('[HackPush] Error handling result change:', error);
  }
}

/**
 * Process accepted submission
 */
async function processAcceptedSubmission(submissionId) {
  try {
    // Try to get code - use cached version first (from before submission)
    let code = cachedCode;
    
    if (!code) {
      // Fallback: try to extract from current DOM
      try {
        code = DOMParser.extractCode();
        console.log('[HackPush] Code extracted from current DOM');
      } catch (error) {
        console.error('[HackPush] Failed to extract code:', error);
        // Try additional fallbacks
        code = DOMParser.extractCodeWithFallbacks();
        if (!code) {
          throw new Error('Could not extract code from editor. The code editor may have been hidden after submission.');
        }
      }
    } else {
      console.log('[HackPush] Using cached code from before submission');
    }

    // Clean code to remove line numbers and artifacts
    code = DOMParser.cleanCode(code);

    // Use cached language if available
    let language = cachedLanguage;
    if (!language) {
      try {
        language = DOMParser.extractLanguage();
        console.log('[HackPush] Language extracted from DOM');
      } catch (error) {
        console.warn('[HackPush] Could not extract language, using fallback');
        language = 'unknown';
      }
    } else {
      console.log('[HackPush] Using cached language:', language);
    }
    const problemTitle = DOMParser.extractProblemTitle();
    const problemSlug = DOMParser.extractProblemSlug();
    const category = DOMParser.extractCategory();
    const timestamp = new Date().toISOString();
    const url = window.location.href;

    // Validate language is not the literal string "language"
    if (!language || language.toLowerCase() === 'language' || language === 'unknown') {
      console.warn('[HackPush] Invalid language detected:', language, '- attempting code-based detection');
      // Try to detect from code content
      if (code.includes('#!/usr/bin/python') || code.includes('#!/bin/python') || code.includes('import sys')) {
        language = 'python3';
      } else if (code.includes('public class')) {
        language = 'java';
      } else if (code.includes('process.stdin')) {
        language = 'javascript';
      } else {
        language = 'python3'; // Default fallback
      }
      console.log('[HackPush] Language detected from code:', language);
    }

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
        cachedCode = null; // Clear cache after successful sync
        cachedLanguage = null;
      }
    );

  } catch (error) {
    console.error('[HackPush] Error processing submission:', error);
    showNotification(`Error: ${error.message}`, 'error');
    isProcessing = false;
    cachedCode = null; // Clear cache on error
    cachedLanguage = null;
  }
}

/**
 * Check for existing results (in case page was loaded after submission)
 */
function checkExistingResults() {
  const selectors = [
    '[class*="result"]',
    '[class*="submission"]',
    '[class*="test-result"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && DOMParser.isSubmissionAccepted(element)) {
      console.log('[HackPush] Found existing accepted submission');
      // Don't auto-process on page load to avoid duplicates
    }
  }
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

