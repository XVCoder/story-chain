<script setup lang="ts">import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElTag, ElCard, ElInput, ElMessage } from 'element-plus';
import { ElDialog } from 'element-plus';
import type { Story } from '../types';
import { storyAPI, nodeAPI, interactionAPI, inventoryAPI, authAPI } from '../api';
import { store } from '../store';
import TreeNode from './TreeNode.vue';
const props = defineProps<{
  id: string;
}>();
const router = useRouter();
const story = ref<Story | null>(null);
const loading = ref(true);
const showAddNode = ref(false);
const nodeContent = ref('');
const parentIdForAdd = ref<number | undefined>(undefined);
const showAIPolish = ref(false);
const showHint = ref(false);
const showSkip = ref(false);
const hintContent = ref('');
const timeline = ref<{ nodes: any[]; full_text: string; node_count: number } | null>(null);
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
    (story.value.max_nodes === 0 || story.value.current_nodes < story.value.max_nodes) &&
    store.user;
});
const isAuthor = computed(() => {
  return store.user?.id === story.value?.author_id;
});

const nodeTree = computed(() => {
  if (!story.value?.nodes) return [];
  const nodes = story.value.nodes;
  const map = new Map<number, any>();
  const roots: any[] = [];

  nodes.forEach(n => {
    map.set(n.id, { ...n, children: [] });
  });

  nodes.forEach(n => {
    const node = map.get(n.id)!;
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
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

const fetchTimeline = async () => {
  try {
    const res = await storyAPI.getTimeline(Number(props.id));
    timeline.value = res.data;
  } catch {
    console.error('Failed to fetch timeline');
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
      parent_id: parentIdForAdd.value,
      content: nodeContent.value,
    });
    ElMessage.success('接龙成功');
    showAddNode.value = false;
    nodeContent.value = '';
    parentIdForAdd.value = undefined;
    await fetchStory();
    await fetchTimeline();
  } catch {
    ElMessage.error('操作失败');
  }
};

const handleReplyTo = (nodeId: number) => {
  parentIdForAdd.value = nodeId;
  nodeContent.value = '';
  showAddNode.value = true;
};
const handleSelectNode = async (nodeId: number) => {
 try {
 await nodeAPI.select(nodeId);
 await fetchStory();
 await fetchTimeline();
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const handleUnselectNode = async (nodeId: number) => {
  try {
    await nodeAPI.unselect(nodeId);
    await fetchStory();
    await fetchTimeline();
  } catch {
    ElMessage.error('操作失败');
  }
};
const handleCoin = async (nodeId: number) => {
  if (!store.user || store.user.points < 1) {
    ElMessage.warning('积分不足');
    return;
  }
  const oldPoints = store.user.points;
  try {
    await interactionAPI.coin(nodeId, 1);
    store.user.points = oldPoints - 1;
    ElMessage.success('投币成功');
    await fetchStory();
    await fetchTimeline();
  } catch (error: any) {
    const msg = error?.response?.data?.message || '操作失败';
    ElMessage.warning(msg);
  }
};
const handlePublish = async () => {
  try {
    await storyAPI.update(Number(props.id), { status: 'published' });
    ElMessage.success('发布成功');
    await fetchStory();
  } catch (error: any) {
    const msg = error?.response?.data?.message || '操作失败';
    ElMessage.warning(msg);
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
const handleUseHint = async () => {
 const hintItem = store.inventory.find(item => item.item_type === 'hint');
 if (!hintItem || hintItem.quantity <= 0) {
 ElMessage.warning('提示道具不足');
 return;
 }
 try {
 await inventoryAPI.use({ item_type: 'hint' });
 ElMessage.success('提示：尝试从角色对话或场景描写入手展开接龙！');
 showHint.value = false;
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const handleUseSkip = async () => {
 const skipItem = store.inventory.find(item => item.item_type === 'skip');
 if (!skipItem || skipItem.quantity <= 0) {
 ElMessage.warning('跳过道具不足');
 return;
 }
 try {
 await inventoryAPI.use({ item_type: 'skip', story_id: Number(props.id) });
 ElMessage.success('已跳过当前节点');
 showSkip.value = false;
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
 fetchTimeline();
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
            ⭐ {{ story.favorites }}
          </ElButton>
          <ElButton @click="handleReplyTo(undefined)" type="primary" v-if="canAddNode">
              添加接龙
          </ElButton>
          <ElButton @click="handlePublish" type="success" v-if="isAuthor && story.status !== 'published'">
            发布故事
          </ElButton>
          <ElButton @click="showAIPolish = true" type="warning" v-if="isAuthor">
            AI润色
          </ElButton>
          <ElButton @click="showHint = true" type="info" v-if="store.user">提示</ElButton>
          <ElButton @click="showSkip = true" type="danger" plain v-if="store.user">跳过</ElButton>
        </div>
      </ElCard>

      <ElCard v-if="timeline && timeline.nodes.length > 0" class="timeline-card">
        <div class="timeline-header">
          <h2>📖 主线故事</h2>
          <ElTag type="success" size="small">{{ timeline.node_count }} 段 · 自动拼接</ElTag>
        </div>
        <div class="timeline-story">
          {{ timeline.full_text }}
        </div>
      </ElCard>

      <div class="nodes-section">
        <h2>故事节点 ({{ story.current_nodes }}/{{ story.max_nodes }})</h2>
        <div class="node-tree">
          <div v-for="(node, index) in nodeTree" :key="node.id" class="tree-root">
            <TreeNode
              :node="node"
              :depth="0"
              :can-add-node="canAddNode"
              :is-author="isAuthor"
              :root-index="index"
              @coin="handleCoin"
              @reply="handleReplyTo"
              @select="handleSelectNode"
              @unselect="handleUnselectNode"
            />
          </div>
        </div>
      </div>

      <ElDialog v-model="showAddNode" :title="parentIdForAdd ? '接龙续写' : '添加接龙'" @close="nodeContent = ''; parentIdForAdd = undefined">
        <div v-if="parentIdForAdd && story?.nodes" class="reply-context">
          <span class="reply-label">正在回复：</span>
          <p class="reply-text">{{ story?.nodes?.find(n => n.id === parentIdForAdd)?.content?.slice(0, 80) }}...</p>
        </div>
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

      <ElDialog v-model="showHint" title="使用提示道具" @close="showHint = false">
        <p>使用提示道具获取接龙写作灵感？</p>
        <template #footer>
          <ElButton @click="showHint = false">取消</ElButton>
          <ElButton type="primary" @click="handleUseHint">确认使用</ElButton>
        </template>
      </ElDialog>

      <ElDialog v-model="showSkip" title="使用跳过道具" @close="showSkip = false">
        <p>确定跳过当前节点？将自动完成此节点的接龙。</p>
        <template #footer>
          <ElButton @click="showSkip = false">取消</ElButton>
          <ElButton type="primary" @click="handleUseSkip">确认使用</ElButton>
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

.node-tree {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tree-root {
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 16px;
  background: #fff;
}

.tree-root.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.fab-icon {
  line-height: 1;
}

.timeline-card {
  margin-top: 20px;
  border-left: 3px solid #409eff;
  background: linear-gradient(135deg, #f0f5ff 0%, #fafafa 100%);
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.timeline-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.timeline-story {
  color: #303133;
  line-height: 2;
  font-size: 15px;
  white-space: pre-wrap;
  padding: 4px 0;
}

.reply-context {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 12px;
  border-left: 3px solid #409eff;
}

.reply-label {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 4px;
}

.reply-text {
  margin: 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}
</style>
