const express = require('express');
const multer = require('multer');
const path = require('path');
const minioService = require('./minioService');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

// Configuração do Multer (armazenamento em memória para repassar direto ao MinIO)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // Limite de 50MB por arquivo
  }
});

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================================
// ROTAS DE STATUS & DIAGNÓSTICO
// ========================================================

// Rota de Status da Conexão com o MinIO
app.get('/api/status', async (req, res) => {
  try {
    const status = await minioService.checkStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// Rota de Status da Conexão com o PostgreSQL
app.get('/api/db/status', async (req, res) => {
  try {
    const status = await db.checkDbStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// Forçar Inicialização do Schema no PostgreSQL
app.post('/api/db/init', async (req, res) => {
  try {
    const success = await db.initDb();
    if (success) {
      res.json({ success: true, message: 'Banco de dados PostgreSQL inicializado com sucesso.' });
    } else {
      res.status(500).json({ success: false, message: 'Falha ao inicializar o banco de dados.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// ROTAS CRUD - EMPRESAS (UNIDADES CTDI)
// ========================================================
app.get('/api/empresas', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM empresas ORDER BY nome_fantasia ASC');
    const empresas = result.rows.map(r => ({
      id: r.id,
      cnpj: r.cnpj,
      razaoSocial: r.razao_social,
      nomeFantasia: r.nome_fantasia,
      cidadeUF: r.cidade_uf,
      ativo: r.ativo
    }));
    res.json(empresas);
  } catch (err) {
    console.error('[API /api/empresas] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/empresas', async (req, res) => {
  try {
    const { id, cnpj, razaoSocial, nomeFantasia, cidadeUF, ativo } = req.body;
    const empId = id || ('emp-' + Date.now());
    const queryText = `
      INSERT INTO empresas (id, cnpj, razao_social, nome_fantasia, cidade_uf, ativo, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE SET
        cnpj = EXCLUDED.cnpj,
        razao_social = EXCLUDED.razao_social,
        nome_fantasia = EXCLUDED.nome_fantasia,
        cidade_uf = EXCLUDED.cidade_uf,
        ativo = EXCLUDED.ativo,
        updated_at = NOW()
      RETURNING *;
    `;
    const values = [empId, cnpj, razaoSocial, nomeFantasia, cidadeUF, ativo !== false];
    const result = await db.query(queryText, values);
    const r = result.rows[0];
    res.json({
      id: r.id,
      cnpj: r.cnpj,
      razaoSocial: r.razao_social,
      nomeFantasia: r.nome_fantasia,
      cidadeUF: r.cidade_uf,
      ativo: r.ativo
    });
  } catch (err) {
    console.error('[API POST /api/empresas] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// ROTAS CRUD - USUÁRIOS
// ========================================================
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await db.query('SELECT id, nome, email, perfil, cnpj_vinculado, filtro_apenas_meus_colaboradores, cargo, ativo FROM usuarios ORDER BY nome ASC');
    const usuarios = result.rows.map(r => ({
      id: r.id,
      nome: r.nome,
      email: r.email,
      perfil: r.perfil,
      cnpjVinculado: r.cnpj_vinculado,
      filtroApenasMeusColaboradores: r.filtro_apenas_meus_colaboradores,
      cargo: r.cargo,
      ativo: r.ativo
    }));
    res.json(usuarios);
  } catch (err) {
    console.error('[API /api/usuarios] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const { id, nome, email, senha, perfil, cnpjVinculado, filtroApenasMeusColaboradores, cargo, ativo } = req.body;
    const userId = id || ('usr-' + Date.now());
    const queryText = `
      INSERT INTO usuarios (id, nome, email, senha, perfil, cnpj_vinculado, filtro_apenas_meus_colaboradores, cargo, ativo, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        senha = COALESCE(EXCLUDED.senha, usuarios.senha),
        perfil = EXCLUDED.perfil,
        cnpj_vinculado = EXCLUDED.cnpj_vinculado,
        filtro_apenas_meus_colaboradores = EXCLUDED.filtro_apenas_meus_colaboradores,
        cargo = EXCLUDED.cargo,
        ativo = EXCLUDED.ativo,
        updated_at = NOW()
      RETURNING id, nome, email, perfil, cnpj_vinculado, filtro_apenas_meus_colaboradores, cargo, ativo;
    `;
    const values = [
      userId,
      nome,
      email,
      senha || null,
      perfil || 'GESTOR',
      cnpjVinculado || 'TODOS',
      filtroApenasMeusColaboradores === true,
      cargo || '',
      ativo !== false
    ];
    const result = await db.query(queryText, values);
    const r = result.rows[0];
    res.json({
      id: r.id,
      nome: r.nome,
      email: r.email,
      perfil: r.perfil,
      cnpjVinculado: r.cnpj_vinculado,
      filtroApenasMeusColaboradores: r.filtro_apenas_meus_colaboradores,
      cargo: r.cargo,
      ativo: r.ativo
    });
  } catch (err) {
    console.error('[API POST /api/usuarios] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// ROTAS CRUD - COLABORADORES
// ========================================================
app.get('/api/colaboradores', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM colaboradores ORDER BY nome_completo ASC');
    const colaboradores = result.rows.map(r => ({
      id: r.id,
      nomeCompleto: r.nome_completo,
      cpf: r.cpf,
      cnpjEmpresa: r.cnpj_empresa,
      nomeEmpresa: r.nome_empresa,
      cartaoAcesso: r.cartao_acesso,
      agencia: r.agencia,
      matriculaAgencia: r.matricula_agencia,
      funcao: r.funcao,
      operacao: r.operacao,
      setor: r.setor,
      gestor: r.gestor,
      turno: r.turno,
      dataAdmissao: r.data_admissao ? r.data_admissao.toISOString().split('T')[0] : null,
      dataTerminoContrato: r.data_termino_contrato ? r.data_termino_contrato.toISOString().split('T')[0] : null,
      statusContrato: r.status_contrato,
      beneficios: r.beneficios || {},
      numeroArmario: r.numero_armario,
      dataEntregaArmario: r.data_entrega_armario ? r.data_entrega_armario.toISOString().split('T')[0] : null,
      dataDevolucaoArmario: r.data_devolucao_armario ? r.data_devolucao_armario.toISOString().split('T')[0] : null,
      sst: r.sst || {},
      epis: r.epis || [],
      anexos: r.anexos || []
    }));
    res.json(colaboradores);
  } catch (err) {
    console.error('[API /api/colaboradores] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/colaboradores', async (req, res) => {
  try {
    const c = req.body;
    const id = c.id || ('tmp-' + Date.now());
    const queryText = `
      INSERT INTO colaboradores (
        id, nome_completo, cpf, cnpj_empresa, nome_empresa, cartao_acesso,
        agencia, matricula_agencia, funcao, operacao, setor, gestor, turno,
        data_admissao, data_termino_contrato, status_contrato, beneficios,
        numero_armario, data_entrega_armario, data_devolucao_armario,
        sst, epis, anexos, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW())
      ON CONFLICT (id) DO UPDATE SET
        nome_completo = EXCLUDED.nome_completo,
        cpf = EXCLUDED.cpf,
        cnpj_empresa = EXCLUDED.cnpj_empresa,
        nome_empresa = EXCLUDED.nome_empresa,
        cartao_acesso = EXCLUDED.cartao_acesso,
        agencia = EXCLUDED.agencia,
        matricula_agencia = EXCLUDED.matricula_agencia,
        funcao = EXCLUDED.funcao,
        operacao = EXCLUDED.operacao,
        setor = EXCLUDED.setor,
        gestor = EXCLUDED.gestor,
        turno = EXCLUDED.turno,
        data_admissao = EXCLUDED.data_admissao,
        data_termino_contrato = EXCLUDED.data_termino_contrato,
        status_contrato = EXCLUDED.status_contrato,
        beneficios = EXCLUDED.beneficios,
        numero_armario = EXCLUDED.numero_armario,
        data_entrega_armario = EXCLUDED.data_entrega_armario,
        data_devolucao_armario = EXCLUDED.data_devolucao_armario,
        sst = EXCLUDED.sst,
        epis = EXCLUDED.epis,
        anexos = EXCLUDED.anexos,
        updated_at = NOW()
      RETURNING *;
    `;
    const values = [
      id,
      c.nomeCompleto || '',
      c.cpf || '',
      c.cnpjEmpresa || '',
      c.nomeEmpresa || '',
      c.cartaoAcesso || null,
      c.agencia || null,
      c.matriculaAgencia || null,
      c.funcao || null,
      c.operacao || null,
      c.setor || null,
      c.gestor || null,
      c.turno || null,
      c.dataAdmissao || new Date().toISOString().split('T')[0],
      c.dataTerminoContrato || null,
      c.statusContrato || 'Ativo',
      JSON.stringify(c.beneficios || {}),
      c.numeroArmario || null,
      c.dataEntregaArmario || null,
      c.dataDevolucaoArmario || null,
      JSON.stringify(c.sst || {}),
      JSON.stringify(c.epis || []),
      JSON.stringify(c.anexos || [])
    ];
    await db.query(queryText, values);
    res.json({ success: true, colaborador: c });
  } catch (err) {
    console.error('[API POST /api/colaboradores] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/colaboradores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM colaboradores WHERE id = $1', [id]);
    res.json({ success: true, message: `Colaborador ${id} removido com sucesso.` });
  } catch (err) {
    console.error('[API DELETE /api/colaboradores] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// ROTAS CRUD - ARMÁRIOS (LOCKERS)
// ========================================================
app.get('/api/armarios', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM armarios ORDER BY numero ASC');
    const armarios = result.rows.map(r => ({
      id: r.id,
      numero: r.numero,
      bloco: r.bloco,
      andar: r.andar,
      genero: r.genero,
      status: r.status,
      ocupadoPorId: r.ocupado_por_id,
      ocupadoPorNome: r.ocupado_por_nome,
      dataEntrega: r.data_entrega ? r.data_entrega.toISOString().split('T')[0] : null,
      dataDevolucao: r.data_devolucao ? r.data_devolucao.toISOString().split('T')[0] : null,
      observacoes: r.observacoes
    }));
    res.json(armarios);
  } catch (err) {
    console.error('[API /api/armarios] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/armarios', async (req, res) => {
  try {
    const armarios = Array.isArray(req.body) ? req.body : [req.body];
    for (const a of armarios) {
      const id = a.id || ('lck-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4));
      const queryText = `
        INSERT INTO armarios (
          id, numero, bloco, andar, genero, status, ocupado_por_id, ocupado_por_nome,
          data_entrega, data_devolucao, observacoes, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (numero) DO UPDATE SET
          bloco = EXCLUDED.bloco,
          andar = EXCLUDED.andar,
          genero = EXCLUDED.genero,
          status = EXCLUDED.status,
          ocupado_por_id = EXCLUDED.ocupado_por_id,
          ocupado_por_nome = EXCLUDED.ocupado_por_nome,
          data_entrega = EXCLUDED.data_entrega,
          data_devolucao = EXCLUDED.data_devolucao,
          observacoes = EXCLUDED.observacoes,
          updated_at = NOW();
      `;
      const values = [
        id,
        a.numero,
        a.bloco || null,
        a.andar || null,
        a.genero || null,
        a.status || 'Disponível',
        a.ocupadoPorId || null,
        a.ocupadoPorNome || null,
        a.dataEntrega || null,
        a.dataDevolucao || null,
        a.observacoes || null
      ];
      await db.query(queryText, values);
    }
    res.json({ success: true, count: armarios.length });
  } catch (err) {
    console.error('[API POST /api/armarios] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// ROTAS CRUD - OCORRÊNCIAS DISCIPLINARES
// ========================================================
app.get('/api/ocorrencias', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ocorrencias_disciplinares ORDER BY data_ocorrencia DESC');
    const ocorrencias = result.rows.map(r => ({
      id: r.id,
      colaboradorId: r.colaborador_id,
      colaboradorNome: r.colaborador_nome,
      colaboradorCpf: r.colaborador_cpf,
      tipo: r.tipo,
      diasSuspensao: r.dias_suspensao,
      dataOcorrencia: r.data_ocorrencia ? r.data_ocorrencia.toISOString().split('T')[0] : null,
      motivo: r.motivo,
      descricao: r.descricao,
      statusAssinatura: r.status_assinatura,
      testemunha1: r.testemunha1,
      testemunha2: r.testemunha2,
      anexos: r.anexos || []
    }));
    res.json(ocorrencias);
  } catch (err) {
    console.error('[API /api/ocorrencias] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ocorrencias', async (req, res) => {
  try {
    const o = req.body;
    const id = o.id || ('disc-' + Date.now());
    const queryText = `
      INSERT INTO ocorrencias_disciplinares (
        id, colaborador_id, colaborador_nome, colaborador_cpf, tipo, dias_suspensao,
        data_ocorrencia, motivo, descricao, status_assinatura, testemunha1, testemunha2, anexos, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (id) DO UPDATE SET
        colaborador_id = EXCLUDED.colaborador_id,
        colaborador_nome = EXCLUDED.colaborador_nome,
        colaborador_cpf = EXCLUDED.colaborador_cpf,
        tipo = EXCLUDED.tipo,
        dias_suspensao = EXCLUDED.dias_suspensao,
        data_ocorrencia = EXCLUDED.data_ocorrencia,
        motivo = EXCLUDED.motivo,
        descricao = EXCLUDED.descricao,
        status_assinatura = EXCLUDED.status_assinatura,
        testemunha1 = EXCLUDED.testemunha1,
        testemunha2 = EXCLUDED.testemunha2,
        anexos = EXCLUDED.anexos,
        updated_at = NOW();
    `;
    const values = [
      id,
      o.colaboradorId,
      o.colaboradorNome || null,
      o.colaboradorCpf || null,
      o.tipo || 'Advertência Escrita',
      parseInt(o.diasSuspensao || '0', 10),
      o.dataOcorrencia || new Date().toISOString().split('T')[0],
      o.motivo || '',
      o.descricao || '',
      o.statusAssinatura || '',
      o.testemunha1 || null,
      o.testemunha2 || null,
      JSON.stringify(o.anexos || [])
    ];
    await db.query(queryText, values);
    res.json({ success: true, ocorrencia: o });
  } catch (err) {
    console.error('[API POST /api/ocorrencias] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ocorrencias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM ocorrencias_disciplinares WHERE id = $1', [id]);
    res.json({ success: true, message: `Ocorrência ${id} removida com sucesso.` });
  } catch (err) {
    console.error('[API DELETE /api/ocorrencias] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// ROTAS DE ANEXOS & MINIO
// ========================================================

// Rota de Upload de Anexo(s) para o MinIO
app.post('/api/anexos/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const folder = req.body.folder || 'colaboradores';
    const employeeId = req.body.employeeId || '';
    const categoria = req.body.categoria || 'Geral';

    const subPath = employeeId ? `${folder}/${employeeId}` : folder;

    const results = [];
    for (const file of req.files) {
      const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      const uploaded = await minioService.uploadFile({
        buffer: file.buffer,
        originalname: originalname,
        mimetype: file.mimetype,
        folder: subPath,
        metadata: {
          'X-Amz-Meta-Categoria': encodeURIComponent(categoria),
          'X-Amz-Meta-EmployeeId': encodeURIComponent(employeeId)
        }
      });

      const fileRecord = {
        id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        objectName: uploaded.objectName,
        name: originalname,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
        categoria: categoria,
        uploadedAt: uploaded.uploadedAt,
        viewUrl: uploaded.viewUrl,
        downloadUrl: uploaded.downloadUrl
      };

      // Grava metadados do anexo no PostgreSQL se conectado
      try {
        await db.query(`
          INSERT INTO anexos (id, object_name, original_name, size_bytes, mime_type, categoria, employee_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `, [
          fileRecord.id,
          fileRecord.objectName,
          fileRecord.name,
          fileRecord.size,
          fileRecord.mimeType,
          fileRecord.categoria,
          employeeId || null
        ]);
      } catch (dbErr) {
        console.warn('[PostgreSQL] Não foi possível registrar metadado de anexo no banco:', dbErr.message);
      }

      results.push(fileRecord);
    }

    res.json({
      success: true,
      message: `${results.length} anexo(s) salvo(s) no MinIO com sucesso.`,
      files: results
    });
  } catch (err) {
    console.error('[API /api/anexos/upload] Erro:', err);
    res.status(500).json({ error: `Erro ao fazer upload no MinIO: ${err.message}` });
  }
});

// Rota para Visualizar o Anexo Inline (PDF, Imagens, etc.)
app.get('/api/anexos/view', async (req, res) => {
  const objectName = req.query.objectName;
  if (!objectName) {
    return res.status(400).send('Parâmetro objectName ausente');
  }

  try {
    const stat = await minioService.getFileStat(objectName);
    const stream = await minioService.getFileStream(objectName);

    const contentType = stat.metaData['content-type'] || 'application/octet-stream';
    const originalName = stat.metaData['x-amz-meta-originalname'] 
      ? decodeURIComponent(stat.metaData['x-amz-meta-originalname'])
      : path.basename(objectName);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
      'Cache-Control': 'public, max-age=3600'
    });

    stream.pipe(res);
  } catch (err) {
    console.error('[API /api/anexos/view] Erro:', err.message);
    res.status(404).send('Arquivo não encontrado no MinIO.');
  }
});

// Rota para Baixar o Anexo (Download)
app.get('/api/anexos/download', async (req, res) => {
  const objectName = req.query.objectName;
  if (!objectName) {
    return res.status(400).send('Parâmetro objectName ausente');
  }

  try {
    const stat = await minioService.getFileStat(objectName);
    const stream = await minioService.getFileStream(objectName);

    const originalName = stat.metaData['x-amz-meta-originalname'] 
      ? decodeURIComponent(stat.metaData['x-amz-meta-originalname'])
      : path.basename(objectName);

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
      'Cache-Control': 'no-cache'
    });

    stream.pipe(res);
  } catch (err) {
    console.error('[API /api/anexos/download] Erro:', err.message);
    res.status(404).send('Arquivo não encontrado no MinIO.');
  }
});

// Rota para Deletar um Anexo do MinIO
app.delete('/api/anexos', async (req, res) => {
  const objectName = req.query.objectName || (req.body && req.body.objectName);
  if (!objectName) {
    return res.status(400).json({ error: 'Parâmetro objectName ausente' });
  }

  try {
    await minioService.deleteFile(objectName);
    try {
      await db.query('DELETE FROM anexos WHERE object_name = $1', [objectName]);
    } catch (e) {}

    res.json({ success: true, message: 'Arquivo excluído do MinIO com sucesso.' });
  } catch (err) {
    console.error('[API DELETE /api/anexos] Erro:', err.message);
    res.status(500).json({ error: `Erro ao excluir do MinIO: ${err.message}` });
  }
});

// Rota para Obter URL Pré-assinada (Presigned URL)
app.get('/api/anexos/presigned', async (req, res) => {
  const objectName = req.query.objectName;
  if (!objectName) {
    return res.status(400).json({ error: 'Parâmetro objectName ausente' });
  }

  try {
    const url = await minioService.getPresignedUrl(objectName);
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir arquivos estáticos do frontend
app.use(express.static(BASE_DIR));

// Fallback para SPA / index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(BASE_DIR, 'index.html'));
});

// Inicialização do Servidor
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(` CFT - Servidor iniciado em: http://localhost:${PORT}`);
  console.log('====================================================');
  
  // Tenta verificar o bucket MinIO na inicialização
  try {
    await minioService.ensureBucket();
  } catch (e) {
    console.warn('[MinIO] Aviso ao verificar bucket:', e.message);
  }

  // Tenta inicializar tabelas PostgreSQL
  try {
    await db.initDb();
  } catch (e) {
    console.warn('[PostgreSQL] Aviso ao inicializar banco:', e.message);
  }
});
