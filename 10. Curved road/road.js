class Road{
   constructor(x,width){
      this.x=x;
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

   getCenter(y){
      return this.x+this.#curveOffset(y);
   }

   getAngle(y){
      return Math.atan(this.getCenter(y)-this.getCenter(y-1));
   }

   #curveOffset(y){
      const curveY=Math.min(Math.max(y,this.curveTop),this.curveBottom);
      return Math.sin(curveY*0.01)*50;
   }

   draw(ctx){
      ctx.lineWidth=5;
      ctx.strokeStyle="white";
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