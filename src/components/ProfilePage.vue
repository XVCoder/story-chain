<script setup lang="ts">import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElCard, ElButton, ElMessage, ElForm, ElFormItem, ElInput, ElSelect, ElOption } from 'element-plus';
import { ElDialog } from 'element-plus';
import { store } from '../store';
import { inventoryAPI, authAPI } from '../api';
const router = useRouter();
const goBack = () => router.push('/home');
const showExchange = ref(false);
const loading = ref(true);
const userStats = ref({ created_stories: 0, participated_stories: 0, received_coins: 0 });
const exchangeForm = ref({
 item_type: 'ai_polish',
 quantity: 1,
});
const items = [
 { value: 'ai_polish', label: 'AI润色', price: 100 },
 { value: 'hint', label: '提示', price: 50 },
 { value: 'skip', label: '跳过', price: 30 },
];
const currentItem = computed(() => {
 return items.find(item => item.value === exchangeForm.value.item_type);
});
const totalCost = computed(() => {
 return (currentItem.value?.price || 0) * exchangeForm.value.quantity;
});
const canAfford = computed(() => {
 return (store.user?.points || 0) >= totalCost.value;
});
const refreshUserData = async () => {
  if (!store.user) return;
  try {
    const [profileRes, invRes] = await Promise.all([
      authAPI.getProfile(),
      inventoryAPI.get(),
    ]);
    if (profileRes.data) {
      store.user.points = profileRes.data.points;
    }
    store.inventory = invRes.data;
  } catch {
    console.error('Failed to refresh user data');
  }
};
const handleExchange = async () => {
 const oldPoints = store.user?.points || 0;
 try {
 await inventoryAPI.exchange(exchangeForm.value);
 const cost = totalCost.value;
 if (store.user) store.user.points = oldPoints - cost;
 ElMessage.success(`兑换成功，消耗 ${cost} 积分`);
 showExchange.value = false;
 await refreshUserData();
 }
 catch (error: any) {
 ElMessage.error(error?.response?.data?.message || '兑换失败');
 }
};
onMounted(async () => {
  await refreshUserData();
  loading.value = false;
});
</script>

<template>
  <div class="profile-page">
    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <ElButton @click="goBack" class="back-btn">返回</ElButton>
      
      <ElCard class="profile-card">
      <div class="profile-header">
        <div class="avatar">
          <span class="avatar-icon">👤</span>
        </div>
        <div class="profile-info">
          <h2 class="username">{{ store.user?.username }}</h2>
          <p class="email">{{ store.user?.email || '未绑定邮箱' }}</p>
        </div>
        <div class="points-display">
          <span class="points-label">积分</span>
          <span class="points-value">{{ store.user?.points }}</span>
        </div>
      </div>
      
      <div class="profile-stats">
        <div class="stat-item">
          <span class="stat-value">{{ userStats.created_stories }}</span>
          <span class="stat-label">创建故事</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ userStats.participated_stories }}</span>
          <span class="stat-label">参与接龙</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ userStats.received_coins }}</span>
          <span class="stat-label">获得投币</span>
        </div>
      </div>
    </ElCard>
    
    <ElCard class="inventory-card">
      <div class="card-header">
        <h3>我的道具</h3>
        <ElButton type="primary" size="small" @click="showExchange = true">兑换道具</ElButton>
      </div>
      <div class="inventory-grid">
        <div v-for="item in store.inventory" :key="item.item_type" class="inventory-item">
          <span class="item-icon">✨</span>
          <span class="item-name">{{ item.item_type === 'ai_polish' ? 'AI润色' : item.item_type === 'hint' ? '提示' : '跳过' }}</span>
          <span class="item-count">x{{ item.quantity }}</span>
        </div>
        <div v-if="store.inventory.length === 0" class="empty-inventory">
          <span class="empty-icon">📦</span>
          <p>暂无道具</p>
        </div>
      </div>
    </ElCard>
    </template>
  </div>

  <ElDialog v-model="showExchange" title="兑换道具" @close="showExchange = false">
    <ElForm :model="exchangeForm" label-width="80px">
      <ElFormItem label="道具类型">
        <ElSelect v-model="exchangeForm.item_type">
          <ElOption v-for="item in items" :key="item.value" :label="`${item.label} (${item.price}积分)`" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="数量">
        <ElInput type="number" v-model="exchangeForm.quantity" min="1" />
      </ElFormItem>
      <ElFormItem>
        <span>总计：</span>
        <span :class="{ highlight: !canAfford }">{{ totalCost }} 积分</span>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="showExchange = false">取消</ElButton>
      <ElButton type="primary" :disabled="!canAfford" @click="handleExchange">
        {{ canAfford ? '确认兑换' : '积分不足' }}
      </ElButton>
    </template>
  </ElDialog>
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

.profile-card {
  margin-bottom: 20px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 40px;
}

.profile-info {
  flex: 1;
}

.username {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.email {
  color: #909399;
}

.points-display {
  text-align: center;
  padding: 12px 24px;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  border-radius: 12px;
}

.points-label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.points-value {
  font-size: 32px;
  font-weight: bold;
  color: white;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.inventory-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.inventory-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.item-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.item-name {
  font-size: 14px;
  margin-bottom: 4px;
}

.item-count {
  color: #409eff;
  font-weight: bold;
}

.empty-inventory {
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
}

.empty-inventory p {
  color: #909399;
}

.highlight {
  color: #f56c6c;
  font-weight: bold;
}

@media (max-width: 767px) {
  .profile-header {
    flex-wrap: wrap;
    gap: 16px;
    padding-bottom: 16px;
  }

  .avatar {
    width: 60px;
    height: 60px;
  }

  .avatar-icon {
    font-size: 30px;
  }

  .username {
    font-size: 20px;
  }

  .email {
    font-size: 13px;
  }

  .points-display {
    padding: 10px 20px;
  }

  .points-value {
    font-size: 24px;
  }

  .profile-stats {
    gap: 8px;
  }

  .stat-value {
    font-size: 22px;
  }

  .stat-label {
    font-size: 12px;
  }

  .inventory-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .inventory-item {
    padding: 12px;
  }

  .item-icon {
    font-size: 28px;
  }

  .card-header {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
