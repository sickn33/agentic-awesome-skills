# Teoria da Informação Aplicada a Código e Sistemas

## 1. Entropia de Shannon em Software

### Definição Aplicada
```
H(X) = -Σ p(xᵢ) · log₂ p(xᵢ)

Interpretação em código:
- X = variável aleatória "qual estado o sistema está"
- p(xᵢ) = probabilidade de estar no estado i
- H(X) = incerteza sobre o estado → complexidade de teste

Exemplo VoicePipeline:
Estados: IDLE(70%), RECORDING(15%), TRANSCRIBING(5%),
         QUERYING_LLM(5%), SPEAKING(4%), ERROR(1%)

H = -(0.70·log₂0.70 + 0.15·log₂0.15 + 0.05·log₂0.05 +
      0.05·log₂0.05 + 0.04·log₂0.04 + 0.01·log₂0.01)
H ≈ 1.45 bits

Máximo teórico (uniform): log₂(6) ≈ 2.58 bits
Eficiência de entropia: 1.45/2.58 ≈ 56% — baixa entropia = sistema bem estruturado
```

### Entropia de Interface
```
Para uma função f: I → O
H(O) = entropia dos possíveis outputs
H(O|I) = entropia de O dado I (incerteza residual)

Informação mútua I(I;O) = H(O) - H(O|I)
  = quanto a entrada reduz a incerteza sobre a saída

Objetivo ideal: I(I;O) = H(O) → entrada determina completamente saída
  Equivale à função sendo determinística (sem nondeterminismo)

Caso problemático em Auri:
BluetoothController.connect() — output depende de estado do dispositivo BT
H(success|deviceAddress) > 0 (conexão pode falhar por razões externas)
→ sistema inerentemente não-determinístico neste ponto
→ tratamento de erro é mandatório, não opcional
```

---

## 2. Complexidade de Kolmogorov

### Definição
```
K(x) = comprimento do menor programa que produz x

Interpretação prática:
- K(código) = complexidade algorítmica intrínseca
- Código não pode ser comprimido abaixo de K(código)
- Se código tem padrões repetitivos → K(código) << |código|
  → oportunidade de abstração/refatoração
```

### Aplicação: Detectar Código Duplicado
```
Princípio: se compress(file1 + file2) << |file1| + |file2|
então file1 e file2 têm estrutura compartilhada → extrair abstração

Ferramenta prática: medir ratio de compressão
ratio = compress(código) / |código|

Limites heurísticos:
ratio < 0.3: muito código repetitivo → refatorar urgente
ratio 0.3-0.5: alguma repetição → oportunidade de refatoração
ratio > 0.5: código diverso/expressivo → aceitável
```

---

## 3. Capacidade de Canal e Throughput

### Modelo de Ruído para Sistemas BT
```
Canal de Shannon com ruído:
- Capacidade C = B · log₂(1 + S/N) bits/s
  B = bandwidth (Hz), S/N = signal-to-noise ratio

Para SCO (Bluetooth headset mic):
- B = 8kHz (narrowband) ou 16kHz (wideband)
- Qualidade de voz: S/N típico 20-30dB em ambiente silencioso
- C ≈ 8000 · log₂(101) ≈ 53,000 bits/s ≈ 53 kbps

PCM recording no app:
- 16kHz, 16-bit → 256 kbps bruto
- Compressão efetiva do canal BT SCO: 64 kbps (CVSD codec)
- Perda de qualidade: ~75% da resolução PCM
→ justifica preferência por BLE Audio sobre SCO quando disponível
```

### Pipeline de Throughput
```
Modelo de gargalo (teoria de filas em série):
Pipeline: Audio → STT → LLM → TTS

Capacidade de cada estágio:
Stage       | Rate      | Buffer   | Observação
Audio cap.  | 256 kbps  | Ring buf | Contínuo
STT online  | ~500ms/req| 1 req    | Latência dominante
LLM (API)   | ~500 tok/s| 1 req    | Throughput alto
LLM (Ollama)| ~3 tok/s  | 1 req    | GARGALO A04
TTS         | ~200 ms   | 1 req    | Rápido

Throughput do pipeline = min(taxas) = 3 tok/s (Ollama A04)
Equivale a ~15 palavras/minuto (muito lento para conversa fluida)
→ Justifica recomendação de usar OpenAI API para conversação real-time
```

---

## 4. Teoria da Codificação Aplicada a APIs

### Redundância e Robustez
```
Um protocolo com redundância tem:
- Taxa de código: r = k/n (k = bits úteis, n = bits transmitidos)
- r = 1: sem redundância (frágil)
- r < 1: com redundância (tolerante a erros)

Em APIs REST/LLM:
- Retry logic = redundância temporal: r = 1/(tentativas)
- Idempotency keys = deduplicação: garante exatamente 1 processamento
- Checksum/hash = redundância de verificação

Para Auri AuriToolExecutor:
- Sem idempotency keys: r = 1 (frágil a retries)
- Com idempotency keys: r = 1/max_retries (robusto)
```

### Compressão e Eficiência de Contexto LLM
```
LLMs têm contexto finito (ex: 128k tokens para Claude)
Cada conversa consome: Σ len(mensagem_i) tokens

Otimização de contexto como problema de compressão:
- Manter apenas informação essencial para resposta seguinte
- Sumarizar histórico para economizar tokens
- "Esquecimento" estratégico de contexto irrelevante

Para Auri:
Estratégia ótima de gerenciamento de contexto:
1. Manter últimas N trocas completas (N=5-10)
2. Sumarizar trocas mais antigas em 1-2 frases
3. Sempre manter: contexto do sistema + última mensagem do usuário
4. Custo estimado por requisição: ~200-500 tokens com esta estratégia
```

---

## 5. Teoria da Decisão Bayesiana

### Diagnóstico de Bugs como Inferência Bayesiana
```
P(bug=B | observação=O) = P(O|B) · P(B) / P(O)

Onde:
- P(B) = prior: frequência histórica deste tipo de bug
- P(O|B) = likelihood: probabilidade de ver este log/comportamento dado o bug
- P(O) = evidência: normalização

Exemplo Auri:
Bug: "pipeline trava em TRANSCRIBING"
Observação: "STT retorna resultado vazio, UI congela"

Hipóteses e priors estimados:
H1: STT result handler não atualiza state (P = 0.3)
H2: coroutine canceled antes de processar resultado (P = 0.25)
H3: exception silenciosa em emit() (P = 0.2)
H4: MainActivity lifecycle issue (P = 0.15)
H5: outra causa (P = 0.1)

Após análise do código:
P(vazio|H1) = 0.9 → P(H1|vazio) ≈ 0.52 — MAIS PROVÁVEL
P(vazio|H2) = 0.7 → P(H2|vazio) ≈ 0.34
P(vazio|H3) = 0.3 → P(H3|vazio) ≈ 0.11

Diagnóstico bayesiano: investigar H1 primeiro (52%), depois H2 (34%)
```

### Estimativa de Confiança em Análises
```
Quando Prof. Euler faz afirmações, deve incluir calibração:

"[Afirmação] — confiança: X%"

Calibração típica:
90%+: baseado em código lido + padrões bem estabelecidos
70-89%: inferência razoável + experiência com padrões similares
50-69%: hipótese plausível, necessita verificação
<50%: especulação, explicitamente marcada como tal
```

---

## 6. Complexidade de Descrição Mínima (MDL)

### Princípio MDL para Escolha de Arquitetura
```
Princípio: escolha a arquitetura que minimiza:
MDL = comprimento(modelo) + comprimento(dados|modelo)

Aplicado a padrões de design:
- MVVM: modelo compacto (3 camadas), dados bem organizados → MDL baixo
- God Class: modelo compacto (1 classe), dados confusos → MDL alto
- Microservices: modelo complexo, dados bem distribuídos → MDL médio

Para Auri MainViewModel:
Se MainViewModel tem CC > 50 e 300+ linhas:
- MDL(atual) = 1 arquivo grande = baixo overhead de modelo, alto custo de entendimento
- MDL(refatorado) = 5 ViewModels especializados = overhead de modelo, baixo custo cada
- MDL(refatorado) < MDL(atual) quando complexidade total > threshold ≈ CC 30

Recomendação: decompor quando CC total > 30 por arquivo
```

---

## 7. Teoria da Informação para Logging

### Entropia de Logs (Detectar Anomalias)
```
Log normal: mensagens seguem distribuição estacionária
- Calcular baseline: H_baseline = entropia nos primeiros N logs
- Monitor: H_current = entropia janela deslizante

Anomalia se: |H_current - H_baseline| > 2σ

Tipos de anomalias detectáveis:
1. Muitas mensagens idênticas (spamming) → entropia cai abruptamente
2. Mensagens inesperadas (novo tipo de erro) → entropia sobe
3. Sequência de eventos anormal → informação mútua entre logs muda

Para Auri FileLogWriter:
- Logar timestamps + tipo de evento + módulo
- Post-process: calcular entropia por módulo por minuto
- Threshold: alertar se H(módulo, minuto) < 0.5 ou > 3.5 bits
```

### Compressão de Logs como Detecção de Padrões
```
compress(logs) / |logs| = ratio de compressão

Baixo ratio (< 0.2): logs muito repetitivos → possível loop ou spam
Alto ratio (> 0.7): logs muito variados → possível estado errático

Sistema saudável: ratio ≈ 0.3-0.5
```
