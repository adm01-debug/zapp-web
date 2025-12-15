import { useState, useEffect } from 'react';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Settings,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserRole, AppRole } from '@/hooks/useUserRole';

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: AppRole;
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
  admin: { label: 'Administrador', icon: Crown, color: 'text-yellow-500' },
  supervisor: { label: 'Supervisor', icon: UserCog, color: 'text-blue-500' },
  agent: { label: 'Atendente', icon: User, color: 'text-muted-foreground' },
};

export function AdminView() {
  const { isAdmin, isSupervisor, loading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  useEffect(() => {
    if (isSupervisor) {
      fetchData();
    }
  }, [isSupervisor, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    
    if (activeTab === 'users') {
      // Fetch users with their roles
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
      // Fetch audit logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logs) {
        // Fetch user names for logs
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
      toast({
        title: 'Sem permissão',
        description: 'Apenas administradores podem alterar roles.',
        variant: 'destructive',
      });
      return;
    }

    // First, delete existing roles
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    // Then insert the new role
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: newRole,
    });

    if (error) {
      toast({
        title: 'Erro ao atualizar role',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Role atualizado!', description: `Usuário agora é ${roleConfig[newRole].label}.` });
      fetchData();
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="p-6 space-y-6 overflow-y-auto h-full">
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
            Gerencie usuários, roles e visualize logs de auditoria
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'bg-whatsapp hover:bg-whatsapp-dark' : ''}
        >
          <Users className="w-4 h-4 mr-2" />
          Usuários
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

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : activeTab === 'users' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuários ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Cadastro</TableHead>
                  {isAdmin && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const roleInfo = roleConfig[user.role];
                  const RoleIcon = roleInfo.icon;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleInfo.color}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
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
