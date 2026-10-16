# Weather tools in Claude Desktop

Adds the Smarter Weather MCP server to Claude Desktop through the
[`@smarterweather/mcp-weather`](https://www.npmjs.com/package/@smarterweather/mcp-weather)
bridge, then asks a question that uses the `find_best_window` tool.

## Set it up

1. In a project folder, put your key in `.env` and make sure `.env` is in
   `.gitignore`:

   ```bash
   npx -y @smarterweather/mcp-onboarding@latest login
   ```

   `login` writes `SMARTERWEATHER_API_KEY=...` to `./.env` (mode 0600) and
   prints only a key prefix. Or create the file yourself with a key from
   <https://developers.smarterweather.com/dashboard/api-keys>.

2. Merge [`claude_desktop_config.json`](./claude_desktop_config.json) into
   Claude Desktop's config (macOS:
   `~/Library/Application Support/Claude/claude_desktop_config.json`) and
   replace `/absolute/path/to/your/project/.env` with the path from step 1.
   Claude Desktop does not expand `${...}` variables, so the bridge reads the
   key from that file; the config itself never holds a key.

3. Restart Claude Desktop.

## Ask it

> When is the best 3-hour window in the next three days for a bike ride in
> Boulder, CO? I want it above 55°F, wind under 15 mph and under a 20% chance
> of rain.

Claude calls `find_best_window` with arguments like:

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
