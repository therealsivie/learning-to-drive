const { pageFiles, createSandbox, createReport } = require("./sandbox.js");

const sandbox = createSandbox(pageFiles());
const warnings = [];
sandbox.context.console = { log: console.log, warn: (message) => warnings.push(message) };
const report = createReport();

function squareWorld(bays) {
   sandbox.context.__bays = bays;
   return sandbox.run(`(() => {
      const corners = [new Point(0, 0), new Point(1000, 0), new Point(1000, 1000), new Point(0, 1000)];
      const sides = corners.map((p, i) => new Segment(p, corners[(i + 1) % 4]));
      const square = new World(new Graph(corners, sides));
      for (const { side, c } of __bays) {
         const { p1, p2 } = sides[side];
         const dir = normalize(subtract(p2, p1));
         const center = add(add(p1, scale(dir, square.roadWidth / 2 + c)), scale(perpendicular(dir), square.roadWidth / 4));
         square.markings.push(new Parking(center, scale(dir, -1), square.roadWidth / 2, square.roadWidth / 2));
      }
      square.generate();
      return square;
   })()`);
}

function run(world, carCount, ticks) {
   sandbox.context.__world = world;
   sandbox.context.__carCount = carCount;
   const traffic = sandbox.run("new Traffic(__world, __carCount)");
   while (traffic.tick < ticks && traffic.errors.length == 0) {
      traffic.update();
   }
   return traffic;
}

const empty = run(squareWorld([]), 5, 100);
report.check("a world without bays has no cars", empty.drivers.length == 0);
report.check("a world without bays runs without errors", empty.errors.length == 0);

const single = run(squareWorld([{ side: 0, c: 450 }]), 5, 100);
report.check("a world with one bay has no cars, so nobody is stuck", single.drivers.length == 0);

const bays = [
   { side: 0, c: 100 },
   { side: 0, c: 450 },
   { side: 1, c: 450 },
   { side: 2, c: 450 },
   { side: 3, c: 450 }
];
const traffic = run(squareWorld(bays), 10, 9000);
report.check(
   "a bay without room on its lane is skipped with a warning",
   traffic.network.bays.length == 4 &&
      warnings.filter((w) => w.startsWith("Parking ignored")).length == 1
);
report.check("cars are capped at one less than the bays", traffic.drivers.length == 3);
report.check(
   "every car starts on its own bay",
   new Set(traffic.drivers.map((d) => d.home)).size == traffic.drivers.length
);
report.check("cars travel between the bays", traffic.trips >= 3);
report.check("no errors", traffic.errors.length == 0);
console.log("     trips " + traffic.trips + ", errors " + JSON.stringify(traffic.errors.slice(0, 3)));

report.finish();
