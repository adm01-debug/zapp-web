import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, Eye, EyeOff, RotateCcw, Settings2, 
  Maximize2, Minimize2, ChevronUp, ChevronDown, 
  ChevronLeft, ChevronRight, Grid3X3, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DashboardWidget, WidgetSize } from '@/hooks/useDashboardWidgets';
import React, { useState } from 'react';

interface DraggableWidgetContainerProps {
  widgets: DashboardWidget[];
  visibleWidgets: DashboardWidget[];
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
  onToggleVisibility: (widgetId: string) => void;
  onUpdateSize?: (widgetId: string, size: WidgetSize) => void;
  onMoveWidget?: (widgetId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  onReset: () => void;
  children?: React.ReactNode;
  renderWidget: (widget: DashboardWidget) => React.ReactNode;
}

const sizeLabels: Record<WidgetSize, string> = {
  small: 'Pequeno (1 col)',
  medium: 'Médio (2 cols)',
  large: 'Grande (3 cols)',
  full: 'Completo (4 cols)',
};

const sizeIcons: Record<WidgetSize, React.ReactNode> = {
  small: <Grid3X3 className="w-4 h-4" />,
  medium: <LayoutGrid className="w-4 h-4" />,
  large: <Maximize2 className="w-4 h-4" />,
  full: <Maximize2 className="w-5 h-5" />,
};

export function DraggableWidgetContainer({
  widgets,
  visibleWidgets,
  isEditMode,
  setIsEditMode,
  onReorder,
  onToggleVisibility,
  onUpdateSize,
  onMoveWidget,
  onReset,
  renderWidget,
}: DraggableWidgetContainerProps) {
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    onReorder(sourceIndex, destinationIndex);
  };

  const getWidgetGridClass = (widget: DashboardWidget) => {
    switch (widget.size) {
      case 'small': return 'md:col-span-1';
      case 'medium': return 'md:col-span-2';
      case 'large': return 'md:col-span-3';
      case 'full': return 'md:col-span-4';
      default: return 'md:col-span-2';
    }
  };

  return (
    <div className="space-y-4">
      {/* Edit Mode Controls */}
      <div className="flex items-center justify-end gap-2">
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Modo Edição Ativo
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Configurar Widgets
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Configurar Dashboard</SheetTitle>
              <SheetDescription>
                Arraste para reordenar, redimensione e ative/desative widgets
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Modo de edição</span>
                </div>
                <Switch
                  checked={isEditMode}
                  onCheckedChange={setIsEditMode}
                />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Widgets Disponíveis
                </h4>
                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <motion.div
                      key={widget.id}
                      layout
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                        widget.visible 
                          ? "bg-background border-border" 
                          : "bg-muted/30 border-border/50 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ scale: widget.visible ? 1 : 0.9 }}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            widget.visible ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {widget.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </motion.div>
                        <div>
                          <span className="text-sm font-medium block">{widget.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {sizeLabels[widget.size]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {onUpdateSize && widget.visible && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                {sizeIcons[widget.size]}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Tamanho</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(['small', 'medium', 'large', 'full'] as WidgetSize[]).map((size) => (
                                <DropdownMenuItem
                                  key={size}
                                  onClick={() => onUpdateSize(widget.id, size)}
                                  className={cn(
                                    widget.size === size && "bg-primary/10 text-primary"
                                  )}
                                >
                                  <span className="mr-2">{sizeIcons[size]}</span>
                                  {sizeLabels[size]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <Switch
                          checked={widget.visible}
                          onCheckedChange={() => onToggleVisibility(widget.id)}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="w-full gap-2 mt-4"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar Padrão
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Draggable Widgets Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={cn(
                "grid grid-cols-1 md:grid-cols-4 gap-4 transition-all duration-300",
                snapshot.isDraggingOver && "bg-primary/5 rounded-xl p-4 -m-4",
                isEditMode && "gap-6"
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          transition: { duration: 0.3, ease: "easeOut" }
                        }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "relative col-span-1",
                          getWidgetGridClass(widget),
                          snapshot.isDragging && "z-50"
                        )}
                        onMouseEnter={() => setHoveredWidget(widget.id)}
                        onMouseLeave={() => setHoveredWidget(null)}
                      >
                        {/* Edit Mode Overlay */}
                        <AnimatePresence>
                          {isEditMode && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-10 pointer-events-none"
                            >
                              {/* Corner Resize Handles */}
                              <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full pointer-events-auto cursor-nw-resize" />
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full pointer-events-auto cursor-ne-resize" />
                              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full pointer-events-auto cursor-sw-resize" />
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full pointer-events-auto cursor-se-resize" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Drag Handle */}
                        {isEditMode && (
                          <div
                            className="absolute -left-8 top-1/2 -translate-y-1/2 z-20 hidden md:block"
                            {...provided.dragHandleProps}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="p-2 rounded-lg bg-primary text-primary-foreground cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 transition-transform"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                Arraste para mover
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}

                        {/* Quick Actions (visible on hover in edit mode) */}
                        <AnimatePresence>
                          {isEditMode && hoveredWidget === widget.id && onMoveWidget && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onMoveWidget(widget.id, 'up')}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onMoveWidget(widget.id, 'left')}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onMoveWidget(widget.id, 'right')}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onMoveWidget(widget.id, 'down')}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                              {onUpdateSize && (
                                <>
                                  <div className="w-px h-4 bg-border" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => onUpdateSize(widget.id, widget.size === 'small' ? 'medium' : widget.size === 'medium' ? 'large' : widget.size === 'large' ? 'full' : 'small')}
                                  >
                                    {widget.size === 'full' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                  </Button>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Widget Container */}
                        <motion.div
                          className={cn(
                            "h-full transition-all duration-300 rounded-xl overflow-hidden",
                            isEditMode && "ring-2 ring-dashed ring-primary/40 hover:ring-primary",
                            snapshot.isDragging && "ring-primary shadow-2xl scale-[1.02] rotate-1"
                          )}
                          animate={{
                            boxShadow: snapshot.isDragging 
                              ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" 
                              : "0 0 0 0 rgba(0, 0, 0, 0)"
                          }}
                        >
                          {/* Edit Mode Title Badge */}
                          <AnimatePresence>
                            {isEditMode && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute -top-3 left-4 z-20"
                              >
                                <Badge className="bg-primary text-primary-foreground shadow-lg">
                                  {widget.title}
                                </Badge>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {renderWidget(widget)}
                        </motion.div>
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
