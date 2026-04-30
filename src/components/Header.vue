<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElDropdown, ElDropdownItem, ElBadge, ElMessage } from 'element-plus';
import { store, setUser } from '../store';
import { inventoryAPI, authAPI } from '../api';

const router = useRouter();

const emit = defineEmits<{
  (e: 'createStory'): void;
}>(); 

const showInventory = ref(false);

const isLoggedIn = computed(() => !!store.user);

const handleLogout = () => {
  localStorage.removeItem('token');
  setUser(null);
  router.push('/login');
};

const refreshInventory = async () => {
  if (store.user) {
    try {
      const response = await inventoryAPI.get();
      store.inventory = response.data;
    } catch (error) {
      console.error('Failed to fetch inventory');
    }
  }
};

const refreshUserPoints = async () => {
  if (!store.user) return;
  try {
    const oldPoints = store.user.points;
    const res = await authAPI.getProfile();
    if (res.data && res.data.points !== undefined) {
      store.user.points = res.data.points;
      if (res.data.points > oldPoints) {
        ElMessage.success(`积分 +${res.data.points - oldPoints}`);
      } else if (res.data.points < oldPoints) {
        ElMessage.info(`积分 ${res.data.points - oldPoints}`);
      }
    }
  } catch {
    console.error('Failed to refresh points');
  }
};

const goHome = () => {
  router.push('/home');
};

const itemName = (type: string) => {
  const map: Record<string, string> = { ai_polish: 'AI润色', hint: '提示', skip: '跳过' };
  return map[type] || type;
};

defineExpose({ refreshInventory, refreshUserPoints });
</script>

<template>
  <header class="header">
    <div class="header-content">
      <div class="logo" @click="goHome">
        <span class="logo-icon">📖</span>
        <span class="logo-text">故事接龙</span>
      </div>
      
      <nav class="nav">
        <span class="nav-item" :class="{ active: router.currentRoute.value.path === '/home' }" @click="router.push('/home')">首页</span>
        <span class="nav-item" :class="{ active: router.currentRoute.value.path === '/teams' }" @click="router.push('/teams')">团队</span>
        <span class="nav-item" :class="{ active: router.currentRoute.value.path === '/competitions' }" @click="router.push('/competitions')">竞赛</span>
        <span class="nav-item" :class="{ active: router.currentRoute.value.path === '/my-stories' }" @click="router.push('/my-stories')">我的故事</span>
      </nav>
      
      <div class="header-right">
        <ElDropdown>
          <span class="user-info">
            <ElBadge :value="store.user?.points" type="warning" class="points-badge" />
            <span class="username">{{ store.user?.username }}</span>
          </span>
          <template #dropdown>
            <ElDropdownItem @click="emit('createStory')">创建故事</ElDropdownItem>
            <ElDropdownItem @click="showInventory = !showInventory">背包</ElDropdownItem>
            <ElDropdownItem @click="router.push('/profile')">个人中心</ElDropdownItem>
            <ElDropdownItem divided @click="handleLogout">退出登录</ElDropdownItem>
          </template>
        </ElDropdown>
      </div>
    </div>

    <div v-if="showInventory" class="inventory-panel">
        <h3>背包</h3>
        <div class="inventory-items">
          <div v-for="item in store.inventory" :key="item.item_type" class="inventory-item">
            <span class="item-icon">✨</span>
            <span class="item-name">{{ itemName(item.item_type) }}</span>
            <span class="item-count">x{{ item.quantity }}</span>
          </div>
          <p v-if="store.inventory.length === 0" class="empty">背包空空如也</p>
        </div>
        <ElButton type="primary" size="small" @click="router.push('/profile')">兑换道具</ElButton>
      </div>
  </header>
</template>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 20px;
  font-weight: bold;
  color: white;
}

.nav {
  display: flex;
  gap: 24px;
}

.nav-item {
  color: white;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 20px;
  transition: background 0.3s;
}

.nav-item:hover,
.nav-item.active {
  background: rgba(255, 255, 255, 0.2);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  cursor: pointer;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.username {
  font-weight: 500;
}

.points-badge {
  font-size: 12px;
}

.inventory-panel {
  position: absolute;
  right: 20px;
  top: 70px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 250px;
}

.inventory-items {
  margin-bottom: 12px;
}

.inventory-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.item-icon {
  font-size: 18px;
}

.item-name {
  flex: 1;
}

.item-count {
  color: #409eff;
  font-weight: bold;
}

.empty {
  text-align: center;
  color: #909399;
  padding: 16px;
}
</style>
