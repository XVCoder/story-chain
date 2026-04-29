<script setup lang="ts">
import { ref } from 'vue';
import { ElButton, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElMessage } from 'element-plus';
import { ElDialog } from 'element-plus';
import { storyAPI } from '../api';

const emit = defineEmits<{
  (e: 'created'): void;
}>(); 

const visible = ref(false);
const form = ref({
  title: '',
  summary: '',
  content: '',
  mode: 'free',
  max_nodes: 5,
});

const modes = [
  { value: 'free', label: '自由模式' },
  { value: 'selected', label: '精选模式' },
  { value: 'solo', label: 'Solo模式' },
  { value: 'team', label: '组队竞赛' },
];

const show = () => {
  visible.value = true;
};

const hide = () => {
  visible.value = false;
  form.value = {
    title: '',
    summary: '',
    content: '',
    mode: 'free',
    max_nodes: 5,
  };
};

const handleCreate = async () => {
  if (!form.value.title || !form.value.summary || !form.value.content) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  try {
    await storyAPI.create(form.value);
    ElMessage.success('故事创建成功');
    hide();
    emit('created');
  } catch (error) {
    ElMessage.error('创建失败');
  }
};

defineExpose({ show, hide });
</script>

<template>
  <ElDialog v-model="visible" title="创建故事" width="600px" @close="hide">
    <ElForm :model="form" label-width="100px">
      <ElFormItem label="故事标题" prop="title">
        <ElInput v-model="form.title" placeholder="请输入故事标题" />
      </ElFormItem>
      <ElFormItem label="故事概要" prop="summary">
        <ElInput v-model="form.summary" type="textarea" :rows="2" placeholder="请输入故事概要" />
      </ElFormItem>
      <ElFormItem label="开头内容" prop="content">
        <ElInput v-model="form.content" type="textarea" :rows="4" placeholder="请输入故事开头" />
      </ElFormItem>
      <ElFormItem label="游戏模式" prop="mode">
        <ElSelect v-model="form.mode">
          <ElOption v-for="mode in modes" :key="mode.value" :label="mode.label" :value="mode.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="最大节点数" prop="max_nodes">
        <ElSelect v-model="form.max_nodes">
          <ElOption v-for="n in [3, 5, 7, 10]" :key="n" :label="n" :value="n" />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="hide">取消</ElButton>
      <ElButton type="primary" @click="handleCreate">创建</ElButton>
    </template>
  </ElDialog>
</template>
