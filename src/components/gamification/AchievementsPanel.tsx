import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Filter, Search, Calendar, Award, Sparkles,
  ChevronDown, TrendingUp, Zap, Clock, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  useAgentGamification, 
  Achievement,
  levelProgress,
  xpForNextLevel 
} from '@/hooks/useAgentGamification';
import { AchievementBadge, AchievementBadgeMini } from './AchievementBadge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type SortOption = 'recent' | 'xp' | 'type';
type FilterOption = 'all' | 'today' | 'week' | 'month';

export function AchievementsPanel() {
  const { achievements, stats, isLoading } = useAgentGamification();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedTab, setSelectedTab] = useState('all');

  // Filter and sort achievements
  const filteredAchievements = useMemo(() => {
    let result = [...achievements];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.achievement_name.toLowerCase().includes(query) ||
        a.achievement_description?.toLowerCase().includes(query) ||
        a.achievement_type.toLowerCase().includes(query)
      );
    }

    // Time filter
    const now = new Date();
    if (filterBy === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(a => new Date(a.earned_at) >= today);
    } else if (filterBy === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(a => new Date(a.earned_at) >= weekAgo);
    } else if (filterBy === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(a => new Date(a.earned_at) >= monthAgo);
    }

    // Type filter (tab)
    if (selectedTab !== 'all') {
      result = result.filter(a => a.achievement_type === selectedTab);
    }

    // Sort
    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime());
    } else if (sortBy === 'xp') {
      result.sort((a, b) => b.xp_earned - a.xp_earned);
    } else if (sortBy === 'type') {
      result.sort((a, b) => a.achievement_type.localeCompare(b.achievement_type));
    }

    return result;
  }, [achievements, searchQuery, sortBy, filterBy, selectedTab]);

  // Group achievements by type for stats
  const achievementsByType = useMemo(() => {
    const groups: Record<string, Achievement[]> = {};
    achievements.forEach(a => {
      if (!groups[a.achievement_type]) {
        groups[a.achievement_type] = [];
      }
      groups[a.achievement_type].push(a);
    });
    return groups;
  }, [achievements]);

  // Calculate total XP from achievements
  const totalXpFromAchievements = useMemo(() => {
    return achievements.reduce((sum, a) => sum + a.xp_earned, 0);
  }, [achievements]);

  // Get unique achievement types
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(achievements.map(a => a.achievement_type)));
  }, [achievements]);

  // Check if achievement is new (within last hour)
  const isNewAchievement = (earnedAt: string) => {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(earnedAt) > hourAgo;
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Minhas Conquistas</CardTitle>
              <p className="text-sm text-muted-foreground">
                {achievements.length} conquistas desbloqueadas
              </p>
            </div>
          </div>

          {stats && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-0">
                <TrendingUp className="w-3 h-3" />
                Nv {stats.level}
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-xp/10 text-xp border-0">
                <Zap className="w-3 h-3" />
                {stats.xp.toLocaleString()} XP
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level Progress */}
        {stats && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Progresso para Nível {stats.level + 1}
              </span>
              <span className="text-xs text-muted-foreground">
                {stats.xp.toLocaleString()} / {xpForNextLevel(stats.level).toLocaleString()} XP
              </span>
            </div>
            <Progress 
              value={levelProgress(stats.xp, stats.level)} 
              className="h-2"
            />
          </motion.div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-muted/30 border border-border/30"
          >
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{achievements.length}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl bg-muted/30 border border-border/30"
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-xp" />
              <span className="text-xs text-muted-foreground">XP Ganho</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalXpFromAchievements.toLocaleString()}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-muted/30 border border-border/30"
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-teal-500" />
              <span className="text-xs text-muted-foreground">Tipos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{uniqueTypes.length}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="p-4 rounded-xl bg-muted/30 border border-border/30"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Recentes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {achievements.filter(a => isNewAchievement(a.earned_at)).length}
            </p>
          </motion.div>
        </div>

        {/* Mini badges showcase */}
        {achievements.length > 0 && (
          <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
            <h4 className="text-sm font-medium text-foreground mb-3">Últimas Conquistas</h4>
            <div className="flex flex-wrap gap-2">
              {achievements.slice(0, 10).map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AchievementBadgeMini 
                    type={achievement.achievement_type} 
                    name={achievement.achievement_name}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conquistas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                {filterBy === 'all' && 'Todas'}
                {filterBy === 'today' && 'Hoje'}
                {filterBy === 'week' && 'Última Semana'}
                {filterBy === 'month' && 'Último Mês'}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterBy('all')}>Todas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('today')}>Hoje</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('week')}>Última Semana</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('month')}>Último Mês</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                {sortBy === 'recent' && 'Mais Recentes'}
                {sortBy === 'xp' && 'Maior XP'}
                {sortBy === 'type' && 'Por Tipo'}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('recent')}>Mais Recentes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('xp')}>Maior XP</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('type')}>Por Tipo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs by type */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full flex-wrap h-auto p-1">
            <TabsTrigger value="all" className="flex-1">
              Todas ({achievements.length})
            </TabsTrigger>
            {uniqueTypes.slice(0, 5).map(type => (
              <TabsTrigger key={type} value={type} className="flex-1">
                {type.replace(/_/g, ' ')} ({achievementsByType[type]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedTab} className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <AnimatePresence mode="popLayout">
                {filteredAchievements.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                  >
                    <Trophy className="w-12 h-12 mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma conquista encontrada</p>
                    <p className="text-sm">Continue jogando para desbloquear conquistas!</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {filteredAchievements.map((achievement, index) => (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <AchievementBadge
                          type={achievement.achievement_type}
                          name={achievement.achievement_name}
                          description={achievement.achievement_description}
                          xpEarned={achievement.xp_earned}
                          earnedAt={achievement.earned_at}
                          isNew={isNewAchievement(achievement.earned_at)}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
