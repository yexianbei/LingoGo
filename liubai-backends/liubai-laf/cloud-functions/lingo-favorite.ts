// Function Name: lingo-favorite

import cloud from '@lafjs/cloud'
import type {
  LiuRqReturn,
  Table_User,
  Table_LingoFavorite,
  Table_LingoFlashcard,
  LingoFavoriteAPI,
  Partial_Id,
} from "@/common-types"
import { LingoFavoriteAPI } from "@/common-types"
import { verifyToken } from "@/common-util"
import { getBasicStampWhileAdding, getNowStamp } from "@/common-time"
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
  
  if(oT === "create_favorite") {
    res = await handle_create_favorite(ctx, body, userData)
  }
  else if(oT === "get_favorites") {
    res = await handle_get_favorites(ctx, body, userData)
  }
  else if(oT === "delete_favorite") {
    res = await handle_delete_favorite(ctx, body, userData)
  }
  else if(oT === "update_favorite") {
    res = await handle_update_favorite(ctx, body, userData)
  }

  return res
}

/***************** 创建收藏 ******************/
async function handle_create_favorite(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoFavoriteAPI.Res_CreateFavorite>> {
  
  // 1. 验证参数
  const sch = LingoFavoriteAPI.Sch_Param_CreateFavorite
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const {
    translation_id,
    favorite_type,
    content,
    notes,
    tags,
    auto_create_flashcard = false,
  } = res1.output
  
  // 2. 验证翻译记录是否存在
  const tCol = db.collection("LingoTranslation")
  const translationRes = await tCol.doc(translation_id).get()
  if(!translationRes.data) {
    return { code: "E4004", errMsg: "翻译记录不存在" }
  }
  
  // 3. 创建收藏记录
  const bStamp = getBasicStampWhileAdding()
  const favoriteData: Partial_Id<Table_LingoFavorite> = {
    ...bStamp,
    user: user._id,
    product_id: body.product_id,
    favorite_type,
    translation_id,
    content,
    notes,
    tags,
  }
  
  const fCol = db.collection("LingoFavorite")
  const favoriteId = await getDocAddId(fCol, favoriteData)
  
  // 4. 如果设置了自动创建闪卡，则创建闪卡
  let flashcardId: string | undefined
  if(auto_create_flashcard) {
    flashcardId = await createFlashcardFromFavorite(
      user._id,
      favoriteId,
      translation_id,
      favorite_type,
      content,
      body.product_id,
    )
  }
  
  // 5. 更新用户统计
  await updateUserStats(user._id, "favorites")
  
  return {
    code: "0000",
    data: {
      operateType: "create_favorite",
      favorite_id: favoriteId,
      flashcard_id: flashcardId,
    }
  }
}

/***************** 获取收藏列表 ******************/
async function handle_get_favorites(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoFavoriteAPI.Res_GetFavorites>> {
  
  // 1. 验证参数
  const sch = LingoFavoriteAPI.Sch_Param_GetFavorites
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const {
    favorite_type,
    page = 1,
    page_size = 20,
    tags,
  } = res1.output
  
  // 2. 构建查询
  const fCol = db.collection("LingoFavorite")
  let query = fCol.where({
    user: user._id,
  })
  
  if(favorite_type) {
    query = query.where({
      favorite_type,
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
    .get<Table_LingoFavorite>()
  
  return {
    code: "0000",
    data: {
      operateType: "get_favorites",
      favorites: listRes.data,
      total,
    }
  }
}

/***************** 删除收藏 ******************/
async function handle_delete_favorite(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoFavoriteAPI.Res_DeleteFavorite>> {
  
  // 1. 验证参数
  const sch = LingoFavoriteAPI.Sch_Param_DeleteFavorite
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const { favorite_id } = res1.output
  
  // 2. 验证收藏是否存在且属于当前用户
  const fCol = db.collection("LingoFavorite")
  const favoriteRes = await fCol.doc(favorite_id).get<Table_LingoFavorite>()
  
  if(!favoriteRes.data) {
    return { code: "E4004", errMsg: "收藏不存在" }
  }
  
  if(favoriteRes.data.user !== user._id) {
    return { code: "E4003", errMsg: "无权限删除" }
  }
  
  // 3. 删除收藏
  await fCol.doc(favorite_id).remove()
  
  return {
    code: "0000",
    data: {
      operateType: "delete_favorite",
    }
  }
}

/***************** 更新收藏 ******************/
async function handle_update_favorite(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoFavoriteAPI.Res_UpdateFavorite>> {
  
  // 1. 验证参数
  const sch = LingoFavoriteAPI.Sch_Param_UpdateFavorite
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const { favorite_id, notes, tags } = res1.output
  
  // 2. 验证收藏是否存在且属于当前用户
  const fCol = db.collection("LingoFavorite")
  const favoriteRes = await fCol.doc(favorite_id).get<Table_LingoFavorite>()
  
  if(!favoriteRes.data) {
    return { code: "E4004", errMsg: "收藏不存在" }
  }
  
  if(favoriteRes.data.user !== user._id) {
    return { code: "E4003", errMsg: "无权限更新" }
  }
  
  // 3. 更新收藏
  const updateData: Partial<Table_LingoFavorite> = {
    updatedStamp: getNowStamp(),
  }
  
  if(notes !== undefined) {
    updateData.notes = notes
  }
  
  if(tags !== undefined) {
    updateData.tags = tags
  }
  
  await fCol.doc(favorite_id).update(updateData)
  
  // 4. 获取更新后的数据
  const updatedRes = await fCol.doc(favorite_id).get<Table_LingoFavorite>()
  
  return {
    code: "0000",
    data: {
      operateType: "update_favorite",
      favorite: updatedRes.data!,
    }
  }
}

/***************** 从收藏创建闪卡 ******************/
async function createFlashcardFromFavorite(
  userId: string,
  favoriteId: string,
  translationId: string,
  favoriteType: "sentence" | "example" | "word" | "expression",
  content: Table_LingoFavorite["content"],
  productId?: string,
): Promise<string> {
  
  // TODO: 实现从收藏创建闪卡的逻辑
  // 这里需要根据favoriteType和content来构建front_content和back_content
  
  const bStamp = getBasicStampWhileAdding()
  const now = getNowStamp()
  
  const flashcardData: Partial_Id<Table_LingoFlashcard> = {
    ...bStamp,
    user: userId,
    product_id: productId,
    favorite_id: favoriteId,
    translation_id: translationId,
    card_type: favoriteType,
    front_content: {
      text: "",
    },
    back_content: {
      text: "",
    },
    ease_factor: 2.5,
    interval: 1,
    repetitions: 0,
    next_review_date: now,
    status: "learning",
    review_count: 0,
    correct_count: 0,
    incorrect_count: 0,
    streak_days: 0,
  }
  
  const fcCol = db.collection("LingoFlashcard")
  const flashcardId = await getDocAddId(fcCol, flashcardData)
  
  return flashcardId
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

