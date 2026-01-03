# 6. Neural network

Il capitolo più importante: la macchina viene guidata da una rete neurale scritta da zero, senza
librerie. In questa fase la rete ha pesi completamente casuali e non è addestrata, quindi la
macchina si muove a caso. Ma il collegamento sensori, rete e comandi è completo.

## Cosa cambia rispetto al capitolo 5

| File | Novità |
|------|--------|
| `network.js` | Nuovo, classi `NeuralNetwork` e `Level` |
| `car.js` | Ogni auto non DUMMY ha un `brain`; le auto `"AI"` usano le uscite della rete come comandi |
| `main.js` | Due canvas (auto e rete), l'auto principale diventa `"AI"` |
| `index.html` | `carCanvas` e `networkCanvas` al posto di `myCanvas`, carica `network.js` |
| `style.css` | Sfondo nero per il canvas della rete |

Il `networkCanvas` (largo 300 px) in questo capitolo resta vuoto: lo prepara per il visualizer del
capitolo 7.

## Architettura della rete

```js
this.brain=new NeuralNetwork(
    [this.sensor.rayCount,6,4]
);
```

- **5 input**: uno per raggio del sensore.
- **6 neuroni nascosti**.
- **4 output**: avanti, sinistra, destra, indietro. Nello stesso ordine dei flag di `Controls`.

L'array `[5,6,4]` descrive quanti neuroni ha ogni strato. `NeuralNetwork` crea un `Level` per
ogni coppia di strati consecutivi, quindi qui ci sono 2 livelli: 5 verso 6 e 6 verso 4. Cambiando
l'array si cambia l'architettura senza toccare altro codice.

## Level

Un `Level` collega uno strato di input a uno di output:

```js
this.inputs=new Array(inputCount);
this.outputs=new Array(outputCount);
this.biases=new Array(outputCount);
this.weights=[];   // weights[i][j]: dall'input i all'output j
```

- C'è un **peso** per ogni coppia input/output (qui 5x6 = 30 nel primo livello, 6x4 = 24 nel
  secondo).
- C'è un **bias** per ogni output.
- `#randomize` riempie pesi e bias con valori in [-1, 1] usando `Math.random()*2-1`. I valori
  negativi sono importanti: un peso negativo vuol dire "se vedo un ostacolo da questa parte, NON
  fare questa azione", per esempio non girare verso un muro.

`#randomize` è un metodo **statico** privato, che riceve il livello come parametro invece di usare
`this`. Lo stesso vale per `feedForward`. Lo stile è voluto: nel capitolo 8 le reti verranno
salvate con `JSON.stringify` e ricaricate con `JSON.parse`, e un oggetto ricaricato da JSON è un
oggetto semplice senza i metodi della classe. Con metodi statici la rete funziona anche così, perché
viene passata come dato e non usata come istanza.

## feedForward

```js
for(let i=0;i<level.outputs.length;i++){
    let sum=0
    for(let j=0;j<level.inputs.length;j++){
        sum+=level.inputs[j]*level.weights[j][i];
    }
    if(sum>level.biases[i]){
        level.outputs[i]=1;
    }else{
        level.outputs[i]=0;
    }
}
```

Per ogni output si fa la somma pesata degli input e la si confronta con il bias:

- se la somma supera il bias il neurone si "accende" e vale 1;
- altrimenti vale 0.

È una funzione di attivazione a gradino (step), come nel percettrone originale. Niente sigmoid e
niente ReLU, quindi niente backpropagation: la rete non si addestra con il gradiente ma con
mutazioni casuali (capitolo 8). Per decidere "premo o non premo un tasto" un output binario è
proprio quello che serve.

Una nota sul bias: di solito si scrive `sum + bias > 0`, qui invece `sum > bias`. Matematicamente
è lo stesso, con il bias di segno opposto.

`NeuralNetwork.feedForward` passa l'uscita di ogni livello come ingresso del successivo e
restituisce gli output dell'ultimo.

## Dai sensori alla rete

```js
const offsets=this.sensor.readings.map(
    s=>s==null?0:1-s.offset
);
const outputs=NeuralNetwork.feedForward(offsets,this.brain);
```

Questa trasformazione mi ha fatto riflettere. Il sensore restituisce `offset`, cioè a che frazione
del raggio c'è l'ostacolo (0 vicino, 1 lontano). Ma alla rete serve il contrario: un valore alto
quando l'ostacolo è vicino, perché è lì che deve reagire. Quindi:

- nessun ostacolo (`null`) diventa 0, cioè "niente da segnalare";
- ostacolo in fondo al raggio diventa circa 0;
- ostacolo attaccato all'auto diventa circa 1.

## Dalla rete ai comandi

```js
this.useBrain=controlType=="AI";
...
if(this.useBrain){
    this.controls.forward=outputs[0];
    this.controls.left=outputs[1];
    this.controls.right=outputs[2];
    this.controls.reverse=outputs[3];
}
```

Le uscite (0 o 1) finiscono direttamente nei flag di `Controls`. Siccome `#move` fa solo
`if(this.controls.forward)`, 0 e 1 funzionano come `false` e `true`.

Dettaglio interessante: il `brain` viene creato per qualsiasi auto non DUMMY, anche per quella
guidata da tastiera. In quel caso la rete gira lo stesso ma le sue uscite vengono ignorate. È utile
per vedere come "penserebbe" la rete mentre guido io.

## Due canvas

```js
const carCanvas=document.getElementById("carCanvas");
carCanvas.width=200;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=300;
```

Tutto quello che prima era `canvas`/`ctx` diventa `carCanvas`/`carCtx`. Entrambi i canvas vengono
ridimensionati (e quindi puliti) a ogni frame.

## Come provarlo

Apri `index.html` e ricarica più volte. Ogni ricarica genera una rete diversa: a volte l'auto non
parte, a volte va in retromarcia, a volte gira in tondo, a volte sbatte subito. È normale: i pesi
sono casuali e non c'è ancora nessun addestramento.
