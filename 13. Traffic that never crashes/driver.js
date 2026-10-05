class Driver {
   constructor(id, traffic, path, s) {
      this.id = id;
      this.traffic = traffic;
      this.route = [path];
      this.idx = 0;
      this.s = s;
      this.speed = 0;
      this.#extendRoute();

      const p = path.pointAt(s);
      this.car = new Car(
         p.x,
         p.y,
         carSize.width,
         carSize.length,
         "DUMMY",
         path.angleAt(s),
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

   update() {
      this.#extendRoute();
      this.#drive();
      while (this.s >= this.route[this.idx].length && this.idx + 1 < this.route.length) {
         this.s -= this.route[this.idx].length;
         this.idx++;
      }
      this.#updatePose();
   }

   #extendRoute() {
      if (this.idx > 1) {
         const cut = this.idx - 1;
         this.route = this.route.slice(cut);
         this.idx -= cut;
      }
      const { network, random } = this.traffic;
      const lanes = network.paths.filter((p) => p.kind == "lane");
      while (this.#offset(this.route.length) - this.s < 2 * idm.horizon) {
         const last = this.route[this.route.length - 1];
         const target = lanes[Math.floor(random() * lanes.length)];
         const route = target != last && network.findRoute(last, target);
         if (route) {
            this.route.push(...route.slice(1));
         }
      }
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
      const step = Math.min(v, Math.max(0, gap - 2));
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
         cum += path.length;
      }
      return vTarget;
   }

   #obstacles() {
      const obstacles = [];
      let cum = 0;
      for (let k = this.idx; k < this.route.length && cum - this.front < idm.horizon; k++) {
         const path = this.route[k];
         for (const o of path.occupants) {
            if (o.driver != this && cum + o.center > this.s) {
               obstacles.push({ gap: cum + o.rear - this.front, speed: o.driver.speed });
            }
         }
         if (k == this.route.length - 1) {
            obstacles.push({ gap: cum + path.length - this.front, speed: 0 });
         }
         cum += path.length;
      }
      return obstacles;
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
