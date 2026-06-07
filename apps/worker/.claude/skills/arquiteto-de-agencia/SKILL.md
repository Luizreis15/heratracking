---
name: arquiteto-de-agencia
description: Estrutura a operação completa de uma agência de marketing ultra-nichada a partir de um nicho e do posicionamento do operador. Produz cliente ideal (ICP), público-alvo, escada de valor e oferta, processo comercial (SDR, closer, roteiro de call, carta de vendas, oferta no pitch), posicionamento digital, tráfego, funil, jornada do cliente e checklist de implementação — consolidados em um Blueprint Operacional Mestre reutilizável. Use SEMPRE que o usuário quiser estruturar/montar uma agência, mapear cliente ideal, desenhar oferta ou escada de valor, montar processo comercial, funil, posicionamento ou tráfego para um nicho — mesmo que não diga a palavra "skill" e mesmo que peça só uma das partes.
---

# Arquiteto de Agência

Transforma a expertise de um operador em uma operação de agência pronta para rodar, para QUALQUER nicho. O nicho e o posicionamento são entrada; o método é fixo.

A magia não está em gerar texto bonito — está em **ancorar tudo em pesquisa real de mercado** e em **encadear as decisões** (o ICP define a oferta, a oferta define o comercial, o comercial define o posicionamento e o tráfego). Nunca pule a pesquisa. Nunca produza persona genérica.

## Quando rodar o protocolo inteiro vs. uma fase

- Se o usuário pede "estruture minha agência / monte a operação / blueprint completo" → rode o protocolo inteiro (Fase 0 → 6).
- Se ele pede só um pedaço ("monta só a oferta", "preciso do roteiro de call") → vá direto à fase correspondente, mas confirme se já existe um Blueprint anterior para manter coerência. Se não existir, rode rápido a Fase 0 e a pesquisa mínima da Fase 1 antes, porque sem ICP qualquer entregável vira chute.

## Input esperado (Fase 0 — Briefing)

Extraia da mensagem do usuário. Se faltar algo crítico, pergunte de forma objetiva ANTES de prosseguir (no máximo as lacunas reais — não interrogue):

- **Nicho do cliente final** (ex: "dentistas implantodontistas", "estética avançada", "escolas bilíngues").
- **Posicionamento / expertise do operador** (o que ele domina e como quer ajudar — ex: "vender mais procedimentos de implante via tráfego e marketing digital").
- **Ticket-alvo de contrato** (ex: R$2,5k–3k/mês). Se ausente, assuma uma faixa e marque como hipótese a validar.
- **Modelo de entrega** (serviço de tráfego, assessoria completa, retainer + setup, etc.).
- **Restrições** (compliance do nicho, promessas proibidas, regras de conselho de classe — ex: odontologia não pode prometer cura/resultado; advocacia tem regras de publicidade).

Confirme o briefing em 3–5 linhas e siga.

## Protocolo (fases ordenadas)

Em cada fase, LEIA o reference indicado antes de produzir. Não trabalhe de memória — os references contêm o método e os pontos de extensão do usuário.

| Fase | Entregável | Reference |
|------|-----------|-----------|
| 1 | Pesquisa de mercado + ICP + público-alvo | `references/01-pesquisa-icp.md` |
| 2 | Escada de valor + oferta principal | `references/02-escada-valor.md` |
| 3 | Processo comercial (SDR, closer, call, carta, pitch) | `references/03-comercial.md` |
| 4 | Posicionamento digital + pilares de conteúdo | `references/04-posicionamento.md` |
| 5 | Tráfego, funil, jornada, aquisição | `references/05-trafego-funil.md` |
| 6 | Consolidação no Blueprint Operacional Mestre + checklist | `references/templates/blueprint-mestre.md` |

### Fase 1 — Pesquisa e ICP (NÃO PULAR)

Antes de descrever qualquer cliente ideal, use `web_search` para mapear o mercado do nicho informado:
- Players/concorrentes do nicho e como se posicionam.
- Ofertas e tickets praticados (procure preços, pacotes, "como funciona").
- Linguagem real do público (dores e desejos em palavras deles — fóruns, reviews, grupos, comentários).
- Sazonalidade e gatilhos de compra do nicho.

Faça pelo menos 4–8 buscas distintas e combine os achados. Depois siga `references/01-pesquisa-icp.md` para destilar dores, desejos, objetivos e o filtro de perfil ideal. Se o usuário já trouxe os dados de mercado, valide-os com 1–2 buscas e prossiga.

### Fases 2 a 5

Cada uma lê seu reference, usa as saídas da fase anterior como insumo, e marca os **pontos de extensão do usuário** (`[EXTENSÃO: ...]`) onde a metodologia proprietária dele deve entrar. Onde não houver extensão preenchida, use o método-base do reference.

### Fase 6 — Consolidação

Monte o **Blueprint Operacional Mestre (BOM)** seguindo `references/templates/blueprint-mestre.md`. Esse documento é o artefato reutilizável: ele é o contrato que outras skills (posicionamento, prospecção, criativos) consomem depois. Gere também o checklist de implementação ao final.

## Formato de saída

- Documento único em markdown, em português, pronto para implementar.
- Cada seção autossuficiente: alguém da operação deve conseguir executar sem te perguntar nada.
- Concreto sobre genérico: nomes, números, scripts literais, ângulos de criativo escritos — não "defina seus pilares de conteúdo", e sim os pilares já escritos.
- Quando simular (nome fictício de agência, etc.), avise que é simulação.

## Guardrails

- **Pesquisa primeiro.** Toda afirmação sobre o mercado deve vir de busca, não de suposição. Se não pesquisou, não afirme.
- **Sem persona genérica.** "Empresário de 30-45 anos que quer crescer" é falha. ICP precisa de gatilho de compra, contexto e dor específica do nicho.
- **Coerência em cascata.** Se mudar o ICP, reavalie oferta/comercial/tráfego. Não deixe seções se contradizerem.
- **Respeite o compliance do nicho.** Aplique as restrições da Fase 0 em toda copy gerada (ex: nunca prometer cura, resultado garantido, ou violar regras de conselho).
- **Marque hipóteses.** Tudo que for suposição (ticket, volume, conversão) vai marcado como hipótese a validar, não como fato.
