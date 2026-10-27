> **Status (2026-10-26):** Storybook não está instalado neste repositório (sem `.storybook/` nem dependências `storybook` no `package.json`). O servidor MCP em `http://localhost:6006/mcp` (configurado em `.mcp.json`) só funciona depois de instalar e rodar o Storybook.

# Storybook MCP Integration Guide

This document explains how to use the Storybook MCP (Model Context Protocol) server integration in the SDS project.

## Overview

The Storybook MCP server provides AI agents with programmatic access to component documentation, story previews, and UI building instructions. This enables more accurate and context-aware component implementations.

## Setup

### Prerequisites

- Storybook 9.1.16 or higher (currently using 10.3.5)
- `@storybook/addon-mcp` installed and configured

### Configuration

The MCP addon is configured in `.storybook/main.tsx`:

```typescript
addons: [
  {
    name: "@storybook/addon-mcp",
    options: {
      toolsets: {
        dev: true,   // Enable dev tools
        docs: true,  // Enable docs tools
      },
      experimentalFormat: "markdown",
    },
  },
],

features: {
  experimentalComponentsManifest: true, // Required for docs toolset
},
```

### Starting the MCP Server

The MCP server is automatically available when Storybook is running:

```bash
npm run storybook
# MCP server available at http://localhost:6006/mcp
```

## Available Tools

### 1. get_ui_building_instructions

Provides standardized instructions for UI component development within the project.

**Usage:**
```json
{
  "tool_call": {
    "name": "get_ui_building_instructions"
  }
}
```

**Returns:**
- Component development best practices
- Story writing guidelines (CSF3 format)
- Story linking requirements

### 2. preview-stories

Retrieves direct URLs to specific stories for visual verification.

**Usage:**
```json
{
  "tool_call": {
    "name": "preview-stories",
    "args": {
      "stories": [
        {
          "absoluteStoryPath": "src/stories/Button.stories.tsx",
          "exportName": "Primary"
        }
      ]
    }
  }
}
```

**Returns:**
- Story URLs for browser preview
- Useful for visual verification during implementation

### 3. list-all-documentation (Experimental)

Lists all available UI components and documentation entries.

**Usage:**
```json
{
  "tool_call": {
    "name": "list-all-documentation"
  }
}
```

**Returns:**
- Array of component IDs
- Array of standalone documentation IDs

### 4. get-documentation (Experimental)

Retrieves detailed documentation for a specific component.

**Usage:**
```json
{
  "tool_call": {
    "name": "get-documentation",
    "args": {
      "id": "Button"
    }
  }
}
```

**Returns:**
- Component API documentation
- Props and usage examples
- Implementation details

## Testing the MCP Server

### Using curl

Test the MCP server endpoints directly:

```bash
# List available tools
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# Get UI building instructions
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_ui_building_instructions",
      "arguments": {}
    }
  }'

# List all documentation
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list-all-documentation",
      "arguments": {}
    }
  }'
```

## AI Cockpit Integration

### Adding the MCP Server

To connect AI Cockpit to the Storybook MCP server, add it to your MCP settings:

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["-y", "@storybook/cli", "mcp"],
      "url": "http://localhost:6006/mcp",
      "transport": "http"
    }
  }
}
```

Or use the CLI:

```bash
npx mcp-add --type http --url "http://localhost:6006/mcp" --scope project
```

### Using MCP Tools in AI Cockpit

Once connected, AI agents can use the MCP tools to:

1. **Discover Components**: Use `list-all-documentation` to find available components
2. **Understand APIs**: Use `get-documentation` to learn component props and usage
3. **Verify Implementations**: Use `preview-stories` to get visual verification links
4. **Follow Standards**: Use `get_ui_building_instructions` for project-specific guidelines

## Workflow Examples

### Implementing a New Component

1. Agent uses `list-all-documentation` to check if similar components exist
2. Agent uses `get-documentation` to understand related component APIs
3. Agent implements the component following SDS patterns
4. Agent uses `preview-stories` to provide verification links
5. Developer reviews the implementation using the provided story URLs

### Updating Existing Components

1. Agent uses `get-documentation` to understand current component API
2. Agent makes changes while maintaining API compatibility
3. Agent uses `preview-stories` to verify changes across all variants
4. Developer confirms changes in Storybook

### Creating Stories

1. Agent uses `get_ui_building_instructions` to understand story format
2. Agent creates stories following CSF3 format
3. Agent uses `preview-stories` to provide links for review

## Benefits

- **Accurate Implementations**: AI agents have access to actual component APIs
- **Visual Verification**: Direct links to stories for quick validation
- **Consistency**: Standardized UI building instructions ensure consistent patterns
- **Discovery**: Easy exploration of available components and documentation
- **Real-time Context**: Always up-to-date with current component state

## Troubleshooting

### MCP Server Not Available

**Issue**: Cannot connect to `http://localhost:6006/mcp`

**Solutions**:
1. Ensure Storybook is running: `npm run storybook`
2. Check that port 6006 is not blocked
3. Verify the MCP addon is installed: `@storybook/addon-mcp`
4. Check `.storybook/main.tsx` configuration

### Tools Not Working

**Issue**: MCP tools return errors

**Solutions**:
1. Verify `experimentalComponentsManifest` is enabled for docs tools
2. Check Storybook version (must be 9.1.16+)
3. Review Storybook console for errors
4. Ensure stories are properly formatted (CSF3)

### Documentation Not Found

**Issue**: `get-documentation` returns no results

**Solutions**:
1. Ensure component has proper TypeScript documentation
2. Check that `reactDocgen` is enabled in Storybook config
3. Verify component is exported properly
4. Rebuild Storybook: `npm run storybook:build`

## Additional Resources

- [Storybook MCP Documentation](https://storybook.js.org/docs/ai/mcp/overview)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [SDS Component Library](../src/ui/)
- [Storybook Stories](../src/stories/)

## Version History

- **2026-04-09**: Initial setup with Storybook 10.3.5 and @storybook/addon-mcp 0.5.0