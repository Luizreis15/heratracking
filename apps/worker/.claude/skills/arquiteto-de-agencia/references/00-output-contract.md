# Contrato de Saída — HERA Arquiteto Worker

Este arquivo existe APENAS na cópia do worker. Não altere a skill original em `arquiteto-de-agencia/`.

## Obrigatório ao fim de cada fase

Emita um bloco delimitado exatamente neste formato (sem espaços extras nas tags):

```
<<<HERA_PHASE:nome_da_fase>>>
{ JSON com os dados da seção }
<<<END>>>
```

### Nomes de fase válidos

| Fase skill | nome_da_fase |
|---|---|
| 1 Pesquisa + ICP | `pesquisa` |
| 2 Oferta/escada | `oferta` |
| 3 Comercial | `comercial` |
| 4 Posicionamento | `posicionamento` |
| 5 Tráfego/funil | `trafego` |
| 6 Consolidação | `blueprint` |

### Formato JSON por fase

**pesquisa** (mercado_icp):
```json
{
  "resumo_mercado": ["bullet 1", "bullet 2"],
  "nivel_consciencia": 3,
  "icp": {
    "quem_e": "",
    "situacao_gatilho": "",
    "dores": [],
    "desejos": [],
    "objecoes": [],
    "onde_esta": []
  },
  "filtro_perfil": {
    "verde": [],
    "amarelo": [],
    "vermelho": []
  }
}
```

**oferta** (oferta_escada):
```json
{
  "equacao_valor": "",
  "escada": [],
  "oferta_principal": {
    "promessa": "",
    "mecanismo_unico": "",
    "inclusos": [],
    "garantia": "",
    "bonus": [],
    "escassez": ""
  },
  "precificacao": ""
}
```

**comercial**:
```json
{
  "funil_comercial": [],
  "sdr": { "criterios": [], "scripts": [] },
  "closer": { "roteiro_call": [], "perguntas": [] },
  "carta_vendas": "",
  "pitch_stacking": ""
}
```

**posicionamento**:
```json
{
  "statement": "",
  "narrativa": { "heroi": "", "problema": "", "guia": "", "plano": "", "cta": "" },
  "pilares_conteudo": [],
  "linha_editorial": { "mix": "", "formatos": [], "cadencia": "", "bio_cta": "" }
}
```

**trafego**:
```json
{
  "mapa_funil": [],
  "jornada_cliente": [],
  "campanhas": [],
  "angulos_criativos": [],
  "mensuracao": { "kpis": [], "tracking": "", "ritual": "" }
}
```

**blueprint**:
```json
{
  "checklist": [],
  "hipoteses": []
}
```

## Bloco de concorrentes (fase pesquisa)

**Concorrência = outras AGÊNCIAS/consultorias que vendem marketing para o mesmo ICP B2B.**
NÃO liste o ICP nem players do mercado do produto/serviço que o ICP vende.
Leia `references/00-operador-b2b.md` antes de preencher este bloco.

`ticket_estimado` = mensalidade/retainer que a **agência concorrente cobra do cliente B2B** (não o preço do produto que o ICP vende ao consumidor final).

Imediatamente após o bloco `<<<HERA_PHASE:pesquisa>>>`, emita também:

```
<<<HERA_COMPETITORS>>>
[
  {
    "nome": "",
    "url": "",
    "instagram": "",
    "posicionamento": "",
    "oferta": "",
    "ticket_estimado": "",
    "pontos_fortes": "",
    "pontos_fracos": "",
    "angulos_criativos": [],
    "fonte": ""
  }
]
<<<END>>>
```

Inclua **no mínimo 3 agências/concorrentes do operador** relevantes ao ICP do briefing.

## Regras de compliance

- Aplique integralmente o campo `restricoes` do briefing em TODA a copy gerada.
- Não assuma regras de nicho específico (saúde, jurídico, financeiro) se não estiverem no briefing.
- Marque estimativas e claims não verificados como hipótese a validar.
