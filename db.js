/**
 * db.js - Conexão e Pool do PostgreSQL
 * Sistema CFT - CTDI do Brasil
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.DB_HOST || 'srv-captain--db-postgres',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'RH-SYSTEM',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20, // máximo de clientes no pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL] Erro inesperado no pool de conexões:', err.message);
});

/**
 * Executa uma consulta SQL com parâmetros
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.log('[PostgreSQL] Query lenta:', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('[PostgreSQL] Erro na query:', { text, error: err.message });
    throw err;
  }
}

/**
 * Obtém um cliente do pool para transações
 */
async function getClient() {
  return await pool.connect();
}

/**
 * Verifica o status da conexão com o banco de dados
 */
async function checkDbStatus() {
  try {
    const res = await pool.query('SELECT NOW() as now, current_database() as database, version() as version');
    return {
      connected: true,
      database: res.rows[0].database,
      serverTime: res.rows[0].now,
      version: res.rows[0].version
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message
    };
  }
}

/**
 * Inicializa automaticamente as tabelas do schema caso não existam
 */
async function initDb() {
  try {
    const status = await checkDbStatus();
    if (!status.connected) {
      console.warn('[PostgreSQL] Banco não conectado no momento. Inicialização de tabelas ignorada:', status.error);
      return false;
    }

    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'usuarios'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('[PostgreSQL] Criando tabelas iniciais a partir do schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(sql);
        console.log('[PostgreSQL] Tabelas criadas com sucesso!');
      }
    } else {
      console.log('[PostgreSQL] Tabelas já existem no banco RH-SYSTEM.');
    }
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Erro ao inicializar tabelas:', err.message);
    return false;
  }
}

module.exports = {
  pool,
  query,
  getClient,
  checkDbStatus,
  initDb
};
