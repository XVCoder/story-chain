<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElDropdown, ElDropdownItem, ElBadge, ElMessage } from 'element-plus';
import { store, setUser } from '../store';
import { inventoryAPI, authAPI } from '../api';

const router = useRouter();

const showInventory = ref(false);
const mobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};

const navigateTo = (path: string) => {
  router.push(path);
  closeMobileMenu();
};

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

const handleCheckIn = async () => {
  if (!store.user) return;
  try {
    const res = await authAPI.checkIn();
    ElMessage.success(`签到成功！获得 ${res.data.points_awarded} 个硬币`);
    await refreshUserPoints();
  } catch (error: any) {
    const msg = error?.response?.data?.message || '签到失败';
    ElMessage.warning(msg);
  }
};

const goHome = () => {
  router.push('/home');
  closeMobileMenu();
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
      
      <nav class="nav desktop-nav">
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
            <ElDropdownItem @click="handleCheckIn">📅 签到</ElDropdownItem>
            <ElDropdownItem @click="router.push('/home')">创建故事</ElDropdownItem>
            <ElDropdownItem @click="showInventory = !showInventory">背包</ElDropdownItem>
            <ElDropdownItem @click="router.push('/profile')">个人中心</ElDropdownItem>
            <ElDropdownItem divided @click="handleLogout">退出登录</ElDropdownItem>
          </template>
        </ElDropdown>
        
        <button class="hamburger" :class="{ open: mobileMenuOpen }" @click="toggleMobileMenu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>

    <Transition name="slide-down">
      <nav v-if="mobileMenuOpen" class="mobile-nav">
        <span class="mobile-nav-item" :class="{ active: router.currentRoute.value.path === '/home' }" @click="navigateTo('/home')">📖 首页</span>
        <span class="mobile-nav-item" :class="{ active: router.currentRoute.value.path === '/teams' }" @click="navigateTo('/teams')">👥 团队</span>
        <span class="mobile-nav-item" :class="{ active: router.currentRoute.value.path === '/competitions' }" @click="navigateTo('/competitions')">🏆 竞赛</span>
        <span class="mobile-nav-item" :class="{ active: router.currentRoute.value.path === '/my-stories' }" @click="navigateTo('/my-stories')">📝 我的故事</span>
      </nav>
    </Transition>

    <div v-if="showInventory" class="inventory-panel">
        <div class="inventory-header">
          <h3>背包</h3>
          <button class="close-btn" @click="showInventory = false">✕</button>
        </div>
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

.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.inventory-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #909399;
  padding: 2px 6px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #303133;
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

.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 8px;
  transition: background 0.3s;
}

.hamburger:hover {
  background: rgba(255, 255, 255, 0.2);
}

.hamburger span {
  display: block;
  width: 100%;
  height: 2px;
  background: white;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.hamburger.open span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger.open span:nth-child(2) {
  opacity: 0;
}

.hamburger.open span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

.mobile-nav {
  display: none;
  flex-direction: column;
  background: rgba(102, 126, 234, 0.95);
  backdrop-filter: blur(10px);
  padding: 8px 20px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-nav-item {
  color: white;
  cursor: pointer;
  padding: 12px 16px;
  border-radius: 8px;
  transition: background 0.2s;
  font-size: 15px;
}

.mobile-nav-item:hover,
.mobile-nav-item.active {
  background: rgba(255, 255, 255, 0.15);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 300px;
  opacity: 1;
}

@media (max-width: 767px) {
  .header {
    padding: 0 12px;
  }

  .header-content {
    height: 52px;
  }

  .desktop-nav {
    display: none !important;
  }

  .hamburger {
    display: flex;
  }

  .mobile-nav {
    display: flex;
  }

  .logo-text {
    font-size: 17px;
  }

  .logo-icon {
    font-size: 20px;
  }

  .user-info {
    padding: 6px 10px;
    font-size: 13px;
  }

  .username {
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .inventory-panel {
    right: 8px;
    left: 8px;
    min-width: auto;
    width: auto;
  }
}
</style>
