import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rmSync } from "node:fs";

const clean = process.argv.includes("--clean");
const devPorts = [3000, 3001, 3002, 3003];

function stopDevServersOnPorts() {
  if (process.platform !== "win32") return;

  const script = `
    $ports = ${devPorts.join(",")};
    foreach ($port in $ports) {
      Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
  `;

  try {
    execFileSync("powershell.exe", ["-NoProfile", "-Command", script], {
      stdio: "ignore",
    });
    console.log("Stopped existing dev servers on ports 3000-3003");
  } catch {
    console.warn(
      "Could not automatically stop old dev servers. Close them manually if Next uses the wrong port.",
    );
  }
}

if (clean && existsSync(".next")) {
  stopDevServersOnPorts();
  rmSync(".next", { recursive: true, force: true });
  console.log("Cleared .next dev cache");
} else if (clean) {
  stopDevServersOnPorts();
}

const next = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_ENV: "development" },
});

next.on("exit", (code) => process.exit(code ?? 0));
