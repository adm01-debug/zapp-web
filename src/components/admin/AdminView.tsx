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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield, Users, Search, Crown, UserCog, User, History, RefreshCw,
  Edit, UserX, UserCheck, UserPlus, Briefcase, Building, Phone,
  Lock, Eye, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { ForceLogoutButton } from './ForceLogoutButton';
import { AdminCRMDashboard } from './AdminCRMDashboard';
import { useAdminData, accessLevelConfig, type UserWithRole } from './useAdminData';

const roleIconMap = { admin: Crown, supervisor: UserCog, agent: User, special_agent: Eye } as const;
const roleLabelMap = { admin: 'Administrador', supervisor: 'Supervisor', agent: 'Atendente', special_agent: 'Agente Especial' } as const;
const roleColorMap = { admin: 'text-warning', supervisor: 'text-info', agent: 'text-muted-foreground', special_agent: 'text-accent-foreground' } as const;

export function AdminView() {
  const { isAdmin, isSupervisor, loading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'crm'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [savingUser, setSavingUser] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({ name: '', nickname: '', signature: '', jobTitle: '', email: '', password: '', role: 'agent' as AppRole, gmail: '', dropboxEmail: '' });
  const [newUserAvatarFile, setNewUserAvatarFile] = useState<File | null>(null);
  const [newUserGoogleServices, setNewUserGoogleServices] = useState({ google_sheets: false, google_docs: false, google_calendar: false, google_drive: false });
  const [creatingUser, setCreatingUser] = useState(false);

  const { users, auditLogs, loading, fetchData, handleRoleChange, handleToggleActive, handleSaveUser, handleCreateUser } = useAdminData(activeTab);

  useEffect(() => {
    if (isSupervisor) fetchData();
  }, [isSupervisor, activeTab, fetchData]);

  const onSaveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    const ok = await handleSaveUser(editingUser, editAvatarFile);
    setSavingUser(false);
    if (ok) { setIsEditDialogOpen(false); setEditingUser(null); setEditAvatarFile(null); }
  };

  const onCreateUser = async () => {
    setCreatingUser(true);
    const ok = await handleCreateUser({
      name: newUser.name, nickname: newUser.nickname || undefined, signature: newUser.signature || undefined,
      job_title: newUser.jobTitle || undefined, avatarFile: newUserAvatarFile, email: newUser.email,
      password: newUser.password, role: newUser.role, gmail_email: newUser.gmail || undefined,
      google_services: Object.entries(newUserGoogleServices).filter(([, v]) => v).map(([k]) => k),
      dropbox_email: newUser.dropboxEmail || undefined,
    });
    setCreatingUser(false);
    if (ok) {
      setIsAddDialogOpen(false);
      setNewUser({ name: '', nickname: '', signature: '', jobTitle: '', email: '', password: '', role: 'agent', gmail: '', dropboxEmail: '' });
      setNewUserAvatarFile(null);
      setNewUserGoogleServices({ google_sheets: false, google_docs: false, google_calendar: false, google_drive: false });
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = auditLogs.filter(l =>
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-whatsapp" /> Administração
          </h1>
          <p className="text-muted-foreground">Gerencie usuários, permissões e visualize logs de auditoria</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-whatsapp hover:bg-whatsapp-dark">
              <UserPlus className="w-4 h-4 mr-2" /> Adicionar Usuário
            </Button>
          )}
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([['users', Users, `Usuários (${users.length})`], ['audit', History, 'Auditoria'], ['crm', Building, 'CRM 360°']] as const).map(([tab, Icon, label]) => (
          <Button key={tab} variant={activeTab === tab ? 'default' : 'outline'} onClick={() => setActiveTab(tab as 'users' | 'audit' | 'crm')}
            className={activeTab === tab ? 'bg-whatsapp hover:bg-whatsapp-dark' : ''}>
            <Icon className="w-4 h-4 mr-2" /> {label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={activeTab === 'users' ? 'Buscar usuários...' : 'Buscar logs...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={editAvatarFile ? URL.createObjectURL(editAvatarFile) : (editingUser.avatar_url || undefined)} />
                  <AvatarFallback className="text-lg">{editingUser.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{editingUser.name}</p>
                  <p className="text-muted-foreground">{editingUser.email}</p>
                  <Label htmlFor="edit_avatar" className="text-xs text-primary cursor-pointer hover:underline mt-1 inline-block">Alterar foto</Label>
                  <Input id="edit_avatar" type="file" accept="image/*" className="hidden" onChange={(e) => setEditAvatarFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Apelido</Label>
                  <Input placeholder="Ex: Joãozinho" value={editingUser.nickname || ''} onChange={(e) => setEditingUser({ ...editingUser, nickname: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input placeholder="Ex: Atendente Senior" value={editingUser.job_title || ''} onChange={(e) => setEditingUser({ ...editingUser, job_title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input placeholder="Ex: Vendas" value={editingUser.department || ''} onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assinatura</Label>
                <Input placeholder="Ex: João Silva - Suporte Técnico" value={editingUser.signature || ''} onChange={(e) => setEditingUser({ ...editingUser, signature: e.target.value })} />
                <p className="text-xs text-muted-foreground">Texto usado como assinatura em mensagens</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={editingUser.phone || ''} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Limite de Chats</Label>
                  <Input type="number" min={1} max={50} value={editingUser.max_chats || 5} onChange={(e) => setEditingUser({ ...editingUser, max_chats: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nível de Acesso</Label>
                  <Select value={editingUser.access_level || 'basic'} onValueChange={(v) => setEditingUser({ ...editingUser, access_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(accessLevelConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div><span className="font-medium">{config.label}</span><p className="text-xs text-muted-foreground">{config.description}</p></div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Permitir Download</Label>
                  <p className="text-xs text-muted-foreground">Habilita download de arquivos e imagens para este usuário</p>
                </div>
                <Switch
                  checked={editingUser.can_download ?? false}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, can_download: checked })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={onSaveUser} disabled={savingUser} className="bg-whatsapp hover:bg-whatsapp-dark">
                  {savingUser && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2"><Label>Primeiro Nome *</Label><Input placeholder="Ex: João" value={newUser.name} onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Apelido</Label><Input placeholder="Ex: Joãozinho" value={newUser.nickname} onChange={(e) => setNewUser(p => ({ ...p, nickname: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Cargo</Label><Input placeholder="Ex: Atendente Senior" value={newUser.jobTitle} onChange={(e) => setNewUser(p => ({ ...p, jobTitle: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Assinatura</Label>
              <Input placeholder="Ex: João Silva - Suporte" value={newUser.signature} onChange={(e) => setNewUser(p => ({ ...p, signature: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Texto usado como assinatura em mensagens e e-mails.</p>
            </div>
            <div className="space-y-2">
              <Label>Foto (opcional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setNewUserAvatarFile(e.target.files?.[0] || null)} />
              {newUserAvatarFile && <p className="text-xs text-muted-foreground">{newUserAvatarFile.name}</p>}
            </div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="usuario@email.com" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Senha *</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser(p => ({ ...p, role: v as AppRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleIconMap) as AppRole[]).map((key) => {
                    const RIcon = roleIconMap[key];
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2"><RIcon className={`w-4 h-4 ${roleColorMap[key]}`} />{roleLabelMap[key]}</div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta Google (opcional)</Label>
              <Input type="email" placeholder="usuario@gmail.com" value={newUser.gmail} onChange={(e) => setNewUser(p => ({ ...p, gmail: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Será usada para Gmail e os serviços Google selecionados abaixo.</p>
            </div>
            {newUser.gmail && (
              <div className="space-y-3 rounded-lg border border-secondary/30 p-3">
                <Label className="text-sm font-medium">Serviços Google vinculados</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([{ key: 'google_sheets', label: 'Google Sheets' }, { key: 'google_docs', label: 'Google Docs' }, { key: 'google_calendar', label: 'Google Calendar' }, { key: 'google_drive', label: 'Google Drive' }] as const).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch checked={newUserGoogleServices[key]} onCheckedChange={(checked) => setNewUserGoogleServices(prev => ({ ...prev, [key]: checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Conta Dropbox (opcional)</Label>
              <Input type="email" placeholder="usuario@email.com" value={newUser.dropboxEmail} onChange={(e) => setNewUser(p => ({ ...p, dropboxEmail: e.target.value }))} />
              <p className="text-xs text-muted-foreground">O usuário não poderá alterar ou remover esta conta.</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={onCreateUser} disabled={creatingUser || !newUser.name || !newUser.email || !newUser.password} className="bg-whatsapp hover:bg-whatsapp-dark">
                {creatingUser && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Criar Usuário
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : activeTab === 'users' ? (
        <Card className="border border-secondary/20 bg-card">
          <CardHeader><CardTitle className="text-lg">Usuários</CardTitle></CardHeader>
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
                  const RoleIcon = roleIconMap[user.role];
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
                            {user.job_title && <div className="flex items-center gap-1 text-sm"><Briefcase className="w-3 h-3" />{user.job_title}</div>}
                            {user.department && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Building className="w-3 h-3" />{user.department}</div>}
                          </div>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select value={user.role} onValueChange={(v) => handleRoleChange(user.user_id, v as AppRole)}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="agent">Atendente</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={roleColorMap[user.role]}>
                            <RoleIcon className="w-3 h-3 mr-1" />{roleLabelMap[user.role]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs"><Lock className="w-3 h-3 mr-1" />{accessInfo?.label || 'Básico'}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active !== false ? (
                          <Badge className="bg-success/10 text-success border-success/20"><UserCheck className="w-3 h-3 mr-1" />Ativo</Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><UserX className="w-3 h-3 mr-1" />Inativo</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setEditingUser(user); setIsEditDialogOpen(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <ForceLogoutButton userId={user.user_id} userName={user.name} />
                            <Switch checked={user.is_active !== false} onCheckedChange={() => handleToggleActive(user)} />
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
      ) : activeTab === 'audit' ? (
        <Card>
          <CardHeader><CardTitle className="text-lg">Logs de Auditoria</CardTitle></CardHeader>
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
                    <TableCell className="whitespace-nowrap">{format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>{log.user?.name || 'Sistema'}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{log.entity_type || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{JSON.stringify(log.details)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : activeTab === 'crm' ? (
        <AdminCRMDashboard />
      ) : null}
    </div>
  );
}
