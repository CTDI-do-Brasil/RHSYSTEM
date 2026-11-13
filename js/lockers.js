/**
 * LockerService - Gestão e Regras de Controle de Armários
 * Sistema de Controle de Funcionários Temporários
 */

(function (window) {
  'use strict';

  const LockerService = {
    /**
     * Regra 1: Não permitir atribuir um armário já ocupado.
     */
    validateAssignment(numeroArmario, currentEmployeeId = null) {
      if (!numeroArmario || !numeroArmario.trim()) {
        return { valid: true, message: 'Nenhum armário selecionado' };
      }

      const numNormalized = numeroArmario.trim().toUpperCase();
      const lockers = window.DataStore.getLockers();
      const locker = lockers.find(l => l.numero.toUpperCase() === numNormalized);

      if (!locker) {
        // Armário novo digitado manualmente: é válido para criação automática
        return { valid: true, isNew: true, message: `O armário ${numNormalized} será cadastrado e atribuído ao colaborador.` };
      }

      if (locker.status === 'Manutenção') {
        return { valid: false, message: `O armário ${numNormalized} está em MANUTENÇÃO e não pode ser atribuído.` };
      }

      if (locker.status === 'Ocupado') {
        if (currentEmployeeId && locker.ocupadoPorId === currentEmployeeId) {
          return { valid: true, message: 'Armário já atribuído ao colaborador atual.' };
        }
        return {
          valid: false,
          message: `Regra de Sistema: O armário ${numNormalized} já está OCUPADO por ${locker.ocupadoPorNome || 'outro colaborador'}. Selecione ou digite outro armário disponível.`
        };
      }

      return { valid: true, message: 'Armário disponível para atribuição.' };
    },

    getAvailableLockersForSelect(currentEmployeeId = null, currentEmployeeLocker = null) {
      const lockers = window.DataStore.getLockers();
      return lockers.filter(l => {
        if (l.status === 'Disponível') return true;
        if (currentEmployeeId && l.ocupadoPorId === currentEmployeeId) return true;
        if (currentEmployeeLocker && l.numero.toUpperCase() === currentEmployeeLocker.toUpperCase()) return true;
        return false;
      });
    },

    getStats() {
      const lockers = window.DataStore.getLockers();
      const total = lockers.length;
      let disponiveis = 0;
      let ocupados = 0;
      let manutencao = 0;

      lockers.forEach(l => {
        if (l.status === 'Disponível') disponiveis++;
        else if (l.status === 'Ocupado') ocupados++;
        else if (l.status === 'Manutenção') manutencao++;
      });

      return {
        total,
        disponiveis,
        ocupados,
        manutencao,
        taxaOcupacao: total > 0 ? Math.round((ocupados / total) * 100) : 0
      };
    },

    releaseLocker(numeroArmario) {
      const lockers = window.DataStore.getLockers();
      const locker = lockers.find(l => l.numero.toUpperCase() === numeroArmario.toUpperCase());
      if (locker) {
        locker.status = 'Disponível';
        locker.ocupadoPorId = null;
        locker.ocupadoPorNome = null;
        locker.dataDevolucao = window.DataStore.Utils.todayISO();
        window.DataStore.saveLockers(lockers);

        const employees = window.DataStore.getEmployees();
        employees.forEach(emp => {
          if (emp.numeroArmario && emp.numeroArmario.toUpperCase() === numeroArmario.toUpperCase()) {
            emp.dataDevolucaoArmario = window.DataStore.Utils.todayISO();
            emp.numeroArmario = null;
          }
        });
        window.DataStore.saveEmployees(employees);
        return true;
      }
      return false;
    },

    setMaintenance(numeroArmario, isMaintenance) {
      const lockers = window.DataStore.getLockers();
      const locker = lockers.find(l => l.numero.toUpperCase() === numeroArmario.toUpperCase());
      if (locker) {
        if (locker.status === 'Ocupado' && isMaintenance) {
          return { success: false, message: 'Não é possível colocar em manutenção um armário atualmente ocupado. Desocupe-o primeiro.' };
        }
        locker.status = isMaintenance ? 'Manutenção' : 'Disponível';
        window.DataStore.saveLockers(lockers);
        return { success: true };
      }
      return { success: false, message: 'Armário não encontrado' };
    },

    // Cadastrar armário manualmente
    addManualLocker(numero, bloco, status, dataEntrega = null, dataDevolucao = null) {
      if (!numero || !numero.trim()) {
        return { success: false, message: 'O número do armário é obrigatório.' };
      }

      return window.DataStore.addCustomLocker({
        numero: numero.trim().toUpperCase(),
        bloco: bloco || 'Geral',
        status: status || 'Disponível',
        dataEntrega: dataEntrega || null,
        dataDevolucao: dataDevolucao || null
      });
    }
  };

  window.LockerService = LockerService;
})(window);
