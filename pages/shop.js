import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

export default function ScoreShopPage(props) {
  const { isLoaded, isSignedIn, user } = useUser()
  const [loading, setLoading] = useState(false)
  const [redeemedCode, setRedeemedCode] = useState(null)
  
  // 状态锁与邀请相关状态
  const [mounted, setMounted] = useState(false)
  const [pendingInviteCode, setPendingInviteCode] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const siteInfo = props?.siteInfo
  const siteTitle = siteInfo?.title || '积分商店'
  const siteIcon = siteInfo?.icon

  // 核心生命周期：挂载锁并解析 URL 邀请码
  useEffect(() => {
    setMounted(true) // 确保组件已在客户端就绪，防止水合报错
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const ref = urlParams.get('ref')
      if (ref) {
        localStorage.setItem('pending_invite_code', ref)
        setPendingInviteCode(ref)
      } else {
        const savedRef = localStorage.getItem('pending_invite_code')
        if (savedRef) setPendingInviteCode(savedRef)
      }
    }
  }, [])

  // 1. 激活邀请奖励
  const handleActivateReferral = async () => {
    if (!pendingInviteCode || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviterId: pendingInviteCode })
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        localStorage.removeItem('pending_invite_code')
        setPendingInviteCode(null)
        if (user?.reload) await user.reload()
      } else {
        alert(data.error || '激活失败')
      }
    } catch (err) {
      alert('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  // 2. 复制专属邀请链接
  const handleCopyInviteLink = () => {
    if (!user?.id) return
    const inviteLink = `${window.location.origin}${window.location.pathname}?ref=${user.id}`
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }).catch(() => {
      alert(`复制失败，您的专属邀请链接为：\n${inviteLink}\n请手动长按复制。`)
    })
  }

  // 3. 每日签到
  const handleCheckIn = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/check-in', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { 
        alert(data.message)
        if (user?.reload) await user.reload()
      } else { 
        alert(data.error) 
      }
    } catch (err) { 
      alert('网络错误') 
    } finally { 
      setLoading(false) 
    }
  }

  // 4. 积分兑换
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
        alert(data.error) 
      }
    } catch (err) { 
      alert('网络错误') 
    } finally { 
      setLoading(false) 
    }
  }

  // 未挂载前返回静默容器，阻止 Next.js 服务端/客户端结构冲突导致的隐形
  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-zinc-900" />
  }

  const currentScore = user?.publicMetadata?.score || 0
  const hasBeenReferred = user?.publicMetadata?.referredBy

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      
      {/* 顶栏 */}
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
          <a href="/" className="text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400">
            ← 返回首页
          </a>
        </div>
      </header>

      {/* 主框架 */}
      <main className="mx-auto max-w-md px-4 py-8 space-y-6">
        {!isLoaded ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">正在同步账号数据...</p>
          </div>
        ) : !isSignedIn ? (
          /* 未登录状态卡片 */
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-zinc-700 dark:text-blue-400">🔒</div>
            <h2 className="text-xl font-bold">请先登录账号</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              {pendingInviteCode ? '检测到好友邀请！登录后即可激活领取新用户专享 30 积分。' : '登录后即可同步您的专属积分，参与每日签到与福利兑换。'}
            </p>
            <a href="/" className="mt-6 inline-block w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white shadow-md hover:bg-blue-700 text-center">
              去首页登录/注册
            </a>
          </div>
        ) : (
          /* 已登录核心面板 */
          <div className="space-y-6">
            
            {/* 收到邀请提示 */}
            {pendingInviteCode && !hasBeenReferred && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20 dark:border-amber-900/50 animate-pulse">
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">🎁 收到好友的特殊邀请</h3>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">点击下方按钮激活，你可得 30 积分，好友可得 50 积分！</p>
                <button
                  onClick={handleActivateReferral}
                  disabled={loading}
                  className="mt-3 w-full rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition-all shadow-sm"
                >
                  {loading ? '正在激活...' : '立即激活，领取双方奖励'}
                </button>
              </div>
            )}

            {/* 积分主卡片 */}
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

            {/* 裂变组件 */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
              <h3 className="font-bold text-sm text-gray-800 dark:text-zinc-200">✨ 邀请新老友，双向送福利</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">分享你的专属链接，新用户注册并激活后，**你得 50 积分，对方得 30 积分**！奖励无上限！</p>
              <button
                onClick={handleCopyInviteLink}
                className={`mt-4 w-full rounded-xl px-4 py-3 text-center text-sm font-bold transition-all border ${
                  copySuccess 
                    ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400' 
                    : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {copySuccess ? '✅ 专属邀请链接已复制！快发给好友吧' : '🔗 一键复制我的专属邀请链接'}
              </button>
            </div>

            {/* 凭证提示 */}
            {redeemedCode && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:bg-green-950/30 dark:border-green-900/50">
                <p className="text-xs font-bold text-green-800 dark:text-green-400">恭喜！凭证已成功发放：</p>
                <div className="mt-2 rounded-lg bg-white p-3 font-mono text-xs border break-all select-all dark:bg-zinc-950 dark:border-zinc-800 text-gray-800 dark:text-zinc-200">
                  {redeemedCode}
                </div>
              </div>
            )}

            {/* 商品区域 */}
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">福利兑换专区</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                  <div>
                    <h3 className="font-bold text-base">绝区零工具箱</h3>
                    <p className="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">30 积分</p>
                  </div>
                  <button onClick={() => handleRedeem('item_01', '绝区零工具箱')} disabled={loading} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-blue-600 hover:text-white dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-blue-600 transition-all disabled:opacity-50">兑换</button>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                  <div>
                    <h3 className="font-bold text-base">鸣潮画质包</h3>
                    <p className="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">50 积分</p>
                  </div>
                  <button onClick={() => handleRedeem('item_02', '鸣潮画质包')} disabled={loading} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-blue-600 hover:text-white dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-blue-600 transition-all disabled:opacity-50">兑换</button>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      <footer className="mt-20 border-t py-6 text-center text-xs text-gray-400 dark:border-zinc-800 dark:text-zinc-500">
        © {new Date().getFullYear()} {siteTitle}. All rights reserved.
      </footer>
    </div>
  )
}

export async function getStaticProps(req) {
  const { locale } = req
  const from = 'shop-page'
  const props = await fetchGlobalAllData({ from, locale })
  
  // 🛡️ 核心修复：严禁在刷新时删除 allPages，确保全局布局和导航成功渲染
  return {
    props,
    revalidate: process.env.EXPORT ? undefined : siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND, props?.NOTION_CONFIG)
  }
}
