import { getAuth, clerkClient } from '@clerk/nextjs/server'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // 1. 拦截未登录用户
  const { userId } = getAuth(req)
  if (!userId) {
    return res.status(401).json({ error: '请先登录账号后再进行兑换' })
  }

  const { productId } = req.body
  if (!productId) {
    return res.status(400).json({ error: '无效的商品凭证' })
  }

  const databaseId = process.env.NOTION_SHOP_DB_ID
  const token = process.env.NOTION_SECRET // 统一对接标准的集成的密钥变量名

  try {
    // 2. 仅在后端请求 Notion 获取该特定商品的密文属性
    const notionRes = await fetch(`https://api.notion.com/v1/pages/${productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28'
      }
    })

    if (!notionRes.ok) {
      return res.status(404).json({ error: '该商品在数据库中已失效或被删除' })
    }

    const pageData = await notionRes.json()
    const props = pageData.properties
    
    // 上架安全性验证
    if (props.Status?.select?.name !== '已上架') {
      return res.status(400).json({ error: '该资源目前处于下架维护状态' })
    }

    const cost = props.Cost?.number || 0
    const link = props.Link?.url

    if (!link) {
      return res.status(500).json({ error: '掌柜暂未给该商品配置下载地址，请联系管理员补档' })
    }

    // 3. 读取该用户在 Clerk 独立空间内的总资产（已修正为 score）
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const currentScore = parseInt(user.publicMetadata?.score || '0', 10)

    if (currentScore < cost) {
      return res.status(400).json({ error: `您的积分不足！兑换需要 ${cost} 分，当前仅有 ${currentScore} 分。` })
    }

    // 4. 资产足够，执行扣分并同步更新回 Clerk 数据库
    const newScore = currentScore - cost
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        score: newScore // 🌟 关键：扣分写入正确的 score 字段
      }
    })

    // 5. 将受保护的真实资源 Link 和最新剩余积分返回给前端
    return res.status(200).json({ message: '兑换成功', link, score: newScore })
  } catch (error) {
    console.error('Redeem Backend Core Error:', error)
    return res.status(500).json({ error: '商店核心服务异常，请联系站长修复' })
  }
}
