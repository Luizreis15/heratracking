# Modelo B2B do Operador — OBRIGATÓRIO (HERA Arquiteto)

Este arquivo corrige o erro mais comum: confundir **quem é o cliente da agência** com **quem é concorrente da agência**.

## Papéis (não inverta)

| Papel | Definição | Piloto Hera DG |
|-------|-----------|----------------|
| **Operador** | A agência que VENDE marketing | Digital Hera Marketing / Hera DG |
| **Cliente final (ICP)** | Quem CONTRATA e PAGA o operador | Clínicas e consultórios implantodontistas |
| **Público do cliente** | Quem o cliente do operador atende (pacientes) | Pacientes que buscam implante — contexto de copy, NÃO é o ICP do operador |
| **Concorrência** | Outras **agências/consultorias** que vendem marketing para o mesmo nicho | agenciacomia.com.br, agências de tráfego odonto, etc. |
| **Ticket-alvo** | Valor do **contrato B2B** (clínica → agência) | R$ 2.500–4.000/mês de retainer |

## Fase 1 — duas pesquisas distintas

### A) ICP e dores (cliente B2B)
Pesquise e descreva o **dentista/clínica que contrata agência**:
- Dores: agenda vazia de implantes, dependência de indicação, tráfego que não converte, agência anterior que falhou
- Desejos: previsibilidade de pacientes de alto valor, marketing que respeita CFO
- Linguagem: como o **dono de clínica** fala (não como paciente)

Queries sugeridas:
- `clínica implante dificuldade conseguir pacientes marketing`
- `dentista implantodontista contratar agência marketing`
- `gestão tráfego clínica odontológica reclamação`

### B) Concorrência (outras agências)
Pesquise **agências que vendem para o mesmo nicho**:
- `agência marketing implante dentário`
- `agência tráfego clínica odontológica`
- `agenciacomia` / players conhecidos do nicho

## HERA_COMPETITORS — quem entra e quem NÃO entra

**INCLUIR (mín. 3):**
- Agências de marketing digital para odonto/implantes
- Consultorias/gestores de tráfego nichados
- `ticket_estimado` = retainer/setup que a agência concorrente cobra do dentista

**NÃO INCLUIR:**
- Clínicas odontológicas (Oral Sin, clínicas de implante)
- Fabricantes/distribuidores (Neodent, Straumann como marca)
- Ticket de procedimento do **paciente final** (preço do implante na boca do paciente)

## Ticket-alvo no briefing

O campo `ticket_alvo` da operação é **sempre** o que o cliente B2B paga à agência operadora — nunca o ticket do tratamento odontológico.
