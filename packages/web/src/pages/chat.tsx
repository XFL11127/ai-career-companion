import { useParams, Link } from 'react-router-dom'
import './index.css'

function ChatPage() {
  const { agentId } = useParams<{ agentId: string }>()

  return (
    <div className="page-container">
      <Link to="/task" className="back-link">
        ← 返回智能体列表
      </Link>

      <div className="create-container">
        <h2 className="create-title">职业分析对话</h2>

        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <div className="empty-text">智能体 ID: {agentId}</div>
          <div className="empty-text" style={{ marginTop: '8px', fontSize: '14px' }}>
            对话分析功能开发中，敬请期待...
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage