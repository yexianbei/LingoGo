// Function Name: lingo-user-settings

import cloud from '@lafjs/cloud'
import type {
  LiuRqReturn,
  Table_User,
  Table_LingoUserSettings,
  LingoUserSettingsAPI,
  Partial_Id,
} from "@/common-types"
import { LingoUserSettingsAPI } from "@/common-types"
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
  
  if(oT === "get_settings") {
    res = await handle_get_settings(ctx, body, userData)
  }
  else if(oT === "update_settings") {
    res = await handle_update_settings(ctx, body, userData)
  }

  return res
}

/***************** 获取用户设置 ******************/
async function handle_get_settings(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoUserSettingsAPI.Res_GetSettings>> {
  
  // 1. 验证参数
  const sch = LingoUserSettingsAPI.Sch_Param_GetSettings
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  // 2. 查询用户设置
  const usCol = db.collection("LingoUserSettings")
  const settingsRes = await usCol
    .where({
      user: user._id,
      product_id: body.product_id || undefined,
    })
    .get<Table_LingoUserSettings>()
  
  let settings: Table_LingoUserSettings
  
  if(settingsRes.data.length > 0) {
    settings = settingsRes.data[0]
  } else {
    // 如果不存在，创建默认设置
    settings = await createDefaultSettings(user._id, body.product_id)
  }
  
  return {
    code: "0000",
    data: {
      operateType: "get_settings",
      settings,
    }
  }
}

/***************** 更新用户设置 ******************/
async function handle_update_settings(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoUserSettingsAPI.Res_UpdateSettings>> {
  
  // 1. 验证参数
  const sch = LingoUserSettingsAPI.Sch_Param_UpdateSettings
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const {
    native_language,
    target_language,
    ui_language,
    translation_preferences,
    spaced_repetition_config,
    audio_config,
  } = res1.output
  
  // 2. 获取或创建用户设置
  const usCol = db.collection("LingoUserSettings")
  const settingsRes = await usCol
    .where({
      user: user._id,
      product_id: body.product_id || undefined,
    })
    .get<Table_LingoUserSettings>()
  
  let settings: Table_LingoUserSettings
  
  if(settingsRes.data.length > 0) {
    settings = settingsRes.data[0]
    
    // 更新设置
    const updateData: Partial<Table_LingoUserSettings> = {
      updatedStamp: getNowStamp(),
    }
    
    if(native_language !== undefined) {
      updateData.native_language = native_language
    }
    
    if(target_language !== undefined) {
      updateData.target_language = target_language
    }
    
    if(ui_language !== undefined) {
      updateData.ui_language = ui_language
    }
    
    if(translation_preferences !== undefined) {
      updateData.translation_preferences = {
        ...settings.translation_preferences,
        ...translation_preferences,
      }
    }
    
    if(spaced_repetition_config !== undefined) {
      updateData.spaced_repetition_config = {
        ...settings.spaced_repetition_config,
        ...spaced_repetition_config,
      }
    }
    
    if(audio_config !== undefined) {
      updateData.audio_config = {
        ...settings.audio_config,
        ...audio_config,
      }
    }
    
    await usCol.doc(settings._id).update(updateData)
    
    // 获取更新后的数据
    const updatedRes = await usCol.doc(settings._id).get<Table_LingoUserSettings>()
    settings = updatedRes.data!
  } else {
    // 创建新设置
    settings = await createDefaultSettings(user._id, body.product_id)
    
    // 应用更新
    const updateData: Partial<Table_LingoUserSettings> = {
      updatedStamp: getNowStamp(),
    }
    
    if(native_language !== undefined) {
      updateData.native_language = native_language
    }
    
    if(target_language !== undefined) {
      updateData.target_language = target_language
    }
    
    if(ui_language !== undefined) {
      updateData.ui_language = ui_language
    }
    
    if(translation_preferences !== undefined) {
      updateData.translation_preferences = {
        ...settings.translation_preferences,
        ...translation_preferences,
      }
    }
    
    if(spaced_repetition_config !== undefined) {
      updateData.spaced_repetition_config = {
        ...settings.spaced_repetition_config,
        ...spaced_repetition_config,
      }
    }
    
    if(audio_config !== undefined) {
      updateData.audio_config = {
        ...settings.audio_config,
        ...audio_config,
      }
    }
    
    await usCol.doc(settings._id).update(updateData)
    
    // 获取更新后的数据
    const updatedRes = await usCol.doc(settings._id).get<Table_LingoUserSettings>()
    settings = updatedRes.data!
  }
  
  return {
    code: "0000",
    data: {
      operateType: "update_settings",
      settings,
    }
  }
}

/***************** 创建默认设置 ******************/
async function createDefaultSettings(
  userId: string,
  productId?: string,
): Promise<Table_LingoUserSettings> {
  
  const bStamp = getBasicStampWhileAdding()
  const defaultSettings: Partial_Id<Table_LingoUserSettings> = {
    ...bStamp,
    user: userId,
    product_id: productId,
    native_language: "zh-CN",
    target_language: "en-US",
    ui_language: "zh-CN",
    translation_preferences: {
      show_sentence_analysis: true,
      show_key_words: true,
      show_idiomatic_expressions: true,
      show_exercises: true,
      auto_create_flashcard: false,
    },
    spaced_repetition_config: {
      algorithm: "sm2",
      new_cards_per_day: 20,
      max_reviews_per_day: 100,
      min_ease_factor: 1.3,
      max_ease_factor: 2.5,
    },
    audio_config: {
      auto_play: false,
      playback_speed: 1.0,
      voice_gender: "neutral",
      cache_audio_locally: true,
    },
  }
  
  const usCol = db.collection("LingoUserSettings")
  const settingsId = await getDocAddId(usCol, defaultSettings)
  
  const settingsRes = await usCol.doc(settingsId).get<Table_LingoUserSettings>()
  return settingsRes.data!
}

