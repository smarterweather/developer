import { useEffect, useState } from "react";
import { readResponse, type CardError, type Weather } from "../lib/weather";

export type WeatherState = { data?: Weather; error?: CardError; loading: boolean };

// Fetches `${endpoint}?location=...` from your own server route, which holds
// the key and calls the API. A new location or an unmount aborts the request,
// and a response that arrives after that is dropped.
export function useWeather(location: string, { endpoint = "/api/weather" } = {}): WeatherState {
  const [state, setState] = useState<WeatherState>({ loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    fetch(`${endpoint}?${new URLSearchParams({ location })}`, { signal: controller.signal })
      .then(async (res) => {
        const result = readResponse(res.status, await res.text());
        if (!controller.signal.aborted) setState({ ...result, loading: false });
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setState({ error: { message: err.message }, loading: false });
      });
    return () => controller.abort();
  }, [location, endpoint]);

  return state;
}
