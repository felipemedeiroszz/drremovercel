const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { supabase } = require('../config/supabase');
const router = express.Router();

// Validações
const serviceValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
];

// GET /api/services - Listar todos os tipos de serviços ativos
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar tipos de serviços:', error);
      return res.status(500).json({ error: 'Erro ao buscar tipos de serviços' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/services - Criar novo tipo de serviço
router.post('/', serviceValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name } = req.body;

    // Verificar se já existe um serviço com esse nome
    const { data: existingService } = await supabase
      .from('service_types')
      .select('id')
      .eq('name', name)
      .single();

    if (existingService) {
      return res.status(409).json({ error: 'Tipo de serviço já existe' });
    }

    const { data, error } = await supabase
      .from('service_types')
      .insert({ name, is_active: true })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar tipo de serviço:', error);
      return res.status(500).json({ error: 'Erro ao criar tipo de serviço' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/services/:id - Atualizar tipo de serviço
router.put('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  ...serviceValidation
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name } = req.body;

    // Verificar se já existe outro serviço com esse nome
    const { data: existingService } = await supabase
      .from('service_types')
      .select('id')
      .eq('name', name)
      .neq('id', id)
      .single();

    if (existingService) {
      return res.status(409).json({ error: 'Já existe um tipo de serviço com esse nome' });
    }

    const { data, error } = await supabase
      .from('service_types')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar tipo de serviço:', error);
      return res.status(500).json({ error: 'Erro ao atualizar tipo de serviço' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Tipo de serviço não encontrado' });
    }

    res.json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/services/:id - Desativar tipo de serviço (soft delete)
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    // Verificar se existem agendamentos usando este tipo de serviço
    const { data: appointmentsUsingService } = await supabase
      .from('appointments')
      .select('id')
      .eq('service_type_id', id)
      .eq('status', 'scheduled')
      .limit(1);

    if (appointmentsUsingService && appointmentsUsingService.length > 0) {
      return res.status(409).json({ 
        error: 'Não é possível remover este tipo de serviço pois existem agendamentos ativos usando-o' 
      });
    }

    const { data, error } = await supabase
      .from('service_types')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao desativar tipo de serviço:', error);
      return res.status(500).json({ error: 'Erro ao desativar tipo de serviço' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Tipo de serviço não encontrado' });
    }

    res.json({ message: 'Tipo de serviço desativado com sucesso' });
  } catch (err) {
    console.error('Erro interno:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;