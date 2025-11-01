# HackPush

**Automatically Sync Accepted HackerRank Solutions to GitHub**

HackPush is a Chrome/Firefox browser extension that automatically synchronizes your accepted HackerRank coding solutions to a GitHub repository. Inspired by LeetHub, HackPush is specifically designed for HackerRank's DOM structure and uses Manifest V3 standards.

## Features

- ✅ **Automatic Sync**: Detects accepted submissions and pushes to GitHub automatically
- 🎯 **Smart Detection**: Monitors HackerRank pages using MutationObserver
- 📁 **Organized Structure**: Files organized by category with customizable templates
- 🔒 **Secure**: Uses GitHub Personal Access Tokens
- 📝 **Metadata Headers**: Adds problem info, language, and submission date to each file
- 📊 **Submission History**: Track all your synced solutions

## Installation

### For Development

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `hackpush` directory

### For Production

The extension will be available on Chrome Web Store (coming soon).

## Setup

1. **Generate GitHub Personal Access Token**:
   - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a name (e.g., "HackPush")
   - Select scope: **repo** (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

2. **Configure HackPush**:
   - Click the HackPush extension icon
   - Click "Get Started"
   - Enter your GitHub token
   - Enter repository in format: `username/repo-name`
   - (Optional) Customize branch and file structure
   - Click "Save Configuration"
   - Click "Test Connection" to verify

3. **Create Repository** (if needed):
   ```bash
   # On GitHub, create a new repository
   # Or use CLI:
   gh repo create hackerrank-solutions --public
   ```

## Usage

1. Solve a problem on HackerRank
2. Submit your solution
3. If accepted, HackPush automatically:
   - Extracts your code
   - Detects the language
   - Creates/updates the file in your GitHub repo
   - Organizes by category (algorithms, data-structures, etc.)

**That's it!** No manual steps required.

## File Organization

Default structure:
```
hackerrank/
├── algorithms/
│   ├── simple-array-sum.py
│   └── compare-triplets.java
├── data-structures/
│   ├── arrays-ds.cpp
│   └── 2d-array.js
└── sql/
    └── revising-select-query.sql
```

You can customize the structure in options using variables:
- `{category}` - Problem category (algorithms, data-structures, etc.)
- `{filename}` - Auto-generated filename
- `{slug}` - Problem slug from URL
- `{language}` - Programming language

Example: `solutions/{language}/{category}/{slug}.{ext}`

## Supported Languages

- Python (python3)
- Java
- JavaScript
- C++
- C
- C#
- Go
- Ruby
- Swift
- Kotlin
- Scala
- Rust
- PHP
- TypeScript
- R
- SQL
- Bash/Shell

## Project Structure

```
hackpush/
├── manifest.json              # Extension manifest (Manifest V3)
├── icons/                      # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── js/
│   │   ├── background.js       # Service worker
│   │   ├── content.js          # Main monitoring logic
│   │   ├── dom-parser.js       # DOM extraction utilities
│   │   ├── github-api.js       # GitHub API wrapper
│   │   └── storage.js          # Chrome storage manager
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── options/
│       ├── options.html
│       ├── options.js
│       └── options.css
├── README.md
└── package.json
```

## Troubleshooting

### Extension not detecting submissions

1. Make sure you're on a HackerRank problem page (`/problem/`)
2. Check browser console (F12) for `[HackPush]` logs
3. Reload the extension: `chrome://extensions/` → Reload icon

### GitHub sync fails

1. Verify your token has `repo` scope
2. Check repository format: `owner/repo`
3. Ensure repository exists and you have write access
4. Test connection in options page

### Code not extracted

1. HackerRank may have updated their UI
2. Check console for extraction errors
3. File an issue with the problem URL

## Development

### Prerequisites

- Node.js (optional, for scripts)
- Chrome or Firefox browser

### Local Development

1. Load extension in developer mode
2. Make changes to source files
3. Reload extension to test changes
4. Check service worker console: `chrome://extensions/` → "service worker" link
5. Check content script console: DevTools on HackerRank page

## Security & Privacy

- **Tokens**: Stored locally in Chrome storage (not encrypted)
- **Code**: Only sent to your GitHub repository
- **Data**: No analytics or tracking
- **Permissions**: 
  - `storage`: Save configuration
  - `activeTab`: Read code from HackerRank
  - `scripting`: Inject content scripts
  - `https://www.hackerrank.com/*`: Monitor submissions
  - `https://api.github.com/*`: Push to GitHub

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License

## Acknowledgments

- Inspired by [LeetHub](https://github.com/QasimWani/LeetHub)
- Built with Manifest V3
- Uses GitHub REST API

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing issues for solutions

---

**Happy Coding! 🚀**

