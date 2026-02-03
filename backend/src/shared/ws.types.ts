export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type OperationType = "insert" | "delete";

export interface Operation {
  opId: string;
  docId: string;
  userId: string;
  baseVersion: number;
  type: OperationType;
  position: number;
  text?: string;
  length?: number;
}

export interface Cursor {
  userId: string;
  position: number;
}

export type WSMessage =
  | { type: "JOIN_DOCUMENT"; docId: string }
  | { type: "APPLY_OP"; op: Operation }
  | { type: "ACK_OP"; opId: string; newVersion: number }
  | { type: "BROADCAST_OP"; op: Operation }
  | { type: "CURSOR_UPDATE"; position: number }
  | { type: "USER_JOINED"; userId: string }
  | { type: "USER_LEFT"; userId: string }
  | { type: "SYNC_STATE"; content: string; version: number; cursors: Record<string, Cursor> }
  | { type: "ERROR"; message: string };

export interface Document {
  _id?: string;
  content: string;
  version: number;
  updatedAt: Date;
}

export interface AuthResponse {
  token: string;
  userId: string;
}
