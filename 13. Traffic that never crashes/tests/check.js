const { pageFiles, mulberry32, createSandbox } = require("./sandbox.js");

const files = pageFiles();

const ticks = Number(process.argv[2]) || 36000;
const seeds = Number(process.argv[3]) || 5;
const carCounts = [5, 10, 20];

function runScenario(carCount, seed) {
   const sandbox = createSandbox(files, seed);
   sandbox.context.__trafficRandom = mulberry32(seed * 7919);
   sandbox.context.__carCount = carCount;
   const traffic = sandbox.run("new Traffic(world, __carCount, __trafficRandom)");
   while (traffic.tick < ticks && traffic.errors.length == 0) {
      traffic.update();
   }
   return traffic;
}

let failed = false;
for (const carCount of carCounts) {
   for (let seed = 1; seed <= seeds; seed++) {
      const start = Date.now();
      const traffic = runScenario(carCount, seed);
      const seconds = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
         `cars ${traffic.drivers.length} seed ${seed}: ticks ${traffic.tick}, ` +
            `guard ${traffic.guardHits}, ${seconds}s`
      );
      for (const error of traffic.errors.slice(0, 5)) {
         failed = true;
         console.log(`   FAIL seed ${seed} tick ${error.tick}: ${error.message} (cars ${error.ids.join(", ")})`);
      }
   }
}
process.exit(failed ? 1 : 0);
