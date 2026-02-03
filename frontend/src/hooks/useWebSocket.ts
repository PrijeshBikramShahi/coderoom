import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { WSMessage, Operation } from '../../shared/ws.types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
const MAX_RECONNECT_DELAY = 5000;
const INITIAL_RECONNECT_DELAY = 1000;

export function useWebSocket(token: string | null, docId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const shouldReconnectRef = useRef(true);

  const {
    setConnectionStatus,
    syncState,
    setServerVersion,
    removePendingOp,
    setContent,
    updateCursor,
    addCollaborator,
    removeCollaborator,
  } = useEditorStore();

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('reconnecting');
    
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

      // Join document if we have one
      if (docId) {
        ws.send(JSON.stringify({
          type: 'JOIN_DOCUMENT',
          docId
        } as WSMessage));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setConnectionStatus('disconnected');
      wsRef.current = null;

      // Reconnect with exponential backoff
      if (shouldReconnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelayRef.current);

        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          MAX_RECONNECT_DELAY
        );
      }
    };
  }, [token, docId, setConnectionStatus]);

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'SYNC_STATE':
        syncState(message.content, message.version, message.cursors);
        break;

      case 'ACK_OP':
        setServerVersion(message.newVersion);
        removePendingOp(message.opId);
        break;

      case 'BROADCAST_OP':
        applyRemoteOp(message.op);
        break;

      case 'CURSOR_UPDATE':
        // This would include userId in a full implementation
        break;

      case 'USER_JOINED':
        addCollaborator(message.userId);
        break;

      case 'USER_LEFT':
        removeCollaborator(message.userId);
        break;

      case 'ERROR':
        console.error('Server error:', message.message);
        break;
    }
  }, [syncState, setServerVersion, removePendingOp, addCollaborator, removeCollaborator]);

  const applyRemoteOp = useCallback((op: Operation) => {
    const state = useEditorStore.getState();
    let content = state.content;

    if (op.type === 'insert' && op.text) {
      const before = content.slice(0, op.position);
      const after = content.slice(op.position);
      content = before + op.text + after;
    } else if (op.type === 'delete' && op.length) {
      const before = content.slice(0, op.position);
      const after = content.slice(op.position + op.length);
      content = before + after;
    }

    setContent(content);
  }, [setContent]);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, connect]);

  // Rejoin document when docId changes
  useEffect(() => {
    if (docId && wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'JOIN_DOCUMENT',
        docId
      });
    }
  }, [docId, sendMessage]);

  return { sendMessage, isConnected: wsRef.current?.readyState === WebSocket.OPEN };
}
