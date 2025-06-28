# 3. Artificial sensors

La macchina inizia a "vedere". Le aggiungo un sensore fatto di 5 raggi che partono dal suo centro
e misurano a che distanza incontrano i bordi della strada. È una forma semplificata di raycasting,
la stessa idea che sta dietro a un lidar.

## Cosa cambia rispetto al capitolo 2

| File | Novità |
|------|--------|
| `sensor.js` | Nuovo, classe `Sensor` |
| `utils.js` | Aggiunta `getIntersection` |
| `car.js` | L'auto crea un `Sensor`, lo aggiorna e lo disegna |
| `main.js` | `car.update(road.borders)`: l'auto adesso riceve i bordi |
| `index.html` | Carica `sensor.js` |

## Sensor

```js
this.rayCount=5;
this.rayLength=150;
this.raySpread=Math.PI/2;
```

Cinque raggi lunghi 150 px distribuiti su un ventaglio di 90 gradi (PI/2), quindi da +45 a -45
gradi rispetto alla direzione dell'auto. Il sensore riceve l'auto nel costruttore e ne legge
posizione e angolo a ogni aggiornamento.

### Lancio dei raggi

```js
const rayAngle=lerp(
    this.raySpread/2,
    -this.raySpread/2,
    this.rayCount==1?0.5:i/(this.rayCount-1)
)+this.car.angle;
```

- `lerp` distribuisce gli angoli in modo uniforme da +45 a -45 gradi. Partendo da +45 il primo
  raggio è quello più a sinistra (ricordo che un angolo positivo va verso sinistra).
- `this.rayCount==1?0.5:...` evita una divisione per zero: con un solo raggio `i/(rayCount-1)`
  diventerebbe `0/0`, cioè `NaN`. In quel caso il raggio va dritto al centro.
- Si somma `this.car.angle`, così il ventaglio ruota insieme all'auto.

Il punto finale di ogni raggio si calcola con la stessa formula `x - sin`, `y - cos` usata per
muovere l'auto nel capitolo 1. Tutti i raggi partono dal **centro** dell'auto e non dal muso.

### Letture

Per ogni raggio `#getReading` calcola l'intersezione con ogni bordo, raccoglie tutti i punti di
contatto in `touches` e tiene solo il più vicino:

```js
const offsets=touches.map(e=>e.offset);
const minOffset=Math.min(...offsets);
return touches.find(e=>e.offset==minOffset);
```

Se un raggio non tocca nulla la lettura è `null`. `this.readings` ha quindi sempre 5 elementi,
ognuno `null` oppure `{x, y, offset}`. Tenere il più vicino è fondamentale: un raggio può
attraversare più ostacoli, ma come per la vista conta solo il primo.

### Disegno

Ogni raggio viene disegnato in due pezzi:
- **giallo** dal centro dell'auto fino al punto di contatto (o fino alla fine se non tocca nulla);
- **nero** dal punto di contatto fino alla fine teorica del raggio.

Così si vede subito dove il sensore "sbatte". Il nero dal punto finale al punto finale è un
segmento di lunghezza zero quando non c'è contatto, quindi in quel caso non si vede.

## getIntersection: il cuore matematico

```js
function getIntersection(A,B,C,D){
    const tTop=(D.x-C.x)*(A.y-C.y)-(D.y-C.y)*(A.x-C.x);
    const uTop=(C.y-A.y)*(A.x-B.x)-(C.x-A.x)*(A.y-B.y);
    const bottom=(D.y-C.y)*(B.x-A.x)-(D.x-C.x)*(B.y-A.y);
    ...
}
```

Calcola dove si incrociano il segmento AB (il raggio) e il segmento CD (un bordo). L'idea è
scrivere i due segmenti in forma parametrica:

- un punto su AB è `A + t·(B-A)` con t tra 0 e 1;
- un punto su CD è `C + u·(D-C)` con u tra 0 e 1.

Imponendo che i due punti coincidano si ottiene un sistema di due equazioni (una per x e una per y)
con due incognite, t e u. Risolvendolo si ottengono le tre espressioni sopra: `tTop/bottom` è t e
`uTop/bottom` è u.

- Se `bottom` è 0 i segmenti sono paralleli e non si incontrano mai (o sono sovrapposti): nessuna
  intersezione.
- Se t e u sono entrambi tra 0 e 1, l'incrocio cade dentro entrambi i segmenti e non sul
  prolungamento di una delle due rette.

Il risultato contiene il punto (calcolato con `lerp(A,B,t)`) e `offset: t`, cioè **a che frazione
del raggio** avviene il contatto: 0 vuol dire attaccato all'auto, 1 vuol dire alla fine del
raggio. Questo `offset` diventa importantissimo nel capitolo 6, perché è proprio quello che la rete
neurale riceverà come input.

## Collegamento con Car

```js
update(roadBorders){
    this.#move();
    this.sensor.update(roadBorders);
}
```

Il sensore viene aggiornato dopo il movimento, così legge la posizione nuova. Viene disegnato dopo
l'auto e dopo il `restore()`, quindi in coordinate di mondo e non ruotato insieme all'auto: ha senso,
perché i raggi sono già calcolati in coordinate assolute.

## Come provarlo

Apri `index.html`, avvicinati ai bordi e guarda i raggi diventare gialli solo fino al bordo, con la
parte oltre in nero. La macchina può ancora attraversare i bordi.
