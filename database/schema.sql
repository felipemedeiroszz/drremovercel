-- Criação das tabelas para o sistema Dr. Remo
-- Execute este script no Supabase SQL Editor

-- Tabela de tipos de serviços
CREATE TABLE IF NOT EXISTS service_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) NOT NULL,
  birth_date DATE NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  service_type_id INTEGER REFERENCES service_types(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'done', 'canceled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de dias bloqueados
CREATE TABLE IF NOT EXISTS blocked_days (
  id SERIAL PRIMARY KEY,
  blocked_date DATE NOT NULL UNIQUE,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de horários bloqueados
CREATE TABLE IF NOT EXISTS blocked_times (
  id SERIAL PRIMARY KEY,
  blocked_date DATE NOT NULL,
  blocked_time TIME NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocked_date, blocked_time)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_cpf ON appointments(cpf);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_blocked_days_date ON blocked_days(blocked_date);
CREATE INDEX IF NOT EXISTS idx_blocked_times_date ON blocked_times(blocked_date);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_service_types_updated_at BEFORE UPDATE ON service_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir tipos de serviços padrão
INSERT INTO service_types (name) VALUES 
  ('Consulta Geral'),
  ('Exame de Rotina'),
  ('Consulta Especializada'),
  ('Retorno')
ON CONFLICT (name) DO NOTHING;

-- Políticas RLS (Row Level Security) para Supabase
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública dos tipos de serviços
CREATE POLICY "Allow public read access to service_types" ON service_types
  FOR SELECT USING (true);

-- Política para permitir operações completas nos agendamentos (para simplificar)
CREATE POLICY "Allow all operations on appointments" ON appointments
  FOR ALL USING (true);

-- Política para permitir operações completas nos bloqueios (para simplificar)
CREATE POLICY "Allow all operations on blocked_days" ON blocked_days
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on blocked_times" ON blocked_times
  FOR ALL USING (true);

-- Política para permitir operações nos tipos de serviços (para admin)
CREATE POLICY "Allow all operations on service_types" ON service_types
  FOR ALL USING (true);

-- Comentários nas tabelas
COMMENT ON TABLE service_types IS 'Tipos de serviços/atendimentos disponíveis';
COMMENT ON TABLE appointments IS 'Agendamentos de pacientes';
COMMENT ON TABLE blocked_days IS 'Dias bloqueados para agendamento';
COMMENT ON TABLE blocked_times IS 'Horários específicos bloqueados por data';

-- Comentários nas colunas principais
COMMENT ON COLUMN appointments.cpf IS 'CPF do paciente (apenas números)';
COMMENT ON COLUMN appointments.status IS 'Status do agendamento: scheduled, completed, cancelled';
COMMENT ON COLUMN blocked_days.reason IS 'Motivo do bloqueio do dia';
COMMENT ON COLUMN blocked_times.reason IS 'Motivo do bloqueio do horário específico';