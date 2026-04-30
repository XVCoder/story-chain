<script setup lang="ts">import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from './components/Header.vue';
import { store, setUser } from './store';
import { authAPI, inventoryAPI } from './api';

const router = useRouter();
const headerRef = ref<InstanceType<typeof Header> | null>(null);

const isLoggedIn = () => !!store.user;

onMounted(async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
      const inventoryResponse = await inventoryAPI.get();
      store.inventory = inventoryResponse.data;
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
    />

    <main class="main-content" :class="{ 'no-header': !isLoggedIn() }">
      <router-view />
    </main>
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
