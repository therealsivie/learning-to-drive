# 2. Road definition

In this chapter the car finally has a road: three lanes, side borders and a camera that follows it
as it goes up. The car physics and the controls are identical to chapter 1.

## What changes compared to chapter 1

| File | What's new |
|------|--------|
| `utils.js` | New, contains only `lerp` |
| `road.js` | New, `Road` class |
| `main.js` | Creates the road, puts the car in the middle lane and translates the canvas to follow it |
| `index.html` | Loads `utils.js` and `road.js` before the other scripts |

`car.js`, `controls.js` and `style.css` don't change.

## lerp

```js
function lerp(A,B,t){
    return A+(B-A)*t;
}
```

Linear interpolation: with `t=0` it returns A, with `t=1` it returns B, with values in between a
point in the middle. It looks trivial, but from here on it is used everywhere: for the lanes, to
spread the sensor rays, for the intersection points, to position the network nodes in the
visualizer and even to mutate the network weights in chapter 8. It is the most reused function of
the project.

## Road

```js
constructor(x,width,laneCount=3)
```

In `main.js` it is created like this:

```js
const road=new Road(canvas.width/2,canvas.width*0.9);
```

With the canvas 200 px wide: center at x=100 and width 180, so left border at 10 and right border
at 190. The leftover 10% leaves some margin on the sides.

### The "infinite" road

```js
const infinity=1000000;
this.top=-infinity;
this.bottom=infinity;
```

The road goes from y=-1000000 to y=1000000. It isn't really infinite, but for a car going less
than 3 px per frame it is in practice: it would take hours to reach the end.

I noticed that JavaScript's `Infinity` isn't used, and that's on purpose. In chapter 3 the borders
become segments on which intersections are computed, and calculations with `Infinity` easily
produce `NaN` (for example `Infinity - Infinity` or `0 * Infinity`). A large but finite number
avoids the problem.

### The borders as segments

```js
this.borders=[
    [topLeft,bottomLeft],
    [topRight,bottomRight]
];
```

The borders are stored as an array of segments, each segment is a pair of `{x,y}` points. In this
chapter they are only needed for drawing, but this structure is already designed for the future:
sensors and collisions will work precisely on these segments. This choice would also allow
non-straight borders, and that's what happens in chapter 10.

### Lane centers

```js
getLaneCenter(laneIndex){
    const laneWidth=this.width/this.laneCount;
    return this.left+laneWidth/2+
        Math.min(laneIndex,this.laneCount-1)*laneWidth;
}
```

With 3 lanes 60 px wide the centers are at x=40, 100 and 160. The `Math.min` makes sure that
asking for a lane that doesn't exist (for example lane 5) gives the last one instead of a position
off the road. Negative indices, however, are not handled.

### Drawing

- The lines between the lanes are dashed with `setLineDash([20,20])` (20 px solid, 20 empty) and
  positioned with `lerp(left,right,i/laneCount)`.
- Before drawing the borders `setLineDash([])` is called to go back to a solid line. Without this
  reset the borders would be dashed too, because the style stays in the context.
- Width 5 px, color white.

## The camera

```js
ctx.save();
ctx.translate(0,-car.y+canvas.height*0.7);
road.draw(ctx);
car.draw(ctx);
ctx.restore();
```

It isn't the car that stays still, it's the world that moves. On every frame the canvas is
translated vertically so that the car always ends up at 70% of the screen height, that is a bit
below the center. That way you see more road ahead than behind, which is what you need when
driving.

The translation is only vertical: if the car goes right or left you see it move sideways, and the
road stays still horizontally.

The car now starts from `road.getLaneCenter(1)`, that is the middle lane, and no longer from a
hard-coded x=100 (even though the result is the same).

## How to try it

Open `index.html` and drive with the arrow keys. You can still cross the borders without
consequences: collisions come in chapter 4.
