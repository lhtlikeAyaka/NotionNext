import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export default function UnlockButton({ post }) {
  const { isLoaded, isSignedIn, user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [realLink, setRealLink] = useState('')

  const cost = post?.cost ? Number(post.cost) : 0
  const encryptedLink = post?.encryptedLink || ''
  const postId = post?.id

  // 判定是否渲染（普通文章不渲染）
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
      alert('请先在顶部导航栏登录账号！')
      return
    }
    if (!confirm(`确定要消耗 ${cost} 积分获取此隐藏资源吗？`)) return
    
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
    return <div className="my-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-gray-500 animate-pulse">正在验证资源权限...</div>
  }

  if (isUnlocked && realLink) {
    return (
      <div className="my-8 p-6 border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-xl transition-all">
        <h3 className="font-bold text-green-700 dark:text-green-400 mb-3">✅ 资源已解锁</h3>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border font-mono text-sm break-all select-all shadow-inner">
          {realLink}
        </div>
      </div>
    )
  }

  return (
    <div className="my-8 p-8 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-sm text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">此资源需消耗积分解锁</h3>
      <p className="text-sm text-gray-500 mt-2 mb-6">包含专属补丁或整合工具，请支付积分后查看提取码</p>
      
      <button 
        onClick={handleUnlock}
        disabled={loading}
        className="w-full max-w-sm mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md disabled:opacity-50"
      >
        {loading ? '正在处理...' : `💎 支付 ${cost} 积分解锁`}
      </button>
      
      {isSignedIn && (
        <p className="mt-4 text-xs text-gray-400">
          当前账户余额: {user?.publicMetadata?.score || 0} 积分
        </p>
      )}
    </div>
  )
}
