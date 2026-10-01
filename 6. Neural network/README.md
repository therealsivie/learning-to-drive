# 6. Neural network

The most important chapter: the car is driven by a neural network written from scratch, without
libraries. At this stage the network has completely random weights and is not trained, so the car
moves randomly. But the link between sensors, network and controls is complete.

## What changes compared to chapter 5

| File | What's new |
|------|--------|
| `network.js` | New, `NeuralNetwork` and `Level` classes |
| `car.js` | Every non-DUMMY car has a `brain`; `"AI"` cars use the network outputs as controls |
| `main.js` | Two canvases (car and network), the main car becomes `"AI"` |
| `index.html` | `carCanvas` and `networkCanvas` instead of `myCanvas`, loads `network.js` |
| `style.css` | Black background for the network canvas |

The `networkCanvas` (300 px wide) stays empty in this chapter: it gets it ready for the visualizer of
chapter 7.

## Network architecture

```js
this.brain=new NeuralNetwork(
    [this.sensor.rayCount,6,4]
);
```

- **5 inputs**: one per sensor ray.
- **6 hidden neurons**.
- **4 outputs**: forward, left, right, reverse. In the same order as the `Controls` flags.

The array `[5,6,4]` describes how many neurons each layer has. `NeuralNetwork` creates a `Level` for
each pair of consecutive layers, so here there are 2 levels: 5 to 6 and 6 to 4. Changing the array
changes the architecture without touching any other code.

## Level

A `Level` connects an input layer to an output layer:

```js
this.inputs=new Array(inputCount);
this.outputs=new Array(outputCount);
this.biases=new Array(outputCount);
this.weights=[];   // weights[i][j]: from input i to output j
```

- There is a **weight** for each input/output pair (here 5x6 = 30 in the first level, 6x4 = 24 in
  the second).
- There is a **bias** for each output.
- `#randomize` fills weights and biases with values in [-1, 1] using `Math.random()*2-1`. Negative
  values are important: a negative weight means "if I see an obstacle on this side, DON'T do this
  action", for example don't turn towards a wall.

`#randomize` is a private **static** method, which receives the level as a parameter instead of
using `this`. The same goes for `feedForward`. The style is intentional: in chapter 8 the networks
will be saved with `JSON.stringify` and reloaded with `JSON.parse`, and an object reloaded from JSON
is a plain object without the class methods. With static methods the network works anyway, because
it is passed as data and not used as an instance.

## feedForward

```js
for(let i=0;i<level.outputs.length;i++){
    let sum=0
    for(let j=0;j<level.inputs.length;j++){
        sum+=level.inputs[j]*level.weights[j][i];
    }
    if(sum>level.biases[i]){
        level.outputs[i]=1;
    }else{
        level.outputs[i]=0;
    }
}
```

For each output, the weighted sum of the inputs is computed and compared with the bias:

- if the sum is greater than the bias the neuron "fires" and is 1;
- otherwise it is 0.

It is a step activation function, like in the original perceptron. No sigmoid and no ReLU, so no
backpropagation: the network is not trained with the gradient but with random mutations (chapter
8). To decide "do I press a key or not" a binary output is exactly what is needed.

A note on the bias: it is usually written `sum + bias > 0`, while here it is `sum > bias`.
Mathematically it is the same, with the bias of the opposite sign.

`NeuralNetwork.feedForward` passes the output of each level as the input of the next one and
returns the outputs of the last one.

## From the sensors to the network

```js
const offsets=this.sensor.readings.map(
    s=>s==null?0:1-s.offset
);
const outputs=NeuralNetwork.feedForward(offsets,this.brain);
```

This transformation made me think. The sensor returns `offset`, that is at what fraction of the ray
the obstacle is (0 close, 1 far). But the network needs the opposite: a high value when the
obstacle is close, because that is where it has to react. So:

- no obstacle (`null`) becomes 0, that is "nothing to report";
- an obstacle at the end of the ray becomes about 0;
- an obstacle right next to the car becomes about 1.

## From the network to the controls

```js
this.useBrain=controlType=="AI";
...
if(this.useBrain){
    this.controls.forward=outputs[0];
    this.controls.left=outputs[1];
    this.controls.right=outputs[2];
    this.controls.reverse=outputs[3];
}
```

The outputs (0 or 1) go straight into the `Controls` flags. Since `#move` only does
`if(this.controls.forward)`, 0 and 1 work like `false` and `true`.

Interesting detail: the `brain` is created for any non-DUMMY car, even the one driven by keyboard.
In that case the network runs anyway but its outputs are ignored. It is useful to see how the
network "would think" while I drive.

## Two canvases

```js
const carCanvas=document.getElementById("carCanvas");
carCanvas.width=200;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=300;
```

Everything that used to be `canvas`/`ctx` becomes `carCanvas`/`carCtx`. Both canvases are resized
(and therefore cleared) every frame.

## How to try it

Open `index.html` and reload several times. Every reload generates a different network: sometimes
the car doesn't start, sometimes it goes in reverse, sometimes it goes round in circles, sometimes
it crashes right away. It is normal: the weights are random and there is no training yet.
