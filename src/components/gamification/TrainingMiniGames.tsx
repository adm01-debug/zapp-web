import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Gamepad2,
  Timer,
  Trophy,
  Star,
  Zap,
  Brain,
  Keyboard,
  MessageSquare,
  Target,
  Award,
  Play,
  RotateCcw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCelebration } from '@/components/effects/Confetti';

// Game Types
type GameType = 'speed-typing' | 'quiz' | 'response-match' | 'emoji-decode';

interface Game {
  id: GameType;
  name: string;
  description: string;
  icon: typeof Gamepad2;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
}

const GAMES: Game[] = [
  {
    id: 'speed-typing',
    name: 'Speed Typing',
    description: 'Digite respostas rápidas para clientes',
    icon: Keyboard,
    difficulty: 'medium',
    xpReward: 50,
  },
  {
    id: 'quiz',
    name: 'Quiz do Atendimento',
    description: 'Teste seus conhecimentos',
    icon: Brain,
    difficulty: 'easy',
    xpReward: 30,
  },
  {
    id: 'response-match',
    name: 'Response Match',
    description: 'Combine perguntas com respostas',
    icon: MessageSquare,
    difficulty: 'medium',
    xpReward: 40,
  },
  {
    id: 'emoji-decode',
    name: 'Emoji Decode',
    description: 'Descubra o sentimento do cliente',
    icon: Target,
    difficulty: 'easy',
    xpReward: 25,
  },
];

// Speed Typing Game Data
const TYPING_PHRASES = [
  "Olá! Como posso ajudar você hoje?",
  "Entendo sua situação. Vou resolver isso agora.",
  "Obrigado por entrar em contato conosco!",
  "Sua solicitação foi encaminhada com sucesso.",
  "Posso ajudar com mais alguma coisa?",
  "Aguarde um momento enquanto verifico.",
  "Seu problema foi solucionado!",
  "Tenha um ótimo dia!",
];

// Quiz Data
const QUIZ_QUESTIONS = [
  {
    question: "Qual a primeira coisa a fazer ao receber uma reclamação?",
    options: ["Transferir para outro setor", "Ouvir atentamente o cliente", "Pedir para aguardar", "Encerrar a conversa"],
    correct: 1,
  },
  {
    question: "O que significa SLA?",
    options: ["Service Level Agreement", "Sales Lead Analysis", "Support Line Agent", "System Log Alert"],
    correct: 0,
  },
  {
    question: "Como lidar com um cliente irritado?",
    options: ["Ignorar", "Responder no mesmo tom", "Manter a calma e ser empático", "Encerrar a conversa"],
    correct: 2,
  },
  {
    question: "Qual é o tempo ideal de primeira resposta?",
    options: ["1 hora", "5 minutos", "30 segundos", "1 dia"],
    correct: 1,
  },
  {
    question: "O que é CSAT?",
    options: ["Customer Satisfaction Score", "Company Sales Analysis Tool", "Customer Service Agent Team", "Contact Support And Track"],
    correct: 0,
  },
];

// Emoji Decode Data
const EMOJI_CHALLENGES = [
  { emojis: "😊👍✨", sentiment: "positive", answer: "Satisfeito" },
  { emojis: "😤😠💢", sentiment: "negative", answer: "Irritado" },
  { emojis: "😕🤔❓", sentiment: "neutral", answer: "Confuso" },
  { emojis: "😢😞💔", sentiment: "negative", answer: "Triste" },
  { emojis: "🎉🥳🎊", sentiment: "positive", answer: "Muito Feliz" },
  { emojis: "😐🤷‍♂️", sentiment: "neutral", answer: "Indiferente" },
];

interface TrainingMiniGamesProps {
  onXPEarned?: (xp: number) => void;
}

export function TrainingMiniGames({ onXPEarned }: TrainingMiniGamesProps) {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<Record<GameType, number>>(() => {
    const saved = localStorage.getItem('miniGameHighScores');
    return saved ? JSON.parse(saved) : {};
  });
  const { celebrate } = useCelebration();

  const saveHighScore = (game: GameType, newScore: number) => {
    const currentHigh = highScores[game] || 0;
    if (newScore > currentHigh) {
      const updated = { ...highScores, [game]: newScore };
      setHighScores(updated);
      localStorage.setItem('miniGameHighScores', JSON.stringify(updated));
      return true;
    }
    return false;
  };

  const handleGameComplete = (finalScore: number, xpEarned: number) => {
    const game = GAMES.find(g => g.id === selectedGame);
    const isNewHighScore = saveHighScore(selectedGame!, finalScore);
    
    if (isNewHighScore) {
      celebrate({
        title: '🏆 Novo Recorde!',
        subtitle: `${finalScore} pontos!`,
        emoji: '🎮',
      });
    }

    onXPEarned?.(xpEarned);
    
    toast({
      title: `🎮 ${game?.name} Completo!`,
      description: `Você ganhou ${xpEarned} XP${isNewHighScore ? ' e bateu seu recorde!' : ''}`,
    });

    setIsPlaying(false);
    setScore(finalScore);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-primary" />
          Mini-games de Treinamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GAMES.map((game) => {
            const Icon = game.icon;
            const highScore = highScores[game.id] || 0;
            
            return (
              <motion.button
                key={game.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedGame(game.id);
                  setIsPlaying(true);
                  setScore(0);
                }}
                className="p-4 rounded-lg border hover:border-primary/50 text-left transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{game.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {game.difficulty === 'easy' ? '🟢' : game.difficulty === 'medium' ? '🟡' : '🔴'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {game.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {game.xpReward} XP
                      </Badge>
                      {highScore > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Trophy className="h-3 w-3 mr-1" />
                          {highScore}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Game Dialogs */}
        <SpeedTypingGame
          isOpen={selectedGame === 'speed-typing' && isPlaying}
          onClose={() => setIsPlaying(false)}
          onComplete={handleGameComplete}
        />

        <QuizGame
          isOpen={selectedGame === 'quiz' && isPlaying}
          onClose={() => setIsPlaying(false)}
          onComplete={handleGameComplete}
        />

        <EmojiDecodeGame
          isOpen={selectedGame === 'emoji-decode' && isPlaying}
          onClose={() => setIsPlaying(false)}
          onComplete={handleGameComplete}
        />
      </CardContent>
    </Card>
  );
}

// Speed Typing Game Component
function SpeedTypingGame({ 
  isOpen, 
  onClose, 
  onComplete 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onComplete: (score: number, xp: number) => void;
}) {
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentPhrase(TYPING_PHRASES[Math.floor(Math.random() * TYPING_PHRASES.length)]);
      setUserInput('');
      setScore(0);
      setTimeLeft(60);
      setIsActive(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      onComplete(score, Math.floor(score / 2));
    }
  }, [isActive, timeLeft, score, onComplete]);

  const handleInputChange = (value: string) => {
    setUserInput(value);
    
    if (value === currentPhrase) {
      setScore(s => s + currentPhrase.length);
      setUserInput('');
      setCurrentPhrase(TYPING_PHRASES[Math.floor(Math.random() * TYPING_PHRASES.length)]);
    }
  };

  const accuracy = userInput.length > 0 
    ? (currentPhrase.slice(0, userInput.length).split('').filter((c, i) => c === userInput[i]).length / userInput.length) * 100
    : 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Speed Typing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Timer className="h-4 w-4 mr-1" />
              {timeLeft}s
            </Badge>
            <Badge className="text-lg px-3 py-1">
              <Zap className="h-4 w-4 mr-1" />
              {score} pts
            </Badge>
          </div>

          <Card className="p-4 bg-muted/50">
            <p className="text-lg leading-relaxed">
              {currentPhrase.split('').map((char, i) => (
                <span
                  key={i}
                  className={
                    i < userInput.length
                      ? userInput[i] === char
                        ? 'text-success'
                        : 'text-destructive bg-destructive/20'
                      : ''
                  }
                >
                  {char}
                </span>
              ))}
            </p>
          </Card>

          <Input
            value={userInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Digite aqui..."
            className="text-lg"
            autoFocus
          />

          <Progress value={accuracy} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            Precisão: {accuracy.toFixed(0)}%
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quiz Game Component
function QuizGame({ 
  isOpen, 
  onClose, 
  onComplete 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onComplete: (score: number, xp: number) => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentQuestion(0);
      setScore(0);
      setAnswered(null);
      setShowResult(false);
    }
  }, [isOpen]);

  const question = QUIZ_QUESTIONS[currentQuestion];

  const handleAnswer = (index: number) => {
    if (answered !== null) return;
    
    setAnswered(index);
    if (index === question.correct) {
      setScore(s => s + 20);
    }

    setTimeout(() => {
      if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestion(c => c + 1);
        setAnswered(null);
      } else {
        setShowResult(true);
        const finalScore = score + (index === question.correct ? 20 : 0);
        onComplete(finalScore, Math.floor(finalScore / 3));
      }
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Quiz do Atendimento
          </DialogTitle>
        </DialogHeader>

        {!showResult ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                Pergunta {currentQuestion + 1}/{QUIZ_QUESTIONS.length}
              </Badge>
              <Badge>
                <Star className="h-4 w-4 mr-1" />
                {score} pts
              </Badge>
            </div>

            <Progress 
              value={((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100} 
              className="h-2" 
            />

            <Card className="p-4">
              <p className="text-lg font-medium">{question.question}</p>
            </Card>

            <div className="grid gap-2">
              {question.options.map((option, index) => (
                <Button
                  key={index}
                  variant={
                    answered === null
                      ? 'outline'
                      : index === question.correct
                      ? 'default'
                      : answered === index
                      ? 'destructive'
                      : 'outline'
                  }
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => handleAnswer(index)}
                  disabled={answered !== null}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <Trophy className="h-16 w-16 mx-auto text-warning" />
            <h3 className="text-2xl font-bold">{score} pontos!</h3>
            <p className="text-muted-foreground">
              Você acertou {score / 20} de {QUIZ_QUESTIONS.length} perguntas
            </p>
            <Button onClick={onClose}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Jogar Novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Emoji Decode Game Component
function EmojiDecodeGame({ 
  isOpen, 
  onClose, 
  onComplete 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onComplete: (score: number, xp: number) => void;
}) {
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [score, setScore] = useState(0);
  const [userGuess, setUserGuess] = useState('');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentChallenge(0);
      setScore(0);
      setUserGuess('');
      setShowHint(false);
    }
  }, [isOpen]);

  const challenge = EMOJI_CHALLENGES[currentChallenge];

  const handleSubmit = () => {
    const isCorrect = userGuess.toLowerCase().includes(challenge.answer.toLowerCase()) ||
      challenge.answer.toLowerCase().includes(userGuess.toLowerCase());
    
    if (isCorrect) {
      setScore(s => s + (showHint ? 10 : 20));
    }

    if (currentChallenge < EMOJI_CHALLENGES.length - 1) {
      setCurrentChallenge(c => c + 1);
      setUserGuess('');
      setShowHint(false);
    } else {
      const finalScore = score + (isCorrect ? (showHint ? 10 : 20) : 0);
      onComplete(finalScore, Math.floor(finalScore / 2));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Emoji Decode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {currentChallenge + 1}/{EMOJI_CHALLENGES.length}
            </Badge>
            <Badge>
              <Star className="h-4 w-4 mr-1" />
              {score} pts
            </Badge>
          </div>

          <Card className="p-8 text-center">
            <p className="text-6xl">{challenge.emojis}</p>
            <p className="mt-4 text-muted-foreground">
              Como o cliente está se sentindo?
            </p>
          </Card>

          {showHint && (
            <p className="text-sm text-center text-muted-foreground">
              Dica: O sentimento é {challenge.sentiment === 'positive' ? 'positivo 😊' : 
                challenge.sentiment === 'negative' ? 'negativo 😔' : 'neutro 😐'}
            </p>
          )}

          <div className="flex gap-2">
            <Input
              value={userGuess}
              onChange={(e) => setUserGuess(e.target.value)}
              placeholder="Digite o sentimento..."
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Button onClick={handleSubmit}>
              Confirmar
            </Button>
          </div>

          {!showHint && (
            <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
              Mostrar Dica (-10 pts)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
