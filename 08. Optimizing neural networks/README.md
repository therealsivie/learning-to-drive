# 8. Optimizing neural networks

Here the network starts learning. Not with backpropagation, but with a very simple evolutionary
approach: many cars are launched together, each with a slightly different network, the best one is
chosen, saved and used as the base for the next generation.

## What changes compared to chapter 7

| File | What's new |
|------|--------|
| `network.js` | Added `NeuralNetwork.mutate` |
| `main.js` | N cars in parallel, `bestCar`, saving to `localStorage`, 7 traffic cars |
| `car.js` | `draw` receives `drawSensor` to draw the rays of the best car only |
| `index.html` | 💾 and 🗑️ buttons between the two canvases |
| `style.css` | Flex layout and button style |

## Mutation

```js
static mutate(network,amount=1){
    network.levels.forEach(level => {
        for(let i=0;i<level.biases.length;i++){
            level.biases[i]=lerp(
                level.biases[i],
                Math.random()*2-1,
                amount
            )
        }
        ...same for weights...
    });
}
```

Every weight and every bias moves towards a random value in [-1, 1] by an amount equal to
`amount`. Once again it is `lerp` that does the work:

- `amount=0`: the network stays identical;
- `amount=1`: the network becomes completely random;
- `amount=0.1`: every value moves 10% towards a random number, that is a small variation around
  the starting network.

One thing I like: the value always stays in the [-1, 1] range, because it is a weighted average
between two numbers that are already in that range.

## Many cars in parallel

```js
const N=1;
const cars=generateCars(N);
```

`generateCars` creates N `"AI"` cars, all in the middle lane at y=100. In the code of this chapter
N is 1. To actually train it has to be raised (in chapter 9 it becomes 100): more cars means more
variants tried at each generation.

### Which one is the best

```js
bestCar=cars.find(
    c=>c.y==Math.min(
        ...cars.map(c=>c.y)
    ));
```

The "fitness" is simply how far the car went: the smallest y (remember that going up means
decreasing y). It is a very rough fitness function, but it is enough: to move forward the car has
to avoid traffic and borders, so whoever gets the farthest is also whoever drives the best.

`bestCar` is recomputed every frame, and the camera always follows it.

## Saving and resuming

```js
function save(){
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
}
function discard(){
    localStorage.removeItem("bestBrain");
}
```

- 💾 saves the brain of the best car as JSON in `localStorage`.
- 🗑️ deletes the save and starts again from random networks.

At startup, if there is a saved brain:

```js
for(let i=0;i<cars.length;i++){
    cars[i].brain=JSON.parse(
        localStorage.getItem("bestBrain"));
    if(i!=0){
        NeuralNetwork.mutate(cars[i].brain,0.1);
    }
}
```

Two details that struck me as clever:

1. **`JSON.parse` inside the loop**: every car gets an independent copy of the network. If I had
   parsed it only once and assigned the same object to all of them, mutating the network of one
   would have mutated the network of all of them.
2. **Car 0 is not mutated**: it keeps exactly the saved network. This is what genetic algorithms
   call elitism: the new generation can never be worse than the previous one, because the best one
   is always there.

So the training loop is manual: I let it run, when a car goes far I press 💾, reload the page, and
repeat. Every reload is a new generation.

One thing to remember: `JSON.parse` returns plain objects and not `NeuralNetwork` instances. It only
works because `feedForward` and `mutate` are static and receive the network as a parameter (the
choice made in chapter 6).

## Harder traffic

Seven DUMMY cars spread between y=-100 and y=-700 across all three lanes, in pairs, so as to always
leave a single lane free. The car has to learn to change lanes at the right moment.

## Drawing

```js
carCtx.globalAlpha=0.2;
for(let i=0;i<cars.length;i++){
    cars[i].draw(carCtx,"blue");
}
carCtx.globalAlpha=1;
bestCar.draw(carCtx,"blue",true);
```

All the cars are drawn semi-transparent (20% opacity), then the best one is drawn again on top,
opaque and with its sensors. With 100 overlapping cars, without transparency and with all the rays
drawn, you couldn't make anything out. The visualizer shows the network of `bestCar`.

## Layout

The body becomes a flex container centered horizontally and vertically: car canvas, the column of
buttons (`#verticalButtons`, flex in a column) and network canvas, side by side. The buttons turn
blue on mouse hover.

## How to try it

1. Raise `N` in `main.js` (for example to 100).
2. Open `index.html` and wait for some car to get past the first red cars.
3. Press 💾 and reload. Repeat until the best car gets past all the traffic.
4. If the training goes in a wrong direction, 🗑️ and start over.

Watch out: `localStorage` is shared by all the pages of the same origin. If I open chapters 8 and
9 from the same server (or both from `file://`), they use the same `bestBrain` key. Chapter 10
saves in a key of its own, `curvedRoadBestBrain`, because its network has a different shape.
