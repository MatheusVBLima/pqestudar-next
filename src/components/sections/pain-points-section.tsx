"use client";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

const painPoints = [
  "A sensação de estar sempre \"apagando incêndios\", correndo o dia todo, mas chegando ao final com a impressão de que pouco progrediu no que realmente importa.",
  "Uma lista de tarefas que nunca diminui, onde para cada item riscado, três novos aparecem no lugar.",
  "Dezenas de abas abertas no navegador e na mente, com artigos, vídeos e cursos que você \"vai ver depois\", mas esse \"depois\" nunca chega.",
  "A frustração de ter ótimas ideias, mas não conseguir encontrar tempo ou energia para colocá-las em prática e transformá-las em projetos reais.",
  "A dúvida constante se você está focando nas prioridades certas ou apenas se mantendo ocupada com as demandas dos outros."
];

export function PainPointsSection() {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(new Array(painPoints.length).fill(false));

  const handleCheckChange = (index: number) => {
    const newCheckedItems = [...checkedItems];
    newCheckedItems[index] = !newCheckedItems[index];
    setCheckedItems(newCheckedItems);
  };

  const checkedCount = checkedItems.filter(Boolean).length;

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-accent/10">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Sua rotina profissional se parece com isso?
          </h2>
          <p className="text-muted-foreground text-lg">
            Seja honesta, marque os itens que fazem parte do seu dia a dia:
          </p>
        </div>

        <Card className="p-8 md:p-12 bg-card/80 backdrop-blur-sm shadow-card-custom animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="space-y-6">
            {painPoints.map((point, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent/5 transition-colors"
              >
                <Checkbox
                  id={`pain-${index}`}
                  checked={checkedItems[index]}
                  onCheckedChange={() => handleCheckChange(index)}
                  className="mt-1"
                />
                <label
                  htmlFor={`pain-${index}`}
                  className="text-base leading-relaxed cursor-pointer flex-1"
                >
                  {point}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-border/50">
            <p className="text-lg leading-relaxed text-center">
              {checkedCount >= 2 ? (
                <span className="animate-fade-in">
                  Se você marcou pelo menos dois desses itens, existe uma boa notícia:{" "}
                  <strong className="text-primary">você não tem um problema de competência, você tem um problema de sistema.</strong>{" "}
                  E sistemas podem ser consertados.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Marque os itens que ressoam com você...
                </span>
              )}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
