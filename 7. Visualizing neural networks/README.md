# 7. Visualizing neural networks

In questo capitolo il secondo canvas prende vita: la rete neurale viene disegnata in tempo reale,
con i neuroni che si accendono e si spengono mentre l'auto guida. È il capitolo che rende "visibile"
quello che fino a prima era solo una manciata di numeri.

## Cosa cambia rispetto al capitolo 6

| File | Novità |
|------|--------|
| `visualizer.js` | Nuovo, classe `Visualizer` |
| `utils.js` | Aggiunta `getRGBA` |
| `main.js` | `animate(time)` riceve il tempo, imposta `lineDashOffset` e chiama il visualizer |
| `index.html` | Carica `visualizer.js` |

## Codifica dei valori in colori

```js
function getRGBA(value){
    const alpha=Math.abs(value);
    const R=value<0?0:255;
    const G=R;
    const B=value>0?0:255;
    return "rgba("+R+","+G+","+B+","+alpha+")";
}
```

Ogni valore tra -1 e 1 (peso, bias, input, output) diventa un colore:

- **positivo**: giallo (255,255,0);
- **negativo**: blu (0,0,255);
- **intensità**: l'opacità è il valore assoluto, quindi un valore vicino a 0 è quasi trasparente
  e non si vede.

Con un solo colpo d'occhio si capisce quali collegamenti contano (quelli più evidenti) e in che
direzione spingono.

## Visualizer.drawNetwork

```js
const margin=50;
const levelHeight=height/network.levels.length;
for(let i=network.levels.length-1;i>=0;i--){
    const levelTop=top+lerp(height-levelHeight,0,
        network.levels.length==1?0.5:i/(network.levels.length-1));
    ctx.setLineDash([7,3]);
    Visualizer.drawLevel(...);
}
```

- La rete viene disegnata dal basso (input) verso l'alto (output), con 50 px di margine.
- Ogni livello occupa una fascia verticale, posizionata con `lerp`. Il livello 0 sta in basso e
  l'ultimo in alto.
- I livelli vengono disegnati **dall'ultimo al primo**. Non è un caso: gli output di un livello
  coincidono con gli input del livello sopra, nello stesso punto dello schermo. Il livello sotto,
  disegnato per ultimo, mette i suoi nodi di output sopra i nodi di input del livello superiore,
  e così il cerchio del bias resta visibile invece di essere coperto.
- `network.levels.length==1?0.5:...` evita una divisione per zero con un solo livello. In questo
  capitolo i livelli sono 2, ma nel capitolo 10 la rete avrà un solo livello e questo caso verrà
  usato davvero.
- Solo l'ultimo livello riceve le etichette `['🠉','🠈','🠊','🠋']`, cioè avanti, sinistra, destra e
  indietro.

## Visualizer.drawLevel

Per ogni livello disegna, in quest'ordine:

1. **Le connessioni**: una linea da ogni input a ogni output, colorata con `getRGBA(weights[i][j])`.
   Sono tratteggiate (`[7,3]`).
2. **I nodi di input** in basso: un cerchio nero di raggio 18 e dentro un cerchio più piccolo
   (60%) colorato con il valore dell'input.
3. **I nodi di output** in alto: stesso schema, più un anello al 80% del raggio colorato con il
   **bias** e tratteggiato con `[3,3]`. Subito dopo si torna a `setLineDash([])`.
4. **Le etichette** sui nodi di output, testo nero con contorno bianco sottile, così la freccia si
   legge sia su nodo spento che acceso.

Le coordinate x dei nodi si calcolano con `#getNodeX`, che usa `lerp` tra bordo sinistro e destro
(e, di nuovo, gestisce il caso di un solo nodo mettendolo al centro).

## L'animazione del tratteggio

```js
function animate(time){
    ...
    networkCtx.lineDashOffset=-time/50;
    Visualizer.drawNetwork(networkCtx,car.brain);
    requestAnimationFrame(animate);
}
```

`requestAnimationFrame` passa alla callback un timestamp in millisecondi. Usandolo come
`lineDashOffset` il tratteggio scorre lentamente e le connessioni sembrano "scorrere" dal basso
verso l'alto, come un segnale che attraversa la rete. Il segno meno decide la direzione. È un
effetto da una riga che rende la rete molto più leggibile.

Una curiosità: alla primissima chiamata (`animate()` lanciata a mano) `time` è `undefined`, quindi
l'offset vale `NaN`. Il canvas ignora i valori non validi, quindi non succede niente di brutto, e
dal frame successivo il tempo è quello giusto.

## Una nota sul file

Nel repository originale `visualizer.js` era salvato in UTF-16 con terminazioni CRLF, a differenza
di tutti gli altri file. Il browser lo leggeva comunque grazie al BOM, ma git lo trattava come
binario (niente diff, niente anteprima). L'ho convertito in UTF-8 con LF senza toccare il codice:
le frecce delle etichette sono caratteri Unicode e funzionano uguale.

## Come provarlo

Apri `index.html`. A sinistra l'auto con la sua rete casuale, a destra la rete. Ricarica qualche
volta e confronta reti diverse: si vede subito quando un output resta sempre acceso (per esempio la
freccia su) o non si accende mai.
