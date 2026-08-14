/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ai-career-companion/types', '@ai-career-companion/llm'],
  // 跳过构建期 ESLint：项目 eslint-config-next 与 @typescript-eslint 版本错配会触发
  // "Error while loading rule" 崩溃，可能让部署构建失败；类型检查（tsc）仍保留。
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
