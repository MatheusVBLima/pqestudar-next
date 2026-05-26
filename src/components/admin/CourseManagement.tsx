import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { CourseForm } from './CourseForm';
import { useCourses, Course, type CreateCourseData } from '@/hooks/useCourses';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const CourseManagement = () => {
  const { courses, loading, createCourse, updateCourse, deleteCourse } = useCourses();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const handleCreateCourse = async (courseData: CreateCourseData) => {
    const { error } = await createCourse(courseData);
    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Curso criado com sucesso!',
      });
      setIsFormOpen(false);
    }
  };

  const handleUpdateCourse = async (courseData: CreateCourseData) => {
    if (!editingCourse) return;
    
    const { error } = await updateCourse({ ...courseData, id: editingCourse.id });
    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Curso atualizado com sucesso!',
      });
      setEditingCourse(null);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const { error } = await deleteCourse(courseId);
    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Curso removido com sucesso!',
      });
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'tech': return 'default';
      case 'business': return 'secondary';
      case 'design': return 'outline';
      case 'marketing': return 'destructive';
      default: return 'default';
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'Iniciante': return 'secondary';
      case 'Intermediário': return 'default';
      case 'Avançado': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando cursos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Cursos</h1>
          <p className="text-muted-foreground">Adicione, edite ou remova cursos da plataforma</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Curso
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Badge variant={getCategoryBadgeVariant(course.category)}>
                    {course.category}
                  </Badge>
                  <Badge variant={getLevelBadgeVariant(course.level)}>
                    {course.level}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCourse(course)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Curso</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover o curso "{course.title}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteCourse(course.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <CardTitle className="text-lg">{course.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {course.image_url && (
                <img 
                  src={course.image_url} 
                  alt={course.title}
                  className="w-full h-32 object-cover rounded-md mb-4"
                />
              )}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {course.description}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Instituição:</span>
                  <span className="font-medium">{course.institution}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duração:</span>
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preço:</span>
                  <span className="font-medium text-primary">{course.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alunos:</span>
                  <span className="font-medium">{course.students}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avaliação:</span>
                  <span className="font-medium">⭐ {course.rating}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isFormOpen || !!editingCourse} onOpenChange={(open) => {
        if (!open) {
          setIsFormOpen(false);
          setEditingCourse(null);
        }
      }}>
        <CourseForm
          course={editingCourse}
          onOpenChange={(open) => {
            if (!open) {
              setIsFormOpen(false);
              setEditingCourse(null);
            }
          }}
          onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse}
        />
      </Dialog>
    </div>
  );
};
