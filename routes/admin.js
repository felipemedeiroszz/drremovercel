const express = require('express');
const { query, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const router = express.Router();

// GET /api/admin/dashboard - Dashboard com estatísticas gerais
router.get('/dashboard', async (req, res) => {
  try {
    // Buscar estatísticas de agendamentos
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('status, appointment_date');

    if (appointmentsError) {
      console.error('Erro ao buscar agendamentos para dashboard:', appointmentsError);
      return res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }

    // Calcular estatísticas
    const stats = {
      total: appointments.length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      done: appointments.filter(a => a.status === 'done').length,
      canceled: appointments.filter(a => a.status === 'canceled').length
    };

    // Agendamentos por mês (últimos 6 meses)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const monthlyStats = {};
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats[key] = { scheduled: 0, done: 0, canceled: 0 };
    }

    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      if (appointmentDate >= sixMonthsAgo) {
        const key = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyStats[key]) {
          monthlyStats[key][appointment.status]++;
        }
      }
    });

    // Próximos agendamentos (próximos 7 dias)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select(`
        *,
        service_types(name)
      `)
      .eq('status', 'scheduled')
      .gte('appointment_date', today)
      .lte('appointment_date', nextWeek)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(10);

    if (upcomingError) {
      console.error('Erro ao buscar próximos agendamentos:', upcomingError);
    }

    res.json({
      stats,
      monthlyStats,
      upcomingAppointments: upcomingAppointments || []
    });
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/appointments - Listar agendamentos com filtros
router.get('/appointments', [
  query('date').optional().isDate().withMessage('Data inválida'),
  query('status').optional().isIn(['scheduled', 'done', 'canceled']).withMessage('Status inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { date, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        service_types(name)
      `, { count: 'exact' });

    // Aplicar filtros
    if (date) {
      query = query.eq('appointment_date', date);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Paginação e ordenação
    const { data, error, count } = await query
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar agendamentos admin:', error);
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }

    res.json({
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/reports/monthly - Relatório mensal
router.get('/reports/monthly', [
  query('year').isInt({ min: 2020, max: 2030 }).withMessage('Ano inválido'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('Mês inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { year, month } = req.query;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // último dia do mês

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service_types(name)
      `)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Erro ao buscar relatório mensal:', error);
      return res.status(500).json({ error: 'Erro ao buscar relatório' });
    }

    // Agrupar por status
    const byStatus = {
      scheduled: appointments.filter(a => a.status === 'scheduled'),
      done: appointments.filter(a => a.status === 'done'),
      canceled: appointments.filter(a => a.status === 'canceled')
    };

    // Agrupar por tipo de serviço
    const byServiceType = {};
    appointments.forEach(appointment => {
      const serviceName = appointment.service_types?.name || 'Não informado';
      if (!byServiceType[serviceName]) {
        byServiceType[serviceName] = { scheduled: 0, done: 0, canceled: 0 };
      }
      byServiceType[serviceName][appointment.status]++;
    });

    // Agrupar por dia
    const byDay = {};
    appointments.forEach(appointment => {
      const day = appointment.appointment_date;
      if (!byDay[day]) {
        byDay[day] = { scheduled: 0, done: 0, canceled: 0 };
      }
      byDay[day][appointment.status]++;
    });

    res.json({
      period: { year: parseInt(year), month: parseInt(month) },
      summary: {
        total: appointments.length,
        scheduled: byStatus.scheduled.length,
        done: byStatus.done.length,
        canceled: byStatus.canceled.length
      },
      byStatus,
      byServiceType,
      byDay
    });
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;