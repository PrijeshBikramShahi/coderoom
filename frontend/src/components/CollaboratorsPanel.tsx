import React from 'react';
import { useEditorStore } from '../store/editorStore';

export const CollaboratorsPanel: React.FC = () => {
  const { collaborators, cursors } = useEditorStore();

  return (
    <div className="h-full border-l border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold mb-4">Active Collaborators</h2>
      
      <div className="space-y-2">
        {collaborators.length === 0 ? (
          <p className="text-sm text-gray-500">No other collaborators yet</p>
        ) : (
          collaborators.map((userId) => {
            const cursor = cursors[userId];
            return (
              <div 
                key={userId}
                className="flex items-center gap-2 p-2 rounded bg-gray-50"
              >
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{userId}</p>
                  {cursor && (
                    <p className="text-xs text-gray-500">
                      Position: {cursor.position}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold mb-2">Cursor Legend</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <p>• Blue: Other users</p>
          <p>• Your cursor is not shown</p>
        </div>
      </div>
    </div>
  );
};
