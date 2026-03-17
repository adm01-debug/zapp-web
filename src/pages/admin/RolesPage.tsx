import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, UserPlus, Trash2, Search, Loader2, Crown, Eye, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { PermissionMatrix } from '@/components/permissions/PermissionMatrix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  user_id: string;
  role: 'admin' | 'supervisor' | 'agent';
  profile?: {
    name: string;
    email: string | null;
    avatar_url: string | null;
  };
}

const ROLE_CONFIG = {
  admin: { 
    label: 'Administrador', 
    icon: Crown,
    color: 'bg-destructive/10 text-red-800 dark:bg-red-900/30 dark:text-destructive',
    description: 'Acesso total ao sistema'
  },
  supervisor: { 
    label: 'Supervisor', 
    icon: Eye,
    color: 'bg-info/10 text-blue-800 dark:bg-blue-900/30 dark:text-info',
    description: 'Gerencia equipes e relatórios'
  },
  agent: { 
    label: 'Agente', 
    icon: Headphones,
    color: 'bg-success/10 text-green-800 dark:bg-green-900/30 dark:text-success',
    description: 'Atendimento ao cliente'
  }
};

export default function RolesPage() {
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'supervisor' | 'agent'>('agent');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [userToRemove, setUserToRemove] = useState<UserWithRole | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        role,
        profiles!user_roles_user_id_fkey (
          name,
          email,
          avatar_url
        )
      `)
      .order('role');

    if (!error && data) {
      const mapped = data.map(u => ({
        id: u.id,
        user_id: u.user_id,
        role: u.role as 'admin' | 'supervisor' | 'agent',
        profile: Array.isArray(u.profiles) ? u.profiles[0] : u.profiles
      }));
      setUsers(mapped);
    }
    setLoading(false);
  };

  const fetchAvailableUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .order('name');

    if (data) {
      // Filter out users who already have roles
      const usersWithRoles = users.map(u => u.user_id);
      setAvailableUsers(data.filter(u => !usersWithRoles.includes(u.user_id)));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      fetchAvailableUsers();
    }
  }, [showAddDialog, users]);

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) return;

    setUpdating(true);
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: selectedUser, role: selectedRole });

    if (error) {
      toast.error('Erro ao adicionar role');
    } else {
      toast.success('Role adicionada com sucesso');
      setShowAddDialog(false);
      setSelectedUser('');
      fetchUsers();
    }
    setUpdating(false);
  };

  const handleRemoveRole = async () => {
    if (!userToRemove) return;

    setUpdating(true);
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', userToRemove.id);

    if (error) {
      toast.error('Erro ao remover role');
    } else {
      toast.success('Role removida com sucesso');
      setUserToRemove(null);
      fetchUsers();
    }
    setUpdating(false);
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'supervisor' | 'agent') => {
    setUpdating(true);
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast.error('Erro ao atualizar role');
    } else {
      toast.success('Role atualizada');
      fetchUsers();
    }
    setUpdating(false);
  };

  const filteredUsers = users.filter(u => 
    u.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.profile?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedUsers = {
    admin: filteredUsers.filter(u => u.role === 'admin'),
    supervisor: filteredUsers.filter(u => u.role === 'supervisor'),
    agent: filteredUsers.filter(u => u.role === 'agent')
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles e Permissões</h1>
          <p className="text-muted-foreground">Gerencie os níveis de acesso do sistema</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Atribuir Role
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="w-4 h-4 mr-2" />
            Permissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                const roleUsers = groupedUsers[role as keyof typeof groupedUsers];
                const Icon = config.icon;

                return (
                  <Card key={role}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{config.label}</CardTitle>
                          <CardDescription className="text-xs">{config.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="w-fit">
                        {roleUsers.length} usuário{roleUsers.length !== 1 ? 's' : ''}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {roleUsers.map((user) => (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium">
                                  {user.profile?.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {user.profile?.name || 'Sem nome'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.profile?.email}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToRemove(user)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {roleUsers.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum usuário com esta role
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <PermissionMatrix />
        </TabsContent>
      </Tabs>

      {/* Add Role Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Role</DialogTitle>
            <DialogDescription>
              Selecione um usuário e a role que deseja atribuir
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuário</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRole} disabled={!selectedUser || updating}>
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Role Confirmation */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a role de{' '}
              <strong>{userToRemove?.profile?.name}</strong>? O usuário perderá acesso às funcionalidades desta role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRole}
              disabled={updating}
              className="bg-destructive hover:bg-destructive/90"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
