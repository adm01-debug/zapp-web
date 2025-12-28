import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Smartphone, Mail, User, ArrowRight, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { SocialProof } from '@/components/auth/SocialProof';
import { HeroBenefits } from '@/components/auth/HeroBenefits';

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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
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

    setLoading(true);
    const { error } = await signIn(formData.email, formData.password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else {
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
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
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
                              Entrando...
                            </motion.span>
                          ) : (
                            <>
                              Entrar
                              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </form>

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
              © 2024 WhatsApp Platform. Todos os direitos reservados.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
