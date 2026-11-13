/**
 * App - Controlador Central da Aplicação (Versão 3.0 Multi-Empresa e RBAC)
 * Sistema de Controle de Funcionários Temporários
 */

(function (window) {
  'use strict';

  let currentView = 'dashboard';
  let editingEmployeeId = null;
  let parsedExcelData = [];
  let reportCurrentFilter = {
    statusContrato: 'Ativo',
    operacao: 'TODAS',
    agencia: 'TODAS',
    setor: 'TODOS',
    turno: 'TODOS',
    statusLiberacao: 'TODOS',
    faixaVencimento: 'TODOS',
    temArmario: 'TODOS'
  };

  const App = {
    init() {
      this.bindNavigation();
      this.bindGlobalEvents();
      this.bindFormEvents();
      this.bindReportEvents();
      this.bindLockerEvents();
      this.bindEPIEvents();
      this.bindDisciplinaryEvents();
      this.bindExcelImportEvents();
      this.bindAuthEvents();
      
      this.updateUserHeaderScope();
      this.navigateTo('dashboard');
      this.updateHeaderAlerts();
    },

    // ==========================================
    // NAVEGAÇÃO ENTRE TELAS
    // ==========================================
    bindNavigation() {
      const navLinks = document.querySelectorAll('[data-view-target]');
      navLinks.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const target = btn.getAttribute('data-view-target');
          this.navigateTo(target);
        });
      });
    },

    navigateTo(viewName) {
      currentView = viewName;

      const views = document.querySelectorAll('.app-view');
      views.forEach(v => v.classList.add('hidden'));

      const targetView = document.getElementById(`view-${viewName}`);
      if (targetView) {
        targetView.classList.remove('hidden');
      }

      const navLinks = document.querySelectorAll('[data-view-target]');
      navLinks.forEach(link => {
        const target = link.getAttribute('data-view-target');
        if (target === viewName) {
          link.classList.add('bg-[#002868]', 'text-white', 'shadow-md', 'shadow-blue-950/20', 'font-bold');
          link.classList.remove('text-slate-600', 'hover:bg-slate-100', 'bg-blue-600');
        } else {
          link.classList.remove('bg-[#002868]', 'text-white', 'shadow-md', 'shadow-blue-950/20', 'font-bold', 'bg-blue-600');
          link.classList.add('text-slate-600', 'hover:bg-slate-100');
        }
      });

      if (viewName === 'dashboard') {
        this.renderDashboard();
      } else if (viewName === 'employees') {
        this.renderEmployeesTable();
      } else if (viewName === 'lockers') {
        this.renderLockersGrid();
      } else if (viewName === 'epis') {
        this.renderEPITable();
      } else if (viewName === 'disciplinary') {
        this.renderDisciplinaryView();
      } else if (viewName === 'alerts') {
        this.renderAlertsView();
      } else if (viewName === 'reports') {
        this.renderReportsView();
      } else if (viewName === 'companies') {
        this.renderCompaniesView();
      } else if (viewName === 'form') {
        if (!editingEmployeeId) {
          this.resetEmployeeForm();
        }
      }

      this.updateHeaderAlerts();
      this.updateUserHeaderScope();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ==========================================
    // TOASTS E NOTIFICAÇÕES
    // ==========================================
    showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      if (!container) return;

      const toast = document.createElement('div');
      const colors = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-rose-600 text-white',
        warning: 'bg-amber-500 text-white',
        info: 'bg-slate-800 text-white'
      };

      const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';

      toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all transform duration-300 translate-y-2 opacity-0 ${colors[type] || colors.info}`;
      toast.innerHTML = `<span class="font-bold text-base">${icon}</span><span>${message}</span>`;

      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      }, 10);

      setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },

    // ==========================================
    // MULTI-EMPRESA & CONTROLE DE ACESSO (RBAC)
    // ==========================================
    updateUserHeaderScope() {
      if (!window.AuthService) return;
      const scope = window.AuthService.getUserScopeLabel();
      const compEl = document.getElementById('headerUserCompany');
      const userEl = document.getElementById('headerUserName');
      if (compEl) compEl.textContent = scope.empresaTexto;
      if (userEl) userEl.textContent = scope.gestorTexto;
    },

    openSwitchUserModal() {
      const modal = document.getElementById('modalSwitchUser');
      if (!modal) return;

      const users = window.AuthService.getUsers();
      const currentUser = window.AuthService.getCurrentUser();
      const companies = window.AuthService.getCompanies();
      const container = document.getElementById('switchUserCardsContainer');

      if (container) {
        container.innerHTML = users.map(u => {
          const isCurrent = u.id === currentUser.id;
          const comp = companies.find(c => c.cnpj === u.cnpjVinculado);
          const compNome = u.cnpjVinculado === 'TODOS' ? 'Todos os CNPJs (Corporativo Geral)' : (comp ? `${comp.nomeFantasia} - CNPJ: ${comp.cnpj}` : u.cnpjVinculado);
          const regraDesc = u.perfil === 'ADMIN' 
            ? 'Acesso irrestrito a todos os colaboradores de todos os CNPJs'
            : u.filtroApenasMeusColaboradores 
              ? `Acessa somente temporários onde Gestor Responsável = "${u.nome}" neste CNPJ`
              : `Acessa todos os temporários deste CNPJ`;

          return `
            <div class="p-3.5 border rounded-2xl flex items-center justify-between transition-all ${isCurrent ? 'bg-indigo-50/70 border-indigo-400 shadow-xs ring-2 ring-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}">
              <div class="space-y-0.5 text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 text-sm">${u.nome}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.perfil === 'ADMIN' ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-800'}">${u.perfil}</span>
                  ${isCurrent ? '<span class="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded-md">✓ Usuário Atual</span>' : ''}
                </div>
                <div class="text-slate-600 font-medium">${u.cargo || ''} • 🏢 ${compNome}</div>
                <div class="text-[11px] text-slate-500 italic">${regraDesc}</div>
              </div>
              <div>
                ${!isCurrent ? `
                  <button onclick="App.switchUser('${u.id}')" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all">
                    Acessar
                  </button>
                ` : '<span class="text-xs text-indigo-600 font-bold px-3">Ativo</span>'}
              </div>
            </div>
          `;
        }).join('');
      }

      modal.classList.remove('hidden');
    },

    closeSwitchUserModal() {
      const modal = document.getElementById('modalSwitchUser');
      if (modal) modal.classList.add('hidden');
    },

    switchUser(userId) {
      const u = window.AuthService.setCurrentUser(userId);
      if (u) {
        this.closeSwitchUserModal();
        this.updateUserHeaderScope();
        this.showToast(`Acesso alternado para "${u.nome}"! Os dados foram filtrados de acordo com o escopo.`, 'success');
        this.navigateTo(currentView);
      }
    },

    bindAuthEvents() {
      const formComp = document.getElementById('formNewCompany');
      if (formComp) {
        formComp.addEventListener('submit', (e) => {
          e.preventDefault();
          const cnpj = document.getElementById('newCompanyCNPJ').value.trim();
          const nomeFantasia = document.getElementById('newCompanyNomeFantasia').value.trim();
          const razaoSocial = document.getElementById('newCompanyRazaoSocial').value.trim();
          const cidadeUF = document.getElementById('newCompanyCidade').value.trim();

          window.AuthService.saveCompany({ cnpj, nomeFantasia, razaoSocial, cidadeUF });
          this.showToast(`Empresa "${nomeFantasia}" cadastrada com sucesso!`, 'success');
          this.closeCompanyModal();
          this.renderCompaniesView();
        });
      }

      const formUsr = document.getElementById('formNewUser');
      if (formUsr) {
        formUsr.addEventListener('submit', (e) => {
          e.preventDefault();
          const nome = document.getElementById('newUserNome').value.trim();
          const cargo = document.getElementById('newUserCargo').value.trim();
          const email = document.getElementById('newUserEmail').value.trim();
          const perfil = document.getElementById('newUserPerfil').value;
          const cnpjVinculado = document.getElementById('newUserCnpjVinculado').value;
          const filtroApenasMeusColaboradores = document.getElementById('newUserApenasMeusColabs').checked;

          window.AuthService.saveUser({
            nome,
            cargo,
            email,
            perfil,
            cnpjVinculado,
            filtroApenasMeusColaboradores
          });
          this.showToast(`Gestor "${nome}" cadastrado com sucesso!`, 'success');
          this.closeUserModal();
          this.renderCompaniesView();
        });
      }
    },

    openCompanyModal() {
      const modal = document.getElementById('modalCompanyForm');
      if (modal) {
        document.getElementById('newCompanyCNPJ').value = '';
        document.getElementById('newCompanyNomeFantasia').value = '';
        document.getElementById('newCompanyRazaoSocial').value = '';
        document.getElementById('newCompanyCidade').value = '';
        modal.classList.remove('hidden');
      }
    },

    closeCompanyModal() {
      const modal = document.getElementById('modalCompanyForm');
      if (modal) modal.classList.add('hidden');
    },

    openUserModal() {
      const modal = document.getElementById('modalUserForm');
      if (modal) {
        document.getElementById('newUserNome').value = '';
        document.getElementById('newUserCargo').value = '';
        document.getElementById('newUserEmail').value = '';
        document.getElementById('newUserPerfil').value = 'GESTOR';
        document.getElementById('newUserApenasMeusColabs').checked = true;

        const selectCnpj = document.getElementById('newUserCnpjVinculado');
        if (selectCnpj) {
          selectCnpj.innerHTML = '<option value="TODOS">Todos os CNPJs (Apenas Admin)</option>';
          const companies = window.AuthService.getCompanies();
          companies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.cnpj;
            opt.textContent = `${c.nomeFantasia} (${c.cnpj})`;
            selectCnpj.appendChild(opt);
          });
        }

        modal.classList.remove('hidden');
      }
    },

    closeUserModal() {
      const modal = document.getElementById('modalUserForm');
      if (modal) modal.classList.add('hidden');
    },

    renderCompaniesView() {
      const companies = window.AuthService.getCompanies();
      const users = window.AuthService.getUsers();
      const allEmployees = window.DataStore.getEmployees();

      const containerComp = document.getElementById('companiesListContainer');
      const badgeCount = document.getElementById('companiesCountBadge');
      if (badgeCount) badgeCount.textContent = `${companies.length} CNPJs cadastrados`;

      if (containerComp) {
        containerComp.innerHTML = companies.map(c => {
          const count = allEmployees.filter(e => e.cnpjEmpresa === c.cnpj && e.statusContrato === 'Ativo').length;
          return `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-300 transition-all space-y-2">
              <div class="flex items-start justify-between">
                <span class="font-bold text-slate-900 text-sm">${c.nomeFantasia}</span>
                <span class="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">${count} ativos</span>
              </div>
              <div class="text-xs space-y-0.5 text-slate-600 font-mono">
                <div>CNPJ: <strong class="text-slate-800">${c.cnpj}</strong></div>
                <div class="text-[11px] font-sans text-slate-500">${c.razaoSocial}</div>
                <div class="text-[11px] font-sans text-slate-400">📍 ${c.cidadeUF}</div>
              </div>
            </div>
          `;
        }).join('');
      }

      const tbodyUsers = document.getElementById('usersTableBody');
      if (tbodyUsers) {
        tbodyUsers.innerHTML = users.map(u => {
          const comp = companies.find(c => c.cnpj === u.cnpjVinculado);
          const compLabel = u.cnpjVinculado === 'TODOS' ? 'Todos os CNPJs (Global)' : (comp ? `${comp.nomeFantasia} (${comp.cnpj})` : u.cnpjVinculado);
          const escopoLabel = u.perfil === 'ADMIN' 
            ? '<span class="text-emerald-700 font-semibold">Acesso Irrestrito (Todos os dados)</span>'
            : u.filtroApenasMeusColaboradores 
              ? '<span class="text-amber-700 font-semibold">Apenas colaboradores sob sua gestão</span>'
              : '<span class="text-blue-700 font-semibold">Todos os colaboradores do CNPJ</span>';

          return `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
              <td class="py-3 px-4 font-bold text-slate-900">${u.nome}</td>
              <td class="py-3 px-4 text-slate-600">${u.cargo || '-'}</td>
              <td class="py-3 px-4 font-mono text-slate-500">${u.email}</td>
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-0.5 rounded-full text-xs font-bold ${u.perfil === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}">
                  ${u.perfil}
                </span>
              </td>
              <td class="py-3 px-4 font-medium text-slate-700">${compLabel}</td>
              <td class="py-3 px-4">${escopoLabel}</td>
              <td class="py-3 px-4 text-right">
                <button onclick="App.switchUser('${u.id}')" class="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                  Simular Acesso
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    },

    // ==========================================
    // SINO DE ALERTAS DO HEADER
    // ==========================================
    updateHeaderAlerts() {
      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);
      const allAlerts = window.AlertService.getAllAlerts(employees);
      const badge = document.getElementById('headerAlertBadge');
      const list = document.getElementById('headerAlertDropdownList');

      if (badge) {
        if (allAlerts.totalAlertsCount > 0) {
          badge.textContent = allAlerts.totalAlertsCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (list) {
        let html = '';
        if (allAlerts.totalAlertsCount === 0) {
          html = '<div class="p-4 text-center text-xs text-slate-500">Nenhum alerta pendente no seu escopo de gestão.</div>';
        } else {
          (allAlerts.expiring.vencidos || []).forEach(item => {
            html += `<div class="p-3 border-b border-slate-100 hover:bg-rose-50 cursor-pointer text-xs" onclick="App.navigateTo('alerts')">
              <span class="font-semibold text-rose-700">Contrato Vencido:</span> ${item.emp.nomeCompleto} (${item.cat.label})
            </div>`;
          });
          (allAlerts.expiring.marco30 || []).forEach(item => {
            html += `<div class="p-3 border-b border-slate-100 hover:bg-red-50 cursor-pointer text-xs" onclick="App.navigateTo('alerts')">
              <span class="font-semibold text-red-700">Vencendo em até 30 dias:</span> ${item.emp.nomeCompleto} (${item.cat.label})
            </div>`;
          });
          (allAlerts.expiring.marco90 || []).forEach(item => {
            html += `<div class="p-3 border-b border-slate-100 hover:bg-amber-50 cursor-pointer text-xs" onclick="App.navigateTo('alerts')">
              <span class="font-semibold text-amber-700">Vencendo em até 90 dias:</span> ${item.emp.nomeCompleto} (${item.cat.label})
            </div>`;
          });
          (allAlerts.expiring.marco180 || []).forEach(item => {
            html += `<div class="p-3 border-b border-slate-100 hover:bg-yellow-50 cursor-pointer text-xs" onclick="App.navigateTo('alerts')">
              <span class="font-semibold text-yellow-700">Vencendo em até 180 dias:</span> ${item.emp.nomeCompleto} (${item.cat.label})
            </div>`;
          });
          (allAlerts.expiring.marco270 || []).forEach(item => {
            html += `<div class="p-3 border-b border-slate-100 hover:bg-blue-50 cursor-pointer text-xs" onclick="App.navigateTo('alerts')">
              <span class="font-semibold text-blue-700">Vencendo em até 270 dias:</span> ${item.emp.nomeCompleto} (${item.cat.label})
            </div>`;
          });
          (allAlerts.pendingPPE || []).forEach(item => {
            html += `<div class="p-3 border-b border-slate-100 hover:bg-purple-50 cursor-pointer text-xs" onclick="App.navigateTo('alerts')">
              <span class="font-semibold text-purple-700">Uniforme a Devolver:</span> ${item.colaborador.nomeCompleto} (${item.episPendentes.length} item(ns))
            </div>`;
          });
          (allAlerts.sstBlocked || []).forEach(emp => {
            html += `<div class="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-xs" onclick="App.viewEmployeeDetails('${emp.id}')">
              <span class="font-semibold text-slate-700">SST Bloqueado:</span> ${emp.nomeCompleto}
            </div>`;
          });
        }
        list.innerHTML = html;
      }
    },

    // ==========================================
    // DASHBOARD
    // ==========================================
    renderDashboard() {
      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);
      const lockerStats = window.LockerService.getStats();
      const sstSummary = window.SSTService.getSummary(employees);
      const allAlerts = window.AlertService.getAllAlerts(employees);

      const activeCount = employees.filter(e => e.statusContrato === 'Ativo').length;
      document.getElementById('kpiAtivos').textContent = activeCount;
      document.getElementById('kpiArmariosDisp').textContent = lockerStats.disponiveis;
      document.getElementById('kpiArmariosOcup').textContent = lockerStats.ocupados;
      document.getElementById('kpiVencendo').textContent = allAlerts.expiring.total;

      const allDisciplinary = window.DataStore.getDisciplinary();
      const scopedDisciplinary = this.filterScopedDisciplinary(allDisciplinary, employees);
      const kpiAdvEl = document.getElementById('kpiAdvertencias');
      if (kpiAdvEl) kpiAdvEl.textContent = scopedDisciplinary.length;

      document.getElementById('kpiPendenciasSST').textContent = sstSummary.bloqueados;

      const alertsContainer = document.getElementById('dashboardAlertsList');
      if (alertsContainer) {
        let itemsHtml = '';
        const criticalItems = [
          ...(allAlerts.expiring.vencidos || []).map(i => ({
            badge: 'Contrato Vencido',
            badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
            nome: i.emp.nomeCompleto,
            detalhe: `${i.cat.label} • Agência: ${i.emp.agencia} • Armário: ${i.emp.numeroArmario || 'Nenhum'}`,
            id: i.emp.id,
            action: 'ficha'
          })),
          ...(allAlerts.expiring.marco30 || []).map(i => ({
            badge: 'Vencimento <= 30d',
            badgeClass: 'bg-red-100 text-red-800 border-red-300',
            nome: i.emp.nomeCompleto,
            detalhe: `${i.cat.label} • Agência: ${i.emp.agencia} • Operação: ${i.emp.operacao}`,
            id: i.emp.id,
            action: 'ficha'
          })),
          ...scopedDisciplinary.filter(d => d.tipo === 'Suspensão Disciplinar').slice(0, 2).map(d => ({
            badge: `Suspensão (${d.diasSuspensao}d)`,
            badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
            nome: d.nomeCompleto,
            detalhe: `${d.motivo} • Aplicada em: ${window.DataStore.Utils.formatDateBR(d.dataAplicacao)} • ${d.statusAssinatura}`,
            id: d.id,
            action: 'termo'
          }))
        ];

        if (criticalItems.length === 0) {
          itemsHtml = '<div class="p-6 text-center text-slate-500 text-sm">Nenhuma ocorrência crítica ativa no momento para o seu escopo. Operação regularizada!</div>';
        } else {
          itemsHtml = criticalItems.slice(0, 6).map(it => `
            <div class="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 rounded-full font-semibold border ${it.badgeClass}">${it.badge}</span>
                  <span class="text-sm font-semibold text-slate-800">${it.nome}</span>
                </div>
                <p class="text-xs text-slate-500">${it.detalhe}</p>
              </div>
              <div class="flex gap-2">
                ${it.action === 'termo' ? `
                  <button onclick="App.openPrintDisciplinaryModal('${it.id}')" class="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                    Ver Termo
                  </button>
                ` : `
                  <button onclick="App.viewEmployeeDetails('${it.id}')" class="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    Ver Ficha
                  </button>
                `}
              </div>
            </div>
          `).join('');
        }
        alertsContainer.innerHTML = itemsHtml;
      }

      window.ChartsService.renderOperacaoChart(employees);
      window.ChartsService.renderAgenciaChart(employees);
      window.ChartsService.renderArmariosChart(window.DataStore.getLockers());
      window.ChartsService.renderSSTChart(employees);
    },

    // ==========================================
    // TABELA DE TEMPORÁRIOS & CONSULTA RÁPIDA
    // ==========================================
    renderEmployeesTable() {
      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);
      const searchInput = document.getElementById('searchEmployeeInput');
      const statusFilter = document.getElementById('filterStatusContrato');
      const operacaoFilter = document.getElementById('filterOperacao');
      const agenciaFilter = document.getElementById('filterAgencia');

      const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const statusVal = statusFilter ? statusFilter.value : 'TODOS';
      const operacaoVal = operacaoFilter ? operacaoFilter.value : 'TODAS';
      const agenciaVal = agenciaFilter ? agenciaFilter.value : 'TODAS';

      this.populateFilterDropdowns(employees);

      const filtered = employees.filter(emp => {
        if (searchTerm) {
          const nameMatch = (emp.nomeCompleto || '').toLowerCase().includes(searchTerm);
          const cpfMatch = (emp.cpf || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
          const agenciaMatch = (emp.agencia || '').toLowerCase().includes(searchTerm);
          const matMatch = (emp.matriculaAgencia || '').toLowerCase().includes(searchTerm);
          const armMatch = (emp.numeroArmario || '').toLowerCase().includes(searchTerm);
          const cartaoMatch = (emp.cartaoAcesso || '').toLowerCase().includes(searchTerm);
          const compMatch = (emp.nomeEmpresa || '').toLowerCase().includes(searchTerm) || (emp.cnpjEmpresa || '').includes(searchTerm);
          if (!nameMatch && !cpfMatch && !agenciaMatch && !matMatch && !armMatch && !cartaoMatch && !compMatch) return false;
        }

        if (statusVal !== 'TODOS' && emp.statusContrato !== statusVal) return false;
        if (operacaoVal !== 'TODAS' && emp.operacao !== operacaoVal) return false;
        if (agenciaVal !== 'TODAS' && emp.agencia !== agenciaVal) return false;

        return true;
      });

      const tbody = document.getElementById('employeesTableBody');
      const countEl = document.getElementById('employeesCountBadge');
      if (countEl) countEl.textContent = `${filtered.length} registro(s)`;

      if (!tbody) return;

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr>
          <td colspan="9" class="text-center py-8 text-slate-400 text-sm">
            Nenhum funcionário temporário encontrado no seu escopo de gestão.
          </td>
        </tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(emp => {
        const evalSST = window.SSTService.evaluateStatus(emp.sst);
        const sstBadge = window.SSTService.renderBadge(evalSST);
        const vencBadge = window.AlertService.renderContractBadge(emp.dataTerminoContrato);
        
        const lockerBadge = emp.numeroArmario 
          ? `<span class="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">${emp.numeroArmario}</span>`
          : '<span class="text-xs text-slate-400 italic">Sem armário</span>';

        const cartaoBadge = emp.cartaoAcesso
          ? `<span class="font-mono text-xs text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded">${emp.cartaoAcesso}</span>`
          : '<span class="text-xs text-slate-400">-</span>';

        const vrText = emp.beneficios?.vr?.operadora || emp.beneficios?.vr?.quantidade ? 'VR' : '';
        const vtText = emp.beneficios?.vt?.operadora || emp.beneficios?.vt?.quantidade ? 'VT' : '';
        const benefBadge = (vrText || vtText)
          ? `<span class="inline-flex gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">${[vrText, vtText].filter(Boolean).join(' + ')}</span>`
          : '<span class="text-xs text-slate-400">-</span>';

        return `
          <tr class="hover:bg-slate-50/70 border-b border-slate-100 transition-colors text-xs text-slate-700">
            <td class="py-3 px-4">
              <div class="font-semibold text-slate-900 text-sm">${emp.nomeCompleto}</div>
              <div class="text-slate-400 font-mono text-[11px]">${emp.cpf || '-'} • <span class="text-blue-600 font-semibold">${emp.nomeEmpresa || emp.cnpjEmpresa || 'Matriz'}</span></div>
            </td>
            <td class="py-3 px-4">
              <div class="font-medium text-slate-800">${emp.agencia}</div>
              <div class="text-slate-400 text-[11px]">Mat: ${emp.matriculaAgencia || '-'}</div>
            </td>
            <td class="py-3 px-4">
              <div class="font-medium text-slate-800">${emp.funcao}</div>
              <div class="text-slate-500 text-[11px]">${emp.operacao} • Gestor: <strong>${emp.gestor}</strong></div>
            </td>
            <td class="py-3 px-4 text-center">
              ${cartaoBadge}
            </td>
            <td class="py-3 px-4 text-center">
              ${lockerBadge}
            </td>
            <td class="py-3 px-4 text-center">
              ${sstBadge}
            </td>
            <td class="py-3 px-4 text-center">
              ${vencBadge}
              <div class="text-[11px] text-slate-400 mt-0.5">Término: ${window.DataStore.Utils.formatDateBR(emp.dataTerminoContrato)}</div>
            </td>
            <td class="py-3 px-4 text-center">
              ${benefBadge}
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="App.viewEmployeeDetails('${emp.id}')" title="Visualizar Ficha Completa" class="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </button>
                <button onclick="App.editEmployee('${emp.id}')" title="Editar Cadastro" class="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onclick="App.openReturnModal('${emp.id}')" title="Devolução de Uniforme e Armário" class="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                </button>
                <button onclick="App.deleteEmployee('${emp.id}', '${emp.nomeCompleto}')" title="Excluir Colaborador" class="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    populateFilterDropdowns(employees) {
      const operacoes = Array.from(new Set(employees.map(e => e.operacao).filter(Boolean)));
      const agencias = Array.from(new Set(employees.map(e => e.agencia).filter(Boolean)));

      const opSelect = document.getElementById('filterOperacao');
      if (opSelect) {
        const cur = opSelect.value;
        opSelect.innerHTML = '<option value="TODAS">Todas as Operações</option>';
        operacoes.forEach(op => {
          const opt = document.createElement('option');
          opt.value = op;
          opt.textContent = op;
          if (op === cur) opt.selected = true;
          opSelect.appendChild(opt);
        });
      }

      const agSelect = document.getElementById('filterAgencia');
      if (agSelect) {
        const cur = agSelect.value;
        agSelect.innerHTML = '<option value="TODAS">Todas as Agências</option>';
        agencias.forEach(ag => {
          const opt = document.createElement('option');
          opt.value = ag;
          opt.textContent = ag;
          if (ag === cur) opt.selected = true;
          agSelect.appendChild(opt);
        });
      }
    },

    // ==========================================
    // FORMULÁRIO DE CADASTRO / EDIÇÃO
    // ==========================================
    bindFormEvents() {
      const form = document.getElementById('formEmployee');
      if (!form) return;

      const cpfInput = document.getElementById('formCPF');
      if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
          let v = e.target.value.replace(/\D/g, '');
          if (v.length > 11) v = v.substring(0, 11);
          e.target.value = window.DataStore.Utils.formatCPF(v);
        });
      }

      const lockerInput = document.getElementById('formNumeroArmario');
      if (lockerInput) {
        lockerInput.addEventListener('input', () => {
          const num = lockerInput.value.trim().toUpperCase();
          const warningEl = document.getElementById('formLockerWarning');
          if (!num) {
            if (warningEl) warningEl.classList.add('hidden');
            return;
          }

          const validation = window.LockerService.validateAssignment(num, editingEmployeeId);
          if (!validation.valid) {
            if (warningEl) {
              warningEl.textContent = validation.message;
              warningEl.classList.remove('hidden');
            }
          } else {
            if (warningEl) {
              warningEl.classList.add('hidden');
            }
          }
        });
      }

      const sstCheckboxes = ['sstIntegracao', 'sstAso', 'sstFichaEpi'];
      sstCheckboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => this.updateFormSSTPreview());
        }
      });

      const btnAddEpi = document.getElementById('btnAddEpiRow');
      if (btnAddEpi) {
        btnAddEpi.addEventListener('click', () => {
          this.addEpiRow();
        });
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveEmployeeFromForm();
      });
    },

    updateFormSSTPreview() {
      const integracao = document.getElementById('sstIntegracao')?.checked || false;
      const aso = document.getElementById('sstAso')?.checked || false;
      const ficha = document.getElementById('sstFichaEpi')?.checked || false;

      const evalRes = window.SSTService.evaluateStatus({
        integracaoRealizada: integracao,
        asoRecebido: aso,
        fichaEpiAssinada: ficha
      });

      const previewContainer = document.getElementById('formSSTStatusPreview');
      if (previewContainer) {
        if (evalRes.liberado) {
          previewContainer.innerHTML = `
            <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3">
              <span class="w-3 h-3 rounded-full bg-emerald-600 animate-pulse"></span>
              <div>
                <span class="text-xs font-bold text-emerald-800 uppercase tracking-wide">Status Calculado:</span>
                <span class="text-sm font-semibold text-emerald-900 block">Liberado para Trabalhar</span>
              </div>
            </div>
          `;
        } else {
          previewContainer.innerHTML = `
            <div class="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-1">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-rose-600"></span>
                <span class="text-xs font-bold text-rose-800 uppercase tracking-wide">Status Calculado: Não Liberado</span>
              </div>
              <ul class="text-xs text-rose-700 list-disc list-inside">
                ${evalRes.motivosBloqueio.map(m => `<li>${m}</li>`).join('')}
              </ul>
            </div>
          `;
        }
      }
    },

    populateEmpresaSelect(currentCnpj = null) {
      const select = document.getElementById('formEmpresaCNPJ');
      if (!select) return;
      select.innerHTML = '';
      const companies = window.AuthService.getCompanies();
      const currentUser = window.AuthService.getCurrentUser();

      companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.cnpj;
        opt.textContent = `${c.nomeFantasia} - CNPJ: ${c.cnpj}`;
        if (currentCnpj && currentCnpj === c.cnpj) {
          opt.selected = true;
        } else if (!currentCnpj && currentUser.cnpjVinculado === c.cnpj) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      if (currentUser.perfil === 'GESTOR' && currentUser.cnpjVinculado && currentUser.cnpjVinculado !== 'TODOS') {
        select.value = currentUser.cnpjVinculado;
        select.disabled = true;
      } else {
        select.disabled = false;
      }
    },

    resetEmployeeForm() {
      editingEmployeeId = null;
      document.getElementById('formEmployeeTitle').textContent = 'Novo Cadastro de Temporário';
      document.getElementById('formEmployeeSubtitle').textContent = 'Preencha os dados manuais do colaborador, benefícios VR/VT, cartão de acesso, SST e armário';
      document.getElementById('formEmployeeId').value = '';
      document.getElementById('formNomeCompleto').value = '';
      document.getElementById('formCPF').value = '';
      document.getElementById('formCartaoAcesso').value = '';
      document.getElementById('formAgencia').value = '';
      document.getElementById('formMatriculaAgencia').value = '';
      document.getElementById('formFuncao').value = '';
      document.getElementById('formOperacao').value = '';
      document.getElementById('formSetor').value = '';

      const currentUser = window.AuthService.getCurrentUser();
      document.getElementById('formGestor').value = currentUser.perfil === 'GESTOR' ? currentUser.nome : '';
      document.getElementById('formTurno').value = '';
      document.getElementById('formDataAdmissao').value = window.DataStore.Utils.todayISO();
      document.getElementById('formDataTerminoContrato').value = window.DataStore.Utils.addDays(window.DataStore.Utils.todayISO(), 90);
      document.getElementById('formStatusContrato').value = 'Ativo';

      // Empresa
      this.populateEmpresaSelect(null);

      // Benefícios
      document.getElementById('formVrQuantidade').value = '';
      document.getElementById('formVrOperadora').value = '';
      document.getElementById('formVtQuantidade').value = '';
      document.getElementById('formVtOperadora').value = '';

      // Armário
      document.getElementById('formNumeroArmario').value = '';
      document.getElementById('formStatusArmario').value = 'Ocupado';
      document.getElementById('formDataEntregaArmario').value = window.DataStore.Utils.todayISO();
      document.getElementById('formDataDevolucaoArmario').value = '';
      this.populateLockerDatalist();

      // SST
      document.getElementById('sstIntegracao').checked = false;
      document.getElementById('sstDataIntegracao').value = '';
      document.getElementById('sstAso').checked = false;
      document.getElementById('sstDds').checked = false;
      document.getElementById('sstFichaEpi').checked = false;

      this.resetEpiRows([
        { item: 'Camiseta', quantidade: 2, dataEntrega: window.DataStore.Utils.todayISO(), status: 'Entregue', observacao: 'Tamanho G' },
        { item: 'Camiseta Polo', quantidade: 1, dataEntrega: window.DataStore.Utils.todayISO(), status: 'Entregue', observacao: 'Tamanho G' },
        { item: 'Moletom', quantidade: 1, dataEntrega: window.DataStore.Utils.todayISO(), status: 'Entregue', observacao: 'Tamanho G' },
        { item: 'Colete', quantidade: 1, dataEntrega: window.DataStore.Utils.todayISO(), status: 'Entregue', observacao: 'Refletivo' }
      ]);

      const formAnexosCountEl = document.getElementById('formAnexosCount');
      if (formAnexosCountEl) formAnexosCountEl.textContent = '0';

      this.updateFormSSTPreview();
    },

    editEmployee(id) {
      const emp = window.DataStore.getEmployeeById(id);
      if (!emp) {
        this.showToast('Colaborador não encontrado.', 'error');
        return;
      }

      editingEmployeeId = emp.id;
      this.navigateTo('form');

      document.getElementById('formEmployeeTitle').textContent = `Editar Cadastro: ${emp.nomeCompleto}`;
      document.getElementById('formEmployeeSubtitle').textContent = `Atualize os dados manuais, benefícios, cartão de acesso, SST ou armário`;
      document.getElementById('formEmployeeId').value = emp.id;
      document.getElementById('formNomeCompleto').value = emp.nomeCompleto || '';
      document.getElementById('formCPF').value = window.DataStore.Utils.formatCPF(emp.cpf || '');
      document.getElementById('formCartaoAcesso').value = emp.cartaoAcesso || '';
      document.getElementById('formAgencia').value = emp.agencia || '';
      document.getElementById('formMatriculaAgencia').value = emp.matriculaAgencia || '';
      document.getElementById('formFuncao').value = emp.funcao || '';
      document.getElementById('formOperacao').value = emp.operacao || '';
      document.getElementById('formSetor').value = emp.setor || '';
      document.getElementById('formGestor').value = emp.gestor || '';
      document.getElementById('formTurno').value = emp.turno || '';
      document.getElementById('formDataAdmissao').value = emp.dataAdmissao || '';
      document.getElementById('formDataTerminoContrato').value = emp.dataTerminoContrato || '';
      document.getElementById('formStatusContrato').value = emp.statusContrato || 'Ativo';

      // Empresa
      this.populateEmpresaSelect(emp.cnpjEmpresa);

      // Benefícios
      const vr = emp.beneficios?.vr || {};
      const vt = emp.beneficios?.vt || {};
      document.getElementById('formVrQuantidade').value = vr.quantidade || '';
      document.getElementById('formVrOperadora').value = vr.operadora || '';
      document.getElementById('formVtQuantidade').value = vt.quantidade || '';
      document.getElementById('formVtOperadora').value = vt.operadora || '';

      // Armário
      document.getElementById('formNumeroArmario').value = emp.numeroArmario || '';
      document.getElementById('formDataEntregaArmario').value = emp.dataEntregaArmario || '';
      document.getElementById('formDataDevolucaoArmario').value = emp.dataDevolucaoArmario || '';
      this.populateLockerDatalist();

      // SST
      const sst = emp.sst || {};
      document.getElementById('sstIntegracao').checked = Boolean(sst.integracaoRealizada);
      document.getElementById('sstDataIntegracao').value = sst.dataIntegracao || '';
      document.getElementById('sstAso').checked = Boolean(sst.asoRecebido);
      document.getElementById('sstDds').checked = Boolean(sst.ddsRealizado);
      document.getElementById('sstFichaEpi').checked = Boolean(sst.fichaEpiAssinada);

      this.resetEpiRows(emp.epis || []);

      const formAnexosCountEl = document.getElementById('formAnexosCount');
      if (formAnexosCountEl) formAnexosCountEl.textContent = (emp.anexos || []).length;

      this.updateFormSSTPreview();
    },

    handleFormAttachmentClick() {
      const idInput = document.getElementById('formEmployeeId');
      const empId = idInput ? idInput.value : '';
      if (!empId) {
        this.showToast('Por favor, salve o colaborador primeiro antes de adicionar anexos a ele.', 'info');
        return;
      }
      if (window.MinioService) {
        window.MinioService.openUploadModal(empId);
      }
    },

    populateLockerDatalist() {
      const datalist = document.getElementById('datalistArmariosDisponiveis');
      if (!datalist) return;

      datalist.innerHTML = '';
      const lockers = window.DataStore.getLockers();
      lockers.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.numero;
        opt.label = `${l.numero} - ${l.bloco} (${l.status})`;
        datalist.appendChild(opt);
      });
    },

    resetEpiRows(epis) {
      const container = document.getElementById('formEpiRowsContainer');
      if (!container) return;
      container.innerHTML = '';
      epis.forEach(epi => this.addEpiRow(epi));
    },

    addEpiRow(data = null) {
      const container = document.getElementById('formEpiRowsContainer');
      if (!container) return;

      const epiTypes = ['Camiseta', 'Camiseta Polo', 'Moletom', 'Colete'];
      const tamanhos = ['PP', 'P', 'M', 'G', 'GG', 'EXG', 'G1', 'G2', 'G3', 'Tamanho Único'];
      const statuses = ['Entregue', 'Pendente'];

      const row = document.createElement('div');
      row.className = 'epi-form-row grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl items-center text-xs';

      const currentItem = data ? data.item : 'Camiseta';
      const currentTamanho = data ? (data.tamanho || (data.observacao && data.observacao.includes('G') ? 'G' : 'M')) : 'M';
      const currentQty = data ? data.quantidade : 1;
      const currentDate = data && data.dataEntrega ? data.dataEntrega : window.DataStore.Utils.todayISO();
      const currentStatus = (data && data.status === 'Pendente') ? 'Pendente' : 'Entregue';
      const currentObs = data ? (data.observacao || '') : '';

      row.innerHTML = `
        <div class="md:col-span-3">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Item de Uniforme</label>
          <select class="epi-item-select w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs font-semibold">
            ${epiTypes.map(t => `<option value="${t}" ${t === currentItem ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Tamanho</label>
          <select class="epi-item-tamanho w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs font-bold text-slate-800">
            ${tamanhos.map(s => `<option value="${s}" ${s === currentTamanho ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="md:col-span-1">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Qtd</label>
          <input type="number" min="1" max="20" value="${currentQty}" class="epi-item-qty w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs text-center font-bold">
        </div>
        <div class="md:col-span-2">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Data Entrega</label>
          <input type="date" value="${currentDate}" class="epi-item-date w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs">
        </div>
        <div class="md:col-span-2">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
          <select class="epi-item-status w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs font-semibold">
            ${statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="md:col-span-2 flex items-center gap-1">
          <div class="flex-1">
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Observações</label>
            <input type="text" placeholder="Ex: Admissão" value="${currentObs}" class="epi-item-obs w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs">
          </div>
          <button type="button" class="btn-remove-epi-row p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors mt-4" title="Remover item">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      `;

      row.querySelector('.btn-remove-epi-row').addEventListener('click', () => {
        row.remove();
      });

      container.appendChild(row);
    },

    saveEmployeeFromForm() {
      const id = document.getElementById('formEmployeeId').value || null;
      const nomeCompleto = document.getElementById('formNomeCompleto').value.trim();
      const cpf = document.getElementById('formCPF').value.trim();
      const cartaoAcesso = document.getElementById('formCartaoAcesso').value.trim();
      const agencia = document.getElementById('formAgencia').value.trim();
      const matriculaAgencia = document.getElementById('formMatriculaAgencia').value.trim();
      const funcao = document.getElementById('formFuncao').value.trim();
      const operacao = document.getElementById('formOperacao').value.trim();
      const setor = document.getElementById('formSetor').value.trim();
      const gestor = document.getElementById('formGestor').value.trim();
      const turno = document.getElementById('formTurno').value.trim();
      const dataAdmissao = document.getElementById('formDataAdmissao').value;
      const dataTerminoContrato = document.getElementById('formDataTerminoContrato').value;
      const statusContrato = document.getElementById('formStatusContrato').value;

      // Empresa
      const cnpjEmpresa = document.getElementById('formEmpresaCNPJ').value;
      const companies = window.AuthService.getCompanies();
      const company = companies.find(c => c.cnpj === cnpjEmpresa);
      const nomeEmpresa = company ? company.nomeFantasia : 'Matriz';

      // Benefícios
      const vrQtde = document.getElementById('formVrQuantidade').value.trim();
      const vrOp = document.getElementById('formVrOperadora').value.trim();
      const vtQtde = document.getElementById('formVtQuantidade').value.trim();
      const vtOp = document.getElementById('formVtOperadora').value.trim();

      // Armário
      const numeroArmario = document.getElementById('formNumeroArmario').value.trim().toUpperCase() || null;
      const dataEntregaArmario = document.getElementById('formDataEntregaArmario').value || null;
      const dataDevolucaoArmario = document.getElementById('formDataDevolucaoArmario').value || null;

      if (!nomeCompleto || !cpf || !agencia || !funcao || !operacao || !setor || !gestor || !dataAdmissao || !dataTerminoContrato) {
        this.showToast('Por favor, preencha todos os campos obrigatórios (*).', 'error');
        return;
      }

      if (numeroArmario) {
        const valLocker = window.LockerService.validateAssignment(numeroArmario, id);
        if (!valLocker.valid) {
          this.showToast(valLocker.message, 'error');
          return;
        }
      }

      // SST
      const integracao = document.getElementById('sstIntegracao').checked;
      const dataIntegracao = document.getElementById('sstDataIntegracao').value || (integracao ? dataAdmissao : null);
      const aso = document.getElementById('sstAso').checked;
      const dds = document.getElementById('sstDds').checked;
      const fichaEpi = document.getElementById('sstFichaEpi').checked;

      // EPIs / Uniformes
      const epiRows = document.querySelectorAll('.epi-form-row');
      const epis = [];
      epiRows.forEach(r => {
        const item = r.querySelector('.epi-item-select').value;
        const tamanho = r.querySelector('.epi-item-tamanho') ? r.querySelector('.epi-item-tamanho').value : 'M';
        const quantidade = parseInt(r.querySelector('.epi-item-qty').value, 10) || 1;
        const dataEntrega = r.querySelector('.epi-item-date').value || window.DataStore.Utils.todayISO();
        const status = r.querySelector('.epi-item-status').value;
        const observacao = r.querySelector('.epi-item-obs').value.trim();

        epis.push({ item, tamanho, quantidade, dataEntrega, status, observacao });
      });

      const employeeData = {
        id: id || window.DataStore.Utils.generateId(),
        nomeCompleto,
        cpf: window.DataStore.Utils.formatCPF(cpf),
        cnpjEmpresa: cnpjEmpresa,
        nomeEmpresa: nomeEmpresa,
        cartaoAcesso: cartaoAcesso || null,
        agencia,
        matriculaAgencia,
        funcao,
        operacao,
        setor,
        gestor,
        turno,
        dataAdmissao,
        dataTerminoContrato,
        statusContrato,
        beneficios: {
          vr: { quantidade: vrQtde, operadora: vrOp },
          vt: { quantidade: vtQtde, operadora: vtOp }
        },
        numeroArmario: numeroArmario,
        dataEntregaArmario: numeroArmario ? (dataEntregaArmario || dataAdmissao) : null,
        dataDevolucaoArmario: dataDevolucaoArmario,
        sst: {
          integracaoRealizada: integracao,
          dataIntegracao: dataIntegracao,
          asoRecebido: aso,
          dataAso: aso ? dataAdmissao : null,
          ddsRealizado: dds,
          dataDds: dds ? dataAdmissao : null,
          termoUniformeAssinado: fichaEpi,
          fichaEpiAssinada: fichaEpi,
          dataFichaEpi: fichaEpi ? dataAdmissao : null
        },
        epis: epis
      };

      const success = window.DataStore.saveEmployee(employeeData);
      if (success) {
        this.showToast(id ? 'Colaborador atualizado com sucesso!' : 'Novo colaborador cadastrado com sucesso!', 'success');
        this.navigateTo('employees');
      } else {
        this.showToast('Erro ao salvar colaborador.', 'error');
      }
    },

    deleteEmployee(id, nome) {
      if (confirm(`Tem certeza que deseja excluir o colaborador "${nome}"? Esta ação liberará seu armário atribuído.`)) {
        window.DataStore.deleteEmployee(id);
        this.showToast(`Colaborador ${nome} excluído com sucesso.`, 'info');
        this.renderEmployeesTable();
        this.updateHeaderAlerts();
      }
    },

    // ==========================================
    // MODAL DE DETALHES (FICHA CADASTRAL COMPLETA)
    // ==========================================
    viewEmployeeDetails(id) {
      const emp = window.DataStore.getEmployeeById(id);
      if (!emp) return;

      const modal = document.getElementById('modalEmployeeDetails');
      const content = document.getElementById('modalEmployeeDetailsContent');
      if (!modal || !content) return;

      const evalSST = window.SSTService.evaluateStatus(emp.sst);
      const sstBadge = window.SSTService.renderBadge(evalSST);
      const contractBadge = window.AlertService.renderContractBadge(emp.dataTerminoContrato);
      const diasRestantes = window.DataStore.Utils.diffInDays(emp.dataTerminoContrato);
      const vr = emp.beneficios?.vr || {};
      const vt = emp.beneficios?.vt || {};

      content.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-start justify-between pb-4 border-b border-slate-200">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-bold text-slate-900">${emp.nomeCompleto}</h3>
                ${sstBadge}
              </div>
              <p class="text-xs text-slate-500 font-mono mt-0.5">
                CPF: ${emp.cpf || '-'} • Empresa: <strong>${emp.nomeEmpresa || emp.cnpjEmpresa || 'Matriz'}</strong>
              </p>
            </div>
            <div class="text-right">
              ${contractBadge}
              <div class="text-[11px] text-slate-500 mt-1">Status Contrato: <span class="font-semibold text-slate-800">${emp.statusContrato}</span></div>
            </div>
          </div>

          <!-- Grade de Informações Gerais -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span class="text-slate-400 block text-[11px]">Unidade / CNPJ</span>
              <span class="font-bold text-blue-800 text-xs">${emp.cnpjEmpresa || '12.345.678/0001-90'}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Agência de Trabalho</span>
              <span class="font-bold text-slate-800 text-sm">${emp.agencia}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Função / Cargo</span>
              <span class="font-semibold text-slate-800">${emp.funcao}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Operação / Setor</span>
              <span class="font-semibold text-slate-800">${emp.operacao} • ${emp.setor}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Gestor Responsável</span>
              <span class="font-semibold text-slate-800">${emp.gestor}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Turno</span>
              <span class="font-medium text-slate-700">${emp.turno || '-'}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Data de Admissão</span>
              <span class="font-medium text-slate-700">${window.DataStore.Utils.formatDateBR(emp.dataAdmissao)}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Armário Atribuído</span>
              <span class="font-mono font-bold text-blue-700">${emp.numeroArmario || 'Nenhum'}</span>
            </div>
          </div>

          <!-- Seção de Benefícios e Acesso -->
          <div class="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs">
            <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
              Controle de Acesso & Benefícios (VR e VT)
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="p-2.5 bg-white border border-emerald-100 rounded-lg">
                <span class="text-[11px] text-slate-400 block font-semibold">Nº Cartão de Acesso</span>
                <span class="font-mono font-bold text-slate-800 text-sm">${emp.cartaoAcesso || 'Nenhum registrado'}</span>
              </div>
              <div class="p-2.5 bg-white border border-emerald-100 rounded-lg">
                <span class="text-[11px] text-slate-400 block font-semibold">Vale Refeição (VR)</span>
                <span class="font-bold text-slate-800">${vr.quantidade || 'Não informado'}</span>
                <span class="text-[10px] text-slate-500 block">Operadora: ${vr.operadora || '-'}</span>
              </div>
              <div class="p-2.5 bg-white border border-emerald-100 rounded-lg">
                <span class="text-[11px] text-slate-400 block font-semibold">Vale Transporte (VT)</span>
                <span class="font-bold text-slate-800">${vt.quantidade || 'Não informado'}</span>
                <span class="text-[10px] text-slate-500 block">Operadora: ${vt.operadora || '-'}</span>
              </div>
            </div>
          </div>

          <!-- Seção SST & Motivos de Bloqueio -->
          <div class="p-4 rounded-xl border ${evalSST.liberado ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}">
            <h4 class="text-xs font-bold uppercase tracking-wider mb-2 ${evalSST.liberado ? 'text-emerald-900' : 'text-rose-900'}">
              Controle SST & Status de Liberação
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs mb-3">
              <div class="p-2 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                <span>Integração</span>
                <span class="font-bold ${emp.sst?.integracaoRealizada ? 'text-emerald-600' : 'text-rose-600'}">
                  ${emp.sst?.integracaoRealizada ? '✓ Sim' : '✕ Não'}
                </span>
                ${emp.sst?.dataIntegracao ? `<span class="text-[10px] text-slate-400">${window.DataStore.Utils.formatDateBR(emp.sst.dataIntegracao)}</span>` : ''}
              </div>
              <div class="p-2 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                <span>ASO Ocupacional</span>
                <span class="font-bold ${emp.sst?.asoRecebido ? 'text-emerald-600' : 'text-rose-600'}">
                  ${emp.sst?.asoRecebido ? '✓ Sim' : '✕ Não'}
                </span>
              </div>
              <div class="p-2 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                <span>DDS Realizado</span>
                <span class="font-bold ${emp.sst?.ddsRealizado ? 'text-emerald-600' : 'text-amber-600'}">
                  ${emp.sst?.ddsRealizado ? '✓ Sim' : '✕ Não'}
                </span>
              </div>
              <div class="p-2 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                <span>Termo Uniforme</span>
                <span class="font-bold ${(emp.sst?.termoUniformeAssinado ?? emp.sst?.fichaEpiAssinada) ? 'text-emerald-600' : 'text-rose-600'}">
                  ${(emp.sst?.termoUniformeAssinado ?? emp.sst?.fichaEpiAssinada) ? '✓ Sim' : '✕ Não'}
                </span>
              </div>
            </div>

            ${!evalSST.liberado ? `
              <div class="mt-2 p-2.5 bg-rose-100/70 border border-rose-300 rounded-lg text-xs text-rose-800">
                <span class="font-bold block mb-1">Motivos de Bloqueio Ativos:</span>
                <ul class="list-disc list-inside space-y-0.5">
                  ${evalSST.motivosBloqueio.map(m => `<li>${m}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <!-- Uniformes Entregues -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Uniformes Entregues (Sem Devolução)
              </h4>
              <button onclick="App.openManualUniformDeliveryModal('${emp.id}')" class="text-xs text-blue-600 hover:text-blue-800 font-semibold underline">
                + Nova Entrega de Uniforme
              </button>
            </div>
            <div class="overflow-hidden border border-slate-200 rounded-xl">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3">Item de Uniforme</th>
                    <th class="py-2.5 px-3 text-center">Tamanho</th>
                    <th class="py-2.5 px-3 text-center">Quantidade</th>
                    <th class="py-2.5 px-3">Data Entrega</th>
                    <th class="py-2.5 px-3">Status</th>
                    <th class="py-2.5 px-3">Observação / Detalhes</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${(emp.epis || []).length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-slate-400">Nenhum uniforme registrado.</td></tr>' : (emp.epis || []).map(epi => {
                    let statusClass = 'bg-slate-100 text-slate-700';
                    if (epi.status === 'Entregue') statusClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    else if (epi.status === 'Pendente') statusClass = 'bg-amber-100 text-amber-800 border-amber-300';

                    const tamanho = epi.tamanho || (epi.observacao && epi.observacao.includes('Tamanho') ? epi.observacao : '-');

                    return `
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-2.5 px-3 font-semibold text-slate-800">${epi.item}</td>
                        <td class="py-2.5 px-3 text-center font-bold text-blue-700">${tamanho}</td>
                        <td class="py-2.5 px-3 text-center font-bold text-slate-700">${epi.quantidade}</td>
                        <td class="py-2.5 px-3 text-slate-600">${window.DataStore.Utils.formatDateBR(epi.dataEntrega)}</td>
                        <td class="py-2.5 px-3">
                          <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass}">${epi.status}</span>
                        </td>
                        <td class="py-2.5 px-3 text-slate-500">${epi.observacao || '-'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Histórico Disciplinar (Advertências & Suspensões) -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Histórico Disciplinar (Advertências & Suspensões)
              </h4>
              <button onclick="App.openNewDisciplinaryModal('${emp.id}')" class="text-xs text-rose-600 hover:text-rose-800 font-semibold underline">
                + Aplicar Nova Medida
              </button>
            </div>
            <div class="overflow-hidden border border-slate-200 rounded-xl">
              ${(() => {
                const discList = window.DataStore.getDisciplinaryByEmployee(emp.id);
                if (!discList || discList.length === 0) {
                  return '<div class="p-4 bg-slate-50 text-slate-500 text-xs italic text-center">Nenhuma ocorrência ou medida disciplinar registrada para este colaborador. Conduta regular.</div>';
                }
                return `
                  <table class="w-full text-left text-xs">
                    <thead class="bg-rose-50/60 text-slate-700 font-semibold border-b border-rose-100">
                      <tr>
                        <th class="py-2.5 px-3">Tipo da Medida</th>
                        <th class="py-2.5 px-3">Motivo</th>
                        <th class="py-2.5 px-3 text-center">Data Fato</th>
                        <th class="py-2.5 px-3 text-center">Data Aplicação</th>
                        <th class="py-2.5 px-3">Assinatura</th>
                        <th class="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${discList.map(d => {
                        let badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                        if (d.tipo === 'Advertência Escrita') badgeClass = 'bg-orange-100 text-orange-800 border-orange-300';
                        else if (d.tipo === 'Suspensão Disciplinar') badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';

                        return `
                          <tr class="hover:bg-slate-50/50">
                            <td class="py-2.5 px-3 font-bold">
                              <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] border ${badgeClass}">
                                ${d.tipo} ${d.diasSuspensao ? `(${d.diasSuspensao}d)` : ''}
                              </span>
                            </td>
                            <td class="py-2.5 px-3 text-slate-800 font-medium">${d.motivo}</td>
                            <td class="py-2.5 px-3 text-center text-slate-600">${window.DataStore.Utils.formatDateBR(d.dataFato)}</td>
                            <td class="py-2.5 px-3 text-center text-slate-600">${window.DataStore.Utils.formatDateBR(d.dataAplicacao)}</td>
                            <td class="py-2.5 px-3 text-slate-600 text-[11px]">${d.statusAssinatura}</td>
                            <td class="py-2.5 px-3 text-right">
                              <button onclick="App.openPrintDisciplinaryModal('${d.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-semibold text-[11px]">
                                Ver Termo
                              </button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                `;
              })()}
            </div>
          </div>

          <!-- Anexos & Documentos do Colaborador (MinIO S3) -->
          ${window.MinioService ? window.MinioService.renderAttachmentsSection(emp) : ''}
        </div>
      `;

      modal.classList.remove('hidden');
    },

    closeDetailsModal() {
      const modal = document.getElementById('modalEmployeeDetails');
      if (modal) modal.classList.add('hidden');
    },

    // ==========================================
    // MODAL DE DEVOLUÇÃO DE UNIFORME E ARMÁRIO
    // ==========================================
    openReturnModal(id) {
      const emp = window.DataStore.getEmployeeById(id);
      if (!emp) return;

      const modal = document.getElementById('modalReturnEpi');
      const content = document.getElementById('modalReturnEpiContent');
      if (!modal || !content) return;

      content.innerHTML = `
        <div class="space-y-4 text-xs">
          <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span class="font-bold text-blue-900 block text-sm">${emp.nomeCompleto}</span>
            <span class="text-blue-700">Agência: ${emp.agencia} • Armário: ${emp.numeroArmario || 'Nenhum'}</span>
          </div>

          ${emp.numeroArmario ? `
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span class="font-bold text-slate-800 block">Armário Atribuído: ${emp.numeroArmario}</span>
                <span class="text-slate-500 text-[11px]">Liberar armário para status "Disponível"?</span>
              </div>
              <button onclick="App.confirmReleaseLocker('${emp.numeroArmario}', '${emp.id}')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm transition-colors">
                Desocupar Armário
              </button>
            </div>
          ` : '<div class="text-slate-400 italic">Nenhum armário atribuído atualmente.</div>'}

          <div>
            <span class="font-bold text-slate-800 block mb-2 text-sm">Uniformes para Devolução ou Substituição</span>
            <div class="space-y-2 max-h-60 overflow-y-auto">
              ${(emp.epis || []).map((epi, idx) => `
                <div class="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span class="font-semibold text-slate-800">${epi.item} (${epi.quantidade}x)</span>
                    <span class="text-[11px] text-slate-500 block">Status atual: ${epi.status} • Entregue em: ${window.DataStore.Utils.formatDateBR(epi.dataEntrega)}</span>
                  </div>
                  <div class="flex gap-1.5">
                    ${epi.status !== 'Devolvido' ? `
                      <button onclick="App.updateEpiStatus('${emp.id}', ${idx}, 'Devolvido')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px]">
                        Marcar Devolvido
                      </button>
                      <button onclick="App.updateEpiStatus('${emp.id}', ${idx}, 'Substituído')" class="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-[11px]">
                        Substituir
                      </button>
                    ` : '<span class="text-emerald-600 font-bold">✓ Já devolvido</span>'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
    },

    closeReturnModal() {
      const modal = document.getElementById('modalReturnEpi');
      if (modal) modal.classList.add('hidden');
    },

    confirmReleaseLocker(numeroArmario, employeeId) {
      if (confirm(`Confirmar liberação do armário ${numeroArmario}? Ele ficará disponível para novos colaboradores.`)) {
        window.LockerService.releaseLocker(numeroArmario);
        this.showToast(`Armário ${numeroArmario} liberado com sucesso.`, 'success');
        this.openReturnModal(employeeId);
        this.renderEmployeesTable();
        this.renderLockersGrid();
      }
    },

    updateEpiStatus(employeeId, epiIndex, newStatus) {
      const emp = window.DataStore.getEmployeeById(employeeId);
      if (emp && emp.epis && emp.epis[epiIndex]) {
        emp.epis[epiIndex].status = newStatus;
        emp.epis[epiIndex].observacao = `${newStatus} em ${window.DataStore.Utils.formatDateBR(window.DataStore.Utils.todayISO())}`;
        window.DataStore.saveEmployee(emp);
        this.showToast(`Status do uniforme atualizado para ${newStatus}.`, 'success');
        this.openReturnModal(employeeId);
        this.renderEmployeesTable();
      }
    },

    // ==========================================
    // VISUALIZADOR DE ARMÁRIOS & INCLUSÃO MANUAL
    // ==========================================
    bindLockerEvents() {
      const filterSelect = document.getElementById('filterLockerStatus');
      if (filterSelect) {
        filterSelect.addEventListener('change', () => this.renderLockersGrid());
      }

      const formManual = document.getElementById('formManualLocker');
      if (formManual) {
        formManual.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveManualLocker();
        });
      }
    },

    openManualLockerModal() {
      const modal = document.getElementById('modalManualLocker');
      if (!modal) return;
      document.getElementById('manualLockerNumero').value = '';
      document.getElementById('manualLockerBloco').value = '';
      document.getElementById('manualLockerStatus').value = 'Disponível';
      document.getElementById('manualLockerDataEntrega').value = '';
      document.getElementById('manualLockerDataDevolucao').value = '';
      modal.classList.remove('hidden');
    },

    closeManualLockerModal() {
      const modal = document.getElementById('modalManualLocker');
      if (modal) modal.classList.add('hidden');
    },

    saveManualLocker() {
      const num = document.getElementById('manualLockerNumero').value.trim();
      const bloco = document.getElementById('manualLockerBloco').value.trim();
      const status = document.getElementById('manualLockerStatus').value;
      const entrega = document.getElementById('manualLockerDataEntrega').value || null;
      const devolucao = document.getElementById('manualLockerDataDevolucao').value || null;

      const res = window.LockerService.addManualLocker(num, bloco, status, entrega, devolucao);
      if (res.success) {
        this.showToast(`Armário ${num.toUpperCase()} cadastrado com sucesso!`, 'success');
        this.closeManualLockerModal();
        this.renderLockersGrid();
      } else {
        this.showToast(res.message, 'error');
      }
    },

    renderLockersGrid() {
      const lockers = window.DataStore.getLockers();
      const stats = window.LockerService.getStats();
      const filter = document.getElementById('filterLockerStatus')?.value || 'TODOS';

      document.getElementById('gridLockerTotal').textContent = stats.total;
      document.getElementById('gridLockerDisp').textContent = stats.disponiveis;
      document.getElementById('gridLockerOcup').textContent = stats.ocupados;
      document.getElementById('gridLockerManut').textContent = stats.manutencao;

      const container = document.getElementById('lockersGridContainer');
      if (!container) return;

      const filtered = lockers.filter(l => {
        if (filter !== 'TODOS' && l.status !== filter) return false;
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="col-span-full py-12 text-center text-slate-400">
            <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <p class="font-semibold text-sm text-slate-600">${filter === 'TODOS' ? 'Nenhum armário cadastrado no sistema.' : 'Nenhum armário encontrado com o status selecionado.'}</p>
            <p class="text-xs text-slate-400 mt-1">${filter === 'TODOS' ? 'Utilize o botão "+ Incluir Armário Manualmente" acima para cadastrar armários.' : 'Alterne o filtro acima para ver outros armários.'}</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(l => {
        let cardBg = 'bg-emerald-50 border-emerald-300 text-emerald-900';
        let statusBadge = '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">Disponível</span>';

        if (l.status === 'Ocupado') {
          cardBg = 'bg-blue-50 border-blue-300 text-blue-900';
          statusBadge = '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-900">Ocupado</span>';
        } else if (l.status === 'Manutenção') {
          cardBg = 'bg-amber-50 border-amber-300 text-amber-900';
          statusBadge = '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">Manutenção</span>';
        }

        return `
          <div class="border rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-md ${cardBg}">
            <div class="flex items-start justify-between">
              <span class="font-mono font-bold text-sm tracking-tight">${l.numero}</span>
              ${statusBadge}
            </div>

            <div class="my-2 text-[11px] space-y-0.5">
              <div class="text-slate-500 truncate" title="${l.bloco}">${l.bloco}</div>
              ${l.status === 'Ocupado' ? `
                <div class="font-semibold text-slate-900 truncate" title="${l.ocupadoPorNome || ''}">
                  👤 ${l.ocupadoPorNome || 'Ocupado'}
                </div>
                <div class="text-[10px] text-slate-500">Entrega: ${window.DataStore.Utils.formatDateBR(l.dataEntrega)}</div>
              ` : ''}
              ${l.status === 'Manutenção' ? `
                <div class="text-amber-800 text-[10px] italic">Em reparo / Indisponível</div>
              ` : ''}
            </div>

            <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              ${l.status === 'Ocupado' ? `
                <button onclick="App.confirmReleaseLocker('${l.numero}', '${l.ocupadoPorId}')" class="text-rose-600 hover:text-rose-800 font-bold hover:underline">
                  Desocupar
                </button>
              ` : l.status === 'Disponível' ? `
                <button onclick="App.toggleLockerMaintenance('${l.numero}', true)" class="text-amber-600 hover:text-amber-800 font-semibold">
                  Pôr em Reparo
                </button>
              ` : `
                <button onclick="App.toggleLockerMaintenance('${l.numero}', false)" class="text-emerald-700 hover:text-emerald-900 font-bold">
                  Liberar Reparo
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
    },

    toggleLockerMaintenance(numeroArmario, isMaintenance) {
      const res = window.LockerService.setMaintenance(numeroArmario, isMaintenance);
      if (res.success) {
        this.showToast(`Armário ${numeroArmario} ${isMaintenance ? 'colocado em manutenção' : 'liberado para uso'}.`, 'info');
        this.renderLockersGrid();
      } else {
        this.showToast(res.message, 'error');
      }
    },

    // ==========================================
    // IMPORTAÇÃO DE PLANILHA EXCEL (.XLSX / .CSV)
    // ==========================================
    bindExcelImportEvents() {
      const fileInput = document.getElementById('excelFileInput');
      if (fileInput) {
        fileInput.addEventListener('change', (e) => this.handleExcelFileSelect(e));
      }
    },

    openExcelImportModal() {
      const modal = document.getElementById('modalExcelImport');
      if (!modal) return;
      parsedExcelData = [];
      document.getElementById('excelFileInput').value = '';
      document.getElementById('selectedFileName').classList.add('hidden');
      document.getElementById('importPreviewContainer').classList.add('hidden');
      document.getElementById('btnConfirmImport').disabled = true;
      modal.classList.remove('hidden');
    },

    closeExcelImportModal() {
      const modal = document.getElementById('modalExcelImport');
      if (modal) modal.classList.add('hidden');
    },

    downloadExcelTemplate() {
      const headers = [
        'Nome Completo',
        'CPF',
        'CNPJ Empresa',
        'Nº Cartão Acesso',
        'Agência de Trabalho',
        'Matrícula Agência',
        'Função / Cargo',
        'Operação',
        'Setor',
        'Gestor Responsável',
        'Turno',
        'Data Admissão (AAAA-MM-DD)',
        'Data Término (AAAA-MM-DD)',
        'VR Quantidade',
        'VR Operadora',
        'VT Quantidade',
        'VT Operadora',
        'Nº Armário',
        'Integração (Sim/Não)',
        'ASO (Sim/Não)',
        'DDS (Sim/Não)',
        'Termo Uniforme (Sim/Não)'
      ];

      const sampleRows = [
        [
          'João Pedro Martins',
          '321.654.987-00',
          '12.345.678/0001-90',
          'CR-99001',
          'Randstad',
          'RS-10029',
          'Auxiliar de Logística',
          'Logística Inbound',
          'Armazém Central',
          'Carlos Eduardo Silva',
          '1º Turno (06h às 14h)',
          window.DataStore.Utils.todayISO(),
          window.DataStore.Utils.addDays(window.DataStore.Utils.todayISO(), 90),
          'R$ 38,00 / dia',
          'Ticket',
          '2 passagens / dia',
          'SPTrans',
          '',
          'Sim',
          'Sim',
          'Sim',
          'Sim'
        ],
        [
          'Mariana Souza Costa',
          '432.765.098-11',
          '98.765.432/0001-10',
          'CR-99002',
          'Adecco',
          'ADC-55102',
          'Operadora de Produção',
          'Linha de Montagem',
          'Setor 01',
          'Roberto Mendes',
          '2º Turno (14h às 22h)',
          window.DataStore.Utils.todayISO(),
          window.DataStore.Utils.addDays(window.DataStore.Utils.todayISO(), 90),
          'R$ 35,00 / dia',
          'Sodexo',
          '2 passagens / dia',
          'EMTU',
          '',
          'Sim',
          'Não',
          'Sim',
          'Não'
        ]
      ];

      if (typeof XLSX !== 'undefined') {
        const wsData = [headers, ...sampleRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Temporários');
        XLSX.writeFile(wb, 'modelo_importacao_temporarios.xlsx');
        this.showToast('Modelo Excel (.xlsx) baixado com sucesso!', 'success');
      } else {
        const csvContent = '\uFEFF' + [headers.join(';'), ...sampleRows.map(r => r.join(';'))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'modelo_importacao_temporarios.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.showToast('Modelo baixado em formato CSV/Excel com sucesso!', 'success');
      }
    },

    handleExcelFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      const fileNameEl = document.getElementById('selectedFileName');
      if (fileNameEl) {
        fileNameEl.textContent = `Arquivo carregado: ${file.name}`;
        fileNameEl.classList.remove('hidden');
      }

      const reader = new FileReader();

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });
            this.processSpreadsheetRows(rawJson);
          } catch (err) {
            console.error(err);
            this.showToast('Erro ao ler planilha Excel. Verifique a estrutura do arquivo.', 'error');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (evt) => {
          try {
            const text = evt.target.result;
            const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
            const delimiter = text.includes(';') ? ';' : ',';
            const rawRows = lines.map(line => line.split(delimiter).map(cell => cell.replace(/^"(.*)"$/, '$1').trim()));
            this.processSpreadsheetRows(rawRows);
          } catch (err) {
            console.error(err);
            this.showToast('Erro ao processar arquivo CSV.', 'error');
          }
        };
        reader.readAsText(file, 'UTF-8');
      }
    },

    processSpreadsheetRows(rows) {
      if (!rows || rows.length < 2) {
        this.showToast('A planilha precisa ter pelo menos o cabeçalho e uma linha de dados.', 'warning');
        return;
      }

      const header = rows[0].map(h => (h || '').toString().toLowerCase().trim());
      
      const findCol = (...keywords) => {
        return header.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const idxNome = findCol('nome');
      const idxCpf = findCol('cpf');
      const idxCnpj = findCol('cnpj');
      const idxCartao = findCol('cartão', 'cartao', 'crachá');
      const idxAgencia = findCol('agência', 'agencia');
      const idxMatricula = findCol('matrícula', 'matricula');
      const idxFuncao = findCol('função', 'funcao', 'cargo');
      const idxOperacao = findCol('operação', 'operacao');
      const idxSetor = findCol('setor');
      const idxGestor = findCol('gestor', 'líder');
      const idxTurno = findCol('turno', 'escala');
      const idxAdmissao = findCol('admissão', 'admissao');
      const idxTermino = findCol('término', 'termino', 'vencimento');
      const idxVrQtde = findCol('vr quant', 'vr valor', 'vr');
      const idxVrOp = findCol('vr operadora');
      const idxVtQtde = findCol('vt quant', 'vt valor', 'vt');
      const idxVtOp = findCol('vt operadora');
      const idxArmario = findCol('armário', 'armario');
      const idxIntegracao = findCol('integração', 'integracao');
      const idxAso = findCol('aso');
      const idxDds = findCol('dds');
      const idxFichaEpi = findCol('termo uniforme', 'termo', 'ficha epi', 'ficha');

      parsedExcelData = [];
      const companies = window.AuthService.getCompanies();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[idxNome]) continue;

        const nome = (row[idxNome] || '').toString().trim();
        const cpf = (row[idxCpf] || '').toString().trim();
        if (!nome) continue;

        const parseBool = (val) => {
          if (!val) return false;
          const s = val.toString().toLowerCase().trim();
          return s === 'sim' || s === 's' || s === 'true' || s === '1' || s === 'ok';
        };

        const cnpj = idxCnpj >= 0 && row[idxCnpj] ? row[idxCnpj].toString().trim() : '12.345.678/0001-90';
        const comp = companies.find(c => c.cnpj === cnpj);
        const nomeEmpresa = comp ? comp.nomeFantasia : 'Matriz';

        const emp = {
          nomeCompleto: nome,
          cpf: window.DataStore.Utils.formatCPF(cpf),
          cnpjEmpresa: cnpj,
          nomeEmpresa: nomeEmpresa,
          cartaoAcesso: idxCartao >= 0 && row[idxCartao] ? row[idxCartao].toString().trim() : '',
          agencia: idxAgencia >= 0 && row[idxAgencia] ? row[idxAgencia].toString().trim() : 'Agência Geral',
          matriculaAgencia: idxMatricula >= 0 && row[idxMatricula] ? row[idxMatricula].toString().trim() : '',
          funcao: idxFuncao >= 0 && row[idxFuncao] ? row[idxFuncao].toString().trim() : 'Auxiliar Operacional',
          operacao: idxOperacao >= 0 && row[idxOperacao] ? row[idxOperacao].toString().trim() : 'Logística Inbound',
          setor: idxSetor >= 0 && row[idxSetor] ? row[idxSetor].toString().trim() : 'Geral',
          gestor: idxGestor >= 0 && row[idxGestor] ? row[idxGestor].toString().trim() : 'Supervisão Geral',
          turno: idxTurno >= 0 && row[idxTurno] ? row[idxTurno].toString().trim() : '1º Turno (06h às 14h)',
          dataAdmissao: idxAdmissao >= 0 && row[idxAdmissao] ? row[idxAdmissao].toString().trim() : window.DataStore.Utils.todayISO(),
          dataTerminoContrato: idxTermino >= 0 && row[idxTermino] ? row[idxTermino].toString().trim() : window.DataStore.Utils.addDays(window.DataStore.Utils.todayISO(), 90),
          statusContrato: 'Ativo',
          beneficios: {
            vr: {
              quantidade: idxVrQtde >= 0 && row[idxVrQtde] ? row[idxVrQtde].toString().trim() : '',
              operadora: idxVrOp >= 0 && row[idxVrOp] ? row[idxVrOp].toString().trim() : ''
            },
            vt: {
              quantidade: idxVtQtde >= 0 && row[idxVtQtde] ? row[idxVtQtde].toString().trim() : '',
              operadora: idxVtOp >= 0 && row[idxVtOp] ? row[idxVtOp].toString().trim() : ''
            }
          },
          numeroArmario: idxArmario >= 0 && row[idxArmario] ? row[idxArmario].toString().trim().toUpperCase() : null,
          dataEntregaArmario: idxArmario >= 0 && row[idxArmario] ? window.DataStore.Utils.todayISO() : null,
          dataDevolucaoArmario: null,
          sst: {
            integracaoRealizada: idxIntegracao >= 0 ? parseBool(row[idxIntegracao]) : true,
            dataIntegracao: window.DataStore.Utils.todayISO(),
            asoRecebido: idxAso >= 0 ? parseBool(row[idxAso]) : true,
            dataAso: window.DataStore.Utils.todayISO(),
            ddsRealizado: idxDds >= 0 ? parseBool(row[idxDds]) : true,
            dataDds: window.DataStore.Utils.todayISO(),
            termoUniformeAssinado: idxFichaEpi >= 0 ? parseBool(row[idxFichaEpi]) : true,
            fichaEpiAssinada: idxFichaEpi >= 0 ? parseBool(row[idxFichaEpi]) : true,
            dataFichaEpi: window.DataStore.Utils.todayISO()
          },
          epis: [
            { item: 'Camiseta', quantidade: 2, dataEntrega: window.DataStore.Utils.todayISO(), status: 'Entregue', observacao: 'Entregue na admissão' },
            { item: 'Camiseta Polo', quantidade: 1, dataEntrega: window.DataStore.Utils.todayISO(), status: 'Entregue', observacao: 'Entregue na admissão' },
            { item: 'Moletom', quantidade: 1, dataEntrega: window.DataStore.Utils.todayISO(), status: 'Entregue', observacao: 'Entregue na admissão' },
            { item: 'Colete', quantidade: 1, dataEntrega: window.DataStore.Utils.todayISO(), status: 'Entregue', observacao: 'Entregue na admissão' }
          ]
        };

        parsedExcelData.push(emp);
      }

      if (parsedExcelData.length === 0) {
        this.showToast('Nenhum colaborador válido foi extraído da planilha.', 'warning');
        return;
      }

      const previewCountEl = document.getElementById('importPreviewCount');
      if (previewCountEl) previewCountEl.textContent = parsedExcelData.length;

      const tbody = document.getElementById('importPreviewTableBody');
      if (tbody) {
        tbody.innerHTML = parsedExcelData.map(e => `
          <tr class="hover:bg-slate-50">
            <td class="py-2 px-3 font-semibold text-slate-800">${e.nomeCompleto}</td>
            <td class="py-2 px-3 font-mono">${e.cpf || '-'}</td>
            <td class="py-2 px-3">${e.agencia}</td>
            <td class="py-2 px-3">${e.funcao}</td>
            <td class="py-2 px-3">${e.nomeEmpresa}</td>
            <td class="py-2 px-3 font-mono font-bold text-blue-700">${e.numeroArmario || '-'}</td>
            <td class="py-2 px-3 font-semibold ${e.sst.integracaoRealizada ? 'text-emerald-600' : 'text-rose-600'}">
              ${e.sst.integracaoRealizada ? 'Sim' : 'Não'}
            </td>
            <td class="py-2 px-3">${window.DataStore.Utils.formatDateBR(e.dataTerminoContrato)}</td>
          </tr>
        `).join('');
      }

      document.getElementById('importPreviewContainer').classList.remove('hidden');
      document.getElementById('btnConfirmImport').disabled = false;
      this.showToast(`${parsedExcelData.length} colaborador(es) lidos com sucesso. Clique em Confirmar para salvar.`, 'info');
    },

    confirmExcelImport() {
      if (!parsedExcelData || parsedExcelData.length === 0) return;

      const res = window.DataStore.importEmployeesBatch(parsedExcelData);
      this.showToast(`Importação concluída: ${res.added} novos e ${res.updated} atualizados com sucesso!`, 'success');
      this.closeExcelImportModal();
      this.navigateTo('employees');
    },

    // ==========================================
    // CONTROLE DE ENTREGA DE UNIFORMES
    // ==========================================
    bindEPIEvents() {
      const filterItem = document.getElementById('filterEpiItem');
      const filterTamanho = document.getElementById('filterEpiTamanho');
      const filterStatus = document.getElementById('filterEpiStatus');
      const searchEpi = document.getElementById('searchEpiInput');

      if (filterItem) filterItem.addEventListener('change', () => this.renderEPITable());
      if (filterTamanho) filterTamanho.addEventListener('change', () => this.renderEPITable());
      if (filterStatus) filterStatus.addEventListener('change', () => this.renderEPITable());
      if (searchEpi) searchEpi.addEventListener('input', () => this.renderEPITable());

      const formManualDelivery = document.getElementById('formManualUniformDelivery');
      if (formManualDelivery) {
        formManualDelivery.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveManualUniformDelivery();
        });
      }
    },

    openManualUniformDeliveryModal(preselectedEmployeeId = null) {
      const modal = document.getElementById('modalManualUniformDelivery');
      if (!modal) return;

      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);
      const selEmp = document.getElementById('uniformDeliveryEmployeeId');

      if (selEmp) {
        selEmp.innerHTML = employees.map(e => `
          <option value="${e.id}" ${e.id === preselectedEmployeeId ? 'selected' : ''}>
            ${e.nomeCompleto} (${e.cpf || 'Sem CPF'} - ${e.agencia} / ${e.operacao})
          </option>
        `).join('') || '<option value="">Nenhum colaborador disponível</option>';
      }

      document.getElementById('uniformDeliveryItem').value = 'Camiseta';
      document.getElementById('uniformDeliveryTamanho').value = 'M';
      document.getElementById('uniformDeliveryQuantidade').value = 1;
      document.getElementById('uniformDeliveryData').value = window.DataStore.Utils.todayISO();
      document.getElementById('uniformDeliveryStatus').value = 'Entregue';
      document.getElementById('uniformDeliveryObs').value = '';

      modal.classList.remove('hidden');
    },

    closeManualUniformDeliveryModal() {
      const modal = document.getElementById('modalManualUniformDelivery');
      if (modal) modal.classList.add('hidden');
    },

    saveManualUniformDelivery() {
      const employeeId = document.getElementById('uniformDeliveryEmployeeId').value;
      const item = document.getElementById('uniformDeliveryItem').value;
      const tamanho = document.getElementById('uniformDeliveryTamanho').value;
      const quantidade = parseInt(document.getElementById('uniformDeliveryQuantidade').value, 10) || 1;
      const dataEntrega = document.getElementById('uniformDeliveryData').value || window.DataStore.Utils.todayISO();
      const status = document.getElementById('uniformDeliveryStatus').value;
      const obs = document.getElementById('uniformDeliveryObs').value.trim();

      if (!employeeId) {
        this.showToast('Selecione um colaborador válido.', 'error');
        return;
      }

      const emp = window.DataStore.getEmployeeById(employeeId);
      if (!emp) {
        this.showToast('Colaborador não encontrado.', 'error');
        return;
      }

      if (!Array.isArray(emp.epis)) {
        emp.epis = [];
      }

      emp.epis.push({
        item,
        tamanho,
        quantidade,
        dataEntrega,
        status,
        observacao: obs ? `${obs} (Tam. ${tamanho})` : `Tamanho ${tamanho}`
      });

      window.DataStore.saveEmployee(emp);
      this.showToast(`Entrega de ${item} (${tamanho}) registrada com sucesso para ${emp.nomeCompleto}!`, 'success');
      this.closeManualUniformDeliveryModal();
      this.renderEPITable();
      this.renderEmployeesTable();
    },

    renderEPITable() {
      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);
      const itemFilter = document.getElementById('filterEpiItem')?.value || 'TODOS';
      const tamanhoFilter = document.getElementById('filterEpiTamanho')?.value || 'TODOS';
      const statusFilter = document.getElementById('filterEpiStatus')?.value || 'TODOS';
      const searchTerm = (document.getElementById('searchEpiInput')?.value || '').toLowerCase().trim();

      const tbody = document.getElementById('episTableBody');
      if (!tbody) return;

      const allEpiRows = [];
      employees.forEach(emp => {
        (emp.epis || []).forEach((epi, idx) => {
          const tamanho = epi.tamanho || (epi.observacao && epi.observacao.includes('Tamanho') ? epi.observacao.replace(/.*Tamanho\s*([A-Za-z0-9Ú-ú]+).*/i, '$1') : '-');
          allEpiRows.push({
            employeeId: emp.id,
            nomeCompleto: emp.nomeCompleto,
            cpf: emp.cpf,
            agencia: emp.agencia,
            operacao: emp.operacao,
            statusContrato: emp.statusContrato,
            epiIndex: idx,
            item: epi.item,
            tamanho: tamanho,
            quantidade: epi.quantidade,
            dataEntrega: epi.dataEntrega,
            status: epi.status,
            observacao: epi.observacao
          });
        });
      });

      const filtered = allEpiRows.filter(row => {
        if (itemFilter !== 'TODOS' && row.item !== itemFilter) return false;
        if (tamanhoFilter !== 'TODOS' && row.tamanho !== tamanhoFilter && !row.observacao?.includes(tamanhoFilter)) return false;
        if (statusFilter !== 'TODOS' && row.status !== statusFilter) return false;
        if (searchTerm) {
          const matchName = row.nomeCompleto.toLowerCase().includes(searchTerm);
          const matchItem = row.item.toLowerCase().includes(searchTerm);
          const matchAgency = row.agencia.toLowerCase().includes(searchTerm);
          const matchTam = (row.tamanho || '').toLowerCase().includes(searchTerm);
          if (!matchName && !matchItem && !matchAgency && !matchTam) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">Nenhum registro de uniforme encontrado com os filtros selecionados.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(row => {
        let badgeColor = 'bg-slate-100 text-slate-700';
        if (row.status === 'Entregue') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
        else if (row.status === 'Pendente') badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';

        return `
          <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs text-slate-700">
            <td class="py-3 px-4">
              <span class="font-bold text-slate-900 block">${row.nomeCompleto}</span>
              <span class="text-[11px] text-slate-500">${row.agencia} • ${row.operacao}</span>
            </td>
            <td class="py-3 px-4 font-semibold text-slate-800">${row.item}</td>
            <td class="py-3 px-4 text-center font-mono font-bold text-blue-700">${row.tamanho}</td>
            <td class="py-3 px-4 text-center font-bold text-slate-700">${row.quantidade}</td>
            <td class="py-3 px-4 text-slate-600">${window.DataStore.Utils.formatDateBR(row.dataEntrega)}</td>
            <td class="py-3 px-4">
              <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] border ${badgeColor}">${row.status}</span>
            </td>
            <td class="py-3 px-4 text-slate-500">${row.observacao || '-'}</td>
            <td class="py-3 px-4 text-right">
              <button onclick="App.viewEmployeeDetails('${row.employeeId}')" class="px-2.5 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors">
                Ver Ficha
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    // ==========================================
    // PAINEL DE ALERTAS & VENCIMENTOS
    // ==========================================
    renderAlertsView() {
      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);
      const allAlerts = window.AlertService.getAllAlerts(employees);

      const elVencidos = document.getElementById('countAlertVencidos');
      const el30d = document.getElementById('countAlert30d');
      const el90d = document.getElementById('countAlert90d');
      const el180d = document.getElementById('countAlert180d');
      const el270d = document.getElementById('countAlert270d');

      if (elVencidos) elVencidos.textContent = (allAlerts.expiring.vencidos || []).length;
      if (el30d) el30d.textContent = (allAlerts.expiring.marco30 || []).length;
      if (el90d) el90d.textContent = (allAlerts.expiring.marco90 || []).length;
      if (el180d) el180d.textContent = (allAlerts.expiring.marco180 || []).length;
      if (el270d) el270d.textContent = (allAlerts.expiring.marco270 || []).length;

      const tbodyContratos = document.getElementById('alertsContratosTableBody');
      if (tbodyContratos) {
        const expiringList = [
          ...(allAlerts.expiring.vencidos || []),
          ...(allAlerts.expiring.marco30 || []),
          ...(allAlerts.expiring.marco90 || []),
          ...(allAlerts.expiring.marco180 || []),
          ...(allAlerts.expiring.marco270 || [])
        ];

        if (expiringList.length === 0) {
          tbodyContratos.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">Nenhum contrato com vencimento próximo (30, 90, 180, 270 dias) no seu escopo.</td></tr>`;
        } else {
          tbodyContratos.innerHTML = expiringList.map(item => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs text-slate-700">
              <td class="py-3 px-4">
                <span class="font-bold text-slate-900 block">${item.emp.nomeCompleto}</span>
                <span class="text-[11px] text-slate-400 font-mono">${item.emp.cpf} • ${item.emp.nomeEmpresa || ''}</span>
              </td>
              <td class="py-3 px-4 font-medium text-slate-800">${item.emp.agencia}</td>
              <td class="py-3 px-4 text-slate-600">${item.emp.operacao} • Gestor: ${item.emp.gestor}</td>
              <td class="py-3 px-4 text-center font-mono font-bold text-blue-700">${item.emp.numeroArmario || '-'}</td>
              <td class="py-3 px-4 text-center font-semibold">${window.DataStore.Utils.formatDateBR(item.emp.dataTerminoContrato)}</td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs border font-semibold ${item.cat.badgeClass}">
                  ${item.cat.label}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <button onclick="App.viewEmployeeDetails('${item.emp.id}')" class="px-2.5 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium">
                  Ver Ficha
                </button>
              </td>
            </tr>
          `).join('');
        }
      }
    },

    // ==========================================
    // RELATÓRIOS (REGRA 8: OPERAÇÃO, AGÊNCIA E SETOR)
    // ==========================================
    bindReportEvents() {
      const applyBtn = document.getElementById('btnApplyReportFilter');
      const resetBtn = document.getElementById('btnResetReportFilter');
      const exportBtn = document.getElementById('btnExportReportCSV');
      const printBtn = document.getElementById('btnPrintReport');

      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          this.collectReportFilters();
          this.renderReportsView();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.resetReportFilters();
          this.renderReportsView();
        });
      }

      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const allEmployees = window.DataStore.getEmployees();
          const employees = window.AuthService.filterScopedEmployees(allEmployees);
          const filtered = window.ReportService.filterData(employees, reportCurrentFilter);
          window.ReportService.exportToCSV(filtered, `relatorio_temporarios_${window.DataStore.Utils.todayISO()}.csv`);
          this.showToast('Relatório exportado para CSV/Excel com sucesso!', 'success');
        });
      }

      if (printBtn) {
        printBtn.addEventListener('click', () => {
          window.ReportService.printReport();
        });
      }
    },

    collectReportFilters() {
      reportCurrentFilter = {
        statusContrato: document.getElementById('repFilterStatusContrato')?.value || 'Ativo',
        operacao: document.getElementById('repFilterOperacao')?.value || 'TODAS',
        agencia: document.getElementById('repFilterAgencia')?.value || 'TODAS',
        setor: document.getElementById('repFilterSetor')?.value || 'TODOS',
        turno: document.getElementById('repFilterTurno')?.value || 'TODOS',
        statusLiberacao: document.getElementById('repFilterLiberacao')?.value || 'TODOS',
        faixaVencimento: document.getElementById('repFilterVencimento')?.value || 'TODOS',
        temArmario: document.getElementById('repFilterArmario')?.value || 'TODOS'
      };
    },

    resetReportFilters() {
      reportCurrentFilter = {
        statusContrato: 'Ativo',
        operacao: 'TODAS',
        agencia: 'TODAS',
        setor: 'TODOS',
        turno: 'TODOS',
        statusLiberacao: 'TODOS',
        faixaVencimento: 'TODOS',
        temArmario: 'TODOS'
      };
      if (document.getElementById('repFilterStatusContrato')) document.getElementById('repFilterStatusContrato').value = 'Ativo';
      if (document.getElementById('repFilterOperacao')) document.getElementById('repFilterOperacao').value = 'TODAS';
      if (document.getElementById('repFilterAgencia')) document.getElementById('repFilterAgencia').value = 'TODAS';
      if (document.getElementById('repFilterSetor')) document.getElementById('repFilterSetor').value = 'TODOS';
      if (document.getElementById('repFilterTurno')) document.getElementById('repFilterTurno').value = 'TODOS';
      if (document.getElementById('repFilterLiberacao')) document.getElementById('repFilterLiberacao').value = 'TODOS';
      if (document.getElementById('repFilterVencimento')) document.getElementById('repFilterVencimento').value = 'TODOS';
      if (document.getElementById('repFilterArmario')) document.getElementById('repFilterArmario').value = 'TODOS';
    },

    renderReportsView() {
      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);

      this.populateReportFilterOptions(employees);
      const filtered = window.ReportService.filterData(employees, reportCurrentFilter);

      const totalColabs = filtered.length;
      let liberados = 0;
      let bloqueados = 0;
      let comArmario = 0;

      filtered.forEach(emp => {
        const s = window.SSTService.evaluateStatus(emp.sst);
        if (s.liberado) liberados++;
        else bloqueados++;
        if (emp.numeroArmario) comArmario++;
      });

      document.getElementById('repSummaryTotal').textContent = totalColabs;
      document.getElementById('repSummaryLiberados').textContent = liberados;
      document.getElementById('repSummaryBloqueados').textContent = bloqueados;
      document.getElementById('repSummaryArmarios').textContent = comArmario;

      const printDateEl = document.getElementById('printDate');
      if (printDateEl) {
        printDateEl.textContent = window.DataStore.Utils.formatDateBR(window.DataStore.Utils.todayISO());
      }

      this.renderGroupedSummaries(filtered);

      const tbody = document.getElementById('reportsTableBody');
      if (!tbody) return;

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">Nenhum colaborador corresponde aos filtros de relatório no seu escopo.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(emp => {
        const evalSST = window.SSTService.evaluateStatus(emp.sst);
        const dias = window.DataStore.Utils.diffInDays(emp.dataTerminoContrato);
        return `
          <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs text-slate-700">
            <td class="py-2.5 px-3">
              <span class="font-bold text-slate-900 block">${emp.nomeCompleto}</span>
              <span class="text-[11px] text-slate-400 font-mono">${emp.cpf} • ${emp.nomeEmpresa || ''}</span>
            </td>
            <td class="py-2.5 px-3 font-medium text-slate-800">${emp.agencia}</td>
            <td class="py-2.5 px-3">${emp.funcao}</td>
            <td class="py-2.5 px-3 font-semibold text-slate-800">${emp.operacao}</td>
            <td class="py-2.5 px-3 text-slate-600">${emp.setor}</td>
            <td class="py-2.5 px-3 text-center font-mono font-bold text-blue-700">${emp.numeroArmario || '-'}</td>
            <td class="py-2.5 px-3 text-center">
              ${evalSST.liberado 
                ? '<span class="text-emerald-700 font-bold">✓ Liberado</span>' 
                : `<span class="text-rose-700 font-bold" title="${evalSST.motivosBloqueio.join(', ')}">✕ Não Liberado</span>`}
            </td>
            <td class="py-2.5 px-3 text-center">
              <span>${window.DataStore.Utils.formatDateBR(emp.dataTerminoContrato)}</span>
              <span class="block text-[10px] text-slate-400">(${dias}d)</span>
            </td>
          </tr>
        `;
      }).join('');
    },

    populateReportFilterOptions(employees) {
      const operacoes = Array.from(new Set(employees.map(e => e.operacao).filter(Boolean)));
      const agencias = Array.from(new Set(employees.map(e => e.agencia).filter(Boolean)));
      const setores = Array.from(new Set(employees.map(e => e.setor).filter(Boolean)));
      const turnos = Array.from(new Set(employees.map(e => e.turno).filter(Boolean)));

      const opSel = document.getElementById('repFilterOperacao');
      if (opSel) {
        const cur = opSel.value;
        opSel.innerHTML = '<option value="TODAS">Todas as Operações</option>';
        operacoes.forEach(o => {
          const opt = document.createElement('option');
          opt.value = o;
          opt.textContent = o;
          if (o === cur) opt.selected = true;
          opSel.appendChild(opt);
        });
      }

      const agSel = document.getElementById('repFilterAgencia');
      if (agSel) {
        const cur = agSel.value;
        agSel.innerHTML = '<option value="TODAS">Todas as Agências</option>';
        agencias.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a;
          opt.textContent = a;
          if (a === cur) opt.selected = true;
          agSel.appendChild(opt);
        });
      }

      const setSel = document.getElementById('repFilterSetor');
      if (setSel) {
        const cur = setSel.value;
        setSel.innerHTML = '<option value="TODOS">Todos os Setores</option>';
        setores.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          if (s === cur) opt.selected = true;
          setSel.appendChild(opt);
        });
      }

      const turnoSel = document.getElementById('repFilterTurno');
      if (turnoSel) {
        const cur = turnoSel.value;
        turnoSel.innerHTML = '<option value="TODOS">Todos os Turnos</option>';
        turnos.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          if (t === cur) opt.selected = true;
          turnoSel.appendChild(opt);
        });
      }
    },

    renderGroupedSummaries(filtered) {
      const byOperacao = window.ReportService.groupBy(filtered, 'operacao');
      const byAgencia = window.ReportService.groupBy(filtered, 'agencia');
      const bySetor = window.ReportService.groupBy(filtered, 'setor');

      const containerOp = document.getElementById('repGroupOperacao');
      if (containerOp) {
        containerOp.innerHTML = byOperacao.map(g => `
          <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span class="font-semibold text-slate-800">${g.nome}</span>
            <div class="flex gap-2">
              <span class="text-blue-700 font-bold">${g.total} total</span>
              <span class="text-emerald-700 font-medium">(${g.liberados} lib)</span>
            </div>
          </div>
        `).join('') || '<div class="text-slate-400 text-xs italic">Sem dados.</div>';
      }

      const containerAg = document.getElementById('repGroupAgencia');
      if (containerAg) {
        containerAg.innerHTML = byAgencia.map(g => `
          <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span class="font-semibold text-slate-800">${g.nome}</span>
            <div class="flex gap-2">
              <span class="text-purple-700 font-bold">${g.total} total</span>
              <span class="text-emerald-700 font-medium">(${g.liberados} lib)</span>
            </div>
          </div>
        `).join('') || '<div class="text-slate-400 text-xs italic">Sem dados.</div>';
      }

      const containerSet = document.getElementById('repGroupSetor');
      if (containerSet) {
        containerSet.innerHTML = bySetor.map(g => `
          <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span class="font-semibold text-slate-800">${g.nome}</span>
            <div class="flex gap-2">
              <span class="text-slate-700 font-bold">${g.total} total</span>
            </div>
          </div>
        `).join('') || '<div class="text-slate-400 text-xs italic">Sem dados.</div>';
      }
    },

    // ==========================================
    // EVENTOS GLOBAIS (BUSCA RÁPIDA, SINO, RESET)
    // ==========================================
    bindGlobalEvents() {
      // Atualização automática quando os dados do PostgreSQL são sincronizados
      window.addEventListener('cft:datasync', () => {
        this.navigateTo(currentView);
        this.updateHeaderAlerts();
        this.updateUserHeaderScope();
      });

      const globalSearch = document.getElementById('globalSearchInput');
      if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          if (val.length > 0) {
            if (currentView !== 'employees') {
              this.navigateTo('employees');
            }
            const empSearch = document.getElementById('searchEmployeeInput');
            if (empSearch) {
              empSearch.value = val;
              this.renderEmployeesTable();
            }
          }
        });
      }

      const alertBtn = document.getElementById('btnHeaderAlerts');
      const alertDropdown = document.getElementById('headerAlertDropdown');
      if (alertBtn && alertDropdown) {
        alertBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          alertDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
          alertDropdown.classList.add('hidden');
        });
      }

      const resetBtn = document.getElementById('btnResetDatabase');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (confirm('Deseja recarregar a base com os dados originais de demonstração? Quaisquer alterações não salvas serão substituídas.')) {
            window.DataStore.resetToDefault();
            this.showToast('Base de demonstração restaurada com sucesso!', 'success');
            this.navigateTo('dashboard');
          }
        });
      }

      const empSearch = document.getElementById('searchEmployeeInput');
      if (empSearch) {
        empSearch.addEventListener('input', () => this.renderEmployeesTable());
      }

      const statusFilter = document.getElementById('filterStatusContrato');
      if (statusFilter) {
        statusFilter.addEventListener('change', () => this.renderEmployeesTable());
      }

      const opFilter = document.getElementById('filterOperacao');
      if (opFilter) {
        opFilter.addEventListener('change', () => this.renderEmployeesTable());
      }

      const agFilter = document.getElementById('filterAgencia');
      if (agFilter) {
        agFilter.addEventListener('change', () => this.renderEmployeesTable());
      }
    },

    // ==========================================
    // GESTÃO DISCIPLINAR (ADVERTÊNCIAS & SUSPENSÕES)
    // ==========================================
    bindDisciplinaryEvents() {
      const searchDisc = document.getElementById('searchDisciplinaryInput');
      const filterTipo = document.getElementById('filterDiscTipo');
      const filterMotivo = document.getElementById('filterDiscMotivo');

      if (searchDisc) searchDisc.addEventListener('input', () => this.renderDisciplinaryView());
      if (filterTipo) filterTipo.addEventListener('change', () => this.renderDisciplinaryView());
      if (filterMotivo) filterMotivo.addEventListener('change', () => this.renderDisciplinaryView());

      const formDisc = document.getElementById('formNewDisciplinary');
      if (formDisc) {
        formDisc.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveDisciplinaryRecord();
        });
      }

      const selEmp = document.getElementById('discEmployeeId');
      if (selEmp) {
        selEmp.addEventListener('change', () => {
          this.updateDisciplinaryEmployeePreview();
        });
      }

      const selTipo = document.getElementById('discTipo');
      if (selTipo) {
        selTipo.addEventListener('change', () => {
          const isSuspensao = selTipo.value === 'Suspensão Disciplinar';
          const diasContainer = document.getElementById('discDiasContainer');
          const periodoContainer = document.getElementById('discPeriodoContainer');
          if (diasContainer) diasContainer.classList.toggle('hidden', !isSuspensao);
          if (periodoContainer) periodoContainer.classList.toggle('hidden', !isSuspensao);
        });
      }

      const selAssinatura = document.getElementById('discStatusAssinatura');
      if (selAssinatura) {
        selAssinatura.addEventListener('change', () => {
          const isRecusa = selAssinatura.value.includes('Recusou-se');
          const testContainer = document.getElementById('discTestemunhasFields');
          if (testContainer) {
            testContainer.classList.toggle('hidden', !isRecusa);
          }
        });
      }
    },

    filterScopedDisciplinary(list, scopedEmployees) {
      if (!Array.isArray(list)) return [];
      const scopedEmpIds = new Set((scopedEmployees || []).map(e => e.id));
      const currentUser = window.AuthService.getCurrentUser();

      return list.filter(d => {
        if (currentUser.perfil === 'ADMIN') return true;
        if (scopedEmpIds.has(d.employeeId)) return true;
        if (currentUser.cnpjVinculado !== 'TODOS' && d.cnpjEmpresa && d.cnpjEmpresa !== currentUser.cnpjVinculado) return false;
        if (currentUser.filtroApenasMeusColaboradores && d.gestor && !d.gestor.toLowerCase().includes(currentUser.nome.toLowerCase())) return false;
        return true;
      });
    },

    renderDisciplinaryView() {
      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);
      const allDisciplinary = window.DataStore.getDisciplinary();
      const scopedDisciplinary = this.filterScopedDisciplinary(allDisciplinary, employees);

      const searchVal = (document.getElementById('searchDisciplinaryInput')?.value || '').toLowerCase().trim();
      const tipoVal = document.getElementById('filterDiscTipo')?.value || 'TODOS';
      const motivoVal = document.getElementById('filterDiscMotivo')?.value || 'TODOS';

      // KPIs
      const kpiTotal = scopedDisciplinary.length;
      const kpiVerbais = scopedDisciplinary.filter(d => d.tipo === 'Advertência Verbal').length;
      const kpiEscritas = scopedDisciplinary.filter(d => d.tipo === 'Advertência Escrita').length;
      const kpiSuspensoes = scopedDisciplinary.filter(d => d.tipo === 'Suspensão Disciplinar').length;

      const elTotal = document.getElementById('discKpiTotal');
      const elVerbais = document.getElementById('discKpiVerbais');
      const elEscritas = document.getElementById('discKpiEscritas');
      const elSuspensoes = document.getElementById('discKpiSuspensoes');

      if (elTotal) elTotal.textContent = kpiTotal;
      if (elVerbais) elVerbais.textContent = kpiVerbais;
      if (elEscritas) elEscritas.textContent = kpiEscritas;
      if (elSuspensoes) elSuspensoes.textContent = kpiSuspensoes;

      const filtered = scopedDisciplinary.filter(d => {
        if (tipoVal !== 'TODOS' && d.tipo !== tipoVal) return false;
        if (motivoVal !== 'TODOS' && d.motivo !== motivoVal) return false;
        if (searchVal) {
          const matchNome = (d.nomeCompleto || '').toLowerCase().includes(searchVal);
          const matchCpf = (d.cpf || '').replace(/\D/g, '').includes(searchVal.replace(/\D/g, ''));
          const matchMotivo = (d.motivo || '').toLowerCase().includes(searchVal);
          const matchGestor = (d.gestor || '').toLowerCase().includes(searchVal);
          const matchAgencia = (d.agencia || '').toLowerCase().includes(searchVal);
          if (!matchNome && !matchCpf && !matchMotivo && !matchGestor && !matchAgencia) return false;
        }
        return true;
      });

      const countBadge = document.getElementById('disciplinaryCountBadge');
      if (countBadge) countBadge.textContent = `${filtered.length} registro(s)`;

      const tbody = document.getElementById('disciplinaryTableBody');
      if (!tbody) return;

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">Nenhuma advertência ou suspensão encontrada com os filtros selecionados.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(d => {
        let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
        if (d.tipo === 'Advertência Escrita') badgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
        else if (d.tipo === 'Suspensão Disciplinar') badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';

        let badgeAssinatura = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
        if (d.statusAssinatura.includes('Recusou-se')) badgeAssinatura = 'bg-purple-100 text-purple-800 border-purple-300 font-semibold';
        else if (d.statusAssinatura.includes('Pendente')) badgeAssinatura = 'bg-slate-100 text-slate-700 border-slate-200';

        return `
          <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs text-slate-700">
            <td class="py-3 px-4">
              <span class="font-bold text-slate-900 block">${d.nomeCompleto}</span>
              <span class="text-[11px] text-slate-400 font-mono">${d.cpf || '-'} • ${d.nomeEmpresa || ''}</span>
            </td>
            <td class="py-3 px-4">
              <span class="font-semibold text-slate-800 block">${d.agencia || '-'}</span>
              <span class="text-[11px] text-slate-500">${d.operacao || ''} • Gestor: ${d.gestor || '-'}</span>
            </td>
            <td class="py-3 px-4 text-center">
              <span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] border ${badgeColor}">
                ${d.tipo} ${d.diasSuspensao ? `(${d.diasSuspensao} dia${d.diasSuspensao > 1 ? 's' : ''})` : ''}
              </span>
            </td>
            <td class="py-3 px-4 max-w-xs">
              <span class="font-semibold text-slate-900 block truncate" title="${d.motivo}">${d.motivo}</span>
              <span class="text-[11px] text-slate-500 line-clamp-1 truncate" title="${d.descricao}">${d.descricao}</span>
            </td>
            <td class="py-3 px-4 text-center text-slate-600">${window.DataStore.Utils.formatDateBR(d.dataFato)}</td>
            <td class="py-3 px-4 text-center text-slate-600 font-medium">${window.DataStore.Utils.formatDateBR(d.dataAplicacao)}</td>
            <td class="py-3 px-4 text-center">
              <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] border ${badgeAssinatura}">
                ${d.statusAssinatura}
              </span>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="App.openPrintDisciplinaryModal('${d.id}')" class="px-2.5 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold transition-colors">
                  Imprimir Termo
                </button>
                <button onclick="App.deleteDisciplinaryRecord('${d.id}')" class="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir Medida">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    updateDisciplinaryEmployeePreview() {
      const employeeId = document.getElementById('discEmployeeId')?.value;
      const emp = window.DataStore.getEmployeeById(employeeId);
      if (emp) {
        document.getElementById('discPreviewCpf').textContent = emp.cpf || '-';
        document.getElementById('discPreviewAgencia').textContent = emp.agencia || '-';
        document.getElementById('discPreviewOperacao').textContent = emp.operacao || '-';
        document.getElementById('discPreviewGestor').textContent = emp.gestor || '-';
      } else {
        document.getElementById('discPreviewCpf').textContent = '-';
        document.getElementById('discPreviewAgencia').textContent = '-';
        document.getElementById('discPreviewOperacao').textContent = '-';
        document.getElementById('discPreviewGestor').textContent = '-';
      }
    },

    openNewDisciplinaryModal(preselectedEmployeeId = null) {
      const modal = document.getElementById('modalNewDisciplinary');
      if (!modal) return;

      const allEmployees = window.DataStore.getEmployees();
      const employees = window.AuthService.filterScopedEmployees(allEmployees);
      const selEmp = document.getElementById('discEmployeeId');

      if (selEmp) {
        selEmp.innerHTML = employees.map(e => `
          <option value="${e.id}" ${e.id === preselectedEmployeeId ? 'selected' : ''}>
            ${e.nomeCompleto} (${e.cpf || 'Sem CPF'} • ${e.agencia} / ${e.operacao})
          </option>
        `).join('') || '<option value="">Nenhum colaborador disponível</option>';
      }

      this.updateDisciplinaryEmployeePreview();

      const today = window.DataStore.Utils.todayISO();
      document.getElementById('discTipo').value = 'Advertência Escrita';
      document.getElementById('discDiasSuspensao').value = 1;
      document.getElementById('discDataInicioSuspensao').value = today;
      document.getElementById('discDataFimSuspensao').value = today;
      document.getElementById('discDataFato').value = today;
      document.getElementById('discDataAplicacao').value = today;
      document.getElementById('discMotivo').value = 'Falta Injustificada';
      document.getElementById('discDescricao').value = '';
      document.getElementById('discStatusAssinatura').value = 'Assinada pelo Colaborador';
      document.getElementById('discTestemunha1').value = '';
      document.getElementById('discTestemunha2').value = '';

      document.getElementById('discDiasContainer').classList.add('hidden');
      document.getElementById('discPeriodoContainer').classList.add('hidden');
      document.getElementById('discTestemunhasFields').classList.add('hidden');

      modal.classList.remove('hidden');
    },

    closeNewDisciplinaryModal() {
      const modal = document.getElementById('modalNewDisciplinary');
      if (modal) modal.classList.add('hidden');
    },

    saveDisciplinaryRecord() {
      const employeeId = document.getElementById('discEmployeeId').value;
      if (!employeeId) {
        this.showToast('Selecione um colaborador.', 'error');
        return;
      }

      const emp = window.DataStore.getEmployeeById(employeeId);
      if (!emp) {
        this.showToast('Colaborador não encontrado.', 'error');
        return;
      }

      const tipo = document.getElementById('discTipo').value;
      const isSuspensao = tipo === 'Suspensão Disciplinar';
      const diasSuspensao = isSuspensao ? (parseInt(document.getElementById('discDiasSuspensao').value, 10) || 1) : 0;
      const dataInicioSuspensao = isSuspensao ? document.getElementById('discDataInicioSuspensao').value : null;
      const dataFimSuspensao = isSuspensao ? document.getElementById('discDataFimSuspensao').value : null;
      const dataFato = document.getElementById('discDataFato').value;
      const dataAplicacao = document.getElementById('discDataAplicacao').value;
      const motivo = document.getElementById('discMotivo').value;
      const descricao = document.getElementById('discDescricao').value.trim();
      const statusAssinatura = document.getElementById('discStatusAssinatura').value;
      const testemunha1 = document.getElementById('discTestemunha1').value.trim();
      const testemunha2 = document.getElementById('discTestemunha2').value.trim();

      if (!dataFato || !dataAplicacao || !descricao) {
        this.showToast('Preencha a data do fato, data de aplicação e a descrição dos fatos.', 'error');
        return;
      }

      const newRecord = {
        employeeId: emp.id,
        nomeCompleto: emp.nomeCompleto,
        cpf: emp.cpf,
        cnpjEmpresa: emp.cnpjEmpresa || '12.345.678/0001-90',
        nomeEmpresa: emp.nomeEmpresa || 'Matriz',
        agencia: emp.agencia,
        funcao: emp.funcao,
        operacao: emp.operacao,
        setor: emp.setor,
        gestor: emp.gestor,
        tipo,
        diasSuspensao,
        dataInicioSuspensao,
        dataFimSuspensao,
        motivo,
        dataFato,
        dataAplicacao,
        descricao,
        statusAssinatura,
        testemunha1,
        testemunha2
      };

      const saved = window.DataStore.addDisciplinary(newRecord);
      this.showToast(`Medida disciplinar registrada com sucesso para ${emp.nomeCompleto}!`, 'success');
      this.closeNewDisciplinaryModal();
      this.renderDisciplinaryView();
      this.renderDashboard();
      this.openPrintDisciplinaryModal(saved.id);
    },

    deleteDisciplinaryRecord(id) {
      if (confirm('Tem certeza que deseja excluir esta notificação disciplinar?')) {
        window.DataStore.deleteDisciplinary(id);
        this.showToast('Registro disciplinar excluído com sucesso.', 'info');
        this.renderDisciplinaryView();
        this.renderDashboard();
      }
    },

    openPrintDisciplinaryModal(id) {
      const allDisciplinary = window.DataStore.getDisciplinary();
      const d = allDisciplinary.find(item => item.id === id);
      if (!d) return;

      const modal = document.getElementById('modalPrintDisciplinary');
      const paper = document.getElementById('printDisciplinaryPaper');
      if (!modal || !paper) return;

      const isSuspensao = d.tipo === 'Suspensão Disciplinar';
      const isRecusa = d.statusAssinatura.includes('Recusou-se');

      paper.innerHTML = `
        <div class="space-y-6 text-slate-900">
          <!-- Cabeçalho Oficial com Logotipo CTDI -->
          <div class="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="bg-[#002868] p-1.5 rounded-lg shadow-xs flex items-center justify-center">
                <img src="img/ctdi-logo.png" alt="CTDI" style="height: 34px; width: auto; object-fit: contain;">
              </div>
              <div>
                <h2 class="text-base font-black uppercase tracking-tight text-slate-900">
                  CTDI do Brasil • Notificação Disciplinar
                </h2>
                <p class="text-xs text-slate-600 font-medium">
                  Regulamentação: Consolidação das Leis do Trabalho (CLT) & Lei Federal nº 6.019/1974
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="inline-block px-3 py-1 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded">
                ${d.tipo.toUpperCase()}
              </span>
              <span class="block text-[11px] text-slate-500 font-mono mt-1">Ref: ${d.id}</span>
            </div>
          </div>

          <!-- Dados das Partes -->
          <div class="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Empresa Tomadora dos Serviços</span>
              <span class="font-bold text-slate-900">${d.nomeEmpresa || 'Empresa Tomadora'}</span>
              <span class="block text-slate-600 font-mono text-[11px]">CNPJ: ${d.cnpjEmpresa || '-'}</span>
              <span class="block text-slate-600 mt-1">Agência Fornecedora: <strong>${d.agencia || '-'}</strong></span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Colaborador(a) Temporário(a)</span>
              <span class="font-bold text-slate-900 text-sm">${d.nomeCompleto}</span>
              <span class="block text-slate-600 font-mono text-[11px]">CPF: ${d.cpf || '-'}</span>
              <span class="block text-slate-600">Função: <strong>${d.funcao || '-'}</strong> • Setor: ${d.setor || d.operacao || '-'}</span>
              <span class="block text-slate-600">Gestor Responsável: <strong>${d.gestor || '-'}</strong></span>
            </div>
          </div>

          <!-- Detalhamento da Ocorrência e Fatos -->
          <div class="space-y-3 text-xs leading-relaxed">
            <div class="p-3 bg-slate-100 rounded-lg border border-slate-300">
              <div class="font-bold text-slate-800 uppercase tracking-wide text-[11px] mb-1">
                Motivo da Infração: <span class="text-rose-700">${d.motivo}</span>
              </div>
              <div class="text-slate-700">
                <strong>Data do Fato / Ocorrência:</strong> ${window.DataStore.Utils.formatDateBR(d.dataFato)} • <strong>Data de Aplicação:</strong> ${window.DataStore.Utils.formatDateBR(d.dataAplicacao)}
              </div>
              ${isSuspensao ? `
                <div class="mt-2 text-rose-800 font-bold">
                  Período de Suspensão Disciplinar: ${d.diasSuspensao} dia(s) útil(eis), de ${window.DataStore.Utils.formatDateBR(d.dataInicioSuspensao || d.dataAplicacao)} até ${window.DataStore.Utils.formatDateBR(d.dataFimSuspensao || d.dataAplicacao)}, sem direito a remuneração no período.
                </div>
              ` : ''}
            </div>

            <div>
              <h4 class="font-bold text-slate-900 uppercase text-[11px] tracking-wide mb-1">
                Descrição Circunstanciada dos Fatos:
              </h4>
              <p class="p-3 bg-white border border-slate-300 rounded-lg text-slate-800 whitespace-pre-wrap font-sans text-xs">
                ${d.descricao}
              </p>
            </div>

            <!-- Fundamentação Legal e Advertência -->
            <div class="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-[11.5px] space-y-1.5">
              <span class="font-bold block uppercase text-amber-900">Notificação e Advertência Legal:</span>
              <p>
                Fica V. Sa. formalmente notificado(a) da aplicação da penalidade disciplinar de <strong>${d.tipo.toUpperCase()}</strong> em razão da conduta irregular retrodescrita, a qual contraria as diretrizes internas da empresa, os regulamentos operacionais e os preceitos de ordem e disciplina do trabalho.
              </p>
              <p>
                Advertimos outrossim que a reincidência nesta ou em outras infrações funcionais implicará a aplicação de penalidades progressivamente mais severas, inclusive a <strong>RESCISÃO DO CONTRATO DE TRABALHO POR JUSTA CAUSA</strong>, com esteio no <strong>Artigo 482 da CLT</strong> e dispositivos vigentes da Lei nº 6.019/1974.
              </p>
            </div>
          </div>

          <!-- Assinaturas e Local -->
          <div class="pt-6 space-y-8 text-xs">
            <div class="text-right text-slate-600 font-medium">
              Data de Emissão: ${window.DataStore.Utils.formatDateBR(d.dataAplicacao)}
            </div>

            <div class="grid grid-cols-2 gap-8 pt-4">
              <div class="border-t border-slate-900 pt-2 text-center">
                <span class="font-bold text-slate-900 block">${d.nomeEmpresa || 'Empresa Tomadora'}</span>
                <span class="text-slate-500 text-[11px] block">Gestor: ${d.gestor || 'Responsável'}</span>
                <span class="text-[10px] text-slate-400">Empregador / Tomador</span>
              </div>

              <div class="border-t border-slate-900 pt-2 text-center">
                <span class="font-bold text-slate-900 block">${d.nomeCompleto}</span>
                <span class="text-slate-500 text-[11px] block">CPF: ${d.cpf || '-'}</span>
                <span class="text-[10px] text-slate-400">Empregado Temporário (Ciente em: ____/____/________)</span>
              </div>
            </div>

            <!-- Campo de Recusa com 2 Testemunhas -->
            ${isRecusa ? `
              <div class="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
                <div class="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  Termo de Recusa de Assinatura (Art. 482 da CLT)
                </div>
                <p class="text-slate-600 text-[11px]">
                  Atestamos que o(a) colaborador(a) acima qualificado(a) tomou ciência integral do conteúdo e teor desta notificação disciplinar nesta data, porém <strong>recusou-se a apor sua assinatura</strong> no respectivo documento, pelo que firmamos o presente para que produza os efeitos legais.
                </p>
                <div class="grid grid-cols-2 gap-6 pt-3">
                  <div class="border-t border-slate-700 pt-1 text-center">
                    <span class="font-bold text-slate-800 block text-xs">${d.testemunha1 || '1ª Testemunha'}</span>
                    <span class="text-[10px] text-slate-500">Assinatura da Testemunha 1</span>
                  </div>
                  <div class="border-t border-slate-700 pt-1 text-center">
                    <span class="font-bold text-slate-800 block text-xs">${d.testemunha2 || '2ª Testemunha'}</span>
                    <span class="text-[10px] text-slate-500">Assinatura da Testemunha 2</span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
    },

    closePrintDisciplinaryModal() {
      const modal = document.getElementById('modalPrintDisciplinary');
      if (modal) modal.classList.add('hidden');
    },

    executePrintDisciplinaryTerm() {
      const paper = document.getElementById('printDisciplinaryPaper');
      if (!paper) return;

      const printWindow = window.open('', '_blank', 'width=850,height=950');
      if (!printWindow) {
        window.print();
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Termo de Notificação Disciplinar</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 20mm; font-size: 10pt; }
              button { display: none !important; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 25px; }
          </style>
        </head>
        <body class="bg-white text-slate-900">
          <div class="max-w-3xl mx-auto">
            ${paper.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

  window.App = App;
})(window);
