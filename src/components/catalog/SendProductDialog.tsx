import React, { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
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
  Search,
  Check,
  Pencil,
  Image as ImageIcon,
} from 'lucide-react';
import { ExternalProduct, ExternalProductVariant } from '@/hooks/useExternalCatalog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type MessageTemplate = 'formal' | 'informal' | 'promo';

interface SendProductDialogProps {
  product: ExternalProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user confirms send — receives formatted text + selected image URLs */
  onConfirmSend?: (text: string, images: string[]) => void;
}

// ─── Message template generators ──────────────────────────────
function buildMessage(product: ExternalProduct, template: MessageTemplate): string {
  const price = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.sale_price);

  const colorsStr =
    product.colors && product.colors.length > 0
      ? product.colors.join(', ')
      : null;

  switch (template) {
    case 'formal':
      return [
        `Prezado(a), segue informações do produto solicitado:`,
        ``,
        `*${product.name}*`,
        product.brand ? `Marca: ${product.brand}` : '',
        `Valor: ${price}`,
        product.min_quantity ? `Quantidade mínima: ${product.min_quantity} unidades` : '',
        colorsStr ? `Cores disponíveis: ${colorsStr}` : '',
        product.dimensions_display ? `Dimensões: ${product.dimensions_display}` : '',
        product.allows_personalization ? `Permite personalização.` : '',
        product.lead_time_days ? `Prazo de entrega: ${product.lead_time_days} dias úteis` : '',
        product.is_stockout ? `⚠️ Produto sem estoque no momento.` : '',
        ``,
        product.short_description || product.description
          ? (product.short_description || product.description || '').slice(0, 300)
          : '',
        ``,
        `Fico à disposição para qualquer dúvida.`,
      ]
        .filter(Boolean)
        .join('\n');

    case 'promo':
      return [
        `🔥 *OFERTA ESPECIAL* 🔥`,
        ``,
        `📦 *${product.name}*`,
        product.brand ? `🏷️ ${product.brand}` : '',
        `💰 *${price}*`,
        colorsStr ? `🎨 ${colorsStr}` : '',
        product.min_quantity ? `📋 A partir de ${product.min_quantity} un.` : '',
        product.allows_personalization ? `✅ Personalização disponível!` : '',
        product.is_stockout ? `⚠️ Sem estoque` : `✅ Pronta entrega!`,
        ``,
        `Aproveite! Estoque limitado 🚀`,
      ]
        .filter(Boolean)
        .join('\n');

    case 'informal':
    default:
      return [
        `Oi! 😊`,
        ``,
        `Olha esse produto que separei pra você:`,
        ``,
        `*${product.name}*`,
        ``,
        product.short_description || product.description
          ? (product.short_description || product.description || '').slice(0, 200)
          : '',
        ``,
        product.brand ? `Marca: ${product.brand}` : '',
        `Valor: ${price}`,
        colorsStr ? `Cores: ${colorsStr}` : '',
        product.allows_personalization ? `Dá pra personalizar! ✨` : '',
        product.is_stockout ? `⚠️ Sem estoque no momento` : '',
        ``,
        `O que achou? 😉`,
      ]
        .filter(Boolean)
        .join('\n');
  }
}

// ─── Collect all images from product + variants ───────────────
function collectImages(product: ExternalProduct): { url: string; label: string }[] {
  const imgs: { url: string; label: string }[] = [];

  if (product.primary_image_url) {
    imgs.push({ url: product.primary_image_url, label: 'Principal' });
  }

  if (product.variants) {
    product.variants.forEach((v) => {
      if (v.selected_thumbnail && !imgs.some((i) => i.url === v.selected_thumbnail)) {
        imgs.push({
          url: v.selected_thumbnail!,
          label: v.color_name || v.name,
        });
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
  const [template, setTemplate] = useState<MessageTemplate>('informal');
  const [isEditing, setIsEditing] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const allImages = useMemo(() => collectImages(product), [product]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(
    () => new Set(allImages.map((i) => i.url))
  );

  const message = isEditing ? customMessage : buildMessage(product, template);

  const toggleImage = (url: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAllImages = () =>
    setSelectedImages(new Set(allImages.map((i) => i.url)));
  const deselectAllImages = () => setSelectedImages(new Set());

  const handleEditMessage = () => {
    if (!isEditing) {
      setCustomMessage(buildMessage(product, template));
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
      a.download = `${product.name.replace(/\s+/g, '_')}_${i + 1}.jpg`;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    toast({
      title: `📥 Download iniciado`,
      description: `${urls.length} foto(s)`,
    });
  };

  const handleSend = () => {
    const imgs = Array.from(selectedImages);
    if (onConfirmSend) {
      onConfirmSend(message, imgs);
    } else {
      // Fallback: copy to clipboard
      const fullText = imgs.length > 0
        ? `${message}\n\n${imgs.map((u) => `🔗 ${u}`).join('\n')}`
        : message;
      navigator.clipboard.writeText(fullText).then(() => {
        toast({
          title: '✅ Produto copiado!',
          description: 'Cole no chat para enviar ao cliente.',
        });
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
            Enviar Produto
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Selecione fotos, modelo de mensagem e contato
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="px-5 pb-5 space-y-4">
            {/* ─── Photo Selection ────────────────────────── */}
            {allImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedImages.size} de {allImages.length} fotos selecionadas
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={
                      selectedImages.size === allImages.length
                        ? deselectAllImages
                        : selectAllImages
                    }
                  >
                    {selectedImages.size === allImages.length
                      ? 'Desmarcar todas'
                      : 'Selecionar todas'}
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {allImages.map((img) => (
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
                      onClick={() => setTemplate(t)}
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
                <DropdownMenuItem onClick={handleSend}>
                  <Package className="w-4 h-4 mr-2" />
                  Enviar Produto Simples
                </DropdownMenuItem>
                {product.variants && product.variants.length > 0 && (
                  <DropdownMenuItem
                    onClick={() => {
                      selectAllImages();
                      handleSend();
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
