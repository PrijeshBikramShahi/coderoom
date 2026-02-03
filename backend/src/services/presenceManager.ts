import Redis from 'ioredis';
import { Cursor } from '../shared/ws.types';

export class PresenceManager {
  private redis: Redis;
  private readonly PRESENCE_TTL = 30; // 30 seconds

  constructor(redisHost: string, redisPort: number) {
    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  private getPresenceKey(docId: string): string {
    return `presence:doc:${docId}`;
  }

  async addUser(docId: string, userId: string): Promise<void> {
    const key = this.getPresenceKey(docId);
    await this.redis.hset(key, userId, JSON.stringify({ userId, position: 0 }));
    await this.redis.expire(key, this.PRESENCE_TTL);
  }

  async removeUser(docId: string, userId: string): Promise<void> {
    const key = this.getPresenceKey(docId);
    await this.redis.hdel(key, userId);
  }

  async updateCursor(docId: string, userId: string, position: number): Promise<void> {
    const key = this.getPresenceKey(docId);
    const cursor: Cursor = { userId, position };
    await this.redis.hset(key, userId, JSON.stringify(cursor));
    await this.redis.expire(key, this.PRESENCE_TTL);
  }

  async getUsers(docId: string): Promise<string[]> {
    const key = this.getPresenceKey(docId);
    const users = await this.redis.hkeys(key);
    return users;
  }

  async getCursors(docId: string): Promise<Record<string, Cursor>> {
    const key = this.getPresenceKey(docId);
    const data = await this.redis.hgetall(key);
    
    const cursors: Record<string, Cursor> = {};
    for (const [userId, cursorJson] of Object.entries(data)) {
      try {
        cursors[userId] = JSON.parse(cursorJson);
      } catch (e) {
        console.error('Failed to parse cursor data:', e);
      }
    }
    
    return cursors;
  }

  async keepAlive(docId: string): Promise<void> {
    const key = this.getPresenceKey(docId);
    await this.redis.expire(key, this.PRESENCE_TTL);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
