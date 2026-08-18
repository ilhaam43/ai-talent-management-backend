import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

export interface GoclawFrame {
  type: 'req' | 'res' | 'event';
  id?: string;
  method?: string;
  params?: Record<string, any>;
  ok?: boolean;
  payload?: any;
  error?: { code: string; message: string; retryable?: boolean };
  event?: string;
  seq?: number;
}

interface PendingRequest {
  resolve: (frame: GoclawFrame) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Manages a per-user upstream WebSocket connection to GoClaw gateway.
 * Each AITM user gets their own GoClaw WS connection keyed by user_id.
 */
@Injectable()
export class GoclawService implements OnModuleDestroy {
  private readonly logger = new Logger(GoclawService.name);
  private readonly wsUrl: string;
  private readonly gatewayToken: string;
  readonly agentKey: string;
  readonly agentWorkspace: string;

  // Per-user connections: userId -> { ws, pending, eventListeners }
  private connections = new Map<string, {
    ws: WebSocket;
    pending: Map<string, PendingRequest>;
    eventListeners: Set<(frame: GoclawFrame) => void>;
    connected: boolean;
    reqCounter: number;
  }>();

  constructor(private readonly config: ConfigService) {
    this.wsUrl = this.config.get<string>('GOCLAW_WS_URL') || 'ws://localhost:18790/ws';
    this.gatewayToken = this.config.get<string>('GOCLAW_GATEWAY_TOKEN') || '';
    this.agentKey = this.config.get<string>('GOCLAW_AGENT_KEY') || 'a-l-i-c-e-solo';
    this.agentWorkspace = this.config.get<string>('GOCLAW_AGENT_WORKSPACE')
      || '/root/.goclaw/workspace/a-l-i-c-e-solo';
    this.logger.log(`GoClaw WebSocket: ${this.wsUrl}, Agent: ${this.agentKey}`);
  }

  onModuleDestroy() {
    for (const [userId, conn] of this.connections) {
      this.logger.log(`Closing GoClaw WS for user ${userId}`);
      conn.ws.close();
    }
    this.connections.clear();
  }

  /**
   * Get or create an authenticated upstream GoClaw WS for a given AITM user.
   */
  async getConnection(userId: string, displayName?: string): Promise<string> {
    const goclawUserId = `aitm_${userId}`;

    if (this.connections.has(goclawUserId)) {
      const conn = this.connections.get(goclawUserId)!;
      if (conn.ws.readyState === WebSocket.OPEN && conn.connected) {
        return goclawUserId;
      }
      // Stale — clean up and reconnect
      conn.ws.close();
      this.connections.delete(goclawUserId);
    }

    await this.connect(goclawUserId);
    return goclawUserId;
  }

  private connect(goclawUserId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      const conn = {
        ws,
        pending: new Map<string, PendingRequest>(),
        eventListeners: new Set<(frame: GoclawFrame) => void>(),
        connected: false,
        reqCounter: 0,
      };
      this.connections.set(goclawUserId, conn);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('GoClaw connection timeout'));
      }, 15000);

      ws.on('open', () => {
        // Send connect handshake
        const connectId = `conn-${Date.now()}`;
        const connectFrame: GoclawFrame = {
          type: 'req',
          id: connectId,
          method: 'connect',
          params: {
            token: this.gatewayToken,
            user_id: goclawUserId,
            protocol: 3,
          },
        };

        const pendingReq: PendingRequest = {
          resolve: (frame) => {
            clearTimeout(timeout);
            if (frame.ok) {
              conn.connected = true;
              this.logger.log(`GoClaw connected for user ${goclawUserId} (role: ${frame.payload?.role})`);
              resolve();
            } else {
              const errMsg = frame.error?.message || 'GoClaw connect failed';
              this.logger.error(`GoClaw connect failed: ${errMsg}`);
              ws.close();
              reject(new Error(errMsg));
            }
          },
          reject: (err) => {
            clearTimeout(timeout);
            reject(err);
          },
          timer: timeout,
        };
        conn.pending.set(connectId, pendingReq);
        ws.send(JSON.stringify(connectFrame));
      });

      ws.on('message', (raw: Buffer) => {
        try {
          const frame: GoclawFrame = JSON.parse(raw.toString());

          // Response to a pending request
          if (frame.type === 'res' && frame.id && conn.pending.has(frame.id)) {
            const pending = conn.pending.get(frame.id)!;
            conn.pending.delete(frame.id);
            clearTimeout(pending.timer);
            pending.resolve(frame);
            return;
          }

          // Server-push event — broadcast to all listeners
          if (frame.type === 'event') {
            for (const listener of conn.eventListeners) {
              try { listener(frame); } catch (e) { /* ignore listener errors */ }
            }
            return;
          }

          // Unsolicited response (e.g. chat.send response)
          if (frame.type === 'res') {
            for (const listener of conn.eventListeners) {
              try { listener(frame); } catch (e) { /* ignore */ }
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to parse GoClaw message: ${e}`);
        }
      });

      ws.on('error', (err) => {
        this.logger.error(`GoClaw WS error for ${goclawUserId}: ${err.message}`);
      });

      ws.on('close', () => {
        this.logger.log(`GoClaw WS closed for ${goclawUserId}`);
        this.connections.delete(goclawUserId);
      });
    });
  }

  /**
   * Send an RPC request and wait for the response.
   */
  async sendRequest(goclawUserId: string, method: string, params: Record<string, any>): Promise<GoclawFrame> {
    const conn = this.connections.get(goclawUserId);
    if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
      throw new Error('GoClaw not connected');
    }

    conn.reqCounter++;
    const reqId = `req-${conn.reqCounter}-${Date.now()}`;
    const frame: GoclawFrame = { type: 'req', id: reqId, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        conn.pending.delete(reqId);
        reject(new Error(`GoClaw request timeout: ${method}`));
      }, 300000); // 5 min timeout for agent responses

      conn.pending.set(reqId, { resolve, reject, timer });
      conn.ws.send(JSON.stringify(frame));
    });
  }

  /**
   * Send a chat.send request (fire-and-forget — response comes via events).
   * Returns the request ID for tracking.
   */
  sendChat(goclawUserId: string, message: string, sessionKey?: string): string {
    const conn = this.connections.get(goclawUserId);
    if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
      throw new Error('GoClaw not connected');
    }

    conn.reqCounter++;
    const reqId = `chat-${conn.reqCounter}-${Date.now()}`;
    const params: Record<string, any> = {
      message,
      agentId: this.agentKey,
      channel: 'websocket',
    };
    if (sessionKey) {
      params.sessionKey = sessionKey;
    }

    const frame: GoclawFrame = { type: 'req', id: reqId, method: 'chat.send', params };
    conn.ws.send(JSON.stringify(frame));
    return reqId;
  }

  /**
   * Get chat history from GoClaw for a session.
   */
  async getChatHistory(goclawUserId: string, sessionKey: string): Promise<any[]> {
    const res = await this.sendRequest(goclawUserId, 'chat.history', { sessionKey });
    if (res.ok) {
      return res.payload?.messages || res.payload || [];
    }
    return [];
  }

  /**
   * List sessions from GoClaw.
   */
  async listSessions(goclawUserId: string): Promise<any[]> {
    const res = await this.sendRequest(goclawUserId, 'sessions.list', { agentId: this.agentKey });
    if (res.ok) {
      return res.payload?.sessions || res.payload || [];
    }
    return [];
  }

  /**
   * Register an event listener for a user's connection.
   */
  addEventListener(goclawUserId: string, listener: (frame: GoclawFrame) => void): () => void {
    const conn = this.connections.get(goclawUserId);
    if (!conn) {
      throw new Error('GoClaw not connected');
    }
    conn.eventListeners.add(listener);
    return () => { conn.eventListeners.delete(listener); };
  }

  /**
   * Remove all event listeners for a user connection.
   */
  removeAllListeners(goclawUserId: string): void {
    const conn = this.connections.get(goclawUserId);
    if (conn) {
      conn.eventListeners.clear();
    }
  }

  /**
   * Close a specific user's connection.
   */
  disconnect(goclawUserId: string): void {
    const conn = this.connections.get(goclawUserId);
    if (conn) {
      conn.ws.close();
      this.connections.delete(goclawUserId);
    }
  }
}
