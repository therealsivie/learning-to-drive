# 12. Race in the world

Third phase of the project. We start again from the world of folder 11, but the car no longer has
to learn from scratch: it arrives already trained, and the world becomes the track of a game. The
following parts add path finding, the race against the car, sounds, a first-person camera and
controls from the phone and the webcam.

## One folder, many parts

Like folder 11, this one contains all the parts of the phase, one after the other, in the same
code. Each part is a series of commits; to see the state halfway through, just check out the
commit that closes that part.

| Part | What it adds |
|-------|---------------|
| 1. Trained car in the world | World and trained car loaded from files, speed among the network inputs |
| 2. Shortest path | Shortest path between two points of the graph, chosen in the editor with s and e |
| 3. Race corridor | Corridor from the start to the Target: the cars see only the borders of the path |
| 4. The race | Race page: you against 100 AI cars, with countdown and ranking |
| 5. Synthesized sounds | Sounds synthesized with Web Audio: start beep, engine, explosion and finish |
| 6. First-person camera | First-person camera: the building bases projected in perspective |
| 7. 3D view | Full-screen 3D view: buildings, borders and cars extruded, camera chasing from behind |
| 8. Phone steering | `phone.html` page: you steer by tilting the phone, a tap engages reverse |
| 9. Marker detection | `markers.html` page: finds two blue objects in the webcam, with center and size |
| 10. Webcam steering wheel | `camera.html` page: you drive with a steering wheel of two blue markers in front of the webcam |
| 11. Finishing touches | 3D car with steering wheels, shadows and fade; walls push back instead of destroying |

The two styles of folder 11 remain: the world code (`world/`) is indented with 3 spaces, with
spaces around operators; the car code with 4 spaces, compact.

## Part 1. Trained car in the world

The starting point is folder 11 with two changes of habit. The world no longer goes from the
editor to the simulation through `localStorage`: it is a file in the project, loaded with a
`<script>` tag. And the cars no longer start from a random network, but from a trained car saved
to a file.

### Files

| File | What changes |
|------|-------------|
| `world/saves/path_finding.world` | New: the starting world, a small network with Start and Target |
| `saves/right_hand_rule.car` | New: the trained car, with network, sensors and driving parameters |
| `world/index.html` | Loads the world from the file; 💾 downloads a `.world` script; the 📁 is gone |
| `index.html` | Loads the two files before the car scripts |
| `main.js` | World from the script, `car.load(carInfo)` for each car, key `"raceBestBrain"` |
| `car.js` | `load(info)` method; speed becomes a network input |
| `sensor.js` | `rayOffset` field, which rotates the whole fan of rays |
| `world/js/math/graph.js` | `Graph.load` keeps the one-way roads |

### The world as a script

The `.world` file is not JSON, it is JavaScript:

```js
const world = World.load({"graph":{"points":[...]}, ...});
```

Included with `<script src="world/saves/path_finding.world">`, it declares the global variable
`world` that the editor and `main.js` already use. No `fetch`, no `localStorage`: the two pages
read the same file and no longer need to share anything.

`World.load` runs while the file is being loaded, so all the world classes must already be
defined: the file must be included after the `world/js/` scripts and before `main.js` or the
editor's inline script.

The editor's 💾 now writes the same format:

```js
encodeURIComponent(
   "const world = World.load(" + JSON.stringify(world) + ");"
)
```

The downloaded file is always called `name.world`. To use it, rename it and put it in place of
`world/saves/path_finding.world`.

The file weighs about 470 KB even though the network has only 13 points: inside there are also
the already generated envelopes, borders, buildings and trees, and the trees alone are three
quarters of the total. `World.load` reads them as they are, without recomputing them.

### One-way roads

`Graph.load` passes `i.oneWay` to the `Segment` constructor. Without it, the third parameter took
the default `false` and the one-way roads imported from OpenStreetMap went back to two-way after
every load (it was a limitation of Part 10 of folder 11).

### The trained car

`right_hand_rule.car` is a whole car passed to `JSON.stringify`, preceded by `let carInfo = `.
It contains more fields than our `Car` knows (sensors for stops, traffic lights and yields, for
example): they come from a more advanced version of the code. `Car.load` takes only some of them:

```js
load(info){
    this.brain=info.brain;
    this.maxSpeed=info.maxSpeed;
    this.friction=info.friction;
    this.acceleration=info.acceleration;
    this.sensor.rayCount=info.sensor.rayCount;
    this.sensor.raySpread=info.sensor.raySpread;
    this.sensor.rayLength=info.sensor.rayLength;
    this.sensor.rayOffset=info.sensor.rayOffset;
}
```

| Parameter | Before | Trained car |
|-----------|-------|-----------------|
| Rays | 5 | 2 |
| Ray length | 150 | 350 |
| Fan spread | `Math.PI/2` | 0.8 |
| `rayOffset` | — | −0.4 |
| Max speed | 3 | 8 |
| Acceleration | 0.2 | 0.08 |
| Friction | 0.05 | 0.04 |
| Network | `[5,6,4]` | `[3,4,4]` |

`load` replaces the parameters after the constructor, which has already created a `[5,6,4]`
network for the 5 default rays: that network is thrown away and replaced by the one from the file.

### Two rays and the right hand

`rayOffset` is added to the angle of each ray:

```js
)+this.car.angle+this.rayOffset;
```

With −0.4 radians the fan, already narrow, rotates to the right. The car sees almost only the
right border of the road and follows it: it is the right-hand rule of mazes, hence the file name.
In a dead end the car doesn't crash, it turns around the end of the road and comes back.

### Speed as an input

```js
const offsets=this.sensor.readings.map(
    s=>s==null?0:1-s.offset
).concat([this.speed/this.maxSpeed]);
```

Besides the rays, the network receives the speed divided by the max speed, a value between 0 and
1 like the sensor readings (in reverse it becomes negative). Two rays plus the speed make the 3
inputs of the `[3,4,4]` network.

### The saved brain

The 100 cars all load the same `carInfo`, and `this.brain=info.brain` assigns to all of them **the
same object**. Without a saved brain there is no mutation: the cars are identical and move on top
of each other, as if they were just one.

💾 and 🗑️ work as in folder 11, but with the `"raceBestBrain"` key. If the key exists, each car
receives a new copy from `JSON.parse` and all but the first are mutated.

### Notes

- The brain is saved in `"raceBestBrain"` instead of `"bestBrain"`, without falling back on
  another key: the `[5,6,4]` networks of the previous chapters have 5 inputs and don't work here.
- The editor's `save()` no longer writes `"world"` to `localStorage`, because nobody reads it.

### Limitations

- Changing world requires replacing a file in the project: the changes made in the editor and
  not exported are lost on the first reload.
- The graph editor lets you modify the network, but `oneWay` can't be set by hand: the one-way
  roads come only from OpenStreetMap.
- Until a brain is saved, the 100 cars are identical copies and evolution is stuck.

### How to try it

Serve the folder with a local server, for example `python3 -m http.server`, and open `index.html`:
the car starts from the Start of `path_finding.world`, follows the road keeping to the right and
in dead ends comes back. The network on the right has 3 inputs, the two rays and the speed.

`world/index.html` opens the same world. After a change, 💾 downloads `name.world`: rename it to
`path_finding.world`, put it in `world/saves/` and reload the simulation.

## Part 2. Shortest path

The road graph, so far used only to generate envelopes and borders, becomes a map in which to
search for the shortest path between two points. For now the search is visible only in the
editor; the simulation doesn't change.

### Files

| File | What changes |
|------|-------------|
| `world/js/math/graph.js` | `getSegmentsLeavingFromPoint` and `getShortestPath` (Dijkstra) |
| `world/js/editors/graphEditor.js` | Keys s and e to choose start and end, drawing of the path |

### The drivable segments

```js
getSegmentsLeavingFromPoint(point) {
   const segs = [];
   for (const seg of this.segments) {
      if (seg.oneWay) {
         if (seg.p1.equals(point)) {
            segs.push(seg);
         }
      } else {
         if (seg.includes(point)) {
            segs.push(seg);
         }
      }
   }
   return segs;
}
```

It is the "with one-way roads" version of `getSegmentsWithPoint`: a two-way segment can be taken
from both ends, a one-way one only from `p1`, in the direction it was drawn in. This is where the
`Graph.load` fix of Part 1 is needed: without `oneWay` all roads would be drivable in both
directions.

### Dijkstra

`getShortestPath(start, end)` is Dijkstra's algorithm in its most direct form:

1. each point gets `dist = Number.MAX_SAFE_INTEGER` and `visited = false`; the start has
   `dist = 0`;
2. from the current point we look at the drivable segments: if going through here the other end
   becomes closer, its `dist` and its `prev` are updated;
3. the current point becomes visited, and the next one is the unvisited one with the smallest
   `dist`;
4. we stop when the end is visited, and rebuild the path by walking back the `prev` links from
   the end with `unshift`.

```js
const unvisited = this.points.filter((p) => p.visited == false);
const dists = unvisited.map((p) => p.dist);
currentPoint = unvisited.find((p) => p.dist == Math.min(...dists));
```

There is no priority queue: at each step all the unvisited points are scanned, so the cost grows
with the square of the number of points. With the 13 points of `path_finding.world` it isn't
noticeable.

`dist`, `visited` and `prev` are written directly on the `Point` objects and removed with
`delete` before returning the path. Removing them is necessary: `graph.hash()` and 💾 are both a
`JSON.stringify` of the graph, and leftover fields on the points would make the editor believe
the graph has changed (with a useless `world.generate()`) and would end up in the saved file.

### Start and end in the editor

In 🌐 mode, with the mouse over a point, **s** marks it as the start and **e** as the end.
As soon as both are there, `display()` computes the path at every frame and draws it over the
graph: big blue points joined by a thick line. Moving a point with the mouse recomputes the path
right away.

The listener is on `window`, not on the canvas, because the canvas doesn't receive keyboard
events. It is added and removed together with the other editor listeners, so in another mode the
keys do nothing.

### Notes

- The line joins the consecutive points of the path. `point.prev` can't be used for it, because
  `getShortestPath` deletes it before returning the path.
- The `keydown` listener is a `boundKeyDown`, removed in `#removeEventListeners`: adding it at
  every `enable()` without removing it, every mode change would pile up another one.
- Deleting the start or end point, or emptying the graph with 🗑️, resets start and end. Otherwise
  `getShortestPath` would look for a point no longer in the graph, throw an error inside the draw
  loop and freeze the editor.

### Limitations

- If the end is not reachable (for example because of a one-way road), the algorithm also visits
  the unreachable points and returns only the end: one blue point is drawn and no line.
- Start and end must be points of the graph, not arbitrary positions on the road.
- The path is recomputed at every frame even if the graph doesn't change.

### How to try it

Open `world/index.html` from the local server, in 🌐 mode. Hover over a point and press s, then
over another and press e: the shortest path appears in blue. Try dragging an intermediate point
to lengthen a road and watch the path change.

## Part 3. Race corridor

The path becomes a road: from the shortest path we build a **corridor**, that is the borders of a
road that follows only that path. In the simulation, if the world has a Target, the cars drive
inside the corridor instead of the whole network, and the right-hand rule takes them straight to
the end.

### Files

| File | What changes |
|------|-------------|
| `world/js/world.js` | `generateCorridor(start, end)`; the corridor drawn in red |
| `world/js/editors/graphEditor.js` | s and e take the mouse position and generate the corridor |
| `main.js` | Car borders = corridor up to the Target; 500 cars |

### Starting halfway along a road

Dijkstra can only go from one point of the graph to another, but a car or a Target are almost
always halfway along a road. `generateCorridor` adds two temporary points to the graph:

```js
const startSeg = getNearestSegment(start, this.graph.segments);
const endSeg = getNearestSegment(end, this.graph.segments);

const { point: projStart } = startSeg.projectPoint(start);
const { point: projEnd } = endSeg.projectPoint(end);
```

1. it finds the segment nearest to the start and the one nearest to the end;
2. it projects the two positions on their segments, getting `projStart` and `projEnd`;
3. it adds the projections to `graph.points`, and four temporary segments that connect them to
   the ends of their segment (plus a direct one between the two, if they are on the same segment);
4. it runs `getShortestPath(projStart, projEnd)`;
5. it removes the projections with `removePoint`, which also deletes the temporary segments.

The graph goes back to how it was, with the same `hash()`: the editor doesn't regenerate the
world.

The original segment stays in the graph during the search, but it doesn't get in the way: it
connects its two ends, and the path goes through the projection anyway because that's where it
starts.

### From the path to the road

```js
const tmpEnvelopes = segs.map(
   (s) => new Envelope(s, this.roadWidth, this.roadRoundness)
);

const segments = Polygon.union(tmpEnvelopes.map((e) => e.poly));
```

It is the same procedure that produces `roadBorders` in `generate()`: one envelope for each
segment of the path, then the union of the polygons to keep only the outer sides. The result,
`world.corridor`, is a closed list of segments: rounded at the two ends and, where the path goes
straight past an intersection, barred at the mouth of the side road.

### In the editor

In 🌐 mode **s** marks the mouse position as the start and **e** as the end, anywhere, even far
from the points of the graph. As soon as both are there, the key calls `world.generateCorridor`,
and `World.draw` draws the corridor with red lines. The computation happens once, when the key is
pressed, and not at every frame like the path of Part 2.

`GraphEditor` uses the global variable `world` directly: the graph editor doesn't know the world,
but finds it in the global scope of the page.

### In the simulation

```js
let roadBorders = [];
const target = world.markings.find((m) => m instanceof Target);
if (target) {
   world.generateCorridor(bestCar, target.center);
   roadBorders = world.corridor.map((s) => [s.p1, s.p2]);
} else {
   roadBorders = world.roadBorders.map((s) => [s.p1, s.p2]);
}
```

The start is `bestCar`, that is the first car: they all start from the Start, so it's the same
thing. The object just needs `x` and `y`, because `projectPoint` and `distanceToPoint` use only
those.

The cars see only the borders of the corridor: the side roads are closed, so the car that follows
the right border can no longer slip into a wrong road. Once at the Target it finds the rounded end
of the corridor, makes a U-turn and comes back. Without a Target everything stays as before.

`N` goes from 100 to 500. Until a brain is saved the cars stay identical copies (see Part 1), but
with a saved brain there are five times more mutations per generation.

### Notes

The resets of start and end in `#removePoint` and `dispose` were removed: start and end are no
longer points of the graph.

### Limitations

- The corridor is computed only once, at startup, from the Start: it doesn't follow the car if it
  changes road, and with more than one Target only the first is used.
- The temporary segments are always two-way: if the start or the end fall on a one-way road, the
  first and last stretch ignore it.
- If the end is not reachable the path has only one point, the corridor is empty and the cars
  have no borders.
- In the editor the corridor doesn't update when the graph is modified, and stays drawn even
  after 🗑️. Pressing s or e with an empty graph gives an error in the console.
- `World` has no `toJSON`: the editor's 💾 also saves `corridor` in the `.world` file.
  `World.load` ignores it.

### How to try it

Open `index.html`: the red lines are the corridor, and the cars drive along it from the Start to
the Target without entering the side roads. In the editor, in 🌐 mode, press s with the mouse on
a road and e on another: the red corridor connects them along the shortest path.

## Part 4. The race

The world becomes a game. Next to the simulator, which is used for training, a second page is
born where you drive with the arrow keys against 100 AI cars, from the Start to the Target, with
a countdown and a ranking updated at every frame.

### Files

| File | What changes |
|------|-------------|
| `index.html`, `main.js` | Renamed to `sim.html` and `sim.js`: the simulator |
| `sim.js` | Reads the borders from `world.corridor.borders` |
| `race.html` | New page: full-screen canvas, minimap, ranking, countdown |
| `race.js` | The race |
| `world/js/world.js` | `generateCorridor(start, end, extendEnd)`; `corridor` becomes `{ borders, skeleton }` |
| `car.js` | The car remembers `color` and `type`; the sensors are no longer drawn |
| `style.css` | Styles of minimap, ranking and countdown |

### Two pages

From here on the project has two entry points, which share everything except the last script:

- `sim.html` is the usual page, with the network drawn and the 💾 and 🗑️ buttons. It is used to
  improve the car: you let it run, save the best one, reload.
- `race.html` is the game: no visualizer or buttons, the canvas takes up the whole window and
  minimap and ranking sit on top of it, semi-transparent, with `position:absolute`.

### The corridor becomes an object

```js
this.corridor = { borders: segments, skeleton: segs };
```

`borders` are the borders from before, the ones the cars see with the sensors. `skeleton` are the
segments of the path, the center line of the road: they are used to measure how much road each
car has covered. `World.draw` and `sim.js` now read `corridor.borders`.

With `extendEnd` set to `true` the corridor continues past the Target by two road widths:

```js
if (extendEnd) {
   const lastSeg = segs[segs.length - 1];
   const lastSegDir = lastSeg.directionVector();
   segs.push(
      new Segment(
         lastSeg.p2,
         add(lastSeg.p2, scale(lastSegDir, this.roadWidth * 2))
      )
   );
}
```

The extra segment is only used to build the envelopes. Right after, `segs.pop()` removes it, so
`skeleton` ends exactly on the Target. The result is a finish line to cross: without the
extension the corridor would close with the rounded end right on the finish, and whoever crosses
the line would crash. The race uses it, the simulator doesn't.

### The cars in the race

```js
const cars=generateCars(1, "KEYS").concat(generateCars(N, "AI"));
const myCar=cars[0];
```

`generateCars` now also takes the type. Your car is `"KEYS"` and blue; the AI cars have a random
color and a name, from `AI1` to `AI100`. They all load `carInfo` from the `.car` file, so they
have the same network and the same `maxSpeed` (8, the one of the trained car, not the 3 passed to
the constructor). Your car has a network too, but with a `controlType` other than `"AI"` it
doesn't use it and drives with `Controls`.

If there is a brain saved in `raceBestBrain` they all receive it, and from the third car on it is
mutated: `myCar` and `AI1` drive with the saved brain as it is, the others with a variant.

The camera always follows your car: `world.bestCar = myCar`, and the viewport centers on it.

### The countdown

`startCounter` chains four one-second `setTimeout`s: 3, 2, 1, GO!, and then the text disappears,
`started` becomes `true` and `frameCount` goes back to zero. Before that moment `animate` draws
but doesn't call `update`: the cars stand still on the start line.

`counter` and `statistics` are never declared in `race.js`: the browser creates a global variable
for each element with an `id`, and the code relies on it.

### Who is in the lead

```js
const carSeg = getNearestSegment(car, world.corridor.skeleton);
for (let i = 0; i < world.corridor.skeleton.length; i++) {
   const s = world.corridor.skeleton[i];
   if (s.equals(carSeg)) {
      const proj = s.projectPoint(car);
      const firstPartOfSegment = new Segment(s.p1, proj.point);
      car.progress += firstPartOfSegment.length();
      break;
   } else {
      car.progress += s.length();
   }
}
```

`updateCarProgress` measures the road covered, not the distance from the Target as the crow
flies:

1. it finds the segment of the skeleton nearest to the car;
2. it adds up the lengths of all the segments before it;
3. it adds the piece of the current segment up to the projection of the car;
4. it divides by the total length, getting a number between 0 and 1.

At 1 the car has arrived: `finishTime` takes the frame number, and from then on the progress is no
longer recomputed. Then `cars.sort` sorts by progress, and each row of the ranking shows position,
name, 💀 if the car is destroyed and the finish time, in seconds. Your row has a white background,
the others black.

Sorting changes the order of the `cars` array at every frame, but `myCar` remains a reference to
your car, wherever it ends up.

### The car

`Car` saves `color` and `type`, which it used to use only in the constructor: the ranking needs
them to color the rows and tell yours apart.

The drawing of the sensors is commented out, so the rays are no longer visible either in the race
or in the simulator. The `drawSensor` parameter remains, but it no longer has any effect.

### Notes

`race.js` also uses the `raceBestBrain` key instead of `bestBrain`, like `sim.js` since Part 1: the
simulator saves the brain, the race reads it.

### Limitations

- The time is `finishTime / 60`: it assumes 60 frames per second. On a 120 Hz screen the race runs
  at double speed, and the times shown are double the real ones.
- Without a Target `world.corridor` doesn't exist and `updateCarProgress` errors out on the first
  frame: the race needs a world with a Target.
- Without a saved brain the AI cars are identical copies: they take the same road, arrive together
  and all have the same time.
- The cars don't see each other and don't collide with each other: each one updates only with the
  borders (`update(roadBorders, [])`), so they pass through each other.
- `race.js` still has `save()` and `discard()` but no buttons, and `save()` would save the brain
  of `myCar`, which doesn't drive: they can only be called from the console.
- With the progress based on the nearest segment, a car that goes back loses positions, and near a
  tight curve it can be assigned for an instant to the wrong segment.

### How to try it

Open `race.html` from the local server. After the 3, 2, 1, GO! drive with the arrow keys and try
to beat the AI cars to the Target: the ranking on the right updates while you race. `sim.html` is
the simulator from before, without the sensor rays.

## Part 5. Synthesized sounds

The race gets a voice. There are no audio files: each sound is built on the fly with the Web Audio
API, starting from oscillators and adjusting the volume over time.

### Files

| File | What changes |
|------|-------------|
| `sound.js` | New: `beep`, `taDaa`, `explode` and the `Engine` class |
| `race.html` | Loads `sound.js` |
| `race.js` | Beep at each number of the countdown, engine after the start, `taDaa()` at the finish |
| `car.js` | A destroyed car stops; yours explodes; the engine follows the speed |

### A handmade sound

Each function of `sound.js` builds a small audio graph:

```js
const osc = audioContext.createOscillator();
const envelope = audioContext.createGain();

osc.frequency.setValueAtTime(frequency, 0);
osc.type = waveType;
osc.connect(envelope);
osc.start();
osc.stop(0.4);

envelope.gain.value = 0;
envelope.gain.linearRampToValueAtTime(1, 0.1);
envelope.gain.linearRampToValueAtTime(0, 0.4);
envelope.connect(audioContext.destination);
```

1. the oscillator produces a wave at the given frequency (sine by default);
2. it goes through a `GainNode`, which adjusts its volume;
3. the gain acts as an envelope: it rises from 0 to 1 in a tenth of a second and goes back to 0 at
   0.4 seconds;
4. the output goes to `audioContext.destination`, that is the speakers.

Without the envelope the sound would start and stop abruptly, with a "click" at each end.

The times passed to `setValueAtTime`, `linearRampToValueAtTime` and `stop` are not durations: they
are instants on the audio context clock, `audioContext.currentTime`, which starts from 0 when the
context is created. That's why each function creates a new `AudioContext`: with a clock that has
just started, "0.4" really means "in 0.4 seconds".

### The race sounds

- `beep(400)` on 3, 2 and 1, `beep(700)` on GO!: the same beep, higher-pitched for the start.
- `taDaa()` when your car reaches the Target: two sawtooth (`"sawtooth"`) beeps, 400 and 600 Hz,
  200 ms apart. The sawtooth wave is rich in harmonics and sounds more "electronic" than the sine.
- `explode()` when your car crashes: ten oscillators together, each at a random frequency between
  100 and 300 Hz, fading out in one second. Close but different frequencies beat against each
  other and give a dirty rumble, more like a noise than a note.

### The engine

```js
const lfo = audioContext.createOscillator();
lfo.frequency.setValueAtTime(30, 0);
const mod = audioContext.createGain();
mod.gain.value = 60;
lfo.connect(mod);
mod.connect(osc.frequency);
```

`Engine` is an oscillator that never stops. Its tone, however, is not steady: a second oscillator,
the LFO (*low frequency oscillator*), at 30 Hz, goes through a gain of 60 and is connected not to
the speakers but to the `frequency` parameter of the first one. An `AudioParam` connected to a
node adds the signal to its own value: the engine frequency oscillates by ±60 Hz around the base
value, 30 times per second. It's that tremolo that makes it sound like a combustion engine instead
of a whistle.

`setVolume` and `setPitch` receive the speed as a percentage:

```js
if (this.engine) {
    const percent = Math.abs(this.speed / this.maxSpeed);
    this.engine.setVolume(percent);
    this.engine.setPitch(percent);
}
```

When standing still the engine is silent and runs at 100 Hz; at max speed it has volume 1 and a
base frequency of 300 Hz. `Math.abs` makes the engine run in reverse too, when `speed` is
negative.

The engine is created in `startCounter`, when the "GO!" disappears, and only for `myCar`: the AI
cars have no `engine`, and the `if (this.engine)` check skips them.

### The destroyed car

```js
if(this.damaged){
   this.speed=0;
   if(this.type == "KEYS"){
      explode();
   }
}
```

A destroyed car already stopped moving, because all the movement is inside `if(!this.damaged)`,
but it kept its last speed. Now the speed goes to zero, and with it the engine volume: after the
crash you only hear the explosion.

The block is inside the same `if(!this.damaged)`, so `explode()` fires only once, in the frame of
the crash. The check on the type limits it to your car: a hundred explosions from the AI cars would
drown out everything else. For the same reason `sim.html` doesn't load `sound.js`: there the cars
are all AI and none calls `explode()`.

### Limitations

- Each sound creates an `AudioContext` and none is ever closed. In a race there are about ten, so
  it doesn't weigh much, but each context holds audio resources as long as the page stays open.
  The usual way is a single context for the whole page, with the times computed from
  `currentTime`.
- Browsers block audio started before a user interaction: an `AudioContext` created like this
  starts `"suspended"` and nobody calls `resume()`. If the page hasn't received a click or a key
  yet, the countdown beeps and the engine, which is created before you touch the arrow keys, may
  stay silent for the whole race. It depends on the browser and on how often you visit the page:
  in my test the contexts were already active.
- The sounds are only in the race.

### How to try it

Open `race.html` from the local server, with the audio on, and click on the page before the
countdown ends. You hear the beeps of 3, 2, 1 and GO!, then the engine rising in pitch as you
accelerate. Hit a border to hear the explosion, or reach the Target for the ta-daa.

## Part 6. First-person camera

First step toward the view from the driver's seat. A camera mounted on the car looks ahead, picks
the buildings in front of it and projects them in perspective onto a second canvas. For now it
draws only their bases, that is their footprints on the ground: the real 3D comes in the next part.

### Files

| File | What changes |
|------|-------------|
| `camera.js` | New: the `Camera` class, with field of view, clipping and projection |
| `race.html` | New `cameraCanvas` canvas; loads `camera.js` |
| `race.js` | Page split in two halves; the camera follows `myCar` at every frame |
| `world/js/math/utils.js` | `cross(p1, p2)`, the cross product in 2D |
| `world/js/primitives/polygon.js` | `containsPoly`; `break` can mark the intersection points |
| `car.js` | `#assessDamage` always returns `false` (temporary) |

### The split page

`race.js` puts the body in a column (`flexDirection = "column"`) and gives each canvas half of the
window height: above, the world seen from above, below, the camera view. The camera canvas is
cleared at every frame and doesn't draw a background: the gray is the body's `darkgray` showing
through.

### The field of view

```js
this.z = -20;
this.tip = new Point(
   this.x - this.range * Math.sin(this.angle),
   this.y - this.range * Math.cos(this.angle)
);
```

`move` puts the camera at the car's position, with the same angle, and computes three points at
distance `range` (1000): `tip` straight ahead, `left` and `right` rotated by 45° to one side and
the other. They are the same `x - sin`, `y - cos` formulas the car moves with. The center and the
two side points form a triangle, `this.poly`: it is the field of view, 90° wide, and `draw` draws
it in blue in the top view.

The constructor and `move` destructure `{ x, y, angle }`, so they accept a car directly:
`new Camera(myCar)` and `camera.move(myCar)`.

### What gets into the frame

`#filter` chooses the building bases to draw:

1. it discards the polygons with not even one vertex inside the triangle (`containsPoly`);
2. if a polygon crosses the edge of the triangle, it works on two copies: `Polygon.break` splits
   them at the intersection points, and of that polygon only the inner vertices and the cut points
   remain;
3. polygons entirely inside go through as they are.

```js
if (markIntersections) {
   point.intersection = true;
}
```

The new parameter of `Polygon.break` is used to recognize the cut points later: it is the same
method that in chapter 11 split the road outlines to join them, plus a label on the points it
creates. `containsPoly` has a generous name: it returns `true` if the polygon has *at least one*
vertex inside, not if it fits entirely.

### The projection

```js
const seg = new Segment(this.center, this.tip);
const { point: p1 } = seg.projectPoint(p);
const c = cross(subtract(p1, this), subtract(p, this));
const x = Math.sign(c) * distance(p, p1) / distance(this, p1);
const y = - this.z / distance(this, p1);
```

For each vertex:

1. `p1` is the projection of the point on the view axis: `distance(this, p1)` is the depth, how
   far ahead the point is relative to the camera;
2. the distance of the point from the axis, divided by the depth, gives the x on the screen. The
   sign of `cross` says whether the point is to the right or to the left of the axis;
3. the y is the camera height divided by the depth: the ground is 20 units below the eye, and the
   farther a point is the more it rises toward the horizon, the line at mid canvas.

Dividing by the depth is the perspective divide: far things shrink and converge toward the
center. The result, between −1 and 1, is scaled to half the canvas and moved to the center. With
a 90° field of view the edge of the field of view is as far from the axis as the depth, so
x = ±1 falls right on the edges of the canvas.

### The drawing

`render` projects the filtered polygons, clears the camera canvas and draws the bases in
perspective on it. Then it draws the same filtered polygons, not projected, on `carCtx`, the top
view: it is a debugging aid, which highlights the buildings seen by the camera. `carCtx` doesn't
arrive as a parameter: `render` takes it from the global scope of `race.js`.

### Two temporary shortcuts

This part works around two things to try the camera more comfortably:

- `#assessDamage` begins with `return false;`: no car breaks anymore, and you can drive through
  buildings and lawns. It also applies to `sim.html`, which uses the same `car.js`;
- `let started = true;`: the cars move right away, during the countdown.

The code after the `return` stays there, unreachable. Part 7 removes both shortcuts.

### Limitations

- You see only the bases of the buildings, flat on the ground: no height, no roads, trees or
  cars.
- The polygons are drawn in the order of the array, not from farthest to nearest: a near building
  can end up under a far one.
- A building that crosses the field of view without having vertices inside, like a long one seen
  from the side, is discarded by `containsPoly` and disappears.
- The field of view is a triangle, not a circular sector: straight ahead it reaches about 707
  (1000 · cos 45°), not 1000.
- A point very close to the camera has almost zero depth and ends up very far away on the screen.
- With `started = true` the AI cars start before the GO!, but `frameCount` goes back to zero at the
  GO!: the ranking times don't count the seconds of the countdown.

### How to try it

Open `race.html` from the local server and drive with the arrow keys. Above you see the blue
triangle of the camera and the buildings it frames; below, their bases in perspective, which widen
and move down as you get closer. Collisions are disabled, so you can drive through the buildings
and look at the projection from every side.

## Part 7. 3D view

The camera becomes the game view. The flat bases of Part 6 are extruded into solids: the
buildings rise, the borders of the corridor become low walls and the car becomes a box. The camera
is no longer on the car but chases it from behind, with a bit of delay, and takes up the whole
window.

### Files

| File | What changes |
|------|-------------|
| `camera.js` | Camera behind the car with smooth chasing; extrusion of buildings, borders and cars |
| `world/js/primitives/point.js` | Third coordinate `z`, 0 if not given |
| `world/js/primitives/polygon.js` | `containsPoint` uses a much farther outer point |
| `race.js` | Top view hidden, full-screen camera; the shortcuts of Part 6 are gone |
| `car.js` | The constructor calls `update` right away; `#assessDamage` works again |

### One more coordinate

```js
constructor(x, y, z = 0) {
```

`Point` accepts an optional `z`. All the points that already existed, from the graph to the
buildings, stay at `z = 0`, that is on the ground, and the 2D code doesn't notice. As for the y of
the canvas, here too the axis is flipped: up is negative z. The camera is at `z = -40` and the
roof of a building 200 tall is at `z = -200`.

### The camera behind the car

```js
this.x = lerp(this.x, x + this.distanceBehind * Math.sin(angle), t);
this.y = lerp(this.y, y + this.distanceBehind * Math.cos(angle), t);
this.angle = lerp(this.angle, angle, t);
```

The destination point is 150 units (`distanceBehind`) behind the car: they are the car's movement
formulas with the sign flipped. The camera, however, doesn't jump there: at every frame it covers
10% of the remaining distance (`t = 0.1`), and does the same with the angle. When the car
accelerates or turns, the camera lags a bit behind and you see the car in three-quarter view; when
it stops, the camera catches up with it, slowing down gradually. It is the same old `lerp`, used
frame after frame as a filter.

`moveSimple` does the same computations without `lerp` and is used by the constructor. `lerp`
starts from the current position of the camera: on the first frame, without an initial position,
`this.x` would be `undefined` and all the computations would give `NaN`.

### From footprint to solid

```js
const ceiling = new Polygon(
   poly.points.map((p) => new Point(p.x, p.y, -height))
);
```

`#extrude` takes a polygon on the ground and builds a copy of it at height `-height`, the ceiling.
Then, for each side, it adds a face of four points: the two ends of the side on the ground and the
same two on the ceiling. The faces and the ceiling are normal `Polygon`s with 3D points, and the
rest of the code treats them like the other polygons.

`#getPolys` extrudes three things, after filtering them with the field of view:

| What | From where | Height |
|------|---------|---------|
| Buildings | `world.buildings`, the bases | 200 |
| Car | `world.bestCar.polygon`, which in the race is always `myCar` | 10 |
| Borders | `world.corridor.borders`, each segment as a 2-point polygon | 10 |

The car polygon is made of `{x, y}` objects, not `Point`s: without `z` the projection would give
`NaN`, so `#getPolys` rebuilds them with `new Point(p.x, p.y)`.

### The filter, redone

In Part 6 a building passed the filter only if it had at least one vertex in the field of view.
Now the first check is `intersectsPoly`: if the polygon crosses the edge of the triangle it is
split and clipped as before; otherwise it passes only if `containsPoly` finds it inside. A long
building seen from the side, with all its vertices outside but its sides cutting the triangle,
now shows up.

### Height in the projection

```js
const y = (p.z - this.z) / distance(this, p1);
```

In Part 6 the y used only the camera height, because all the points were on the ground. Now what
counts is the height difference between the point and the eye, still divided by the depth. A point
on the ground is 40 below the camera and falls below the horizon; the roof of a building is 160
above and rises toward the top of the screen. The farther the point, the more both get squashed
onto the horizon line.

### The outer point

```js
const outerPoint = new Point(-100000, -100000);
```

`containsPoint` draws a segment from the point to check to a point surely outside the polygon and
counts how many times it crosses the sides: odd means inside. With `(-1000, -1000)` that "surely
outside" point no longer was: this world has coordinates beyond −1000 (for example y = −1148), and
a polygon in that area could contain it and skew the count. Now the camera uses `containsPoint` at
every frame on points from the whole world, and the error would show.

### The race goes back to normal

In `race.js`:

- `carCanvas.height = 0`: the top view is still there, but it is zero tall, and the camera canvas
  takes the whole window. The minimap and the ranking stay on top;
- `world.draw` and `camera.draw` on `carCtx` are commented out: they would draw on an invisible
  canvas;
- `let started = false`: the cars wait for the GO! again.

In `car.js` the collision check is back. The constructor, then, calls `this.update([], [])` right
away. During the countdown `race.js` doesn't update the cars, so `this.polygon` wouldn't exist yet,
and the camera already uses it from the first frame to draw the car. With all the controls off and
zero speed, that first `update` computes polygon and sensors without moving the car.

### Limitations

- The polygons are drawn in the order buildings, car, borders, not from farthest to nearest: the
  low walls of the corridor are always on top of everything, even when they are behind a
  building. The semi-transparent fill makes the scene readable, but not correct.
- A border is a 2-point polygon, so it has two sides, there and back: each low wall is drawn twice
  and its "ceiling" is a line.
- Only the player's car is visible: the AI cars are neither extruded nor drawn.
- `t = 0.1` is per frame: on a 120 Hz screen the camera catches up with the car in half the time.
- Faces very close to the eye have almost zero depth and end up off the screen, for example when
  the camera, which is 150 behind the car, passes through a building.
- Trees and road markings don't appear in the view.

### How to try it

Open `race.html` from the local server. During the countdown you already see the track in 3D,
with the car in front of the camera. After the GO! drive with the arrow keys: in a curve the camera
moves to the side and then realigns behind the car. Collisions are active again, so a building
stops you.

## Part 8. Phone steering

The phone becomes the steering wheel. A third page, `phone.html`, is the race of Part 7 with
another way of driving: the car accelerates by itself, you steer by tilting the phone and keep
your finger on the screen to go in reverse. The view straightens at every tilt, as if the horizon
stayed still while the phone turns.

### Files

| File | What changes |
|------|-------------|
| `phoneControls.js` | New: the `PhoneControls` class, which reads accelerometer and touches |
| `phone.html` | New page: the race with the phone controls and only the camera view |
| `car.js` | If the controls have a `tilt`, the steering is proportional to the tilt |

### One more page

`phone.html` is `race.html` with three differences:

- the camera canvas is centered with `position: absolute` and `top`/`left` at 50%: the
  `translate(-50%, -50%)` that completes the centering comes from the rotation, together with the
  angle;
- minimap and ranking are hidden with `display: none`: on the phone there is no room, but
  `race.js` keeps updating them;
- a script at the bottom, after `race.js`, replaces the car controls:

```js
myCar.controls = new PhoneControls(cameraCanvas);
```

`race.js` creates `myCar` with the keyboard controls, then this line replaces them. `car.js`
doesn't know who is driving it: it only reads the `forward`, `reverse`, `left`, `right` and now
`tilt` fields, so any object that has them will do. The car stays of type `"KEYS"`, and still has
engine and explosion.

### The tilt

```js
this.tilt = Math.atan2(
   e.accelerationIncludingGravity.y,
   e.accelerationIncludingGravity.x
);
```

The `devicemotion` event reports the acceleration of the phone along its three axes, gravity
included. With the phone still it is only gravity, and its direction in the plane of the screen
says how much it is rotated: `atan2(y, x)` turns it into an angle. With the phone held horizontally
gravity is all on x and `tilt` is 0; rotating it like a steering wheel it grows to one side or the
other.

The commented-out block above is a first attempt with `deviceorientation` and the `beta` angle, left
in the code.

### The screen that straightens

```js
const newCanvasAngle = -this.tilt;
this.canvasAngle = this.canvasAngle * 0.6 + newCanvasAngle * 0.4;
```

The camera canvas rotates by `-tilt`: the phone turns one way, the drawing the other, and the
horizon stays parallel to the floor. The accelerometer, however, jitters, and rotating the canvas
on every reading would make the image shake. That's why the new angle weighs only 40%: it is an
exponential moving average, the same `lerp` as the camera with `t = 0.4`, applied to another
signal.

### Forward and back

`forward` starts at `true`: the car always accelerates, as soon as the countdown allows it.
`touchstart` anywhere on the page switches to reverse, `touchend` goes back to forward. As with the
down arrow, reverse first brakes and then makes the car go backward.

### The steering in `car.js`

```js
if(this.controls.tilt){
   this.angle -= this.controls.tilt * 0.03;
}else{
```

With the arrow keys the steering is all or nothing: 0.03 rad per frame. With the phone it is
proportional: tilted by 0.3 rad, the phone makes the car steer by 0.009 rad per frame. When `tilt`
is `undefined`, as for the keyboard and the AI cars, or exactly 0, it falls back to the usual
branch.

### Limitations

- I haven't tried it on a real phone: I simulated tilt and touches in the computer's browser with
  `DeviceMotionEvent` and `touchstart`/`touchend` events.
- Phone browsers may not send `devicemotion` to a page served over HTTP from a local network
  address, and iOS asks for an explicit permission that the code doesn't request.
- `tilt` is 0 only when horizontal, with one specific side down. Held vertically it is about
  ±π/2 and the car spins in place; upside down it is close to ±π and jumps from one sign to the
  other.
- The steering has no `flip`: in reverse it isn't inverted as with the arrow keys.
- On a computer there is no accelerometer: Chrome sends a single `devicemotion` with `x` and `y`
  set to `null`, `atan2(null, null)` is 0, the canvas gets centered and the car always goes
  straight.
- The rotated canvas has the size of the window, computed on load: when rotating, the corners go
  off the screen and you see the gray of the background.
- Lifting one finger is enough to go back to forward, even if another one is still on the screen.

### How to try it

Serve the folder so that the phone can reach it, open `phone.html` and hold the phone
horizontally. After the GO! the car starts by itself: rotate the phone like a steering wheel to
steer and keep your finger on the screen to brake and reverse. If the car only goes straight, the
browser is not sending the accelerometer data to the page.

## Part 9. Marker detection

Before driving with the webcam we need a way to see the steering wheel. This part doesn't touch
the race: it adds a class that looks for two blue objects in the image, the markers, and a test
page that shows the webcam with the found pixels colored. The steering wheel will be an object
with a blue marker at each end, held in front of the webcam: Part 10 will use the line that joins
them to steer and their size to tell whether the steering wheel is getting closer or farther.

### Files

| File | What changes |
|------|-------------|
| `markerDetector.js` | New: the `MarkerDetector` class, which finds the two markers in an image |
| `markers.html` | New test page: webcam, detection and marker pixels colored |

### A test page

`markers.html` doesn't load anything else from the folder: only `markerDetector.js` and a script
of its own. It asks for the webcam with `getUserMedia`, connects it to a `<video>` element that is
never added to the page and, as soon as the first frame arrives, gives the canvas the size of the
video. Then, at every frame:

1. it draws the frame on the canvas;
2. it reads its pixels with `getImageData`;
3. it passes the pixels to the detector;
4. it colors, one pixel at a time, the points of the left marker in red and those of the right
   one in yellow.

The `distance` function the detector uses is defined in this page: the scripts share the global
scope, so the class finds it at call time. If the webcam is not available or the permission is
denied, an `alert` shows the error.

### How blue a pixel is

```js
const blueness = b - Math.max(r, g);
if (blueness > this.threshold.value) {
```

`getImageData` returns a flat array of four bytes per pixel, in the order red, green, blue and
alpha. For each pixel the detector measures how much the blue exceeds the stronger of the other
two channels. A white or a gray have the three channels similar and stay close to 0, even if they
are very light; a bright blue exceeds the threshold. The coordinates come from the index in the
array: `i / 4` is the pixel number, the remainder of the division by the width is the x, the
quotient is the y.

The threshold is 50 and it is the `value` of an `<input type="range">` from 0 to 255. The slider
is created but not added to the page, so for now it can't be moved: it's there for Part 10. The
value of an input is a string, `"50"`, and the comparison with `>` converts it to a number.

### Two groups

The blue points are a single list: they have to be split between the two markers. The detector
uses k-means with k = 2, written by hand:

1. two starting centroids: the first point found and the last one. The scan goes row by row from
   the top, so they are the topmost point and the bottommost one, almost always in two different
   markers;
2. each point goes into the group of the nearest centroid;
3. each centroid moves to the mean of the points of its group;
4. steps 2 and 3 are repeated, ten times in all.

There are always ten iterations: the loop doesn't stop earlier, even when the groups no longer
change. At the end the group with the leftmost centroid becomes `leftMarker`, the other
`rightMarker`.

### Center and size

For each marker the detector returns the centroid, the list of points and a radius:

```js
const size1 = Math.sqrt(group1.length);
const radius1 = size1 / 2;
```

`size` is the side of a square with as many pixels as the marker has, and the radius is half of
it. For a circle it comes out a bit smaller than the real one: about 0.89 times the radius. In the
test a circle of radius 20 gave 17.9, one of radius 30 gave 26.8. It doesn't matter, because this
value is used only for comparisons: a marker that shrinks is moving away.

### Notes

The page is `markers.html`, in the race folder: Part 10 adds `markerDetector.js` next to the other
scripts, and an `index.html` among `race.html`, `phone.html` and `sim.html` would look like the
main page.

### Limitations

- I haven't tried it with a real webcam. I loaded the page with a fake stream: a canvas with two
  blue circles and a red rectangle. The centroids came out within half a pixel of the drawn
  centers and the rectangle was ignored.
- If there is nothing blue in the image, the detector doesn't return `null`: it returns two
  markers without points, with the centroids at `NaN`. The page doesn't error out, it simply
  doesn't color anything.
- With only one marker in view, k-means still splits its points into two halves. Any other blue
  object in the frame ends up in one of the two groups and moves the centroid.
- The video is not mirrored: the marker held with the left hand appears on the right in the image
  and becomes `rightMarker`. Part 10 draws the frame flipped.
- The image is analyzed at the full resolution of the webcam, and at each of the ten iterations
  four distances are computed for each blue point. Part 10 shrinks the image four times per side
  before analyzing it.
- The threshold is fixed at 50: with different lighting it can be too high or too low.

### How to try it

The webcam works only in a secure context: `localhost` is fine, a network address over HTTP is
not. Serve the folder, open `markers.html` on `localhost` and allow access to the webcam. Put two
well-separated blue objects in front of the camera: the pixels of the one on the left in the image
turn red, those of the one on the right yellow.

## Part 10. Webcam steering wheel

The detector of Part 9 becomes a steering wheel. A fourth page, `camera.html`, is the race with
the controls taken from the webcam: you hold in front of the camera an object with a blue marker
at each end and rotate it like a steering wheel. Moving it away from the camera engages reverse.
In a semi-transparent box at the top left you see what the game is looking at.

### Files

| File | What changes |
|------|-------------|
| `cameraControls.js` | New: the `CameraControls` class, which turns the markers into steering and gear |
| `camera.html` | New page: the race with the webcam controls and the `ironManCanvas` box |
| `markerDetector.js` | The threshold can be changed with `updateThreshold` and stays saved in `localStorage` |
| `style.css` | Position and look of the webcam box |

### The page

`camera.html` is `race.html` with one more canvas, `ironManCanvas`, and a script at the bottom
that replaces the car controls:

```js
const controls = new CameraControls(ironManCanvas);
myCar.controls = controls;
```

It is the same pattern as `phone.html`: `car.js` reads `forward`, `reverse` and `tilt`, and
doesn't know where they come from. The car code doesn't change. Unlike `phone.html`, minimap and
ranking stay visible.

### The mirrored frame

As soon as the webcam sends the first frame, `CameraControls` gives the box a quarter of the width
and a quarter of the height of the video: the pixels to analyze become a sixteenth. The CSS then
enlarges it to 300 pixels on the screen. At every frame the frame is drawn flipped:

```js
this.ctx.translate(this.canvas.width, 0);
this.ctx.scale(-1, 1);
```

The webcam films the scene from its own point of view, so the left hand would appear on the
right. Flipped, the box works like a mirror: the left hand is on the left, `leftMarker` really is
the left marker and the steering wheel turns the right way.

### The steering wheel

```js
this.tilt = Math.atan2(
   rightMarker.centroid.y - leftMarker.centroid.y,
   rightMarker.centroid.x - leftMarker.centroid.x
);
```

`tilt` is the angle of the line that goes from the left marker to the right one: 0 with the
steering wheel straight, positive when the right marker goes down (the canvas y grows downward). In
`car.js` it goes through the branch added in Part 8, `this.angle -= tilt * 0.03`: turning the
steering wheel to the right `tilt` becomes positive and the car turns right, with steering
proportional to the tilt as for the phone.

### Forward and back

The radius of the markers says how far the steering wheel is. During the countdown, when
`started` of `race.js` is still false, `initializing` is true and the average size of the two
markers is saved in `expectedSize` at every frame. At the GO! the value freezes: it is the
reference distance.

```js
if (size < this.expectedSize * 0.85) {
   this.forward = false;
   this.reverse = true;
}
```

After the start, if the markers drop below 85% of that size, the steering wheel has been pulled
back and the car goes in reverse; bringing it closer again goes back to forward. As with the
phone there is no gas pedal: the car always accelerates, as soon as the countdown allows it.

### What you see in the box

Over the flipped frame `CameraControls` draws a circle whose diameter is the line between the two
markers: blue when the car goes forward, red in reverse. Then it puts back on top only the marker
pixels: it zeroes the alpha of all the pixels read, sets it back to 255 for those found by the
detector, copies the result to a helper canvas with `putImageData` and redraws it over the circle
with `drawImage`. The helper canvas is needed because `putImageData` replaces the pixels instead
of overlaying them: written directly into the box, the almost entirely transparent image would
erase the frame and the circle.

### The threshold with the mouse wheel

```js
updateThreshold(delta) {
   this.threshold.value = Number(this.threshold.value) + delta;
   localStorage.setItem("markerThreshold", this.threshold.value);
}
```

The mouse wheel over the box changes the detector threshold by 1 per notch: up raises it and lets
fewer pixels through, down lowers it. The value is saved in the `markerThreshold` key and read
back on load, so it doesn't have to be adjusted again at every game. The slider of Part 9 is used
here: it isn't visible, but an `<input type="range">` brings any out-of-bounds value back between
0 and 255 by itself, so the threshold can't leave the range.

### Limitations

- I haven't tried it with a real webcam. In place of `getUserMedia` I gave the page the stream of
  a canvas with two blue circles, which I could tilt and shrink: `tilt` followed the tilt, the
  shrunken circles engaged reverse and the mouse wheel moved the threshold.
- The reference size is the one of the last frame before the GO!. If at that moment the steering
  wheel is moving, or is not in the frame, the reference is wrong for the whole game.
- If the markers leave the frame, centroids and radius become `NaN`. `tilt` is `NaN`, which in
  `car.js` counts as false, and the comparison with `expectedSize` is false: the car goes straight
  and forward.
- The limitations of the detector remain: a single marker is split in two, and any other blue
  object in the frame moves the centroids.
- With the steering wheel held vertically `tilt` is about ±π/2 and the car spins in place, as
  with the phone.
- The `markerThreshold` key is shared with `markers.html`, which reads it but doesn't have the
  mouse wheel to change it.
- If the webcam is not available, or the permission is denied, an `alert` shows the error. The
  keyboard controls have already been replaced and `forward` starts at `true`: after the GO! the
  car goes straight without any way to steer.

### How to try it

Serve the folder, open `camera.html` on `localhost` and allow access to the webcam. Hold two blue
objects in front of the camera at the same height, one per hand, and keep them still during the
countdown. After the GO! rotate them like a steering wheel to steer and move them away from the
camera to reverse. If in the box the markers are full of holes, or blue pixels show up elsewhere,
adjust the threshold with the mouse wheel over the box.

## Part 11. Finishing touches

The last part doesn't add new mechanics, it polishes the existing ones. The car box becomes a car
body with four wheels that turn and steer; all the cars leave a shadow on the ground; the
buildings become transparent and far things fade out. Touching a wall no longer destroys the car:
it pushes it back toward the center of the road. The minimap shows only the path, with a dot for
each car.

### Files

| File | What changes |
|------|-------------|
| `camera.js` | `#extrudeCar` with wheels; car shadows; transparent buildings; fade with distance; closer camera |
| `race.js` | `handleCollisionWithRoadBorder` puts the cars back on the road; minimap of the corridor that rotates with the car |
| `miniMap.js` | Receives the cars and draws them as gray dots; zoom doubled |
| `sim.js` | Passes the cars to the minimap |
| `style.css` | Gradient sky behind the 3D view; ranking without a scrollbar |

### The car body

`#extrudeCar` takes the four vertices of the car polygon, in the order of `#createPolygon`: front
right, front left, rear left, rear right. On each side it adds the midpoint and the two quarter
points, and the result is a base of 10 points. Then it narrows the nose by 20% per side and the
rear by 10%, with `#moveInward`, which brings two points closer to each other:

```js
#moveInward(p1, p2, percent = 0.3) {
   const new_p1 = lerp2D(p1, p2, percent);
   const new_p2 = lerp2D(p2, p1, percent);
```

From the base come two more rings of 10 points, one at half height and one on the roof, and
between one ring and the next a band of faces, as in the extrusion of Part 7. The roof, however,
is not flat:

| Roof points | Height | What it becomes |
|-----------------|-------|--------------|
| Nose | −15 + 7 = −8 | The hood, just above the half line |
| Front quarter | −15 + 6 = −9 | The end of the hood |
| Middle and rear quarter | −15 | The roof of the cabin |
| Tail | −15 + 4 = −11 | The trunk |

With the 30% of `#moveInward` from each side the roof is also narrower than the base, and nose and
tail come 10% closer: the upper band slopes inward, like the windows. Four faces close the roof,
from the hood to the rear window.

The whole base is at `z = -5`, that is raised by `wheelRadius`. The quarter points of the side
are the same objects that end up in the base, so they are raised too, and they are the centers of
the wheels: a wheel of radius 5 centered at height 5 touches the ground. The centers are computed
before narrowing nose and tail, so the wheels stay on the full width of the car: they are centered
on the edge of the body and stick out by half their thickness.

### The wheels

```js
for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
   const angle = a + distance / 20;
   points.push(
      new Point(
         lerp(support[0].x, support[1].x, Math.cos(angle)),
         lerp(support[0].y, support[1].y, Math.cos(angle)),
         center.z + Math.sin(angle) * radius
      )
   );
}
```

Each side of a wheel is a polygon of 16 points on a vertical circle. `support` is the segment that
goes from the center of the wheel to a point at distance `radius` in the direction the wheel is
pointing: `lerp` with `Math.cos(angle)` moves back and forth along that segment, `Math.sin(angle)`
up and down. With a `lerp` beyond the range from 0 to 1 (here from −1 to 1) you get a circle
oriented like the wheel without writing a rotation matrix. The two sides are 2 units from the
center, one on each side, and 16 faces join them into the tread.

`distance` is the car's `fittness`, that is the road covered: added to the angle it makes the 16
points turn, and the wheel rolls. In reverse `fittness` decreases and the wheel turns backward.

The rear wheels point like the car; the front ones steer:

```js
if (carInfo.controls.tilt) {
   frontWheelAngle += carInfo.controls.tilt * 0.5;
} else {
   if (carInfo.controls.left) {
      frontWheelAngle -= 0.3;
   }
```

With phone and webcam the angle of the wheels follows the tilt; with the arrow keys it is fixed at
±0.3. `carInfo` is `world.bestCar`, which in the race is `myCar`.

### Shadows, transparency and fade

`#getPolys` adds the footprints of **all** the cars (`world.cars`), flat on the ground, light gray
and without outline: they are the shadows. It is also the first way in which the AI cars appear in
the 3D view. The buildings become gray with 0.2 transparency, almost glass, and no longer hide the
road. The order is shadows, buildings, cars, borders: the shadows must be drawn first, under
everything else.

```js
const dist = polys[i].distanceToPoint(this);
ctx.globalAlpha = (1 - dist / this.range) ** 2;
```

`render` gives each polygon an opacity that decreases with the distance from the camera: 1 right
under your nose, 0.25 at half the field of view, 0 at the 1000 limit. The square makes far things
disappear faster than a straight line: it is a fog, which also hides the moment a building enters
the field of view, where before it would have appeared all of a sudden. The distance is computed
on the original 3D polygon, not on the projected one. `fill` and `stroke` are passed to `draw`
only when the polygon has them: those of the car and of the borders are `undefined`, and `draw`
uses the default blue.

The camera has moved closer, from 150 to 100 behind the car, and chases faster: `t = 0.15`, 15% of
the distance at every frame.

### No more crashes

```js
const correctors = car.polygon.map((p) => {
   const proj = seg.projectPoint(p);
```

After the `update` of all the cars, `race.js` passes the damaged ones to
`handleCollisionWithRoadBorder`. There it looks for the segment of the corridor skeleton nearest
to the car, that is the center line of the road, and each vertex of the car is projected onto that
segment (onto the ends, if it falls outside). The vector from a vertex to its projection says how
far and in which direction that vertex is from the center; the longest one belongs to the corner
that touched the wall. The car is moved by 1 unit in that direction and rotated by 0.1:

- front right (0) or rear left (2): the car turns left;
- front left (1) or rear right (3): the car turns right.

In both cases the corner that touched rotates away from the wall. Finally `damaged` goes back to
`false` and on the next frame the car starts again. It applies to all the cars, the AI ones too:
none stays stuck against a border anymore.

### The minimap

In `race.js` the minimap receives a new graph, made only of the segments of
`world.corridor.skeleton`: you see the path to drive, not all the roads of the world. That's why
it is created after the corridor. `MiniMap` also receives the cars and draws a gray dot for each
one; the zoom goes from 0.05 to 0.1.

```js
miniMapCanvas.style.transform = "rotate(" + myCar.angle + "rad)";
```

At every frame the minimap canvas rotates, via CSS, by the same angle as the car. In the drawing
the direction of the car is rotated by `angle` counterclockwise from up; the CSS `rotate` turns
clockwise and brings it back up. The minimap works like a sat nav: forward is always up.
`sim.html` uses the same `MiniMap`, with its 500 cars and the whole graph, without rotation.

### Ranking and sky

In the ranking the names of the AI cars become white, the player's one keeps its color on a white
background. `overflow:hidden` removes the scrollbar: only the first rows are visible. Behind the 3D
view, `#cameraCanvas` has a background fading from light blue to white: the canvas is transparent
where nothing is drawn, and the sky shows above the horizon.

### Limitations

- When the car touches a wall, `car.js` still does what it did before: speed to zero and, for your
  car, `explode()`. The correction unblocks it, but only afterwards. Pushing against a wall the car
  stops and starts again in jerks: in the test, in 3 seconds of scraping, the explosion played 13
  times.
- `damaged` goes back to `false` in the same frame, so the 💀 of the ranking no longer appears.
- The correction uses the skeleton, not the real wall: it works because the corridor is centered
  on the skeleton. Where two stretches of the path pass close to each other, the nearest segment
  can be the wrong one.
- `carAngle`, the angle of all the wheels, is computed from the left side after narrowing nose and
  tail differently (6 units against 3). The side is no longer parallel to the car, and the wheels
  are crooked by about 3.4°.
- `distance / 20`: a wheel of radius 5 should turn by `distance / 5` so as not to slip, so it turns
  at a quarter of the right speed.
- The polygons are not sorted by distance, as in Part 7: transparency and fade make the scene more
  readable, but a low wall behind the car can still end up on top of it.
- `#extrudeCar` takes the first polygon out of the filter and uses its first four points. It's
  fine as long as the car is entirely in the field of view; if the filter clipped it, the points
  would no longer be the four corners.
- With the ranking without scrolling, if you are beyond the first rows you don't see your position.
- Without a Target there is no corridor: besides `updateCarProgress` (Part 4), now the creation of
  the minimap errors out too.
- `globalAlpha` stays at the last value used after `render`; it causes no problems only because
  that canvas is used only by the camera.

### How to try it

Open `race.html` from the local server. During the countdown look at the car: wheels, hood and
roof. After the GO! steer and look at the front wheels, then throw yourself against a wall: you
hear the explosion, but the car is pushed back and starts again. You see the AI cars as gray
shadows and as dots in the minimap, which turns with you. With `camera.html` or `phone.html` the
wheels follow the tilt of the steering wheel or of the phone.
