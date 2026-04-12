import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { TourOverlay } from './TourOverlay';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (steps: TourStep[]) => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour must be used within a TourProvider');
  return context;
}

interface TourProviderProps { children: ReactNode; onComplete?: () => void; }

export function TourProvider({ children, onComplete }: TourProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);

  const startTour = useCallback((tourSteps: TourStep[]) => { setSteps(tourSteps); setCurrentStep(0); setIsActive(true); }, []);
  const endTour = useCallback(() => { setIsActive(false); setCurrentStep(0); setSteps([]); onComplete?.(); }, [onComplete]);
  const nextStep = useCallback(() => { if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1); else endTour(); }, [currentStep, steps.length, endTour]);
  const prevStep = useCallback(() => { if (currentStep > 0) setCurrentStep(prev => prev - 1); }, [currentStep]);
  const goToStep = useCallback((index: number) => { if (index >= 0 && index < steps.length) setCurrentStep(index); }, [steps.length]);

  return (
    <TourContext.Provider value={{ isActive, currentStep, steps, startTour, endTour, nextStep, prevStep, goToStep }}>
      {children}
      <TourOverlay />
    </TourContext.Provider>
  );
}

export const DEFAULT_ONBOARDING_STEPS: TourStep[] = [
  { id: 'inbox', target: '[data-tour="inbox"]', title: 'Inbox de Conversas', description: 'Aqui você encontra todas as suas conversas em tempo real. Veja mensagens não lidas, responda clientes e gerencie seus atendimentos.', position: 'right' },
  { id: 'contacts', target: '[data-tour="contacts"]', title: 'Gestão de Contatos', description: 'Acesse sua base de contatos, adicione novas informações e visualize o histórico completo de cada cliente.', position: 'right' },
  { id: 'dashboard', target: '[data-tour="dashboard"]', title: 'Dashboard & Métricas', description: 'Acompanhe suas metas, visualize estatísticas de atendimento e monitore seu desempenho em tempo real.', position: 'right' },
  { id: 'queues', target: '[data-tour="queues"]', title: 'Filas de Atendimento', description: 'Organize seus atendimentos em filas por departamento ou prioridade para melhor distribuição.', position: 'right' },
  { id: 'notifications', target: '[data-tour="notifications"]', title: 'Central de Notificações', description: 'Receba alertas importantes sobre SLAs, metas alcançadas e atualizações do sistema.', position: 'right' },
  { id: 'theme', target: '[data-tour="theme"]', title: 'Personalização', description: 'Alterne entre tema claro e escuro conforme sua preferência. Sua experiência, suas regras!', position: 'right' },
];
