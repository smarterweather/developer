// What expect-run.mjs runs: starts the built app (`next start`, on a port the
// OS picks) with this process's environment, calls GET /api/weather the way
// the hook does, and prints the card's lines with the card's own code
// (lib/weather.ts). On an error it prints the card's error line and next step
// and exits 1. The app is stopped on exit, including on SIGTERM or SIGINT.
// Run `next build` first. Needs Node.js 22.18+ to import the .ts module.
import { spawn } from "node:child_process";
import { cardView, readResponse } from "../lib/weather.ts";

const app = spawn("node_modules/.bin/next", ["start", "-H", "127.0.0.1", "-p", "0"], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "inherit"],
});
process.on("exit", () => app.kill());
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => process.exit(1));

const origin = await new Promise((resolve, reject) => {
  let out = "";
  app.stdout.setEncoding("utf8").on("data", (chunk) => {
    out += chunk;
    const match = /http:\/\/127\.0\.0\.1:\d+/.exec(out);
    if (match) resolve(match[0]);
  });
  app.on("exit", (code) => reject(new Error(`next start exited ${code} before it listened:\n${out}`)));
});

const url = `${origin}/api/weather?${new URLSearchParams({ location: "Boston, MA" })}`;
const res = await retry(() => fetch(url, { signal: AbortSignal.timeout(15_000) }));
const result = readResponse(res.status, await res.text());
if ("error" in result) {
  console.error(result.error.message);
  if (result.error.nextStep) console.error(`Next step: ${result.error.nextStep}`);
  process.exitCode = 1;
} else {
  for (const line of Object.values(cardView(result.data))) if (line) console.log(line);
}
process.exit();

// Retries while the app is still starting (connection refused), up to 30 s.
async function retry(call) {
  for (let i = 0; ; i++) {
    try {
      return await call();
    } catch (err) {
      if (i >= 300 || err.cause?.code !== "ECONNREFUSED") throw err;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}
