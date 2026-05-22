"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Users, Star, Play, BookOpen, CheckCircle, Download, Heart } from "lucide-react";
import { useState } from "react";

const coursesData: Record<number, {
  id: number;
  title: string;
  description: string;
  fullDescription: string;
  category: string;
  duration: string;
  students: number;
  rating: number;
  price: string;
  image: string;
  instructor: string;
  level: string;
  modules: { name: string; duration: string; completed: boolean }[];
  skills: string[];
  prerequisites: string;
}> = {
  1: {
    id: 1,
    title: "Desenvolvimento Web Completo",
    description: "Aprenda HTML, CSS, JavaScript e React do zero ao avançado",
    fullDescription:
      "Este curso completo de desenvolvimento web foi criado para levar você do básico ao avançado. Você aprenderá as tecnologias mais importantes do mercado e estará pronto para trabalhar como desenvolvedor front-end.",
    category: "tech",
    duration: "40h",
    students: 1250,
    rating: 4.8,
    price: "R$ 199,90",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&crop=center",
    instructor: "João Silva",
    level: "Iniciante",
    modules: [
      { name: "Introdução ao HTML", duration: "3h", completed: false },
      { name: "CSS Básico e Avançado", duration: "8h", completed: false },
      { name: "JavaScript Fundamentals", duration: "12h", completed: false },
      { name: "React do Zero", duration: "15h", completed: false },
      { name: "Projeto Final", duration: "2h", completed: false },
    ],
    skills: ["HTML5", "CSS3", "JavaScript", "React", "Responsive Design"],
    prerequisites: "Nenhum conhecimento prévio necessário",
  },
};

export default function CourseDetailNext() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [isFavorite, setIsFavorite] = useState(false);

  const course = coursesData[Number(idParam)];

  if (!course) {
    return (
      <div className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Curso não encontrado</h1>
          <Button onClick={() => router.push("/explorar-cursos")}>
            Voltar para Explorar Cursos
          </Button>
        </div>
      </div>
    );
  }

  const toggleFavorite = () => setIsFavorite(!isFavorite);

  return (
    <div className="flex-1 bg-background">
      <div className="bg-gradient-hero py-16">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/explorar-cursos")}
            className="mb-6 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Cursos
          </Button>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-white/20 text-white border-white/30">{course.level}</Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">{course.title}</h1>
              <p className="text-xl text-white/90 mb-8">{course.fullDescription}</p>

              <div className="flex flex-wrap items-center gap-6 mb-8 text-white/90">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{course.students} alunos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span>{course.rating}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <p className="text-3xl font-bold text-white">{course.price}</p>
                  <p className="text-white/80">Instrutor: {course.instructor}</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <img src={course.image} alt={course.title} className="w-full rounded-lg shadow-2xl" />
              <Button size="lg" className="absolute inset-0 m-auto h-20 w-20 rounded-full">
                <Play className="h-8 w-8" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Conteúdo do Curso
                </CardTitle>
                <CardDescription>
                  {course.modules.length} módulos • {course.duration} de conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.modules.map((module, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">{module.name}</h4>
                          <p className="text-sm text-muted-foreground">{module.duration}</p>
                        </div>
                      </div>
                      {module.completed && <CheckCircle className="h-5 w-5 text-green-500" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>O que você vai aprender</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {course.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 text-muted-foreground">
                  <strong>Pré-requisitos:</strong> {course.prerequisites}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">{course.price}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" size="lg">
                  Inscrever-se Agora
                </Button>
                <Button variant="outline" className="w-full" onClick={toggleFavorite}>
                  <Heart
                    className={`h-4 w-4 mr-2 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                  />
                  {isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Materiais
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações do Curso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span>{course.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alunos:</span>
                  <span>{course.students}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avaliação:</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {course.rating}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nível:</span>
                  <Badge variant="secondary">{course.level}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
