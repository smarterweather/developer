// What expect-run.mjs runs: starts the built app (`next start`) with this
// process's environment, calls GET /api/weather the way the hook does, prints
// what the card shows, and stops the app. On an error status it prints
// `<status>: <detail>` and the problem's next step (or the start of a body
// that is not a problem) and exits 1. Run `next build` first.
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const port = await new Promise((resolve) => {
  const probe = createServer().listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const app = spawn("node_modules/.bin/next", ["start", "-H", "127.0.0.1", "-p", String(port)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "ignore", "inherit"],
});

try {
  const url = `http://127.0.0.1:${port}/api/weather?${new URLSearchParams({ location: "Boston, MA" })}`;
  const res = await retry(() => fetch(url, { signal: AbortSignal.timeout(10_000) }));
  if (!res.ok) {
    console.error(`${res.status}: ${problemText(await res.text())}`);
    process.exitCode = 1;
  } else {
    const weather = await res.json();
    console.log(`${weather.current.temperature}°F, ${weather.current.conditions}`);
    console.log(`Today: ${weather.daily[0].conditions}, high ${weather.daily[0].high}°, low ${weather.daily[0].low}°`);
    console.log(`Sources: ${weather.attribution.sources.join(", ")}`);
  }
} finally {
  app.kill();
}

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

function problemText(body) {
  try {
    const { detail, title, next_steps: next } = JSON.parse(body);
    const text = detail || title;
    if (typeof text === "string") {
      const hint = next?.[next.recommended]?.href;
      return hint ? `${text}\nNext step: ${hint}` : text;
    }
  } catch {}
  return body.slice(0, 200);
}
