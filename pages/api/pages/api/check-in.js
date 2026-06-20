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
    
    // 3. 读取现有的积分（已修正为 score）和签到日期
    const currentScore = parseInt(user.publicMetadata?.score || '0', 10)
    const lastSignInDate = user.publicMetadata?.lastSignInDate
    const today = new Date().toISOString().split('T')[0]

    // 4. 防刷校验：判断今天是否入账过
    if (lastSignInDate === today) {
      return res.status(400).json({ error: '今天已经签过到啦！', score: currentScore })
    }

    // 5. 写入新数据到 Clerk，统一使用 score 字段
    const newScore = currentScore + 10
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        score: newScore,         // 🌟 关键：这里改成 score，Clerk 后台就不会再乱建 points 了
        lastSignInDate: today
      }
    })

    // 6. 返回给前端（返回值也改成 score）
    return res.status(200).json({ message: '签到成功', score: newScore, signedIn: true })
  } catch (error) {
    return res.status(500).json({ error: '服务器错误，请稍后再试' })
  }
}
