import { useState, useEffect } from 'react';
import { motion } from '@/components/ui/motion';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Users,
  Search,
  Crown,
  UserCog,
  User,
  History,
  RefreshCw,
  Edit,
  UserX,
  UserCheck,
  UserPlus,
  Briefcase,
  Building,
  Phone,
  Lock,
  Eye,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { ForceLogoutButton } from './ForceLogoutButton';

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: AppRole;
  job_title: string | null;
  department: string | null;
  phone: string | null;
  access_level: string | null;
  max_chats: number | null;
  is_active: boolean | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  details: unknown;
  created_at: string;
  user?: { name: string; email: string | null } | null;
}

const roleConfig: Record<AppRole, { label: string; icon: typeof Crown; color: string }> = {
  admin: { label: 'Administrador', icon: Crown, color: 'text-warning' },
  supervisor: { label: 'Supervisor', icon: UserCog, color: 'text-info' },
  agent: { label: 'Atendente', icon: User, color: 'text-muted-foreground' },
  special_agent: { label: 'Agente Especial', icon: Eye, color: 'text-accent-foreground' },
};

const accessLevelConfig: Record<string, { label: string; description: string }> = {
  basic: { label: 'Básico', description: 'Acesso apenas aos próprios atendimentos' },
  standard: { label: 'Padrão', description: 'Acesso a atendimentos e contatos atribuídos' },
  advanced: { label: 'Avançado', description: 'Acesso a relatórios e métricas da equipe' },
  full: { label: 'Completo', description: 'Acesso total ao sistema' },
};

export function AdminView() {
  const { isAdmin, isSupervisor, loading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('agent');
  const [newUserGmail, setNewUserGmail] = useState('');
  const [newUserGoogleServices, setNewUserGoogleServices] = useState({
    google_sheets: false,
    google_docs: false,
    google_calendar: false,
    google_drive: false,
  });
  const [newUserDropboxEmail, setNewUserDropboxEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    if (isSupervisor) {
      fetchData();
    }
  }, [isSupervisor, activeTab]);

  const fetchData = async () => {
    setLoading(true);

    if (activeTab === 'users') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      if (profiles && roles) {
        const usersWithRoles = profiles.map(profile => {
          const userRole = roles.find(r => r.user_id === profile.user_id);
          return {
            ...profile,
            role: (userRole?.role || 'agent') as AppRole,
          };
        });
        setUsers(usersWithRoles);
      }
    } else {
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logs) {
        const userIds = [...new Set(logs.map(l => l.user_id).filter((id): id is string => id !== null))];
        const { data: profiles } = userIds.length > 0
          ? await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', userIds)
          : { data: [] };

        const logsWithUsers: AuditLog[] = logs.map(log => ({
          ...log,
          user: profiles?.find(p => p.user_id === log.user_id) || null,
        }));
        setAuditLogs(logsWithUsers);
      }
    }

    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem alterar roles.');
      return;
    }

    await supabase.from('user_roles').delete().eq('user_id', userId);

    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: newRole,
    });

    if (error) {
      toast.error('Erro ao atualizar role');
    } else {
      toast.success(`Usuário agora é ${roleConfig[newRole].label}.`);
      fetchData();
    }
  };

  const handleToggleActive = async (user: UserWithRole) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem ativar/desativar usuários.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(user.is_active ? 'Usuário desativado' : 'Usuário ativado');
      fetchData();
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        name: editingUser.name,
        job_title: editingUser.job_title,
        department: editingUser.department,
        phone: editingUser.phone,
        access_level: editingUser.access_level,
        max_chats: editingUser.max_chats,
      })
      .eq('id', editingUser.id);

    if (error) {
      toast.error('Erro ao salvar usuário');
    } else {
      toast.success('Usuário atualizado com sucesso');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchData();
    }
  };

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (newUserPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            name: newUserName,
            email: newUserEmail,
            password: newUserPassword,
            role: newUserRole,
            gmail_email: newUserGmail || undefined,
            google_services: Object.entries(newUserGoogleServices)
              .filter(([, enabled]) => enabled)
              .map(([key]) => key),
            dropbox_email: newUserDropboxEmail || undefined,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Erro ao criar usuário');
      } else {
        toast.success('Usuário criado com sucesso!');
        setIsAddDialogOpen(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('agent');
        setNewUserGmail('');
        setNewUserGoogleServices({ google_sheets: false, google_docs: false, google_calendar: false, google_drive: false });
        setNewUserDropboxEmail('');
        fetchData();
      }
    } catch (err) {
      toast.error('Erro ao criar usuário');
    }
    setCreatingUser(false);
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-4 border-whatsapp border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSupervisor) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta área.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-whatsapp" />
            Administração
          </h1>
          <p className="text-muted-foreground">
            Gerencie usuários, permissões e visualize logs de auditoria
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-whatsapp hover:bg-whatsapp-dark">
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Usuário
            </Button>
          )}
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'bg-whatsapp hover:bg-whatsapp-dark' : ''}
        >
          <Users className="w-4 h-4 mr-2" />
          Usuários ({users.length})
        </Button>
        <Button
          variant={activeTab === 'audit' ? 'default' : 'outline'}
          onClick={() => setActiveTab('audit')}
          className={activeTab === 'audit' ? 'bg-whatsapp hover:bg-whatsapp-dark' : ''}
        >
          <History className="w-4 h-4 mr-2" />
          Auditoria
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={activeTab === 'users' ? 'Buscar usuários...' : 'Buscar logs...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={editingUser.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">{editingUser.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{editingUser.name}</p>
                  <p className="text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Nome</Label>
                  <Input
                    id="edit_name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Telefone</Label>
                  <Input
                    id="edit_phone"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_job_title">Cargo</Label>
                  <Input
                    id="edit_job_title"
                    placeholder="Ex: Atendente Senior"
                    value={editingUser.job_title || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, job_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_department">Departamento</Label>
                  <Input
                    id="edit_department"
                    placeholder="Ex: Vendas"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_access_level">Nível de Acesso</Label>
                  <Select
                    value={editingUser.access_level || 'basic'}
                    onValueChange={(v) => setEditingUser({ ...editingUser, access_level: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accessLevelConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <span className="font-medium">{config.label}</span>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_max_chats">Limite de Chats</Label>
                  <Input
                    id="edit_max_chats"
                    type="number"
                    min={1}
                    max={50}
                    value={editingUser.max_chats || 5}
                    onChange={(e) => setEditingUser({ ...editingUser, max_chats: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveUser} className="bg-whatsapp hover:bg-whatsapp-dark">
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new_name">Nome *</Label>
              <Input
                id="new_name"
                placeholder="Nome completo"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_email">Email *</Label>
              <Input
                id="new_email"
                type="email"
                placeholder="usuario@email.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">Senha *</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_role">Role</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => {
                    const RIcon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <RIcon className={`w-4 h-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_gmail">Conta Google (opcional)</Label>
              <Input
                id="new_gmail"
                type="email"
                placeholder="usuario@gmail.com"
                value={newUserGmail}
                onChange={(e) => setNewUserGmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Será usada para Gmail e os serviços Google selecionados abaixo.
              </p>
            </div>

            {newUserGmail && (
              <div className="space-y-3 rounded-lg border border-secondary/30 p-3">
                <Label className="text-sm font-medium">Serviços Google vinculados</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'google_sheets', label: 'Google Sheets' },
                    { key: 'google_docs', label: 'Google Docs' },
                    { key: 'google_calendar', label: 'Google Calendar' },
                    { key: 'google_drive', label: 'Google Drive' },
                  ] as const).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={newUserGoogleServices[key]}
                        onCheckedChange={(checked) =>
                          setNewUserGoogleServices(prev => ({ ...prev, [key]: checked }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new_dropbox">Conta Dropbox (opcional)</Label>
              <Input
                id="new_dropbox"
                type="email"
                placeholder="usuario@email.com"
                value={newUserDropboxEmail}
                onChange={(e) => setNewUserDropboxEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                O usuário não poderá alterar ou remover esta conta.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={creatingUser || !newUserName || !newUserEmail || !newUserPassword}
                className="bg-whatsapp hover:bg-whatsapp-dark"
              >
                {creatingUser && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Criar Usuário
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === 'users' ? (
        <Card className="border border-secondary/20 bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo/Depto</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const roleInfo = roleConfig[user.role];
                  const RoleIcon = roleInfo.icon;
                  const accessInfo = accessLevelConfig[user.access_level || 'basic'];

                  return (
                    <TableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium block">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(user.job_title || user.department) ? (
                          <div className="space-y-0.5">
                            {user.job_title && (
                              <div className="flex items-center gap-1 text-sm">
                                <Briefcase className="w-3 h-3" />
                                {user.job_title}
                              </div>
                            )}
                            {user.department && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building className="w-3 h-3" />
                                {user.department}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={user.role}
                            onValueChange={(v) => handleRoleChange(user.user_id, v as AppRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="agent">Atendente</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={roleInfo.color}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          {accessInfo?.label || 'Básico'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active !== false ? (
                          <Badge className="bg-success/10 text-success border-green-500/20">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-red-500/20">
                            <UserX className="w-3 h-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <ForceLogoutButton userId={user.user_id} userName={user.name} />
                            <Switch
                              checked={user.is_active !== false}
                              onCheckedChange={() => handleToggleActive(user)}
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logs de Auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{log.user?.name || 'Sistema'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.entity_type || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {JSON.stringify(log.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
