# Base Legal para Coleta de Dados de Leiloeiros

## Fundamento Legal

### Decreto nº 21.981/1932
Regulamento dos Leiloeiros Oficiais do Brasil. Estabelece que leiloeiros devem ser
matriculados nas Juntas Comerciais dos estados e que seus dados de registro são
**públicos por natureza**, sendo necessários para que o público possa verificar
a legitimidade do profissional antes de participar de um leilão.

### IN DREI nº 72/2019
Instrução Normativa do Departamento de Registro Empresarial e Integração.
Rege os procedimentos de registro de tradutores públicos e leiloeiros.
Confirma que matrícula, nome e situação cadastral são dados de acesso público.

### Lei Geral de Proteção de Dados (LGPD) — Lei nº 13.709/2018
**Art. 7º, II**: O tratamento de dados pessoais é permitido para o cumprimento
de obrigação legal ou regulatória pelo controlador.

**Art. 7º, III**: Permitido pelo poder público para execução de políticas públicas.

**Art. 13**: Dados anonimizados e dados públicos têm tratamento diferenciado.

Os dados coletados (nome, matrícula, situação, contato profissional) são
**dados públicos de registro profissional**, divulgados pelas próprias
juntas comerciais no cumprimento de obrigação legal.

### Lei de Acesso à Informação (LAI) — Lei nº 12.527/2011
Garante o direito de acesso a informações públicas. Os registros de leiloeiros
mantidos pelas juntas comerciais (órgãos públicos estaduais) são informações
de interesse público e devem ser disponibilizados.

## Responsabilidades na Coleta

### O que esta skill faz
- Acessa páginas **públicas** das juntas comerciais
- Coleta apenas informações **já disponíveis publicamente** nos sites oficiais
- Não acessa sistemas internos, áreas restritas ou APIs privadas
- Não realiza engenharia reversa de sistemas

### Boas Práticas Adotadas
1. **Rate limiting**: 2 segundos entre requests por domínio
2. **User-Agent identificável**: Header padrão de browser
3. **Retry limitado**: Máximo 3 tentativas com backoff exponencial
4. **Sem sobrecarga**: Máximo 5 scrapers simultâneos
5. **Dados sem deleção**: Histórico preservado

### Limitações
- Dados de **contato pessoal** (CPF, email, telefone residencial) tratados com
  cuidado — usados apenas para fins profissionais de identificação
- Não publicar nem transmitir dados a terceiros sem consentimento adicional
- Para uso comercial em larga escala, considerar contato formal com as juntas

## Referências

- [DREI — Tradutores e Leiloeiros](https://www.gov.br/empresas-e-negocios/pt-br/drei/tradutores-e-leiloeiros)
- [Decreto 21.981/1932](https://www.planalto.gov.br/ccivil_03/decreto/antigos/d21981.htm)
- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [LAI](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm)
