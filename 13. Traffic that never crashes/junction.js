class Junction {
   constructor(center, approaches) {
      this.center = center;
      this.approaches = approaches;
      this.connectors = [];
      this.holders = [];
      this.conflicts = new Map();
      for (const approach of approaches) {
         for (const connector of approach.connectors) {
            connector.junction = this;
            connector.approach = approach;
            this.connectors.push(connector);
            this.conflicts.set(connector, new Set());
         }
      }
      for (let i = 0; i < this.connectors.length; i++) {
         for (let j = i + 1; j < this.connectors.length; j++) {
            const a = this.connectors[i];
            const b = this.connectors[j];
            if (Junction.connectorsConflict(a, b)) {
               this.conflicts.get(a).add(b);
               this.conflicts.get(b).add(a);
            }
         }
      }
   }

   static createNetwork(world) {
      const trims = new Map();
      for (let round = 0; ; round++) {
         const network = new LaneNetwork(world, trims);
         const junctions = Junction.#build(network);
         const keys = round < 10 ? Junction.#findTrims(network) : new Set();
         if (round == 10) {
            console.warn("Junction trims did not converge in 10 rounds");
         }
         if (keys.size == 0) {
            return { network, junctions };
         }
         for (const key of keys) {
            trims.set(key, (trims.get(key) || 0) + 10);
         }
      }
   }

   static #build(network) {
      const junctions = [];
      for (const node of network.nodes) {
         const approaches = node.incoming
            .map((lane) => ({
               lane,
               connectors: node.connectors.filter((c) => c.from == lane),
               lineS: lane.length
            }))
            .filter((a) => a.connectors.length > 0);
         if (approaches.length == 0) {
            continue;
         }
         junctions.push(new Junction(node.point, approaches));
      }
      return junctions;
   }

   static #samples(path, from, to) {
      const polys = [];
      for (let s = from; s <= to; s += 5) {
         polys.push(path.polygonAt(s, 4));
      }
      return polys;
   }

   static #sweep(path) {
      return Junction.#samples(path, -carSize.length / 2, path.length + carSize.length / 2);
   }

   static #polysOverlap(polysA, polysB) {
      const boxes = (polys) => polys.map((poly) => ({
         poly,
         minX: Math.min(...poly.map((p) => p.x)),
         maxX: Math.max(...poly.map((p) => p.x)),
         minY: Math.min(...poly.map((p) => p.y)),
         maxY: Math.max(...poly.map((p) => p.y))
      }));
      const a = boxes(polysA);
      const b = boxes(polysB);
      for (const p of a) {
         for (const q of b) {
            if (
               p.minX <= q.maxX &&
               q.minX <= p.maxX &&
               p.minY <= q.maxY &&
               q.minY <= p.maxY &&
               polysIntersect(p.poly, q.poly)
            ) {
               return true;
            }
         }
      }
      return false;
   }

   static connectorsConflict(a, b) {
      if (a.from == b.from) {
         return false;
      }
      if (a.to == b.to) {
         return true;
      }
      return Junction.#polysOverlap(Junction.#sweep(a), Junction.#sweep(b));
   }

   static #findTrims(network) {
      const keys = new Set();
      for (const node of network.nodes) {
         const sweeps = node.connectors.map((c) => ({ c, polys: Junction.#sweep(c) }));
         for (const lane of node.incoming) {
            const waiting = [lane.polygonAt(lane.length - carSize.length / 2, 4)];
            if (sweeps.some(({ c, polys }) => c.from != lane && Junction.#polysOverlap(waiting, polys))) {
               keys.add(lane.frame.key + ":end");
            }
         }
         for (const lane of node.outgoing) {
            const leaving = [lane.polygonAt(carSize.length / 2, 4)];
            if (sweeps.some(({ c, polys }) => c.to != lane && Junction.#polysOverlap(leaving, polys))) {
               keys.add(lane.frame.key + ":start");
            }
         }
      }
      return keys;
   }

   update(traffic) {
      this.holders = this.holders.filter((h) => !h.driver.hasPassed(h.path));

      const heads = this.#getHeads(traffic);
      const claimed = [];
      for (const head of heads) {
         if (head.driver.holds(head.path)) {
            continue;
         }
         if (claimed.some((path) => this.#conflict(path, head.path))) {
            continue;
         }
         if (this.holders.some((h) => this.#conflict(h.path, head.path))) {
            claimed.push(head.path);
            continue;
         }
         if (this.#hasRoom(head)) {
            this.#grant(head);
         }
      }
   }

   #grant({ driver, path }) {
      this.holders.push({ driver, path });
   }

   #conflict(a, b) {
      return this.conflicts.get(a).has(b);
   }

   #getRequests(traffic) {
      return traffic.drivers.filter(
         (d) => d.request && d.request.path.junction == this && d.request.dist <= 150
      );
   }

   #getHeads(traffic) {
      const heads = new Map();
      for (const driver of this.#getRequests(traffic)) {
         const { path, dist } = driver.request;
         const current = heads.get(path.approach);
         if (!current || dist < current.dist) {
            heads.set(path.approach, { driver, path, dist, approach: path.approach });
         }
      }
      return [...heads.values()].sort(
         (a, b) => a.driver.requestTick - b.driver.requestTick || a.driver.id - b.driver.id
      );
   }

   #hasRoom(head) {
      const { driver, path } = head;
      const route = driver.route;
      const k = route.indexOf(path, driver.idx);
      let need = carSize.length + idm.s0;
      for (const h of this.holders) {
         if (h.driver != driver && h.path.to == path.to) {
            need += carSize.length + idm.s0;
         }
      }
      let room = 0;
      for (let j = k + 1; j < route.length; j++) {
         const rears = route[j].occupants
            .filter((o) => o.driver != driver)
            .map((o) => o.rear);
         if (rears.length > 0) {
            room += Math.max(0, Math.min(...rears));
            break;
         }
         room += route[j].length;
         if (room >= need || (j + 1 < route.length && route[j + 1].junction)) {
            break;
         }
      }
      return room >= need;
   }
}
