/**
 * 全局轻反馈系统 — Toast / 操作提示 / 页面错误兜底。
 *
 * 用途：
 * 1. 对同一页面重复点击、无跳转等必要操作给出即时反馈。
 * 2. 网络/API 错误、未接入功能给出非阻断提示。
 * 3. 与 ErrorState 区分：ErrorState 用于局部失败重试，feedback 用于全局瞬态提示。
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type Listener = (messages: ToastMessage[]) => void;

let messages: ToastMessage[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l([...messages]));
}

function uid() {
  return `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener([...messages]);
  return () => listeners.delete(listener);
}

export function showToast(message: string, type: ToastType = 'info', duration = 2500) {
  const item: ToastMessage = { id: uid(), message, type, duration };
  messages = [...messages, item];
  notify();
  if (duration > 0) {
    setTimeout(() => removeToast(item.id), duration);
  }
}

export function removeToast(id: string) {
  messages = messages.filter((m) => m.id !== id);
  notify();
}

/** 当前已在某页面时点击该页面入口，给出友好提示。 */
export function notifyAlreadyHere(pageName: string) {
  showToast(`你已经在「${pageName}」页面了`, 'info', 1800);
}

/** 功能尚未接入时的统一提示。 */
export function notifyComingSoon(featureName: string) {
  showToast(`「${featureName}」功能即将上线，敬请期待`, 'warning', 2200);
}
