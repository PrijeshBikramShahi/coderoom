import { Operation } from '../../../shared/ws.types';

/**
 * Simplified Operational Transform (OT) implementation
 * Transforms operations to handle concurrent edits
 */

export class OTEngine {
  /**
   * Transform an operation against another operation
   * Returns the transformed operation that can be applied after otherOp
   */
  static transform(op: Operation, otherOp: Operation): Operation {
    // If operations are on different positions or types, analyze interaction
    const transformed = { ...op };

    if (otherOp.type === 'insert') {
      // Case A: Concurrent insert before our operation
      if (otherOp.position <= op.position) {
        const insertedLength = otherOp.text?.length || 0;
        transformed.position += insertedLength;
      }
    } else if (otherOp.type === 'delete') {
      // Case B: Concurrent delete before our operation
      const deleteStart = otherOp.position;
      const deleteEnd = otherOp.position + (otherOp.length || 0);

      if (deleteEnd <= op.position) {
        // Delete entirely before our operation
        transformed.position -= otherOp.length || 0;
      } else if (deleteStart < op.position && deleteEnd > op.position) {
        // Delete overlaps with our position
        transformed.position = deleteStart;
      }

      // Case C: If our operation is a delete and there's overlap
      if (op.type === 'delete') {
        const ourDeleteEnd = op.position + (op.length || 0);
        
        if (deleteStart <= op.position && deleteEnd >= ourDeleteEnd) {
          // Our delete is completely contained in the other delete
          transformed.length = 0;
        } else if (deleteStart < ourDeleteEnd && deleteEnd > op.position) {
          // Partial overlap
          const overlapStart = Math.max(deleteStart, op.position);
          const overlapEnd = Math.min(deleteEnd, ourDeleteEnd);
          const overlapLength = overlapEnd - overlapStart;
          transformed.length = (transformed.length || 0) - overlapLength;
          
          if (deleteStart <= op.position) {
            transformed.position = deleteStart;
          }
        }
      }
    }

    return transformed;
  }

  /**
   * Apply an operation to a document content string
   */
  static apply(content: string, op: Operation): string {
    if (op.type === 'insert') {
      const before = content.slice(0, op.position);
      const after = content.slice(op.position);
      return before + (op.text || '') + after;
    } else if (op.type === 'delete') {
      const before = content.slice(0, op.position);
      const after = content.slice(op.position + (op.length || 0));
      return before + after;
    }
    return content;
  }

  /**
   * Validate that an operation is valid for the given content
   */
  static validate(content: string, op: Operation): boolean {
    if (op.position < 0 || op.position > content.length) {
      return false;
    }

    if (op.type === 'insert') {
      return !!op.text && op.text.length > 0;
    } else if (op.type === 'delete') {
      const length = op.length || 0;
      return length > 0 && op.position + length <= content.length;
    }

    return false;
  }
}
