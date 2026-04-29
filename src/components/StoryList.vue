<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElTabs, ElTabPane, ElSelect, ElOption, ElMessage } from 'element-plus';
import type { Story } from '../types';
import StoryCard from './StoryCard.vue';
import { interactionAPI } from '../api';
import { store } from '../store';

const router = useRouter();

const props = defineProps<{
  stories: Story[];
  ongoingStories: Story[];
}>();

const activeTab = ref('published');
const sortBy = ref('time');

const filteredStories = computed(() => {
  let result = activeTab.value === 'published' ? props.stories : props.ongoingStories;
  
  if (sortBy.value === 'hot') {
    result = [...result].sort((a, b) => (b.likes + b.favorites) - (a.likes + a.favorites));
  } else {
    result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  
  return result;
});

const handleView = (id: number) => {
  router.push({ name: 'story-detail', params: { id } });
};

const handleLike = async (storyId: number) => {
  if (!store.user) {
    ElMessage.warning('请先登录');
    return;
  }
  try {
    await interactionAPI.like(storyId);
    const story = props.stories.find(s => s.id === storyId) || props.ongoingStories.find(s => s.id === storyId);
    if (story) story.likes++;
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleFavorite = async (storyId: number) => {
  if (!store.user) {
    ElMessage.warning('请先登录');
    return;
  }
  try {
    await interactionAPI.favorite(storyId);
    const story = props.stories.find(s => s.id === storyId) || props.ongoingStories.find(s => s.id === storyId);
    if (story) story.favorites++;
  } catch (error) {
    ElMessage.error('操作失败');
  }
};
</script>

<template>
  <div class="story-list">
    <div class="list-header">
      <ElTabs v-model="activeTab" type="card" class="tabs">
        <ElTabPane label="已发布故事" name="published" />
        <ElTabPane label="接龙中" name="ongoing" />
      </ElTabs>
      
      <div class="sort-control">
        <span>排序：</span>
        <ElSelect v-model="sortBy">
          <ElOption label="最新发布" value="time" />
          <ElOption label="热度最高" value="hot" />
        </ElSelect>
      </div>
    </div>
    
    <div class="stories-grid">
      <StoryCard 
        v-for="story in filteredStories" 
        :key="story.id" 
        :story="story"
        @view="handleView"
        @like="handleLike"
        @favorite="handleFavorite"
      />
    </div>
    
    <div v-if="filteredStories.length === 0" class="empty-state">
      <span class="empty-icon">📭</span>
      <p>暂无故事</p>
    </div>
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tabs {
  flex: 1;
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.empty-state p {
  color: #909399;
  font-size: 16px;
}
</style>
