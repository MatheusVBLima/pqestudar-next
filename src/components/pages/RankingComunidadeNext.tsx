"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AchievementBadge } from "@/components/ui/achievement-badge";
import { useGamification } from "@/hooks/useGamification";
import { Trophy, Medal, Award, Crown, Users, Target, TrendingUp } from "lucide-react";

export default function RankingComunidadeNext() {
  const { communityRanking, userProfile } = useGamification();

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-orange-500" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getRankBackground = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50";
      case 3:
        return "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50";
      default:
        return "bg-card border-border";
    }
  };

  const currentUserRank = communityRanking.findIndex((user) => user.userId === userProfile?.id) + 1;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-foreground">Ranking da Comunidade</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Veja os membros que mais contribuem para enriquecer nossa plataforma educacional
          </p>
        </div>

        {currentUserRank > 0 && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Target className="h-5 w-5" />
                Sua Posição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getRankIcon(currentUserRank)}
                    <span className="text-2xl font-bold">{currentUserRank}º lugar</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {userProfile?.helpActions} contribuições • {userProfile?.communityPoints} pontos
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg">
                  Nível {userProfile?.level}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{communityRanking.length}</p>
                  <p className="text-sm text-muted-foreground">Membros Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {communityRanking.reduce((acc, user) => acc + user.helpActions, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de Contribuições</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Crown className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {communityRanking.reduce((acc, user) => acc + user.communityPoints, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Pontos da Comunidade</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ranking de Contribuições
            </CardTitle>
            <CardDescription>
              Ordenado por número de contribuições para a comunidade educacional
            </CardDescription>
          </CardHeader>
          <CardContent>
            {communityRanking.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  Ainda não há membros no ranking
                </h3>
                <p className="text-muted-foreground">Seja o primeiro a contribuir com a comunidade!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {communityRanking.map((user, index) => {
                  const position = index + 1;
                  const isCurrentUser = user.userId === userProfile?.id;

                  return (
                    <Card
                      key={user.userId}
                      className={`${getRankBackground(position)} transition-all hover:shadow-md ${
                        isCurrentUser ? "ring-2 ring-primary/50" : ""
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background border-2">
                              {getRankIcon(position)}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold">
                                  {user.displayName}
                                  {isCurrentUser && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      Você
                                    </Badge>
                                  )}
                                </h3>
                              </div>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  <strong>{user.helpActions}</strong> contribuições
                                </span>
                                <span className="flex items-center gap-1">
                                  <Target className="h-4 w-4 text-primary" />
                                  <strong>{user.communityPoints}</strong> pontos
                                </span>
                                <Badge variant="outline">Nível {user.level}</Badge>
                              </div>
                            </div>
                          </div>

                          {user.topBadges.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground hidden sm:block">
                                Top conquistas:
                              </span>
                              <div className="flex gap-1">
                                {user.topBadges.slice(0, 3).map((badge) => (
                                  <AchievementBadge
                                    key={badge.id}
                                    badge={badge}
                                    size="sm"
                                    className="text-center"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
