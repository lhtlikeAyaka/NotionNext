import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { LayoutBase } from '@/themes/nav'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

export default function Shop(props) {
  const { products = [] } = props
  const { isSignedIn, user } = useUser()
  const [userScore, setUserScore] = useState(0)
  const [loadingId, setLoadingId] = useState(null)
  
  // 邀请系统相关状态
  const [myCode, setMyCode] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [submittingCode, setSubmittingCode] = useState(false)

  // 1. 核心修复：精准读取 score，并在无短码时前端悄悄初始化 6 位短码
  useEffect(() => {
    if (isSignedIn && user && user.publicMetadata) {
      const metadata = user.publicMetadata
      
      // 读取资产
      const currentScore = metadata.score !== undefined ? metadata.score : 0
      setUserScore(parseInt(currentScore.toString() || '0', 10))

      // 智能检查/下发 6 位短邀请码
      const existingCode = metadata.myInviteCode
      if (!existingCode) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setMyCode(code)
        
        // 悄悄同步回 Clerk 数据库
        user.update({
          publicMetadata: {
            ...user.publicMetadata,
            myInviteCode: code
          }
        }).then(() => console.log('商店初始化专属短码成功:', code))
      } else {
        setMyCode(existingCode)
      }
    }
  }, [isSignedIn, user])

  // 是否已经填写过邀请码（用于动态控制“补填”按钮显示）
  const hasReferred = !!user?.publicMetadata?.referredBy

  // 处理资源兑换扣分
  const handleRedeem = async (product) => {
    if (!isSignedIn) {
      alert('请先登录账号后再进行资源兑换！')
      return
    }
    if (userScore < product.cost) {
      alert(`积分不足！当前只有 ${userScore} 积分。`)
      return
    }
    if (!confirm(`确定要消耗 ${product.cost} 积分兑换【${product.name}】吗？`)) return

    setLoadingId(product.id)
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      })
      const data = await res.json()
      
      if (res.ok) {
        setUserScore(data.score)
        alert('🎉 兑换成功！')
        window.open(data.link, '_blank')
      } else {
        alert(data.error || '兑换失败')
      }
    } catch (err) {
      alert('网络异常，请重试')
    } finally {
      setLoadingId(null)
    }
  }

  // 复制专属短码
  const handleCopyCode = () => {
    if (!myCode) return
    navigator.clipboard.writeText(myCode)
    alert(`📋 你的专属邀请码【${myCode}】已复制！发给好友注册即可赚取 100 积分！`)
  }

  // 提交激活好友的邀请码
  const handleSubmitCode = async () => {
    if (inviteInput.trim().length !== 6) {
      alert('请输入标准的6位邀请码')
      return
    }
    setSubmittingCode(true)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteInput.trim().toUpperCase() })
      })
      const data = await res.json()
      if (res.ok) {
        alert(`🎉 ${data.message}`)
        setInviteInput('')
        setShowInviteModal(false)
        window.location.reload() // 强制重载元数据
      } else {
        alert(data.error || '激活失败')
      }
    } catch (err) {
      alert('网络异常，请重试')
    } finally {
      setSubmittingCode(false)
    }
  }

  return (
    <LayoutBase {...props}>
      <div className="w-full max-w-6xl mx-auto px-2 py-4">
        
        {/* 🌟 升级版资产展示区（整合裂变按钮） */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-gray-100 dark:border-neutral-700">
          <div>
            <h1 className="text-xl font-bold">积分福利商店</h1>
            <p className="text-xs text-gray-400">使用您的积分兑换资源</p>
            
            {/* 按钮群组：紧跟在商店标题下方 */}
            {isSignedIn && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button 
                  onClick={handleCopyCode}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-[11px] px-3 py-1.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm flex items-center gap-1"
                >
                  <i className="fas fa-share-alt"></i> 邀请赚积分 (我的码: {myCode || '...'})
                </button>
                
                {/* 动态显示：没填过则显示该按钮 */}
                {!hasReferred && (
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] px-3 py-1.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm flex items-center gap-1"
                  >
                    <i className="fas fa-key"></i> 填邀请码领 60 分
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/40 px-5 py-2.5 rounded-xl text-right w-full md:w-auto flex md:flex-col justify-between md:justify-center items-center md:items-end">
            <span className="text-xs text-blue-600 block">我的可用资产</span>
            <span className="text-2xl font-black text-blue-600">{isSignedIn ? userScore : '0'} <span className="text-xs">分</span></span>
          </div>
        </div>

        {/* 商品展示区 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <div key={product.id} className="bg-white dark:bg-neutral-800 rounded-2xl border p-4 shadow-sm flex flex-col gap-3">
              <div className="aspect-[16/10] bg-gray-100 dark:bg-neutral-900 rounded-lg overflow-hidden">
                {product.cover && <img src={product.cover} className="w-full h-full object-cover" />}
              </div>
              <h3 className="font-bold text-sm line-clamp-2 h-10">{product.name}</h3>
              <button 
                onClick={() => handleRedeem(product)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
              >
                {loadingId === product.id ? '处理中...' : `${product.cost} 积分兑换`}
              </button>
            </div>
          ))}
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-20 text-gray-400">货架暂无资源...</div>
        )}
      </div>

      {/* 🌟 专属：填写邀请码的移动端友好轻量级弹窗 */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-neutral-700 text-center relative">
            <button 
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
            
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 mb-3">
              <i className="fas fa-gift text-xl"></i>
            </div>
            
            <h3 className="text-md font-bold dark:text-white">激活引路人奖励</h3>
            <p className="text-xs text-gray-400 mt-1 px-2">输入好友的 6 位短邀请码，您将立即获得由系统发放的 <b className="text-amber-500">60 积分</b> 迎新礼！</p>
            
            <input
              type="text"
              placeholder="请输入6位有效邀请码"
              maxLength={6}
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="mt-4 w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 text-sm font-black text-center uppercase tracking-widest px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white"
            />
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={submittingCode}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/10"
              >
                {submittingCode ? '正在绑定..' : '立即激活'}
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutBase>
  )
}

export async function getStaticProps(ctx) {
  const { locale } = ctx
  const globalData = await fetchGlobalAllData({ from: 'shop', locale })
  
  let products = []
  const databaseId = process.env.NOTION_SHOP_DB_ID
  const token = process.env.NOTION_SECRET 
  
  if (databaseId && token) {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        products = data.results.map(row => {
          const p = row.properties
          return { 
            id: row.id, 
            name: p.Name?.title[0]?.plain_text || p.名称?.title[0]?.plain_text || '未命名',
            cost: p.Cost?.number || p.积分?.number || 0,
            cover: p.Cover?.files[0]?.file?.url || p.图片?.files[0]?.file?.url || '',
            status: p.Status?.select?.name || p.状态?.select?.name || '已上架'
          }
        }).filter(p => p.status === '已上架')
      }
    } catch (e) { console.error(e) }
  }

  return {
    props: { products, ...globalData },
    revalidate: 60
  }
}
