# FaceSwap Studio — Windows CPU

App locale per face swap su immagini e video, con interfaccia moderna.
Funziona su CPU — nessuna scheda NVIDIA richiesta.

## Requisiti

- **Windows 10/11**
- **Python 3.10, 3.11 o 3.12** — scarica da https://www.python.org/downloads/
  - Durante l'installazione spunta **"Add Python to PATH"**
- **ffmpeg** (opzionale, ma consigliato per i video)
  - Scarica da https://ffmpeg.org/download.html → Windows builds (es. gyan.dev)
  - Estrai e aggiungi la cartella `bin/` al PATH di Windows
- Modello **`inswapper_128.onnx`** (vedi sotto)

## Installazione modello

Il modello non è incluso per ragioni di licenza.

1. Cerca `inswapper_128.onnx` su HuggingFace (es. profilo `deepinsight/insightface`)
2. Scaricalo e mettilo nella cartella `models\`:

```
apps\face-swap\models\inswapper_128.onnx
```

## Avvio

Fai doppio click su **`run.bat`** oppure dal prompt dei comandi:

```bat
cd apps\face-swap
run.bat
```

Poi apri il browser su: **http://localhost:8000**

La prima volta installa le dipendenze automaticamente (richiede qualche minuto).

## Uso

1. **Foto sorgente** — carica la foto del viso da applicare (frontale, buona qualità)
2. **Video / Immagine** — carica il video scaricato da ComfyUI o altro portale
3. Premi **SWAP** e aspetta
4. Scarica il risultato con il pulsante verde

## Struttura

```
apps\face-swap\
├── app.py              # Backend FastAPI
├── requirements.txt    # Dipendenze Python (CPU only)
├── run.bat             # Avvio Windows
├── models\             # Metti qui inswapper_128.onnx
├── uploads\            # File caricati (pulizia automatica ogni ora)
├── outputs\            # Risultati
└── static\             # Interfaccia web
```

## Note

- L'elaborazione su CPU è più lenta rispetto alla GPU, ma funziona correttamente
- Per video lunghi aspetta: viene mostrata la progressione frame per frame
- I file temporanei vengono rimossi automaticamente dopo 1 ora
