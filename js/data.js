/**
 * DataStore - Gerenciamento de Persistência Local e Dados Iniciais
 * Sistema de Controle de Funcionários Temporários
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_EMPLOYEES = 'cft_employees_v7';
  const STORAGE_KEY_LOCKERS = 'cft_lockers_v6';
  const STORAGE_KEY_DISCIPLINARY = 'cft_disciplinary_v2';

  // Auxiliares de Formatação e Data
  const Utils = {
    formatCPF(cpf) {
      if (!cpf) return '';
      const clean = cpf.replace(/\D/g, '');
      if (clean.length <= 11) {
        return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      return clean;
    },

    cleanCPF(cpf) {
      return (cpf || '').replace(/\D/g, '');
    },

    formatDateBR(dateStr) {
      if (!dateStr) return '-';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    },

    todayISO() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    addDays(dateStr, days) {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },

    diffInDays(targetDateStr, baseDateStr = null) {
      if (!targetDateStr) return null;
      const base = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
      const target = new Date(targetDateStr + 'T00:00:00');
      
      const oneDay = 24 * 60 * 60 * 1000;
      const d1 = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      const d2 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      
      return Math.round((d2 - d1) / oneDay);
    },

    generateId() {
      return 'tmp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
  };

  // Gerador de Armários Iniciais - Base inicialmente ZERADA (cadastro exclusivamente manual)
  function generateInitialLockers() {
    return [];
  }

  // Dados Iniciais de Temporários com CNPJ da Empresa, Benefícios e Uniformes (Camiseta, Camiseta Polo, Moletom e Colete)
  function generateInitialEmployees(today) {
    return [
      {
        id: 'tmp-001',
        nomeCompleto: 'Lucas Henrique Ribeiro',
        cpf: '128.456.789-01',
        cnpjEmpresa: '01.234.567/0001-89',
        nomeEmpresa: 'CTDI Brasil - Matriz (Barueri / SP)',
        cartaoAcesso: 'CR-88910',
        agencia: 'Randstad',
        matriculaAgencia: 'RS-98214',
        funcao: 'Operador de Empilhadeira',
        operacao: 'Logística Inbound',
        setor: 'Armazém Central',
        gestor: 'Carlos Eduardo Silva',
        turno: '1º Turno (06h às 14h)',
        dataAdmissao: Utils.addDays(today, -80),
        dataTerminoContrato: Utils.addDays(today, 15), // Marco: Vence em 15 dias (30d)
        statusContrato: 'Ativo',
        beneficios: {
          vr: { quantidade: 'R$ 38,00 / dia', operadora: 'Sodexo / Pluxee' },
          vt: { quantidade: '2 passagens / dia', operadora: 'SPTrans (Bilhete Único)' }
        },
        numeroArmario: null,
        dataEntregaArmario: null,
        dataDevolucaoArmario: null,
        sst: {
          integracaoRealizada: true,
          dataIntegracao: Utils.addDays(today, -80),
          asoRecebido: true,
          dataAso: Utils.addDays(today, -82),
          ddsRealizado: true,
          dataDds: Utils.addDays(today, -79),
          termoUniformeAssinado: true,
          fichaEpiAssinada: true,
          dataFichaEpi: Utils.addDays(today, -80)
        },
        epis: [
          { item: 'Camiseta', tamanho: 'G', quantidade: 2, dataEntrega: Utils.addDays(today, -80), status: 'Entregue', observacao: 'Tamanho G' },
          { item: 'Camiseta Polo', tamanho: 'G', quantidade: 1, dataEntrega: Utils.addDays(today, -80), status: 'Entregue', observacao: 'Tamanho G' },
          { item: 'Moletom', tamanho: 'G', quantidade: 1, dataEntrega: Utils.addDays(today, -80), status: 'Entregue', observacao: 'Tamanho G' },
          { item: 'Colete', tamanho: 'Tamanho Único', quantidade: 1, dataEntrega: Utils.addDays(today, -80), status: 'Entregue', observacao: 'Refletivo Laranja' }
        ]
      },
      {
        id: 'tmp-002',
        nomeCompleto: 'Beatriz Vasconcelos Lima',
        cpf: '234.567.890-12',
        cnpjEmpresa: '01.234.567/0002-60',
        nomeEmpresa: 'CTDI - Filial Louveira / SP',
        cartaoAcesso: 'CR-88911',
        agencia: 'Adecco',
        matriculaAgencia: 'ADC-44120',
        funcao: 'Auxiliar de Logística',
        operacao: 'Expedição Outbound',
        setor: 'Docas',
        gestor: 'Mariana Albuquerque',
        turno: '2º Turno (14h às 22h)',
        dataAdmissao: Utils.addDays(today, -45),
        dataTerminoContrato: Utils.addDays(today, 75), // Marco: Vence em 75 dias (90d)
        statusContrato: 'Ativo',
        beneficios: {
          vr: { quantidade: 'R$ 35,00 / dia', operadora: 'Ticket Restaurante' },
          vt: { quantidade: '2 passagens / dia', operadora: 'EMTU / Top' }
        },
        numeroArmario: null,
        dataEntregaArmario: null,
        dataDevolucaoArmario: null,
        sst: {
          integracaoRealizada: true,
          dataIntegracao: Utils.addDays(today, -45),
          asoRecebido: true,
          dataAso: Utils.addDays(today, -47),
          ddsRealizado: true,
          dataDds: Utils.addDays(today, -44),
          termoUniformeAssinado: true,
          fichaEpiAssinada: true,
          dataFichaEpi: Utils.addDays(today, -45)
        },
        epis: [
          { item: 'Camiseta', tamanho: 'M', quantidade: 2, dataEntrega: Utils.addDays(today, -45), status: 'Entregue', observacao: 'Tamanho M' },
          { item: 'Camiseta Polo', tamanho: 'M', quantidade: 2, dataEntrega: Utils.addDays(today, -45), status: 'Entregue', observacao: 'Tamanho M' },
          { item: 'Moletom', tamanho: 'M', quantidade: 1, dataEntrega: Utils.addDays(today, -45), status: 'Entregue', observacao: 'Tamanho M' },
          { item: 'Colete', tamanho: 'Tamanho Único', quantidade: 1, dataEntrega: Utils.addDays(today, -45), status: 'Entregue', observacao: 'Refletivo Verde' }
        ]
      },
      {
        id: 'tmp-003',
        nomeCompleto: 'Rodrigo Fernandes Matos',
        cpf: '345.678.901-23',
        cnpjEmpresa: '01.234.567/0003-40',
        nomeEmpresa: 'CTDI - Filial Manaus / AM',
        cartaoAcesso: 'CR-88912',
        agencia: 'ManpowerGroup',
        matriculaAgencia: 'MP-77891',
        funcao: 'Operador de Produção',
        operacao: 'Linha de Montagem',
        setor: 'Setor 02 - Solda e Fixação',
        gestor: 'Roberto Mendes',
        turno: '1º Turno (06h às 14h)',
        dataAdmissao: Utils.addDays(today, -60),
        dataTerminoContrato: Utils.addDays(today, 140), // Marco: Vence em 140 dias (180d)
        statusContrato: 'Ativo',
        beneficios: {
          vr: { quantidade: 'R$ 38,00 / dia', operadora: 'Alelo Refeição' },
          vt: { quantidade: '2 passagens / dia', operadora: 'SPTrans' }
        },
        numeroArmario: null,
        dataEntregaArmario: null,
        dataDevolucaoArmario: null,
        sst: {
          integracaoRealizada: true,
          dataIntegracao: Utils.addDays(today, -60),
          asoRecebido: true,
          dataAso: Utils.addDays(today, -62),
          ddsRealizado: true,
          dataDds: Utils.addDays(today, -59),
          termoUniformeAssinado: true,
          fichaEpiAssinada: true,
          dataFichaEpi: Utils.addDays(today, -60)
        },
        epis: [
          { item: 'Camiseta', tamanho: 'GG', quantidade: 3, dataEntrega: Utils.addDays(today, -60), status: 'Entregue', observacao: 'Tamanho GG' },
          { item: 'Camiseta Polo', tamanho: 'GG', quantidade: 2, dataEntrega: Utils.addDays(today, -60), status: 'Entregue', observacao: 'Tamanho GG' },
          { item: 'Moletom', tamanho: 'GG', quantidade: 1, dataEntrega: Utils.addDays(today, -60), status: 'Entregue', observacao: 'Tamanho GG' },
          { item: 'Colete', tamanho: 'GG', quantidade: 1, dataEntrega: Utils.addDays(today, -60), status: 'Entregue', observacao: 'Refletivo Amarelo' }
        ]
      },
      {
        id: 'tmp-004',
        nomeCompleto: 'Gabriel Costa Nogueira',
        cpf: '456.789.012-34',
        cnpjEmpresa: '01.234.567/0001-89',
        nomeEmpresa: 'CTDI Brasil - Matriz (Barueri / SP)',
        cartaoAcesso: 'CR-88915',
        agencia: 'Luandre',
        matriculaAgencia: 'LUA-10293',
        funcao: 'Conferente',
        operacao: 'Logística Inbound',
        setor: 'Armazém Central',
        gestor: 'Carlos Eduardo Silva',
        turno: 'Comercial (08h às 17h)',
        dataAdmissao: Utils.addDays(today, -2),
        dataTerminoContrato: Utils.addDays(today, 240), // Marco: Vence em 240 dias (270d)
        statusContrato: 'Ativo',
        beneficios: {
          vr: { quantidade: 'R$ 40,00 / dia', operadora: 'VR Benefícios' },
          vt: { quantidade: '4 passagens / dia', operadora: 'SPTrans + EMTU' }
        },
        numeroArmario: null,
        dataEntregaArmario: null,
        dataDevolucaoArmario: null,
        sst: {
          integracaoRealizada: false,
          dataIntegracao: null,
          asoRecebido: true,
          dataAso: Utils.addDays(today, -3),
          ddsRealizado: false,
          dataDds: null,
          termoUniformeAssinado: false,
          fichaEpiAssinada: false,
          dataFichaEpi: null
        },
        epis: [
          { item: 'Camiseta', tamanho: 'M', quantidade: 2, dataEntrega: Utils.addDays(today, -2), status: 'Entregue', observacao: 'Tamanho M' },
          { item: 'Camiseta Polo', tamanho: 'M', quantidade: 1, dataEntrega: Utils.addDays(today, -2), status: 'Pendente', observacao: 'Aguardando confecção' },
          { item: 'Moletom', tamanho: 'M', quantidade: 1, dataEntrega: Utils.addDays(today, -2), status: 'Pendente', observacao: 'Aguardando almoxarifado' },
          { item: 'Colete', tamanho: 'Tamanho Único', quantidade: 1, dataEntrega: Utils.addDays(today, -2), status: 'Entregue', observacao: 'Refletivo' }
        ]
      },
      {
        id: 'tmp-005',
        nomeCompleto: 'Juliana Paes Santana',
        cpf: '567.890.123-45',
        cnpjEmpresa: '01.234.567/0003-40',
        nomeEmpresa: 'CTDI - Filial Manaus / AM',
        cartaoAcesso: 'CR-88920',
        agencia: 'Gi Group',
        matriculaAgencia: 'GI-55219',
        funcao: 'Inspetora de Qualidade',
        operacao: 'Controle de Qualidade',
        setor: 'Laboratório e Inspeção',
        gestor: 'Patrícia Souza',
        turno: '2º Turno (14h às 22h)',
        dataAdmissao: Utils.addDays(today, -1),
        dataTerminoContrato: Utils.addDays(today, 320), // Marco: Mais de 270 dias (>270d)
        statusContrato: 'Ativo',
        beneficios: {
          vr: { quantidade: 'R$ 38,00 / dia', operadora: 'Flash Benefícios' },
          vt: { quantidade: '2 passagens / dia', operadora: 'SPTrans' }
        },
        numeroArmario: null,
        dataEntregaArmario: null,
        dataDevolucaoArmario: null,
        sst: {
          integracaoRealizada: true,
          dataIntegracao: Utils.addDays(today, -1),
          asoRecebido: false,
          dataAso: null,
          ddsRealizado: true,
          dataDds: Utils.addDays(today, 0),
          termoUniformeAssinado: true,
          fichaEpiAssinada: true,
          dataFichaEpi: Utils.addDays(today, -1)
        },
        epis: [
          { item: 'Camiseta', tamanho: 'P', quantidade: 2, dataEntrega: Utils.addDays(today, -1), status: 'Entregue', observacao: 'Tamanho P' },
          { item: 'Camiseta Polo', tamanho: 'P', quantidade: 2, dataEntrega: Utils.addDays(today, -1), status: 'Entregue', observacao: 'Tamanho P' },
          { item: 'Moletom', tamanho: 'P', quantidade: 1, dataEntrega: Utils.addDays(today, -1), status: 'Entregue', observacao: 'Tamanho P' },
          { item: 'Colete', tamanho: 'P', quantidade: 1, dataEntrega: Utils.addDays(today, -1), status: 'Entregue', observacao: 'Refletivo' }
        ]
      },
      {
        id: 'tmp-006',
        nomeCompleto: 'Marcos Vinicius Azevedo',
        cpf: '678.901.234-56',
        cnpjEmpresa: '01.234.567/0002-60',
        nomeEmpresa: 'CTDI - Filial Louveira / SP',
        cartaoAcesso: 'CR-88901',
        agencia: 'Randstad',
        matriculaAgencia: 'RS-99302',
        funcao: 'Auxiliar de Logística',
        operacao: 'Expedição Outbound',
        setor: 'Docas',
        gestor: 'Mariana Albuquerque',
        turno: '3º Turno (22h às 06h)',
        dataAdmissao: Utils.addDays(today, -90),
        dataTerminoContrato: Utils.addDays(today, -3), // Contrato já VENCIDO
        statusContrato: 'Ativo',
        beneficios: {
          vr: { quantidade: 'R$ 35,00 / dia', operadora: 'Sodexo' },
          vt: { quantidade: '2 passagens / dia', operadora: 'SPTrans' }
        },
        numeroArmario: null,
        dataEntregaArmario: null,
        dataDevolucaoArmario: null,
        sst: {
          integracaoRealizada: true,
          dataIntegracao: Utils.addDays(today, -90),
          asoRecebido: true,
          dataAso: Utils.addDays(today, -92),
          ddsRealizado: true,
          dataDds: Utils.addDays(today, -89),
          termoUniformeAssinado: true,
          fichaEpiAssinada: true,
          dataFichaEpi: Utils.addDays(today, -90)
        },
        epis: [
          { item: 'Camiseta', tamanho: 'EXG', quantidade: 2, dataEntrega: Utils.addDays(today, -90), status: 'Entregue', observacao: 'Tamanho EXG' },
          { item: 'Camiseta Polo', tamanho: 'EXG', quantidade: 1, dataEntrega: Utils.addDays(today, -90), status: 'Entregue', observacao: 'Tamanho EXG' },
          { item: 'Moletom', tamanho: 'EXG', quantidade: 1, dataEntrega: Utils.addDays(today, -90), status: 'Entregue', observacao: 'Tamanho EXG' },
          { item: 'Colete', tamanho: 'EXG', quantidade: 1, dataEntrega: Utils.addDays(today, -90), status: 'Entregue', observacao: 'Tamanho EXG' }
        ]
      }
    ];
  }

  // Dados Iniciais de Advertências e Suspensões Disciplinares
  function generateInitialDisciplinary(today) {
    return [
      {
        id: 'disc-001',
        employeeId: 'tmp-001',
        nomeCompleto: 'Lucas Henrique Ribeiro',
        cpf: '128.456.789-01',
        cnpjEmpresa: '01.234.567/0001-89',
        nomeEmpresa: 'CTDI Brasil - Matriz (Barueri / SP)',
        agencia: 'Randstad',
        funcao: 'Operador de Empilhadeira',
        operacao: 'Logística Inbound',
        gestor: 'Carlos Eduardo Silva',
        tipo: 'Advertência Escrita',
        diasSuspensao: 0,
        dataInicioSuspensao: null,
        dataFimSuspensao: null,
        motivo: 'Descumprimento de Normas de SST',
        dataFato: Utils.addDays(today, -5),
        dataAplicacao: Utils.addDays(today, -4),
        descricao: 'O colaborador foi flagrado operando a empilhadeira sem a utilização correta do cinto de segurança de três pontos e sem acionar o sinal sonoro obrigatório no cruzamento das docas de recebimento.',
        statusAssinatura: 'Assinada pelo Colaborador',
        testemunha1: 'Marcos Silveira (Supervisor SST)',
        testemunha2: 'Carla Dias (RH)'
      },
      {
        id: 'disc-002',
        employeeId: 'tmp-004',
        nomeCompleto: 'Gabriel Costa Nogueira',
        cpf: '456.789.012-34',
        cnpjEmpresa: '01.234.567/0001-89',
        nomeEmpresa: 'CTDI Brasil - Matriz (Barueri / SP)',
        agencia: 'Luandre',
        funcao: 'Conferente',
        operacao: 'Logística Inbound',
        gestor: 'Carlos Eduardo Silva',
        tipo: 'Advertência Verbal',
        diasSuspensao: 0,
        dataInicioSuspensao: null,
        dataFimSuspensao: null,
        motivo: 'Atrasos Reiterados / Saída Antecipada',
        dataFato: Utils.addDays(today, -1),
        dataAplicacao: Utils.addDays(today, 0),
        descricao: 'Registrou atrasos injustificados no início da jornada de trabalho nos últimos três dias úteis consecutivos, impactando o fluxo da equipe de conferência de mercadorias.',
        statusAssinatura: 'Assinada pelo Colaborador',
        testemunha1: '',
        testemunha2: ''
      },
      {
        id: 'disc-003',
        employeeId: 'tmp-006',
        nomeCompleto: 'Marcos Vinicius Azevedo',
        cpf: '678.901.234-56',
        cnpjEmpresa: '01.234.567/0002-60',
        nomeEmpresa: 'CTDI - Filial Louveira / SP',
        agencia: 'Randstad',
        funcao: 'Auxiliar de Logística',
        operacao: 'Expedição Outbound',
        gestor: 'Mariana Albuquerque',
        tipo: 'Suspensão Disciplinar',
        diasSuspensao: 2,
        dataInicioSuspensao: Utils.addDays(today, -2),
        dataFimSuspensao: Utils.addDays(today, -1),
        motivo: 'Falta Injustificada',
        dataFato: Utils.addDays(today, -3),
        dataAplicacao: Utils.addDays(today, -2),
        descricao: 'Ausentou-se do posto de trabalho durante todo o turno sem apresentar atestado ou justificativa legal prévia ou posterior, após já ter sido advertido verbalmente e por escrito sobre pontualidade e assiduidade.',
        statusAssinatura: 'Recusou-se a Assinar (Com 2 Testemunhas)',
        testemunha1: 'Ricardo Bueno (Líder Operacional)',
        testemunha2: 'Juliana Mendes (Assistente DP)'
      }
    ];
  }

  function syncLockersWithEmployees(lockers, employees) {
    if (!Array.isArray(lockers)) lockers = [];

    // Reseta status de ocupação dos armários existentes
    lockers.forEach(l => {
      if (l.status !== 'Manutenção') {
        l.status = 'Disponível';
        l.ocupadoPorId = null;
        l.ocupadoPorNome = null;
        l.dataEntrega = null;
        l.dataDevolucao = null;
      }
    });

    // Vincula colaboradores ativos exclusivamente aos armários existentes cadastrados manualmente
    (employees || []).forEach(emp => {
      if (emp.statusContrato === 'Ativo' && emp.numeroArmario) {
        let locker = lockers.find(l => l.numero.toUpperCase() === emp.numeroArmario.toUpperCase());
        if (locker && locker.status !== 'Manutenção') {
          locker.status = 'Ocupado';
          locker.ocupadoPorId = emp.id;
          locker.ocupadoPorNome = emp.nomeCompleto;
          locker.dataEntrega = emp.dataEntregaArmario || emp.dataAdmissao;
          locker.dataDevolucao = emp.dataDevolucaoArmario || null;
        }
      }
    });

    return lockers;
  }

  const DataStore = {
    Utils: Utils,

    init() {
      const today = Utils.todayISO();

      // Limpeza de armários, empresas e colaboradores antigos de versões anteriores para garantir atualização instantânea
      [
        'cft_lockers_v1', 'cft_lockers_v2', 'cft_lockers_v3', 'cft_lockers_v4', 'cft_lockers_v5',
        'cft_employees_v1', 'cft_employees_v2', 'cft_employees_v3', 'cft_employees_v4', 'cft_employees_v5', 'cft_employees_v6',
        'cft_companies_v1', 'cft_users_v1', 'cft_session_user_v1', 'cft_disciplinary_v1'
      ].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      // Garante que a base de armários seja inicializada ZERADA
      let lockers = this.getLockers(false);
      if (!lockers || (Array.isArray(lockers) && lockers.some(l => /^ARM-\d+/i.test(l.numero)))) {
        lockers = generateInitialLockers();
        this.saveLockers(lockers);
      }

      let employees = this.getEmployees(false);
      if (!employees || employees.length === 0) {
        employees = generateInitialEmployees(today);
        this.saveEmployees(employees);
      } else {
        // Remove referências a armários fictícios antigos e dados de treinamento que possam ter ficado gravados nos colaboradores
        let empChanged = false;
        employees.forEach(emp => {
          if (emp.numeroArmario && /^ARM-\d+/i.test(emp.numeroArmario)) {
            emp.numeroArmario = null;
            emp.dataEntregaArmario = null;
            empChanged = true;
          }
          if (emp.sst && ('treinamentosConcluidos' in emp.sst || 'treinamentosDescricao' in emp.sst)) {
            delete emp.sst.treinamentosConcluidos;
            delete emp.sst.treinamentosDescricao;
            empChanged = true;
          }
        });
        if (empChanged) {
          localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
        }
      }

      // Sincroniza apenas com armários cadastrados manualmente
      lockers = syncLockersWithEmployees(lockers, employees);
      this.saveLockers(lockers);

      // Inicializa Advertências e Suspensões se não existirem
      let disc = this.getDisciplinary(false);
      if (!disc || disc.length === 0) {
        disc = generateInitialDisciplinary(today);
        this.saveDisciplinary(disc);
      }
    },

    getEmployees(fallbackToEmpty = true) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
        if (!raw) return fallbackToEmpty ? [] : null;
        return JSON.parse(raw);
      } catch (e) {
        console.error('Erro ao ler colaboradores:', e);
        return fallbackToEmpty ? [] : null;
      }
    },

    getEmployeeById(id) {
      const list = this.getEmployees();
      return list.find(e => e.id === id) || null;
    },

    getEmployeeByCPF(cpf) {
      const clean = Utils.cleanCPF(cpf);
      const list = this.getEmployees();
      return list.find(e => Utils.cleanCPF(e.cpf) === clean) || null;
    },

    saveEmployees(employees) {
      try {
        localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
        const lockers = this.getLockers();
        const updatedLockers = syncLockersWithEmployees(lockers, employees);
        this.saveLockers(updatedLockers);
        return true;
      } catch (e) {
        console.error('Erro ao salvar colaboradores:', e);
        return false;
      }
    },

    saveEmployee(employee) {
      const employees = this.getEmployees();
      if (!employee.id) {
        employee.id = Utils.generateId();
        employees.unshift(employee);
      } else {
        const idx = employees.findIndex(e => e.id === employee.id);
        if (idx >= 0) {
          employees[idx] = employee;
        } else {
          employees.unshift(employee);
        }
      }
      return this.saveEmployees(employees);
    },

    deleteEmployee(id) {
      const employees = this.getEmployees().filter(e => e.id !== id);
      return this.saveEmployees(employees);
    },

    getLockers(fallbackToEmpty = true) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCKERS);
        if (!raw) return fallbackToEmpty ? [] : null;
        return JSON.parse(raw);
      } catch (e) {
        console.error('Erro ao ler armários:', e);
        return fallbackToEmpty ? [] : null;
      }
    },

    saveLockers(lockers) {
      try {
        localStorage.setItem(STORAGE_KEY_LOCKERS, JSON.stringify(lockers));
        return true;
      } catch (e) {
        console.error('Erro ao salvar armários:', e);
        return false;
      }
    },

    // Adiciona armário manualmente ao sistema
    addCustomLocker(lockerData) {
      const lockers = this.getLockers();
      const existing = lockers.find(l => l.numero.toUpperCase() === lockerData.numero.toUpperCase());
      if (existing) {
        return { success: false, message: `O armário "${lockerData.numero}" já está cadastrado no sistema.` };
      }

      const newLocker = {
        numero: lockerData.numero.trim().toUpperCase(),
        bloco: lockerData.bloco ? lockerData.bloco.trim() : 'Bloco Geral',
        status: lockerData.status || 'Disponível',
        ocupadoPorId: null,
        ocupadoPorNome: null,
        dataEntrega: lockerData.dataEntrega || null,
        dataDevolucao: lockerData.dataDevolucao || null
      };

      lockers.push(newLocker);
      this.saveLockers(lockers);
      return { success: true, locker: newLocker };
    },

    // Retorna valores distintos para autocompletes / datalists
    getDistinctValues(field) {
      const employees = this.getEmployees();
      const set = new Set();
      employees.forEach(e => {
        if (e[field]) set.add(e[field]);
      });
      return Array.from(set).sort();
    },

    // Importação em lote a partir de planilha
    importEmployeesBatch(importedList) {
      const current = this.getEmployees();
      let added = 0;
      let updated = 0;

      importedList.forEach(item => {
        const cleanCpf = Utils.cleanCPF(item.cpf);
        const existingIdx = cleanCpf ? current.findIndex(e => Utils.cleanCPF(e.cpf) === cleanCpf) : -1;

        if (existingIdx >= 0) {
          // Atualiza registro existente
          current[existingIdx] = {
            ...current[existingIdx],
            ...item,
            id: current[existingIdx].id
          };
          updated++;
        } else {
          // Adiciona novo
          current.unshift({
            ...item,
            id: item.id || Utils.generateId()
          });
          added++;
        }
      });

      this.saveEmployees(current);
      return { added, updated, total: importedList.length };
    },

    // ==========================================
    // MÉTODOS DE ADVERTÊNCIAS E SUSPENSÕES
    // ==========================================
    getDisciplinary(fallbackToEmpty = true) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_DISCIPLINARY);
        if (!raw) return fallbackToEmpty ? [] : null;
        return JSON.parse(raw);
      } catch (e) {
        console.error('Erro ao ler advertências/suspensões:', e);
        return fallbackToEmpty ? [] : null;
      }
    },

    saveDisciplinary(list) {
      try {
        localStorage.setItem(STORAGE_KEY_DISCIPLINARY, JSON.stringify(list || []));
        return true;
      } catch (e) {
        console.error('Erro ao salvar advertências/suspensões:', e);
        return false;
      }
    },

    addDisciplinary(item) {
      const list = this.getDisciplinary();
      if (!item.id) {
        item.id = 'disc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      }
      list.unshift(item);
      this.saveDisciplinary(list);
      return item;
    },

    deleteDisciplinary(id) {
      const list = this.getDisciplinary().filter(d => d.id !== id);
      return this.saveDisciplinary(list);
    },

    getDisciplinaryByEmployee(employeeId) {
      const list = this.getDisciplinary();
      return list.filter(d => d.employeeId === employeeId);
    },

    resetToDefault() {
      const today = Utils.todayISO();
      const employees = generateInitialEmployees(today);
      let lockers = generateInitialLockers();
      lockers = syncLockersWithEmployees(lockers, employees);
      const disciplinary = generateInitialDisciplinary(today);

      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
      localStorage.setItem(STORAGE_KEY_LOCKERS, JSON.stringify(lockers));
      localStorage.setItem(STORAGE_KEY_DISCIPLINARY, JSON.stringify(disciplinary));
      return { employees, lockers, disciplinary };
    }
  };

  DataStore.init();
  window.DataStore = DataStore;
})(window);
