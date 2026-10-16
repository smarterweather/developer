// How the card reads a response and what it shows, shared by the hook, the
// card and the tests so all of them agree. Plain TypeScript with no imports.

// The parts of the GET /v1/weather response the card reads. A section is
// absent when it was not requested or its data was unavailable, and a
// reading can be null. The full shape: https://developers.smarterweather.com/api/weather/
export type Weather = {
  current?: { temperature: number | null; conditions: string };
  daily?: { high: number | null; low: number | null; conditions?: string }[];
  alerts?: { event: string }[];
  attribution?: { sources?: string[] };
};

export type CardError = { message: string; nextStep?: string };

type Problem = { detail?: unknown; title?: unknown; next_steps?: { recommended?: string } & Record<string, { href?: string }> };

// A 2xx JSON body is the weather. Anything else is an error: `<status>: ` and
// an RFC 9457 problem's detail with its recommended next step, or the first
// 200 characters of a body that is not a problem or not JSON.
export function readResponse(status: number, body: string): { data: Weather } | { error: CardError } {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {}
  const ok = status >= 200 && status < 300;
  if (ok && json && typeof json === "object") return { data: json as Weather };
  const problem = (!ok && json && typeof json === "object" ? json : {}) as Problem;
  const text = problem.detail || problem.title;
  if (typeof text !== "string") return { error: { message: `${status}: ${body.slice(0, 200)}` } };
  const next = problem.next_steps;
  return { error: { message: `${status}: ${text}`, nextStep: next?.recommended ? next[next.recommended]?.href : undefined } };
}

export type CardView = { temperature?: string; conditions?: string; today?: string; alert?: string; sources?: string };

// The card's lines, in order: 58°F, Partly Cloudy, "Today: Partly Cloudy,
// high 61°, low 45°", the first alert, "Data: <sources>". A missing section
// leaves its line out; a missing reading shows as --.
export function cardView({ current, daily, alerts, attribution }: Weather): CardView {
  const today = daily?.[0];
  return {
    temperature: current && `${degrees(current.temperature)}F`,
    conditions: current?.conditions,
    today: today && `Today: ${[today.conditions, `high ${degrees(today.high)}`, `low ${degrees(today.low)}`].filter(Boolean).join(", ")}`,
    alert: alerts?.[0]?.event,
    sources: attribution?.sources?.length ? `Data: ${attribution.sources.join(", ")}` : undefined,
  };
}

function degrees(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value)}°` : "--°";
}
