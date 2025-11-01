# HackPush Setup Instructions

## Quick Start

1. **Load Extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle top-right)
   - Click "Load unpacked"
   - Select the `hackpush` folder

2. **Generate GitHub Token**:
   - Visit https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it "HackPush"
   - Select **repo** scope
   - Generate and copy the token

3. **Configure Extension**:
   - Click HackPush icon in toolbar
   - Click "Get Started"
   - Enter GitHub token
   - Enter repository: `username/repo-name`
   - Click "Save Configuration"
   - Click "Test Connection"

4. **Start Using**:
   - Go to any HackerRank problem page
   - Write and submit your solution
   - If accepted, it automatically syncs to GitHub!

## Testing

1. Go to a HackerRank problem (e.g., https://www.hackerrank.com/challenges/simple-array-sum/problem)
2. Write a solution
3. Submit it
4. Watch the notification when accepted
5. Check your GitHub repository

## Troubleshooting

- **Check console**: Open DevTools (F12) on HackerRank page, look for `[HackPush]` logs
- **Check service worker**: Go to `chrome://extensions/` → Find HackPush → Click "service worker"
- **Verify permissions**: Make sure extension has access to HackerRank and GitHub

## Development

After making changes:
1. Go to `chrome://extensions/`
2. Find HackPush extension
3. Click reload icon (↻)
4. Refresh HackerRank page

