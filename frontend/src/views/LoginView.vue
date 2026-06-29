<template>
  <div class="login-page">
    <div class="login-wrapper">
      <div class="login-brand">
        <div class="login-brand__logo">企业智能体统一门户</div>
        <p class="login-brand__slogan">连接企业内部 AI Agent，让智能协作触手可及</p>
      </div>

      <div class="login-form-panel">
        <h2>登录</h2>
        <p>登录企业智能体统一门户</p>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @submit.prevent="handleSubmit"
        >
          <el-form-item label="企业标识" prop="tenant_slug">
            <el-input
              v-model="form.tenant_slug"
              name="tenant_slug"
              placeholder="请输入企业标识"
              size="large"
            />
          </el-form-item>

          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="form.username"
              name="username"
              placeholder="请输入用户名"
              size="large"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              name="password"
              type="password"
              placeholder="请输入密码"
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
              class="login-btn"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  tenant_slug: '',
  username: '',
  password: '',
})

const rules: FormRules = {
  tenant_slug: [{ required: true, message: '请输入企业标识', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login({
      tenant_slug: form.tenant_slug,
      username: form.username,
      password: form.password,
    })
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/home'
    router.push(redirect)
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '登录失败'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  position: relative;
  overflow: hidden;
}

.login-page::after {
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

.login-wrapper {
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

.login-brand {
  flex: 1;
  padding: var(--space-16) var(--space-12);
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.login-brand::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 20px 20px;
}

.login-brand__logo {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin-bottom: var(--space-3);
  position: relative;
  z-index: 1;
  text-wrap: balance;
}

.login-brand__slogan {
  font-size: var(--text-base);
  opacity: 0.75;
  line-height: 1.6;
  position: relative;
  z-index: 1;
  max-width: 260px;
  text-wrap: pretty;
}

.login-form-panel {
  flex: 1;
  padding: var(--space-16) var(--space-12);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-form-panel h2 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin-bottom: var(--space-2);
  text-wrap: balance;
}

.login-form-panel p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin-bottom: var(--space-8);
  text-wrap: pretty;
}

.login-form-panel :deep(.el-input .el-input__wrapper) {
  border-radius: var(--radius-md);
  padding: 2px 12px;
  box-shadow: 0 0 0 1px var(--color-gray-200);
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.login-form-panel :deep(.el-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-gray-300);
}

.login-form-panel :deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 2px var(--color-primary-200);
}

.login-btn {
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

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 86, 219, 0.3);
}

.login-btn:active {
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .login-btn {
    transition-property: box-shadow;
  }

  .login-btn:hover,
  .login-btn:active {
    transform: none;
  }
}

.login-footer {
  text-align: center;
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.login-footer a {
  color: var(--color-primary-500);
}

@media (max-width: 768px) {
  .login-brand {
    display: none;
  }

  .login-wrapper {
    max-width: 420px;
    border-radius: var(--radius-lg);
  }

  .login-form-panel {
    padding: var(--space-8) var(--space-6);
  }
}
</style>
