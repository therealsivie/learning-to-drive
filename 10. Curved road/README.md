# 10. Curved road

Un esperimento che parte dal codice del capitolo 8 e cambia due cose: la strada diventa **curva** e
la rete neurale perde lo **strato nascosto**. Non è il seguito del capitolo 9: lo sprite colorato e
il traffico multicolore non ci sono, l'auto torna a essere un poligono.

L'obiettivo è vedere se una rete minima riesce a seguire una strada che non va dritta, e cosa serve
cambiare nel resto del codice perché bordi non rettilinei funzionino.

## Cosa cambia rispetto al capitolo 8

| Aspetto | Capitolo 8 | Capitolo 10 |
|---------|------------|-------------|
| Strada | Dritta, 3 corsie, larga 180 px | Tratto sinusoidale, larga 90 px, corsie non disegnate |
| Bordi | 2 segmenti | 2 polilinee di circa 100 punti |
| Rete | `[5,6,4]` | `[5,4]` |
| Sensore | Legato all'auto, apertura 90° | Indipendente dall'auto, apertura 45° |
| Traffico | 7 auto | 1 auto |
| Mutazione | 0.1 | 0.4 |
| Salvataggio | Pulsanti 💾 e 🗑️, chiave `bestBrain` | `save()` e `discard()` dalla console, chiave `curvedRoadBestBrain` |
| Visualizer | Linee tratteggiate animate, nodi da 18 | Linee piene, nodi da 14 |

Anche la formattazione cambia: indentazione a 3 spazi invece di 4.

## La strada curva

```js
this.left=x-width/4;
this.right=x+width/4;

const infinity=10000;
...
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
...
#curveOffset(y){
   const curveY=Math.min(Math.max(y,this.curveTop),this.curveBottom);
   return Math.sin(curveY*0.01)*50;
}
```

- Ogni bordo non è più un segmento ma una **polilinea**: un punto in alto, un punto ogni 10 px
  tra y=-1000 e y=0 spostato in orizzontale da una sinusoide, un punto in basso.
- 10 px bastano: tra due punti la corda si scosta dalla curva di circa 0,06 px (`A·k²·h²/8` con
  ampiezza 50, `k=0.01` e passo 10), quindi la strada è identica a una campionata ogni pixel ma
  con dieci volte meno segmenti.
- `Math.sin(y*0.01)*50` ha ampiezza 50 px e periodo di circa 628 px (2π/0.01): nei 1000 px del
  tratto curvo ci sono circa una curva e mezza.
- La larghezza si dimezza (`width/4` per lato invece di `width/2`): 90 px, una corsia e mezzo.
  Le corsie spariscono del tutto, insieme a `laneCount` e `getLaneCenter`, e i bordi sono
  disegnati tratteggiati.
- Tutti i punti, compresi quelli in cima e in fondo, passano da `#curveOffset`. La `y` viene
  bloccata dentro il tratto curvo, quindi fuori da lì la strada torna dritta e mantiene lo
  spostamento dell'ultimo punto: in basso è zero (`sin(0)`), in alto è circa 27 px
  (`sin(-10)*50`). Così la strada è continua e il segmento finale fino a y=-10000 resta
  verticale, invece di tornare inclinato verso la x di partenza.
- "Infinito" vale 10000 invece di un milione: basta, visto che il tratto interessante è lungo
  1000 px.

## Collisioni con le polilinee

Nel capitolo 4 `polysIntersect` chiudeva i poligoni con il modulo, collegando l'ultimo vertice al
primo. Su un bordo di 1000 punti questo aggiungerebbe un segmento che va dal fondo della strada
alla cima, una linea dritta che taglia tutta la carreggiata. Ora la funzione lavora su polilinee
aperte:

```js
function polysIntersect(poly1, poly2){
   for(let i=0;i<poly1.length-1;i++){
      for(let j=0;j<poly2.length-1;j++){
         const touch=getIntersection(
            poly1[i], poly1[i+1],
            poly2[j], poly2[j+1]
         );
         ...
```

e quando serve un poligono chiuso lo si chiude a mano, aggiungendo in coda il primo vertice:

```js
polysIntersect(
   [...this.polygon,this.polygon[0]],
   roadBorders[i])
```

Il sensore fa lo stesso ragionamento: scorre i bordi segmento per segmento (`border[i-1]`,
`border[i]`) e usa il modulo solo per i poligoni delle auto, che sono chiusi.

Il prezzo è il numero di intersezioni. Ogni raggio controlla circa 200 segmenti di bordo, e lo
stesso vale per i quattro lati di ogni auto ancora integra. Con 100 auto si arriva a circa 180.000
chiamate a `getIntersection` per frame, contro le circa 15.000 del capitolo 9. Campionando la curva
ogni pixel sarebbero quasi due milioni, e la simulazione diventerebbe visibilmente meno fluida.

Per lo stesso motivo un'auto rotta smette del tutto di lavorare:

```js
update(roadBorders,traffic){
   if(this.damaged){
      return;
   }
   ...
```

Nei capitoli 8 e 9 solo movimento e collisioni erano protetti da `if(!this.damaged)`: sensore e
rete continuavano a girare anche per le auto ferme contro il muro, calcolando comandi che nessuno
avrebbe più usato. Lì costava poco, qui ogni auto rotta sprecherebbe circa 1000 intersezioni a
frame. Il disegno non cambia: se l'auto migliore è rotta, i raggi mostrano le ultime letture, che
restano valide perché l'auto non si muove più.

## Sensore indipendente dall'auto

```js
constructor(){
   this.rayCount=5;
   this.rayLength=150;
   this.raySpread=Math.PI/4;
   ...
}

update(x,y,angle,roadBorders,traffic){
   this.#castRays(x,y,angle);
   ...
}
```

`Sensor` non riceve più l'auto nel costruttore: posizione e angolo arrivano a ogni `update`. Così
non dipende più dalla struttura di `Car` e si potrebbe montare su qualsiasi oggetto.

L'apertura dei raggi scende a 45° (`PI/4`): su una strada stretta servono raggi concentrati in
avanti più che di lato. Il raggio viene disegnato solo in giallo fino al punto di contatto: il
tratto nero oltre quel punto non c'è più.

## Rete senza strato nascosto

```js
this.brain=new NeuralNetwork(
   [this.sensor.rayCount,4]
);
```

I 5 input sono collegati direttamente ai 4 output, con un solo livello. Ogni output è un
percettrone: somma pesata delle letture dei raggi confrontata con il bias. Sembra pochissimo, ma
per restare in strada basta, perché "se il raggio a sinistra è vicino, gira a destra" è una regola
lineare.

Con un solo livello nel visualizer entra in gioco il caso `network.levels.length==1 ? 0.5` del
capitolo 7, che centra il livello verticalmente.

`Level.feedForward` copia gli input con uno spread invece di assegnarli uno a uno:

```js
level.inputs=[...givenInputs];
```

## main.js

Rispetto al capitolo 8 il file è più asciutto:

- **Nessun `getElementById`**: `carCanvas` e `networkCanvas` sono usati direttamente. Funziona
  perché il browser crea una variabile globale per ogni elemento con un `id`. È comodo ma fragile:
  basta dichiarare una variabile con lo stesso nome per perdere il riferimento.
- **Nessun `save`/`restore`** intorno a `translate`: assegnare `carCanvas.height` all'inizio di
  ogni frame resetta già le trasformazioni.
- **Nessun pulsante**: `save()` e `discard()` esistono ancora, ma si chiamano dalla console.
- `networkCanvas.width=298` e nell'HTML i due `<canvas>` sono sulla stessa riga senza spazi: il
  whitespace tra due elementi inline creerebbe uno spazio, così invece i canvas sono attaccati.
- Le auto partono tutte da x=100, il centro della strada nel rettilineo iniziale: senza corsie
  non serve più `getLaneCenter`.

### Traffico

```js
const trafficOffset=-20;
const traffic=[
   new Car(road.getCenter(-100)+trafficOffset,-100,30,50,"DUMMY",2)
];
...
const car=traffic[i];
car.x=road.getCenter(car.y)+trafficOffset;
car.angle=road.getAngle(car.y);
car.update([],[]);
```

Una sola auto, che segue la strada. A ogni frame viene rimessa sulla curva prima di muoversi:

- `road.getCenter(y)` restituisce la x del centro della strada a quell'altezza, cioè `x` più lo
  stesso `#curveOffset` usato per i bordi.
- `road.getAngle(y)` restituisce la pendenza della curva in quel punto: `atan` della differenza
  tra il centro a `y` e quello a `y-1`. È l'angolo che, con la convenzione di `#move`
  (`x-=sin(angle)*speed`), fa avanzare l'auto lungo la tangente, inclinata al massimo di circa
  27°. Fuori dal tratto curvo la differenza è zero e l'auto torna dritta.

`trafficOffset` sposta l'auto di 20 px a sinistra del centro. Su una strada larga 90 px un'auto
larga 30 px messa al centro lascerebbe 30 px per lato, quindi nessun varco. Spostata a sinistra
lascia sulla destra almeno 40 px anche nel punto più inclinato della curva, abbastanza per
sorpassare.

L'aggiornamento avviene ancora con bordi vuoti, quindi l'auto non si rompe mai. Ma ora non serve
più come trucco: prima andava sempre dritta a x=100 e attraversava il bordo quando la strada
ondeggiava, ora resta sempre in carreggiata.

### Mutazione più forte

```js
NeuralNetwork.mutate(cars[i].brain,0.4);
```

0.4 invece di 0.1: le varianti sono molto più diverse tra loro. Si esplora di più, al prezzo di
perdere più facilmente quello che di buono aveva la rete salvata. Con una rete piccola come `[5,4]`
spingere di più ha senso.

### L'ordine in #move

Lo sterzo viene applicato prima del limite di velocità e dell'attrito invece che dopo. La
differenza pratica è trascurabile: cambia qualcosa solo nel frame esatto in cui l'auto si ferma.

## Come provarlo

1. Apri `index.html` e la console del browser (F12).
2. La prima generazione è casuale: quasi tutte le auto si schiantano subito o restano ferme.
   Ricarica finché una non va un po' più avanti delle altre.
3. Quando un'auto va lontano scrivi `save()` e ricarica. `discard()` per ricominciare da capo.
4. I parametri da provare sono `N` in `main.js` e la quantità di mutazione (0.4).

La rete viene salvata con la chiave `curvedRoadBestBrain`, non con il `bestBrain` dei capitoli 8
e 9. Il `localStorage` è condiviso da tutte le pagine della stessa origine: con la stessa chiave
questo capitolo caricherebbe una rete `[5,6,4]` allenata su una strada dritta, che gira senza
errori ma va subito contro il muro.

Ogni volta che cambi la struttura della rete o il numero di raggi serve un `discard()`, altrimenti
dal `localStorage` torna una rete con dimensioni sbagliate.
