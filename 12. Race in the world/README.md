# 12. Race in the world

Terza fase del progetto. Si riparte dal mondo della cartella 11, ma l'auto non deve più imparare da
zero: arriva già addestrata, e il mondo diventa il circuito di un gioco. Le parti successive
aggiungono la ricerca del percorso, la gara contro l'auto, i suoni, una camera in prima persona e
i controlli dal telefono e dalla webcam.

## Una cartella, tante parti

Come la cartella 11, questa contiene tutte le parti della fase, una dopo l'altra, nello stesso
codice. Ogni parte è una serie di commit; per vedere lo stato a metà percorso basta fare checkout
del commit che chiude quella parte.

| Parte | Cosa aggiunge |
|-------|---------------|
| 1. Starting Codebase | Mondo e auto addestrata caricati da file, velocità tra gli input della rete |
| 2. Dijkstra Part 1 | Percorso più breve tra due punti del grafo, scelti nell'editor con s ed e |
| 3. Dijkstra Part 2 | Corridoio dalla partenza al Target: le auto vedono solo i bordi del percorso |

Restano i due stili della cartella 11: il codice del mondo (`world/`) è indentato a 3 spazi, con
spazi intorno agli operatori; quello dell'auto a 4 spazi, compatto.

## Parte 1. Starting Codebase

Il punto di partenza è la cartella 11 con due cambi di abitudine. Il mondo non passa più
dall'editor alla simulazione tramite `localStorage`: è un file nel progetto, caricato con un tag
`<script>`. E le auto non partono più da una rete casuale, ma da un'auto addestrata salvata su
file.

### File

| File | Cosa cambia |
|------|-------------|
| `world/saves/path_finding.world` | Nuovo: il mondo di partenza, una piccola rete con Start e Target |
| `saves/right_hand_rule.car` | Nuovo: l'auto addestrata, con rete, sensori e parametri di guida |
| `world/index.html` | Carica il mondo dal file; 💾 scarica uno script `.world`; via il 📁 |
| `index.html` | Carica i due file prima degli script dell'auto |
| `main.js` | Mondo dallo script, `car.load(carInfo)` per ogni auto, chiave `"raceBestBrain"` |
| `car.js` | Metodo `load(info)`; la velocità diventa un input della rete |
| `sensor.js` | Campo `rayOffset`, che ruota tutto il ventaglio dei raggi |
| `world/js/math/graph.js` | `Graph.load` conserva i sensi unici |

### Il mondo come script

Il file `.world` non è JSON, è JavaScript:

```js
const world = World.load({"graph":{"points":[...]}, ...});
```

Incluso con `<script src="world/saves/path_finding.world">`, dichiara la variabile globale `world`
che l'editor e `main.js` usano già. Niente `fetch`, niente `localStorage`: le due pagine leggono
lo stesso file e non devono più condividere niente.

`World.load` gira mentre il file viene caricato, quindi tutte le classi del mondo devono essere già
definite: il file va incluso dopo gli script di `world/js/` e prima di `main.js` o dello script
inline dell'editor.

Il 💾 dell'editor ora scrive lo stesso formato:

```js
encodeURIComponent(
   "const world = World.load(" + JSON.stringify(world) + ");"
)
```

Il file scaricato si chiama sempre `name.world`. Per usarlo va rinominato e messo al posto di
`world/saves/path_finding.world`.

Il file pesa circa 470 KB anche se la rete ha solo 13 punti: dentro ci sono anche buste, bordi,
edifici e alberi già generati, e gli alberi da soli sono tre quarti del totale. `World.load` li
legge così come sono, senza ricalcolarli.

### Sensi unici

`Graph.load` passa `i.oneWay` al costruttore di `Segment`. Senza, il terzo parametro prendeva il
default `false` e le strade a senso unico importate da OpenStreetMap tornavano a doppio senso dopo
ogni caricamento (era un limite della Parte 10 della cartella 11).

### L'auto addestrata

`right_hand_rule.car` è un'auto intera passata a `JSON.stringify`, preceduta da `let carInfo = `.
Contiene più campi di quelli che la nostra `Car` conosce (sensori per stop, semafori e precedenze,
per esempio): vengono da una versione più avanzata del codice. `Car.load` ne prende solo alcuni:

```js
load(info){
    this.brain=info.brain;
    this.maxSpeed=info.maxSpeed;
    this.friction=info.friction;
    this.acceleration=info.acceleration;
    this.sensor.rayCount=info.sensor.rayCount;
    this.sensor.raySpread=info.sensor.raySpread;
    this.sensor.rayLength=info.sensor.rayLength;
    this.sensor.rayOffset=info.sensor.rayOffset;
}
```

| Parametro | Prima | Auto addestrata |
|-----------|-------|-----------------|
| Raggi | 5 | 2 |
| Lunghezza dei raggi | 150 | 350 |
| Apertura del ventaglio | `Math.PI/2` | 0.8 |
| `rayOffset` | — | −0.4 |
| Velocità massima | 3 | 8 |
| Accelerazione | 0.2 | 0.08 |
| Attrito | 0.05 | 0.04 |
| Rete | `[5,6,4]` | `[3,4,4]` |

`load` sostituisce i parametri dopo il costruttore, che ha già creato una rete `[5,6,4]` per i 5
raggi di default: quella rete viene buttata e sostituita da quella del file.

### Due raggi e la mano destra

`rayOffset` si somma all'angolo di ogni raggio:

```js
)+this.car.angle+this.rayOffset;
```

Con −0.4 radianti il ventaglio, già stretto, ruota verso destra. L'auto vede quasi solo il bordo
destro della strada e lo segue: è la regola della mano destra dei labirinti, da cui il nome del
file. In un vicolo cieco l'auto non si schianta, gira intorno alla fine della strada e torna
indietro.

### La velocità come input

```js
const offsets=this.sensor.readings.map(
    s=>s==null?0:1-s.offset
).concat([this.speed/this.maxSpeed]);
```

Oltre ai raggi, la rete riceve la velocità divisa per quella massima, un valore tra 0 e 1 come le
letture dei sensori (in retromarcia diventa negativo). Due raggi più la velocità fanno i 3 input
della rete `[3,4,4]`.

### Il cervello salvato

Le 100 auto caricano tutte lo stesso `carInfo`, e `this.brain=info.brain` assegna a tutte **lo
stesso oggetto**. Senza un cervello salvato non c'è mutazione: le auto sono identiche e si muovono
sovrapposte, come se fossero una sola.

💾 e 🗑️ funzionano come nella cartella 11, ma con la chiave `"raceBestBrain"`. Se la chiave esiste,
ogni auto riceve una copia nuova da `JSON.parse` e tutte tranne la prima vengono mutate.

### Differenze dall'originale

- Il cervello si salva in `"raceBestBrain"` invece che in `"bestBrain"`, senza ripiegare su
  un'altra chiave: le reti `[5,6,4]` dei capitoli precedenti hanno 5 input e qui non funzionano.
- `main.js` elimina il vecchio caricamento da `localStorage` invece di commentarlo.
- `save()` dell'editor non scrive più `"world"` in `localStorage`, perché nessuno la legge.
- Non sono stati portati `big.world` e `big_with_target.world`, due mondi da 5-6 MB che
  l'originale lascia commentati.
- Restano le correzioni della cartella 11 che l'originale non ha: `GraphEditor` disegna con
  `this.ctx` e il `Viewport` ascolta l'evento `wheel` invece del vecchio `mousewheel`.
- Le due pagine mantengono `<meta charset="utf-8">`, `index.html` anche `<html lang="en">`, e gli
  script del mondo restano nell'ordine della cartella 11.

### Limiti

- Cambiare mondo richiede di sostituire un file nel progetto: le modifiche fatte nell'editor e non
  esportate si perdono al primo ricaricamento.
- L'editor del grafo permette di modificare la rete, ma `oneWay` non si imposta a mano: i sensi
  unici arrivano solo da OpenStreetMap.
- Finché non si salva un cervello, le 100 auto sono copie identiche e l'evoluzione è ferma.

### Come provarlo

Servi la cartella con un server locale, ad esempio `python3 -m http.server`, e apri `index.html`:
l'auto parte dallo Start di `path_finding.world`, segue la strada tenendo la destra e nei vicoli
ciechi torna indietro. La rete a destra ha 3 ingressi, i due raggi e la velocità.

`world/index.html` apre lo stesso mondo. Dopo una modifica, 💾 scarica `name.world`: rinominalo in
`path_finding.world`, mettilo in `world/saves/` e ricarica la simulazione.

## Parte 2. Dijkstra Part 1

Il grafo delle strade, finora usato solo per generare buste e bordi, diventa una mappa in cui
cercare il percorso più breve tra due punti. Per ora la ricerca si vede solo nell'editor; la
simulazione non cambia.

### File

| File | Cosa cambia |
|------|-------------|
| `world/js/math/graph.js` | `getSegmentsLeavingFromPoint` e `getShortestPath` (Dijkstra) |
| `world/js/editors/graphEditor.js` | Tasti s ed e per scegliere partenza e arrivo, disegno del percorso |

### I segmenti percorribili

```js
getSegmentsLeavingFromPoint(point) {
   const segs = [];
   for (const seg of this.segments) {
      if (seg.oneWay) {
         if (seg.p1.equals(point)) {
            segs.push(seg);
         }
      } else {
         if (seg.includes(point)) {
            segs.push(seg);
         }
      }
   }
   return segs;
}
```

È la versione "con i sensi unici" di `getSegmentsWithPoint`: un segmento a doppio senso si può
prendere da entrambi gli estremi, uno a senso unico solo da `p1`, nella direzione in cui è stato
disegnato. È qui che serve la correzione di `Graph.load` della Parte 1: senza `oneWay` tutte le
strade sarebbero percorribili nei due sensi.

### Dijkstra

`getShortestPath(start, end)` è l'algoritmo di Dijkstra nella sua forma più diretta:

1. ogni punto riceve `dist = Number.MAX_SAFE_INTEGER` e `visited = false`; la partenza ha
   `dist = 0`;
2. dal punto corrente si guardano i segmenti percorribili: se passando di qui l'altro estremo
   diventa più vicino, si aggiornano la sua `dist` e il suo `prev`;
3. il punto corrente diventa visitato, e il prossimo è il non visitato con la `dist` più piccola;
4. ci si ferma quando l'arrivo è visitato, e si ricostruisce il percorso risalendo i `prev`
   dall'arrivo con `unshift`.

```js
const unvisited = this.points.filter((p) => p.visited == false);
const dists = unvisited.map((p) => p.dist);
currentPoint = unvisited.find((p) => p.dist == Math.min(...dists));
```

Non c'è una coda di priorità: a ogni passo si scorrono tutti i punti non visitati, quindi il costo
cresce col quadrato del numero di punti. Con i 13 punti di `path_finding.world` non si nota.

`dist`, `visited` e `prev` sono scritti direttamente sugli oggetti `Point` e cancellati con
`delete` prima di restituire il percorso. Cancellarli è necessario: `graph.hash()` e il 💾 sono
entrambi un `JSON.stringify` del grafo, e dei campi rimasti sui punti farebbero credere all'editor
che il grafo sia cambiato (con una `world.generate()` inutile) e finirebbero nel file salvato.

### Partenza e arrivo nell'editor

In modalità 🌐, con il mouse sopra un punto, **s** lo segna come partenza e **e** come arrivo.
Appena ci sono entrambi, `display()` calcola il percorso a ogni frame e lo disegna sopra il grafo:
punti blu grandi uniti da una linea spessa. Spostare un punto col mouse ricalcola subito il
percorso.

Il listener è su `window`, non sul canvas, perché il canvas non riceve gli eventi della tastiera.
Viene aggiunto e tolto insieme agli altri listener dell'editor, quindi in un'altra modalità i tasti
non fanno niente.

### Differenze dall'originale

- L'originale disegna i collegamenti del percorso con `point.prev`, che però `getShortestPath` ha
  già cancellato: si vedevano solo i punti blu. Qui la linea unisce i punti consecutivi del
  percorso.
- L'originale aggiunge il listener `keydown` a ogni `enable()` senza mai toglierlo, e ogni cambio di
  modalità ne accumulava uno. Qui è un `boundKeyDown` rimosso in `#removeEventListeners`.
- Eliminare il punto di partenza o di arrivo, o svuotare il grafo con 🗑️, azzera partenza e
  arrivo. Nell'originale `getShortestPath` cercava un punto non più nel grafo, lanciava un errore
  dentro il ciclo di disegno e l'editor si bloccava.
- L'originale passa a `big_with_target.world`, allarga il canvas a 1000 pixel e commenta
  `world.generate()` per non rigenerare un mondo enorme; con `path_finding.world` non serve, e
  restano canvas da 600 e rigenerazione.

### Limiti

- Se l'arrivo non è raggiungibile (per esempio per colpa di un senso unico), l'algoritmo visita
  anche i punti irraggiungibili e restituisce il solo arrivo: viene disegnato un punto blu e nessuna
  linea.
- Partenza e arrivo devono essere punti del grafo, non posizioni qualsiasi sulla strada.
- Il percorso viene ricalcolato a ogni frame anche se il grafo non cambia.

### Come provarlo

Apri `world/index.html` dal server locale, in modalità 🌐. Passa col mouse su un punto e premi s,
poi su un altro e premi e: il percorso più breve compare in blu. Prova a trascinare un punto
intermedio per allungare una strada e guarda il percorso cambiare.

## Parte 3. Dijkstra Part 2

Il percorso diventa una strada: dal percorso più breve si costruisce un **corridoio**, cioè i bordi
di una strada che segue solo quel percorso. Nella simulazione, se il mondo ha un Target, le auto
guidano dentro il corridoio invece che nella rete intera, e la regola della mano destra le porta
dritte all'arrivo.

### File

| File | Cosa cambia |
|------|-------------|
| `world/js/world.js` | `generateCorridor(start, end)`; il corridoio disegnato in rosso |
| `world/js/editors/graphEditor.js` | s ed e prendono la posizione del mouse e generano il corridoio |
| `main.js` | Bordi delle auto = corridoio fino al Target; 500 auto |

### Partire a metà strada

Dijkstra sa andare solo da un punto del grafo a un altro, ma un'auto o un Target stanno quasi
sempre a metà di una strada. `generateCorridor` aggiunge al grafo due punti temporanei:

```js
const startSeg = getNearestSegment(start, this.graph.segments);
const endSeg = getNearestSegment(end, this.graph.segments);

const { point: projStart } = startSeg.projectPoint(start);
const { point: projEnd } = endSeg.projectPoint(end);
```

1. trova il segmento più vicino alla partenza e quello più vicino all'arrivo;
2. proietta le due posizioni sui rispettivi segmenti, ottenendo `projStart` e `projEnd`;
3. aggiunge le proiezioni a `graph.points`, e quattro segmenti temporanei che le collegano agli
   estremi del loro segmento (più uno diretto tra le due, se stanno sullo stesso segmento);
4. lancia `getShortestPath(projStart, projEnd)`;
5. toglie le proiezioni con `removePoint`, che elimina anche i segmenti temporanei.

Il grafo torna com'era, con lo stesso `hash()`: l'editor non rigenera il mondo.

Il segmento originale resta nel grafo durante la ricerca, ma non dà fastidio: collega i suoi due
estremi, e il percorso passa comunque dalla proiezione perché è da lì che parte.

### Dal percorso alla strada

```js
const tmpEnvelopes = segs.map(
   (s) => new Envelope(s, this.roadWidth, this.roadRoundness)
);

const segments = Polygon.union(tmpEnvelopes.map((e) => e.poly));
```

È lo stesso procedimento che in `generate()` produce `roadBorders`: una busta per ogni segmento del
percorso, poi l'unione dei poligoni per tenere solo i lati esterni. Il risultato, `world.corridor`,
è una lista di segmenti chiusa: arrotondata alle due estremità e, dove il percorso tira dritto
davanti a un incrocio, sbarrata sull'imbocco della traversa.

### Nell'editor

In modalità 🌐 **s** segna la posizione del mouse come partenza ed **e** come arrivo, ovunque, anche
lontano dai punti del grafo. Appena ci sono entrambi, il tasto chiama `world.generateCorridor`, e
`World.draw` disegna il corridoio con linee rosse. Il calcolo avviene una volta, alla pressione del
tasto, e non a ogni frame come il percorso della Parte 2.

`GraphEditor` usa direttamente la variabile globale `world`, come nell'originale: l'editor del grafo
non conosce il mondo, ma lo trova nello scope globale della pagina.

### Nella simulazione

```js
let roadBorders = [];
const target = world.markings.find((m) => m instanceof Target);
if (target) {
   world.generateCorridor(bestCar, target.center);
   roadBorders = world.corridor.map((s) => [s.p1, s.p2]);
} else {
   roadBorders = world.roadBorders.map((s) => [s.p1, s.p2]);
}
```

La partenza è `bestCar`, cioè la prima auto: tutte partono dallo Start, quindi è la stessa cosa.
Basta che l'oggetto abbia `x` e `y`, perché `projectPoint` e `distanceToPoint` usano solo quelli.

Le auto vedono solo i bordi del corridoio: le traverse sono chiuse, quindi l'auto che segue il bordo
destro non può più infilarsi in una strada sbagliata. Arrivata al Target trova il fondo arrotondato
del corridoio, fa inversione e torna indietro. Senza Target tutto resta come prima.

`N` passa da 100 a 500. Finché non si salva un cervello le auto restano copie identiche (vedi la
Parte 1), ma con un cervello salvato ci sono cinque volte più mutazioni per generazione.

### Differenze dall'originale

- Restano le scelte della Parte 2 sul listener `keydown`, aggiunto e tolto con gli altri. Non
  servono più invece gli azzeramenti di partenza e arrivo in `#removePoint` e `dispose`: partenza e
  arrivo non sono più punti del grafo, e sono stati tolti.

### Limiti

- Il corridoio si calcola una volta sola, all'avvio, dallo Start: non segue l'auto se cambia strada,
  e con più Target viene usato solo il primo.
- I segmenti temporanei sono sempre a doppio senso: se la partenza o l'arrivo cadono su un senso
  unico, il primo e l'ultimo tratto lo ignorano.
- Se l'arrivo non è raggiungibile il percorso ha un solo punto, il corridoio è vuoto e le auto non
  hanno bordi.
- Nell'editor il corridoio non si aggiorna quando si modifica il grafo, e resta disegnato anche dopo
  🗑️. Premere s o e con il grafo vuoto dà un errore in console.
- `World` non ha un `toJSON`: il 💾 dell'editor salva anche `corridor` nel file `.world`.
  `World.load` lo ignora.

### Come provarlo

Apri `index.html`: le linee rosse sono il corridoio, e le auto lo percorrono dallo Start fino al
Target senza entrare nelle traverse. Nell'editor, in modalità 🌐, premi s col mouse su una strada ed
e su un'altra: il corridoio rosso le collega lungo il percorso più breve.
