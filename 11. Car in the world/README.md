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
