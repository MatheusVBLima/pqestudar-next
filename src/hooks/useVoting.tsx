import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export type VoteType = 'up' | 'down';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado';

export const useVoting = (courseId: string) => {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [loading, setLoading] = useState(false);

  // Buscar voto do usuário e contadores
  useEffect(() => {
    const fetchVoteData = async () => {
      // Buscar contadores do curso da view pública
      const { data: courseData } = await supabase
        .from('active_courses')
        .select('upvotes, downvotes')
        .eq('id', courseId)
        .maybeSingle();

      if (courseData) {
        setUpvotes(courseData.upvotes || 0);
        setDownvotes(courseData.downvotes || 0);
      }

      // Buscar voto do usuário se estiver autenticado
      if (user) {
        const { data: voteData } = await supabase
          .from('course_votes')
          .select('vote_type')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (voteData) {
          setUserVote(voteData.vote_type as VoteType);
        }
      }
    };

    fetchVoteData();
  }, [courseId, user]);

  const vote = async (voteType: VoteType) => {
    if (!user) {
      toast({
        title: "Faça login para votar",
        description: "Você precisa estar autenticado para votar em cursos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Se o usuário já votou no mesmo tipo, remove o voto
      if (userVote === voteType) {
        const { error } = await supabase
          .from('course_votes')
          .delete()
          .eq('course_id', courseId)
          .eq('user_id', user.id);

        if (error) throw error;

        setUserVote(null);
        toast({
          title: "Voto removido",
          description: "Seu voto foi removido com sucesso."
        });
      } else {
        // Insere ou atualiza o voto
        const { error } = await supabase
          .from('course_votes')
          .upsert({
            course_id: courseId,
            user_id: user.id,
            vote_type: voteType
          }, {
            onConflict: 'user_id,course_id'
          });

        if (error) throw error;

        setUserVote(voteType);
        toast({
          title: "Voto registrado",
          description: `Você votou ${voteType === 'up' ? 'positivamente' : 'negativamente'} neste curso.`
        });
      }

      // Atualizar contadores localmente
      const { data: courseData } = await supabase
        .from('active_courses')
        .select('upvotes, downvotes')
        .eq('id', courseId)
        .maybeSingle();

      if (courseData) {
        setUpvotes(courseData.upvotes || 0);
        setDownvotes(courseData.downvotes || 0);
      }
    } catch (error: unknown) {
      toast({
        title: "Erro ao votar",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    userVote,
    upvotes,
    downvotes,
    voteScore: upvotes - downvotes,
    vote,
    loading
  };
};
