"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Eye as EyeIcon, Star, Heart, ThumbsUp, ThumbsDown, Pencil, Trash2, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingBadge } from "./trending-badge";
import { useVoting } from "@/hooks/useVoting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  students: number;
  rating: number;
  price: string;
  image: string;
  institution: string;
  level: string;
  badge?: 'trending' | 'popular' | 'community' | null;
  is_active?: boolean;
  affiliate_link?: string;
  views: number;
  likes: number;
  dislikes: number;
}

interface CourseCardProps {
  course: Course;
  isFavorite: boolean;
  onToggleFavorite: (courseId: string) => void;
  isManagementMode?: boolean;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
  onHide?: (courseId: string) => void;
}

export function CourseCard({ 
  course, 
  isFavorite, 
  onToggleFavorite,
  isManagementMode = false,
  onEdit,
  onDelete,
  onHide
}: CourseCardProps) {
  const router = useRouter();
  const { userVote, upvotes, downvotes, vote, loading } = useVoting(course.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Usar rating pré-calculado da VIEW (0-5 baseado em votos)
  const averageRating = course.rating ?? null;
  const totalVotes = course.likes + course.dislikes;

  // Formatar views
  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };
  const formattedViews = course.views > 0 ? formatViews(course.views) : null;

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 hover-scale relative">
        {/* Admin Controls - Aparecem no hover quando em modo gerenciamento */}
        {isManagementMode && (
          <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 bg-background/95 p-1 rounded-lg shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(course);
              }}
              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900 dark:hover:text-blue-300"
              title="Editar curso"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onHide?.(course.id);
              }}
              className="h-8 w-8 p-0 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900 dark:hover:text-amber-300"
              title="Ocultar curso"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900 dark:hover:text-red-300"
              title="Excluir permanentemente"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="relative overflow-hidden rounded-t-lg">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4">
          <TrendingBadge badge={course.badge} />
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(course.id);
            }}
            className="h-8 w-8 p-0 bg-background/90 hover:bg-background"
          >
            <Heart 
              className={`h-4 w-4 ${
                isFavorite 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-muted-foreground'
              }`} 
            />
          </Button>
          <Badge className="bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
            {course.level}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>
        {/* Não mostrar link de afiliado para usuários */}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <TooltipProvider>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {course.duration}
            </div>
            
            {/* Views */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <EyeIcon className="h-4 w-4" />
                  <span className={formattedViews === null ? "text-muted-foreground/50" : ""}>
                    {formattedViews ?? "—"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formattedViews === null ? "Sem dados" : `${course.views} visualizações`}</p>
              </TooltipContent>
            </Tooltip>

            {/* Rating baseado em votos */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="flex items-center gap-1"
                  aria-label={averageRating !== null ? `Nota média ${averageRating} de 5` : "Sem avaliações"}
                >
                  <Star 
                    className={`h-4 w-4 transition-all duration-300 ${
                      averageRating !== null && averageRating > 3
                        ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]'
                        : averageRating !== null
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/50'
                    }`}
                  />
                  <span className={averageRating === null ? "text-muted-foreground/50" : "font-medium"}>
                    {averageRating ?? "—"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{averageRating !== null ? `Nota ${averageRating} de 5 (baseada em ${totalVotes} votos)` : "Sem avaliações"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              vote('up');
            }}
            disabled={loading}
            aria-label="Curtir curso"
            className={`flex items-center gap-1.5 h-9 px-3 transition-all duration-200 hover:scale-105 ${
              userVote === 'up' 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'hover:bg-primary/5'
            }`}
          >
            <ThumbsUp className={`h-4 w-4 transition-transform ${userVote === 'up' ? 'scale-110' : ''}`} />
            <span className="text-sm font-medium">{upvotes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              vote('down');
            }}
            disabled={loading}
            aria-label="Não curtir curso"
            className={`flex items-center gap-1.5 h-9 px-3 transition-all duration-200 hover:scale-105 ${
              userVote === 'down' 
                ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                : 'hover:bg-destructive/5'
            }`}
          >
            <ThumbsDown className={`h-4 w-4 transition-transform ${userVote === 'down' ? 'scale-110' : ''}`} />
            <span className="text-sm font-medium">{downvotes}</span>
          </Button>
        </div>
        
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col justify-end min-h-[60px]">
            <div className="text-xl font-bold text-primary leading-tight">
              Consultar
            </div>
            <p className="text-sm text-muted-foreground leading-tight">
              por {course.institution}
            </p>
          </div>
          <Button 
            className="hover-scale shrink-0"
            onClick={() => {
              if (course.affiliate_link) {
                window.open(course.affiliate_link, '_blank');
              } else {
                router.push(`/curso/${course.id}`);
              }
            }}
          >
            Inscrever-se
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Dialog de Confirmação de Exclusão */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a remover o curso "{course.title}". Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete?.(course.id);
              setShowDeleteDialog(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remover Curso
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
