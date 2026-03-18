import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Fingerprint, 
  Plus, 
  Trash2, 
  Smartphone, 
  Monitor, 
  Key,
  Pencil,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

export function PasskeysPanel() {
  const {
    loading,
    passkeys,
    isSupported,
    isPlatformAuthenticatorAvailable,
    fetchPasskeys,
    registerPasskey,
    deletePasskey,
    renamePasskey,
  } = useWebAuthn();

  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [selectedPasskey, setSelectedPasskey] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [passkeyName, setPasskeyName] = useState('');

  useEffect(() => {
    fetchPasskeys();
    isPlatformAuthenticatorAvailable().then(setIsPlatformAvailable).catch(() => setIsPlatformAvailable(false));
  }, [fetchPasskeys, isPlatformAuthenticatorAvailable]);

  const handleRegister = async () => {
    const result = await registerPasskey(passkeyName || undefined);
    if (result.success) {
      setShowRegisterDialog(false);
      setPasskeyName('');
    }
  };

  const handleDelete = async () => {
    if (selectedPasskey) {
      await deletePasskey(selectedPasskey);
      setShowDeleteDialog(false);
      setSelectedPasskey(null);
    }
  };

  const handleRename = async () => {
    if (selectedPasskey && newName) {
      await renamePasskey(selectedPasskey, newName);
      setShowRenameDialog(false);
      setSelectedPasskey(null);
      setNewName('');
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'platform':
        return <Fingerprint className="h-5 w-5" />;
      case 'cross-platform':
        return <Key className="h-5 w-5" />;
      default:
        return <Smartphone className="h-5 w-5" />;
    }
  };

  const webauthnSupported = isSupported();

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Fingerprint className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Passkeys / WebAuthn</CardTitle>
                <CardDescription>
                  Login biométrico com Touch ID, Face ID ou Windows Hello
                </CardDescription>
              </div>
            </div>
            {webauthnSupported ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Suportado
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Não Suportado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!webauthnSupported ? (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">WebAuthn não disponível</p>
                <p className="text-sm text-muted-foreground">
                  Seu navegador não suporta autenticação biométrica. Use um navegador moderno como Chrome, Firefox ou Safari.
                </p>
              </div>
            </div>
          ) : !isPlatformAvailable ? (
            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-600">Autenticador de plataforma não disponível</p>
                <p className="text-sm text-muted-foreground">
                  Seu dispositivo não possui Touch ID, Face ID ou Windows Hello configurado.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-600">Pronto para usar</p>
                <p className="text-sm text-muted-foreground">
                  Seu dispositivo suporta autenticação biométrica. Adicione uma passkey abaixo.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passkeys List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Suas Passkeys</CardTitle>
              <CardDescription>
                {passkeys.length === 0 
                  ? 'Nenhuma passkey cadastrada'
                  : `${passkeys.length} passkey${passkeys.length > 1 ? 's' : ''} cadastrada${passkeys.length > 1 ? 's' : ''}`
                }
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowRegisterDialog(true)}
              disabled={!webauthnSupported || loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar Passkey
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="popLayout">
            {passkeys.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Fingerprint className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  Adicione uma passkey para fazer login com biometria
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {passkeys.map((passkey, index) => (
                  <motion.div
                    key={passkey.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getDeviceIcon(passkey.device_type)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {passkey.friendly_name || 'Passkey'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            Criada {formatDistanceToNow(new Date(passkey.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                          {passkey.last_used_at && (
                            <>
                              <span>•</span>
                              <span>
                                Usada {formatDistanceToNow(new Date(passkey.last_used_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedPasskey(passkey.id);
                          setNewName(passkey.friendly_name || '');
                          setShowRenameDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setSelectedPasskey(passkey.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg h-fit">
              <Monitor className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">O que são Passkeys?</h4>
              <p className="text-sm text-muted-foreground">
                Passkeys são uma forma mais segura e conveniente de fazer login. Em vez de senhas, 
                você usa biometria (impressão digital, reconhecimento facial) ou um PIN do dispositivo.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Mais seguro que senhas tradicionais
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Resistente a phishing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Login instantâneo com biometria
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Register Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Adicionar Passkey
            </DialogTitle>
            <DialogDescription>
              Dê um nome para identificar esta passkey (ex: "MacBook Pro", "iPhone 15")
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nome da passkey (opcional)"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegister} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aguardando...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Registrar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Passkey</DialogTitle>
            <DialogDescription>
              Digite um novo nome para identificar esta passkey
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Novo nome"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!newName}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Passkey?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Você não poderá mais usar esta passkey para fazer login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
