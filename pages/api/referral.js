import { getAuth, clerkClient } from '@clerk/nextjs/server'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. 获取当前登录用户（受邀的新用户）
    const { userId: inviteeId } = getAuth(req)
    if (!inviteeId) {
      return res.status(401).json({ error: '请先登录账号再激活邀请码' })
    }

    const { inviterId } = req.body
    if (!inviterId) {
      return res.status(400).json({ error: '邀请码缺失' })
    }

    // 2. 防作弊验证
    if (inviteeId === inviterId) {
      return res.status(400).json({ error: '不能激活自己的邀请链接哦' })
    }

    // 3. 验证新用户是否已经接受过邀请
    const invitee = await clerkClient.users.getUser(inviteeId)
    if (invitee.publicMetadata?.referredBy) {
      return res.status(400).json({ error: '您已经激活过邀请奖励，无法重复领取' })
    }

    // 4. 验证邀请人是否存在
    let inviter
    try {
      inviter = await clerkClient.users.getUser(inviterId)
    } catch (e) {
      return res.status(400).json({ error: '该邀请链接已失效或不合法' })
    }

    // 🪙 奖励数额配置
    const INVITER_BONUS = 50 
    const INVITEE_BONUS = 30 

    // 获取双方当前的积分和邀请数据
    const currentInviterScore = inviter.publicMetadata?.score || 0
    const currentInviterCount = inviter.publicMetadata?.referralCount || 0
    const currentInviteeScore = invitee.publicMetadata?.score || 0

    // 5. 更新邀请人（老用户）：积分增加，且邀请人数 +1
    await clerkClient.users.updateUserMetadata(inviterId, {
      publicMetadata: {
        score: currentInviterScore + INVITER_BONUS,
        referralCount: currentInviterCount + 1 // 🛠️ 核心：累计邀请人数
      }
    })

    // 6. 更新受邀人（新用户）：积分增加，且永远绑定邀请人的 Clerk ID
    await clerkClient.users.updateUserMetadata(inviteeId, {
      publicMetadata: {
        score: currentInviteeScore + INVITEE_BONUS,
        referredBy: inviterId // 🛠️ 核心：记录他的邀请人是谁
      }
    })

    return res.status(200).json({
      message: `🎉 激活成功！您已获得 ${INVITEE_BONUS} 积分，邀请人获得 ${INVITER_BONUS} 积分！`
    })

  } catch (error) {
    console.error('Referral Error:', error)
    return res.status(500).json({ error: '服务器繁忙，请稍后再试' })
  }
}
