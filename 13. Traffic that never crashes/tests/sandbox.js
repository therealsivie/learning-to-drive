const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

const worldFiles = [
   "world/js/math/utils.js",
   "world/js/math/graph.js",
   "world/js/primitives/point.js",
   "world/js/primitives/segment.js",
   "world/js/primitives/polygon.js",
   "world/js/primitives/envelope.js",
   "world/js/items/tree.js",
   "world/js/items/building.js",
   "world/js/markings/marking.js",
   "world/js/markings/stop.js",
   "world/js/markings/start.js",
   "world/js/markings/crossing.js",
   "world/js/markings/parking.js",
   "world/js/markings/light.js",
   "world/js/markings/target.js",
   "world/js/markings/yield.js",
   "world/js/world.js"
];

function pageFiles() {
   const html = fs.readFileSync(path.join(root, "traffic.html"), "utf8");
   return [...html.matchAll(/<script src="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((file) => file != "main.js");
}

function mulberry32(seed) {
   return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}

function createSandbox(files, seed = 1) {
   const noop = () => {};
   const context = vm.createContext({
      console,
      Image: class {},
      document: {
         createElement: () => ({
            getContext: () => ({ rect: noop, fill: noop, drawImage: noop })
         })
      },
      __random: mulberry32(seed)
   });
   vm.runInContext("Math.random = __random;", context);
   for (const file of files) {
      const code = fs.readFileSync(path.join(root, file), "utf8");
      vm.runInContext(code, context, { filename: file });
   }
   return {
      context,
      run: (code) => vm.runInContext(code, context)
   };
}

function place(driver, route, s) {
   driver.route = route;
   driver.idx = 0;
   driver.frontIdx = 0;
   driver.s = s;
   driver.speed = 0;
   driver.parked = false;
   driver.leaving = false;
   driver.target = { spot: null };
}

function ahead(path, length) {
   const route = [path];
   let total = path.length;
   while (total < length) {
      path = path.next.find((next) => !next.bay);
      route.push(path);
      total += path.length;
   }
   return route;
}

function createReport() {
   let failed = 0;
   return {
      check(name, ok) {
         console.log((ok ? "ok   " : "FAIL ") + name);
         if (!ok) {
            failed++;
         }
      },
      finish() {
         process.exit(failed ? 1 : 0);
      }
   };
}

module.exports = { root, worldFiles, pageFiles, mulberry32, createSandbox, place, ahead, createReport };
