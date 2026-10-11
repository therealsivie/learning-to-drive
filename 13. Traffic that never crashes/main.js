const carCanvas = document.getElementById("carCanvas");
const cameraCanvas = document.getElementById("cameraCanvas");
const carCtx = carCanvas.getContext("2d");
const cameraCtx = cameraCanvas.getContext("2d");

const viewport = new Viewport(carCanvas, world.zoom, world.offset, 0);

let traffic = new Traffic(world, 10);
let updatesPerFrame = 1;
let selected = null;
let following = false;
let camera = null;
let showLanes = false;
let mouseDown = null;

const bayCount = traffic.network.bays.length;
carSlider.max = Math.max(1, bayCount - 1);
carSlider.value = traffic.drivers.length;
carCountLabel.innerText = traffic.drivers.length + " cars";

layout();
setSpeed(1);
animate();

function layout() {
   carCanvas.width = window.innerWidth;
   carCanvas.height = selected ? window.innerHeight / 2 : window.innerHeight;
   cameraCanvas.width = window.innerWidth;
   cameraCanvas.height = selected ? window.innerHeight / 2 : 0;
   viewport.center = new Point(carCanvas.width / 2, carCanvas.height / 2);
}

function setSpeed(n) {
   updatesPerFrame = n;
   const buttons = { 0: pauseBtn, 1: speed1Btn, 2: speed2Btn, 4: speed4Btn };
   for (const [value, button] of Object.entries(buttons)) {
      button.classList.toggle("active", Number(value) == n);
   }
}

function setCarCount(n) {
   select(null);
   traffic = new Traffic(world, Number(n));
   carCountLabel.innerText = traffic.drivers.length + " cars";
}

function select(driver) {
   selected = driver;
   following = !!driver;
   camera = driver ? new Camera(driver.car) : null;
   layout();
}

function findDriverAt(point) {
   let best = null;
   let bestDist = 30;
   for (const driver of traffic.drivers) {
      const d = distance(point, driver.car);
      if (d < bestDist) {
         best = driver;
         bestDist = d;
      }
   }
   return best;
}

carCanvas.addEventListener("mousedown", (evt) => {
   if (evt.button == 0) {
      mouseDown = new Point(evt.offsetX, evt.offsetY);
   }
});

carCanvas.addEventListener("mousemove", (evt) => {
   if (mouseDown && distance(mouseDown, new Point(evt.offsetX, evt.offsetY)) >= 5) {
      following = false;
   }
});

carCanvas.addEventListener("mouseup", (evt) => {
   if (mouseDown && distance(mouseDown, new Point(evt.offsetX, evt.offsetY)) < 5) {
      select(findDriverAt(viewport.getMouse(evt)));
   }
});

window.addEventListener("mouseup", () => {
   mouseDown = null;
});

window.addEventListener("keydown", (evt) => {
   if (evt.key == "Escape") {
      select(null);
   }
   if (evt.key == "l" || evt.key == "L") {
      showLanes = !showLanes;
   }
});

window.addEventListener("resize", layout);

function updateStatistics() {
   statistics.innerText =
      "Cars: " + traffic.drivers.length + "\n" +
      "Trips: " + traffic.trips + "\n" +
      "Collisions: " + traffic.collisions + "\n" +
      "Red lights: " + traffic.violations;
}

function animate() {
   for (let i = 0; i < updatesPerFrame; i++) {
      traffic.update();
   }

   if (selected && following) {
      viewport.offset = scale(selected.car, -1);
   }
   viewport.reset();
   const viewPoint = scale(viewport.getOffset(), -1);
   world.draw(carCtx, viewPoint, false);
   if (showLanes) {
      traffic.network.draw(carCtx);
   }
   if (selected) {
      new Point(selected.car.x, selected.car.y).draw(carCtx, {
         size: 50,
         color: "rgba(255,255,255,0.3)"
      });
      camera.move(selected.car);
      camera.render(cameraCtx, world);
   }

   updateStatistics();
   requestAnimationFrame(animate);
}
