# AI Studio Image — Guia de Setup Completo

## 1. Obter API Key

1. Acesse https://aistudio.google.com/apikey
2. Clique em "Create API Key"
3. Selecione ou crie um projeto Google Cloud
4. Copie a key gerada

## 2. Configurar API Key

### Opcao A: Arquivo .env (recomendado)

Crie/edite `<skill-root>/.env`:

```
GEMINI_API_KEY=sua-api-key-principal
GEMINI_API_KEY_BACKUP_1=key-backup-1
GEMINI_API_KEY_BACKUP_2=key-backup-2
```

### Opcao B: Variavel de ambiente

```bash
# Windows CMD
set GEMINI_API_KEY=sua-api-key

# Windows PowerShell
$env:GEMINI_API_KEY="sua-api-key"

# Linux/Mac
export GEMINI_API_KEY=sua-api-key
```

## 3. Instalar Dependencias

```bash
pip install -r <skill-root>/scripts\requirements.txt
```

Ou manualmente:
```bash
pip install google-genai Pillow python-dotenv
```

## 4. Teste Rapido

```bash
# Testar se tudo funciona
python <skill-root>/scripts\generate.py --list-models

# Gerar primeira imagem
python <skill-root>/scripts\generate.py \
  --prompt "pessoa jovem sorrindo em cafeteria" \
  --mode influencer \
  --format square
```

## 5. Modelos Disponiveis

| Modelo | ID | Velocidade | Qualidade | Custo | Melhor Para |
|--------|-----|-----------|-----------|-------|-------------|
| imagen-4 | imagen-4.0-generate-001 | Medio | Alta | $0.03 | **Uso geral (recomendado)** |
| imagen-4-ultra | imagen-4.0-ultra-generate-001 | Lento | Maxima | $0.06 | Alta qualidade, impressao |
| imagen-4-fast | imagen-4.0-fast-generate-001 | Rapido | Boa | $0.02 | Volume alto, iteracao rapida |
| gemini-flash-image | gemini-2.5-flash-preview-image-generation | Rapido | Alta | Var. | Edicao, multi-turn |
| gemini-pro-image | gemini-3-pro-image-preview | Medio | Maxima+4K | Var. | Texto, referencia, 4K |

## 6. Formatos (Aspect Ratios)

| Nome | Ratio | Uso |
|------|-------|-----|
| square | 1:1 | Feed Instagram/Facebook |
| portrait-45 | 4:5 | Instagram portrait (melhor!) |
| portrait-34 | 3:4 | Pinterest, cards |
| portrait-23 | 2:3 | Posters, prints |
| widescreen | 16:9 | YouTube, banners |
| ultrawide | 21:9 | Cinematico |
| stories | 9:16 | Stories, Reels, TikTok |
| landscape-43 | 4:3 | Apresentacoes |
| landscape-32 | 3:2 | Fotografia 35mm |
| landscape-54 | 5:4 | Quase-quadrado |

## 7. Niveis de Humanizacao

| Nivel | Descricao | Quando Usar |
|-------|-----------|-------------|
| ultra | Parece celular amador | Conteudo muito casual, BTS |
| natural | Celular moderno, equilibrado | **Padrao — maioria dos casos** |
| polished | Natural mas caprichado | Conteudo profissional |
| editorial | Estilo revista | Branding, editorial |

## 8. Troubleshooting

| Erro | Causa | Solucao |
|------|-------|---------|
| API key not found | Sem key configurada | Crie .env ou set variavel |
| 403 Forbidden | Key sem permissao | Verifique permissoes no Google Cloud |
| 429 Rate Limited | Muitas requisicoes | Aguarde o prazo indicado; nao alterne credenciais para contornar quota |
| Image blocked | Conteudo restrito | Ajuste prompt, evite conteudo sensivel |
| Model not found | Modelo indisponivel | Tente outro modelo: imagen-4 |
| Empty response | Prompt muito generico | Adicione mais detalhes ao prompt |

## Limites do snapshot e autorizacao

Modelos, precos e recursos citados sao historicos e nao foram verificados no servico. Consulte https://ai.google.dev/gemini-api/docs/image-generation e a tabela de precos antes de usar. Toda chamada exige --force-paid como confirmacao de custo; nenhum modelo e garantido gratuito. O contador diario e local, aproximado, sem atomicidade, e nao limita a conta nem custos de falhas/retries ou diretorios alternativos.

Nao envie imagens pessoais, prompts confidenciais ou referencias sem autorizacao para processamento externo. Prompts e metadados sao gravados localmente: proteja a pasta de saida. Resultados sao sinteticos; realismo nao garante fidelidade, texto correto ou proveniencia fotografica. Multi-turn, thinking e grounding descritos nao sao implementados pela CLI. Nao publique automaticamente. Use um ambiente virtual e caminhos reais no lugar de <skill-root>; proteja e exclua .env do Git. Evite humanizar o prompt duas vezes: generate.py ja aplica o motor.
