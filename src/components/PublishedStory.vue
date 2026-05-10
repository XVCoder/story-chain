<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElMessage } from 'element-plus';
import type { Story, Participant } from '../types';
import { storyAPI, interactionAPI } from '../api';
import { store } from '../store';

const props = defineProps<{ id: string }>();
const router = useRouter();

const story = ref<Story | null>(null);
const timeline = ref<{ nodes: any[]; full_text: string; node_count: number } | null>(null);
const loading = ref(true);
const isLiked = ref(false);
const isFavorited = ref(false);

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const participantNames = computed(() => {
  if (!story.value?.participants?.length) return '';
  return story.value.participants.map((p: Participant) => p.username).join('、');
});

const shareUrl = computed(() => {
  return `${window.location.origin}/read/${props.id}`;
});

const fetchStory = async () => {
  try {
    const res = await storyAPI.getPublished(Number(props.id));
    story.value = res.data;
    if (story.value?.status !== 'published') {
      ElMessage.warning('该故事尚未发布');
      router.push('/');
      return;
    }
  } catch {
    ElMessage.error('故事不存在或已被删除');
    router.push('/');
  } finally {
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
    localStorage.setItem('redirectAfterLogin', `/read/${props.id}`);
    router.push({ name: 'login' });
    return;
  }
  if (!story.value) return;
  try {
    await interactionAPI.like(story.value.id);
    isLiked.value = !isLiked.value;
    story.value.likes += isLiked.value ? 1 : -1;
  } catch {
    ElMessage.error('操作失败');
  }
};

const handleFavorite = async () => {
  if (!store.user) {
    localStorage.setItem('redirectAfterLogin', `/read/${props.id}`);
    router.push({ name: 'login' });
    return;
  }
  if (!story.value) return;
  try {
    await interactionAPI.favorite(story.value.id);
    isFavorited.value = !isFavorited.value;
    story.value.favorites += isFavorited.value ? 1 : -1;
  } catch {
    ElMessage.error('操作失败');
  }
};

const handleShare = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    ElMessage.success('链接已复制到剪贴板');
  } catch {
    const input = document.createElement('input');
    input.value = shareUrl.value;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    ElMessage.success('链接已复制到剪贴板');
  }
};

const goHome = () => {
  router.push(store.user ? '/home' : '/');
};

onMounted(() => {
  fetchStory();
  fetchTimeline();
});
</script>

<template>
  <div class="published-story-page">
    <div v-if="loading" class="loading">加载中...</div>
    <template v-else-if="story">
      <header class="story-nav">
        <span class="nav-brand" @click="goHome">📖 故事接龙</span>
        <div class="nav-actions">
          <ElButton v-if="!store.user" type="primary" plain size="small" @click="router.push({ name: 'login' })">
            登录
          </ElButton>
          <ElButton v-else size="small" @click="router.push('/home')">首页</ElButton>
        </div>
      </header>

      <main class="reading-container">
        <article class="book-page">
          <div class="book-header">
            <h1 class="book-title">{{ story.title }}</h1>
            <p class="book-summary">{{ story.summary }}</p>
          </div>

          <div class="book-meta">
            <div class="meta-row">
              <span class="meta-label">发起人</span>
              <span class="meta-value author-name">{{ story.author_name || '匿名' }}</span>
            </div>
            <div class="meta-row" v-if="participantNames">
              <span class="meta-label">参与人</span>
              <span class="meta-value">{{ participantNames }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">发起时间</span>
              <span class="meta-value">{{ formatDate(story.created_at) }}</span>
            </div>
            <div class="meta-row" v-if="story.published_at">
              <span class="meta-label">发布时间</span>
              <span class="meta-value">{{ formatDate(story.published_at) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">参与段落</span>
              <span class="meta-value">{{ timeline?.node_count || story.current_nodes }} 段</span>
            </div>
          </div>

          <div class="book-divider">
            <span class="divider-ornament">✦</span>
          </div>

          <div class="book-body" v-if="timeline && timeline.full_text">
            <div class="story-text" v-for="(para, idx) in timeline.full_text.split('\n')" :key="idx">
              {{ para }}
            </div>
          </div>
          <div class="book-body" v-else>
            <p class="story-text">{{ story.content }}</p>
          </div>

          <div class="book-divider">
            <span class="divider-ornament">— 全文完 —</span>
          </div>

          <div class="book-footer">
            <div class="stats-bar">
              <span class="stat-item">👁️ {{ story.views }}</span>
            </div>
            <div class="action-bar">
              <button class="action-btn" :class="{ active: isLiked }" @click="handleLike">
                <span class="action-icon">👍</span>
                <span class="action-count">{{ story.likes }}</span>
              </button>
              <button class="action-btn" :class="{ active: isFavorited }" @click="handleFavorite">
                <span class="action-icon">⭐</span>
                <span class="action-count">{{ story.favorites }}</span>
              </button>
              <button class="action-btn" @click="handleShare">
                <span class="action-icon">🔗</span>
                <span class="action-label">分享</span>
              </button>
            </div>
          </div>
        </article>
      </main>
    </template>
  </div>
</template>

<style scoped>
.published-story-page {
  min-height: 100vh;
  background: #f5f0e8;
}

.loading {
  text-align: center;
  padding: 120px 0;
  color: #909399;
  font-size: 16px;
}

.story-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  background: rgba(245, 240, 232, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e0d6c8;
}

.nav-brand {
  font-size: 18px;
  font-weight: 600;
  color: #5a4a3a;
  cursor: pointer;
}

.reading-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.book-page {
  background: #fffef9;
  border-radius: 4px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03);
  padding: 48px 56px;
}

.book-header {
  text-align: center;
  margin-bottom: 36px;
}

.book-title {
  font-size: 28px;
  font-weight: 700;
  color: #2c2c2c;
  margin: 0 0 12px 0;
  letter-spacing: 2px;
}

.book-summary {
  color: #888;
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
}

.book-meta {
  background: #faf7f2;
  border-radius: 6px;
  padding: 20px 28px;
  margin-bottom: 32px;
}

.meta-row {
  display: flex;
  align-items: baseline;
  padding: 6px 0;
}

.meta-row + .meta-row {
  border-top: 1px dashed #e8e2d8;
}

.meta-label {
  flex-shrink: 0;
  width: 72px;
  color: #999;
  font-size: 13px;
}

.meta-value {
  color: #555;
  font-size: 14px;
}

.author-name {
  color: #67c23a;
  font-weight: 500;
}

.book-divider {
  text-align: center;
  margin: 28px 0;
  color: #ccc;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.book-divider::before,
.book-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #ddd, transparent);
}

.divider-ornament {
  color: #c0b8a8;
  font-size: 12px;
}

.book-body {
  line-height: 2.2;
  font-size: 16px;
  color: #333;
  font-family: 'Noto Serif SC', 'Source Han Serif CN', 'STSong', 'SimSun', serif;
}

.story-text {
  text-indent: 2em;
  margin: 0 0 8px 0;
}

.book-footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.stats-bar {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
  color: #999;
  font-size: 13px;
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid #e0d6c8;
  border-radius: 12px;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
  min-width: 80px;
}

.action-btn:hover {
  border-color: #c0b8a8;
  background: #faf7f2;
}

.action-btn.active {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

.action-icon {
  font-size: 20px;
}

.action-count {
  font-size: 13px;
  font-weight: 500;
}

.action-label {
  font-size: 13px;
}

@media (max-width: 768px) {
  .reading-container {
    padding: 16px 12px 60px;
  }

  .book-page {
    padding: 32px 24px;
  }

  .book-title {
    font-size: 22px;
  }

  .book-body {
    font-size: 15px;
    line-height: 2;
  }

  .story-nav {
    padding: 10px 16px;
  }

  .action-btn {
    padding: 10px 16px;
    min-width: 64px;
  }
}
</style>
