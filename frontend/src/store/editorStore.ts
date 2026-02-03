import { create } from 'zustand';
import { 
  ConnectionStatus, 
  Operation, 
  Cursor, 
  WSMessage 
} from '../../../backend/src/shared/ws.types';

interface EditorState {
  docId: string | null;
  content: string;
  localVersion: number;
  serverVersion: number;
  pendingOps: Operation[];
  cursors: Record<string, Cursor>;
  collaborators: string[];
  connectionStatus: ConnectionStatus;
  
  // Actions
  setDocId: (docId: string) => void;
  setContent: (content: string) => void;
  setServerVersion: (version: number) => void;
  addPendingOp: (op: Operation) => void;
  removePendingOp: (opId: string) => void;
  clearPendingOps: () => void;
  updateCursors: (cursors: Record<string, Cursor>) => void;
  updateCursor: (userId: string, position: number) => void;
  setCollaborators: (users: string[]) => void;
  addCollaborator: (userId: string) => void;
  removeCollaborator: (userId: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  syncState: (content: string, version: number, cursors: Record<string, Cursor>) => void;
  reset: () => void;
}

const initialState = {
  docId: null,
  content: '',
  localVersion: 0,
  serverVersion: 0,
  pendingOps: [],
  cursors: {},
  collaborators: [],
  connectionStatus: 'disconnected' as ConnectionStatus,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,

  setDocId: (docId) => set({ docId }),
  
  setContent: (content) => set((state) => ({ 
    content,
    localVersion: state.localVersion + 1
  })),
  
  setServerVersion: (serverVersion) => set({ serverVersion }),
  
  addPendingOp: (op) => set((state) => ({
    pendingOps: [...state.pendingOps, op]
  })),
  
  removePendingOp: (opId) => set((state) => ({
    pendingOps: state.pendingOps.filter(op => op.opId !== opId)
  })),
  
  clearPendingOps: () => set({ pendingOps: [] }),
  
  updateCursors: (cursors) => set({ cursors }),
  
  updateCursor: (userId, position) => set((state) => ({
    cursors: {
      ...state.cursors,
      [userId]: { userId, position }
    }
  })),
  
  setCollaborators: (collaborators) => set({ collaborators }),
  
  addCollaborator: (userId) => set((state) => ({
    collaborators: [...state.collaborators, userId]
  })),
  
  removeCollaborator: (userId) => set((state) => ({
    collaborators: state.collaborators.filter(id => id !== userId)
  })),
  
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  
  syncState: (content, version, cursors) => set({
    content,
    serverVersion: version,
    localVersion: version,
    cursors,
    pendingOps: []
  }),
  
  reset: () => set(initialState),
}));
