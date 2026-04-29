<script setup lang="ts">import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import Header from './components/Header.vue';
import LoginModal from './components/LoginModal.vue';
import RegisterModal from './components/RegisterModal.vue';
import CreateStoryModal from './components/CreateStoryModal.vue';
import { store, setUser, setStories, setOngoingStories } from './store';
import { authAPI, storyAPI, inventoryAPI } from './api';
const loginModal = ref<InstanceType<typeof LoginModal> | null>(null);
const registerModal = ref<InstanceType<typeof RegisterModal> | null>(null);
const createStoryModal = ref<InstanceType<typeof CreateStoryModal> | null>(null);
const headerRef = ref<InstanceType<typeof Header> | null>(null);
const fetchStories = async () => {
 try {
 const [publishedResponse, ongoingResponse] = await Promise.all([
 storyAPI.getAll({ status: 'published' }),
 storyAPI.getAll({ status: 'ongoing' }),
 ]);
 setStories(publishedResponse.data);
 setOngoingStories(ongoingResponse.data);
 }
 catch (error) {
 console.error('Failed to fetch stories');
 }
};
const handleShowLogin = () => {
 loginModal.value?.show();
};
const handleShowRegister = () => {
 registerModal.value?.show();
};
const handleShowCreateStory = () => {
 if (!store.user) {
 ElMessage.warning('请先登录');
 loginModal.value?.show();
 return;
 }
 createStoryModal.value?.show();
};
const handleLogin = async () => {
 await fetchStories();
 headerRef.value?.refreshInventory();
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
 }
 catch (error) {
 localStorage.removeItem('token');
 }
 }
 await fetchStories();
});
</script>

<template>
  <div class="app">
    <Header 
      ref="headerRef"
      @show-login="handleShowLogin"
      @show-register="handleShowRegister"
      @create-story="handleShowCreateStory"
    />
    
    <main class="main-content">
      <router-view />
    </main>
    
    <LoginModal ref="loginModal" @login="handleLogin" />
    <RegisterModal ref="registerModal" />
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
</style>
