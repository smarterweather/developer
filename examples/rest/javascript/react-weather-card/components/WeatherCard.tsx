"use client";

import { useWeather } from "../hooks/useWeather";

type Props = { location: string; endpoint?: string };

// <WeatherCard location="Boston, MA" />: the temperature and conditions now,
// today's forecast in one line, the first active alert and the data sources.
// Plain React: it works in any React app whose server has a route like
// app/api/weather/route.ts.
export function WeatherCard({ location, endpoint }: Props) {
  const { data, error, loading } = useWeather(location, { endpoint });
  const now = data?.current;
  const today = data?.daily?.[0];
  const alert = data?.alerts?.[0];

  return (
    <section aria-label={`Weather for ${location}`} style={styles.card}>
      <h2 style={styles.place}>{location}</h2>
      {loading && <p style={styles.muted}>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          {now && (
            <>
              <p style={styles.temperature}>{degrees(now.temperature)}F</p>
              <p style={styles.conditions}>{now.conditions}</p>
            </>
          )}
          {today && (
            <p>Today: {[today.conditions, `high ${degrees(today.high)}`, `low ${degrees(today.low)}`].filter(Boolean).join(", ")}</p>
          )}
          {alert && <p style={styles.alert}>{alert.event}</p>}
          <p style={styles.muted}>Data: {data.attribution.sources.join(", ")}</p>
        </>
      )}
    </section>
  );
}

const degrees = (value: number | null) => (value === null ? "--°" : `${Math.round(value)}°`);

const styles = {
  card: {
    fontFamily: "system-ui, sans-serif",
    boxSizing: "border-box",
    maxWidth: 320,
    padding: 20,
    borderRadius: 16,
    background: "linear-gradient(160deg, #3a7bd5, #6fb1fc)",
    color: "#fff",
    lineHeight: 1.4,
  },
  place: { margin: 0, fontSize: 18, fontWeight: 600 },
  temperature: { margin: "8px 0 0", fontSize: 56, fontWeight: 300 },
  conditions: { margin: 0, fontSize: 18 },
  alert: { padding: "6px 10px", borderRadius: 8, background: "rgba(180, 30, 30, 0.85)" },
  muted: { fontSize: 12, opacity: 0.85 },
} as const;
