const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { supabase } = require('../config/supabase');
const router = express.Router();

// Validações
const blockDayValidation = [
  body('blocked_date').isDate().withMessage('Data inválida'),
  body('reason').optional().trim().isLength({ max: 255 }).withMessage('Motivo deve ter no máximo 255 caracteres')
];

const blockTimeValidation = [
  body('blocked_date').isDate().withMessage('Data inválida'),
  body('blocked_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário inválido'),
  body('reason').optional().trim().isLength({ max: 255 }).withMessage('Motivo deve ter no máximo 255 caracteres')
];

// ===== DIAS BLOQUEADOS =====

// GET /api/blocks/days - Listar dias bloqueados
router.get('/days', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blocked_days')
      .select('*')
      .order('blocked_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar dias bloqueados:', error);
      return res.status(500).json({ error: 'Erro ao buscar dias bloqueados' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/blocks/days - Bloquear um dia
router.post('/days', blockDayValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { blocked_date, reason } = req.body;

    // Verificar se o dia já está bloqueado
    const { data: existingBlock } = await supabase
      .from('blocked_days')
      .select('id')
      .eq('blocked_date', blocked_date)
      .single();

    if (existingBlock) {
      return res.status(409).json({ error: 'Este dia já está bloqueado' });
    }

    const { data, error } = await supabase
      .from('blocked_days')
      .insert({ blocked_date, reason })
      .select()
      .single();

    if (error) {
      console.error('Erro ao bloquear dia:', error);
      return res.status(500).json({ error: 'Erro ao bloquear dia' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/blocks/days/:id - Desbloquear um dia
router.delete('/days/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('blocked_days')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao desbloquear dia:', error);
      return res.status(500).json({ error: 'Erro ao desbloquear dia' });
    }

    res.json({ message: 'Dia desbloqueado com sucesso' });
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== HORÁRIOS BLOQUEADOS =====

// GET /api/blocks/times - Listar horários bloqueados
router.get('/times', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blocked_times')
      .select('*')
      .order('blocked_date', { ascending: true })
      .order('blocked_time', { ascending: true });

    if (error) {
      console.error('Erro ao buscar horários bloqueados:', error);
      return res.status(500).json({ error: 'Erro ao buscar horários bloqueados' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/blocks/times/by-date/:date - Listar horários bloqueados por data
router.get('/times/by-date/:date', [
  param('date').isDate().withMessage('Data inválida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { date } = req.params;

    const { data, error } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('blocked_date', date)
      .order('blocked_time', { ascending: true });

    if (error) {
      console.error('Erro ao buscar horários bloqueados por data:', error);
      return res.status(500).json({ error: 'Erro ao buscar horários bloqueados' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/blocks/times - Bloquear um horário específico
router.post('/times', blockTimeValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { blocked_date, blocked_time, reason } = req.body;

    // Verificar se o horário já está bloqueado
    const { data: existingBlock } = await supabase
      .from('blocked_times')
      .select('id')
      .eq('blocked_date', blocked_date)
      .eq('blocked_time', blocked_time)
      .single();

    if (existingBlock) {
      return res.status(409).json({ error: 'Este horário já está bloqueado' });
    }

    // Verificar se existe agendamento neste horário
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', blocked_date)
      .eq('appointment_time', blocked_time)
      .eq('status', 'scheduled')
      .single();

    if (existingAppointment) {
      return res.status(409).json({ error: 'Já existe um agendamento neste horário' });
    }

    const { data, error } = await supabase
      .from('blocked_times')
      .insert({ blocked_date, blocked_time, reason })
      .select()
      .single();

    if (error) {
      console.error('Erro ao bloquear horário:', error);
      return res.status(500).json({ error: 'Erro ao bloquear horário' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/blocks/times/:id - Desbloquear um horário
router.delete('/times/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('blocked_times')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao desbloquear horário:', error);
      return res.status(500).json({ error: 'Erro ao desbloquear horário' });
    }

    res.json({ message: 'Horário desbloqueado com sucesso' });
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;