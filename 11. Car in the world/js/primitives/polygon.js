class Polygon {
   constructor(points) {
      this.points = points;
      this.segments = [];
      for (let i = 1; i <= points.length; i++) {
         this.segments.push(
            new Segment(points[i - 1], points[i % points.length])
         );
      }
   }

   draw(
      ctx,
      { stroke = "blue", lineWidth = 2, fill = "rgba(0,0,255,0.3)" } = {}
   ) {
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
         ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
   }
}
