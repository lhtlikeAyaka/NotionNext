import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import LayoutBase from '@/themes/nav' // 强制绑定激活的 NAV 主题结构
import { getGlobalData } from '@/lib/db/SiteDataApi' // 完美对齐新版 SiteDataApi 抽象层

export default function Shop(props) {
  const { products } = props
  const { isSignedIn, user } = useUser()
  const [userPoints, setUserPoints] = useState(0)
  const [loadingId, setLoadingId] = useState(null)

  // 挂载时无缝同步 Clerk 云端用户独立积分
  useEffect(() => {
    if (isSignedIn && user) {
      setUserPoints(parseInt(user.publicMetadata?.points || '0', 10))
    }
  }, [isSignedIn, user])

  const handleRedeem = async (product) => {
    if (!isSignedIn) {
      alert('请先登录账号后再进行资源兑换！')
      return
    }
    if (userPoints < product.cost) {
      alert(`积分不足！兑换此资源需要 ${product.cost} 积分，你当前只有 ${userPoints} 积分。`)
      return
    }
    if (!confirm(`确定要消耗 ${product.cost} 积分兑换【${product.name}】吗？`)) {
      return
    }

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
        alert(`🎉 兑换成功！积分已成功扣除。\n点击[确定]前往资源下载页面。`)
        window.open(data.link, '_blank')
      } else {
        alert(data.error || '兑换响应异常')
      }
    } catch (err) {
      alert('前端请求通信中断，请检查手机网络')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <LayoutBase {...props}>
      <div className="w-full max-w-6xl mx-auto px-2 py-4">
        {/* 顶部个人资产及看板公告区 */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 border border-gray-100 dark:border-neutral-700">
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center sm:justify-start gap-2">
              <i className="fas fa-store text-blue-500"></i> 积分资源福利商店
            </h1>
            <p className="text-xs text-gray-400 mt-1">使用每日签到积累的积分，免费兑换独家整合包及高级调试工具</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 px-5 py-2.5 rounded-xl border border-blue-100 dark:border-blue-900/50 text-center sm:text-right min-w-[140px]">
            <span className="text-xs text-blue-600 dark:text-blue-400 block font-semibold mb-0.5">我的可用资产</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {isSignedIn ? userPoints : '---'} <span className="text-xs font-normal">分</span>
            </span>
          </div>
        </div>

        {/* 手机端深度优化的自适应商品网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products?.map(product => (
            <div key={product.id} className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              {/* 图片比例16:10，防止移动端高度崩塌 */}
              <div className="relative aspect-[16/10] bg-gray-50 dark:bg-neutral-900 w-full overflow-hidden">
                {product.cover ? (
                  <img src={product.cover} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-neutral-700">
                    <i className="fas fa-cubes text-3xl"></i>
                  </div>
                )}
                {/* 悬浮积分角标 */}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-yellow-400 flex items-center gap-1">
                  <i className="fas fa-database text-[10px]"></i> {product.cost} 积分
                </div>
              </div>
              
              {/* 卡片详情及底栏交互 */}
              <div className="p-4 flex flex-col flex-grow justify-between gap-4">
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 line-clamp-2 min-h-[40px] leading-snug">
                  {product.name}
                </h3>
                
                <button
                  onClick={() => handleRedeem(product)}
                  disabled={loadingId === product.id}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all text-white flex items-center justify-center gap-1.5 ${
                    loadingId === product.id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm shadow-blue-500/10'
                  }`}
                >
                  {loadingId === product.id ? (
                    <><i className="fas fa-spinner animate-spin"></i> 安全验签中...</>
                  ) : (
                    <><i className="fas fa-shopping-cart"></i> 消耗积分兑换</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 缺省兜底状态 */}
        {products?.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm bg-white dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700">
            <i className="fas fa-box-open text-4xl mb-3 block text-gray-300 dark:text-neutral-600"></i>
            货架上空空如也，掌柜正在极速上新中...
          </div>
        )}
      </div>
    </LayoutBase>
  )
}

export async function getStaticProps() {
  const globalData = await getGlobalData({ from: 'shop' })
  
  const databaseId = process.env.NOTION_SHOP_DB_ID
  const token = process.env.NOTION_SECRET // 统一对接标准的集成的密钥变量名
  
  let products = []
  
  if (databaseId && token) {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            property: 'Status',
            select: { equals: '已上架' }
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        products = data.results.map(row => {
          const props = row.properties
          return {
            id: row.id,
            name: props.Name?.title[0]?.plain_text || '未分配名称的资源',
            cost: props.Cost?.number || 0,
            cover: props.Cover?.files[0]?.file?.url || props.Cover?.files[0]?.external?.url || ''
          }
        })
      }
    } catch (error) {
      console.error('Notion ISR Fetching Failed:', error)
    }
  }

  return {
    props: {
      products,
      ...globalData
    },
    revalidate: 15 // ISR 增量刷新时限设定为 15 秒
  }
}
