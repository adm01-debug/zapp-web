import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

interface BorderRadiusControlProps {
  borderRadius: number;
  onChange: (value: number[]) => void;
}

export function BorderRadiusControl({ borderRadius, onChange }: BorderRadiusControlProps) {
  return (
    <Card className="border-secondary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Raio da Borda</CardTitle>
        <CardDescription className="text-xs">Ajuste o arredondamento dos elementos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Slider
            value={[borderRadius]}
            onValueChange={onChange}
            min={0}
            max={20}
            step={1}
            className="flex-1"
          />
          <Badge variant="outline" className="min-w-[3rem] justify-center">{borderRadius}px</Badge>
        </div>
        <div className="flex gap-3 mt-4">
          <div
            className="w-16 h-10 bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium"
            style={{ borderRadius: `${borderRadius}px` }}
          >
            Botão
          </div>
          <div
            className="w-24 h-10 bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground"
            style={{ borderRadius: `${borderRadius}px` }}
          >
            Input
          </div>
          <div
            className="w-20 h-10 bg-card border border-border flex items-center justify-center text-xs text-foreground"
            style={{ borderRadius: `${borderRadius}px` }}
          >
            Card
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
