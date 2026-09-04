# User Guide

These pages walk through the complete sonification workflow, from choosing data to generating final audio output.

## Quick Start

The Suite generally follows a 4-step process, each of which is given in more detail below: 

1. Choose your data
2. Optionally refine the data
3. Select a Style
4. Generate your sonification

The exception to this worflow is the Data Composer, details of which can be found below.

### Navigation

To go back to a previous step, click the corresponding step at the top of the page. Alternatively, use your browser's back button to go back.

## Step 1: Data

Select the data source you wish to sonify.

### Light Curves

These data are brightness versus time for individual stars (I.E. how a star's brightness changes over time), which are interesting for different types of variable stars or exoplanet transits.

You can choose from one of our suggested light curves (a plot of each can be accessed by clicking on the graph icon in the top left), or you can search for a star of your choice.

If searching, use the search bar to enter the common name or any identifier of a star. The Suite uses SIMBAD to resolve the identifier, so if you are struggling to find a light curve for a star that definitely exists, check on SIMBAD for an alternative identifier to use.

If the star you searched for was captured in the TESS or Kepler/K2 missions, a list of light curves will display. Click the 'View Plot' button on a row to see a light curve as a graph. When you have found a light curve you wish to sonify, click the Sonify button on that row.

### Constellations

These data contain various properties of the individual stars within specific constellations and asterisms (Right Ascension, Declination, apparent and absolute magnitudes, distances, colours, etc). 

Use the search bar (or click the arrow to see a drop-down menu) to find the constellation or asterism of interest, or click on one of the suggestions.

### Night Sky

These data contain information about all of the stars (above a magnitude limit) which are visible to an observer for a chosen location and time. These star data include magnitudes, colours, altitude and azimuth.

Click 'allow' on the browser location pop-up to allow the Suite to auto-detect your location, or enter your location manually using a place name or lat/long coordinates (the location search is quite granular, so don't be afraid to try smaller/more rural locations).

Select the orientation of your dome which is at the front (with respect to your speaker system). In other words, if the audience got a compass out, which direction would they be facing?

Enter the date and time for which you sonify the night sky (this is the same time zone as your chosen location).

## Step 2: Refine

Here you can optionally make edits to the data before sonifying. The refine options change depending on the data type.

### Light Curves

You can trim the start and end points of the light curve by dragging the slider or typing in the input boxes. This is useful if there is a gap in your light curve which you want to trim off.

You can also apply smoothing to the light curve using the second slider. This reduces noise in the signal (lots of little ups and downs) and leaves the more prominent features intact.

### Constellations

Choose whether to sonify only the stars that are typically included in the stick figure, or you can sonify an arbitrary number of stars inside the official constellation boundary lines. If using the boundaries, the number of stars you enter will choose the brightest stars within the constellation boundaries.