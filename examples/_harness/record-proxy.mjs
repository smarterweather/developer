#!/usr/bin/env node
// Sits between an example and the Prism mock. Appends one JSON line per
// request to $SMARTERWEATHER_CI_LOG:
//   {route, method, path, query, bearer, token_matches_env, token_is_placeholder, status}
// The token itself is never logged, only whether one was sent, whether it
// equals this process's SMARTERWEATHER_API_KEY (the fake CI key) and whether
// it is the examples' placeholder. Routes, chosen by a path prefix:
//   (none)     forward to the mock as sent
//   /_noauth   forward without the Authorization header (the mock answers 401)
//   /_502      answer 502 with an HTML body, as a broken gateway would
//   /_504json  answer 504 with a JSON body that is not a problem, as an API
//              gateway timeout would
//   /_fixture/<file>  answer 200 with that JSON file, a path under examples/
//              URL-encoded as one segment (an example's test.json fixtures)
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import http from "node:http";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const upstream = new URL(process.env.PRISM_URL ?? "http://127.0.0.1:4010");
const port = Number(process.env.PROXY_PORT ?? 4011);
const log = process.env.SMARTERWEATHER_CI_LOG ?? "requests.jsonl";
const envKey = process.env.SMARTERWEATHER_API_KEY;
const PLACEHOLDER = "YOUR_SMARTERWEATHER_API_KEY";
const BAD_GATEWAY = "<html><head><title>502 Bad Gateway</title></head><body><h1>502 Bad Gateway</h1></body></html>\n";
const STUBS = {
  "/_502": { status: 502, type: "text/html", body: BAD_GATEWAY },
  "/_504json": { status: 504, type: "application/json", body: '{"message":"Endpoint request timed out"}' },
};
const ROUTES = ["/_noauth", ...Object.keys(STUBS)];
const EXAMPLES = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// /_fixture/<encoded path>/v1/... -> the route, and the JSON file it names
// (null when it is missing, not .json or outside examples/).
function fixtureRoute(pathname) {
  const match = /^\/_fixture\/([^/]+)/.exec(pathname);
  if (!match) return null;
  let file = null;
  try {
    const rel = relative(EXAMPLES, resolve(EXAMPLES, decodeURIComponent(match[1])));
    if (!rel.startsWith("..") && !isAbsolute(rel) && rel.endsWith(".json") && existsSync(join(EXAMPLES, rel))) file = join(EXAMPLES, rel);
  } catch {}
  return { route: match[0], file };
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://proxy");
    const fixture = fixtureRoute(url.pathname);
    const route = fixture?.route ?? ROUTES.find((r) => url.pathname === r || url.pathname.startsWith(`${r}/`)) ?? "";
    const path = url.pathname.slice(route.length) || "/";
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "")?.[1];
    const record = (status) =>
      appendFileSync(
        log,
        `${JSON.stringify({
          route: fixture ? "/_fixture" : route || "/",
          method: req.method,
          path,
          query: Object.fromEntries(url.searchParams),
          bearer: Boolean(token),
          token_matches_env: Boolean(token && envKey && token === envKey),
          token_is_placeholder: token === PLACEHOLDER,
          status,
        })}\n`,
      );

    if (fixture) {
      const status = fixture.file ? 200 : 404;
      record(status);
      res.writeHead(status, { "content-type": "application/json" });
      res.end(fixture.file ? readFileSync(fixture.file) : '{"title":"record-proxy: no such fixture"}');
      return;
    }

    const stub = STUBS[route];
    if (stub) {
      record(stub.status);
      res.writeHead(stub.status, { "content-type": stub.type });
      res.end(stub.body);
      return;
    }

    const headers = { ...req.headers, host: upstream.host };
    if (route === "/_noauth") delete headers.authorization;
    const out = http.request(
      { hostname: upstream.hostname, port: upstream.port, method: req.method, path: path + url.search, headers },
      (up) => {
        record(up.statusCode);
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      },
    );
    out.on("error", (err) => {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end(`record-proxy: ${err.message}\n`);
    });
    req.pipe(out);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`record-proxy on 127.0.0.1:${port} -> ${upstream.origin}, log ${log}`);
  });
