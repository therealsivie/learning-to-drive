# 5. Traffic simulation

Arriva il traffico. Le auto non sono più tutte uguali: c'è quella guidata da me e ci sono auto
"stupide" che vanno solo dritto. La mia auto le vede con i sensori e si rompe se ci sbatte contro.

## Cosa cambia rispetto al capitolo 4

| File | Novità |
|------|--------|
| `controls.js` | Il costruttore riceve un tipo: `"KEYS"` o `"DUMMY"` |
| `car.js` | Nuovi parametri `controlType` e `maxSpeed`, il sensore esiste solo per le auto non DUMMY, collisioni con il traffico, colore passato a `draw` |
| `sensor.js` | I raggi leggono anche i poligoni delle auto nel traffico |
| `main.js` | Array `traffic` con un'auto DUMMY, auto principale rossa e blu |

## Tipi di controllo

```js
switch(type){
    case "KEYS":
        this.#addKeyboardListeners();
        break;
    case "DUMMY":
        this.forward=true;
        break;
}
```

- **KEYS**: come prima, si guida con le frecce.
- **DUMMY**: `forward` è sempre `true` e non c'è nessun listener. L'auto accelera e va dritto
  per sempre.

I tipi sono stringhe semplici. Nel capitolo 6 se ne aggiunge un terzo, `"AI"`, che non ha un
`case` qui: per lui `Controls` resta con tutti i flag a `false` e saranno le uscite della rete a
impostarli.

## Car con il traffico

```js
constructor(x,y,width,height,controlType,maxSpeed=3)
```

- `maxSpeed` diventa un parametro. Il traffico viene creato con `maxSpeed=2`, quindi la mia auto
  (velocità massima 3) è più veloce e deve sorpassare.
- Le auto DUMMY **non hanno il sensore**: non devono prendere decisioni, quindi non serve. Per
  questo in `update` e `draw` ci sono i controlli `if(this.sensor)`.

### Collisioni con le altre auto

```js
for(let i=0;i<traffic.length;i++){
    if(polysIntersect(this.polygon,traffic[i].polygon)){
        return true;
    }
}
```

Il lavoro fatto nel capitolo 4 ripaga subito: siccome ogni auto ha già il suo poligono, la
collisione tra due auto è la stessa `polysIntersect` usata per i bordi. Nessuna logica nuova.

## Sensore che vede il traffico

```js
for(let i=0;i<traffic.length;i++){
    const poly=traffic[i].polygon;
    for(let j=0;j<poly.length;j++){
        const value=getIntersection(
            ray[0],
            ray[1],
            poly[j],
            poly[(j+1)%poly.length]
        );
        ...
    }
}
```

Ogni raggio viene confrontato con i 4 lati di ogni auto del traffico. I punti trovati finiscono
nello stesso array `touches` dei bordi, e alla fine vince sempre il più vicino. Per il sensore un
bordo e un'auto sono la stessa cosa: un segmento da evitare.

## main.js

```js
const car=new Car(road.getLaneCenter(1),100,30,50,"KEYS");
const traffic=[
    new Car(road.getLaneCenter(1),-100,30,50,"DUMMY",2)
];
```

Un'auto DUMMY parte 200 px più avanti nella stessa corsia.

L'ordine nel loop è importante:

```js
for(let i=0;i<traffic.length;i++){
    traffic[i].update(road.borders,[]);
}
car.update(road.borders,traffic);
```

- Il traffico si aggiorna per primo, così i suoi poligoni sono già nella posizione nuova quando
  la mia auto controlla collisioni e sensori.
- Al traffico si passa un array vuoto come traffico: le auto DUMMY possono rompersi contro i bordi
  ma non tra loro né contro la mia auto. Se la tampono io mi rompo io e lei continua.

Nel disegno il traffico è rosso e la mia auto blu, grazie al nuovo parametro `color` di `draw`.
Se l'auto è danneggiata resta comunque grigia.

## Come provarlo

Apri `index.html`, accelera e prova a sorpassare l'auto rossa senza toccarla. Guarda i raggi
gialli fermarsi sul suo contorno.
