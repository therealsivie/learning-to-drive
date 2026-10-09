class Driver {
   constructor(id, traffic, bay) {
      this.id = id;
      this.traffic = traffic;
      this.home = bay;
      bay.occupant = this;
      this.target = null;
      this.leaving = false;
      this.route = [bay.spot];
      this.idx = 0;
      this.s = bay.spot.length / 2;
      this.speed = 0;
      this.parked = true;
      this.departTick = this.#nextDeparture();
      this.request = null;
      this.requestTick = 0;
      this.stillTicks = 0;
      this.trips = 0;
      this.lastTripTick = traffic.tick;
      this.stalledTicks = 0;
      this.frontIdx = 0;

      const p = bay.spot.pointAt(this.s);
      this.car = new Car(
         p.x,
         p.y,
         carSize.width,
         carSize.length,
         "DUMMY",
         bay.spot.angleAt(this.s),
         3,
         getRandomColor()
      );
   }

   get front() {
      return this.s + carSize.length / 2;
   }

   get rear() {
      return this.s - carSize.length / 2;
   }

   register() {
      const half = carSize.length / 2;
      const add = (path, center) => {
         path.occupants.push({ driver: this, center, rear: center - half, front: center + half });
         for (const twin of path.twins) {
            if (center - half < twin.until) {
               twin.path.occupants.push({
                  driver: this,
                  center,
                  rear: center - half,
                  front: center + half
               });
            }
         }
      };
      add(this.route[this.idx], this.s);
      let center = this.s;
      for (let k = this.idx - 1; k >= 0 && center - half < 0; k--) {
         center += this.route[k].length;
         add(this.route[k], center);
      }
      center = this.s;
      for (let k = this.idx; k + 1 < this.route.length && center + half > this.route[k].length; k++) {
         center -= this.route[k].length;
         add(this.route[k + 1], center);
      }
   }

   holds(path) {
      return path.junction.holders.some((h) => h.driver == this && h.path == path);
   }

   hasEntered(path) {
      const k = this.route.indexOf(path, Math.max(0, this.idx - 1));
      return k >= 0 && this.frontIdx >= k;
   }

   hasPassed(path) {
      const k = this.route.indexOf(path, Math.max(0, this.idx - 1));
      return k < 0 || this.idx > k + 1 || (this.idx == k + 1 && this.rear >= 0);
   }

   canStopBefore(path, lineS) {
      const k = this.route.indexOf(path, this.idx);
      if (k < 1) {
         return false;
      }
      const dist = this.#offset(k - 1) + lineS - this.front;
      return (this.speed * this.speed) / (2 * 0.15) < dist;
   }

   update() {
      const traffic = this.traffic;
      if (this.parked && traffic.tick >= this.departTick) {
         this.#depart();
      }
      if (!this.parked) {
         this.#drive();
         this.#updateFront();
         while (this.s >= this.route[this.idx].length && this.idx + 1 < this.route.length) {
            this.s -= this.route[this.idx].length;
            this.idx++;
         }
         if (this.leaving && (this.idx >= 2 || (this.idx == 1 && this.rear >= 0))) {
            this.home.occupant = null;
            this.leaving = false;
         }
         this.#updateRequest();
         this.#checkArrival();
         this.#checkStall();
      }
      this.#updatePose();
   }

   #nextDeparture() {
      return this.traffic.tick + 180 + Math.floor(this.traffic.random() * 421);
   }

   #depart() {
      const { network, random } = this.traffic;
      const free = network.bays.filter((b) => b != this.home && !b.occupant && !b.reservedBy);
      while (free.length > 0) {
         const bay = free.splice(Math.floor(random() * free.length), 1)[0];
         const route = network.findRoute(this.home.spot, bay.spot, bay);
         if (route) {
            this.target = bay;
            bay.reservedBy = this;
            this.route = route;
            this.idx = 0;
            this.frontIdx = 0;
            this.parked = false;
            this.leaving = true;
            this.stalledTicks = 0;
            return;
         }
      }
      this.departTick = this.#nextDeparture();
   }

   #offset(k) {
      let cum = 0;
      for (let j = this.idx; j < k; j++) {
         cum += this.route[j].length;
      }
      return cum;
   }

   #drive() {
      const vTarget = this.#targetSpeed();
      let acc = idm.aMax * (1 - Math.pow(this.speed / vTarget, 4));
      let gap = Infinity;
      for (const obstacle of this.#obstacles()) {
         acc = Math.min(acc, this.#idmAcceleration(vTarget, obstacle));
         gap = Math.min(gap, obstacle.gap);
      }
      const v = Math.max(0, this.speed + acc);
      const step = this.#guard(Math.min(v, Math.max(0, gap - 2)));
      this.s += step;
      this.speed = step;
   }

   #idmAcceleration(vTarget, { gap, speed }) {
      if (gap <= 0) {
         return -Infinity;
      }
      const v = this.speed;
      const dynamic = v * idm.T + (v * (v - speed)) / (2 * Math.sqrt(idm.aMax * idm.b));
      const desired = idm.s0 + Math.max(0, dynamic);
      return idm.aMax * (1 - Math.pow(v / vTarget, 4) - Math.pow(desired / gap, 2));
   }

   #targetSpeed() {
      const brake = (v, d) => (d <= 0 ? v : Math.sqrt(v * v + 2 * idm.b * d));
      let vTarget = Infinity;
      let cum = 0;
      for (let k = this.idx; k < this.route.length && cum - this.front < idm.horizon; k++) {
         const path = this.route[k];
         vTarget = Math.min(vTarget, brake(path.v0, cum - this.front));
         for (const limit of path.limits) {
            if (cum + limit.to > this.rear) {
               vTarget = Math.min(vTarget, brake(limit.v, cum + limit.from - this.front));
            }
         }
         cum += path.length;
      }
      return vTarget;
   }

   #obstacles() {
      const obstacles = [];
      let cum = 0;
      let stopFound = false;
      for (let k = this.idx; k < this.route.length && cum - this.front < idm.horizon; k++) {
         const path = this.route[k];
         for (const o of path.occupants) {
            if (o.driver != this && cum + o.center > this.s) {
               obstacles.push({ gap: cum + o.rear - this.front, speed: o.driver.speed });
            }
         }
         if (!stopFound && k > this.frontIdx && path.junction && !this.holds(path)) {
            const lineS = cum - this.route[k - 1].length + path.approach.lineS;
            obstacles.push({ gap: lineS - this.front, speed: 0 });
            stopFound = true;
         }
         if (k == this.route.length - 1) {
            const end = path == this.target?.spot
               ? path.length / 2 + carSize.length / 2 + idm.s0
               : path.length;
            obstacles.push({ gap: cum + end - this.front, speed: 0 });
         }
         cum += path.length;
      }
      return obstacles;
   }

   #polygonAt(s, margin) {
      let k = this.idx;
      while (s > this.route[k].length && k + 1 < this.route.length) {
         s -= this.route[k].length;
         k++;
      }
      return this.route[k].polygonAt(s, margin);
   }

   #guard(step) {
      if (step == 0) {
         return 0;
      }
      const others = this.traffic.drivers.filter(
         (d) =>
            d != this &&
            Math.abs(d.car.x - this.car.x) < 100 &&
            Math.abs(d.car.y - this.car.y) < 100
      );
      for (let i = 0; i <= 6; i++) {
         const poly = this.#polygonAt(this.s + step, 1);
         if (!others.some((d) => polysIntersect(poly, d.car.polygon))) {
            return step;
         }
         if (i == 0) {
            this.traffic.guardHits++;
         }
         step /= 2;
      }
      return 0;
   }

   #updateFront() {
      let f = this.front;
      let k = this.idx;
      while (k + 1 < this.route.length && f > this.route[k].length) {
         f -= this.route[k].length;
         k++;
      }
      for (let j = this.frontIdx + 1; j <= k; j++) {
         const path = this.route[j];
         if (path.junction) {
            this.#checkEntry(path);
         }
      }
      this.frontIdx = Math.max(this.frontIdx, k);
   }

   #checkEntry(path) {
      const { rule, marking } = path.approach;
      const holder = path.junction.holders.find((h) => h.driver == this && h.path == path);
      if (rule == "light" && marking.state == "red" && (!holder || holder.state == "red")) {
         this.traffic.violations++;
         this.traffic.fail("entered on red", [this]);
      } else if (!holder) {
         this.traffic.fail("entered a " + rule + " junction without a reservation", [this]);
      }
      if (rule == "stop" && this.stillTicks < 60) {
         this.traffic.fail("entered a Stop after " + this.stillTicks + " still ticks", [this]);
      }
   }

   #updateRequest() {
      let request = null;
      let cum = 0;
      for (let k = this.idx; k < this.route.length; k++) {
         const path = this.route[k];
         if (k > this.frontIdx && path.junction) {
            const lineS = cum - this.route[k - 1].length + path.approach.lineS;
            request = { path, dist: lineS - this.front };
            break;
         }
         cum += path.length;
      }
      if (request?.path != this.request?.path) {
         this.requestTick = this.traffic.tick;
      }
      if (request?.path.approach != this.request?.path.approach) {
         this.stillTicks = 0;
      }
      this.request = request;
      if (request && request.dist <= idm.s0 + 5 && this.speed < 0.05) {
         this.stillTicks++;
      }
   }

   #checkArrival() {
      const spot = this.target.spot;
      if (
         this.route[this.idx] != spot ||
         this.speed >= 0.05 ||
         spot.length / 2 - this.s > 5
      ) {
         return;
      }
      this.trips++;
      this.traffic.trips++;
      this.home = this.target;
      this.home.occupant = this;
      this.home.reservedBy = null;
      this.target = null;
      this.parked = true;
      this.departTick = this.#nextDeparture();
      this.lastTripTick = this.traffic.tick;
      this.route = [this.home.spot];
      this.idx = 0;
      this.frontIdx = 0;
      this.request = null;
   }

   #checkStall() {
      if (this.parked || this.speed >= 0.01) {
         this.stalledTicks = 0;
         return;
      }
      this.stalledTicks++;
      if (this.stalledTicks == 1800) {
         this.traffic.fail("stalled for 1800 ticks", [this]);
      }
   }

   #updatePose() {
      const path = this.route[this.idx];
      const p = path.pointAt(this.s);
      this.car.x = p.x;
      this.car.y = p.y;
      this.car.angle = path.angleAt(this.s);
      this.car.speed = this.speed;
      this.car.createPolygon();
   }
}
