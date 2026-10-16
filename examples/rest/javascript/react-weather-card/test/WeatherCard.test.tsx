// @vitest-environment jsdom
// Renders <WeatherCard /> through the real route handler against the mock
// (run through _harness/with-mock.sh), then checks the error states, the
// route's failure handling and the hook's ordering with stubbed responses.
import { act, cleanup, render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, expect, test, vi } from "vitest";
import { GET } from "../app/api/weather/route";
import { WeatherCard } from "../components/WeatherCard";

const log = process.env.SMARTERWEATHER_CI_LOG;
if (!log || !process.env.SMARTERWEATHER_API_BASE) throw new Error("run through _harness/with-mock.sh");
const logLines = () => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const realFetch = globalThis.fetch;
const weather = (temperature: number) => ({ current: { temperature, conditions: "Clear" }, attribution: { sources: ["NWS"] } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("renders the mock's weather through the route, which sends the env key", async () => {
  vi.stubGlobal("fetch", (input: string, init?: RequestInit) => {
    const url = new URL(input, "http://localhost");
    return url.pathname === "/api/weather" ? GET(new Request(url)) : realFetch(input, init);
  });
  const before = logLines().length;

  render(<WeatherCard location="Boston, MA" />);

  expect(await screen.findByText(/^-?\d+°F$/)).toBeTruthy();
  expect(screen.getByText(/^Today: \S.*, high -?\d+°, low -?\d+°$/)).toBeTruthy();
  expect(screen.getByText(/^Data: \S/)).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  const requests = logLines().slice(before);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    method: "GET",
    path: "/v1/weather",
    query: { location: "Boston, MA", include: "current,daily,alerts", days: "1" },
    bearer: true,
    token_matches_env: true,
    status: 200,
  });
});

test("shows a problem's detail and links its recommended next step", async () => {
  const problem = {
    title: "Unauthorized",
    detail: "Missing Authorization header.",
    next_steps: { recommended: "login", login: { href: "https://developers.smarterweather.com/quickstart" } },
  };
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify(problem), { status: 401 }));
  render(<WeatherCard location="Boston, MA" />);
  expect((await screen.findByRole("alert")).textContent).toBe("401: Missing Authorization header.");
  expect(screen.getByRole("link", { name: "Next step" }).getAttribute("href")).toBe("https://developers.smarterweather.com/quickstart");
});

test.each([
  [502, "<html><body>502 Bad Gateway</body></html>", "502: <html><body>502 Bad Gateway</body></html>"],
  [504, '{"message":"Endpoint request timed out"}', '504: {"message":"Endpoint request timed out"}'],
  [200, "<html>maintenance</html>", "200: <html>maintenance</html>"],
])("shows a %i body that is not a problem or not JSON as its start", async (status, body, shown) => {
  vi.stubGlobal("fetch", async () => new Response(body, { status }));
  render(<WeatherCard location="Boston, MA" endpoint="/weather" />);
  expect((await screen.findByRole("alert")).textContent).toBe(shown);
  expect(screen.queryByRole("link")).toBeNull();
});

test("shows the first alert, a missing reading as --, and skips absent sections", async () => {
  const body = { current: { temperature: null, conditions: "Snow" }, alerts: [{ event: "Winter Storm Warning" }, { event: "Wind Advisory" }] };
  vi.stubGlobal("fetch", async () => Response.json(body));
  render(<WeatherCard location="Denver, CO" />);
  expect(await screen.findByText("--°F")).toBeTruthy();
  expect(screen.getByText("Winter Storm Warning")).toBeTruthy();
  expect(screen.queryByText("Wind Advisory")).toBeNull();
  expect(screen.queryByText(/^Today:/)).toBeNull();
  expect(screen.queryByText(/^Data:/)).toBeNull();
});

test("a response for an old location never replaces the current one", async () => {
  const pending = new Map<string, (r: Response) => void>();
  vi.stubGlobal("fetch", (input: string) => new Promise((resolve) => pending.set(new URL(input, "http://x").searchParams.get("location")!, resolve)));
  const { rerender } = render(<WeatherCard location="Boston, MA" />);
  rerender(<WeatherCard location="Denver, CO" />);
  await act(async () => pending.get("Denver, CO")!(Response.json(weather(40))));
  expect(await screen.findByText("40°F")).toBeTruthy();
  await act(async () => pending.get("Boston, MA")!(Response.json(weather(70))));
  expect(screen.queryByText("70°F")).toBeNull();
  expect(screen.getByText("40°F")).toBeTruthy();
});

test("asks the endpoint it is given for the location it is given", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: string) => {
    calls.push(input);
    return new Response("{}", { status: 500 });
  });
  render(<WeatherCard location="Denver, CO" endpoint="/my/weather" />);
  await screen.findByRole("alert");
  expect(calls).toEqual(["/my/weather?location=Denver%2C+CO"]);
});

test.each([
  [new DOMException("The operation was aborted due to timeout", "TimeoutError"), 504, "The weather API did not answer within 10 seconds."],
  [new TypeError("fetch failed"), 502, "Could not reach the weather API."],
])("the route answers %s with a %i problem", async (thrown, status, detail) => {
  vi.stubGlobal("fetch", async () => {
    throw thrown;
  });
  const res = await GET(new Request("http://localhost/api/weather?location=Boston"));
  expect(res.status).toBe(status);
  expect(res.headers.get("content-type")).toBe("application/problem+json");
  expect(await res.json()).toMatchObject({ status, detail });
});

test("the route passes on the auth challenge and rate-limit headers, and no others", async () => {
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
  const res = await GET(new Request("http://localhost/api/weather?location=Boston"));
  expect(res.status).toBe(429);
  const { "x-amzn-requestid": _id, "set-cookie": _cookie, ...forwarded } = headers;
  expect(Object.fromEntries(res.headers)).toEqual(forwarded);
});

test("the hook, the card and lib/weather.ts import nothing from Next.js", () => {
  for (const file of ["hooks/useWeather.ts", "components/WeatherCard.tsx", "lib/weather.ts"]) {
    expect(readFileSync(file, "utf8")).not.toMatch(/from\s+["']next[/"']/);
  }
});
