/**
 * L3 知识向量记忆（MVP 静态知识库）
 *
 * 方案 v3.6 定义：L3 存储"岗位知识图谱、技能关联、成功路径模式"。
 * MVP 阶段降级为预置静态知识库，关键词匹配检索；未来版本接入 pgvector 语义搜索。
 *
 * 检索结果注入 LLM prompt，与 L1（会话上下文）、L2（用户画像）并列组成三层记忆。
 */

export interface L3KnowledgeItem {
  id: string;
  /** 所属分类 */
  category:
    | 'career_path'
    | 'skill_roadmap'
    | 'recruitment'
    | 'resume_tips'
    | 'interview_prep'
    | 'industry_insight';
  /** 关联 Skill（用于过滤） */
  skills: string[];
  /** 关键词（中文，用于匹配用户输入） */
  keywords: string[];
  /** 知识内容 */
  content: string;
}

/** 双非学生专属知识库 —— 覆盖 6 个赛道、关联 5 个 Skill */
const KNOWLEDGE_BASE: L3KnowledgeItem[] = [
  // ────────── 岗位方向（关联 diagnose / plan）──────────
  {
    id: 'k1',
    category: 'career_path',
    skills: ['diagnose', 'plan'],
    keywords: [
      '前端',
      '前端开发',
      '前端工程师',
      'web',
      '网页',
      'React',
      'Vue',
      'HTML',
      'CSS',
      'JavaScript',
    ],
    content:
      '前端开发是双非计算机专业学生最容易切入的岗位方向。核心技能栈：HTML/CSS/JavaScript 基础 → React 或 Vue 框架 → TypeScript → Next.js 或 Nuxt。双非友好企业包括：字节跳动（部分部门不看学历）、美团、快手、以及大量中小型科技公司和外包公司。建议在校期间完成 2-3 个完整项目并部署上线，用 GitHub 展示代码。',
  },
  {
    id: 'k2',
    category: 'career_path',
    skills: ['diagnose', 'plan'],
    keywords: [
      '后端',
      '后端开发',
      'Java',
      'Python',
      'Go',
      'Node',
      'Spring',
      '数据库',
      'SQL',
      '服务器',
    ],
    content:
      '后端开发方向竞争激烈，双非学生建议走 Java 或 Go 路线。Java 岗位多但竞争大，需掌握 Spring Boot + MyBatis + MySQL + Redis；Go 语言新兴且岗位增速快，适合希望差异化竞争的学生。国企/银行科技岗对学历有一定要求，建议同时准备互联网中小厂和外包公司作为保底。',
  },
  {
    id: 'k3',
    category: 'career_path',
    skills: ['diagnose', 'plan'],
    keywords: ['数据分析', '数据', '分析', 'Python', 'SQL', 'Excel', 'BI', '可视化', 'pandas'],
    content:
      '数据分析是双非学生的高性价比选择。门槛相对低，核心技能：SQL + Excel + Python（pandas/numpy）+ 可视化工具（Tableau/PowerBI）。行业需求广（互联网、金融、零售、咨询），不强制要求顶会论文和名校背景。建议考取相关证书（如 Google Data Analytics）增加竞争力。',
  },
  {
    id: 'k4',
    category: 'career_path',
    skills: ['diagnose', 'plan'],
    keywords: ['测试', 'QA', '测试工程师', '自动化', '软件测试', '质量'],
    content:
      '软件测试是双非学生的高上岸率方向。入门门槛低，学习周期短（3-6 个月可入门），岗位需求量大且稳定。核心技能：测试理论 + 用例设计 + 接口测试（Postman）+ 自动化测试（Selenium/Playwright）+ 性能测试基础（JMeter）。很多测试岗位对学历要求宽松，更看重细心和逻辑思维。',
  },
  {
    id: 'k5',
    category: 'career_path',
    skills: ['diagnose', 'plan'],
    keywords: ['产品经理', '产品', 'PM', '需求', '原型', 'Axure', 'Figma'],
    content:
      '产品经理岗位对专业背景包容度高，双非文科/理科学生都可以尝试。核心能力：需求分析 + 原型设计（Figma/Axure）+ 数据分析 + 沟通协作。建议在校期间参加产品类比赛（如 iCAN、互联网+），积累作品集。校招看重实习经历和产品 sense，建议尽早找一份产品实习（哪怕是小公司）。',
  },
  {
    id: 'k6',
    category: 'career_path',
    skills: ['diagnose', 'plan'],
    keywords: ['运营', '新媒体', '内容', '用户运营', '社群', '增长', '营销'],
    content:
      '运营岗位是双非文科学生的最友好选择。不限专业，门槛适中，成长空间大。细分方向：内容运营、用户运营、社群运营、新媒体运营、电商运营。建议在校期间运营个人自媒体账号（公众号/小红书/B站），用真实数据证明运营能力。校招更看重实习经历和项目成果，而非学历。',
  },
  {
    id: 'k7',
    category: 'career_path',
    skills: ['diagnose', 'plan'],
    keywords: ['考研', '考公', '考编', '研究生', '公务员', '事业编', '国企'],
    content:
      '考研、考公、考编是双非学生绕不开的三条路。考研可以提升学历层次、延长准备时间、拓展人脉资源；考公考编提供稳定编制，对双非背景歧视较小。选择原则：如果目标岗位明确要求硕士学历则考研，如果期望稳定工作则考公考编，如果已有清晰职业方向则优先就业积累经验。三者可以并行准备，但时间规划需慎重。',
  },

  // ────────── 技能路线（关联 plan / practice）──────────
  {
    id: 'k8',
    category: 'skill_roadmap',
    skills: ['plan', 'practice'],
    keywords: ['算法', '刷题', 'LeetCode', '剑指offer', '数据结构', '动态规划', '力扣'],
    content:
      '算法能力是校招技术岗的核心考核项。双非学生建议：基础阶段（1-2月）刷完《剑指Offer》+ LeetCode 热题 100；进阶阶段（2-3月）按标签分类刷题（数组、字符串、链表、树、动态规划、回溯）；冲刺阶段做企业真题。每天 2-3 题即可，重在理解思路而非数量。面试中的算法题通常中等难度即可，不要求 ACM 金牌水平。',
  },
  {
    id: 'k9',
    category: 'skill_roadmap',
    skills: ['plan', 'practice'],
    keywords: ['项目', '项目经历', 'GitHub', '开源', '实战', 'demo'],
    content:
      '双非学生最有效的破局手段：用项目经历替代学历劣势。建议做 2-3 个"解决真实问题"的项目而非玩具 demo。项目方向建议：选一个你目标行业的痛点，用技术解决它（如校园二手交易平台、自习室预约系统、课程评价聚合站）。关键是：上线可访问 + GitHub 开源 + README 写清技术栈和架构 + 有用户数据更佳。面试时用 STAR 法则（情境-任务-行动-结果）讲项目。',
  },
  {
    id: 'k10',
    category: 'skill_roadmap',
    skills: ['plan', 'practice'],
    keywords: ['实习', '暑期', '远程', '日常', '兼职', '工作经历', '经验'],
    content:
      '实习是双非学生最好的学历平权工具。一份好实习的价值 > 学校名气。策略：大二暑假开始投递（越早越好），优先选择有转正机会的岗位。如果一线大厂进不去，先从中厂/创业公司做起，积累经验后再跳。远程实习在疫情期间兴起，双非学生可以关注 V2EX、电鸭社区、实习僧等平台的远程岗位。实习期间最重要的不是做什么，而是学会如何用 STAR 法则把经历包装成故事。',
  },

  // ────────── 校招实战（关联 info / plan）──────────
  {
    id: 'k11',
    category: 'recruitment',
    skills: ['info', 'plan'],
    keywords: ['秋招', '春招', '校招', '招聘', '投递', '网申', '时间', '截止'],
    content:
      '校招时间线：秋招（7-11月）是最大规模招聘，金九银十，提前批7月就开始；春招（2-5月）是补录，岗位数量少但竞争也相对小。双非学生策略：秋招主攻，春招保底。建议：6月开始刷题 + 准备简历，7-8月投递提前批练手，9-10月正式投递核心目标，11月复盘并调整方向。春招时带着秋招的经验再战，上岸率更高。',
  },
  {
    id: 'k12',
    category: 'recruitment',
    skills: ['info', 'plan'],
    keywords: ['双非友好', '不卡学历', '中小厂', '低调', '潜力股', '独角兽'],
    content:
      '双非友好的企业类型：1）快速增长的独角兽/准独角兽（如 SHEIN、得物、小红书的部分岗位）；2）传统行业数字化转型企业（制造业/零售/物流的IT部门）；3）外包/驻场公司（如中软国际、软通动力、文思海辉）；4）二线城市本地企业（竞争相对小）；5）外企在华研发中心（更看重能力）。建议关注牛客网"双非上岸"板块和脉脉匿名区获取真实信息。',
  },
  {
    id: 'k13',
    category: 'recruitment',
    skills: ['info', 'plan'],
    keywords: ['竞赛', '比赛', 'ACM', '蓝桥杯', '挑战杯', '互联网+', 'iCAN', '数学建模'],
    content:
      '学科竞赛是双非学生重要的简历加分项。推荐竞赛（按含金量）：ACM-ICPC（硬通货，但门槛高）> 蓝桥杯（门槛适中，双非友好）> 中国大学生计算机设计大赛 > 挑战杯/互联网+（综合类，适合产品/运营方向）> 数学建模竞赛（适合数据方向）。至少拿一个省级以上奖项，简历上就有亮点了。注意：竞赛是锦上添花，不能替代项目和实习。',
  },

  // ────────── 简历/包装（关联 package）──────────
  {
    id: 'k14',
    category: 'resume_tips',
    skills: ['package'],
    keywords: ['简历', 'CV', '写简历', '修改', '优化', '模板', '排版'],
    content:
      '双非学生简历黄金法则：1）学校放在教育经历中，不要刻意隐藏但也不要过度强调；2）用"技术栈 + 量化成果 + 业务价值"三段式写项目经历；3）所有描述用 STAR 法则 + 量化数据（如"将页面加载从 3s 优化到 0.8s，用户留存提升 15%"）；4）技能栏按熟练度排序，不要写"了解"；5）控制在一页 A4 内，PDF 格式投递；6）针对不同公司定制简历（JD 关键词匹配）。',
  },
  {
    id: 'k15',
    category: 'interview_prep',
    skills: ['practice', 'package'],
    keywords: ['面试', '模拟', '自我介绍', 'HR', '技术面', '群面', '怎么面', '准备'],
    content:
      '双非学生面试策略：1）自我介绍用"我是谁 + 我能做什么（技术/项目亮点）+ 我为什么适合这个岗位"三段式，控制在1分钟内；2）项目介绍用 STAR 法则（Situation-Task-Action-Result），重点突出你的个人贡献而非团队成果；3）针对"你的学校"类问题，回答思路：承认 → 转化（强调自学能力和项目成果）→ 展示（用实力说话）；4）反问环节不要问薪资福利，问技术栈、团队规模、新人培养机制，体现成长型思维。',
  },
  {
    id: 'k16',
    category: 'interview_prep',
    skills: ['practice', 'package'],
    keywords: ['群面', '无领导', '小组', '辩论', '案例', '讨论'],
    content:
      '群面（无领导小组讨论）技巧：1）不要抢 Leader 角色，做"推进者"（总结观点 + 推动议程）或"计时者"（控制时间）更稳；2）发言要有框架（如"我从三个方面分析..."），不要散点式发言；3）遇到强势组员时不硬刚，先说"我同意你的部分观点"，再补充自己视角；4）记录他人发言并做阶段性总结，展现倾听和整合能力；5）双非学生在群面中的优势：通常更接地气、更有韧性，这是加分项。',
  },

  // ────────── 行业洞察（关联 info）──────────
  {
    id: 'k17',
    category: 'industry_insight',
    skills: ['info', 'diagnose'],
    keywords: ['AI', '人工智能', 'ChatGPT', '大模型', '机器学习', '深度学习', 'CV', 'NLP'],
    content:
      'AI/大模型方向对双非学生的机会：传统 AI 岗（CV/NLP/推荐）对论文要求高，双非入场难。但大模型时代新岗位包括 Prompt 工程师、AI 应用开发、AI 产品经理等，更看重工程落地能力而非论文。建议：掌握 LangChain/LlamaIndex 等框架 + 动手搭建 RAG 应用 + 在 GitHub 上开源。关注 AI Native 创业公司（如 Minimax、月之暗面、智谱 AI），它们比大厂更开放。',
  },
  {
    id: 'k18',
    category: 'industry_insight',
    skills: ['info', 'diagnose'],
    keywords: ['二线', '城市', '成都', '武汉', '西安', '南京', '杭州', '苏州', '长沙', '合肥'],
    content:
      '新一线/二线城市就业优势：成都（游戏/互联网，生活成本低）、武汉（光谷科技企业密集，985/211学生多但双非机会也不少）、西安（军工/IT外包，稳定但薪资偏低）、南京（软件外包+部分互联网分部）、杭州（电商+互联网，但竞争也很激烈）、苏州（制造业数字化转型岗位多）。建议：如果一线城市进不去，先在新一线积累 1-2 年经验再跳槽，路径更平滑。',
  },
  {
    id: 'k19',
    category: 'industry_insight',
    skills: ['info'],
    keywords: ['外包', '驻场', '银行', '保险', '运营商', '传统企业', '非互联网'],
    content:
      '非互联网行业数字化岗位是双非学生的蓝海：银行科技子公司（如建信金科、工银科技）、保险公司 IT 部门、三大运营商省公司、制造业数字化转型部门。这些岗位薪资虽不如互联网但稳定性高、工作强度合理、学历歧视较轻。特别适合追求 Work-Life Balance 或打算在职考研/考公的学生。注意：银行类需要提前准备行测，运营商偏好本地生源。',
  },
  {
    id: 'k20',
    category: 'industry_insight',
    skills: ['info'],
    keywords: ['远程', '远程工作', 'freelance', '自由职业', '数字游民', '居家', 'wfh'],
    content:
      '远程工作是双非学生绕过地域限制的一条新路径。关注平台：电鸭社区、V2EX 招聘版、RemoteOK、Upwork（国际接单）。适合远程的方向：前端/全栈开发、UI/UX设计、技术写作、测试。注意：远程工作对自律要求极高，新人建议先从混合办公（部分远程部分坐班）过渡，积累信任后再全职远程。',
  },
];

/**
 * 基于用户输入做关键词匹配搜索 L3 知识库。
 * @param query 用户输入文本或 Skill 描述
 * @param skill 当前 Skill 名称（用于过滤相关条目）
 * @param topK 返回条数，默认 3
 * @returns 匹配到的知识内容数组
 */
export function searchL3Knowledge(query: string, skill: string, topK = 3): string[] {
  if (!query?.trim()) return [];

  const lower = query.toLowerCase();

  const scored = KNOWLEDGE_BASE.map((item) => {
    // Skill 相关性：关联当前 skill 的条目加权
    const skillMatch = item.skills.includes(skill) ? 2 : 0;

    // 关键词命中得分
    let keywordScore = 0;
    for (const kw of item.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // 精确匹配得分更高
        keywordScore += kw.length >= 4 ? 2 : 1;
      }
    }

    // 内容匹配作为兜底
    let contentScore = 0;
    const contentLower = item.content.toLowerCase();
    for (const kw of item.keywords) {
      if (contentLower.includes(kw.toLowerCase())) {
        contentScore += 0.3;
      }
    }

    const total = skillMatch + keywordScore + Math.min(contentScore, 1);
    return { item, score: total };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (!scored.length) {
    // 未命中时返回当前 Skill 的通用知识
    const fallback = KNOWLEDGE_BASE.filter((item) => item.skills.includes(skill)).slice(0, 1);
    if (fallback.length) return fallback.map((f) => f.content);
    return [];
  }

  return scored.map((s) => s.item.content);
}

/**
 * 获取某个分类下的所有知识条目（用于 Skill 页面展示知识卡片）。
 */
export function getL3ByCategory(category: L3KnowledgeItem['category']): L3KnowledgeItem[] {
  return KNOWLEDGE_BASE.filter((item) => item.category === category);
}

/**
 * 生成 L3 知识注入 prompt（复用现有 withMemory 风格）。
 */
export function formatL3ForPrompt(items: string[]): string {
  if (!items.length) return '';
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n\n');
}
