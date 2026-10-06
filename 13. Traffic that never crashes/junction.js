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
         const junctions = Junction.#build(network, world);
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

   static #build(network, world) {
      const junctions = [];
      for (const node of network.nodes) {
         const approaches = node.incoming
            .map((lane) => ({
               lane,
               connectors: node.connectors.filter((c) => c.from == lane),
               ...Junction.#findRule(lane, world)
            }))
            .filter((a) => a.connectors.length > 0);
         if (approaches.length == 0) {
            continue;
         }
         const marked = approaches.some((a) => a.marking);
         for (const approach of approaches) {
            if (!approach.marking) {
               approach.rule = marked ? "main" : "right";
            }
         }
         junctions.push(new Junction(node.point, approaches));
      }
      return junctions;
   }

   static #findRule(lane, world) {
      const end = lane.points[lane.points.length - 1];
      const dir = lane.frame.dir;
      const marking = world.markings.find(
         (m) =>
            (m instanceof Light || m instanceof Stop || m instanceof Yield) &&
            distance(m.center, end) < world.roadWidth &&
            dot(m.directionVector, dir) < -0.9
      );
      if (!marking) {
         return { lineS: lane.length };
      }
      const s = dot(subtract(marking.center, lane.points[0]), dir);
      return {
         marking,
         rule: marking.type,
         lineS: Math.min(lane.length, s + marking.height / 2)
      };
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
      this.holders = this.holders.filter((h) => !this.#mustCancel(h));

      const heads = this.#getHeads(traffic);
      const claimed = [];
      const blocked = [];
      let granted = false;
      for (const head of heads) {
         if (head.driver.holds(head.path)) {
            continue;
         }
         if (!this.#ruleAllows(head, traffic)) {
            blocked.push(head);
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
            granted = true;
         }
      }

      const deadlock =
         !granted &&
         this.holders.length == 0 &&
         blocked.length > 0 &&
         blocked.length == heads.length &&
         blocked.every((h) => h.approach.rule == "right" && h.driver.speed < 0.05);
      if (deadlock && this.#hasRoom(blocked[0])) {
         this.#grant(blocked[0]);
      }
   }

   #grant({ driver, path }) {
      this.holders.push({ driver, path, state: path.approach.marking?.state });
   }

   #conflict(a, b) {
      return this.conflicts.get(a).has(b);
   }

   #mustCancel(holder) {
      const { driver, path } = holder;
      const { rule, marking, lineS } = path.approach;
      if (rule != "light" || driver.hasEntered(path)) {
         return false;
      }
      if (marking.state == "red") {
         return true;
      }
      return marking.state == "yellow" && driver.canStopBefore(path, lineS);
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

   #ruleAllows(head, traffic) {
      const { driver, path, approach } = head;
      switch (approach.rule) {
         case "light":
            if (approach.marking.state == "green") {
               return true;
            }
            return approach.marking.state == "yellow" && !driver.canStopBefore(path, approach.lineS);
         case "stop":
            if (driver.stillTicks < 60) {
               return false;
            }
            return this.#yieldsTo(head, traffic, (a) => a.rule == "main");
         case "yield":
            return this.#yieldsTo(head, traffic, (a) => a.rule == "main");
         case "right": {
            const right = perpendicular(approach.lane.frame.dir);
            return this.#yieldsTo(
               head,
               traffic,
               (a) => dot(a.lane.frame.dir, right) < -0.7
            );
         }
         default:
            return true;
      }
   }

   #yieldsTo(head, traffic, hasPriority) {
      return !this.#getRequests(traffic).some(
         (d) =>
            d != head.driver &&
            hasPriority(d.request.path.approach) &&
            this.#conflict(d.request.path, head.path)
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
