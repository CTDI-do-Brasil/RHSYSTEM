/**
 * SSTService - Controle de Segurança e Saúde no Trabalho & Regras de Liberação
 * Sistema de Controle de Funcionários Temporários
 */

(function (window) {
  'use strict';

  const SSTService = {
    /**
     * Avalia o status de liberação do colaborador com base no checklist de SST.
     * Regra: Se qualquer um dos itens críticos estiver pendente, o status é NÃO LIBERADO.
     * 
     * Motivos de bloqueio:
     * - Integração pendente
     * - ASO pendente
     * - Termo de Uniforme pendente
     */
    evaluateStatus(sst) {
      if (!sst) {
        return {
          liberado: false,
          motivosBloqueio: [
            'Integração pendente',
            'ASO pendente',
            'Termo de Uniforme pendente'
          ]
        };
      }

      const motivos = [];

      if (!sst.integracaoRealizada) {
        motivos.push('Integração pendente');
      }

      if (!sst.asoRecebido) {
        motivos.push('ASO pendente');
      }

      const termoAssinado = ('termoUniformeAssinado' in sst) ? sst.termoUniformeAssinado : sst.fichaEpiAssinada;
      if (!termoAssinado) {
        motivos.push('Termo de Uniforme pendente');
      }

      const liberado = motivos.length === 0;

      return {
        liberado: liberado,
        motivosBloqueio: motivos,
        statusTexto: liberado ? 'Liberado para Trabalhar' : 'Não Liberado'
      };
    },

    /**
     * Retorna a badge HTML com tooltip dos motivos de bloqueio se houver
     */
    renderBadge(statusObj) {
      if (statusObj.liberado) {
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          Liberado para Trabalhar
        </span>`;
      } else {
        const tooltip = statusObj.motivosBloqueio.join(' • ');
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 cursor-help" title="${tooltip}">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          Não Liberado (${statusObj.motivosBloqueio.length})
        </span>`;
      }
    },

    /**
     * Resumo quantitativo para o Dashboard
     */
    getSummary(employees) {
      const active = (employees || []).filter(e => e.statusContrato === 'Ativo');
      let liberados = 0;
      let bloqueados = 0;
      const motivosContagem = {
        'Integração pendente': 0,
        'ASO pendente': 0,
        'Termo de Uniforme pendente': 0
      };

      active.forEach(emp => {
        const evalRes = this.evaluateStatus(emp.sst);
        if (evalRes.liberado) {
          liberados++;
        } else {
          bloqueados++;
          evalRes.motivosBloqueio.forEach(m => {
            if (motivosContagem[m] !== undefined) {
              motivosContagem[m]++;
            }
          });
        }
      });

      return {
        totalAtivos: active.length,
        liberados,
        bloqueados,
        motivosContagem
      };
    }
  };

  window.SSTService = SSTService;
})(window);
