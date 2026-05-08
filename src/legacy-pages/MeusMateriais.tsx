"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Users, Trophy, Star, Clock, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type RequisitoMaterial =
  | { tipo: "aproveitamento"; valor_necessario: number; descricao_curta: string }
  | { tipo: "ranking"; valor_necessario: number; descricao_curta: string }
  | {
      tipo: "multiplo";
      requisitos_necessarios: { tipo: "pontos" | "cursos_react"; valor: number }[];
      descricao_curta: string;
    }
  | { tipo: "premium_ou_pontos"; valor_necessario: number; descricao_curta: string };

interface MaterialComunidade {
  id: number;
  titulo: string;
  autor: string;
  tipo: string;
  rating: number;
  downloads: number;
  pontos: number;
  como_conseguir: string;
  descricao: string;
  dificuldade: string;
  requisitos: RequisitoMaterial;
}

const MeusMateriais = () => {
  // Estado simulado do progresso do usuário
  const [progressoUsuario] = useState({
    pontos: 320,
    cursosReactConcluidos: 2,
    aproveitamentoTypeScript: 65,
    posicaoRankingLayout: 15,
    membroPremium: false
  });

  const meusMateriais = [
    {
      id: 1,
      titulo: "Certificado JavaScript Avançado",
      tipo: "Certificado",
      dataObtencao: "2024-01-15",
      descricao: "Certificado de conclusão do curso JavaScript Avançado",
      pontos: 100,
      arquivo: "certificado-js.pdf"
    },
    {
      id: 2,
      titulo: "Apostila React Hooks",
      tipo: "Apostila",
      dataObtencao: "2024-02-10",
      descricao: "Material de estudos sobre React Hooks",
      pontos: 50,
      arquivo: "apostila-react.pdf"
    },
    {
      id: 3,
      titulo: "Exercícios Python",
      tipo: "Exercícios",
      dataObtencao: "2024-02-20",
      descricao: "Lista de exercícios práticos de Python",
      pontos: 30,
      arquivo: "exercicios-python.pdf"
    }
  ];

  const materiaisComunidade: MaterialComunidade[] = [
    {
      id: 1,
      titulo: "Guia Completo de TypeScript",
      autor: "João Silva",
      tipo: "Guia",
      rating: 4.8,
      downloads: 1200,
      pontos: 150,
      como_conseguir: "Complete o curso 'TypeScript para Iniciantes' e obtenha 80% de aproveitamento",
      descricao: "Guia abrangente sobre TypeScript com exemplos práticos",
      dificuldade: "Intermediário",
      requisitos: {
        tipo: "aproveitamento",
        valor_necessario: 80,
        descricao_curta: "80% aproveitamento TypeScript"
      }
    },
    {
      id: 2,
      titulo: "Cheat Sheet CSS Grid",
      autor: "Maria Santos",
      tipo: "Referência",
      rating: 4.9,
      downloads: 850,
      pontos: 75,
      como_conseguir: "Participe do desafio 'Layout Responsivo' e alcance o top 10",
      descricao: "Referência rápida para CSS Grid Layout",
      dificuldade: "Iniciante",
      requisitos: {
        tipo: "ranking",
        valor_necessario: 10,
        descricao_curta: "Top 10 no ranking"
      }
    },
    {
      id: 3,
      titulo: "Projeto React E-commerce",
      autor: "Carlos Oliveira",
      tipo: "Projeto",
      rating: 4.7,
      downloads: 650,
      pontos: 200,
      como_conseguir: "Acumule 500 pontos no sistema de gamificação e complete 3 cursos de React",
      descricao: "Projeto completo de e-commerce usando React e Node.js",
      dificuldade: "Avançado",
      requisitos: {
        tipo: "multiplo",
        requisitos_necessarios: [
          { tipo: "pontos", valor: 500 },
          { tipo: "cursos_react", valor: 3 }
        ],
        descricao_curta: "500 pts + 3 cursos React"
      }
    },
    {
      id: 4,
      titulo: "Template Dashboard Admin",
      autor: "Ana Costa",
      tipo: "Template",
      rating: 4.6,
      downloads: 920,
      pontos: 120,
      como_conseguir: "Seja membro premium ou troque por 120 pontos na loja da comunidade",
      descricao: "Template profissional para dashboards administrativos",
      dificuldade: "Intermediário",
      requisitos: {
        tipo: "premium_ou_pontos",
        valor_necessario: 120,
        descricao_curta: "Premium ou 120 pts"
      }
    }
  ];

  const calcularProgresso = (material: MaterialComunidade) => {
    const { requisitos } = material;
    
    switch (requisitos.tipo) {
      case "aproveitamento":
        return Math.min((progressoUsuario.aproveitamentoTypeScript / requisitos.valor_necessario) * 100, 100);
      
      case "ranking":
        return progressoUsuario.posicaoRankingLayout <= requisitos.valor_necessario ? 100 : 
               Math.max(0, 100 - ((progressoUsuario.posicaoRankingLayout - requisitos.valor_necessario) * 10));
      
      case "multiplo": {
        const progressos = requisitos.requisitos_necessarios.map((req) => {
          if (req.tipo === "pontos") {
            return Math.min((progressoUsuario.pontos / req.valor) * 100, 100);
          } else if (req.tipo === "cursos_react") {
            return Math.min((progressoUsuario.cursosReactConcluidos / req.valor) * 100, 100);
          }
          return 0;
        });
        return Math.min(...progressos);
      }
      
      case "premium_ou_pontos":
        if (progressoUsuario.membroPremium) return 100;
        return Math.min((progressoUsuario.pontos / requisitos.valor_necessario) * 100, 100);
      
      default:
        return 0;
    }
  };

  const getProgressoTexto = (material: MaterialComunidade) => {
    const { requisitos } = material;
    const progresso = calcularProgresso(material);
    
    if (progresso >= 100) return "Desbloqueado!";
    
    switch (requisitos.tipo) {
      case "aproveitamento":
        return `${progressoUsuario.aproveitamentoTypeScript}% / ${requisitos.valor_necessario}%`;
      
      case "ranking":
        return `Posição ${progressoUsuario.posicaoRankingLayout} / Top ${requisitos.valor_necessario}`;
      
      case "multiplo":
        return `${progressoUsuario.pontos}/500 pts • ${progressoUsuario.cursosReactConcluidos}/3 cursos`;
      
      case "premium_ou_pontos":
        return progressoUsuario.membroPremium ? "Premium ativo" : `${progressoUsuario.pontos}/${requisitos.valor_necessario} pts`;
      
      default:
        return "";
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "Certificado": return "bg-green-100 text-green-800";
      case "Apostila": return "bg-blue-100 text-blue-800";
      case "Exercícios": return "bg-orange-100 text-orange-800";
      case "Guia": return "bg-purple-100 text-purple-800";
      case "Referência": return "bg-pink-100 text-pink-800";
      case "Projeto": return "bg-red-100 text-red-800";
      case "Template": return "bg-cyan-100 text-cyan-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDificuldadeColor = (dificuldade: string) => {
    switch (dificuldade) {
      case "Iniciante": return "bg-green-100 text-green-800";
      case "Intermediário": return "bg-yellow-100 text-yellow-800";
      case "Avançado": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meus Materiais</h1>
          <p className="text-muted-foreground">
            Gerencie seus materiais de estudo e explore conteúdos da comunidade
          </p>
        </div>

        <Tabs defaultValue="meus-materiais" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meus-materiais">
              <FileText className="w-4 h-4 mr-2" />
              Meus Materiais
            </TabsTrigger>
            <TabsTrigger value="comunidade">
              <Users className="w-4 h-4 mr-2" />
              Comunidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meus-materiais" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {meusMateriais.map((material) => (
                <Card key={material.id} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{material.titulo}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={getTipoColor(material.tipo)}>
                            {material.tipo}
                          </Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Trophy className="w-4 h-4 mr-1" />
                            {material.pontos} pts
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardDescription>
                      {material.descricao}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(material.dataObtencao).toLocaleDateString('pt-BR')}
                      </div>
                      <Button size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comunidade" className="space-y-4">
            <div className="grid gap-6">
              {materiaisComunidade.map((material) => (
                <Card key={material.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-xl">{material.titulo}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getTipoColor(material.tipo)}>
                            {material.tipo}
                          </Badge>
                          <Badge className={getDificuldadeColor(material.dificuldade)}>
                            {material.dificuldade}
                          </Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                            {material.rating}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Download className="w-4 h-4 mr-1" />
                            {material.downloads}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Trophy className="w-4 h-4 mr-1" />
                            {material.pontos} pts
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Por {material.autor}
                        </p>
                      </div>
                    </div>
                    <CardDescription className="text-base">
                      {material.descricao}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2 flex items-center">
                          <Trophy className="w-4 h-4 mr-2 text-primary" />
                          Como conseguir este material:
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {material.como_conseguir}
                        </p>
                        
                        {/* Indicador de Progresso */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-primary" />
                              <span className="font-medium">Seu Progresso:</span>
                            </span>
                            <span className="text-muted-foreground">
                              {getProgressoTexto(material)}
                            </span>
                          </div>
                          <Progress 
                            value={calcularProgresso(material)} 
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground text-right">
                            {calcularProgresso(material).toFixed(0)}% completo
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button disabled={calcularProgresso(material) < 100}>
                          {calcularProgresso(material) >= 100 ? "Baixar Agora" : "Ver Detalhes"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
    </div>
  );
};

export default MeusMateriais;
