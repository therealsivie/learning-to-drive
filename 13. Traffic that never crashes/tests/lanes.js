const { pageFiles, createSandbox, createReport } = require("./sandbox.js");

const sandbox = createSandbox(pageFiles());
const world = sandbox.run("world");
const network = sandbox.run("new LaneNetwork(world)");
const lanes = network.paths.filter((p) => p.kind == "lane");
const connectors = network.nodes.flatMap((n) => n.connectors);
const report = createReport();

report.check(
   "every segment has a lane in both directions",
   world.graph.segments.every((seg, i) =>
      [":f", ":b"].every((side) => lanes.some((l) => l.frame.key == i + side))
   )
);

report.check(
   "lanes run a quarter of the road to the right of their segment",
   lanes.every((l) => {
      const { from, dir } = l.frame;
      return l.points.every((p) => {
         const lateral = (p.x - from.x) * -dir.y + (p.y - from.y) * dir.x;
         return Math.abs(lateral - world.roadWidth / 4) < 0.01;
      });
   })
);

report.check(
   "no connector makes a U-turn on its own segment",
   connectors.every((c) => c.from.frame.segIndex != c.to.frame.segIndex)
);

report.check(
   "connectors join the end of a lane to the start of the next",
   connectors.every((c) => {
      const a = c.from.points[c.from.points.length - 1];
      const b = c.to.points[0];
      const first = c.points[0];
      const last = c.points[c.points.length - 1];
      return Math.hypot(first.x - a.x, first.y - a.y) < 0.01 &&
         Math.hypot(last.x - b.x, last.y - b.y) < 0.01;
   })
);

function reach(start, neighbours) {
   const seen = new Set([start]);
   const queue = [start];
   while (queue.length > 0) {
      for (const next of neighbours(queue.shift())) {
         if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
         }
      }
   }
   return seen;
}

const roads = network.paths.filter((p) => !p.bay);
const previous = new Map(roads.map((p) => [p, []]));
for (const p of roads) {
   for (const next of p.next.filter((n) => !n.bay)) {
      previous.get(next).push(p);
   }
}
const forward = reach(lanes[0], (p) => p.next.filter((n) => !n.bay));
const backward = reach(lanes[0], (p) => previous.get(p));
report.check(
   "every lane can reach and be reached from every other lane",
   lanes.every((l) => forward.has(l) && backward.has(l))
);

const crossroads = network.nodes.filter((n) => n.incoming.length == 4);
report.check(
   "at a crossroads every lane can turn left, go straight and turn right",
   crossroads.length > 0 &&
      crossroads.every((n) =>
         n.incoming.every((lane) => {
            const turns = n.connectors.filter((c) => c.from == lane).map((c) => c.turn);
            return turns.sort().join(",") == "left,right,straight";
         })
      )
);

report.finish();
