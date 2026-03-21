import { useEffect, useState, useCallback } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  primaryNav,
  communicationNav,
  automationNav,
  salesNav,
  connectionsNav,
  analyticsNav,
  systemNav,
} from '@/components/layout/sidebarNavConfig';
import type { NavItemConfig } from '@/components/layout/SidebarNavItem';

interface CommandPaletteProps {
  onNavigate: (view: string) => void;
}

const groups: { label: string; items: readonly NavItemConfig[] }[] = [
  { label: 'Principal', items: primaryNav },
  { label: 'Comunicação', items: communicationNav },
  { label: 'Automação & IA', items: automationNav },
  { label: 'Vendas & CRM', items: salesNav },
  { label: 'Conexões', items: connectionsNav },
  { label: 'Analytics', items: analyticsNav },
  { label: 'Sistema', items: systemNav },
];

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', down);

    const handler = () => setOpen(true);
    document.addEventListener('open-global-search', handler);

    return () => {
      window.removeEventListener('keydown', down);
      document.removeEventListener('open-global-search', handler);
    };
  }, []);

  const select = (id: string) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar módulo… (ex: pipeline, chatbot)" />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>Nenhum módulo encontrado.</CommandEmpty>
        {groups.map((group, i) => (
          <div key={group.label}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.id} onSelect={() => select(item.id)} className="gap-2 cursor-pointer">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">#{item.id}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
