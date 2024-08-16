import './App.scss';
import { Toolbar } from './components/Toolbar.tsx';

function App() {
  // const [activeTool, setActiveTool] = useState(Tool.Line);
  // const [entities, setEntities] = useState<Entity[]>([]);
  // const [getActiveEntity(), setActiveEntity] = useState<Entity | null>(null);
  // const [shouldDrawCursor, setShouldDrawCursor] = useState(true);
  // const [debugEntities] = useState<Entity[]>([]);
  // const [angleStep, setAngleStep] = useState(45);
  // const [screenOffset, setScreenOffset] = useState<Point>(new Point(0, 0));
  // const [screenScale, setScreenScale] = useState<number>(1);
  // const [panStartLocation, setPanStartLocation] = useState<Point | null>(null);

  // computed
  // const worldMouseLocation = screenToWorld(
  //   screenMouseLocation,
  //   screenOffset,
  //   screenScale,
  // );

  // /**
  //  * Entity snap point or intersection
  //  */
  // const [snapPoint, setSnapPoint] = useState<SnapPoint | null>(null);
  //
  // /**
  //  * Snap point on angle guide
  //  */
  // const [snapPointOnAngleGuide, setSnapPointOnAngleGuide] =
  //   useState<SnapPoint | null>(null);
  //
  // /**
  //  * Snap points that are hovered for a certain amount of time
  //  */
  // const [hoveredSnapPoints, setHoveredSnapPoints] = useState<HoverPoint[]>([]);

  /**
   * Keep track of the hovered snap points
   */
  // useEffect(() => {
  //   const watchSnapPointTimerId = setInterval(() => {
  //     trackHoveredSnapPoint(
  //       snapPoint,
  //       hoveredSnapPoints,
  //       setHoveredSnapPoints,
  //       SNAP_POINT_DISTANCE / screenScale,
  //     );
  //   }, 100);
  //   return () => {
  //     clearInterval(watchSnapPointTimerId);
  //   };
  // }, [hoveredSnapPoints, snapPoint]);

  // /**
  //  * Redraw the canvas when the mouse moves or the window resizes
  //  */
  // useEffect(() => {
  //   const activeTool = getActiveTool();
  //   const angleStep = getAngleStep();
  //   const activeEntity = getActiveEntity();
  //   const entities = getEntities();
  //   const hoveredSnapPoints = getHoveredSnapPoints();
  //   const worldMouseLocation = getWorldMouseLocation();
  //   const screenScale = getScreenScale();
  //   const screenOffset = getScreenOffset();
  //   const shouldDrawCursor = getShouldDrawCursor();
  //   const debugEntities = getDebugEntities();
  //
  //   const context: CanvasRenderingContext2D | null | undefined =
  //     canvas?.getContext('2d');
  //   if (!context) return;
  //
  //   const drawInfo: DrawInfo = {
  //     context,
  //     canvasSize,
  //     worldMouseLocation: worldMouseLocation,
  //     screenMouseLocation: screenMouseLocation,
  //     screenOffset,
  //     screenZoom: screenScale,
  //   };
  //   let helperEntitiesTemp: Entity[] = [];
  //   let snapPointTemp: SnapPoint | null = null;
  //   let snapPointOnAngleGuideTemp: SnapPoint | null = null;
  //   if ([Tool.Line, Tool.Rectangle, Tool.Circle].includes(activeTool)) {
  //     // If you're in the progress of drawing a shape, show the angle guides and closest snap point
  //     let firstPoint: Point | null = null;
  //     if (
  //       activeEntity &&
  //       !activeEntity.getShape() &&
  //       activeEntity.getFirstPoint()
  //     ) {
  //       firstPoint = activeEntity.getFirstPoint();
  //     }
  //     const { angleGuides, entitySnapPoint, angleSnapPoint } = getDrawHelpers(
  //       entities,
  //       compact([
  //         firstPoint,
  //         ...hoveredSnapPoints.map(
  //           hoveredSnapPoint => hoveredSnapPoint.snapPoint.point,
  //         ),
  //       ]),
  //       worldMouseLocation,
  //       angleStep,
  //       SNAP_POINT_DISTANCE / screenScale,
  //     );
  //     helperEntitiesTemp = angleGuides;
  //     snapPointTemp = entitySnapPoint;
  //     snapPointOnAngleGuideTemp = angleSnapPoint;
  //     // setHelperEntities(angleGuides);
  //     // setSnapPoint(entitySnapPoint);
  //     // setSnapPointOnAngleGuide(angleSnapPoint);
  //   }
  //   draw(
  //     drawInfo,
  //     entities,
  //     debugEntities,
  //     helperEntitiesTemp,
  //     getActiveEntity(),
  //     snapPointTemp,
  //     snapPointOnAngleGuideTemp,
  //     hoveredSnapPoints,
  //     worldMouseLocation,
  //     shouldDrawCursor,
  //   );
  // }, [canvasRef, canvasSize, screenMouseLocation]);

  /**
   * Show the angle guides and closest snap point when drawing a shape
   */
  // useEffect(() => {
  //
  // }, [
  //   // getActiveEntity(),
  //   activeTool,
  //   angleStep,
  //   // entities,
  //   // hoveredSnapPoints,
  //   // screenMouseLocation,
  //   // screenOffset,
  //   // screenScale,
  //   worldMouseLocation,
  // ]);

  return (
    <div>
      <Toolbar />
    </div>
  );
}

export default App;
