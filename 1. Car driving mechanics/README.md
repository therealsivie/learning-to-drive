# 1. Car driving mechanics

Primo passo del progetto: una macchina (per ora un rettangolo nero) che si guida con le frecce
della tastiera dentro un canvas. Niente strada, niente sensori, niente rete neurale. Serve solo a
costruire la fisica di base che poi resta praticamente invariata fino all'ultimo capitolo.

## File

| File | Cosa fa |
|------|---------|
| `index.html` | Pagina con un solo `<canvas id="myCanvas">` e gli script caricati in ordine |
| `style.css` | Sfondo grigio scuro, canvas grigio chiaro centrato, `overflow:hidden` per non avere scrollbar |
| `controls.js` | Classe `Controls`: legge le frecce e tiene quattro booleani |
| `car.js` | Classe `Car`: posizione, velocità, angolo, fisica e disegno |
| `main.js` | Crea canvas e auto e fa girare il loop di animazione |

Non ci sono moduli ES né bundler: gli script sono caricati con dei semplici `<script src>` e
condividono lo scope globale. Per questo l'ordine nell'HTML conta: `controls.js` deve arrivare
prima di `car.js`, perché il costruttore di `Car` fa `new Controls()`, e `main.js` va per ultimo.

## Controls

```js
this.forward=false;
this.left=false;
this.right=false;
this.reverse=false;
```

Quattro flag, uno per freccia. Su `keydown` diventano `true`, su `keyup` tornano `false`.
Il fatto che siano stati separati e non eventi singoli è quello che permette di tenere premute
due frecce insieme (per esempio su e sinistra per curvare mentre si accelera).

Particolarità che mi ha colpito: i listener sono assegnati con `document.onkeydown = ...` e non con
`addEventListener`. Funziona, ma vuol dire che esiste un solo handler per tutta la pagina: se
creassi due `Controls`, il secondo sovrascriverebbe il primo. In questo capitolo non è un problema
(c'è una sola auto), ma è il motivo per cui più avanti solo un'auto alla volta può essere guidata
da tastiera.

Il metodo `#addKeyboardListeners` è privato (sintassi `#` delle classi ES2022), così come `#move`
in `Car`. Non è indispensabile, ma rende chiaro cosa è API pubblica e cosa no.

Dentro gli handler si usano arrow function: è importante, perché così `this` resta l'istanza di
`Controls`. Con una `function` normale `this` sarebbe `document`.

## Car

Stato iniziale:

```js
this.speed=0;
this.acceleration=0.2;
this.maxSpeed=3;
this.friction=0.05;
this.angle=0;
```

Tutti i valori sono in pixel per frame (non per secondo). Il loop non tiene conto del tempo
trascorso tra un frame e l'altro, quindi su uno schermo a 120 Hz la macchina va al doppio della
velocità rispetto a uno a 60 Hz. Per una demo va benissimo.

### La fisica in `#move()`

1. **Accelerazione**: freccia su somma `acceleration`, freccia giù la sottrae. La stessa freccia
   giù fa da freno e da retromarcia: se vai avanti rallenti, quando arrivi a zero inizi ad andare
   indietro.
2. **Limiti**: la velocità non supera `maxSpeed` in avanti e `-maxSpeed/2` in retromarcia. La
   retromarcia è volutamente più lenta, come in una macchina vera.
3. **Attrito**: a ogni frame si toglie `friction` nella direzione del moto. Se la velocità in
   valore assoluto è minore dell'attrito la si porta a zero, altrimenti la macchina oscillerebbe
   all'infinito tra +0.05 e -0.05 senza mai fermarsi davvero.
4. **Sterzo**: si gira solo se la macchina si muove (`speed!=0`), perché una macchina ferma che
   ruota su se stessa non è realistica.
5. **Spostamento** in base all'angolo.

Un dettaglio sottile: siccome l'attrito viene applicato dopo il limite di velocità, la velocità
massima reale a regime è `3 - 0.05 = 2.95`. A ogni frame si arriva a 3.15, si taglia a 3 e
l'attrito porta a 2.95.

### Il trucco del `flip`

```js
const flip=this.speed>0?1:-1;
if(this.controls.left){
    this.angle+=0.03*flip;
}
```

In retromarcia lo sterzo si inverte. Se vai indietro e giri a sinistra, il muso della macchina va
a destra, proprio come succede guidando davvero. Senza `flip` la retromarcia risulta controintuitiva.

### Perché `x -= sin` e `y -= cos`

```js
this.x-=Math.sin(this.angle)*this.speed;
this.y-=Math.cos(this.angle)*this.speed;
```

Qui l'angolo 0 corrisponde a "dritto verso l'alto" e non a "verso destra" come nella
trigonometria classica. In più nel canvas l'asse y cresce verso il basso. Mettendo insieme le due
cose:

- con `angle=0`: `sin=0`, `cos=1`, quindi x non cambia e y diminuisce (la macchina sale);
- con angolo positivo la macchina va verso sinistra, ed è per questo che la freccia sinistra
  *aumenta* l'angolo.

È la stessa convenzione che poi useranno i sensori nel capitolo 3, quindi conviene capirla bene qui.

### Disegno

```js
ctx.save();
ctx.translate(this.x,this.y);
ctx.rotate(-this.angle);
ctx.rect(-this.width/2,-this.height/2,this.width,this.height);
ctx.fill();
ctx.restore();
```

Invece di calcolare i quattro angoli ruotati a mano, si sposta l'origine del canvas sul centro
dell'auto, si ruota il sistema di riferimento e si disegna un rettangolo centrato in (0,0).
`save`/`restore` rimettono il contesto com'era, così la trasformazione non si accumula frame dopo
frame. La rotazione è `-this.angle` perché `rotate` del canvas va in senso orario, mentre il nostro
angolo positivo va verso sinistra.

## main.js e il loop

```js
function animate(){
    car.update();
    canvas.height=window.innerHeight;
    car.draw(ctx);
    requestAnimationFrame(animate);
}
```

- `requestAnimationFrame` chiama `animate` al prossimo refresh dello schermo, in genere 60 volte
  al secondo.
- `canvas.height=window.innerHeight` fa due cose insieme: adatta il canvas all'altezza della
  finestra e **pulisce il canvas**. Assegnare `width` o `height` a un canvas lo resetta
  completamente (pixel, trasformazioni, stili). È un modo compatto per evitare un `clearRect`.
- La larghezza è fissa a 200 px, la macchina parte da (100,100) ed è 30x50.

## Come provarlo

Basta aprire `index.html` nel browser e usare le frecce. La macchina può uscire dal canvas: non
c'è ancora nessun limite né una camera che la segua, arriveranno nel capitolo successivo.
