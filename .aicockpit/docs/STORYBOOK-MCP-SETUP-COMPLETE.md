# Storybook MCP Server - Setup Complete ✅

## Overview

The Storybook MCP (Model Context Protocol) server has been successfully configured and is running at:

**MCP Endpoint:** `http://localhost:6006/mcp`

## Server Status

✅ **Server is Running and Accessible**

The MCP server is active and responding with available toolsets. The server provides three main toolset categories for interacting with Storybook components and documentation.

## Available Toolsets

### 1. **dev** Toolset (ENABLED)

Development tools for working with Storybook stories:

- **`preview-stories`** - Preview and interact with component stories
- **`get-storybook-story-instructions`** - Get detailed instructions for working with specific stories

### 2. **docs** Toolset (ENABLED)

Documentation tools for accessing component information:

- **`list-all-documentation`** - List all available component documentation
- **`get-documentation`** - Retrieve specific component documentation

### 3. **test** Toolset (DISABLED)

Testing tools (requires additional setup):

- **`run-story-tests`** - Run tests for stories
- ⚠️ **Note:** This toolset requires Storybook 10.3.0+ with `@storybook/addon-vitest`
- 📚 [Learn how to set it up](https://storybook.js.org/docs/writing-tests/vitest-plugin)
- 🔧 Add `@storybook/addon-a11y` for accessibility testing ([Learn more](https://storybook.js.org/docs/writing-tests/accessibility-testing))

## MCP Configuration

The MCP server is configured in `.aicockpit/mcp_settings.json`:

```json
{
  "mcpServers": {
    "storybook": {
      "type": "http",
      "url": "http://localhost:6006/mcp",
      "description": "Storybook MCP server for component documentation and testing"
    }
  }
}
```

## How to Use with AI Cockpit

### Accessing Component Documentation

Use the MCP server to retrieve component documentation and examples:

```typescript
// Example: Get documentation for a specific component
use_mcp_tool({
  server_name: "storybook",
  tool_name: "get-documentation",
  arguments: {
    componentName: "Button"
  }
})
```

### Listing All Components

Get a complete list of documented components:

```typescript
use_mcp_tool({
  server_name: "storybook",
  tool_name: "list-all-documentation",
  arguments: {}
})
```

### Previewing Stories

Preview component stories in the browser:

```typescript
use_mcp_tool({
  server_name: "storybook",
  tool_name: "preview-stories",
  arguments: {
    storyId: "primitives-button--primary"
  }
})
```

### Getting Story Instructions

Get detailed instructions for working with specific stories:

```typescript
use_mcp_tool({
  server_name: "storybook",
  tool_name: "get-storybook-story-instructions",
  arguments: {
    storyId: "primitives-button--primary"
  }
})
```

## Component Manifest Feature

The Storybook server has detected and registered the **experimental components manifest feature**, which provides enhanced component discovery and metadata capabilities.

## Troubleshooting

### MCP Endpoint Returns 404

If you see a 404 error when accessing `http://localhost:6006/mcp`, ensure:

1. ✅ Storybook is running (`npm run storybook`)
2. ✅ The `storybook-mcp` addon is installed and configured in `.storybook/main.tsx`
3. ✅ The server is accessible at `http://localhost:6006`

### Storybook Not Running

Start Storybook with:

```bash
npm run storybook
```

The server will be available at `http://localhost:6006` with the MCP endpoint at `http://localhost:6006/mcp`.

### Testing Toolset Disabled

To enable the testing toolset:

1. Upgrade to Storybook 10.3.0 or higher
2. Install `@storybook/addon-vitest`
3. Configure the addon in `.storybook/main.tsx`
4. Optionally add `@storybook/addon-a11y` for accessibility testing

## Additional Resources

- [Storybook MCP Addon Documentation](https://github.com/storybookjs/addon-mcp)
- [Component Manifest Debugger](http://localhost:6006/component-manifest-debugger) (when Storybook is running)
- [Addon README](https://www.npmjs.com/package/storybook-mcp)

## Next Steps

1. ✅ MCP server is configured and running
2. ✅ Available tools documented
3. 🎯 Ready to use MCP tools for component documentation and development
4. 📝 Consider enabling the test toolset for automated testing capabilities

---

**Last Updated:** 2026-04-22  
**Status:** ✅ Operational  
**Endpoint:** http://localhost:6006/mcp