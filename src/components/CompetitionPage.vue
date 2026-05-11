<script setup lang="ts">import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElCard, ElButton, ElMessage, ElDialog, ElForm, ElFormItem, ElInput, ElTag, ElTable, ElTableColumn } from 'element-plus';
import { store } from '../store';
import { teamAPI } from '../api';
import type { Competition, Team, LeaderboardEntry } from '../types';

const router = useRouter();
const competitions = ref<Competition[]>([]);
const showCreateDialog = ref(false);
const showLeaderboardDialog = ref(false);
const selectedLeaderboard = ref<LeaderboardEntry[]>([]);
const selectedCompTitle = ref('');
const createForm = ref({ title: '', description: '' });
const userTeams = ref<Team[]>([]);
const loading = ref(false);

const fetchCompetitions = async () => {
  try {
    const [compRes, teamRes] = await Promise.all([
      teamAPI.getCompetitions(),
      store.user ? teamAPI.getUserTeams() : Promise.resolve({ data: [] }),
    ]);
    competitions.value = compRes.data;
    userTeams.value = teamRes.data;
  } catch {
    console.error('Failed to fetch competitions');
  }
};

const handleCreateCompetition = async () => {
  if (!createForm.value.title.trim()) {
    ElMessage.warning('请输入竞赛标题');
    return;
  }
  loading.value = true;
  try {
    await teamAPI.createCompetition(createForm.value);
    ElMessage.success('竞赛创建成功');
    showCreateDialog.value = false;
    createForm.value = { title: '', description: '' };
    await fetchCompetitions();
  } catch {
    ElMessage.error('创建失败');
  } finally {
    loading.value = false;
  }
};

const handleJoinCompetition = async (competitionId: number) => {
  if (userTeams.value.length === 0) {
    ElMessage.warning('请先加入一个团队');
    return;
  }
  const leaderTeam = userTeams.value.find(t => t.role === 'leader');
  if (!leaderTeam) {
    ElMessage.warning('只有团队队长可以参加竞赛');
    return;
  }
  try {
    await teamAPI.joinCompetition({ competition_id: competitionId, team_id: leaderTeam.id });
    ElMessage.success('参赛成功');
    await fetchCompetitions();
  } catch {
    ElMessage.error('参赛失败，团队可能已报名');
  }
};

const handleViewLeaderboard = async (competition: Competition) => {
  try {
    const res = await teamAPI.getLeaderboard(competition.id);
    selectedLeaderboard.value = res.data.leaderboard;
    selectedCompTitle.value = competition.title;
    showLeaderboardDialog.value = true;
  } catch {
    ElMessage.error('获取排行榜失败');
  }
};

const statusText = (status: string) => {
  const map: Record<string, string> = { active: '进行中', ended: '已结束', pending: '待开始' };
  return map[status] || status;
};

const statusType = (status: string): 'info' | 'primary' | 'success' | 'warning' | 'danger' => {
  const map: Record<string, 'info' | 'primary' | 'success' | 'warning' | 'danger'> = { active: 'success', ended: 'info', pending: 'warning' };
  return map[status] || 'info';
};

onMounted(() => {
  fetchCompetitions();
});
</script>

<template>
  <div class="competition-page">
    <div class="page-header">
      <h1>竞赛列表</h1>
      <div class="header-actions">
        <ElButton @click="router.push('/teams')">团队管理</ElButton>
        <ElButton type="primary" v-if="store.user" @click="showCreateDialog = true">创建竞赛</ElButton>
      </div>
    </div>

    <div class="competition-grid">
      <div v-for="comp in competitions" :key="comp.id" class="comp-card">
        <ElCard>
          <div class="comp-header">
            <h3>{{ comp.title }}</h3>
            <ElTag :type="statusType(comp.status)">{{ statusText(comp.status) }}</ElTag>
          </div>
          <p class="comp-desc">{{ comp.description || '暂无描述' }}</p>
          <div class="comp-meta">
            <span>开始: {{ new Date(comp.start_time).toLocaleDateString() }}</span>
            <span v-if="comp.end_time">结束: {{ new Date(comp.end_time).toLocaleDateString() }}</span>
          </div>
          <div class="comp-actions">
            <ElButton size="small" type="primary" @click="handleViewLeaderboard(comp)">排行榜</ElButton>
            <ElButton
              v-if="store.user && comp.status === 'active'"
              size="small"
              type="success"
              plain
              @click="handleJoinCompetition(comp.id)"
            >参赛</ElButton>
          </div>
        </ElCard>
      </div>
      <p v-if="competitions.length === 0" class="empty">暂无竞赛</p>
    </div>

    <ElDialog v-model="showCreateDialog" title="创建竞赛" width="500px">
      <ElForm :model="createForm">
        <ElFormItem label="标题" required>
          <ElInput v-model="createForm.title" placeholder="请输入竞赛标题" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="createForm.description" type="textarea" :rows="3" placeholder="请输入竞赛描述" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showCreateDialog = false">取消</ElButton>
        <ElButton type="primary" @click="handleCreateCompetition" :loading="loading">创建</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="showLeaderboardDialog" :title="`排行榜 - ${selectedCompTitle}`" width="600px">
      <ElTable :data="selectedLeaderboard" stripe>
        <ElTableColumn type="index" label="排名" width="80" />
        <ElTableColumn prop="name" label="团队名称" />
        <ElTableColumn prop="score" label="积分">
          <template #default="{ row }">{{ row.score || 0 }}</template>
        </ElTableColumn>
      </ElTable>
      <p v-if="selectedLeaderboard.length === 0" class="empty-leaderboard">暂无排名数据</p>
    </ElDialog>
  </div>
</template>

<style scoped>
.competition-page {
  max-width: 1000px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header-actions {
  display: flex;
  gap: 10px;
}
.competition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.comp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.comp-header h3 {
  margin: 0;
  font-size: 18px;
}
.comp-desc {
  color: #606266;
  margin-bottom: 12px;
}
.comp-meta {
  display: flex;
  gap: 16px;
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}
.comp-actions {
  display: flex;
  gap: 10px;
}
.empty, .empty-leaderboard {
  text-align: center;
  color: #909399;
  padding: 60px 0;
}

@media (max-width: 767px) {
  .page-header {
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .header-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .competition-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .comp-header h3 {
    font-size: 16px;
  }

  .comp-desc {
    font-size: 13px;
    margin-bottom: 8px;
  }

  .comp-meta {
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .comp-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .el-dialog {
    --el-dialog-width: 95vw !important;
    max-width: 95vw !important;
  }
}
</style>
