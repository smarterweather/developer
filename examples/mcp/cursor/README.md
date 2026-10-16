# Weather tools in Cursor

Adds the Smarter Weather MCP server to a Cursor project through the
[`@smarterweather/mcp-weather`](https://www.npmjs.com/package/@smarterweather/mcp-weather)
bridge, then asks a question that uses the `find_best_window` tool.

## Set it up

1. In your project folder, put your key in `.env` and make sure `.env` is in
   `.gitignore`:

   ```bash
   npx -y @smarterweather/mcp-onboarding@latest login
   ```

   `login` writes `SMARTERWEATHER_API_KEY=...` to `./.env` (mode 0600) and
   prints only a key prefix. Or create the file yourself with a key from
   <https://developers.smarterweather.com/dashboard/api-keys>.

2. Copy [`mcp.json`](./mcp.json) to `.cursor/mcp.json` in the project.
   `envFile` loads `${workspaceFolder}/.env` into the bridge, which needs
   `"type": "stdio"`; the config itself never holds a key.

3. Reload Cursor and check that `smarterweather` is enabled under MCP
   settings.

## Ask it

> When is the best 3-hour window in the next three days for a bike ride in
> Boulder, CO? I want it above 55°F, wind under 15 mph and under a 20% chance
> of rain.

The agent calls `find_best_window` with arguments like:

```json
{
  "location": "Boulder, CO",
  "criteria": { "min_temperature": 55, "max_wind_speed": 15, "max_precipitation_probability": 20 },
  "hours": 72,
  "activity_duration_hours": 3
}
```

and answers with the matching daylight windows. The full tool list is
[`descriptors/mcp-tools.json`](../../../descriptors/mcp-tools.json); setup for
other clients is in [`docs/mcp-weather.md`](../../../docs/mcp-weather.md).

License: config [MIT](../../../LICENSE), prose [CC BY 4.0](../../../LICENSE-docs).
