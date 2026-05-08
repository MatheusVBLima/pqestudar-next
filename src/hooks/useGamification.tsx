import { useState, useEffect } from 'react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'community' | 'learning' | 'engagement' | 'achievement';
  dateEarned?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  joinDate: string;
  lastUsernameChange?: string;
  communityPoints: number;
  helpActions: number;
  badges: Badge[];
  level: number;
  xp: number;
}

export interface CommunityRanking {
  userId: string;
  username: string;
  displayName: string;
  helpActions: number;
  communityPoints: number;
  level: number;
  topBadges: Badge[];
}

const BADGES_CATALOG: Omit<Badge, 'dateEarned'>[] = [
  {
    id: 'first-help',
    name: 'Primeira Ajuda',
    description: 'Contribuiu pela primeira vez para a comunidade buscando mais notícias',
    icon: '🤝',
    color: 'bg-blue-500',
    category: 'community',
    rarity: 'common'
  },
  {
    id: 'news-explorer',
    name: 'Explorador de Notícias',
    description: 'Buscou notícias 10 vezes',
    icon: '📰',
    color: 'bg-green-500',
    category: 'engagement',
    rarity: 'rare'
  },
  {
    id: 'community-helper',
    name: 'Ajudante da Comunidade',
    description: 'Contribuiu 25 vezes para enriquecer a plataforma',
    icon: '⭐',
    color: 'bg-yellow-500',
    category: 'community',
    rarity: 'epic'
  },
  {
    id: 'perpetual-contributor',
    name: 'Perpétuo',
    description: 'Contribuidor eterno da comunidade educacional',
    icon: '👑',
    color: 'bg-purple-500',
    category: 'achievement',
    rarity: 'legendary'
  }
];

export const useGamification = (isAdmin: boolean = false) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [communityRanking, setCommunityRanking] = useState<CommunityRanking[]>([]);

  // Initialize user profile if doesn't exist (skip for admins)
  useEffect(() => {
    // Admins don't participate in gamification
    if (isAdmin) {
      setUserProfile(null);
      return;
    }

    const stored = localStorage.getItem('user-profile');
    if (!stored) {
      const newProfile: UserProfile = {
        id: 'user-' + Date.now(),
        username: 'usuario' + Math.floor(Math.random() * 1000),
        displayName: 'Usuário',
        joinDate: new Date().toISOString(),
        communityPoints: 0,
        helpActions: 0,
        badges: [],
        level: 1,
        xp: 0
      };
      localStorage.setItem('user-profile', JSON.stringify(newProfile));
      setUserProfile(newProfile);
    } else {
      setUserProfile(JSON.parse(stored));
    }

    // Load community ranking
    const rankingStored = localStorage.getItem('community-ranking');
    if (rankingStored) {
      setCommunityRanking(JSON.parse(rankingStored));
    }
  }, [isAdmin]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    
    const updatedProfile = { ...userProfile, ...updates };
    setUserProfile(updatedProfile);
    localStorage.setItem('user-profile', JSON.stringify(updatedProfile));
  };

  const canChangeUsername = () => {
    if (!userProfile?.lastUsernameChange) return true;
    
    const lastChange = new Date(userProfile.lastUsernameChange);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff >= 90;
  };

  const changeUsername = (newUsername: string) => {
    if (!canChangeUsername()) return false;
    
    updateProfile({
      username: newUsername,
      lastUsernameChange: new Date().toISOString()
    });
    return true;
  };

  const awardBadge = (badgeId: string): Badge | null => {
    if (!userProfile) return null;
    
    const badgeTemplate = BADGES_CATALOG.find(b => b.id === badgeId);
    if (!badgeTemplate) return null;
    
    // Check if user already has this badge
    if (userProfile.badges.some(b => b.id === badgeId)) return null;
    
    const newBadge: Badge = {
      ...badgeTemplate,
      dateEarned: new Date().toISOString()
    };
    
    const pointsMap = {
      common: 10,
      rare: 25,
      epic: 50,
      legendary: 100
    };
    
    const newPoints = pointsMap[newBadge.rarity];
    const newXp = newPoints * 2;
    const newLevel = Math.floor((userProfile.xp + newXp) / 100) + 1;
    
    updateProfile({
      badges: [...userProfile.badges, newBadge],
      communityPoints: userProfile.communityPoints + newPoints,
      xp: userProfile.xp + newXp,
      level: Math.max(userProfile.level, newLevel)
    });
    
    return newBadge;
  };

  const recordHelpAction = (): Badge | null => {
    // Admins don't participate in gamification
    if (!userProfile || isAdmin) return null;
    
    const newHelpCount = userProfile.helpActions + 1;
    updateProfile({ helpActions: newHelpCount });
    
    let newBadge: Badge | null = null;
    
    // Award badges based on help actions
    if (newHelpCount === 1) {
      newBadge = awardBadge('first-help');
    } else if (newHelpCount === 10) {
      newBadge = awardBadge('news-explorer');
    } else if (newHelpCount === 25) {
      newBadge = awardBadge('community-helper');
    } else if (newHelpCount === 50) {
      newBadge = awardBadge('perpetual-contributor');
    }
    
    // Update community ranking
    updateCommunityRanking();
    
    return newBadge;
  };

  const updateCommunityRanking = () => {
    if (!userProfile) return;
    
    const ranking = [...communityRanking];
    const existingIndex = ranking.findIndex(r => r.userId === userProfile.id);
    
    const userRankData: CommunityRanking = {
      userId: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.displayName,
      helpActions: userProfile.helpActions,
      communityPoints: userProfile.communityPoints,
      level: userProfile.level,
      topBadges: userProfile.badges
        .sort((a, b) => {
          const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        })
        .slice(0, 3)
    };
    
    if (existingIndex >= 0) {
      ranking[existingIndex] = userRankData;
    } else {
      ranking.push(userRankData);
    }
    
    // Sort by help actions, then by points
    ranking.sort((a, b) => {
      if (b.helpActions !== a.helpActions) {
        return b.helpActions - a.helpActions;
      }
      return b.communityPoints - a.communityPoints;
    });
    
    setCommunityRanking(ranking);
    localStorage.setItem('community-ranking', JSON.stringify(ranking));
  };

  const getDaysUntilUsernameChange = () => {
    if (!userProfile?.lastUsernameChange) return 0;
    
    const lastChange = new Date(userProfile.lastUsernameChange);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, 90 - daysDiff);
  };

  return {
    userProfile,
    communityRanking,
    updateProfile,
    canChangeUsername,
    changeUsername,
    getDaysUntilUsernameChange,
    awardBadge,
    recordHelpAction,
    BADGES_CATALOG
  };
};