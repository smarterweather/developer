<!-- Generated from the Smarter Weather source record. Do not edit by hand. -->

# Attribution

Every data source Smarter Weather uses, with its license, its credit, what
the license or terms require (the obligation) and why (the basis). The
credits that are required are on https://smarterweather.com/acknowledgements/.
Each product's own source, license and attribution text are also returned
by `GET /v1/catalog` in its `source` object.

## Weather data

### CPC and NCEI Climate Indices

CPC and NCEI Climate Indices.

- License: Public domain (U.S. Government work)
- Attribution: NOAA Climate Prediction Center and NOAA NCEI climate indices
- Terms: https://www.weather.gov/disclaimer
- Obligation: none
- Basis: 17 U.S.C. §105: no copyright in works of the U.S. Government.

### European Centre for Medium-Range Weather Forecasts

ECMWF AIFS Single (AI deterministic model); ECMWF IFS (deterministic, 0.25 deg); ECMWF IFS ENS (50-member ensemble, 0.25 deg).

- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: Based on data and products of the European Centre for Medium-Range Weather Forecasts (ECMWF). © ECMWF, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: www.ecmwf.int. Values regridded and quantized by Smarter Weather; ECMWF accepts no liability.
- Terms: https://apps.ecmwf.int/datasets/licences/general/
- Obligation: required, with the data in API and MCP results and on https://smarterweather.com/acknowledgements/
- Basis: CC BY 4.0 §3(a)(1), including in modified form; §3(a)(2) lets a link to a page with the information satisfy it.

### Environmental Protection Agency

Air quality observations and forecasts (AirNow). AirNow Air Quality System.

- License: Public domain (U.S. Government work)
- Attribution: Air quality data provided by EPA AirNow
- Terms: https://www.epa.gov/web-policies-and-procedures/epa-disclaimers
- Obligation: required, on https://smarterweather.com/acknowledgements/
- Basis: AirNow Data Exchange Guidelines (last updated August 2025): "Credit should first be given ... in products", read conservatively. Credited on the acknowledgements page; API and MCP results carry no credit (public domain).

### National Aeronautics and Space Administration

SPoRT Land Information System.

- License: Public domain (U.S. Government work)
- Attribution: Data provided by NASA SPoRT
- Terms: https://www.nasa.gov/nasa-brand-center/images-and-media/
- Obligation: none
- Basis: 17 U.S.C. §105: no copyright in works of the U.S. Government.

### National Oceanic and Atmospheric Administration

Reference tables: NWS zones, counties and offices, NEXRAD and GHCN-D station lists, the METAR station table and the climate normals archive. Climate Prediction Center Outlooks; GOES ABI Satellite Imagery; GOES-19 Geostationary Lightning Mapper; Global Forecast System; High-Resolution Rapid Refresh; Hurricane Hunter Reconnaissance; MADIS Integrated Observations; Multi-Radar/Multi-Sensor System; NOAA 1991-2020 U.S. Climate Normals (Gridded); NOAA AI Global Ensemble Forecast System (AIGEFS); NOAA AI Global Forecast System (AIGFS); NOAA CPC UV Index Forecast; NWS HeatRisk; National Blend of Models; National Hurricane Center; Next Generation Weather Radar; Rapid Refresh Forecast System; Real-Time Mesoscale Analysis; Storm Prediction Center; Unrestricted Mesoscale Analysis; WPC Excessive Rainfall Outlook; Winter Storm Severity Index.

- License: Public domain (U.S. Government work)
- Attribution: Data provided by NOAA/NWS
- Terms: https://www.weather.gov/disclaimer
- Obligation: none
- Basis: 17 U.S.C. §105: no copyright in works of the U.S. Government.

## Map, reference data and distribution

### U.S. Census Bureau

Boundaries, places, ZIP codes, address ranges, population estimates and centers of population (TIGER/Line 2025 and Census files).

- License: Public domain (U.S. Government work)
- Attribution: Source: U.S. Census Bureau (TIGER/Line, decennial census, American Community Survey).
- Terms: https://www.census.gov/about/policies/citation.html
- Obligation: none
- Basis: 17 U.S.C. §105; the TIGER/Line 2025 documentation (§1.2) and the Bureau's citation page ask that the Census Bureau be cited (requests).

### ESA WorldCover

Land cover in the basemap (WorldCover 2021).

- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium
- Terms: https://creativecommons.org/licenses/by/4.0/
- Obligation: required, on https://smarterweather.com/acknowledgements/
- Basis: CC BY 4.0 §3(a)(1), §3(a)(2); the credit is the form ESA asks for (esa-worldcover.org/en/data-access; Product User Manual v2.0 §5.1-5.2).

### Esri Community Maps contributors

Building footprints, through Overture Maps, drawn in the basemap and counted in the block group building totals.

- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: Esri Community Maps contributors. Available under CC BY 4.0.
- Terms: https://creativecommons.org/licenses/by/4.0/
- Obligation: required, with the data in API and MCP results and on https://smarterweather.com/acknowledgements/
- Basis: CC BY 4.0 §3(a)(1), including in modified form; §3(a)(2) lets a link to a page with the information satisfy it.

### Foursquare OS Places

Points of interest, through Overture Maps Foundation places.

- License: Apache License, Version 2.0
- Attribution: Points of interest include Foursquare OS Places data. Copyright 2024 Foursquare Labs, Inc. All rights reserved. Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0. Foursquare data was transformed to the Overture schema, then filtered and reclassified by Smarter Weather. NOTICE: https://opensource.foursquare.com/places-notice-txt/
- Terms: https://www.apache.org/licenses/LICENSE-2.0
- Obligation: required, on https://smarterweather.com/acknowledgements/
- Basis: Overture places 2026-10-21.0 carries 1,109,358 US places whose primary dataset is Foursquare (sources[].license Apache-2.0); 47,261 of the 1,197,296 US places the POI filter admits are Foursquare-sourced (read 2026-11-11). docs.overturemaps.org/attribution (read 2026-11-12): "Data from Foursquare. Copyright 2024 Foursquare Labs, Inc. All rights reserved. Available under Apache 2.0. Foursquare data was transformed to the Overture schema. Changed: 2026-03-18. NOTICE.txt." Foursquare's notice (opensource.foursquare.com/places-notice-txt, read 2026-11-12) asks recipients to get a copy of the License, prominent notices of changes and the attribution preserved, and for an API recommends the notice in the developer documentation; Apache 2.0 §4(d) allows the documentation. The year is the one Overture transmits with the data; the live notice page shows 2026.

### Microsoft Global ML Building Footprints

Building footprints and heights, through Overture Maps, drawn in the basemap and counted in the block group building totals.

- License: Open Database License (ODbL) 1.0
- Attribution: Global ML Building Footprints. Licensed by Microsoft under the Open Database License.
- Terms: https://opendatacommons.org/licenses/odbl/1-0/
- Obligation: required, on https://smarterweather.com/acknowledgements/
- Basis: Microsoft licenses Global ML Building Footprints under CDLA-Permissive-2.0 (its repository's LICENSE and README), and CDLA §3.1 places no obligation on Results, so counts derived from the footprints owe nothing. Overture's attribution page (last updated 2026-05-15) lists the footprints under its ODbL buildings theme as "Global ML Building Footprints. Licensed by Microsoft under the Open Database License.", so the basemap, which draws them, keeps that credit on the acknowledgements page (ODbL 1.0 §4.3, read conservatively).

### U.S. DOT National Address Database

Address points.

- License: Public domain (U.S. Government work)
- Terms: https://www.transportation.gov/gis/national-address-database
- Obligation: required, met by the OpenAddresses credit
- Basis: DOT metadata states Rights "public", and Overture names a "National Address Database Access and Usage License" whose text is still under review; credited as required until it is read.

### Natural Earth

Ocean polygons and place labels (10m).

- License: Public domain (dedicated by its publisher)
- Terms: https://www.naturalearthdata.com/about/terms-of-use/
- Obligation: none
- Basis: Natural Earth terms of use: public domain; "Crediting the authors is unnecessary".

### NOAA Open Data Dissemination (NODD) on AWS

Bulk distribution of NOAA datasets.

- License: Public domain (U.S. Government work)
- Terms: https://registry.opendata.aws/collab/noaa/
- Obligation: none
- Basis: A distribution channel for NOAA public-domain data (17 U.S.C. §105); no license of its own.

### OpenAddresses

Address points.

- License: Per source (each source under its own license)
- Attribution: Addresses: OpenAddresses, Overture Maps Foundation and the U.S. DOT National Address Database, each source under its own license.
- Terms: https://github.com/openaddresses/openaddresses
- Obligation: required, on https://smarterweather.com/acknowledgements/
- Basis: OpenAddresses README: "Individual sources will have their own licenses"; each source's license applies.

### OpenStreetMap

Basemap tiles, civic points of interest and address points (Geofabrik North America extract).

- License: Open Database License (ODbL) 1.0
- Attribution: © OpenStreetMap contributors. Available under the Open Database License.
- Terms: https://www.openstreetmap.org/copyright
- Obligation: required, with the data in API and MCP results and on https://smarterweather.com/acknowledgements/
- Basis: ODbL 1.0 §4.3: a notice on a Produced Work used publicly; OSMF Attribution Guidelines (board 2021-06-25, revision 14786 of 2026-09-10).

### Overture Maps Foundation addresses

Address points that fill gaps in the other address sources.

- License: Per source (each source under its own license)
- Terms: https://docs.overturemaps.org/attribution/
- Obligation: required, met by the OpenAddresses credit
- Basis: docs.overturemaps.org/attribution: per source (NAD, CC BY 4.0 county and city sources, others); each source's license applies.

### Overture Maps Foundation buildings

Building footprints.

- License: Open Database License (ODbL) 1.0
- Attribution: © OpenStreetMap contributors, Overture Maps Foundation. Available under the Open Database License.
- Terms: https://docs.overturemaps.org/attribution/
- Obligation: required, with the data in API and MCP results and on https://smarterweather.com/acknowledgements/
- Basis: ODbL 1.0 §4.3: a notice on a Produced Work used publicly; OSMF Attribution Guidelines (board 2021-06-25, revision 14786 of 2026-09-10).

### Overture Maps Foundation places

Points of interest.

- License: Community Data License Agreement Permissive, Version 2.0 (CDLA-Permissive-2.0)
- Attribution: Overture Maps Foundation places data, available under CDLA-Permissive-2.0: https://cdla.dev/permissive-2-0/
- Terms: https://cdla.dev/permissive-2-0/
- Obligation: required, with the data in API and MCP results and on https://smarterweather.com/acknowledgements/
- Basis: CDLA-Permissive-2.0 §2.1: shared Data carries the agreement text, which the credit links. docs.overturemaps.org/attribution: CDLA-Permissive-2.0 for most sources, AllThePlaces CC0; Foursquare rows (Apache 2.0) are in the data and carry their own entry, `foursquare`.

### timezone-boundary-builder

Time zone boundaries.

- License: Open Database License (ODbL) 1.0
- Terms: https://github.com/evansiroky/timezone-boundary-builder
- Obligation: required, met by the OpenStreetMap credit
- Basis: Project README, Licenses: the data are ODbL 1.0 (derived from OpenStreetMap), so the OpenStreetMap credit covers them.

### U.S. Geological Survey (GNIS, PAD-US 4.1)

Place codes (GNIS) and park boundaries (PAD-US 4.1).

- License: Public domain (U.S. Government work)
- Terms: https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
- Obligation: none
- Basis: 17 U.S.C. §105; the USGS copyrights and credits page asks that proper credit be given and PAD-US recommends a citation (requests).

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
