import { getAuth, clerkClient } from '@clerk/nextjs/server'

export default async function handler(req, res) {
  // 1. 验证用户是否登录
  const { userId } = getAuth(req)
  if (!userId) {
    return res.status(401).json({ error: '请先登录账号' })
  }

  try {
    // 2. 获取 Clerk 用户详情
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    
    // 3. 读取现有的积分和签到日期
    const currentPoints = parseInt(user.publicMetadata?.points || '0', 10)
    const lastSignInDate = user.publicMetadata?.lastSignInDate
    const today = new Date().toISOString().split('T')[0]

    // 4. 防刷校验：判断今天是否入账过
    if (lastSignInDate === today) {
      return res.status(400).json({ error: '今天已经签过到啦！', points: currentPoints })
    }

    // 5. 写入新数据到 Clerk 每个人独立的空间
    const newPoints = currentPoints + 10
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        points: newPoints,
        lastSignInDate: today
      }
    })

    return res.status(200).json({ message: '签到成功', points: newPoints, signedIn: true })
  } catch (error) {
    return res.status(500).json({ error: '服务器错误，请稍后再试' })
  }
}
