// Function Name: webhook-wechat
// Receive messages and events from WeChat subscription servers

import cloud from "@lafjs/cloud";
import * as crypto from "crypto";
import type { 
  LiuAi,
  LiuErrReturn, 
  LiuRqReturn,
  Ns_FFmpeg,
  Table_Credential,
  Table_Member,
  Table_User,
  UserThirdData,
  UserWeChatGzh,
  Wx_Gzh_Auth_Change,
  Wx_Gzh_Click,
  Wx_Gzh_Image,
  Wx_Gzh_Link,
  Wx_Gzh_Location,
  Wx_Gzh_Msg_Event, 
  Wx_Gzh_Scan, 
  Wx_Gzh_Send_Msg, 
  Wx_Gzh_Subscribe, 
  Wx_Gzh_Text, 
  Wx_Gzh_Unsubscribe,
  Wx_Gzh_Video,
  Wx_Gzh_Voice,
  Wx_Res_GzhUserInfo, 
} from "@/common-types";
import { decrypt } from "@wecom/crypto"
import xml2js from "xml2js"
import {
  getNowStamp, 
  isWithinMillis,
  MINUTE,
} from "@/common-time"
import { 
  getAccountName,
  checkAndGetWxGzhAccessToken,
  updateUserInCache,
  tagWxUserLang,
  getWxGzhUserInfo,
  valTool,
  liuReq,
  checkIfUserSubscribed,
  LiuDateUtil,
} from "@/common-util";
import {
  useI18n, 
  i18nFill,
  wechatLang,
  wxClickReplies,
  wxTextRepliesItems,
} from "@/common-i18n";
import { createCredential2 } from "@/common-ids";
import { init_user } from "@/user-login";
import { WxGzhSender } from "@/service-send";
import { get_into_ai } from "@/ai-entrance";
import { findMenuButtonByKey } from "@/menu-manage";

const db = cloud.database()
const _ = db.command
let wechat_access_token = ""

/***************************** constants **************************/

// 1 MB
const MB = 1024 * 1024
// how many accounts can be bound to one wechat gzh openid
const MAX_ACCOUNTS_TO_BIND = 2
// download temp media from wx gzh
const API_MEDIA_DOWNLOAD = "https://api.weixin.qq.com/cgi-bin/media/get"

/***************************** types **************************/
type MsgMode = "plain_text" | "safe"

/***************************** main **************************/
export async function main(ctx: FunctionContext) {
  const res = await turnInputIntoMsgObj(ctx)
  if(typeof res === "string") {
    return res
  }
  const { data: msgObj, code } = res
  if(code !== "0000" || !msgObj) {
    return res
  }

  // console.log(msgObj)

  const { MsgType, FromUserName } = msgObj
  if(!FromUserName) {
    console.warn("no wx_gzh_openid!")
    return ""
  }

  if(MsgType === "text") {
    handle_text(msgObj)
  }
  else if(MsgType === "image") {
    handle_image(msgObj)
  }
  else if(MsgType === "voice") {
    handle_voice(msgObj)
  }
  else if(MsgType === "video") {
    handle_video(msgObj)
  }
  else if(MsgType === "location") {
    handle_location(msgObj)
  }
  else if(MsgType === "link") {
    handle_link(msgObj)
  }
  else if(MsgType === "event") {
    const { Event } = msgObj
    if(Event === "subscribe") {
      handle_subscribe(msgObj)
    }
    else if(Event === "SCAN") {
      handle_scan(msgObj)
    }
    else if(Event === "unsubscribe") {
      handle_unsubscribe(msgObj)
    }
    else if(Event === "CLICK") {
      handle_click(msgObj)
    }
    else if(Event === "user_authorization_revoke") {
      user_authorization_revoke(msgObj)
    }
  }
  
  // respond with empty string, and then wechat will not retry
  return ""
}

async function user_authorization_revoke(
  msgObj: Wx_Gzh_Auth_Change,
) {
  const wx_gzh_openid = msgObj.OpenID

  // 0. define functions where we update user and cache
  const uCol = db.collection("User")
  const _updateUser = async (user: Table_User) => {
    // 0.1 check if updating is required
    const wx_gzh = user.thirdData?.wx_gzh
    if(!wx_gzh) return

    let needUpdate = false
    if(wx_gzh.headimgurl) {
      needUpdate = true
      delete wx_gzh.headimgurl
    }
    if(wx_gzh.nickname) {
      needUpdate = true
      delete wx_gzh.nickname
    }
    if(!needUpdate) return true

    // 0.2 update user
    const userId = user._id
    const now = getNowStamp()
    const u3 = {
      "thirdData.wx_gzh": _.set(wx_gzh),
      "updatedStamp": now,
    }
    const res3 = await uCol.doc(userId).update(u3)

    // 0.3 update cache
    const thirdData = user.thirdData ?? {}
    thirdData.wx_gzh = wx_gzh
    user.thirdData = thirdData
    user.updatedStamp = now
    updateUserInCache(userId, user)
  }

  // 1. get the user
  const q1 = uCol.where({ wx_gzh_openid }).orderBy("insertedStamp", "desc")
  const res1 = await q1.get<Table_User>()
  const list1 = res1.data
  const len1 = list1.length
  if(len1 < 1) return

  // 2. to update
  for(let i = 0; i < len1; i++) {
    const user = list1[i]
    if(i > (MAX_ACCOUNTS_TO_BIND - 1)) break
    await _updateUser(user)
  }

  return true
}


async function handle_click(
  msgObj: Wx_Gzh_Click,
) {

  // 1. get params
  const { EventKey, FromUserName: wx_gzh_openid } = msgObj
  if(!EventKey) return false

  // 2. try to get menu button config from database first
  const menuButton = await findMenuButtonByKey(EventKey)
  if(menuButton?.eventHandler?.enabled) {
    return await handleClickWithDynamicConfig(menuButton, wx_gzh_openid)
  }

  // 3. fallback to static config for backward compatibility
  return await handleClickWithStaticConfig(EventKey, wx_gzh_openid)
}

/**
 * 使用动态配置处理菜单点击事件
 */
async function handleClickWithDynamicConfig(
  menuButton: any,
  wx_gzh_openid: string,
): Promise<boolean> {
  const { eventHandler } = menuButton
  if(!eventHandler) return false

  const { handlerType } = eventHandler

  try {
    switch(handlerType) {
      case "reply_text":
        return await handleTextReply(wx_gzh_openid, eventHandler.replyText || [])
        
      case "reply_image":
        return await handleImageReply(wx_gzh_openid, eventHandler.replyImage || [])
        
      case "ai_assistant":
        return await handleAiAssistant(wx_gzh_openid, eventHandler.aiConfig)
        
      case "reply_custom":
        return await handleCustomReply(wx_gzh_openid, eventHandler.customHandler)
        
      default:
        console.warn(`Unknown handler type: ${handlerType}`)
        return false
    }
  } catch(err) {
    console.error("Error in handleClickWithDynamicConfig:", err)
    return false
  }
}

/**
 * 使用静态配置处理菜单点击事件（向后兼容）
 */
async function handleClickWithStaticConfig(
  EventKey: string, 
  wx_gzh_openid: string
): Promise<boolean> {
  // 2. get replies and the domain
  const replies = wxClickReplies[EventKey]
  if(!replies || replies.length < 1) return false
  const _env = process.env
  const contactMediaId = _env.LIU_WX_GZ_MEDIA_ID_FOR_CONTACT ?? ""
  
  // 3. reply
  for(let i = 0; i < replies.length; i++) {
    const v = replies[i]
    const obj = valTool.copyObject(v)
    const msgtype = obj.msgtype
    if(msgtype === "text") {
      const str1 = obj.text.content 
      obj.text.content = i18nFill(str1, {})
    }

    if(msgtype === "image") {
      const str2_1 = obj.image.media_id
      const str2_2 = i18nFill(str2_1, {
        LIU_WX_GZ_MEDIA_ID_FOR_CONTACT: contactMediaId,
      })
      if(!str2_2) continue
      obj.image.media_id = str2_2
    }

    await sendObject(wx_gzh_openid, obj)
  }

  return true
}

/**
 * 处理文本回复
 */
async function handleTextReply(
  wx_gzh_openid: string, 
  replyTexts: string[]
): Promise<boolean> {
  if(!replyTexts || replyTexts.length === 0) return false

  for(const text of replyTexts) {
    const processedText = i18nFill(text, {})
    await sendText(wx_gzh_openid, processedText)
    
    // 添加延迟避免发送过快
    if(replyTexts.length > 1) {
      await valTool.waitMilli(500)
    }
  }

  return true
}

/**
 * 处理图片回复
 */
async function handleImageReply(
  wx_gzh_openid: string, 
  replyImages: any[]
): Promise<boolean> {
  if(!replyImages || replyImages.length === 0) return false

  for(const imageConfig of replyImages) {
    const obj = {
      msgtype: "image" as const,
      image: {
        media_id: imageConfig.media_id
      }
    }
    
    await sendObject(wx_gzh_openid, obj)
    
    // 添加延迟避免发送过快
    if(replyImages.length > 1) {
      await valTool.waitMilli(500)
    }
  }

  return true
}

/**
 * 处理AI助手回复
 */
async function handleAiAssistant(
  wx_gzh_openid: string, 
  aiConfig?: any
): Promise<boolean> {
  // 获取用户信息
  const user = await getUserByWxGzhOpenid(wx_gzh_openid)
  if(!user) return false

  // 构造AI入口参数
  const aiPrompt = aiConfig?.prompt || "用户点击了菜单"
  
  // 调用AI系统
  get_into_ai({ 
    user, 
    msg_type: "text", 
    text: aiPrompt, 
    wx_gzh_openid
  })

  return true
}

/**
 * 处理自定义回复
 */
async function handleCustomReply(
  wx_gzh_openid: string, 
  customHandler?: string
): Promise<boolean> {
  if(!customHandler) return false

  // 这里可以根据 customHandler 名称调用不同的自定义函数
  // 例如：membership_info, special_promotion 等
  
  switch(customHandler) {
    case "membership_info":
      const user = await getUserByWxGzhOpenid(wx_gzh_openid)
      if(user) {
        sendMemberInfo(wx_gzh_openid, user)
        return true
      }
      break
      
    default:
      console.warn(`Unknown custom handler: ${customHandler}`)
      return false
  }

  return false
}

async function handle_text(
  msgObj: Wx_Gzh_Text,
) {
  // 1. get openid
  const wx_gzh_openid = msgObj.FromUserName

  // 2. check if we get to auto-reply
  const userText = msgObj.Content
  const trimText = userText.trim()
  const res2 = await autoReplyAfterReceivingText(wx_gzh_openid, trimText)
  if(res2) return

  // 3. get user
  const user = await getUserByWxGzhOpenid(wx_gzh_openid)
  if(!user) return

  // 4. dynamic auto reply
  const res4 = autoDynamicReply(wx_gzh_openid, trimText, user)
  if(res4) return

  // 5. ai!
  get_into_ai({ user, msg_type: "text", text: userText, wx_gzh_openid })
}

async function handle_image(
  msgObj: Wx_Gzh_Image,
) {
  // 1. get params
  const wx_gzh_openid = msgObj.FromUserName
  const wx_media_id = msgObj.MediaId
  const image_url = msgObj.PicUrl

  // 3. get user
  const user = await getUserByWxGzhOpenid(wx_gzh_openid)
  if(!user) return

  // 4. get to ai system
  get_into_ai({ 
    user, 
    msg_type: "image", 
    image_url, 
    wx_media_id, 
    wx_gzh_openid,
  })
}

async function handle_voice(
  msgObj: Wx_Gzh_Voice,
) {
  // 1. get params
  const wx_gzh_openid = msgObj.FromUserName
  const wx_media_id = msgObj.MediaId
  const wx_media_id_16k = msgObj.MediaId16K
  const _env = process.env
  const ffmpegDomain = _env.LIU_FFMPEG_BASEURL
  if(!ffmpegDomain) {
    console.warn("there is no ffmpeg domain")
    return
  }

  // 3. get user
  const user = await getUserByWxGzhOpenid(wx_gzh_openid)
  if(!user) return

  // 4. get voice link
  const amrUrl = await getVoiceLink(wx_media_id_16k ?? wx_media_id)
  if(!amrUrl) {
    console.warn("we cannot get amrUrl")
    return
  }
  const amrId = String(getNowStamp())

  // 5. my amr to mp3 service
  const url5 = new URL(`${ffmpegDomain}/new`)
  const sP5 = url5.searchParams
  sP5.set("id", amrId)
  sP5.set("url", amrUrl)
  const link5 = url5.toString()

  let data5: LiuRqReturn<Ns_FFmpeg.Res_ArmToMp3> | undefined
  try {
    const res5 = await liuReq<LiuRqReturn<Ns_FFmpeg.Res_ArmToMp3>>(
      link5, 
      undefined, 
      { method: "GET" },
    )
    data5 = res5?.data
  }
  catch(err) {
    console.warn("my amr to mp3 service fails")
    console.log(err)
  }

  // 6. handle the result of tranform
  if(!data5) return
  const mp3Path = data5.data?.mp3Path
  if(!mp3Path) return
  const audio_url = `${ffmpegDomain}${mp3Path}`
  console.log("let me see mp3 url: ")
  console.log(audio_url)

  // 7. get to ai system
  get_into_ai({
    user,
    msg_type: "voice",
    audio_url,
    wx_media_id,
    wx_media_id_16k,
    wx_gzh_openid,
  })

}

async function handle_video(
  msgObj: Wx_Gzh_Video,
) {
  // 1. get openid
  const wx_gzh_openid = msgObj.FromUserName

  // 2. send unsupported message
  const msg = _getUnsupportedMsg("video_unsupported")
  sendText(wx_gzh_openid, msg)
}

async function  handle_location(
  msgObj: Wx_Gzh_Location,
) {
  // 1. get openid
  const wx_gzh_openid = msgObj.FromUserName
  const user = await getUserByWxGzhOpenid(wx_gzh_openid)
  if(!user) return

  // 2. package data
  const atom: LiuAi.LocationAtom = {
    latitude: msgObj.Location_X,
    longitude: msgObj.Location_Y,
    scale: msgObj.Scale,
    description: msgObj.Label,
    format: "gcj02",
  }

  // 3. get to ai system
  get_into_ai({
    user,
    msg_type: "location",
    location: atom,
    wx_gzh_openid,
  })
}

async function handle_link(
  msgObj: Wx_Gzh_Link,
) {
  // 1. get openid
  const wx_gzh_openid = msgObj.FromUserName

  // 2. send unsupported message
  const msg = _getUnsupportedMsg("link_unsupported")
  sendText(wx_gzh_openid, msg)
}


function _getUnsupportedMsg(key: string) {
  const { t } = useI18n(wechatLang)
  let msg = t(key)
  const { LIU_CUSTOMER_SERVICE } = process.env
  if(LIU_CUSTOMER_SERVICE) {
    msg += t("buy_time", { LIU_CUSTOMER_SERVICE })
  }
  return msg
}

async function handle_unsubscribe(
  msgObj: Wx_Gzh_Unsubscribe,
) {
  const wx_gzh_openid = msgObj.FromUserName

  // 0. define functions where we update user and cache
  const uCol = db.collection("User")
  const _updateUser = async (user: Table_User) => {
    // 0.1 check if updating is required
    const oldSub = user.thirdData?.wx_gzh?.subscribe
    if(oldSub === 0) return

    // 0.2 update user
    const userId = user._id
    const thirdData = user.thirdData ?? {}
    const wx_gzh = thirdData.wx_gzh ?? {}
    wx_gzh.subscribe = 0
    thirdData.wx_gzh = wx_gzh
    const now = getNowStamp()
    const u3: Partial<Table_User> = {
      thirdData,
      updatedStamp: now,
    }
    const res3 = await uCol.doc(userId).update(u3)

    // 0.3 update cache
    user.thirdData = thirdData
    user.updatedStamp = now
    updateUserInCache(userId, user)
  }

  // 1. get the user
  const q1 = uCol.where({ wx_gzh_openid }).orderBy("insertedStamp", "desc")
  const res1 = await q1.get<Table_User>()
  const list1 = res1.data
  const len1 = list1.length
  if(len1 < 1) return

  // 2. to update
  for(let i = 0; i < len1; i++) {
    const user = list1[i]
    if(i > (MAX_ACCOUNTS_TO_BIND - 1)) break
    await _updateUser(user)
  }

  return true
}
 
async function handle_subscribe(
  msgObj: Wx_Gzh_Subscribe,
) {
  // 1. checking out access_token
  const res1 = await checkAccessToken()
  if(!res1) return

  // 2. get openid
  const wx_gzh_openid = msgObj.FromUserName

  // 3. get user info
  const userInfo = await getWxGzhUserInfo(wx_gzh_openid)

  // 4. get EventKey, and extract state
  const res4 = getDirectionCredential(msgObj.EventKey, "qrscene_")
  if(!res4) {
    make_user_subscribed(wx_gzh_openid, userInfo)
    await send_welcome(wx_gzh_openid, userInfo)
    send_login_guide(wx_gzh_openid, userInfo)
    return
  }
  const { direction, credential } = res4

  // 5. decide which path to take
  const opt5 = { isFromSubscribeEvent: true }
  if(direction === "b2") {
    // get to bind account
    bind_wechat_gzh(wx_gzh_openid, credential, userInfo, opt5)
  }
  else if(direction === "b3") {
    // continue with wechat gzh
    login_with_wechat_gzh(wx_gzh_openid, credential, userInfo, opt5)
  }

}

async function handle_scan(
  msgObj: Wx_Gzh_Scan,
) {
  // 1. checking out access_token
  const res1 = await checkAccessToken()
  if(!res1) return

  // 2. get openid
  const wx_gzh_openid = msgObj.FromUserName

  // 3. get user info
  const userInfo = await getWxGzhUserInfo(wx_gzh_openid)

  // 4. get state
  const res4 = getDirectionCredential(msgObj.EventKey)
  if(!res4) return
  const { direction, credential } = res4

  // 5. decide which path to take
  if(direction === "b2") {
    // get to bind account
    bind_wechat_gzh(wx_gzh_openid, credential, userInfo)
  }
  else if(direction === "b3") {
    // continue with wechat gzh
    login_with_wechat_gzh(wx_gzh_openid, credential, userInfo)
  }

}


/***************** operations ****************/

interface OperationOpt {
  isFromSubscribeEvent?: boolean
}

async function login_with_wechat_gzh(
  wx_gzh_openid: string,
  credential: string,
  userInfo?: Wx_Res_GzhUserInfo,
  opt?: OperationOpt,
) {
  // console.log("login_with_wechat_gzh......")
  const wx_unionid = userInfo?.unionid

  // 1. get credential
  const cCol = db.collection("Credential")
  const w1: Partial<Table_Credential> = {
    credential,
    infoType: "wx-gzh-scan",
  }
  const q1 = cCol.where(w1)
  const res1 = await q1.getOne<Table_Credential>()
  const data1 = res1.data
  if(!data1) return false
  const cId = data1._id
  const meta_data = data1.meta_data ?? {}
  const {
    x_liu_device,
    x_liu_language
  } = meta_data

  // 1.1 optionally send welcome_message
  if(opt?.isFromSubscribeEvent) {
    send_welcome(wx_gzh_openid, userInfo, x_liu_language)
  }

  // 2. define some functions
  // 2.1 send "go back to our app" if needed
  const _sendGoBackToOurApp = () => {
    const deviceStr = x_liu_device ?? ""
    let isMobile = deviceStr.includes("Mobile")
    if(!isMobile) isMobile = deviceStr.startsWith("iOS")
    if(!isMobile) return
    send_logging(wx_gzh_openid, userInfo, x_liu_language)
  }

  // 2.2 set credential_2
  const _setCredential2 = async () => {
    const cred_2 = createCredential2()
    meta_data.wx_gzh_openid = wx_gzh_openid
    const w2: Partial<Table_Credential> = {
      credential_2: cred_2,
      meta_data,
      updatedStamp: getNowStamp(),
    }
    await cCol.doc(cId).update(w2)
    _sendGoBackToOurApp()
  }

  // 2.3 bind wx_gzh_openid and wx_unionid
  const _bindWxId = async (user: Table_User) => {
    let needUpdate = false
    const u2: Partial<Table_User> = { updatedStamp: getNowStamp() }
    if(wx_gzh_openid !== user.wx_gzh_openid) {
      needUpdate = true
      u2.wx_gzh_openid = wx_gzh_openid
    }
    if(wx_unionid && wx_unionid !== user.wx_unionid) {
      needUpdate = true
      u2.wx_unionid = wx_unionid
    }
    if(!needUpdate) return
    const userId = user._id
    await uCol.doc(userId).update(u2)
  }
  
  // 3.1 get user by wx_gzh_openid
  const uCol = db.collection("User")
  const w3: Partial<Table_User> = { wx_gzh_openid }
  const res3_1 = await uCol.where(w3).getOne<Table_User>()
  const user3_1 = res3_1.data
  if(user3_1) {
    _setCredential2()
    _bindWxId(user3_1)
    return
  }

  // 3.2 get user by wx_unionid
  if(wx_unionid) {
    const w3_2: Partial<Table_User> = { wx_unionid }
    const res3_2 = await uCol.where(w3_2).getOne<Table_User>()
    const user3_2 = res3_2.data
    if(user3_2) {
      _setCredential2()
      _bindWxId(user3_2)
      return
    }
  }

  // 4. create user
  const body = {
    x_liu_theme: meta_data.x_liu_theme,
    x_liu_language: meta_data.x_liu_language,
  }
  let thirdData: UserThirdData | undefined
  if(userInfo) {
    const wx_gzh: UserWeChatGzh = {
      subscribe: userInfo.subscribe,
      language: userInfo.language,
      subscribe_time: userInfo.subscribe_time,
      subscribe_scene: userInfo.subscribe_scene,
    }
    thirdData = { wx_gzh }
  }
  const res4 = await init_user(body, { wx_gzh_openid }, thirdData)

  // 5. update user's tag (language) for wx gzh
  const data5 = res4.data
  if(data5) {
    const tmpUserInfo = data5[0]
    const user5 = tmpUserInfo?.user
    if(user5) {
      tagWxUserLang(wx_gzh_openid, user5, userInfo)
    }
  }

  // 6. set credential_2
  _setCredential2()
}


async function bind_wechat_gzh(
  wx_gzh_openid: string,
  credential: string,
  userInfo?: Wx_Res_GzhUserInfo,
  opt?: OperationOpt,
) {
  const cCol = db.collection("Credential")
  const mCol = db.collection("Member")

  // 0. define some functions
  // 0.1 clear credential
  const _clearCredential = async (id: string) => {
    const res0_1 = await cCol.doc(id).remove()
  }

  // 0.2 make member's notification opened
  const _openWeChatNotification = async (id: string) => {

    // 1. get member
    const res0_2_1 = await mCol.doc(id).get<Table_Member>()
    const member = res0_2_1.data
    if(!member) {
      console.warn("member not found")
      return
    }
    const oldNoti = member.notification?.wx_gzh_toggle
    if(oldNoti) return

    // 2. update member
    const noti = member.notification ?? {}
    noti.wx_gzh_toggle = true
    const now0_2 = getNowStamp()
    const u0_2: Partial<Table_Member> = {
      notification: noti,
      updatedStamp: now0_2,
    }
    const res0_2_2 = await mCol.doc(id).update(u0_2)
  }

  // 1. get the credential
  const w1: Partial<Table_Credential> = {
    credential,
    infoType: "bind-wechat",
  }
  const q1 = cCol.where(w1)
  const res1 = await q1.getOne<Table_Credential>()
  const data1 = res1.data
  if(!data1) return false
  const meta_data = data1.meta_data ?? {}
  const memberId_1 = meta_data?.memberId

  // 1.1 optionally send welcome_message
  if(opt?.isFromSubscribeEvent) {
    send_welcome(wx_gzh_openid, userInfo, meta_data.x_liu_language)
  }

  // 2. check if it is available
  const { expireStamp, userId } = data1
  if(!userId) {
    console.warn("bind_wechat_gzh: userId is null")
    console.log(data1)
    return false
  }
  if(!isWithinMillis(expireStamp, MINUTE)) {
    console.warn("bind_wechat_gzh: credential expired")
    console.log(data1)
    console.log("now: ", getNowStamp())
    return false
  }

  // 3. get the user
  const uCol = db.collection("User")
  const res3 = await uCol.doc(userId).get<Table_User>()
  const user3 = res3.data
  if(!user3) return false

  // 4. get i18n
  const { t } = useI18n(wechatLang, { user: user3 })
  const success_msg = t("success_1")

  // 4.1 define successful logic
  const _success = async () => {
    sendText(wx_gzh_openid, success_msg)
    await make_user_subscribed(wx_gzh_openid, userInfo, user3)
    if(memberId_1) {
      await _openWeChatNotification(memberId_1)
    }
    await _clearCredential(data1._id)
    await tagWxUserLang(wx_gzh_openid, user3, userInfo)
  }
  
  // 5. if the user's wx_gzh_openid is equal to the current one
  if(user3.wx_gzh_openid === wx_gzh_openid) {
    await _success()
    return true
  }

  // 6. check out another user whose wx_gzh_openid 
  // matches the current one
  const w6: Partial<Table_User> = {
    wx_gzh_openid,
  }
  const q6 = uCol.where(w6).orderBy("insertedStamp", "desc")
  const res6 = await q6.get<Table_User>()
  const list6 = res6.data

  // binding two accounts is allowed, but binding three is not
  const len6 = list6.length
  if(len6 >= 1) {
    const user6 = list6[0]
    const name6 = await getAccountName(user6)
    const already_bound_msg = t("already_bound", { account: name6 })
    sendText(wx_gzh_openid, already_bound_msg)
    return false
  }

  // 7. everything is ok
  await _success()

  return true
}

async function send_welcome(
  wx_gzh_openid: string,
  userInfo?: Wx_Res_GzhUserInfo,
  x_liu_language?: string,
) {
  // 1. get language
  const lang = x_liu_language ?? userInfo?.language

  // 2. i18n
  const { t } = useI18n(wechatLang, { lang })
  const text = t("welcome_1")
  
  // 3. reply user with text
  await sendText(wx_gzh_openid, text)

  return true
}

async function send_logging(
  wx_gzh_openid: string,
  userInfo?: Wx_Res_GzhUserInfo,
  x_liu_language?: string,
) {
  // 1. get language
  const lang = x_liu_language ?? userInfo?.language

  // 2. i18n
  const { t } = useI18n(wechatLang, { lang })
  const text = t("go_back_to_app")
  
  // 3. reply user with text
  await sendText(wx_gzh_openid, text)
}

async function send_login_guide(
  wx_gzh_openid: string,
  userInfo?: Wx_Res_GzhUserInfo,
) {
  // 1. get language
  const lang = userInfo?.language

  // 2. i18n
  const { t } = useI18n(wechatLang, { lang })
  const text = t("login_guide")

  await sendText(wx_gzh_openid, text)
}

async function make_user_subscribed(
  wx_gzh_openid: string,
  userInfo?: Wx_Res_GzhUserInfo,
  user?: Table_User,
) {
  const uCol = db.collection("User")

  // 1. get user
  if(!user) {  
    const w1: Partial<Table_User> = { wx_gzh_openid }
    const q1 = uCol.where(w1).orderBy("insertedStamp", "desc")
    const res1 = await q1.getOne<Table_User>()
    if(!res1.data) return false
    user = res1.data
  }

  // 2. check if updating is required
  let needUpdate = false
  const userId = user._id
  const thirdData = user.thirdData ?? {}
  const wx_gzh = user.thirdData?.wx_gzh ?? {}
  if(wx_gzh.subscribe !== 1) {
    needUpdate = true
    wx_gzh.subscribe = 1
  }
  if(user.wx_gzh_openid !== wx_gzh_openid) {
    needUpdate = true
  }

  const newLang = userInfo?.language
  if(newLang && newLang !== wx_gzh.language) {
    needUpdate = true
    wx_gzh.language = newLang
  }
  const newScene = userInfo?.subscribe_scene
  if(newScene && newScene !== wx_gzh.subscribe_scene) {
    needUpdate = true
    wx_gzh.subscribe_scene = newScene
  }
  const newSubTime = userInfo?.subscribe_time
  if(newSubTime && newSubTime !== wx_gzh.subscribe_time) {
    needUpdate = true
    wx_gzh.subscribe_time = newSubTime
  }
  const oldUnionid = user.wx_unionid
  const newUnionid = userInfo?.unionid
  if(newUnionid && newUnionid !== oldUnionid) {
    needUpdate = true
  }

  if(!needUpdate) {
    console.warn("there is no need to update user in make_user_subscribed")
    console.log(user)
    return false
  }
  thirdData.wx_gzh = wx_gzh

  // 3. update user for db
  const now = getNowStamp()
  const u3: Partial<Table_User> = {
    wx_gzh_openid,
    thirdData,
    updatedStamp: now,
  }
  if(newUnionid) u3.wx_unionid = newUnionid
  const res3 = await uCol.doc(userId).update(u3)

  // 4. update cache
  user.wx_gzh_openid = wx_gzh_openid
  user.thirdData = thirdData
  user.updatedStamp = now
  if(newUnionid) user.wx_unionid = newUnionid
  updateUserInCache(userId, user)

  return true
}




/***************** helper functions *************/

async function getVoiceLink(
  media_id: string,
) {
  // 1. get accessToken for wx gzh
  const res1 = await checkAccessToken()
  if(!res1) return

  // 2. construct link
  const url = new URL(API_MEDIA_DOWNLOAD)
  const sP = url.searchParams
  sP.set("access_token", res1)
  sP.set("media_id", media_id)
  const link = url.toString()

  return link
}

function autoDynamicReply(
  wx_gzh_openid: string,
  text: string,
  user: Table_User,
) {
  // 0. trim and lowercase
  const txt = text.toLowerCase()

  // 1. membership info
  const keywords1 = [
    "会员", "會員", "membership", "vip", "premium",
    "会员群", "會員群", "會員群租", "vip group"
  ]
  const existed1 = keywords1.includes(txt)
  if(existed1) {
    sendMemberInfo(wx_gzh_openid, user)
    return true
  }

  return false
}


function sendMemberInfo(
  wx_gzh_openid: string,
  user: Table_User,
) {
  const subscribed = checkIfUserSubscribed(user)
  const { t } = useI18n(wechatLang, { user })

  let msg = ""

  // 1. not subscribed
  if(!subscribed) {
    msg = t("membership_1")
    sendText(wx_gzh_openid, msg)
    return
  }

  // 2.1 calculate expireDate
  let endDate = "Unknown"
  const expireStamp = user.subscription?.expireStamp
  if(expireStamp) {
    const { date } = LiuDateUtil.getDateAndTime(expireStamp)
    endDate = date
  }

  // 2.2 get invite link
  const _env = process.env
  const groupLink = _env.LIU_WECOM_GROUP_LINK ?? ""
  msg = t("membership_2", { endDate, groupLink })
  sendText(wx_gzh_openid, msg)
}


// when user sends text, check out if we have to reply automatically
async function autoReplyAfterReceivingText(
  wx_gzh_openid: string,
  text1: string,
) {
  // 1. check if text is empty
  if(!text1) {
    console.warn("autoReply: text is empty")
    return true
  }

  // 2. check if text is "[收到不支持的消息类型，暂无法显示]"
  if(text1.startsWith("[收到不支持的消息类型")) {
    await sendText(wx_gzh_openid, "[收到不支持的消息类型]")
    return true
  }

  // 3. check out static auto-reply
  let theReplies: Wx_Gzh_Send_Msg[] = []
  for(let i=0; i<wxTextRepliesItems.length; i++) {
    const item = wxTextRepliesItems[i]
    const { keywords, replies } = item
    const existed = keywords.includes(text1)
    if(existed) {
      theReplies = replies
      break
    }
  }
  if(theReplies.length < 1) return false
  const _env = process.env
  const contactMediaId = _env.LIU_WX_GZ_MEDIA_ID_FOR_CONTACT ?? ""
  
  // 4. ready to send
  for(let i=0; i<theReplies.length; i++) {
    const v = theReplies[i]
    const obj = valTool.copyObject(v)
    const msgtype = obj.msgtype
    if(msgtype === "text") {
      const str1 = obj.text.content 
      obj.text.content = i18nFill(str1, {})
    }

    if(msgtype === "image") {
      const str2_1 = obj.image.media_id
      const str2_2 = i18nFill(str2_1, {
        LIU_WX_GZ_MEDIA_ID_FOR_CONTACT: contactMediaId,
      })
      if(!str2_2) continue
      obj.image.media_id = str2_2
    }

    theReplies[i] = obj

    await sendObject(wx_gzh_openid, obj)
  }
  return true
}


interface DirectionCredential {
  direction: string
  credential: string
}

// extract key and value from event_key
// for example event_key="qrscene_b"
function getDirectionCredential(
  event_key: string,
  prefix?: string,
): DirectionCredential | undefined {
  if(!event_key) return

  // 1. get state
  let state = ""
  if(prefix) {
    if(!event_key.startsWith(prefix)) return
    state = event_key.substring(prefix.length)
    if(!state) return
  }
  else {
    state = event_key
  }

  // 2. get direction and credential from state
  const tmp2 = state.split("=")
  if(tmp2.length !== 2) return

  const direction = tmp2[0]
  const credential = tmp2[1]
  if(!direction || !credential) return
  return { direction, credential }
}



// check out access_token
async function checkAccessToken() {
  wechat_access_token = await checkAndGetWxGzhAccessToken()
  return wechat_access_token
}


async function turnInputIntoMsgObj(
  ctx: FunctionContext,
): Promise<LiuRqReturn<Wx_Gzh_Msg_Event> | string> {
  const b = ctx.body
  const q = ctx.query
  
  // 0.1 which mode it is
  const msgMode = getMsgMode(q, b)
  if(msgMode === "plain_text" && b) {
    console.log("看一下 body.xml: ")
    console.log(b.xml)
  }

  // 0.2 preCheck
  const res0 = preCheck(msgMode)
  if(res0) {
    return res0
  }

  // 1. get query
  const msg_signature = q?.msg_signature as string
  const signature = q?.signature as string
  const timestamp = q?.timestamp as string
  const nonce = q?.nonce as string
  const echostr = q?.echostr as string

  // 2. echostr if we just init the program
  const method = ctx.method
  if(method === "GET" && echostr) {
    const res2_1 = verifySignature(signature, timestamp, nonce)
    if(res2_1) return res2_1
    return echostr
  }

  // 3. try to get ciphertext, which applys to most scenarios
  const payload = b?.xml
  if(!payload) {
    console.warn("fails to get xml in body")
    return { code: "E4000", errMsg: "xml in body is required" }
  }
  const ciphertext = payload.encrypt?.[0]
  if(msgMode === "safe" && !ciphertext) {
    console.warn("fails to get encrypt in body")
    return { code: "E4000", errMsg: "Encrypt in body is required"  }
  }

  // 4.1 verify msg_signature while it is safe mode
  if(msgMode === "safe") {
    const res4_1 = verifyMsgSignature(msg_signature, timestamp, nonce, ciphertext)
    if(res4_1) {
      console.warn("fails to verify msg_signature")
      console.log(res4_1)
      return res4_1
    }
  }
  else {
    const res4_2 = verifySignature(signature, timestamp, nonce)
    if(res4_2) {
      console.warn("fails to verify signature")
      console.log(res4_2)
      return res4_2
    }
  }

  let msgObj: Wx_Gzh_Msg_Event | undefined
  if(msgMode === "safe") {
    // 5. decrypt 
    const { message, id } = toDecrypt(ciphertext)

    if(!message) {
      console.warn("fails to get message")
      return { code: "E4000", errMsg: "decrypt fail" }
    }

    // 6. get msg object
    msgObj = await getMsgObjForSafeMode(message)
  }
  else {
    msgObj = getMsgObjForPlainText(payload)
  }

  if(!msgObj || !msgObj.MsgType) {
    console.warn("fails to get msg object")
    return { code: "E5001", errMsg: "get msg object fail" }
  }
  
  return { code: "0000", data: msgObj }
}

// take care of this function
function getMsgObjForPlainText(
  xml: Record<string, Array<any>>,
) {
  let msgObj: any = {}
  if(xml.tousername) msgObj.ToUserName = xml.tousername[0]
  if(xml.fromusername) msgObj.FromUserName = xml.fromusername[0]
  if(xml.createtime) msgObj.CreateTime = xml.createtime[0]
  if(xml.msgtype) msgObj.MsgType = xml.msgtype[0]
  if(xml.event) msgObj.Event = xml.event[0]
  if(xml.eventkey) msgObj.EventKey = xml.eventkey[0]
  
  // auth change event
  if(xml.openid) msgObj.OpenID = xml.openid[0]
  if(xml.appid) msgObj.AppID = xml.appid[0]
  if(xml.revokeinfo) msgObj.RevokeInfo = xml.revokeinfo[0]

  if(xml.content) msgObj.Content = xml.content[0]
  if(xml.msgid) {
    const msgid = xml.msgid[0]
    if(msgObj.Event === "MASSSENDJOBFINISH") {
      msgObj.MsgID = msgid
    }
    else {
      msgObj.MsgId = msgid
    }
  }
  if(xml.msgdataid) msgObj.MsgDataId = xml.msgdataid[0]

  if(xml.picurl) msgObj.PicUrl = xml.picurl[0]
  if(xml.mediaid) msgObj.MediaId = xml.mediaid[0]

  if(xml.format) msgObj.Format = xml.format[0]

  // msg menu
  if(xml.bizmsgmenuid) msgObj.bizmsgmenuid = xml.bizmsgmenuid[0]

  if(xml.ticket) msgObj.Ticket = xml.ticket[0]

  if(xml.menuid) msgObj.MenuId = xml.menuid[0]

  // template message sent
  if(xml.status) msgObj.Status = xml.status[0]

  // location
  if(xml.location_x) msgObj.Location_X = xml.location_x[0]
  if(xml.location_y) msgObj.Location_Y = xml.location_y[0]
  if(xml.scale) msgObj.Scale = xml.scale[0]
  if(xml.label) msgObj.Label = xml.label[0]

  // link
  if(xml.title) msgObj.Title = xml.title[0]
  if(xml.description) msgObj.Description = xml.description[0]
  if(xml.url) msgObj.Url = xml.url[0]

  // voice
  if(xml.recognition) msgObj.Recognition = xml.recognition[0]
  if(xml.mediaid16k) msgObj.MediaId16K = xml.mediaid16k[0]

  // video
  if(xml.thumbmediaid) msgObj.ThumbMediaId = xml.thumbmediaid[0]

  // message job finish 群发结果回调
  if(xml.totalcount) msgObj.TotalCount = xml.totalcount[0]
  if(xml.filtercount) msgObj.FilterCount = xml.filtercount[0]
  if(xml.sentcount) msgObj.SentCount = xml.sentcount[0]
  if(xml.errorcount) msgObj.ErrorCount = xml.errorcount[0]

  return msgObj as Wx_Gzh_Msg_Event
}

async function getMsgObjForSafeMode(message: string) {
  let res: Wx_Gzh_Msg_Event | undefined 
  const parser = new xml2js.Parser({explicitArray : false})
  try {
    const { xml } = await parser.parseStringPromise(message)
    res = xml
  }
  catch(err) {
    console.warn("getMsgObjForSafeMode fails")
    console.log(err)
  }

  return res
}

async function getUserByWxGzhOpenid(wx_gzh_openid: string) {
  const w3: Partial<Table_User> = {
    oState: "NORMAL",
    wx_gzh_openid,
  }
  const uCol = db.collection("User")
  const q3 = uCol.where(w3).orderBy("insertedStamp", "desc")
  const res3 = await q3.getOne<Table_User>()

  // check out login or not
  const user4 = res3.data
  if(!user4 || user4.oState !== "NORMAL") {
    const { t: t4 } = useI18n(wechatLang)
    const text4 = t4("login_first")
    await sendText(wx_gzh_openid, text4)
    return
  }

  return user4
}

async function sendText(
  wx_gzh_openid: string,
  text: string,
) {
  const res1 = await checkAccessToken()
  if(!res1) return false
  await WxGzhSender.sendTextMessage(wx_gzh_openid, wechat_access_token, text)
}

async function sendObject(
  wx_gzh_openid: string,
  obj: Wx_Gzh_Send_Msg,
) {
  const res1 = await checkAccessToken()
  if(!res1) return false
  await WxGzhSender.sendMessage(wx_gzh_openid, wechat_access_token, obj)
}

function getMsgMode(
  q: Record<string, any>,
  b: Record<string, any>,
): MsgMode {
  const encrypt_type = q.encrypt_type
  const encrypt = b?.xml?.encrypt

  // console.log("encrypt_type: ", encrypt_type)
  // console.log("encrypt: ", encrypt)

  if(encrypt_type && encrypt) {
    return "safe"
  }
  
  return "plain_text"
}

function preCheck(
  msgMode: MsgMode,
): LiuErrReturn | undefined {
  const _env = process.env
  const token = _env.LIU_WX_GZ_TOKEN
  if(!token) {
    return { code: "E5001", errMsg: "LIU_WX_GZ_TOKEN is empty" }
  }
  const key = _env.LIU_WX_GZ_ENCODING_AESKEY
  if(!key && msgMode === "safe") {
    return { code: "E5001", errMsg: "LIU_WX_GZ_ENCODING_AESKEY is empty" }
  }
}

function toDecrypt(
  ciphertext: string,
) {
  const _env = process.env
  const encodeingAESKey = _env.LIU_WX_GZ_ENCODING_AESKEY as string

  let message = ""
  let id = ""
  try {
    const data = decrypt(encodeingAESKey, ciphertext)
    message = data.message
    id = data.id
  }
  catch(err) {
    console.warn("decrypt fail")
    console.log(err)
  }
  
  return { message, id }
}

function verifyMsgSignature(
  msg_signature: string, 
  timestamp: string, 
  nonce: string,
  ciphertext: string,
): LiuErrReturn | undefined {
  const _env = process.env
  const token = _env.LIU_WX_GZ_TOKEN as string
  const arr = [token, timestamp, nonce, ciphertext].sort()
  const str = arr.join('')
  const sha1 = crypto.createHash('sha1')
  sha1.update(str)
  const sig = sha1.digest('hex')

  if(sig !== msg_signature) {
    console.warn("msg_signature verification failed")
    console.log("sig caculated: ", sig)
    console.log("msg_signature: ", msg_signature)
    return { code: "E4003", errMsg: "msg_signature verification failed" }
  }
}

function verifySignature(
  signature: string,
  timestamp: string, 
  nonce: string,
) {
  const _env = process.env
  const token = _env.LIU_WX_GZ_TOKEN as string
  const arr = [token, timestamp, nonce].sort()
  const str = arr.join('')
  const sha1 = crypto.createHash('sha1')
  sha1.update(str)
  const sig = sha1.digest('hex')
  if(sig !== signature) {
    console.warn("signature verification failed")
    console.log("sig caculated: ", sig)
    console.log("signature: ", signature)
    return { code: "E4003", errMsg: "signature verification failed" }
  }
}