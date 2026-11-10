<!-- Generated from the Smarter Weather data catalog. Do not edit by hand. -->

# Attribution

Smarter Weather sources data from the parties below. This file mirrors the
data sources on https://smarterweather.com/acknowledgements. Each product's
own source, license and attribution text are also returned by
`GET /v1/catalog` in its `source` object.

## Weather data

### National Oceanic and Atmospheric Administration (NOAA) and National Weather Service (NWS)

Observations, forecasts, model output, radar, satellite and alerts.

- License: Public domain (U.S. Government work)
- Attribution: Data provided by NOAA/NWS
- Terms: https://www.weather.gov/disclaimer

- License: Public domain (U.S. Government work)
- Attribution: NOAA Climate Prediction Center and NOAA NCEI climate indices
- Terms: https://www.weather.gov/disclaimer

### U.S. Environmental Protection Agency (EPA) AirNow

Air quality observations and forecasts.

- License: Public domain (U.S. Government work)
- Attribution: Air quality data provided by EPA AirNow
- Terms: https://www.epa.gov/web-policies-and-procedures/epa-disclaimers

### NASA Short-term Prediction Research and Transition Center (SPoRT)

Soil moisture analyses.

- License: Public domain (U.S. Government work)
- Attribution: Data provided by NASA SPoRT
- Terms: https://www.nasa.gov/nasa-brand-center/images-and-media/

### European Centre for Medium-Range Weather Forecasts (ECMWF)

AIFS AI model forecasts.

- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: Based on data and products of the European Centre for Medium-Range Weather Forecasts (ECMWF). © ECMWF, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: www.ecmwf.int. Values regridded and quantized by Smarter Weather; ECMWF accepts no liability.
- Terms: https://apps.ecmwf.int/datasets/licences/general/

## Map, reference data and distribution

### U.S. Census Bureau

Boundaries, places, and population and housing counts.

- License: Public domain (U.S. Government work)
- Attribution: Source: U.S. Census Bureau (TIGER/Line, decennial census, American Community Survey).
- Terms: https://www.census.gov/data/developers/about/terms-of-service.html

### Overture Maps Foundation

Places and building footprints.

- License: Community Data License Agreement Permissive, Version 2.0 (CDLA-Permissive-2.0)
- Attribution: Overture Maps Foundation, overturemaps.org. Places data available under CDLA Permissive 2.0.
- Terms: https://docs.overturemaps.org/attribution/

- License: Open Database License (ODbL) 1.0
- Attribution: © OpenStreetMap contributors, Overture Maps Foundation. Available under the Open Database License.
- Terms: https://docs.overturemaps.org/attribution/

### OpenStreetMap contributors

Map and geographic reference data.

- License: Open Database License (ODbL) 1.0
- Attribution: © OpenStreetMap contributors. Available under the Open Database License.
- Terms: https://www.openstreetmap.org/copyright

### Esri Community Maps contributors

Building footprints in the basemap, through Overture Maps.

- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: Esri Community Maps contributors. Available under CC BY 4.0.
- Terms: https://creativecommons.org/licenses/by/4.0/

### Microsoft Global ML Building Footprints

Building footprints and heights in the basemap, through Overture Maps.

- License: Open Database License (ODbL) 1.0
- Attribution: Global ML Building Footprints. Licensed by Microsoft under the Open Database License.
- Terms: https://opendatacommons.org/licenses/odbl/1-0/

### ESA WorldCover

Land cover in the basemap.

- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium
- Terms: https://creativecommons.org/licenses/by/4.0/

### NOAA Open Data Dissemination (NODD) on AWS

Bulk distribution of NOAA datasets.

- Attribution: NOAA data accessed through the NOAA Open Data Dissemination (NODD) program on AWS.
- Terms: https://registry.opendata.aws/collab/noaa/

Data has been modified by Smarter Weather. Where we use data available under the Open Database License, we will provide the derived database, or a description of how it was altered, on request: hello@smarterweather.com.

When you build on the Smarter Weather API or MCP server, you remain
responsible for complying with upstream license and attribution requirements
for any data you redistribute or display: show each source's attribution text
where its license requires it. See the Developer Terms at
https://developers.smarterweather.com/legal/terms.

## Open source libraries (developer-facing)

This repository will ship its own dependencies (SDKs, examples). Each package
documents its third-party licenses in its own `package.json`, `go.mod`, or
equivalent. Refer to those manifests for the exact list and versions.
