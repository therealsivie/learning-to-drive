# 9. Fine-tuning

The final version of the first phase of the project. The logic is the one of chapter 8 with `N=100`
cars, but the graphics take a leap: instead of rectangles there is the image of a car, colored
differently for each traffic car.

## What changes compared to chapter 8

| File | What's new |
|------|--------|
| `car.png` | New, car sprite (75x117) |
| `car.js` | The color is passed to the constructor, colored mask, drawing with image and `multiply` |
| `utils.js` | Added `getRandomColor` |
| `main.js` | `N=100`, traffic gets random colors, `draw` without color |

## The colored image: the mask trick

I wanted to understand properly how you get a car of any color starting from a single PNG. It
happens in two steps.

### 1. In the constructor: creating the mask

```js
this.mask=document.createElement("canvas");
this.mask.width=width;
this.mask.height=height;

const maskCtx=this.mask.getContext("2d");
this.img.onload=()=>{
    maskCtx.fillStyle=color;
    maskCtx.rect(0,0,this.width,this.height);
    maskCtx.fill();

    maskCtx.globalCompositeOperation="destination-atop";
    maskCtx.drawImage(this.img,0,0,this.width,this.height);
}
```

- Each car has its own off-screen canvas as big as the car (30x50), never added to the page.
- The whole rectangle is filled with the car's color.
- With `destination-atop` the color already there (the "destination") stays **only where the new
  image is opaque**. So the result is a silhouette of the car filled with color, with a transparent
  background.
- Everything happens in `onload`, because before the image is loaded it can't be used as a shape.

### 2. In draw: overlaying mask and image

```js
ctx.save();
ctx.translate(this.x,this.y);
ctx.rotate(-this.angle);
if(!this.damaged){
    ctx.drawImage(this.mask, -this.width/2, -this.height/2, this.width, this.height);
    ctx.globalCompositeOperation="multiply";
}
ctx.drawImage(this.img, -this.width/2, -this.height/2, this.width, this.height);
ctx.restore();
```

- First the colored silhouette is drawn.
- Then, with `multiply`, the original PNG is drawn on top. `multiply` multiplies the colors: where
  the PNG is white the mask color stays, where it is dark (windows, shadows, outlines) the result
  gets darker. This way the car is colored but keeps the details of the drawing.
- If the car is damaged the mask is skipped and only the PNG is drawn in its original tint: it is
  the new way of showing that it broke, instead of gray.
- `restore()` also brings `globalCompositeOperation` back to the normal value, so the `multiply`
  mode doesn't "contaminate" the rest of the drawing.

`translate` + `rotate` are back too, dropped in chapter 4. To draw a rotated image it is the
simplest solution. The polygon is still computed every frame for collisions and sensors, it just
isn't drawn anymore.

I noticed that the image is 75x117 but is drawn at 30x50: `drawImage` scales it, distorting it very
slightly because the proportions are almost the same (0.64 versus 0.6).

## Random colors

```js
function getRandomColor(){
    const hue=290+Math.random()*260;
    return "hsl("+hue+", 100%, 60%)";
}
```

The hue starts at 290 and goes up to 550. Since in HSL the hue is an angle, 550 is the same as 190:
so the colors cover from 290 to 360 and from 0 to 190. The gap left out is between 190 and 290,
that is **the blues**. The reason is that the AI cars are blue (default color in the constructor),
and this way the traffic is never mistaken for them. It struck me as a very careful detail.

## The rest

- `draw(ctx,drawSensor=false)`: the color is no longer passed every frame but is a property of the
  car, set in the constructor.
- `N=100`: a hundred cars in parallel, each with 5 rays that check 2 borders and 7 cars (28 sides)
  every frame. That is about 15,000 intersection calculations per frame, and JavaScript handles
  them without problems.
- Damaged cars keep updating the sensor and running the network even if they are stopped: it is
  wasted work, but it doesn't affect the result.
- The brain stays `[5,6,4]` and the mutation stays at 0.1.

## How to try it

Open `index.html` and use 💾 and 🗑️ as in chapter 8. With 100 cars a few generations are enough to
get a car that gets past all the traffic.

A note: if I open the page directly from `file://` the PNG is loaded and drawn without problems,
because only `drawImage` is used and the canvas pixels are never read (`getImageData` would throw a
security error).
