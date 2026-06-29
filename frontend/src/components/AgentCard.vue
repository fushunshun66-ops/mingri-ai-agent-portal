<template>
  <div class="agent-card" @click="$emit('click')">
    <div class="agent-card-header">
      <div class="agent-icon">
        <img v-if="agent.icon_url" :src="agent.icon_url" alt="" />
        <span v-else>{{ agent.name.charAt(0).toUpperCase() }}</span>
      </div>
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
  </div>
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
  position: relative;
  cursor: pointer;
  transition:
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-100);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  padding: var(--space-4);
  animation: fade-in-up var(--duration-slow) var(--ease-out) both;
}

.agent-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-100);
}

.agent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--color-primary-500),
    var(--color-primary-400)
  );
  transition: width var(--duration-slow) var(--ease-out);
  transform: translateX(-50%);
}

.agent-card:hover::before {
  width: 100%;
}

.agent-card-header {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  margin-bottom: var(--space-3);
}

.agent-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: linear-gradient(
    135deg,
    var(--color-primary-50),
    var(--color-primary-100)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-primary-600);
  flex-shrink: 0;
  overflow: hidden;
}

.agent-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.agent-card-title {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
  margin: 0 0 var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-platform :deep(.el-tag) {
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  padding: 0 8px;
  height: 22px;
  line-height: 22px;
  border: none;
  background: var(--color-gray-100);
  color: var(--color-gray-500);
}

.agent-description {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  line-height: 1.6;
  margin-bottom: var(--space-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agent-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.agent-tags :deep(.tag-item) {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border: none;
}

.agent-card-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--color-gray-100);
  padding-top: var(--space-3);
}

.agent-stats {
  display: flex;
  gap: var(--space-4);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

.stat-item :deep(.el-icon) {
  font-size: 14px;
  color: var(--color-gray-300);
}

@media (prefers-reduced-motion: reduce) {
  .agent-card {
    animation: none;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .agent-card:hover {
    transform: none;
  }

  .agent-card::before {
    transition: none;
  }
}
</style>
