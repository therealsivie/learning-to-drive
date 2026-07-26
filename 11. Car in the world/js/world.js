class World {
   constructor(graph, roadWidth = 100, roadRoundness = 10) {
      this.graph = graph;
      this.roadWidth = roadWidth;
      this.roadRoundness = roadRoundness;

      this.envelopes = [];

      this.generate();
   }

   generate() {
      this.envelopes.length = 0;
      for (const seg of this.graph.segments) {
         this.envelopes.push(
            new Envelope(seg, this.roadWidth, this.roadRoundness)
         );
      }
   }

   draw(ctx) {
      for (const env of this.envelopes) {
         env.draw(ctx, { fill: "#BBB", stroke: "#BBB", lineWidth: 15 });
      }
      for (const seg of this.graph.segments) {
         seg.draw(ctx, { color: "white", width: 4, dash: [10, 10] });
      }
   }
}
