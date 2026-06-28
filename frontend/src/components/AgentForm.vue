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

      <el-form-item label="图标 URL" prop="icon_url">
        <el-input v-model="formData.icon_url" placeholder="可选，图标链接" />
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
        <el-divider content-position="left">平台配置</el-divider>

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
      <el-divider content-position="left">标签</el-divider>
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

const rules: FormRules = {
  name: [{ required: true, message: '请输入 Agent 名称', trigger: 'blur' }],
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
  border-radius: 10px;
}
</style>
