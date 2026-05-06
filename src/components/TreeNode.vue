<script setup lang="ts">import { ElButton, ElTag } from 'element-plus';

interface NodeData {
  id: number;
  parent_id?: number;
  content: string;
  coins: number;
  is_selected: boolean;
  is_manual_selected: boolean;
  children: NodeData[];
}

const props = defineProps<{
  node: NodeData;
  depth: number;
  canAddNode: boolean;
  isAuthor: boolean;
  rootIndex?: number;
}>();

const emit = defineEmits<{
  coin: [nodeId: number];
  reply: [nodeId: number];
  select: [nodeId: number];
  unselect: [nodeId: number];
}>();
</script>

<template>
  <div class="tree-node">
    <div class="node-item" :class="{ selected: node.is_selected }">
      <div class="node-header">
        <span v-if="depth === 0 && rootIndex !== undefined" class="node-number">第 {{ rootIndex + 1 }} 段</span>
        <span v-else class="node-number">接龙</span>
        <span class="node-coins">💰 {{ node.coins }}</span>
        <ElTag v-if="node.is_selected" type="success" size="small">已选中</ElTag>
        <span v-if="node.is_manual_selected" class="manual-badge">手动</span>
      </div>
      <p class="node-content">{{ node.content }}</p>
      <div class="node-actions">
        <ElButton size="small" @click="emit('coin', node.id)">投币</ElButton>
        <ElButton size="small" type="primary" plain @click="emit('reply', node.id)" v-if="canAddNode">在此接龙</ElButton>
        <ElButton size="small" type="primary" v-if="isAuthor && !node.is_selected && !node.is_manual_selected" @click="emit('select', node.id)">选为下一节点</ElButton>
        <ElButton size="small" type="danger" plain v-if="isAuthor && node.is_manual_selected" @click="emit('unselect', node.id)">取消手动选择</ElButton>
      </div>
    </div>
    <div v-if="node.children.length > 0" class="tree-children">
      <div v-for="child in node.children" :key="child.id" class="tree-child">
        <div class="child-connector"></div>
        <TreeNode
          :node="child"
          :depth="depth + 1"
          :can-add-node="canAddNode"
          :is-author="isAuthor"
          @coin="emit('coin', $event)"
          @reply="emit('reply', $event)"
          @select="emit('select', $event)"
          @unselect="emit('unselect', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  width: 100%;
}

.node-item {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;
  background: #fff;
}

.node-item:hover {
  border-color: #dcdfe6;
}

.node-item.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.node-number {
  font-weight: bold;
  color: #409eff;
}

.node-coins {
  margin-left: auto;
}

.manual-badge {
  font-size: 11px;
  background: #e6a23c;
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
}

.node-content {
  color: #303133;
  line-height: 1.8;
}

.node-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.tree-children {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding-left: 24px;
  border-left: 2px solid #e4e7ed;
}

.tree-child {
  position: relative;
}

.child-connector {
  position: absolute;
  left: -24px;
  top: 50%;
  width: 24px;
  height: 2px;
  background: #e4e7ed;
}
</style>
