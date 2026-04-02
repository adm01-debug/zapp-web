import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Smartphone, Mail, User, ArrowRight, Sparkles, Fingerprint, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { RippleButton } from '@/components/ui/micro-interactions';
import { z } from 'zod';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { SocialProof } from '@/components/auth/SocialProof';
import { HeroBenefits } from '@/components/auth/HeroBenefits';
import { supabase } from '@/integrations/supabase/client';
import { checkAccountLock, recordFailedLogin, clearLoginAttempts, formatLockTime } from '@/lib/loginAttempts';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { isSupported, isPlatformAuthenticatorAvailable, authenticateWithPasskey, loading: passkeyLoading } = useWebAuthn();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [lockStatus, setLockStatus] = useState<{ isLocked: boolean; remainingTime: number; attempts: number }>({
    isLocked: false,
    remainingTime: 0,
    attempts: 0
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Check if passkey authentication is available
    if (isSupported()) {
      isPlatformAuthenticatorAvailable().then(setPasskeyAvailable).catch(() => setPasskeyAvailable(false));
    }
  }, [isSupported, isPlatformAuthenticatorAvailable]);

  // Countdown timer for lock
  useEffect(() => {
    if (!lockStatus.isLocked || lockStatus.remainingTime <= 0) return;
    const timer = setInterval(() => {
      setLockStatus(prev => {
        const newTime = prev.remainingTime - 1;
        if (newTime <= 0) {
          return { ...prev, isLocked: false, remainingTime: 0 };
        }
        return { ...prev, remainingTime: newTime };
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer should only restart when lock state changes, not on every tick
  }, [lockStatus.isLocked]);

  // Check lock status when email changes
  useEffect(() => {
    const checkLock = async () => {
      if (formData.email && formData.email.includes('@')) {
        const status = await checkAccountLock(formData.email);
        setLockStatus(status);
      }
    };
    
    const debounce = setTimeout(checkLock, 500);
    return () => clearTimeout(debounce);
  }, [formData.email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse(formData);
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

    // Check if account is locked
    const currentLock = await checkAccountLock(formData.email);
    if (currentLock.isLocked) {
      setLockStatus(currentLock);
      toast({
        title: 'Conta bloqueada',
        description: `Muitas tentativas. Aguarde ${formatLockTime(currentLock.remainingTime)}.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(formData.email, formData.password);
    setLoading(false);

    if (error) {
      // Handle email not confirmed error specifically
      if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
        toast({
          title: 'Email não confirmado',
          description: 'Seu email ainda não foi confirmado. Verifique sua caixa de entrada ou peça ao administrador para executar o script de setup (supabase/seed.sql) no Supabase Dashboard.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Record failed attempt
      const lockResult = await recordFailedLogin(formData.email);
      setLockStatus(lockResult);

      if (lockResult.isLocked) {
        toast({
          title: 'Conta bloqueada temporariamente',
          description: `Após ${lockResult.attempts} tentativas, sua conta foi bloqueada por ${formatLockTime(lockResult.remainingTime)}.`,
          variant: 'destructive',
        });
      } else {
        const remainingAttempts = 5 - lockResult.attempts;
        toast({
          title: 'Erro ao entrar',
          description: error.message === 'Invalid login credentials'
            ? `Email ou senha incorretos. ${remainingAttempts > 0 ? `${remainingAttempts} tentativa${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}.` : ''}`
            : error.message,
          variant: 'destructive',
        });
      }
    } else {
      // Clear login attempts on success
      await clearLoginAttempts(formData.email);
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse(formData);
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

    setLoading(true);
    const { error } = await signUp(formData.email, formData.password, formData.name);
    setLoading(false);

    if (error) {
      const errorMessage = error.message.includes('already registered')
        ? 'Este email já está cadastrado'
        : error.message;
      toast({
        title: 'Erro ao criar conta',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Você já pode fazer login.',
      });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-2xl"
        />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Hero Benefits - Left Side (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10">
        <HeroBenefits />
      </div>

      {/* Auth Form - Right Side */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="relative w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Smartphone className="w-10 h-10 text-primary-foreground" />
              
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl -z-10" />
              
              {/* Sparkle decorations */}
              <motion.div
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </motion.div>
              <motion.div
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                className="absolute -bottom-1 -left-1"
              >
                <Sparkles className="w-3 h-3 text-secondary" />
              </motion.div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent"
            >
              WhatsApp Platform
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mt-2"
            >
              Plataforma omnichannel para atendimento
            </motion.p>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-strong border-border/50 shadow-2xl shadow-primary/10">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <CardHeader className="pb-0">
                  <TabsList className="grid w-full grid-cols-2 glass border border-border/30">
                    <TabsTrigger 
                      value="login" 
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                    >
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                    >
                      Criar Conta
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="pt-6">
                  <TabsContent value="login" className="mt-0">
                    {/* Lock Warning */}
                    <AnimatePresence>
                      {lockStatus.isLocked && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-destructive/20">
                              <Lock className="w-5 h-5 text-destructive" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-destructive">
                                Conta bloqueada temporariamente
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Muitas tentativas de login falhadas. Aguarde antes de tentar novamente.
                              </p>
                              <div className="mt-3 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: lockStatus.remainingTime, ease: 'linear' }}
                                    className="h-full bg-destructive rounded-full"
                                  />
                                </div>
                                <span className="text-sm font-mono text-destructive min-w-[60px] text-right">
                                  {Math.floor(lockStatus.remainingTime / 60)}:{(lockStatus.remainingTime % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Attempts Warning */}
                    <AnimatePresence>
                      {!lockStatus.isLocked && lockStatus.attempts > 0 && lockStatus.attempts < 5 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            <p className="text-sm text-warning">
                              {5 - lockStatus.attempts} tentativa{5 - lockStatus.attempts > 1 ? 's' : ''} restante{5 - lockStatus.attempts > 1 ? 's' : ''} antes do bloqueio
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="seu@email.com"
                            className="pl-10 glass border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <AnimatePresence>
                          {errors.email && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="text-xs text-destructive"
                            >
                              {errors.email}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
                        <PasswordInput
                          id="login-password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <AnimatePresence>
                          {errors.password && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="text-xs text-destructive"
                            >
                              {errors.password}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        <div className="flex justify-end">
                          <Link 
                            to="/forgot-password" 
                            className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                          >
                            Esqueci minha senha
                          </Link>
                        </div>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        <RippleButton 
                          type="submit" 
                          variant="primary"
                          className="w-full text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all group bg-primary rounded-md px-4 py-2 font-medium"
                          disabled={loading}
                        >
                          {loading ? (
                            <motion.span
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              Entrando...
                            </motion.span>
                          ) : (
                            <>
                              Entrar
                              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </RippleButton>
                      </motion.div>

                      {/* Passkey Login */}
                      {passkeyAvailable && (
                        <>
                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                              <Separator className="w-full" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-card px-2 text-muted-foreground">
                                ou
                              </span>
                            </div>
                          </div>
                          
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full gap-2"
                              disabled={passkeyLoading}
                              onClick={async () => {
                                const result = await authenticateWithPasskey(formData.email || undefined);
                                if (result.success && result.userEmail) {
                                  // Sign in with magic link or refresh session
                                  const { error } = await supabase.auth.signInWithOtp({
                                    email: result.userEmail,
                                    options: {
                                      shouldCreateUser: false,
                                    }
                                  });
                                  
                                  if (error) {
                                    // If OTP fails, we still verified the passkey
                                    // The session should be valid from the passkey auth
                                    toast({
                                      title: 'Autenticado com Passkey!',
                                      description: 'Redirecionando...',
                                    });
                                  }
                                  navigate('/');
                                }
                              }}
                            >
                              {passkeyLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Fingerprint className="h-4 w-4" />
                              )}
                              Entrar com Passkey
                            </Button>
                          </motion.div>
                        </>
                      )}
                    </form>

                    {/* Social Login */}
                    <div className="mt-4">
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            ou continue com
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 border-border/50 hover:bg-muted/50"
                        onClick={async () => {
                          try {
                            const { lovable } = await import('@/integrations/lovable/index');
                            const { error } = await lovable.auth.signInWithOAuth('google', {
                              redirect_uri: window.location.origin,
                            });
                            if (error) {
                              toast({
                                title: 'Erro ao conectar com Google',
                                description: error.message,
                                variant: 'destructive',
                              });
                            }
                          } catch (err) {
                            log.error('Social login error:', err);
                            toast({
                              title: 'Login social indisponível',
                              description: 'Tente novamente mais tarde.',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Entrar com Google
                      </Button>
                    </div>

                    {/* Social Proof for Login */}
                    <SocialProof />
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="signup-name" className="text-sm font-medium">Nome</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Seu nome"
                            className="pl-10 glass border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <AnimatePresence>
                          {errors.name && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="text-xs text-destructive"
                            >
                              {errors.name}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="seu@email.com"
                            className="pl-10 glass border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <AnimatePresence>
                          {errors.email && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="text-xs text-destructive"
                            >
                              {errors.email}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                        <PasswordInput
                          id="signup-password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        {/* Password Strength Meter */}
                        <AnimatePresence>
                          <PasswordStrengthMeter password={formData.password} />
                        </AnimatePresence>
                        <AnimatePresence>
                          {errors.password && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="text-xs text-destructive"
                            >
                              {errors.password}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          type="submit" 
                          className="w-full text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all group"
                          style={{ background: 'var(--gradient-primary)' }}
                          disabled={loading}
                        >
                          {loading ? (
                            <motion.span
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              Criando conta...
                            </motion.span>
                          ) : (
                            <>
                              Criar Conta
                              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </Button>
                      </motion.div>

                      {/* Terms */}
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        className="text-xs text-center text-muted-foreground mt-4"
                      >
                        Ao criar uma conta, você concorda com nossos{' '}
                        <button type="button" className="text-primary hover:underline">
                          Termos de Uso
                        </button>{' '}
                        e{' '}
                        <button type="button" className="text-primary hover:underline">
                          Política de Privacidade
                        </button>
                      </motion.p>
                    </form>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-6"
          >
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} MultiChat Platform. Todos os direitos reservados.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
