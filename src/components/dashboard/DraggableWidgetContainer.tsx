import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Eye, EyeOff, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { DashboardWidget } from '@/hooks/useDashboardWidgets';
import React from 'react';

interface DraggableWidgetContainerProps {
  widgets: DashboardWidget[];
  visibleWidgets: DashboardWidget[];
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
  onToggleVisibility: (widgetId: string) => void;
  onReset: () => void;
  children: React.ReactNode;
  renderWidget: (widget: DashboardWidget) => React.ReactNode;
}

export function DraggableWidgetContainer({
  widgets,
  visibleWidgets,
  isEditMode,
  setIsEditMode,
  onReorder,
  onToggleVisibility,
  onReset,
  renderWidget,
}: DraggableWidgetContainerProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    onReorder(sourceIndex, destinationIndex);
  };

  return (
    <div className="space-y-4">
      {/* Edit Mode Controls */}
      <div className="flex items-center justify-end gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Configurar Widgets
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Configurar Dashboard</SheetTitle>
              <SheetDescription>
                Arraste para reordenar e ative/desative widgets
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Modo de edição</span>
                <Switch
                  checked={isEditMode}
                  onCheckedChange={setIsEditMode}
                />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Widgets</h4>
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      {widget.visible ? (
                        <Eye className="w-4 h-4 text-success" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{widget.title}</span>
                    </div>
                    <Switch
                      checked={widget.visible}
                      onCheckedChange={() => onToggleVisibility(widget.id)}
                    />
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar Padrão
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Draggable Widgets */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={cn(
                "space-y-6 transition-all duration-300",
                snapshot.isDraggingOver && "bg-primary/5 rounded-xl p-4 -m-4"
              )}
            >
              <AnimatePresence mode="popLayout">
                {visibleWidgets.map((widget, index) => (
                  <Draggable
                    key={widget.id}
                    draggableId={widget.id}
                    index={index}
                    isDragDisabled={!isEditMode}
                  >
                    {(provided, snapshot) => (
                      <motion.div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "relative group",
                          snapshot.isDragging && "z-50"
                        )}
                      >
                        {/* Drag Handle Overlay */}
                        {isEditMode && (
                          <div
                            className="absolute -left-10 top-1/2 -translate-y-1/2 z-10"
                            {...provided.dragHandleProps}
                          >
                            <div className="p-2 rounded-lg bg-primary/10 text-primary cursor-grab active:cursor-grabbing hover:bg-primary/20 transition-colors">
                              <GripVertical className="w-5 h-5" />
                            </div>
                          </div>
                        )}

                        {/* Widget Container */}
                        <div
                          className={cn(
                            "transition-all duration-300",
                            isEditMode && "ring-2 ring-dashed ring-primary/30 rounded-xl",
                            snapshot.isDragging && "ring-primary shadow-2xl scale-[1.02]"
                          )}
                        >
                          {/* Edit Mode Badge */}
                          {isEditMode && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute -top-2 -right-2 z-20"
                            >
                              <Badge variant="secondary" className="text-xs">
                                {widget.title}
                              </Badge>
                            </motion.div>
                          )}

                          {renderWidget(widget)}
                        </div>
                      </motion.div>
                    )}
                  </Draggable>
                ))}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
