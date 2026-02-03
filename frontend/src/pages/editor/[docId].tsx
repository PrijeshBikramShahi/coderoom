import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useEditorStore } from '../../store/editorStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { CodeEditor } from '../../components/CodeEditor';
import { CollaboratorsPanel } from '../../components/CollaboratorsPanel';
import { TopBar } from '../../components/TopBar';
import { Operation, WSMessage } from '../../../../backend/src/shared/ws.types';

export default function EditorPage() {
  const router = useRouter();
  const { docId } = router.query;
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');

  const { setDocId, addPendingOp, setContent } = useEditorStore();
  const { sendMessage } = useWebSocket(token, docId as string);

  useEffect(() => {
    // Auto-login for demo purposes
    const login = async () => {
      const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
      setUserId(userId);

      try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        const data = await response.json();
        setToken(data.token);
      } catch (error) {
        console.error('Login failed:', error);
      }
    };

    login();
  }, []);

  useEffect(() => {
    if (docId && typeof docId === 'string') {
      setDocId(docId);
    }
  }, [docId, setDocId]);

  const handleOperation = (op: Operation) => {
    // Optimistically update local state
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
    addPendingOp(op);

    // Send to server
    sendMessage({
      type: 'APPLY_OP',
      op
    });
  };

  const handleCursorMove = (position: number) => {
    sendMessage({
      type: 'CURSOR_UPDATE',
      position
    });
  };

  if (!token || !docId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <TopBar docId={docId as string} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <CodeEditor
            onOperation={handleOperation}
            onCursorMove={handleCursorMove}
            userId={userId}
          />
        </div>

        <div className="w-80">
          <CollaboratorsPanel />
        </div>
      </div>
    </div>
  );
}
