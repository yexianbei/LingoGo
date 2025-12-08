// Function Name: lingo-flashcard

import cloud from '@lafjs/cloud'
import type {
  LiuRqReturn,
  Table_User,
  Table_LingoFlashcard,
  Table_LingoReviewSession,
  LingoFlashcardAPI,
  Partial_Id,
} from "@/common-types"
import { LingoFlashcardAPI } from "@/common-types"
import { verifyToken } from "@/common-util"
import { getBasicStampWhileAdding, getNowStamp, DAY } from "@/common-time"
import { getDocAddId } from "@/common-util"
import * as vbot from "valibot"

const db = cloud.database()
const _ = db.command

/************************ 函数们 *************************/

export async function main(ctx: FunctionContext) {
  const body = ctx.request?.body ?? {}
  const oT = body.operateType as string

  // 验证token
  const vRes = await verifyToken(ctx, body)
  if(!vRes.pass) {
    return vRes.rqReturn
  }
  const { userData } = vRes

  let res: LiuRqReturn = { code: "E4000" }
  
  if(oT === "get_due_cards") {
    res = await handle_get_due_cards(ctx, body, userData)
  }
  else if(oT === "review_card") {
    res = await handle_review_card(ctx, body, userData)
  }
  else if(oT === "get_flashcards") {
    res = await handle_get_flashcards(ctx, body, userData)
  }
  else if(oT === "update_flashcard") {
    res = await handle_update_flashcard(ctx, body, userData)
  }

  return res
}

/***************** 获取待复习卡片 ******************/
async function handle_get_due_cards(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoFlashcardAPI.Res_GetDueCards>> {
  
  // 1. 验证参数
  const sch = LingoFlashcardAPI.Sch_Param_GetDueCards
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const { limit = 20 } = res1.output
  
  // 2. 查询待复习的卡片（next_review_date <= 当前时间）
  const now = getNowStamp()
  const fcCol = db.collection("LingoFlashcard")
  const listRes = await fcCol
    .where({
      user: user._id,
      next_review_date: _.lte(now),
      status: _.neq("mastered"),
    })
    .orderBy("next_review_date", "asc")
    .limit(limit)
    .get<Table_LingoFlashcard>()
  
  // 3. 获取总数
  const totalRes = await fcCol
    .where({
      user: user._id,
      next_review_date: _.lte(now),
      status: _.neq("mastered"),
    })
    .count()
  
  return {
    code: "0000",
    data: {
      operateType: "get_due_cards",
      cards: listRes.data,
      total: totalRes.total,
    }
  }
}

/***************** 复习卡片 ******************/
async function handle_review_card(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoFlashcardAPI.Res_ReviewCard>> {
  
  // 1. 验证参数
  const sch = LingoFlashcardAPI.Sch_Param_ReviewCard
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const {
    flashcard_id,
    result,
    response_time,
    review_type = "recall",
  } = res1.output
  
  // 2. 获取闪卡
  const fcCol = db.collection("LingoFlashcard")
  const flashcardRes = await fcCol.doc(flashcard_id).get<Table_LingoFlashcard>()
  
  if(!flashcardRes.data) {
    return { code: "E4004", errMsg: "闪卡不存在" }
  }
  
  const flashcard = flashcardRes.data
  
  // 3. 验证权限
  if(flashcard.user !== user._id) {
    return { code: "E4003", errMsg: "无权限" }
  }
  
  // 4. 更新记忆曲线（SM-2算法）
  const updatedFlashcard = updateSpacedRepetition(flashcard, result)
  
  // 5. 保存更新的闪卡
  await fcCol.doc(flashcard_id).update({
    ...updatedFlashcard,
    updatedStamp: getNowStamp(),
  })
  
  // 6. 创建复习会话记录
  const bStamp = getBasicStampWhileAdding()
  const sessionData: Partial_Id<Table_LingoReviewSession> = {
    ...bStamp,
    user: user._id,
    product_id: body.product_id,
    flashcard_id,
    translation_id: flashcard.translation_id,
    result,
    response_time,
    review_type,
    session_date: getNowStamp(),
  }
  
  const rsCol = db.collection("LingoReviewSession")
  const sessionId = await getDocAddId(rsCol, sessionData)
  
  // 7. 更新用户统计
  await updateUserStats(user._id, "reviews")
  
  return {
    code: "0000",
    data: {
      operateType: "review_card",
      flashcard: {
        ...updatedFlashcard,
        _id: flashcard_id,
      },
      review_session_id: sessionId,
    }
  }
}

/***************** 获取闪卡列表 ******************/
async function handle_get_flashcards(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoFlashcardAPI.Res_GetFlashcards>> {
  
  // 1. 验证参数
  const sch = LingoFlashcardAPI.Sch_Param_GetFlashcards
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const {
    status,
    page = 1,
    page_size = 20,
    tags,
  } = res1.output
  
  // 2. 构建查询
  const fcCol = db.collection("LingoFlashcard")
  let query = fcCol.where({
    user: user._id,
  })
  
  if(status) {
    query = query.where({
      status,
    })
  }
  
  if(tags && tags.length > 0) {
    query = query.where({
      tags: _.in(tags),
    })
  }
  
  // 3. 获取总数
  const totalRes = await query.count()
  const total = totalRes.total
  
  // 4. 分页查询
  const skip = (page - 1) * page_size
  const listRes = await query
    .orderBy("insertedStamp", "desc")
    .skip(skip)
    .limit(page_size)
    .get<Table_LingoFlashcard>()
  
  return {
    code: "0000",
    data: {
      operateType: "get_flashcards",
      flashcards: listRes.data,
      total,
    }
  }
}

/***************** 更新闪卡 ******************/
async function handle_update_flashcard(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoFlashcardAPI.Res_UpdateFlashcard>> {
  
  // 1. 验证参数
  const sch = LingoFlashcardAPI.Sch_Param_UpdateFlashcard
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const { flashcard_id, notes, tags, difficulty } = res1.output
  
  // 2. 验证闪卡是否存在且属于当前用户
  const fcCol = db.collection("LingoFlashcard")
  const flashcardRes = await fcCol.doc(flashcard_id).get<Table_LingoFlashcard>()
  
  if(!flashcardRes.data) {
    return { code: "E4004", errMsg: "闪卡不存在" }
  }
  
  if(flashcardRes.data.user !== user._id) {
    return { code: "E4003", errMsg: "无权限更新" }
  }
  
  // 3. 更新闪卡
  const updateData: Partial<Table_LingoFlashcard> = {
    updatedStamp: getNowStamp(),
  }
  
  if(notes !== undefined) {
    updateData.notes = notes
  }
  
  if(tags !== undefined) {
    updateData.tags = tags
  }
  
  if(difficulty !== undefined) {
    updateData.difficulty = difficulty
  }
  
  await fcCol.doc(flashcard_id).update(updateData)
  
  // 4. 获取更新后的数据
  const updatedRes = await fcCol.doc(flashcard_id).get<Table_LingoFlashcard>()
  
  return {
    code: "0000",
    data: {
      operateType: "update_flashcard",
      flashcard: updatedRes.data!,
    }
  }
}

/***************** 更新记忆曲线（SM-2算法） ******************/
function updateSpacedRepetition(
  flashcard: Table_LingoFlashcard,
  result: "correct" | "incorrect" | "easy" | "hard",
): Partial<Table_LingoFlashcard> {
  
  let {
    ease_factor,
    interval,
    repetitions,
    correct_count,
    incorrect_count,
    review_count,
    status,
    streak_days,
    last_streak_date,
  } = flashcard
  
  const now = getNowStamp()
  const isCorrect = result === "correct" || result === "easy"
  
  // 更新统计
  review_count += 1
  if(isCorrect) {
    correct_count += 1
  } else {
    incorrect_count += 1
  }
  
  // SM-2算法
  if(result === "incorrect") {
    // 答错了，重置
    repetitions = 0
    interval = 1
    ease_factor = Math.max(1.3, ease_factor - 0.2)
    status = "learning"
  } else {
    // 答对了
    if(repetitions === 0) {
      interval = 1
    } else if(repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * ease_factor)
    }
    
    repetitions += 1
    
    if(result === "easy") {
      ease_factor = Math.min(2.5, ease_factor + 0.15)
    } else if(result === "hard") {
      ease_factor = Math.max(1.3, ease_factor - 0.15)
    }
    
    if(repetitions >= 3) {
      status = "reviewing"
    }
    
    if(repetitions >= 10 && correct_count / review_count >= 0.9) {
      status = "mastered"
    }
  }
  
  // 计算下次复习时间
  const next_review_date = now + interval * DAY
  
  // 更新连续学习天数
  const today = Math.floor(now / DAY) * DAY
  const lastDate = last_streak_date ? Math.floor(last_streak_date / DAY) * DAY : 0
  
  if(today !== lastDate) {
    if(today === lastDate + DAY) {
      // 连续
      streak_days += 1
    } else {
      // 中断了
      streak_days = 1
    }
    last_streak_date = today
  }
  
  return {
    ease_factor,
    interval,
    repetitions,
    next_review_date,
    correct_count,
    incorrect_count,
    review_count,
    status,
    streak_days,
    last_streak_date,
    last_review_stamp: now,
  }
}

/***************** 更新用户统计 ******************/
async function updateUserStats(
  userId: string,
  statType: "translations" | "favorites" | "flashcards" | "reviews",
) {
  const uCol = db.collection("User")
  const statField = `lingo_stats.total_${statType}`
  
  await uCol.doc(userId).update({
    [statField]: _.inc(1),
    updatedStamp: getNowStamp(),
  })
}

