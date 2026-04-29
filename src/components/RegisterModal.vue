<script setup lang="ts">
import { ref } from 'vue';
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus';
import { ElDialog } from 'element-plus';
import { authAPI } from '../api';

const visible = ref(false);
const form = ref({
  username: '',
  password: '',
  email: '',
});

const show = () => {
  visible.value = true;
};

const hide = () => {
  visible.value = false;
};

const handleRegister = async () => {
  try {
    await authAPI.register(form.value);
    ElMessage.success('注册成功，请登录');
    hide();
  } catch (error) {
    ElMessage.error('注册失败，用户名或邮箱已存在');
  }
};

defineExpose({ show, hide });
</script>

<template>
  <ElDialog v-model="visible" title="注册" @close="hide">
      <ElForm :model="form" label-width="80px">
        <ElFormItem label="用户名" prop="username">
          <ElInput v-model="form.username" placeholder="请输入用户名" />
        </ElFormItem>
        <ElFormItem label="密码" prop="password">
          <ElInput v-model="form.password" type="password" placeholder="请输入密码" />
        </ElFormItem>
        <ElFormItem label="邮箱" prop="email">
          <ElInput v-model="form.email" placeholder="请输入邮箱（选填）" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="hide">取消</ElButton>
        <ElButton type="primary" @click="handleRegister">注册</ElButton>
      </template>
    </ElDialog>
</template>
