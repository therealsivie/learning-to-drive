const { pageFiles, createSandbox, place, ahead, createReport } = require("./sandbox.js");

const sandbox = createSandbox(pageFiles());
const traffic = sandbox.run("new Traffic(world, 4)");
const junction = traffic.junctions.find(
   (j) => j.approaches.length == 4 && j.approaches.every((a) => !a.marking)
);
const crossings = junction.approaches.map((a) =>
   a.connectors.find((c) => c.turn == "straight")
);
const report = createReport();

traffic.drivers.forEach((driver, i) => {
   const connector = crossings[i];
   place(
      driver,
      [connector.from, connector, ...ahead(connector.to, 300)],
      connector.from.length - 100
   );
});
let ticks = 0;
while (ticks < 1800 && !traffic.drivers.every((d, i) => d.hasPassed(crossings[i]))) {
   traffic.update();
   ticks++;
}

report.check(
   "four cars arriving together at a junction without signs all cross it",
   traffic.drivers.every((d, i) => d.hasPassed(crossings[i]))
);
report.check("no errors", traffic.errors.length == 0);
console.log("     crossed in " + ticks + " ticks");

report.finish();
