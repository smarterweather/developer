// @vitest-environment jsdom
// Renders <WeatherCard /> through the real route handler against the mock
// (run through _harness/with-mock.sh), then checks the error states, the
// missing-data states and the hook's requests with stubbed responses. The
// route's own failure handling is in route.test.ts.
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

test("today is the relative_day 0 row, not the overnight row before it", async () => {
  const body = {
    daily: [
      { relative_day: -1, high: null, low: 38, conditions: "Clear" },
      { relative_day: 0, high: 61, low: 45, conditions: "Partly Cloudy" },
    ],
  };
  vi.stubGlobal("fetch", async () => Response.json(body));
  render(<WeatherCard location="Boston, MA" />);
  expect(await screen.findByText("Today: Partly Cloudy, high 61°, low 45°")).toBeTruthy();
});

test.each(["", "   "])("an empty location (%j) stays idle and asks nothing", async (location) => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<WeatherCard location={location} />);
  await act(async () => {});
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByText("Loading…")).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
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

test("adds the location to an endpoint that already has a query", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: string) => {
    calls.push(input);
    return new Response("{}", { status: 500 });
  });
  render(<WeatherCard location="Denver, CO" endpoint="/my/weather?units=metric" />);
  await screen.findByRole("alert");
  expect(calls).toEqual(["/my/weather?units=metric&location=Denver%2C+CO"]);
});

test("the hook, the card and lib/weather.ts import nothing from Next.js", () => {
  for (const file of ["hooks/useWeather.ts", "components/WeatherCard.tsx", "lib/weather.ts"]) {
    expect(readFileSync(file, "utf8")).not.toMatch(/from\s+["']next[/"']/);
  }
});
