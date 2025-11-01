/**
 * DOM Parser Utility
 * Extracts information from HackerRank's dynamic DOM
 * NOTE: This file is no longer used - DOMParser is now inlined in content.js
 * Keeping for reference only.
 */
class DOMParser {
  /**
   * Extract code from editor
   * Supports CodeMirror, Monaco, and textarea fallbacks
   */
  static extractCode() {
    // Primary: CodeMirror
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement && cmElement.CodeMirror) {
      try {
        return cmElement.CodeMirror.getValue();
      } catch (e) {
        console.warn('[HackPush] CodeMirror access failed:', e);
      }
    }

    // Fallback 1: Monaco Editor
    const monacoElement = document.querySelector('.monaco-editor');
    if (monacoElement && window.monaco) {
      try {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          return models[0].getValue();
        }
      } catch (e) {
        console.warn('[HackPush] Monaco access failed:', e);
      }
    }

    // Fallback 2: Textarea
    const textarea = document.querySelector('textarea[name="code"]') ||
                     document.querySelector('textarea.code-input') ||
                     document.querySelector('textarea[class*="code"]');
    if (textarea) {
      return textarea.value;
    }

    // Fallback 3: CodeMirror textarea
    const cmTextarea = document.querySelector('.CodeMirror textarea');
    if (cmTextarea) {
      return cmTextarea.value;
    }

    throw new Error('Could not extract code from editor');
  }

  /**
   * Extract programming language
   */
  static extractLanguage() {
    // Strategy 1: Select element
    const select = document.querySelector('select[name="language"]') ||
                   document.querySelector('[class*="language"] select') ||
                   document.querySelector('.challenge-selector select') ||
                   document.querySelector('#language-select');

    if (select) {
      const value = select.value || select.options[select.selectedIndex]?.value;
      if (value) {
        return this.normalizeLanguage(value);
      }
    }

    // Strategy 2: Button text
    const button = document.querySelector('[class*="language"]') ||
                   document.querySelector('[data-language]');
    if (button) {
      const lang = button.textContent?.trim() || button.getAttribute('data-language');
      if (lang) {
        return this.normalizeLanguage(lang);
      }
    }

    // Strategy 3: URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('language');
    if (langParam) {
      return this.normalizeLanguage(langParam);
    }

    throw new Error('Could not detect language');
  }

  /**
   * Normalize language name to standard format
   */
  static normalizeLanguage(lang) {
    const normalized = lang.toLowerCase().trim();
    const languageMap = {
      'python3': 'python3',
      'python': 'python3',
      'py': 'python3',
      'java': 'java',
      'javascript': 'javascript',
      'js': 'javascript',
      'cpp': 'cpp',
      'c++': 'cpp',
      'c': 'c',
      'csharp': 'csharp',
      'cs': 'csharp',
      'go': 'go',
      'golang': 'go',
      'ruby': 'ruby',
      'rb': 'ruby',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'scala': 'scala',
      'rust': 'rust',
      'php': 'php',
      'typescript': 'typescript',
      'ts': 'typescript',
      'r': 'r',
      'sql': 'sql',
      'bash': 'bash',
      'shell': 'bash'
    };

    return languageMap[normalized] || normalized;
  }

  /**
   * Get file extension for language
   */
  static getFileExtension(language) {
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

  /**
   * Extract problem title
   */
  static extractProblemTitle() {
    const titleSelectors = [
      '.challenge-title',
      'h1[class*="challenge"]',
      '.challenge-page-title',
      'h1',
      '[data-attr1="Title"]'
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

    // Fallback: Extract from URL
    const urlParts = window.location.pathname.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart !== 'problem') {
      return this.slugToTitle(lastPart);
    }

    return 'Unknown Problem';
  }

  /**
   * Extract problem slug from URL
   */
  static extractProblemSlug() {
    const urlParts = window.location.pathname.split('/');
    const slugIndex = urlParts.indexOf('problem');
    if (slugIndex !== -1 && slugIndex < urlParts.length - 1) {
      return urlParts[slugIndex + 1];
    }
    
    // Fallback: last meaningful part of URL
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart !== 'problem') {
      return lastPart;
    }

    return 'unknown-problem';
  }

  /**
   * Extract category from URL
   */
  static extractCategory() {
    const url = window.location.pathname;
    
    // Common HackerRank categories
    const categories = [
      'algorithms',
      'data-structures',
      'mathematics',
      'python',
      'java',
      'sql',
      'database',
      'artificial-intelligence',
      'regex',
      'functional-programming'
    ];

    for (const category of categories) {
      if (url.includes(category)) {
        return category;
      }
    }

    // Extract from URL structure: /challenges/category/problem-name
    const parts = url.split('/');
    const challengesIndex = parts.indexOf('challenges');
    if (challengesIndex !== -1 && challengesIndex < parts.length - 1) {
      const possibleCategory = parts[challengesIndex + 1];
      if (possibleCategory && !possibleCategory.includes('problem')) {
        return possibleCategory;
      }
    }

    return 'misc';
  }

  /**
   * Find submit button
   */
  static findSubmitButton() {
    const buttonSelectors = [
      'button[type="submit"]',
      'button[class*="submit"]',
      'button[data-analytics*="submit"]',
      '.challenge-submit-btn',
      'input[type="submit"]'
    ];

    for (const selector of buttonSelectors) {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        return button;
      }
    }

    return null;
  }

  /**
   * Check if submission was accepted
   */
  static isSubmissionAccepted(element) {
    if (!element) return false;

    const text = element.textContent?.toLowerCase() || '';
    const acceptedKeywords = [
      'accepted',
      'success',
      'all test cases passed',
      'congratulations',
      'passed',
      'successfully'
    ];

    const rejectedKeywords = [
      'wrong answer',
      'runtime error',
      'timeout',
      'failed',
      'error'
    ];

    // Check for rejection first
    if (rejectedKeywords.some(kw => text.includes(kw))) {
      return false;
    }

    // Check for acceptance
    return acceptedKeywords.some(kw => text.includes(kw));
  }

  /**
   * Wait for element to appear in DOM
   */
  static async waitForElement(selector, timeout = 15000) {
    return new Promise((resolve, reject) => {
      // Check if element already exists
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      // Create observer
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

      // Timeout protection
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for element: ${selector}`));
      }, timeout);
    });
  }

  /**
   * Convert slug to title case
   */
  static slugToTitle(slug) {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Make it available globally if needed (though content.js has its own inline version)
if (typeof window !== 'undefined') {
  window.HackPushDOMParser = DOMParser;
}
