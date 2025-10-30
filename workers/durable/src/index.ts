export interface Env {
  COLLAB: DurableObjectNamespace;
  DB: D1Database;
  KV: KVNamespace;
}

// Durable Object for real-time collaboration
export class CollabRoom {
  private state: DurableObjectState;
  private sessions: Set<WebSocket>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sessions = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade for real-time collaboration
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // HTTP endpoints for state management
    if (url.pathname === '/state') {
      const state = await this.state.storage.get('roomState');
      return new Response(JSON.stringify(state || {}), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  async handleSession(webSocket: WebSocket) {
    webSocket.accept();
    this.sessions.add(webSocket);

    // Send current state to new participant
    const currentState = await this.state.storage.get('roomState') || { participants: 0 };
    webSocket.send(JSON.stringify({
      type: 'init',
      state: currentState,
    }));

    // Update participant count
    const participantCount = this.sessions.size;
    await this.state.storage.put('roomState', { participants: participantCount });

    // Broadcast to all sessions
    this.broadcast({
      type: 'participant_joined',
      count: participantCount,
    });

    webSocket.addEventListener('message', async (msg) => {
      try {
        const data = JSON.parse(msg.data as string);

        // Handle different message types
        switch (data.type) {
          case 'update':
            // Store update in durable storage
            await this.state.storage.put('lastUpdate', data.payload);

            // Broadcast to all other sessions
            this.broadcast(data, webSocket);
            break;

          case 'cursor':
            // Broadcast cursor position (ephemeral, not stored)
            this.broadcast(data, webSocket);
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    webSocket.addEventListener('close', async () => {
      this.sessions.delete(webSocket);

      const participantCount = this.sessions.size;
      await this.state.storage.put('roomState', { participants: participantCount });

      this.broadcast({
        type: 'participant_left',
        count: participantCount,
      });
    });
  }

  broadcast(message: any, exclude?: WebSocket) {
    const data = JSON.stringify(message);
    for (const session of this.sessions) {
      if (session !== exclude) {
        try {
          session.send(data);
        } catch (error) {
          // Remove closed connections
          this.sessions.delete(session);
        }
      }
    }
  }
}

// Worker entrypoint
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route to appropriate Durable Object
    if (url.pathname.startsWith('/room/')) {
      const roomId = url.pathname.split('/')[2];
      const id = env.COLLAB.idFromName(roomId);
      const stub = env.COLLAB.get(id);

      return stub.fetch(request);
    }

    return new Response('Use /room/{roomId} to connect', { status: 400 });
  },
};
