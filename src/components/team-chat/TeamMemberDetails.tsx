import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  X, Phone, Mail, Briefcase, Building2, Cake, Calendar,
  ChevronDown, Shield, Clock, MessageSquare, User, Users,
  ChevronsDownUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInYears, isSameDay, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TeamConversation } from '@/hooks/useTeamChat';

interface TeamMemberDetailsProps {
  conversation: TeamConversation;
  onClose: () => void;
}

interface MemberProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string;
  birthday: string | null;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

function getBirthdayInfo(birthday: string | null) {
  if (!birthday) return null;
  const date = new Date(birthday);
  const today = new Date();
  const age = differenceInYears(today, date);
  
  // Next birthday
  let nextBirthday = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (nextBirthday < today && !isSameDay(nextBirthday, today)) {
    nextBirthday = addYears(nextBirthday, 1);
  }
  
  const isToday = isSameDay(nextBirthday, today);
  const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  return { date, age, isToday, daysUntil };
}

function getRoleBadge(role: string | null) {
  const map: Record<string, { label: string; className: string }> = {
    admin: { label: 'Admin', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    supervisor: { label: 'Supervisor', className: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
    agent: { label: 'Agente', className: 'bg-primary/10 text-primary border-primary/20' },
  };
  return map[role || ''] || { label: role || 'Membro', className: 'bg-muted text-muted-foreground' };
}

function SectionHeader({ icon: Icon, label, open, onToggle }: { icon: React.ElementType; label: string; open: boolean; onToggle: () => void }) {
  return (
    <CollapsibleTrigger
      onClick={onToggle}
      className="flex items-center gap-2 w-full py-2.5 px-4 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="flex-1 text-left uppercase tracking-wider">{label}</span>
      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
    </CollapsibleTrigger>
  );
}

export function TeamMemberDetails({ conversation, onClose }: TeamMemberDetailsProps) {
  const { profile } = useAuth();
  const [sections, setSections] = useState({
    info: true,
    team: false,
    activity: false,
  });

  const toggleAll = () => {
    const allClosed = !sections.info && !sections.team && !sections.activity;
    setSections({ info: allClosed, team: allClosed, activity: allClosed });
  };

  // For direct chats, get the other member's profile (exclude current user)
  const otherMemberId = conversation.type === 'direct'
    ? conversation.members?.find(m => m.profile_id !== profile?.id)?.profile_id
    : null;

  // Fetch full profile data (including birthday, department, etc.)
  const { data: memberProfile, isLoading } = useQuery({
    queryKey: ['team-member-profile', otherMemberId || conversation.id],
    queryFn: async () => {
      if (conversation.type === 'direct' && otherMemberId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, phone, avatar_url, job_title, department, role, is_active, created_at, birthday')
          .eq('id', otherMemberId)
          .single();
        if (error) throw error;
        return data as MemberProfile;
      }
      return null;
    },
    enabled: conversation.type === 'direct' && !!otherMemberId,
  });

  // For groups, fetch all member profiles
  const memberIds = conversation.members?.map(m => m.profile_id) || [];
  const { data: groupMembers = [] } = useQuery({
    queryKey: ['team-group-members', conversation.id, memberIds.join(',')],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, avatar_url, job_title, department, role, is_active, created_at, birthday')
        .in('id', memberIds);
      if (error) throw error;
      return (data || []) as MemberProfile[];
    },
    enabled: conversation.type === 'group' && memberIds.length > 0,
  });

  const birthdayInfo = memberProfile ? getBirthdayInfo(memberProfile.birthday) : null;
  const roleBadge = memberProfile ? getRoleBadge(memberProfile.role) : null;

  return (
    <div className="w-[300px] border-l border-border flex flex-col bg-card h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <span className="w-1 h-4 bg-primary rounded-full" />
          {conversation.type === 'direct' ? 'Detalhes do Colaborador' : 'Detalhes do Grupo'}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleAll} title="Recolher/Expandir">
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Profile header */}
        {conversation.type === 'direct' ? (
          <div className="flex flex-col items-center py-6 px-4">
            {isLoading ? (
              <>
                <Skeleton className="h-20 w-20 rounded-full mb-3" />
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : memberProfile ? (
              <>
                <div className="relative mb-3">
                  <Avatar className="h-20 w-20 ring-2 ring-border">
                    <AvatarImage src={memberProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {memberProfile.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {memberProfile.is_active && (
                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-card" />
                  )}
                  {birthdayInfo?.isToday && (
                    <div className="absolute -top-1 -right-1 text-lg" title="Aniversário hoje!">🎂</div>
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground">{memberProfile.name}</h3>
                {memberProfile.job_title && (
                  <p className="text-xs text-muted-foreground mt-0.5">{memberProfile.job_title}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {roleBadge && (
                    <Badge variant="outline" className={cn('text-[10px] px-2', roleBadge.className)}>
                      <Shield className="w-2.5 h-2.5 mr-1" />
                      {roleBadge.label}
                    </Badge>
                  )}
                  {memberProfile.is_active ? (
                    <Badge variant="outline" className="text-[10px] px-2 bg-success/10 text-success border-success/20">
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-2">
                      Offline
                    </Badge>
                  )}
                </div>

                {/* Birthday banner */}
                {birthdayInfo && (
                  <div className={cn(
                    'mt-3 w-full rounded-lg px-3 py-2 text-center',
                    birthdayInfo.isToday
                      ? 'bg-chart-4/10 border border-chart-4/20'
                      : 'bg-muted/50'
                  )}>
                    <div className="flex items-center justify-center gap-1.5 text-xs">
                      <Cake className="w-3.5 h-3.5" />
                      {birthdayInfo.isToday ? (
                        <span className="font-semibold text-chart-4">🎉 Aniversário hoje! {birthdayInfo.age} anos</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {format(birthdayInfo.date, "dd 'de' MMMM", { locale: ptBR })} ({birthdayInfo.age} anos)
                          {birthdayInfo.daysUntil <= 30 && birthdayInfo.daysUntil > 0 && (
                            <span className="text-chart-4 ml-1">• em {birthdayInfo.daysUntil} dias</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : (
          /* Group header */
          <div className="flex flex-col items-center py-6 px-4">
            <Avatar className="h-20 w-20 mb-3 ring-2 ring-border">
              <AvatarImage src={conversation.avatar_url || undefined} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                <Users className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <h3 className="text-base font-bold text-foreground">{conversation.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {conversation.members?.length || 0} membros
            </p>
          </div>
        )}

        {/* Sections */}
        {conversation.type === 'direct' && memberProfile && (
          <Collapsible open={sections.info} onOpenChange={(o) => setSections(s => ({ ...s, info: o }))}>
            <SectionHeader icon={User} label="Informações" open={sections.info} onToggle={() => setSections(s => ({ ...s, info: !s.info }))} />
            <CollapsibleContent>
              <div className="px-4 pb-3">
                <InfoRow icon={Mail} label="Email" value={memberProfile.email} />
                <InfoRow icon={Phone} label="Telefone" value={memberProfile.phone} />
                <InfoRow icon={Briefcase} label="Cargo" value={memberProfile.job_title} />
                <InfoRow icon={Building2} label="Departamento" value={memberProfile.department} />
                <InfoRow icon={Cake} label="Aniversário" value={
                  memberProfile.birthday
                    ? format(new Date(memberProfile.birthday), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : null
                } />
                <InfoRow icon={Calendar} label="Membro desde" value={
                  format(new Date(memberProfile.created_at), "dd/MM/yyyy", { locale: ptBR })
                } />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Group members */}
        {conversation.type === 'group' && (
          <Collapsible open={sections.team} onOpenChange={(o) => setSections(s => ({ ...s, team: o }))}>
            <SectionHeader icon={Users} label={`Membros (${groupMembers.length})`} open={sections.team} onToggle={() => setSections(s => ({ ...s, team: !s.team }))} />
            <CollapsibleContent>
              <div className="px-2 pb-3 space-y-0.5">
                {groupMembers.map(member => {
                  const mBirthday = getBirthdayInfo(member.birthday);
                  const mRole = getRoleBadge(member.role);
                  return (
                    <div key={member.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-muted">
                            {member.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {member.is_active && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                        )}
                        {mBirthday?.isToday && (
                          <div className="absolute -top-1 -right-1 text-xs">🎂</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {member.job_title || mRole.label}
                          </span>
                          {mBirthday && mBirthday.daysUntil <= 7 && mBirthday.daysUntil > 0 && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0 bg-chart-4/10 text-chart-4 border-chart-4/20">
                              🎂 {mBirthday.daysUntil}d
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Upcoming birthdays (group) */}
        {conversation.type === 'group' && groupMembers.length > 0 && (
          <Collapsible open={sections.activity} onOpenChange={(o) => setSections(s => ({ ...s, activity: o }))}>
            <SectionHeader icon={Cake} label="Próximos Aniversários" open={sections.activity} onToggle={() => setSections(s => ({ ...s, activity: !s.activity }))} />
            <CollapsibleContent>
              <div className="px-4 pb-3 space-y-2">
                {groupMembers
                  .filter(m => m.birthday)
                  .map(m => ({ ...m, bInfo: getBirthdayInfo(m.birthday)! }))
                  .sort((a, b) => a.bInfo.daysUntil - b.bInfo.daysUntil)
                  .slice(0, 5)
                  .map(member => (
                    <div key={member.id} className="flex items-center gap-2.5 text-sm">
                      <Cake className={cn(
                        'w-3.5 h-3.5 shrink-0',
                        member.bInfo.isToday ? 'text-chart-4' : 'text-muted-foreground'
                      )} />
                      <span className="truncate flex-1">{member.name}</span>
                      <span className={cn(
                        'text-[10px] shrink-0',
                        member.bInfo.isToday ? 'text-chart-4 font-semibold' : 'text-muted-foreground'
                      )}>
                        {member.bInfo.isToday
                          ? '🎉 Hoje!'
                          : `${format(member.bInfo.date, 'dd/MM')} (${member.bInfo.daysUntil}d)`
                        }
                      </span>
                    </div>
                  ))
                }
                {groupMembers.filter(m => m.birthday).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum aniversário cadastrado</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </ScrollArea>
    </div>
  );
}