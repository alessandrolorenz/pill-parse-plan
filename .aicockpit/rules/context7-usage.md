# Context7 MCP Server — Usage Guide

Context7 fetches up-to-date documentation and code snippets for libraries directly from their official sources. Use it whenever you need to look up API details, configuration options, or usage patterns for any library or framework.

## Available Tools

| Tool | Purpose |
|---|---|
| `resolve-library-id` | Find the Context7 library ID for a given library name |
| `query-docs` | Fetch documentation snippets for a specific topic within a library |

---

## Step 1 — Resolve the Library ID

Before fetching docs, you must resolve the library's Context7-compatible ID.

```json
{
  "server_name": "context7",
  "tool_name": "resolve-library-id",
  "arguments": {
    "libraryName": "react-aria-components",
    "query": "react-aria-components"
  }
}
```

> ⚠️ **Both `libraryName` and `query` are required.** Omitting either one causes a validation error.

The response returns a list of matching libraries. Pick the one with the highest `Benchmark Score` and most relevant description. Copy its `Context7-compatible library ID` (e.g. `/websites/react-aria_adobe`).

---

## Step 2 — Query Documentation

Use the resolved library ID to fetch documentation on a specific topic.

```json
{
  "server_name": "context7",
  "tool_name": "query-docs",
  "arguments": {
    "libraryId": "/websites/react-aria_adobe",
    "query": "Button component props",
    "tokens": 500
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `libraryId` | string | ✅ | The Context7-compatible ID from `resolve-library-id` |
| `query` | string | ✅ | The topic or question to search for |
| `tokens` | number | ❌ | Max tokens to return (default: varies). Use `500`–`2000` for focused results |

---

## Full Example — React Aria Button

```
Step 1: resolve-library-id
  libraryName: "react-aria-components"
  query: "react-aria-components"
  → returns ID: /websites/react-aria_adobe

Step 2: query-docs
  libraryId: "/websites/react-aria_adobe"
  query: "Button component"
  tokens: 500
  → returns Button API props, PressEvent details, and code examples
```

---

## Common Library IDs (pre-resolved)

| Library | Context7 ID |
|---|---|
| React Aria (Adobe) | `/websites/react-aria_adobe` |
| React Aria (react-spectrum) | `/websites/react-spectrum_adobe_react-aria` |
| React | `/facebook/react` |
| Next.js | `/vercel/next.js` |
| Vite | `/vitejs/vite` |
| Storybook | `/storybookjs/storybook` |
| TypeScript | `/microsoft/typescript` |

---

## Troubleshooting

### `TypeError: fetch failed`
The server cannot reach `https://context7.com`. Fix: ensure `NODE_TLS_REJECT_UNAUTHORIZED: "0"` is set in the server's env in `mcp_settings.json`:

```json
"context7": {
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"],
  "env": {
    "DEFAULT_MINIMUM_TOKENS": "",
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  }
}
```

### `Invalid input: expected string, received undefined`
You are missing a required argument. For `resolve-library-id`, always pass **both** `libraryName` and `query`. For `query-docs`, always pass **both** `libraryId` and `query`.

### `Tool 'get-library-docs' does not exist`
The correct tool name is `query-docs`, not `get-library-docs`.