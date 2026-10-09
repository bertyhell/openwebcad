# Canvas Drawing Application

This is a React-based canvas drawing application that allows users to draw various shapes, such as lines, rectangles, and circles, on a fullscreen canvas. The application also includes features for selecting and erasing shapes, as well as exporting the drawing as an SVG file.

![demo.gif](readme%2Fdemo.gif)

## DEMO: [https://bertyhell.github.io/openwebcad](https://bertyhell.github.io/openwebcad)

## Features

- Fullscreen canvas next to a collapsible tool sidebar (press `[` to toggle it)
- Drawing tools: Line, Rectangle, Circle, Image, Measurement, Fill
- Modify tools: Move, Copy, Scale, Rotate, Array copy (linear and radial), Join, Eraser, Align
- Zoom and pan (mouse wheel, middle mouse button, arrow keys, zoom tool)
- Undo and redo, including layer changes
- Layers: show/hide, lock, select all on a layer, move the selection to a layer
- Choose angle guides
- Draw with snap points for
  - endpoints
  - midpoints
  - intersections
  - circle centers
  - circle quadrants
- Selection tool to highlight and modify shapes
  - Use CTRL to toggle selection
  - Use SHIFT to add to the current selection
  - drag left, to select by intersecting
  - drag right, to select by containing
- Command line next to the cursor: type a tool shortcut (eg: `L`) or a value (eg: `100`, `10,20`, `@10,20`) and press ENTER
- Import images, SVG, DXF and JSON files
- Export to JSON, SVG, PNG and PDF
- The drawing is saved automatically in the browser
- Select line color, fill color and line thickness


### Possible future feature ideas (TODO) in order of likelihood
- Ellipses
- Regular polygons (pentagon, hexagon, etc)
- Explode polygons into lines
- Polygon circumference
- Polygon area
- Draw with snap points for
  - circle tangents
  - nearest point on line
  - prioritize certain snap points over others (eg: midpoint over nearest)
- Edit existing lines and circles by dragging endpoints/middle points
- Hatching
- gradient fills
- Import DWG files
- Export to DWG
- Export drawing to ASCII code
- Touch and pen input
- Light theme


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
