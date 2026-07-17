carCanvas.height=window.innerHeight;
carCanvas.width=200;
networkCanvas.height=window.innerHeight;
networkCanvas.width=298;

const carCtx=carCanvas.getContext("2d");
const networkCtx=networkCanvas.getContext("2d");
const road=new Road(carCanvas.width/2,carCanvas.width*0.9);
const N=100;
const cars=generateCars(N);
const trafficOffset=-20;
const traffic=[
   new Car(road.getCenter(-100)+trafficOffset,-100,30,50,"DUMMY",2)
];
let bestCar=cars[0];
const brainKey="curvedRoadBestBrain";
if(localStorage.getItem(brainKey)){
   for(let i=0;i<cars.length;i++){
      cars[i].brain=JSON.parse(
         localStorage.getItem(brainKey));
      if(i>0){
         NeuralNetwork.mutate(cars[i].brain,0.4);
      }
   }
}

animate();

function animate(){
   for(let i=0;i<traffic.length;i++){
      const car=traffic[i];
      car.x=road.getCenter(car.y)+trafficOffset;
      car.angle=road.getAngle(car.y);
      car.update([],[]);
   }
   for(let i=0;i<cars.length;i++){
      cars[i].update(road.borders,traffic);
   }
   bestCar=cars.find(
      c=>c.y==Math.min(
         ...cars.map(c=>c.y)
      ));

   carCanvas.height=window.innerHeight;
   networkCanvas.height=window.innerHeight;
   
   carCtx.translate(0,-bestCar.y+carCanvas.height*0.7);
   road.draw(carCtx);
   for(let i=0;i<traffic.length;i++){
      traffic[i].draw(carCtx);
   }
   carCtx.globalAlpha=0.2;
   for(let i=0;i<cars.length;i++){
      cars[i].draw(carCtx);
   }
   carCtx.globalAlpha=1;
   bestCar.draw(carCtx,true);

   Visualizer.drawNetwork(networkCtx,bestCar.brain);
   
   requestAnimationFrame(animate);
}

function generateCars(N){
   const cars=[];
   for(let i=1;i<=N;i++){
      cars.push(new Car(100,100,30,50,"AI"));
   }
   return cars;
}

function save(){
   localStorage.setItem(brainKey,
      JSON.stringify(bestCar.brain));
}

function discard(){
   localStorage.removeItem(brainKey);
}