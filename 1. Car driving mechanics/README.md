# 1. Car driving mechanics

First step of the project: a car (for now a black rectangle) driven with the keyboard arrow keys
inside a canvas. No road, no sensors, no neural network. It only serves to build the basic physics,
which then stays practically unchanged until the last chapter.

## Files

| File | What it does |
|------|---------|
| `index.html` | Page with a single `<canvas id="myCanvas">` and the scripts loaded in order |
| `style.css` | Dark gray background, centered light gray canvas, `overflow:hidden` to avoid scrollbars |
| `controls.js` | `Controls` class: reads the arrow keys and keeps four booleans |
| `car.js` | `Car` class: position, speed, angle, physics and drawing |
| `main.js` | Creates canvas and car and runs the animation loop |

There are no ES modules or bundlers: the scripts are loaded with plain `<script src>` tags and
share the global scope. That's why the order in the HTML matters: `controls.js` must come before
`car.js`, because the `Car` constructor does `new Controls()`, and `main.js` goes last.

## Controls

```js
this.forward=false;
this.left=false;
this.right=false;
this.reverse=false;
```

Four flags, one per arrow key. On `keydown` they become `true`, on `keyup` they go back to `false`.
The fact that they are separate states and not single events is what allows holding two arrow keys
together (for example up and left to turn while accelerating).

A peculiarity that struck me: the listeners are assigned with `document.onkeydown = ...` and not
with `addEventListener`. It works, but it means there is a single handler for the whole page: if I
created two `Controls`, the second would overwrite the first. In this chapter it's not a problem
(there is a single car), but it's the reason why later on only one car at a time can be driven
from the keyboard.

The `#addKeyboardListeners` method is private (`#` syntax of ES2022 classes), as is `#move` in
`Car`. It isn't essential, but it makes clear what is public API and what isn't.

Inside the handlers arrow functions are used: this is important, because that way `this` stays the
`Controls` instance. With a regular `function`, `this` would be `document`.

## Car

Initial state:

```js
this.speed=0;
this.acceleration=0.2;
this.maxSpeed=3;
this.friction=0.05;
this.angle=0;
```

All values are in pixels per frame (not per second). The loop doesn't take into account the time
elapsed between one frame and the next, so on a 120 Hz screen the car goes twice as fast as on a
60 Hz one. For a demo that's perfectly fine.

### The physics in `#move()`

1. **Acceleration**: the up arrow adds `acceleration`, the down arrow subtracts it. The same down
   arrow acts as brake and reverse: if you are going forward you slow down, when you reach zero
   you start going backwards.
2. **Limits**: the speed doesn't exceed `maxSpeed` forward and `-maxSpeed/2` in reverse. Reverse
   is deliberately slower, like in a real car.
3. **Friction**: on every frame `friction` is subtracted in the direction of motion. If the
   absolute value of the speed is less than the friction it is set to zero, otherwise the car
   would oscillate forever between +0.05 and -0.05 without ever really stopping.
4. **Steering**: the car only turns if it is moving (`speed!=0`), because a stationary car spinning
   on itself is not realistic.
5. **Movement** based on the angle.

A subtle detail: since friction is applied after the speed limit, the actual top speed at steady
state is `3 - 0.05 = 2.95`. On every frame it reaches 3.15, gets cut to 3 and friction brings it
to 2.95.

### The `flip` trick

```js
const flip=this.speed>0?1:-1;
if(this.controls.left){
    this.angle+=0.03*flip;
}
```

In reverse the steering is inverted. If you go backwards and turn left, the nose of the car goes
right, just as happens when actually driving. Without `flip` reverse feels counterintuitive.

### Why `x -= sin` and `y -= cos`

```js
this.x-=Math.sin(this.angle)*this.speed;
this.y-=Math.cos(this.angle)*this.speed;
```

Here angle 0 corresponds to "straight up" and not to "to the right" as in classic trigonometry. On
top of that, in the canvas the y axis grows downwards. Putting the two things together:

- with `angle=0`: `sin=0`, `cos=1`, so x doesn't change and y decreases (the car goes up);
- with a positive angle the car goes left, and that's why the left arrow *increases* the angle.

It's the same convention the sensors will use in chapter 3, so it's worth understanding it well
here.

### Drawing

```js
ctx.save();
ctx.translate(this.x,this.y);
ctx.rotate(-this.angle);
ctx.rect(-this.width/2,-this.height/2,this.width,this.height);
ctx.fill();
ctx.restore();
```

Instead of computing the four rotated corners by hand, the canvas origin is moved to the center of
the car, the reference frame is rotated and a rectangle centered at (0,0) is drawn.
`save`/`restore` put the context back as it was, so the transformation doesn't accumulate frame
after frame. The rotation is `-this.angle` because the canvas `rotate` goes clockwise, while our
positive angle goes left.

## main.js and the loop

```js
function animate(){
    car.update();
    canvas.height=window.innerHeight;
    car.draw(ctx);
    requestAnimationFrame(animate);
}
```

- `requestAnimationFrame` calls `animate` at the next screen refresh, usually 60 times per second.
- `canvas.height=window.innerHeight` does two things at once: it fits the canvas to the window
  height and **clears the canvas**. Assigning `width` or `height` to a canvas resets it completely
  (pixels, transformations, styles). It's a compact way to avoid a `clearRect`.
- The width is fixed at 200 px, the car starts at (100,100) and is 30x50.

## How to try it

Just open `index.html` in the browser and use the arrow keys. The car can leave the canvas: there
is no limit yet, nor a camera following it; they will come in the next chapter.
