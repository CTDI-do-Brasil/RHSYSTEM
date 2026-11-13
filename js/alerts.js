/**
 * AlertService - Gestão de Alertas Automáticos de Vencimento e Devolução de Uniformes
 * Sistema de Controle de Funcionários Temporários
 */

(function (window) {
  'use strict';

  const AlertService = {
    /**
     * Regra de Contratos: Vencimento em 30, 90, 180 e 270 dias (e vencidos).
     */
    categorizeContractExpiration(targetDateStr) {
      if (!targetDateStr) return { tier: 'sem_data', dias: null, label: 'Sem data', cor: 'gray' };

      const dias = window.DataStore.Utils.diffInDays(targetDateStr);

      if (dias < 0) {
        return {
          tier: 'vencido',
          dias: dias,
          diasAbs: Math.abs(dias),
          label: `Vencido há ${Math.abs(dias)} dia(s)`,
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
          priority: 1
        };
      } else if (dias === 0) {
        return {
          tier: 'vence_hoje',
          dias: 0,
          diasAbs: 0,
          label: 'Vence HOJE!',
          badgeClass: 'bg-rose-600 text-white font-bold animate-pulse',
          priority: 2
        };
      } else if (dias <= 30) {
        return {
          tier: 'marco_30',
          dias: dias,
          diasAbs: dias,
          label: `Vence em ${dias} dia(s) (30d)`,
          badgeClass: 'bg-red-100 text-red-800 border-red-300 font-semibold',
          priority: 3
        };
      } else if (dias <= 90) {
        return {
          tier: 'marco_90',
          dias: dias,
          diasAbs: dias,
          label: `Vence em ${dias} dia(s) (90d)`,
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
          priority: 4
        };
      } else if (dias <= 180) {
        return {
          tier: 'marco_180',
          dias: dias,
          diasAbs: dias,
          label: `Vence em ${dias} dia(s) (180d)`,
          badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-medium',
          priority: 5
        };
      } else if (dias <= 270) {
        return {
          tier: 'marco_270',
          dias: dias,
          diasAbs: dias,
          label: `Vence em ${dias} dia(s) (270d)`,
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-medium',
          priority: 6
        };
      } else {
        return {
          tier: 'regular',
          dias: dias,
          diasAbs: dias,
          label: `Vence em ${dias} dias (>270d)`,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          priority: 7
        };
      }
    },

    /**
     * Retorna badge HTML para o status de vencimento
     */
    renderContractBadge(targetDateStr) {
      const cat = this.categorizeContractExpiration(targetDateStr);
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${cat.badgeClass}">
        ${cat.label}
      </span>`;
    },

    /**
     * Controle de Uniformes: Os uniformes NÃO são devolvidos pelo colaborador.
     * Retorna lista vazia pois não há pendência de devolução de uniformes.
     */
    getPendingPPEReturns(employees) {
      return [];
    },

    /**
     * Retorna contratos categorizados em 30, 90, 180 e 270 dias (ou já vencidos)
     */
    getExpiringContracts(employees) {
      const result = {
        vencidos: [],
        marco30: [],
        marco90: [],
        marco180: [],
        marco270: [],
        total: 0
      };

      (employees || []).forEach(emp => {
        if (emp.statusContrato === 'Ativo') {
          const cat = this.categorizeContractExpiration(emp.dataTerminoContrato);
          if (cat.tier === 'vencido' || cat.tier === 'vence_hoje') {
            result.vencidos.push({ emp, cat });
            result.total++;
          } else if (cat.tier === 'marco_30') {
            result.marco30.push({ emp, cat });
            result.total++;
          } else if (cat.tier === 'marco_90') {
            result.marco90.push({ emp, cat });
            result.total++;
          } else if (cat.tier === 'marco_180') {
            result.marco180.push({ emp, cat });
            result.total++;
          } else if (cat.tier === 'marco_270') {
            result.marco270.push({ emp, cat });
            result.total++;
          }
        }
      });

      return result;
    },

    /**
     * Resumo consolidado de todos os alertas ativos
     */
    getAllAlerts(employees) {
      const expiring = this.getExpiringContracts(employees);
      const pendingPPE = this.getPendingPPEReturns(employees);
      
      // Pendências de SST
      const sstBlocked = (employees || []).filter(e => {
        if (e.statusContrato !== 'Ativo') return false;
        const s = window.SSTService.evaluateStatus(e.sst);
        return !s.liberado;
      });

      const totalAlertsCount = expiring.total + pendingPPE.length + sstBlocked.length;

      return {
        expiring,
        pendingPPE,
        sstBlocked,
        totalAlertsCount
      };
    }
  };

  window.AlertService = AlertService;
})(window);
