# 5. Traffic simulation

Traffic arrives. The cars are no longer all the same: there is the one I drive and there are
"dumb" cars that only go straight. My car sees them with the sensors and gets damaged if it hits
them.

## What changes compared to chapter 4

| File | What's new |
|------|--------|
| `controls.js` | The constructor receives a type: `"KEYS"` or `"DUMMY"` |
| `car.js` | New `controlType` and `maxSpeed` parameters, the sensor only exists for non-DUMMY cars, collisions with traffic, color passed to `draw` |
| `sensor.js` | The rays also read the polygons of the cars in traffic |
| `main.js` | `traffic` array with one red DUMMY car, main car blue |

## Control types

```js
switch(type){
    case "KEYS":
        this.#addKeyboardListeners();
        break;
    case "DUMMY":
        this.forward=true;
        break;
}
```

- **KEYS**: as before, you drive with the arrow keys.
- **DUMMY**: `forward` is always `true` and there is no listener. The car accelerates and goes
  straight forever.

The types are plain strings. In chapter 6 a third one is added, `"AI"`, which has no `case` here:
for it `Controls` stays with all flags `false` and the network outputs will set them.

## Car with traffic

```js
constructor(x,y,width,height,controlType,maxSpeed=3)
```

- `maxSpeed` becomes a parameter. Traffic is created with `maxSpeed=2`, so my car (top speed 3) is
  faster and has to overtake.
- DUMMY cars **don't have the sensor**: they don't have to make decisions, so it isn't needed.
  That's why in `update` and `draw` there are the `if(this.sensor)` checks.

### Collisions with the other cars

```js
for(let i=0;i<traffic.length;i++){
    if(polysIntersect(this.polygon,traffic[i].polygon)){
        return true;
    }
}
```

The work done in chapter 4 pays off immediately: since each car already has its polygon, the
collision between two cars is the same `polysIntersect` used for the borders. No new logic.

## Sensor that sees the traffic

```js
for(let i=0;i<traffic.length;i++){
    const poly=traffic[i].polygon;
    for(let j=0;j<poly.length;j++){
        const value=getIntersection(
            ray[0],
            ray[1],
            poly[j],
            poly[(j+1)%poly.length]
        );
        ...
    }
}
```

Each ray is compared with the 4 sides of each car in traffic. The points found end up in the same
`touches` array as the borders, and in the end the closest one always wins. For the sensor a
border and a car are the same thing: a segment to avoid.

## main.js

```js
const car=new Car(road.getLaneCenter(1),100,30,50,"KEYS");
const traffic=[
    new Car(road.getLaneCenter(1),-100,30,50,"DUMMY",2)
];
```

A DUMMY car starts 200 px ahead in the same lane.

The order in the loop matters:

```js
for(let i=0;i<traffic.length;i++){
    traffic[i].update(road.borders,[]);
}
car.update(road.borders,traffic);
```

- Traffic is updated first, so its polygons are already in the new position when my car checks
  collisions and sensors.
- Traffic is passed an empty array as traffic: DUMMY cars can get damaged against the borders but
  not against each other or against my car. If I rear-end it, I get damaged and it keeps going.

In the drawing the traffic is red and my car blue, thanks to the new `color` parameter of `draw`.
If the car is damaged it stays gray anyway.

## How to try it

Open `index.html`, accelerate and try to overtake the red car without touching it. Watch the
yellow rays stop on its outline.
