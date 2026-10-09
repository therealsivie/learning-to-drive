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
   const half = world.roadWidth / 2;
   const lane = world.roadWidth / 4;

   const approach = (node, from, offset) => {
      const laneDir = normalize(subtract(node, from));
      const center = add(
         subtract(node, scale(laneDir, half + offset)),
         scale(perpendicular(laneDir), lane)
      );
      return { center, dir: scale(laneDir, -1) };
   };

   const neighbours = (node) =>
      world.graph.getSegmentsWithPoint(node).map((s) => (s.p1 == node ? s.p2 : s.p1));

   for (const from of neighbours(at(1, 1))) {
      const { center, dir } = approach(at(1, 1), from, 9);
      world.markings.push(new Light(center, dir, half, half));
   }
   for (const from of neighbours(at(2, 2)).filter((n) => n.x == at(2, 2).x)) {
      const { center, dir } = approach(at(2, 2), from, half / 2);
      world.markings.push(new Stop(center, dir, half, half));
   }
   for (const from of neighbours(at(1, 2)).filter((n) => n.y == at(1, 2).y)) {
      const { center, dir } = approach(at(1, 2), from, half / 2);
      world.markings.push(new Yield(center, dir, half, half));
   }

   const crossingSegments = [
      segments.find((s) => s.equals(new Segment(at(1, 1), at(2, 1)))),
      segments.find((s) => s.equals(new Segment(at(2, 2), at(2, 3))))
   ];
   for (const seg of crossingSegments) {
      world.markings.push(
         new Crossing(average(seg.p1, seg.p2), seg.directionVector(), world.roadWidth, half)
      );
   }

   const baySegments = segments.filter((s) => !crossingSegments.includes(s)).slice(0, 14);
   baySegments.forEach((seg, i) => {
      const [p1, p2] = i % 2 == 0 ? [seg.p1, seg.p2] : [seg.p2, seg.p1];
      const d = normalize(subtract(p2, p1));
      const center = add(add(p1, scale(d, half + 170)), scale(perpendicular(d), lane));
      world.markings.push(new Parking(center, scale(d, -1), half, half));
   });

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
