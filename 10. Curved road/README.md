# 10. Curved road

An experiment that starts from the code of chapter 8 and changes two things: the road becomes
**curved** and the neural network loses the **hidden layer**. It is not the follow-up to chapter 9:
the colored sprite and the multicolored traffic are not there, the car goes back to being a polygon.

The goal is to see whether a minimal network can follow a road that doesn't go straight, and what
needs to change in the rest of the code for non-straight borders to work.

## What changes compared to chapter 8

| Aspect | Chapter 8 | Chapter 10 |
|---------|------------|-------------|
| Road | Straight, 3 lanes, 180 px wide | Sinusoidal stretch, 90 px wide, lanes not drawn |
| Borders | 2 segments | 2 polylines of about 100 points |
| Network | `[5,6,4]` | `[5,4]` |
| Sensor | Tied to the car, 90° spread | Independent of the car, 45° spread |
| Traffic | 7 cars | 1 car |
| Mutation | 0.1 | 0.4 |
| Saving | 💾 and 🗑️ buttons, `bestBrain` key | `save()` and `discard()` from the console, `curvedRoadBestBrain` key |
| Visualizer | Animated dashed lines, radius 18 nodes | Solid lines, radius 14 nodes |

The formatting changes too: 3-space indentation instead of 4.

## The curved road

```js
this.left=x-width/4;
this.right=x+width/4;

const infinity=10000;
...
this.curveTop=-1000;
this.curveBottom=0;

const ys=[this.top];
for(let y=this.curveTop;y<=this.curveBottom;y+=10){
   ys.push(y);
}
ys.push(this.bottom);

this.borders=[[],[]];
ys.forEach(y=>{
   const offset=this.#curveOffset(y);
   this.borders[0].push({x:this.left+offset,y:y});
   this.borders[1].push({x:this.right+offset,y:y});
});
...
#curveOffset(y){
   const curveY=Math.min(Math.max(y,this.curveTop),this.curveBottom);
   return Math.sin(curveY*0.01)*50;
}
```

- Each border is no longer a segment but a **polyline**: one point at the top, one point every
  10 px between y=-1000 and y=0 shifted horizontally by a sine wave, one point at the bottom.
- 10 px is enough: between two points the chord deviates from the curve by about 0.06 px
  (`A·k²·h²/8` with amplitude 50, `k=0.01` and step 10), so the road is identical to one sampled
  every pixel but with ten times fewer segments.
- `Math.sin(y*0.01)*50` has an amplitude of 50 px and a period of about 628 px (2π/0.01): in the
  1000 px of the curved stretch there are about one and a half curves.
- The width is halved (`width/4` per side instead of `width/2`): 90 px, one and a half lanes. The
  lanes disappear completely, along with `laneCount` and `getLaneCenter`, and the borders are drawn
  dashed.
- All the points, including the ones at the top and at the bottom, go through `#curveOffset`. The
  `y` is clamped inside the curved stretch, so outside of it the road goes back to straight and
  keeps the shift of the last point: at the bottom it is zero (`sin(0)`), at the top it is about
  27 px (`sin(-10)*50`). This way the road is continuous and the final segment up to y=-10000 stays
  vertical, instead of slanting back towards the starting x.
- "Infinity" is 10000 instead of a million: it is enough, since the interesting stretch is 1000 px
  long.

## Collisions with polylines

In chapter 4 `polysIntersect` closed the polygons with the modulo, connecting the last vertex to
the first. On a border of 103 points this would add a segment going from the bottom of the road to
the top, a straight line that cuts across the whole roadway. Now the function works on open
polylines:

```js
function polysIntersect(poly1, poly2){
   for(let i=0;i<poly1.length-1;i++){
      for(let j=0;j<poly2.length-1;j++){
         const touch=getIntersection(
            poly1[i], poly1[i+1],
            poly2[j], poly2[j+1]
         );
         ...
```

and when a closed polygon is needed it is closed by hand, appending the first vertex at the end:

```js
polysIntersect(
   [...this.polygon,this.polygon[0]],
   roadBorders[i])
```

The sensor follows the same reasoning: it goes through the borders segment by segment
(`border[i-1]`, `border[i]`) and uses the modulo only for the car polygons, which are closed.

The price is the number of intersections. Each ray checks about 200 border segments, and the same
goes for the four sides of each car still intact. With 100 cars it gets to about 180,000 calls to
`getIntersection` per frame, against the roughly 15,000 of chapter 9. Sampling the curve every pixel
it would be almost two million, and the simulation would become visibly less smooth.

For the same reason a broken car stops working altogether:

```js
update(roadBorders,traffic){
   if(this.damaged){
      return;
   }
   ...
```

In chapters 8 and 9 only movement and collisions were guarded by `if(!this.damaged)`: sensor and
network kept running even for the cars stopped against the wall, computing controls that nobody
would use anymore. There it cost little, here each broken car would waste about 1000 intersections
per frame. The drawing doesn't change: if the best car is broken, the rays show the last readings,
which stay valid because the car no longer moves.

## Sensor independent of the car

```js
constructor(){
   this.rayCount=5;
   this.rayLength=150;
   this.raySpread=Math.PI/4;
   ...
}

update(x,y,angle,roadBorders,traffic){
   this.#castRays(x,y,angle);
   ...
}
```

`Sensor` no longer receives the car in the constructor: position and angle arrive with each
`update`. This way it no longer depends on the structure of `Car` and could be mounted on any
object.

The ray spread drops to 45° (`PI/4`): on a narrow road you need rays focused forward more than to
the sides. The ray is drawn only in yellow up to the contact point: the black stretch beyond that
point is gone.

## Network without a hidden layer

```js
this.brain=new NeuralNetwork(
   [this.sensor.rayCount,4]
);
```

The 5 inputs are connected directly to the 4 outputs, with a single level. Each output is a
perceptron: weighted sum of the ray readings compared with the bias. It seems very little, but to
stay on the road it is enough, because "if the left ray is close, turn right" is a linear rule.

With a single level, the `network.levels.length==1 ? 0.5` case of chapter 7 comes into play in the
visualizer, centering the level vertically.

`Level.feedForward` copies the inputs with a spread instead of assigning them one by one:

```js
level.inputs=[...givenInputs];
```

## main.js

Compared to chapter 8 the file is leaner:

- **No `getElementById`**: `carCanvas` and `networkCanvas` are used directly. It works because the
  browser creates a global variable for each element with an `id`. It is handy but fragile:
  declaring a variable with the same name is enough to lose the reference.
- **No `save`/`restore`** around `translate`: assigning `carCanvas.height` at the start of each
  frame already resets the transformations.
- **No buttons**: `save()` and `discard()` still exist, but they are called from the console.
- `networkCanvas.width=298` and in the HTML the two `<canvas>` are on the same line without spaces:
  the whitespace between two inline elements would create a gap, this way instead the canvases are
  right next to each other.
- The cars all start from x=100, the center of the road on the initial straight: without lanes
  `getLaneCenter` is no longer needed.

### Traffic

```js
const trafficOffset=-20;
const traffic=[
   new Car(road.getCenter(-100)+trafficOffset,-100,30,50,"DUMMY",2)
];
...
const car=traffic[i];
car.x=road.getCenter(car.y)+trafficOffset;
car.angle=road.getAngle(car.y);
car.update([],[]);
```

A single car, which follows the road. Every frame it is put back on the curve before moving:

- `road.getCenter(y)` returns the x of the center of the road at that height, that is `x` plus the
  same `#curveOffset` used for the borders.
- `road.getAngle(y)` returns the slope of the curve at that point: `atan` of the difference between
  the center at `y` and the one at `y-1`. It is the angle that, with the `#move` convention
  (`x-=sin(angle)*speed`), makes the car move along the tangent, tilted by at most about 27°.
  Outside the curved stretch the difference is zero and the car goes straight again.

`trafficOffset` shifts the car 20 px to the left of the center. On a 90 px wide road a 30 px wide
car placed in the center would leave 30 px per side, so no gap. Shifted to the left it leaves at
least 40 px on the right even at the most slanted point of the curve, enough to overtake.

The update still happens with empty borders, so the car never breaks. But now it is no longer
needed as a trick: before it always went straight at x=100 and crossed the border when the road
wavered, now it always stays on the roadway.

### Stronger mutation

```js
NeuralNetwork.mutate(cars[i].brain,0.4);
```

0.4 instead of 0.1: the variants are much more different from each other. It explores more, at the
cost of losing more easily what was good in the saved network. With a network as small as `[5,4]`
pushing harder makes sense.

### The order in #move

The steering is applied before the speed limit and the friction instead of after. The practical
difference is negligible: it only changes something in the exact frame in which the car stops.

## How to try it

1. Open `index.html` and the browser console (F12).
2. The first generation is random: almost all the cars crash right away or stay still. Reload
   until one goes a bit further than the others.
3. When a car goes far type `save()` and reload. `discard()` to start over from scratch.
4. The parameters to try are `N` in `main.js` and the mutation amount (0.4).

The network is saved with the `curvedRoadBestBrain` key, not with the `bestBrain` of chapters 8
and 9. `localStorage` is shared by all the pages of the same origin: with the same key this chapter
would load a `[5,6,4]` network trained on a straight road, which runs without errors but goes
straight into the wall.

Every time you change the structure of the network or the number of rays you need a `discard()`,
otherwise a network with the wrong dimensions comes back from `localStorage`.
