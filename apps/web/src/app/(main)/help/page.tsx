import { Radar, Route, Target, Newspaper, Briefcase, Brain, Compass, Sword, Globe, Award, HelpCircle, MessageCircle, Database, Shield, Zap } from 'lucide-react'

const SKILL_GUIDES = [
  {
    name: '破局诊断',
    icon: Brain,
    slug: 'diagnose',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: '五维差距扫描，生成能力雷达图与推荐岗位',
    usage: '在对话框中描述你的专业、年级、目标岗位和现状，AI 会从技术栈 / 实习经历 / 项目经历 / 算法能力 / 信息差五个维度分析你的差距，并推荐 2-3 个适合双非学生的岗位。',
    tips: ['首次使用建议先做诊断，后续规划会基于诊断结果更精准', '越详细的自述 → 越准确的雷达图', '诊断结果会自动保存到本地，下次打开详情页可回顾'],
  },
  {
    name: '路径规划',
    icon: Compass,
    slug: 'plan',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: '基于诊断结果，生成 0-90 天可执行成长路径',
    usage: '告诉 AI 你的目标（如"想做前端工程师"），或基于已有的诊断雷达图，AI 会生成三阶段行动卡：0-30 天夯实基础 / 31-60 天补实习与作品 / 61-90 天冲刺校招。每张卡片都有具体的"做到什么程度算完成"和"去哪做"。',
    tips: ['可以先做诊断再规划，也可以直接说目标让 AI 推断', '行动卡标注了双非友好渠道（实习僧 / BOSS 直聘 / 牛客等）', '规划结果可在路径规划详情页查看完整里程碑'],
  },
  {
    name: '实战练兵',
    icon: Sword,
    slug: 'practice',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    description: '模拟面试 / 算法刷题 / 项目深挖，三种练兵模式',
    usage: '选择模式后直接开始：综合面试（技术 + 行为混合）、算法题（白板手撕难度）、项目深挖（STAR 法则追问）。AI 会出题 + 给反馈 + 建议改进方向。',
    tips: ['可以反复练习，每次题目不同', '建议先从综合面试开始熟悉节奏', '算法模式适合每天刷 2-3 题保持手感'],
  },
  {
    name: '信息差填平',
    icon: Globe,
    slug: 'info',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    description: '聚合双非不易获取的校招 / 实习 / 竞赛机会',
    usage: '回车即可获取最新资讯。AI 会推荐 2-4 个双非友好的机会，包含公司、岗位、薪资范围、地点、标签和投递链接。所有推荐都来自双非友好渠道。',
    tips: ['信息会随时间变化，定期回来查看最新资讯', '推荐链接指向实习僧 / 学校就业网 / 牛客等平台', '可结合路径规划中的"投递行动卡"一起使用'],
  },
  {
    name: '成果包装',
    icon: Award,
    slug: 'package',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    description: '把普通经历转化为面试可用的展示材料',
    usage: '粘贴简历原文 + 说明目标岗位，AI 会输出：ATS 友好优化文案、3 条量化项目亮点（可直接贴进简历）、以及面试复盘模板（含"被问到学校怎么接"的表达技巧）。',
    tips: ['简历原文越完整，优化效果越好', '项目亮点遵循 STAR + 量化数据格式', '面试复盘模板对双非学生特别有用'],
  },
]

const FAQS = [
  { q: '我的数据存在哪里？安全吗？', a: '当前版本所有数据存储在你的浏览器本地（IndexedDB + localStorage），不会上传到任何服务器。换浏览器或清除缓存会导致数据丢失。未来版本将支持云端备份（Supabase），届时你可以选择同步。' },
  { q: '不登录可以使用吗？', a: '可以！产品设计为"免登即用"，打开就能对话。匿名模式下数据存在本地浏览器中。如果需要跨设备同步和数据持久化，可以在设置页面注册账号（即将推出）。' },
  { q: 'AI 回答的依据是什么？', a: 'AI 回答由 DeepSeek 大模型生成，结合了三层记忆系统：L1 会话记忆（记住你说过的话）、L2 用户画像（自动提取的学校/年级/专业等）、L3 知识库（20 条双非专属知识）。无网络或 API Key 时会回落为预设示例数据。' },
  { q: '支持离线使用吗？', a: '部分支持。页面本身可以加载，但 AI 对话功能需要网络连接调用 DeepSeek API。之前对话的历史记录和缓存结果可以离线查看。' },
  { q: '如何导出我的数据？', a: '在设置页面可以查看和管理本地存储的数据。完整的导出功能正在开发中。' },
  { q: '五维诊断的五个维度是什么？', a: '技术栈（编程语言 / 框架掌握度）、实习经历（相关实习数量和质量）、项目经历（完整项目的深度和广度）、算法能力（数据结构与算法基础）、信息差（对行业机会和招聘渠道的了解）。' },
]

const SHORTCUTS = [
  { keys: 'Enter', desc: '发送消息' },
  { keys: 'Shift + Enter', desc: '换行（不发送）' },
  { keys: 'Esc', desc: '关闭侧边栏（移动端）' },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 标题区 */}
      <div className="mb-10">
        <h1 className="font-serif text-2xl font-bold text-ink mb-2 flex items-center gap-2">
          <HelpCircle className="h-7 w-7 text-accent" />
          使用帮助
        </h1>
        <p className="text-sm text-ink/60">
          AI 学职同伴 — 面向双非学生的 AI Copilot 式学职陪伴产品
        </p>
      </div>

      {/* 五 Skill 使用指南 */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink mb-4">
          <Zap className="h-5 w-5 text-amber-500" />
          五大 Skill 使用指南
        </h2>
        <div className="space-y-4">
          {SKILL_GUIDES.map((skill) => {
            const Icon = skill.icon
            return (
              <article key={skill.slug} id={skill.slug} className={`rounded-lg border ${skill.border} ${skill.bg} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${skill.color}`} />
                  <h3 className="font-bold text-ink">{skill.name}</h3>
                </div>
                <p className="text-sm text-ink/70 mb-3">{skill.description}</p>
                <div className="mb-3">
                  <p className="text-xs font-medium text-ink/50 uppercase tracking-wide mb-1">怎么用</p>
                  <p className="text-sm text-ink/80 leading-relaxed">{skill.usage}</p>
                </div>
                <ul className="space-y-1">
                  {skill.tips.map((tip) => (
                    <li key={tip} className="flex items-start gap-1.5 text-xs text-ink/60">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink mb-4">
          <MessageCircle className="h-5 w-5 text-accent" />
          常见问题
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-lg border border-ink/10 bg-paper">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink hover:text-accent transition list-none [&::marker]:hidden">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/50 shrink-0" />
                  {faq.q}
                </span>
              </summary>
              <div className="px-4 pb-3 text-sm text-ink/70 leading-relaxed border-t border-ink/5 pt-3">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 快捷键 */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink mb-4">
          键盘快捷键
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SHORTCUTS.map((sc) => (
            <div key={sc.keys} className="flex items-center justify-between rounded-md border border-ink/10 px-3 py-2">
              <kbd className="rounded bg-ink/5 px-1.5 py-0.5 text-xs font-mono text-ink/70">{sc.keys}</kbd>
              <span className="text-xs text-ink/60">{sc.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 关于 */}
      <section className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-amber-600" />
          <h3 className="font-medium text-sm text-ink">关于 AI 学职同伴</h3>
        </div>
        <p className="text-xs text-ink/60 leading-relaxed mb-2">
          本产品为 iCAN 创新创业大赛参赛项目，面向双非院校学生提供 AI 驱动的学职陪伴服务。
          核心差异：双非垂直定位 / 三层记忆 / 五 Skill 闭环 / 极致轻量。
        </p>
        <div className="flex items-center gap-3 text-xs text-ink/40">
          <span className="inline-flex items-center gap-1"><Database className="h-3 w-3" /> 数据存储于本地浏览器</span>
          <span>·</span>
          <span>Powered by DeepSeek AI</span>
        </div>
      </section>
    </div>
  )
}
