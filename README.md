# API simples com Node.js, explorando escalabilidade e performance

Este repositório demonstra a construção de uma API Node.js simples utilizando primariamente os módulos nativos da plataforma (`node:cluster`, `node:http`, `node:os`). O objetivo é apresentar padrões arquiteturais avançados para ambientes de produção, garantindo uso total dos recursos da máquina e resiliência.

## Conceitos Abordados

### 1. Escalabilidade Vertical (Módulo Cluster)
Por padrão, o Node.js opera em uma única thread (Event Loop único). Para evitar o desperdício de recursos em servidores multi-core, utilizamos o módulo `cluster`.



* **Processo Primário (Master):** Atua como o orquestrador. Ele não processa rotas; sua função é criar processos filhos (Workers) e balancear a carga de requisições de rede entre eles.
* **Workers:** São instâncias independentes da aplicação rodando em paralelo. Cada Worker ocupa um núcleo do processador, multiplicando a capacidade de processamento (Throughput) da API.
* **Comunicação (IPC):** Os Workers não compartilham memória. Qualquer troca de dados com o processo Primário é feita via troca de mensagens (Inter-Process Communication).

### 2. Resiliência (Graceful Shutdown)
O encerramento abrupto de uma aplicação corta conexões ativas, gerando erros para os usuários. O **Graceful Shutdown** (Encerramento Gracioso) intercepta sinais do sistema operacional (como `SIGINT` ou `SIGTERM` enviados pelo Docker ou ao pressionar Ctrl+C) e adota o seguinte fluxo:
1. Para de aceitar novas conexões.
2. Aguarda o processamento das requisições que já estão em andamento.
3. Encerra o processo de forma segura com `process.exit(0)`.

### 3. Testes de Carga (Autocannon)
Para validar a performance da arquitetura, utilizamos o **Autocannon**, uma ferramenta de stress test escrita em Node.js, capaz de gerar uma carga massiva de requisições.

#### Executando o Teste de Carga
Com a API rodando, abra outro terminal e execute:

```bash
npm run test:server
```

**Entendendo as flags utilizadas:**
* `-c 100`: Simula 100 conexões (clientes) simultâneas.
* `-d 10`: Mantém o bombardeio de requisições por 10 segundos.
* `-l` (*latency*): Exibe a tabela detalhada de percentis de latência (ex: P99).
* `-S` (*status codes*): Exibe a contagem exata de respostas HTTP (2xx, 4xx, 5xx) para garantir que a API não está falhando silenciosamente sob pressão.
* `-W` (*warmup*): Realiza requisições de "aquecimento" antes de iniciar a contagem do teste, permitindo que o motor V8 compile e otimize o código (JIT) para refletir o desempenho real de produção.

---

## Como Executar

1. Clone o repositório.
2. Certifique-se de ter o Node.js instalado (v18+ recomendado).
3. Execute o servidor:
   ```bash
   npm run start:server-cluster
   ```
4. Será gerado um arquivo com o nome `relatorio-status.json` na raiz do projeto.