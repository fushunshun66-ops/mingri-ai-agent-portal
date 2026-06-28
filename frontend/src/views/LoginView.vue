<template>
  <div class="login-page">
    <div class="login-card">
      <h2 class="login-title">登录</h2>
      <p class="login-subtitle">登录企业智能体统一门户</p>

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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 8px;
}

.login-subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 32px;
}

.login-btn {
  width: 100%;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.login-footer a {
  color: var(--primary-color);
}
</style>
