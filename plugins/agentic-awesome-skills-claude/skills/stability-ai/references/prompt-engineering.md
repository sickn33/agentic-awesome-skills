# Prompt Engineering para Stable Diffusion

## Indice

1. [Estrutura do Prompt](#estrutura-do-prompt)
2. [Qualificadores de Qualidade](#qualificadores-de-qualidade)
3. [Iluminacao](#iluminacao)
4. [Composicao](#composicao)
5. [Estilos Artisticos](#estilos-artisticos)
6. [Negative Prompts](#negative-prompts)
7. [Tecnicas Avancadas](#tecnicas-avancadas)
8. [Exemplos por Categoria](#exemplos-por-categoria)

---

## Estrutura do Prompt

Stable Diffusion responde melhor a prompts estruturados em camadas:

```
[assunto principal], [detalhes visuais], [estilo], [iluminacao], [qualidade], [camera/tecnica]
```

Cada camada adiciona especificidade. Comece pelo assunto e va adicionando detalhes.

**Bom:**
```
a warrior princess in golden armor, intricate filigree details,
fantasy art style, dramatic rim lighting, 8k uhd, highly detailed
```

**Ruim:**
```
princess
```

## Qualificadores de Qualidade

Adicione ao final do prompt para melhorar a qualidade geral:

### Alta Qualidade
- `masterpiece, best quality`
- `highly detailed, ultra detailed`
- `8k uhd, high resolution`
- `sharp focus, crisp details`
- `professional, award-winning`

### Renderizacao
- `ray tracing, global illumination`
- `physically based rendering`
- `subsurface scattering`
- `volumetric lighting`

### Fotografia
- `shot on Canon EOS R5`
- `85mm f/1.4 lens`
- `DSLR quality`
- `film grain, Kodak Portra 400`

## Iluminacao

A iluminacao define o humor da imagem:

| Tipo | Efeito | Uso |
|------|--------|-----|
| `natural lighting` | Suave, realista | Cenas externas |
| `golden hour` | Quente, dourado | Retratos, paisagens |
| `dramatic lighting` | Alto contraste | Acao, drama |
| `rim lighting` | Contorno brilhante | Retratos artisticos |
| `studio lighting` | Uniforme, profissional | Produtos, retratos |
| `neon lighting` | Colorido, urbano | Cyberpunk, noturno |
| `candlelight` | Quente, intimo | Cenas intimistas |
| `moonlight` | Frio, misterioso | Noturno, fantasy |
| `chiaroscuro` | Extremo claro/escuro | Classico, dramatico |
| `backlit` | Silhueta, halo | Artistico |
| `volumetric fog` | Atmosferico | Fantasy, horror |

## Composicao

Controle o enquadramento e perspectiva:

| Termo | Efeito |
|-------|--------|
| `close-up portrait` | Rosto em destaque |
| `full body shot` | Corpo inteiro |
| `wide angle` | Panoramico, expansivo |
| `bird's eye view` | Vista aerea |
| `low angle` | De baixo para cima (poder) |
| `dutch angle` | Inclinado (tensao) |
| `symmetrical` | Simetria central |
| `rule of thirds` | Composicao classica |
| `depth of field` | Fundo desfocado |
| `macro` | Extremo close-up |

## Estilos Artisticos

### Por Movimento
- `art nouveau` — Curvas organicas, decorativo
- `art deco` — Geometrico, luxuoso
- `impressionism` — Pinceladas visiveis
- `surrealism` — Surrealista, onírico
- `baroque` — Dramatico, ornamentado
- `romanticism` — Emocional, natureza

### Por Midia
- `oil painting` — Classico, textural
- `watercolor` — Suave, fluido
- `pencil sketch` — Monocromatico, linhas
- `digital painting` — Limpo, detalhado
- `vector art` — Formas limpas, flat
- `pixel art` — Retro, blocky
- `3d render` — Volumetrico, realista

### Por Referencia
- `trending on artstation` — Alta qualidade digital
- `unreal engine 5` — Fotorrealista 3D
- `octane render` — Render premium
- `studio ghibli` — Anime japones classico

## Negative Prompts

Negative prompts removem elementos indesejados. A skill aplica automaticamente
por estilo, mas voce pode adicionar com `--negative-prompt`.

### Universais (bons para quase tudo)
```
low quality, blurry, distorted, deformed, ugly,
bad anatomy, bad proportions, extra limbs,
watermark, text, signature, logo
```

### Para Fotorrealismo
```
cartoon, anime, painting, illustration,
drawing, cgi, render, sketch, comic
```

### Para Arte
```
photo, photograph, realistic, 3d render,
low quality, amateur
```

### Para Rostos
```
deformed face, ugly face, bad eyes,
cross-eyed, asymmetric face, extra fingers
```

## Tecnicas Avancadas

### Peso de Palavras
Alguns modelos suportam peso entre parenteses:
```
(masterpiece:1.4), (beautiful:1.2), landscape
```
Maior peso = mais enfase nesse elemento.

### Prompt Mixing
Combine estilos para resultados unicos:
```
cyberpunk city, art nouveau architecture, neon lights,
watercolor style with digital art details
```

### Descricao Progressiva
Comece amplo, va afunilando:
```
epic landscape, mountain range at sunset,
snow-capped peaks reflecting golden light,
a lone traveler on a winding path below,
fantasy art, dramatic clouds, volumetric lighting
```

### Mood Words
Palavras que definem o tom emocional:
- `serene, peaceful, calm` — Tranquilo
- `epic, grand, majestic` — Epico
- `dark, moody, ominous` — Sombrio
- `whimsical, playful, fun` — Divertido
- `ethereal, dreamy, mystical` — Onirico
- `gritty, raw, intense` — Intenso

## Exemplos por Categoria

### Retrato Artistico
```
a young woman with flowing red hair, wind-blown,
freckles, green eyes, wearing a flower crown,
oil painting style, warm golden hour lighting,
masterpiece, highly detailed, soft focus background
```

### Paisagem Fantasy
```
floating islands above clouds, waterfalls cascading into void,
ancient temple ruins with glowing runes, bioluminescent plants,
epic fantasy landscape, dramatic sunset, volumetric god rays,
concept art, matte painting, 8k uhd
```

### Sci-Fi Ambiente
```
neon-lit cyberpunk alley in rain, holographic advertisements,
steam rising from grates, lone figure with umbrella,
blade runner aesthetic, moody atmosphere, reflections on wet ground,
cinematic composition, anamorphic lens flare
```

### Produto/Objeto
```
luxury wristwatch on marble surface,
crystal clear details, metal and glass textures,
professional product photography, studio lighting,
shallow depth of field, 4k, commercial quality
```

### Game Asset
```
crystal sword with ice enchantment,
glowing blue runes along the blade, ornate silver handle,
game item concept art, clean background,
multiple angle views, pixel-perfect details
```

### Poster/Cover
```
epic dragon perched on mountain peak, wings spread wide,
medieval castle in valley below, army approaching,
cinematic movie poster composition, dramatic sky,
bold contrast, fantasy art, highly detailed illustration
```
