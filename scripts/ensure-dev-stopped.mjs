import net from "node:net";

// Vercel/CI may have ports open; never block remote builds.
if (process.env.VERCEL === "1" || process.env.CI === "true") {
  process.exit(0);
}

const PORTS = [3000, 3001, 3002, 3003];

function portInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port, "127.0.0.1");
  });
}

let blocked = false;

for (const port of PORTS) {
  if (await portInUse(port)) {
    console.error(
      `\nBuild blocked: port ${port} is in use (dev server likely running).`,
    );
    blocked = true;
  }
}

if (blocked) {
  console.error(
    "Stop the dev server (Ctrl+C), then run npm run build again.\n" +
      "Or use: npm run build:force (not recommended while dev is running).\n",
  );
  process.exit(1);
}
