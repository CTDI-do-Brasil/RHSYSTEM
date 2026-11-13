/**
 * ChartsService - Gestão dos Gráficos Interativos do Dashboard
 * Sistema de Controle de Funcionários Temporários
 */

(function (window) {
  'use strict';

  let chartOperacao = null;
  let chartAgencia = null;
  let chartArmarios = null;
  let chartSST = null;

  const ChartsService = {
    initCharts() {
      if (typeof Chart === 'undefined') {
        console.warn('Chart.js ainda não está carregado.');
        return;
      }
      this.updateAllCharts();
    },

    updateAllCharts() {
      if (typeof Chart === 'undefined') return;

      const employees = window.DataStore.getEmployees();
      const lockers = window.DataStore.getLockers();

      this.renderOperacaoChart(employees);
      this.renderAgenciaChart(employees);
      this.renderArmariosChart(lockers);
      this.renderSSTChart(employees);
    },

    renderOperacaoChart(employees) {
      const canvas = document.getElementById('chartOperacao');
      if (!canvas) return;

      const active = employees.filter(e => e.statusContrato === 'Ativo');
      const counts = {};
      active.forEach(e => {
        const op = e.operacao || 'Não Definido';
        counts[op] = (counts[op] || 0) + 1;
      });

      const labels = Object.keys(counts);
      const data = Object.values(counts);

      if (chartOperacao) chartOperacao.destroy();

      const ctx = canvas.getContext('2d');
      chartOperacao = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Temporários Ativos',
            data: data,
            backgroundColor: '#003882',
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#001438',
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, font: { size: 11 } },
              grid: { color: '#f1f5f9' }
            },
            x: {
              ticks: { font: { size: 11 } },
              grid: { display: false }
            }
          }
        }
      });
    },

    renderAgenciaChart(employees) {
      const canvas = document.getElementById('chartAgencia');
      if (!canvas) return;

      const active = employees.filter(e => e.statusContrato === 'Ativo');
      const counts = {};
      active.forEach(e => {
        const ag = e.agencia || 'Não Definida';
        counts[ag] = (counts[ag] || 0) + 1;
      });

      const labels = Object.keys(counts);
      const data = Object.values(counts);

      const colors = ['#002d72', '#004b99', '#0066cc', '#38bdf8', '#64748b', '#94a3b8'];

      if (chartAgencia) chartAgencia.destroy();

      const ctx = canvas.getContext('2d');
      chartAgencia = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
            }
          }
        }
      });
    },

    renderArmariosChart(lockers) {
      const canvas = document.getElementById('chartArmarios');
      if (!canvas) return;

      const stats = window.LockerService.getStats();

      if (chartArmarios) chartArmarios.destroy();

      const ctx = canvas.getContext('2d');
      chartArmarios = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Disponíveis', 'Ocupados', 'Manutenção'],
          datasets: [{
            data: [stats.disponiveis, stats.ocupados, stats.manutencao],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
            }
          }
        }
      });
    },

    renderSSTChart(employees) {
      const canvas = document.getElementById('chartSST');
      if (!canvas) return;

      const summary = window.SSTService.getSummary(employees);

      if (chartSST) chartSST.destroy();

      const ctx = canvas.getContext('2d');
      chartSST = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Liberados para Trabalhar', 'Não Liberados (Bloqueados)'],
          datasets: [{
            data: [summary.liberados, summary.bloqueados],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
            }
          }
        }
      });
    }
  };

  window.ChartsService = ChartsService;
})(window);
