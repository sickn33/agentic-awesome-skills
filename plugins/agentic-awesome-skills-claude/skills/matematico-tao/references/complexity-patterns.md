# Padrões de Complexidade em Android/Kotlin

## 1. Complexidade Ciclomática (McCabe)

### Definição
```
CC(G) = E - N + 2P onde:
E = número de arestas do grafo de fluxo de controle
N = número de nós
P = número de componentes conectados (geralmente 1)

Equivalente prático:
CC = 1 + número de pontos de decisão (if, when, for, while, &&, ||, catch)

Limites recomendados:
CC ≤ 5: simples, fácil de testar
CC 6-10: moderado, testável
CC 11-20: complexo, difícil de testar — refatorar
CC > 20: muito complexo — dividir obrigatoriamente
```

### Padrões Android com Alta CC

#### LlmClientFactory (estimado CC ≈ 18)
```kotlin
fun create(provider: LlmProvider, context: Context?): LlmClient {
    return when (provider) {           // +10 (11 cases)
        OPENAI -> {
            val key = store.get("openai")
            if (key != null) {         // +1
                OpenAiClient(key)
            } else {
                throw ConfigError()
            }
        }
        CLAUDE -> {
            val key = store.get("claude")
            if (key != null) {         // +1
                ClaudeClient(key)
            } else {
                throw ConfigError()
            }
        }
        // ... mais 9 cases similares
        RPA_CHATGPT -> {
            if (context != null) {     // +1
                RpaClient(context, CHATGPT)
            } else {
                throw ContextRequiredError()
            }
        }
    }
}
// CC ≈ 1 + 10 + 3 = 14 — deve ser refatorado
```

**Refatoração com Strategy + Registry (CC ≈ 2):**
```kotlin
typealias ClientFactory = (config: ProviderConfig) -> LlmClient

val registry: Map<LlmProvider, ClientFactory> = mapOf(
    OPENAI to { config -> OpenAiClient(config.requireKey()) },
    CLAUDE to { config -> ClaudeClient(config.requireKey()) },
    // ...
)

fun create(provider: LlmProvider, config: ProviderConfig): LlmClient {
    return registry[provider]?.invoke(config)    // CC = 1
        ?: throw UnsupportedProviderError(provider)  // CC + 1 = 2
}
```

---

## 2. Complexidade Cognitiva (Sonar)

### Diferença de McCabe
```
Complexidade ciclomática conta decisões.
Complexidade cognitiva mede o esforço humano de leitura.

Penalidades extras:
- Estruturas aninhadas: cada nível de nesting adiciona +1
- Breaks de fluxo (break, continue, goto): +1
- Sequências de expressões booleanas: +1 por operador diferente
```

### Exemplo: HomeScreen.kt
```kotlin
// Potencial complexidade cognitiva alta em Compose:
@Composable
fun HomeScreen(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    when (state.pipelineState) {      // +1
        IDLE -> { ... }
        RECORDING -> {
            if (state.isBluetoothConnected) {  // +2 (nesting)
                if (state.audioSource == SCO) {   // +3 (nesting)
                    ScoRecordingUI()
                } else {
                    GenericRecordingUI()
                }
            } else {
                PhoneMicUI()
            }
        }
        // ...
    }
}
// Cognitiva estimada: ~15-25 dependendo da implementação completa
```

---

## 3. Análise de Acoplamento

### Métricas de Acoplamento
```
Ca (Afferent Coupling): quantos módulos dependem de X
  Alto Ca → X é muito usado → difícil de mudar
  core-logging: Ca = 6 (todos os módulos) → MUITO ACOPLADO

Ce (Efferent Coupling): quantos módulos X depende
  Alto Ce → X depende de muita coisa → frágil
  app: Ce = 6 → alto, mas esperado para orchestrator

Instabilidade I = Ce / (Ca + Ce)
  I → 0: módulo estável (difícil de mudar)
  I → 1: módulo instável (fácil de mudar)

Para módulos Auri:
  core-logging: Ca=6, Ce=0 → I = 0 (ESTÁVEL)
  app: Ca=0, Ce=6 → I = 1 (INSTÁVEL — esperado: é a camada mais volátil)
  llm: Ca=1(app), Ce=1(core-logging) → I = 0.5 (EQUILIBRADO)
```

### Lei de Dependência Estável (Martin)
```
Regra: módulos devem depender apenas de módulos mais estáveis que eles
I(dependente) > I(dependência) para cada aresta

Verificação Auri:
app(I=1) → bluetooth(I≈0.5) ✅ (1 > 0.5)
app(I=1) → core-logging(I=0) ✅ (1 > 0)
voice(I≈0.5) → audio(I≈0.3) ✅ (0.5 > 0.3)
voice(I≈0.5) → core-logging(I=0) ✅ (0.5 > 0)
```

---

## 4. Complexidade de Interfaces Android

### Activity/Fragment Lifecycle Complexity
```
Android Activity lifecycle tem 7 estados principais:
CREATED → STARTED → RESUMED → PAUSED → STOPPED → DESTROYED (+ RESTARTED)

Transições válidas formalmente:
T = {
  CREATED → STARTED (onStart),
  STARTED → RESUMED (onResume),
  RESUMED → PAUSED (onPause),
  PAUSED → STOPPED (onStop) ou PAUSED → RESUMED (onResume),
  STOPPED → DESTROYED (onDestroy) ou STOPPED → CREATED (onRestart),
  CREATED → DESTROYED (onDestroy — sem start, raro)
}

Armadilha: código em onResume assume estado "limpo" mas pode ser chamado
após onPause sem passar por onCreate → estado parcialmente inicializado
```

### Jetpack Compose Recomposition
```
Complexidade de recomposição:
- Toda chamada @Composable pode ser recomposta a qualquer momento
- Leitura de State<T> dentro de @Composable cria subscrição automática
- Recomposição é inteligente: só recompõe o subárvore mínimo necessário

Problemas comuns:
1. Lambda capture de variáveis mutáveis → recomposição inesperada
2. remember { } sem key → não recomputa quando dependências mudam
3. derivedStateOf { } ausente → recalcula em toda recomposição

Métrica: número de reads de State por @Composable
> 5 reads por composable → considerar dividir em menores
```

---

## 5. Análise de Complexidade de Algoritmos Específicos

### Tap Detection (HeadsetButtonController)
```
Problema: detectar single-tap, double-tap, long-press
Input: sequência de eventos key_down, key_up com timestamps

Algoritmo atual (estimado):
- Janela de 350ms para double-tap detection
- Threshold de 600ms para long-press
- Implementação: coroutine com delay + cancel

Complexidade:
- Tempo: O(1) por evento (delay é assíncrono)
- Espaço: O(1) estado (apenas timestamps)
- Latência: 350ms para confirmar single-tap (inevitável)

Alternativa: máquina de estados explícita
Estado = (tapCount: Int, lastTapTime: Long, isLongPressing: Boolean)
Mais testável e mais formal que delays aninhados
```

### Audio Priority Selection (AudioRouteController)
```
Problema: dado conjunto de fontes disponíveis, selecionar melhor
Entrada: Set<AudioSource> (tamanho tipicamente 1-4)

Algoritmo: max(availableSources, key=priority)
Complexidade: O(n) onde n = |availableSources| ≤ 5
Otimização: O(1) possível com ordenação antecipada (Set ordenado)

Invariante de corretude:
∀ s ∈ availableSources: priority(selectedSource) ≥ priority(s)
```

### LLM Response Processing
```
Problema: processar streaming response de LLM
Entrada: Stream<String> de tokens

Algoritmos possíveis:
1. Buffer completo: acumula tudo, processa de uma vez
   - Latência: O(total_tokens / bandwidth) — alta
   - Memória: O(total_tokens) — linear

2. Streaming parcial (implementar): acumula até sentença completa
   - Detectar fim de sentença: regex \.|\!|\?
   - Latência percebida: O(primeira_sentença / bandwidth) — baixa
   - Complexidade: O(1) memória por sentença processada

Recomendação: streaming parcial para melhor UX
Threshold de sentença: ~15-20 palavras ou primeiro ., !, ?
```

---

## 6. Big-O das Operações Principais

```
Operação                              | Complexidade | Notas
──────────────────────────────────────┼──────────────┼─────────────────────
Bluetooth scan                        | O(1) t-médio | Timeout-bounded
SCO connect                           | O(1)         | Fixed protocol
Audio route selection                 | O(n)         | n=sources (~5)
STT (SpeechRecognizer)               | O(w²) pior   | w=palavras (HMM)
LLM inference (local Ollama)         | O(t·d²)      | t=tokens, d=dimensão
LLM inference (API)                   | O(t) perceb. | Latência de rede
TTS synthesis                         | O(c)         | c=caracteres
Tool execution (e.g., set alarm)      | O(1)         | Android API call
Gmail search                          | O(n log n)   | n=emails (server-side)
StateFlow update (CAS)                | O(1) amort.  | Lock-free
Coroutine launch                      | O(1)         | ~1μs overhead
```

---

## 7. Análise de Entropia de Código

### Definição de Entropia de Shannon para Sistemas de Software
```
Complexidade de Halstead:
η₁ = número de operadores distintos
η₂ = número de operandos distintos
N₁ = total de ocorrências de operadores
N₂ = total de ocorrências de operandos

Volume: V = (N₁+N₂) · log₂(η₁+η₂)
Dificuldade: D = (η₁/2) · (N₂/η₂)
Esforço: E = D · V

Interpretar:
- Volume alto → arquivo grande/complexo
- Dificuldade alta → muitos operadores únicos vs. repetição
- Esforço alto → difícil de entender

Para arquivos Kotlin médios:
MainViewModel.kt: estimado V ≈ 5000-10000, D ≈ 15-25 — COMPLEXO
LlmProvider.kt: estimado V ≈ 500-1000, D ≈ 5-10 — SIMPLES
```
