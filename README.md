# learning-to-drive

Una macchina che impara a guidare da sola nel traffico, scritta in JavaScript puro: niente
framework, niente librerie di machine learning, solo Canvas 2D e qualche classe. Fisica dell'auto,
sensori, collisioni, rete neurale e algoritmo di addestramento sono tutti fatti a mano.

## Struttura

Ogni cartella è uno snapshot completo e funzionante del progetto alla fine di un capitolo. Non
dipendono l'una dall'altra: si può aprire qualsiasi cartella e lanciarla da sola. Ogni cartella ha
il suo README con la spiegazione dettagliata di cosa cambia rispetto al capitolo precedente.

| # | Cartella | Cosa aggiunge |
|---|----------|---------------|
| 1 | [Car driving mechanics](1.%20Car%20driving%20mechanics) | Un'auto guidata con le frecce: accelerazione, attrito, sterzo, retromarcia |
| 2 | [Road definition](2.%20Road%20definition) | Strada a tre corsie con bordi e una camera che segue l'auto |
| 3 | [Artificial sensors](3.%20Artificial%20sensors) | Cinque raggi che misurano la distanza dai bordi, intersezione tra segmenti |
| 4 | [Collision detection](4.%20Collision%20detection) | L'auto diventa un poligono e si rompe se tocca un bordo |
| 5 | [Traffic simulation](5.%20Traffic%20simulation) | Auto "DUMMY" che vanno dritto, da vedere con i sensori ed evitare |
| 6 | [Neural network](6.%20Neural%20network) | Rete neurale `[5,6,4]` che trasforma le letture dei sensori in comandi |
| 7 | [Visualizing neural networks](7.%20Visualizing%20neural%20networks) | Disegno della rete in tempo reale accanto alla strada |
| 8 | [Optimizing neural networks](8.%20Optimizing%20neural%20networks) | Tante auto in parallelo, mutazione, salvataggio della rete migliore |
| 9 | [Fine-tuning](9.%20Fine-tuning) | 100 auto, sprite colorato per ogni auto, traffico multicolore |
| 10 | [Curved road](10.%20Curved%20road) | Strada curva fatta di polilinee e rete senza strato nascosto |

## Il percorso in breve

1. **Fisica (cap. 1-2).** L'auto ha velocità e angolo; si muove con `x -= sin(angle)*speed` e
   `y -= cos(angle)*speed`, perché l'angolo 0 punta verso l'alto e l'asse y del canvas va verso il
   basso. La strada è definita da segmenti, e la camera è una semplice `translate` del canvas.
2. **Percezione (cap. 3-5).** I sensori lanciano raggi e calcolano l'intersezione con bordi e auto
   tramite una formula parametrica tra segmenti. La stessa funzione serve poi per le collisioni tra
   poligoni.
3. **Decisione (cap. 6-7).** Una rete neurale feed-forward con attivazione a gradino riceve
   `1 - offset` di ogni raggio e accende o spegne i quattro comandi (avanti, sinistra, destra,
   indietro). Il visualizer mostra pesi e bias in giallo (positivi) e blu (negativi).
4. **Apprendimento (cap. 8-9).** Niente backpropagation: si lanciano N auto con reti leggermente
   mutate, si salva quella che va più lontano e la si usa come base della generazione successiva.
   È un algoritmo genetico ridotto all'osso, con elitismo.
5. **Esperimento (cap. 10).** Strada sinusoidale fatta di polilinee, rete senza strato nascosto e
   mutazione più forte.

La funzione che ritorna più spesso è `lerp(A,B,t)`: serve per le corsie, per distribuire i raggi,
per i punti di intersezione, per posizionare i nodi nel visualizer e per mutare i pesi.

## Come avviarlo

Non serve installare niente. Basta aprire `index.html` di una qualsiasi cartella nel browser.

In alternativa, con un piccolo server locale dalla root del repository:

```bash
python3 -m http.server
```

e poi aprire `http://localhost:8000` e scegliere la cartella.

### Comandi

- Capitoli 1-5: si guida con le frecce della tastiera.
- Capitoli 6-7: l'auto è guidata dalla rete (casuale, non addestrata). Basta ricaricare per
  provare una rete nuova.
- Capitoli 8-9: 💾 salva la rete dell'auto migliore, 🗑️ la cancella. Il ciclo è: lascia girare,
  salva quando un'auto va lontano, ricarica, ripeti. Nel capitolo 8 conviene alzare `N` in
  `main.js` (nel 9 è già 100).
- Capitolo 10: `save()` e `discard()` si lanciano dalla console del browser.

### Attenzione al localStorage

La rete salvata finisce in `localStorage` con la chiave `bestBrain`, che è condivisa da tutte le
pagine della stessa origine. Se i capitoli 8, 9 e 10 vengono aperti dallo stesso server (o tutti
da `file://`), si leggono a vicenda la rete salvata. Siccome il capitolo 10 usa una rete `[5,4]` e
gli altri `[5,6,4]`, quando si passa da uno all'altro conviene fare prima un `discard()`.

## Note tecniche

- JavaScript vanilla con le classi ES2022 e i metodi privati `#`. Nessun modulo: gli script sono
  caricati in ordine nell'HTML e condividono lo scope globale.
- Tutte le grandezze sono per frame, non per secondo: su uno schermo a 120 Hz la simulazione va
  più veloce che su uno a 60 Hz.
- I file `visualizer.js` erano salvati in UTF-16; li ho convertiti in UTF-8 per poterli vedere
  come testo su git, senza modificare il codice.
