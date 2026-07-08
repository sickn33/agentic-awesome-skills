# Auri/EarLLM — Contexto Completo para Análise Matemática

## Visão Geral do Sistema

**Projeto**: Auri v2.5.0 (EarLLM One)
**Localização**: `C:\Users\renat\earbudllm`
**Tipo**: Android app multi-módulo (Kotlin + Jetpack Compose)
**Função**: Pipeline de voz → STT → LLM → TTS via Bluetooth earbuds

---

## Arquitetura de Módulos

```
app (orquestrador)
├── core-logging (cross-cutting: logging, métricas)
├── bluetooth (conectividade BT — A2DP, HFP, SCO)
├── audio (captura PCM, roteamento, botões hardware)
├── voice (STT, TTS, pipeline de voz)
├── llm (clients: OpenAI, Claude, Gemini, Ollama, RPA)
└── integrations (Gmail OAuth2)
```

### Grafo de Dependências (formal)
```
G = (V, E) onde:
V = {app, bluetooth, audio, voice, llm, integrations, core-logging}
E = {
  app → bluetooth,
  app → audio,
  app → voice,
  app → llm,
  app → integrations,
  app → core-logging,
  audio → core-logging,
  voice → audio,
  voice → core-logging,
  llm → core-logging,
  integrations → core-logging
}

Propriedades:
- Acíclico: SIM (DAG) ✅
- core-logging: nó sink (grau de saída = 0)
- app: nó source (grau de entrada = 0 de outros módulos)
- Componentes fortemente conectados: cada módulo é seu próprio SCC (DAG)
```

---

## Máquina de Estados Principal

### VoicePipeline States
```
S = {IDLE, RECORDING, TRANSCRIBING, QUERYING_LLM, SPEAKING, ERROR}

Transições δ:
IDLE + startRecording → RECORDING
RECORDING + stopRecording → TRANSCRIBING
RECORDING + error → ERROR
TRANSCRIBING + sttResult(text) → QUERYING_LLM
TRANSCRIBING + sttResult(empty) → ERROR (auto-reset em 3s → IDLE)
TRANSCRIBING + error → ERROR
QUERYING_LLM + llmResult → SPEAKING
QUERYING_LLM + error → ERROR
SPEAKING + ttsComplete → IDLE
ERROR + timeout(3s) → IDLE
ERROR + userReset → IDLE

Propriedades verificadas:
✅ Sem estados inalcançáveis (todos estados têm caminho de IDLE)
✅ Sem deadlocks (todos estados têm transição de saída)
✅ Auto-healing: ERROR sempre resolve para IDLE
⚠️  SPEAKING não tem cancel — bloqueio possível se TTS travar
```

### BluetoothController States
```
S = {DISCONNECTED, SCANNING, CONNECTING, CONNECTED, SCO_CONNECTING, SCO_ACTIVE, ERROR}

Prioridade de fonte de áudio (função monotônica):
priority: AudioSource → ℤ
  BLE_AUDIO  → 5
  BT_SCO     → 4
  USB_MIC    → 3
  WIRED      → 2
  BUILTIN    → 1

Invariante: currentSource = argmax{priority(s) | s ∈ availableSources}
```

---

## Análise de Concorrência

### Coroutine Scopes
```
viewModelScope (MainViewModel):
- Lifecyle: vinculado ao ViewModel, cancelado onCleared()
- Dispatchers: Main para UI, IO para rede/disk, Default para CPU

Padrões identificados:
- StateFlow<VoicePipelineState> como bus de eventos centralizdo
- collect { } em LaunchedEffect nas telas Compose
- MutableStateFlow com atomic updates (thread-safe)

Riscos potenciais:
- SharedFlow sem replay: eventos podem ser perdidos se collector lento
- launch { } sem supervisorScope: falha cancela todos os filhos
- withContext(Dispatchers.IO) aninhado: overhead desnecessário de contexto
```

### AuriToolExecutor — Análise de Idempotência
```
9 ferramentas:
1. alarm    — NÃO idempotente (cria alarmes duplicados)
2. calendar — NÃO idempotente (cria eventos duplicados)
3. reminder — NÃO idempotente
4. time     — Idempotente (read-only)
5. email    — NÃO idempotente (pode enviar duplicado)
6. draft    — Quase idempotente (draft com mesmo conteúdo)
7. call     — NÃO idempotente (inicia chamada)
8. whatsapp — NÃO idempotente
9. app      — Idempotente se app já aberto

Risco: sem deduplicação, retry logic pode causar ações duplas
Recomendação: implementar idempotency keys por ferramenta
```

---

## Análise de Performance

### Pipeline de Latência (E2E medido no A04)
```
Componente          Latência típica    Modelo
──────────────────────────────────────────────
Audio capture       ~100ms             determinístico
STT (online)        200-800ms          distribuição log-normal
STT (Vosk offline)  N/A (stub)         —
LLM (Ollama A04)    10-15s             alta variância (~3 tok/s)
LLM (OpenAI API)    1-3s               distribuição gamma
TTS                 50-200ms           determinístico

E2E latência total (Ollama A04): μ ≈ 12s, σ ≈ 3s
E2E latência total (OpenAI): μ ≈ 2.5s, σ ≈ 0.8s

Modelo de fila M/M/1 para pipeline LLM:
- λ (taxa de requisições): ~0.1 req/s (1 a cada 10s em uso típico)
- μ (taxa de serviço Ollama A04): ~0.08 req/s
- ρ = λ/μ = 1.25 > 1 → INSTÁVEL sob carga contínua!
- ρ (OpenAI) ≈ 0.3 → ESTÁVEL com buffer adequado
```

### Consumo de Memória
```
Estimativa por componente:
- App base: ~50MB
- Bluetooth stack: ~5MB
- Audio buffer (PCM, 16kHz, 16-bit, 5s): ~160KB
- STT model (Android): ~2MB (online) / ~50MB (Vosk)
- LLM context (OpenAI/Claude): apenas tokens (rede)
- LLM local (llama3.2:1b): ~800MB RAM

Total com Ollama local: ~850MB → crítico em dispositivos 2GB RAM
```

---

## Análise de Segurança

### Superfície de Ataque
```
1. API Keys: EncryptedSharedPreferences (AES-256-GCM) ✅
2. Bluetooth SCO: comunicação de voz sem criptografia (design limitation) ⚠️
3. HTTP cleartext (Ollama localhost): permitido explicitamente via network_security_config ⚠️
4. LAN access: cleartext permitido para 192.168.*.* — risco em redes públicas ❌
5. Gmail OAuth2 tokens: persistidos em token store — verificar criptografia
6. Audio recording: exige permissão RECORD_AUDIO — verificar escopo temporal
```

---

## Pontos de Alta Complexidade

### LlmClientFactory (complexidade ciclomática alta)
```
Função: factory(provider, context) → LlmClient
Branches:
- 11 providers (OPENAI, CLAUDE, GEMINI, AI_STUDIO, OLLAMA, STUB + 5 RPA variants)
- Context nullable vs non-null
- Config (base_url, model) presente vs ausente

Complexidade ciclomática estimada: CC ≈ 15-20
Recomendação: refatorar para Strategy + Registry pattern
```

### MainViewModel (God Object potential)
```
Responsabilidades identificadas:
1. Orquestração de VoicePipeline
2. Gerenciamento de LLM provider selection
3. Estado de Bluetooth
4. Histórico de conversas
5. Tool execution proxy
6. Settings sync

Violação do SRP (Single Responsibility Principle)
Solução: decomposição em sub-ViewModels especializados
```

---

## Invariantes Globais do Sistema

```
GLOBAL-INV-01:
  Em todo momento, no máximo 1 foreground service ativo para recording
  Formalmente: |{s ∈ Services | s.isRecording = true}| ≤ 1

GLOBAL-INV-02:
  API key nunca é transmitida em logs
  Formalmente: ∀ log entry l: ¬contains(l.text, apiKey)

GLOBAL-INV-03:
  SCO connection existe sse isRecording = true E source = BT_SCO
  Formalmente: scoActive ↔ (isRecording ∧ audioSource = BT_SCO)

GLOBAL-INV-04:
  Pipeline sempre em estado definido (sem estado undefined/null)
  Formalmente: pipelineState ∈ S (definido acima, sem null)
```
