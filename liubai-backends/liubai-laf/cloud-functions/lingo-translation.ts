// Function Name: lingo-translation

import cloud from '@lafjs/cloud'
import type {
  LiuRqReturn,
  Table_User,
  Table_LingoTranslation,
  LingoTranslationDetail,
  LingoTranslationAPI,
  Partial_Id,
} from "@/common-types"
import { LingoTranslationAPI } from "@/common-types"
import { verifyToken } from "@/common-util"
import { getBasicStampWhileAdding, getNowStamp } from "@/common-time"
import { getDocAddId } from "@/common-util"
import * as vbot from "valibot"
import { Translator } from "@/ai-shared"
import { aiBots } from "@/ai-prompt"

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
  
  if(oT === "translate") {
    res = await handle_translate(ctx, body, userData)
  }
  else if(oT === "get_translation_history") {
    res = await handle_get_translation_history(ctx, body, userData)
  }
  else if(oT === "get_translation") {
    res = await handle_get_translation(ctx, body, userData)
  }

  return res
}

/***************** 翻译文本 ******************/
async function handle_translate(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoTranslationAPI.Res_Translate>> {
  
  // 1. 验证参数
  const sch = LingoTranslationAPI.Sch_Param_Translate
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const {
    source_text,
    native_language,
    target_language,
    generate_audio = false,
  } = res1.output
  
  // 2. 调用AI进行翻译（这里需要实现详细的翻译逻辑）
  // TODO: 实现AI翻译逻辑，生成translation_detail
  const translation_detail: LingoTranslationDetail = {
    complete_sentence: "",
    sentence_analysis: {},
    key_words: [],
    idiomatic_expressions: [],
    exercises: [],
  }
  
  // 临时：使用简单的翻译器
  const translator = new Translator()
  const translateResult = await translator.run(source_text)
  const target_text = translateResult?.translatedText || ""
  
  // 3. 生成音频（如果需要）
  let sentence_audio_url: string | undefined
  let sentence_audio_duration: number | undefined
  let word_audio_urls: Record<string, string> | undefined
  
  if(generate_audio) {
    // TODO: 实现音频生成逻辑
  }
  
  // 4. 保存翻译记录
  const bStamp = getBasicStampWhileAdding()
  const translationData: Partial_Id<Table_LingoTranslation> = {
    ...bStamp,
    user: user._id,
    product_id: body.product_id,
    native_language,
    target_language,
    source_text,
    target_text,
    translation_detail,
    sentence_audio_url,
    sentence_audio_duration,
    view_count: 0,
    practice_count: 0,
  }
  
  const tCol = db.collection("LingoTranslation")
  const translationId = await getDocAddId(tCol, translationData)
  
  // 5. 更新用户统计
  await updateUserStats(user._id, "translations")
  
  return {
    code: "0000",
    data: {
      operateType: "translate",
      translation_id: translationId,
      source_text,
      target_text,
      translation_detail,
      sentence_audio_url,
      word_audio_urls,
    }
  }
}

/***************** 获取翻译历史 ******************/
async function handle_get_translation_history(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoTranslationAPI.Res_GetTranslationHistory>> {
  
  // 1. 验证参数
  const sch = LingoTranslationAPI.Sch_Param_GetTranslationHistory
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const {
    page = 1,
    page_size = 20,
    start_date,
    end_date,
  } = res1.output
  
  // 2. 构建查询
  const tCol = db.collection("LingoTranslation")
  let query = tCol.where({
    user: user._id,
  })
  
  if(start_date) {
    query = query.where({
      insertedStamp: _.gte(start_date)
    })
  }
  
  if(end_date) {
    query = query.where({
      insertedStamp: _.lte(end_date)
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
    .get<Table_LingoTranslation>()
  
  return {
    code: "0000",
    data: {
      operateType: "get_translation_history",
      translations: listRes.data,
      total,
      page,
      page_size,
    }
  }
}

/***************** 获取单个翻译 ******************/
async function handle_get_translation(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoTranslationAPI.Res_GetTranslation>> {
  
  // 1. 验证参数
  const sch = LingoTranslationAPI.Sch_Param_GetTranslation
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const { translation_id } = res1.output
  
  // 2. 查询翻译记录
  const tCol = db.collection("LingoTranslation")
  const docRes = await tCol.doc(translation_id).get<Table_LingoTranslation>()
  
  if(!docRes.data) {
    return { code: "E4004", errMsg: "翻译记录不存在" }
  }
  
  const translation = docRes.data
  
  // 3. 验证权限（只能查看自己的翻译）
  if(translation.user !== user._id) {
    return { code: "E4003", errMsg: "无权限访问" }
  }
  
  // 4. 更新查看次数
  await tCol.doc(translation_id).update({
    view_count: _.inc(1),
    updatedStamp: getNowStamp(),
  })
  
  return {
    code: "0000",
    data: {
      operateType: "get_translation",
      translation: {
        ...translation,
        view_count: translation.view_count + 1,
      }
    }
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

