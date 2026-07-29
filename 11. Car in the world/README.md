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
