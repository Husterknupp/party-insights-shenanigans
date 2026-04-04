/**
 * Minimal HTTP proxy server for integration tests.
 *
 * Behaviour:
 *  - Requests to *.wikipedia.org  → 418 I'm a Teapot (simulates HTTP error)
 *  - All other requests           → 200 OK with empty body (pass-through stub)
 *
 * Axios (via proxy-from-env) sends requests through this proxy when
 * HTTP_PROXY=http://localhost:<port> is set in the child process env.
 */

import http from "http";
import net from "net";

/**
 * @returns {{ server: http.Server, port: number, stop: () => Promise<void> }}
 */
export function createProxyServer() {
  const server = http.createServer((req, res) => {
    const host = req.headers.host || "";
    console.log(`[proxy] ${req.method} ${host}${req.url}`);

    if (host.includes("wikipedia.org")) {
      console.log(`[proxy] → 418 Teapot (Wikipedia blocked)`);
      res.writeHead(418, "I'm a Teapot", { "Content-Type": "text/plain" });
      res.end("418 I'm a Teapot – blocked by test proxy");
      return;
    }

    // All other requests: return empty 200 so the process doesn't hang
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("");
  });

  // Also handle CONNECT tunnels (HTTPS) – block them all for safety
  server.on("connect", (req, clientSocket) => {
    const host = req.url || "";
    console.log(`[proxy] CONNECT ${host}`);

    if (host.includes("wikipedia.org")) {
      console.log(`[proxy] → blocking CONNECT to Wikipedia`);
      clientSocket.write("HTTP/1.1 418 I'm a Teapot\r\n\r\n");
      clientSocket.destroy();
      return;
    }

    // For non-Wikipedia CONNECT: return empty tunnel stub
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    // Immediately close – caller gets connection reset, process exits
    const stub = net.connect(0, "127.0.0.1", () => {});
    clientSocket.pipe(stub);
    stub.pipe(clientSocket);
    stub.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => stub.destroy());
  });

  return {
    server,
    port: 0, // assigned after listen()
    start() {
      return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
          this.port = server.address().port;
          console.log(`[proxy] listening on port ${this.port}`);
          resolve(this.port);
        });
      });
    },
    stop() {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
