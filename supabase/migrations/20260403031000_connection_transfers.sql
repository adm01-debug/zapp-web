-- Cross-connection transfer: transfer conversations between WhatsApp numbers
-- ============================================================================
-- Enables transferring a client from one WhatsApp number (e.g. Sales) to
-- another (e.g. Finance) with context preservation and automated messaging.

CREATE TABLE public.connection_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Source
  source_connection_id uuid NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  source_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  source_agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Target
  target_connection_id uuid NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  target_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL, -- created on transfer
  target_agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_queue_id uuid REFERENCES public.queues(id) ON DELETE SET NULL,
  -- Client info
  client_phone text NOT NULL,
  client_name text,
  -- Transfer details
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
  transfer_message text, -- internal note from source agent
  farewell_message text, -- sent to client from source number
  welcome_message text, -- sent to client from target number
  context_summary text, -- AI summary or manual context for receiving agent
  -- Tracking
  error_message text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.connection_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfers"
ON public.connection_transfers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create transfers"
ON public.connection_transfers FOR INSERT TO authenticated
WITH CHECK (
  source_agent_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "Admins can manage all transfers"
ON public.connection_transfers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE INDEX idx_connection_transfers_source ON public.connection_transfers(source_connection_id);
CREATE INDEX idx_connection_transfers_target ON public.connection_transfers(target_connection_id);
CREATE INDEX idx_connection_transfers_client ON public.connection_transfers(client_phone);
CREATE INDEX idx_connection_transfers_status ON public.connection_transfers(status);

CREATE TRIGGER trigger_connection_transfers_updated_at
  BEFORE UPDATE ON public.connection_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for transfer status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_transfers;
