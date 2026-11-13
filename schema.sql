-- ========================================================
-- Schema do Banco de Dados PostgreSQL - RH-SYSTEM
-- Sistema de Controle de Funcionários Temporários (CFT)
-- ========================================================

-- Extensão para geração de UUID caso necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE EMPRESAS / UNIDADES CTDI
CREATE TABLE IF NOT EXISTS empresas (
    id VARCHAR(50) PRIMARY KEY,
    cnpj VARCHAR(30) NOT NULL UNIQUE,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255) NOT NULL,
    cidade_uf VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE USUÁRIOS DO SISTEMA
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255),
    perfil VARCHAR(50) NOT NULL DEFAULT 'GESTOR', -- 'ADMIN', 'GESTOR', 'CONSULTA'
    cnpj_vinculado VARCHAR(50) DEFAULT 'TODOS',
    filtro_apenas_meus_colaboradores BOOLEAN DEFAULT FALSE,
    cargo VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE COLABORADORES TEMPORÁRIOS
CREATE TABLE IF NOT EXISTS colaboradores (
    id VARCHAR(50) PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(20) NOT NULL,
    cnpj_empresa VARCHAR(30) NOT NULL,
    nome_empresa VARCHAR(255),
    cartao_acesso VARCHAR(50),
    agencia VARCHAR(100),
    matricula_agencia VARCHAR(50),
    funcao VARCHAR(100),
    operacao VARCHAR(100),
    setor VARCHAR(100),
    gestor VARCHAR(150),
    turno VARCHAR(100),
    data_admissao DATE NOT NULL,
    data_termino_contrato DATE,
    status_contrato VARCHAR(50) DEFAULT 'Ativo',
    beneficios JSONB DEFAULT '{}'::jsonb,
    numero_armario VARCHAR(50),
    data_entrega_armario DATE,
    data_devolucao_armario DATE,
    sst JSONB DEFAULT '{}'::jsonb,
    epis JSONB DEFAULT '[]'::jsonb,
    anexos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE ARMÁRIOS / LOCKERS
CREATE TABLE IF NOT EXISTS armarios (
    id VARCHAR(50) PRIMARY KEY,
    numero VARCHAR(50) NOT NULL UNIQUE,
    bloco VARCHAR(50),
    andar VARCHAR(50),
    genero VARCHAR(20),
    status VARCHAR(50) DEFAULT 'Disponível', -- 'Disponível', 'Ocupado', 'Manutenção'
    ocupado_por_id VARCHAR(50),
    ocupado_por_nome VARCHAR(255),
    data_entrega DATE,
    data_devolucao DATE,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE OCORRÊNCIAS DISCIPLINARES
CREATE TABLE IF NOT EXISTS ocorrencias_disciplinares (
    id VARCHAR(50) PRIMARY KEY,
    colaborador_id VARCHAR(50) NOT NULL,
    colaborador_nome VARCHAR(255),
    colaborador_cpf VARCHAR(20),
    tipo VARCHAR(50) NOT NULL, -- 'Advertência Verbal', 'Advertência Escrita', 'Suspensão'
    dias_suspensao INT DEFAULT 0,
    data_ocorrencia DATE NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    descricao TEXT,
    status_assinatura VARCHAR(100),
    testemunha1 VARCHAR(150),
    testemunha2 VARCHAR(150),
    anexos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE METADADOS DE ANEXOS (MINIO)
CREATE TABLE IF NOT EXISTS anexos (
    id VARCHAR(100) PRIMARY KEY,
    object_name TEXT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    size_bytes BIGINT,
    mime_type VARCHAR(100),
    categoria VARCHAR(100),
    employee_id VARCHAR(50),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- CARGA INICIAL DE EMPRESAS (UNIDADES CTDI)
-- ========================================================
INSERT INTO empresas (id, cnpj, razao_social, nome_fantasia, cidade_uf)
VALUES 
    ('emp-01', '01.234.567/0001-89', 'CTDI do Brasil Manutenção e Logística Ltda.', 'CTDI Brasil - Matriz (Barueri / SP)', 'Barueri - SP'),
    ('emp-02', '01.234.567/0002-60', 'CTDI do Brasil Manutenção e Logística Ltda.', 'CTDI - Filial Louveira / SP', 'Louveira - SP'),
    ('emp-03', '01.234.567/0003-40', 'CTDI do Brasil Manutenção e Logística Ltda.', 'CTDI - Filial Manaus / AM', 'Manaus - AM')
ON CONFLICT (id) DO NOTHING;

-- ========================================================
-- CARGA INICIAL DE USUÁRIOS
-- ========================================================
INSERT INTO usuarios (id, nome, email, senha, perfil, cnpj_vinculado, filtro_apenas_meus_colaboradores, cargo)
VALUES 
    ('user-admin', 'RH Corporativo CTDI (Admin Geral)', 'rh.corporativo@ctdi.com.br', '123456', 'ADMIN', 'TODOS', FALSE, 'Gestão de Recursos Humanos CTDI'),
    ('user-carlos', 'Carlos Eduardo Silva', 'carlos.silva@ctdi.com.br', '123456', 'GESTOR', '01.234.567/0001-89', TRUE, 'Gerente de Operações (Barueri)'),
    ('user-mariana', 'Mariana Albuquerque', 'mariana.albuquerque@ctdi.com.br', '123456', 'GESTOR', '01.234.567/0002-60', TRUE, 'Supervisora de Operações (Louveira)'),
    ('user-roberto', 'Roberto Mendes', 'roberto.mendes@ctdi.com.br', '123456', 'GESTOR', '01.234.567/0003-40', FALSE, 'Coordenador Geral de Produção (Manaus)')
ON CONFLICT (id) DO NOTHING;
