import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export default function UnlockButton({ post }) {
  const { isLoaded, isSignedIn, user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [realLink, setRealLink] = useState('')

  // 兼容 Notion 映射过来的自定义属性字段
  const cost = post?.properties?.Cost || post?.cost || 0
  const encryptedLink = post?.encryptedLink || ''
  const postId = post?.id

  // 如果没有设置所需积分或没有加密链接，则不渲染此模块
  if (!cost || cost <= 0 || !encryptedLink) return null

  useEffect(() => {
    if (user?.publicMetadata?.unlockedArticles?.includes(postId)) {
      setIsUnlocked(true)
      fetchDecryptedLink()
    }
  }, [user, postId])

  const fetchDecryptedLink = async () => {
    try {
      const res = await fetch('/api/unlock-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, cost, encryptedLink, action: 'decrypt_only' })
      })
      const data = await res.json()
      if (res.ok) setRealLink(data.realLink)
    } catch (e) {
      console.error("获取真实链接失败")
    }
  }

  const handleUnlock = async () => {
    if (!isSignedIn) {
      alert('请先在页眉登录您的账户！')
      return
    }
    if (!confirm(`确定要消耗 ${cost} 积分类解锁此隐藏资源吗？`)) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/unlock-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, cost, encryptedLink, action: 'buy' })
      })
      const data = await res.json()
      
      if (res.ok) {
        setIsUnlocked(true)
        setRealLink(data.realLink)
        if (user?.reload) await user.reload() 
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return <div className="my-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-center text-xs text-zinc-500 animate-pulse">正在验证资源授权...</div>
  }

  if (isUnlocked && realLink) {
    return (
      <div className="my-6 p-5 border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl transition-all">
        <h3 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mb-2">✅ 资源已成功解锁</h3>
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border font-mono text-xs break-all select-all shadow-inner text-zinc-700 dark:text-zinc-300">
          {realLink}
        </div>
      </div>
    )
  }

  return (
    <div className="my-6 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-center shadow-sm">
      <div className="text-3xl mb-2">🔒</div>
      <h3 className="text-md font-bold text-zinc-800 dark:text-zinc-200">此模块核心资源已加密</h3>
      <p className="text-xs text-zinc-500 mt-1 mb-4">包含特殊优化补丁或打包工具，支付积分后即可提取</p>
      
      <button 
        onClick={handleUnlock}
        disabled={loading}
        className="w-full max-w-xs mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-all disabled:opacity-50"
      >
        {loading ? '正在处理交易...' : `💎 消耗 ${cost} 积废解锁`}
      </button>
      
      {isSignedIn && (
        <p className="mt-3 text-[11px] text-zinc-400">
          当前剩余额度: {user?.publicMetadata?.score || 0} 积分
        </p>
      )}
    </div>
  )
}
