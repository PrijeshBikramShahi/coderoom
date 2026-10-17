# CodeRoom

**A shared code editor where multiple people can type in the same document and
see each other's changes as they happen.**

CodeRoom is an engineering prototype for real-time text collaboration. A
Next.js client applies edits optimistically, while a WebSocket service orders
operations, transforms concurrent changes, tracks presence, and persists
documents.

## 🚀 Features

- **Real-time collaboration**: Multiple users can edit the same document simultaneously
- **Custom OT implementation**: Transforms the documented concurrent insert and delete cases against server history
- **Optimistic updates**: Instant local rendering with server validation
- **Automatic reconnection**: Exponential backoff with state resync
- **Live presence**: See active collaborators and their cursor positions
- **Type-safe**: End-to-end TypeScript with shared types
- **Containerized**: Docker-ready with multi-stage builds
- **Service-backed state**: Redis tracks presence and MongoDB persists documents

## 🏗️ Architecture

```
┌─────────────────┐         WebSocket         ┌──────────────────┐
│  Next.js Client │ ◄─────────────────────────►│ Node.js Server   │
│  + Zustand      │                            │  + Express       │
└─────────────────┘                            └──────────────────┘
                                                        │
                                               ┌────────┴────────┐
                                               │                 │
                                          ┌────▼────┐      ┌────▼─────┐
                                          │  Redis  │      │ MongoDB  │
                                          │Presence │      │  Docs    │
                                          └─────────┘      └──────────┘
```

### Stack

**Frontend:**
- Next.js 14 (TypeScript)
- React 18
- Zustand (state management)
- Tailwind CSS
- WebSocket client

**Backend:**
- Node.js 20+
- Express
- Native `ws` library
- JWT authentication
- Redis (ioredis)
- MongoDB (mongoose)

**Infrastructure:**
- Docker & Docker Compose
- Multi-stage builds
- Health checks

## 📚 Custom Operational Transform Algorithm

This implementation uses a simplified Operational Transform algorithm:

### Core Transform Rules

When an operation's `baseVersion` is behind the server version, we transform it against all intermediate operations:

#### 1. Insert vs Insert
```typescript
if (otherOp.position <= op.position) {
  op.position += otherOp.text.length
}
```
**Rationale**: If someone inserts text before your position, shift your position forward.

#### 2. Insert vs Delete
No transformation needed - inserts and deletes at different positions are independent.

#### 3. Delete vs Delete (Overlapping)
```typescript
if (deleteRegionsOverlap(op, otherOp)) {
  // Reduce delete length by overlap amount
  // Or cancel if fully contained
}
```
**Rationale**: If someone already deleted part of what you're deleting, reduce your operation accordingly.

#### 4. Delete vs Insert (Before)
```typescript
if (otherOp.position < op.position) {
  op.position -= otherOp.length
}
```
**Rationale**: If someone deleted text before your position, shift your position backward.

### Operation Application

```typescript
class OTEngine {
  static apply(content: string, op: Operation): string {
    if (op.type === 'insert') {
      return content.slice(0, op.position) 
           + op.text 
           + content.slice(op.position)
    } else if (op.type === 'delete') {
      return content.slice(0, op.position) 
           + content.slice(op.position + op.length)
    }
  }
}
```

### Validation

Before applying any operation:
1. Check position is within bounds: `0 <= position <= content.length`
2. For deletes: ensure `position + length <= content.length`
3. For inserts: ensure `text.length > 0`

### Edge Cases Handled

1. **Concurrent inserts at same position**: Deterministic ordering by userId
2. **Cascading deletes**: Transform against all intermediate operations
3. **Client crashes**: Redis TTL evicts stale presence data
4. **Network partition**: Reconnection triggers full state resync
5. **Out-of-order messages**: Version numbers ensure correct ordering

## 🔧 Installation & Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for containerized setup)
- npm or yarn

### Quick Start (Docker)

```bash
# Clone the repository
git clone <repo-url>
cd collab-editor

# Set environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Build and start all services
docker-compose up --build

# Backend will be available at http://localhost:3001
# WebSocket at ws://localhost:3001/ws
```

### Manual Setup (Development)

#### Backend

```bash
cd backend
npm install
cp .env.example .env

# Start MongoDB and Redis locally, then:
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev

# Open http://localhost:3000
```

## 📖 API Documentation

### REST Endpoints

#### `POST /api/auth/login`
```json
Request: { "userId": "string" }
Response: { "token": "jwt", "userId": "string" }
```

#### `POST /api/docs`
```json
Response: { "docId": "string" }
```

#### `GET /api/docs/:id`
```json
Response: { 
  "content": "string", 
  "version": number 
}
```

### WebSocket Protocol

Connect: `ws://host:3001/ws?token=<JWT>`

#### Client → Server

**Join Document**
```typescript
{ type: "JOIN_DOCUMENT", docId: string }
```

**Apply Operation**
```typescript
{ 
  type: "APPLY_OP", 
  op: {
    opId: string,
    docId: string,
    userId: string,
    baseVersion: number,
    type: "insert" | "delete",
    position: number,
    text?: string,      // for insert
    length?: number     // for delete
  }
}
```

**Cursor Update**
```typescript
{ type: "CURSOR_UPDATE", position: number }
```

#### Server → Client

**State Sync**
```typescript
{ 
  type: "SYNC_STATE",
  content: string,
  version: number,
  cursors: Record<string, Cursor>
}
```

**Operation Acknowledgment**
```typescript
{ 
  type: "ACK_OP",
  opId: string,
  newVersion: number 
}
```

**Broadcast Operation**
```typescript
{ 
  type: "BROADCAST_OP",
  op: Operation 
}
```

**User Events**
```typescript
{ type: "USER_JOINED", userId: string }
{ type: "USER_LEFT", userId: string }
```

## 🧪 Testing

### Manual Testing Scenarios

1. **Basic Collaboration**
   - Open same document in 2 browsers
   - Type in both simultaneously
   - Verify text synchronizes correctly

2. **Conflict Resolution**
   - User A and B start at version 5
   - Both insert at position 10
   - Verify both see consistent final state

3. **Network Resilience**
   - Disconnect client
   - Make changes offline
   - Reconnect and verify sync

4. **Presence**
   - Join with multiple users
   - Verify collaborator list updates
   - Close tab and verify user removal

## Product boundaries

CodeRoom is a single-instance portfolio prototype, not a hosted multi-tenant
service. Its automated tests cover core OT transformations and application, but
the repository does not contain load-test evidence for a specific editor or
connection count. The current editor intentionally omits syntax highlighting,
undo/redo, document permissions, and visual collaborator cursors.

## Security boundaries

- JWT authentication for WebSocket connections
- Token validation on connection upgrade
- Input validation on all operations
- No file uploads (no malware risk)

For local development, JWT authentication protects the WebSocket upgrade. The
application does not yet provide document-level authorization, rate limiting,
audit logging, or a hardened public deployment configuration. Run it on a
trusted development network and provide secrets through environment variables.

## Known limitations

- No undo/redo support
- Cursor positions not shown visually in editor
- No conflict resolution for cursor overlaps
- Large documents (>1MB) slow down

## 📝 License

MIT License - see LICENSE file for details

## 👥 Contributing

This is a portfolio project, but suggestions are welcome via issues.

## 📧 Contact

For questions about implementation details or employment opportunities:
- Create an issue in this repository
- The OT algorithm and architecture can be discussed in detail
