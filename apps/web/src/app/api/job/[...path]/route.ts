import { type NextRequest, NextResponse } from 'next/server';
import { getJobsFeed } from '@/lib/hub-store';
import { deriveFriendlyLevel } from '@ai-career-companion/types';

/**
 * 岗位详情数据源：信息中枢证据库（Supabase hub_jobs → 内置种子）。
 *
 * 与 2026-09-25 的证据链改造保持一致：
 * - 不再读取 jobs-data.json 的匿名占位岗位（「某电商独角兽」等无法核对）；
 * - 不再下发任何「是否双非友好」的布尔字段，标签一律由 deriveFriendlyLevel() 计算；
 * - 未收录时返回明确的「未收录」卡片，而不是编造岗位信息。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const keyword = path?.[0] ? safeDecodeURIComponent(path[0]) : '';

  if (!keyword) {
    return NextResponse.json({ error: '公司名不能为空' }, { status: 400 });
  }

  const feed = await getJobsFeed();
  const job =
    feed.items.find((j) => j.id === keyword) ??
    feed.items.find((j) => j.company === keyword) ??
    feed.items.find((j) => j.company.includes(keyword) || keyword.includes(j.company));

  if (!job) {
    // 未收录时返回带搜索链接的通用卡片，而不是编造岗位信息
    return NextResponse.json({
      id: 'not-found',
      company: keyword,
      role: '岗位详情',
      salary: '面议',
      location: '详见招聘平台',
      industry: '未知',
      degree: '未知',
      tags: ['未收录'],
      url: `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}`,
      description: `${keyword} 暂未被信息中枢收录。信息中枢只收录能核对原文证据的岗位，你可以到「信息中枢 → 联网检索」或「贡献与审核」补充来源。`,
      requirements: ['请前往官方页面查看具体岗位要求'],
      deadline: '以官方公布为准',
      evidence: [],
      friendlyLevel: 'unverified',
    });
  }

  return NextResponse.json({
    ...job,
    evidence: job.evidence ?? [],
    friendlyLevel: deriveFriendlyLevel(job.evidence ?? []),
  });
}

// 安全 URI 解码：畸形字符串（如 % 后无合法序列）直接原样返回，避免抛出导致接口崩溃
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
