<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElTabs, ElTabPane, ElSelect, ElOption, ElMessage, ElInput, ElButton, ElForm, ElFormItem } from 'element-plus';
import { ElDialog } from 'element-plus';
import type { Story } from '../types';
import StoryCard from './StoryCard.vue';
import { storyAPI, interactionAPI } from '../api';
import { store } from '../store';

const router = useRouter();

const stories = ref<Story[]>([]);
const ongoingStories = ref<Story[]>([]);
const loading = ref(true);

const fetchStories = async () => {
  loading.value = true;
  try {
    const [publishedRes, ongoingRes] = await Promise.all([
      storyAPI.getAll({ status: 'published' }),
      storyAPI.getAll({ status: 'ongoing' }),
    ]);
    stories.value = publishedRes.data;
    ongoingStories.value = ongoingRes.data;
  } catch {
    console.error('Failed to fetch stories');
  } finally {
    loading.value = false;
  }
};

const showCreateDialog = ref(false);
const createForm = ref({
  title: '',
  summary: '',
  content: '',
  mode: 'free' as string,
  max_nodes: 5,
});
const creating = ref(false);

const modes = [
  { value: 'free', label: '自由模式' },
  { value: 'selected', label: '精选模式' },
  { value: 'solo', label: 'Solo模式' },
  { value: 'team', label: '组队竞赛' },
];

const handleCreateStory = async () => {
  if (!createForm.value.title || !createForm.value.summary || !createForm.value.content) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  creating.value = true;
  try {
    const res = await storyAPI.create(createForm.value);
    ElMessage.success('故事创建成功');
    showCreateDialog.value = false;
    createForm.value = { title: '', summary: '', content: '', mode: 'free', max_nodes: 5 };
    await fetchStories();
    activeTab.value = 'ongoing';
  } catch {
    ElMessage.error('创建失败');
  } finally {
    creating.value = false;
  }
};

const activeTab = ref('published');
const sortBy = ref('time');
const searchQuery = ref('');

const filteredStories = computed(() => {
  let result = activeTab.value === 'published' ? stories.value : ongoingStories.value;
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(s => s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q));
  }
  
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
    const list = activeTab.value === 'published' ? stories : ongoingStories;
    const story = list.value.find(s => s.id === storyId);
    if (story) story.likes++;
  } catch {
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
    const list = activeTab.value === 'published' ? stories : ongoingStories;
    const story = list.value.find(s => s.id === storyId);
    if (story) story.favorites++;
  } catch {
    ElMessage.error('操作失败');
  }
};

const currentList = computed(() => activeTab.value === 'published' ? stories.value : ongoingStories.value);
const hasData = computed(() => currentList.value.length > 0);

onMounted(() => {
  fetchStories();
});
</script>

<template>
  <div class="story-list">
    <div class="list-header">
      <ElTabs v-model="activeTab" type="card" class="tabs">
        <ElTabPane label="已发布故事" name="published" />
        <ElTabPane label="接龙中" name="ongoing" />
      </ElTabs>
      
      <div class="search-control">
        <ElInput v-model="searchQuery" placeholder="搜索故事..." size="small" clearable prefix-icon="Search" />
      </div>
      
      <div class="sort-control">
        <span style="width:45px;font-size:14px;">排序：</span>
        <ElSelect v-model="sortBy" size="small" style="width:100px">
          <ElOption label="最新发布" value="time" />
          <ElOption label="热度最高" value="hot" />
        </ElSelect>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <template v-else-if="hasData">
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
      <ElButton class="fab-btn" type="primary" circle size="large" @click="showCreateDialog = true">
        <span class="fab-icon">+</span>
      </ElButton>
    </template>

    <div v-else class="empty-state">
      <div class="empty-illustration">
        <span class="empty-icon">📖</span>
      </div>
      <h2 class="empty-title">还没有故事</h2>
      <p class="empty-desc">
        {{ activeTab === 'published' ? '还没有已发布的故事' : '还没有正在接龙的故事' }}
      </p>
      <p class="empty-desc-sub">
        点击下方按钮，开启你的第一个故事吧！
      </p>
      <ElButton type="primary" size="large" class="create-btn" @click="showCreateDialog = true">
        ✨ 创建故事
      </ElButton>
    </div>

    <ElDialog v-model="showCreateDialog" title="创建故事" width="600px" @close="showCreateDialog = false">
      <ElForm :model="createForm" label-width="100px">
        <ElFormItem label="故事标题">
          <ElInput v-model="createForm.title" placeholder="请输入故事标题" />
        </ElFormItem>
        <ElFormItem label="故事概要">
          <ElInput v-model="createForm.summary" type="textarea" :rows="2" placeholder="请输入故事概要" />
        </ElFormItem>
        <ElFormItem label="开头内容">
          <ElInput v-model="createForm.content" type="textarea" :rows="4" placeholder="请输入故事开头" />
        </ElFormItem>
        <ElFormItem label="游戏模式">
          <ElSelect v-model="createForm.mode">
            <ElOption v-for="m in modes" :key="m.value" :label="m.label" :value="m.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="最大节点数">
          <ElSelect v-model="createForm.max_nodes">
            <ElOption label="无限制" :value="0" />
            <ElOption v-for="n in [3, 5, 7, 10]" :key="n" :label="String(n)" :value="n" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showCreateDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="creating" @click="handleCreateStory">创建</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.tabs {
  flex: 1;
  min-width: 200px;
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-control {
  margin: 0 16px;
  min-width: 200px;
}

.stories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.loading-state {
  text-align: center;
  padding: 100px 0;
  color: #909399;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid #e4e7ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  max-width: 480px;
  margin: 0 auto;
}

.empty-illustration {
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
  border-radius: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  font-size: 56px;
}

.empty-title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}

.empty-desc {
  color: #606266;
  font-size: 15px;
  margin: 0 0 6px;
}

.empty-desc-sub {
  color: #909399;
  font-size: 14px;
  margin: 0 0 32px;
}

.create-btn {
  border-radius: 24px;
  padding: 12px 32px;
  font-size: 16px;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.3);
  transition: all 0.3s;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

.fab-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  font-size: 28px;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
  z-index: 100;
  transition: all 0.3s;
}

.fab-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(64, 158, 255, 0.5);
}

.fab-icon {
  line-height: 1;
}
</style>
