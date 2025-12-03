// backend/routes/emotionStream.js
import { WebSocketServer, WebSocket } from 'ws';
import backoff from 'backoff'; // We will implement a tiny backoff inline instead of adding package.

// Hume WebSocket endpoint (no api_key in query string)
const HUME_WS_URL = 'wss://api.hume.ai/v0/stream/models?models=face';

// Throttle: how often to forward a frame to Hume (ms)
const FORWARD_INTERVAL = 2000; // 1 frame every 2 seconds (adjustable)

// Keepalive ping interval to avoid idle disconnects (ms)
const PING_INTERVAL = 25000; // 25s

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
      proxyClientToHume(clientSocket, HUME_KEY);
    });
  });
}

/**
 * proxyClientToHume
 * - clientSocket: the WebSocket connection from browser -> our server
 * - HUME_KEY: API key (kept server-side)
 */
function proxyClientToHume(clientSocket, HUME_KEY) {
  // State for each client connection
  let humeSocket = null;
  let latestFrame = null;               // Buffer of latest frame sent by client
  let forwardTimer = null;              // interval timer which forwards frames to Hume
  let pingTimer = null;                 // ping to Hume
  let backoffAttempts = 0;              // reconnection backoff attempts
  let closedByServer = false;           // flag so we don't attempt reconnect after manual close

  // Helper to create a Hume connection with proper headers
  const createHumeSocket = () => {
    // Node ws accepts headers in the options param
    const options = {
      headers: {
        Authorization: `Bearer ${HUME_KEY}`,
        // You can add other headers here if required by Hume
      },
    };

    const ws = new WebSocket(HUME_WS_URL, options);

    ws.on('open', () => {
      console.log('✅ (proxy) Connected to Hume WebSocket.');
      backoffAttempts = 0;

      // Start keepalive pings to Hume so intermediate proxies don't close the connection
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        try {
          if (ws.readyState === WebSocket.OPEN) ws.ping();
        } catch (e) {
          // ignore
        }
      }, PING_INTERVAL);
    });

    ws.on('message', (data) => {
      // Forward Hume messages straight to client (if open)
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(data);
        }
      } catch (err) {
        console.error('❌ Error forwarding Hume message to client:', err);
      }
    });

    ws.on('error', (err) => {
      console.error('❌ Hume socket error:', err.message || err);
      // let 'close' handle reconnect logic
    });

    ws.on('close', (code, reason) => {
      console.warn(`⚠️ Hume socket closed (code=${code}) reason=${reason?.toString() || ''}`);

      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }

      if (!closedByServer) {
        // Attempt backoff reconnect
        backoffAttempts++;
        const delay = Math.min(1000 * 2 ** backoffAttempts, 30 * 1000); // exponential up to 30s
        console.log(`⏳ Reconnecting to Hume in ${delay}ms (attempt ${backoffAttempts})`);
        setTimeout(() => {
          humeSocket = createHumeSocket();
        }, delay);
      }
    });

    return ws;
  };

  // Initialize Hume connection
  humeSocket = createHumeSocket();

  /*******************************
   * Client -> Server handling
   *******************************/
  clientSocket.on('message', (message, isBinary) => {
    // Expectation: the frontend sends binary frames (ArrayBuffer/Blob) directly.
    // If the message is text, treat as control (e.g., {"type":"control","action":"stop"})
    try {
      if (isBinary) {
        // Keep only the latest frame — drop older frames
        latestFrame = Buffer.from(message);
      } else {
        // try to parse JSON control messages
        const text = message.toString();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch (e) {
          payload = null;
        }

        if (payload && payload.type === 'control') {
          if (payload.action === 'stop') {
            // client asked to stop the stream
            console.log('Client requested stop.');
            cleanupAndClose();
          }
          // add other control handling if needed
        } else {
          // Unknown text message - log for debugging
          console.log('Proxy received text message from client (ignored):', text.slice(0, 200));
        }
      }
    } catch (err) {
      console.error('❌ Error handling client message:', err);
    }
  });

  clientSocket.on('error', (err) => {
    console.error('❌ Client socket error:', err);
    cleanupAndClose();
  });

  clientSocket.on('close', () => {
    console.log('🛑 Client connection closed.');
    cleanupAndClose();
  });

  /*******************************
   * Forward loop: send latestFrame -> Hume at fixed interval
   *******************************/
  // Only create one forward timer per client
  if (!forwardTimer) {
    forwardTimer = setInterval(() => {
      try {
        if (!latestFrame || !humeSocket || humeSocket.readyState !== WebSocket.OPEN) return;

        // Construct the message format expected by Hume.
        // Hume expects a JSON text message describing metadata, followed by binary frame(s) -
        // but different providers differ. We'll forward the binary directly if that's accepted.
        // If Hume requires an envelope, the frontend can send a small metadata JSON before the binary,
        // but many streaming endpoints accept raw binary frames representing the image bytes.

        // Send binary frame to Hume
        humeSocket.send(latestFrame, { binary: true }, (err) => {
          if (err) {
            console.error('❌ Error sending frame to Hume:', err);
          } else {
            // Optionally log when frames are forwarded (comment out in prod)
            // console.log('➡️ Forwarded frame to Hume (' + latestFrame.length + ' bytes)');
          }
        });

        // After forwarding, clear latestFrame to avoid repeated sends
        latestFrame = null;
      } catch (err) {
        console.error('❌ Forward loop error:', err);
      }
    }, FORWARD_INTERVAL);
  }

  /*******************************
   * Cleanup helper
   *******************************/
  function cleanupAndClose() {
    closedByServer = true;

    if (forwardTimer) {
      clearInterval(forwardTimer);
      forwardTimer = null;
    }
    latestFrame = null;

    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    try {
      if (humeSocket && (humeSocket.readyState === WebSocket.OPEN || humeSocket.readyState === WebSocket.CONNECTING)) {
        humeSocket.removeAllListeners?.();
        humeSocket.close();
      }
    } catch (e) { /* ignore */ }

    try {
      if (clientSocket && (clientSocket.readyState === WebSocket.OPEN || clientSocket.readyState === WebSocket.CONNECTING)) {
        clientSocket.removeAllListeners?.();
        clientSocket.close();
      }
    } catch (e) { /* ignore */ }
  }

  // Safety: if client never sends anything for a long time, allow cleanup when client disconnects naturally.
}
