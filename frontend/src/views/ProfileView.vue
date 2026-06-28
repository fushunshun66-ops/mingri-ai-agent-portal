<template>
  <AppLayout>
    <div class="profile-page">
      <div class="page-header">
        <h1>个人信息</h1>
        <p>管理你的个人资料和账户安全</p>
      </div>

      <el-row :gutter="24">
        <!-- 基本信息 -->
        <el-col :span="14">
          <el-card class="profile-card">
            <template #header><h3>基本信息</h3></template>
            <el-form
              ref="formRef"
              :model="form"
              label-position="top"
              :rules="rules"
            >
              <el-form-item label="用户名">
                <el-input :model-value="authStore.user?.username" disabled />
              </el-form-item>
              <el-form-item label="显示名称" prop="display_name">
                <el-input v-model="form.display_name" placeholder="设置你的显示名称" />
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="form.email" placeholder="your@email.com" />
              </el-form-item>
              <el-form-item label="头像 URL">
                <el-input v-model="form.avatar_url" placeholder="可选，头像图片链接" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="saving" @click="handleSave">
                  保存修改
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <!-- 修改密码 -->
        <el-col :span="10">
          <el-card class="profile-card">
            <template #header><h3>修改密码</h3></template>
            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              label-position="top"
            >
              <el-form-item label="当前密码" prop="old_password">
                <el-input
                  v-model="passwordForm.old_password"
                  type="password"
                  show-password
                />
              </el-form-item>
              <el-form-item label="新密码" prop="new_password">
                <el-input
                  v-model="passwordForm.new_password"
                  type="password"
                  show-password
                  placeholder="8-128 位"
                />
              </el-form-item>
              <el-form-item label="确认新密码" prop="confirm_password">
                <el-input
                  v-model="passwordForm.confirm_password"
                  type="password"
                  show-password
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="changingPassword" @click="handleChangePassword">
                  修改密码
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/utils/error'

const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const saving = ref(false)
const changingPassword = ref(false)

const form = reactive({
  display_name: '',
  email: '',
  avatar_url: '',
})

const rules: FormRules = {
  email: [{ type: 'email', message: '请输入有效的邮箱', trigger: 'blur' }],
}

const passwordForm = reactive({
  old_password: '',
  new_password: '',
  confirm_password: '',
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (value !== passwordForm.new_password) {
    callback(new Error('两次密码输入不一致'))
  } else {
    callback()
  }
}

const passwordRules: FormRules = {
  old_password: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '密码长度至少 8 位', trigger: 'blur' },
  ],
  confirm_password: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

// 初始加载用户数据
onMounted(() => {
  if (authStore.user) {
    form.display_name = authStore.user.display_name ?? ''
    form.email = authStore.user.email ?? ''
    form.avatar_url = authStore.user.avatar_url ?? ''
  }
})

watch(() => authStore.user, (user) => {
  if (user) {
    form.display_name = user.display_name ?? ''
    form.email = user.email ?? ''
    form.avatar_url = user.avatar_url ?? ''
  }
})

async function handleSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    await authApi.updateMe({
      display_name: form.display_name || undefined,
      email: form.email || undefined,
      avatar_url: form.avatar_url || undefined,
    })
    await authStore.fetchUser()
    ElMessage.success('个人信息已更新')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '更新失败'))
  } finally {
    saving.value = false
  }
}

async function handleChangePassword() {
  if (!passwordFormRef.value) return
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  changingPassword.value = true
  try {
    await authApi.changePassword({
      old_password: passwordForm.old_password,
      new_password: passwordForm.new_password,
    })
    ElMessage.success('密码修改成功')
    passwordForm.old_password = ''
    passwordForm.new_password = ''
    passwordForm.confirm_password = ''
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '密码修改失败'))
  } finally {
    changingPassword.value = false
  }
}
</script>

<style scoped>
.profile-page { max-width: 1000px; }
.profile-card { margin-bottom: 24px; }
</style>
