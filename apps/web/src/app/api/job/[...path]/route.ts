import { type NextRequest, NextResponse } from 'next/server';
import jobsData from '@/lib/jobs-data.json';

/**
 * 岗位详情数据源：src/lib/jobs-data.json
 *
 * 说明：
 * - 取代原先硬编码在路由里的 MOCK_JOBS（"某双非友好科技公司"等占位数据）。
 * - 数据带 industry / city / firstDegreeFriendly 等筛选字段，供后续 /jobs 三栏页使用。
 * - 投递链接指向招聘平台搜索页，非伪造的具体岗位链接；技能要求基于行业真实行情整理。
 */

type Job = {
  id: string;
  company: string;
  role: string;
  salary: string;
  location: string;
  industry: string;
  degree: string;
  firstDegreeFriendly: boolean;
  tags: string[];
  url: string;
  description: string;
  requirements: string[];
  deadline: string;
};

const JOBS = jobsData.jobs as Job[];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Next 15：params 为异步 Promise，需 await 后取出
  const { path } = await params;

  // path[0] 是公司名或岗位 id（可能经过 URL 编码），安全解码避免畸形输入导致崩溃
  const keyword = path?.[0] ? safeDecodeURIComponent(path[0]) : '';

  if (!keyword) {
    return NextResponse.json({ error: '公司名不能为空' }, { status: 400 });
  }

  // 1) 按 id 精确匹配
  let job = JOBS.find((j) => j.id === keyword);
  // 2) 按公司名精确匹配
  if (!job) job = JOBS.find((j) => j.company === keyword);
  // 3) 模糊匹配（双向包含）
  if (!job) {
    job = JOBS.find((j) => j.company.includes(keyword) || keyword.includes(j.company));
  }

  // 4) 兜底：未收录时返回带搜索链接的通用卡片，而不是编造岗位信息
  if (!job) {
    return NextResponse.json({
      id: 'not-found',
      company: keyword,
      role: '岗位详情',
      salary: '面议',
      location: '详见招聘平台',
      industry: '未知',
      degree: '未知',
      firstDegreeFriendly: false,
      tags: ['未收录'],
      url: `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}`,
      description: `${keyword} 的岗位暂未收录进我们的岗位库。可以点击下方链接前往招聘平台搜索该企业的最新岗位。`,
      requirements: ['请前往招聘平台查看具体岗位要求'],
      deadline: '以招聘平台公布为准',
    });
  }

  return NextResponse.json(job);
}

// 安全 URI 解码：畸形字符串（如 % 后无合法序列）直接原样返回，避免抛出导致接口崩溃
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
