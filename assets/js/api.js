// Configuração da API
const API_BASE_URL = window.location.origin + '/api';

// Utilitário para fazer requisições HTTP
class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Métodos HTTP
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Instância global da API
const api = new ApiClient();

// Serviços específicos
const appointmentsApi = {
  // Listar todos os agendamentos
  getAll() {
    return api.get('/appointments');
  },

  // Buscar agendamentos por paciente
  getByPatient(cpf, birthDate) {
    return api.get('/appointments/patient', { cpf, birth_date: birthDate });
  },

  // Buscar agendamentos por data específica
  getByDate(date) {
    return api.get(`/appointments/by-date/${date}`);
  },

  // Criar novo agendamento
  create(appointmentData) {
    return api.post('/appointments', appointmentData);
  },

  // Atualizar status do agendamento
  updateStatus(id, status) {
    return api.put(`/appointments/${id}/status`, { status });
  },

  // Obter estatísticas
  getStats() {
    return api.get('/appointments/stats');
  }
};

const servicesApi = {
  // Listar tipos de serviços
  getAll() {
    return api.get('/services');
  },

  // Criar novo tipo de serviço
  create(serviceData) {
    return api.post('/services', serviceData);
  },

  // Atualizar tipo de serviço
  update(id, serviceData) {
    return api.put(`/services/${id}`, serviceData);
  },

  // Remover tipo de serviço
  remove(id) {
    return api.delete(`/services/${id}`);
  }
};

const blocksApi = {
  // Dias bloqueados
  days: {
    getAll() {
      return api.get('/blocks/days');
    },
    create(blockData) {
      return api.post('/blocks/days', blockData);
    },
    remove(id) {
      return api.delete(`/blocks/days/${id}`);
    }
  },

  // Horários bloqueados
  times: {
    getAll() {
      return api.get('/blocks/times');
    },
    getByDate(date) {
      return api.get(`/blocks/times/by-date/${date}`);
    },
    create(blockData) {
      return api.post('/blocks/times', blockData);
    },
    remove(id) {
      return api.delete(`/blocks/times/${id}`);
    }
  }
};

const adminApi = {
  // Dashboard
  getDashboard() {
    return api.get('/admin/dashboard');
  },

  // Agendamentos com filtros
  getAppointments(filters = {}) {
    return api.get('/admin/appointments', filters);
  },

  // Relatório mensal
  getMonthlyReport(year, month) {
    return api.get('/admin/reports/monthly', { year, month });
  }
};

// Utilitários para tratamento de erros
const handleApiError = (error, defaultMessage = 'Erro inesperado') => {
  console.error('API Error:', error);
  
  if (error.message) {
    return error.message;
  }
  
  return defaultMessage;
};

// Utilitário para mostrar mensagens de sucesso/erro
const showMessage = (message, type = 'info') => {
  // Implementação simples com alert - pode ser melhorada com toast/modal
  if (type === 'error') {
    alert('Erro: ' + message);
  } else if (type === 'success') {
    alert('Sucesso: ' + message);
  } else {
    alert(message);
  }
};

// Exportar para uso global
window.api = api;
window.appointmentsApi = appointmentsApi;
window.servicesApi = servicesApi;
window.blocksApi = blocksApi;
window.adminApi = adminApi;
window.handleApiError = handleApiError;
window.showMessage = showMessage;