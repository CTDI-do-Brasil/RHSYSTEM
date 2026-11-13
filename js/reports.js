/**
 * ReportService - Motor de Relatórios, Filtros Multidimensionais e Exportação
 * Sistema de Controle de Funcionários Temporários
 */

(function (window) {
  'use strict';

  const ReportService = {
    filterData(employees, filters = {}) {
      return (employees || []).filter(emp => {
        if (filters.statusContrato && filters.statusContrato !== 'TODOS') {
          if (emp.statusContrato !== filters.statusContrato) return false;
        }

        if (filters.operacao && filters.operacao !== 'TODAS') {
          if (emp.operacao !== filters.operacao) return false;
        }

        if (filters.agencia && filters.agencia !== 'TODAS') {
          if (emp.agencia !== filters.agencia) return false;
        }

        if (filters.setor && filters.setor !== 'TODOS') {
          if (emp.setor !== filters.setor) return false;
        }

        if (filters.turno && filters.turno !== 'TODOS') {
          if (emp.turno !== filters.turno) return false;
        }

        if (filters.statusLiberacao && filters.statusLiberacao !== 'TODOS') {
          const evalRes = window.SSTService.evaluateStatus(emp.sst);
          if (filters.statusLiberacao === 'LIBERADO' && !evalRes.liberado) return false;
          if (filters.statusLiberacao === 'BLOQUEADO' && evalRes.liberado) return false;
        }

        if (filters.faixaVencimento && filters.faixaVencimento !== 'TODOS') {
          const cat = window.AlertService.categorizeContractExpiration(emp.dataTerminoContrato);
          if (filters.faixaVencimento === 'VENCIDOS' && cat.tier !== 'vencido' && cat.tier !== 'vence_hoje') return false;
          if (filters.faixaVencimento === '30_DIAS' && cat.tier !== 'marco_30' && cat.tier !== 'vence_hoje') return false;
          if (filters.faixaVencimento === '90_DIAS' && cat.tier !== 'marco_90') return false;
          if (filters.faixaVencimento === '180_DIAS' && cat.tier !== 'marco_180') return false;
          if (filters.faixaVencimento === '270_DIAS' && cat.tier !== 'marco_270') return false;
          if (filters.faixaVencimento === 'REGULAR' && cat.tier !== 'regular') return false;
        }

        if (filters.temArmario && filters.temArmario !== 'TODOS') {
          const hasLocker = Boolean(emp.numeroArmario);
          if (filters.temArmario === 'SIM' && !hasLocker) return false;
          if (filters.temArmario === 'NAO' && hasLocker) return false;
        }

        return true;
      });
    },

    groupBy(employees, key) {
      const groups = {};
      (employees || []).forEach(emp => {
        const val = emp[key] || 'Não Informado';
        if (!groups[val]) {
          groups[val] = {
            nome: val,
            total: 0,
            liberados: 0,
            bloqueados: 0,
            comArmario: 0,
            contratosVencendo30d: 0
          };
        }
        groups[val].total++;

        const evalRes = window.SSTService.evaluateStatus(emp.sst);
        if (evalRes.liberado) groups[val].liberados++;
        else groups[val].bloqueados++;

        if (emp.numeroArmario) groups[val].comArmario++;

        const cat = window.AlertService.categorizeContractExpiration(emp.dataTerminoContrato);
        if (cat.tier === 'marco_30' || cat.tier === 'vencido' || cat.tier === 'vence_hoje') {
          groups[val].contratosVencendo30d++;
        }
      });
      return Object.values(groups);
    },

    exportToCSV(employees, filename = 'relatorio_temporarios.csv') {
      const headers = [
        'ID',
        'Nome Completo',
        'CPF',
        'Nº Cartão Acesso',
        'Agência de Trabalho',
        'Matrícula Agência',
        'Função / Cargo',
        'Operação',
        'Setor',
        'Gestor Responsável',
        'Turno',
        'Data Admissão',
        'Data Término Contrato',
        'Dias até Vencimento',
        'Status Contrato',
        'Benefício VR (Qtde/Valor)',
        'Benefício VR (Operadora)',
        'Benefício VT (Qtde)',
        'Benefício VT (Operadora)',
        'Armário Atribuído',
        'Data Entrega Armário',
        'Data Devolução Armário',
        'Integração SST (Sim/Não)',
        'Status Liberação SST',
        'Motivos Bloqueio SST',
        'ASO Recebido',
        'DDS Realizado',
        'Termo de Uniforme Assinado',
        'Uniformes Entregues (Resumo)',
        'Medidas Disciplinares (Histórico)'
      ];

      const rows = employees.map(emp => {
        const evalRes = window.SSTService.evaluateStatus(emp.sst);
        const diasRestantes = window.DataStore.Utils.diffInDays(emp.dataTerminoContrato);
        const vr = emp.beneficios?.vr || {};
        const vt = emp.beneficios?.vt || {};
        const uniformesResumo = (emp.epis || emp.uniformes || [])
          .filter(e => e.status === 'Entregue')
          .map(e => `${e.item} (${e.tamanho || 'M'}) x${e.quantidade}`)
          .join('; ');

        const discList = window.DataStore ? window.DataStore.getDisciplinaryByEmployee(emp.id) : [];
        const discResumo = discList.map(d => `${d.tipo}: ${d.motivo} (${window.DataStore.Utils.formatDateBR(d.dataAplicacao)})`).join('; ');

        const termoAssinado = emp.sst && (('termoUniformeAssinado' in emp.sst) ? emp.sst.termoUniformeAssinado : emp.sst.fichaEpiAssinada);

        return [
          emp.id,
          `"${(emp.nomeCompleto || '').replace(/"/g, '""')}"`,
          `"${emp.cpf || ''}"`,
          `"${(emp.cartaoAcesso || '').replace(/"/g, '""')}"`,
          `"${(emp.agencia || '').replace(/"/g, '""')}"`,
          `"${(emp.matriculaAgencia || '').replace(/"/g, '""')}"`,
          `"${(emp.funcao || '').replace(/"/g, '""')}"`,
          `"${(emp.operacao || '').replace(/"/g, '""')}"`,
          `"${(emp.setor || '').replace(/"/g, '""')}"`,
          `"${(emp.gestor || '').replace(/"/g, '""')}"`,
          `"${(emp.turno || '').replace(/"/g, '""')}"`,
          emp.dataAdmissao || '',
          emp.dataTerminoContrato || '',
          diasRestantes !== null ? diasRestantes : '',
          emp.statusContrato || '',
          `"${(vr.quantidade || '').replace(/"/g, '""')}"`,
          `"${(vr.operadora || '').replace(/"/g, '""')}"`,
          `"${(vt.quantidade || '').replace(/"/g, '""')}"`,
          `"${(vt.operadora || '').replace(/"/g, '""')}"`,
          emp.numeroArmario || 'Sem armário',
          emp.dataEntregaArmario || '',
          emp.dataDevolucaoArmario || '',
          emp.sst && emp.sst.integracaoRealizada ? 'Sim' : 'Não',
          evalRes.liberado ? 'Liberado para Trabalhar' : 'Não Liberado',
          `"${evalRes.motivosBloqueio.join(', ')}"`,
          emp.sst && emp.sst.asoRecebido ? 'Sim' : 'Não',
          emp.sst && emp.sst.ddsRealizado ? 'Sim' : 'Não',
          termoAssinado ? 'Sim' : 'Não',
          `"${uniformesResumo.replace(/"/g, '""')}"`,
          `"${discResumo.replace(/"/g, '""')}"`
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    printReport() {
      window.print();
    }
  };

  window.ReportService = ReportService;
})(window);
