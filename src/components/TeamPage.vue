<script setup lang="ts">import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElCard, ElButton, ElMessage, ElDialog, ElForm, ElFormItem, ElInput, ElTag, ElTable, ElTableColumn } from 'element-plus';
import { store } from '../store';
import { teamAPI } from '../api';
import type { Team, TeamMember } from '../types';

const router = useRouter();
const allTeams = ref<Team[]>([]);
const myTeams = ref<Team[]>([]);
const selectedTeamMembers = ref<TeamMember[]>([]);
const showMembersDialog = ref(false);
const showCreateDialog = ref(false);
const createForm = ref({ name: '' });
const loading = ref(false);

const fetchTeams = async () => {
  try {
    const [allRes, myRes] = await Promise.all([
      teamAPI.getAll(),
      store.user ? teamAPI.getUserTeams() : Promise.resolve({ data: [] }),
    ]);
    allTeams.value = allRes.data;
    myTeams.value = myRes.data;
  } catch {
    console.error('Failed to fetch teams');
  }
};

const handleCreateTeam = async () => {
  if (!createForm.value.name.trim()) {
    ElMessage.warning('请输入团队名称');
    return;
  }
  loading.value = true;
  try {
    await teamAPI.create({ name: createForm.value.name });
    ElMessage.success('团队创建成功');
    showCreateDialog.value = false;
    createForm.value.name = '';
    await fetchTeams();
  } catch {
    ElMessage.error('创建失败，团队名可能已存在');
  } finally {
    loading.value = false;
  }
};

const handleJoinTeam = async (teamId: number) => {
  try {
    await teamAPI.join(teamId);
    ElMessage.success('加入成功');
    await fetchTeams();
  } catch {
    ElMessage.error('加入失败');
  }
};

const handleLeaveTeam = async (teamId: number) => {
  try {
    await teamAPI.leave(teamId);
    ElMessage.success('已退出团队');
    await fetchTeams();
  } catch {
    ElMessage.error('退出失败');
  }
};

const handleViewMembers = async (teamId: number) => {
  try {
    const res = await teamAPI.getMembers(teamId);
    selectedTeamMembers.value = res.data;
    showMembersDialog.value = true;
  } catch {
    ElMessage.error('获取成员列表失败');
  }
};

const isMember = (teamId: number) => myTeams.value.some(t => t.id === teamId);
const getMyRole = (teamId: number) => myTeams.value.find(t => t.id === teamId)?.role;

onMounted(() => {
  fetchTeams();
});
</script>

<template>
  <div class="team-page">
    <div class="page-header">
      <h1>团队管理</h1>
      <div class="header-actions">
        <ElButton @click="router.push('/competitions')">竞赛列表</ElButton>
        <ElButton type="primary" @click="showCreateDialog = true" v-if="store.user">创建团队</ElButton>
      </div>
    </div>

    <ElCard v-if="myTeams.length > 0" class="section">
      <template #header><span>我的团队</span></template>
      <div class="team-grid">
        <div v-for="team in myTeams" :key="team.id" class="team-card">
          <div class="team-info">
            <h3>{{ team.name }}</h3>
            <ElTag :type="team.role === 'leader' ? 'warning' : 'info'">
              {{ team.role === 'leader' ? '队长' : '成员' }}
            </ElTag>
          </div>
          <div class="team-actions">
            <ElButton size="small" @click="handleViewMembers(team.id)">成员</ElButton>
            <ElButton size="small" type="danger" plain @click="handleLeaveTeam(team.id)">退出</ElButton>
          </div>
        </div>
      </div>
    </ElCard>

    <ElCard class="section">
      <template #header><span>所有团队</span></template>
      <div class="team-grid">
        <div v-for="team in allTeams" :key="team.id" class="team-card">
          <div class="team-info">
            <h3>{{ team.name }}</h3>
          </div>
          <div class="team-actions">
            <ElButton size="small" @click="handleViewMembers(team.id)">成员</ElButton>
            <ElButton
              v-if="store.user && !isMember(team.id)"
              size="small"
              type="primary"
              @click="handleJoinTeam(team.id)"
            >加入</ElButton>
            <ElTag v-else-if="isMember(team.id)" type="success" size="small">已加入</ElTag>
          </div>
        </div>
        <p v-if="allTeams.length === 0" class="empty">暂无团队</p>
      </div>
    </ElCard>

    <ElDialog v-model="showCreateDialog" title="创建团队" width="400px">
      <ElForm :model="createForm">
        <ElFormItem label="团队名称">
          <ElInput v-model="createForm.name" placeholder="请输入团队名称" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showCreateDialog = false">取消</ElButton>
        <ElButton type="primary" @click="handleCreateTeam" :loading="loading">创建</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="showMembersDialog" title="团队成员" width="500px">
      <ElTable :data="selectedTeamMembers" stripe>
        <ElTableColumn prop="username" label="用户名" />
        <ElTableColumn prop="role" label="角色">
          <template #default="{ row }">
            <ElTag :type="row.role === 'leader' ? 'warning' : 'info'">
              {{ row.role === 'leader' ? '队长' : '成员' }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElDialog>
  </div>
</template>

<style scoped>
.team-page {
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
.section {
  margin-bottom: 20px;
}
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.team-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.team-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
}
.team-actions {
  display: flex;
  gap: 8px;
}
.empty {
  text-align: center;
  color: #909399;
  padding: 40px;
  grid-column: 1 / -1;
}
</style>
