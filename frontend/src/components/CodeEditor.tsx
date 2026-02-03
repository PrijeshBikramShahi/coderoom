import React, { useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { Operation } from '../../../shared/ws.types';
import { v4 as uuidv4 } from 'uuid';

interface CodeEditorProps {
  onOperation: (op: Operation) => void;
  onCursorMove: (position: number) => void;
  userId: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  onOperation,
  onCursorMove,
  userId
}) => {
  const { content, docId, serverVersion } = useEditorStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorThrottleRef = useRef<NodeJS.Timeout>();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const oldContent = content;

    // Calculate diff
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;

    if (newContent.length > oldContent.length) {
      // Insert operation
      const insertedText = newContent.slice(
        cursorPos - (newContent.length - oldContent.length),
        cursorPos
      );

      const op: Operation = {
        opId: uuidv4(),
        docId: docId!,
        userId,
        baseVersion: serverVersion,
        type: 'insert',
        position: cursorPos - insertedText.length,
        text: insertedText
      };

      onOperation(op);
    } else if (newContent.length < oldContent.length) {
      // Delete operation
      const deletedLength = oldContent.length - newContent.length;

      const op: Operation = {
        opId: uuidv4(),
        docId: docId!,
        userId,
        baseVersion: serverVersion,
        type: 'delete',
        position: cursorPos,
        length: deletedLength
      };

      onOperation(op);
    }
  }, [content, docId, serverVersion, userId, onOperation]);

  const handleCursorMove = useCallback(() => {
    if (!textareaRef.current) return;

    const position = textareaRef.current.selectionStart;

    // Throttle cursor updates
    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }

    cursorThrottleRef.current = setTimeout(() => {
      onCursorMove(position);
    }, 150);
  }, [onCursorMove]);

  return (
    <div className="relative h-full">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onSelect={handleCursorMove}
        onKeyUp={handleCursorMove}
        onClick={handleCursorMove}
        className="w-full h-full p-4 font-mono text-sm bg-gray-50 border-none outline-none resize-none"
        placeholder="Start typing..."
        spellCheck={false}
      />
    </div>
  );
};
