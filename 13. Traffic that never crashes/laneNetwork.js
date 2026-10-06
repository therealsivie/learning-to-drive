const carSize = { width: 30, length: 50 };
const idm = { aMax: 0.05, b: 0.08, s0: 12, T: 20, horizon: 300 };

function getCarPolygon(center, angle, width = carSize.width, length = carSize.length) {
   const rad = Math.hypot(width, length) / 2;
   const alpha = Math.atan2(width, length);
   const corner = (a) => ({
      x: center.x - Math.sin(a) * rad,
      y: center.y - Math.cos(a) * rad
   });
   return [
      corner(angle - alpha),
      corner(angle + alpha),
      corner(Math.PI + angle - alpha),
      corner(Math.PI + angle + alpha)
   ];
}

function getBezierPoints(controls, count = 10) {
   const points = [];
   for (let i = 0; i < count; i++) {
      let level = controls;
      const t = i / (count - 1);
      while (level.length > 1) {
         const nextLevel = [];
         for (let j = 1; j < level.length; j++) {
            nextLevel.push(lerp2D(level[j - 1], level[j], t));
         }
         level = nextLevel;
      }
      points.push(level[0]);
   }
   return points;
}

class LanePath {
   constructor(points, kind, v0) {
      this.points = [points[0]];
      for (const p of points.slice(1)) {
         if (distance(p, this.points[this.points.length - 1]) > 0.001) {
            this.points.push(p);
         }
      }
      this.cum = [0];
      for (let i = 1; i < this.points.length; i++) {
         this.cum.push(this.cum[i - 1] + distance(this.points[i - 1], this.points[i]));
      }
      this.length = this.cum[this.cum.length - 1];
      this.kind = kind;
      this.v0 = v0;
      this.next = [];
      this.turn = "straight";
      this.junction = null;
      this.approach = null;
      this.occupants = [];
      this.twins = [];
   }

   #segmentAt(s) {
      let i = 1;
      while (i < this.points.length - 1 && this.cum[i] < s) {
         i++;
      }
      return i;
   }

   pointAt(s) {
      const i = this.#segmentAt(s);
      const a = this.points[i - 1];
      const b = this.points[i];
      const t = (s - this.cum[i - 1]) / (this.cum[i] - this.cum[i - 1]);
      return lerp2D(a, b, t);
   }

   angleAt(s) {
      const i = this.#segmentAt(s);
      const d = subtract(this.points[i], this.points[i - 1]);
      return Math.atan2(-d.x, -d.y);
   }

   polygonAt(s, margin = 0) {
      return getCarPolygon(
         this.pointAt(s),
         this.angleAt(s),
         carSize.width + margin * 2,
         carSize.length + margin * 2
      );
   }

   draw(ctx, color) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (const p of this.points.slice(1)) {
         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      const end = this.pointAt(this.length);
      const a = this.angleAt(this.length);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(end.x, end.y);
      for (const da of [Math.PI - 0.5, Math.PI + 0.5]) {
         ctx.lineTo(end.x - Math.sin(a + da) * 8, end.y - Math.cos(a + da) * 8);
      }
      ctx.fill();
   }
}

class LaneNetwork {
   constructor(world, trims = new Map()) {
      this.world = world;
      this.trims = trims;
      this.paths = [];
      this.nodes = [];
      this.#build();
   }

   #build() {
      const { graph } = this.world;
      const nodeOf = new Map();
      for (const point of graph.points) {
         const node = { point, incoming: [], outgoing: [], connectors: [] };
         nodeOf.set(point, node);
         this.nodes.push(node);
      }

      const frames = [];
      graph.segments.forEach((seg, i) => {
         frames.push(this.#createFrame(seg.p1, seg.p2, i + ":f", i));
         frames.push(this.#createFrame(seg.p2, seg.p1, i + ":b", i));
      });

      for (const frame of frames) {
         const lane = new LanePath([frame.at(0), frame.at(frame.length)], "lane", 2);
         lane.frame = frame;
         this.paths.push(lane);
         nodeOf.get(frame.from).outgoing.push(lane);
         nodeOf.get(frame.to).incoming.push(lane);
      }

      for (const node of this.nodes) {
         this.#buildConnectors(node);
      }

      this.#findTwins();
   }

   #trim(point, key) {
      const degree = this.world.graph.getSegmentsWithPoint(point).length;
      const base = degree >= 2 ? this.world.roadWidth / 2 : 0;
      return base + (this.trims.get(key) || 0);
   }

   #createFrame(from, to, key, segIndex) {
      const dir = normalize(subtract(to, from));
      const right = perpendicular(dir);
      const trimStart = this.#trim(from, key + ":start");
      const trimEnd = this.#trim(to, key + ":end");
      const start = add(
         add(from, scale(dir, trimStart)),
         scale(right, this.world.roadWidth / 4)
      );
      const length = distance(from, to) - trimStart - trimEnd;
      const at = (s, lateral = 0) => add(add(start, scale(dir, s)), scale(right, lateral));
      return { from, to, key, segIndex, dir, right, start, length, at };
   }

   #buildConnectors(node) {
      for (const from of node.incoming) {
         for (const to of node.outgoing) {
            if (from.frame.segIndex == to.frame.segIndex) {
               continue;
            }
            const a = from.points[from.points.length - 1];
            const b = to.points[0];
            const da = from.frame.dir;
            const db = to.frame.dir;
            const det = cross(da, db);
            let control = average(a, b);
            if (Math.abs(det) > 0.001) {
               const t = cross(subtract(b, a), db) / det;
               const u = cross(subtract(b, a), da) / det;
               if (t > 0 && u < 0) {
                  control = add(a, scale(da, t));
               }
            }
            const turnAngle = Math.atan2(det, dot(da, db));
            let turn = "straight";
            if (Math.abs(turnAngle) >= Math.PI / 6) {
               turn = turnAngle > 0 ? "right" : "left";
            }
            const v0 = { left: 1.2, straight: 2, right: 0.8 }[turn];
            const connector = new LanePath(getBezierPoints([a, control, b]), "connector", v0);
            connector.turn = turn;
            connector.from = from;
            connector.to = to;
            connector.next = [to];
            from.next.push(connector);
            node.connectors.push(connector);
            this.paths.push(connector);
         }
      }
   }

   #findTwins() {
      const groups = new Map();
      for (const path of this.paths) {
         const p = path.points[0];
         const key = p.x.toFixed(1) + "," + p.y.toFixed(1);
         if (!groups.has(key)) {
            groups.set(key, []);
         }
         groups.get(key).push(path);
      }
      for (const group of groups.values()) {
         for (const p of group) {
            for (const q of group) {
               if (p == q) {
                  continue;
               }
               let until = 0;
               const max = Math.min(p.length, q.length);
               for (let s = 0; s <= max; s += 2) {
                  if (distance(p.pointAt(s), q.pointAt(s)) < carSize.width + 4) {
                     until = s;
                  }
               }
               p.twins.push({ path: q, until });
            }
         }
      }
   }

   findRoute(start, target) {
      const dist = new Map([[start, 0]]);
      const prev = new Map();
      const done = new Set();
      while (true) {
         let current = null;
         for (const [path, d] of dist) {
            if (!done.has(path) && (current == null || d < dist.get(current))) {
               current = path;
            }
         }
         if (current == null) {
            return null;
         }
         if (current == target) {
            break;
         }
         done.add(current);
         for (const next of current.next) {
            const d = dist.get(current) + current.length;
            if (!dist.has(next) || d < dist.get(next)) {
               dist.set(next, d);
               prev.set(next, current);
            }
         }
      }
      const route = [target];
      while (route[0] != start) {
         route.unshift(prev.get(route[0]));
      }
      return route;
   }

   draw(ctx) {
      const colors = { lane: "#00F", connector: "#F80" };
      for (const path of this.paths) {
         const held = path.junction && path.junction.holders.some((h) => h.path == path);
         path.draw(ctx, held ? "#F00" : colors[path.kind]);
      }
   }
}
