import { useEffect, useState } from "react";

// The parts of the GET /v1/weather response the card reads. A section is
// absent when it was not requested or its data was unavailable, and a
// reading can be null. The full shape: https://developers.smarterweather.com/api/weather/
export type Weather = {
  current?: { temperature: number | null; conditions: string };
  daily?: { high: number | null; low: number | null; conditions?: string }[];
  alerts?: { event: string }[];
  attribution: { sources: string[] };
};

export type WeatherState = { data?: Weather; error?: string; loading: boolean };

// Fetches `${endpoint}?location=...` from your own server route, which holds
// the key and calls the API. A new location or an unmount aborts the request.
export function useWeather(location: string, { endpoint = "/api/weather" } = {}): WeatherState {
  const [state, setState] = useState<WeatherState>({ loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    fetch(`${endpoint}?${new URLSearchParams({ location })}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}: ${problemText(await res.text())}`);
        setState({ data: await res.json(), loading: false });
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setState({ error: err.message, loading: false });
      });
    return () => controller.abort();
  }, [location, endpoint]);

  return state;
}

// Errors are RFC 9457 problems (JSON); anything else, such as a gateway's
// HTML page, is shown as its first 200 characters.
function problemText(body: string): string {
  try {
    const { detail, title } = JSON.parse(body);
    if (typeof (detail || title) === "string") return detail || title;
  } catch {}
  return body.slice(0, 200);
}
