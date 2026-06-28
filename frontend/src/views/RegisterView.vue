<template>
  <div class="register-page">
    <div class="register-card">
      <h2 class="register-title">注册</h2>
      <p class="register-subtitle">创建企业智能体统一门户账号</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="企业标识" prop="tenant_slug">
              <el-input
                v-model="form.tenant_slug"
                placeholder="企业唯一标识（字母+数字）"
                size="large"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="企业名称" prop="tenant_name">
              <el-input
                v-model="form.tenant_name"
                placeholder="请输入企业名称"
                size="large"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="3-100个字符"
            size="large"
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱地址"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="8-128位，需含大小写字母和数字"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            native-type="submit"
            class="register-btn"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-footer">
        已有账号？<router-link to="/login">返回登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  tenant_slug: '',
  tenant_name: '',
  username: '',
  email: '',
  password: '',
})

const rules: FormRules = {
  tenant_slug: [
    { required: true, message: '请输入企业标识', trigger: 'blur' },
    { pattern: /^[a-z0-9-]+$/, message: '企业标识只能包含小写字母、数字和连字符', trigger: 'blur' },
  ],
  tenant_name: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 100, message: '用户名长度 3-100 字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 128, message: '密码长度 8-128 位', trigger: 'blur' },
  ],
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.register({
      tenant_slug: form.tenant_slug,
      tenant_name: form.tenant_name,
      username: form.username,
      email: form.email,
      password: form.password,
    })
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '注册失败'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-card {
  width: 520px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.register-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 8px;
}

.register-subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 32px;
}

.register-btn {
  width: 100%;
}

.register-footer {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.register-footer a {
  color: var(--primary-color);
}
</style>
