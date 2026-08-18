# 11. Car in the world

Seconda fase del progetto. Finora l'auto girava su una strada dritta disegnata a mano; qui si
costruisce un **mondo** intero, con incroci, edifici, alberi e segnaletica, disegnato da un editor
nel browser. Alla fine l'auto del capitolo 9 viene portata dentro questo mondo e impara a guidarci.

Per molti capitoli il codice non ha niente a che vedere con l'auto: si parte da zero con grafi,
geometria e un editor. Le due basi di codice si uniscono solo verso la fine.

## Una cartella, tante parti

A differenza dei capitoli 1-10, questa cartella non è lo snapshot di un solo passo: contiene tutte
le parti della seconda fase, una dopo l'altra. Il codice evolve sempre nello stesso posto e ogni
parte è una serie di commit; per vedere lo stato a metà percorso basta fare checkout del commit
che chiude quella parte.

| Parte | Cosa aggiunge |
|-------|---------------|
| 1. Spatial Graphs | Punti, segmenti e un grafo che li tiene insieme |
| 2. Graph Editor | Editor con il mouse: aggiungere, collegare, trascinare e cancellare punti |
| 3. Dynamic Viewport | Zoom, spostamento della vista, salvataggio del grafo |
| 4. Roads | Strade larghe attorno ai segmenti, con i bordi uniti negli incroci |
| 5. Buildings And Trees | Edifici lungo le strade, alberi negli spazi liberi |
| 6. Fake 3D | Edifici con tetto e alberi a strati, in prospettiva rispetto al centro della vista |
| 7. Markings | Barra degli strumenti e segnaletica sulle corsie: stop, precedenza, strisce, parcheggi, semafori, partenza e arrivo |
| 8. Saving The World | Salvataggio del mondo intero con segnaletica e vista, esportazione e importazione di file `.world` |
| 9. Integration | Editor spostato in `world/`, le auto del capitolo 9 guidano nel mondo salvato dall'editor |
| 10. OpenStreetMap | Strade importate da OpenStreetMap, sensi unici, edifici e alberi disegnati solo vicino alla vista |

Anche lo stile cambia: indentazione a 3 spazi, spazi intorno agli operatori e alle virgole, punto
e virgola sempre presente.

## Parte 1. Spatial Graphs

Il mondo sarà una rete di strade, e una rete di strade è un **grafo**: incroci e curve sono i
punti, i tratti di strada sono i segmenti che li collegano. Prima di disegnare asfalto serve quindi
una struttura dati che sappia aggiungere e togliere punti e segmenti senza creare doppioni.

### File

| File | Cosa fa |
|------|---------|
| `index.html` | Canvas 600x600 e uno script inline con un grafo di prova |
| `styles.css` | Sfondo nero, titolo bianco, canvas verde prato (`#2a5`) |
| `js/primitives/point.js` | Classe `Point`: coordinate, confronto, disegno come cerchio |
| `js/primitives/segment.js` | Classe `Segment`: due punti, confronto, disegno come linea |
| `js/math/graph.js` | Classe `Graph`: elenco di punti e segmenti con le operazioni di modifica |

Le cartelle `primitives` e `math` anticipano la struttura che crescerà nei capitoli successivi:
le forme geometriche da una parte, la logica dall'altra.

### Point e Segment

```js
equals(point) {
   return this.x == point.x && this.y == point.y;
}
```

Due punti sono uguali se hanno le stesse coordinate, non se sono lo stesso oggetto. È quello che
serve in un editor: cliccare due volte nello stesso punto deve dare un punto solo.

Un segmento è uguale a un altro se contiene entrambi i suoi estremi:

```js
equals(seg) {
   return this.includes(seg.p1) && this.includes(seg.p2);
}
```

L'ordine non conta, quindi A→B e B→A sono lo stesso segmento: il grafo è **non orientato**, una
strada si percorre in entrambi i sensi.

Entrambe le classi hanno un `draw(ctx, ...)` con dimensione e colore di default (`size = 18` per i
punti, `width = 2` per i segmenti), così il grafo si disegna senza passare parametri ma l'editor
potrà evidenziare un punto cambiandogli colore.

### Graph

Il grafo è solo due array, `points` e `segments`, con le operazioni per modificarli:

| Metodo | Cosa fa |
|--------|---------|
| `addPoint` / `addSegment` | Aggiunge senza controlli |
| `tryAddPoint` / `tryAddSegment` | Aggiunge solo se non esiste già, restituisce `true` o `false` |
| `containsPoint` / `containsSegment` | Cerca con `equals`, non per riferimento |
| `removePoint` | Toglie il punto e tutti i segmenti che lo toccano |
| `removeSegment` | Toglie solo il segmento |
| `getSegmentsWithPoint` | Segmenti che hanno quel punto come estremo |
| `dispose` | Svuota tutto |

`tryAddSegment` scarta anche i segmenti degeneri, quelli con i due estremi coincidenti:

```js
if (!this.containsSegment(seg) && !seg.p1.equals(seg.p2)) {
```

`removePoint` toglie prima i segmenti collegati e poi il punto. Al contrario resterebbero segmenti
appesi a un vertice che non esiste più, e il disegno mostrerebbe linee che finiscono nel vuoto.

`dispose` svuota gli array con `length = 0` invece di assegnarne di nuovi: chi teneva un
riferimento a `graph.points` vede l'array vuoto, invece di continuare a guardare quello vecchio.

`draw` disegna prima tutti i segmenti e poi tutti i punti, così i cerchi coprono le estremità delle
linee.

### index.html

```js
myCanvas.width = 600;
myCanvas.height = 600;

const ctx = myCanvas.getContext("2d");
```

Come nel capitolo 10, nessun `getElementById`: `myCanvas` esiste come variabile globale perché il
browser ne crea una per ogni elemento con un `id`.

Lo script inline crea quattro punti e quattro segmenti, li mette in un `Graph` e lo disegna. Il div
`#controls` sotto il canvas è ancora vuoto: ospiterà i pulsanti dell'editor.

### Come provarlo

Apri `index.html`: su un canvas verde compaiono quattro punti neri collegati da quattro linee. Non
c'è ancora nessuna interazione; per giocare con il grafo si possono chiamare dalla console
`graph.tryAddPoint(new Point(300, 500))` o `graph.removePoint(graph.points[0])`, poi
`ctx.clearRect(0, 0, 600, 600)` e `graph.draw(ctx)` per ridisegnare.

## Parte 2. Graph Editor

Costruire il grafo a mano da codice non scala: per disegnare una città serve un editor. Questa
parte aggiunge una classe che ascolta il mouse sul canvas e modifica il grafo, più il ciclo di
animazione che lo ridisegna a ogni frame.

### File

| File | Cosa cambia |
|------|-------------|
| `js/primitives/point.js` | `draw` accetta `outline` e `fill` per evidenziare un punto |
| `js/primitives/segment.js` | `draw` accetta `dash` per le linee tratteggiate |
| `js/math/utils.js` | Nuovo: `distance` e `getNearestPoint` |
| `js/graphEditor.js` | Nuovo: classe `GraphEditor` |
| `index.html` | Crea l'editor e avvia il ciclo `animate()` |

### Opzioni di disegno

```js
draw(ctx, { size = 18, color = "black", outline = false, fill = false } = {})
```

I parametri passano in un oggetto con destructuring e valori di default, invece che in posizione.
Chi chiama scrive solo quello che gli serve, `point.draw(ctx, { fill: true })`, e il `= {}` finale
permette di non passare niente. L'editor usa `fill` per il punto sotto il mouse, `outline` per
quello selezionato e `dash: [3, 3]` per il segmento che si sta tracciando.

`Segment.draw` chiama `setLineDash([])` alla fine: il contesto del canvas è uno stato condiviso, e
senza il reset tutti i segmenti disegnati dopo resterebbero tratteggiati.

### getNearestPoint

```js
function getNearestPoint(loc, points, threshold = Number.MAX_SAFE_INTEGER) {
```

Cerca il punto più vicino a `loc`, ma solo entro `threshold`. L'editor passa 10 pixel: il mouse
"aggancia" un punto quando ci passa vicino, senza doverlo centrare esattamente.

### GraphEditor

L'editor tiene quattro informazioni di stato:

| Campo | Significato |
|-------|-------------|
| `mouse` | Posizione attuale del mouse, come `Point` |
| `hovered` | Punto entro 10 px dal mouse, oppure `null` |
| `selected` | Ultimo punto selezionato, da cui parte il prossimo segmento |
| `dragging` | `true` mentre si trascina il punto selezionato |

Gli handler degli eventi aggiornano solo lo stato; `display()` lo disegna. I comandi:

| Azione | Effetto |
|--------|---------|
| Click sinistro nel vuoto | Crea un punto, lo collega al selezionato e lo seleziona |
| Click sinistro su un punto | Lo collega al selezionato, lo seleziona e inizia il trascinamento |
| Trascinamento | Sposta il punto selezionato |
| Click destro con un punto selezionato | Deseleziona |
| Click destro su un punto, senza selezione | Cancella il punto e i suoi segmenti |

Il collegamento avviene in `#select`: se c'è già un punto selezionato, prova ad aggiungere un
segmento verso il nuovo. `tryAddSegment` scarta doppioni e segmenti da un punto a se stesso, quindi
l'editor non deve controllarli.

Spostare un punto sposta anche i segmenti che lo toccano, perché un `Segment` tiene riferimenti agli
oggetti `Point` e non copie delle coordinate.

Il listener `contextmenu` con `preventDefault()` impedisce al browser di aprire il suo menu al click
destro.

Una piccola differenza dall'originale: in `display()` il segmento tratteggiato viene disegnato con
`this.ctx` invece del `ctx` globale di `index.html`. Il risultato è identico, ma la classe usa solo
il canvas che riceve nel costruttore.

### index.html

```js
function animate() {
   ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
   graphEditor.display();
   requestAnimationFrame(animate);
}
```

Lo stesso schema dell'auto nei capitoli precedenti: pulire, disegnare, richiedere il frame
successivo. Il ciclo sta fuori dall'editor perché più avanti disegnerà anche altre cose.

### Come provarlo

Apri `index.html` e disegna: ogni click nel vuoto aggiunge un punto collegato al precedente, la
linea tratteggiata mostra il segmento che verrebbe creato. Click destro per interrompere la catena,
poi click su un punto esistente per ripartire da lì. Trascina i punti per spostarli e usa il click
destro su un punto per cancellarlo.

## Parte 3. Dynamic Viewport

Una città non sta in 600x600 pixel. Questa parte separa le coordinate del **mondo** da quelle dello
**schermo**: il grafo resta dov'è, ed è la vista che si allontana o si sposta. In più il grafo
sopravvive al ricaricamento della pagina.

### File

| File | Cosa cambia |
|------|-------------|
| `js/viewport.js` | Nuovo: classe `Viewport`, zoom e spostamento della vista |
| `js/math/utils.js` | Operazioni sui vettori: `add`, `subtract`, `scale` |
| `js/graphEditor.js` | Riceve il viewport invece del canvas; nuovo `dispose()` |
| `js/math/graph.js` | Nuovo `Graph.load` per ricostruire un grafo salvato |
| `index.html` | Pulsanti 🗑️ e 💾, caricamento da `localStorage` |

### Viewport

Il viewport tiene tre valori:

| Campo | Significato |
|-------|-------------|
| `zoom` | Quanto mondo entra in un pixel: 1 all'inizio, fino a 5 allontanandosi |
| `center` | Centro del canvas, attorno a cui avviene lo zoom |
| `offset` | Spostamento della vista nel mondo |

Prima di ogni frame `reset()` riporta il contesto allo stato pulito e applica le trasformazioni:

```js
this.ctx.restore();
this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
this.ctx.save();
this.ctx.translate(this.center.x, this.center.y);
this.ctx.scale(1 / this.zoom, 1 / this.zoom);
const offset = this.getOffset();
this.ctx.translate(offset.x, offset.y);
```

Le trasformazioni del canvas si accumulano, quindi senza `restore()` ogni frame zoomerebbe sopra
quello precedente. La coppia `restore()`/`save()` torna allo stato originale e lo salva di nuovo,
pronto per il frame successivo.

L'`offset` iniziale è `-center`: annulla la prima traslazione, così all'avvio l'origine del mondo
coincide con l'angolo in alto a sinistra del canvas.

`getMouse` fa il percorso inverso, dai pixel dello schermo alle coordinate del mondo. L'editor la
usa al posto di `offsetX`/`offsetY`, altrimenti dopo uno zoom i punti comparirebbero lontano dal
cursore. Per la stessa ragione la soglia di aggancio diventa `10 * zoom`: resta 10 pixel sullo
schermo anche quando la vista si allontana.

### Spostamento della vista

Con il tasto centrale premuto il viewport registra un trascinamento in `drag`:

- `mousedown` salva il punto di partenza;
- `mousemove` aggiorna `drag.offset`, la differenza tra punto attuale e partenza;
- `mouseup` somma `drag.offset` all'`offset` e azzera il trascinamento.

`getOffset()` restituisce `offset + drag.offset`, così la vista segue il mouse già durante il
trascinamento. L'editor chiama `getMouse(evt, true)` per sottrarre lo spostamento in corso e
ottenere la vera posizione nel mondo.

Viewport ed editor ascoltano gli stessi eventi sullo stesso canvas ma si dividono i tasti: il
centrale muove la vista, sinistro e destro modificano il grafo.

### Salvare e caricare

```js
function save() {
   localStorage.setItem("graph", JSON.stringify(graph));
}
```

Il salvataggio è una riga, il caricamento no: `JSON.parse` restituisce oggetti semplici senza i
metodi delle classi, e ogni segmento contiene una copia dei suoi estremi invece di un riferimento.
`Graph.load` ricrea prima i `Point`, poi collega ogni segmento ai punti appena creati cercandoli con
`equals`. Così punti e segmenti tornano a condividere gli stessi oggetti, e trascinare un punto
sposta ancora i suoi segmenti.

Il pulsante 🗑️ chiama `graphEditor.dispose()`, che svuota il grafo e azzera anche `selected` e
`hovered`: senza il reset il click successivo collegherebbe un punto che non esiste più. Il grafo
salvato resta in `localStorage` finché non si preme di nuovo 💾.

### Differenze dall'originale

- L'evento della rotella è `wheel` invece di `mousewheel`, che non è standard e in Firefox non
  arriva mai.
- L'ordine dei `<script>` in `index.html` è rimasto quello delle parti precedenti. Non cambia
  niente, perché lo script inline parte dopo che tutti i file sono stati caricati.

### Come provarlo

Apri `index.html` e disegna un grafo. Con la rotella la vista si allontana, con il tasto centrale
si sposta; in entrambi i casi i nuovi punti devono comparire sotto il cursore. Premi 💾, ricarica
la pagina e il grafo è ancora lì. 🗑️ lo cancella dal canvas.

Senza un mouse con il tasto centrale, ad esempio con il solo trackpad, la vista si può allontanare
ma non spostare.

## Parte 4. Roads

Finora un segmento era una linea di 2 pixel. Qui diventa una strada: una fascia d'asfalto larga
100 unità con le estremità arrotondate, una mezzeria tratteggiata e i bordi bianchi. Il grafo
resta lo scheletro, la strada si costruisce attorno.

### File

| File | Cosa cambia |
|------|-------------|
| `js/primitives/polygon.js` | Nuovo: classe `Polygon`, disegno, unione, test di contenimento |
| `js/primitives/envelope.js` | Nuovo: classe `Envelope`, il poligono attorno a un segmento |
| `js/world.js` | Nuovo: classe `World`, genera e disegna le strade dal grafo |
| `js/math/utils.js` | `average`, `translate`, `angle`, `getIntersection`, `lerp`, `getRandomColor` |
| `index.html` | Crea il `World` e lo disegna sotto l'editor |

### Polygon

Un poligono è una lista di punti; il costruttore crea anche i lati, collegando ogni punto al
successivo e l'ultimo al primo (`points[i % points.length]`). `draw` riempie e contorna la forma
con `fill`, `stroke` e `lineWidth`, con lo stesso stile di opzioni di `Point` e `Segment`.

### Envelope

```js
const alpha = angle(subtract(p1, p2));
const alpha_cw = alpha + Math.PI / 2;
const alpha_ccw = alpha - Math.PI / 2;
```

`alpha` è la direzione del segmento. Attorno a `p1` l'involucro traccia mezzo cerchio di raggio
`width / 2` da `alpha_ccw` a `alpha_cw`, attorno a `p2` lo stesso mezzo cerchio ruotato di 180°.
Unendo i punti dei due semicerchi si ottiene una capsula. `roundness` è il numero di passi per
semicerchio: con 1 le estremità sono piatte, con 10 sembrano tonde.

`translate(loc, angle, offset)` sposta un punto di `offset` nella direzione `angle`, con coseno e
seno: lo stesso calcolo dei raggi dei sensori nei capitoli dell'auto.

### World

```js
generate() {
   this.envelopes.length = 0;
   for (const seg of this.graph.segments) {
      this.envelopes.push(
         new Envelope(seg, this.roadWidth, this.roadRoundness)
      );
   }

   this.roadBorders = Polygon.union(this.envelopes.map((e) => e.poly));
}
```

Un involucro per segmento, poi l'unione dei loro contorni. `draw` disegna in quest'ordine
l'asfalto (`#BBB`), la mezzeria tratteggiata sopra i segmenti del grafo e infine i bordi bianchi.

### Unire i contorni

Due capsule che si incrociano si sovrappongono, e disegnando i loro contorni comparirebbero linee
bianche in mezzo all'incrocio. `Polygon.union` tiene solo la parte esterna:

1. `multiBreak` prende ogni coppia di poligoni e, con `break`, spezza i lati dove si incrociano: il
   punto d'incrocio diventa l'estremo comune di due nuovi segmenti, uno per poligono;
2. per ogni segmento di ogni poligono `union` controlla se sta dentro un altro poligono, e in quel
   caso lo scarta;
3. restano i segmenti del perimetro esterno, che diventano `roadBorders`.

Dopo lo spezzamento ogni segmento è tutto dentro o tutto fuori, quindi `containsSegment` testa solo
il suo punto medio. `containsPoint` usa il **ray casting**: traccia un segmento dal punto fino a
`(-1000, -1000)` e conta quanti lati del poligono attraversa. Un numero dispari vuol dire che il
punto è dentro.

`getIntersection` è la formula parametrica già usata per i sensori; restituisce anche `offset`, la
posizione dell'incrocio lungo il primo segmento. `break` ignora gli incroci con offset 0 o 1, che
cadono su un vertice esistente: spezzare lì creerebbe segmenti lunghi zero.

`drawSegments` non viene usato dal mondo: colora ogni lato di un poligono con `getRandomColor` ed è
utile per vedere a occhio dove `break` ha spezzato.

### index.html

```js
viewport.reset();
world.generate();
world.draw(ctx);
ctx.globalAlpha = 0.3;
graphEditor.display();
```

Il mondo si disegna sotto, l'editor sopra in trasparenza. `globalAlpha` non viene mai rimesso a 1
perché ci pensa il `restore()` in `viewport.reset()` al frame successivo.

### Limiti

- `world.generate()` gira a ogni frame, e l'unione confronta ogni poligono con tutti gli altri:
  con qualche decina di strade la pagina rallenta. La Parte 5 rigenera il mondo solo quando il
  grafo cambia.
- Il punto di partenza del ray casting è fisso a `(-1000, -1000)`: se un poligono lo contenesse,
  il test sbaglierebbe. Con grafi disegnati a mano non succede.

### Come provarlo

Apri `index.html` e disegna un incrocio a croce o a T. Le strade sono grigie con la mezzeria
tratteggiata, e i bordi bianchi girano attorno all'incrocio senza attraversarlo. Trascinando un
punto le strade si ricalcolano in tempo reale.

## Parte 5. Buildings And Trees

Le strade da sole non fanno una città. Questa parte riempie il mondo: file di edifici
parallele alle strade e alberi sparsi negli spazi rimasti liberi. Tutto viene generato dal grafo,
senza disegnare niente a mano.

### File

| File | Cosa cambia |
|------|-------------|
| `js/math/graph.js` | `hash()`, per sapere quando il grafo è cambiato |
| `js/math/utils.js` | `dot`, `normalize`, `magnitude`; soglia in `getIntersection` |
| `js/primitives/segment.js` | `length`, `directionVector`, `projectPoint`, `distanceToPoint` |
| `js/primitives/polygon.js` | `distanceToPoint`, `distanceToPoly`, `intersectsPoly` |
| `js/world.js` | Parametri e generazione di edifici e alberi |
| `index.html` | Rigenera il mondo solo se il grafo cambia |

### Rigenerare solo quando serve

```js
let oldGraphHash = graph.hash();
...
if (graph.hash() != oldGraphHash) {
   world.generate();
   oldGraphHash = graph.hash();
}
```

`hash()` è `JSON.stringify(this)`: non un vero hash, ma due grafi uguali danno la stessa stringa.
Serializzare il grafo a ogni frame costa molto meno che rifare unioni di poligoni, e zoom e
spostamento della vista non lo toccano affatto. Serve anche per gli alberi: sono generati a caso, e
senza questo controllo cambierebbero posto a ogni frame.

### Segmenti quasi paralleli

```js
const eps = 0.001;
if (Math.abs(bottom) > eps) {
```

In `getIntersection` il denominatore `bottom` vale zero quando i due segmenti sono paralleli. Con
i numeri in virgola mobile, però, segmenti quasi paralleli danno valori minuscoli ma non nulli, e
dividere per quei valori produce incroci che non esistono. Con gli edifici capita spesso, perché
nascono da contorni paralleli alle strade.

### Distanze

Per tenere edifici e alberi alla giusta distanza da tutto il resto servono misure di distanza:

- `projectPoint` proietta un punto sulla retta del segmento con il prodotto scalare (`dot`) e
  restituisce anche `offset`, la posizione lungo il segmento da 0 a 1;
- `distanceToPoint` usa la proiezione se cade dentro il segmento, altrimenti la distanza
  dall'estremo più vicino;
- `Polygon.distanceToPoint` è il minimo sulle distanze dai lati, `distanceToPoly` il minimo sui
  vertici dell'altro poligono;
- `intersectsPoly` controlla se due poligoni hanno lati che si incrociano.

### Edifici

`#generateBuildings` lavora in quattro passi:

1. **guide**: per ogni segmento crea un involucro largo quanto strada, edificio e due spazi di
   separazione, e unisce i contorni con `Polygon.union`. Il risultato corre parallelo alle strade,
   alla distanza giusta per appoggiarci gli edifici. Le guide più corte di `buildingMinLength`
   vengono scartate;
2. **supporti**: ogni guida viene divisa nel massimo numero di pezzi lunghi almeno
   `buildingMinLength`, separati da `spacing`. La lunghezza dei pezzi viene allungata per riempire
   la guida senza avanzi;
3. **basi**: ogni supporto diventa un rettangolo largo `buildingWidth`, cioè un `Envelope` con
   `roundness` 1;
4. **pulizia**: dove due guide si incontrano gli edifici si sovrappongono, quindi per ogni coppia
   il secondo viene scartato se tocca il primo o gli sta più vicino di `spacing`.

| Parametro | Default | Significato |
|-----------|---------|-------------|
| `buildingWidth` | 150 | Profondità degli edifici |
| `buildingMinLength` | 150 | Lunghezza minima di un edificio |
| `spacing` | 50 | Distanza tra edifici e tra edifici e strada |

### Alberi

`#generateTrees` usa il **campionamento con rifiuto**: prende punti a caso dentro il rettangolo
che racchiude strade ed edifici e tiene solo quelli che rispettano tre regole:

1. non dentro una strada o un edificio, né a meno di mezzo albero da uno dei due;
2. non a meno di un albero di distanza da un altro albero;
3. non più lontano di due alberi da qualunque strada o edificio, per evitare alberi isolati nel
   nulla ai margini.

Il ciclo si ferma dopo 100 tentativi falliti di fila: `tryCount` torna a zero a ogni albero
accettato, quindi si continua finché c'è spazio e ci si ferma quando restano solo buchi troppo
piccoli.

Un albero è un `Point` disegnato con `size: 160` e un nero semitrasparente.

### Come provarlo

Apri `index.html` e disegna un piccolo quartiere. Lungo le strade compaiono rettangoli blu, gli
edifici, e negli spazi liberi cerchi scuri, gli alberi. Trascinando un punto il mondo si
rigenera e gli alberi cambiano posizione; zoom e spostamento della vista non toccano niente.

## Parte 6. Fake 3D

Il mondo resta un disegno 2D visto dall'alto, ma edifici e alberi acquistano altezza: si
inclinano allontanandosi dal centro dello schermo, come in una foto aerea scattata con un
grandangolo. Niente WebGL e niente matrici di proiezione, solo poligoni disegnati nell'ordine
giusto.

### File

| File | Cosa cambia |
|------|-------------|
| `js/items/building.js` | Nuovo: edificio con pareti, soffitto e tetto a due falde |
| `js/items/tree.js` | Nuovo: albero fatto di livelli sovrapposti |
| `js/math/utils.js` | `getFake3dPoint`, `lerp2D` |
| `js/primitives/polygon.js` | Opzione `join` in `draw` |
| `js/world.js` | Edifici e alberi come oggetti, disegnati dal più lontano |
| `index.html` | Passa a `world.draw` il punto di vista |

### Il punto di vista

```js
const viewPoint = scale(viewport.getOffset(), -1);
world.draw(ctx, viewPoint);
```

L'offset del viewport è la traslazione applicata al canvas, cioè l'opposto del punto del mondo
inquadrato al centro dello schermo. Cambiandogli segno si ottiene quel punto: è da lì che
"guarda" la telecamera.

### Il finto 3D

```js
function getFake3dPoint(point, viewPoint, height) {
   const dir = normalize(subtract(point, viewPoint));
   const dist = distance(point, viewPoint);
   const scaler = Math.atan(dist / 300) / (Math.PI / 2);
   return add(point, scale(dir, height * scaler));
}
```

Il punto in cima a un oggetto alto `height` viene spostato in direzione opposta al `viewPoint`.
Lo spostamento cresce con la distanza: al centro dello schermo vale zero e l'oggetto si vede
dritto dall'alto. L'arcotangente lo fa tendere a `height` senza superarlo mai, così ai bordi i
tetti non schizzano via.

### Edifici

`Building` avvolge la base generata nella Parte 5, un rettangolo di quattro punti, e la
disegna a strati:

1. la **base**, con un bordo largo e semitrasparente che fa da ombra;
2. le **pareti**, un quadrilatero per lato tra base e soffitto;
3. il **soffitto**, la base proiettata al 60% dell'altezza;
4. il **tetto**: due falde che salgono dai lati lunghi del soffitto fino al colmo. Il colmo è
   la proiezione, ad altezza piena, dei punti medi dei lati corti della base.

Pareti e falde vengono ordinate dalla più lontana alla più vicina al `viewPoint`, così quelle
davanti coprono quelle dietro.

Per gli spigoli del tetto `Polygon.draw` accetta ora `join` (`lineJoin` del canvas). Il
default `"miter"` va impostato a ogni chiamata: lo stato del contesto è condiviso, e un
`"round"` rimasto da un tetto finirebbe su tutto quello che viene disegnato dopo.

### Alberi

`Tree` disegna sette livelli dal centro alla cima proiettata, interpolando con `lerp2D`. Salendo
ogni livello si restringe da `size` a 40 e passa da verde scuro a verde chiaro.

Il contorno di ogni livello è frastagliato con un rumore deterministico:

```js
const kindOfRandom = Math.cos(((a + this.center.x) * size) % 17) ** 2;
```

Dipende solo dall'angolo e dalla posizione dell'albero, quindi è identico a ogni frame e non
tremola, ma cambia da un albero all'altro.

### Ordine di disegno

```js
const items = [...this.buildings, ...this.trees];
items.sort(
   (a, b) =>
      b.base.distanceToPoint(viewPoint) -
      a.base.distanceToPoint(viewPoint)
);
```

È l'algoritmo del pittore: si disegna prima ciò che è lontano. Edifici e alberi stanno nella
stessa lista perché hanno la stessa forma, una `base` e un `draw(ctx, viewPoint)`. La lista va
riordinata a ogni frame, perché il `viewPoint` si muove con la vista.

### Limiti

- La distanza usata per ordinare è quella della base più vicina al `viewPoint`, non della sagoma
  proiettata: un edificio lungo accanto a un albero può essere disegnato nell'ordine sbagliato.
- Il tetto presuppone basi di esattamente quattro punti, garantite da `Envelope` con
  `roundness` 1.

### Come provarlo

Apri `index.html` con un grafo salvato, oppure disegnane uno. Spostando la vista con il tasto
centrale, gli edifici si inclinano sempre verso l'esterno dello schermo. Quelli al centro
mostrano solo il tetto rosso, quelli ai bordi anche le pareti. Gli alberi davanti a un
edificio lo coprono, quelli dietro restano nascosti.

## Parte 7. Markings

Sulle strade arriva la segnaletica. Una barra di pulsanti sceglie lo strumento attivo: l'editor
del grafo oppure uno degli editor di segnaletica, che piazzano un elemento sulla corsia più
vicina al mouse, orientato nel senso di marcia.

### File

| File | Cosa cambia |
|------|-------------|
| `js/editors/graphEditor.js` | Spostato da `js/`; nuovi `enable()` e `disable()` |
| `js/editors/markingEditor.js` | Nuovo: classe base degli editor di segnaletica |
| `js/editors/*Editor.js` | Nuovi: un editor per ogni tipo di segnaletica |
| `js/markings/marking.js` | Nuovo: classe base, un rettangolo centrato su un punto |
| `js/markings/*.js` | Nuovi: `Stop`, `Yield`, `Crossing`, `Parking`, `Light`, `Start`, `Target` |
| `js/math/utils.js` | `getNearestSegment`, `perpendicular` |
| `js/primitives/segment.js` | Opzione `cap` in `draw` |
| `js/world.js` | Lane guides, elenco `markings`, fasi dei semafori |
| `index.html` | Barra degli strumenti, `setMode` |
| `styles.css` | Stile dei pulsanti |
| `car.png` | Immagine dell'auto per il punto di partenza |

### Barra degli strumenti

```js
const tools = {
   graph: { button: graphBtn, editor: new GraphEditor(viewport, graph) },
   stop: { button: stopBtn, editor: new StopEditor(viewport, world) },
   // ...
};
```

`setMode(mode)` spegne tutti gli editor, rende grigi i pulsanti con `grayscale(100%)` e poi
riaccende solo quello scelto. Gli editor ora non ascoltano più il mouse dal costruttore: lo
fanno in `enable()` e smettono in `disable()`.

Per togliere un listener serve la stessa funzione passata ad `addEventListener`. Ma
`this.#handleMouseDown.bind(this)` crea una funzione nuova a ogni chiamata, quindi la versione
legata viene salvata nel campo `boundMouseDown` e riusata in `removeEventListener`.

Tutti gli editor disegnano la propria anteprima a ogni frame con `display()`, ma solo quello
attivo ne ha una.

### Lane guides

Le corsie sono le linee a metà tra il centro della strada e il bordo. `World` le ottiene come
le strade, ma con buste larghe la metà:

```js
new Envelope(seg, this.roadWidth / 2, this.roadRoundness)
```

L'unione delle buste dà i segmenti di `laneGuides`, uno per senso di marcia. La segnaletica si
aggancia lì: uno STOP finisce sulla corsia giusta e non a cavallo della linea tratteggiata. Le
strisce pedonali fanno eccezione e si agganciano ai segmenti del grafo, perché attraversano
tutta la strada.

### MarkingEditor

`MarkingEditor` fa tutto il lavoro comune:

- al movimento del mouse cerca il segmento più vicino entro `10 * zoom` con
  `getNearestSegment`;
- proietta il mouse su quel segmento e, se cade al suo interno, crea l'anteprima con
  `createMarking(punto, direzione)`;
- il click sinistro aggiunge l'anteprima a `world.markings`, il destro toglie la segnaletica
  sotto il mouse.

Le sottoclassi decidono soltanto quale segnaletica creare e su quali segmenti, ridefinendo
`createMarking`. È il pattern *template method*: lo schema è nella classe base, il passo che
cambia è nelle figlie.

### Segnaletica

`Marking` costruisce un rettangolo largo `width` e lungo `height`, centrato in `center` e
allineato a `directionVector`. Serve per il test del click destro (`poly.containsPoint`) e come
disegno di default. Le sottoclassi ridefiniscono `draw`:

| Segnaletica | Pulsante | Disegno |
|-------------|----------|---------|
| `Stop` | 🛑 | Linea bianca trasversale alla corsia e scritta STOP |
| `Yield` | ⚠️ | Linea bianca trasversale e scritta YIELD |
| `Crossing` | 🚶 | Strisce bianche: una linea tratteggiata spessa quanto la marking, perpendicolare alla strada |
| `Parking` | 🅿️ | Due linee trasversali alla corsia e una P |
| `Light` | 🚦 | Corpo arrotondato con tre luci |
| `Start` | 🚙 | L'immagine `car.png`, ruotata nel senso di marcia |
| `Target` | 🎯 | Tre cerchi concentrici rossi e bianchi |

Le scritte usano sempre lo stesso schema: `translate` sul centro, `rotate` nel senso di
marcia, `fillText` in coordinate locali e infine `restore`. `scale(1, 3)` allunga le lettere
come la segnaletica vera, che si legge di scorcio.

La segnaletica si disegna subito dopo l'asfalto, sotto la linea tratteggiata e i bordi.

### Semafori

A ogni frame `#updateLights()` raggruppa i semafori per incrocio, cioè per punto del grafo con
più di due segmenti, e li accende a turno:

- un tick vale 60 frame;
- il semaforo di turno resta verde per 2 tick e giallo per 1;
- tutti gli altri semafori dello stesso incrocio sono rossi.

Lo stato non viene memorizzato da un frame all'altro: si ricalcola da `frameCount`.

### Array modificati sul posto

```js
this.laneGuides.length = 0;
this.laneGuides.push(...this.#generateLaneGuides());
```

Gli editor ricevono `world.laneGuides` e `world.markings` nel costruttore e li conservano.
Se `World` assegnasse un array nuovo, gli editor resterebbero agganciati a quello vecchio. Per
lo stesso motivo `dispose()` svuota la segnaletica con `world.markings.length = 0`.

### Limiti

- La segnaletica non si salva: 💾 salva ancora solo il grafo.
- La segnaletica non segue il grafo: spostando o cancellando una strada, rimane dov'era.
- Un semaforo in un grafo senza incroci blocca il disegno: `getNearestPoint` restituisce `null`
  e `#updateLights` lancia un errore a ogni frame.
- Il tick conta i frame, non i secondi: su uno schermo a 120 Hz i semafori vanno al doppio
  della velocità.
- `Light` ignora l'altezza ricevuta e usa sempre 18.
- Gli editor usano la variabile globale `world` in `createMarking` invece di `this.world`, e
  la funzione si chiama `dissableEditors`: entrambi sono tenuti come nell'originale.

### Come provarlo

Apri `index.html` e disegna qualche strada con 🌐, con almeno un incrocio a tre vie. Scegli
uno strumento dalla barra: avvicinando il mouse a una corsia compare l'anteprima
semitrasparente, il click sinistro la fissa e il destro la toglie. I semafori di uno stesso
incrocio diventano verdi uno alla volta.

## Parte 8. Saving The World

Fino alla Parte 7 si salvava solo il grafo: segnaletica, edifici e alberi andavano persi, e gli
alberi cambiavano posto a ogni caricamento. Ora si salva tutto il mondo, insieme alla vista, in
`localStorage` e in un file `.world` da scaricare e ricaricare.

### File

| File | Cosa cambia |
|------|-------------|
| `js/world.js` | `World.load`, ricostruisce il mondo da un oggetto JSON |
| `js/primitives/polygon.js` | `Polygon.load` |
| `js/primitives/envelope.js` | `Envelope.load`; il costruttore accetta di non ricevere lo scheletro |
| `js/items/building.js` | `Building.load` |
| `js/markings/marking.js` | Campo `type` e `Marking.load`, che crea la sottoclasse giusta |
| `js/markings/*.js` | Ogni sottoclasse imposta il proprio `type` |
| `js/viewport.js` | Il costruttore accetta `zoom` e `offset` iniziali |
| `index.html` | Chiave `"world"` in `localStorage`, pulsante 📁, `save()` scarica il file |
| `styles.css` | Stile dell'etichetta 📁, input di file nascosto |

### Da JSON a oggetti

`JSON.stringify(world)` salva i campi ma non le classi: da `JSON.parse` escono oggetti senza
metodi. Ogni classe che finisce nel file ha quindi un `static load(info)` che ricostruisce le
istanze:

| Metodo | Ricostruisce |
|--------|--------------|
| `World.load` | Parametri, grafo, buste, bordi, edifici, alberi, lane guides, segnaletica, vista |
| `Graph.load` | Punti e segmenti, già presente dalla Parte 3 |
| `Envelope.load` | Scheletro e poligono, senza ricalcolarli |
| `Polygon.load` | I punti come `Point` |
| `Building.load` | Base e altezza |
| `Marking.load` | La sottoclasse indicata da `type` |

Da un oggetto JSON non si capisce più se era uno `Stop` o un `Yield`. Per questo ogni marking
scrive il proprio `type` e `Marking.load` sceglie la classe con uno `switch`.

`World.load` non chiama `generate()`: usa le buste, gli edifici e gli alberi salvati. Gli alberi
nascono da `Math.random()`, e rigenerandoli cambierebbero posto a ogni caricamento.

### La vista

`save()` copia `viewport.zoom` e `viewport.offset` nel mondo prima di salvarlo, e al caricamento
il `Viewport` riparte da lì. Un mondo salvato senza vista usa i valori di default: zoom 1 e
origine al centro del canvas.

### File .world

💾 crea un `<a>` con un *data URL* che contiene il JSON e l'attributo `download`, poi lo clicca
da codice. Il browser scarica `name.world`.

📁 è un `<label>` collegato a un `<input type="file">` nascosto. Il file scelto viene letto con
`FileReader`, salvato in `localStorage` e la pagina si ricarica. Ricaricare è più semplice che
sostituire il mondo al volo: editor, grafo e strumenti tengono riferimenti al mondo vecchio, e
il codice di avvio legge già da `localStorage`.

### Limiti

- Il grafo salvato con `"graph"` nelle parti precedenti non viene più letto: la nuova chiave è
  `"world"`.
- Il file si chiama sempre `name.world`.
- Il data URL contiene tutto il mondo: per mappe molto grandi sarebbe meglio un `Blob` con
  `URL.createObjectURL`.

### Come provarlo

Disegna qualche strada, aggiungi segnaletica e sposta la vista, poi premi 💾: il browser scarica
`name.world`. Ricaricando la pagina il mondo, la segnaletica e la vista sono quelli salvati, con
gli alberi negli stessi punti. Con 📁 puoi caricare un altro file `.world`.

## Parte 9. Integration

Le due basi di codice si incontrano. L'editor delle parti 1-8 si sposta in `world/`, nella radice
della cartella arriva l'auto della cartella "9. Fine-tuning" e le auto, invece della strada dritta,
guidano nel mondo disegnato con l'editor.

### File

| File | Cosa cambia |
|------|-------------|
| `world/` | Tutto l'editor delle parti 1-8, spostato senza modifiche |
| `car.js`, `controls.js`, `network.js`, `sensor.js`, `utils.js`, `visualizer.js`, `car.png` | Arrivano dalla cartella 9 |
| `car.js` | Angolo iniziale nel costruttore, campo `fittness` |
| `index.html` | Carica gli script di `world/js/` prima di quelli dell'auto |
| `main.js` | Mondo da `localStorage`, partenza dal marking Start, vista che segue l'auto migliore |
| `world/js/world.js` | Disegna le auto e può nascondere i marking Start |
| `style.css` | Sfondo verde al posto del grigio |
| `road.js` | Eliminato: i bordi arrivano dal mondo |

### Due pagine

`world/index.html` è l'editor, `index.html` nella radice è la simulazione. Le due pagine leggono la
stessa chiave `"world"` in `localStorage`: quello che l'editor salva con 💾 è il mondo in cui
partono le auto.

I percorsi negli script sono relativi alla pagina che li carica, non al file che li contiene.
`Start` carica `"car.png"`: nell'editor è l'icona 30×50 di `world/`, nella simulazione è lo sprite
dell'auto nella radice. Nella simulazione i marking Start non vengono disegnati, perché le auto ci
partono sopra.

### Dal mondo all'auto

`main.js` carica il mondo con `World.load` (o ne crea uno vuoto) e passa ai sensori i bordi delle
strade nel formato che conoscono già: `world.roadBorders.map((s) => [s.p1, s.p2])`, una coppia di
punti per segmento, come i bordi di `Road`.

Le 100 auto partono dal centro del primo marking Start, rivolte come l'icona che l'editor disegna.
Senza marking partono da `(100, 100)` con `dir = Point(0, -1)`. L'angolo iniziale è
`-angle(dir) + Math.PI / 2`, perché le due basi di codice usano convenzioni diverse:

| Codice | Angolo 0 | Verso positivo |
|--------|----------|----------------|
| Mondo, `angle()` con `Math.atan2` | Destra | Orario sullo schermo, con la y verso il basso |
| Auto, `x -= sin(angle)`, `y -= cos(angle)` | Alto | Antiorario sullo schermo |

La formula non si limita a cambiare convenzione: con `a = π/2 - angle(dir)` l'auto si muove lungo
`(-sin a, -cos a)`, che è l'opposto di `dir`. Anche `Start.draw` ruota l'icona di
`angle(dir) - Math.PI / 2` e la rivolge allo stesso modo, quindi auto e icona puntano dalla stessa
parte. Per lo stesso motivo, senza marking le auto partono verso il basso.

### Fitness

Sulla strada dritta l'auto migliore era la più avanti, quella con la `y` più piccola. In un mondo
dove la partenza può puntare in qualsiasi direzione quel criterio premierebbe l'auto più a nord,
quindi ogni auto accumula `fittness += speed` a ogni frame e vince quella che ha percorso più
strada. Il nome `fittness` è quello dell'originale.

### Vista e disegno

A ogni frame `main.js` mette `viewport.offset` sulla posizione dell'auto migliore, chiama
`viewport.reset()` e lascia disegnare tutto a `world.draw(carCtx, viewPoint, false)`. Il mondo
riceve le auto in `world.cars` e `world.bestCar` e le disegna dopo la segnaletica e prima di
edifici e alberi, così il finto 3D le copre quando ci passano dietro.

Il `Viewport` tiene i suoi listener: la rotella cambia lo zoom, mentre lo spostamento con il tasto
centrale viene sovrascritto al frame successivo.

### Differenze dall'originale

- Il cervello si salva con la chiave `"worldBestBrain"`. Se è vuota si parte da `"bestBrain"`, il
  cervello allenato sulla strada dritta della cartella 9, che resta intatto.
- `index.html` mantiene `<html lang="en">` e `<meta charset="utf-8">` della cartella 9 e carica
  gli script del mondo nello stesso ordine di `world/index.html`.
- `visualizer.js` è in UTF-8 come nella cartella 9; nell'originale è in UTF-16.
- `world/index.html` dichiara `<meta charset="utf-8">`. Senza, un server che non manda il charset
  nell'header, come `python3 -m http.server`, fa leggere la pagina in Windows-1252 e le emoji dei
  pulsanti diventano caratteri illeggibili.

### Limiti

- Nessun traffico: `traffic` è vuoto e un'auto si danneggia solo toccando i bordi.
- Le auto non vedono la segnaletica: stop, semafori e strisce sono solo disegni.
- La fitness premia la strada percorsa, non l'arrivo: un'auto che gira in tondo senza toccare i
  bordi continua ad accumularla.
- La dimensione dei canvas è calcolata solo al caricamento.

### Come provarlo

Apri `world/index.html`, disegna qualche strada e metti un marking Start su una corsia, poi premi
💾 (il file scaricato non serve). Apri `index.html` nella radice: le auto partono dallo Start, la
vista segue la migliore e a destra c'è la sua rete. 💾 salva il cervello, 🗑️ lo cancella.

Se la simulazione non vede il mondo salvato, le due pagine non condividono `localStorage`: servi
la cartella con un server locale, ad esempio `python3 -m http.server`, e apri entrambe da lì.

## Parte 10. OpenStreetMap

Disegnare a mano una città intera richiede molto tempo. OpenStreetMap ha già le strade di tutto il
mondo: basta scaricarle in JSON e convertirle nel grafo dell'editor. Da lì il mondo si genera come
sempre, con buste, bordi, edifici e alberi.

### File

| File | Cosa cambia |
|------|-------------|
| `world/js/math/osm.js` | `Osm.parseRoads`, da dati OpenStreetMap a punti e segmenti |
| `world/js/math/utils.js` | `invLerp` e `degToRad` |
| `world/index.html` | Pulsante 🗺️ e pannello in cui incollare i dati |
| `world/styles.css` | Stile del pannello, `overflow: hidden` sul body |
| `world/js/primitives/segment.js` | Campo `oneWay`, tratteggio più fitto per i sensi unici |
| `world/js/world.js` | `draw()` riceve `renderRadius` |

### I dati

I dati si scaricano con [Overpass Turbo](https://overpass-turbo.eu/): sposta la mappa sulla zona
che ti interessa, incolla una query come questa e premi *Run*.

```
[out:json];
(
  way['highway']
  ['highway' !~ '^(pedestrian|footway|cycleway|path|service|corridor|track|steps|raceway|bridleway|proposed|construction|elevator|bus_guideway)$']
  ['access' !~ '^(private|no)$']
  ({{bbox}});
);
out body;
>;
out skel;
```

La query prende le *way* con il tag `highway`, cioè le strade, e scarta quelle che le auto non
percorrono. `{{bbox}}` è il rettangolo visibile sulla mappa. `out body` restituisce le way con la
lista dei loro nodi, `>` aggiunge i nodi a cui fanno riferimento e `out skel` li restituisce con le
sole coordinate. Il JSON del tab *Data* va incollato nel pannello 🗺️ e confermato con ✔️.

### Da latitudine e longitudine a punti

`Osm.parseRoads` prende tutti i nodi, ne calcola il rettangolo che li contiene e lo proietta sul
piano:

- un grado di latitudine vale circa 111 km ovunque. L'altezza è `deltaLat * 111000 * 10`, quindi
  un metro vale 10 unità. Con questa scala la strada larga 100 è larga 10 m e l'auto 30×50 misura
  3×5 m;
- un grado di longitudine si accorcia andando verso i poli, quindi la larghezza è moltiplicata per
  `cos(lat)`;
- ogni nodo diventa un `Point` con `invLerp` sui due assi. Per la `y` gli estremi sono invertiti,
  `invLerp(maxLat, minLat, lat)`, perché la latitudine cresce verso nord e la `y` del canvas verso
  il basso.

È una proiezione equirettangolare locale: precisa su un quartiere, sempre più distorta su
un'area grande.

Ogni way diventa una catena di segmenti tra nodi consecutivi. Per ritrovarli il punto conserva
l'`id` del nodo. `parseOsmData` sostituisce `graph.points` e `graph.segments`: l'editor vede che
l'hash del grafo è cambiato e rigenera il mondo, come quando si modifica il grafo con il mouse.

### Sensi unici

Una way con `oneway` o con `lanes` uguale a 1 crea segmenti `oneWay`. `Segment.draw` ignora il
tratteggio ricevuto e usa `[4, 4]`, quindi un senso unico ha la mezzeria più fitta e nell'editor
del grafo appare tratteggiato. Le auto non ne tengono conto.

### Disegnare solo il vicino

Una mappa reale ha migliaia di edifici, e ognuno costa il calcolo del finto 3D e un disegno sul
canvas. `World.draw` scarta gli edifici e gli alberi la cui base è a più di `renderRadius` (1000)
dal punto di vista, prima dell'ordinamento. Strade, segnaletica e bordi restano tutti: sono linee
semplici e senza di loro si vedrebbero buchi nella rete.

### Cosa non è stato portato

- `miniMap.js` nella radice: nell'originale è un abbozzo della parte successiva, interrotto a metà
  e non caricato da nessuna pagina.
- `world/saves/big.world`: un mondo d'esempio da 6 MB, che un file `.world` generato da sé
  sostituisce.

### Limiti

- `oneWay` viene scritto nel file ma `Graph.load` non lo legge: dopo un caricamento tutte le strade
  tornano a doppio senso.
- `oneway` è una stringa: anche `oneway=no` risulta un senso unico, e `oneway=-1` (senso unico nel
  verso opposto) non è distinto. In un estratto di prova di Bologna, 44 dei 153 segmenti a senso
  unico venivano da `oneway=no`.
- Ogni segmento cerca i suoi due punti con `points.find`, quindi la conversione rallenta con il
  quadrato dei nodi. Anche la generazione del mondo, con l'unione delle buste, diventa lenta su
  mappe grandi.
- Un mondo grande può superare il limite di `localStorage`, intorno ai 5 MB in molti browser. In
  quel caso il salvataggio fallisce, mentre il file `.world` si scarica comunque.
- `renderRadius` è in unità del mondo: nell'editor, allontanando la vista, gli edifici lontani dal
  centro spariscono.
- Ponti e sottopassi non sono distinti: le due strade non condividono un nodo, ma le loro buste si
  uniscono e dove si sovrappongono sembra un incrocio.

### Come provarlo

Apri `world/index.html`, premi 🗺️ e incolla il JSON di Overpass Turbo per una zona piccola, qualche
isolato. Con ✔️ compare la rete stradale con edifici e alberi; i sensi unici hanno la mezzeria più
fitta. Aggiungi un marking Start, premi 💾 e apri `index.html` nella radice per far guidare le auto
nelle strade vere.
