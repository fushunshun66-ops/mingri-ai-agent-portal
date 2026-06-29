<template>
  <div class="register-page">
    <div class="register-wrapper">
      <div class="register-brand">
        <div class="register-brand__logo">企业智能体统一门户</div>
        <p class="register-brand__slogan">连接企业内部 AI Agent，让智能协作触手可及</p>
      </div>

      <div class="register-form-panel">
        <h2>注册</h2>
        <p>创建企业智能体统一门户账号</p>

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
  background: var(--bg-page);
  position: relative;
  overflow: hidden;
}

.register-page::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, var(--color-primary-50) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.register-wrapper {
  display: flex;
  max-width: 900px;
  width: 100%;
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.register-brand {
  flex: 1;
  padding: var(--space-16) var(--space-12);
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.register-brand::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 20px 20px;
}

.register-brand__logo {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin-bottom: var(--space-3);
  position: relative;
  z-index: 1;
  text-wrap: balance;
}

.register-brand__slogan {
  font-size: var(--text-base);
  opacity: 0.75;
  line-height: 1.6;
  position: relative;
  z-index: 1;
  max-width: 260px;
  text-wrap: pretty;
}

.register-form-panel {
  flex: 1;
  padding: var(--space-16) var(--space-12);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.register-form-panel h2 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin-bottom: var(--space-2);
  text-wrap: balance;
}

.register-form-panel p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin-bottom: var(--space-8);
  text-wrap: pretty;
}

.register-form-panel :deep(.el-input .el-input__wrapper) {
  border-radius: var(--radius-md);
  padding: 2px 12px;
  box-shadow: 0 0 0 1px var(--color-gray-200);
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.register-form-panel :deep(.el-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-gray-300);
}

.register-form-panel :deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 2px var(--color-primary-200);
}

.register-btn {
  width: 100%;
  height: 44px;
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  font-weight: 600;
  margin-top: var(--space-2);
  transition-property: transform, box-shadow;
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-out);
}

.register-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 86, 219, 0.3);
}

.register-btn:active {
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .register-btn {
    transition-property: box-shadow;
  }

  .register-btn:hover,
  .register-btn:active {
    transform: none;
  }
}

.register-footer {
  text-align: center;
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.register-footer a {
  color: var(--color-primary-500);
}

@media (max-width: 768px) {
  .register-brand {
    display: none;
  }

  .register-wrapper {
    max-width: 420px;
    border-radius: var(--radius-lg);
  }

  .register-form-panel {
    padding: var(--space-8) var(--space-6);
  }
}
</style>
