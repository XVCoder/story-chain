<script setup lang="ts">import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import Header from './components/Header.vue';
import CreateStoryModal from './components/CreateStoryModal.vue';
import { store, setUser, setStories, setOngoingStories } from './store';
import { authAPI, storyAPI, inventoryAPI } from './api';

const router = useRouter();
const createStoryModal = ref<InstanceType<typeof CreateStoryModal> | null>(null);
const headerRef = ref<InstanceType<typeof Header> | null>(null);

const isLoggedIn = () => !!store.user;

const fetchStories = async () => {
  try {
    const [publishedResponse, ongoingResponse] = await Promise.all([
      storyAPI.getAll({ status: 'published' }),
      storyAPI.getAll({ status: 'ongoing' }),
    ]);
    setStories(publishedResponse.data);
    setOngoingStories(ongoingResponse.data);
  } catch {
    console.error('Failed to fetch stories');
  }
};

const handleShowCreateStory = () => {
  if (!isLoggedIn()) {
    ElMessage.warning('请先登录');
    router.push('/login');
    return;
  }
  createStoryModal.value?.show();
};

const handleCreated = () => {
  fetchStories();
};

onMounted(async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
      const inventoryResponse = await inventoryAPI.get();
      store.inventory = inventoryResponse.data;
      await fetchStories();
      if (router.currentRoute.value.name === 'login') {
        router.push('/home');
      }
    } catch {
      localStorage.removeItem('token');
      if (router.currentRoute.value.name !== 'login') {
        router.push('/login');
      }
    }
  }
});
</script>

<template>
  <div class="app">
    <Header
      v-if="isLoggedIn()"
      ref="headerRef"
      @create-story="handleShowCreateStory"
    />

    <main class="main-content" :class="{ 'no-header': !isLoggedIn() }">
      <router-view />
    </main>

    <CreateStoryModal ref="createStoryModal" @created="handleCreated" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #f5f7fa;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.main-content.no-header {
  padding: 0;
  max-width: none;
}
</style>
