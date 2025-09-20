(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  function sanitizeCpf(v){ return (v||'').replace(/\D/g,''); }

  const form = $('#patientPageForm');
  const results = $('#patientPageResults');
  const cpfInput = $('#ppCpf');
  const birthInput = $('#ppBirth');

  if(!form) return;

  // Máscara simples de CPF
  cpfInput.addEventListener('input', () => {
    let v = cpfInput.value.replace(/\D/g, '').slice(0,11);
    const parts = [];
    if(v.length > 3){ parts.push(v.slice(0,3)); v = v.slice(3); } else { cpfInput.value = v; return; }
    if(v.length > 3){ parts.push(v.slice(0,3)); v = v.slice(3); } else { cpfInput.value = parts.join('.') + (v ? '.'+v : ''); return; }
    parts.push(v.slice(0,3));
    v = v.slice(3);
    cpfInput.value = parts.join('.') + (v ? '-' + v : '');
  });

  function toDateTime(d, t){
    // d: yyyy-mm-dd, t: HH:mm
    try{ return new Date(`${d}T${t}:00`); }catch{ return new Date(d); }
  }

  function render(appointments){
    if(!appointments.length){
      results.innerHTML = '<p class="no-results">Nenhum agendamento encontrado.</p>';
      return;
    }
    const html = appointments.map(apt => {
      const statusClass = apt.status === 'completed' ? 'completed' : apt.status === 'cancelled' ? 'cancelled' : 'scheduled';
      const statusText = apt.status === 'completed' ? 'Concluída' : apt.status === 'cancelled' ? 'Cancelada' : 'Agendada';
      const serviceName = apt.service_types?.name || 'N/A';
      
      return `
        <div class="appointment-card">
          <div class="appointment-header">
            <h3>${apt.name}</h3>
            <span class="status ${statusClass}">${statusText}</span>
          </div>
          <div class="appointment-details">
            <p><strong>Data:</strong> ${apt.appointment_date}</p>
            <p><strong>Horário:</strong> ${apt.appointment_time}</p>
            <p><strong>Tipo:</strong> ${serviceName}</p>
            <p><strong>CPF:</strong> ${apt.cpf}</p>
          </div>
        </div>
      `;
    }).join('');
    results.innerHTML = html;
  }

  // Buscar agendamentos via API
  async function searchAppointments(cpf, birthDate) {
    try {
      return await appointmentsApi.getByPatient(cpf, birthDate);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      throw error;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cpf = sanitizeCpf(cpfInput.value);
    const birth = birthInput.value;
    if(!cpf || !birth){
      results.innerHTML = '<p class="patient-empty">Informe CPF e data de nascimento.</p>';
      return;
    }
    try{
      const matches = await searchAppointments(cpf, birth);
      render(matches);
    }catch(err){
      console.warn(err);
      results.innerHTML = '<p class="patient-empty">Não foi possível carregar os agendamentos.</p>';
    }
  });
})();
