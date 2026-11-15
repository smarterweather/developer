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

Ocean polygons and place labels (10m), and the land/water mask behind the GOES true color night layer (10m land and lakes).

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
- Attribution: Reproduced with permission granted by the County of Allegan, Michigan. Some information has been provided subject to a non-exclusive, limited, and revocable license granted by the County of Allegan, Michigan.
- Attribution: Credited to Carson City. Carson City is not responsible for the accuracy of the information. Modifications were made without the involvement or knowledge of Carson City.
- Attribution: The City of Las Cruces Enterprise GIS makes no representation of any kind, including, but not limited to, warranties of merchantability or fitness for a particular purpose or use, nor are any such warranties to be implied with respect to the accuracy information/data presented on this map. Transfer, copies and/or use of information in this solution without the presentation of this disclaimer is prohibited.
- Attribution: Reproduced with permission granted by the County of Kent, Michigan. Some information has been provided subject to a non-exclusive, limited, and revocable license granted by the County of Kent, Michigan.
- Attribution: Reproduced with permission granted Muskegon County, Michigan. Some information has been provided subject to a non-exclusive, limited, and revocable license granted by Muskegon County, Michigan.
- Attribution: Copyright © 2026 SEMCOG. All Rights Reserved. Reproduction or Use Without Permission is Prohibited.
- Terms: https://github.com/openaddresses/openaddresses
- Obligation: required, on https://smarterweather.com/acknowledgements/
- Basis: OpenAddresses README: "Individual sources will have their own licenses"; each source's license applies.
- Sources:
  - Adair, IA
  - Adams County, Indiana GIS
  - Adams, CO (CC BY 4.0)
  - Adams, ID
  - Adams, IL
  - Adams, NE
  - Adams, OH
  - Adams, WI
  - Aitkin, MN
  - Albany, WY
  - Albuquerque, NM
  - Alcona, MI
  - Allen County, KS
  - Allen, IN
  - Allen, OH
  - Anderson County, KS
  - Anoka, MN
  - Antelope, NE
  - Antrim, MI
  - Arapahoe, CO
  - Archuleta, CO
  - Arenac, MI
  - Arthur, NE
  - Ashland, OH
  - Ashland, WI
  - Ashtabula, OH
  - Atchison County, KS
  - Athens, OH
  - Auglaize, OH
  - Aurora County, SD / Planning and Development District III
  - AZ statewide
  - Banner, NE
  - Bannock, ID
  - Barber County, KS
  - Barron, WI
  - Barry County Emergency Services E 9-1-1: [License](https://data-msdis.opendata.arcgis.com/maps/c22efafeed924bd8afea5ed24a265b13/about)
  - Barry, MI
  - Barton County, KS
  - Bates, MO
  - Bayfield, WI
  - Beadle, SD
  - Beaverhead, MT
  - Becker, MN
  - Belmont County GIS
  - Beltrami, MN
  - Bennett, SD
  - Benton, MN
  - Benzie County
  - Bernalillo County GIS Technology Section, Planning & Development Services
  - Berrien, MI
  - Big Horn, MT
  - Big Horn, WY
  - Bingham, ID
  - Blaine, ID
  - Blaine, MT
  - Blaine, NE
  - Blount, TN
  - Blue Earth, MN
  - Bon Homme, SD
  - Bond, IL
  - Bonner, ID
  - Bonneville County
  - Boone, IL
  - Boone, MO
  - Boone, NE
  - Bottineau, ND
  - Boulder, CO (CC BY 4.0)
  - Boundary, ID
  - Bourbon County, KS
  - Box Butte, NE
  - Box Elder, UT
  - Boyd, KY
  - Branch, MI
  - Bremer County GIS Department
  - Broadwater, MT
  - Broomfield, CO
  - Brown County, KS
  - Brown, IL
  - Brown, NE
  - Brown, OH
  - Brown, WI
  - Brule, SD
  - Buchanan, MO
  - Buffalo, NE
  - Buffalo, SD
  - Buffalo, WI
  - Bureau, IL
  - Burleigh, ND
  - Burt, NE
  - Butler, KS
  - Butler, NE
  - Butler, OH
  - Butte, SD
  - Cache County GIS
  - Calhoun, IL
  - Calumet County Wisconsin: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)
  - Campbell, KY
  - Campbell, SD
  - Campbell, WY
  - Canyon, ID
  - Carbon, MT
  - Carbon, WY
  - Caribou, ID
  - Carlton, MN
  - Carroll, IL
  - Carroll, OH
  - Carter, MT
  - Cascade, MT
  - Cass, MN
  - Cass, ND
  - Cass, NE
  - Cedar, IA
  - Cedar, NE
  - Cerro Gordo County, Iowa
  - Chaffee, CO
  - Champaign, IL
  - Champaign, OH
  - Charles Mix, SD
  - Chase, NE
  - Chautauqua County, KS
  - Chaves, NM
  - Cheatham County, Tennessee
  - Cherry, NE
  - Cheyenne County, Kansas
  - Cheyenne, CO
  - Cheyenne, NE
  - Chippewa, MN
  - Chippewa, WI
  - Chouteau, MT
  - Christian, IL
  - Churchill, NV
  - City of Arena, WI
  - City of Aurora, IL
  - City of Bismarck, ND
  - City of Bloomington, IN
  - City of Boise: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)
  - City of Boise, ID
  - City of Brentwood, TN
  - City of Cape Girardeau, MO
  - City of Carlsbad, NM
  - City of Centennial
  - City of Champaign, IL
  - City of Chattanooga, TN
  - City of Chicago, IL
  - City of Columbia, MO
  - City of Columbus, OH
  - City of Commerce City
  - City of Coopersville, MI
  - City of Denver Open Data Catalog: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
  - City of East Peoria
  - City of Erie, CO
  - City of Evanston, IL
  - City of Evansville, IN
  - City of Fargo, ND
  - City of Farmington, NM
  - City of Flagstaff, AZ
  - City of Flint, MI
  - City of Fort Collins, CO
  - City of Frederick, CO
  - City of Gilbert, AZ
  - City of Gillette GIS Division
  - City of Glendale
  - City of Grafton, ND
  - City of Grand Forks, ND
  - City of Greeley, CO
  - City of Indianapolis and Marion County - IndyGIS: [License](https://www.arcgis.com/home/item.html?id=8c7b0c217ba0406f9c8e269c40b50632)
  - City of Janesville, WI
  - City of Johnson City, TN
  - City of Joplin, MO
  - City of Kansas City, Missouri: [License](https://data.kcmo.org/terms)
  - City of Lawrence, KS
  - City of Lenexa, KS
  - City of Littleton, CO
  - City of Loveland, CO
  - City of Memphis, TN
  - City of Mesa, AZ
  - City of Milwaukee, WI
  - City of Monroe, MI
  - City of Moorhead, MN
  - City of Morgan, UT
  - City of Murfreesboro, TN
  - City of Naperville, IL
  - City of Nashville, TN
  - City of Ofallon, MO
  - City of Olathe, KS
  - City of Owensboro, KY
  - City of Perrysburg, OH
  - City of Perryville, MO
  - City of Provo, UT
  - City of Rochelle, IL
  - City of Rochester Hills
  - City of Salina, KS
  - City of Santa Fe, NM
  - City of Schaumburg, IL
  - City of Scottsdale, AZ
  - City of Sheridan, WY
  - City of Shorewood, WI
  - City of Sioux Falls, SD
  - City of Spring Hill, TN
  - City of St Louis, MO
  - City of Tecumseh, MI
  - City of Thornton, CO
  - City of Twin Falls, ID
  - City of Vail, CO
  - City of Waterloo, IA
  - City of West Bend, WI
  - City of West Peoria, IL
  - City of Westminster, CO
  - City of Wichita, KS
  - City of Wright, WY
  - City-County Planning Commission of Warren County, KY
  - City-of-ofallon, IL
  - Clark County GIS
  - Clark County Planning, Zoning, and Land Information
  - Clark, IL
  - Clark, NV
  - Clark, OH
  - Clay County, MN
  - Clay, NE
  - Clear Creek, CO
  - Clearwater County
  - Clearwater, MN
  - Clinton, OH
  - Cochise, AZ
  - Coconino County GIS
  - Codington, SD
  - Coffey County, KS
  - Cole County and City of Jefferson, Missouri (MidMoGIS)
  - Coles, IL
  - Columbia, WI
  - Columbiana, OH
  - Conejos, CO
  - Converse, WY
  - Cook, IL
  - Cook, MN
  - Coshocton County GIS Office
  - Cowley County, KS
  - Crawford County
  - Crawford County, KS
  - Crawford, OH
  - Crook, WY
  - Crow Wing, MN
  - Cumberland, IL
  - Cuming, NE
  - Custer, CO
  - Custer, ID
  - Custer, MT
  - Custer, NE
  - Cuyahoga, OH
  - Dakota, MN
  - Dakota, NE
  - Dallas, IA
  - Dane, WI
  - Daniels, MT
  - Darke, OH
  - Davidson, SD
  - Davidson, TN
  - Davison, SD
  - Dawson, MT
  - Dawson, NE
  - Day, SD
  - De Baca, NM
  - Deer Lodge, MT
  - Defiance, OH
  - Dekalb, IL
  - Delaware, IN
  - Delaware, OH
  - Delta, CO
  - Des Moines, IA
  - Deuel, NE
  - Deuel, SD
  - Dewitt, IL
  - Dickinson County, KS
  - Dickinson Engineering Department
  - Dixon, NE
  - Dodge, MN
  - Dodge, WI
  - Dolores, CO
  - Doña Ana County GIS Division
  - Dona Ana-2, NM
  - Doniphan County, KS
  - Door, WI
  - Douglas County GIS: [License](https://drive.google.com/file/d/0Bw1ZzvRYzwerakdRa1ludGtmdXc/view)
  - Douglas County, Colorado: [License](https://www.douglasco.gov/documents/open-data-guidelines.pdf/)
  - Douglas, IL
  - Douglas, KS
  - Douglas, MN
  - Douglas, NE
  - Douglas, NV
  - Douglas, SD
  - Douglas, WI
  - Dubuque, IA
  - Dupage, IL
  - Eagle, CO
  - Eaton, MI
  - Eau Claire, WI
  - Eddy, NM
  - Edgar, IL
  - Edmunds, SD
  - Edwards County, KS
  - Edwards, IL
  - Effingham, IL
  - El Paso, CO
  - Elbert, CO
  - Elk County, KS
  - Elko, NV
  - Emmet, MI
  - Erie, OH
  - Esri Community Maps Contributors; Aurora, CO
  - Esri Community Maps Contributors; Riley County, KS: [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
  - Eureka County
  - Fairfield, OH
  - Fall River, SD
  - Fallon, MT
  - Faribault, MN
  - Faulk, SD
  - Fayette, OH
  - Fergus, MT
  - Fillmore, NE
  - Flathead, MT
  - Fond Du Lac, WI
  - Forest, WI
  - Franklin County, KS
  - Franklin County, KY GIS
  - Franklin, ID
  - Franklin, NE
  - Franklin, OH
  - Franklin, TN
  - Freeborn, MN
  - Fremont, CO
  - Fremont, ID
  - Fremont, WY
  - Frontier, NE
  - Fulton, IL
  - Fulton, OH
  - Gage, NE
  - Gallatin, MT
  - Gallia, OH
  - Garden, NE
  - Garfield, CO
  - Garfield, MT
  - Garfield, NE
  - Geary County, KS
  - Geauga County Auditor
  - Genesee, MI
  - Gila, AZ
  - Gilpin County
  - GIS Services Division, Boone County Planning Commission
  - Glacier, MT
  - Golden Valley County, ND
  - Golden Valley, MT
  - Golden Valley, ND
  - Goodhue, MN
  - Goshen, WY
  - Gosper, NE
  - Governor's Office of Information Technology (Public Domain)
  - Grand Forks, ND
  - Grand Traverse County GIS Department
  - Grand, CO
  - Granite, MT
  - Grant County
  - Grant, MN
  - Grant, NE
  - Grant, SD
  - Greeley, NE
  - Green Lake, WI
  - Green, WI
  - Greene County GIS
  - Greene, IL
  - Greene, MO
  - Greenwood County, KS
  - Gregory, SD
  - Guernsey, OH
  - Gunnison, CO
  - Hamilton County, Indiana GIS Office
  - Hamilton, NE
  - Hamilton, OH
  - Hamilton, TN
  - Hamlin, SD
  - Hancock, OH
  - Hand, SD
  - Hanson, SD
  - Hardin County, Kentucky
  - Hardin, OH
  - Harlan, NE
  - Harper County, KS
  - Harrison, OH
  - Harvey County, KS
  - Hayes, NE
  - Helena, MT
  - Henderson County, Kentucky
  - Henderson, NV
  - Hennepin, MN
  - Henry, IL
  - Henry, OH
  - Highland, OH
  - Hill, MT
  - Hillsdale, MI
  - Hitchcock, NE
  - Hocking, OH
  - Holmes, OH
  - Holt, NE
  - Hooker, NE
  - Hot Springs, WY
  - Howard, NE
  - Hubbard, MN
  - Hughes County, SD / Planning and Development District III
  - Humboldt, NV
  - Huron, OH
  - Hutchinson, SD
  - IA statewide
  - ID statewide
  - Idaho, ID
  - IN statewide
  - Ingham, MI
  - Iron County 911 / SEMO Regional Planning Commission
  - Iron County, Wisconsin
  - Isanti, MN
  - Itasca, MN
  - Jackson County GIS
  - Jackson County, KS
  - Jackson County, SD / Planning and Development District III
  - Jackson, IL
  - Jackson, MI
  - Jackson, MN
  - Jackson, OH
  - Jackson, WI
  - Jasper, MO
  - Jefferson County, Colorado
  - Jefferson County, Kansas GIS Department
  - Jefferson, ID
  - Jefferson, MT
  - Jefferson, OH
  - Jefferson, TN
  - Jefferson, WI
  - Jerauld, SD
  - Jerome, ID
  - Jersey, IL
  - Johnson County AIMS
  - Johnson, IA
  - Johnson, NE
  - Jones, SD
  - Judith Basin, MT
  - Juneau, WI
  - Kalamazoo, MI
  - Kanabec, MN
  - Kandiyohi, MN
  - Kane, IL
  - Kankakee, IL
  - Kearney, NE
  - Kearny County, KS
  - Keith, NE
  - Kendall County GIS
  - Kenosha, WI
  - Kenton, KY
  - Kewaunee, WI
  - Keya Paha, NE
  - Kimball, NE
  - Kingman County, KS
  - Kingsbury, SD
  - Kittson, MN
  - Knox, IL
  - Knox, NE
  - Knox, OH
  - Koochiching, MN
  - Kootenai, ID
  - KS statewide
  - KY statewide
  - La Crosse County
  - La Plata, CO
  - Lafayette, WI
  - Lake County Mapping Department
  - Lake of the Woods, MN
  - Lake, IL
  - Lake, IN
  - Lake, MN
  - Lake, MT
  - Lake, OH
  - Lake, SD
  - Lancaster, NE
  - Lander, NV
  - Lane County, KS
  - Laramie, WY
  - Larimer, CO
  - Las Vegas, NV
  - Lasalle, IL
  - Latah, ID
  - Lawrence, IL
  - Lawrence, OH
  - Lawrence, SD
  - Le Sueur County GIS Department
  - Lea County, New Mexico
  - Lee County GIS
  - Lemhi, ID
  - Liberty, MT
  - Licking County GIS
  - Licking2, OH
  - Lincoln County, Nevada
  - Lincoln, MT
  - Lincoln, NE
  - Lincoln, NM
  - Lincoln, WI
  - Lincoln, WY
  - Linn County, KS
  - Logan, CO
  - Logan, IL
  - Logan, NE
  - Logan, OH
  - LOJIC (Louisville/Jefferson County Information Consortium): [License](https://www.lojic.org/data/liability-statement)
  - Lorain, OH
  - Los Alamos County GIS
  - Lucas County Auditor's Office, GIS Department
  - Luna, NM
  - Lyman, SD
  - Lyon County, NV Assessor's Office
  - Macomb County GIS
  - Macon, IL
  - Macoupin, IL
  - Madison County Assessor / SEMO Regional Planning Commission
  - Madison, ID
  - Madison, IL
  - Madison, IN
  - Madison, KY
  - Madison, MT
  - Madison, NE
  - Madison, OH
  - Mahnomen, MN
  - Mahoning, OH
  - Manitowoc, WI
  - MAP~GIS (McCracken County / City of Paducah GIS Consortium) (City of Paducah, KY)
  - MAP~GIS (McCracken County / City of Paducah GIS Consortium) (Mccracken, KY)
  - Marathon, WI
  - Maricopa, AZ
  - Marion County, IN
  - Marion County, KS
  - Marion, OH
  - Marquette, MI
  - Marquette, WI
  - Marshall County, Minnesota
  - Marshall, SD
  - Mason, IL
  - Mason, MI
  - Massac, IL
  - Maury, TN
  - Mccone, MT
  - Mcdonough, IL
  - Mchenry, IL
  - McKenzie County GIS
  - Mckinley, NM
  - McLean County GIS Consortium: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  - Mcleod, MN
  - Mcpherson, SD
  - Meade County, KS
  - Meade, KY
  - Meagher, MT
  - Medina, OH
  - Meigs, OH
  - Mellette, SD
  - Menard, IL
  - Mercer, OH
  - Merrick, NE
  - Mesa County GIS (CC BY)
  - MI statewide
  - Miami County Auditor, Ohio
  - Midland, MI
  - Mille Lacs, MN
  - Mills, IA
  - Milwaukee County Land Information Office
  - Miner, SD
  - Mineral, CO
  - Mineral, MT
  - Mineral, NV
  - Minnehaha, SD
  - Missoula, MT
  - MN statewide
  - MO statewide
  - Moffat County Assessor's Office
  - Mohave, AZ
  - Monroe County, Wisconsin
  - Monroe, MI
  - Monroe, OH
  - Montezuma, CO
  - Montgomery County Auditor's Office
  - Montgomery County, TN
  - Montrose, CO
  - Morgan, CO
  - Morgan, IL
  - Morgan, OH
  - Morrill, NE
  - Morrow, OH
  - Morton, ND
  - Moultrie, IL
  - MT statewide
  - Muskingum, OH
  - Musselshell, MT
  - Nance, NE
  - Natrona Regional Geospatial Cooperative (NRGC)
  - ND statewide
  - NE statewide
  - Nemaha County, KS
  - Nemaha, NE
  - New Mexico 911 (NM911) Program: [License](https://gstore.unm.edu/apps/rgis/datasets/8850b25e-e495-46b5-952d-0fa1fa129ada/metadata/FGDC-STD-001-1998.html)
  - Newaygo County
  - Nez Perce, ID
  - Niobrara, WY
  - NM911 Program
  - Noble, OH
  - Norman, MN
  - Nuckolls, NE
  - Nye, NV
  - Oakland County
  - Oconto, WI
  - OH statewide
  - Oldham County Planning and Development Services
  - Olmsted County, MN GIS Division
  - Oneida County, Wisconsin
  - Osage County, KS
  - Osage, MO
  - Otoe, NE
  - Ottawa County GIS
  - Ottawa, OH
  - Otter Tail, MN
  - Ouray, CO
  - Outagamie, WI
  - Ozaukee, WI
  - Park, CO
  - Park, MT
  - Park, WY
  - Paulding, OH
  - Pawnee County, KS
  - Pawnee, NE
  - Pendleton, KY
  - Pennington, MN
  - Pepin, WI
  - Perkins, NE
  - Perry, KY
  - Perry, OH
  - Pershing, NV
  - Petroleum, MT
  - Phelps, NE
  - Phillips, CO
  - Phillips, MT
  - Piatt, IL
  - Pickaway, OH
  - Pierce, NE
  - Pierce, WI
  - Pike, IL
  - Pike, OH
  - Pima, AZ
  - Pinal, AZ
  - Pitkin, CO
  - Platte, NE
  - Polk, IA
  - Polk, MN
  - Polk, NE
  - Polk, WI
  - Pondera, MT
  - Pope, MN
  - Portage, OH
  - Portage, WI
  - Porter County GIS
  - Post Falls, ID
  - Pottawatomie County, KS
  - Potter, SD
  - Powder River, MT
  - Powell, MT
  - Prairie, MT
  - Preble, OH
  - Pueblo, CO
  - Putnam, IL
  - Putnam, OH
  - Putnam, TN
  - Racine, WI
  - Randolph, IL
  - Ravalli, MT
  - Red Lake, MN
  - Red Willow, NE
  - Reno County, KS
  - Renville, MN
  - Rice County GIS
  - Richardson, NE
  - Richland, IL
  - Richland, MT
  - Richland, ND
  - Richland, OH
  - Richland, WI
  - Rio Blanco, CO
  - Rio Grande, CO
  - Roberts, SD
  - Rock Island, IL
  - Rock, NE
  - Rock, WI
  - Rolette, ND
  - Roosevelt, MT
  - Roseau, MN
  - Rosebud, MT
  - Ross, OH
  - Routt County GIS
  - Rush County, KS
  - Saguache, CO
  - Saline, NE
  - San Juan County, New Mexico
  - Sanborn, SD
  - Sanders, MT
  - Sandoval, NM
  - Sandusky, OH
  - Sangamon, IL
  - Sanmiguel, CO
  - Santa Cruz, AZ
  - Santa Fe, NM
  - Sarpy, NE
  - Sauk, WI
  - Schuyler, IL
  - Scioto, OH
  - Scott County Assessor / SEMO Regional Planning Commission
  - Scott County, KS
  - Scott, IA
  - Scott, KY
  - Scott, MN
  - SD statewide
  - Sedgwick, CO
  - SEMO GIS (Southeast Missouri Regional Planning Commission) / Perry County, Missouri: [License](https://semogis.com/maps/perry-county/)
  - Seneca County Auditor's Office
  - Sevier, TN
  - Seward, NE
  - Shawano, WI
  - Shawnee County, KS
  - Sheboygan, WI
  - Shelby County 911 District of Tennessee
  - Shelby County, Kentucky
  - Shelby, IL
  - Shelby, OH
  - Sherburne, MN
  - Sheridan, MT
  - Sheridan, NE
  - Sherman, NE
  - Sibley County GIS
  - Silverbow, MT
  - Sioux, ND
  - Sioux, NE
  - St Clair, IL
  - St Croix, WI
  - St Joseph, IN
  - St. Charles County Government
  - St. Clair County GIS
  - St. Francois County Assessor / SEMO Regional Planning Commission
  - St. Louis County GIS Service Center
  - St. Louis County Sheriff's Office 9-1-1 Communications Department; Pro-West & Associates; Spatial Focus, Inc; cities and townships of St. Louis County, MN
  - Stanley, SD
  - Stanton, NE
  - Stark County, ND
  - Stark, IL
  - Stark, OH
  - Stearns, MN
  - Steele Rural, MN
  - Steele Urban, MN
  - Stephenson, IL
  - Stevens, MN
  - Stillwater, MT
  - Storey, NV
  - Stutsman, ND
  - Sublette, WY
  - Sully, SD
  - Summit County
  - Summit County (Ohio) GIS
  - Sumner County, KS
  - Sweet Grass, MT
  - Sweetwater, WY
  - Swift, MN
  - Taney, MO
  - Tazewell, IL
  - Teller County GIS
  - Teton County, Idaho GIS
  - Teton, MT
  - Thayer, NE
  - Thomas County, KS
  - Thomas, NE
  - Thurston, NE
  - TN statewide
  - Todd, MN
  - Toledo, OH
  - Toole, MT
  - Torrance, NM
  - Town of Taos GIS
  - Traverse, MN
  - Treasure, MT
  - Trempealeau, WI
  - Tripp and Todd, SD
  - Troy, MI
  - Trumbull, OH
  - Turner, SD
  - Tuscarawas, OH
  - Union, OH
  - Utah Geospatial Reference Center (AGRC): [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
  - Utah UGRC: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  - Utah, UT
  - Valencia County Assessor's Office
  - Valley, ID
  - Valley, MT
  - Valley, NE
  - Van Wert, OH
  - Vanburen, MI
  - Vermilion, IL
  - Vernon County, Wisconsin
  - Vernon, MO
  - Vilas, WI
  - Vinton, OH
  - Wabaunsee County, KS
  - Wadena County
  - Walworth, WI
  - Ward, ND
  - Warren, IL
  - Warren, OH
  - Waseca County GIS: [License](https://www.wasecacounty.gov/164/GIS-Information)
  - Washburn, WI
  - Washington County 911 / SEMO Regional Planning Commission
  - Washington, CO
  - Washington, MN
  - Washington, OH
  - Washington, UT
  - Washington, WI
  - Washoe, NV
  - Washtenaw, MI
  - Waukesha County, Wisconsin
  - Waupaca County, Wisconsin: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)
  - Waushara, WI
  - Wayne, IL
  - Wayne, IN
  - Wayne, MI
  - Wayne, OH
  - Weber, UT
  - Webster, NE
  - Weld, CO
  - Weston, WY
  - Wheatland, MT
  - White Pine, NV
  - White, IL
  - Whiteside, IL
  - Wibaux, MT
  - Wilkin, MN
  - Will, IL
  - Williams, ND
  - Williams, OH
  - Williamson, IL
  - Williamson, TN
  - Winnebago, IL
  - Winnebago, WI
  - Wisconsin Department of Administration (Burnett, WI)
  - Wisconsin Department of Administration (Dunn, WI)
  - Wisconsin Department of Administration (Florence, WI)
  - Wisconsin Department of Administration (Iowa, WI)
  - Wisconsin Department of Administration (Langlade, WI)
  - Wisconsin Department of Administration (Marinette, WI)
  - Wisconsin Department of Administration (Menominee, WI)
  - Wisconsin Department of Administration (Price, WI)
  - Wisconsin Department of Administration (Rusk, WI)
  - Wisconsin Department of Administration (Sawyer, WI)
  - Wisconsin Department of Administration (Taylor, WI)
  - Wood County, Wisconsin: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0)
  - Wood, OH
  - Woodford, IL
  - WY statewide
  - Wyandot, OH
  - Yankton, SD
  - Yavapai, AZ
  - Yellow Medicine, MN
  - Yellowstone, MT
  - York, NE
  - Yuma, AZ
  - Yuma, CO
  - Ziebach, SD

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

### Pyspectral atmospheric correction look-up tables

Rayleigh scattering correction in GOES true color.

- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: Rayleigh correction tables: A. Dybbroe, R. Scheirer and M. Raspaud, Pyspectral atmospheric correction look-up tables (doi:10.5281/zenodo.1288441), CC BY 4.0, interpolated to the GOES ABI bands.
- Terms: https://creativecommons.org/licenses/by/4.0/
- Obligation: required, on https://smarterweather.com/acknowledgements/
- Basis: Zenodo record 1288441 (v1.0.1) is licensed CC-BY-4.0. CC BY 4.0 §3(a)(1): the creators, the licence and an indication of modification, which §3(a)(2) lets a page carry; the tables are interpolated in wavelength, so the credit says so.

### timezone-boundary-builder

Time zone boundaries.

- License: Open Database License (ODbL) 1.0
- Terms: https://github.com/evansiroky/timezone-boundary-builder
- Obligation: required, met by the OpenStreetMap credit
- Basis: Project README, Licenses: the data are ODbL 1.0 (derived from OpenStreetMap), so the OpenStreetMap credit covers them.

### U.S. Geological Survey (GNIS, PAD-US 4.1, GMTED2010)

Place codes (GNIS), park boundaries (PAD-US 4.1) and the terrain heights behind the GOES true color Rayleigh correction (GMTED2010).

- License: Public domain (U.S. Government work)
- Terms: https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
- Obligation: none
- Basis: 17 U.S.C. §105; the USGS copyrights and credits page asks that proper credit be given and PAD-US recommends a citation (requests).

### U.S. Geological Survey 3D Elevation Program (3DEP) seamless DEMs

Terrain relief (hillshade) in the basemap: the 1/3 and 1 arc-second seamless DEMs, read through USGS_Seamless_DEM_13.vrt and USGS_Seamless_DEM_1.vrt (both dated 2026-10-30) at https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/.

- License: Public domain (U.S. Government work)
- Terms: https://www.usgs.gov/3d-elevation-program/about-3dep-products-services
- Obligation: none
- Basis: 17 U.S.C. §105. The 3DEP products page: "All 3DEP products are available, free of charge and without use restrictions." The 1 arc-second layer also carries cells over Canada and Mexico that reached USGS from NRCan and INEGI ("Most of Canada and Mexico are also covered by the 1 arc-second dataset."); no credit there rests on the same USGS statement, so a later licence review starts from it.

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
