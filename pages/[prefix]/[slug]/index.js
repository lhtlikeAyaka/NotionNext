import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import Slug from '..'
import { checkSlugHasOneSlash } from '@/lib/utils/post'

/**
 * 根据notion的slug访问页面
 * 解析二级目录 /article/about
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

export async function getStaticPaths() {
  if (!BLOG.isProd) {
    return {
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })

  // 根据slug中的 / 分割成prefix和slug两个字段 ; 例如 article/test
  // 最终用户可以通过  [domain]/[prefix]/[slug] 路径访问，即这里的 [domain]/article/test
  const paths = allPages
    ?.filter(row => checkSlugHasOneSlash(row))
    .map(row => ({
      params: { prefix: row.slug.split('/')[0], slug: row.slug.split('/')[1] }
    }))

  // 增加一种访问路径 允许通过 [category]/[slug] 访问文章
  // 例如文章slug 是 test ，然后文章的分类category是 production
  // 则除了 [domain]/[slug] 以外，还支持分类名访问: [domain]/[category]/[slug]

  return {
    paths: paths,
    fallback: true
  }
}

export async function getStaticProps({ params: { prefix, slug }, locale }) {
  const props = await resolvePostProps({
    prefix,
    slug,
    locale,
  })

  // === 👇 核心积分资源服务端加密拦截逻辑 👇 ===
  try {
    if (props?.post) {
      const targetPost = props.post
      const rawDownloadLink = targetPost.properties?.DownloadLink || targetPost.downloadLink
      const cost = targetPost.properties?.Cost || targetPost.cost

      // 只有同时满足有下载链接，且扣除积分大于0时，才进行服务端降维销毁
      if (rawDownloadLink && cost > 0) {
        const crypto = require('crypto')
        const SECRET = process.env.RESOURCE_SECRET || 'lhttools_default_secret_2026_!!!'
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET.padEnd(32, '0').slice(0, 32)), iv)
        
        let encrypted = cipher.update(rawDownloadLink, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        // 挂载加密密文与成本数字
        targetPost.encryptedLink = iv.toString('hex') + ':' + encrypted
        targetPost.cost = Number(cost)
        
        // 🔥 毁灭级安全操作：从即刻要发往前端的内存对象中彻底抹除明文下载字段
        if (targetPost.properties?.DownloadLink) delete targetPost.properties.DownloadLink
        if (targetPost.downloadLink) delete targetPost.downloadLink
      }
    }
  } catch (cryptoError) {
    console.error('服务端核心资源动态混淆失败:', cryptoError)
  }
  // === 👆 核心积分资源服务端加密拦截逻辑结束 👆 ===

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      ),
  }
}

export default PrefixSlug
