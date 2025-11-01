/**
 * Storage Manager
 * Handles Chrome storage API operations
 */
export class StorageManager {
  static async getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ['github_token', 'github_repo', 'branch', 'file_structure'],
        (result) => resolve(result)
      );
    });
  }

  static async saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set(config, () => resolve());
    });
  }

  static async addSubmissionRecord(record) {
    const { submissions = [] } = await new Promise((resolve) => {
      chrome.storage.local.get(['submissions'], resolve);
    });
    
    // Check for duplicates
    const exists = submissions.some(
      sub => sub.problemSlug === record.problemSlug && 
             sub.language === record.language &&
             Math.abs(new Date(sub.timestamp) - new Date(record.timestamp)) < 60000
    );
    
    if (!exists) {
      submissions.push(record);
      return new Promise((resolve) => {
        chrome.storage.local.set({ submissions }, resolve);
      });
    }
    return Promise.resolve();
  }

  static async getSubmissions() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['submissions'], (result) => {
        resolve(result.submissions || []);
      });
    });
  }

  static async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }

  static async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
  }

  static async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
}

