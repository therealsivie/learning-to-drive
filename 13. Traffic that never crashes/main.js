const carCanvas = document.getElementById("carCanvas");
carCanvas.width = window.innerWidth;
carCanvas.height = window.innerHeight;
const carCtx = carCanvas.getContext("2d");

const viewport = new Viewport(carCanvas, world.zoom, world.offset);

const traffic = new Traffic(world, 10);
let showLanes = true;

window.addEventListener("keydown", (evt) => {
   if (evt.key == "l" || evt.key == "L") {
      showLanes = !showLanes;
   }
});

animate();

function animate() {
   traffic.update();
   viewport.reset();
   const viewPoint = scale(viewport.getOffset(), -1);
   world.draw(carCtx, viewPoint, false);
   if (showLanes) {
      traffic.network.draw(carCtx);
   }
   requestAnimationFrame(animate);
}
