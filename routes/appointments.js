const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { supabase } = require('../config/supabase');
const router = express.Router();

// Validações
const appointmentValidation = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Nome deve ter entre 2 e 255 caracteres'),
  body('cpf').custom((value) => {
    const cpfDigits = value.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      throw new Error('CPF deve ter 11 dígitos');
    }
    return true;
  }),
  body('birth_date').isDate().withMessage('Data de nascimento inválida'),
  body('appointment_date').isDate().withMessage('Data do agendamento inválida'),
  body('appointment_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário inválido'),
  body('service_type_id').isInt({ min: 1 }).withMessage('Tipo de serviço inválido')
];

// GET /api/appointments - Listar todos os agendamentos
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service_types(name)
      `)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/appointments/patient - Buscar agendamentos por CPF e data de nascimento
router.get('/patient', [
  query('cpf').isLength({ min: 11, max: 11 }).isNumeric().withMessage('CPF deve ter 11 dígitos'),
  query('birth_date').isDate().withMessage('Data de nascimento inválida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { cpf, birth_date } = req.query;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service_types(name)
      `)
      .eq('cpf', cpf)
      .eq('birth_date', birth_date)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (error) {
      console.error('Erro ao buscar agendamentos do paciente:', error);
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/appointments - Criar novo agendamento
router.post('/', appointmentValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, cpf, birth_date, appointment_date, appointment_time, service_type_id } = req.body;
    
    console.log('Dados recebidos para agendamento:', {
      name, cpf, birth_date, appointment_date, appointment_time, service_type_id
    });
    
    // Normalizar CPF (remover formatação)
    const normalizedCpf = cpf.replace(/\D/g, '');
    console.log('CPF normalizado:', normalizedCpf);

    // Verificar se o horário já está ocupado
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .eq('status', 'scheduled')
      .single();

    if (existingAppointment) {
      return res.status(409).json({ error: 'Horário já está ocupado' });
    }

    // Verificar se o dia está bloqueado
    const { data: blockedDay } = await supabase
      .from('blocked_days')
      .select('id')
      .eq('blocked_date', appointment_date)
      .single();

    if (blockedDay) {
      return res.status(409).json({ error: 'Data não disponível para agendamentos' });
    }

    // Verificar se o horário específico está bloqueado
    const { data: blockedTime } = await supabase
      .from('blocked_times')
      .select('id')
      .eq('blocked_date', appointment_date)
      .eq('blocked_time', appointment_time)
      .single();

    if (blockedTime) {
      return res.status(409).json({ error: 'Horário não disponível' });
    }

    // Criar o agendamento
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        name,
        cpf: normalizedCpf,
        birth_date,
        appointment_date,
        appointment_time,
        service_type_id,
        status: 'scheduled'
      })
      .select(`
        *,
        service_types(name)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar agendamento:', error);
      return res.status(500).json({ error: 'Erro ao criar agendamento' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/appointments/:id/status - Atualizar status do agendamento
router.put('/:id/status', [
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  body('status').isIn(['scheduled', 'done', 'canceled']).withMessage('Status inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        service_types(name)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar status:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/appointments/by-date/:date - Buscar agendamentos por data específica
router.get('/by-date/:date', [
  param('date').isDate().withMessage('Data inválida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { date } = req.params;

    const { data, error } = await supabase
      .from('appointments')
      .select('appointment_time, status')
      .eq('appointment_date', date)
      .eq('status', 'scheduled') // Apenas agendamentos ativos
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Erro ao buscar agendamentos por data:', error);
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/appointments/stats - Estatísticas dos agendamentos
router.get('/stats', async (req, res) => {
  try {
    const { data: allAppointments, error: allError } = await supabase
      .from('appointments')
      .select('status');

    if (allError) {
      console.error('Erro ao buscar estatísticas:', allError);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }

    const stats = {
      total: allAppointments.length,
      scheduled: allAppointments.filter(a => a.status === 'scheduled').length,
      done: allAppointments.filter(a => a.status === 'done').length,
      canceled: allAppointments.filter(a => a.status === 'canceled').length
    };

    res.json(stats);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;