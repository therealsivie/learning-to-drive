const { pageFiles, createSandbox, place, ahead, createReport } = require("./sandbox.js");

const report = createReport();

function setup(carCount, type) {
   const sandbox = createSandbox(pageFiles());
   const traffic = sandbox.run(`new Traffic(world, ${carCount})`);
   const { world, distance, dot } = sandbox.run("({ world, distance, dot })");
   const signs = world.markings.filter((m) => m.type == type);
   const lanes = signs.map((m) =>
      traffic.network.paths.find(
         (p) =>
            p.kind == "lane" &&
            distance(m.center, p.points[p.points.length - 1]) < world.roadWidth &&
            dot(m.directionVector, p.frame.dir) < -0.9
      )
   );
   return { sandbox, traffic, signs, lanes };
}

function straight(lane) {
   return lane.next.find((c) => c.turn == "straight");
}

function cross(driver, connector, distanceToEnd) {
   const route = [connector.from, connector, ...ahead(connector.to, 300)];
   place(driver, route, connector.from.length - distanceToEnd);
}

function entered(driver, connector) {
   const k = driver.route.indexOf(connector);
   return k < 0 || driver.frontIdx >= k;
}

{
   const { traffic, signs, lanes } = setup(4, "light");
   const connectors = lanes.map(straight);
   traffic.drivers.forEach((driver, i) => cross(driver, connectors[i], 100));
   let waitedOnRed = false;
   for (let tick = 0; tick < 1800; tick++) {
      traffic.update();
      traffic.drivers.forEach((driver, i) => {
         if (!entered(driver, connectors[i]) && driver.speed < 0.05 && signs[i].state == "red") {
            waitedOnRed = true;
         }
      });
   }
   report.check("a car waited at a red light", waitedOnRed);
   report.check(
      "every car crossed the junction with lights",
      traffic.drivers.every((d, i) => d.hasPassed(connectors[i]))
   );
   report.check("no errors at the lights", traffic.errors.length == 0);
}

{
   const { traffic, lanes } = setup(1, "stop");
   const connector = straight(lanes[0]);
   const [driver] = traffic.drivers;
   cross(driver, connector, 200);
   let still = 0;
   let longestStill = 0;
   for (let tick = 0; tick < 1200 && !entered(driver, connector); tick++) {
      traffic.update();
      still = driver.speed < 0.05 ? still + 1 : 0;
      longestStill = Math.max(longestStill, still);
   }
   report.check("the car stood still at the Stop for 60 ticks", longestStill >= 60);
   report.check("the car went on after the Stop", entered(driver, connector));
   report.check("no errors at the Stop", traffic.errors.length == 0);
}

{
   const { sandbox, traffic, lanes } = setup(2, "yield");
   const Junction = sandbox.run("Junction");
   const minor = straight(lanes[0]);
   const main = minor.junction.connectors.find(
      (c) =>
         c.turn == "straight" &&
         !lanes.includes(c.from) &&
         Junction.connectorsConflict(c, minor)
   );
   const [yielder, priority] = traffic.drivers;
   cross(yielder, minor, 60);
   cross(priority, main, 150);
   const order = [];
   for (let tick = 0; tick < 1200 && order.length < 2; tick++) {
      traffic.update();
      for (const [driver, connector] of [[yielder, minor], [priority, main]]) {
         if (!order.includes(driver) && entered(driver, connector)) {
            order.push(driver);
         }
      }
   }
   report.check("the car on the main road went first", order[0] == priority);
   report.check("the car at the Yield went after it", order[1] == yielder);
   report.check("no errors at the Yield", traffic.errors.length == 0);
}

report.finish();
