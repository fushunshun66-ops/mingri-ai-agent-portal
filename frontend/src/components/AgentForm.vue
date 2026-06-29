<template>
  <el-card class="agent-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Agent 名称" prop="name">
        <el-input v-model="formData.name" placeholder="输入 Agent 名称" />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="描述 Agent 的功能和用途"
        />
      </el-form-item>

      <el-form-item label="图标" prop="icon_url">
        <div class="icon-upload">
          <el-input
            v-model="formData.icon_url"
            placeholder="图标 URL 地址"
            class="icon-url-input"
          />
          <span class="icon-divider">或</span>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            accept="image/*"
          >
            <el-button>上传图标</el-button>
          </el-upload>
        </div>
        <div v-if="selectedFile" class="file-hint">
          已选择: {{ selectedFile.name }}
        </div>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="分类" prop="category_id">
            <el-select v-model="formData.category_id" placeholder="选择分类" clearable>
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="平台类型" prop="platform_type">
            <el-select v-model="formData.platform_type" placeholder="选择平台" clearable>
              <el-option label="Dify" value="dify" />
              <el-option label="N8N" value="n8n" />
              <el-option label="Coze" value="coze" />
              <el-option label="内置" value="builtin" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="版本" prop="version">
        <el-input v-model="formData.version" placeholder="1.0.0" />
      </el-form-item>

      <!-- 平台配置（根据 platform_type 动态展示） -->
      <template v-if="formData.platform_type && formData.platform_type !== 'builtin'">
        <h4 class="form-section-title">平台配置</h4>

        <el-form-item v-if="formData.platform_type === 'dify'" label="Dify API Key">
          <el-input
            v-model="platformConfig.api_key"
            placeholder="sk-..."
            show-password
          />
        </el-form-item>

        <el-form-item v-if="formData.platform_type === 'dify'" label="Dify Base URL">
          <el-input
            v-model="platformConfig.base_url"
            placeholder="https://api.dify.ai/v1"
          />
        </el-form-item>

        <el-form-item v-if="formData.platform_type === 'dify'" label="Dify App ID">
          <el-input
            v-model="platformConfig.app_id"
            placeholder="应用 ID"
          />
        </el-form-item>

        <el-form-item v-if="formData.platform_type === 'n8n'" label="N8N Webhook URL">
          <el-input
            v-model="platformConfig.webhook_url"
            placeholder="https://n8n.example.com/webhook/..."
          />
        </el-form-item>

        <el-form-item v-if="formData.platform_type === 'n8n'" label="N8N API Key">
          <el-input
            v-model="platformConfig.api_key"
            placeholder="输入 API Key"
            show-password
          />
        </el-form-item>

        <el-form-item v-if="formData.platform_type === 'coze'" label="Coze Bot ID">
          <el-input
            v-model="platformConfig.bot_id"
            placeholder="Bot ID"
          />
        </el-form-item>

        <el-form-item v-if="formData.platform_type === 'coze'" label="Coze API Key">
          <el-input
            v-model="platformConfig.api_key"
            placeholder="输入 API Key"
            show-password
          />
        </el-form-item>
      </template>

      <!-- 标签 -->
      <h4 class="form-section-title">标签</h4>
      <TagInput v-model="tags" />

      <el-form-item style="margin-top: 24px">
        <el-button type="primary" :loading="submitting" native-type="submit">
          {{ isEdit ? '保存修改' : '创建 Agent' }}
        </el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import TagInput from './TagInput.vue'
import { agentsApi } from '@/api/agents'
import type { Agent, AgentCreateRequest, AgentUpdateRequest, Category, Tag, PlatformType } from '@/types/agent'

const props = defineProps<{
  initialData?: Agent | null
}>()

const emit = defineEmits<{
  submit: [data: AgentCreateRequest | AgentUpdateRequest]
  iconFile: [file: File]
}>()

const isEdit = !!props.initialData

const formRef = ref<FormInstance>()
const submitting = ref(false)
const categories = ref<Category[]>([])

const formData = reactive({
  name: props.initialData?.name ?? '',
  description: props.initialData?.description ?? '',
  icon_url: props.initialData?.icon_url ?? '',
  category_id: props.initialData?.category_id ?? '',
  platform_type: props.initialData?.platform_type ?? '',
  version: props.initialData?.version ?? '1.0.0',
})

const platformConfig = reactive<Record<string, string>>(
  (props.initialData?.platform_config as Record<string, string>) ?? {},
)

const tags = ref<Tag[]>(props.initialData?.tags ?? [])
const selectedFile = ref<File | null>(null)

const rules: FormRules = {
  name: [{ required: true, message: '请输入 Agent 名称', trigger: 'blur' }],
}

function handleFileChange(uploadFile: { raw?: File }) {
  if (uploadFile.raw) {
    selectedFile.value = uploadFile.raw
    emit('iconFile', uploadFile.raw)
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const data: AgentCreateRequest = {
    ...formData,
    platform_type: (formData.platform_type as PlatformType) || undefined,
    tags: tags.value,
    platform_config: Object.keys(platformConfig).length > 0 ? { ...platformConfig } : undefined,
  }

  emit('submit', data)
}

async function fetchCategories() {
  try {
    const resp = await agentsApi.getCategories()
    if (resp.data.success && resp.data.data) {
      categories.value = resp.data.data
    }
  } catch {
    ElMessage.error('加载分类列表失败')
  }
}

onMounted(fetchCategories)
</script>

<style scoped>
.agent-form {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-100);
  box-shadow: var(--shadow-sm);
}

/* 分节标题（替代 el-divider） */
.form-section-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
  margin: var(--space-8) 0 var(--space-4);
  padding-left: var(--space-3);
  border-left: 3px solid var(--color-primary-500);
}

/* 输入框 */
.agent-form :deep(.el-input .el-input__wrapper) {
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--color-gray-200);
  background: var(--color-gray-50);
  transition: box-shadow var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
}

.agent-form :deep(.el-input .el-input__wrapper:hover) {
  background: var(--bg-surface);
  box-shadow: 0 0 0 1px var(--color-gray-300);
}

.agent-form :deep(.el-input.is-focus .el-input__wrapper) {
  background: var(--bg-surface);
  box-shadow: 0 0 0 2px var(--color-primary-200);
}

/* 文本域 */
.agent-form :deep(.el-textarea .el-textarea__inner) {
  border-radius: var(--radius-md);
  border-color: var(--color-gray-200);
  background: var(--color-gray-50);
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.agent-form :deep(.el-textarea .el-textarea__inner:hover) {
  border-color: var(--color-gray-300);
  background: var(--bg-surface);
}

.agent-form :deep(.el-textarea .el-textarea__inner:focus) {
  background: var(--bg-surface);
  border-color: var(--color-primary-300);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

/* 选择器 */
.agent-form :deep(.el-select .el-select__wrapper) {
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--color-gray-200);
  background: var(--color-gray-50);
  transition:
    box-shadow var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.agent-form :deep(.el-select .el-select__wrapper:hover) {
  background: var(--bg-surface);
}

/* 图标上传区 — 虚线按钮 */
.icon-upload {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}

.icon-url-input {
  flex: 1;
}

.agent-form :deep(.icon-upload .el-button) {
  border-style: dashed;
  border-color: var(--color-gray-200);
  background: transparent;
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  transition:
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.agent-form :deep(.icon-upload .el-button:hover) {
  border-color: var(--color-primary-300);
  color: var(--color-primary-500);
  background: var(--color-primary-50);
}

/* 提交按钮 */
.agent-form :deep(.el-button--primary) {
  height: 40px;
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 600;
  transition:
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out);
}

.agent-form :deep(.el-button--primary:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 86, 219, 0.25);
}

@media (prefers-reduced-motion: reduce) {
  .agent-form :deep(.el-button--primary:hover) {
    transform: none;
  }
}

/* 取消按钮 */
.agent-form :deep(.el-button.is-plain) {
  border-radius: var(--radius-md);
  padding: 0 var(--space-6);
}

/* Label */
.agent-form :deep(.el-form-item__label) {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-gray-700);
  padding-bottom: var(--space-1);
}

.icon-divider {
  color: var(--color-gray-300);
  font-size: var(--text-sm);
  white-space: nowrap;
}

.file-hint {
  font-size: var(--text-xs);
  color: var(--color-primary-500);
  margin-top: var(--space-1);
}
</style>
