/**
 * Custom Node HTTP server: required so Socket.io shares the process with Next.js.
 * REST/Web still use Next; WebSocket upgrades are handled by Socket.io on the same port.
 */
import "dotenv/config";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { setupSocketServer } from "./lib/realtime/socket-handler";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    void handle(req, res, parsedUrl);
  });

  setupSocketServer(httpServer);

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console -- startup log
    console.log(`> Ready on http://${hostname}:${port} (Next.js + Socket.io)`);
  });
});
