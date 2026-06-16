import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

export default function ScoreShopPage(props) {
  const { isLoaded, isSignedIn, user } = useUser()
  const [loading, setLoading] = useState(false)
  const [redeemedCode, setRedeemedCode] = useState(null)

  // 从 props 中提取网站真实的 Logo、标题等全局配置
  const siteInfo = props?.siteInfo
  const siteTitle = siteInfo?.title || '积分商店'
  const siteIcon = siteInfo?.icon

  // 1. 每日签到逻辑
  const handleCheckIn = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/check-in', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        window.location.reload()
      } else {
        alert(data.error || '签到失败')
      }
    } catch (err) {
      alert('网络请求请求错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  // 2. 积分兑换逻辑
  const handleRedeem = async (itemId, itemName) => {
    if (loading) return
    if (!confirm(`确定要消耗积分兑换【${itemName}】吗？`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      })
      const data = await res.json()
      if (res.ok) {
        setRedeemedCode(`🎉 兑换成功！卡密/链接为：${data.code}`)
        if (user?.reload) await user.reload()
      } else {
        alert(data.error || '兑换失败')
      }
    } catch (err) {
      alert('网络请求错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  // 获取当前用户的积分余额
  const currentScore = user?.publicMetadata?.score || 0

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      
      {/* 🛠️ 原生感动态页头：自动同步你的网站 Logo 和标题 */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 font-bold hover:opacity-80">
            {siteIcon && siteIcon.startsWith('http') ? (
              <img src={siteIcon} alt={siteTitle} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="text-xl">{siteIcon || '💎'}</span>
            )}
            <span className="text-base tracking-wide">{siteTitle}</span>
          </a>
          <a href="/" className="text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            ← 返回首页
          </a>
        </div>
      </header>

      {/* 📱 手机端深度优化的主内容区 */}
      <main className="mx-auto max-w-md px-4 py-8">
        {!isLoaded ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">正在同步账号数据...</p>
          </div>
        ) : !isSignedIn ? (
          /* 未登录状态卡片 */
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-zinc-700 dark:text-blue-400">
              🔒
            </div>
            <h2 className="text-xl font-bold">请先登录账号</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">登录后即可同步您的专属积分，参与每日签到与福利兑换。</p>
            <a href="/" className="mt-6 inline-block w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white shadow-md hover:bg-blue-700 transition-colors">
              去首页登录
            </a>
          </div>
        ) : (
          /* 已登录：核心功能面板 */
          <div className="space-y-6">
            
            {/* 💎 积分资产卡片 */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
              <div className="absolute -right-6 -bottom-6 text-9xl opacity-10 pointer-events-none">🪙</div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-75">当前可用积分</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tight">{currentScore}</span>
                <span className="text-sm opacity-80">Points</span>
              </div>
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-blue-600 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? '正在处理...' : '⚡ 每日签到 +10 积分'}
              </button>
            </div>

            {/* 🎁 领券/兑换成功凭证提示 */}
            {redeemedCode && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:bg-green-950/30 dark:border-green-900/50">
                <p className="text-xs font-bold text-green-800 dark:text-green-400">恭喜！凭证已成功发放：</p>
                <div className="mt-2 rounded-lg bg-white p-3 font-mono text-xs border break-all select-all dark:bg-zinc-950 dark:border-zinc-800 text-gray-800 dark:text-zinc-200">
                  {redeemedCode}
                </div>
                <p className="mt-1 text-[10px] text-green-600/80 dark:text-green-400/60">提示：长按上方文本框可全选复制卡密/下载链接。</p>
              </div>
            )}

            {/* 🛒 商品兑换列表区 */}
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">福利兑换专区</h2>
              <div className="space-y-3">
                
                {/* 商品 1 */}
                <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                  <div>
                    <h3 className="font-bold text-base">绝区零工具箱</h3>
                    <p className="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">10 积分</p>
                  </div>
                  <button
                    onClick={() => handleRedeem('item_01', '绝区零工具箱')}
                    disabled={loading}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-blue-600 hover:text-white dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-blue-600 dark:hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    兑换
                  </button>
                </div>

                {/* 商品 2 */}
                <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                  <div>
                    <h3 className="font-bold text-base">鸣潮画质包</h3>
                    <p className="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">10 积分</p>
                  </div>
                  <button
                    onClick={() => handleRedeem('item_02', '鸣潮画质包')}
                    disabled={loading}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-blue-600 hover:text-white dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-blue-600 dark:hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    兑换
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}
      </main>

      {/* 📄 页脚 */}
      <footer className="mt-20 border-t py-6 text-center text-xs text-gray-400 dark:border-zinc-800 dark:text-zinc-500">
        © {new Date().getFullYear()} {siteTitle}. All rights reserved.
      </footer>
    </div>
  )
}

// 🛠️ 严格对齐 index.js 的标准 SSG 数据流，解决 Vercel 编译报错问题
export async function getStaticProps(req) {
  const { locale } = req
  const from = 'shop-page'
  
  // 使用你项目中真实存在的 API 抓取全局站点配置
  const props = await fetchGlobalAllData({ from, locale })

  // 清理多余的大体积页面列表数据，优化打包体积与编译速度
  if (props && props.allPages) {
    delete props.allPages
  }

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props?.NOTION_CONFIG
        )
  }
}
