# Canvas Drawing Application

This is a React-based canvas drawing application that allows users to draw various shapes, such as lines, rectangles, and circles, on a fullscreen canvas. The application also includes features for selecting and erasing shapes, as well as exporting the drawing as an SVG file.

![demo.gif](readme%2Fdemo.gif)

## DEMO: [https://bertyhell.github.io/openwebcad](https://bertyhell.github.io/openwebcad)

## Features

### Drawing tools
- **Line**, **Polyline**: straight segments, single or connected
- **Rectangle**, **Polygon**: closed shapes with straight sides
- **Circle**, **Ellipse**, **Arc**: round shapes (arc by 3 points or center, radius and angle)
- **Spline**: smooth curve through points
- **Point**: a single marker
- **Text**: multi-line text
- **Image**: place a picture in the drawing
- **Dimension**: show the distance between two points
- **Hatch**: fill a closed area with a solid color
- **Boundary**: trace a closed outline around an area

### Modify tools
- **Move**, **Copy**: reposition or duplicate the selection
- **Rotate**, **Scale**, **Mirror**: turn, resize or flip the selection
- **Align**: match the selection to a target position and angle
- **Offset**: draw a parallel copy at a given distance
- **Array**: copy in a grid (linear) or around a center (radial)
- **Fillet**: round corners
- **Chamfer**: cut corners with a straight edge
- **Trim**: cut away the part of a shape up to the next shape
- **Extend**: lengthen a shape until it reaches another
- **Break**: split a shape in two at a point
- **Join**: connect separate lines and arcs into one polyline
- **Explode**: turn a polyline or group into separate segments
- **Stretch**: move part of a shape and keep the rest connected
- **Group**: combine shapes so they act as one
- **Erase**: delete the selection
- **Text edit**: change existing text
- **Measure**: place points along a shape at an interval

### Inquiry
- **Distance**: measure between two points
- **Area**: measure the area of a closed shape

### Selecting
- Click to select, `CTRL` to toggle, `SHIFT` to add
- Drag left to select everything touched, drag right to select everything fully inside
- Properties panel: change color, line width, layer and coordinates of the selection

### Precision
- Snap points: endpoints, midpoints, intersections, circle centers, quadrants and tangents, grid; each can be toggled
- Grid (`F7`) and snap to grid (`F9`)
- Angle guides while drawing
- Command line next to the cursor: type a command, alias or value (eg: `100`, `10,20`, `@10,-20`) and press ENTER
  - `L` line, `PL` polyline, `REC` rectangle, `C` circle, `A` arc, `POL` polygon, `EL` ellipse, `SPL` spline, `PO` point, `T` / `MT` text, `IAT` image, `H` hatch, `BO` boundary, `DLI` dimension
  - `M` move, `CO` / `CP` copy, `SC` scale, `RO` rotate, `MI` mirror, `O` offset, `AR` array, `PE` join, `F` fillet, `CHA` chamfer, `EX` extend, `TR` trim, `E` erase, `BR` break, `S` stretch, `X` explode, `G` group, `AL` align, `ED` text edit, `ME` measure
  - `DI` distance, `AA` area, `Z` zoom, `P` pan, `R` redraw, `SN` grid snap, `COL` color, `EXP` export, `EXPORTPDF`

### View and organization
- Zoom and pan: mouse wheel, `+` / `-`, `Home` to show the whole drawing, zoom tool, middle mouse button or `Space` + drag, arrow keys
- Layers: show/hide, lock, rename, color for new shapes, select all on a layer, move the selection to a layer
- Collapsible tool sidebar (`[`)
- Light and dark theme

### Files
- Import images, SVG, DXF (lines, circles, arcs, polylines, text and layers) and JSON
- Export to JSON, DXF, SVG, PNG and PDF
- Undo and redo
- The drawing is saved automatically in the browser


### Possible future feature ideas (TODO) in order of likelihood
- Angular, radial and diameter dimensions
- Draw with snap points for
  - nearest point on line
  - prioritize certain snap points over others (eg: midpoint over nearest)
- Edit existing lines and circles by dragging endpoints/middle points
- gradient fills
- Import DWG files
- Export to DWG
- Export drawing to ASCII code
- Touch and pen input


## Technologies Used

- TypeScript
- React
- XState
- HTML canvas
- SVG
- Tailwind CSS


## Demo
Visit https://bertyhell.github.io/openwebcad


## Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd <repository-directory>
    ```
   
2. Install dependencies:
   ```sh
   npm install
   ```

## Usage
Start the development server:
```sh
npm run dev
```

Open your browser and navigate to http://localhost:5173


## Development
Available Scripts
* `npm run dev`: Runs the app in development mode.
* `npm run build`: Type checks and builds the app for production.
* `npm run preview`: Runs the production build in a local server.
* `npm test`: Runs the unit tests once (`npm run test:watch` to keep watching).
* `npm run lint:ci`: Checks linting and formatting, like the CI pipeline does.
* `npm run format`: Formats the code.


## Project Structure
* src/: Contains the source code of the application.
  * tools/: One XState state machine per tool.
  * entities/: Lines, circles, arcs, ... that make up a drawing.
  * helpers/import-export-handlers/: File import and export.
  * components/sidebar/: The React sidebar.
* test/: Tests that replay recorded mouse interactions.
* public/: Contains assets that need to be accessible from the url. Like favicon.


## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any changes.  


## License
This project is licensed under the MIT License.
