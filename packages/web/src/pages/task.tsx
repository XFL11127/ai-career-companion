import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './index.css'

interface Agent {
  id: string
  name: string
  description: string
  template: string
  createdAt: string
}

interface TemplateMap {
  [key: string]: string
}

const templateMap: TemplateMap = {
  'career-planning': '职业规划分析',
  'resume-matching': '简历岗位匹配',
  'industry-evaluation': '行业发展评估'
}

function TaskPage() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = () => {
    const storedAgents = JSON.parse(localStorage.getItem('agents') || '[]')
    setAgents(storedAgents)
  }

  const getTemplateLabel = (template: string): string => {
    return templateMap[template] || template
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个智能体吗？')) {
      const updatedAgents = agents.filter((agent) => agent.id !== id)
      localStorage.setItem('agents', JSON.stringify(updatedAgents))
      setAgents(updatedAgents)
    }
  }

  const handleChat = (agentId: string) => {
    navigate(`/chat/${agentId}`)
  }

  return (
    <div className="page-container">
      <Link to="/" className="back-link">
        ← 返回首页
      </Link>

      <div className="task-container">
        <div className="task-header">
          <h2 className="task-title">智能体列表</h2>
          <Link to="/create">
            <button className="btn btn-primary">创建智能体</button>
          </Link>
        </div>

        {agents.length === 0 ? (
          <div className="agent-list">
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <div className="empty-text">暂无智能体，点击上方按钮创建</div>
            </div>
          </div>
        ) : (
          <div className="agent-grid">
            {agents.map((agent) => (
              <div key={agent.id} className="agent-card">
                <div className="agent-header">
                  <h3 className="agent-name">{agent.name}</h3>
                  <span className="agent-template">
                    {getTemplateLabel(agent.template)}
                  </span>
                </div>
                <p className="agent-description">{agent.description}</p>
                <div className="agent-meta">
                  <span className="agent-time">创建于 {formatDate(agent.createdAt)}</span>
                </div>
                <div className="agent-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleChat(agent.id)}
                  >
                    进入对话分析
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(agent.id)}
                  >
                    删除智能体
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskPage