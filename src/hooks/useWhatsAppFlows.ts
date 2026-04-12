import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

export interface FlowScreen {
  id: string;
  title: string;
  layout: FlowComponent[];
}

export interface FlowComponent {
  id: string;
  type: 'TextHeading' | 'TextSubheading' | 'TextBody' | 'TextInput' | 'TextArea' | 'DatePicker' | 'RadioButtonsGroup' | 'CheckboxGroup' | 'Dropdown' | 'Image' | 'OptIn' | 'Footer';
  label?: string;
  name?: string;
  required?: boolean;
  options?: { id: string; title: string }[];
  text?: string;
  src?: string;
}

export interface WhatsAppFlow {
  id: string;
  name: string;
  description: string | null;
  flow_json: Json;
  screens: FlowScreen[];
  status: string;
  whatsapp_flow_id: string | null;
  created_at: string;
}

export function useWhatsAppFlows() {
  const [flows, setFlows] = useState<WhatsAppFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<WhatsAppFlow | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingScreen, setEditingScreen] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('whatsapp_flows').select('*').order('created_at', { ascending: false });
    if (data) {
      setFlows(data.map((f) => ({
        ...f,
        screens: (Array.isArray(f.screens) ? f.screens : []) as unknown as FlowScreen[],
      })) as WhatsAppFlow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const createFlow = async () => {
    if (!formName.trim()) return;
    const defaultScreens: FlowScreen[] = [{
      id: crypto.randomUUID(),
      title: 'Tela 1',
      layout: [
        { id: crypto.randomUUID(), type: 'TextHeading', text: 'Bem-vindo' },
        { id: crypto.randomUUID(), type: 'TextBody', text: 'Preencha o formulário abaixo.' },
        { id: crypto.randomUUID(), type: 'Footer', label: 'Continuar' },
      ],
    }];

    const { error } = await supabase.from('whatsapp_flows').insert({
      name: formName,
      description: formDescription || null,
      screens: defaultScreens as unknown as Json,
    });

    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Flow criado!' });
    setShowCreateDialog(false);
    setFormName(''); setFormDescription('');
    fetchFlows();
  };

  const deleteFlow = async (id: string) => {
    await supabase.from('whatsapp_flows').delete().eq('id', id);
    if (selectedFlow?.id === id) setSelectedFlow(null);
    toast({ title: 'Flow removido' });
    fetchFlows();
  };

  const updateFlowScreens = async (screens: FlowScreen[]) => {
    if (!selectedFlow) return;
    setSelectedFlow({ ...selectedFlow, screens });
    await supabase.from('whatsapp_flows').update({ screens: screens as unknown as Json }).eq('id', selectedFlow.id);
  };

  const addScreen = () => {
    if (!selectedFlow) return;
    const newScreens = [...selectedFlow.screens, {
      id: crypto.randomUUID(),
      title: `Tela ${selectedFlow.screens.length + 1}`,
      layout: [
        { id: crypto.randomUUID(), type: 'TextHeading' as const, text: 'Nova Tela' },
        { id: crypto.randomUUID(), type: 'Footer' as const, label: 'Continuar' },
      ],
    }];
    updateFlowScreens(newScreens);
  };

  const addComponent = (type: string) => {
    if (!selectedFlow) return;
    const screens = [...selectedFlow.screens];
    const newComp: FlowComponent = {
      id: crypto.randomUUID(),
      type: type as FlowComponent['type'],
      label: type === 'Footer' ? 'Enviar' : undefined,
      name: ['TextInput', 'TextArea', 'DatePicker', 'RadioButtonsGroup', 'CheckboxGroup', 'Dropdown'].includes(type)
        ? `field_${Date.now()}` : undefined,
      text: ['TextHeading', 'TextSubheading', 'TextBody'].includes(type) ? 'Texto aqui' : undefined,
      options: ['RadioButtonsGroup', 'CheckboxGroup', 'Dropdown'].includes(type)
        ? [{ id: '1', title: 'Opção 1' }, { id: '2', title: 'Opção 2' }] : undefined,
    };
    const footerIdx = screens[editingScreen].layout.findIndex(c => c.type === 'Footer');
    if (footerIdx >= 0) {
      screens[editingScreen].layout.splice(footerIdx, 0, newComp);
    } else {
      screens[editingScreen].layout.push(newComp);
    }
    updateFlowScreens(screens);
  };

  const removeComponent = (compIdx: number) => {
    if (!selectedFlow) return;
    const screens = [...selectedFlow.screens];
    screens[editingScreen].layout.splice(compIdx, 1);
    updateFlowScreens(screens);
  };

  return {
    flows, loading, selectedFlow, setSelectedFlow,
    showCreateDialog, setShowCreateDialog,
    editingScreen, setEditingScreen,
    previewMode, setPreviewMode,
    formName, setFormName, formDescription, setFormDescription,
    createFlow, deleteFlow, addScreen, addComponent, removeComponent,
  };
}
