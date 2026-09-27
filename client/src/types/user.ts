export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    autoplayNext: boolean;
    defaultPlaybackRate: number;
  };
  createdAt: string;
}
