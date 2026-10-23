# YANN LECUN — MÓDULO TÉCNICO v3.0 - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Overview

Sub-skill técnica de Yann LeCun. Cobre CNNs, LeNet, backpropagation, JEPA (I-JEPA, V-JEPA, MC-JEPA), AMI (Advanced Machinery of Intelligence), Self-Supervised Learning (SimCLR, MAE, BYOL), Energy-Based Models (EBMs) e exemplos didáticos PyTorch.


## How It Works

> Este módulo é carregado pelo agente yann-lecun principal quando a conversa
> exige profundidade técnica. Explique as ideias atribuídas a LeCun e aos respectivos coautores; não se apresente como a pessoa real nem invente opiniões ou experiências pessoais.

---


## Convolutional Neural Networks: Do Princípio

A operação de convolução 2D discreta:

```
Saida[i][j] = sum_{m} sum_{n} Input[i+m][j+n] * Kernel[m][n]
```

O insight arquitetural **triplo** das CNNs:

**1. Local Connectivity**
```

## Antes (Fully Connected): Neurônio I -> Todos Os Pixels

params = input_size * hidden_size  # enorme

## Cnns: Neurônio -> Região Local [K X K]

params = kernel_h * kernel_w * in_channels * out_channels

## Fisicamente Motivado: Features Visuais São Locais

```

**2. Weight Sharing**
```

## Resultado: Translation Equivariance

for i in range(output_height):
    for j in range(output_width):
        output[i][j] = conv2d(input[i:i+k, j:j+k], shared_kernel)
```

**3. Hierarquia de Representações**
```

## Total: ~60,000 Parâmetros

```

O insight central: **features não precisam ser handcrafted**. Aprendem por gradiente.
Em 2012, AlexNet provou. A história e as atribuições devem ser conferidas nas publicações originais.


## Backpropagation: A Equação Central

```
delta_L = (dL/da_L) * f'(z_L)  (gradiente em relação à pré-ativação)
delta_l = (W_{l+1}^T * delta_{l+1}) * f'(z_l)
dL/dW_l = delta_l * a_{l-1}^T
dL/db_l = delta_l
```

Backprop não é algoritmo milagroso. É chain rule aplicada a funções compostas.
Implementável eficientemente em GPUs por ser sequência de multiplicações de matrizes.


## Self-Supervised Learning: Objetivos E Formalização

**Variante generativa (exemplo de reconstrução contínua, como MAE)**:
```
L_gen = E[||f_theta(x_masked) - x_target||^2]

## Para Imagens: Cada Pixel. Desperdiçador De Capacidade.

```

**Variante contrastiva (SimCLR, MoCo)**:
```
L_contrastive = -log( exp(sim(z_i, z_j) / tau) /
                      sum_k exp(sim(z_i, z_k) / tau) )

## Tau: Temperature Hyperparameter

```

SimCLR usa negativos e se beneficia de batches grandes; outros métodos empregam filas ou dispensam negativos explícitos. BYOL e JEPA têm mecanismos e objetivos diferentes.

---


## Formulação Central

JEPA: **prever em espaço de representações, não em espaço de inputs**.

```

## Dois Encoders (Ou Um Com Stop-Gradient):

s_x = f_theta(x)           # contexto encoder
s_y = f_theta_bar(y)       # target encoder (momentum de theta)

## Predictor:

s_hat_y = g_phi(s_x)       # prevê representação de y dado x

## Objetivo:

L_JEPA = ||s_y - s_hat_y||^2    # MSE no espaço de representações

## EMA participa do projeto; não garante, sozinha, evitar colapso

theta_bar <- m * theta_bar + (1-m) * theta   # m ~ 0.996
```

**Comparação conceitual de objetivos — não prova de superioridade universal**:

| Abordagem | Prevê | Capacidade gasta em | Semântica |
|-----------|-------|---------------------|-----------|
| MAE | Pixels exatos | Texturas, ruídos, irrelevantes | Custosamente |
| BERT | Tokens exatos | Detalhes lexicais | Custosamente |
| Contrastiva | Invariâncias | Negativos (batch grande) | Sim |
| **JEPA** | **Representação abstrata** | **Relações semânticas** | **Eficientemente** |


## I-JEPA: Esquema Conceitual, Não Implementação Completa

O exemplo anterior estava truncado e usava funções/variáveis não definidas. Para implementar I-JEPA, use a arquitetura e máscaras da implementação oficial revisada; não execute este esquema como PyTorch:

```text
1. Codificar a imagem completa com o target encoder sem gradientes.
2. Selecionar embeddings dos blocos-alvo com suas posições.
3. Codificar apenas patches de contexto, sem vazar conteúdo-alvo.
4. Predizer os embeddings-alvo a partir do contexto e posições-alvo.
5. Calcular a perda sobre alvos selecionados e normalizados conforme o modelo.
6. Atualizar contexto/preditor por gradiente e target por EMA.
```

Valide shapes, índices, ausência de vazamento e variância dos embeddings. EMA sozinha não prova ausência de colapso; máscaras, arquitetura e normalização importam. V-JEPA estende a predição de features a vídeo com máscaras espaço-temporais; não se reduz à previsão causal de frames futuros. Uma hierarquia de world models é uma proposta arquitetural, não uma propriedade demonstrada de todo JEPA.

## Seção Ami — Advanced Machinery Of Intelligence

Paper: "A Path Towards Autonomous Machine Intelligence" (2022)


## Os 6 Módulos Do Ami

```
+----------------------------------------------------------+
|                 SISTEMA AMI COMPLETO                      |
|                                                          |
|  +-----------+    +------------------+                  |
|  | Perceptor |    | World Model      |                  |
|  | (encoders)|    | (JEPA hierárquico)|                 |
|  +-----------+    +------------------+                  |
|        |                  |                             |
|        v                  v                             |
|  +----------+    +------------------+                   |
|  | Memory   |<-->| Cost Module      |                   |
|  | (epis,   |    | (intrínseco +    |                   |
|  |  semant) |    |  configurável)   |                   |
|  +----------+    +------------------+                   |
|                           |                             |
|                  +------------------+                   |
|                  | Actor (planner   |                   |
|                  | + executor)      |                   |
|                  +------------------+                   |
+----------------------------------------------------------+
```

**Módulo 1 — Configurator**: Configura os outros módulos para a tarefa atual.

**Módulo 2 — Perception**: Encoders sensório-motores que alimentam o world model.

**Módulo 3 — World Model** (coração do sistema):
```

## Simulação Interna: "O Que Acontece Se Eu Fizer X?"

predicted_next_state = world_model(current_state, action_X)
cost_predicted = cost_module(predicted_next_state)

## Escolhe Ação Que Minimiza O Custo

```

**Módulo 4 — Cost Module**:
```

## Dois Tipos De Custo:

E(s) = alpha * intrinsic_cost(s) + beta * task_cost(s)

## Task_Cost: Objetivo Configurável Por Tarefa/Humano

```

**Módulo 5 — Short-term Memory**: Buffer de estados, simulações, contexto imediato.

**Módulo 6 — Actor**:
- Modo reativo: ações diretas do estado atual
- Modo deliberativo: simula múltiplos futuros, escolhe mínimo custo


## AMI e LLMs: Escopo da Comparação

A proposta AMI separa percepção, modelo de mundo, custos, memória, configurador e ator. É uma arquitetura de pesquisa, não um sistema completo implementado por este documento. LLMs variam em modalidades, ferramentas, memória e planejamento; não é correto afirmar que todos são apenas texto, não possuem nenhuma representação de mundo ou não podem planejar. Predição de features também não demonstra causalidade por si só.

## Seção Ebm — Energy-Based Models

Contribuição subestimada que vai ser mais influente a longo prazo.

**O problema com probabilísticos**:
```
P(x) = exp(-E(x)) / Z
Z = integral exp(-E(x)) dx   # intratável em alta dimensão!
```

**A solução EBM**: esquecer Z. Defina E(x) onde:
- Baixa energia = configuração compatível com dados observados
- Alta energia = configuração incompatível

```python
class EnergyBasedModel(nn.Module):
    """
    EBM: F(x) = energia de x
    P(x) ~ exp(-F(x)) / Z  — mas nunca calculamos Z!
    Vantagem: sem partition function intratável.
    """
    def __init__(self, latent_dim=512):
        super().__init__()
        self.energy_net = nn.Sequential(
            nn.Linear(latent_dim, 256),
            nn.SiLU(),
            nn.Linear(256, 128),
            nn.SiLU(),
            nn.Linear(128, 1)  # escalar: energia
        )

    def energy(self, x):
        return self.energy_net(x).squeeze(-1)

    def contrastive_loss(self, x_pos, x_neg):
        """
        L = E[F(x_pos)] - E[F(x_neg)] + regularização
        Queremos: E_pos < E_neg
        """
        E_pos = self.energy(x_pos)
        E_neg = self.energy(x_neg)
        loss = E_pos.mean() - E_neg.mean()
        reg = 0.1 * (E_pos.pow(2).mean() + E_neg.pow(2).mean())
        return loss + reg

## Exemplo didático: negativos, amostragem e estabilidade ainda precisam ser definidos.

```

**JEPA como EBM no espaço de representações**:
```
E(x, y) = ||stopgrad(f_target(y)) - g_phi(f_context(x), pos_y)||^2
```

## Simclr Simplificado

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T


class ProjectionHead(nn.Module):
    """MLP que projeta representações para espaço contrastivo"""
    def __init__(self, in_dim=512, hidden_dim=256, out_dim=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_dim, out_dim)
        )

    def forward(self, x):
        return F.normalize(self.net(x), dim=-1)


class SimCLRLoss(nn.Module):
    """NT-Xent Loss (Chen et al. 2020)"""
    def __init__(self, temperature=0.5):
        super().__init__()
        self.temp = temperature

    def forward(self, z1, z2):
        """
        z1, z2: [B, D] — duas views do mesmo batch
        z1[i] e z2[i]: positive pair
        Todos outros pares: negatives
        """
        B = z1.size(0)
        z = torch.cat([z1, z2], dim=0)
        sim = torch.mm(z, z.t()) / self.temp
        mask = torch.eye(2*B, device=z.device).bool()
        sim.masked_fill_(mask, float('-inf'))
        labels = torch.arange(B, device=z.device)
        labels = torch.cat([labels + B, labels])
        return F.cross_entropy(sim, labels)


def get_ssl_augmentations(size=224):
    """
    As augmentações DEFINEM o que o modelo aprende a ser invariante.
    Rotação -> invariância a rotação.
    Crop -> invariância a posição.
    """
    return T.Compose([
        T.RandomResizedCrop(size, scale=(0.2, 1.0)),
        T.RandomHorizontalFlip(),
        T.ColorJitter(brightness=0.4, contrast=0.4, saturation=0.4, hue=0.1),
        T.RandomGrayscale(p=0.2),
        T.GaussianBlur(kernel_size=size//10*2+1, sigma=(0.1, 2.0)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
```

## Lenet-5 Original Em Pytorch Moderno

```python
class LeNet5Modern(nn.Module):
    """
    LeNet-5 (LeCun et al. 1998) reimplementada em PyTorch moderno.
    Esta é uma aproximação didática moderna, não uma reprodução exata do LeNet-5 original.
    ~60,000 parâmetros. Mesmos princípios de modelos modernos com bilhões.
    """
    def __init__(self, num_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 6, kernel_size=5, padding=2),
            nn.Tanh(),
            nn.AvgPool2d(kernel_size=2, stride=2),
            nn.Conv2d(6, 16, kernel_size=5),
            nn.Tanh(),
            nn.AvgPool2d(kernel_size=2, stride=2),
            nn.Conv2d(16, 120, kernel_size=5),
            nn.Tanh(),
        )
        self.classifier = nn.Sequential(
            nn.Linear(120, 84),
            nn.Tanh(),
            nn.Linear(84, num_classes),
        )

    def forward(self, x):
        x = self.features(x)    # [B, 120, 1, 1] para entrada [B, 1, 28, 28]
        x = x.view(x.size(0), -1)
        return self.classifier(x)
```

---

## Papers Fundamentais (Lecun)

- LeCun et al. (1998). "Gradient-Based Learning Applied to Document Recognition" — IEEE 86(11)
- LeCun et al. (2015). "Deep Learning" — Nature 521:436-444
- LeCun (2022). "A Path Towards Autonomous Machine Intelligence" — OpenReview preprint

## Jepa Papers

- Assran et al. (2023). "Self-Supervised Learning from Images with a JEPA" — [I-JEPA, 2023](https://arxiv.org/abs/2301.08243)
- Bardes et al. (2024). "Revisiting Feature Prediction for Learning Visual Representations from Video" — [2024 preprint](https://arxiv.org/abs/2404.08471)
- LeCun (2016). "Predictive Learning" — NIPS Keynote (The Cake Analogy)

## Ssl Relevantes

- He et al. (2022). "Masked Autoencoders Are Scalable Vision Learners" — CVPR 2022
- Chen et al. (2020). "A Simple Framework for Contrastive Learning" (SimCLR) — ICML 2020
- Grill et al. (2020). "Bootstrap Your Own Latent" (BYOL) — NeurIPS 2020

## Energy-Based Models

- LeCun et al. (2006). "A Tutorial on Energy-Based Learning" — tutorial, 2006 (verifique a edição bibliográfica antes de citar)
- LeCun (2021). "Energy-Based Models for Autonomous and Predictive Learning" — ICLR Keynote

Os fragmentos PyTorch exigem imports e tensores do formato indicado; não incluem dados, otimizador ou loop de treino. A perda SimCLR tem custo de memória O(B²); valide B≥2, temperatura positiva e shapes iguais. O exemplo EBM não define uma distribuição negativa nem um amostrador e não é um algoritmo de treino completo. Não faça download, execute checkpoints/código remoto ou inicie treino em GPU compartilhada sem escopo autorizado.

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `yann-lecun` - Complementary skill for enhanced analysis
- `yann-lecun-debate` - Complementary skill for enhanced analysis
- `yann-lecun-filosofia` - Complementary skill for enhanced analysis
