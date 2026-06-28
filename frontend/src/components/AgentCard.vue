<template>
  <el-card class="agent-card" shadow="hover" @click="$emit('click')">
    <div class="agent-card-header">
      <el-avatar :size="48" shape="square" :src="agent.icon_url || undefined">
        {{ agent.name.charAt(0).toUpperCase() }}
      </el-avatar>
      <div class="agent-card-title">
        <h3 class="agent-name">{{ agent.name }}</h3>
        <div class="agent-platform">
          <el-tag size="small" type="info">{{ agent.platform_type?.toUpperCase() || 'BUILTIN' }}</el-tag>
        </div>
      </div>
    </div>

    <p class="agent-description">{{ agent.description || '暂无描述' }}</p>

    <div class="agent-tags" v-if="agent.tags && agent.tags.length > 0">
      <el-tag
        v-for="tag in agent.tags"
        :key="tag.name"
        size="small"
        class="tag-item"
      >
        {{ tag.name }}
      </el-tag>
    </div>

    <div class="agent-card-footer">
      <div class="agent-stats">
        <span class="stat-item">
          <el-icon><StarFilled /></el-icon>
          {{ agent.rating_avg.toFixed(1) }}
        </span>
        <span class="stat-item">
          <el-icon><Download /></el-icon>
          {{ agent.install_count }}
        </span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { StarFilled, Download } from '@element-plus/icons-vue'
import type { Agent } from '@/types/agent'

defineProps<{
  agent: Agent
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.agent-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border-radius: 10px;
}

.agent-card:hover {
  transform: translateY(-2px);
}

.agent-card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.agent-card-title {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agent-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tag-item {
  font-size: 11px;
}

.agent-card-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.agent-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
