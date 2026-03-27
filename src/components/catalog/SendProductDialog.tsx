import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  ChevronDown,
  Package,
  Copy,
  Download,
  Palette,
  Check,
  Pencil,
} from 'lucide-react';
import { ExternalProduct, ExternalProductVariant, useExternalCatalog } from '@/hooks/useExternalCatalog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type MessageTemplate = 'formal' | 'informal' | 'promo';
type SendMode = 'product' | 'variant';

interface VariantGroup {
  colorName: string;
  colorHex: string | null;
  variants: ExternalProductVariant[];
  images: string[];
}

interface SendProductDialogProps {
  product: ExternalProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSend?: (text: string, images: string[]) => void;
}

// ─── Group variants by color ──────────────────────────────────
function groupVariantsByColor(variants: ExternalProductVariant[]): VariantGroup[] {
  const map = new Map<string, VariantGroup>();

  variants.forEach((v) => {
    const key = v.color_name || v.name || 'Padrão';
    if (!map.has(key)) {
      map.set(key, {
        colorName: key,
        colorHex: v.color_hex,
        variants: [],
        images: [],
      });
    }
    const group = map.get(key)!;
    group.variants.push(v);
    if (v.selected_thumbnail && !group.images.includes(v.selected_thumbnail)) {
      group.images.push(v.selected_thumbnail);
    }
  });

  return Array.from(map.values());
}

// ─── Message builders ─────────────────────────────────────────
function buildMessage(
  product: ExternalProduct,
  template: MessageTemplate,
  selectedVariant?: VariantGroup | null
): string {
  const price = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.sale_price);

  const variantInfo = selectedVariant
    ? `Cor: ${selectedVariant.colorName}`
    : product.colors && product.colors.length > 0
      ? `Cores disponíveis: ${product.colors.join(', ')}`
      : null;

  const stockInfo = selectedVariant
    ? `Estoque: ${selectedVariant.variants.reduce((s, v) => s + v.stock_quantity, 0)} un.`
    : product.is_stockout
      ? '⚠️ Sem estoque no momento'
      : `Em estoque: ${product.stock_quantity} un.`;

  switch (template) {
    case 'formal':
      return [
        `Prezado(a), segue informações do produto solicitado:`,
        ``,
        `*${product.name}*`,
        product.brand ? `Marca: ${product.brand}` : '',
        `Valor: ${price}`,
        variantInfo || '',
        product.min_quantity ? `Quantidade mínima: ${product.min_quantity} unidades` : '',
        product.dimensions_display ? `Dimensões: ${product.dimensions_display}` : '',
        product.allows_personalization ? `Permite personalização.` : '',
        product.lead_time_days ? `Prazo de entrega: ${product.lead_time_days} dias úteis` : '',
        stockInfo,
        ``,
        product.short_description || product.description
          ? (product.short_description || product.description || '').slice(0, 300)
          : '',
        ``,
        `Fico à disposição para qualquer dúvida.`,
      ].filter(Boolean).join('\n');

    case 'promo':
      return [
        `🔥 *OFERTA ESPECIAL* 🔥`,
        ``,
        `📦 *${product.name}*`,
        selectedVariant ? `🎨 Cor: *${selectedVariant.colorName}*` : '',
        product.brand ? `🏷️ ${product.brand}` : '',
        `💰 *${price}*`,
        !selectedVariant && product.colors?.length ? `🎨 ${product.colors.join(', ')}` : '',
        product.min_quantity ? `📋 A partir de ${product.min_quantity} un.` : '',
        product.allows_personalization ? `✅ Personalização disponível!` : '',
        `✅ ${stockInfo}`,
        ``,
        `Aproveite! Estoque limitado 🚀`,
      ].filter(Boolean).join('\n');

    case 'informal':
    default:
      return [
        `Oi! 😊`,
        ``,
        `Olha esse produto que separei pra você:`,
        ``,
        `*${product.name}*`,
        selectedVariant ? `🎨 *${selectedVariant.colorName}*` : '',
        ``,
        product.short_description || product.description
          ? (product.short_description || product.description || '').slice(0, 200)
          : '',
        ``,
        product.brand ? `Marca: ${product.brand}` : '',
        `Valor: ${price}`,
        !selectedVariant && product.colors?.length ? `Cores: ${product.colors.join(', ')}` : '',
        product.allows_personalization ? `Dá pra personalizar! ✨` : '',
        stockInfo.includes('⚠️') ? stockInfo : '',
        ``,
        `O que achou? 😉`,
      ].filter(Boolean).join('\n');
  }
}

// ─── Collect images ───────────────────────────────────────────
function collectAllImages(product: ExternalProduct): { url: string; label: string }[] {
  const imgs: { url: string; label: string }[] = [];
  if (product.primary_image_url) {
    imgs.push({ url: product.primary_image_url, label: 'Principal' });
  }
  if (product.variants) {
    product.variants.forEach((v) => {
      if (v.selected_thumbnail && !imgs.some((i) => i.url === v.selected_thumbnail)) {
        imgs.push({ url: v.selected_thumbnail!, label: v.color_name || v.name });
      }
    });
  }
  return imgs;
}

// ─── Component ────────────────────────────────────────────────
export const SendProductDialog: React.FC<SendProductDialogProps> = ({
  product,
  open,
  onOpenChange,
  onConfirmSend,
}) => {
  const { fetchProduct } = useExternalCatalog();
  const [fullProduct, setFullProduct] = useState<ExternalProduct>(product);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const [template, setTemplate] = useState<MessageTemplate>('informal');
  const [isEditing, setIsEditing] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sendMode, setSendMode] = useState<SendMode>('product');
  const [selectedColorGroup, setSelectedColorGroup] = useState<string | null>(null);

  // Load full product with variants when dialog opens
  useEffect(() => {
    if (open && (!product.variants || product.variants.length === 0)) {
      setLoadingVariants(true);
      fetchProduct(product.id).then((p) => {
        if (p) setFullProduct(p);
      }).finally(() => setLoadingVariants(false));
    } else {
      setFullProduct(product);
    }
  }, [open, product.id]);

  const variantGroups = useMemo(
    () => groupVariantsByColor(fullProduct.variants || []),
    [fullProduct.variants]
  );

  const activeGroup = selectedColorGroup
    ? variantGroups.find((g) => g.colorName === selectedColorGroup) || null
    : null;

  // Images depend on mode
  const allImages = useMemo(() => collectAllImages(fullProduct), [fullProduct]);
  const visibleImages = useMemo(() => {
    if (sendMode === 'variant' && activeGroup) {
      // Show variant images + primary
      const imgs: { url: string; label: string }[] = [];
      if (fullProduct.primary_image_url) {
        imgs.push({ url: fullProduct.primary_image_url, label: 'Principal' });
      }
      activeGroup.images.forEach((url) => {
        if (!imgs.some((i) => i.url === url)) {
          imgs.push({ url, label: activeGroup.colorName });
        }
      });
      return imgs;
    }
    return allImages;
  }, [sendMode, activeGroup, allImages, fullProduct.primary_image_url]);

  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  // Sync selected images when visible images change
  useEffect(() => {
    setSelectedImages(new Set(visibleImages.map((i) => i.url)));
  }, [visibleImages]);

  const message = isEditing
    ? customMessage
    : buildMessage(fullProduct, template, sendMode === 'variant' ? activeGroup : null);

  const toggleImage = (url: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleEditMessage = () => {
    if (!isEditing) {
      setCustomMessage(message);
    }
    setIsEditing(!isEditing);
  };

  const handleCopyDescription = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: '✅ Copiado!', description: 'Descrição copiada para a área de transferência.' });
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleDownloadImages = () => {
    const urls = Array.from(selectedImages);
    if (urls.length === 0) {
      toast({ title: 'Nenhuma foto selecionada', variant: 'destructive' });
      return;
    }
    urls.forEach((url, i) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fullProduct.name.replace(/\s+/g, '_')}_${i + 1}.jpg`;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    toast({ title: `📥 Download iniciado`, description: `${urls.length} foto(s)` });
  };

  const handleSend = () => {
    const imgs = Array.from(selectedImages);
    if (onConfirmSend) {
      onConfirmSend(message, imgs);
    } else {
      const fullText = imgs.length > 0
        ? `${message}\n\n${imgs.map((u) => `🔗 ${u}`).join('\n')}`
        : message;
      navigator.clipboard.writeText(fullText).then(() => {
        toast({ title: '✅ Produto copiado!', description: 'Cole no chat para enviar ao cliente.' });
      });
    }
    onOpenChange(false);
  };

  const templateLabels: Record<MessageTemplate, string> = {
    formal: 'Formal',
    informal: 'Informal',
    promo: 'Promoção',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Send className="w-5 h-5 text-primary" />
            {sendMode === 'variant' && activeGroup
              ? `Enviar ${activeGroup.colorName}`
              : 'Enviar Produto'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {sendMode === 'variant'
              ? 'Enviando variação específica do produto'
              : 'Selecione fotos, modelo de mensagem e envie'}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-5 pb-5 space-y-4">

            {/* ─── Mode Selector (Product vs Variant) ──────── */}
            {variantGroups.length > 0 && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant={sendMode === 'product' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-8 gap-1.5"
                    onClick={() => {
                      setSendMode('product');
                      setSelectedColorGroup(null);
                      setIsEditing(false);
                    }}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Produto Completo
                  </Button>
                  <Button
                    variant={sendMode === 'variant' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-8 gap-1.5"
                    onClick={() => {
                      setSendMode('variant');
                      if (!selectedColorGroup && variantGroups.length > 0) {
                        setSelectedColorGroup(variantGroups[0].colorName);
                      }
                      setIsEditing(false);
                    }}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Variação Específica
                  </Button>
                </div>

                {/* ─── Variant Color Selector ───────────────── */}
                {sendMode === 'variant' && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Selecione a variação
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {variantGroups.map((group) => {
                        const isSelected = selectedColorGroup === group.colorName;
                        const groupStock = group.variants.reduce((s, v) => s + v.stock_quantity, 0);
                        return (
                          <button
                            key={group.colorName}
                            onClick={() => {
                              setSelectedColorGroup(group.colorName);
                              setIsEditing(false);
                            }}
                            className={cn(
                              'flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all text-left',
                              isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border/50 hover:border-border'
                            )}
                          >
                            {/* Color swatch or thumbnail */}
                            {group.images[0] ? (
                              <img
                                src={group.images[0]}
                                alt={group.colorName}
                                className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                                loading="lazy"
                              />
                            ) : group.colorHex ? (
                              <div
                                className="w-10 h-10 rounded-md border flex-shrink-0"
                                style={{ backgroundColor: group.colorHex }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                <Palette className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {group.colorHex && (
                                  <div
                                    className="w-3 h-3 rounded-full border border-border/50 flex-shrink-0"
                                    style={{ backgroundColor: group.colorHex }}
                                  />
                                )}
                                <span className="font-medium text-sm truncate">
                                  {group.colorName}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {group.images.length} foto{group.images.length !== 1 ? 's' : ''} · {groupStock} un.
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loadingVariants && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                Carregando variantes...
              </div>
            )}

            <Separator />

            {/* ─── Photo Selection ────────────────────────── */}
            {visibleImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedImages.size} de {visibleImages.length} fotos selecionadas
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() =>
                      selectedImages.size === visibleImages.length
                        ? setSelectedImages(new Set())
                        : setSelectedImages(new Set(visibleImages.map((i) => i.url)))
                    }
                  >
                    {selectedImages.size === visibleImages.length
                      ? 'Desmarcar todas'
                      : 'Selecionar todas'}
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {visibleImages.map((img) => (
                    <button
                      key={img.url}
                      onClick={() => toggleImage(img.url)}
                      className={cn(
                        'relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                        selectedImages.has(img.url)
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-border/50 opacity-60 hover:opacity-100'
                      )}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {selectedImages.has(img.url) && (
                        <div className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* ─── Message Template Selector ──────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Modelo de mensagem</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleEditMessage}
                >
                  <Pencil className="w-3 h-3" />
                  {isEditing ? 'Usar modelo' : 'Editar'}
                </Button>
              </div>
              {!isEditing && (
                <div className="flex gap-2">
                  {(Object.keys(templateLabels) as MessageTemplate[]).map((t) => (
                    <Button
                      key={t}
                      variant={template === t ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => { setTemplate(t); setIsEditing(false); }}
                    >
                      {templateLabels[t]}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Message Preview / Editor ───────────────── */}
            <div className="rounded-lg bg-muted/50 border border-border/50 p-4">
              {isEditing ? (
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[150px] bg-transparent border-0 p-0 focus-visible:ring-0 resize-none text-sm"
                  placeholder="Escreva sua mensagem personalizada..."
                />
              ) : (
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {message}
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* ─── Footer Actions ──────────────────────────── */}
        <div className="p-4 border-t flex items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex flex-1">
            <Button className="flex-1 rounded-r-none gap-2" onClick={handleSend}>
              <Send className="w-4 h-4" />
              Enviar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-l-none border-l border-primary-foreground/20 px-2">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Opções de Envio</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { setSendMode('product'); setSelectedColorGroup(null); handleSend(); }}>
                  <Package className="w-4 h-4 mr-2" />
                  Enviar Produto Simples
                </DropdownMenuItem>
                {variantGroups.length > 0 && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSendMode('product');
                      setSelectedImages(new Set(allImages.map((i) => i.url)));
                      setTimeout(handleSend, 50);
                    }}
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    Enviar Todas as Cores
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Compartilhar</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleCopyDescription}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Descrição
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadImages}>
                  <Download className="w-4 h-4 mr-2" />
                  Download ({selectedImages.size} fotos)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
