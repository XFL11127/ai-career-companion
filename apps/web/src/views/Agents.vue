<template>
  <div class="agents-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>智能体管理</h2>
          <el-button type="primary" @click="handleAdd">新建智能体</el-button>
        </div>
      </template>
      <el-table :data="agents" border>
        <el-table-column prop="id" label="ID" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '运行中' : '停止' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" />
        <el-table-column label="操作">
          <template #default>
            <el-button size="small">编辑</el-button>
            <el-button size="small" type="danger">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Agent } from '@ai-career-companion/types'

const agents = ref<Agent[]>([])

const handleAdd = () => {
}
</script>

<style scoped>
.agents-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>