<template>
  <div class="home-container">
    <el-card class="welcome-card">
      <h1>欢迎来到 AI Career Companion</h1>
      <p class="description">无代码智能体竞赛平台</p>
      <div class="stats">
        <el-statistic title="智能体数量" :value="agentCount" />
        <el-statistic title="任务数量" :value="taskCount" />
        <el-statistic title="用户数量" :value="userCount" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const agentCount = ref(0)
const taskCount = ref(0)
const userCount = ref(0)
</script>

<style scoped>
.home-container {
  padding: 20px;
}

.welcome-card {
  max-width: 800px;
  margin: 0 auto;
}

.welcome-card h1 {
  font-size: 28px;
  margin-bottom: 10px;
}

.description {
  font-size: 16px;
  color: #666;
  margin-bottom: 30px;
}

.stats {
  display: flex;
  gap: 40px;
  justify-content: center;
}
</style>