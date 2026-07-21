import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './index.css'

interface TemplateOption {
  value: string
  label: string
}

interface FormData {
  name: string
  description: string
  template: string
}

interface ErrorState {
  name: string
  description: string
  template: string
}

interface AgentData {
  id: string
  name: string
  description: string
  template: string
  createdAt: string
}

const templates: TemplateOption[] = [
  { value: '', label: '请选择模板' },
  { value: 'career-planning', label: '职业规划分析' },
  { value: 'resume-matching', label: '简历岗位匹配' },
  { value: 'industry-evaluation', label: '行业发展评估' }
]

function Create() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    template: ''
  })
  const [errors, setErrors] = useState<ErrorState>({
    name: '',
    description: '',
    template: ''
  })
  const [showSuccess, setShowSuccess] = useState(false)

  const validateField = (field: keyof FormData, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return '请输入智能体名称'
        return ''
      case 'description':
        if (!value.trim()) return '请输入智能体功能描述'
        return ''
      case 'template':
        if (!value) return '请选择模板配置'
        return ''
      default:
        return ''
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
    const error = validateField(name as keyof FormData, value)
    setErrors((prev) => ({
      ...prev,
      [name]: error
    }))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
    const error = validateField(name as keyof FormData, value)
    setErrors((prev) => ({
      ...prev,
      [name]: error
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: ErrorState = {
      name: validateField('name', formData.name),
      description: validateField('description', formData.description),
      template: validateField('template', formData.template)
    }
    setErrors(newErrors)
    return !newErrors.name && !newErrors.description && !newErrors.template
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    const newAgent: AgentData = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      name: formData.name,
      description: formData.description,
      template: formData.template,
      createdAt: new Date().toISOString()
    }

    const existingAgents = JSON.parse(localStorage.getItem('agents') || '[]')
    existingAgents.push(newAgent)
    localStorage.setItem('agents', JSON.stringify(existingAgents))

    setShowSuccess(true)
  }

  const handleReset = () => {
    setFormData({
      name: '',
      description: '',
      template: ''
    })
    setErrors({
      name: '',
      description: '',
      template: ''
    })
    setShowSuccess(false)
  }

  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <div className="page-container">
      <Link to="/" className="back-link">
        ← 返回首页
      </Link>

      <div className="create-container">
        <h2 className="create-title">创建智能体</h2>

        {showSuccess ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <div className="success-text">职业分析智能体创建成功</div>
            <div className="success-actions">
              <button className="btn btn-primary" onClick={handleReset}>
                继续创建
              </button>
              <button className="btn btn-secondary" onClick={handleGoHome}>
                返回首页
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">智能体名称 <span className="required">*</span></label>
              <input
                type="text"
                name="name"
                className={`form-input ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={handleInputChange}
                placeholder="请输入智能体名称"
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">智能体功能描述 <span className="required">*</span></label>
              <textarea
                name="description"
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="请输入智能体功能描述"
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">模板配置 <span className="required">*</span></label>
              <select
                name="template"
                className={`form-select ${errors.template ? 'error' : ''}`}
                value={formData.template}
                onChange={handleSelectChange}
              >
                {templates.map((template) => (
                  <option key={template.value} value={template.value}>
                    {template.label}
                  </option>
                ))}
              </select>
              {errors.template && <span className="error-message">{errors.template}</span>}
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                重置
              </button>
              <button type="submit" className="btn btn-primary">
                提交
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Create