// Function Name: lingo-audio

import cloud from '@lafjs/cloud'
import type {
  LiuRqReturn,
  Table_User,
  Table_LingoAudioCache,
  LingoAudioAPI,
  Partial_Id,
} from "@/common-types"
import { LingoAudioAPI } from "@/common-types"
import { verifyToken } from "@/common-util"
import { getBasicStampWhileAdding, getNowStamp, DAY } from "@/common-time"
import { getDocAddId } from "@/common-util"
import * as vbot from "valibot"
import { createHash } from "crypto"
import { TextToSpeech } from "@/ai-shared"

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
  
  if(oT === "generate_audio") {
    res = await handle_generate_audio(ctx, body, userData)
  }
  else if(oT === "get_audio_batch") {
    res = await handle_get_audio_batch(ctx, body, userData)
  }

  return res
}

/***************** 生成音频 ******************/
async function handle_generate_audio(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoAudioAPI.Res_GenerateAudio>> {
  
  // 1. 验证参数
  const sch = LingoAudioAPI.Sch_Param_GenerateAudio
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const {
    text,
    language,
    audio_type,
    voice_gender = "neutral",
    speed = 1.0,
  } = res1.output
  
  // 2. 生成缓存键
  const cacheKey = generateAudioCacheKey(text, language, audio_type, {
    gender: voice_gender,
    speed,
  })
  
  // 3. 检查缓存
  const acCol = db.collection("LingoAudioCache")
  const cacheRes = await acCol.where({ cache_key: cacheKey }).get<Table_LingoAudioCache>()
  
  if(cacheRes.data.length > 0) {
    const cached = cacheRes.data[0]
    
    // 更新访问统计
    await acCol.doc(cached._id).update({
      access_count: _.inc(1),
      last_access_stamp: getNowStamp(),
      updatedStamp: getNowStamp(),
    })
    
    return {
      code: "0000",
      data: {
        operateType: "generate_audio",
        audio_url: cached.audio_url,
        cache_key: cacheKey,
        duration: cached.audio_duration,
        from_cache: true,
      }
    }
  }
  
  // 4. 生成新音频
  // TODO: 实现TTS生成逻辑
  // 这里需要使用TextToSpeech服务
  const audioUrl = await generateTTS(text, language, {
    gender: voice_gender,
    speed,
  })
  
  if(!audioUrl) {
    return { code: "E5001", errMsg: "音频生成失败" }
  }
  
  // 5. 保存到缓存
  const bStamp = getBasicStampWhileAdding()
  const cacheData: Partial_Id<Table_LingoAudioCache> = {
    ...bStamp,
    cache_key: cacheKey,
    text,
    language,
    audio_type,
    audio_url: audioUrl,
    audio_duration: 0, // TODO: 获取实际时长
    file_size: 0, // TODO: 获取实际文件大小
    tts_provider: "openai", // TODO: 从配置获取
    tts_voice: voice_gender,
    tts_speed: speed,
    access_count: 1,
    last_access_stamp: getNowStamp(),
    expire_stamp: getNowStamp() + DAY * 90, // 90天后过期
  }
  
  const cacheId = await getDocAddId(acCol, cacheData)
  
  return {
    code: "0000",
    data: {
      operateType: "generate_audio",
      audio_url: audioUrl,
      cache_key: cacheKey,
      duration: cacheData.audio_duration,
      from_cache: false,
    }
  }
}

/***************** 批量获取音频 ******************/
async function handle_get_audio_batch(
  ctx: FunctionContext,
  body: Record<string, any>,
  user: Table_User,
): Promise<LiuRqReturn<LingoAudioAPI.Res_GetAudioBatch>> {
  
  // 1. 验证参数
  const sch = LingoAudioAPI.Sch_Param_GetAudioBatch
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    return { code: "E4000", errMsg: "参数验证失败" }
  }
  
  const { requests } = res1.output
  
  // 2. 批量处理
  const results = await Promise.all(
    requests.map(async (req: {
      text: string
      language: string
      audio_type: "word" | "sentence"
    }) => {
      const cacheKey = generateAudioCacheKey(
        req.text,
        req.language,
        req.audio_type,
      )
      
      // 检查缓存
      const acCol = db.collection("LingoAudioCache")
      const cacheRes = await acCol.where({ cache_key: cacheKey }).get<Table_LingoAudioCache>()
      
      if(cacheRes.data.length > 0) {
        const cached = cacheRes.data[0]
        
        // 更新访问统计
        await acCol.doc(cached._id).update({
          access_count: _.inc(1),
          last_access_stamp: getNowStamp(),
          updatedStamp: getNowStamp(),
        })
        
        return {
          text: req.text,
          audio_url: cached.audio_url,
          cache_key: cacheKey,
          duration: cached.audio_duration,
          from_cache: true,
        }
      }
      
      // 生成新音频
      const audioUrl = await generateTTS(req.text, req.language, {})
      
      if(audioUrl) {
        // 保存到缓存
        const bStamp = getBasicStampWhileAdding()
        const cacheData: Partial_Id<Table_LingoAudioCache> = {
          ...bStamp,
          cache_key: cacheKey,
          text: req.text,
          language: req.language,
          audio_type: req.audio_type,
          audio_url: audioUrl,
          audio_duration: 0,
          file_size: 0,
          access_count: 1,
          last_access_stamp: getNowStamp(),
          expire_stamp: getNowStamp() + DAY * 90,
        }
        
        await getDocAddId(acCol, cacheData)
        
        return {
          text: req.text,
          audio_url: audioUrl,
          cache_key: cacheKey,
          duration: 0,
          from_cache: false,
        }
      }
      
      return {
        text: req.text,
        audio_url: "",
        cache_key: cacheKey,
        duration: 0,
        from_cache: false,
      }
    })
  )
  
  return {
    code: "0000",
    data: {
      operateType: "get_audio_batch",
      audios: results,
    }
  }
}

/***************** 生成音频缓存键 ******************/
function generateAudioCacheKey(
  text: string,
  language: string,
  audio_type: "word" | "sentence",
  voice_config?: { gender?: string; speed?: number },
): string {
  const normalizedText = text.toLowerCase().trim()
  const configStr = JSON.stringify(voice_config || {})
  const hashInput = `${normalizedText}_${language}_${audio_type}_${configStr}`
  const hash = createHash("sha256").update(hashInput).digest("hex").substring(0, 16)
  return `${language}_${audio_type}_${hash}`
}

/***************** 生成TTS音频 ******************/
async function generateTTS(
  text: string,
  language: string,
  config: { gender?: string; speed?: number },
): Promise<string | undefined> {
  // TODO: 实现TTS生成逻辑
  // 可以使用OpenAI TTS API或其他TTS服务
  // 返回音频文件的URL
  
  try {
    // 示例：使用TextToSpeech类
    // const tts = new TextToSpeech()
    // const audioUrl = await tts.generate(text, language, config)
    // return audioUrl
    
    return undefined
  } catch (error) {
    console.error("TTS生成失败:", error)
    return undefined
  }
}

