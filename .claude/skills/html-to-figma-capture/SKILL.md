---
name: html-to-figma-capture
description: >-
  Capture any running web application and import it into Figma using Figma's HTML-to-Design feature. This skill temporarily injects a capture script, guides the user through manual copy-paste, then cleans up. Use when the user wants to capture a web page, import HTML to Figma, convert a website to Figma, or transfer a running application into Figma for design work.
license: MIT
metadata:
  category: design
  tags:
    - figma
    - html-to-design
    - capture
    - design-import
---

# HTML to Figma Capture

Capture any running web application and import it into Figma using Figma's HTML-to-Design feature with a guided manual workflow.

## Purpose

This skill enables capturing live web applications and importing them into Figma as editable design elements through a temporary script injection and manual copy-paste workflow. The capture preserves layout, styling, and visual hierarchy.

## When to Use

Use this skill when the user mentions:
- "Capture this page to Figma"
- "Import HTML to Figma"
- "Convert website to Figma"
- "Send this to Figma"
- "Copy page to Figma"
- "Transfer this app to Figma"

## Prerequisites

- Web application is running and accessible
- User has Figma open (desktop app or browser)
- Project has `/scripts/figma-capture.js` file available

## Complete Workflow

This skill follows a 4-phase workflow: Setup → Instruct → Wait → Cleanup

### Phase 1: Setup & Script Injection

**Step 1.1: Locate index.html**

Search for the project's index.html file in common locations:
- Root directory: `index.html`
- Public directory: `public/index.html`
- Source directory: `src/index.html`
- Dist directory: `dist/index.html`

If multiple files exist, ask the user which one to modify.

**Step 1.2: Check for Existing Script**

Before injecting, check if the script is already present to avoid duplicates:

```javascript
// Check if this line exists in index.html:
<script src="/scripts/figma-capture.js" async></script>
```

If found, skip injection and proceed to Phase 2 (instructions).

**Step 1.3: Inject Capture Script**

Add the script tag before the closing `</body>` tag:

```html
  <script src="/scripts/figma-capture.js" async></script>
</body>
```

Use the `apply_diff` or `write_to_file` tool to modify the file.

**Step 1.4: Verify Injection**

Confirm the script was added successfully by reading the file back.

### Phase 2: Provide User Instructions

Present these clear, step-by-step instructions to the user:

```
🎨 Figma Capture Ready!

I've temporarily added the Figma capture script to your index.html file.

📋 MANUAL COPY-PASTE WORKFLOW:

1. **Reload your browser** at the running application URL
   - The capture script will automatically trigger after page load
   - Wait 2-3 seconds for the page to fully render

2. **Watch for the capture modal** at the top of the page
   - You'll see "Sending to Figma..." appear
   - ⚠️ Initial send will likely FAIL - this is expected!

3. **Click "Copy instead"** when the error appears
   - The modal will show "Couldn't send to Figma"
   - Click the "Copy instead" button
   - This copies the design data to your clipboard

4. **Switch to Figma** and paste
   - Open your Figma file
   - Press Cmd+V (Mac) or Ctrl+V (Windows/Linux)
   - The captured design will appear!

5. **Confirm completion** below once done

💡 TROUBLESHOOTING:
- If nothing happens: Refresh the page and wait longer
- If modal doesn't appear: Check browser console for errors
- If paste doesn't work: Try the copy-paste process again
- If capture looks wrong: Adjust viewport size and recapture

Let me know when you've successfully pasted the design into Figma!
```

### Phase 3: Wait for User Confirmation

Use `ask_followup_question` to pause the workflow:

```xml
<ask_followup_question>
<question>Have you successfully captured and pasted the design into Figma?</question>
<follow_up>
<suggest>✅ Yes, it worked! The design is now in Figma</suggest>
<suggest>❌ No, I encountered an error (please describe)</suggest>
<suggest>🔄 Let me try again</suggest>
<suggest>❓ I need help with the process</suggest>
</follow_up>
</ask_followup_question>
```

**Handle User Responses:**

- **"Yes, it worked"** → Proceed to Phase 4 (cleanup)
- **"No, error"** → Provide troubleshooting, ask if they want to retry
- **"Try again"** → Repeat Phase 2 instructions
- **"Need help"** → Provide detailed troubleshooting guide

### Phase 4: Cleanup & Restoration

**Step 4.1: Remove Injected Script**

Remove the script line from index.html:

```html
<!-- Remove this line: -->
<script src="/scripts/figma-capture.js" async></script>
```

Use `apply_diff` to remove the exact line that was added.

**Step 4.2: Verify Cleanup**

Read the file back to confirm the script was removed and the file is restored to its original state.

**Step 4.3: Confirm Completion**

Report to the user:

```
✅ Capture Complete!

The design has been successfully imported to Figma, and I've removed the temporary capture script from your index.html file.

Your project is back to its original state.
```

## Error Handling

### File Not Found

If index.html cannot be located:

```
❌ Could not locate index.html

Please provide the path to your project's HTML entry point:
- Common locations: index.html, public/index.html, src/index.html
- Or provide the full path relative to the project root
```

### Permission Denied

If file cannot be modified:

```
❌ Permission denied when modifying index.html

Manual steps:
1. Open index.html in your editor
2. Add this line before </body>:
   <script src="/scripts/figma-capture.js" async></script>
3. Save the file
4. Follow the capture instructions above
5. Remove the script line when done
```

### Script Already Present

If script is already in the file:

```
ℹ️ Capture script is already present in index.html

Proceeding with capture instructions...
[Continue to Phase 2]
```

### Cleanup Fails

If script removal fails:

```
⚠️ Could not automatically remove the capture script

Please manually remove this line from index.html:
<script src="/scripts/figma-capture.js" async></script>

The line should be near the closing </body> tag.
```

## Technical Details

### How the Capture Works

1. **Script Injection**: Adds `figma-capture.js` to the HTML
2. **Auto-Trigger**: Script runs automatically on page load
3. **SDK Loading**: Injects Figma's capture SDK from `https://mcp.figma.com/mcp/html-to-design/capture.js`
4. **Capture Execution**: Captures the `<body>` element after 2-second delay
5. **Data Transfer**: Attempts to send to Figma's MCP endpoint
6. **Fallback**: On failure, provides "Copy instead" button
7. **Manual Paste**: User pastes captured data into Figma

### Why Manual Copy-Paste?

The automatic "send to Figma" feature requires:
- Figma plugin actively running and listening
- Proper authentication and permissions
- Network connectivity to Figma's servers

Since these conditions aren't always met, the manual copy-paste workflow is more reliable:
- Works without plugin setup
- No authentication required
- Clipboard-based transfer is universal
- User has full control over the process

## Best Practices

1. **Capture Timing**: Ensure page is fully loaded before capturing
2. **Viewport Size**: Set browser to desired viewport before capture
3. **Clean State**: Capture in default state (no hovers, modals, etc.)
4. **Section Capture**: For large pages, consider capturing sections separately
5. **Responsive Testing**: Capture at different breakpoints for responsive docs

## Limitations

- Cannot capture cross-origin iframe content
- Some CSS features may not translate perfectly
- Dynamic content captured as static snapshots
- Very large pages may fail to capture
- Requires internet connection for SDK loading

## Project-Agnostic Design

This skill works across different projects by:

1. **Dynamic File Location**: Searches multiple common paths for index.html
2. **Relative Script Path**: Uses `/scripts/figma-capture.js` which works with most dev servers
3. **No Hardcoded Paths**: All paths are discovered or user-provided
4. **Flexible Cleanup**: Removes only what was added, preserving other scripts
5. **Error Recovery**: Provides manual fallback instructions for any environment

## Example Usage

**User Request:**
> "Capture the running page at localhost:8000 and send it to Figma"

**Skill Execution:**
1. ✅ Located `index.html` in project root
2. ✅ Injected capture script before `</body>`
3. 📋 Provided manual copy-paste instructions
4. ⏸️ Waiting for user confirmation...
5. ✅ User confirmed success
6. ✅ Removed capture script from `index.html`
7. ✅ Task complete!

## Related Skills

- **figma-generate-design**: Build designs in Figma from code (component-based)
- **figma-implement-design**: Convert Figma designs to code (reverse direction)
- **figma-use**: Execute Figma Plugin API scripts directly

## Maintenance Notes

- Ensure `/scripts/figma-capture.js` exists in the project
- Update capture script if Figma changes their SDK URL
- Test workflow across different project structures
- Keep troubleshooting section updated with common issues