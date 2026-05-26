"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementBadge } from "@/components/ui/achievement-badge";
import { useGamification } from "@/hooks/useGamification";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { User, Trophy, Calendar, Edit, Save, X, Crown, Target, Trash2, AlertTriangle, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const MeuPerfil = () => {
  const { 
    userProfile, 
    canChangeUsername, 
    changeUsername, 
    getDaysUntilUsernameChange,
    updateProfile 
  } = useGamification();
  const { simulateAccountDeletion } = useNotifications();
  const { toast } = useToast();
  
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(userProfile?.username || "");
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(userProfile?.displayName || "");
  
  // Account deletion states (mock data - will be replaced with Supabase)
  const [accountDeletionRequested, setAccountDeletionRequested] = useState(false);
  const [deletionRequestDate, setDeletionRequestDate] = useState<Date | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-48 rounded-xl lg:col-span-2" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  const handleUsernameChange = () => {
    if (!canChangeUsername()) {
      const daysLeft = getDaysUntilUsernameChange();
      toast({
        title: "Mudança não permitida",
        description: `Você pode alterar seu nome de usuário em ${daysLeft} dias.`,
        variant: "destructive"
      });
      return;
    }

    if (newUsername.trim().length < 3) {
      toast({
        title: "Nome inválido",
        description: "O nome de usuário deve ter pelo menos 3 caracteres.",
        variant: "destructive"
      });
      return;
    }

    if (changeUsername(newUsername.trim())) {
      setIsEditingUsername(false);
      toast({
        title: "Nome alterado!",
        description: "Seu nome de usuário foi atualizado com sucesso."
      });
    }
  };

  const handleDisplayNameChange = () => {
    if (newDisplayName.trim().length < 2) {
      toast({
        title: "Nome inválido",
        description: "O nome de exibição deve ter pelo menos 2 caracteres.",
        variant: "destructive"
      });
      return;
    }

    updateProfile({ displayName: newDisplayName.trim() });
    setIsEditingDisplayName(false);
    toast({
      title: "Nome atualizado!",
      description: "Seu nome de exibição foi alterado com sucesso."
    });
  };

  // Account deletion functions (mock - will be replaced with Supabase)
  const handleAccountDeletionRequest = () => {
    if (confirmationInput !== "DELETAR") {
      toast({
        title: "Confirmação incorreta",
        description: "Digite 'DELETAR' para confirmar a solicitação.",
        variant: "destructive"
      });
      return;
    }

    setAccountDeletionRequested(true);
    setDeletionRequestDate(new Date());
    setConfirmationInput("");
    
    // 1. First toast: Solicitação enviada
    toast({
      title: "Solicitação enviada",
      description: "Sua solicitação de exclusão foi processada com sucesso.",
    });
    
    // 2. After 2s: Segunda notificação e criar notificação no sino
    setTimeout(() => {
      // Create notification for account deletion
      const username = userProfile?.displayName || userProfile?.username || 'Usuário';
      const reason = 'Solicitação do próprio usuário';
      simulateAccountDeletion(username, reason);
      
      // Toast informando sobre a notificação
      toast({
        title: "📔 Nova notificação - Verifique o ícone de sino",
        description: "Uma notificação com os detalhes da exclusão foi criada.",
      });
    }, 2000);
  };

  const handleCancelDeletion = () => {
    setAccountDeletionRequested(false);
    setDeletionRequestDate(null);
    toast({
      title: "Deleção cancelada",
      description: "A solicitação de deleção da sua conta foi cancelada com sucesso."
    });
  };

  const getDaysUntilDeletion = () => {
    if (!deletionRequestDate) return 0;
    const now = new Date();
    const deletionDate = new Date(deletionRequestDate);
    deletionDate.setDate(deletionDate.getDate() + 30);
    const diffTime = deletionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getXpForNextLevel = () => {
    return userProfile.level * 100;
  };

  const getXpProgress = () => {
    const currentLevelXp = (userProfile.level - 1) * 100;
    const xpInCurrentLevel = userProfile.xp - currentLevelXp;
    const xpNeededForLevel = 100;
    return (xpInCurrentLevel / xpNeededForLevel) * 100;
  };

  const getBadgesByCategory = () => {
    const categories = {
      community: userProfile.badges.filter(b => b.category === 'community'),
      learning: userProfile.badges.filter(b => b.category === 'learning'),
      engagement: userProfile.badges.filter(b => b.category === 'engagement'),
      achievement: userProfile.badges.filter(b => b.category === 'achievement')
    };
    return categories;
  };

  const badgesByCategory = getBadgesByCategory();

  return (
    <div className="min-h-screen bg-background">
      
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Meu Perfil</h1>
          <p className="text-lg text-muted-foreground">
            Gerencie suas informações e veja suas conquistas na plataforma
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações do Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome de Exibição</Label>
                  {isEditingDisplayName ? (
                    <div className="flex gap-2">
                      <Input
                        id="displayName"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        placeholder="Seu nome de exibição"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleDisplayNameChange}
                        className="px-3"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setIsEditingDisplayName(false);
                          setNewDisplayName(userProfile.displayName);
                        }}
                        className="px-3"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{userProfile.displayName}</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setIsEditingDisplayName(true)}
                        className="px-3"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário</Label>
                  {isEditingUsername ? (
                    <div className="flex gap-2">
                      <Input
                        id="username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Seu nome de usuário"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleUsernameChange}
                        className="px-3"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setIsEditingUsername(false);
                          setNewUsername(userProfile.username);
                        }}
                        className="px-3"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">@{userProfile.username}</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setIsEditingUsername(true)}
                        disabled={!canChangeUsername()}
                        className="px-3"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {!canChangeUsername() && (
                    <p className="text-xs text-muted-foreground">
                      Próxima mudança disponível em {getDaysUntilUsernameChange()} dias
                    </p>
                  )}
                </div>

                {/* Join Date */}
                <div className="space-y-2">
                  <Label>Membro desde</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(userProfile.joinDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nível</span>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {userProfile.level}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">XP</span>
                    <span className="text-sm font-medium">
                      {userProfile.xp} / {getXpForNextLevel()}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${getXpProgress()}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pontos da Comunidade</span>
                  <Badge variant="outline" className="text-lg font-bold text-primary">
                    {userProfile.communityPoints}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ajudas à Comunidade</span>
                  <Badge variant="outline" className="text-lg font-bold text-green-600">
                    {userProfile.helpActions}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conquistas</span>
                  <Badge variant="outline" className="text-lg font-bold text-yellow-600">
                    {userProfile.badges.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Account Management */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" />
                  Gerenciar Conta
                </CardTitle>
                <CardDescription>
                  Configurações avançadas da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {accountDeletionRequested ? (
                  <div className="space-y-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="space-y-2">
                        <h4 className="font-semibold text-destructive">
                          Conta marcada para deleção
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Sua conta será excluída permanentemente em{" "}
                          <span className="font-semibold text-destructive">
                            {getDaysUntilDeletion()} dias
                          </span>
                          .
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Solicitado em: {deletionRequestDate?.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleCancelDeletion}
                      variant="outline"
                      className="w-full"
                    >
                      Cancelar Deleção
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">
                        <strong>Atenção:</strong> A deleção da conta é permanente e irreversível.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Todos os seus dados serão removidos</li>
                        <li>Suas conquistas e progresso serão perdidos</li>
                        <li>Você terá 30 dias para cancelar a operação</li>
                      </ul>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Conta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Confirmar deleção da conta
                          </AlertDialogTitle>
                           <AlertDialogDescription className="space-y-4">
                             <p>
                               Esta ação iniciará o processo de deleção da sua conta. 
                               Você terá <strong>30 dias</strong> para cancelar antes que 
                               todos os seus dados sejam removidos permanentemente.
                             </p>
                             <div className="space-y-2">
                               <Label htmlFor="confirmation">
                                 Digite "DELETAR" para confirmar:
                               </Label>
                               <Input
                                 id="confirmation"
                                 value={confirmationInput}
                                 onChange={(e) => setConfirmationInput(e.target.value)}
                                 placeholder="DELETAR"
                                 className="font-mono"
                               />
                             </div>
                           </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setConfirmationInput("")}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleAccountDeletionRequest}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Confirmar Deleção
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Suas Conquistas
                </CardTitle>
                <CardDescription>
                  Badges conquistados através da sua participação na comunidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userProfile.badges.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                      Nenhuma conquista ainda
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Comece contribuindo com a comunidade para ganhar suas primeiras conquistas!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Community Badges */}
                    {badgesByCategory.community.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-blue-600">Comunidade</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {badgesByCategory.community.map((badge) => (
                            <AchievementBadge 
                              key={badge.id} 
                              badge={badge} 
                              showDate 
                              size="lg" 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Engagement Badges */}
                    {badgesByCategory.engagement.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-semibold mb-3 text-green-600">Engajamento</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {badgesByCategory.engagement.map((badge) => (
                              <AchievementBadge 
                                key={badge.id} 
                                badge={badge} 
                                showDate 
                                size="lg" 
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Achievement Badges */}
                    {badgesByCategory.achievement.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-semibold mb-3 text-purple-600">Conquistas Especiais</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {badgesByCategory.achievement.map((badge) => (
                              <AchievementBadge 
                                key={badge.id} 
                                badge={badge} 
                                showDate 
                                size="lg" 
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Learning Badges */}
                    {badgesByCategory.learning.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-semibold mb-3 text-orange-600">Aprendizado</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {badgesByCategory.learning.map((badge) => (
                              <AchievementBadge 
                                key={badge.id} 
                                badge={badge} 
                                showDate 
                                size="lg" 
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MeuPerfil;
