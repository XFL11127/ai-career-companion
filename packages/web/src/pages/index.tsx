import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './index.css'

interface StatItem {
  value: number
  label: string
}

function Index() {
  const navigate = useNavigate()
  const [agentCount, setAgentCount] = useState(0)

  useEffect(() => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]')
    setAgentCount(agents.length)
  }, [])

  const stats: StatItem[] = [
    { value: agentCount, label: '智能体' },
    { value: 0, label: '任务' },
    { value: 0, label: '用户' }
  ]

  const handleCreateAgent = () => {
    navigate('/create')
  }

  const handleViewTasks = () => {
    navigate('/task')
  }

  return (
    <div className="page-container">
      <div className="header">
        <h1 className="main-title">欢迎来到 AI Career Companion</h1>
        <p className="sub-title">iCAN竞赛专用无代码智能体搭建平台</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={handleCreateAgent}>
          创建智能体
        </button>
        <button className="btn btn-secondary" onClick={handleViewTasks}>
          全部任务
        </button>
      </div>
    </div>
  )
}

export default Index