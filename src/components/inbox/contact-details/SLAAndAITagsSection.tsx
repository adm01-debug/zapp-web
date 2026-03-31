import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { SLAInfo, AIConversationTag } from '@/hooks/useContactEnrichedData';

interface SLAAndAITagsSectionProps {
  slaInfo: SLAInfo | null | undefined;
  aiTags: AIConversationTag[];
}

export function SLAAndAITagsSection({ slaInfo, aiTags }: SLAAndAITagsSectionProps) {
  const hasSLA = slaInfo && (slaInfo.first_response_breached !== null || slaInfo.resolution_breached !== null);
  const hasAITags = aiTags.length > 0;

  if (!hasSLA && !hasAITags) return null;

  return (
    <div className="space-y-3">
      {/* SLA Indicator */}
      {hasSLA && (
        <div>
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            SLA
          </h5>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs bg-muted/20 rounded-lg p-2.5">
              <span className="text-muted-foreground">Primeira resposta</span>
              {slaInfo.first_response_breached ? (
                <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Violado
                </Badge>
              ) : slaInfo.first_response_at ? (
                <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  OK
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">
                  Pendente
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-xs bg-muted/20 rounded-lg p-2.5">
              <span className="text-muted-foreground">Resolução</span>
              {slaInfo.resolution_breached ? (
                <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Violado
                </Badge>
              ) : slaInfo.resolved_at ? (
                <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Resolvido
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">
                  Em andamento
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Tags */}
      {hasAITags && (
        <div>
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Tags IA
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {aiTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[10px] bg-primary/10 border-primary/20 text-foreground"
              >
                {tag.tag_name}
                {tag.confidence && (
                  <span className="ml-1 text-muted-foreground">
                    {Math.round(tag.confidence * 100)}%
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
