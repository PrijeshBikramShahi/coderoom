import mongoose, { Schema } from 'mongoose';
import { Document as DocType } from '../shared/ws.types';

const documentSchema = new Schema<DocType>({
  content: { type: String, required: true, default: '' },
  version: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, required: true, default: Date.now }
});

documentSchema.index({ updatedAt: 1 });

export const DocumentModel = mongoose.model<DocType>('Document', documentSchema);
