import { useState, useCallback } from 'react';
import { ChatbotFlow, ChatbotNode, ChatbotEdge } from '@/hooks/useChatbotFlows';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Save, Plus, Trash2, MessageSquare, HelpCircle,
  GitBranch, Clock, ArrowRight, Users, Send, Bot, Zap,
  CheckCircle2, XCircle, GripVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const nodeTypes: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  start: { label: 'Início', icon: Zap, color: 'border-green-500 bg-green-500/10' },
  message: { label: 'Mensagem', icon: MessageSquare, color: 'border-blue-500 bg-blue-500/10' },
  question: { label: 'Pergunta', icon: HelpCircle, color: 'border-purple-500 bg-purple-500/10' },
  condition: { label: 'Condição', icon: GitBranch, color: 'border-yellow-500 bg-yellow-500/10' },
  action: { label: 'Ação', icon: Zap, color: 'border-orange-500 bg-orange-500/10' },
  delay: { label: 'Aguardar', icon: Clock, color: 'border-cyan-500 bg-cyan-500/10' },
  transfer: { label: 'Transferir', icon: Users, color: 'border-pink-500 bg-pink-500/10' },
  end: { label: 'Fim', icon: CheckCircle2, color: 'border-red-500 bg-red-500/10' },
};

interface Props {
  flow: ChatbotFlow;
  onSave: (nodes: ChatbotNode[], edges: ChatbotEdge[]) => void;
  onClose: () => void;
}

export function ChatbotFlowEditor({ flow, onSave, onClose }: Props) {
  const [nodes, setNodes] = useState<ChatbotNode[]>(
    Array.isArray(flow.nodes) ? flow.nodes : []
  );
  const [edges, setEdges] = useState<ChatbotEdge[]>(
    Array.isArray(flow.edges) ? flow.edges : []
  );
  const [selectedNode, setSelectedNode] = useState<ChatbotNode | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [editingNode, setEditingNode] = useState<ChatbotNode | null>(null);

  const addNode = useCallback((type: ChatbotNode['type']) => {
    const newNode: ChatbotNode = {
      id: `node-${Date.now()}`,
      type,
      data: {
        label: nodeTypes[type]?.label || type,
        content: '',
        options: type === 'question' ? ['Opção 1', 'Opção 2'] : undefined,
        delaySeconds: type === 'delay' ? 5 : undefined,
      },
      position: { x: 250, y: nodes.length * 120 + 100 },
    };

    setNodes(prev => [...prev, newNode]);
    setShowAddNode(false);

    // Auto-connect to last node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setEdges(prev => [...prev, {
        id: `edge-${Date.now()}`,
        source: lastNode.id,
        target: newNode.id,
      }]);
    }
  }, [nodes]);

  const updateNode = useCallback((updated: ChatbotNode) => {
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setEditingNode(null);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  }, [selectedNode]);

  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const exists = edges.some(e => e.source === sourceId && e.target === targetId);
    if (exists) return;
    setEdges(prev => [...prev, {
      id: `edge-${Date.now()}`,
      source: sourceId,
      target: targetId,
    }]);
  }, [edges]);

  const removeEdge = useCallback((edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-secondary/30 bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-display font-bold text-foreground flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              {flow.name}
            </h2>
            <p className="text-xs text-muted-foreground">{nodes.length} nós · {edges.length} conexões</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAddNode(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Nó
          </Button>
          <Button onClick={() => onSave(nodes, edges)} className="gap-2">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex">
        {/* Flow Canvas */}
        <ScrollArea className="flex-1 p-6">
          <div className="min-h-full space-y-3">
            <AnimatePresence mode="popLayout">
              {nodes.map((node, index) => {
                const config = nodeTypes[node.type] || nodeTypes.message;
                const NodeIcon = config.icon;
                const outEdges = edges.filter(e => e.source === node.id);
                const isSelected = selectedNode?.id === node.id;

                return (
                  <motion.div
                    key={node.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-start gap-3"
                  >
                    {/* Step indicator */}
                    <div className="flex flex-col items-center pt-4">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2',
                        config.color
                      )}>
                        {index + 1}
                      </div>
                      {index < nodes.length - 1 && (
                        <div className="w-0.5 h-8 bg-secondary/50 mt-1" />
                      )}
                    </div>

                    {/* Node Card */}
                    <Card
                      className={cn(
                        'flex-1 max-w-xl cursor-pointer transition-all border-2',
                        config.color,
                        isSelected && 'ring-2 ring-primary'
                      )}
                      onClick={() => setSelectedNode(node)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <NodeIcon className="w-4 h-4" />
                            <span className="font-medium text-sm text-foreground">{node.data.label}</span>
                            <Badge variant="outline" className="text-xs">{config.label}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              aria-label="Editar nó"
                              onClick={e => { e.stopPropagation(); setEditingNode(node); }}>
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                            {node.type !== 'start' && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                onClick={e => { e.stopPropagation(); removeNode(node.id); }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {node.data.content && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{node.data.content}</p>
                        )}

                        {node.data.options && node.data.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {node.data.options.map((opt, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                            ))}
                          </div>
                        )}

                        {node.data.delaySeconds && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Aguardar {node.data.delaySeconds}s
                          </p>
                        )}

                        {outEdges.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <ArrowRight className="w-3 h-3" />
                            {outEdges.map(e => {
                              const target = nodes.find(n => n.id === e.target);
                              return (
                                <Badge key={e.id} variant="outline" className="text-xs cursor-pointer"
                                  onClick={ev => { ev.stopPropagation(); removeEdge(e.id); }}>
                                  → {target?.data.label || '?'}
                                  <XCircle className="w-2.5 h-2.5 ml-1" />
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {nodes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Bot className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-medium">Fluxo vazio</p>
                <p className="text-sm mb-4">Adicione nós para construir o fluxo</p>
                <Button variant="outline" onClick={() => setShowAddNode(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Nó
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Connection Panel */}
        {selectedNode && (
          <div className="w-64 border-l border-secondary/30 p-4 bg-secondary/5">
            <h3 className="font-semibold text-sm text-foreground mb-3">Conectar a:</h3>
            <div className="space-y-1">
              {nodes.filter(n => n.id !== selectedNode.id).map(n => {
                const isConnected = edges.some(e => e.source === selectedNode.id && e.target === n.id);
                return (
                  <Button
                    key={n.id}
                    variant={isConnected ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      if (isConnected) {
                        const edge = edges.find(e => e.source === selectedNode.id && e.target === n.id);
                        if (edge) removeEdge(edge.id);
                      } else {
                        connectNodes(selectedNode.id, n.id);
                      }
                    }}
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    {n.data.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Node Dialog */}
      <Dialog open={showAddNode} onOpenChange={setShowAddNode}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Nó</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(nodeTypes).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  variant="outline"
                  className={cn('h-auto p-3 flex flex-col items-center gap-1 border-2', config.color)}
                  onClick={() => addNode(type as ChatbotNode['type'])}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{config.label}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Node Dialog */}
      <Dialog open={!!editingNode} onOpenChange={() => setEditingNode(null)}>
        <DialogContent className="sm:max-w-md">
          {editingNode && (
            <>
              <DialogHeader>
                <DialogTitle>Editar Nó: {editingNode.data.label}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={editingNode.data.label}
                    onChange={e => setEditingNode({
                      ...editingNode,
                      data: { ...editingNode.data, label: e.target.value }
                    })}
                  />
                </div>
                {(editingNode.type === 'message' || editingNode.type === 'question') && (
                  <div>
                    <Label>Conteúdo da mensagem</Label>
                    <Textarea
                      value={editingNode.data.content || ''}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        data: { ...editingNode.data, content: e.target.value }
                      })}
                      rows={3}
                    />
                  </div>
                )}
                {editingNode.type === 'question' && (
                  <div>
                    <Label>Opções (uma por linha)</Label>
                    <Textarea
                      value={(editingNode.data.options || []).join('\n')}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        data: { ...editingNode.data, options: e.target.value.split('\n').filter(Boolean) }
                      })}
                      rows={3}
                    />
                  </div>
                )}
                {editingNode.type === 'delay' && (
                  <div>
                    <Label>Tempo de espera (segundos)</Label>
                    <Input
                      type="number"
                      value={editingNode.data.delaySeconds || 5}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        data: { ...editingNode.data, delaySeconds: Number(e.target.value) }
                      })}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingNode(null)}>Cancelar</Button>
                <Button onClick={() => updateNode(editingNode)}>Salvar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
