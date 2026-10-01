# 11. Car in the world

Second phase of the project. So far the car drove on a straight road drawn by hand; here we build a
whole **world**, with intersections, buildings, trees and road markings, drawn with an editor in
the browser. At the end the car from chapter 9 is brought into this world and learns to drive in
it.

For many chapters the code has nothing to do with the car: we start from scratch with graphs,
geometry and an editor. The two codebases come together only towards the end.

## One folder, many parts

Unlike chapters 1-10, this folder is not the snapshot of a single step: it contains all the parts
of the second phase, one after the other. The code always evolves in the same place and each part
is a series of commits; to see the state halfway through, just check out the commit that closes
that part.

| Part | What it adds |
|-------|---------------|
| 1. Spatial Graphs | Points, segments and a graph that holds them together |
| 2. Graph Editor | Mouse editor: add, connect, drag and delete points |
| 3. Dynamic Viewport | Zoom, panning the view, saving the graph |
| 4. Roads | Wide roads around the segments, with the borders joined at intersections |
| 5. Buildings And Trees | Buildings along the roads, trees in the free spaces |
| 6. Fake 3D | Buildings with roofs and layered trees, in perspective relative to the center of the view |
| 7. Markings | Toolbar and road markings on the lanes: stop, yield, crossings, parking spots, traffic lights, start and target |
| 8. Saving The World | Saving the whole world with markings and view, exporting and importing `.world` files |
| 9. Integration | Editor moved to `world/`, the cars from chapter 9 drive in the world saved by the editor |
| 10. OpenStreetMap | Roads imported from OpenStreetMap, one-way roads, buildings and trees drawn only near the view |
| 11. MiniMap | Minimap of the road network below the neural network, centered on the best car |

The style changes too: 3-space indentation, spaces around operators and commas, semicolons always
present.

## Part 1. Spatial Graphs

The world will be a network of roads, and a road network is a **graph**: intersections and bends
are the points, the stretches of road are the segments that connect them. Before drawing any
asphalt we need a data structure that can add and remove points and segments without creating
duplicates.

### Files

| File | What it does |
|------|---------|
| `index.html` | 600x600 canvas and an inline script with a test graph |
| `styles.css` | Black background, white title, grass-green canvas (`#2a5`) |
| `js/primitives/point.js` | `Point` class: coordinates, comparison, drawing as a circle |
| `js/primitives/segment.js` | `Segment` class: two points, comparison, drawing as a line |
| `js/math/graph.js` | `Graph` class: list of points and segments with the editing operations |

The `primitives` and `math` folders anticipate the structure that will grow in the following
chapters: geometric shapes on one side, logic on the other.

### Point and Segment

```js
equals(point) {
   return this.x == point.x && this.y == point.y;
}
```

Two points are equal if they have the same coordinates, not if they are the same object. That's
what an editor needs: clicking twice on the same spot must give a single point.

A segment is equal to another if it contains both of its endpoints:

```js
equals(seg) {
   return this.includes(seg.p1) && this.includes(seg.p2);
}
```

Order doesn't matter, so A→B and B→A are the same segment: the graph is **undirected**, a road can
be driven in both directions.

Both classes have a `draw(ctx, ...)` with a default size and color (`size = 18` for points,
`width = 2` for segments), so the graph draws without passing parameters but the editor will be
able to highlight a point by changing its color.

### Graph

The graph is just two arrays, `points` and `segments`, with the operations to modify them:

| Method | What it does |
|--------|---------|
| `addPoint` / `addSegment` | Adds without checks |
| `tryAddPoint` / `tryAddSegment` | Adds only if it doesn't already exist, returns `true` or `false` |
| `containsPoint` / `containsSegment` | Searches with `equals`, not by reference |
| `removePoint` | Removes the point and all the segments touching it |
| `removeSegment` | Removes only the segment |
| `getSegmentsWithPoint` | Segments that have that point as an endpoint |
| `dispose` | Empties everything |

`tryAddSegment` also discards degenerate segments, the ones whose two endpoints coincide:

```js
if (!this.containsSegment(seg) && !seg.p1.equals(seg.p2)) {
```

`removePoint` first removes the connected segments and then the point. The other way round, there
would be segments left hanging on a vertex that no longer exists, and the drawing would show lines
ending in the void.

`dispose` empties the arrays with `length = 0` instead of assigning new ones: whoever held a
reference to `graph.points` sees the empty array, instead of keeping looking at the old one.

`draw` draws all the segments first and then all the points, so the circles cover the ends of the
lines.

### index.html

```js
myCanvas.width = 600;
myCanvas.height = 600;

const ctx = myCanvas.getContext("2d");
```

As in chapter 10, no `getElementById`: `myCanvas` exists as a global variable because the browser
creates one for every element with an `id`.

The inline script creates four points and four segments, puts them in a `Graph` and draws it. The
`#controls` div below the canvas is still empty: it will host the editor's buttons.

### How to try it

Open `index.html`: four black points connected by four lines appear on a green canvas. There's no
interaction yet; to play with the graph you can call `graph.tryAddPoint(new Point(300, 500))` or
`graph.removePoint(graph.points[0])` from the console, then `ctx.clearRect(0, 0, 600, 600)` and
`graph.draw(ctx)` to redraw.

## Part 2. Graph Editor

Building the graph by hand in code doesn't scale: to draw a city you need an editor. This part
adds a class that listens to the mouse on the canvas and modifies the graph, plus the animation
loop that redraws it every frame.

### Files

| File | What changes |
|------|-------------|
| `js/primitives/point.js` | `draw` accepts `outline` and `fill` to highlight a point |
| `js/primitives/segment.js` | `draw` accepts `dash` for dashed lines |
| `js/math/utils.js` | New: `distance` and `getNearestPoint` |
| `js/graphEditor.js` | New: `GraphEditor` class |
| `index.html` | Creates the editor and starts the `animate()` loop |

### Drawing options

```js
draw(ctx, { size = 18, color = "black", outline = false, fill = false } = {})
```

The parameters are passed in an object with destructuring and default values, instead of by
position. The caller writes only what it needs, `point.draw(ctx, { fill: true })`, and the final
`= {}` allows passing nothing at all. The editor uses `fill` for the point under the mouse,
`outline` for the selected one and `dash: [3, 3]` for the segment being traced.

`Segment.draw` calls `setLineDash([])` at the end: the canvas context is shared state, and without
the reset all the segments drawn afterwards would stay dashed.

### getNearestPoint

```js
function getNearestPoint(loc, points, threshold = Number.MAX_SAFE_INTEGER) {
```

It looks for the point closest to `loc`, but only within `threshold`. The editor passes 10 pixels:
the mouse "snaps" to a point when it passes near it, without having to hit it exactly.

### GraphEditor

The editor keeps four pieces of state:

| Field | Meaning |
|-------|-------------|
| `mouse` | Current mouse position, as a `Point` |
| `hovered` | Point within 10 px of the mouse, or `null` |
| `selected` | Last selected point, where the next segment starts from |
| `dragging` | `true` while dragging the selected point |

The event handlers only update the state; `display()` draws it. The commands:

| Action | Effect |
|--------|---------|
| Left click on empty space | Creates a point, connects it to the selected one and selects it |
| Left click on a point | Connects it to the selected one, selects it and starts dragging |
| Drag | Moves the selected point |
| Right click with a point selected | Deselects |
| Right click on a point, with no selection | Deletes the point and its segments |

The connection happens in `#select`: if there's already a selected point, it tries to add a
segment to the new one. `tryAddSegment` discards duplicates and segments from a point to itself, so
the editor doesn't have to check for them.

Moving a point also moves the segments touching it, because a `Segment` holds references to the
`Point` objects and not copies of the coordinates.

The `contextmenu` listener with `preventDefault()` stops the browser from opening its menu on right
click.

In `display()` the dashed segment is drawn with `this.ctx` and not with the global `ctx` from
`index.html`: the class uses only the canvas it receives in the constructor.

### index.html

```js
function animate() {
   ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
   graphEditor.display();
   requestAnimationFrame(animate);
}
```

The same pattern as the car in the previous chapters: clear, draw, request the next frame. The loop
lives outside the editor because later on it will draw other things too.

### How to try it

Open `index.html` and draw: every click on empty space adds a point connected to the previous one,
the dashed line shows the segment that would be created. Right click to break the chain, then click
on an existing point to start again from there. Drag the points to move them and right click on a
point to delete it.

## Part 3. Dynamic Viewport

A city doesn't fit in 600x600 pixels. This part separates **world** coordinates from **screen**
coordinates: the graph stays where it is, and it's the view that zooms out or moves. On top of
that, the graph survives a page reload.

### Files

| File | What changes |
|------|-------------|
| `js/viewport.js` | New: `Viewport` class, zooming and panning the view |
| `js/math/utils.js` | Vector operations: `add`, `subtract`, `scale` |
| `js/graphEditor.js` | Receives the viewport instead of the canvas; new `dispose()` |
| `js/math/graph.js` | New `Graph.load` to rebuild a saved graph |
| `index.html` | 🗑️ and 💾 buttons, loading from `localStorage` |

### Viewport

The viewport keeps three values:

| Field | Meaning |
|-------|-------------|
| `zoom` | How much world fits in one pixel: 1 at the start, up to 5 when zooming out |
| `center` | Center of the canvas, around which the zoom happens |
| `offset` | Displacement of the view in the world |

Before every frame `reset()` brings the context back to a clean state and applies the
transformations:

```js
this.ctx.restore();
this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
this.ctx.save();
this.ctx.translate(this.center.x, this.center.y);
this.ctx.scale(1 / this.zoom, 1 / this.zoom);
const offset = this.getOffset();
this.ctx.translate(offset.x, offset.y);
```

Canvas transformations accumulate, so without `restore()` every frame would zoom on top of the
previous one. The `restore()`/`save()` pair goes back to the original state and saves it again,
ready for the next frame.

The initial `offset` is `-center`: it cancels the first translation, so at startup the world origin
coincides with the top-left corner of the canvas.

`getMouse` goes the opposite way, from screen pixels to world coordinates. The editor uses it in
place of `offsetX`/`offsetY`, otherwise after a zoom the points would appear far from the cursor.
For the same reason the snapping threshold becomes `10 * zoom`: it stays 10 pixels on screen even
when the view zooms out.

### Panning the view

With the middle button pressed the viewport records a drag in `drag`:

- `mousedown` saves the starting point;
- `mousemove` updates `drag.offset`, the difference between the current point and the start;
- `mouseup` adds `drag.offset` to `offset` and resets the drag.

`getOffset()` returns `offset + drag.offset`, so the view follows the mouse already during the
drag. The editor calls `getMouse(evt, true)` to subtract the ongoing displacement and get the real
position in the world.

Viewport and editor listen to the same events on the same canvas but split the buttons between
them: the middle one moves the view, left and right modify the graph.

### Saving and loading

```js
function save() {
   localStorage.setItem("graph", JSON.stringify(graph));
}
```

Saving is one line, loading isn't: `JSON.parse` returns plain objects without the class methods,
and each segment contains a copy of its endpoints instead of a reference. `Graph.load` first
recreates the `Point`s, then connects each segment to the points just created by looking them up
with `equals`. This way points and segments go back to sharing the same objects, and dragging a
point still moves its segments.

The 🗑️ button calls `graphEditor.dispose()`, which empties the graph and also resets `selected`
and `hovered`: without the reset the next click would connect a point that no longer exists. The
saved graph stays in `localStorage` until 💾 is pressed again.

### Notes

The wheel event is `wheel` and not `mousewheel`, which isn't standard and never arrives in Firefox.

### How to try it

Open `index.html` and draw a graph. With the wheel the view zooms out, with the middle button it
moves; in both cases new points must appear under the cursor. Press 💾, reload the page and the
graph is still there. 🗑️ clears it from the canvas.

Without a mouse with a middle button, for example with just a trackpad, the view can zoom out but
not move.

## Part 4. Roads

So far a segment was a 2-pixel line. Here it becomes a road: a band of asphalt 100 units wide with
rounded ends, a dashed center line and white borders. The graph stays the skeleton, the road is
built around it.

### Files

| File | What changes |
|------|-------------|
| `js/primitives/polygon.js` | New: `Polygon` class, drawing, union, containment test |
| `js/primitives/envelope.js` | New: `Envelope` class, the polygon around a segment |
| `js/world.js` | New: `World` class, generates and draws the roads from the graph |
| `js/math/utils.js` | `average`, `translate`, `angle`, `getIntersection`, `lerp`, `getRandomColor` |
| `index.html` | Creates the `World` and draws it below the editor |

### Polygon

A polygon is a list of points; the constructor also creates the sides, connecting each point to
the next and the last to the first (`points[i % points.length]`). `draw` fills and outlines the
shape with `fill`, `stroke` and `lineWidth`, with the same options style as `Point` and `Segment`.

### Envelope

```js
const alpha = angle(subtract(p1, p2));
const alpha_cw = alpha + Math.PI / 2;
const alpha_ccw = alpha - Math.PI / 2;
```

`alpha` is the direction of the segment. Around `p1` the envelope traces half a circle of radius
`width / 2` from `alpha_ccw` to `alpha_cw`, around `p2` the same half circle rotated by 180°.
Joining the points of the two semicircles gives a capsule. `roundness` is the number of steps per
semicircle: with 1 the ends are flat, with 10 they look round.

`translate(loc, angle, offset)` moves a point by `offset` in the direction `angle`, with cosine and
sine: the same calculation as the sensor rays in the car chapters.

### World

```js
generate() {
   this.envelopes.length = 0;
   for (const seg of this.graph.segments) {
      this.envelopes.push(
         new Envelope(seg, this.roadWidth, this.roadRoundness)
      );
   }

   this.roadBorders = Polygon.union(this.envelopes.map((e) => e.poly));
}
```

One envelope per segment, then the union of their outlines. `draw` draws, in this order, the
asphalt (`#BBB`), the dashed center line over the graph's segments and finally the white borders.

### Joining the outlines

Two capsules that cross overlap, and drawing their outlines would show white lines in the middle of
the intersection. `Polygon.union` keeps only the outer part:

1. `multiBreak` takes each pair of polygons and, with `break`, splits the sides where they cross:
   the crossing point becomes the shared endpoint of two new segments, one per polygon;
2. for each segment of each polygon `union` checks whether it lies inside another polygon, and in
   that case discards it;
3. what's left are the segments of the outer perimeter, which become `roadBorders`.

After the split each segment is entirely inside or entirely outside, so `containsSegment` tests
only its midpoint. `containsPoint` uses **ray casting**: it traces a segment from the point to
`(-1000, -1000)` and counts how many sides of the polygon it crosses. An odd number means the point
is inside.

`getIntersection` is the parametric formula already used for the sensors; it also returns
`offset`, the position of the crossing along the first segment. `break` ignores crossings with
offset 0 or 1, which fall on an existing vertex: splitting there would create zero-length segments.

`drawSegments` isn't used by the world: it colors each side of a polygon with `getRandomColor` and
it's handy to see at a glance where `break` split.

### index.html

```js
viewport.reset();
world.generate();
world.draw(ctx);
ctx.globalAlpha = 0.3;
graphEditor.display();
```

The world is drawn below, the editor on top with transparency. `globalAlpha` is never set back to
1 because the `restore()` in `viewport.reset()` takes care of it on the next frame.

### Limits

- `world.generate()` runs every frame, and the union compares each polygon with all the others:
  with a few dozen roads the page slows down. Part 5 regenerates the world only when the graph
  changes.
- The starting point of the ray casting is fixed at `(-1000, -1000)`: if a polygon contained it,
  the test would be wrong. With hand-drawn graphs it doesn't happen.

### How to try it

Open `index.html` and draw a cross or T intersection. The roads are gray with the dashed center
line, and the white borders go around the intersection without crossing it. Dragging a point
recomputes the roads in real time.

## Part 5. Buildings And Trees

Roads alone don't make a city. This part fills the world: rows of buildings parallel to the roads
and trees scattered in the spaces left free. Everything is generated from the graph, without
drawing anything by hand.

### Files

| File | What changes |
|------|-------------|
| `js/math/graph.js` | `hash()`, to know when the graph has changed |
| `js/math/utils.js` | `dot`, `normalize`, `magnitude`; threshold in `getIntersection` |
| `js/primitives/segment.js` | `length`, `directionVector`, `projectPoint`, `distanceToPoint` |
| `js/primitives/polygon.js` | `distanceToPoint`, `distanceToPoly`, `intersectsPoly` |
| `js/world.js` | Parameters and generation of buildings and trees |
| `index.html` | Regenerates the world only if the graph changes |

### Regenerating only when needed

```js
let oldGraphHash = graph.hash();
...
if (graph.hash() != oldGraphHash) {
   world.generate();
   oldGraphHash = graph.hash();
}
```

`hash()` is `JSON.stringify(this)`: not a real hash, but two equal graphs give the same string.
Serializing the graph every frame costs much less than redoing polygon unions, and zooming and
panning the view don't touch it at all. It's also needed for the trees: they are generated at
random, and without this check they would change place every frame.

### Nearly parallel segments

```js
const eps = 0.001;
if (Math.abs(bottom) > eps) {
```

In `getIntersection` the denominator `bottom` is zero when the two segments are parallel. With
floating point numbers, though, nearly parallel segments give tiny but nonzero values, and dividing
by those values produces intersections that don't exist. With buildings it happens often, because
they come from outlines parallel to the roads.

### Distances

To keep buildings and trees at the right distance from everything else we need distance measures:

- `projectPoint` projects a point onto the segment's line with the dot product (`dot`) and also
  returns `offset`, the position along the segment from 0 to 1;
- `distanceToPoint` uses the projection if it falls inside the segment, otherwise the distance
  from the nearest endpoint;
- `Polygon.distanceToPoint` is the minimum over the distances from the sides, `distanceToPoly` the
  minimum over the vertices of the other polygon;
- `intersectsPoly` checks whether two polygons have sides that cross.

### Buildings

`#generateBuildings` works in four steps:

1. **guides**: for each segment it creates an envelope as wide as road, building and two spacing
   gaps, and joins the outlines with `Polygon.union`. The result runs parallel to the roads, at the
   right distance to lay the buildings against it. Guides shorter than `buildingMinLength` are
   discarded;
2. **supports**: each guide is divided into the maximum number of pieces at least
   `buildingMinLength` long, separated by `spacing`. The length of the pieces is stretched to fill
   the guide with no leftovers;
3. **bases**: each support becomes a rectangle `buildingWidth` wide, that is an `Envelope` with
   `roundness` 1;
4. **cleanup**: where two guides meet the buildings overlap, so for each pair the second is
   discarded if it touches the first or is closer to it than `spacing`.

| Parameter | Default | Meaning |
|-----------|---------|-------------|
| `buildingWidth` | 150 | Depth of the buildings |
| `buildingMinLength` | 150 | Minimum length of a building |
| `spacing` | 50 | Distance between buildings and between buildings and road |

### Trees

`#generateTrees` uses **rejection sampling**: it picks random points inside the rectangle that
encloses roads and buildings and keeps only those that respect three rules:

1. not inside a road or a building, nor closer than half a tree to either of them;
2. not closer than one tree to another tree;
3. not farther than two trees from any road or building, to avoid trees isolated in the middle of
   nowhere at the edges.

The loop stops after 100 failed attempts in a row: `tryCount` goes back to zero at every accepted
tree, so it carries on as long as there's room and stops when only holes that are too small are
left.

A tree is a `Point` drawn with `size: 160` and a semi-transparent black.

### How to try it

Open `index.html` and draw a small neighborhood. Along the roads blue rectangles appear, the
buildings, and in the free spaces dark circles, the trees. Dragging a point regenerates the world
and the trees change position; zooming and panning the view don't touch anything.

## Part 6. Fake 3D

The world stays a 2D drawing seen from above, but buildings and trees gain height: they lean away
from the center of the screen, like in an aerial photo taken with a wide-angle lens. No WebGL and
no projection matrices, just polygons drawn in the right order.

### Files

| File | What changes |
|------|-------------|
| `js/items/building.js` | New: building with walls, ceiling and a gable roof |
| `js/items/tree.js` | New: tree made of stacked levels |
| `js/math/utils.js` | `getFake3dPoint`, `lerp2D` |
| `js/primitives/polygon.js` | `join` option in `draw` |
| `js/world.js` | Buildings and trees as objects, drawn from the farthest |
| `index.html` | Passes the viewpoint to `world.draw` |

### The viewpoint

```js
const viewPoint = scale(viewport.getOffset(), -1);
world.draw(ctx, viewPoint);
```

The viewport offset is the translation applied to the canvas, that is the opposite of the world
point framed at the center of the screen. Flipping its sign gives that point: that's where the
camera "looks" from.

### Fake 3D

```js
function getFake3dPoint(point, viewPoint, height) {
   const dir = normalize(subtract(point, viewPoint));
   const dist = distance(point, viewPoint);
   const scaler = Math.atan(dist / 300) / (Math.PI / 2);
   return add(point, scale(dir, height * scaler));
}
```

The point at the top of an object of height `height` is moved in the direction opposite to the
`viewPoint`. The displacement grows with the distance: at the center of the screen it's zero and
the object is seen straight from above. The arctangent makes it approach `height` without ever
exceeding it, so at the edges the roofs don't shoot off.

### Buildings

`Building` wraps the base generated in Part 5, a rectangle of four points, and draws it in layers:

1. the **base**, with a wide semi-transparent border that acts as a shadow;
2. the **walls**, one quadrilateral per side between base and ceiling;
3. the **ceiling**, the base projected at 60% of the height;
4. the **roof**: two slopes rising from the long sides of the ceiling up to the ridge. The ridge is
   the projection, at full height, of the midpoints of the short sides of the base.

Walls and slopes are sorted from the farthest to the nearest to the `viewPoint`, so the ones in
front cover the ones behind.

For the roof edges `Polygon.draw` now accepts `join` (the canvas `lineJoin`). The default
`"miter"` has to be set on every call: the context state is shared, and a `"round"` left over from
a roof would end up on everything drawn afterwards.

### Trees

`Tree` draws seven levels from the center to the projected top, interpolating with `lerp2D`. Going
up, each level shrinks from `size` to 40 and goes from dark green to light green.

The outline of each level is jagged with deterministic noise:

```js
const kindOfRandom = Math.cos(((a + this.center.x) * size) % 17) ** 2;
```

It depends only on the angle and on the tree's position, so it's identical every frame and doesn't
flicker, but it changes from one tree to another.

### Drawing order

```js
const items = [...this.buildings, ...this.trees];
items.sort(
   (a, b) =>
      b.base.distanceToPoint(viewPoint) -
      a.base.distanceToPoint(viewPoint)
);
```

It's the painter's algorithm: what is far away is drawn first. Buildings and trees are in the same
list because they have the same shape, a `base` and a `draw(ctx, viewPoint)`. The list has to be
re-sorted every frame, because the `viewPoint` moves with the view.

### Limits

- The distance used for sorting is the one of the base nearest to the `viewPoint`, not of the
  projected silhouette: a long building next to a tree can be drawn in the wrong order.
- The roof assumes bases of exactly four points, guaranteed by `Envelope` with `roundness` 1.

### How to try it

Open `index.html` with a saved graph, or draw one. Moving the view with the middle button, the
buildings always lean towards the outside of the screen. The ones at the center show only the red
roof, the ones at the edges the walls too. Trees in front of a building cover it, the ones behind
stay hidden.

## Part 7. Markings

Road markings arrive on the roads. A bar of buttons picks the active tool: the graph editor or one
of the marking editors, which place an item on the lane nearest to the mouse, oriented in the
direction of travel.

### Files

| File | What changes |
|------|-------------|
| `js/editors/graphEditor.js` | Moved from `js/`; new `enable()` and `disable()` |
| `js/editors/markingEditor.js` | New: base class of the marking editors |
| `js/editors/*Editor.js` | New: one editor for each type of marking |
| `js/markings/marking.js` | New: base class, a rectangle centered on a point |
| `js/markings/*.js` | New: `Stop`, `Yield`, `Crossing`, `Parking`, `Light`, `Start`, `Target` |
| `js/math/utils.js` | `getNearestSegment`, `perpendicular` |
| `js/primitives/segment.js` | `cap` option in `draw` |
| `js/world.js` | Lane guides, `markings` list, traffic light phases |
| `index.html` | Toolbar, `setMode` |
| `styles.css` | Button style |
| `car.png` | Car image for the start point |

### Toolbar

```js
const tools = {
   graph: { button: graphBtn, editor: new GraphEditor(viewport, graph) },
   stop: { button: stopBtn, editor: new StopEditor(viewport, world) },
   // ...
};
```

`setMode(mode)` turns off all the editors, grays out the buttons with `grayscale(100%)` and then
turns back on only the chosen one. The editors no longer listen to the mouse from the constructor:
they do it in `enable()` and stop in `disable()`.

To remove a listener you need the same function passed to `addEventListener`. But
`this.#handleMouseDown.bind(this)` creates a new function on every call, so the bound version is
saved in the `boundMouseDown` field and reused in `removeEventListener`.

All the editors draw their own preview every frame with `display()`, but only the active one has
one.

### Lane guides

The lanes are the lines halfway between the center of the road and the border. `World` gets them
like the roads, but with envelopes half as wide:

```js
new Envelope(seg, this.roadWidth / 2, this.roadRoundness)
```

The union of the envelopes gives the `laneGuides` segments, one per direction of travel. The
markings snap there: a STOP ends up on the right lane and not straddling the dashed line.
Pedestrian crossings are the exception and snap to the graph's segments, because they cross the
whole road.

### MarkingEditor

`MarkingEditor` does all the shared work:

- when the mouse moves it looks for the nearest segment within `10 * zoom` with
  `getNearestSegment`;
- it projects the mouse onto that segment and, if it falls inside it, creates the preview with
  `createMarking(point, direction)`;
- left click adds the preview to `world.markings`, right click removes the marking under the
  mouse.

The subclasses only decide which marking to create and on which segments, by overriding
`createMarking`. It's the *template method* pattern: the outline is in the base class, the step
that changes is in the children.

### Markings

`Marking` builds a rectangle `width` wide and `height` long, centered in `center` and aligned with
`directionVector`. It's used for the right-click test (`poly.containsPoint`) and as the default
drawing. The subclasses override `draw`:

| Marking | Button | Drawing |
|-------------|----------|---------|
| `Stop` | 🛑 | White line across the lane and the word STOP |
| `Yield` | ⚠️ | White line across and the word YIELD |
| `Crossing` | 🚶 | White stripes: a dashed line as thick as the marking, perpendicular to the road |
| `Parking` | 🅿️ | Two lines across the lane and a P |
| `Light` | 🚦 | Rounded body with three lights |
| `Start` | 🚙 | The `car.png` image, rotated in the direction of travel |
| `Target` | 🎯 | Three concentric red and white circles |

The text always uses the same pattern: `translate` to the center, `rotate` in the direction of
travel, `fillText` in local coordinates and finally `restore`. `scale(1, 3)` stretches the letters
like real road markings, which are read foreshortened.

The markings are drawn right after the asphalt, below the dashed line and the borders.

### Traffic lights

Every frame `#updateLights()` groups the traffic lights by intersection, that is by graph point
with more than two segments, and turns them on in turn:

- one tick is 60 frames;
- the traffic light whose turn it is stays green for 2 ticks and yellow for 1;
- all the other traffic lights of the same intersection are red.

The state isn't stored from one frame to the next: it's recomputed from `frameCount`.

### Arrays modified in place

```js
this.laneGuides.length = 0;
this.laneGuides.push(...this.#generateLaneGuides());
```

The editors receive `world.laneGuides` and `world.markings` in the constructor and keep them. If
`World` assigned a new array, the editors would stay attached to the old one. For the same reason
`dispose()` empties the markings with `world.markings.length = 0`.

### Limits

- The markings aren't saved: 💾 still saves only the graph.
- The markings don't follow the graph: moving or deleting a road, they stay where they were.
- A traffic light in a graph without intersections blocks the drawing: `getNearestPoint` returns
  `null` and `#updateLights` throws an error every frame.
- The tick counts frames, not seconds: on a 120 Hz screen the traffic lights go twice as fast.
- `Light` ignores the height it receives and always uses 18.
- The editors use the global variable `world` in `createMarking` instead of `this.world`.

### How to try it

Open `index.html` and draw a few roads with 🌐, with at least one three-way intersection. Pick a
tool from the bar: moving the mouse near a lane shows the semi-transparent preview, left click
fixes it and right click removes it. The traffic lights of the same intersection turn green one at
a time.

## Part 8. Saving The World

Up to Part 7 only the graph was saved: markings, buildings and trees were lost, and the trees
changed place at every load. Now the whole world is saved, together with the view, in
`localStorage` and in a `.world` file to download and load again.

### Files

| File | What changes |
|------|-------------|
| `js/world.js` | `World.load`, rebuilds the world from a JSON object |
| `js/primitives/polygon.js` | `Polygon.load` |
| `js/primitives/envelope.js` | `Envelope.load`; the constructor accepts not receiving the skeleton |
| `js/items/building.js` | `Building.load` |
| `js/markings/marking.js` | `type` field and `Marking.load`, which creates the right subclass |
| `js/markings/*.js` | Each subclass sets its own `type` |
| `js/viewport.js` | The constructor accepts initial `zoom` and `offset` |
| `index.html` | `"world"` key in `localStorage`, 📁 button, `save()` downloads the file |
| `styles.css` | Style of the 📁 label, hidden file input |

### From JSON to objects

`JSON.stringify(world)` saves the fields but not the classes: what comes out of `JSON.parse` are
objects without methods. Each class that ends up in the file therefore has a `static load(info)`
that rebuilds the instances:

| Method | Rebuilds |
|--------|--------------|
| `World.load` | Parameters, graph, envelopes, borders, buildings, trees, lane guides, markings, view |
| `Graph.load` | Points and segments, already there since Part 3 |
| `Envelope.load` | Skeleton and polygon, without recomputing them |
| `Polygon.load` | The points as `Point` |
| `Building.load` | Base and height |
| `Marking.load` | The subclass indicated by `type` |

From a JSON object you can no longer tell whether it was a `Stop` or a `Yield`. That's why each
marking writes its own `type` and `Marking.load` picks the class with a `switch`.

`World.load` doesn't call `generate()`: it uses the saved envelopes, buildings and trees. The trees
come from `Math.random()`, and regenerating them would change their place at every load.

### The view

`save()` copies `viewport.zoom` and `viewport.offset` into the world before saving it, and on load
the `Viewport` starts again from there. A world saved without a view uses the default values: zoom
1 and origin at the center of the canvas.

### .world files

💾 creates an `<a>` with a *data URL* containing the JSON and the `download` attribute, then clicks
it from code. The browser downloads `name.world`.

📁 is a `<label>` linked to a hidden `<input type="file">`. The chosen file is read with
`FileReader`, saved in `localStorage` and the page reloads. Reloading is simpler than replacing the
world on the fly: editors, graph and tools hold references to the old world, and the startup code
already reads from `localStorage`.

### Limits

- The graph saved with `"graph"` in the previous parts is no longer read: the new key is
  `"world"`.
- The file is always called `name.world`.
- The data URL contains the whole world: for very large maps a `Blob` with `URL.createObjectURL`
  would be better.

### How to try it

Draw a few roads, add some markings and move the view, then press 💾: the browser downloads
`name.world`. Reloading the page, the world, the markings and the view are the saved ones, with
the trees in the same spots. With 📁 you can load another `.world` file.

## Part 9. Integration

The two codebases meet. The editor from parts 1-8 moves to `world/`, the car from the
"9. Fine-tuning" folder arrives in the root of the folder, and the cars, instead of the straight
road, drive in the world drawn with the editor.

### Files

| File | What changes |
|------|-------------|
| `world/` | The whole editor from parts 1-8, moved without changes |
| `car.js`, `controls.js`, `network.js`, `sensor.js`, `utils.js`, `visualizer.js`, `car.png` | Come from folder 9 |
| `car.js` | Initial angle in the constructor, `fittness` field |
| `index.html` | Loads the scripts from `world/js/` before the car's ones |
| `main.js` | World from `localStorage`, start from the Start marking, view following the best car |
| `world/js/world.js` | Draws the cars and can hide the Start markings |
| `style.css` | Green background instead of gray |
| `road.js` | Deleted: the borders come from the world |

### Two pages

`world/index.html` is the editor, `index.html` in the root is the simulation. The two pages read
the same `"world"` key in `localStorage`: what the editor saves with 💾 is the world the cars start
in.

Paths in scripts are relative to the page that loads them, not to the file that contains them.
`Start` loads `"car.png"`: in the editor it's the 30×50 icon in `world/`, in the simulation it's
the car sprite in the root. In the simulation the Start markings aren't drawn, because the cars
start on top of them.

### From the world to the car

`main.js` loads the world with `World.load` (or creates an empty one) and passes the road borders
to the sensors in the format they already know: `world.roadBorders.map((s) => [s.p1, s.p2])`, a
pair of points per segment, like the borders of `Road`.

The 100 cars start from the center of the first Start marking, facing like the icon the editor
draws. Without a marking they start from `(100, 100)` with `dir = Point(0, -1)`. The initial angle
is `-angle(dir) + Math.PI / 2`, because the two codebases use different conventions:

| Code | Angle 0 | Positive direction |
|--------|----------|----------------|
| World, `angle()` with `Math.atan2` | Right | Clockwise on screen, with y pointing down |
| Car, `x -= sin(angle)`, `y -= cos(angle)` | Up | Counterclockwise on screen |

The formula doesn't just change convention: with `a = π/2 - angle(dir)` the car moves along
`(-sin a, -cos a)`, which is the opposite of `dir`. `Start.draw` also rotates the icon by
`angle(dir) - Math.PI / 2` and faces it the same way, so car and icon point the same way. For the
same reason, without a marking the cars start heading down.

### Fitness

On the straight road the best car was the one furthest ahead, the one with the smallest `y`. In a
world where the start can point in any direction that criterion would reward the northernmost car,
so each car accumulates `fittness += speed` every frame and the one that has covered the most road
wins.

### View and drawing

Every frame `main.js` sets `viewport.offset` to the position of the best car, calls
`viewport.reset()` and leaves all the drawing to `world.draw(carCtx, viewPoint, false)`. The world
receives the cars in `world.cars` and `world.bestCar` and draws them after the markings and before
buildings and trees, so the fake 3D covers them when they pass behind.

The `Viewport` keeps its listeners: the wheel changes the zoom, while panning with the middle
button is overwritten on the next frame.

### Notes

- The brain is saved with the `"worldBestBrain"` key. If it's empty it starts from `"bestBrain"`,
  the brain trained on the straight road of folder 9, which stays untouched.
- `index.html` keeps the `<html lang="en">` and `<meta charset="utf-8">` from folder 9 and loads
  the world's scripts in the same order as `world/index.html`.
- `world/index.html` declares `<meta charset="utf-8">`. Without it, a server that doesn't send the
  charset in the header, like `python3 -m http.server`, makes the page be read as Windows-1252 and
  the button emoji turn into unreadable characters.

### Limits

- No traffic: `traffic` is empty and a car gets damaged only by touching the borders.
- The cars don't see the road markings: stop signs, traffic lights and crossings are just
  drawings.
- The fitness rewards the road covered, not reaching the target: a car going around in circles
  without touching the borders keeps accumulating it.
- The size of the canvases is computed only on load.

### How to try it

Open `world/index.html`, draw a few roads and put a Start marking on a lane, then press 💾 (the
downloaded file isn't needed). Open `index.html` in the root: the cars start from the Start, the
view follows the best one and on the right there's its network. 💾 saves the brain, 🗑️ deletes it.

If the simulation doesn't see the saved world, the two pages don't share `localStorage`: serve the
folder with a local server, for example `python3 -m http.server`, and open both from there.

## Part 10. OpenStreetMap

Drawing a whole city by hand takes a lot of time. OpenStreetMap already has the roads of the whole
world: you just download them as JSON and convert them into the editor's graph. From there the
world is generated as always, with envelopes, borders, buildings and trees.

### Files

| File | What changes |
|------|-------------|
| `world/js/math/osm.js` | `Osm.parseRoads`, from OpenStreetMap data to points and segments |
| `world/js/math/utils.js` | `invLerp` and `degToRad` |
| `world/index.html` | 🗺️ button and panel to paste the data into |
| `world/styles.css` | Panel style, `overflow: hidden` on the body |
| `world/js/primitives/segment.js` | `oneWay` field, denser dash for one-way roads |
| `world/js/world.js` | `draw()` receives `renderRadius` |

### The data

The data is downloaded with [Overpass Turbo](https://overpass-turbo.eu/): move the map to the area
you're interested in, paste a query like this one and press *Run*.

```
[out:json];
(
  way['highway']
  ['highway' !~ '^(pedestrian|footway|cycleway|path|service|corridor|track|steps|raceway|bridleway|proposed|construction|elevator|bus_guideway)$']
  ['access' !~ '^(private|no)$']
  ({{bbox}});
);
out body;
>;
out skel;
```

The query takes the *ways* with the `highway` tag, that is the roads, and discards the ones cars
don't drive on. `{{bbox}}` is the rectangle visible on the map. `out body` returns the ways with
the list of their nodes, `>` adds the nodes they refer to and `out skel` returns them with just
the coordinates. The JSON from the *Data* tab is pasted into the 🗺️ panel and confirmed with ✔️.

### From latitude and longitude to points

`Osm.parseRoads` takes all the nodes, computes the rectangle that contains them and projects it
onto the plane:

- a degree of latitude is about 111 km everywhere. The height is `deltaLat * 111000 * 10`, so one
  meter is 10 units. With this scale the 100-wide road is 10 m wide and the 30×50 car measures
  3×5 m;
- a degree of longitude gets shorter going towards the poles, so the width is multiplied by
  `cos(lat)`;
- each node becomes a `Point` with `invLerp` on the two axes. For `y` the extremes are swapped,
  `invLerp(maxLat, minLat, lat)`, because latitude grows towards the north and the canvas `y`
  downwards.

It's a local equirectangular projection: accurate over a neighborhood, more and more distorted
over a large area.

Each way becomes a chain of segments between consecutive nodes. To find them again the point keeps
the node's `id`. `parseOsmData` replaces `graph.points` and `graph.segments`: the editor sees that
the graph's hash has changed and regenerates the world, as when the graph is modified with the
mouse.

### One-way roads

A way with `oneway` or with `lanes` equal to 1 creates `oneWay` segments. `Segment.draw` ignores
the dash it receives and uses `[4, 4]`, so a one-way road has a denser center line and appears
dashed in the graph editor. The cars don't take it into account.

### Drawing only what's near

A real map has thousands of buildings, and each one costs the fake 3D calculation and a drawing on
the canvas. `World.draw` discards the buildings and trees whose base is more than `renderRadius`
(1000) away from the viewpoint, before sorting. Roads, markings and borders all stay: they're
simple lines and without them you'd see holes in the network.

### Limits

- `oneWay` is written to the file but `Graph.load` doesn't read it: after a load all the roads go
  back to two-way.
- `oneway` is a string: even `oneway=no` counts as one-way, and `oneway=-1` (one-way in the
  opposite direction) isn't distinguished. In a test extract of Bologna, 44 of the 153 one-way
  segments came from `oneway=no`.
- Each segment looks up its two points with `points.find`, so the conversion slows down with the
  square of the nodes. The world generation too, with the union of the envelopes, becomes slow on
  large maps.
- A large world can exceed the `localStorage` limit, around 5 MB in many browsers. In that case
  saving fails, while the `.world` file downloads anyway.
- `renderRadius` is in world units: in the editor, zooming out, the buildings far from the center
  disappear.
- Bridges and underpasses aren't distinguished: the two roads don't share a node, but their
  envelopes are joined and where they overlap it looks like an intersection.

### How to try it

Open `world/index.html`, press 🗺️ and paste the JSON from Overpass Turbo for a small area, a few
blocks. With ✔️ the road network appears with buildings and trees; one-way roads have a denser
center line. Add a Start marking, press 💾 and open `index.html` in the root to let the cars drive
on real roads.

## Part 11. MiniMap

On a real map, with the view following the car up close, you lose your bearings. The minimap shows
the road network around the best car, scaled down, in the box below the neural network.

### Files

| File | What changes |
|------|-------------|
| `miniMap.js` | `MiniMap` class, draws the graph on a separate canvas |
| `index.html` | `miniMapCanvas` below `networkCanvas`, `miniMap.js` script |
| `main.js` | Creates the minimap and updates it every frame with the viewpoint |
| `style.css` | Black background for `miniMapCanvas` |

### How it's drawn

`MiniMap.update(viewPoint)` repeats on a small scale what the `Viewport` does on the main view:

- `translate` brings the viewpoint to the center of the canvas, `scale(0.05)` shrinks the world 20
  times. The 300 pixels of the box cover 6000 units, about 600 m with the scale of
  `Osm.parseRoads`;
- it draws only `graph.segments`, the skeleton of the roads, without envelopes, buildings and
  markings;
- the segments are `3 / scaler` wide, so after the scaling they stay 3 pixels;
- after the `restore` it draws a blue dot at the center, fixed: it's the map that moves, not the
  car.

`main.js` passes the same `viewPoint` used by `world.draw`, that is the position of the best car.

### The right column

`networkCanvas` and `miniMapCanvas` are in a `div`, and the network is now
`window.innerHeight - 300` tall. The `div` is an item of the body's flex: the car canvas,
`innerWidth - 330` wide, leaves little room, the `div` shrinks to the minimum width of 300 and the
two canvases, which are inline, wrap one below the other.

### Limits

- The scale is fixed: on a small, hand-drawn world the minimap is a tangle of a few pixels; on a
  whole city it shows only the surroundings.
- The blue dot has no direction and the other cars don't appear.
- All the segments are drawn every frame, even the ones outside the box.
- Below the first inline canvas there's the space under the text baseline, about 4 pixels: the
  column slightly exceeds the window height and the bottom of the minimap is cut off by
  `overflow: hidden`.

### How to try it

Save a world from the editor, ideally one imported from OpenStreetMap, and open `index.html` in the
root. The minimap appears below the network: the blue dot stays at the center and the roads scroll
by as the best car moves forward.
