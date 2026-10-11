const { pageFiles, mulberry32, createSandbox, createReport } = require("./sandbox.js");

const files = pageFiles();
const report = createReport();

const worlds = {
   short: `(() => {
      const xs = [0, 600, 760, 1360];
      const ys = [0, 600, 1200];
      const points = ys.flatMap((y) => xs.map((x) => new Point(x, y)));
      const at = (i, j) => points[j * xs.length + i];
      const segments = [];
      for (let j = 0; j < ys.length; j++) {
         for (let i = 0; i + 1 < xs.length; i++) {
            segments.push(new Segment(at(i, j), at(i + 1, j)));
         }
      }
      for (let i = 0; i < xs.length; i++) {
         for (let j = 0; j + 1 < ys.length; j++) {
            segments.push(new Segment(at(i, j), at(i, j + 1)));
         }
      }
      const world = new World(new Graph(points, segments));
      for (const seg of segments.filter((s) => distance(s.p1, s.p2) >= 500)) {
         addBay(world, seg.p1, seg.p2);
      }
      world.generate();
      return world;
   })()`,
   curve: `(() => {
      const points = [];
      const corners = [[300, 300, Math.PI], [1100, 300, -Math.PI / 2], [1100, 1100, 0], [300, 1100, Math.PI / 2]];
      for (const [cx, cy, a0] of corners) {
         for (let k = 0; k <= 4; k++) {
            const a = a0 + (k / 4) * Math.PI / 2;
            points.push(new Point(cx + Math.cos(a) * 300, cy + Math.sin(a) * 300));
         }
      }
      const segments = points.map((p, i) => new Segment(p, points[(i + 1) % points.length]));
      const world = new World(new Graph(points, segments));
      for (const seg of segments.filter((s) => distance(s.p1, s.p2) >= 500)) {
         addBay(world, seg.p1, seg.p2);
         addBay(world, seg.p2, seg.p1);
      }
      world.generate();
      return world;
   })()`,
   stub: `(() => {
      const points = [new Point(0, 0), new Point(600, 0), new Point(680, 0), new Point(680, 600), new Point(0, 600)];
      const segments = points.map((p, i) => new Segment(p, points[(i + 1) % points.length]));
      segments.push(new Segment(points[1], points[4]));
      const world = new World(new Graph(points, segments));
      world.generate();
      return world;
   })()`
};

function build(name, seed) {
   const sandbox = createSandbox(files, seed);
   const warnings = [];
   sandbox.context.console = { log: console.log, warn: (message) => warnings.push(String(message)) };
   sandbox.run(`function addBay(world, p1, p2) {
      const dir = normalize(subtract(p2, p1));
      const center = add(add(p1, scale(dir, world.roadWidth / 2 + 200)), scale(perpendicular(dir), world.roadWidth / 4));
      world.markings.push(new Parking(center, scale(dir, -1), world.roadWidth / 2, world.roadWidth / 2));
   }`);
   sandbox.context.__world = sandbox.run(worlds[name]);
   return { sandbox, warnings };
}

function run(name, carCount, ticks, seed) {
   const { sandbox, warnings } = build(name, seed);
   sandbox.context.__trafficRandom = mulberry32(seed * 7919);
   sandbox.context.__carCount = carCount;
   const traffic = sandbox.run("new Traffic(__world, __carCount, __trafficRandom)");
   while (traffic.tick < ticks && traffic.errors.length == 0) {
      traffic.update();
   }
   const traps = warnings.filter((w) => w.includes("too short to wait on"));
   report.check(name + ": no errors", traffic.errors.length == 0);
   report.check(name + ": the guard never fired", traffic.guardHits == 0);
   report.check(name + ": the cars made trips", traffic.trips > 0);
   console.log(
      `     ticks ${traffic.tick}, trips ${traffic.trips}, guard ${traffic.guardHits}, ` +
         `warnings ${JSON.stringify(warnings)}, errors ${JSON.stringify(traffic.errors.slice(0, 3))}`
   );
   return { traffic, traps };
}

const short = run("short", 10, 6000, 1);
report.check(
   "short: the lanes between the close junctions are reported and kept out of the routes",
   short.traps.length == 1 && short.traffic.network.paths.some((p) => p.trap)
);

const curve = run("curve", 7, 6000, 1);
const bends = curve.traffic.network.nodes.filter(
   (n) => curve.traffic.world.graph.getSegmentsWithPoint(n.point).length == 2
);
report.check(
   "a node with two roads and no markings has no junction",
   bends.length == 20 && bends.every((n) => n.connectors.every((c) => c.junction == null))
);

const stub = build("stub", 1);
const network = stub.sandbox.run("Junction.createNetwork(__world).network");
const lanes = network.paths.filter((p) => p.kind == "lane");
report.check(
   "a segment shorter than its trims keeps lanes of 1 px, with a warning",
   network.clamped == 2 &&
      lanes.every((l) => l.length >= 1 - 1e-9) &&
      stub.warnings.some((w) => w.startsWith("2 lanes clamped"))
);
report.check(
   "the connectors of a clamped lane start and end on it",
   network.nodes.flatMap((n) => n.connectors).every((c) => {
      const a = c.from.points[c.from.points.length - 1];
      const b = c.to.points[0];
      const first = c.points[0];
      const last = c.points[c.points.length - 1];
      return Math.hypot(first.x - a.x, first.y - a.y) < 0.01 &&
         Math.hypot(last.x - b.x, last.y - b.y) < 0.01;
   })
);

report.finish();
