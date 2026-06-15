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
    { id: 'item_01', name: '绝区零全功能工具箱', desc: '含全套透视自瞄打包Mod', cost: 30, icon: '📦' },
    { id: 'item_02', name: '鸣潮高帧率画质包', desc: '针对中低端手机极致优化', cost: 50, icon: '⚡' },
    { id: 'item_03', name: '原神高清动态壁纸', desc: '4K无修高画质提取版', cost: 10, icon: '🖼️' },
  ]

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/check-in', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        window.location.reload()
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('签到失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async (itemId: string, itemName: string) => {
    if (!confirm(`确定要消耗积分兑换【${itemName}】吗？`)) return
    setLoading(true)
    setRedeemedCode(null)
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      })
      const data = await res.json()
      if (res.ok) {
        setRedeemedCode(`🎉 兑换成功！您的卡密/解压密码为：${data.code}`)
        alert('兑换成功！密码已显示在页面顶部。')
        user?.reload()
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('兑换失败')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) return <div className="p-8 text-center text-gray-500">加载中...</div>
  if (!isSignedIn) return <div className="p-8 text-center text-red-500">⚠️ 请先登录后再访问积分商店</div>

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 p-4 pb-12">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg mb-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-blue-100">当前拥有积分</p>
            <h2 className="text-3xl font-black mt-1">{currentScore} <span className="text-sm font-normal">分</span></h2>
            <p className="text-xs text-blue-200 mt-2">用户: {user.username || user.primaryEmailAddress?.emailAddress}</p>
          </div>
          <button
            onClick={handleCheckIn}
            disabled={loading || isCheckedInToday}
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all ${
              isCheckedInToday ? 'bg-blue-400/40 text-blue-100 cursor-not-allowed' : 'bg-white text-blue-600 active:scale-95'
            }`}
          >
            {isCheckedInToday ? '今日已签' : '📅 签到+10'}
          </button>
        </div>
      </div>

      {redeemedCode && (
        <div className="bg-green-50 border-2 border-green-300 text-green-800 rounded-xl p-4 mb-5 text-sm font-mono break-all">
          {redeemedCode}
        </div>
      )}

      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-extrabold text-gray-800 text-lg">✨ 积分兑换商店</h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {shopItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{item.icon}</span>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                <div className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1">
                  🪙 需要 {item.cost} 积分
                </div>
              </div>
            </div>
            <button
              onClick={() => handleRedeem(item.id, item.name)}
              disabled={loading}
              className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                currentScore >= item.cost ? 'bg-amber-500 text-white active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentScore >= item.cost ? '兑换' : '积分不足'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
