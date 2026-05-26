import { devLog } from '@/lib/dev-log';
// Service for storing and retrieving news articles
import { NewsArticle } from './ai-news-service';
import { ValidatedNews } from './real-news-service';

type StoredNews = NewsArticle | ValidatedNews;

class NewsStorageService {
  private static readonly STORAGE_KEY = 'edu_platform_news';
  private static readonly YEAR_KEY = 'edu_platform_news_year';
  private static news: Map<string, StoredNews> = new Map();

  static storeNews(newsArray: StoredNews[]): void {
    const currentYear = new Date().getFullYear();
    
    // Clear old news if from different year
    this.clearOldNewsIfNeeded();
    
    newsArray.forEach(news => {
      this.news.set(news.id.toString(), news);
    });
    
    // Store in localStorage with current year
    try {
      const newsObject = Object.fromEntries(this.news);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newsObject));
      localStorage.setItem(this.YEAR_KEY, currentYear.toString());
      devLog(`Fresh ${currentYear} news stored successfully:`, newsArray.length, 'items');
    } catch (error) {
      console.warn('Could not save news to localStorage:', error);
    }
  }

  static getNews(id: string): StoredNews | null {
    // First try to get from memory
    let news = this.news.get(id);
    
    if (!news) {
      // Try to load from localStorage
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const newsObject = JSON.parse(stored);
          news = newsObject[id];
          if (news) {
            this.news.set(id, news);
          }
        }
      } catch (error) {
        console.warn('Could not load news from localStorage:', error);
      }
    }
    
    return news || null;
  }

  static getAllNews(): StoredNews[] {
    // Clear old news if needed
    this.clearOldNewsIfNeeded();
    
    // Load from localStorage if memory is empty
    if (this.news.size === 0) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        const storedYear = localStorage.getItem(this.YEAR_KEY);
        const currentYear = new Date().getFullYear();
        
        if (stored && storedYear && parseInt(storedYear) === currentYear) {
          const newsObject = JSON.parse(stored);
          Object.entries(newsObject).forEach(([id, news]) => {
            this.news.set(id, news as StoredNews);
          });
        }
      } catch (error) {
        console.warn('Could not load news from localStorage:', error);
      }
    }
    
    return Array.from(this.news.values());
  }

  static clearNews(): void {
    this.news.clear();
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.YEAR_KEY);
    } catch (error) {
      console.warn('Could not clear news from localStorage:', error);
    }
  }

  private static clearOldNewsIfNeeded(): void {
    try {
      const storedYear = localStorage.getItem(this.YEAR_KEY);
      const currentYear = new Date().getFullYear();
      
      if (storedYear && parseInt(storedYear) !== currentYear) {
        devLog(`Clearing old news from ${storedYear}, updating to ${currentYear}`);
        this.clearNews();
      }
    } catch (error) {
      console.warn('Could not check/clear old news:', error);
    }
  }
}

export default NewsStorageService;