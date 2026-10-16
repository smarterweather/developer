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
import { appendFileSync } from "node:fs";
import http from "node:http";

const upstream = new URL(process.env.PRISM_URL ?? "http://127.0.0.1:4010");
const port = Number(process.env.PROXY_PORT ?? 4011);
const log = process.env.SMARTERWEATHER_CI_LOG ?? "requests.jsonl";
const envKey = process.env.SMARTERWEATHER_API_KEY;
const PLACEHOLDER = "YOUR_SMARTERWEATHER_API_KEY";
const ROUTES = ["/_noauth", "/_502"];
const BAD_GATEWAY = "<html><head><title>502 Bad Gateway</title></head><body><h1>502 Bad Gateway</h1></body></html>\n";

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://proxy");
    const route = ROUTES.find((r) => url.pathname === r || url.pathname.startsWith(`${r}/`)) ?? "";
    const path = url.pathname.slice(route.length) || "/";
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "")?.[1];
    const record = (status) =>
      appendFileSync(
        log,
        `${JSON.stringify({
          route: route || "/",
          method: req.method,
          path,
          query: Object.fromEntries(url.searchParams),
          bearer: Boolean(token),
          token_matches_env: Boolean(token && envKey && token === envKey),
          token_is_placeholder: token === PLACEHOLDER,
          status,
        })}\n`,
      );

    if (route === "/_502") {
      record(502);
      res.writeHead(502, { "content-type": "text/html" });
      res.end(BAD_GATEWAY);
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
