'use client'

/**
 * # NAV 主题说明
 * 主题开发者 [emengweb](https://github.com/emengweb)
 * 开启方式 在blog.config.js 将主题配置为 `NAV`
 */

import Comment from '@/components/Comment'
import { AdSlot } from '@/components/GoogleAdsense'
import Live2D from '@/components/Live2D'
import NotionIcon from '@/components/NotionIcon'
import NotionPage from '@/components/NotionPage'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isBrowser } from '@/lib/utils'
import { Transition } from '@headlessui/react'
import dynamic from 'next/dynamic'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { createContext, useContext, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs' // 引入 Clerk 前端用户状态钩子
import Announcement from './components/Announcement'
import { ArticleLock } from './components/ArticleLock'
import UnlockButton from './components/UnlockButton'
import BlogArchiveItem from './components/BlogArchiveItem'
import BlogPostCard from './components/BlogPostCard'
import BlogPostListAll from './components/BlogPostListAll'
import CategoryItem from './components/CategoryItem'
import FloatButtonCatalog from './components/FloatButtonCatalog'
import Footer from './components/Footer'
import JumpToTopButton from './components/JumpToTopButton'
import LogoBar = './components/LogoBar'
import { MenuItem } from './components/MenuItem'
import PageNavDrawer from './components/PageNavDrawer'
import TagItemMini from './components/TagItemMini'
import TocDrawer from './components/TocDrawer'
import TopNavBar from './components/TopNavBar'
import CONFIG from './config'
import { Style } from './style'

const WWAds = dynamic(() => import('@/components/WWAds'), { ssr: false })

// 主题全局变量
const ThemeGlobalNav = createContext()
export const useNavGlobal = () => useContext(ThemeGlobalNav)

/**
 * 基础布局
 * 采用左右两侧布局，移动端使用顶部导航栏
 * @returns {JSX.Element}
 * @constructor
 */
const LayoutBase = props => {
  const {
    customMenu,
    children,
    post,
    allNavPages,
    categoryOptions,
    slotLeft,
    slotTop
  } = props
  const { onLoading } = useGlobal()
  const [tocVisible, changeTocVisible] = useState(false)
  const [pageNavVisible, changePageNavVisible] = useState(false)
  const [filteredNavPages, setFilteredNavPages] = useState(allNavPages)

  const showTocButton = post?.toc?.length > 1

  // Clerk 用户登录状态与元数据读取
  const { isSignedIn, user } = useUser()
  const [points, setPoints] = useState(0)
  const [hasSignedIn, setHasSignedIn] = useState(false)

  // 监听登录状态，实时同步 Clerk 个人云端数据库内的积分与签到指标
  useEffect(() => {
    setFilteredNavPages(allNavPages)
    
    if (isSignedIn && user) {
      // 从 Clerk 的 publicMetadata 独立空间抓取数据
      const currentPoints = parseInt(user.publicMetadata?.points || '0', 10)
      setPoints(currentPoints)
      
      const lastDate = user.publicMetadata?.lastSignInDate
      const today = new Date().toISOString().split('T')[0]
      setHasSignedIn(lastDate === today)
    } else {
      // 退出登录或未登录状态重置本地状态
      setPoints(0)
      setHasSignedIn(false)
    }
  }, [post, allNavPages, isSignedIn, user])

  let links = customMenu

  // 默认使用自定义菜单，否则将遍历所有的category生成菜单
  if (!siteConfig('NAV_USE_CUSTOM_MENU', null, CONFIG)) {
    links =
      categoryOptions &&
      categoryOptions?.map(c => {
        return {
          id: c.name,
          title: `# ${c.name}`,
          href: `/category/${c.name}`,
          show: true
        }
      })
  }

  // 对接 Clerk 账户的小型动态后端签到处理逻辑
  const handleSignIn = async () => {
    if (!isSignedIn) {
      alert('请先登录账号后再进行签到！')
      return
    }

    try {
      // 请求后端的真实 Clerk 隔离环境进行安全加分
      const res = await fetch('/api/check-in', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok) {
        setPoints(data.points)
        setHasSignedIn(true)
        alert(`🎉 签到成功！\n获得奖励：+10 积分\n当前独立账户总积分：${data.points} 分`)
      } else {
        alert(data.error || '签到失败，请稍后再试')
        if (data.points !== undefined) {
          setPoints(data.points)
        }
      }
    } catch (error) {
      console.error('Clerk Sign-in Error:', error)
      alert('网络通信异常，请检查网络后重试')
    }
  }

  return (
    <ThemeGlobalNav.Provider
      value={{
        tocVisible,
        changeTocVisible,
        filteredNavPages,
        setFilteredNavPages,
        allNavPages,
        pageNavVisible,
        changePageNavVisible,
        categoryOptions
      }}>
      {/* 样式 */}
      <Style />

      {/* 主题样式根基 */}
      <div
        id='theme-onenav'
        className={`${siteConfig('FONT_STYLE')} dark:bg-hexo-black-gray w-full h-screen min-h-screen justify-center dark:text-gray-300 scroll-smooth`}>
        {/* 端顶部导航栏 */}
        <TopNavBar {...props} />

        {/* 左右布局区块 */}
        <main
          id='wrapper'
          className={
            (JSON.parse(siteConfig('LAYOUT_SIDEBAR_REVERSE'))
              ? 'flex-row-reverse'
              : '') + ' relative flex justify-between w-full h-screen mx-auto'
          }>
          {/* 左侧推拉抽屉 */}
          <div
            className={
              ' hidden md:block dark:border-transparent relative z-10 mx-4 w-52 max-h-full pb-44'
            }>
            {/* 图标Logo */}
            <div className='hidden md:block w-full top-0 left-5 md:left-4 z-40 pt-3 md:pt-4'>
              <LogoBar {...props} />
            </div>
            <div className='main-menu z-20 pl-9 pr-7 pb-5 sticky pt-1 top-20 overflow-y-scroll h-fit max-h-full scroll-hidden bg-white dark:bg-neutral-800 rounded-xl '>
              {/* 嵌入 */}
              {slotLeft}

              <div className='grid pt-2'>
                {/* 显示菜单 */}
                {links &&
                  links?.map((link, index) => (
                    <MenuItem key={index} link={link} />
                  ))}
              </div>
            </div>

            {/* 页脚站点信息 */}
            <div className='w-56 fixed left-0 bottom-0 z-0'>
              <Live2D />
              <Footer {...props} />
            </div>
          </div>

          {/* 右侧主要内容区块 */}
          <div
            id='center-wrapper'
            className='flex flex-col justify-between w-full relative z-10 pt-20 md:pt-5 pb-8 min-h-screen overflow-y-auto'>
            <div
              id='container-inner'
              className='w-full px-6 pb-6 md:pb-20 max-w-8xl justify-center mx-auto'>
              {slotTop}
              {/* 广告植入 */}
              <WWAds className='w-full' orientation='horizontal' />

              <Transition
                show={!onLoading}
                appear={true}
                enter='transition ease-in-out duration-700 transform order-first'
                enterFrom='opacity-0 translate-y-16'
                enterTo='opacity-100'
                leave='transition ease-in-out duration-300 transform'
                leaveFrom='opacity-100 translate-y-0'
                leaveTo='opacity-0 -translate-y-16'
                unmount={false}>
                {children}
              </Transition>

              {/* Google广告 */}
              <AdSlot type='in-article' />
              <WWAds className='w-full' orientation='horizontal' />

              {/* 回顶按钮 */}
              <JumpToTopButton />
            </div>

            {/* 底部 */}
            <div className='md:hidden'>
              <Footer {...props} />
            </div>
          </div>
        </main>

        {/* 移动端悬浮目录按钮 */}
        {showTocButton && !tocVisible && (
          <div className='md:hidden fixed right-0 bottom-52 z-30 bg-white border-l border-t border-b dark:border-neutral-800 rounded'>
            <FloatButtonCatalog {...props} />
          </div>
        )}

        {/* 全局专属：由 Clerk 独立账号数据库驱动的签到悬浮组件 */}
        <button
          onClick={handleSignIn}
          className={`fixed bottom-24 right-4 md:right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 text-white ${
            !isSignedIn
              ? 'bg-gray-400 hover:bg-gray-500'
              : hasSignedIn 
                ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600' 
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500'
          }`}
          title={!isSignedIn ? '请登录账户' : hasSignedIn ? `今日已签到 (当前:${points}分)` : '每日签到 (+10积分)'}
        >
          <i className={`fas ${hasSignedIn ? 'fa-check-circle' : 'fa-calendar-check'} text-lg`}></i>
        </button>

        {/* 移动端导航抽屉 */}
        <PageNavDrawer {...props} filteredNavPages={filteredNavPages} />
      </div>
    </ThemeGlobalNav.Provider>
  )
}

/**
 * 首页
 * @param {*} props
 * @returns 此主题首页就是列表
 */
const LayoutIndex = props => {
  return <LayoutPostListIndex {...props} />
}

/**
 * 首页列表
 * @param {*} props
 * @returns
 */
const LayoutPostListIndex = props => {
  return (
    <>
      <Announcement {...props} />
      <BlogPostListAll {...props} />
    </>
  )
}

/**
 * 文章列表
 * @param {*} props
 * @returns
 */
const LayoutPostList = props => {
  const { posts } = props
  return (
    <>
      <div className='w-full max-w-7xl mx-auto justify-center mt-8'>
        <div
          id='posts-wrapper'
          className='card-list grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
          {posts?.map(post => (
            <BlogPostCard key={post.id} post={post} className='card' />
          ))}
        </div>
      </div>
    </>
  )
}

/**
 * 文章详情
 * @param {*} props
 * @returns
 */
const LayoutSlug = props => {
  const { post, lock, validPassword } = props
  const router = useRouter()
  const waiting404 = siteConfig('POST_WAITING_TIME_FOR_404') * 1000
  useEffect(() => {
    if (!post) {
      setTimeout(
        () => {
          if (isBrowser) {
            const article = document.querySelector('#article-wrapper #notion-article')
            if (!article) {
              router.push('/404').then(() => {
                console.warn('找不到页面', router.asPath)
              })
            }
          }
        },
        waiting404
      )
    }
  }, [post])
  return (
    <>
      {/* 文章锁 */}
      {lock && <ArticleLock validPassword={validPassword} />}

      {!lock && (
        <div id='container'>
          {/* title */}
          <h1 className='text-3xl pt-4 md:pt-12  dark:text-gray-300'>
            {siteConfig('POST_TITLE_ICON') && (
              <NotionIcon icon={post?.pageIcon} />
            )}
            {post?.title}
          </h1>

          {/* Notion文章主体 */}
          {post && (
            <section className='px-1'>
              <div id='article-wrapper'>
                <NotionPage post={post} />
              </div>

              {/* 资源解锁与下载按钮 */}
              <UnlockButton post={post} />

              {/* 文章分类和标签信息 */}
              <div className='flex justify-between'>
                {CONFIG.POST_DETAIL_CATEGORY && post?.category && (
                  <CategoryItem category={post.category} />
                )}
                <div>
                  {CONFIG.POST_DETAIL_TAG &&
                    post?.tagItems?.map(tag => (
                      <TagItemMini key={tag.name} tag={tag} />
                    ))}
                </div>
              </div>

              <AdSlot />
              <WWAds className='w-full' orientation='horizontal' />

              <Comment frontMatter={post} />
            </section>
          )}

          <TocDrawer {...props} />
        </div>
      )}
    </>
  )
}

const LayoutSearch = props => {
  return <></>
}

const LayoutArchive = props => {
  const { archivePosts } = props
  return (
    <>
      <div className='mb-10 pb-20 md:py-12 p-3  min-h-screen w-full'>
        {Object.keys(archivePosts).map(archiveTitle => (
          <BlogArchiveItem
            key={archiveTitle}
            archiveTitle={archiveTitle}
            archivePosts={archivePosts}
          />
        ))}
      </div>
    </>
  )
}

const Layout404 = props => {
  const router = useRouter()
  useEffect(() => {
    setTimeout(() => {
      const article = isBrowser && document.getElementById('article-wrapper')
      if (!article) {
        router.push('/').then(() => {
        })
      }
    }, 3000)
  }, [])

  return <>
        <div className='md:-mt-20 text-black w-full h-screen text-center justify-center content-center items-center flex flex-col'>
            <div className='dark:text-gray-200'>
                <h2 className='inline-block border-r-2 border-gray-600 mr-2 px-3 py-2 align-top'><i className='mr-2 fas fa-spinner animate-spin' />404</h2>
                <div className='inline-block text-left h-32 leading-10 items-center'>
                    <h2 className='m-0 p-0'>页面无法加载，即将返回首页</h2>
                </div>
            </div>
        </div>
    </>
}

const LayoutCategoryIndex = props => {
  const { categoryOptions } = props
  const { locale } = useGlobal()
  return (
    <>
      <div className='bg-white dark:bg-gray-700 py-10'>
        <div className='dark:text-gray-200 mb-5'>
          <i className='mr-4 fas fa-th' />
          {locale.COMMON.CATEGORY}:
        </div>
        <div id='category-list' className='duration-200 flex flex-wrap'>
          {categoryOptions?.map(category => {
            return (
              <SmartLink
                key={category.name}
                href={`/category/${category.name}`}
                passHref
                legacyBehavior>
                <div
                  className={
                    'hover:text-black dark:hover:text-white dark:text-gray-300 dark:hover:bg-gray-600 px-5 cursor-pointer py-2 hover:bg-gray-100'
                  }>
                  <i className='mr-4 fas fa-folder' />
                  {category.name}({category.count})
                </div>
              </SmartLink>
            )
          })}
        </div>
      </div>
    </>
  )
}

const LayoutTagIndex = props => {
  return <></>
}

export {
  Layout404,
  LayoutArchive,
  LayoutBase,
  LayoutCategoryIndex,
  LayoutIndex,
  LayoutPostList,
  LayoutSearch,
  LayoutSlug,
  LayoutTagIndex,
  CONFIG as THEME_CONFIG
}
