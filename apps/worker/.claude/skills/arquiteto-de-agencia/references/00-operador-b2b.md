# Modelo B2B do Operador — OBRIGATÓRIO (HERA Arquiteto)

Este arquivo corrige o erro mais comum: confundir **quem é o cliente da agência** com **quem é concorrente da agência**.

## Papéis (não inverta)

| Papel | Definição | Vem de |
|-------|-----------|--------|
| **Operador** | A agência que VENDE marketing | `posicionamento` do briefing |
| **Cliente B2B (ICP)** | Quem CONTRATA e PAGA o operador | `nicho` do briefing |
| **Público do cliente** | Quem o cliente do operador atende no dia a dia | Contexto de copy do ICP — NÃO é o ICP do operador |
| **Concorrência** | Outras **agências/consultorias** que vendem marketing para o mesmo ICP | `HERA_COMPETITORS` |
| **Ticket-alvo** | Valor do **contrato B2B** (cliente → agência) | `ticket_alvo` do briefing |

## Fase 1 — duas pesquisas distintas

### A) ICP e dores (cliente B2B)
Pesquise e descreva quem **contrata a agência** (campo `nicho`):
- Dores de captação, previsibilidade, ROI, frustração com fornecedores anteriores
- Desejos e critérios de decisão ao contratar agência
- Linguagem que o decisor B2B usa

Adapte as buscas ao nicho informado no briefing — não use exemplos de outro vertical.

### B) Concorrência (outras agências)
Pesquise **agências/consultorias que vendem para o mesmo ICP**:
- Players conhecidos do nicho B2B de marketing
- Gestores de tráfego/consultorias nichadas
- Seeds manuais do operador

## HERA_COMPETITORS — quem entra e quem NÃO entra

**INCLUIR (mín. 3):**
- Agências de marketing digital para o ICP do briefing
- Consultorias/gestores de tráfego nichados
- `ticket_estimado` = retainer/setup que a agência concorrente cobra do cliente B2B

**NÃO INCLUIR:**
- O ICP em si (clientes potenciais do operador)
- Empresas do mercado do produto/serviço que o ICP vende (a menos que também vendam marketing para o mesmo ICP)
- Fabricantes, redes ou players que não são agências/consultorias de marketing

## Compliance

Aplique **sempre** o campo `restricoes` do briefing. Não assuma regras de um nicho específico (saúde, jurídico, financeiro) se não estiverem no briefing.
