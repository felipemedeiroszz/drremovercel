const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente público (para operações gerais)
const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente admin (para operações administrativas)
const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  supabase;

module.exports = {
  supabase,
  supabaseAdmin
};