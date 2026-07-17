class Road{
   constructor(x,width,laneCount=3){
      this.x=x;
      this.width=width;
      this.laneCount=laneCount;
      this.left=x-width/4;
      this.right=x+width/4;

      const infinity=10000;
      this.top=-infinity;
      this.bottom=infinity;

      this.curveTop=-1000;
      this.curveBottom=0;

      const ys=[this.top];
      for(let y=this.curveTop;y<=this.curveBottom;y+=10){
         ys.push(y);
      }
      ys.push(this.bottom);

      this.borders=[[],[]];
      ys.forEach(y=>{
         const offset=this.#curveOffset(y);
         this.borders[0].push({x:this.left+offset,y:y});
         this.borders[1].push({x:this.right+offset,y:y});
      });
   }

   #curveOffset(y){
      const curveY=Math.min(Math.max(y,this.curveTop),this.curveBottom);
      return Math.sin(curveY*0.01)*50;
   }

   getLaneCenter(laneIndex){
      const laneWidth=this.width/this.laneCount;
      return this.left+laneWidth/2+
         Math.min(laneIndex,this.laneCount-1)*laneWidth;
   }

   draw(ctx){
      ctx.lineWidth=5;
      ctx.strokeStyle="white";

      /*
      ctx.setLineDash([20,20]);
      for(let i=1;i<=this.laneCount-1;i++){
         const x=lerp(
            this.left,
            this.right,
            i/this.laneCount
         );
         ctx.beginPath();
         ctx.moveTo(x,this.top);
         ctx.lineTo(x,this.bottom);
         ctx.stroke();
      }
      */

      ctx.setLineDash([20,20]);
      this.borders.forEach(border=>{
         ctx.beginPath();
         ctx.moveTo(border[0].x,border[0].y);
         for(let i=1;i<border.length;i++){
            ctx.lineTo(border[i].x,border[i].y);
         }
         ctx.stroke();
      });
      ctx.setLineDash([]);
   }
}