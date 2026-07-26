class Viewport {
   constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.zoom = 1;
      this.center = new Point(canvas.width / 2, canvas.height / 2);
      this.offset = scale(this.center, -1);

      this.#addEventListeners();
   }

   reset() {
      this.ctx.restore();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.save();
      this.ctx.translate(this.center.x, this.center.y);
      this.ctx.scale(1 / this.zoom, 1 / this.zoom);
      this.ctx.translate(this.offset.x, this.offset.y);
   }

   getMouse(evt) {
      return new Point(
         (evt.offsetX - this.center.x) * this.zoom - this.offset.x,
         (evt.offsetY - this.center.y) * this.zoom - this.offset.y
      );
   }

   #addEventListeners() {
      this.canvas.addEventListener("wheel", this.#handleMouseWheel.bind(this));
   }

   #handleMouseWheel(evt) {
      const dir = Math.sign(evt.deltaY);
      const step = 0.1;
      this.zoom += dir * step;
      this.zoom = Math.max(1, Math.min(5, this.zoom));
   }
}
