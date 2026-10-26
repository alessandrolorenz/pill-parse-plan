# Storybook MCP Quick Reference

## Quick Start

1. **Start Storybook**: `npm run storybook`
2. **MCP Endpoint**: `http://localhost:6006/mcp`
3. **Available Components**: 27 SDS components

## Available Tools

### 1. list-all-documentation
**When to use**: Discover available components before implementation

```bash
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list-all-documentation",
      "arguments": {}
    }
  }'
```

**Returns**: List of all 27 components with IDs and descriptions

### 2. get-documentation
**When to use**: Before implementing or modifying a component

```bash
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get-documentation",
      "arguments": {
        "id": "sds-primitives-buttons"
      }
    }
  }'
```

**Returns**: 
- Component props and TypeScript definitions
- First 3 stories with code examples
- Real usage patterns

### 3. get-documentation-for-story
**When to use**: Need specific story variant details

```bash
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get-documentation-for-story",
      "arguments": {
        "componentId": "sds-primitives-buttons",
        "storyName": "Primary"
      }
    }
  }'
```

**Returns**: Detailed documentation for specific story variant

### 4. preview-stories
**When to use**: Get visual verification links after implementation

```bash
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "preview-stories",
      "arguments": {
        "stories": [
          {
            "storyId": "sds-primitives-buttons--primary"
          }
        ]
      }
    }
  }'
```

**Returns**: Direct URLs to story previews for browser verification

### 5. get-storybook-story-instructions
**When to use**: Before creating or modifying .stories.* files

```bash
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "get-storybook-story-instructions",
      "arguments": {}
    }
  }'
```

**Returns**: 
- Story structure guidelines
- Required imports
- Naming conventions
- Play function patterns
- Testing strategies

## Common Workflows

### Implementing a New Component

```bash
# 1. Check if similar components exist
list-all-documentation

# 2. Get documentation for related components
get-documentation --id "sds-primitives-buttons"

# 3. Implement component following SDS patterns

# 4. Get story instructions
get-storybook-story-instructions

# 5. Create stories

# 6. Get preview URLs for verification
preview-stories --storyId "your-component--variant"
```

### Updating Existing Component

```bash
# 1. Get current component documentation
get-documentation --id "component-id"

# 2. Review specific story variants
get-documentation-for-story --componentId "component-id" --storyName "Variant"

# 3. Make changes

# 4. Verify all variants
preview-stories --storyId "component-id--variant1"
preview-stories --storyId "component-id--variant2"
```

### Creating Stories

```bash
# 1. Get story instructions
get-storybook-story-instructions

# 2. Get component documentation for props
get-documentation --id "component-id"

# 3. Create stories following CSF3 format

# 4. Preview stories
preview-stories --storyId "component-id--story-name"
```

## Component IDs Reference

### Compositions
- `sds-compositions-cards` - Card components
- `sds-compositions-chatinput` - Chat input
- `sds-compositions-chatsidebar` - Chat sidebar
- `sds-compositions-forms` - Form components

### Layout
- `sds-layout-flex` - Flexbox layouts
- `sds-layout-grid` - Grid layouts
- `sds-layout-section` - Page sections

### Primitives
- `sds-primitives-accordion` - Accordion
- `sds-primitives-avatars` - Avatar
- `sds-primitives-buttons` - Button
- `sds-primitives-inputs` - Checkbox, Input, Textarea
- `sds-primitives-dialog` - Dialog/Modal
- `sds-primitives-image` - Image
- `sds-primitives-link` - Link
- `sds-primitives-listbox` - ListBox
- `sds-primitives-menu` - Menu
- `sds-primitives-navigation` - Navigation
- `sds-primitives-notification` - Notification
- `sds-primitives-pagination` - Pagination
- `sds-primitives-tabs` - Tabs
- `sds-primitives-table` - Table
- `sds-primitives-tags` - Tag
- `sds-primitives-text` - Text/Typography
- `sds-primitives-tooltip` - Tooltip

## Tips

1. **Always check documentation first**: Use `get-documentation` before implementing to avoid prop hallucination
2. **Use story IDs when possible**: Prefer `{ storyId }` over `{ absoluteStoryPath, exportName }` to avoid filesystem lookups
3. **Include preview URLs**: Always include preview URLs in responses for user verification
4. **Follow story instructions**: Call `get-storybook-story-instructions` before creating stories
5. **Verify all variants**: Use `preview-stories` to check all component variants after changes

## Troubleshooting

### MCP Server Not Available
```bash
# Check if Storybook is running
curl http://localhost:6006

# Restart Storybook
npm run storybook
```

### Tools Not Working
```bash
# List available tools
curl -X POST http://localhost:6006/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Component Not Found
```bash
# List all components to find correct ID
list-all-documentation
```

## Additional Resources

- [Full Documentation](.aicockpit/docs/storybook-mcp-integration.md)
- [Storybook MCP Docs](https://storybook.js.org/docs/ai/mcp/overview)
- [SDS Component Library](../src/ui/)