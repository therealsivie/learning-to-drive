class Parking extends Marking {
   constructor(center, directionVector, width, height) {
      super(center, directionVector, width, height);

      this.laneDirection = scale(directionVector, -1);
      this.right = perpendicular(this.laneDirection);
      this.bay = new Polygon([
         this.local(-180, 15),
         this.local(-80, 65),
         this.local(80, 65),
         this.local(180, 15)
      ]);
      this.type = "parking";
   }

   local(along, lateral) {
      return add(
         this.center,
         add(scale(this.laneDirection, along), scale(this.right, lateral))
      );
   }

   draw(ctx) {
      new Segment(this.local(-50, 25), this.local(-50, 65)).draw(ctx, {
         width: 4,
         color: "white"
      });
      new Segment(this.local(50, 25), this.local(50, 65)).draw(ctx, {
         width: 4,
         color: "white"
      });
      const p = this.local(0, 45);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle(this.right) + Math.PI / 2);

      ctx.beginPath();
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.font = "bold 30px Arial";
      ctx.fillText("P", 0, 3);

      ctx.restore();
   }
}
