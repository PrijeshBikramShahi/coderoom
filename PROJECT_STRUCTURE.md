# Project Structure

```
collab-editor/
├── README.md                    # Comprehensive documentation
├── QUICKSTART.md               # Quick start guide
├── docker-compose.yml          # Docker orchestration
├── Dockerfile                  # Backend container build
├── setup.sh                    # Automated setup script
├── .gitignore                  # Git ignore rules
├── .dockerignore              # Docker ignore rules
│
├── shared/                     # Shared TypeScript types
│   └── ws.types.ts            # WebSocket message & operation types
│
├── backend/                    # Node.js + Express backend
│   ├── package.json           # Dependencies and scripts
│   ├── tsconfig.json          # TypeScript configuration
│   ├── .env.example           # Environment variables template
│   │
│   └── src/
│       ├── server.ts          # Main server entry point
│       │
│       ├── models/
│       │   └── document.ts    # MongoDB document schema
│       │
│       ├── ot/
│       │   ├── engine.ts      # Operational Transform implementation
│       │   └── engine.test.ts # OT test suite
│       │
│       ├── services/
│       │   ├── documentManager.ts    # Document state & operations
│       │   ├── presenceManager.ts    # Redis presence tracking
│       │   └── connectionManager.ts  # WebSocket connection handling
│       │
│       └── routes/
│           └── api.ts         # REST API endpoints
│
└── frontend/                   # Next.js + React frontend
    ├── package.json           # Dependencies and scripts
    ├── tsconfig.json          # TypeScript configuration
    ├── next.config.js         # Next.js configuration
    ├── tailwind.config.js     # Tailwind CSS configuration
    ├── postcss.config.js      # PostCSS configuration
    ├── .env.local             # Environment variables
    │
    └── src/
        ├── pages/
        │   ├── _app.tsx       # Next.js app wrapper
        │   ├── index.tsx      # Home page (create document)
        │   └── editor/
        │       └── [docId].tsx # Editor page (dynamic route)
        │
        ├── components/
        │   ├── CodeEditor.tsx        # Main code editor component
        │   ├── CollaboratorsPanel.tsx # Collaborators sidebar
        │   └── TopBar.tsx            # Top navigation bar
        │
        ├── hooks/
        │   └── useWebSocket.ts       # WebSocket client hook
        │
        ├── store/
        │   └── editorStore.ts        # Zustand state management
        │
        └── styles/
            └── globals.css           # Global styles
```

## Key Files Explained

### Backend

**server.ts** (250 lines)
- HTTP server setup with Express
- WebSocket server configuration
- MongoDB and Redis connections
- Authentication middleware
- Graceful shutdown handling

**ot/engine.ts** (90 lines)
- Core OT algorithm implementation
- Transform, apply, and validate operations
- Handles concurrent edits deterministically

**services/documentManager.ts** (140 lines)
- Document state management
- Operation application and transformation
- Periodic persistence (2s or 20 ops)
- Version tracking

**services/presenceManager.ts** (80 lines)
- Redis-based presence tracking
- Cursor position management
- User join/leave events
- TTL-based cleanup

**services/connectionManager.ts** (170 lines)
- WebSocket connection lifecycle
- Message routing and handling
- Broadcasting to document rooms
- Authentication enforcement

**routes/api.ts** (50 lines)
- REST endpoints for:
  - User authentication (JWT)
  - Document creation
  - Document retrieval

### Frontend

**pages/editor/[docId].tsx** (120 lines)
- Main editor page
- WebSocket connection setup
- Operation handling (optimistic + server)
- Cursor tracking
- Loading states

**components/CodeEditor.tsx** (90 lines)
- Controlled textarea component
- Diff calculation on change
- Operation generation (insert/delete)
- Cursor position tracking (throttled)

**components/CollaboratorsPanel.tsx** (50 lines)
- Active users list
- Cursor positions display
- Real-time presence updates

**components/TopBar.tsx** (60 lines)
- Connection status indicator
- Document sharing (copy URL)
- Visual connection state

**hooks/useWebSocket.ts** (140 lines)
- WebSocket client lifecycle
- Auto-reconnection with exponential backoff
- Message handling
- State synchronization

**store/editorStore.ts** (120 lines)
- Zustand store definition
- Editor state (content, version, ops)
- Collaborators and cursors
- Connection status
- State actions

### Shared

**shared/ws.types.ts** (60 lines)
- TypeScript interfaces for:
  - Operations (insert/delete)
  - WebSocket messages
  - Documents and cursors
  - Connection status
- Type-safe protocol definition

## File Sizes (Approximate)

- **Total Lines of Code**: ~2,000
- **Backend**: ~900 lines
- **Frontend**: ~850 lines
- **Tests**: ~250 lines
- **Config**: ~200 lines

## Configuration Files

- **docker-compose.yml**: 3-service stack (app, mongo, redis)
- **Dockerfile**: Multi-stage build for backend
- **tsconfig.json**: Strict TypeScript settings
- **tailwind.config.js**: Tailwind theme configuration
- **.env files**: Environment-specific variables

## Key Technologies by File

| File | Technologies |
|------|-------------|
| server.ts | Express, ws, mongoose, ioredis, JWT |
| engine.ts | Pure TypeScript (no dependencies) |
| editorStore.ts | Zustand |
| useWebSocket.ts | WebSocket API, React Hooks |
| CodeEditor.tsx | React, Controlled Components |
| docker-compose.yml | Docker Compose v3.8 |

## Testing Coverage

- OT engine: Full unit test suite
- Manual testing: Concurrent edit scenarios
- Integration: WebSocket lifecycle tests

## Build Artifacts

After build:
- **Backend**: `backend/dist/` (compiled JavaScript)
- **Frontend**: `frontend/.next/` (Next.js production build)
- **Docker**: Multi-stage optimized images

## Environment Variables

**Backend (.env)**
```
PORT=3001
MONGODB_URI=mongodb://mongo:27017/collab-editor
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key
NODE_ENV=development
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```
