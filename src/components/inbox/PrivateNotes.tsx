import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StickyNote, Plus, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Note {
  id: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
  };
  createdAt: Date;
}

interface PrivateNotesProps {
  contactId: string;
}

const mockNotes: Note[] = [
  {
    id: '1',
    content: 'Cliente solicitou desconto especial - verificar com gerente antes de aprovar.',
    author: { name: 'João Silva', avatar: 'https://i.pravatar.cc/150?img=10' },
    createdAt: new Date('2024-12-14T10:30:00'),
  },
  {
    id: '2',
    content: 'Preferência por pagamento via PIX. Já enviou comprovante anteriormente.',
    author: { name: 'Maria Santos', avatar: 'https://i.pravatar.cc/150?img=11' },
    createdAt: new Date('2024-12-13T15:45:00'),
  },
];

export function PrivateNotes({ contactId }: PrivateNotesProps) {
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        content: newNote.trim(),
        author: { name: 'Você', avatar: 'https://i.pravatar.cc/150?img=12' },
        createdAt: new Date(),
      };
      setNotes([note, ...notes]);
      setNewNote('');
      setIsAdding(false);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <StickyNote className="w-4 h-4" />
          <span>Notas Privadas</span>
        </div>
        {!isAdding && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Nova nota
            </Button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Textarea
              placeholder="Adicione uma nota privada (visível apenas para atendentes)..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewNote('');
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="bg-whatsapp hover:bg-whatsapp-dark"
              >
                <Send className="w-3 h-3 mr-1" />
                Salvar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="group p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground flex-1">{note.content}</p>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </motion.button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={note.author.avatar} />
                  <AvatarFallback className="text-[8px]">
                    {note.author.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground">
                  {note.author.name} • {format(note.createdAt, "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {notes.length === 0 && !isAdding && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma nota adicionada
          </p>
        )}
      </div>
    </div>
  );
}
