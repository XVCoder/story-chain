<script setup lang="ts">
import { ref } from 'vue';
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus';
import { ElDialog } from 'element-plus';
import { authAPI } from '../api';
import { setUser } from '../store';

const emit = defineEmits<{
  (e: 'login'): void;
}>(); 

const visible = ref(false);
const form = ref({
  username: '',
  password: '',
});

const show = () => {
  visible.value = true;
};

const hide = () => {
  visible.value = false;
};

const handleLogin = async () => {
  try {
    const response = await authAPI.login(form.value);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    ElMessage.success('登录成功');
    hide();
    emit('login');
  } catch (error) {
    ElMessage.error('登录失败，请检查用户名和密码');
  }
};

defineExpose({ show, hide });
</script>

<template>
  <ElDialog v-model="visible" title="登录" @close="hide">
    <ElForm :model="form" label-width="80px">
      <ElFormItem label="用户名" prop="username">
        <ElInput v-model="form.username" placeholder="请输入用户名" />
      </ElFormItem>
      <ElFormItem label="密码" prop="password">
        <ElInput v-model="form.password" type="password" placeholder="请输入密码" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="hide">取消</ElButton>
      <ElButton type="primary" @click="handleLogin">登录</ElButton>
    </template>
  </ElDialog>
</template>
