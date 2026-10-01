# 7. Visualizing neural networks

In this chapter the second canvas comes to life: the neural network is drawn in real time, with the
neurons turning on and off while the car drives. It is the chapter that makes "visible" what up to
now was just a handful of numbers.

## What changes compared to chapter 6

| File | What's new |
|------|--------|
| `visualizer.js` | New, `Visualizer` class |
| `utils.js` | Added `getRGBA` |
| `main.js` | `animate(time)` receives the time, sets `lineDashOffset` and calls the visualizer |
| `index.html` | Loads `visualizer.js` |

## Encoding values as colors

```js
function getRGBA(value){
    const alpha=Math.abs(value);
    const R=value<0?0:255;
    const G=R;
    const B=value>0?0:255;
    return "rgba("+R+","+G+","+B+","+alpha+")";
}
```

Every value between -1 and 1 (weight, bias, input, output) becomes a color:

- **positive**: yellow (255,255,0);
- **negative**: blue (0,0,255);
- **intensity**: the opacity is the absolute value, so a value close to 0 is almost transparent
  and can't be seen.

At a single glance you can tell which connections matter (the most visible ones) and in which
direction they push.

## Visualizer.drawNetwork

```js
const margin=50;
const levelHeight=height/network.levels.length;
for(let i=network.levels.length-1;i>=0;i--){
    const levelTop=top+lerp(height-levelHeight,0,
        network.levels.length==1?0.5:i/(network.levels.length-1));
    ctx.setLineDash([7,3]);
    Visualizer.drawLevel(...);
}
```

- The network is drawn from the bottom (inputs) to the top (outputs), with a 50 px margin.
- Each level takes up a vertical band, positioned with `lerp`. Level 0 is at the bottom and the
  last one at the top.
- The levels are drawn **from the last to the first**. It is not by chance: the outputs of a level
  coincide with the inputs of the level above, at the same point on the screen. The level below,
  drawn last, puts its output nodes over the input nodes of the level above, and so the bias circle
  stays visible instead of being covered.
- `network.levels.length==1?0.5:...` avoids a division by zero with a single level. In this
  chapter there are 2 levels, but in chapter 10 the network will have a single level and this case
  will actually be used.
- Only the last level gets the labels `['🠉','🠈','🠊','🠋']`, that is forward, left, right and
  reverse.

## Visualizer.drawLevel

For each level it draws, in this order:

1. **The connections**: a line from each input to each output, colored with
   `getRGBA(weights[i][j])`. They are dashed (`[7,3]`).
2. **The input nodes** at the bottom: a black circle with radius 18 and inside it a smaller circle
   (60%) colored with the input value.
3. **The output nodes** at the top: same scheme, plus a ring at 80% of the radius colored with the
   **bias** and dashed with `[3,3]`. Right after that it goes back to `setLineDash([])`.
4. **The labels** on the output nodes, black text with a thin white outline, so the arrow can be
   read on both an off and an on node.

The x coordinates of the nodes are computed with `#getNodeX`, which uses `lerp` between the left
and right edge (and, again, handles the case of a single node by putting it in the center).

## The dash animation

```js
function animate(time){
    ...
    networkCtx.lineDashOffset=-time/50;
    Visualizer.drawNetwork(networkCtx,car.brain);
    requestAnimationFrame(animate);
}
```

`requestAnimationFrame` passes a timestamp in milliseconds to the callback. Using it as
`lineDashOffset` the dashes move slowly and the connections seem to "flow" from the bottom to the
top, like a signal going through the network. The minus sign decides the direction. It is a
one-line effect that makes the network much more readable.

A curiosity: on the very first call (`animate()` launched by hand) `time` is `undefined`, so the
offset is `NaN`. The canvas ignores invalid values, so nothing bad happens, and from the next frame
the time is the right one.

## How to try it

Open `index.html`. On the left the car with its random network, on the right the network. Reload a
few times and compare different networks: you can see right away when an output always stays on
(for example the up arrow) or never turns on.
