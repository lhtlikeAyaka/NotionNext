import { getAuth, clerkClient } from '@clerk/nextjs/server'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: '请先登录' })

    const { postId, cost, encryptedLink, action } = req.body
    if (!postId || !encryptedLink) return res.status(400).json({ error: '资源状态异常' })

    // AES-256-CBC 解密核心算法
    const decryptLink = (encryptedText) => {
      try {
        const SECRET = process.env.RESOURCE_SECRET || 'lhttools_default_secret_2026_!!!'
        const textParts = encryptedText.split(':')
        const iv = Buffer.from(textParts.shift(), 'hex')
        const encryptedData = Buffer.from(textParts.join(':'), 'hex')
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET.padEnd(32, '0').slice(0, 32)), iv)
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
      } catch (e) {
        return '【链接解密失败，请联系网站管理员】'
      }
    }

    const user = await clerkClient.users.getUser(userId)
    const currentScore = user.publicMetadata?.score || 0
    const unlockedArticles = user.publicMetadata?.unlockedArticles || []
    const alreadyOwned = unlockedArticles.includes(postId)

    // 仅解密不扣费（用户刷新页面时校验）
    if (action === 'decrypt_only') {
      if (alreadyOwned) return res.status(200).json({ realLink: decryptLink(encryptedLink) })
      return res.status(403).json({ error: '无权查看此加密资源' })
    }

    // 主动购买扣费逻辑
    if (alreadyOwned) {
      return res.status(200).json({ message: '您已解锁过', realLink: decryptLink(encryptedLink) })
    }

    if (currentScore < cost) {
      return res.status(403).json({ error: '积分不足，请先获取积分' })
    }

    // 扣除积分并追加已解锁数组
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        score: currentScore - cost,
        unlockedArticles: [...unlockedArticles, postId]
      }
    })

    return res.status(200).json({ message: '🎉 解锁成功！', realLink: decryptLink(encryptedLink) })
  } catch (error) {
    console.error('Unlock Error:', error)
    return res.status(500).json({ error: '服务器繁忙，请稍后再试' })
  }
}
