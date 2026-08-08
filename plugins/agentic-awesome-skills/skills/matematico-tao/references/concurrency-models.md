# Modelos Formais de Concorrência para Kotlin/Android

## 1. Modelo CSP (Communicating Sequential Processes)

### Definição Formal
Um processo CSP é definido por:
```
P ::= STOP                  -- processo morto (deadlock)
    | SKIP                  -- processo terminado normalmente
    | a → P                 -- prefixo: executa evento a, depois P
    | P □ Q                 -- choice externo: o ambiente escolhe
    | P ⊓ Q                 -- choice interno: P escolhe
    | P ‖ Q                 -- composição paralela
    | P \ A                  -- ocultação do conjunto A de eventos
```

### Aplicação a Coroutines Kotlin
```kotlin
// Cada coroutine é um processo CSP
// launch { } ≡ processo concorrente
// channel.send(x) ≡ evento de saída
// channel.receive() ≡ evento de entrada

// Deadlock clássico em CSP:
// P = a → b → STOP
// Q = b → a → STOP
// P ‖ Q → cada um espera o outro primeiro → DEADLOCK

// Equivalente em Kotlin:
val channelA = Channel<Int>()
val channelB = Channel<Int>()
launch { channelA.send(1); channelB.receive() }  // P
launch { channelB.send(2); channelA.receive() }  // Q
// DEADLOCK: ambos bloqueados esperando
```

---

## 2. Modelo de Atores (Actor Model)

### Definição
Cada ator tem:
- Caixa postal (mailbox) — fila de mensagens
- Comportamento — função: Mensagem → (Estado', [Atores novos], [Mensagens])
- Estado local encapsulado — não compartilhado

### Em Kotlin com Coroutines
```kotlin
// Actor via Channel + coroutine
fun CoroutineScope.counterActor() = actor<CounterMsg> {
    var counter = 0
    for (msg in channel) {
        when (msg) {
            is IncCounter -> counter++
            is GetCounter -> msg.response.complete(counter)
        }
    }
}

// Propriedades formais:
// - Sem race conditions: estado encapsulado
// - Sem deadlocks: se mailbox unbounded e sem cycles
// - Linearizabilidade: operações parecem atômicas para clientes
```

---

## 3. Modelo de Memória Android (JMM - Java Memory Model)

### Happens-Before Relations
```
Regras do JMM que garantem visibilidade:
1. Program order: a₁ →ₚ a₂ se a₁ vem antes de a₂ no mesmo thread
2. Monitor lock: unlock(m) → lock(m)
3. Volatile: write(v) → read(v) para variável volatile
4. Thread start: start(t) → qualquer ação de t
5. Thread join: qualquer ação de t → join(t)
6. Finalizer: fim do construtor → início do finalize()
```

### StateFlow e Atomicidade
```kotlin
// MutableStateFlow usa CAS (Compare-And-Swap) internamente
// Garantia: atualização via compareAndSet é lock-free e wait-free
// Leitura de .value é sempre a versão mais recente (volatile semantics)

// CORRETO: update atômico
_state.update { currentState ->
    currentState.copy(isRecording = true)
}

// INCORRETO: read-modify-write não atômico
val current = _state.value          // read
_state.value = current.copy(...)    // write separado → race condition!
```

---

## 4. Análise de Deadlocks em Android

### Padrões de Deadlock Comuns

#### Pattern 1: runBlocking em Main Thread
```kotlin
// DEADLOCK: runBlocking bloqueia Main, coroutines precisam do Main
fun onClickButton() {
    runBlocking {  // bloqueia Main thread
        viewModel.doSomething()  // precisa de Main para updates
        // DEADLOCK!
    }
}

// CORRETO:
fun onClickButton() {
    lifecycleScope.launch {
        viewModel.doSomething()
    }
}
```

#### Pattern 2: Mutex lock reentrante (não existe em Kotlin)
```kotlin
// Kotlin Mutex é NÃO reentrante — diferente de synchronized(this)
val mutex = Mutex()

suspend fun outer() {
    mutex.withLock {
        inner()  // tenta adquirir mesmo mutex → DEADLOCK!
    }
}

suspend fun inner() {
    mutex.withLock {  // bloqueia esperando outer() liberar
        // nunca chega aqui
    }
}
```

#### Pattern 3: Channel rendezvous sem consumidor
```kotlin
val channel = Channel<Result>()  // sem buffer

launch {
    channel.send(result)  // bloqueia até alguém receber
}
// Se não há nenhum receiver ativo → coroutine fica suspensa para sempre
// Pode causar memory leak se scope sobrevive

// CORRETO: usar Channel(BUFFERED) ou garantir receiver existe
```

---

## 5. Análise de Liveness (Ausência de Starvation)

### Definição Formal
```
Starvation: processo P está em starvation se:
∃ sequência infinita de execuções onde P nunca progride,
mesmo sendo elegível para execução.

Em termos de LTL:
¬Starvation(P) ≡ GF(ready(P)) → GF(running(P))
("sempre que P está pronto, eventualmente P executa")
```

### No Contexto Android/Kotlin
```kotlin
// Fairness do scheduler de coroutines:
// - Dispatchers.Default: trabalho processor-bound, round-robin entre coroutines
// - Dispatchers.IO: thread pool expansível (default 64 threads), fair scheduling
// - Dispatchers.Main: fila FIFO no Main thread

// Risco de starvation:
// 1. Dispatchers.Default com muitas coroutines CPU-bound → novas ficam esperando
// 2. Dispatchers.IO.limitedParallelism(n) → n pequeno → fila grande

// Exemplo Auri:
// VoicePipeline roda em Main (para updates de UI)
// LLM requests rodam em IO
// Se LLM request bloquear IO thread pool → STT pode ficar esperando
```

---

## 6. Verificação de Propriedades com TLA+

### Exemplo para VoicePipeline
```tla
VARIABLES state, sttResult, llmResult

Init == state = "IDLE" /\ sttResult = "" /\ llmResult = ""

StartRecording ==
    /\ state = "IDLE"
    /\ state' = "RECORDING"
    /\ UNCHANGED <<sttResult, llmResult>>

StopAndTranscribe ==
    /\ state = "RECORDING"
    /\ state' = "TRANSCRIBING"
    /\ UNCHANGED <<sttResult, llmResult>>

STTComplete ==
    /\ state = "TRANSCRIBING"
    /\ sttResult' \in STRING \ {""}
    /\ state' = "QUERYING_LLM"
    /\ UNCHANGED <<llmResult>>

-- Propriedade de Safety:
NoDeadlock == state \in {"IDLE","RECORDING","TRANSCRIBING",
                          "QUERYING_LLM","SPEAKING","ERROR"}

-- Propriedade de Liveness:
EventuallyIdle == <>(state = "IDLE")
```

---

## 7. Race Conditions — Checklist para Kotlin/Android

### Variáveis que precisam de proteção
```kotlin
// ❌ INSEGURO: var compartilhado entre coroutines sem sincronização
var isConnected: Boolean = false
launch(Dispatchers.IO) { isConnected = true }
launch(Dispatchers.Default) { if (isConnected) ... }  // race!

// ✅ SEGURO: @Volatile para leituras/escritas simples
@Volatile var isConnected: Boolean = false

// ✅ SEGURO: AtomicBoolean para CAS operations
val isConnected = AtomicBoolean(false)
isConnected.compareAndSet(false, true)

// ✅ SEGURO: StateFlow para estado observável
private val _isConnected = MutableStateFlow(false)
val isConnected = _isConnected.asStateFlow()
```

### Padrões seguros em Kotlin coroutines
```kotlin
// Mutex para seções críticas
val mutex = Mutex()
mutex.withLock {
    // seção crítica
}

// Actor para estado mutável encapsulado
val stateActor = actor<StateMessage> { ... }

// StateFlow para estado reativo
val state = MutableStateFlow(initialState)
state.update { it.copy(...) }  // atômico via CAS
```

---

## 8. Análise de Memory Leaks em Android

### Context Leaks (mais comum)
```kotlin
// ❌ LEAK: Activity context capturada em objeto de longa vida
class LlmClient(val context: Context) {  // se context = Activity → leak
    // cliente pode sobreviver à Activity
}

// ✅ CORRETO: Application context para objetos de longa vida
class LlmClient(val context: Context) {
    init {
        // usar context.applicationContext para operações longas
    }
}
```

### Coroutine Leaks
```kotlin
// ❌ LEAK: coroutine lançada sem scope adequado
fun startRecording() {
    GlobalScope.launch {  // nunca cancelado!
        // ...
    }
}

// ✅ CORRETO: scope vinculado ao ciclo de vida
class EarLlmService : Service() {
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onDestroy() {
        serviceScope.cancel()  // cancela todas as coroutines
    }
}
```

### Listener Leaks (Bluetooth)
```kotlin
// ❌ LEAK: listener registrado mas nunca removido
audioManager.registerAudioDeviceCallback(callback, null)
// onDestroy esquece de chamar unregisterAudioDeviceCallback

// ✅ CORRETO: registro/desregistro simétrico
override fun onStart() { register(callback) }
override fun onStop() { unregister(callback) }
```
