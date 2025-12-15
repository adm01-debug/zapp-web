import { useState } from 'react';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tag,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagItem {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

const mockTags: TagItem[] = [
  { id: '1', name: 'VIP', color: '#3b82f6', contactCount: 45 },
  { id: '2', name: 'Cliente Ativo', color: '#22c55e', contactCount: 230 },
  { id: '3', name: 'Lead Quente', color: '#eab308', contactCount: 78 },
  { id: '4', name: 'Inadimplente', color: '#ef4444', contactCount: 12 },
  { id: '5', name: 'Sem Resposta', color: '#6b7280', contactCount: 156 },
  { id: '6', name: 'Prospect', color: '#8b5cf6', contactCount: 89 },
  { id: '7', name: 'Empresa', color: '#06b6d4', contactCount: 34 },
  { id: '8', name: 'Orçamento Pendente', color: '#f97316', contactCount: 67 },
];

export function TagsView() {
  const [tags, setTags] = useState<TagItem[]>(mockTags);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: COLORS[0] });

  const handleAddTag = () => {
    if (newTag.name) {
      const tag: TagItem = {
        id: Date.now().toString(),
        name: newTag.name,
        color: newTag.color,
        contactCount: 0,
      };
      setTags([...tags, tag]);
      setNewTag({ name: '', color: COLORS[0] });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditTag = () => {
    if (editingTag) {
      setTags(tags.map((t) => (t.id === editingTag.id ? editingTag : t)));
      setEditingTag(null);
    }
  };

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter((t) => t.id !== id));
  };

  const TagForm = ({ tag, setTag, onSubmit, isEdit }: {
    tag: { name: string; color: string };
    setTag: (tag: { name: string; color: string }) => void;
    onSubmit: () => void;
    isEdit?: boolean;
  }) => (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="tagName">Nome da etiqueta</Label>
        <Input
          id="tagName"
          placeholder="Ex: VIP, Lead Quente..."
          value={tag.name}
          onChange={(e) => setTag({ ...tag, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <motion.button
              key={color}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setTag({ ...tag, color })}
              className={cn(
                'w-8 h-8 rounded-full transition-all',
                tag.color === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
        <span className="text-sm font-medium">{tag.name || 'Preview'}</span>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => (isEdit ? setEditingTag(null) : setIsAddDialogOpen(false))}
        >
          Cancelar
        </Button>
        <Button onClick={onSubmit} className="bg-whatsapp hover:bg-whatsapp-dark">
          {isEdit ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Etiquetas</h1>
          <p className="text-muted-foreground">
            Organize seus contatos e conversas com etiquetas personalizadas
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="bg-whatsapp hover:bg-whatsapp-dark text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Etiqueta
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Etiqueta</DialogTitle>
            </DialogHeader>
            <TagForm
              tag={newTag}
              setTag={setNewTag}
              onSubmit={handleAddTag}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Etiqueta</DialogTitle>
          </DialogHeader>
          {editingTag && (
            <TagForm
              tag={editingTag}
              setTag={(tag) => setEditingTag({ ...editingTag, ...tag })}
              onSubmit={handleEditTag}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Etiquetas', value: tags.length },
          { label: 'Contatos Etiquetados', value: tags.reduce((sum, t) => sum + t.contactCount, 0) },
          { label: 'Mais Usada', value: tags.sort((a, b) => b.contactCount - a.contactCount)[0]?.name || '-' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tags Grid */}
      <StaggeredList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((tag) => (
          <StaggeredItem key={tag.id}>
            <motion.div
              whileHover={{ y: -4, boxShadow: '0 8px 30px hsl(var(--primary) / 0.1)' }}
            >
              <Card className="cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${tag.color}20` }}
                      >
                        <Tag className="w-5 h-5" style={{ color: tag.color }} />
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <h3 className="font-semibold">{tag.name}</h3>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{tag.contactCount} contatos</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button variant="ghost" size="icon" className="w-8 h-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTag(tag)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </StaggeredItem>
        ))}
      </StaggeredList>
    </div>
  );
}
