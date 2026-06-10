# 8. Optimizing neural networks

Qui la rete inizia a imparare. Non con la backpropagation, ma con un approccio evolutivo molto
semplice: si lanciano tante auto insieme, ognuna con una rete leggermente diversa, si sceglie la
migliore, la si salva e la si usa come base per la generazione successiva.

## Cosa cambia rispetto al capitolo 7

| File | Novità |
|------|--------|
| `network.js` | Aggiunto `NeuralNetwork.mutate` |
| `main.js` | N auto in parallelo, `bestCar`, salvataggio in `localStorage`, 7 auto di traffico |
| `car.js` | `draw` riceve `drawSensor` per disegnare i raggi solo della migliore |
| `index.html` | Pulsanti 💾 e 🗑️ tra i due canvas |
| `style.css` | Layout flex e stile dei pulsanti |

## Mutazione

```js
static mutate(network,amount=1){
    network.levels.forEach(level => {
        for(let i=0;i<level.biases.length;i++){
            level.biases[i]=lerp(
                level.biases[i],
                Math.random()*2-1,
                amount
            )
        }
        ...stessa cosa per weights...
    });
}
```

Ogni peso e ogni bias si sposta verso un valore casuale in [-1, 1] di una quantità pari a
`amount`. Ancora una volta è `lerp` a fare il lavoro:

- `amount=0`: la rete resta identica;
- `amount=1`: la rete diventa completamente casuale;
- `amount=0.1`: ogni valore si sposta del 10% verso un numero casuale, cioè una piccola variazione
  attorno alla rete di partenza.

Un aspetto che mi piace: il valore resta sempre nell'intervallo [-1, 1], perché è una media
pesata tra due numeri che stanno già in quell'intervallo.

## Tante auto in parallelo

```js
const N=1;
const cars=generateCars(N);
```

`generateCars` crea N auto `"AI"` tutte nella corsia centrale a y=100. Nel codice di questo
capitolo N vale 1. Per addestrare davvero va alzato (nel capitolo 9 diventa 100): più auto vuol
dire più varianti provate a ogni generazione.

### Chi è la migliore

```js
bestCar=cars.find(
    c=>c.y==Math.min(
        ...cars.map(c=>c.y)
    ));
```

La "fitness" è semplicemente quanto è andata avanti l'auto: la y più piccola (ricordo che salire
vuol dire diminuire y). È una funzione di fitness molto rozza, ma basta: per andare avanti l'auto
deve evitare traffico e bordi, quindi chi arriva più lontano è anche chi guida meglio.

`bestCar` viene ricalcolata a ogni frame, e la camera segue sempre lei.

## Salvare e riprendere

```js
function save(){
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
}
function discard(){
    localStorage.removeItem("bestBrain");
}
```

- 💾 salva il cervello dell'auto migliore come JSON in `localStorage`.
- 🗑️ cancella il salvataggio e si riparte da reti casuali.

All'avvio, se c'è un cervello salvato:

```js
for(let i=0;i<cars.length;i++){
    cars[i].brain=JSON.parse(
        localStorage.getItem("bestBrain"));
    if(i!=0){
        NeuralNetwork.mutate(cars[i].brain,0.1);
    }
}
```

Due dettagli che mi sono sembrati intelligenti:

1. **`JSON.parse` dentro il ciclo**: ogni auto riceve una copia indipendente della rete. Se avessi
   fatto il parse una volta sola e assegnato lo stesso oggetto a tutte, mutare la rete di una avrebbe
   mutato quella di tutte.
2. **L'auto 0 non viene mutata**: tiene esattamente la rete salvata. È quello che negli algoritmi
   genetici si chiama elitismo: la generazione nuova non può mai essere peggiore della precedente,
   perché la migliore è sempre presente.

Il ciclo di addestramento quindi è manuale: lascio girare, quando una macchina va lontano premo 💾,
ricarico la pagina, e ripeto. Ogni ricarica è una nuova generazione.

Una cosa da ricordare: `JSON.parse` restituisce oggetti semplici e non istanze di `NeuralNetwork`.
Funziona solo perché `feedForward` e `mutate` sono statici e ricevono la rete come parametro (la
scelta fatta nel capitolo 6).

## Traffico più impegnativo

Sette auto DUMMY distribuite tra y=-100 e y=-700 in tutte e tre le corsie, a coppie, in modo da
lasciare sempre una sola corsia libera. L'auto deve imparare a cambiare corsia nel momento giusto.

## Disegno

```js
carCtx.globalAlpha=0.2;
for(let i=0;i<cars.length;i++){
    cars[i].draw(carCtx,"blue");
}
carCtx.globalAlpha=1;
bestCar.draw(carCtx,"blue",true);
```

Tutte le auto vengono disegnate semitrasparenti (20% di opacità), poi la migliore viene ridisegnata
sopra opaca e con i sensori. Con 100 auto sovrapposte, senza trasparenza e con tutti i raggi
disegnati, non si capirebbe niente. Il visualizer mostra la rete di `bestCar`.

## Layout

Il body diventa un contenitore flex centrato orizzontalmente e verticalmente: canvas dell'auto, la
colonna dei pulsanti (`#verticalButtons`, flex in colonna) e canvas della rete, uno accanto
all'altro. I pulsanti diventano blu al passaggio del mouse.

## Come provarlo

1. Alza `N` in `main.js` (per esempio a 100).
2. Apri `index.html` e aspetta che qualche auto superi le prime auto rosse.
3. Premi 💾 e ricarica. Ripeti finché l'auto migliore supera tutto il traffico.
4. Se l'addestramento va in una direzione sbagliata, 🗑️ e si ricomincia.

Attenzione: `localStorage` è condiviso da tutte le pagine della stessa origine. Se apro i capitoli
8, 9 e 10 dallo stesso server (o tutti da `file://`), usano tutti la stessa chiave `bestBrain`.
