/**
 * AuthService - Gestão Multi-Empresa por CNPJ e Controle de Acessos (RBAC)
 * Sistema de Controle de Funcionários Temporários
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_COMPANIES = 'cft_companies_v2';
  const STORAGE_KEY_USERS = 'cft_users_v2';
  const STORAGE_KEY_CURRENT_USER = 'cft_session_user_v2';

  // Empresas iniciais (Unidades CTDI do Brasil por CNPJ)
  const defaultCompanies = [
    {
      id: 'emp-01',
      cnpj: '01.234.567/0001-89',
      razaoSocial: 'CTDI do Brasil Manutenção e Logística Ltda.',
      nomeFantasia: 'CTDI Brasil - Matriz (Barueri / SP)',
      cidadeUF: 'Barueri - SP'
    },
    {
      id: 'emp-02',
      cnpj: '01.234.567/0002-60',
      razaoSocial: 'CTDI do Brasil Manutenção e Logística Ltda.',
      nomeFantasia: 'CTDI - Filial Louveira / SP',
      cidadeUF: 'Louveira - SP'
    },
    {
      id: 'emp-03',
      cnpj: '01.234.567/0003-40',
      razaoSocial: 'CTDI do Brasil Manutenção e Logística Ltda.',
      nomeFantasia: 'CTDI - Filial Manaus / AM',
      cidadeUF: 'Manaus - AM'
    }
  ];

  // Usuários / Gestores com diferentes escopos de acesso corporativo CTDI
  const defaultUsers = [
    {
      id: 'user-admin',
      nome: 'RH Corporativo CTDI (Admin Geral)',
      email: 'rh.corporativo@ctdi.com.br',
      perfil: 'ADMIN', // ADMIN: vê todos os CNPJs e todos os gestores
      cnpjVinculado: 'TODOS',
      filtroApenasMeusColaboradores: false,
      cargo: 'Gestão de Recursos Humanos CTDI'
    },
    {
      id: 'user-carlos',
      nome: 'Carlos Eduardo Silva',
      email: 'carlos.silva@ctdi.com.br',
      perfil: 'GESTOR',
      cnpjVinculado: '01.234.567/0001-89', // Apenas CTDI Barueri
      filtroApenasMeusColaboradores: true, // Apenas colaboradores onde ele é o Gestor Responsável
      cargo: 'Gerente de Operações (Barueri)'
    },
    {
      id: 'user-mariana',
      nome: 'Mariana Albuquerque',
      email: 'mariana.albuquerque@ctdi.com.br',
      perfil: 'GESTOR',
      cnpjVinculado: '01.234.567/0002-60', // Apenas CTDI Louveira
      filtroApenasMeusColaboradores: true,
      cargo: 'Supervisora de Operações (Louveira)'
    },
    {
      id: 'user-roberto',
      nome: 'Roberto Mendes',
      email: 'roberto.mendes@ctdi.com.br',
      perfil: 'GESTOR',
      cnpjVinculado: '01.234.567/0003-40', // Apenas CTDI Manaus
      filtroApenasMeusColaboradores: false, // Vê todos os colaboradores da filial
      cargo: 'Coordenador Geral de Produção (Manaus)'
    }
  ];

  const AuthService = {
    init() {
      if (!localStorage.getItem(STORAGE_KEY_COMPANIES)) {
        localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(defaultCompanies));
      }
      if (!localStorage.getItem(STORAGE_KEY_USERS)) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(defaultUsers));
      }
      if (!localStorage.getItem(STORAGE_KEY_CURRENT_USER)) {
        // Inicia logado como Admin para fácil exploração
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(defaultUsers[0]));
      }
    },

    getCompanies() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_COMPANIES)) || defaultCompanies;
      } catch (e) {
        return defaultCompanies;
      }
    },

    saveCompany(company) {
      const companies = this.getCompanies();
      if (!company.id) {
        company.id = 'emp-' + Date.now();
        companies.push(company);
      } else {
        const idx = companies.findIndex(c => c.id === company.id);
        if (idx >= 0) companies[idx] = company;
        else companies.push(company);
      }
      localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(companies));
      return company;
    },

    getUsers() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS)) || defaultUsers;
      } catch (e) {
        return defaultUsers;
      }
    },

    saveUser(user) {
      const users = this.getUsers();
      if (!user.id) {
        user.id = 'usr-' + Date.now();
        users.push(user);
      } else {
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) users[idx] = user;
        else users.push(user);
      }
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
      return user;
    },

    getCurrentUser() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        if (!raw) return defaultUsers[0];
        return JSON.parse(raw);
      } catch (e) {
        return defaultUsers[0];
      }
    },

    setCurrentUser(userId) {
      const users = this.getUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
        return user;
      }
      return null;
    },

    /**
     * Aplica o filtro de escopo nos funcionários com base no usuário logado:
     * - Se ADMIN: Vê todos os colaboradores (ou pode filtrar pelo CNPJ selecionado).
     * - Se GESTOR:
     *   1. Filtra obrigatoriamente pelo CNPJ vinculado ao usuário.
     *   2. Se filtroApenasMeusColaboradores === true, filtra também pelo nome do gestor.
     */
    filterScopedEmployees(employees, selectedCnpjFilter = null) {
      const user = this.getCurrentUser();
      if (!user) return employees;

      return (employees || []).filter(emp => {
        // Se for Admin
        if (user.perfil === 'ADMIN') {
          if (selectedCnpjFilter && selectedCnpjFilter !== 'TODOS') {
            return emp.cnpjEmpresa === selectedCnpjFilter;
          }
          return true;
        }

        // Se for Gestor com CNPJ vinculado
        if (user.cnpjVinculado && user.cnpjVinculado !== 'TODOS') {
          if (emp.cnpjEmpresa && emp.cnpjEmpresa !== user.cnpjVinculado) {
            return false;
          }
        }

        // Se o gestor só deve acessar os colaboradores dele
        if (user.filtroApenasMeusColaboradores) {
          const empGestor = (emp.gestor || '').toLowerCase().trim();
          const userNome = (user.nome || '').toLowerCase().trim();
          if (empGestor !== userNome && !empGestor.includes(userNome) && !userNome.includes(empGestor)) {
            return false;
          }
        }

        return true;
      });
    },

    /**
     * Retorna a descrição do escopo do usuário para exibição no cabeçalho
     */
    getUserScopeLabel() {
      const user = this.getCurrentUser();
      if (user.perfil === 'ADMIN') {
        return {
          tipo: 'Acesso Geral',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          empresaTexto: 'Todos os CNPJs (Acesso Corporativo Total)',
          gestorTexto: user.nome
        };
      } else {
        const companies = this.getCompanies();
        const emp = companies.find(c => c.cnpj === user.cnpjVinculado);
        const empNome = emp ? `${emp.nomeFantasia} (${emp.cnpj})` : user.cnpjVinculado;
        const escopoRestrito = user.filtroApenasMeusColaboradores 
          ? 'Visualizando apenas colaboradores sob sua gestão direta'
          : 'Visualizando todos os colaboradores deste CNPJ';

        return {
          tipo: 'Acesso Restrito por CNPJ & Gestor',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          empresaTexto: empNome,
          gestorTexto: `${user.nome} • ${escopoRestrito}`
        };
      }
    }
  };

  AuthService.init();
  window.AuthService = AuthService;
})(window);
