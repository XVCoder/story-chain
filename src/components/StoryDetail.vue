<script setup lang="ts">import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElTag, ElCard, ElInput, ElMessage } from 'element-plus';
import { ElDialog } from 'element-plus';
import type { Story } from '../types';
import { storyAPI, nodeAPI, interactionAPI, inventoryAPI } from '../api';
import { store } from '../store';
const props = defineProps<{
  id: string;
}>();
const router = useRouter();
const story = ref<Story | null>(null);
const loading = ref(true);
const showAddNode = ref(false);
const nodeContent = ref('');
const showAIPolish = ref(false);
const modeText = computed(() => {
 const modes: Record<string, string> = {
 free: '自由',
 selected: '精选',
 solo: 'Solo',
 team: '组队竞赛',
 };
 return story.value ? (modes[story.value.mode] || story.value.mode) : '';
});
const statusText = computed(() => {
 const statuses: Record<string, string> = {
 draft: '草稿',
 ongoing: '进行中',
 completed: '已完成',
 published: '已发布',
 };
 return story.value ? (statuses[story.value.status] || story.value.status) : '';
});
const canAddNode = computed(() => {
 return story.value?.status === 'ongoing' &&
 story.value.current_nodes < story.value.max_nodes &&
 store.user;
});
const isAuthor = computed(() => {
 return store.user?.id === story.value?.author_id;
});
const fetchStory = async () => {
 try {
 const response = await storyAPI.getById(Number(props.id));
 story.value = response.data;
 }
 catch (error) {
 ElMessage.error('获取故事失败');
 router.push('/');
 }
 finally {
 loading.value = false;
 }
};
const handleLike = async () => {
 if (!store.user) {
 ElMessage.warning('请先登录');
 return;
 }
 if (!story.value) return;
 try {
 await interactionAPI.like(story.value.id);
 story.value.likes++;
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const handleFavorite = async () => {
 if (!store.user) {
 ElMessage.warning('请先登录');
 return;
 }
 if (!story.value) return;
 try {
 await interactionAPI.favorite(story.value.id);
 story.value.favorites++;
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const handleAddNode = async () => {
 if (!nodeContent.value.trim()) {
 ElMessage.warning('请输入内容');
 return;
 }
 try {
 await nodeAPI.add({
 story_id: Number(props.id),
 content: nodeContent.value,
 });
 ElMessage.success('接龙成功');
 showAddNode.value = false;
 nodeContent.value = '';
 await fetchStory();
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const handleSelectNode = async (nodeId: number) => {
 try {
 await nodeAPI.select(nodeId);
 await fetchStory();
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const handleCoin = async (nodeId: number) => {
 if (!store.user || store.user.points < 1) {
 ElMessage.warning('积分不足');
 return;
 }
 try {
 await interactionAPI.coin(nodeId, 1);
 ElMessage.success('投币成功');
 await fetchStory();
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const handlePublish = async () => {
 try {
 await storyAPI.update(Number(props.id), { status: 'published' });
 ElMessage.success('发布成功');
 await fetchStory();
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const handleAIPolish = async () => {
 const aiItem = store.inventory.find(item => item.item_type === 'ai_polish');
 if (!aiItem || aiItem.quantity <= 0) {
 ElMessage.warning('AI润色次数不足');
 return;
 }
 try {
 await inventoryAPI.use({ item_type: 'ai_polish', story_id: Number(props.id) });
 ElMessage.success('AI润色已应用');
 showAIPolish.value = false;
 await fetchStory();
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const goBack = () => {
 router.back();
};
onMounted(() => {
 fetchStory();
});
</script>

<template>
  <div class="story-detail">
    <div v-if="loading" class="loading">加载中...</div>
    <template v-else-if="story">
      <ElButton @click="goBack" class="back-btn">返回</ElButton>
      
      <ElCard class="story-main">
        <div class="story-header">
          <ElTag type="primary">{{ modeText }}</ElTag>
          <ElTag>{{ statusText }}</ElTag>
          <span class="stat">👁️ {{ story.views }}</span>
        </div>
        
        <h1 class="story-title">{{ story.title }}</h1>
        <p class="story-summary">{{ story.summary }}</p>
        
        <div class="story-actions">
          <ElButton @click="handleLike" type="text">
            👍 {{ story.likes }}
          </ElButton>
          <ElButton @click="handleFavorite" type="text">
            ❤️ {{ story.favorites }}
          </ElButton>
          <ElButton @click="showAddNode = true" type="primary" v-if="canAddNode">
            添加接龙
          </ElButton>
          <ElButton @click="handlePublish" type="success" v-if="isAuthor && story.status !== 'published'">
            发布故事
          </ElButton>
          <ElButton @click="showAIPolish = true" type="warning" v-if="isAuthor">
            AI润色
          </ElButton>
        </div>
      </ElCard>

      <div class="nodes-section">
        <h2>故事节点 ({{ story.current_nodes }}/{{ story.max_nodes }})</h2>
        <div class="nodes-list">
          <div 
            v-for="(node, index) in story.nodes" 
            :key="node.id"
            class="node-item"
            :class="{ selected: node.is_selected }"
          >
            <div class="node-header">
              <span class="node-number">第 {{ index + 1 }} 段</span>
              <span class="node-coins">💰 {{ node.coins }}</span>
              <ElTag v-if="node.is_selected" type="success">已选中</ElTag>
            </div>
            <p class="node-content">{{ node.content }}</p>
            <div class="node-actions">
              <ElButton size="small" @click="handleCoin(node.id)">投币</ElButton>
              <ElButton 
                size="small" 
                type="primary" 
                v-if="isAuthor && !node.is_selected"
                @click="handleSelectNode(node.id)"
              >
                选为下一节点
              </ElButton>
            </div>
          </div>
        </div>
      </div>

      <ElDialog v-model="showAddNode" title="添加接龙" @close="nodeContent = ''">
        <ElInput 
          v-model="nodeContent" 
          type="textarea" 
          :rows="5" 
          placeholder="请输入接龙内容"
        />
        <template #footer>
          <ElButton @click="showAddNode = false">取消</ElButton>
          <ElButton type="primary" @click="handleAddNode">提交</ElButton>
        </template>
      </ElDialog>

      <ElDialog v-model="showAIPolish" title="AI润色" @close="showAIPolish = false">
        <p>确定使用AI润色当前故事的最新节点吗？</p>
        <template #footer>
          <ElButton @click="showAIPolish = false">取消</ElButton>
          <ElButton type="primary" @click="handleAIPolish">确认使用</ElButton>
        </template>
      </ElDialog>
    </template>
  </div>
</template>

<style scoped>
.back-btn {
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 60px 0;
  color: #909399;
  font-size: 16px;
}

.story-main {
  margin-bottom: 20px;
}

.story-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.stat {
  margin-left: auto;
  color: #909399;
}

.story-title {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 12px;
}

.story-summary {
  color: #606266;
  margin-bottom: 16px;
}

.story-actions {
  display: flex;
  gap: 12px;
}

.nodes-section {
  margin-top: 20px;
}

.nodes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.node-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
}

.node-item.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.node-number {
  font-weight: bold;
  color: #409eff;
}

.node-coins {
  margin-left: auto;
}

.node-content {
  color: #303133;
  line-height: 1.8;
}

.node-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}
</style>
