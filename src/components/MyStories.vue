<script setup lang="ts">import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElCard, ElButton, ElMessage, ElTag } from 'element-plus';
import { storyAPI } from '../api';
import type { Story } from '../types';

const router = useRouter();
const stories = ref<Story[]>([]);
const loading = ref(true);

const fetchStories = async () => {
  loading.value = true;
  try {
    const res = await storyAPI.getMyStories();
    stories.value = res.data;
  } catch {
    ElMessage.error('获取故事列表失败');
  } finally {
    loading.value = false;
  }
};

const handleDelete = async (id: number) => {
  try {
    await storyAPI.delete(id);
    ElMessage.success('删除成功');
    await fetchStories();
  } catch {
    ElMessage.error('删除失败');
  }
};

const modeText = (mode: string) => {
  const map: Record<string, string> = { free: '自由', selected: '精选', solo: 'Solo', team: '组队' };
  return map[mode] || mode;
};

const statusText = (status: string) => {
  const map: Record<string, string> = { draft: '草稿', ongoing: '进行中', completed: '已完成', published: '已发布' };
  return map[status] || status;
};

const statusType = (status: string) => {
  const map: Record<string, string> = { draft: 'info', ongoing: 'warning', completed: 'success', published: 'primary' };
  return map[status] || 'info';
};

onMounted(() => {
  fetchStories();
});
</script>

<template>
  <div class="my-stories">
    <div class="page-header">
      <h1>我的故事</h1>
      <ElButton @click="router.push('/')">返回首页</ElButton>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="stories-grid">
      <div v-for="story in stories" :key="story.id" class="story-card">
        <ElCard>
          <div class="story-header">
            <h3>{{ story.title }}</h3>
            <div class="story-tags">
              <ElTag size="small">{{ modeText(story.mode) }}</ElTag>
              <ElTag :type="statusType(story.status)" size="small">{{ statusText(story.status) }}</ElTag>
            </div>
          </div>
          <p class="story-summary">{{ story.summary }}</p>
          <div class="story-meta">
            <span>👁️ {{ story.views }}</span>
            <span>👍 {{ story.likes }}</span>
            <span>⭐ {{ story.favorites }}</span>
            <span>📝 {{ story.current_nodes }}/{{ story.max_nodes }}</span>
          </div>
          <div class="story-actions">
            <ElButton size="small" type="primary" @click="router.push(`/story/${story.id}`)">查看</ElButton>
            <ElButton size="small" type="danger" plain @click="handleDelete(story.id)">删除</ElButton>
          </div>
        </ElCard>
      </div>
      <p v-if="stories.length === 0" class="empty">你还没有创建过故事</p>
    </div>
  </div>
</template>

<style scoped>
.my-stories {
  max-width: 1000px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.loading {
  text-align: center;
  padding: 60px;
  color: #909399;
}
.stories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.story-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.story-header h3 {
  margin: 0;
  font-size: 18px;
}
.story-tags {
  display: flex;
  gap: 6px;
}
.story-summary {
  color: #606266;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.story-meta {
  display: flex;
  gap: 16px;
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}
.story-actions {
  display: flex;
  gap: 10px;
}
.empty {
  text-align: center;
  color: #909399;
  padding: 60px 0;
  grid-column: 1 / -1;
}
</style>
