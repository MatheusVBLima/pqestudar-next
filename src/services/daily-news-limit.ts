// Global daily news limit service
export interface DailyLimitData {
  date: string;
  count: number;
  lastReset: string;
}

export interface UserDailyData {
  date: string;
  hasContributed: boolean;
  lastReset: string;
}

export class DailyNewsLimitService {
  private static readonly STORAGE_KEY = 'daily_news_limit_global';
  private static readonly USER_STORAGE_PREFIX = 'daily_news_limit_user_';
  private static readonly MAX_DAILY_NEWS = 3;
  private static readonly USER_MAX_CONTRIBUTIONS = 1;

  static getTodayString(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  static getUserStorageKey(userId?: string): string {
    if (!userId) {
      // Fallback to generic key for non-authenticated users
      return this.USER_STORAGE_PREFIX + 'anonymous';
    }
    return this.USER_STORAGE_PREFIX + userId;
  }

  static getDailyData(): DailyLimitData {
    const today = this.getTodayString();
    const stored = localStorage.getItem(this.STORAGE_KEY);
    
    if (!stored) {
      const newData: DailyLimitData = {
        date: today,
        count: 0,
        lastReset: new Date().toISOString()
      };
      this.saveDailyData(newData);
      return newData;
    }
    
    try {
      const data: DailyLimitData = JSON.parse(stored);
      
      // Check if we need to reset for a new day
      if (data.date !== today) {
        const resetData: DailyLimitData = {
          date: today,
          count: 0,
          lastReset: new Date().toISOString()
        };
        this.saveDailyData(resetData);
        return resetData;
      }
      
      return data;
    } catch (error) {
      console.error('Error parsing daily limit data:', error);
      // Reset on error
      const newData: DailyLimitData = {
        date: today,
        count: 0,
        lastReset: new Date().toISOString()
      };
      this.saveDailyData(newData);
      return newData;
    }
  }

  static getUserDailyData(userId?: string): UserDailyData {
    const today = this.getTodayString();
    const userKey = this.getUserStorageKey(userId);
    const stored = localStorage.getItem(userKey);
    
    if (!stored) {
      const newData: UserDailyData = {
        date: today,
        hasContributed: false,
        lastReset: new Date().toISOString()
      };
      this.saveUserDailyData(newData, userId);
      return newData;
    }
    
    try {
      const data: UserDailyData = JSON.parse(stored);
      
      // Check if we need to reset for a new day
      if (data.date !== today) {
        const resetData: UserDailyData = {
          date: today,
          hasContributed: false,
          lastReset: new Date().toISOString()
        };
        this.saveUserDailyData(resetData, userId);
        return resetData;
      }
      
      return data;
    } catch (error) {
      console.error('Error parsing user daily limit data:', error);
      // Reset on error
      const newData: UserDailyData = {
        date: today,
        hasContributed: false,
        lastReset: new Date().toISOString()
      };
      this.saveUserDailyData(newData, userId);
      return newData;
    }
  }

  static saveDailyData(data: DailyLimitData): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  static saveUserDailyData(data: UserDailyData, userId?: string): void {
    const userKey = this.getUserStorageKey(userId);
    localStorage.setItem(userKey, JSON.stringify(data));
  }

  static canUserContribute(userId?: string): boolean {
    const userData = this.getUserDailyData(userId);
    return !userData.hasContributed;
  }

  static canAddNews(quantity: number = 1, userId?: string): boolean {
    const globalData = this.getDailyData();
    const userData = this.getUserDailyData(userId);
    
    return !userData.hasContributed && (globalData.count + quantity) <= this.MAX_DAILY_NEWS;
  }

  static getRemainingCount(): number {
    const data = this.getDailyData();
    return Math.max(0, this.MAX_DAILY_NEWS - data.count);
  }

  static getCurrentCount(): number {
    const data = this.getDailyData();
    return data.count;
  }

  static getUserContributionCount(userId?: string): number {
    const userData = this.getUserDailyData(userId);
    return userData.hasContributed ? 1 : 0;
  }

  static addNewsCount(quantity: number, userId?: string): boolean {
    const globalData = this.getDailyData();
    const userData = this.getUserDailyData(userId);
    
    if (!this.canAddNews(quantity, userId)) {
      return false;
    }
    
    // Update global count
    globalData.count += quantity;
    this.saveDailyData(globalData);
    
    // Mark user as contributed
    userData.hasContributed = true;
    this.saveUserDailyData(userData, userId);
    
    return true;
  }

  static getMaxDaily(): number {
    return this.MAX_DAILY_NEWS;
  }

  static getUserMaxContributions(): number {
    return this.USER_MAX_CONTRIBUTIONS;
  }

  static getRemainingUsersNeeded(): number {
    const globalData = this.getDailyData();
    return Math.max(0, this.MAX_DAILY_NEWS - globalData.count);
  }

  static getTimeUntilReset(): { hours: number; minutes: number } {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  }

  static getLastResetTime(): string {
    const data = this.getDailyData();
    const resetDate = new Date(data.lastReset);
    return resetDate.toLocaleString('pt-BR');
  }

  // For debugging/admin purposes
  static resetDailyCount(userId?: string): void {
    const today = this.getTodayString();
    const resetData: DailyLimitData = {
      date: today,
      count: 0,
      lastReset: new Date().toISOString()
    };
    this.saveDailyData(resetData);
    
    const userResetData: UserDailyData = {
      date: today,
      hasContributed: false,
      lastReset: new Date().toISOString()
    };
    this.saveUserDailyData(userResetData, userId);
  }
}