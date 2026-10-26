---
name: figma-create-new-file
description: "Create a new blank Figma file. Use when the user wants to create a new Figma design or FigJam file, or when you need a new file before calling Figma write tools. Usage: /figma-create-new-file [editorType] [fileName]. editorType is 'design' (default) or 'figjam'."
disable-model-invocation: false
---

# figma-create-new-file

Create a new blank Figma file. Use when the user wants to create a new Figma design or FigJam file, or when you need a new file before calling Figma write tools.

**Usage**: `/figma-create-new-file [editorType] [fileName]`
- `editorType`: `design` (default) or `figjam`
- `fileName`: The name for the new file

**Examples**:
- `/figma-create-new-file design My Design System`
- `/figma-create-new-file figjam Architecture Diagram`
- `/figma-create-new-file` (prompts for details)

**Requires**: Figma Official MCP (`figma-windows-cmd`) connection.

## MCP Requirements

This skill uses **Figma Official MCP** exclusively:
- `whoami` — Get current user info and resolve team/plan details
- `create_new_file` — Create the new file

## Workflow

### Step 1: Resolve User Plan (if needed)
If the user hasn't specified a team or the file creation requires team context:

```
whoami()
```

Returns:
- User ID and name
- Email
- Plan type (Starter, Professional, Organization, Enterprise)
- Team IDs (if on a team plan)

Use the team ID for `create_new_file` if the user is on a team plan.

### Step 2: Determine File Parameters
From the user's request, determine:
- `name` — File name (required)
- `editorType` — `'design'` or `'figjam'` (default: `'design'`)
- `teamId` — Team ID (optional, from `whoami` if needed)

### Step 3: Create the File
```
create_new_file(name, editorType, teamId?)
```

Returns:
- `fileKey` — The new file's key (use this for all subsequent operations)
- `url` — Direct URL to the new file

### Step 4: Confirm and Provide Next Steps
After creation, provide the user with:
1. The file URL (so they can open it in Figma)
2. The fileKey (for use with Console MCP tools)
3. Suggested next steps based on the file type

**For design files**, suggest:
- Load `figma-generate-library` skill to build a design system
- Load `figma-generate-design` skill to build screens
- Load `figma-use` skill for general canvas operations

**For FigJam files**, suggest:
- Load `figma-console-figjam` skill to create boards and diagrams

## File Type Reference

| Editor Type | Use Case | Suggested Next Skill |
|-------------|----------|---------------------|
| `design` | UI design, components, design systems | `figma-generate-library`, `figma-generate-design` |
| `figjam` | Brainstorming, diagrams, flowcharts, architecture | `figma-console-figjam` |

## Plan Considerations

| Plan | File Location | Notes |
|------|--------------|-------|
| Starter | Personal drafts | No team ID needed |
| Professional | Personal or team | teamId optional |
| Organization | Team required | Must provide teamId |
| Enterprise | Team required | Must provide teamId |

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| "Team not found" | Invalid teamId | Use `whoami` to get correct team IDs |
| "Permission denied" | Plan doesn't allow team files | Create in personal drafts (no teamId) |
| "Name required" | Empty file name | Ask user for a file name |

## Completion

After successful creation:
1. Share the file URL with the user
2. Store the `fileKey` for use in subsequent Figma operations
3. Suggest the appropriate next skill based on the file type
