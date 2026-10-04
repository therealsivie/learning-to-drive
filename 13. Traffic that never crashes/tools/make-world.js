const fs = require("fs");
const path = require("path");
const { root, worldFiles, createSandbox } = require("../tests/sandbox.js");

const sandbox = createSandbox(worldFiles, 13);

const code = `
   const size = 4;
   const spacing = 500;
   const points = [];
   for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
         points.push(new Point(i * spacing, j * spacing));
      }
   }
   const at = (i, j) => points[j * size + i];
   const segments = [];
   for (let j = 0; j < size; j++) {
      for (let i = 0; i < size - 1; i++) {
         segments.push(new Segment(at(i, j), at(i + 1, j)));
      }
   }
   for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - 1; j++) {
         segments.push(new Segment(at(i, j), at(i, j + 1)));
      }
   }
   const world = new World(new Graph(points, segments));
   world.generate();
   world.zoom = 3;
   world.offset = new Point(-750, -750);
   world;
`;

const world = sandbox.run(code);
const out = path.join(root, "world/saves/traffic.world");
fs.writeFileSync(out, "const world = World.load(" + JSON.stringify(world) + ");");
console.log(
   "segments", world.graph.segments.length,
   "markings", world.markings.length,
   "borders", world.roadBorders.length,
   "buildings", world.buildings.length,
   "trees", world.trees.length
);
