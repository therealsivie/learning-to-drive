# 2. Road definition

In questo capitolo la macchina ha finalmente una strada: tre corsie, bordi laterali e una camera
che la segue mentre sale. La fisica dell'auto e i controlli sono identici al capitolo 1.

## Cosa cambia rispetto al capitolo 1

| File | Novità |
|------|--------|
| `utils.js` | Nuovo, contiene solo `lerp` |
| `road.js` | Nuovo, classe `Road` |
| `main.js` | Crea la strada, mette l'auto nella corsia centrale e trasla il canvas per seguirla |
| `index.html` | Carica `utils.js` e `road.js` prima degli altri script |

`car.js`, `controls.js` e `style.css` non cambiano.

## lerp

```js
function lerp(A,B,t){
    return A+(B-A)*t;
}
```

Interpolazione lineare: con `t=0` restituisce A, con `t=1` restituisce B, con valori intermedi un
punto in mezzo. Sembra banale, ma da qui in avanti viene usata ovunque: per le corsie, per
distribuire i raggi dei sensori, per i punti di intersezione, per posizionare i nodi della rete nel
visualizer e perfino per mutare i pesi della rete nel capitolo 8. È la funzione più riutilizzata
del progetto.

## Road

```js
constructor(x,width,laneCount=3)
```

In `main.js` viene creata così:

```js
const road=new Road(canvas.width/2,canvas.width*0.9);
```

Con il canvas largo 200 px: centro a x=100 e larghezza 180, quindi bordo sinistro a 10 e destro a
190. Il 10% che avanza lascia un po' di margine ai lati.

### La strada "infinita"

```js
const infinity=1000000;
this.top=-infinity;
this.bottom=infinity;
```

La strada va da y=-1000000 a y=1000000. Non è davvero infinita, ma per una macchina che va a meno
di 3 px per frame lo è in pratica: servirebbero ore per arrivare in fondo.

Ho notato che non viene usato `Infinity` di JavaScript, ed è voluto. Nel capitolo 3 i bordi
diventano segmenti su cui calcolare intersezioni, e i calcoli con `Infinity` producono facilmente
`NaN` (per esempio `Infinity - Infinity` o `0 * Infinity`). Un numero grande ma finito evita il
problema.

### I bordi come segmenti

```js
this.borders=[
    [topLeft,bottomLeft],
    [topRight,bottomRight]
];
```

I bordi sono salvati come array di segmenti, ogni segmento è una coppia di punti `{x,y}`. In questo
capitolo servono solo per disegnarli, ma questa struttura è pensata già per il futuro: sensori e
collisioni lavoreranno proprio su questi segmenti. Questa scelta permetterebbe anche di avere bordi
non dritti, ed è quello che succede nel capitolo 10.

### Centro delle corsie

```js
getLaneCenter(laneIndex){
    const laneWidth=this.width/this.laneCount;
    return this.left+laneWidth/2+
        Math.min(laneIndex,this.laneCount-1)*laneWidth;
}
```

Con 3 corsie larghe 60 px i centri sono a x=40, 100 e 160. Il `Math.min` fa in modo che chiedendo
una corsia che non esiste (per esempio la 5) si ottenga l'ultima invece di una posizione fuori
strada. Gli indici negativi però non sono gestiti.

### Disegno

- Le linee tra le corsie sono tratteggiate con `setLineDash([20,20])` (20 px pieni, 20 vuoti) e
  posizionate con `lerp(left,right,i/laneCount)`.
- Prima di disegnare i bordi si fa `setLineDash([])` per tornare alla linea continua. Senza questo
  reset anche i bordi verrebbero tratteggiati, perché lo stile resta nel contesto.
- Spessore 5 px, colore bianco.

## La camera

```js
ctx.save();
ctx.translate(0,-car.y+canvas.height*0.7);
road.draw(ctx);
car.draw(ctx);
ctx.restore();
```

Non è la macchina a stare ferma, è il mondo a spostarsi. A ogni frame si trasla il canvas in
verticale in modo che l'auto finisca sempre al 70% dell'altezza dello schermo, cioè un po' sotto il
centro. Così si vede più strada davanti che dietro, che è quello che serve guidando.

La traslazione è solo verticale: se la macchina va a destra o a sinistra si vede spostarsi
lateralmente, e la strada resta ferma in orizzontale.

La macchina ora parte da `road.getLaneCenter(1)`, cioè la corsia centrale, e non più da x=100
scritto a mano (anche se il risultato è lo stesso).

## Come provarlo

Apri `index.html` e guida con le frecce. Si può ancora attraversare i bordi senza conseguenze:
le collisioni arrivano nel capitolo 4.
