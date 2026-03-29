import { useState, useCallback } from 'react';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { MobileDrawerMenu } from '@/components/mobile/MobileDrawerMenu';
import { NotificationsPanel, Notification } from '@/components/mobile/NotificationsPanel';
import { MobileFAB } from '@/components/mobile/MobileFAB';
import { BottomNavigation } from '@/components/ui/mobile-components';
import { MessageSquare, BarChart3, Users, Phone, Menu } from 'lucide-react';

interface MobileShellProps {
  currentView: string;
  setCurrentView: (viewId: string) => void;
  profile: { name?: string | null; avatar_url?: string | null } | null;
  userEmail: string;
  signOut: () => void;
  unreadNotifications: number;
}

const mobileNavItems = [
  { id: 'inbox', icon: <MessageSquare className="w-5 h-5" />, label: 'Inbox' },
  { id: 'dashboard', icon: <BarChart3 className="w-5 h-5" />, label: 'Dashboard' },
  { id: 'contacts', icon: <Users className="w-5 h-5" />, label: 'Contatos' },
  { id: 'agents', icon: <Phone className="w-5 h-5" />, label: 'Equipe' },
  { id: 'more', icon: <Menu className="w-5 h-5" />, label: 'Mais' },
];

export function MobileShell({
  currentView,
  setCurrentView,
  profile,
  userEmail,
  signOut,
  unreadNotifications,
}: MobileShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleMarkAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const navItemsWithBadge = mobileNavItems.map((item) =>
    item.id === 'inbox' && unreadNotifications > 0
      ? { ...item, badge: unreadNotifications }
      : item
  );

  return (
    <>
      <MobileHeader
        onMenuOpen={() => setMobileMenuOpen(true)}
        onSearchOpen={() => setMobileSearchOpen(true)}
        onNotificationsOpen={() => setNotificationsOpen(true)}
        currentView={currentView}
        agentName={profile?.name || userEmail || 'Usuário'}
        agentAvatar={profile?.avatar_url || undefined}
        agentStatus="online"
        unreadCount={unreadNotifications}
      />

      <NotificationsPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationClick={(n) => {
          setNotificationsOpen(false);
          if (n.type === 'message' || n.type === 'assignment') setCurrentView('inbox');
        }}
      />

      <MobileDrawerMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentView={currentView}
        onViewChange={setCurrentView}
        agentName={profile?.name || userEmail || 'Usuário'}
        agentAvatar={profile?.avatar_url || undefined}
        agentStatus="online"
        onLogout={signOut}
      />

      <MobileFAB
        onNewConversation={() => setCurrentView('inbox')}
        onNewContact={() => setCurrentView('contacts')}
        onNewCampaign={() => setCurrentView('campaigns')}
      />

      <BottomNavigation
        items={navItemsWithBadge}
        activeId={currentView}
        onChange={(id) => {
          if (id === 'more') setMobileMenuOpen(true);
          else setCurrentView(id);
        }}
      />
    </>
  );
}
