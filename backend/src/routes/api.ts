import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { DocumentManager } from '../services/documentManager';

export function createRouter(documentManager: DocumentManager, jwtSecret: string): Router {
  const router = Router();

  // Auth endpoint - simple login that returns JWT
  router.post('/auth/login', (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const token = jwt.sign({ userId }, jwtSecret, { expiresIn: '24h' });
    
    res.json({ token, userId });
  });

  // Create new document
  router.post('/docs', async (req, res) => {
    try {
      const docId = await documentManager.createDocument();
      console.log('Document created successfully:', docId);
      res.json({ docId });
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({ 
        error: 'Failed to create document',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get document
  router.get('/docs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await documentManager.getDocument(id);
      res.json(doc);
    } catch (error) {
      res.status(404).json({ error: 'Document not found' });
    }
  });

  return router;
}
