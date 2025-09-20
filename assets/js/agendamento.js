(function(){
  // Utilidades
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  
  // Cache para dados da API
  let servicesCache = [];
  let blockedDaysCache = [];
  let blockedTimesCache = {};
  let appointmentsCache = {};

  // Funções de Modal
  function closeModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  function showSuccessModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box modal-box--success" role="dialog" aria-modal="true">
        <div class="modal-icon modal-icon--success">✓</div>
        <h3 class="modal-title modal-title--success">Consulta marcada com sucesso!</h3>
        <div class="modal-details">
          <p><strong>Nome:</strong> ${data.name}</p>
          <p><strong>Data:</strong> ${data.date}</p>
          <p><strong>Horário:</strong> ${data.time}</p>
          <p><strong>Tipo:</strong> ${data.type}</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-primary" id="successOk">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    function onClose() { closeModal(modal); }
    modal.addEventListener('click', (e) => { if (e.target === modal) onClose(); });
    modal.querySelector('#successOk').addEventListener('click', onClose);
    modal.querySelector('#successOk').focus();
  }

  function showErrorModal(message) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box modal-box--error" role="dialog" aria-modal="true">
        <div class="modal-icon modal-icon--error">✕</div>
        <h3 class="modal-title modal-title--error">Erro ao agendar consulta</h3>
        <p class="modal-desc">${message}</p>
        <div class="modal-actions">
          <button type="button" class="btn-primary" id="errorOk">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    function onClose() { closeModal(modal); }
    modal.addEventListener('click', (e) => { if (e.target === modal) onClose(); });
    modal.querySelector('#errorOk').addEventListener('click', onClose);
    modal.querySelector('#errorOk').focus();
  }
  
  async function loadServices(){
    try {
      if (servicesCache.length === 0) {
        servicesCache = await servicesApi.getAll();
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      servicesCache = []; // fallback
    }
  }
  
  async function loadBlockedDays(){
    try {
      if (blockedDaysCache.length === 0) {
        const data = await blocksApi.days.getAll();
        blockedDaysCache = data.map(item => item.blocked_date);
      }
    } catch (error) {
      console.error('Erro ao carregar dias bloqueados:', error);
      blockedDaysCache = [];
    }
  }
  
  async function loadBlockedTimes(date){
    try {
      if (!blockedTimesCache[date]) {
        const data = await blocksApi.times.getByDate(date);
        // Converter formato de horário de "09:00:00" para "09:00"
        blockedTimesCache[date] = data.map(item => {
          const time = item.blocked_time;
          return time.length > 5 ? time.substring(0, 5) : time;
        });
      }
      return blockedTimesCache[date];
    } catch (error) {
      console.error('Erro ao carregar horários bloqueados:', error);
      return [];
    }
  }

  async function loadAppointments(date){
    try {
      if (!appointmentsCache[date]) {
        const data = await appointmentsApi.getByDate(date);
        // Converter formato de horário de "09:00:00" para "09:00"
        appointmentsCache[date] = data.map(item => {
          const time = item.appointment_time;
          return time.length > 5 ? time.substring(0, 5) : time;
        });
      }
      return appointmentsCache[date];
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      return [];
    }
  }

  // Constantes
  const TIMES_MORNING = [
    '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30'
  ];
  const TIMES_AFTERNOON = [
    '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'
  ];

  // Estado do calendário
  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-11

  const monthLabel = $('#monthLabel');
  const calendarGrid = $('#calendarGrid');
  const selectedDateInput = $('#selectedDate');
  const selectedTimeInput = $('#selectedTime');

  const timesMorningEl = $('#timesMorning');
  const timesAfternoonEl = $('#timesAfternoon');

  // Renderização de horários
  function renderTimes(){
    function renderGroup(container, arr){
      container.innerHTML = arr.map(t => `
        <button type="button" class="time-slot" data-time="${t}">${t}</button>
      `).join('');
    }
    renderGroup(timesMorningEl, TIMES_MORNING);
    renderGroup(timesAfternoonEl, TIMES_AFTERNOON);

    const path = location.pathname.split('/').pop();
    const isAgendamento = !path || path === 'agendamento.html';

    const onClick = (ev) => {
      const btn = ev.currentTarget;
      
      // Não permitir seleção se o botão estiver desabilitado
      if (btn.disabled || btn.classList.contains('is-disabled')) {
        ev.preventDefault();
        return;
      }
      
      $$('.time-slot').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedTimeInput.value = btn.dataset.time;
    };
    $$('.time-slot').forEach(b => b.addEventListener('click', onClick));
  }

  // Mostrar/ocultar loading nos horários
  function showTimeLoading() {
    const timeCard = $('.agenda__time-card');
    if (timeCard) {
      timeCard.classList.add('loading');
      const overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="loading-spinner"></div>';
      timeCard.appendChild(overlay);
    }
  }

  function hideTimeLoading() {
    const timeCard = $('.agenda__time-card');
    if (timeCard) {
      timeCard.classList.remove('loading');
      const overlay = timeCard.querySelector('.loading-overlay');
      if (overlay) overlay.remove();
    }
  }

  // Bloquear horários específicos por data selecionada (bloqueados + agendados)
  async function applyBlockedTimes(dateId){
    if (!dateId) return;
    
    showTimeLoading();
    
    try {
      // Carregar horários bloqueados e agendamentos em paralelo
      const [blockedTimes, appointedTimes] = await Promise.all([
        loadBlockedTimes(dateId),
        loadAppointments(dateId)
      ]);
      
      // Combinar horários bloqueados e agendados
      const unavailableTimes = new Set([...blockedTimes, ...appointedTimes]);
      
      $$('.time-slot').forEach(btn => {
        const t = btn.getAttribute('data-time');
        const shouldBlock = unavailableTimes.has(t);
        const isBlocked = blockedTimes.includes(t);
        const isAppointment = appointedTimes.includes(t);
        
        // Desabilitar o botão
        btn.disabled = !!shouldBlock;
        btn.classList.toggle('is-disabled', !!shouldBlock);
      
      // Remover seleção se o horário foi bloqueado
      if(shouldBlock && btn.classList.contains('is-selected')){
        btn.classList.remove('is-selected');
        if(selectedTimeInput) selectedTimeInput.value = '';
      }
      
      // Adicionar/remover tooltip com informação específica
      if(shouldBlock){ 
        if (isBlocked && isAppointment) {
          btn.title = 'Horário bloqueado e agendado';
        } else if (isBlocked) {
          btn.title = 'Horário bloqueado';
        } else if (isAppointment) {
          btn.title = 'Horário já agendado';
        } else {
          btn.title = 'Horário indisponível';
        }
        // Remover event listeners de botões desabilitados
        btn.style.pointerEvents = 'none';
      } else { 
        btn.removeAttribute('title'); 
        btn.style.pointerEvents = 'auto';
      }
    });
    } catch (error) {
      console.error('Erro ao aplicar bloqueios:', error);
    } finally {
      hideTimeLoading();
    }
  }

  // Formatação de label do mês
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function firstDayOfMonth(year, month){
    return new Date(year, month, 1);
  }

  function lastDayOfMonth(year, month){
    return new Date(year, month + 1, 0);
  }

  // Transformar Date para yyyy-mm-dd
  function toDateId(dt){
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const d = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  // Renderização do calendário (Seg a Dom, mas Sáb/Dom desabilitados)
  function renderCalendar(){
    monthLabel.textContent = `${MONTHS[viewMonth]} / ${viewYear}`;
    calendarGrid.innerHTML = '';

    const first = firstDayOfMonth(viewYear, viewMonth);
    const last = lastDayOfMonth(viewYear, viewMonth);

    // Índice da semana começando em Segunda (0=Seg, ..., 6=Dom)
    const startWeekIndex = (first.getDay() + 6) % 7; // JS: 0=Dom
    const totalDays = last.getDate();

    // Adiciona espaços em branco antes do dia 1
    for(let i=0;i<startWeekIndex;i++){
      const empty = document.createElement('span');
      empty.className = 'day empty';
      calendarGrid.appendChild(empty);
    }

    const blocked = new Set(blockedDaysCache);
    for(let day=1; day<=totalDays; day++){
      const date = new Date(viewYear, viewMonth, day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Dom ou Sáb
      const isPast = toDateId(date) < toDateId(today);
      const isBlocked = blocked.has(toDateId(date));

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day';
      btn.textContent = String(day);

      if(isWeekend){ btn.classList.add('is-disabled'); btn.disabled = true; }
      if(isPast){ btn.classList.add('is-disabled'); btn.disabled = true; }
      if(isBlocked){ btn.classList.add('is-disabled'); btn.disabled = true; btn.title = 'Dia indisponível'; }

      btn.addEventListener('click', async () => {
        $$('.day').forEach(d => d.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        selectedDateInput.value = toDateId(date);
        await applyBlockedTimes(selectedDateInput.value);
      });

      calendarGrid.appendChild(btn);
    }
  }

  // Navegação de mês
  $('#prevMonth').addEventListener('click', () => {
    const currentFirst = firstDayOfMonth(viewYear, viewMonth);
    const notBeforeToday = new Date(today.getFullYear(), today.getMonth(), 1);
    const prev = new Date(viewYear, viewMonth - 1, 1);
    if(prev >= notBeforeToday){
      viewMonth -= 1;
      if(viewMonth < 0){ viewMonth = 11; viewYear -= 1; }
      renderCalendar();
    }
  });
  $('#nextMonth').addEventListener('click', () => {
    viewMonth += 1;
    if(viewMonth > 11){ viewMonth = 0; viewYear += 1; }
    renderCalendar();
  });

  // Chips tipo de atendimento (dinâmico)
  const serviceInput = $('#serviceType');
  function bindChipClicks(){
    $$('.chip').forEach(chip => {
      chip.addEventListener('click', () =>{
        $$('.chip').forEach(c => c.classList.remove('is-selected'));
        chip.classList.add('is-selected');
        serviceInput.value = chip.dataset.type;
      });
    });
  }
  async function renderServiceChips(){
    const chipsWrap = document.querySelector('.chips');
    if(!chipsWrap) return;
    
    // Mostrar loading se não há serviços carregados
    if (servicesCache.length === 0) {
      chipsWrap.classList.add('loading');
      chipsWrap.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div></div>';
      return;
    }
    
    // Remover loading e renderizar chips
    chipsWrap.classList.remove('loading');
    chipsWrap.innerHTML = servicesCache.map(service => 
      `<button type="button" class="chip" data-type="${service.name}" data-id="${service.id}">${service.name}</button>`
    ).join('');
    serviceInput.value = '';
    bindChipClicks();
  }

  // Máscara simples de CPF
  const cpf = $('#cpf');
  if(cpf){
    cpf.addEventListener('input', () => {
      let v = cpf.value.replace(/\D/g, '').slice(0,11);
      const parts = [];
      if(v.length > 3){ parts.push(v.slice(0,3)); v = v.slice(3); } else { cpf.value = v; return; }
      if(v.length > 3){ parts.push(v.slice(0,3)); v = v.slice(3); } else { cpf.value = parts.join('.') + (v ? '.'+v : ''); return; }
      parts.push(v.slice(0,3));
      v = v.slice(3);
      cpf.value = parts.join('.') + (v ? '-' + v : '');
    });
  }

  // Submit
  const form = $('#appointmentForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const fullName = $('#fullName').value.trim();
    const date = selectedDateInput.value;
    const time = selectedTimeInput.value;
    const birth = $('#birth').value;
    const serviceType = serviceInput.value;

    const errors = [];
    if(!date) errors.push('Selecione um dia (seg-sex) no calendário.');
    if(!time) errors.push('Selecione um horário disponível.');
    if(!fullName) errors.push('Informe o nome completo.');
    if(!cpf.checkValidity()) errors.push('CPF inválido.');
    if(!birth) errors.push('Informe a data de nascimento.');
    if(!serviceType) errors.push('Selecione o tipo de atendimento.');

    if(errors.length){
      showErrorModal('Por favor, corrija:\n\n• ' + errors.join('\n• '));
      return;
    }

    // Salvar agendamento via API
    try{
      const cpfRaw = cpf.value || '';
      const cpfDigits = cpfRaw.replace(/\D/g, '');
      
      // Encontrar o ID do tipo de serviço
      const selectedChip = document.querySelector('.chip.is-selected');
      const serviceTypeId = selectedChip ? selectedChip.dataset.id : null;
      
      if (!serviceTypeId) {
        showErrorModal('Por favor, selecione um tipo de atendimento.');
        return;
      }
      
      const appointmentData = {
        name: fullName,
        cpf: cpfDigits,
        birth_date: birth,
        appointment_date: date,
        appointment_time: time,
        service_type_id: parseInt(serviceTypeId)
      };
      
      const result = await appointmentsApi.create(appointmentData);
      
      // Limpar cache de agendamentos para a data para forçar reload
      delete appointmentsCache[date];
      
      // Confirmação
      showSuccessModal({
        name: fullName,
        date: date,
        time: time,
        type: serviceType
      });
    }catch(err){
      console.error('Erro ao salvar agendamento:', err);
      
      // Tentar extrair mensagem de erro mais específica
      let errorMessage = 'Tente novamente mais tarde.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      } else if (err.errors && Array.isArray(err.errors)) {
        errorMessage = err.errors.map(e => e.msg || e.message).join(', ');
      }
      
      showErrorModal(errorMessage);
      return;
    }

    // Reset parcial
    form.reset();
    selectedDateInput.value = '';
    selectedTimeInput.value = '';
    $$('.time-slot').forEach(b => b.classList.remove('is-selected'));
    $$('.chip').forEach(c => c.classList.remove('is-selected'));
    $$('.day').forEach(d => d.classList.remove('is-selected'));
  });

  // Inicialização otimizada
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Renderizar componentes que não dependem da API primeiro
      renderCalendar();
      renderTimes();
      
      // Mostrar loading nos chips antes de carregar
      await renderServiceChips();
      
      // Carregar dados da API em paralelo
      await Promise.all([
        loadServices(),
        loadBlockedDays()
      ]);
      
      // Renderizar chips de serviços após carregar
      await renderServiceChips();
      
      // Caso já exista uma data pré-selecionada, aplica bloqueios de horários
      if(selectedDateInput && selectedDateInput.value){
        await applyBlockedTimes(selectedDateInput.value);
      }
    } catch (error) {
      console.error('Erro ao inicializar página:', error);
      alert('Erro ao carregar dados. Recarregue a página.');
    }
  });
})();
