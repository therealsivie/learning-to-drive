class Traffic {
   constructor(world, carCount, random = Math.random) {
      this.world = world;
      this.random = random;
      this.tick = 0;
      this.collisions = 0;
      this.errors = [];
      this.contacts = new Set();

      this.network = new LaneNetwork(world);
      this.#indexBorders();

      const lanes = this.network.paths.filter((p) => p.kind == "lane");
      const count = Math.min(carCount, lanes.length);
      this.drivers = [];
      for (let id = 0; id < count; id++) {
         const lane = lanes.splice(Math.floor(random() * lanes.length), 1)[0];
         this.drivers.push(new Driver(id, this, lane, lane.length / 2));
      }
      world.cars = this.drivers.map((d) => d.car);
   }

   update() {
      this.tick++;
      for (const path of this.network.paths) {
         path.occupants = [];
      }
      for (const driver of this.drivers) {
         driver.register();
      }
      for (const driver of this.drivers) {
         driver.update();
      }
      this.#findCollisions();
   }

   fail(message, drivers) {
      this.errors.push({ tick: this.tick, message, ids: drivers.map((d) => d.id) });
   }

   #indexBorders() {
      this.cellSize = 100;
      this.grid = new Map();
      for (const seg of this.world.roadBorders) {
         const cells = this.#cellsOf([seg.p1, seg.p2]);
         for (const key of cells) {
            if (!this.grid.has(key)) {
               this.grid.set(key, []);
            }
            this.grid.get(key).push(seg);
         }
      }
   }

   #cellsOf(points) {
      const xs = points.map((p) => Math.floor(p.x / this.cellSize));
      const ys = points.map((p) => Math.floor(p.y / this.cellSize));
      const keys = [];
      for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
         for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
            keys.push(x + "," + y);
         }
      }
      return keys;
   }

   #hitsBorder(poly) {
      const segs = new Set();
      for (const key of this.#cellsOf(poly)) {
         for (const seg of this.grid.get(key) || []) {
            segs.add(seg);
         }
      }
      for (const seg of segs) {
         for (let i = 0; i < poly.length; i++) {
            if (getIntersection(poly[i], poly[(i + 1) % poly.length], seg.p1, seg.p2)) {
               return true;
            }
         }
      }
      return false;
   }

   #findCollisions() {
      const contacts = [];
      for (let i = 0; i < this.drivers.length; i++) {
         const a = this.drivers[i];
         if (this.#hitsBorder(a.car.polygon)) {
            contacts.push({ key: "border " + a.id, drivers: [a], message: "hit the road border" });
         }
         for (let j = i + 1; j < this.drivers.length; j++) {
            const b = this.drivers[j];
            if (
               Math.abs(a.car.x - b.car.x) < 60 &&
               Math.abs(a.car.y - b.car.y) < 60 &&
               polysIntersect(a.car.polygon, b.car.polygon)
            ) {
               contacts.push({ key: a.id + " " + b.id, drivers: [a, b], message: "collided" });
            }
         }
      }
      const keys = new Set();
      for (const { key, drivers, message } of contacts) {
         keys.add(key);
         if (!this.contacts.has(key)) {
            this.collisions++;
            this.fail(message, drivers);
            for (const driver of drivers) {
               driver.car.damaged = true;
            }
         }
      }
      this.contacts = keys;
   }
}
