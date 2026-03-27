import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Send,
  Eye,
  Palette,
  Ruler,
  Weight,
  Globe,
  Clock,
  Layers,
  Tag,
  Box,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ExternalProduct } from '@/hooks/useExternalCatalog';

interface ExternalProductCardProps {
  product: ExternalProduct;
  onSend?: (product: ExternalProduct) => void;
  compact?: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none';
  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
  if (fallback) fallback.style.display = 'flex';
};

const ProductImage: React.FC<{ src: string | null; alt: string; iconSize?: string }> = ({ src, alt, iconSize = 'w-6 h-6' }) => (
  <>
    {src ? (
      <>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={handleImageError}
        />
        <div className="w-full h-full items-center justify-center hidden">
          <Package className={`${iconSize} text-muted-foreground`} />
        </div>
      </>
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <Package className={`${iconSize} text-muted-foreground`} />
      </div>
    )}
  </>
);

export const ExternalProductCard: React.FC<ExternalProductCardProps> = ({
  product,
  onSend,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/30 hover:border-primary/30 transition-colors"
      >
        <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {product.primary_image_url ? (
            <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{product.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-semibold text-primary">{formatPrice(product.sale_price)}</span>
            {product.brand && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">{product.brand}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {product.is_stockout ? (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">Sem estoque</Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground">{product.stock_quantity} un.</span>
            )}
            {product.colors && product.colors.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{product.colors.length} cores</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowDetails(true)}>
            <Eye className="w-4 h-4" />
          </Button>
          {onSend && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onSend(product)} disabled={product.is_stockout}>
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        <ProductDetailDialog product={product} open={showDetails} onOpenChange={setShowDetails} onSend={onSend} />
      </motion.div>
    );
  }

  return (
    <>
      <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
        <Card className="overflow-hidden border-border/30 hover:border-primary/30 transition-colors h-full flex flex-col">
          <div className="aspect-square relative bg-muted">
            {product.primary_image_url ? (
              <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {product.is_stockout && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Badge variant="destructive">Esgotado</Badge>
              </div>
            )}
            {product.categories && (
              <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
                {product.categories.name}
              </Badge>
            )}
            {product.is_kit && (
              <Badge className="absolute top-2 right-2 text-[10px] bg-accent text-accent-foreground">Kit</Badge>
            )}
          </div>
          <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">{product.name}</h3>
              {product.brand && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{product.brand}</p>
              )}
            </div>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <Palette className="w-3 h-3 text-muted-foreground" />
                {product.colors.slice(0, 4).map((c) => (
                  <Badge key={c} variant="outline" className="text-[9px] px-1 py-0">{c}</Badge>
                ))}
                {product.colors.length > 4 && (
                  <span className="text-[9px] text-muted-foreground">+{product.colors.length - 4}</span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-primary">{formatPrice(product.sale_price)}</span>
              {!product.is_stockout && product.stock_quantity <= 10 && (
                <Badge variant="outline" className="text-[10px] text-warning border-warning/50">
                  {product.stock_quantity} un.
                </Badge>
              )}
            </div>

            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setShowDetails(true)}>
                <Eye className="w-3.5 h-3.5 mr-1" />
                Detalhes
              </Button>
              {onSend && (
                <Button size="sm" className="flex-1 text-xs h-8" onClick={() => onSend(product)} disabled={product.is_stockout}>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Enviar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <ProductDetailDialog product={product} open={showDetails} onOpenChange={setShowDetails} onSend={onSend} />
    </>
  );
};

// ─── Detail Dialog ────────────────────────────────────────────
interface ProductDetailDialogProps {
  product: ExternalProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (product: ExternalProduct) => void;
}

function ProductDetailDialog({ product, open, onOpenChange, onSend }: ProductDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg leading-tight">{product.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 pt-4 space-y-5">
            {/* Image + Basic Info */}
            <div className="flex gap-4">
              <div className="w-40 h-40 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {product.primary_image_url ? (
                  <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {product.categories && <Badge variant="secondary">{product.categories.name}</Badge>}
                  {product.brand && <Badge variant="outline">{product.brand}</Badge>}
                  {product.is_kit && <Badge className="bg-accent text-accent-foreground">Kit</Badge>}
                  {product.allows_personalization && <Badge variant="outline" className="border-primary/50 text-primary">Personalização</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Preço de venda:</span>
                    <p className="font-bold text-primary text-lg">{formatPrice(product.sale_price)}</p>
                  </div>
                  {product.suggested_price && product.suggested_price !== product.sale_price && (
                    <div>
                      <span className="text-muted-foreground">Preço sugerido:</span>
                      <p className="font-semibold">{formatPrice(product.suggested_price)}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span>SKU: <strong>{product.sku}</strong></span>
                </div>
                {product.is_stockout ? (
                  <Badge variant="destructive">Sem estoque</Badge>
                ) : (
                  <Badge variant="outline" className="text-success border-success/50">
                    {product.stock_quantity} em estoque
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {(product.description || product.short_description) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-1">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {product.description || product.short_description}
                  </p>
                </div>
              </>
            )}

            {/* Technical Details */}
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              {product.dimensions_display && (
                <div className="flex items-start gap-2">
                  <Ruler className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Dimensões</span>
                    <span>{product.dimensions_display}</span>
                  </div>
                </div>
              )}
              {product.weight_g != null && product.weight_g > 0 && (
                <div className="flex items-start gap-2">
                  <Weight className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Peso</span>
                    <span>{product.weight_g >= 1000 ? `${(product.weight_g / 1000).toFixed(2)} kg` : `${product.weight_g} g`}</span>
                  </div>
                </div>
              )}
              {product.origin_country && (
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Origem</span>
                    <span>{product.origin_country}</span>
                  </div>
                </div>
              )}
              {product.lead_time_days != null && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Prazo</span>
                    <span>{product.lead_time_days} dias úteis</span>
                  </div>
                </div>
              )}
              {product.min_quantity != null && (
                <div className="flex items-start gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Qtd. mínima</span>
                    <span>{product.min_quantity} un.</span>
                  </div>
                </div>
              )}
              {product.ncm_code && (
                <div className="flex items-start gap-2">
                  <Box className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">NCM</span>
                    <span>{product.ncm_code}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <Palette className="w-4 h-4" /> Cores disponíveis
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {product.colors.map((color) => (
                      <Badge key={color} variant="outline" className="text-xs">{color}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Variantes ({product.variants.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {product.variants.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm">
                        {v.selected_thumbnail && (
                          <img src={v.selected_thumbnail} alt={v.name} className="w-10 h-10 rounded object-cover" />
                        )}
                        {v.color_hex && (
                          <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: v.color_hex }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{v.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {v.sku}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{v.stock_quantity} un.</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Supplier */}
            {product.suppliers && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Fornecedor: </span>
                  <strong>{product.suppliers.name}</strong>
                </div>
              </>
            )}

            {/* Send button */}
            {onSend && (
              <Button className="w-full" onClick={() => { onSend(product); onOpenChange(false); }} disabled={product.is_stockout}>
                <Send className="w-4 h-4 mr-2" />
                Enviar produto no chat
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
