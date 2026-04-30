export interface User {
  id: number;
  username: string;
  email?: string;
  points: number;
  created_at: string;
}

export interface Story {
  id: number;
  title: string;
  summary: string;
  content: string;
  author_id: number;
  mode: 'free' | 'selected' | 'solo' | 'team';
  max_nodes: number;
  current_nodes: number;
  status: 'draft' | 'ongoing' | 'completed' | 'published';
  likes: number;
  favorites: number;
  views: number;
  created_at: string;
  published_at?: string;
  nodes?: StoryNode[];
}

export interface StoryNode {
  id: number;
  story_id: number;
  parent_id?: number;
  content: string;
  author_id: number;
  coins: number;
  is_selected: boolean;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  user_id: number;
  item_type: string;
  quantity: number;
}

export interface Team {
  id: number;
  name: string;
  role?: string;
}

export interface Competition {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  status: string;
}

export interface TeamMember {
  user_id: number;
  username: string;
  role: string;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  score: number;
}
