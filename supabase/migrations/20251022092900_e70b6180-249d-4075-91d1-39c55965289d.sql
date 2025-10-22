-- Crea la tabella per le presenze degli studenti
CREATE TABLE public.attendance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(3,1) NOT NULL CHECK (hours >= 0 AND hours <= 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Abilita Row Level Security
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere solo le proprie presenze
CREATE POLICY "Users can view own attendance entries"
  ON public.attendance_entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: gli utenti possono inserire solo le proprie presenze
CREATE POLICY "Users can insert own attendance entries"
  ON public.attendance_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: gli utenti possono aggiornare solo le proprie presenze
CREATE POLICY "Users can update own attendance entries"
  ON public.attendance_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: gli utenti possono eliminare solo le proprie presenze
CREATE POLICY "Users can delete own attendance entries"
  ON public.attendance_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger per aggiornare updated_at
CREATE TRIGGER attendance_entries_updated_at
  BEFORE UPDATE ON public.attendance_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indice per migliorare le query
CREATE INDEX idx_attendance_entries_user_date ON public.attendance_entries(user_id, date DESC);