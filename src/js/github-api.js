/**
 * GitHub API Wrapper
 * Handles all GitHub API operations
 */
export class GitHubAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.github.com';
  }

  /**
   * Validate GitHub token
   */
  async validateToken() {
    try {
      const response = await fetch(`${this.baseURL}/user`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('[HackPush] Token validation error:', error);
      return false;
    }
  }

  /**
   * Get file SHA if it exists
   */
  async getFileSha(owner, repo, path, branch = 'main') {
    try {
      const encodedPath = encodeURIComponent(path);
      const response = await fetch(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${branch}`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.sha;
      } else if (response.status === 404) {
        return null; // File doesn't exist
      } else {
        throw new Error(`GitHub API error: ${response.status}`);
      }
    } catch (error) {
      console.error('[HackPush] Error getting file SHA:', error);
      throw error;
    }
  }

  /**
   * Create or update file using Contents API
   */
  async createOrUpdateFile(owner, repo, path, content, message, branch = 'main') {
    try {
      // Encode content to base64
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      // Get existing file SHA if it exists
      const sha = await this.getFileSha(owner, repo, path, branch);

      const body = {
        message,
        content: encodedContent,
        branch
      };

      if (sha) {
        body.sha = sha; // Required for updates
      }

      const encodedPath = encodeURIComponent(path);
      const response = await fetch(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${encodedPath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `GitHub API error: ${response.status} - ${errorData.message || response.statusText}`
        );
      }

      const data = await response.json();
      return {
        success: true,
        commit: data.commit,
        content: data.content,
        html_url: data.content.html_url
      };
    } catch (error) {
      console.error('[HackPush] Error creating/updating file:', error);
      throw error;
    }
  }

  /**
   * Test repository access
   */
  async testRepository(owner, repo) {
    try {
      const response = await fetch(
        `${this.baseURL}/repos/${owner}/${repo}`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          name: data.name,
          full_name: data.full_name,
          default_branch: data.default_branch
        };
      } else {
        return {
          success: false,
          error: `Repository not found or access denied (${response.status})`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format file content with metadata header
   */
  static formatFileContent(code, metadata) {
    const { problemTitle, language, timestamp, url } = metadata;
    
    // Determine comment style based on language
    const commentStyles = {
      'python3': { start: '"""', end: '"""' },
      'java': { start: '/*', end: '*/', line: ' * ' },
      'javascript': { start: '/*', end: '*/', line: ' * ' },
      'cpp': { start: '/*', end: '*/', line: ' * ' },
      'c': { start: '/*', end: '*/', line: ' * ' },
      'csharp': { start: '/*', end: '*/', line: ' * ' },
      'go': { start: '/*', end: '*/', line: ' * ' },
      'ruby': { start: '=begin', end: '=end', line: ' ' },
      'rust': { start: '/*', end: '*/', line: ' * ' },
      'php': { start: '/*', end: '*/', line: ' * ' },
      'typescript': { start: '/*', end: '*/', line: ' * ' },
      'sql': { start: '-- ', end: '' },
      'bash': { start: '# ', end: '' }
    };

    const style = commentStyles[language] || { start: '# ', end: '' };
    
    let header = '';
    if (style.line) {
      // Multi-line comment (Java, C++, etc.)
      header = `${style.start}\n${style.line}Problem: ${problemTitle}\n`;
      header += `${style.line}Language: ${language}\n`;
      header += `${style.line}Submitted: ${timestamp}\n`;
      header += `${style.line}HackerRank URL: ${url}\n`;
      header += `${style.line}Auto-synced by HackPush\n`;
      header += `${style.end}\n\n`;
    } else if (language === 'python3' && style.start === '"""') {
      // Python docstring format (proper multi-line)
      header = `"""\nProblem: ${problemTitle}\nLanguage: ${language}\nSubmitted: ${timestamp}\nHackerRank URL: ${url}\nAuto-synced by HackPush\n"""\n\n`;
    } else {
      // Single-line comments (Python #, SQL --, Bash #)
      const lines = [
        style.start + `Problem: ${problemTitle}`,
        style.start + `Language: ${language}`,
        style.start + `Submitted: ${timestamp}`,
        style.start + `HackerRank URL: ${url}`,
        style.start + 'Auto-synced by HackPush'
      ];
      if (style.end) {
        lines[lines.length - 1] += ' ' + style.end;
      }
      header = lines.join('\n') + '\n\n';
    }

    return header + code;
  }

  /**
   * Generate file path from template
   */
  static generateFilePath(template, data) {
    const { category, filename, slug, language } = data;
    
    // Sanitize filename
    const sanitizedFilename = filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const sanitizedSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let path = template
      .replace(/\{category\}/g, category)
      .replace(/\{filename\}/g, sanitizedFilename)
      .replace(/\{slug\}/g, sanitizedSlug)
      .replace(/\{language\}/g, language);

    // Remove double slashes
    path = path.replace(/\/+/g, '/');

    return path;
  }
}

