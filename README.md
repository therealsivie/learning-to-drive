# learning-to-drive

A car that learns to drive by itself in traffic, written in plain JavaScript: no frameworks, no
machine learning libraries, just Canvas 2D and a few classes. Car physics, sensors, collisions,
neural network and training algorithm are all made by hand.

## Structure

Each folder is a complete, working snapshot of the project at the end of a chapter. They don't
depend on each other: you can open any folder and run it on its own. Each folder has its own README
with a detailed explanation of what changes compared to the previous chapter. Folders 11, 12 and
13 each bring together several parts, in the same code: each part is a series of commits, and the
folder's README explains them one by one.

| # | Folder | What it adds | Demo |
|---|----------|---------------|------|
| 1 | [Car driving mechanics](01.%20Car%20driving%20mechanics) | A car driven with the arrow keys: acceleration, friction, steering, reverse | [open](https://therealsivie.github.io/learning-to-drive/01.%20Car%20driving%20mechanics/) |
| 2 | [Road definition](02.%20Road%20definition) | Three-lane road with borders and a camera that follows the car | [open](https://therealsivie.github.io/learning-to-drive/02.%20Road%20definition/) |
| 3 | [Artificial sensors](03.%20Artificial%20sensors) | Five rays that measure the distance from the borders, segment intersection | [open](https://therealsivie.github.io/learning-to-drive/03.%20Artificial%20sensors/) |
| 4 | [Collision detection](04.%20Collision%20detection) | The car becomes a polygon and gets damaged if it touches a border | [open](https://therealsivie.github.io/learning-to-drive/04.%20Collision%20detection/) |
| 5 | [Traffic simulation](05.%20Traffic%20simulation) | "DUMMY" cars that go straight, to be seen with the sensors and avoided | [open](https://therealsivie.github.io/learning-to-drive/05.%20Traffic%20simulation/) |
| 6 | [Neural network](06.%20Neural%20network) | `[5,6,4]` neural network that turns the sensor readings into controls | [open](https://therealsivie.github.io/learning-to-drive/06.%20Neural%20network/) |
| 7 | [Visualizing neural networks](07.%20Visualizing%20neural%20networks) | Real-time drawing of the network next to the road | [open](https://therealsivie.github.io/learning-to-drive/07.%20Visualizing%20neural%20networks/) |
| 8 | [Optimizing neural networks](08.%20Optimizing%20neural%20networks) | Many cars in parallel, mutation, saving the best network | [open](https://therealsivie.github.io/learning-to-drive/08.%20Optimizing%20neural%20networks/) |
| 9 | [Fine-tuning](09.%20Fine-tuning) | 100 cars, a colored sprite for each car, multicolor traffic | [open](https://therealsivie.github.io/learning-to-drive/09.%20Fine-tuning/) |
| 10 | [Curved road](10.%20Curved%20road) | Curved road made of polylines and a network without a hidden layer | [open](https://therealsivie.github.io/learning-to-drive/10.%20Curved%20road/) |
| 11 | [Car in the world](11.%20Car%20in%20the%20world) | Editor of a virtual world (roads, buildings, road markings, import from OpenStreetMap) where the cars drive | [sim](https://therealsivie.github.io/learning-to-drive/11.%20Car%20in%20the%20world/) · [editor](https://therealsivie.github.io/learning-to-drive/11.%20Car%20in%20the%20world/world/) |
| 12 | [Race in the world](12.%20Race%20in%20the%20world) | Race against the AI cars on a path found with Dijkstra, synthesized sounds, 3D view, driving with the phone or the webcam | [sim](https://therealsivie.github.io/learning-to-drive/12.%20Race%20in%20the%20world/sim.html) · [race](https://therealsivie.github.io/learning-to-drive/12.%20Race%20in%20the%20world/race.html) · [phone](https://therealsivie.github.io/learning-to-drive/12.%20Race%20in%20the%20world/phone.html) · [camera](https://therealsivie.github.io/learning-to-drive/12.%20Race%20in%20the%20world/camera.html) · [editor](https://therealsivie.github.io/learning-to-drive/12.%20Race%20in%20the%20world/world/) |
| 13 | [Traffic that never crashes](13.%20Traffic%20that%20never%20crashes) | Cars driven by rules on a lane network: lights, Stop, Yield, right-hand rule, crossings and parking bays, without a single collision | [sim](https://therealsivie.github.io/learning-to-drive/13.%20Traffic%20that%20never%20crashes/traffic.html) · [editor](https://therealsivie.github.io/learning-to-drive/13.%20Traffic%20that%20never%20crashes/world/) |

## The journey in short

1. **Physics (ch. 1-2).** The car has a speed and an angle; it moves with `x -= sin(angle)*speed`
   and `y -= cos(angle)*speed`, because angle 0 points up and the canvas y axis points down. The
   road is defined by segments, and the camera is a simple `translate` of the canvas.
2. **Perception (ch. 3-5).** The sensors cast rays and compute the intersection with borders and
   cars through a parametric formula between segments. The same function is then used for
   collisions between polygons.
3. **Decision (ch. 6-7).** A feed-forward neural network with a step activation receives
   `1 - offset` from each ray and turns the four controls (forward, left, right, reverse) on or
   off. The visualizer shows weights and biases in yellow (positive) and blue (negative).
4. **Learning (ch. 8-9).** No backpropagation: N cars are launched with slightly mutated networks,
   the one that goes farthest is saved and used as the base of the next generation. It is a
   genetic algorithm stripped to the bone, with elitism.
5. **Experiment (ch. 10).** Sinusoidal road made of polylines, a network without a hidden layer and
   stronger mutation.
6. **World (ch. 11).** A separate editor builds a graph of roads, derives the borders from it with
   polygon union, adds buildings, trees and road markings, and can import roads from
   OpenStreetMap. The simulation loads that world and starts the cars from the Start marking, with
   a minimap that follows the best car.
7. **Race (ch. 12).** World and trained car come from files. Dijkstra finds the shortest path from
   Start to Target, and the borders of that path become the only road the cars see. A game runs on
   top of it: you against 100 AI cars, with sounds generated by Web Audio, a 3D camera that
   projects the world in perspective by hand, and two alternatives to the arrow keys, tilting the
   phone and a steering wheel made of two blue objects seen by the webcam.
8. **Traffic (ch. 13).** No neural network: every car follows its lane with the Intelligent
   Driver Model and enters a junction only with a reservation, granted when its path is free and
   its exit has room. Lights, Stop, Yield and the right-hand rule decide the order. The cars drive
   from bay to bay, and a Node test runs the whole world to prove they never touch.

The function that comes back most often is `lerp(A,B,t)`: it is used for the lanes, to spread the
rays, for the intersection points, to position the nodes in the visualizer and to mutate the
weights.

## How to run it

Every chapter runs online on GitHub Pages: the links are in the Demo column of the table above.
It is also the easiest way to try chapter 12 on the phone, because the pages are served over
HTTPS.

To run it locally there is nothing to install. Just open `index.html` of any folder in the browser.

Alternatively, with a small local server from the repository root:

```bash
python3 -m http.server
```

and then open `http://localhost:8000` and pick the folder.

Chapter 11 needs the server: the editor (`world/index.html`) and the simulation (`index.html`)
pass the world to each other through `localStorage`, and two pages opened from `file://` don't
always share it. First you open the editor, build or import a world and save it with 💾; then you
open the simulation.

Chapter 12 must also be opened from the server, and it has no `index.html`: the pages are
`sim.html` (the simulator), `race.html` (the race with the arrow keys), `phone.html` (the race
driven by the phone), `markers.html` (the marker detector) and `camera.html` (the race driven with
the webcam). Webcam and phone sensors only work in a secure context, `localhost` or HTTPS: on the
local network over plain HTTP the phone may not send its tilt, so to drive with the phone use the
online demo (on iOS it still needs a permission the code doesn't request, see chapter 12). The
editor is in `world/index.html`.

Chapter 13 also has no `index.html`: the page is `traffic.html`, and the editor is in
`world/index.html`. Its tests run with Node from the repository root, for example
`node "13. Traffic that never crashes/tests/check.js"`; the folder's README lists them all.

### Controls

- Chapters 1-5: you drive with the keyboard arrow keys.
- Chapters 6-7: the car is driven by the network (random, not trained). Just reload to try a new
  network.
- Chapters 8-9: 💾 saves the network of the best car, 🗑️ deletes it. The cycle is: let it run,
  save when a car goes far, reload, repeat. In chapter 8 it's worth raising `N` in `main.js` (in 9
  it is already 100).
- Chapter 10: `save()` and `discard()` are run from the browser console.
- Chapter 11: in the editor you draw the roads with the mouse in 🌐 mode and place the road
  markings with the other buttons (🚙 is the cars' starting point); 🗺️ imports the roads from
  OpenStreetMap, 💾 saves the world, 📁 loads one from a file. In the simulation 💾 and 🗑️ work
  as in chapters 8-9.
- Chapter 12: in `race.html` you drive with the arrow keys after the countdown, up to the Target.
  In `phone.html` you steer by tilting the phone held horizontally, and a finger on the screen
  brakes and reverses. In `camera.html` you hold two blue objects in front of the webcam, one per
  hand, and rotate them like a steering wheel; moving them away from the camera reverses. In
  `sim.html` 💾 and 🗑️ save and delete the network. In the editor, in 🌐 mode, s and e pick the
  start and the target of the path, and 💾 downloads the world as a file.
- Chapter 13: you only watch. The wheel zooms and a left drag pans; a click on a car selects it and
  opens the 3D view behind it, `Esc` or a click on empty space deselects. ⏸ ×1 ×2 ×4 set the
  speed, the slider sets the number of cars, and `L` shows the lanes and the reserved paths.

### Watch out for localStorage

`localStorage` is shared by all the pages of the same origin: if the chapters are opened from the
same server (or all from `file://`), they see the same keys. Chapters 8 and 9 save the network in
`bestBrain` and read each other's saved network. That's fine: both use a `[5,6,4]` network on a
straight 3-lane road. Chapter 10 uses a `[5,4]` network on a curved road, so it saves in a key of
its own, `curvedRoadBestBrain`, and doesn't mix with the others. Chapter 11 saves in
`worldBestBrain`; if the key is missing, it starts from the `bestBrain` of chapters 8-9, which has
the same `[5,6,4]` shape. The editor's world is in the `world` key.

Chapter 12 saves the network in `raceBestBrain`, written by `sim.html` and also read by the race
pages. It doesn't fall back on `bestBrain`: its network has 3 inputs (two rays and the speed) and
the ones from the previous chapters wouldn't work. The world no longer goes through
`localStorage`, it is a file in `world/saves/`; the marker detector threshold is in
`markerThreshold`.

Chapter 13 doesn't use `localStorage` at all: there is no network to save, and the world is the
file `world/saves/traffic.world`.

## Technical notes

- Vanilla JavaScript with ES2022 classes and `#` private methods. No modules: the scripts are
  loaded in order in the HTML and share the global scope.
- All quantities are per frame, not per second: on a 120 Hz screen the simulation runs faster than
  on a 60 Hz one.
- The `visualizer.js` files were saved in UTF-16; I converted them to UTF-8 so they can be seen as
  text on git, without changing the code.
- The code (js, html, css) has CRLF line endings, the Markdown files LF: `.gitattributes` stores
  them as they are and `.editorconfig` tells the editor which one to use.
- Chapter 13 has tests: plain Node scripts in `tests/`, with no dependencies, that load the page's
  scripts into a `vm` context and run the simulation without a browser.
