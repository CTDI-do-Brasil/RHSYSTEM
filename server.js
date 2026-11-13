const express = require('express');
const multer = require('multer');
const path = require('path');
const minioService = require('./minioService');
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota de Status da Conexão com o MinIO
app.get('/api/status', async (req, res) => {
  try {
    const status = await minioService.checkStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

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
      // Ajuste de encoding do nome do arquivo para evitar problemas com acentos
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

      results.push({
        id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        objectName: uploaded.objectName,
        name: originalname,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
        categoria: categoria,
        uploadedAt: uploaded.uploadedAt,
        viewUrl: uploaded.viewUrl,
        downloadUrl: uploaded.downloadUrl
      });
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
  await minioService.ensureBucket();
});
