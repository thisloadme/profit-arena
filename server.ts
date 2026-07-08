import { createServer } from "node:http";
import next from "next";
import { prisma } from "@/lib/prisma";
import { attachSocketServer } from "@/server/engine/socket-server";
import { startTicker, getTickerState } from "@/server/engine/tick-scheduler";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Attach Socket.io to the same HTTP server (single-process mode).
  attachSocketServer(httpServer);

  // Boot the simulation engine.
  if (!dev || process.env.START_TICKER_IN_DEV === "1") {
    void startTicker();
  } else {
    console.log("[ticker] skipped in dev (set START_TICKER_IN_DEV=1 to enable)");
  }

  httpServer.listen(port, hostname, () => {
    const st = getTickerState();
    console.log(
      `> Server at http://${hostname}:${port} (${dev ? "dev" : "prod"}) | ticker: ${
        st.running ? "on" : "off"
      }`,
    );
  });

  // Graceful shutdown — close server & DB on SIGTERM/SIGINT.
  const shutdown = () => {
    console.log("\nShutting down…");
    httpServer.close(() => {
      console.log("  ✓ HTTP server closed");
      prisma.$disconnect().then(() => {
        console.log("  ✓ DB disconnected");
        process.exit(0);
      });
    });
    setTimeout(() => process.exit(1), 5_000); // force exit after 5s
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
