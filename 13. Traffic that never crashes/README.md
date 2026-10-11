# 13. Traffic that never crashes

Fourth phase of the project. The cars no longer learn and nobody drives them: they move by rules,
like the drivers of a driving-school manual. They follow their lane, keep their distance, obey
traffic lights, Stop and Yield signs and the right-hand rule, slow down at the crossings and park
in the bays. You only watch, from above or from the 3D camera behind a car. "Never crashes" is not
an impression, but it is proven for the map that comes with the folder (`world/saves/traffic.world`):
a Node test runs it for ten simulated minutes, with 5, 10 and 13 cars and five different seeds, and
fails on the first contact. A world built in the editor follows the same rules and keeps the
guard, but no test covers it: the Limitations of each part say where the rules fall short.

## One folder, many parts

Like folders 11 and 12, this one contains all the parts of the phase, one after the other, in the
same code. Each part is a series of commits; to see the state halfway through, just check out the
commit that closes that part.

| Part | What it adds |
|-------|---------------|
| 1. Lanes | Lane network with Bézier connectors, `L` to show it, generated traffic world |
| 2. Drivers | Drivers that follow random routes with the Intelligent Driver Model; at junctions they still collide |
| 3. Junctions | Reservations of the connectors, exits kept clear, the collision check in Node |
| 4. Signals | Lights on the simulation ticks, Stop, Yield and the right-hand rule, without deadlocks |
| 5. Crossings and parking | Slow zones at the crossings, bays beside the road, trips from bay to bay |
| 6. Spectator | Selection of a car, 3D camera, speed buttons, car slider and live statistics |

The world code (`world/`) and the new files are indented with 3 spaces, with spaces around
operators; `car.js` keeps the 4 spaces of the car code. The tests in `tests/` are Node scripts
with no dependencies, run from the repository root.

## Part 1. Lanes

The folder starts as a copy of folder 12 without the race: no neural network, no sensors, no
phone, no webcam. What stays is the world with its editor, the car sprite and the 3D camera. The
first part builds the map the drivers will follow. The road graph is not enough, because a
segment is a road in both directions: the cars need lanes, each with a direction, and the paths
that join them at the junctions.

### Files

| File | What changes |
|------|-------------|
| `laneNetwork.js` | New: `LanePath` (a polyline with length, point and angle at a distance) and `LaneNetwork` |
| `traffic.html`, `main.js` | New: the page, which draws the world and the lanes |
| `style.css` | Replaced: a single canvas filling the window |
| `tools/make-world.js` | New: Node script that generates the world |
| `world/saves/traffic.world` | New: a 4×4 grid of roads, 500 px apart |
| `world/js/world.js` | Without `generateCorridor` and the special drawing of the best car |
| `world/js/editors/graphEditor.js` | Without the `s` and `e` keys that built the race corridor |
| `world/index.html` | Without the Start and Target tools; opens the traffic world |
| `tests/sandbox.js`, `tests/lanes.js` | New: the Node sandbox and the test of the lane network |

The race files are removed: `race.*`, `sim.*`, `camera.html`, `markers.html`, `phone*`,
`network.js`, `visualizer.js`, `sensor.js`, `controls.js`, `cameraControls.js`,
`markerDetector.js`, `sound.js`, `miniMap.js`, `saves/` and the `startEditor.js` and
`targetEditor.js` editors. The `Start` and `Target` classes stay, so the old worlds still load.

### From segments to lanes

Every segment A–B gives two lanes, A→B and B→A. Each one is shifted to its right by a quarter of
the road, so the two lanes split the road along the center line. With the canvas y axis pointing
down, the right of a direction `(dx, dy)` is `(-dy, dx)`, the `perpendicular` of `utils.js`.

At a node where two or more roads meet, the lane is cut half a road before the node: that space
belongs to the junction.

```js
#trim(point) {
   const degree = this.world.graph.getSegmentsWithPoint(point).length;
   return degree >= 2 ? this.world.roadWidth / 2 : 0;
}
```

### Connectors

At every node, each lane that arrives is joined to each lane that leaves on another segment. The
lane that comes back on the same segment is skipped: there are no U-turns. The join is a
quadratic Bézier, sampled in 10 points with the same `lerp` as the rest of the course:

```js
function getBezierPoints(controls, count = 10) {
   const points = [];
   for (let i = 0; i < count; i++) {
      let level = controls;
      const t = i / (count - 1);
      while (level.length > 1) {
         const nextLevel = [];
         for (let j = 1; j < level.length; j++) {
            nextLevel.push(lerp2D(level[j - 1], level[j], t));
         }
         level = nextLevel;
      }
      points.push(level[0]);
   }
   return points;
}
```

The control point is where the two lane lines cross; when they are parallel, as when going
straight, it is the midpoint and the curve becomes a straight line. The angle between the two
directions gives the turn: within 30° it is `"straight"`, otherwise `"right"` or `"left"`.

```js
const turnAngle = Math.atan2(det, dot(da, db));
let turn = "straight";
if (Math.abs(turnAngle) >= Math.PI / 6) {
   turn = turnAngle > 0 ? "right" : "left";
}
const v0 = { left: 1.2, straight: 2, right: 0.8 }[turn];
```

`v0` is the speed limit of the path: 2 on the lanes, less on the curves, least on the tight right
turn.

### Angles like the car

`Car` moves with `x -= sin(angle) * speed` and `y -= cos(angle) * speed`, because angle 0 points
up. So `LanePath.angleAt(s)` returns `atan2(-dx, -dy)` of the tangent: a car placed with
`pointAt(s)` and `angleAt(s)` looks exactly along its lane.

### The world as a Node script

`tools/make-world.js` loads the world classes into a Node `vm` context, the same sandbox as the
tests, builds the grid and writes `world/saves/traffic.world` in the format of the editor's 💾. The
world can be regenerated at any time, and the editor can still open it and save it again.

### Notes

- `tests/sandbox.js` reads the `<script>` tags of `traffic.html` and loads the same files, in the
  same order, into a `vm` context: the tests run the code of the page, not a copy of it.
- `Math.random` in the sandbox is a seeded mulberry32, so the buildings and trees of the generated
  world are always the same.

### Limitations

- A lane that ends in a dead end has no `next`: a car could not get out of it. The bundled world
  has none.
- The cut of half a road is enough for the grid of the bundled world; with very sharp angles a
  connector can still pass over a waiting lane. Part 3 fixes that.

### How to try it

From the repository root:

```bash
node "13. Traffic that never crashes/tests/lanes.js"
python3 -m http.server 8000
```

Then open `http://localhost:8000/13.%20Traffic%20that%20never%20crashes/traffic.html`: the
grid appears with the lanes in blue and the connectors in orange, with direction arrows. `L` hides
and shows them. The wheel zooms, the middle button pans.

## Part 2. Drivers

A driver owns a `Car` and moves it along a route of lanes and connectors. The car no longer steers:
its position is a distance `s` along a path, and its pose comes from the path.

### Files

| File | What changes |
|------|-------------|
| `driver.js` | New: `Driver`, with route, position, speed and the Intelligent Driver Model |
| `traffic.js` | New: `Traffic`, the simulation state and its `update()` |
| `car.js` | Only shape, image, polygon and drawing remain; `createPolygon` becomes public |
| `laneNetwork.js` | `carSize`, `idm` and `findRoute` (Dijkstra on the lanes) |
| `main.js` | Creates a `Traffic` with 10 cars and updates it every frame |
| `traffic.html` | Loads `driver.js` and `traffic.js` |
| `tests/sandbox.js` | `place(driver, route, s)`, to put a driver on a chosen route |
| `tests/follow.js` | New: a car behind a stopped car |

### The Intelligent Driver Model

Each tick the driver looks ahead along its route, up to 300 px, and collects the obstacles: the
rear of every car in front, the end of the route. For each obstacle the IDM gives an acceleration;
the driver takes the smallest.

```js
#idmAcceleration(vTarget, { gap, speed }) {
   if (gap <= 0) {
      return -Infinity;
   }
   const v = this.speed;
   const dynamic = v * idm.T + (v * (v - speed)) / (2 * Math.sqrt(idm.aMax * idm.b));
   const desired = idm.s0 + Math.max(0, dynamic);
   return idm.aMax * (1 - Math.pow(v / vTarget, 4) - Math.pow(desired / gap, 2));
}
```

The first term pushes towards the target speed; the second brakes when the gap is shorter than
the desired one, which grows with the speed (`T` ticks of headway) and with the approach speed to
the car ahead. The parameters, in pixels and ticks:

```js
const idm = { aMax: 0.05, b: 0.08, s0: 12, T: 20, horizon: 300 };
```

### Braking in time for a curve

The target speed is not just the limit of the current path. For every path and every limit ahead,
the driver computes the highest speed from which it can still brake down to that limit with the
comfortable deceleration `b`, `sqrt(v0^2 + 2 * b * d)`, and keeps the minimum. So a car slows
down before the tight right turn, not inside it.

### The step can never overlap

The IDM brakes smoothly, but it is a model: with a car stopped right in front it could still
overshoot by a fraction of a pixel. So, after the IDM, the step of the tick is capped:

```js
const v = Math.max(0, this.speed + acc);
const step = this.#guard(Math.min(v, Math.max(0, gap - 2)));
this.s += step;
this.speed = step;
```

Two cars on the same route can never touch: at worst the follower stops 2 px behind.

### Where the cars are

At the start of every tick each driver registers its interval `[s - 25, s + 25]` on the path it is
on, and on the previous one if its rear is still there. The other drivers read these `occupants`
to find the car ahead, even across the end of a path.

### Routes

`findRoute(start, target)` is Dijkstra on the directed graph of the paths, with the length as
cost. `graph.getShortestPath` of folder 12 is not reused, because it works on the undirected
graph of the points and does not know which way a lane goes. In this part a driver that reaches
the end of its route picks a random lane and drives on.

### Notes

- `Traffic.update()` runs one fixed step; the page calls it once per frame, so the simulation still
  goes at the speed of the screen, like the previous chapters.
- `tests/follow.js` puts a car behind a stopped leader on the longest lane: the follower must
  arrive, stop at least `s0 - 2` behind, and never touch it.

### Limitations

- At the junctions nobody gives way: two cars on crossing connectors drive into each other. Part 3
  is about that.
- Two connectors that leave the same lane overlap at the start, but a car on one does not yet see
  a car on the other.

### How to try it

```bash
node "13. Traffic that never crashes/tests/follow.js"
```

On the page, ten cars drive around the grid, queue up behind each other and brake for the curves.
At the junctions they still overlap.

## Part 3. Junctions

The idea is the one of a real crossroads, made strict: a car may enter a connector only with a
reservation, and the junction grants it only if nothing can go wrong.

### Files

| File | What changes |
|------|-------------|
| `junction.js` | New: conflicts between connectors, reservations, automatic trims |
| `driver.js` | Requests, stop line at the end of the lane, the guard against contacts |
| `laneNetwork.js` | `polygonAt`, extra trims, `twins` for the paths that start together |
| `traffic.js` | Builds the junctions, finds the collisions, records the errors |
| `traffic.html` | Loads `junction.js` |
| `tests/check.js` | New: the whole world in Node, failing on any collision |
| `tests/room.js` | New: a car must not enter a junction whose exit is blocked |
| `tests/short.js` | New: close junctions, a curve made of short segments, a segment shorter than its trims |
| `tests/sandbox.js` | `place` also resets the front of the car |

### Which connectors conflict

Two connectors conflict if a car on one can touch a car on the other. Instead of computing curve
intersections, the junction slides the car's rectangle, 4 px wider, every 5 px along both
connectors and checks every pair with `polysIntersect`. The table is computed once, when the
`Traffic` is created. Connectors that leave the same lane never conflict: the cars on them are
already in a queue. Connectors that end on the same lane always do.

### The reservation

Without a reservation, the driver has a stop line at the end of its lane, an obstacle like a
stopped car. Each tick every junction looks at the first car of each approach, in order of
arrival, and grants a reservation when:

1. no other car holds a connector that conflicts with this one;
2. the exit lane has room for the whole car, `length + s0`, counting the cars already on it and
   the ones that hold a reservation towards it.

The reservation is released when the car's rear leaves the connector. The second condition is the
one that prevents gridlock: a car never stops inside a junction, because it enters only when it
can leave.

A node with only two roads and no markings is not a junction: it is a bend, and its connectors
have no reservation, unless they can touch each other. The room of the second condition is then
counted through the bend, up to the next real junction.

### Automatic trims

On some angles a connector passes over the front of a car waiting at the end of another lane. When
that happens, the lane is cut 10 px shorter and the network is rebuilt, up to 10 times:

```js
for (const key of keys) {
   trims.set(key, (trims.get(key) || 0) + 10);
}
```

### Paths that start together

All the connectors of a lane start from the same point and overlap for a while. A car on the left
turn is registered also on the straight connector, as long as the two are closer than a car's
width (`twins`), so the car behind it sees it whatever turn it takes.

### The guard

Before every step the driver checks its polygon, at the new position, against the cars nearby. On
contact it halves the step, up to 6 times, and counts a `guardHits`. In the checks of this folder
it never fires: on the included map it proves that the rules alone are enough.

### Notes

- `tests/check.js` loads the page into Node with seeded randomness, runs 5, 10 and the maximum
  number of cars for 5 seeds each, and fails on a contact between two cars or between a car and
  the road borders. With arguments it runs shorter: `node tests/check.js 6000 2` runs 6000 ticks
  and 2 seeds.
- In this part every approach is a main road: the first car to arrive goes first.
- A segment shorter than the trims of its two ends keeps lanes of 1 px, with the warning "N lanes
  clamped to 1 px: their segments are too short for the junctions".
- A lane between two junctions with no room for a waiting car, `length + s0`, would let a car
  enter it and then block the junction behind: the routes avoid it, with the warning "N lanes too
  short to wait on before a junction: routes avoid them".

### Limitations

- No signals yet: traffic lights and signs are drawn, but the cars ignore them.
- First come, first served is fair but not realistic: nobody gives way to the right.
- The routes avoid the lanes too short to wait on: in a world where such a lane is the only link
  between two areas, some bays can't be reached.

### How to try it

```bash
node "13. Traffic that never crashes/tests/room.js"
node "13. Traffic that never crashes/tests/short.js"
node "13. Traffic that never crashes/tests/check.js" 6000 2
```

On the page, with `L`, the reserved connectors turn red: at a junction you can see two cars
crossing together when their paths don't touch, and waiting when they do.

## Part 4. Signals

The junctions learn the rules of the road. Each approach takes a rule from the marking at its end;
the reservation stays the safety net underneath.

### Files

| File | What changes |
|------|-------------|
| `junction.js` | Approach rules: light, stop, yield, main road, right-hand rule; deadlock breaker |
| `driver.js` | Ticks standing still at the line, `canStopBefore` for the yellow |
| `traffic.js` | Counts the red-light violations |
| `world/js/world.js` | Public `updateLights(tick)` instead of counting frames inside `draw` |
| `world/index.html` | The editor advances the lights itself |
| `tools/make-world.js` | Lights at (1,1), Stop at (2,2), Yield at (1,2) |
| `tests/signals.js` | New: one light, one Stop and one Yield of the bundled world |
| `tests/deadlock.js` | New: four cars at a junction without signs |
| `tests/sandbox.js` | `ahead(path, length)`, a route of at least `length` px |

### Lights on the ticks

In folder 12 the lights advanced inside `world.draw`, counting frames. Here the simulation drives
them: `traffic.update()` calls `world.updateLights(tick)`, with 2 s of green and 1 s of yellow for
each light of a junction, and `second = floor(tick / 60)`. So at ×4 the lights also go four times
faster.

### The rule of an approach

The marking of an approach is the one within a road width of the lane's end that faces against
the lane (`dot < -0.9`):

| Rule | When the car may ask for a reservation |
|---|---|
| `light` | on green; on yellow only if it can no longer stop before the line |
| `stop` | after standing still at the line for 60 ticks, then as `yield` |
| `yield` | when no car on a main approach is waiting for a conflicting connector |
| `main` | always: unmarked approach of a junction that has markings |
| `right` | when no car on the approach to its right is waiting for a conflicting connector |

A light also takes back a reservation not yet used: on red always, on yellow if the car can still
stop with a deceleration of 0.15.

### The right-hand rule without deadlocks

At a junction with no signs, four cars that arrive together each have a car on their right, and
each waits for the other. The junction notices it: if nobody holds a reservation, nobody was
granted one in this tick, and every waiting car is stopped and blocked by the right-hand rule, the
first one that arrived and has room on its exit goes.

```js
const deadlock =
   !granted &&
   this.holders.length == 0 &&
   blocked.length > 0 &&
   blocked.length == heads.length &&
   blocked.every((h) => h.approach.rule == "right" && h.driver.speed < 0.05);
const first = deadlock && blocked.find((h) => this.#hasRoom(h));
if (first) {
   this.#grant(first);
}
```

### Notes

- The approach on the right is the one whose direction, compared with the perpendicular of mine,
  has `dot < -0.7`: in a grid that is exactly the road coming from the right.
- The driver itself records an error when it enters on red, enters a signed junction without a
  reservation, or leaves a Stop before its 60 still ticks; `tests/check.js` fails on any error.

### Limitations

- A Stop or a Yield with no main road at the junction behaves like a main road: there is nobody to
  give way to.
- The lights don't know the traffic: the cycle is fixed, even when a road is empty.
- Stop and Yield have no gap acceptance: they wait until no car is waiting on the main road, so a
  steady stream there can keep the minor approach waiting a long time.

### How to try it

```bash
node "13. Traffic that never crashes/tests/signals.js"
node "13. Traffic that never crashes/tests/deadlock.js"
```

On the page the cars stop at the red light of junction (1,1), stand still at the Stop of (2,2)
before going, and give way at the Yield of (1,2).

## Part 5. Crossings and parking

The cars get a reason to drive: they leave a bay, cross the city and park in another one.

### Files

| File | What changes |
|------|-------------|
| `world/js/markings/parking.js` | Replaced: the marking describes a bay beside the lane, outside the road |
| `world/js/world.js` | The bays are part of the road borders and are drawn as asphalt |
| `laneNetwork.js` | Speed limits at the crossings; each bay splits its lane and adds three paths |
| `junction.js` | The exit of each bay is a junction |
| `driver.js` | Parked state, departure, choice of the bay, arrival |
| `traffic.js` | Trips; as many cars as the bays minus one |
| `tools/make-world.js` | Two crossings and fourteen bays |
| `world/index.html` | Regenerates the world also when a marking is added or removed |
| `tests/bays.js` | New: no bays, one bay, a bay without room |
| `tests/check.js`, `tests/lanes.js` | No trip in 10 minutes is an error; bays don't count for reachability |
| `tests/sandbox.js` | `place` also resets the bay state; `ahead` skips the bay paths |

### Crossings

Each crossing adds a limit to the lane it lies on: from 80 px before it to its far side, the speed
drops to 1. The braking towards limits ahead of part 2 does the rest.

### The bays

A `Parking` is still placed on a lane with the editor, but now it means a bay on the right of
that lane. The lane is split in three pieces, and the bay adds three paths:

- `enter`, an S curve from the lane into the bay;
- `spot`, the bay itself, 100 px long, where the car stops in the middle;
- `exit`, an S curve back to the lane.

The bay polygon joins the road envelopes, so borders, buildings and trees leave room for it.

### The exit of a bay

A car that leaves the bay merges into the traffic of the lane. That is a junction like the others,
with two approaches: the lane is the main road, the bay gives way.

```js
new Junction(bay.parking.center, [
   {
      lane: bay.main,
      connectors: [bay.pass],
      rule: "main",
      lineS: bay.main.length
   },
   {
      lane: bay.spot,
      connectors: [bay.exit],
      rule: "yield",
      lineS: bay.spot.length
   }
])
```

### A trip

1. At the start each car is parked in a different random bay.
2. It waits 180 to 600 ticks, picks a random free bay that nobody has reserved, reserves it and
   computes the route to it.
3. It stops in the middle of the bay, frees the old one, and starts again.

There is always at least one free bay, because the cars are at most the bays minus one.

### Notes

- A bay without room on its lane before or after it, for the curves and a car's length, is skipped
  with the warning "Parking ignored: not enough room on its lane".
- A driver records an error when it stands still outside a bay for 1800 ticks, and
  `tests/check.js` also fails when a car makes no trip in 36 000 ticks.

### Limitations

- The cars park only forwards and leave only forwards: a bay is a lay-by, not a parking space at
  an angle.
- Nobody walks on the crossings: they only slow the cars down.

### How to try it

```bash
node "13. Traffic that never crashes/tests/bays.js"
node "13. Traffic that never crashes/tests/check.js"
```

The full check takes about a minute. On the page the cars leave the bays, slow down at the two
crossings and park in other bays.

## Part 6. Spectator

The page becomes something to watch: you pick a car, follow it from above and from behind, and
change the speed of the simulation.

### Files

| File | What changes |
|------|-------------|
| `main.js` | Replaced: selection, follow, speed, slider, statistics and the split view |
| `style.css` | Replaced: the controls, the statistics and the two canvases |
| `traffic.html` | The camera canvas, the buttons, the slider and the statistics panel |
| `camera.js` | Draws all the cars and uses the road borders when there is no corridor |
| `world/js/viewport.js` | `dragButton` parameter: the page pans with the left button; a release outside the canvas ends the drag |

### Selecting a car

A click that moves less than 5 px selects the nearest car within 30 px; a longer movement is a
drag and pans the view. With a car selected, the top view follows it and the window splits: the 3D
camera of folder 12 takes the bottom half. A click on empty space or `Esc` deselects.

### The controls

| Input | Effect |
|---|---|
| Wheel | zoom |
| Left drag | pan; stops following the car |
| Click on a car | select and follow it |
| ⏸ ×1 ×2 ×4 | 0, 1, 2 or 4 `traffic.update()` per frame |
| Slider | number of cars, from 1 to the bays minus one; rebuilds the traffic |
| `L` | lanes in blue, connectors in orange, bays in green, reserved paths in red |

The statistics show the cars, the trips, the collisions and the red-light violations: the last two
stay at 0 on the included map.

### Notes

- The editor keeps panning with the middle button, because the left one draws roads.
- The 3D camera shows every car of the world, not only the selected one.

### Limitations

- The 3D view draws only borders, buildings and cars: the markings and the bays are not visible
  in it.
- At ×4 the frame rate can drop with many cars, because the collision statistics test every pair
  of nearby cars each tick.

### How to try it

Open `traffic.html` from the server, click a car and follow it in the 3D view, then try ×4 and
the slider. All the tests of the folder:

```bash
for t in lanes follow room signals deadlock bays short; do node "13. Traffic that never crashes/tests/$t.js"; done
node "13. Traffic that never crashes/tests/check.js"
```
