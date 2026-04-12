export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  timestamp: string;
  link: string;
  isBreaking?: boolean;
}
