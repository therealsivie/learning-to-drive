# 4. Collision detection

Here the car stops being a rectangle drawn with canvas transformations and becomes a real polygon
with four vertices in world coordinates. This makes it possible to tell when it touches a border:
in that case it "breaks", stops and turns gray.

## What changes compared to chapter 3

| File | What's new |
|------|--------|
| `car.js` | `damaged`, `#createPolygon`, `#assessDamage`, drawing goes through the polygon |
| `utils.js` | Added `polysIntersect` |

The rest is unchanged.

## The car polygon

```js
#createPolygon(){
    const points=[];
    const rad=Math.hypot(this.width,this.height)/2;
    const alpha=Math.atan2(this.width,this.height);
    points.push({
        x:this.x-Math.sin(this.angle-alpha)*rad,
        y:this.y-Math.cos(this.angle-alpha)*rad
    });
    ...
}
```

To find the 4 corners of the rotated car I had to reason in polar coordinates relative to the
center:

- `rad` is half the diagonal of the rectangle, that is the distance from the center to each
  corner. With a 30x50 car it is about 29.15.
- `alpha` is the angle between the diagonal and the vertical axis of the car. `atan2(width,height)`
  is used and not `atan2(height,width)` because the angle is measured from the vertical,
  consistently with the rest of the project.
- The four vertices are at the angles `angle-alpha`, `angle+alpha`, `PI+angle-alpha` and
  `PI+angle+alpha`. The first two are the front corners, the other two (rotated by 180 degrees)
  the rear ones.

Each point is obtained with the usual `x - sin`, `y - cos` formula multiplied by `rad`. The
advantage over `translate`/`rotate` is that now I have the actual vertices, on which I can do
geometric calculations.

## polysIntersect

```js
function polysIntersect(poly1, poly2){
    for(let i=0;i<poly1.length;i++){
        for(let j=0;j<poly2.length;j++){
            const touch=getIntersection(
                poly1[i],
                poly1[(i+1)%poly1.length],
                poly2[j],
                poly2[(j+1)%poly2.length]
            );
            if(touch){
                return true;
            }
        }
    }
    return false;
}
```

It compares each side of the first polygon with each side of the second, reusing `getIntersection`
from chapter 3. The `%` (modulo) closes the polygon: the last vertex connects to the first.

Things I noticed while studying this function:

- It returns at the first crossing found (`return true`): it doesn't matter where they touch, only
  whether they touch.
- It only checks whether the **sides** cross. A polygon completely contained in another would not
  be detected. Here that never happens, because the car moves less than 3 px per frame and can't
  "jump" inside an obstacle without first touching its border.
- The road borders are 2-point "polygons". With the modulo the segment is checked twice (from 0 to
  1 and from 1 to 0): it's a waste, but the result is correct and the function stays the same for
  all cases.

## Damage

```js
update(roadBorders){
    if(!this.damaged){
        this.#move();
        this.polygon=this.#createPolygon();
        this.damaged=this.#assessDamage(roadBorders);
    }
    this.sensor.update(roadBorders);
}
```

- Movement, polygon and damage check only happen if the car isn't already damaged. Once broken it
  stays still forever: there is no way to restart, you have to reload the page.
- The sensor, instead, keeps updating even when the car is stopped.
- `#assessDamage` goes through the borders and returns `true` at the first one that intersects the
  polygon.

## Drawing from the polygon

```js
if(this.damaged){
    ctx.fillStyle="gray";
}else{
    ctx.fillStyle="black";
}
ctx.beginPath();
ctx.moveTo(this.polygon[0].x,this.polygon[0].y);
for(let i=1;i<this.polygon.length;i++){
    ctx.lineTo(this.polygon[i].x,this.polygon[i].y);
}
ctx.fill();
```

Out go `save`, `translate`, `rotate` and `restore`: the car is drawn directly by connecting its
vertices. That way what I see on screen is exactly the shape used for collisions, and if there is a
mistake in the polygon calculation I notice it right away. The gray color marks the damaged car.

One consequence: `draw` uses `this.polygon`, which is created in `update`. It works because in
`animate` `update` is always called before `draw`.

## How to try it

Open `index.html` and drive into a border: the car turns gray and stops. To start over, reload the
page.
