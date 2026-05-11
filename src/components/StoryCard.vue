<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElCard, ElTag, ElButton } from 'element-plus';
import type { Story } from '../types';

const props = defineProps<{
  story: Story;
}>();

const router = useRouter();

const emit = defineEmits<{
  (e: 'view', id: number): void;
  (e: 'like', id: number): void;
  (e: 'favorite', id: number): void;
}>(); 

const modeText = computed(() => {
  const modes: Record<string, string> = {
    free: '自由',
    selected: '精选',
    solo: 'Solo',
    team: '组队竞赛',
  };
  return modes[props.story.mode] || props.story.mode;
});

const statusText = computed(() => {
  const statuses: Record<string, string> = {
    draft: '草稿',
    ongoing: '进行中',
    completed: '已完成',
    published: '已发布',
  };
  return statuses[props.story.status] || props.story.status;
});

const modeColor = computed((): 'info' | 'primary' | 'success' | 'warning' | 'danger' | undefined => {
  const colors: Record<string, 'info' | 'primary' | 'success' | 'warning' | 'danger'> = {
    free: 'info',
    selected: 'primary',
    solo: 'warning',
    team: 'danger',
  };
  return colors[props.story.mode];
});

const statusColor = computed((): 'info' | 'primary' | 'success' | 'warning' | 'danger' | undefined => {
  const colors: Record<string, 'info' | 'primary' | 'success' | 'warning' | 'danger'> = {
    draft: 'info',
    ongoing: 'success',
    completed: 'primary',
    published: 'warning',
  };
  return colors[props.story.status];
});

const isPublished = computed(() => props.story.status === 'published');

const handleView = () => {
  if (isPublished.value) {
    router.push(`/read/${props.story.id}`);
  } else {
    emit('view', props.story.id);
  }
};
</script>

<template>
  <ElCard class="story-card" hover>
    <div class="story-header">
      <ElTag :type="modeColor">{{ modeText }}</ElTag>
      <ElTag :type="statusColor" style="margin-left: 10px">{{ statusText }}</ElTag>
    </div>
    <h3 class="story-title" @click="handleView">{{ story.title }}</h3>
    <p class="story-summary">{{ story.summary }}</p>
    <div class="story-stats">
      <span class="stat-item">
        <span class="icon">👁️</span>
        <span>{{ story.views }}</span>
      </span>
      <span class="stat-item" @click="emit('like', story.id)">
        <span class="icon">👍</span>
        <span>{{ story.likes }}</span>
      </span>
      <span class="stat-item" @click="emit('favorite', story.id)">
        <span class="icon">❤️</span>
        <span>{{ story.favorites }}</span>
      </span>
      <span class="stat-item">
        <span class="icon">📝</span>
        <span>{{ story.current_nodes }}/{{ story.max_nodes }}</span>
      </span>
    </div>
    <div class="story-footer">
      <div class="footer-left">
        <span v-if="story.author_name" class="author">{{ story.author_name }}</span>
        <span class="time">{{ new Date(story.created_at).toLocaleDateString() }}</span>
      </div>
      <ElButton type="primary" size="small" @click="handleView">
        {{ isPublished ? '阅读' : '查看详情' }}
      </ElButton>
    </div>
  </ElCard>
</template>

<style scoped>
.story-card {
  cursor: pointer;
}

.story-header {
  margin-bottom: 12px;
}

.story-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #303133;
}

.story-summary {
  color: #606266;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.story-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  cursor: pointer;
}

.stat-item:hover {
  color: #409eff;
}

.icon {
  font-size: 14px;
}

.story-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author {
  color: #67c23a;
  font-size: 13px;
  font-weight: 500;
}

.time {
  color: #c0c4cc;
  font-size: 12px;
}

@media (max-width: 767px) {
  .story-title {
    font-size: 16px;
  }

  .story-summary {
    font-size: 13px;
    margin-bottom: 8px;
  }

  .story-stats {
    gap: 12px;
    margin-bottom: 8px;
  }

  .stat-item {
    font-size: 13px;
  }
}
</style>
