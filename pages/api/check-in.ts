import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuth, clerkClient } from '@clerk/nextjs/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: '请先登录' })

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const metadata = user.publicMetadata as { score?: number; lastCheckIn?: string }

    const currentScore = metadata.score || 0
    const lastCheckIn = metadata.lastCheckIn || ''
    const today = new Date().toISOString().split('T')[0]

    if (lastCheckIn === today) {
      return res.status(400).json({ error: '今日已签到，明天再来吧！' })
    }

    const newScore = currentScore + 10
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { score: newScore, lastCheckIn: today }
    })

    return res.status(200).json({ success: true, message: '签到成功！积分 +10', score: newScore })
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' })
  }
}
