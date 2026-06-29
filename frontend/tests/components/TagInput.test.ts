import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import TagInput from '@/components/TagInput.vue'

describe('TagInput', () => {
  it('renders existing tags', () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: [{ name: 'AI' }, { name: 'CS' }] },
      global: { plugins: [ElementPlus] },
    })
    expect(wrapper.text()).toContain('AI')
    expect(wrapper.text()).toContain('CS')
  })

  it('shows input when add button clicked', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: [] },
      global: { plugins: [ElementPlus] },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('emits update:modelValue on new tag', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: [] },
      global: { plugins: [ElementPlus] },
    })
    await wrapper.find('button').trigger('click')
    const input = wrapper.find('input')
    await input.setValue('newtag')
    await input.trigger('keyup.enter')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('blur 时添加标签', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: [] },
      global: { plugins: [ElementPlus] },
    })
    await wrapper.find('button').trigger('click')
    const input = wrapper.find('input')
    await input.setValue('blur-tag')
    await input.trigger('blur')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('关闭标签移除对应项', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: [{ name: 'AI' }, { name: 'CS' }] },
      global: { plugins: [ElementPlus] },
    })
    const closeBtn = wrapper.find('.el-tag__close')
    if (closeBtn.exists()) {
      await closeBtn.trigger('click')
      const updated = wrapper.emitted('update:modelValue')?.[0]?.[0] as { name: string }[]
      expect(updated.length).toBe(1)
    }
  })
})
