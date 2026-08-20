# Map Generation Configuration Customization
This is a primer on modifying the `.config.yaml` files for map generation.

## Output File Format
- `output`: the file format of the final image.

At present, only SVG format is supported.

## Visual Styling
- `theme`: `light | dark`

Color theme of the map.

## Debug
- `debugMode`: `false | true`

Enables debug of the config file. Useful for troubleshooting. Default is `false`.

## Local Spreadsheet Settings
```
localFileConfig:
  # The local directory containing the SUCKit spreadsheet.
  # If using a relative path, the directory is interpreted to be relative to this project's main directory.
  directory: './data'
  # The filename of the SUCKit spreadsheet
  filename: '[VARIANT] - Sarna Unified Cartography Kit (Official).xlsx'
```

This code block allows for the config file to specify a custom spreadsheet to use for map generation. If no spreadsheet is specified, the script will fall back to the generic `Sarna Unified Cartography Kit (Official).xlsx` file.

## Eras
```
eras: # the eras to create images for - either a list of era indices (0-based), or empty for all eras
  - 26 # 3025
  #- 20 # 3050
  #- 30 # 3059d
  #- 38 # 3095
```

This allows for specifying a year, set of years, or full timeline map generation.

**NOTE:** If you add custom years to the spreadsheet, the index is going to be +1 from the previous year.

For example, the year `3025` is index `16` (line `26` on the `Systems Sheet Description` sheet). Adding a new column to the right of that on the `Systems` sheet for `3026` will mean that year will have index `17` instead of the year `3030`, as in the original SUCKit file. 

## Image Dimensions
- `width`: `1450`
- `height`: `1200`

Default values are `1450, 1200` for Inner Sphere maps.

## Map Layers
```
mapLayers: # the different layers showing maps
  - name: basemap # basemap layer
    mapUnitDimensions: # dimensions of the basemap (in map units)
      width: 1450
      height: 1200
    focus: # the focus point of the main map (in map units)
      point:
        x: 75
        y: -30
    elements:
      systems: true # display systems (as dots)
      systemLabels: true # display system names
      borders:
        - display: factions # first-level (faction) borders
          curveBorderEdges: true
          borderLabels: true # display border labels
        - display: regions # second-level (state/province) borders
          curveBorderEdges: true
        - display: regions # third-level (state/province) borders
          curveBorderEdges: true
```
These settings control what is displayed on the map. Set values to `false` to disable.

**NOTE:** By default, the following settings are used for map generation:
```
elements:
      systems: true # display systems (as dots)
      systemLabels: true # display system names
      borders:
        - display: factions # first-level (faction) borders
          curveBorderEdges: true
          borderLabels: true # display border labels
```

## Overlays
```
overlays: # other items on top of the map layers
  #- type: text # map title
  #  attributes: # attributes specific to this type of overlay
  #    text: '?'

  - name: sarna-logo
    type: svgElement # the sarna logo svg paths
    attributes: # attributes specific to this type of overlay
      cssTemplate: sarna-logo.css.tpl
      svgTemplate: sarna-logo.svg.tpl
      scale: 1.5
    position: # the logo's pixel position (top left point)
      x: 10
      y: 10
  - name: main-map-scale
    type: scale # a scale displaying the relation of pixels to map units
    attributes:
      pixelsPerMapUnit: 1
      max: 500 # maximum unit shown
      step: 100 # color change after this many units
      scaleHeight: 12
      labelsPosition: below
    position: # the scale's pixel position (top left point of the scale bar)
      x: 900
      y: 1140
  - name: main-map-scale-frame
    type: rectangle
    attributes:
      width: 500
      height: 12
      strokeWidth: 3
    position:
      x: 900
      y: 1140
```

