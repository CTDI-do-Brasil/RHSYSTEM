/**
 * MinioService - Integração Frontend com o MinIO para Gestão de Anexos
 * Sistema de Controle de Funcionários Temporários (CFT)
 */

(function (window) {
  'use strict';

  const MinioService = {
    status: {
      checked: false,
      connected: false,
      bucket: '',
      message: 'Verificando MinIO...'
    },

    // Categorias padrão de anexos
    CATEGORIAS: [
      { id: 'ASO', label: 'ASO / Exame Admissional (SST)' },
      { id: 'DOCUMENTO_PESSOAL', label: 'Documento Pessoal (RG / CPF / CNH)' },
      { id: 'TERMO_UNIFORME', label: 'Termo de Entrega de Uniforme' },
      { id: 'TERMO_ARMARIO', label: 'Termo de Chave de Armário' },
      { id: 'DISCIPLINAR', label: 'Comprovante Assinado de Medida Disciplinar' },
      { id: 'CONTRATO', label: 'Contrato de Trabalho / Ficha Cadastral' },
      { id: 'OUTROS', label: 'Outros Documentos' }
    ],

    // Inicialização e checagem periódica do status do MinIO
    init() {
      this.checkStatus();
      // Checa status a cada 30 segundos
      setInterval(() => this.checkStatus(), 30000);
    },

    async checkStatus() {
      const dotEl = document.getElementById('headerMinioDot');
      const textEl = document.getElementById('headerMinioText');
      const containerEl = document.getElementById('headerMinioStatus');

      try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        this.status = {
          checked: true,
          connected: data.connected === true,
          bucket: data.bucket || '',
          message: data.message || (data.connected ? 'Conectado ao MinIO' : 'MinIO Desconectado')
        };

        if (containerEl) {
          containerEl.classList.remove('hidden');
          if (this.status.connected) {
            containerEl.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border bg-emerald-50 border-emerald-200 text-emerald-800 transition-all';
            containerEl.title = `MinIO Conectado (Bucket: ${this.status.bucket})`;
            if (dotEl) dotEl.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
            if (textEl) textEl.textContent = 'MinIO Conectado';
          } else {
            containerEl.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border bg-amber-50 border-amber-200 text-amber-800 transition-all';
            containerEl.title = `MinIO: ${this.status.message}. Verifique o arquivo .env`;
            if (dotEl) dotEl.className = 'w-2 h-2 rounded-full bg-amber-500';
            if (textEl) textEl.textContent = 'MinIO Pendente';
          }
        }
      } catch (err) {
        this.status = {
          checked: true,
          connected: false,
          bucket: '',
          message: 'Servidor ou MinIO inacessível'
        };
        if (containerEl) {
          containerEl.classList.remove('hidden');
          containerEl.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border bg-slate-100 border-slate-200 text-slate-600 transition-all';
          containerEl.title = 'Servidor local sem conexão com o MinIO';
          if (dotEl) dotEl.className = 'w-2 h-2 rounded-full bg-slate-400';
          if (textEl) textEl.textContent = 'MinIO Offline';
        }
      }
      return this.status;
    },

    // Formata bytes para KB / MB legível
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    // Ícone por tipo de arquivo
    getFileIcon(filename, mimeType) {
      const ext = (filename || '').split('.').pop().toLowerCase();
      if (['pdf'].includes(ext) || (mimeType && mimeType.includes('pdf'))) {
        return `<span class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">PDF</span>`;
      }
      if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
        return `<span class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">IMG</span>`;
      }
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        return `<span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">XLS</span>`;
      }
      if (['doc', 'docx'].includes(ext)) {
        return `<span class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">DOC</span>`;
      }
      return `<span class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">ARQ</span>`;
    },

    // Enviar arquivos para o MinIO vinculados a um Colaborador
    async uploadFiles(employeeId, fileList, categoria = 'Geral') {
      if (!fileList || fileList.length === 0) {
        throw new Error('Nenhum arquivo selecionado.');
      }

      const emp = window.DataStore.getEmployeeById(employeeId);
      if (!emp) {
        throw new Error('Colaborador não encontrado.');
      }

      const formData = new FormData();
      formData.append('employeeId', employeeId);
      formData.append('folder', 'colaboradores');
      formData.append('categoria', categoria);

      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }

      const res = await fetch('/api/anexos/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${res.status} ao enviar arquivo para o MinIO.`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Falha no upload para o MinIO.');
      }

      // Adiciona anexos ao colaborador no DataStore
      emp.anexos = emp.anexos || [];
      data.files.forEach(f => emp.anexos.push(f));
      window.DataStore.saveEmployee(emp);

      return data.files;
    },

    // Excluir anexo do MinIO e do registro do colaborador
    async deleteAttachment(employeeId, objectName) {
      if (!confirm('Deseja realmente excluir este anexo do MinIO? Esta ação não pode ser desfeita.')) {
        return false;
      }

      try {
        const res = await fetch(`/api/anexos?objectName=${encodeURIComponent(objectName)}`, {
          method: 'DELETE'
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erro HTTP ${res.status}`);
        }

        const emp = window.DataStore.getEmployeeById(employeeId);
        if (emp && emp.anexos) {
          emp.anexos = emp.anexos.filter(a => a.objectName !== objectName);
          window.DataStore.saveEmployee(emp);
        }

        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast('Anexo removido do MinIO com sucesso.', 'success');
        }

        // Se o modal de detalhes estiver aberto, atualiza a tela
        if (window.App && typeof window.App.viewEmployeeDetails === 'function') {
          window.App.viewEmployeeDetails(employeeId);
        }

        return true;
      } catch (err) {
        console.error('Erro ao deletar anexo:', err);
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast(`Erro ao excluir anexo: ${err.message}`, 'error');
        }
        return false;
      }
    },

    // Renderiza a seção de anexos completa dentro do modal de detalhes
    renderAttachmentsSection(emp) {
      const anexos = emp.anexos || [];
      const totalAnexos = anexos.length;

      return `
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-200">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
              </span>
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Anexos & Documentos do Colaborador (MinIO S3)
                </h4>
                <p class="text-[11px] text-slate-500">
                  Armazenamento centralizado de ASO, documentos pessoais, termos e comprovantes
                </p>
              </div>
            </div>
            <button onclick="MinioService.openUploadModal('${emp.id}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-[#002d72] hover:bg-[#001f4d] text-white rounded-lg font-bold text-xs transition-colors shadow-xs">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              + Anexar Documento
            </button>
          </div>

          <!-- Lista de Anexos -->
          ${totalAnexos === 0 ? `
            <div class="p-6 bg-white border border-dashed border-slate-200 rounded-xl text-center">
              <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              <p class="text-xs font-semibold text-slate-600">Nenhum anexo salvo no MinIO para este colaborador.</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Clique no botão "+ Anexar Documento" acima para salvar o ASO, termo de uniforme ou documento pessoal.</p>
            </div>
          ` : `
            <div class="overflow-hidden border border-slate-200 rounded-xl bg-white">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3">Documento</th>
                    <th class="py-2.5 px-3">Categoria</th>
                    <th class="py-2.5 px-3 text-center">Tamanho</th>
                    <th class="py-2.5 px-3">Data de Envio</th>
                    <th class="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${anexos.map(att => {
                    const icon = MinioService.getFileIcon(att.name, att.mimeType);
                    const sizeStr = MinioService.formatFileSize(att.size);
                    const dateStr = att.uploadedAt ? new Date(att.uploadedAt).toLocaleString('pt-BR') : '-';
                    const viewUrl = att.viewUrl || `/api/anexos/view?objectName=${encodeURIComponent(att.objectName)}`;
                    const downloadUrl = att.downloadUrl || `/api/anexos/download?objectName=${encodeURIComponent(att.objectName)}`;

                    return `
                      <tr class="hover:bg-slate-50/60">
                        <td class="py-2.5 px-3">
                          <div class="flex items-center gap-2.5">
                            ${icon}
                            <div>
                              <span class="font-bold text-slate-800 block truncate max-w-[240px]" title="${att.name}">${att.name}</span>
                              <span class="text-[10px] text-slate-400 font-mono">${att.objectName.split('/').pop()}</span>
                            </div>
                          </div>
                        </td>
                        <td class="py-2.5 px-3">
                          <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            ${att.categoria || 'Geral'}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-center font-mono text-slate-600">${sizeStr}</td>
                        <td class="py-2.5 px-3 text-slate-500 text-[11px]">${dateStr}</td>
                        <td class="py-2.5 px-3 text-right">
                          <div class="inline-flex items-center gap-1.5">
                            <a href="${viewUrl}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold text-[11px] transition-colors" title="Visualizar documento">
                              Visualizar
                            </a>
                            <a href="${downloadUrl}" download="${att.name}" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition-colors" title="Baixar arquivo">
                              Baixar
                            </a>
                            <button onclick="MinioService.deleteAttachment('${emp.id}', '${att.objectName}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded font-semibold text-[11px] transition-colors" title="Excluir do MinIO">
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    },

    // Modal dedicado de Upload de Anexo
    openUploadModal(employeeId) {
      const emp = window.DataStore.getEmployeeById(employeeId);
      if (!emp) return;

      let modalEl = document.getElementById('modalMinioUpload');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'modalMinioUpload';
        modalEl.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in';
        document.body.appendChild(modalEl);
      }

      modalEl.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">Anexar Documento no MinIO</h3>
              <p class="text-xs text-slate-500">Colaborador: <strong>${emp.nomeCompleto}</strong> (${emp.cpf || 'Sem CPF'})</p>
            </div>
            <button onclick="MinioService.closeUploadModal()" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>

          <form id="formMinioUpload" onsubmit="MinioService.handleUploadSubmit(event, '${emp.id}')" class="space-y-4 text-xs">
            <!-- Categoria do Documento -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Tipo / Categoria do Documento *</label>
              <select id="minioUploadCategoria" required class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white">
                ${this.CATEGORIAS.map(c => `<option value="${c.label}">${c.label}</option>`).join('')}
              </select>
            </div>

            <!-- Seleção de Arquivo -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Selecione o Arquivo *</label>
              <div class="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors" onclick="document.getElementById('minioFileInput').click()">
                <svg class="w-8 h-8 text-slate-400 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <span class="font-bold text-slate-700 block" id="minioFileNameDisplay">Clique para escolher o arquivo</span>
                <span class="text-[11px] text-slate-400 block mt-0.5">Suporta PDF, JPG, PNG, DOCX, XLSX (até 50MB)</span>
              </div>
              <input type="file" id="minioFileInput" class="hidden" required onchange="MinioService.onFileSelected(this)">
            </div>

            <div id="minioUploadProgress" class="hidden">
              <div class="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Enviando para o bucket do MinIO...</span>
                <span id="minioUploadPercent">Aguarde...</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onclick="MinioService.closeUploadModal()" class="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" id="btnMinioSubmit" class="px-5 py-2 bg-[#002d72] hover:bg-[#001f4d] text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                Salvar no MinIO
              </button>
            </div>
          </form>
        </div>
      `;

      modalEl.classList.remove('hidden');
    },

    closeUploadModal() {
      const modalEl = document.getElementById('modalMinioUpload');
      if (modalEl) modalEl.classList.add('hidden');
    },

    onFileSelected(input) {
      const display = document.getElementById('minioFileNameDisplay');
      if (input.files && input.files[0]) {
        const f = input.files[0];
        display.innerHTML = `<strong>${f.name}</strong> (${this.formatFileSize(f.size)})`;
      } else {
        display.textContent = 'Clique para escolher o arquivo';
      }
    },

    async handleUploadSubmit(e, employeeId) {
      e.preventDefault();
      const fileInput = document.getElementById('minioFileInput');
      const categoriaSelect = document.getElementById('minioUploadCategoria');
      const progressEl = document.getElementById('minioUploadProgress');
      const btnSubmit = document.getElementById('btnMinioSubmit');

      if (!fileInput.files || !fileInput.files[0]) {
        alert('Por favor, selecione um arquivo.');
        return;
      }

      const categoria = categoriaSelect.value;
      const files = fileInput.files;

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.classList.add('opacity-50');
      }
      if (progressEl) progressEl.classList.remove('hidden');

      try {
        await this.uploadFiles(employeeId, files, categoria);
        this.closeUploadModal();
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast('Documento enviado e salvo no MinIO com sucesso!', 'success');
        }
        // Atualiza a ficha cadastral imediatamente
        if (window.App && typeof window.App.viewEmployeeDetails === 'function') {
          window.App.viewEmployeeDetails(employeeId);
        }
      } catch (err) {
        alert(`Erro ao salvar no MinIO: ${err.message}`);
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.classList.remove('opacity-50');
        }
        if (progressEl) progressEl.classList.add('hidden');
      }
    }
  };

  window.MinioService = MinioService;

  // Auto-inicia ao carregar o DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MinioService.init());
  } else {
    MinioService.init();
  }
})(window);
