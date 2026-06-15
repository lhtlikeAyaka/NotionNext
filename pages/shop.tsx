import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function ScoreShopPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [loading, setLoading] = useState(false)
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null)

  const userMetadata = user?.publicMetadata as { score?: number; lastCheckIn?: string } || {}
  const currentScore = userMetadata.score || 0
  const lastCheckIn = userMetadata.lastCheckIn || ''
  const todayStr = new Date().toISOString().split('T')[0]
  const isCheckedInToday = lastCheckIn === todayStr

  const shopItems = [
    { id: 'item_01', name: '绝区零全功能工具箱', desc: '全套Mod整合包', cost: 30, icon: '📦' },
    { id: 'item_02', name: '鸣潮高帧率画质包', desc: '中低端手机极致优化', cost: 50, icon: '⚡' },
    { id: 'item_03', name: '原神高清动态壁纸', desc: '4K提取版', cost: 10, icon: '🖼️' },
  ]

  const handleCheckIn = async () => {
    setLoading(true)
    const res = await fetch('/api/check-in', { method: 'POST' })
    const data = await res.json()
    if (res.ok) { alert(data.message); window.location.reload() } else { alert(data.error) }
    setLoading(false)
  }

  const handleRedeem = async (itemId: string, itemName: string) => {
    if (!confirm(`确定要兑换【${itemName}】吗？`)) return
    setLoading(true)
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    })
    const data = await res.json()
    if (res.ok) { setRedeemedCode(`兑换成功！密码/链接：${data.code}`); user?.reload() } else { alert(data.error) }
    setLoading(false)
  }

  // 必须传入 props，这样 Layout 才能获取到网站图标、标题等导航数据
  return (
    <Layout {...props}>
      <div className="max-w-md mx-auto p-4 min-h-[50vh]">
        {!isLoaded ? <p>加载中...</p> : !isSignedIn ? <p className="text-center">请先登录</p> : (
          <div className="space-y-4">
            <div className="bg-blue-600 p-4 rounded-xl text-white">
              <p>当前积分: {currentScore}</p>
              <button onClick={handleCheckIn} disabled={isCheckedInToday} className="bg-white text-blue-600 px-3 py-1 rounded mt-2">
                {isCheckedInToday ? '今日已签' : '签到+10'}
              </button>
            </div>
            {redeemedCode && <p className="bg-green-100 p-2 rounded text-sm">{redeemedCode}</p>}
            {shopItems.map(item => (
              <div key={item.id} className="border p-3 rounded-lg flex justify-between items-center">
                <div><h4>{item.name}</h4><p className="text-xs">{item.cost} 积分</p></div>
                <button onClick={() => handleRedeem(item.id, item.name)} className="bg-amber-500 text-white px-3 py-1 rounded text-sm">兑换</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  // 使用 require 动态引入，彻底规避路径编译检查
  const { getGlobalData } = require('@/lib/notion/getNotionData') 
  const props = await getGlobalData({ from: 'shop-page' })
  return { props, revalidate: parseInt(BLOG.NEXT_REVALIDATE_SECOND) }
}