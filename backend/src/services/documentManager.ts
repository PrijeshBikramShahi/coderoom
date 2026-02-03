import { DocumentModel } from '../models/document';
import { Operation } from '../shared/ws.types';
import { OTEngine } from '../ot/engine';

interface DocumentState {
  content: string;
  version: number;
  pendingOps: Operation[];
  lastSaveTime: number;
  opsSinceLastSave: number;
}

export class DocumentManager {
  private documents: Map<string, DocumentState> = new Map();
  private readonly SAVE_INTERVAL = 2000; // 2 seconds
  private readonly SAVE_OP_THRESHOLD = 20; // 20 operations

  async loadDocument(docId: string): Promise<DocumentState> {
    let state = this.documents.get(docId);
    
    if (!state) {
      const doc = await DocumentModel.findById(docId);
      
      if (!doc) {
        throw new Error('Document not found');
      }

      state = {
        content: doc.content,
        version: doc.version,
        pendingOps: [],
        lastSaveTime: Date.now(),
        opsSinceLastSave: 0
      };

      this.documents.set(docId, state);
    }

    return state;
  }

  async applyOperation(docId: string, op: Operation): Promise<{ newVersion: number; transformedOp: Operation }> {
    const state = await this.loadDocument(docId);

    // Validate operation
    if (!OTEngine.validate(state.content, op)) {
      throw new Error('Invalid operation');
    }

    // Transform operation if baseVersion is behind
    let transformedOp = op;
    if (op.baseVersion < state.version) {
      // Transform against all operations since baseVersion
      const opsToTransform = state.pendingOps.filter(
        pendingOp => pendingOp.baseVersion >= op.baseVersion
      );

      for (const pendingOp of opsToTransform) {
        transformedOp = OTEngine.transform(transformedOp, pendingOp);
      }
    }

    // Apply the operation
    state.content = OTEngine.apply(state.content, transformedOp);
    state.version += 1;
    state.pendingOps.push(transformedOp);
    state.opsSinceLastSave += 1;

    // Check if we need to persist
    const timeSinceLastSave = Date.now() - state.lastSaveTime;
    if (
      timeSinceLastSave >= this.SAVE_INTERVAL ||
      state.opsSinceLastSave >= this.SAVE_OP_THRESHOLD
    ) {
      await this.persistDocument(docId);
    }

    return {
      newVersion: state.version,
      transformedOp
    };
  }

  async persistDocument(docId: string): Promise<void> {
    const state = this.documents.get(docId);
    if (!state) return;

    await DocumentModel.findByIdAndUpdate(
      docId,
      {
        content: state.content,
        version: state.version,
        updatedAt: new Date()
      },
      { upsert: false }
    );

    state.lastSaveTime = Date.now();
    state.opsSinceLastSave = 0;
    state.pendingOps = state.pendingOps.slice(-10); // Keep last 10 ops for conflict resolution
  }

  getDocumentState(docId: string): DocumentState | undefined {
    return this.documents.get(docId);
  }

  async createDocument(): Promise<string> {
    const doc = await DocumentModel.create({
      content: '# New Document\n\nStart typing here...', // Provide default content instead of empty string
      version: 0,
      updatedAt: new Date()
    });

    return doc._id.toString();
  }

  async getDocument(docId: string): Promise<{ content: string; version: number }> {
    const state = await this.loadDocument(docId);
    return {
      content: state.content,
      version: state.version
    };
  }
}
