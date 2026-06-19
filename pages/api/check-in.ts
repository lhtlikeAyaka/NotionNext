import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuth, clerkClient } from '@clerk/nextjs/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: '请先登录' })

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    
    // ⚡ 核心修复：全面对齐商店架构，统一从 points 字段读取独立账户总资产
    const metadata = user.publicMetadata as { points?: string | number; lastCheckIn?: string }

    const currentPoints = parseInt(metadata.points?.toString() || '0', 10)
    const lastCheckIn = metadata.lastCheckIn || ''
    const today = new Date().toISOString().split('T')[0]

    if (lastCheckIn === today) {
      return res.status(400).json({ error: '今日已签到，明天再来吧！' })
    }

    // 执行签到加 10 分
    const newPoints = currentPoints + 10
    
    // 同步更新回 Clerk 数据库，保持原有的 metadata 其它字段不被覆盖
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        points: newPoints,
        lastCheckIn: today
      }
    })

    // ⚡ 战术性多字段返回：同时返回 points 和 newPoints，彻底堵死前端因版本不同而导致的 undefined 漏洞
    return res.status(200).json({ 
      success: true, 
      message: '签到成功！积分 +10', 
      points: newPoints,
      newPoints: newPoints
    })
  } catch (error) {
    console.error('Checkin API Error:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
}
