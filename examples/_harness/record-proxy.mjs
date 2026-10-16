#!/usr/bin/env node
// Sits between an example and the Prism mock. Forwards every request and
// appends one JSON line per request to $SMARTERWEATHER_CI_LOG:
//   {method, path, query, bearer, stripped, status}
// `bearer` says whether the example sent `Authorization: Bearer <token>`; the
// token itself is never logged. A path under /_noauth is forwarded without
// its Authorization header, which is how the negative test gets a 401.
import { appendFileSync } from "node:fs";
import http from "node:http";

const upstream = new URL(process.env.PRISM_URL ?? "http://127.0.0.1:4010");
const port = Number(process.env.PROXY_PORT ?? 4011);
const log = process.env.SMARTERWEATHER_CI_LOG ?? "requests.jsonl";
const NOAUTH = "/_noauth";

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://proxy");
    const stripped = url.pathname === NOAUTH || url.pathname.startsWith(`${NOAUTH}/`);
    const path = stripped ? url.pathname.slice(NOAUTH.length) || "/" : url.pathname;
    const bearer = /^Bearer \S+$/.test(req.headers.authorization ?? "");
    const headers = { ...req.headers, host: upstream.host };
    if (stripped) delete headers.authorization;

    const out = http.request(
      { hostname: upstream.hostname, port: upstream.port, method: req.method, path: path + url.search, headers },
      (up) => {
        const query = Object.fromEntries(url.searchParams);
        appendFileSync(log, `${JSON.stringify({ method: req.method, path, query, bearer, stripped, status: up.statusCode })}\n`);
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
