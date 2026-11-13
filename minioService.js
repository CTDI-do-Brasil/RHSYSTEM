const Minio = require('minio');
const path = require('path');
require('dotenv').config();

const config = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
};

const BUCKET_NAME = process.env.MINIO_BUCKET || 'cft-anexos';

let minioClient = null;
try {
  minioClient = new Minio.Client(config);
} catch (err) {
  console.error('[MinIO] Erro ao instanciar cliente:', err.message);
}

// Inicializa o bucket garantindo que exista
async function ensureBucket() {
  if (!minioClient) return false;
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`[MinIO] Bucket "${BUCKET_NAME}" criado com sucesso.`);
    } else {
      console.log(`[MinIO] Conectado ao bucket "${BUCKET_NAME}".`);
    }
    return true;
  } catch (err) {
    console.warn(`[MinIO] Aviso: Não foi possível conectar ao MinIO agora (${err.message}). O sistema continuará ativo e tentará reconectar quando houver requisição.`);
    return false;
  }
}

// Verifica status da conexão
async function checkStatus() {
  if (!minioClient) {
    return {
      connected: false,
      message: 'Cliente MinIO não inicializado',
      config: { endPoint: config.endPoint, port: config.port, bucket: BUCKET_NAME }
    };
  }
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    return {
      connected: true,
      message: 'Conectado ao MinIO',
      bucket: BUCKET_NAME,
      bucketExists: exists,
      config: {
        endPoint: config.endPoint,
        port: config.port,
        useSSL: config.useSSL,
        bucket: BUCKET_NAME
      }
    };
  } catch (err) {
    return {
      connected: false,
      message: `Desconectado ou inacessível: ${err.message}`,
      config: {
        endPoint: config.endPoint,
        port: config.port,
        useSSL: config.useSSL,
        bucket: BUCKET_NAME
      }
    };
  }
}

// Faz o upload de arquivo para o MinIO
async function uploadFile({ buffer, originalname, mimetype, folder = 'geral', metadata = {} }) {
  if (!minioClient) {
    throw new Error('Cliente MinIO não configurado');
  }

  // Sanitiza nome do arquivo
  const safeName = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const objectName = `${folder}/${timestamp}_${safeName}`;

  const metaData = {
    'Content-Type': mimetype || 'application/octet-stream',
    'X-Amz-Meta-OriginalName': encodeURIComponent(originalname),
    'X-Amz-Meta-UploadedAt': new Date().toISOString(),
    ...metadata
  };

  await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, metaData);

  return {
    objectName,
    originalName: originalname,
    mimeType: mimetype,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
    bucket: BUCKET_NAME,
    viewUrl: `/api/anexos/view?objectName=${encodeURIComponent(objectName)}`,
    downloadUrl: `/api/anexos/download?objectName=${encodeURIComponent(objectName)}`
  };
}

// Obtém stream de leitura do arquivo
async function getFileStream(objectName) {
  if (!minioClient) throw new Error('Cliente MinIO não configurado');
  return await minioClient.getObject(BUCKET_NAME, objectName);
}

// Obtém metadados do arquivo
async function getFileStat(objectName) {
  if (!minioClient) throw new Error('Cliente MinIO não configurado');
  return await minioClient.statObject(BUCKET_NAME, objectName);
}

// Deleta um arquivo
async function deleteFile(objectName) {
  if (!minioClient) throw new Error('Cliente MinIO não configurado');
  await minioClient.removeObject(BUCKET_NAME, objectName);
  return { success: true, objectName };
}

// Gera URL pré-assinada
async function getPresignedUrl(objectName, expirySeconds = 3600) {
  if (!minioClient) throw new Error('Cliente MinIO não configurado');
  return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expirySeconds);
}

module.exports = {
  ensureBucket,
  checkStatus,
  uploadFile,
  getFileStream,
  getFileStat,
  deleteFile,
  getPresignedUrl,
  BUCKET_NAME,
  config
};
