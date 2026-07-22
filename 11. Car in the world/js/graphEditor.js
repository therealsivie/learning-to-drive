class GraphEditor {
   constructor(canvas, graph) {
      this.canvas = canvas;
      this.graph = graph;

      this.ctx = this.canvas.getContext("2d");

      this.selected = null;
      this.hovered = null;
      this.mouse = null;

      this.#addEventListeners();
   }

   #addEventListeners() {
      this.canvas.addEventListener("mousedown", this.#handleMouseDown.bind(this));
      this.canvas.addEventListener("mousemove", this.#handleMouseMove.bind(this));
   }

   #handleMouseMove(evt) {
      this.mouse = new Point(evt.offsetX, evt.offsetY);
      this.hovered = getNearestPoint(this.mouse, this.graph.points, 10);
   }

   #handleMouseDown(evt) {
      if (evt.button == 0) { // left click
         if (this.hovered) {
            this.#select(this.hovered);
            return;
         }
         this.graph.addPoint(this.mouse);
         this.#select(this.mouse);
         this.hovered = this.mouse;
      }
   }

   #select(point) {
      if (this.selected) {
         this.graph.tryAddSegment(new Segment(this.selected, point));
      }
      this.selected = point;
   }

   display() {
      this.graph.draw(this.ctx);
      if (this.hovered) {
         this.hovered.draw(this.ctx, { fill: true });
      }
      if (this.selected) {
         const intent = this.hovered ? this.hovered : this.mouse;
         new Segment(this.selected, intent).draw(this.ctx, { dash: [3, 3] });
         this.selected.draw(this.ctx, { outline: true });
      }
   }
}
