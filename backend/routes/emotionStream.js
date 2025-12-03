// backend/routes/emotionStream.js
import { WebSocketServer, WebSocket } from 'ws';

// Hume WebSocket endpoint (server-side API key)
const HUME_WS_URL = 'wss://api.hume.ai/v0/stream/models?models=face';

// Forward throttling (ms) — send latest frame every X ms
const FORWARD_INTERVAL = 2000;

// Keepalive ping interval (ms)
const PING_INTERVAL = 25000;

export function createEmotionStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log('🧩 Emotion WebSocket proxy initialized at /api/emotion/stream');

  server.on('upgrade', (request, socket, head) => {
    if (!request.url.startsWith('/api/emotion/stream')) return;

    const HUME_KEY = process.env.HUME_API_KEY;
    if (!HUME_KEY) {
      console.error('❌ HUME_API_KEY missing in environment variables');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (clientSocket) => {
      startProxyForClient(clientSocket, HUME_KEY);
    });
  });
}

function startProxyForClient(clientSocket, HUME_KEY) {
  let humeSocket = null;
  let latestFrame = null;
  let forwardTimer = null;
  let pingTimer = null;
  let reconnectAttempts = 0;
  let closedByServer = false;

  // --- HUME WS CONNECTION ---
  const connectToHume = () => {
    const ws = new WebSocket(HUME_WS_URL, {
      headers: { Authorization: `Bearer ${HUME_KEY}` },
    });

    ws.on('open', () => {
      console.log('✅ Connected to Hume WebSocket');
      reconnectAttempts = 0;

      // Ping keepalive
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }, PING_INTERVAL);
    });

    ws.on('message', (data) => {
      // Forward Hume messages directly to client
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(data);
      }
    });

    ws.on('close', (code, reason) => {
      console.warn(`⚠️ Hume WS closed (code=${code}) reason=${reason?.toString() || ''}`);
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }

      // Automatic exponential backoff reconnect
      if (!closedByServer) {
        reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
        console.log(`⏳ Reconnecting to Hume in ${delay}ms (attempt ${reconnectAttempts})`);
        setTimeout(() => {
          humeSocket = connectToHume();
        }, delay);
      }
    });

    ws.on('error', (err) => console.error('❌ Hume WS error:', err.message || err));

    return ws;
  };

  humeSocket = connectToHume();

  // --- CLIENT WS HANDLING ---
  clientSocket.on('message', (msg, isBinary) => {
    try {
      if (isBinary) {
        // Only keep the latest frame
        latestFrame = Buffer.from(msg);
      } else {
        // Handle text/control messages
        const text = msg.toString();
        let payload;
        try { payload = JSON.parse(text); } catch { payload = null; }

        if (payload?.type === 'control' && payload.action === 'stop') {
          console.log('Client requested stop.');
          cleanup();
        } else {
          console.log('Ignored client text message:', text.slice(0, 200));
        }
      }
    } catch (err) {
      console.error('❌ Error handling client message:', err);
    }
  });

  clientSocket.on('close', () => {
    console.log('🛑 Client disconnected.');
    cleanup();
  });

  clientSocket.on('error', (err) => {
    console.error('❌ Client socket error:', err);
    cleanup();
  });

  // --- FRAME FORWARDING LOOP ---
  forwardTimer = setInterval(() => {
    try {
      if (!latestFrame || !humeSocket || humeSocket.readyState !== WebSocket.OPEN) return;

      humeSocket.send(latestFrame, { binary: true }, (err) => {
        if (err) console.error('❌ Forward frame error:', err);
      });

      latestFrame = null;
    } catch (err) {
      console.error('❌ Forward loop error:', err);
    }
  }, FORWARD_INTERVAL);

  // --- CLEANUP ---
  function cleanup() {
    closedByServer = true;

    if (forwardTimer) { clearInterval(forwardTimer); forwardTimer = null; }
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    latestFrame = null;

    try {
      if (humeSocket && (humeSocket.readyState === WebSocket.OPEN || humeSocket.readyState === WebSocket.CONNECTING)) {
        humeSocket.removeAllListeners?.();
        humeSocket.close();
      }
    } catch {} 

    try {
      if (clientSocket && (clientSocket.readyState === WebSocket.OPEN || clientSocket.readyState === WebSocket.CONNECTING)) {
        clientSocket.removeAllListeners?.();
        clientSocket.close();
      }
    } catch {}
  }
}
