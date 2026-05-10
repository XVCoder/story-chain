<script setup lang="ts">import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage, ElTabs, ElTabPane } from 'element-plus';
import { authAPI } from '../api';
import { setUser } from '../store';

const router = useRouter();
const activeTab = ref('login');
const loading = ref(false);

const loginForm = ref({ username: '', password: '' });
const registerForm = ref({ username: '', password: '', email: '' });

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  loading.value = true;
  try {
    const response = await authAPI.login(loginForm.value);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    ElMessage.success('登录成功');
    const redirect = localStorage.getItem('redirectAfterLogin');
    if (redirect) {
      localStorage.removeItem('redirectAfterLogin');
      router.push(redirect);
    } else {
      router.push('/home');
    }
  } catch {
    ElMessage.error('登录失败，请检查用户名和密码');
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  if (!registerForm.value.username || !registerForm.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  if (registerForm.value.username.length < 3) {
    ElMessage.warning('用户名至少3个字符');
    return;
  }
  if (registerForm.value.password.length < 6) {
    ElMessage.warning('密码至少6个字符');
    return;
  }
  loading.value = true;
  try {
    await authAPI.register(registerForm.value);
    const loginRes = await authAPI.login({
      username: registerForm.value.username,
      password: registerForm.value.password,
    });
    localStorage.setItem('token', loginRes.data.token);
    setUser(loginRes.data.user);
    ElMessage.success('注册成功');
    const redirect = localStorage.getItem('redirectAfterLogin');
    if (redirect) {
      localStorage.removeItem('redirectAfterLogin');
      router.push(redirect);
    } else {
      router.push('/home');
    }
  } catch {
    ElMessage.error('注册失败，用户名或邮箱已存在');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-brand">
        <span class="brand-icon">📖</span>
        <h1 class="brand-title">故事接龙</h1>
        <p class="brand-desc">共创精彩故事，开启无限想象</p>
      </div>

      <div class="login-card">
        <ElTabs v-model="activeTab" :stretch="true" class="login-tabs">
          <ElTabPane label="登录" name="login">
            <ElForm :model="loginForm" @keyup.enter="handleLogin" class="login-form">
              <ElFormItem>
                <ElInput v-model="loginForm.username" placeholder="用户名" size="large" prefix-icon="User" />
              </ElFormItem>
              <ElFormItem>
                <ElInput v-model="loginForm.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password />
              </ElFormItem>
              <ElFormItem>
                <ElButton type="primary" size="large" class="submit-btn" :loading="loading" @click="handleLogin">
                  登录
                </ElButton>
              </ElFormItem>
            </ElForm>
            <div class="form-footer">
              还没有账号？<span class="link" @click="activeTab = 'register'">立即注册</span>
            </div>
          </ElTabPane>

          <ElTabPane label="注册" name="register">
            <ElForm :model="registerForm" @keyup.enter="handleRegister" class="login-form">
              <ElFormItem>
                <ElInput v-model="registerForm.username" placeholder="用户名" size="large" prefix-icon="User" />
              </ElFormItem>
              <ElFormItem>
                <ElInput v-model="registerForm.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password />
              </ElFormItem>
              <ElFormItem>
                <ElInput v-model="registerForm.email" placeholder="邮箱（选填）" size="large" prefix-icon="Message" />
              </ElFormItem>
              <ElFormItem>
                <ElButton type="primary" size="large" class="submit-btn" :loading="loading" @click="handleRegister">
                  注册
                </ElButton>
              </ElFormItem>
            </ElForm>
            <div class="form-footer">
              已有账号？<span class="link" @click="activeTab = 'login'">立即登录</span>
            </div>
          </ElTabPane>
        </ElTabs>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 420px;
}

.login-brand {
  text-align: center;
  margin-bottom: 32px;
}

.brand-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 12px;
}

.brand-title {
  font-size: 36px;
  font-weight: bold;
  color: white;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.brand-desc {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin: 0;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.login-tabs {
  margin-bottom: 8px;
}

.login-form {
  margin-top: 24px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.submit-btn {
  width: 100%;
  border-radius: 8px;
  height: 44px;
  font-size: 16px;
}

.form-footer {
  text-align: center;
  color: #909399;
  font-size: 14px;
  margin-top: -8px;
}

.link {
  color: #409eff;
  cursor: pointer;
  font-weight: 500;
}

.link:hover {
  color: #66b1ff;
}
</style>
