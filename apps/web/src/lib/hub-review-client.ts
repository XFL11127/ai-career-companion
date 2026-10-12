'use client';

/**
 * 审核动作客户端（前端共用）
 *
 * 策略：
 * - 已登录的教师/管理员 → 走 BFF（/api/hub/contributions PATCH），服务端以会话判定权限；
 * - 401 / 403 属于权限问题，**不回退**，直接告诉用户去登录对应账号；
 * - 503 / 网络故障属于基础设施问题，回退到本机草稿队列（保持免登即用）。
 */

import { reviewContribution, type InfoItem, type ReviewOptions } from '@/lib/infobase';

export type ReviewTarget = InfoItem['status'];

export interface ReviewRequest {
  id: string;
  status: ReviewTarget;
  credibility?: 'A' | 'B' | 'C';
  ownerId?: string;
  reviewNote?: string;
  /** 本机回退时使用的审核人显示名 */
  localReviewer?: string;
}

export interface ReviewResult {
  ok: boolean;
  via: 'cloud' | 'local' | 'none';
  points?: number;
  error?: string;
}

const CLOUD_STATUS: Record<ReviewTarget, string> = {
  pending: 'pending',
  needs_info: 'needs_info',
  published: 'approved',
  rejected: 'rejected',
};

export async function submitReview(request: ReviewRequest): Promise<ReviewResult> {
  let permissionError = '';

  try {
    const res = await fetch('/api/hub/contributions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: request.id,
        status: CLOUD_STATUS[request.status],
        credibility: request.credibility,
        ownerId: request.ownerId,
        reviewNote: request.reviewNote,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { data?: { points?: number } };
      return { ok: true, via: 'cloud', points: data.data?.points ?? 0 };
    }

    if (res.status === 401 || res.status === 403) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      permissionError = data.error ?? '当前账号没有审核权限';
      return { ok: false, via: 'cloud', error: permissionError };
    }
    // 其余（400/503/5xx）继续尝试本机回退；400 的校验信息如果来自服务端会更有价值，
    // 因此把服务端文案带出来作为参考。
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    permissionError = data.error ?? '';
  } catch {
    /* 网络故障 → 本机回退 */
  }

  const localOptions: ReviewOptions = {
    credibility: request.credibility,
    reviewer: request.localReviewer,
    ownerId: request.ownerId,
    reviewNote: request.reviewNote,
  };
  const outcome = reviewContribution(request.id, request.status, localOptions);
  if (outcome.ok) {
    return { ok: true, via: 'local', points: outcome.item?.points ?? 0 };
  }
  return {
    ok: false,
    via: 'none',
    error: permissionError || outcome.error || '审核失败',
  };
}
