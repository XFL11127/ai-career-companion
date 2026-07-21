export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Agent extends BaseEntity {
  name: string
  description: string
  status: 'active' | 'inactive' | 'stopped'
  config: AgentConfig
  ownerId: string
}

export interface AgentConfig {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

export interface Task extends BaseEntity {
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high'
  agentId: string
  input: string
  output?: string
  error?: string
}

export interface User extends BaseEntity {
  username: string
  email: string
  passwordHash: string
  role: 'admin' | 'user'
  status: 'active' | 'inactive'
  avatar?: string
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginationResult<T = any> {
  list: T[]
  total: number
  page: number
  pageSize: number
}