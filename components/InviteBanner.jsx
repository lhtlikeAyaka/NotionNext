'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export default function InviteBanner({ onScoreUpdate }) {
  const { isSignedIn, user } = useUser()
  const [inviteInput, setInviteInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [myCode, setMyCode] = useState('')

  // 1. 动态生成并同步短码的魔法
  useEffect(() => {
    if (isSignedIn && user) {
      const existingCode = user.publicMetadata?.myInviteCode
      
      if (!existingCode) {
        // 如果没有短码，前端随机生成一个
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setMyCode(code)
        
        // 悄悄在前端更新回他自己的 Clerk 属性里
        user.update({
          publicMetadata: {
            ...user.publicMetadata,
            myInviteCode: code
          }
        }).then(() => console.log('Short code initialization successful:', code))
      } else {
        setMyCode(existingCode)
      }
    }
  }, [isSignedIn, user])

  const invitedCount = Array.isArray(user?.publicMetadata?.invitedUsers)
    ? user.publicMetadata.invitedUsers.length
    : 0

  const hasReferred = !!user?.publicMetadata?.referredBy

  const handleSubmitCode = async () => {
    if (inviteInput.trim().length !== 6) {
      alert('请输入标准的6位纯动态邀请码')
      return
    }
    setLoading(true)
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
        window.location.reload()
      } else {
        alert(data.error || '激活失败')
      }
    } catch (err) {
      alert('网络异常，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (!myCode) return
    navigator.clipboard.writeText(myCode)
    alert(`📋 你的专属短邀请码【${myCode}】已复制！发给好友注册即可赚取 100 积分！`)
  }

  if (!isSignedIn) return null

  return (
    <div className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 md:p-6 text-white shadow-md mb-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold backdrop-blur-sm">🎁 限时裂变福利</span>
            <span className="text-xs text-indigo-100">已成功邀请：<b className="text-white text-sm font-black underline">{invitedCount}</b> 人</span>
          </div>
          <h2 className="text-lg md:text-xl font-black mt-1">呼朋唤友，狂赚积分！</h2>
          <p className="text-xs text-indigo-100 mt-1">好友通过你的专属码注册，<b>你得 100 分</b>，<b>TA 专属得 60 分</b>，上不封顶！</p>
        </div>

        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10">
          {/* 这里展示的已经是清爽的6位短码 */}
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-indigo-200 block">我的专属邀请码：</span>
            <button onClick={handleCopyCode} className="text-sm font-mono font-black bg-yellow-400 text-gray-900 px-3 py-1 rounded hover:bg-yellow-300 transition-all block text-center tracking-widest">
              {myCode || '生成中..'} <i className="far fa-copy ml-1"></i>
            </button>
          </div>

          <div className="h-px sm:h-8 w-full sm:w-px bg-white/20"></div>

          {!hasReferred ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="6位好友邀请码"
                maxLength={6}
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                className="bg-white text-gray-800 placeholder-gray-400 text-xs px-3 py-2 rounded-lg focus:outline-none w-full sm:w-32 text-center uppercase font-bold tracking-wider"
              />
              <button
                onClick={handleSubmitCode}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap active:scale-95 disabled:bg-gray-400"
              >
                {loading ? '绑定中..' : '激活+60分'}
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1 py-2">
              <i className="fas fa-check-circle"></i> 您已成功绑定引路人奖励！
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
