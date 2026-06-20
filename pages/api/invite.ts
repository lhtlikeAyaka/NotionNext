import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuth, clerkClient } from '@clerk/nextjs/server'

// 6位短码生成器
function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  try {
    const { userId: newUserId } = getAuth(req)
    if (!newUserId) return res.status(401).json({ error: '请先登录账号' })

    const { inviteCode } = req.body // 前端传过来的 6 位短码
    if (!inviteCode || inviteCode.trim().length !== 6) {
      return res.status(400).json({ error: '请输入正确的6位邀请码' })
    }

    const client = await clerkClient()
    const newUser = await client.users.getUser(newUserId)

    // 1. 安全校验：防止重复激活
    if (newUser.publicMetadata?.referredBy) {
      return res.status(400).json({ error: '您已经激活过邀请码，无法重复填写' })
    }

    // 🌟 核心突破：通过前端填写的 6 位短码，去 Clerk 数据库里搜索对应的老用户
    const uppercaseCode = inviteCode.trim().toUpperCase()
    const searchResponse = await client.users.getUserList({
      query: uppercaseCode, // Clerk 支持模糊匹配 metadata 里的内容
      limit: 10
    })

    // 精确筛选出带有这个 myInviteCode 的老用户
    const inviter = searchResponse.data.find(
      (u: any) => u.publicMetadata?.myInviteCode === uppercaseCode
    )

    if (!inviter) {
      return res.status(404).json({ error: '该邀请码不存在，请核对后再试' })
    }

    const inviteCodeUserId = inviter.id // 拿到老用户的真实真实 userId

    // 2. 防刷：不能填自己的短码
    if (inviteCodeUserId === newUserId) {
      return res.status(400).json({ error: '不能填写自己的邀请码哦！' })
    }

    // 3. 给新用户加 60 分
    const newUserScore = parseInt(newUser.publicMetadata?.score?.toString() || '0', 10) + 60
    await client.users.updateUserMetadata(newUserId, {
      publicMetadata: {
        ...newUser.publicMetadata,
        score: newUserScore,
        referredBy: inviteCodeUserId // 数据库底层依然记录真实ID，保证万无一失
      }
    })

    // 4. 给邀请者加 100 分，并记录已邀请列表
    const inviterScore = parseInt(inviter.publicMetadata?.score?.toString() || '0', 10) + 100
    const inviterList = Array.isArray(inviter.publicMetadata?.invitedUsers) 
      ? [...inviter.publicMetadata.invitedUsers] 
      : []
    
    if (!inviterList.includes(newUserId)) {
      inviterList.push(newUserId)
    }

    await client.users.updateUserMetadata(inviteCodeUserId, {
      publicMetadata: {
        ...inviter.publicMetadata,
        score: inviterScore,
        invitedUsers: inviterList
      }
    })

    return res.status(200).json({ 
      success: true, 
      message: '激活成功！您已获得 60 积分奖励。', 
      score: newUserScore 
    })

  } catch (error) {
    console.error('Invite API Error:', error)
    return res.status(500).json({ error: '邀请系统核心异常' })
  }
}
