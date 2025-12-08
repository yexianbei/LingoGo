// Function Name: study-listen
import cloud from '@lafjs/cloud'
import {
  verifyToken,
} from '@/common-util'
import { getNowStamp } from '@/common-time'
import {
  type LiuRqReturn,
  type VerifyTokenRes_B,
} from './common-types'

const db = cloud.database()

// 数据模型（仅本文件内使用）
interface Table_StudyContent {
  _id?: string
  content_id: string
  title?: string
  video_provider: 'bilibili' | 'other'
  video_iframe_url: string
  audio_url?: string
  created_by?: string
  created_at?: number
}

interface Table_StudyParagraph {
  _id?: string
  content_id: string
  paragraph_id: string
  index: number
  en: string
  zh?: string
  audio_url?: string
  created_at?: number
}

interface Table_StudyWord {
  _id?: string
  content_id: string
  word_id: string
  word: string
  phonetic?: string
  note?: string
  audio_url?: string
  created_at?: number
}

interface Table_UserParagraphRating {
  _id?: string
  user_id: string
  content_id: string
  paragraph_id: string
  rating: number // 1-10
  rated_at: number
  next_review_at?: number
  review_algo?: 'ebbinghaus'
}

interface Table_UserWordRating {
  _id?: string
  user_id: string
  content_id: string
  word_id: string
  rating: number // 1-10
  rated_at: number
  next_review_at?: number
  review_algo?: 'ebbinghaus'
}

interface Table_UserContentRating {
  _id?: string
  user_id: string
  content_id: string
  rating: number // 1-10
  rated_at: number
  next_review_at?: number
  review_algo?: 'ebbinghaus'
}

type Res_GetContent = {
  operateType: 'get-content'
  content: {
    content_id: string
    title?: string
    video_provider: string
    video_iframe_url: string
    audio_url?: string
    rating?: number
    paragraphs: Array<{
      paragraph_id: string
      index: number
      en: string
      zh?: string
      audio_url?: string
      rating?: number
    }>
    words: Array<{
      word_id: string
      word: string
      phonetic?: string
      note?: string
      audio_url?: string
      rating?: number
    }>
  }
}

export async function main(ctx: FunctionContext) {
  const body = ctx.request?.body ?? {}
  const oT = body.operateType as string | undefined

  // 需要登录鉴权
  const vRes = await verifyToken(ctx, body)
  if(!vRes.pass) return vRes.rqReturn

  let res: LiuRqReturn = { code: 'E4000', errMsg: 'operateType not found' }

  if(oT === 'get-content') {
    res = await handle_get_content(vRes, body)
  }
  else if(oT === 'rate-paragraph') {
    res = await handle_rate_paragraph(vRes, body)
  }
  else if(oT === 'rate-word') {
    res = await handle_rate_word(vRes, body)
  }
  else if(oT === 'rate-content') {
    res = await handle_rate_content(vRes, body)
  }

  return res
}

async function handle_get_content(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
): Promise<LiuRqReturn<Res_GetContent>> {
  const { userData } = vRes
  const user_id = userData._id
  const content_id = body.content_id
  if(!content_id) {
    return { code: 'E4000', errMsg: 'content_id is required' }
  }

  try {
    // 内容
    const cCol = db.collection('StudyContent')
    const cRes = await cCol.where({ content_id }).get<Table_StudyContent>()
    const content = cRes.data?.[0]
    if(!content) {
      return { code: 'E4004', errMsg: 'content not found' }
    }

    // 段落
    const pCol = db.collection('StudyParagraph')
    const pRes = await pCol.where({ content_id }).orderBy('index', 'asc').get<Table_StudyParagraph>()
    const paragraphs = pRes.data ?? []

    // 单词
    const wCol = db.collection('StudyWord')
    const wRes = await wCol.where({ content_id }).get<Table_StudyWord>()
    const words = wRes.data ?? []

    // 用户评分（段落）
    const uprCol = db.collection('UserParagraphRating')
    const uprRes = await uprCol.where({ user_id, content_id }).get<Table_UserParagraphRating>()
    const uprMap = new Map<string, number>()
    for(const r of uprRes.data ?? []) {
      uprMap.set(r.paragraph_id, r.rating)
    }

    // 用户评分（单词）
    const uwrCol = db.collection('UserWordRating')
    const uwrRes = await uwrCol.where({ user_id, content_id }).get<Table_UserWordRating>()
    const uwrMap = new Map<string, number>()
    for(const r of uwrRes.data ?? []) {
      uwrMap.set(r.word_id, r.rating)
    }

    // 用户评分（文章整体听力）
    const ucrCol = db.collection('UserContentRating')
    const ucrRes = await ucrCol.where({ user_id, content_id }).get<Table_UserContentRating>()
    const contentRating = ucrRes.data?.[0]?.rating

    const data: Res_GetContent = {
      operateType: 'get-content',
      content: {
        content_id: content.content_id,
        title: content.title,
        video_provider: content.video_provider,
        video_iframe_url: content.video_iframe_url,
        audio_url: content.audio_url,
        rating: contentRating,
        paragraphs: paragraphs.map(p => ({
          paragraph_id: p.paragraph_id,
          index: p.index,
          en: p.en,
          zh: p.zh,
          audio_url: p.audio_url,
          rating: uprMap.get(p.paragraph_id),
        })),
        words: words.map(w => ({
          word_id: w.word_id,
          word: w.word,
          phonetic: w.phonetic,
          note: w.note,
          audio_url: w.audio_url,
          rating: uwrMap.get(w.word_id),
        })),
      }
    }

    return { code: '0000', data }
  } catch (err) {
    console.error('study-listen get-content error:', err)
    return { code: 'E5001', errMsg: 'database error' }
  }
}

async function handle_rate_content(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
): Promise<LiuRqReturn> {
  const { userData } = vRes
  const user_id = userData._id
  const { content_id, rating } = body
  if(!content_id) {
    return { code: 'E4000', errMsg: 'content_id is required' }
  }
  const r = Number(rating)
  if(!Number.isFinite(r) || r < 1 || r > 10) {
    return { code: 'E4000', errMsg: 'rating should be 1-10' }
  }

  try {
    const now = getNowStamp()
    const next_review_at = calcNextReview(now, r)
    const col = db.collection('UserContentRating')
    const existed = await col.where({ user_id, content_id }).get<Table_UserContentRating>()
    if(existed.data && existed.data.length > 0) {
      const _id = existed.data[0]._id
      await col.doc(_id!).update({
        user_id, content_id,
        rating: r,
        rated_at: now,
        next_review_at,
        review_algo: 'ebbinghaus',
      })
    }
    else {
      await col.add({
        user_id, content_id,
        rating: r,
        rated_at: now,
        next_review_at,
        review_algo: 'ebbinghaus',
      } as Table_UserContentRating)
    }
    return { code: '0000', data: { operateType: 'rate-content' } as any }
  } catch (err) {
    console.error('study-listen rate-content error:', err)
    return { code: 'E5001', errMsg: 'database error' }
  }
}

async function handle_rate_paragraph(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
): Promise<LiuRqReturn> {
  const { userData } = vRes
  const user_id = userData._id
  const { content_id, paragraph_id, rating } = body
  if(!content_id || !paragraph_id) {
    return { code: 'E4000', errMsg: 'content_id and paragraph_id are required' }
  }
  const r = Number(rating)
  if(!Number.isFinite(r) || r < 1 || r > 10) {
    return { code: 'E4000', errMsg: 'rating should be 1-10' }
  }

  try {
    const now = getNowStamp()
    const next_review_at = calcNextReview(now, r)
    const col = db.collection('UserParagraphRating')
    const existed = await col.where({ user_id, content_id, paragraph_id }).get<Table_UserParagraphRating>()
    if(existed.data && existed.data.length > 0) {
      const _id = existed.data[0]._id
      await col.doc(_id!).update({
        user_id, content_id, paragraph_id,
        rating: r,
        rated_at: now,
        next_review_at,
        review_algo: 'ebbinghaus',
      })
    }
    else {
      await col.add({
        user_id, content_id, paragraph_id,
        rating: r,
        rated_at: now,
        next_review_at,
        review_algo: 'ebbinghaus',
      } as Table_UserParagraphRating)
    }
    // 如果 updateOne 不可用（laf sdk 差异），fallback 用 where + update 或 add
    return { code: '0000', data: { operateType: 'rate-paragraph' } as any }
  } catch (err) {
    console.error('study-listen rate-paragraph error:', err)
    return { code: 'E5001', errMsg: 'database error' }
  }
}

async function handle_rate_word(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
): Promise<LiuRqReturn> {
  const { userData } = vRes
  const user_id = userData._id
  const { content_id, word_id, rating } = body
  if(!content_id || !word_id) {
    return { code: 'E4000', errMsg: 'content_id and word_id are required' }
  }
  const r = Number(rating)
  if(!Number.isFinite(r) || r < 1 || r > 10) {
    return { code: 'E4000', errMsg: 'rating should be 1-10' }
  }

  try {
    const now = getNowStamp()
    const next_review_at = calcNextReview(now, r)
    const col = db.collection('UserWordRating')
    const existed = await col.where({ user_id, content_id, word_id }).get<Table_UserWordRating>()
    if(existed.data && existed.data.length > 0) {
      const _id = existed.data[0]._id
      await col.doc(_id!).update({
        user_id, content_id, word_id,
        rating: r,
        rated_at: now,
        next_review_at,
        review_algo: 'ebbinghaus',
      })
    }
    else {
      await col.add({
        user_id, content_id, word_id,
        rating: r,
        rated_at: now,
        next_review_at,
        review_algo: 'ebbinghaus',
      } as Table_UserWordRating)
    }
    return { code: '0000', data: { operateType: 'rate-word' } as any }
  } catch (err) {
    console.error('study-listen rate-word error:', err)
    return { code: 'E5001', errMsg: 'database error' }
  }
}

function calcNextReview(now: number, rating: number) {
  // 简化的艾宾浩斯复习间隔（天数）
  let days = 1
  if(rating <= 3) days = 1
  else if(rating <= 6) days = 3
  else if(rating <= 8) days = 7
  else if(rating === 9) days = 14
  else days = 30
  return now + days * 24 * 60 * 60 * 1000
}


