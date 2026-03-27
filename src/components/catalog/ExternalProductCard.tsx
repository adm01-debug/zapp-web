import React, { useState, useEffect } from 'react';
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
import { ExternalProduct, useExternalCatalog } from '@/hooks/useExternalCatalog';

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
          <ProductImage src={product.primary_image_url} alt={product.name} />
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
            <ProductImage src={product.primary_image_url} alt={product.name} iconSize="w-12 h-12" />
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
  const { fetchProduct } = useExternalCatalog();
  const [fullProduct, setFullProduct] = useState<ExternalProduct>(product);
  const [loadingVariants, setLoadingVariants] = useState(false);

  useEffect(() => {
    if (open && !product.variants?.length) {
      setLoadingVariants(true);
      fetchProduct(product.id).then((p) => {
        if (p) setFullProduct(p);
      }).finally(() => setLoadingVariants(false));
    } else {
      setFullProduct(product);
    }
  }, [open, product.id]);

  const displayProduct = fullProduct;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg leading-tight">{displayProduct.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 pt-4 space-y-5">
            {/* Image + Basic Info */}
            <div className="flex gap-4">
              <div className="w-40 h-40 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <ProductImage src={displayProduct.primary_image_url} alt={displayProduct.name} iconSize="w-10 h-10" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {displayProduct.categories && <Badge variant="secondary">{displayProduct.categories.name}</Badge>}
                  {displayProduct.brand && <Badge variant="outline">{displayProduct.brand}</Badge>}
                  {displayProduct.is_kit && <Badge className="bg-accent text-accent-foreground">Kit</Badge>}
                  {displayProduct.allows_personalization && <Badge variant="outline" className="border-primary/50 text-primary">Personalização</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Preço de venda:</span>
                    <p className="font-bold text-primary text-lg">{formatPrice(displayProduct.sale_price)}</p>
                  </div>
                  {displayProduct.suggested_price && displayProduct.suggested_price !== displayProduct.sale_price && (
                    <div>
                      <span className="text-muted-foreground">Preço sugerido:</span>
                      <p className="font-semibold">{formatPrice(displayProduct.suggested_price)}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span>SKU: <strong>{displayProduct.sku}</strong></span>
                </div>
                {displayProduct.is_stockout ? (
                  <Badge variant="destructive">Sem estoque</Badge>
                ) : (
                  <Badge variant="outline" className="text-success border-success/50">
                    {displayProduct.stock_quantity} em estoque
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {(displayProduct.description || displayProduct.short_description) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-1">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {displayProduct.description || displayProduct.short_description}
                  </p>
                </div>
              </>
            )}

            {/* Technical Details */}
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              {displayProduct.dimensions_display && (
                <div className="flex items-start gap-2">
                  <Ruler className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Dimensões</span>
                    <span>{displayProduct.dimensions_display}</span>
                  </div>
                </div>
              )}
              {displayProduct.weight_g != null && displayProduct.weight_g > 0 && (
                <div className="flex items-start gap-2">
                  <Weight className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Peso</span>
                    <span>{displayProduct.weight_g >= 1000 ? `${(displayProduct.weight_g / 1000).toFixed(2)} kg` : `${displayProduct.weight_g} g`}</span>
                  </div>
                </div>
              )}
              {displayProduct.origin_country && (
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Origem</span>
                    <span>{displayProduct.origin_country}</span>
                  </div>
                </div>
              )}
              {displayProduct.lead_time_days != null && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Prazo</span>
                    <span>{displayProduct.lead_time_days} dias úteis</span>
                  </div>
                </div>
              )}
              {displayProduct.min_quantity != null && (
                <div className="flex items-start gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">Qtd. mínima</span>
                    <span>{displayProduct.min_quantity} un.</span>
                  </div>
                </div>
              )}
              {displayProduct.ncm_code && (
                <div className="flex items-start gap-2">
                  <Box className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-xs">NCM</span>
                    <span>{displayProduct.ncm_code}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Colors */}
            {displayProduct.colors && displayProduct.colors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <Palette className="w-4 h-4" /> Cores disponíveis
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {displayProduct.colors.map((color) => (
                      <Badge key={color} variant="outline" className="text-xs">{color}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Variants */}
            {loadingVariants ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                Carregando variantes...
              </div>
            ) : displayProduct.variants && displayProduct.variants.length > 0 ? (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Variantes ({displayProduct.variants.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {displayProduct.variants.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm">
                        {v.selected_thumbnail && (
                          <img src={v.selected_thumbnail} alt={v.name} className="w-10 h-10 rounded object-cover" loading="lazy" onError={handleImageError} />
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
            ) : null}

            {/* Supplier */}
            {displayProduct.suppliers && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Fornecedor: </span>
                  <strong>{displayProduct.suppliers.name}</strong>
                </div>
              </>
            )}

            {/* Send button */}
            {onSend && (
              <Button className="w-full" onClick={() => { onSend(displayProduct); onOpenChange(false); }} disabled={displayProduct.is_stockout}>
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
