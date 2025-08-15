# 4. Collision detection

Qui la macchina smette di essere un rettangolo disegnato con le trasformazioni del canvas e diventa
un vero poligono con quattro vertici in coordinate di mondo. Questo permette di capire quando tocca
un bordo: in quel caso si "rompe", si ferma e diventa grigia.

## Cosa cambia rispetto al capitolo 3

| File | Novità |
|------|--------|
| `car.js` | `damaged`, `#createPolygon`, `#assessDamage`, il disegno passa dal poligono |
| `utils.js` | Aggiunta `polysIntersect` |

Il resto è invariato.

## Il poligono dell'auto

```js
#createPolygon(){
    const points=[];
    const rad=Math.hypot(this.width,this.height)/2;
    const alpha=Math.atan2(this.width,this.height);
    points.push({
        x:this.x-Math.sin(this.angle-alpha)*rad,
        y:this.y-Math.cos(this.angle-alpha)*rad
    });
    ...
}
```

Per trovare i 4 angoli dell'auto ruotata ho dovuto ragionare in coordinate polari rispetto al
centro:

- `rad` è metà della diagonale del rettangolo, cioè la distanza dal centro a ogni angolo. Con
  un'auto 30x50 vale circa 29.15.
- `alpha` è l'angolo tra la diagonale e l'asse verticale dell'auto. Si usa `atan2(width,height)`
  e non `atan2(height,width)` perché l'angolo è misurato dalla verticale, coerentemente con il
  resto del progetto.
- I quattro vertici stanno agli angoli `angle-alpha`, `angle+alpha`, `PI+angle-alpha` e
  `PI+angle+alpha`. I primi due sono gli angoli anteriori, gli altri due (ruotati di 180 gradi)
  quelli posteriori.

Ogni punto si ottiene con la solita formula `x - sin`, `y - cos` moltiplicata per `rad`. Il
vantaggio rispetto a `translate`/`rotate` è che adesso ho i vertici veri, su cui posso fare
calcoli geometrici.

## polysIntersect

```js
function polysIntersect(poly1, poly2){
    for(let i=0;i<poly1.length;i++){
        for(let j=0;j<poly2.length;j++){
            const touch=getIntersection(
                poly1[i],
                poly1[(i+1)%poly1.length],
                poly2[j],
                poly2[(j+1)%poly2.length]
            );
            if(touch){
                return true;
            }
        }
    }
    return false;
}
```

Confronta ogni lato del primo poligono con ogni lato del secondo, riusando `getIntersection` del
capitolo 3. Il `%` (modulo) chiude il poligono: l'ultimo vertice si collega al primo.

Cose che ho notato studiando questa funzione:

- Si esce al primo incrocio trovato (`return true`): non interessa dove si toccano, solo se si
  toccano.
- Controlla solo se i **lati** si incrociano. Un poligono completamente contenuto in un altro non
  verrebbe rilevato. Qui non succede mai, perché l'auto si muove di meno di 3 px per frame e non
  può "saltare" dentro un ostacolo senza prima toccarne il bordo.
- I bordi della strada sono "poligoni" di 2 punti. Con il modulo il segmento viene controllato due
  volte (da 0 a 1 e da 1 a 0): è uno spreco, ma il risultato è corretto e la funzione resta unica
  per tutti i casi.

## Danno

```js
update(roadBorders){
    if(!this.damaged){
        this.#move();
        this.polygon=this.#createPolygon();
        this.damaged=this.#assessDamage(roadBorders);
    }
    this.sensor.update(roadBorders);
}
```

- Movimento, poligono e controllo del danno avvengono solo se l'auto non è già danneggiata. Una
  volta rotta resta ferma per sempre: non c'è un modo per ripartire, bisogna ricaricare la pagina.
- Il sensore invece continua ad aggiornarsi anche ad auto ferma.
- `#assessDamage` scorre i bordi e restituisce `true` al primo che interseca il poligono.

## Disegno dal poligono

```js
if(this.damaged){
    ctx.fillStyle="gray";
}else{
    ctx.fillStyle="black";
}
ctx.beginPath();
ctx.moveTo(this.polygon[0].x,this.polygon[0].y);
for(let i=1;i<this.polygon.length;i++){
    ctx.lineTo(this.polygon[i].x,this.polygon[i].y);
}
ctx.fill();
```

Via `save`, `translate`, `rotate` e `restore`: l'auto si disegna direttamente collegando i suoi
vertici. Così quello che vedo a schermo è esattamente la forma usata per le collisioni, e se c'è
un errore nel calcolo del poligono me ne accorgo subito. Il colore grigio indica l'auto
danneggiata.

Una conseguenza: `draw` usa `this.polygon`, che viene creato in `update`. Funziona perché in
`animate` `update` viene sempre chiamato prima di `draw`.

## Come provarlo

Apri `index.html` e vai contro un bordo: l'auto diventa grigia e si blocca. Per ricominciare
ricarica la pagina.
