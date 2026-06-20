import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuth, clerkClient } from '@clerk/nextjs/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: '请先登录' })

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    
    // ⚡ 核心修复：全面对齐最新架构，统一从 score 字段读取独立账户总资产
    const metadata = user.publicMetadata as { score?: string | number; lastCheckIn?: string }

    const currentScore = parseInt(metadata.score?.toString() || '0', 10)
    const lastCheckIn = metadata.lastCheckIn || ''
    const today = new Date().toISOString().split('T')[0]

    if (lastCheckIn === today) {
      return res.status(400).json({ error: '今日已签到，明天再来吧！' })
    }

    // 🌟 自动化清洗：利用解构赋值，把历史遗留的 points 脏字段直接过滤掉
    const { points: _, ...restMetadata } = user.publicMetadata as Record<string, any>

    // 执行签到加 10 分
    const newScore = currentScore + 10
    
    // 同步更新回 Clerk 数据库，使用过滤后的 restMetadata
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...restMetadata,   // 🌟 完美继承其他自定义字段，同时在 Clerk 中彻底抹除 points
        score: newScore,   // 写入正统的 score
        lastCheckIn: today
      }
    })

    // ⚡ 战术性多字段返回：对接修改后的 LayoutBase，确保 score 安全同步
    return res.status(200).json({ 
      success: true, 
      message: '签到成功！积分 +10', 
      score: newScore,
      newScore: newScore   // 兼容性保留
    })
  } catch (error) {
    console.error('Checkin API Error:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
}
