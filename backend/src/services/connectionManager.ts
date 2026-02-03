import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { WSMessage, Operation, Cursor } from '../../../shared/ws.types';
import { DocumentManager } from './documentManager';
import { PresenceManager } from './presenceManager';

interface Client {
  ws: WebSocket;
  userId: string;
  docId: string | null;
}

export class ConnectionManager {
  private clients: Map<string, Client> = new Map();
  private documentManager: DocumentManager;
  private presenceManager: PresenceManager;
  private jwtSecret: string;

  constructor(
    documentManager: DocumentManager,
    presenceManager: PresenceManager,
    jwtSecret: string
  ) {
    this.documentManager = documentManager;
    this.presenceManager = presenceManager;
    this.jwtSecret = jwtSecret;
  }

  authenticateConnection(token: string): string {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      return decoded.userId;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  addClient(clientId: string, ws: WebSocket, userId: string): void {
    this.clients.set(clientId, { ws, userId, docId: null });
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client && client.docId) {
      this.presenceManager.removeUser(client.docId, client.userId);
      this.broadcastToDocument(client.docId, {
        type: 'USER_LEFT',
        userId: client.userId
      }, clientId);
    }
    this.clients.delete(clientId);
  }

  async handleMessage(clientId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      switch (message.type) {
        case 'JOIN_DOCUMENT':
          await this.handleJoinDocument(clientId, message.docId);
          break;

        case 'APPLY_OP':
          await this.handleApplyOp(clientId, message.op);
          break;

        case 'CURSOR_UPDATE':
          await this.handleCursorUpdate(clientId, message.position);
          break;
      }
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleJoinDocument(clientId: string, docId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Leave previous document if any
    if (client.docId) {
      await this.presenceManager.removeUser(client.docId, client.userId);
      this.broadcastToDocument(client.docId, {
        type: 'USER_LEFT',
        userId: client.userId
      }, clientId);
    }

    // Join new document
    client.docId = docId;
    await this.presenceManager.addUser(docId, client.userId);

    // Send current state
    const state = await this.documentManager.getDocument(docId);
    const cursors = await this.presenceManager.getCursors(docId);

    this.sendToClient(clientId, {
      type: 'SYNC_STATE',
      content: state.content,
      version: state.version,
      cursors
    });

    // Notify others
    this.broadcastToDocument(docId, {
      type: 'USER_JOINED',
      userId: client.userId
    }, clientId);
  }

  private async handleApplyOp(clientId: string, op: Operation): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.docId) return;

    const result = await this.documentManager.applyOperation(client.docId, op);

    // Acknowledge to sender
    this.sendToClient(clientId, {
      type: 'ACK_OP',
      opId: op.opId,
      newVersion: result.newVersion
    });

    // Broadcast to others
    this.broadcastToDocument(client.docId, {
      type: 'BROADCAST_OP',
      op: result.transformedOp
    }, clientId);
  }

  private async handleCursorUpdate(clientId: string, position: number): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.docId) return;

    await this.presenceManager.updateCursor(client.docId, client.userId, position);

    // Broadcast cursor update to others
    const message: WSMessage = {
      type: 'CURSOR_UPDATE',
      position
    };

    this.broadcastToDocument(client.docId, message, clientId);
  }

  private sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToDocument(docId: string, message: WSMessage, excludeClientId?: string): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.docId === docId && clientId !== excludeClientId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(message));
        }
      }
    }
  }

  getClientCount(docId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.docId === docId) count++;
    }
    return count;
  }
}
