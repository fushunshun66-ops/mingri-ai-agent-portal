<template>
  <div class="tag-input">
    <div class="tag-list">
      <el-tag
        v-for="(tag, idx) in modelValue"
        :key="idx"
        closable
        :color="tag.color"
        @close="removeTag(idx)"
      >
        {{ tag.name }}
      </el-tag>
    </div>
    <el-input
      v-if="showInput"
      ref="inputRef"
      v-model="inputValue"
      size="small"
      placeholder="输入标签名，回车添加"
      @keyup.enter="addTag"
      @blur="addTag"
    />
    <el-button
      v-else
      size="small"
      @click="showInput = true"
    >
      + 添加标签
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Tag } from '@/types/agent'

const props = defineProps<{
  modelValue: Tag[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Tag[]]
}>()

const showInput = ref(false)
const inputValue = ref('')
const inputRef = ref()

function addTag() {
  const name = inputValue.value.trim()
  if (name) {
    const exists = props.modelValue.find(t => t.name === name)
    if (!exists) {
      emit('update:modelValue', [...props.modelValue, { name }])
    }
  }
  inputValue.value = ''
  showInput.value = false
}

function removeTag(index: number) {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}
</script>

<style scoped>
.tag-input {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: flex-start;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* 标签胶囊样式 */
.tag-input :deep(.el-tag) {
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
  color: var(--color-primary-600);
  height: 26px;
  padding: 0 var(--space-3);
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.tag-input :deep(.el-tag:hover) {
  background: var(--color-primary-100);
  border-color: var(--color-primary-300);
}

.tag-input :deep(.el-tag .el-tag__close) {
  color: var(--color-primary-400);
  transition: color var(--duration-fast) var(--ease-out);
}

.tag-input :deep(.el-tag .el-tag__close:hover) {
  color: var(--color-primary-600);
  background: var(--color-primary-100);
  border-radius: var(--radius-full);
}

/* 输入框圆角 */
.tag-input :deep(.el-input .el-input__wrapper) {
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 1px var(--color-gray-200);
  transition:
    box-shadow var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.tag-input :deep(.el-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-gray-300);
}

.tag-input :deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 2px var(--color-primary-200);
}
</style>
