(function(){
  // Utilities
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // Cache de dados da API
  let appointmentsCache = [];
  let servicesCache = [];
  let blockedDaysCache = [];
  let blockedTimesCache = {};

  // Funções para carregar dados da API
  async function loadAppointments() {
    try {
      const response = await adminApi.getAppointments();
      appointmentsCache = response.data || response || [];
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      appointmentsCache = [];
    }
  }

  async function loadServices() {
    try {
      servicesCache = await servicesApi.getAll();
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      servicesCache = [];
    }
  }

  async function loadBlockedDays() {
    try {
      const blocks = await blocksApi.days.getAll();
      blockedDaysCache = blocks.map(block => block.blocked_date);
    } catch (error) {
      console.error('Erro ao carregar dias bloqueados:', error);
      blockedDaysCache = [];
    }
  }

  async function loadBlockedTimes(date) {
    try {
      if (!blockedTimesCache[date]) {
        const blocks = await blocksApi.times.getByDate(date);
        blockedTimesCache[date] = blocks.map(block => block.blocked_time);
      }
      return blockedTimesCache[date];
    } catch (error) {
      console.error('Erro ao carregar horários bloqueados:', error);
      return [];
    }
  }

  // Time slots (same as agendamento)
  const TIMES_MORNING = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30'];
  const TIMES_AFTERNOON = ['13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
  const ALL_TIMES = [...TIMES_MORNING, ...TIMES_AFTERNOON];

  // Funções de localStorage removidas - usando API do Supabase
  function readJSON(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }

  // Constantes para localStorage (compatibilidade)
  const KEY_SERVICES = 'dr-remo-services';
  const KEY_BLOCK_TIME_MAP = 'dr-remo-block-time-map';

  // Tabs
  const tabs = $$('.admin-tab');
  const panels = $$('.admin-tabpanel');
  tabs.forEach(btn => {
    btn.addEventListener('click', ()=>{
      tabs.forEach(b=> b.classList.remove('is-active'));
      panels.forEach(p=> p.hidden = true);
      btn.classList.add('is-active');
      const target = btn.dataset.tab;
      const panel = document.getElementById('tab-' + target);
      if(panel) panel.hidden = false;
    });
  });

  // Dashboard stats
  function updateStats(){
    const total = appointmentsCache.length;
    const scheduled = appointmentsCache.filter(a=> (a.status||'scheduled') === 'scheduled').length;
    const done = appointmentsCache.filter(a=> a.status === 'done').length;
    const canceled = appointmentsCache.filter(a=> a.status === 'canceled').length;
    $('#statTotal').textContent = total;
    $('#statScheduled').textContent = scheduled;
    $('#statDone').textContent = done;
    $('#statCanceled').textContent = canceled;
  }

  // Appointments table
  async function renderAppointmentsTable(filterDate){
    const wrap = $('#appointmentsTableWrap');
    
    const rows = appointmentsCache
      .filter(a => !filterDate || a.appointment_date === filterDate)
      .sort((a,b)=> new Date(`${a.appointment_date}T${a.appointment_time}:00`) - new Date(`${b.appointment_date}T${b.appointment_time}:00`))
      .map(a => {
        const serviceName = a.service_types?.name || '';
        return `
        <tr data-id="${a.id}">
          <td>${a.appointment_date}</td>
          <td>${a.appointment_time}</td>
          <td>${a.name || ''}</td>
          <td>${serviceName}</td>
          <td>${a.cpf || ''}</td>
          <td>${a.birth_date || ''}</td>
          <td>
            <span class="badge badge--${a.status || 'scheduled'}">${(a.status||'scheduled')}</span>
          </td>
          <td class="actions">
            <button class="btn-ghost btn-xs" data-action="done">Feita</button>
            <button class="btn-ghost btn-xs" data-action="canceled">Cancelar</button>
            <button class="btn-ghost btn-xs" data-action="scheduled">Reabrir</button>
          </td>
        </tr>
      `}).join('');

    wrap.innerHTML = `
      <div style="overflow:auto;">
        <table class="patient-table admin-table">
          <thead>
            <tr>
              <th>Data</th><th>Hora</th><th>Nome</th><th>Atendimento</th><th>CPF</th><th>Nascimento</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>${rows || ''}</tbody>
        </table>
      </div>
    `;

    // actions
    wrap.querySelectorAll('button[data-action]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const tr = btn.closest('tr');
        const id = Number(tr.dataset.id);
        const action = btn.dataset.action;
        await changeStatus(id, action);
      });
    });
  }

  async function changeStatus(id, newStatus){
    try {
      await appointmentsApi.updateStatus(id, newStatus);
      // Atualizar cache local
      const apt = appointmentsCache.find(a => a.id === id);
      if(apt) {
        apt.status = newStatus;
      }
      await renderAppointmentsTable($('#filterDate').value || '');
      updateStats();
    } catch (error) {
       console.error('Erro ao atualizar status:', error);
       alert('Erro ao atualizar status do agendamento.');
     }
   }

  // Filters
  const filterDate = $('#filterDate');
  const clearFilter = $('#clearFilter');
  if(filterDate) filterDate.addEventListener('change', ()=> renderAppointmentsTable(filterDate.value || ''));
  if(clearFilter) clearFilter.addEventListener('click', ()=>{ filterDate.value = ''; renderAppointmentsTable(''); });

  // Blocks (blocked days)
  async function addBlockedDay(){
    const input = $('#blockDate');
    const date = input.value;
    if(!date) return;
    
    try {
      await blocksApi.days.create({ blocked_date: date });
      await loadBlockedDays();
      input.value = '';
      renderBlocks();
    } catch (error) {
      console.error('Erro ao bloquear dia:', error);
      alert('Erro ao bloquear dia.');
    }
  }

  async function removeBlockedDay(date){
    try {
      // Encontrar o ID do dia bloqueado
      const blocks = await blocksApi.days.getAll();
      const blockToRemove = blocks.find(block => block.blocked_date === date);
      if (blockToRemove) {
        await blocksApi.days.remove(blockToRemove.id);
      }
      await loadBlockedDays();
      renderBlocks();
    } catch (error) {
      console.error('Erro ao remover bloqueio:', error);
      alert('Erro ao remover bloqueio.');
    }
  }

  function renderBlocks(){
    if(!blockedDaysCache.length){ $('#blockedList').innerHTML = '<p class="patient-empty">Nenhum dia bloqueado.</p>'; return; }
    const items = blockedDaysCache.sort().map(d => `<li class="block-item"><span>${d}</span> <button class="btn-ghost btn-xs" data-remove="${d}">Remover</button></li>`).join('');
    $('#blockedList').innerHTML = `<ul class="block-list">${items}</ul>`;
    $('#blockedList').querySelectorAll('[data-remove]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const d = btn.getAttribute('data-remove');
        await removeBlockedDay(d);
      });
    });
  }
  const addBlockBtn = $('#addBlock');
  if(addBlockBtn){
    addBlockBtn.addEventListener('click', async ()=>{
      await addBlockedDay();
    });
  }

  // Services
  async function renderServices(){
    const wrap = $('#servicesList');
    if(!wrap) return;
    
    if(!servicesCache.length){ wrap.innerHTML = '<p class="patient-empty">Nenhum tipo cadastrado.</p>'; return; }
    wrap.innerHTML = '<ul class="service-list">' + servicesCache.map(service => `
      <li class="service-item"><span>${service.name}</span> <button class="btn-ghost btn-xs" data-remove-id="${service.id}">Remover</button></li>
    `).join('') + '</ul>';
    wrap.querySelectorAll('[data-remove-id]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = Number(btn.getAttribute('data-remove-id'));
        try {
          await servicesApi.remove(id);
          await loadServices();
          renderServices();
        } catch (error) {
          console.error('Erro ao remover serviço:', error);
          alert('Erro ao remover serviço.');
        }
      });
    });
  }
  const addServiceBtn = $('#addService');
  if(addServiceBtn){
    addServiceBtn.addEventListener('click', async ()=>{
      const name = ($('#serviceName').value || '').trim();
      if(!name) return;
      
      try {
        await servicesApi.create({ name });
        await loadServices();
        $('#serviceName').value = '';
        renderServices();
      } catch (error) {
        console.error('Erro ao adicionar serviço:', error);
        if (error.message.includes('already exists')) {
          alert('Tipo de serviço já existe!');
        } else {
          alert('Erro ao adicionar serviço.');
        }
      }
    });
  }

  // Init
  async function initializeAdmin() {
    try {
      // Carregar dados da API
      await loadAppointments();
      await loadServices();
      await loadBlockedDays();
      await loadAllBlockedTimes();
      
      // Renderizar componentes
      updateStats();
      await renderAppointmentsTable('');
      renderServices();
      renderBlocks();
      await renderBlockedTimesList();
    } catch (error) {
      console.error('Erro ao inicializar painel admin:', error);
      alert('Erro ao carregar dados do painel administrativo.');
    }
  }
  
  // Inicialização
  document.addEventListener('DOMContentLoaded', async () => {
    await initializeAdmin();
  });

  // ===== Blocked Time Slots =====
  const blockTimeDate = $('#blockTimeDate');
  const blockTimeSlot = $('#blockTimeSlot');
  const addBlockTime = $('#addBlockTime');
  let allBlockedTimes = [];

  async function loadAllBlockedTimes() {
    try {
      allBlockedTimes = await blocksApi.times.getAll();
    } catch (error) {
      console.error('Erro ao carregar horários bloqueados:', error);
      allBlockedTimes = [];
    }
  }

  function renderTimeOptions(){
    if(!blockTimeSlot) return;
    blockTimeSlot.innerHTML = ALL_TIMES.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  async function renderBlockedTimesList(){
    const wrap = $('#blockedTimesList');
    if(!wrap) return;
    
    if(allBlockedTimes.length === 0){ 
      wrap.innerHTML = '<p class="patient-empty">Nenhum horário bloqueado.</p>'; 
      return; 
    }
    
    // Agrupar por data
    const groupedByDate = {};
    allBlockedTimes.forEach(block => {
      const date = block.blocked_date;
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(block);
    });
    
    const dates = Object.keys(groupedByDate).sort();
    const html = dates.map(date => {
      const blocks = groupedByDate[date].sort((a, b) => a.blocked_time.localeCompare(b.blocked_time));
      const items = blocks.map(block => 
        `<span class="badge" style="margin:4px 6px 0 0;">${block.blocked_time} <button class="btn-ghost btn-xs" data-unblock-id="${block.id}" style="margin-left:6px;">Remover</button></span>`
      ).join('');
      return `<div class="admin-card"><strong>${date}</strong><div style="margin-top:6px; display:flex; flex-wrap:wrap; align-items:center;">${items || '<em>Nenhum</em>'}</div></div>`;
    }).join('');
    
    wrap.innerHTML = html;
    
    // Event listeners para remover
    wrap.querySelectorAll('[data-unblock-id]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = parseInt(btn.getAttribute('data-unblock-id'));
        await removeBlockedTime(id);
      });
    });
  }

  async function addBlockedTime() {
    const date = (blockTimeDate && blockTimeDate.value) || '';
    const time = (blockTimeSlot && blockTimeSlot.value) || '';
    if(!date || !time) return;
    
    try {
      await blocksApi.times.create({
        blocked_date: date,
        blocked_time: time
      });
      
      await loadAllBlockedTimes();
      await renderBlockedTimesList();
      
      // Limpar cache de horários bloqueados para forçar reload
      blockedTimesCache = {};
      
    } catch (error) {
      console.error('Erro ao bloquear horário:', error);
      alert('Erro ao bloquear horário.');
    }
  }

  async function removeBlockedTime(id) {
    try {
      await blocksApi.times.remove(id);
      await loadAllBlockedTimes();
      await renderBlockedTimesList();
      
      // Limpar cache de horários bloqueados para forçar reload
      blockedTimesCache = {};
      
    } catch (error) {
      console.error('Erro ao remover bloqueio de horário:', error);
      alert('Erro ao remover bloqueio de horário.');
    }
  }

  if(addBlockTime){
    addBlockTime.addEventListener('click', addBlockedTime);
  }
  
  renderTimeOptions();
})();
