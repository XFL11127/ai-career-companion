import { NextRequest, NextResponse } from 'next/server'

// 模拟岗位详情数据（按公司名匹配）
const MOCK_JOBS: Record<string, {
  company: string
  role: string
  salary: string
  location: string
  tags: string[]
  url: string
  description: string
  requirements: string[]
  deadline: string
}> = {
  '某双非友好科技公司': {
    company: '某双非友好科技公司',
    role: '前端开发实习',
    salary: '200/天',
    location: '远程',
    tags: ['双非友好', '远程', '实习'],
    url: 'https://www.shixiseng.com',
    description: '负责公司前端产品的开发与维护，参与项目技术方案讨论，使用 React/Next.js 构建用户界面。',
    requirements: ['熟悉 HTML/CSS/JavaScript', '了解 React 或 Vue 框架', '有项目经验优先', '每周可实习3天以上'],
    deadline: '2026-09-30',
  },
  '某地市国企信息岗': {
    company: '某地市国企信息岗',
    role: '软件开发',
    salary: '8-12K',
    location: '二线城市',
    tags: ['稳定', '校招', '国企'],
    url: 'https://www.zhaopin.com',
    description: '参与企业内部信息系统的开发与运维，使用 Java/Python 进行后端开发，配合前端完成功能交付。',
    requirements: ['计算机相关专业本科及以上', '熟悉 Java 或 Python', '了解数据库基本操作', '良好的沟通能力'],
    deadline: '2026-10-15',
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // path[0] 是公司名（已 decode）
  const company = params.path[0] ? decodeURIComponent(params.path[0]) : ''

  if (!company) {
    return NextResponse.json({ error: '公司名不能为空' }, { status: 400 })
  }

  // 尝试精确匹配
  let job = MOCK_JOBS[company]

  // 精确匹配失败，尝试模糊匹配（包含关键词即可）
  if (!job) {
    const key = Object.keys(MOCK_JOBS).find((k) =>
      k.includes(company) || company.includes(k)
    )
    if (key) job = MOCK_JOBS[key]
  }

  // 仍然没找到，返回通用模拟数据
  if (!job) {
    return NextResponse.json({
      company,
      role: '岗位详情',
      salary: '面议',
      location: '详见招聘页面',
      tags: ['双非友好'],
      url: 'https://www.zhaopin.com',
      description: `${company}的岗位详情暂未收录。你可以点击下方链接前往招聘平台搜索相关岗位信息。`,
      requirements: ['请前往招聘平台查看具体岗位要求'],
      deadline: '以招聘平台公布为准',
    })
  }

  return NextResponse.json(job)
}
