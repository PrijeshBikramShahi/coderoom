import { OTEngine } from './backend/src/ot/engine';
import { Operation } from './backend/src/shared/ws.types';

describe('OTEngine', () => {
  describe('transform', () => {
    it('should handle concurrent inserts at same position', () => {
      const op1: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 5,
        text: 'hello'
      };

      const op2: Operation = {
        opId: '2',
        docId: 'doc1',
        userId: 'user2',
        baseVersion: 0,
        type: 'insert',
        position: 5,
        text: 'world'
      };

      const transformed = OTEngine.transform(op1, op2);
      
      // op1 position should be shifted by op2's insert length
      expect(transformed.position).toBe(10); // 5 + 5 (length of "world")
    });

    it('should handle insert before another insert', () => {
      const op1: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 10,
        text: 'test'
      };

      const op2: Operation = {
        opId: '2',
        docId: 'doc1',
        userId: 'user2',
        baseVersion: 0,
        type: 'insert',
        position: 5,
        text: 'hello'
      };

      const transformed = OTEngine.transform(op1, op2);
      
      // op1 position should be shifted forward
      expect(transformed.position).toBe(15); // 10 + 5
    });

    it('should handle delete before insert', () => {
      const op1: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 10,
        text: 'test'
      };

      const op2: Operation = {
        opId: '2',
        docId: 'doc1',
        userId: 'user2',
        baseVersion: 0,
        type: 'delete',
        position: 3,
        length: 5
      };

      const transformed = OTEngine.transform(op1, op2);
      
      // op1 position should be shifted backward
      expect(transformed.position).toBe(5); // 10 - 5
    });

    it('should handle overlapping deletes', () => {
      const op1: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'delete',
        position: 5,
        length: 10
      };

      const op2: Operation = {
        opId: '2',
        docId: 'doc1',
        userId: 'user2',
        baseVersion: 0,
        type: 'delete',
        position: 8,
        length: 5
      };

      const transformed = OTEngine.transform(op1, op2);
      
      // op1 should have reduced length due to overlap
      expect(transformed.length).toBeLessThan(10);
    });
  });

  describe('apply', () => {
    it('should apply insert operation', () => {
      const content = 'Hello World';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 5,
        text: ' Beautiful'
      };

      const result = OTEngine.apply(content, op);
      expect(result).toBe('Hello Beautiful World');
    });

    it('should apply delete operation', () => {
      const content = 'Hello Beautiful World';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'delete',
        position: 5,
        length: 10
      };

      const result = OTEngine.apply(content, op);
      expect(result).toBe('Hello World');
    });

    it('should apply insert at beginning', () => {
      const content = 'World';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 0,
        text: 'Hello '
      };

      const result = OTEngine.apply(content, op);
      expect(result).toBe('Hello World');
    });

    it('should apply insert at end', () => {
      const content = 'Hello';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 5,
        text: ' World'
      };

      const result = OTEngine.apply(content, op);
      expect(result).toBe('Hello World');
    });
  });

  describe('validate', () => {
    it('should validate correct insert operation', () => {
      const content = 'Hello World';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 5,
        text: ' Beautiful'
      };

      expect(OTEngine.validate(content, op)).toBe(true);
    });

    it('should invalidate insert with negative position', () => {
      const content = 'Hello World';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: -1,
        text: 'test'
      };

      expect(OTEngine.validate(content, op)).toBe(false);
    });

    it('should invalidate insert with position beyond content', () => {
      const content = 'Hello World';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 100,
        text: 'test'
      };

      expect(OTEngine.validate(content, op)).toBe(false);
    });

    it('should validate correct delete operation', () => {
      const content = 'Hello World';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'delete',
        position: 5,
        length: 6
      };

      expect(OTEngine.validate(content, op)).toBe(true);
    });

    it('should invalidate delete beyond content length', () => {
      const content = 'Hello World';
      const op: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'delete',
        position: 5,
        length: 100
      };

      expect(OTEngine.validate(content, op)).toBe(false);
    });
  });

  describe('concurrent operations', () => {
    it('should maintain consistency with two concurrent inserts', () => {
      let content = 'test';
      
      const op1: Operation = {
        opId: '1',
        docId: 'doc1',
        userId: 'user1',
        baseVersion: 0,
        type: 'insert',
        position: 2,
        text: 'A'
      };

      const op2: Operation = {
        opId: '2',
        docId: 'doc1',
        userId: 'user2',
        baseVersion: 0,
        type: 'insert',
        position: 2,
        text: 'B'
      };

      // Apply op1 first
      content = OTEngine.apply(content, op1);
      expect(content).toBe('teAst');

      // Transform and apply op2
      const transformed = OTEngine.transform(op2, op1);
      content = OTEngine.apply(content, transformed);
      
      // Both operations should be applied
      expect(content.length).toBe(6);
      expect(content).toContain('A');
      expect(content).toContain('B');
    });
  });
});
