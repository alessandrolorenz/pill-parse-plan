---
name: figma-console-figjam
description: "Creates and manages FigJam boards using the figjam_* tools from the Figma Console MCP. Use when the user wants to create a FigJam board, add stickies, create diagrams, map user flows, build architecture diagrams, or organize ideas in FigJam. Triggers: 'create FigJam board', 'add stickies', 'create diagram in FigJam', 'map user flow', 'architecture diagram', 'brainstorm board', 'create flowchart', 'create FigJam', 'build diagram', 'create mind map', 'user journey map'. Requires Figma Console MCP server connection and a FigJam file (editorType === figjam)."
disable-model-invocation: false
---

# figma-console-figjam

Creates and manages FigJam boards using the `figjam_*` tools from the Figma Console MCP. Use when the user wants to create a FigJam board, add stickies, create diagrams, map user flows, build architecture diagrams, or organize ideas in FigJam.

**Triggers**: 'create FigJam board', 'add stickies', 'create diagram in FigJam', 'map user flow', 'architecture diagram', 'brainstorm board', 'create flowchart', 'create FigJam', 'build diagram', 'create mind map', 'user journey map'.

**Requires**: Figma Console MCP (`figma-console-mcp`) connection AND a FigJam file.

## MCP Requirements

This skill uses **Figma Console MCP** exclusively:
- `figjam_create_sticky` — Create a single sticky note
- `figjam_create_stickies` — Batch create multiple sticky notes
- `figjam_create_connector` — Create connector/arrow between nodes
- `figjam_create_shape` — Create shape with optional text
- `figjam_create_table` — Create a data table
- `figjam_create_code_block` — Create a code block
- `figjam_create_section` — Create a section/container (verify availability in your Console MCP version)
- `figjam_auto_arrange` — Auto-arrange board elements
- `figjam_get_board_contents` — Get all board elements
- `figjam_get_connections` — Get connector relationships

## Prerequisites

**IMPORTANT**: FigJam tools only work with FigJam files (`editorType === 'figjam'`).

Before using any `figjam_*` tools:
1. Verify the target file is a FigJam file
2. If not, create one first: use `figma-create-new-file` skill with `editorType='figjam'`

## Board Type Templates

### Template 1: Brainstorm Board
Best for: Idea generation, retrospectives, team workshops

```
Step 1: Create sections for categories
  figjam_create_section("Ideas", x=0, y=0, width=600, height=800)
  figjam_create_section("In Progress", x=650, y=0, width=600, height=800)
  figjam_create_section("Done", x=1300, y=0, width=600, height=800)

Step 2: Batch create stickies
  figjam_create_stickies([
    { content: "Idea 1", color: "yellow", x: 50, y: 100 },
    { content: "Idea 2", color: "yellow", x: 200, y: 100 },
    { content: "Idea 3", color: "pink", x: 50, y: 250 },
    ...
  ])

Step 3: Auto-arrange
  figjam_auto_arrange()
```

**Sticky Colors**: yellow, pink, green, blue, purple, orange, red, gray

### Template 2: User Flow Diagram
Best for: User journeys, process flows, decision trees

```
Step 1: Create start node
  figjam_create_shape("ROUNDED_RECTANGLE", "Start", x=100, y=300, width=120, height=60)
  → get startNodeId

Step 2: Create process steps
  figjam_create_shape("RECTANGLE", "User opens app", x=300, y=300, width=160, height=60)
  → get step1Id
  
  figjam_create_shape("DIAMOND", "Logged in?", x=540, y=300, width=120, height=80)
  → get decisionId

Step 3: Create end states
  figjam_create_shape("ROUNDED_RECTANGLE", "Dashboard", x=740, y=250, width=120, height=60)
  → get successId
  
  figjam_create_shape("ROUNDED_RECTANGLE", "Login Screen", x=740, y=380, width=120, height=60)
  → get loginId

Step 4: Connect nodes
  figjam_create_connector(startNodeId, step1Id, "")
  figjam_create_connector(step1Id, decisionId, "")
  figjam_create_connector(decisionId, successId, "Yes")
  figjam_create_connector(decisionId, loginId, "No")

Step 5: Auto-arrange
  figjam_auto_arrange(algorithm="horizontal")
```

**Shape Types**: RECTANGLE, ROUNDED_RECTANGLE, ELLIPSE, DIAMOND, TRIANGLE, PARALLELOGRAM, HEXAGON, STAR

### Template 3: Architecture Diagram
Best for: System architecture, component relationships, data flow

```
Step 1: Create sections for layers
  figjam_create_section("Frontend", x=0, y=0, width=800, height=300)
  figjam_create_section("Backend", x=0, y=350, width=800, height=300)
  figjam_create_section("Database", x=0, y=700, width=800, height=200)

Step 2: Create service nodes
  figjam_create_shape("ROUNDED_RECTANGLE", "React App", x=50, y=50, width=150, height=80)
  → get reactId
  
  figjam_create_shape("ROUNDED_RECTANGLE", "Next.js Server", x=250, y=50, width=150, height=80)
  → get nextId

Step 3: Add code blocks for technical details
  figjam_create_code_block(
    "const api = axios.create({ baseURL: '/api' })",
    language="javascript",
    x=50, y=200
  )

Step 4: Create data flow connectors
  figjam_create_connector(reactId, nextId, "HTTP Request")
  figjam_create_connector(nextId, apiId, "REST API")
  figjam_create_connector(apiId, dbId, "SQL Query")

Step 5: Auto-arrange
  figjam_auto_arrange(algorithm="vertical")
```

### Template 4: Retrospective Board
Best for: Sprint retrospectives, team feedback, action items

```
Step 1: Create columns
  figjam_create_section("What went well 🎉", x=0, y=0, width=400, height=800)
  figjam_create_section("What could improve 🔧", x=450, y=0, width=400, height=800)
  figjam_create_section("Action items ✅", x=900, y=0, width=400, height=800)

Step 2: Add initial stickies
  figjam_create_stickies([
    { content: "Add your wins here", color: "green", x: 50, y: 100 },
    { content: "Add improvements here", color: "yellow", x: 500, y: 100 },
    { content: "Add action items here", color: "blue", x: 950, y: 100 }
  ])
```

### Template 5: Data Table
Best for: Comparison tables, feature matrices, decision matrices

```
figjam_create_table(
  rows=5,
  columns=4,
  data=[
    ["Feature", "Option A", "Option B", "Option C"],
    ["Performance", "⭐⭐⭐", "⭐⭐", "⭐⭐⭐⭐"],
    ["Cost", "$$$", "$$", "$$$$"],
    ["Ease of use", "Medium", "Easy", "Hard"],
    ["Support", "Community", "Enterprise", "Community"]
  ],
  x=100,
  y=100
)
```

## Workflow

### Step 1: Determine Board Type
Based on the user's request, select the appropriate template:
- Brainstorm/ideas/retrospective → Template 1 (Brainstorm)
- User flow/process/journey → Template 2 (User Flow)
- Architecture/system design/components → Template 3 (Architecture)
- Sprint retro/team feedback → Template 4 (Retrospective)
- Comparison/matrix/table → Template 5 (Data Table)

### Step 2: Get File Key
Ensure you have the FigJam file key. If no file exists:
```
→ Use figma-create-new-file skill with editorType='figjam'
→ Get the fileKey from the response
```

### Step 3: Create Board Structure
Create sections first to organize the board:
```
figjam_create_section(name, x, y, width, height)
```

### Step 4: Add Content
Use the appropriate tools based on content type:

| Content Type | Tool |
|-------------|------|
| Ideas/notes | `figjam_create_stickies` (batch) |
| Single note | `figjam_create_sticky` |
| Process step | `figjam_create_shape("RECTANGLE", ...)` |
| Decision point | `figjam_create_shape("DIAMOND", ...)` |
| Start/end | `figjam_create_shape("ROUNDED_RECTANGLE", ...)` |
| Code snippet | `figjam_create_code_block` |
| Data table | `figjam_create_table` |

### Step 5: Add Connections
Connect related elements with arrows:
```
figjam_create_connector(fromNodeId, toNodeId, label?)
```

### Step 6: Organize Layout
Auto-arrange the board for clean layout:
```
figjam_auto_arrange(layout?)
```

> **Note**: The parameter name may be `layout` or `algorithm` depending on your Console MCP version. Try `layout` first; if it fails, try `algorithm`.

Available layout values:
- `"horizontal"` — Left-to-right flow (good for user flows)
- `"vertical"` — Top-to-bottom flow (good for architecture)
- `"grid"` — Grid layout (good for brainstorming)
- `"radial"` — Radial/hub-and-spoke (good for mind maps)

### Step 7: Verify Board
Check the final board contents:
```
figjam_get_board_contents()   → list all elements
figjam_get_connections()      → verify connector relationships
```

## Sticky Note Colors

| Color | Hex | Best For |
|-------|-----|----------|
| yellow | #FFF3B0 | General ideas, neutral |
| pink | #FFB3C6 | Problems, blockers |
| green | #B3FFB3 | Wins, positives |
| blue | #B3D9FF | Information, data |
| purple | #D9B3FF | Insights, observations |
| orange | #FFD9B3 | Warnings, cautions |
| red | #FFB3B3 | Critical issues |
| gray | #E0E0E0 | Notes, context |

## Connector Styles

Connectors can have:
- `label` — Text label on the connector
- Direction is determined by `startNodeId` → `endNodeId`
- Arrows are added automatically

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| "Not a FigJam file" | Using design file | Create a FigJam file with `figma-create-new-file figjam` |
| "Node not found" | Wrong nodeId | Use `figjam_get_board_contents()` to list all node IDs |
| "Cannot connect nodes" | Nodes not on same page | Ensure all nodes are on the same FigJam page |
| "Section creation failed" | Coordinates overlap | Use non-overlapping x/y coordinates for sections |

## Completion Checklist

- [ ] FigJam file confirmed (not a design file)
- [ ] Board type selected based on user's goal
- [ ] Sections created to organize content
- [ ] Content added (stickies, shapes, tables, code blocks)
- [ ] Connectors added for flow diagrams
- [ ] `figjam_auto_arrange` called for clean layout
- [ ] `figjam_get_board_contents` called to verify all elements
- [ ] File URL shared with user