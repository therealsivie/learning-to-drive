# 3. Artificial sensors

The car starts to "see". I add a sensor made of 5 rays that start from its center and measure at
what distance they meet the road borders. It's a simplified form of raycasting, the same idea
behind a lidar.

## What changes compared to chapter 2

| File | What's new |
|------|--------|
| `sensor.js` | New, `Sensor` class |
| `utils.js` | Added `getIntersection` |
| `car.js` | The car creates a `Sensor`, updates it and draws it |
| `main.js` | `car.update(road.borders)`: the car now receives the borders |
| `index.html` | Loads `sensor.js` |

## Sensor

```js
this.rayCount=5;
this.rayLength=150;
this.raySpread=Math.PI/2;
```

Five rays 150 px long spread over a 90-degree fan (PI/2), so from +45 to -45 degrees relative to
the direction of the car. The sensor receives the car in the constructor and reads its position
and angle on every update.

### Casting the rays

```js
const rayAngle=lerp(
    this.raySpread/2,
    -this.raySpread/2,
    this.rayCount==1?0.5:i/(this.rayCount-1)
)+this.car.angle;
```

- `lerp` spreads the angles evenly from +45 to -45 degrees. Starting from +45 the first ray is the
  leftmost one (remember that a positive angle goes left).
- `this.rayCount==1?0.5:...` avoids a division by zero: with a single ray `i/(rayCount-1)` would
  become `0/0`, that is `NaN`. In that case the ray goes straight through the middle.
- `this.car.angle` is added, so the fan rotates together with the car.

The end point of each ray is computed with the same `x - sin`, `y - cos` formula used to move the
car in chapter 1. All the rays start from the **center** of the car and not from its nose.

### Readings

For each ray `#getReading` computes the intersection with each border, collects all the touch
points in `touches` and keeps only the closest:

```js
const offsets=touches.map(e=>e.offset);
const minOffset=Math.min(...offsets);
return touches.find(e=>e.offset==minOffset);
```

If a ray doesn't touch anything the reading is `null`. `this.readings` therefore always has 5
elements, each either `null` or `{x, y, offset}`. Keeping the closest is essential: a ray can go
through several obstacles, but as with sight only the first one counts.

### Drawing

Each ray is drawn in two pieces:
- **yellow** from the center of the car to the touch point (or to the end if it doesn't touch
  anything);
- **black** from the touch point to the theoretical end of the ray.

That way you immediately see where the sensor "hits". The black from end point to end point is a
zero-length segment when there is no touch, so in that case it isn't visible.

## getIntersection: the mathematical heart

```js
function getIntersection(A,B,C,D){
    const tTop=(D.x-C.x)*(A.y-C.y)-(D.y-C.y)*(A.x-C.x);
    const uTop=(C.y-A.y)*(A.x-B.x)-(C.x-A.x)*(A.y-B.y);
    const bottom=(D.y-C.y)*(B.x-A.x)-(D.x-C.x)*(B.y-A.y);
    ...
}
```

It computes where segment AB (the ray) and segment CD (a border) cross. The idea is to write the
two segments in parametric form:

- a point on AB is `A + t·(B-A)` with t between 0 and 1;
- a point on CD is `C + u·(D-C)` with u between 0 and 1.

Requiring the two points to coincide gives a system of two equations (one for x and one for y)
with two unknowns, t and u. Solving it gives the three expressions above: `tTop/bottom` is t and
`uTop/bottom` is u.

- If `bottom` is 0 the segments are parallel and never meet (or they overlap): no intersection.
- If t and u are both between 0 and 1, the crossing falls inside both segments and not on the
  extension of one of the two lines.

The result contains the point (computed with `lerp(A,B,t)`) and `offset: t`, that is **at what
fraction of the ray** the touch happens: 0 means right at the car, 1 means at the end of the ray.
This `offset` becomes very important in chapter 6, because it's exactly what the neural network
will receive as input.

## Connection with Car

```js
update(roadBorders){
    this.#move();
    this.sensor.update(roadBorders);
}
```

The sensor is updated after the movement, so it reads the new position. It is drawn after the car
and after the `restore()`, so in world coordinates and not rotated together with the car: that
makes sense, because the rays are already computed in absolute coordinates.

## How to try it

Open `index.html`, get close to the borders and watch the rays turn yellow only up to the border,
with the part beyond it in black. The car can still cross the borders.
