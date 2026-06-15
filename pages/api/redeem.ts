import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuth, clerkClient } from '@clerk/nextjs/server'

const SHOP_ITEMS: Record<string, { name: string; cost: number; code: string }> = {
  'item_01': { name: '测试1', cost: 1, code: '测试' },
  'item_02': { name: '测试2', cost: 50, code: '测试' },
  'item_03': { name: '测试3', cost: 10, code: '测试' }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: '请先登录' })

    const { itemId } = req.body
    const item = SHOP_ITEMS[itemId]
    if (!item) return res.status(404).json({ error: '商品不存在' })

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const metadata = user.publicMetadata as { score?: number }
    const currentScore = metadata.score || 0

    if (currentScore < item.cost) {
      return res.status(400).json({ error: `积分不足！当前只有 ${currentScore} 积分` })
    }

    const newScore = currentScore - item.cost
    await client.users.updateUserMetadata(userId, { publicMetadata: { score: newScore } })

    return res.status(200).json({ success: true, message: `兑换成功！`, score: newScore, code: item.code })
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' })
  }
}
