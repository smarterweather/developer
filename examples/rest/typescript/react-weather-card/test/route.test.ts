// @vitest-environment node
// The route's handling of what the API returns, with the upstream fetch
// stubbed: no location, a timeout before or during the body, a network
// error, the forwarded headers, and cancelling the call when the browser
// goes away. The happy path against the mock is in WeatherCard.test.tsx.
import { afterEach, expect, test, vi } from "vitest";
import { GET } from "../app/api/weather/route";

const request = (query = "location=Boston", init?: RequestInit) => new Request(`http://localhost/api/weather?${query}`, init);
const timeout = () => new DOMException("The operation was aborted due to timeout", "TimeoutError");

afterEach(() => vi.unstubAllGlobals());

test.each(["", "location=", "location=%20%20"])("no location (%j) is a 400 problem without calling the API", async (query) => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const res = await GET(request(query));
  expect(res.status).toBe(400);
  expect(res.headers.get("content-type")).toBe("application/problem+json");
  expect(await res.json()).toMatchObject({ status: 400, detail: "Pass a location, such as ?location=Boston,+MA." });
  expect(fetch).not.toHaveBeenCalled();
});

test.each([
  ["a timeout before the headers is a 504 problem", async () => Promise.reject(timeout()), 504, "The weather API did not answer within 10 seconds."],
  [
    "a timeout while the body streams is a 504 problem",
    async () => new Response(new ReadableStream({ pull: (c) => c.error(timeout()) }), { status: 200, headers: { "content-type": "application/json" } }),
    504,
    "The weather API did not answer within 10 seconds.",
  ],
  ["a network error is a 502 problem", async () => Promise.reject(new TypeError("fetch failed")), 502, "Could not reach the weather API."],
])("%s", async (_, upstream, status, detail) => {
  vi.stubGlobal("fetch", upstream);
  const res = await GET(request());
  expect(res.status).toBe(status);
  expect(res.headers.get("content-type")).toBe("application/problem+json");
  expect(await res.json()).toMatchObject({ status, detail });
});

test("passes on the status, the body, the auth challenge and rate-limit headers, and no others", async () => {
  const headers = {
    "content-type": "application/problem+json",
    "www-authenticate": 'Bearer realm="smarterweather"',
    "retry-after": "30",
    "ratelimit-limit": "60",
    "ratelimit-remaining": "0",
    "ratelimit-reset": "30",
    "ratelimit-daily-remaining": "900",
    "x-amzn-requestid": "abc",
    "set-cookie": "a=b",
  };
  vi.stubGlobal("fetch", async () => new Response('{"detail":"Slow down."}', { status: 429, headers }));
  const res = await GET(request());
  expect(res.status).toBe(429);
  expect(await res.text()).toBe('{"detail":"Slow down."}');
  const { "x-amzn-requestid": _id, "set-cookie": _cookie, ...forwarded } = headers;
  expect(Object.fromEntries(res.headers)).toEqual(forwarded);
});

test("cancels the API call when the browser's request is aborted", async () => {
  let upstream: AbortSignal | undefined;
  vi.stubGlobal("fetch", (_: string, init: RequestInit) => {
    upstream = init.signal ?? undefined;
    return new Promise((_, reject) => upstream?.addEventListener("abort", () => reject(upstream?.reason)));
  });
  const browser = new AbortController();
  const pending = GET(request("location=Boston", { signal: browser.signal }));
  expect(upstream?.aborted).toBe(false);
  browser.abort();
  expect(upstream?.aborted).toBe(true);
  expect((await pending).status).toBe(502);
});
