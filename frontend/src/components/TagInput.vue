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
.tag-input { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
