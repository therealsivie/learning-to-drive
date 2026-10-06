const { pageFiles, createSandbox, place, createReport } = require("./sandbox.js");

const sandbox = createSandbox(pageFiles());
const traffic = sandbox.run("new Traffic(world, 2)");
const { carSize } = sandbox.run("({ carSize })");
const connector = traffic.network.nodes
   .flatMap((n) => n.connectors)
   .find(
      (c) =>
         c.turn == "straight" &&
         c.junction &&
         !c.approach.marking &&
         c.from.length > 300 &&
         c.to.length > 300
   );
const [blocker, approacher] = traffic.drivers;
const report = createReport();

place(approacher, [connector.from, connector, connector.to], connector.from.length - 200);
let granted = false;
for (let i = 0; i < 600; i++) {
   place(blocker, [connector.to], carSize.length / 2 + 5);
   traffic.update();
   if (approacher.holds(connector) || approacher.idx > 0) {
      granted = true;
   }
}

report.check("the junction never let the car in while its exit was blocked", !granted);
report.check("the car waits before the line", approacher.front <= connector.from.length);
report.check("the car came to a stop", approacher.speed < 0.01);
report.check("no errors", traffic.errors.length == 0);

report.finish();
