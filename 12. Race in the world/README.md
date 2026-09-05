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
| 4. Racing Game | Pagina della gara: tu contro 100 auto AI, con conto alla rovescia e classifica |
| 5. Procedural Sound | Suoni sintetizzati con il Web Audio: bip del via, motore, esplosione e arrivo |

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

## Parte 4. Racing Game

Il mondo diventa un gioco. Accanto al simulatore, che serve ad addestrare, nasce una seconda pagina
in cui si guida con le frecce contro 100 auto AI, dallo Start al Target, con un conto alla rovescia
e una classifica aggiornata a ogni frame.

### File

| File | Cosa cambia |
|------|-------------|
| `index.html`, `main.js` | Rinominati in `sim.html` e `sim.js`: il simulatore |
| `sim.js` | Legge i bordi da `world.corridor.borders` |
| `race.html` | Nuova pagina: canvas a tutto schermo, minimappa, classifica, conto alla rovescia |
| `race.js` | La gara |
| `world/js/world.js` | `generateCorridor(start, end, extendEnd)`; `corridor` diventa `{ borders, skeleton }` |
| `car.js` | L'auto si ricorda `color` e `type`; i sensori non si disegnano più |
| `style.css` | Stili di minimappa, classifica e conto alla rovescia |

### Due pagine

Da qui il progetto ha due ingressi, che condividono tutto tranne l'ultimo script:

- `sim.html` è la pagina di sempre, con la rete disegnata e i pulsanti 💾 e 🗑️. Serve a migliorare
  l'auto: si lascia girare, si salva la migliore, si ricarica.
- `race.html` è il gioco: niente visualizer né pulsanti, il canvas occupa tutta la finestra e
  minimappa e classifica ci stanno sopra, semitrasparenti, con `position:absolute`.

### Il corridoio diventa un oggetto

```js
this.corridor = { borders: segments, skeleton: segs };
```

`borders` sono i bordi di prima, quelli che le auto vedono con i sensori. `skeleton` sono i
segmenti del percorso, la linea centrale della strada: servono a misurare quanta strada ha fatto
ogni auto. `World.draw` e `sim.js` ora leggono `corridor.borders`.

Con `extendEnd` a `true` il corridoio prosegue oltre il Target di due larghezze di strada:

```js
if (extendEnd) {
   const lastSeg = segs[segs.length - 1];
   const lastSegDir = lastSeg.directionVector();
   segs.push(
      new Segment(
         lastSeg.p2,
         add(lastSeg.p2, scale(lastSegDir, this.roadWidth * 2))
      )
   );
}
```

Il segmento in più serve solo a costruire le buste. Subito dopo `segs.pop()` lo toglie, quindi
`skeleton` finisce esattamente sul Target. Il risultato è un traguardo da attraversare: senza il
prolungamento il corridoio si chiuderebbe con il fondo arrotondato proprio sull'arrivo, e chi
taglia il traguardo andrebbe a sbattere. La gara lo usa, il simulatore no.

### Le auto in gara

```js
const cars=generateCars(1, "KEYS").concat(generateCars(N, "AI"));
const myCar=cars[0];
```

`generateCars` ora prende anche il tipo. La tua auto è `"KEYS"` e blu; le AI hanno un colore a caso
e un nome, da `AI1` a `AI100`. Tutte caricano `carInfo` dal file `.car`, quindi hanno la stessa
rete e la stessa `maxSpeed` (8, quella dell'auto addestrata, non il 3 passato al costruttore). La
tua auto ha una rete anche lei, ma con `controlType` diverso da `"AI"` non la usa e guida con
`Controls`.

Se c'è un cervello salvato in `raceBestBrain` lo ricevono tutte, e dalla terza auto in poi viene
mutato: `myCar` e `AI1` guidano con il cervello salvato così com'è, le altre con una variante.

La camera segue sempre la tua auto: `world.bestCar = myCar`, e il viewport si centra su di lei.

### Il conto alla rovescia

`startCounter` incatena quattro `setTimeout` da un secondo: 3, 2, 1, GO!, e poi il testo sparisce,
`started` diventa `true` e `frameCount` torna a zero. Prima di quel momento `animate` disegna ma non
chiama `update`: le auto sono ferme sulla linea di partenza.

`counter` e `statistics` non sono mai dichiarati in `race.js`: il browser crea una variabile
globale per ogni elemento con un `id`, e l'originale ci si appoggia.

### Chi è in testa

```js
const carSeg = getNearestSegment(car, world.corridor.skeleton);
for (let i = 0; i < world.corridor.skeleton.length; i++) {
   const s = world.corridor.skeleton[i];
   if (s.equals(carSeg)) {
      const proj = s.projectPoint(car);
      const firstPartOfSegment = new Segment(s.p1, proj.point);
      car.progress += firstPartOfSegment.length();
      break;
   } else {
      car.progress += s.length();
   }
}
```

`updateCarProgress` misura la strada percorsa, non la distanza dal Target in linea d'aria:

1. trova il segmento dello scheletro più vicino all'auto;
2. somma le lunghezze di tutti i segmenti che lo precedono;
3. aggiunge il pezzo del segmento corrente fino alla proiezione dell'auto;
4. divide per la lunghezza totale, ottenendo un numero tra 0 e 1.

A 1 l'auto è arrivata: `finishTime` prende il numero del frame, e da lì il progresso non si ricalcola
più. Poi `cars.sort` ordina per progresso, e ogni riga della classifica mostra posizione, nome, 💀
se l'auto è distrutta e il tempo all'arrivo, in secondi. La tua riga ha lo sfondo bianco, le altre
nero.

L'ordinamento cambia l'ordine dell'array `cars` a ogni frame, ma `myCar` resta un riferimento alla
tua auto, ovunque finisca.

### L'auto

`Car` salva `color` e `type`, che prima usava solo nel costruttore: la classifica ne ha bisogno
per colorare le righe e distinguere la tua.

Il disegno dei sensori è commentato, quindi i raggi non si vedono più né nella gara né nel
simulatore. Il parametro `drawSensor` resta, ma non ha più effetto.

### Differenze dall'originale

- Anche `race.js` usa la chiave `raceBestBrain` invece di `bestBrain`, come `sim.js` dalla Parte 1:
  il simulatore salva il cervello, la gara lo legge.
- `race.html` ha gli stessi `<meta charset>`, `lang` e ordine degli script di `sim.html`, senza le
  righe commentate dei mondi alternativi.

### Limiti

- Il tempo è `finishTime / 60`: presuppone 60 frame al secondo. Su uno schermo a 120 Hz la gara va
  al doppio della velocità, e i tempi mostrati sono il doppio di quelli reali.
- Senza un Target `world.corridor` non esiste e `updateCarProgress` va in errore al primo frame: la
  gara ha bisogno di un mondo con un Target.
- Senza un cervello salvato le AI sono copie identiche: fanno la stessa strada, arrivano insieme e
  hanno tutte lo stesso tempo.
- Le auto non si vedono e non si urtano tra loro: ognuna aggiorna solo con i bordi
  (`update(roadBorders, [])`), quindi si attraversano.
- `race.js` ha ancora `save()` e `discard()` ma nessun pulsante, e `save()` salverebbe il cervello
  di `myCar`, che non guida: si possono chiamare solo dalla console.
- Con il progresso basato sul segmento più vicino, un'auto che torna indietro perde posizioni, e
  vicino a una curva stretta può essere attribuita per un istante al segmento sbagliato.

### Come provarlo

Apri `race.html` dal server locale. Dopo il 3, 2, 1, GO! guida con le frecce e prova a battere le
AI fino al Target: la classifica a destra si aggiorna mentre corri. `sim.html` è il simulatore di
prima, senza i raggi dei sensori.

## Parte 5. Procedural Sound

La gara prende voce. Non ci sono file audio: ogni suono è costruito al momento con la Web Audio API,
partendo da oscillatori e regolando il volume nel tempo.

### File

| File | Cosa cambia |
|------|-------------|
| `sound.js` | Nuovo: `beep`, `taDaa`, `explode` e la classe `Engine` |
| `race.html` | Carica `sound.js` |
| `race.js` | Bip a ogni numero del conto alla rovescia, motore dopo il via, `taDaa()` all'arrivo |
| `car.js` | Un'auto distrutta si ferma; la tua esplode; il motore segue la velocità |

### Un suono fatto a mano

Ogni funzione di `sound.js` costruisce un piccolo grafo audio:

```js
const osc = audioContext.createOscillator();
const envelope = audioContext.createGain();

osc.frequency.setValueAtTime(frequency, 0);
osc.type = waveType;
osc.connect(envelope);
osc.start();
osc.stop(0.4);

envelope.gain.value = 0;
envelope.gain.linearRampToValueAtTime(1, 0.1);
envelope.gain.linearRampToValueAtTime(0, 0.4);
envelope.connect(audioContext.destination);
```

1. l'oscillatore produce un'onda alla frequenza data (sinusoide di default);
2. passa da un `GainNode`, che ne regola il volume;
3. il gain fa da inviluppo: sale da 0 a 1 in un decimo di secondo e torna a 0 a 0.4 secondi;
4. l'uscita va a `audioContext.destination`, cioè alle casse.

Senza l'inviluppo il suono partirebbe e si fermerebbe di colpo, con un "clic" a ogni estremo.

I tempi passati a `setValueAtTime`, `linearRampToValueAtTime` e `stop` non sono durate: sono
istanti sull'orologio del contesto audio, `audioContext.currentTime`, che parte da 0 quando il
contesto nasce. Per questo ogni funzione crea un `AudioContext` nuovo: con un orologio appena
partito, "0.4" vuol dire davvero "fra 0.4 secondi".

### I suoni della gara

- `beep(400)` su 3, 2 e 1, `beep(700)` su GO!: lo stesso bip, più acuto per il via.
- `taDaa()` quando la tua auto arriva al Target: due bip a dente di sega (`"sawtooth"`), 400 e
  600 Hz, a 200 ms di distanza. L'onda a dente di sega è ricca di armoniche e suona più
  "elettronica" della sinusoide.
- `explode()` quando la tua auto si schianta: dieci oscillatori insieme, ognuno a una frequenza a
  caso tra 100 e 300 Hz, che sfumano in un secondo. Frequenze vicine ma diverse battono tra loro e
  danno un rombo sporco, più simile a un rumore che a una nota.

### Il motore

```js
const lfo = audioContext.createOscillator();
lfo.frequency.setValueAtTime(30, 0);
const mod = audioContext.createGain();
mod.gain.value = 60;
lfo.connect(mod);
mod.connect(osc.frequency);
```

`Engine` è un oscillatore che non si ferma mai. Il suo tono però non è fermo: un secondo
oscillatore, l'LFO (*low frequency oscillator*), a 30 Hz, passa da un gain di 60 e viene collegato
non alle casse ma al parametro `frequency` del primo. Un `AudioParam` collegato a un nodo somma il
segnale al proprio valore: la frequenza del motore oscilla di ±60 Hz intorno al valore base, 30
volte al secondo. È quel tremolio a farlo sembrare un motore a scoppio invece di un fischio.

`setVolume` e `setPitch` ricevono la velocità in percentuale:

```js
if (this.engine) {
    const percent = Math.abs(this.speed / this.maxSpeed);
    this.engine.setVolume(percent);
    this.engine.setPitch(percent);
}
```

Da fermi il motore è muto e gira a 100 Hz; alla velocità massima ha volume 1 e frequenza base
300 Hz. `Math.abs` fa girare il motore anche in retromarcia, quando `speed` è negativa.

Il motore nasce in `startCounter`, quando il "GO!" sparisce, e solo per `myCar`: le AI non hanno
`engine`, e il controllo `if (this.engine)` le salta.

### L'auto distrutta

```js
if(this.damaged){
   this.speed=0;
   if(this.type == "KEYS"){
      explode();
   }
}
```

Un'auto distrutta smetteva già di muoversi, perché tutto il movimento è dentro
`if(!this.damaged)`, ma conservava l'ultima velocità. Ora la velocità va a zero, e con lei il
volume del motore: dopo lo schianto si sente solo l'esplosione.

Il blocco è dentro lo stesso `if(!this.damaged)`, quindi `explode()` parte una sola volta, nel frame
dello schianto. Il controllo sul tipo la limita alla tua auto: cento esplosioni delle AI coprirebbero
tutto il resto. Per lo stesso motivo `sim.html` non carica `sound.js`: lì le auto sono tutte AI e
nessuna chiama `explode()`.

### Differenze dall'originale

Nessuna: il codice di questa parte è quello dell'originale.

### Limiti

- Ogni suono crea un `AudioContext` e nessuno viene mai chiuso. In una gara sono una decina, quindi
  non pesa, ma ogni contesto tiene occupate risorse audio finché la pagina resta aperta. Il modo
  consueto è un solo contesto per tutta la pagina, con i tempi calcolati da `currentTime`.
- I browser bloccano l'audio partito prima di un'interazione dell'utente: un `AudioContext` creato
  così nasce `"suspended"` e nessuno chiama `resume()`. Se la pagina non ha ancora ricevuto un clic
  o un tasto, i bip del conto alla rovescia e il motore, che nasce prima che tu tocchi le frecce,
  possono restare muti per tutta la gara. Dipende dal browser e da quanto spesso visiti la pagina:
  nella mia prova i contesti erano già attivi.
- I suoni ci sono solo nella gara.

### Come provarlo

Apri `race.html` dal server locale, con l'audio acceso, e clicca sulla pagina prima che finisca il
conto alla rovescia. Senti i bip di 3, 2, 1 e GO!, poi il motore che sale di tono mentre acceleri.
Sbatti contro un bordo per sentire l'esplosione, oppure arriva al Target per il ta-daa.
