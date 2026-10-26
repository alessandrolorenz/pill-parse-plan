# HTML to Figma Capture Skill

A comprehensive skill for capturing live web applications and importing them into Figma using Figma's HTML-to-Design feature.

## Overview

This skill enables AI agents to guide users through the process of capturing any running web application and importing it directly into Figma as editable design elements. The capture preserves layout, styling, and visual hierarchy.

## Skill Structure

```
html-to-figma-capture/
├── SKILL.md                    # Main skill instructions for AI agents
├── README.md                   # This file - documentation for humans
└── scripts/
    └── figma-capture.js        # Bundled capture script for console injection
```

## When to Use This Skill

The skill should be triggered when users mention:
- "Capture this page to Figma"
- "Import HTML to Figma"
- "Convert website to Figma"
- "Take a screenshot and put it in Figma"
- "Transfer this app to Figma"
- "Create Figma design from this page"

## How It Works

### Technical Flow

1. **Script Injection**: The JavaScript code dynamically injects Figma's capture SDK from `https://mcp.figma.com/mcp/html-to-design/capture.js`

2. **API Polling**: The script polls for the `window.figma.captureForDesign` API to become available (up to 20 attempts at 500ms intervals)

3. **Capture Execution**: Once available, it waits 2 seconds for full page render, then captures the entire `<body>` element

4. **Data Transfer**: The captured HTML, CSS, and layout data is sent to Figma's MCP endpoint at `https://mcp.figma.com/mcp/html-to-design`

5. **Clipboard Population**: Figma's API places the design data on the system clipboard

6. **Paste in Figma**: User pastes (Cmd/Ctrl+V) to import the captured design

### User Workflow

1. User opens browser DevTools (F12 or Cmd+Option+I)
2. User navigates to Console tab
3. User pastes the provided JavaScript code
4. User presses Enter to execute
5. User waits for "Capture completed" message in console
6. User opens Figma
7. User presses Cmd+V (Mac) or Ctrl+V (Windows)
8. Captured design appears in Figma

## Prerequisites

- Running web application accessible in a browser
- Figma desktop app installed OR Figma open in a browser tab
- Browser developer tools access (F12 or Cmd+Option+I)
- Active internet connection

## Use Cases

- **Documentation**: Document existing web applications in Figma
- **Design Specs**: Create design specifications from live implementations
- **Reverse Engineering**: Analyze designs for redesign projects
- **Design Systems**: Build design systems from existing code
- **Prototyping**: Quickly create Figma prototypes from working code

## Customization Options

The capture script can be customized by modifying these parameters:

- `selector`: Change from `'body'` to capture specific elements
  - Example: `'#main-content'`, `'.app-container'`
- `PRE_CAPTURE_DELAY_MS`: Adjust wait time before capture (default: 2000ms)
- `MAX_POLL_ATTEMPTS`: Change maximum polling attempts (default: 20)
- `POLL_INTERVAL_MS`: Adjust polling frequency (default: 500ms)

## Troubleshooting

### Common Issues

1. **"API not available after X attempts"**
   - Check internet connection
   - Verify page has fully loaded
   - Try refreshing and running again

2. **"Capture failed" error**
   - Wait for page to fully render
   - Check for complex iframes or shadow DOM
   - Try capturing a simpler section

3. **Nothing happens when pasting in Figma**
   - Verify "Capture completed" appeared in console
   - Ensure Figma is the active application
   - Check Figma clipboard permissions

4. **CORS or network errors**
   - Ensure page is served over HTTPS (not file://)
   - Check Content Security Policy headers
   - Try localhost instead of file:// protocol

## Best Practices

1. **Timing**: Wait for all dynamic content to load before capturing
2. **Selection**: For large pages, capture specific sections rather than entire body
3. **Responsive**: Capture at different viewport sizes to document responsive behavior
4. **Clean State**: Capture pages in default state (no hover effects, open modals, etc.)
5. **Iterative**: For complex apps, capture and import sections incrementally

## Limitations

- Cannot capture content inside cross-origin iframes
- Some CSS features may not translate perfectly to Figma
- Dynamic content (videos, animations) captured as static snapshots
- Very large pages may take longer to process or fail
- Requires active internet connection for SDK loading

## Installation

This skill is already installed in your AI Cockpit skills directory. No additional installation required.

## Related Resources

- [Figma HTML-to-Design](https://mcp.figma.com/mcp/html-to-design)
- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [Browser DevTools Guide](https://developer.chrome.com/docs/devtools/)

## License

MIT

## Version

1.0.0

## Author

Created using AI Cockpit Skill Creator