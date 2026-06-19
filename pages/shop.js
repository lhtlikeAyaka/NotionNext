import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { LayoutBase } from '@/themes/nav'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

export default function Shop(props) {
  const { products = [] } = props
  const { isSignedIn, user } = useUser()
  const [userPoints, setUserPoints] = useState(0)
  const [loadingId, setLoadingId] = useState(null)

  // ⚡ 核心修复：兼容 score 和 points 字段，防止页面刷新黑屏/白屏
  useEffect(() => {
    if (isSignedIn && user && user.publicMetadata) {
      const metadata = user.publicMetadata
      // 智能优先读取 score，否则读取 points
      const currentPoints = metadata.score !== undefined ? metadata.score : (metadata.points !== undefined ? metadata.points : 0)
      setUserPoints(parseInt(currentPoints.toString() || '0', 10))
    }
  }, [isSignedIn, user])

  const handleRedeem = async (product) => {
    if (!isSignedIn) {
      alert('请先登录账号后再进行资源兑换！')
      return
    }
    if (userPoints < product.cost) {
      alert(`积分不足！当前只有 ${userPoints} 积分。`)
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
        setUserPoints(data.newPoints)
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

  return (
    <LayoutBase {...props}>
      <div className="w-full max-w-6xl mx-auto px-2 py-4">
        {/* 资产展示区 */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm mb-6 flex justify-between items-center border border-gray-100 dark:border-neutral-700">
          <div>
            <h1 className="text-xl font-bold">积分福利商店</h1>
            <p className="text-xs text-gray-400">使用您的积分兑换资源</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 px-5 py-2.5 rounded-xl text-right">
            <span className="text-xs text-blue-600 block">我的可用资产</span>
            <span className="text-2xl font-black text-blue-600">{isSignedIn ? userPoints : '0'} <span className="text-xs">分</span></span>
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
