// @vitest-environment jsdom
// Renders <WeatherCard /> through the real route handler against the mock
// (run through _harness/with-mock.sh), then checks the error states with
// stubbed responses.
import { cleanup, render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, expect, test, vi } from "vitest";
import { GET } from "../app/api/weather/route";
import { WeatherCard } from "../components/WeatherCard";

const log = process.env.SMARTERWEATHER_CI_LOG;
if (!log || !process.env.SMARTERWEATHER_API_BASE) throw new Error("run through _harness/with-mock.sh");
const logLines = () => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const realFetch = globalThis.fetch;

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

test.each([
  [401, "application/problem+json", '{"title":"Unauthorized","detail":"Missing Authorization header."}', "401: Missing Authorization header."],
  [502, "text/html", "<html><body>502 Bad Gateway</body></html>", "502: <html><body>502 Bad Gateway</body></html>"],
  [504, "application/json", '{"message":"Endpoint request timed out"}', '504: {"message":"Endpoint request timed out"}'],
])("shows a %i from the route as an alert", async (status, type, body, shown) => {
  vi.stubGlobal("fetch", async () => new Response(body, { status, headers: { "content-type": type } }));
  render(<WeatherCard location="Boston, MA" endpoint="/weather" />);
  expect((await screen.findByRole("alert")).textContent).toBe(shown);
});

test("shows the first alert, a missing reading as --, and skips an absent section", async () => {
  const weather = {
    current: { temperature: null, conditions: "Snow" },
    alerts: [{ event: "Winter Storm Warning" }, { event: "Wind Advisory" }],
    attribution: { sources: ["NWS"] },
  };
  vi.stubGlobal("fetch", async () => Response.json(weather));
  render(<WeatherCard location="Denver, CO" />);
  expect(await screen.findByText("--°F")).toBeTruthy();
  expect(screen.getByText("Winter Storm Warning")).toBeTruthy();
  expect(screen.queryByText("Wind Advisory")).toBeNull();
  expect(screen.queryByText(/^Today:/)).toBeNull();
  expect(screen.getByText("Data: NWS")).toBeTruthy();
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

test("the hook and the component import nothing from Next.js", () => {
  for (const file of ["hooks/useWeather.ts", "components/WeatherCard.tsx"]) {
    expect(readFileSync(file, "utf8")).not.toMatch(/from\s+["']next[/"']/);
  }
});
