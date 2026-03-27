## Descrição

<!-- O que este PR faz? Por que essa mudança é necessária? -->

## Tipo de Mudança

- [ ] Bug fix (correção que não quebra funcionalidade existente)
- [ ] Feature (nova funcionalidade)
- [ ] Breaking change (correção/feature que quebraria funcionalidade existente)
- [ ] Refactoring (sem mudança de comportamento)
- [ ] Documentação
- [ ] CI/CD / Infraestrutura

## Checklist

### Obrigatório
- [ ] Testes passam (`npm run test`)
- [ ] Lint passa (`npm run lint`)
- [ ] TypeScript compila sem erros (`npx tsc --noEmit`)
- [ ] Build funciona (`npm run build`)

### Segurança
- [ ] Nenhum secret/credencial hardcoded
- [ ] Inputs validados no backend (Edge Functions)
- [ ] RLS policies revisadas (se alterou schema)
- [ ] Sem `console.log` em código de produção

### Qualidade
- [ ] Testes adicionados/atualizados para mudanças
- [ ] Sem `: any` desnecessário
- [ ] Strings de UI usam i18n (`useTranslation`)
- [ ] Componentes acessíveis (aria-labels, keyboard nav)

## Screenshots (se aplicável)

## Como Testar

1. ...
2. ...
3. ...
