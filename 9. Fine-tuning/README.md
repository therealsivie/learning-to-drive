# 9. Fine-tuning

La versione finale della prima fase del corso. La logica è quella del capitolo 8 con `N=100`
auto, ma la parte grafica fa un salto: al posto dei rettangoli c'è l'immagine di una macchina,
colorata in modo diverso per ogni auto del traffico.

## Cosa cambia rispetto al capitolo 8

| File | Novità |
|------|--------|
| `car.png` | Nuovo, sprite della macchina (75x117) |
| `car.js` | Il colore passa al costruttore, maschera colorata, disegno con immagine e `multiply` |
| `utils.js` | Aggiunta `getRandomColor` |
| `main.js` | `N=100`, il traffico riceve colori casuali, `draw` senza colore |

## L'immagine colorata: il trucco della maschera

Volevo capire bene come si ottiene un'auto di qualsiasi colore partendo da un solo PNG. Succede in
due tempi.

### 1. Nel costruttore: creare la maschera

```js
this.mask=document.createElement("canvas");
this.mask.width=width;
this.mask.height=height;

const maskCtx=this.mask.getContext("2d");
this.img.onload=()=>{
    maskCtx.fillStyle=color;
    maskCtx.rect(0,0,this.width,this.height);
    maskCtx.fill();

    maskCtx.globalCompositeOperation="destination-atop";
    maskCtx.drawImage(this.img,0,0,this.width,this.height);
}
```

- Ogni auto ha un suo canvas fuori schermo grande quanto lei (30x50), mai aggiunto alla pagina.
- Si riempie tutto il rettangolo con il colore dell'auto.
- Con `destination-atop` il colore già presente (la "destinazione") resta **solo dove l'immagine
  nuova è opaca**. Quindi il risultato è una sagoma della macchina piena di colore, con lo sfondo
  trasparente.
- Tutto avviene in `onload`, perché prima che l'immagine sia caricata non si può usare come forma.

### 2. In draw: sovrapporre maschera e immagine

```js
ctx.save();
ctx.translate(this.x,this.y);
ctx.rotate(-this.angle);
if(!this.damaged){
    ctx.drawImage(this.mask, -this.width/2, -this.height/2, this.width, this.height);
    ctx.globalCompositeOperation="multiply";
}
ctx.drawImage(this.img, -this.width/2, -this.height/2, this.width, this.height);
ctx.restore();
```

- Prima si disegna la sagoma colorata.
- Poi, con `multiply`, si disegna sopra il PNG originale. `multiply` moltiplica i colori: dove il
  PNG è bianco resta il colore della maschera, dove è scuro (finestrini, ombre, contorni) il
  risultato si scurisce. Così la macchina è colorata ma mantiene i dettagli del disegno.
- Se l'auto è danneggiata si salta la maschera e si disegna solo il PNG nella sua tinta originale:
  è il nuovo modo di mostrare che si è rotta, al posto del grigio.
- `restore()` riporta anche `globalCompositeOperation` al valore normale, quindi la modalità
  `multiply` non "contamina" il resto del disegno.

Torna anche `translate` + `rotate`, abbandonati nel capitolo 4. Per disegnare un'immagine ruotata è
la soluzione più semplice. Il poligono resta comunque calcolato ad ogni frame per collisioni e
sensori, solo che non viene più disegnato.

Ho notato che l'immagine è 75x117 ma viene disegnata 30x50: `drawImage` la scala, deformandola di
pochissimo perché le proporzioni sono quasi le stesse (0.64 contro 0.6).

## Colori casuali

```js
function getRandomColor(){
    const hue=290+Math.random()*260;
    return "hsl("+hue+", 100%, 60%)";
}
```

La tonalità parte da 290 e arriva fino a 550. Siccome in HSL la tonalità è un angolo, 550 equivale
a 190: quindi i colori coprono da 290 a 360 e da 0 a 190. Il buco lasciato fuori è tra 190 e 290,
cioè **i blu**. Il motivo è che le auto AI sono blu (colore di default nel costruttore), e così il
traffico non si confonde mai con loro. Mi è sembrato un dettaglio molto curato.

## Il resto

- `draw(ctx,drawSensor=false)`: il colore non si passa più a ogni frame ma è una proprietà
  dell'auto, fissata nel costruttore.
- `N=100`: cento auto in parallelo, ognuna con 5 raggi che controllano 2 bordi e 7 auto (28 lati)
  a ogni frame. Sono circa 15.000 calcoli di intersezione per frame, e JavaScript li regge senza
  problemi.
- Le auto danneggiate continuano ad aggiornare il sensore e a far girare la rete anche se sono
  ferme: è lavoro sprecato, ma non influisce sul risultato.
- Il cervello resta `[5,6,4]` e la mutazione resta a 0.1.

## Come provarlo

Apri `index.html` e usa 💾 e 🗑️ come nel capitolo 8. Con 100 auto bastano poche generazioni per
avere un'auto che supera tutto il traffico.

Una nota: se apro la pagina direttamente da `file://` il PNG viene caricato e disegnato senza
problemi, perché si usa solo `drawImage` e non si leggono mai i pixel del canvas (`getImageData`
darebbe un errore di sicurezza).
