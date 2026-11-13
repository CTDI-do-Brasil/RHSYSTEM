# Controle de Funcionários Temporários (CFT) - Versão 2.0

Sistema completo para gestão de funcionários temporários desde a admissão até o encerramento do contrato, incluindo importação nativa de planilhas Excel, inclusão manual de armários e dados cadastrais, benefícios (VR/VT), controle de cartões de acesso, SST e alertas automáticos.

---

## 🎯 Principais Atualizações (Novos Recursos Atendidos)

### 1. Inclusão Manual Livre
Todos os seguintes campos agora contam com campos abertos com sugestões inteligentes (`datalist`), permitindo digitar livremente qualquer valor manual sem ficar restrito a listas pré-fixadas:
- **Agência de Trabalho**
- **Operação**
- **Setor**
- **Função / Cargo**
- **Gestor Responsável**
- **Turno**
- **Nº do Armário**

---

### 2. Importação de Planilha Excel (`.xlsx`, `.xls` e `.csv`)
O sistema agora conta com um módulo completo de importação de planilhas:
- **Upload Direto:** Arraste e solte ou selecione arquivos nos formatos `.xlsx`, `.xls` ou `.csv`.
- **Botão "Baixar Modelo Excel (.xlsx)":** Gera na hora um arquivo modelo com todos os cabeçalhos corretos e linhas de exemplo para preenchimento.
- **Tabela de Pré-visualização:** Mostra os dados lidos antes da gravação para conferência de nomes, CPFs, funções, armários e datas.
- **Mapeamento Flexível:** Reconhece colunas com variações de acentuação e maiúsculas/minúsculas.
- **Atualização Inteligente:** Se o colaborador já existir (pelo CPF), atualiza os dados; se for novo, cadastra automaticamente.

---

### 3. Benefícios (VR e VT) & Cartão de Acesso
- **Nº Cartão de Acesso:** Número do crachá, catraca ou tag RFID do colaborador.
- **Benefício VR (Vale Refeição / Alimentação):**
  - Quantidade / Valor diário ou mensal (ex: `R$ 38,00 / dia`).
  - Operadora (ex: *Sodexo / Pluxee*, *Ticket*, *Alelo*, *VR Benefícios*, *Flash*, etc.).
- **Benefício VT (Vale Transporte):**
  - Quantidade / Passagens (ex: `2 passagens / dia`).
  - Operadora / Linha (ex: *SPTrans (Bilhete Único)*, *EMTU / Top*, *Metrô*, *RioCard*, etc.).

---

### 4. Integração SST (Sim / Não) em Destaque
- Campo de destaque visual no checklist de SST: **Integração Realizada (Sim / Não)**.
- Registro da **Data da Integração**.
- A integração pendente continua acionando o bloqueio automático de trabalho (*Não Liberado*).

---

### 5. Controle de Armários (Inclusão Manual e Prazos)
- **Número do Armário Manual:**
  - No formulário do colaborador: permite digitar livremente qualquer armário (ex: `ARM-45`, `G-102`, `DOCA-01`) ou selecionar dos já existentes.
  - Na tela de armários: botão **"+ Incluir Armário Manualmente"** com modal próprio para cadastrar armários a qualquer momento.
- **Campos de Controle:**
  - `Número do Armário`
  - `Status`: *Disponível*, *Ocupado*, *Manutenção*
  - `Data de Entrega`
  - `Data de Devolução`
- **Regra 1 Preservada:** Se um armário já estiver ocupado por outro colaborador, o sistema alerta e bloqueia a atribuição.

---

### 6. Integração com PostgreSQL & CapRover (Persistência Corporativa)
O sistema conta com suporte completo a banco de dados relacional **PostgreSQL**:
- **Tabelas do Sistema:** `usuarios`, `empresas`, `colaboradores`, `armarios`, `ocorrencias_disciplinares` e `anexos`.
- **Script SQL (`schema.sql`):** Arquivo DDL pronto para execução no Adminer / pgAdmin ou inicialização automática na subida da aplicação.
- **Configuração no `.env`:**
  ```env
  DB_HOST=srv-captain--db-postgres
  DB_PORT=5432
  DB_USER=postgres
  DB_PASSWORD=sua_senha_aqui
  DB_NAME=RH-SYSTEM
  DB_SSL=false
  ```
- **Sincronização Híbrida Frontend:** Permite funcionamento transparente tanto online sincronizado com o PostgreSQL quanto com fallback no cache local.

---

### 7. Integração com MinIO (Armazenamento S3 de Anexos & Documentos)
O sistema conta agora com suporte nativo a armazenamento em nuvem/objeto via **MinIO (S3)**:
- **Central de Anexos na Ficha do Colaborador:** Permite anexar ASO, RG/CPF, termos de uniforme, advertências disciplinares assinadas e contratos.
- **Upload Seguro:** Envio direto via formulário com suporte a múltiplos formatos (`.pdf`, `.png`, `.jpg`, `.docx`, `.xlsx`).
- **Visualização e Download:** Botão de visualização inline no navegador e download direto com nomes originais preservados.
- **Configuração Simples via `.env`:** Basta preencher as variáveis no arquivo `.env` para apontar para o seu servidor MinIO corporativo ou local:
  ```env
  PORT=3000
  MINIO_ENDPOINT=localhost
  MINIO_PORT=9000
  MINIO_USE_SSL=false
  MINIO_ACCESS_KEY=minioadmin
  MINIO_SECRET_KEY=minioadmin
  MINIO_BUCKET=cft-anexos
  ```
- **Ambiente Local via Docker (Opcional):** Arquivo `docker-compose.yml` incluído para subir uma instância de desenvolvimento com `docker compose up -d`.
- **Status em Tempo Real:** Indicador no topo da página (header) mostrando a conectividade com o MinIO.

---

## 🚀 Como Iniciar

1. Certifique-se de que o arquivo `.env` contenha as credenciais corretas do MinIO.
2. Execute o arquivo [`iniciar_sistema.bat`](file:///c:/Users/apongeluppi/OneDrive%20-%20Communications%20Test%20Design,%20Inc/DEV/controle-funcionarios-temporarios/iniciar_sistema.bat) (ele inicia o servidor Node.js e abre a página no navegador em `http://localhost:3000`).
3. Ou inicie manualmente via terminal:
   ```bash
   node server.js
   ```
   E acesse `http://localhost:3000`.
