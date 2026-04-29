import { reactive } from 'vue';
import type { User, Story, InventoryItem, Team, Competition } from '../types';

interface Store {
  user: User | null;
  stories: Story[];
  ongoingStories: Story[];
  selectedStory: Story | null;
  favorites: Story[];
  inventory: InventoryItem[];
  teams: Team[];
  competitions: Competition[];
}

export const store = reactive<Store>({
  user: null,
  stories: [],
  ongoingStories: [],
  selectedStory: null,
  favorites: [],
  inventory: [],
  teams: [],
  competitions: [],
});

export const setUser = (user: User | null) => {
  store.user = user;
};

export const setStories = (stories: Story[]) => {
  store.stories = stories;
};

export const setOngoingStories = (stories: Story[]) => {
  store.ongoingStories = stories;
};

export const setFavorites = (stories: Story[]) => {
  store.favorites = stories;
};

export const setSelectedStory = (story: Story | null) => {
  store.selectedStory = story;
};

export const setInventory = (items: InventoryItem[]) => {
  store.inventory = items;
};

export const setTeams = (teams: Team[]) => {
  store.teams = teams;
};

export const setCompetitions = (competitions: Competition[]) => {
  store.competitions = competitions;
};
