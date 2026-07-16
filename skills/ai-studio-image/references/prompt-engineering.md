# AI Studio Image — Guia Avancado de Prompt Engineering

## Principio Fundamental (da Google)

> "Describe the scene, don't just list keywords."

Paragrafos narrativos e descritivos sempre superam listas de palavras-chave
porque aproveitam a compreensao profunda de linguagem do modelo.

## Templates Oficiais

### 1. Cenas Fotorrealistas

```
A photorealistic [tipo de enquadramento] of [sujeito], [acao/expressao],
set in [ambiente]. Illuminated by [iluminacao], creating [humor/atmosfera].
Captured with [camera/lente], emphasizing [texturas/detalhes].
```

### 2. Mockups de Produto

```
High-resolution product photograph of [produto] on [superficie].
Lighting: [setup] to [proposito]. Camera angle: [angulo] showcasing [feature].
Ultra-realistic, sharp focus on [detalhe].
```

### 3. Material Educacional

```
Create a [tipo visual] explaining [conceito] styled as [referencia].
Show [elementos-chave] and [resultado]. Design resembles [exemplo],
suitable for [audiencia-alvo].
```

### 4. Texto em Imagens

```
Create a [tipo] for [marca] with text "[texto exato]" in [estilo fonte].
Design should be [estilo], with [esquema de cores].
```

**Limite para Imagen: 25 caracteres, ate 3 frases distintas.**
**Para texto complexo: use gemini-pro-image.**

## Tecnicas de Humanizacao

### A Camera de Celular

O segredo para imagens humanizadas esta na simulacao da camera de celular:

- **Profundidade de campo rasa**: Lentes pequenas criam bokeh natural
- **Ruido de sensor**: Especialmente em ambientes com pouca luz
- **Distorcao de lente**: Bordas levemente distorcidas em lente wide
- **Auto-exposicao imperfeita**: Areas levemente sobre/sub-expostas
- **Granulacao**: Textura organica que adiciona vida a imagem

### Expressoes Genuinas

Evite poses de estudio. Descreva momentos reais:

- "caught mid-laugh while talking to a friend"
- "looking down at phone with slight smile"
- "concentrating on work, didn't notice camera"
- "turning to look at something off-camera"

### Ambientes Reais

Descreva cenarios com vida:

- "coffee shop with other customers blurred in background"
- "kitchen with used cutting board and half-chopped vegetables"
- "desk with coffee stain ring, scattered pens, and post-its"
- "park bench with leaves on ground, pigeons nearby"

## Terminologia Fotografica para Prompts

### Iluminacao
- Golden hour, blue hour, overcast diffused
- Window light, mixed indoor lighting
- Backlit with lens flare
- Open shade, dappled forest light

### Lentes e Camera
- 85mm portrait lens, 35mm wide angle
- f/1.8 shallow depth of field
- Smartphone camera, iPhone quality
- Natural bokeh, creamy background

### Composicao
- Rule of thirds, off-center subject
- Leading lines, natural framing
- Negative space, breathing room
- Layered depth: foreground/midground/background

### Textura e Detalhe
- Visible skin pores and natural blemishes
- Fabric texture, material quality
- Environmental texture: wood grain, concrete, brick
- Water droplets, steam, atmospheric particles

## Niveis de Complexidade

### Prompt Simples (Bom)
```
Mulher jovem tomando cafe em cafeteria, luz natural da janela
```

### Prompt Intermediario (Melhor)
```
Young woman sitting by a large window in a cozy coffee shop, holding a
warm latte, morning sunlight creating soft shadows, genuine relaxed smile,
wearing a casual sweater, taken with smartphone
```

### Prompt Avancado (Excelente)
```
A medium close-up photograph of a young woman in her late 20s sitting at
a wooden table next to a large cafe window. She is holding a ceramic latte
cup with both hands, steam visible, looking slightly to the side with a
genuine warm smile. Soft morning sunlight streams through the window creating
natural shadows across the table. She wears a casual cream knit sweater with
slightly pushed-up sleeves. Her hair is naturally styled, not perfect.
Background shows blurred cafe interior with other customers. Taken with a
smartphone camera, natural depth of field, no professional lighting or flash.
Real skin texture visible, subtle freckles. The image feels warm, authentic,
and completely unposed — like a friend snapped this photo across the table.
```

## Erros Comuns a Evitar

1. **Prompt muito curto** → Resultado generico
2. **Lista de keywords** → Menos natural que narrativa
3. **Pedir "perfeicao"** → AI gera algo que parece artificial
4. **Esquecer o contexto** → Fundo generico/vazio
5. **Nao especificar camera** → Modelo assume DSLR profissional
6. **Pele "perfeita"** → Uncanny valley, parece falso
7. **Iluminacao de estudio** → Mata a naturalidade
8. **Poses de modelo** → Stock photo vibe

## Features Avancadas

### Multi-Turn (Gemini)
Use chat para iterar:
1. Gere a imagem base
2. "Move the coffee cup to the left"
3. "Make the lighting warmer"
4. "Add a small plant in the background"

### Reference Images (Gemini Pro)
Envie ate 14 imagens de referencia:
- 6 para objetos (alta fidelidade)
- 5 para pessoas (consistencia de personagem)

### Thinking Mode (Gemini Pro)
O modelo "pensa" antes de gerar — cria composicoes intermediarias
para refinar o resultado final. Ideal para cenas complexas.

### Search Grounding (Gemini Pro)
Gera imagens baseadas em informacoes em tempo real da web.
