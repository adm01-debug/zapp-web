import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import { Product } from './ProductCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  X,
  Save,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  description: z.string().max(1000, 'Descrição muito longa').optional(),
  price: z.number().min(0, 'Preço deve ser positivo'),
  currency: z.string().default('BRL'),
  image_url: z.string().url('URL inválida').optional().or(z.literal('')),
  category: z.string().max(100).optional(),
  sku: z.string().max(50).optional(),
  stock_quantity: z.number().int().min(0, 'Estoque deve ser positivo'),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSave: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSave,
  onCancel,
  loading,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    currency: product?.currency || 'BRL',
    image_url: product?.image_url || '',
    category: product?.category || '',
    sku: product?.sku || '',
    stock_quantity: product?.stock_quantity || 0,
    is_active: product?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = productSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    await onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Nome do Produto *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do produto"
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name}</p>
          )}
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Descrição do produto"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="price">Preço *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
            }
            placeholder="0.00"
            className={errors.price ? 'border-destructive' : ''}
          />
          {errors.price && (
            <p className="text-xs text-destructive mt-1">{errors.price}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currency">Moeda</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) =>
              setFormData({ ...formData, currency: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">BRL (R$)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            value={formData.category || ''}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            placeholder="Ex: Eletrônicos"
          />
        </div>

        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku || ''}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="Código único"
          />
        </div>

        <div>
          <Label htmlFor="stock">Estoque</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={formData.stock_quantity}
            onChange={(e) =>
              setFormData({
                ...formData,
                stock_quantity: parseInt(e.target.value) || 0,
              })
            }
            placeholder="0"
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, is_active: checked })
            }
          />
          <Label htmlFor="is_active">Produto ativo</Label>
        </div>

        <div className="col-span-2">
          <Label htmlFor="image_url">URL da Imagem</Label>
          <Input
            id="image_url"
            value={formData.image_url || ''}
            onChange={(e) =>
              setFormData({ ...formData, image_url: e.target.value })
            }
            placeholder="https://exemplo.com/imagem.jpg"
            className={errors.image_url ? 'border-destructive' : ''}
          />
          {errors.image_url && (
            <p className="text-xs text-destructive mt-1">{errors.image_url}</p>
          )}
          {formData.image_url && (
            <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden bg-muted">
              <img
                src={formData.image_url}
                alt="Preview"
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
};

export const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedProducts = (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        currency: p.currency,
        image_url: p.image_url,
        category: p.category,
        sku: p.sku,
        stock_quantity: p.stock_quantity ?? 0,
        is_active: p.is_active ?? true,
      }));

      setProducts(typedProducts);
    } catch (error) {
      log.error('Error fetching products:', error);
      toast({
        title: 'Erro ao carregar produtos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: ProductFormData) => {
    setSaving(true);
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: data.name,
            description: data.description || null,
            price: data.price,
            currency: data.currency,
            image_url: data.image_url || null,
            category: data.category || null,
            sku: data.sku || null,
            stock_quantity: data.stock_quantity,
            is_active: data.is_active,
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('products').insert({
          name: data.name,
          description: data.description || null,
          price: data.price,
          currency: data.currency,
          image_url: data.image_url || null,
          category: data.category || null,
          sku: data.sku || null,
          stock_quantity: data.stock_quantity,
          is_active: data.is_active,
        });

        if (error) throw error;
        toast({ title: 'Produto criado com sucesso!' });
      }

      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: unknown) {
      log.error('Error saving product:', error);
      toast({
        title: 'Erro ao salvar produto',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteProduct.id);

      if (error) throw error;

      toast({ title: 'Produto excluído com sucesso!' });
      setDeleteProduct(null);
      fetchProducts();
    } catch (error) {
      log.error('Error deleting product:', error);
      toast({
        title: 'Erro ao excluir produto',
        variant: 'destructive',
      });
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase()) ||
      product.category?.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Gerenciar Produtos</h1>
          <Badge variant="secondary">{products.length} produtos</Badge>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, SKU ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar produtos"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearch('')}
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Products Table */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Imagem</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="w-12 h-12 rounded" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      icon={Package}
                      title={search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                      description={
                        search
                          ? 'Tente ajustar os termos da busca'
                          : 'Adicione produtos ao catálogo para começar a vender'
                      }
                      illustration="data"
                      size="sm"
                      actionLabel={!search ? 'Adicionar Produto' : undefined}
                      onAction={!search ? () => setShowForm(true) : undefined}
                      secondaryActionLabel={search ? 'Limpar busca' : undefined}
                      onSecondaryAction={search ? () => setSearch('') : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredProducts.map((product) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group"
                    >
                      <TableCell>
                        <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category && (
                          <Badge variant="outline">{product.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.sku || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(product.price, product.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            product.stock_quantity <= 0
                              ? 'destructive'
                              : product.stock_quantity <= 5
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {product.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={product.is_active ? 'default' : 'secondary'}
                        >
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${product.name}`}
                            onClick={() => {
                              setEditingProduct(product);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Excluir ${product.name}`}
                            onClick={() => setDeleteProduct(product)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Product Form Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingProduct(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Atualize as informações do produto'
                : 'Preencha as informações para criar um novo produto'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
            loading={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto{' '}
              <strong>{deleteProduct?.name}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
