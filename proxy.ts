import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

// 精准匹配需要登录的核心资源与仪表盘路由
const isTenantRoute = createRouteMatcher([
  '/user/organization-selector(.*)',
  '/user/orgid/(.*)',
  '/dashboard',
  '/dashboard/(.*)',
  '/premium(.*)',           // 规则1：拦截所有以 /premium 开头的路由
  '/(.*)premium(.*)'        // 规则2：拦截任意自定义链接 slug 中包含 premium 关键字的页面
])

// 限制权限访问的管理员路由
const isTenantAdminRoute = createRouteMatcher([
  '/admin/(.*)/memberships',
  '/admin/(.*)/domain'
])

/**
 * 未配置权限功能时的降级重定向处理
 */
const noAuthMiddleware = async (req: NextRequest) => {
  if (BLOG['UUID_REDIRECT']) {
    let redirectJson: Record<string, string> = {}
    try {
      const response = await fetch(`${req.nextUrl.origin}/redirect.json`)
      if (response.ok) {
        redirectJson = (await response.json()) as Record<string, string>
      }
    } catch (err) {
      console.error('Error fetching static file:', err)
    }
    let lastPart = getLastPartOfUrl(req.nextUrl.pathname) as string
    if (checkStrIsNotionId(lastPart)) {
      lastPart = idToUuid(lastPart)
    }
    if (lastPart && redirectJson[lastPart]) {
      const redirectToUrl = req.nextUrl.clone()
      redirectToUrl.pathname = '/' + redirectJson[lastPart]
      return NextResponse.redirect(redirectToUrl, 308)
    }
  }
  return NextResponse.next()
}

/**
 * 符合最新规范的异步鉴权中间件
 */
export default clerkMiddleware(async (auth, req) => {
  // 如果未配置 Clerk 密钥，自动降级到基础路由处理逻辑
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return noAuthMiddleware(req)
  }

  // 命中核心资源或后台时，使用符合新规的异步 auth().protect() 强制拦截
  if (isTenantRoute(req)) {
    await auth().protect()
  }

  // 处理管理员相关权限保护
  if (isTenantAdminRoute(req)) {
    const authObj = await auth()
    authObj.protect(has => {
      return (
        has({ permission: 'org:sys_memberships:manage' }) ||
        has({ permission: 'org:sys_domains_manage' })
      )
    })
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // 严格排除静态资源，防止静态文件被错误拦截
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // 确保包含 Clerk 的自动代理路径
    '/__clerk/:path*',
    // 始终为 API 路由和 TRPC 路由运行中间件
    '/(api|trpc)(.*)',
  ],
}
