/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ai-career-companion/types', '@ai-career-companion/llm'],
  eslint: {
    // monorepo 中根目录 eslint(@10) 与 eslint-config-next(需 @8) 版本冲突，
    // 构建时跳过 lint，避免阻断部署（代码质量由本地 lint 守护）
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
