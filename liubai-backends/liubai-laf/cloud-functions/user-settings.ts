// Function Name: user-settings

import cloud from '@lafjs/cloud'
import { 
  checker,
  getLiuTokenUser,
  getUserInfos, 
  updateUserInCache, 
  verifyToken,
  tagWxUserLang,
  LiuStripe,
  valTool,
  getWxGzhUserOAuthAccessToken,
  getWxGzhSnsUserInfo,
  checkAndGetWxGzhAccessToken,
  getWxGzhUserInfo,
  getDecryptedBody,
  normalizePhoneNumber,
  getDocAddId,
  canPassByExponentialDoor,
} from '@/common-util'
import { 
  type MongoFilter,
  type Table_User, 
  type LiuRqReturn,
  type VerifyTokenRes_B,
  type Table_Token,
  Sch_LocalTheme,
  Sch_LocalLocale,
  Sch_GenderType,
  UserSettingsAPI,
  type LiuErrReturn,
  type Table_Member,
  type DataPass,
  type Table_Credential,
  type Partial_Id,
  type LiuAppType,
  type Table_BlockList,
  type Table_AiRoom,
  type GenderType,
  type Cloud_ImageStore,
} from '@/common-types'
import { 
  getNowStamp, 
  DAY, 
  MINUTE, 
  getBasicStampWhileAdding,
} from "@/common-time"
import * as vbot from "valibot"
import { getCurrentLocale } from '@/common-i18n'
import { handle_avatar, addVerifyNum } from '@/user-login'
import { createAuthCode, createSmsCode } from '@/common-ids'
import { SmsController } from '@/service-send'
import { AiShared } from '@/ai-shared'

const db = cloud.database()
const _ = db.command

export async function main(ctx: FunctionContext) {
  const body = ctx.request?.body ?? {}
  const oT = body.operateType

  let res: LiuRqReturn = { code: "E4000" }

  // 0. if it is logout, bypass the verification
  if(oT === "logout") {
    res = await handle_logout(ctx, body)
    return res
  }

  const stamp1 = getNowStamp()
  const entering = oT === "enter"
  const vRes = await verifyToken(ctx, body, { entering })
  if(!vRes.pass) return vRes.rqReturn

  if(oT === "enter") {
    // 获取用户设置并记录用户访问
    res = await handle_enter(ctx, vRes)
  }
  else if(oT === "latest") {
    res = await handle_latest(vRes)
  }
  else if(oT === "membership") {
    res = await handle_membership(vRes)
  }
  else if(oT === "set") {
    res = await handle_set(vRes, body)
  }
  else if(oT === "wechat-bind") {
    res = await handle_wechat_bind(vRes, body)
  }
  else if(oT === "request-sms") {
    res = await handle_request_sms(vRes, body)
  }
  else if(oT === "bind-phone") {
    res = await handle_bind_phone(vRes, body)
  }
  else if(oT === "unbind-phone") {
    res = await handle_unbind(vRes, "phone")
  }
  else if(oT === "unbind-email") {
    res = await handle_unbind(vRes, "email")
  }
  else if(oT === "auth-get-info") {
    res = await auth_get_info(vRes, body)
  }
  else if(oT === "auth-agree") {
    res = await auth_agree(vRes, body)
  }
  else if(oT === "unbind-wx_gzh") {
    res = await handle_unbind(vRes, "wx_gzh")
  }
  else if(oT === "ai-console-get") {
    res = await ai_console_get(vRes)
  }
  else if(oT === "ai-console-set") {
    res = await ai_console_set(vRes, body) 
  }
  else if(oT === "member-avatar") {
    res = await member_avatar(vRes, body)
  }
  else if(oT === "member-name") {
    res = await member_name(vRes, body)
  }

  // const stamp2 = getNowStamp()
  // const diffS = stamp2 - stamp1
  // console.log(`调用 user-settings for ${oT} 耗时: ${diffS}ms`)

  return res
}

async function member_name(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 1. check out param
  const res1 = vbot.safeParse(UserSettingsAPI.Sch_Param_MemberName, body)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }
  const memberId = body.memberId as string
  const userId = vRes.userData._id
  const name = body.name as string

  // 2. get member
  const mCol = db.collection("Member")
  const res2 = await mCol.doc(memberId).get<Table_Member>()
  const member = res2.data
  if(!member) {
    return { code: "E4004", errMsg: "member not found" }
  }
  if(member.user !== userId) {
    return { code: "E4003", errMsg: "no permission" }
  }
  if(name === member.name) {
    return { code: "0000" }
  }

  // 3. update member
  const u3: Partial<Table_Member> = {
    name,
    updatedStamp: getNowStamp(),
  }
  await mCol.doc(memberId).update(u3)
  return { code: "0000" }
}

async function member_avatar(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 1. check out param
  const res1 = vbot.safeParse(UserSettingsAPI.Sch_Param_MemberAvatar, body)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }
  const memberId = body.memberId as string
  const userId = vRes.userData._id
  const image = body.image as Cloud_ImageStore

  // 2. get member
  const mCol = db.collection("Member")
  const res2 = await mCol.doc(memberId).get<Table_Member>()
  const member = res2.data
  if(!member) {
    return { code: "E4004", errMsg: "member not found" }
  }
  if(member.user !== userId) {
    return { code: "E4003", errMsg: "no permission" }
  }

  // 3. update member
  const u3 = {
    updatedStamp: getNowStamp(),
    avatar: _.set(image),
  }
  const res3 = await mCol.doc(memberId).update(u3)
  return { code: "0000" }
}

async function ai_console_set(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 0. check out entry
  const Sch_Set = vbot.object({
    voicePreference: Sch_GenderType,
  })
  const res0 = vbot.safeParse(Sch_Set, body)
  if(!res0.success) {
    const errMsg = checker.getErrMsgFromIssues(res0.issues)
    return { code: "E4000", errMsg }
  }

  // 1. get room
  const userId = vRes.userData._id
  const rCol = db.collection("AiRoom")
  const res1 = await rCol.where({ owner: userId }).getOne<Table_AiRoom>()
  let room = res1.data
  if(!room) {
    const newRoom = await toCreateDefaultAiRoom(userId)
    if(!newRoom) {
      return { code: "E5001", errMsg: "fail to create an ai room" }
    }
    room = newRoom
  }

  // 2. check if it is identical
  const newVoicePreference = body.voicePreference as GenderType
  if(newVoicePreference === room.voicePreference) {
    return { code: "0001" }
  }

  // 3. to update
  const u3: Partial<Table_AiRoom> = {
    voicePreference: newVoicePreference,
    updatedStamp: getNowStamp(),
  }
  const res3 = await rCol.doc(room._id).update(u3)
  return { code: "0000" }
}


async function ai_console_get(
  vRes: VerifyTokenRes_B,
): Promise<LiuRqReturn<UserSettingsAPI.Res_AiConsoleGet>> {
  const userId = vRes.userData._id
  const rCol = db.collection("AiRoom")
  const res1 = await rCol.where({ owner: userId }).getOne<Table_AiRoom>()
  const room = res1.data
  const result: UserSettingsAPI.Res_AiConsoleGet = {
    operateType: "ai-console-get",
    voicePreference: room?.voicePreference,
  }
  return { code: "0000", data: result }
}


async function auth_agree(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 1. get credential data
  const res1 = await getSharedDataForAuth(body)
  if(!res1.pass) return res1.err
  const data1 = res1.data

  // 2. create code
  const code = createAuthCode()
  const userId = vRes.userData._id

  // 3. update credential
  const w3: Partial<Table_Credential> = {
    credential_2: code,
    userId,
    updatedStamp: getNowStamp(),
  }
  const cCol = db.collection("Credential")
  const res3 = await cCol.doc(data1._id).update(w3)
  
  // 4. construct response
  const data4: UserSettingsAPI.Res_AuthAgree = {
    operateType: "auth-agree",
    code,
    redirectUri: data1.redirect_uri as string,
  }
  return { code: "0000", data: data4 }
}


async function auth_get_info(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
): Promise<LiuRqReturn<UserSettingsAPI.Res_AuthGetInfo>> {
  // 1. get credential data
  const res1 = await getSharedDataForAuth(body)
  if(!res1.pass) return res1.err
  const data1 = res1.data

  // 2. construct response
  const data6: UserSettingsAPI.Res_AuthGetInfo = {
    operateType: "auth-get-info",
    appType: data1.app_type as LiuAppType,
    serial: data1._id,
  }
  return { code: "0000", data: data6 }
}

async function getSharedDataForAuth(
  body: Record<string, any>,
): Promise<DataPass<Table_Credential>> {
  // 1. get param
  const oT = body.operateType
  const serial = body.serial
  const credential = body.credential
  if(!valTool.isStringWithVal(credential)) {
    return {
      pass: false,
      err: { code: "E4000", errMsg: "credential is required" }
    }
  }

  // 2. query
  let data2: Table_Credential | null = null
  const cCol = db.collection("Credential")

  // 2.1 query with serial
  if(oT === "auth-agree") {
    if(!valTool.isStringWithVal(serial)) {
      return { 
        pass: false,
        err: { code: "E4000", errMsg: "serial is required" }
      }
    }
    const res2_1 = await cCol.doc(serial).get<Table_Credential>()
    data2 = res2_1.data
    if(data2?.credential !== credential) {
      return {
        pass: false,
        err: { code: "E4003", errMsg: "credential does not match" }
      }
    }
  }
  else {
    const w2: Partial<Table_Credential> = {
      credential,
      infoType: "auth-code",
    }
    const res2 = await cCol.where(w2).getOne<Table_Credential>()
    data2 = res2.data
  }

  if(!data2) {
    return {
      pass: false,
      err: { code: "E4004", errMsg: "credential not found" }
    }
  }

  // 3. check out expiration
  const now3 = getNowStamp()
  const stamp3 = data2.expireStamp
  if(stamp3 <= now3) {
    return {
      pass: false,
      err: { code: "E4006", errMsg: "credential has expired" }
    }
  }

  // 4. check out other params
  const appType = data2.app_type
  if(!appType) {
    return {
      pass: false,
      err: { code: "E5001", errMsg: "appType is undefined" }
    }
  }
  const redirect_uri = data2.redirect_uri
  if(!redirect_uri) {
    return {
      pass: false,
      err: { code: "E5001", errMsg: "redirect_uri is undefined" }
    }
  }

  return {
    pass: true,
    data: data2,
  }
}


async function handle_unbind(
  vRes: VerifyTokenRes_B,
  unbindType: "phone" | "email" | "wx_gzh",
) {
  // 1. get the user
  const userId = vRes.userData._id
  const col_user = db.collection("User")
  const res = await col_user.doc(userId).get<Table_User>()
  const user = res.data
  if(!user) {
    return { code: "E4004", errMsg: "user not found" }
  }
  
  // 2. set undefined
  const u: Record<string, any> = {}
  let wx_gzh_openid = user.wx_gzh_openid
  if(unbindType === "phone") {
    if(!user.phone) return { code: "0001" }
    u.phone = _.remove()
  }
  else if(unbindType === "email") {
    if(!user.email) return { code: "0001" }
    u.email = _.remove()
  }
  else if(unbindType === "wx_gzh") {
    if(!wx_gzh_openid) return { code: "0001" }
    u.wx_gzh_openid = _.remove()
  }

  // 3. update
  const res3 = await col_user.doc(userId).update(u)
  updateUserInCache(userId)

  // 4. for wx_gzh
  if(unbindType === "wx_gzh" && wx_gzh_openid) {
    addWxGzhOpenidToBlockList(wx_gzh_openid)
  }
  
  return { code: "0000" }
}


async function handle_bind_phone(
  vRes: VerifyTokenRes_B,
  oldBody: Record<string, any>,
) {
  // 1. decrypt
  const res1 = getDecryptedBody(oldBody, vRes)
  if(!res1.newBody || res1.rqReturn) {
    return res1.rqReturn ?? { code: "E5001" }
  }

  // 2. get phone
  const body = res1.newBody
  const { phone, smsCode } = body
  // console.log("phone in handle_request_sms: ")
  // console.log(phone)
  if(!phone || typeof phone !== "string") {
    return { code: "E4000", errMsg: "phone is required" }
  }

  // 3. get local number
  const res3 = normalizePhoneNumber(phone)
  if(!res3) return { code: "E4000", errMsg: "parse phone number error" }

  // 4. get credential
  const errReturnData = {
    code: "E4003",
    errMsg: "the phone_code is wrong or expired, or checking is too much"
  }
  const w4: Partial<Table_Credential> = {
    phoneNumber: phone,
    infoType: "bind-phone",
  }
  const cCol = db.collection("Credential")
  const q4 = cCol.where(w4).orderBy("insertedStamp", "desc")
  const res4 = await q4.limit(1).get<Table_Credential>()
  const firstCre = res4.data[0]
  if(!firstCre) return errReturnData

  // 5. check out verifyNum
  const { 
    verifyNum, 
    insertedStamp, 
    credential, 
    expireStamp,
    _id: cId,
  } = firstCre
  const verifyData = canPassByExponentialDoor(insertedStamp, verifyNum)
  if(!verifyData.pass) {
    console.warn("checking credential too much")
    return errReturnData
  }

  // 6. check out smsCode
  if(credential !== smsCode) {
    console.warn("the smsCode is not equal to credential")
    console.log("phone: ", phone)
    console.log("smsCode: ", smsCode)
    console.log("credential: ", credential)
    await addVerifyNum(cId, verifyData.verifiedNum)
    return errReturnData
  }

  // 7. check expireStamp
  const now7 = getNowStamp()
  if(now7 > expireStamp) {
    console.warn("the smsCode is expired")
    console.log(phone)
    console.log("duration: ", now7 - expireStamp)
    return errReturnData
  }

  // 8. remove credential
  cCol.doc(cId).remove()

  // 9. bind phone
  const userId = vRes.userData._id
  const u9: Partial<Table_User> = {
    phone,
    updatedStamp: now7,
  }
  const uCol = db.collection("User")
  const res9 = await uCol.doc(userId).update(u9)
  updateUserInCache(userId)
  return { code: "0000" }
}

async function handle_request_sms(
  vRes: VerifyTokenRes_B,
  oldBody: Record<string, any>,
) {
  // 1. decrypt
  const res1 = getDecryptedBody(oldBody, vRes)
  if(!res1.newBody || res1.rqReturn) {
    return res1.rqReturn ?? { code: "E5001" }
  }

  // 2. get phone
  const body = res1.newBody
  const { phone } = body
  if(!phone || typeof phone !== "string") {
    return { code: "E4000", errMsg: "phone is required" }
  }

  // 3. get local number
  const res3 = normalizePhoneNumber(phone)
  if(!res3) return { code: "E4000", errMsg: "parse phone number error" }
  const { localNumber, regionCode } = res3
  if(regionCode !== "86" || localNumber.length !== 11) {
    return { code: "US004", errMsg: "only support +86" }
  }

  // 4. check if the number has been bound
  const res4 = await checkIfPhoneHasBeenBound(phone)
  if(res4) {
    return { code: "US003", errMsg: "the phone number has been bound" }
  }

  // 5. check credential
  const now5 = getNowStamp()
  const ONE_MIN_AGO = now5 - MINUTE
  const cCol = db.collection("Credential")
  const w5 = {
    infoType: "bind-phone",
    phoneNumber: phone,
    insertedStamp: _.gte(ONE_MIN_AGO),
  }
  const res5 = await cCol.where(w5).get<Table_Credential>()
  const list5 = res5.data ?? []
  const theCred = list5[0]
  if(theCred) {
    return { code: "E4003", errMsg: "sending to the phone number too much" }
  }

  // 6. create credential
  const smsCode = createSmsCode()
  const expireStamp = getNowStamp() + 5 * MINUTE
  const b6 = getBasicStampWhileAdding()
  const data6: Partial_Id<Table_Credential> = {
    ...b6,
    credential: smsCode,
    infoType: "bind-phone",
    expireStamp,
    phoneNumber: phone,
  }
  const res6 = await cCol.add(data6)
  const cId = getDocAddId(res6)
  if(!cId) {
    return { code: "E5000", errMsg: "creating credential failed"}
  }

  // 7. send sms
  const res7 = await SmsController.send(regionCode, localNumber, smsCode)
  const { send_channel, result: result7 } = res7

  // 8. record send result
  if(result7.code === "0000") {
    const u8: Partial<Table_Credential> = {
      send_channel,
      sms_sent_result: result7.data,
    }
    cCol.doc(cId).update(u8)
    return { code: "0000" }
  }

  return result7
}


async function checkIfPhoneHasBeenBound(phone: string) {
  const uCol = db.collection("User")
  const res = await uCol.where({ phone }).get<Table_User>()
  const list = res.data
  let hasBound = false
  for(let i=0; i<list.length; i++) {
    const v = list[i]
    if(v.oState === "NORMAL" || v.oState === "LOCK") {
      hasBound = true
      break
    }
  }
  return hasBound
}


async function handle_wechat_bind(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 1. get params
  const { oauth_code } = body
  const res1 = valTool.isStringWithVal(oauth_code)
  if(!res1) {
    return { code: "E4000", errMsg: "oauth_code is required" }
  }

  // 2. get user's accessToken
  const res2 = await getWxGzhUserOAuthAccessToken(oauth_code)
  const code2 = res2?.code
  if(code2 !== "0000") {
    return res2 as LiuErrReturn
  }

  // 3. extract access_token, and so on
  const data3 = res2?.data
  console.log("data3 in handle_wechat_bind: ")
  console.log(data3)
  const user_access_token = data3?.access_token
  if(!user_access_token) {
    console.warn("no access_token from wx gzh")
    console.log(res2)
    return { code: "E5004", errMsg: "no access_token from wx gzh" }
  }
  const wx_gzh_openid = data3?.openid
  if(!wx_gzh_openid) {
    console.warn("no openid from wx gzh")
    console.log(res2)
    return { code: "E5004", errMsg: "no openid from wx gzh" }
  }
  const is_snapshotuser = data3?.is_snapshotuser
  if(is_snapshotuser === 1) {
    console.warn("the user is a snapshot user")
    console.log(res2)
    return { code: "U0007", errMsg: "the user is a snapshot user" }
  }

  // 4. get user's info
  const data4 = await getWxGzhSnsUserInfo(wx_gzh_openid, user_access_token)
  console.log("data4 in handle_wechat_bind: ")
  console.log(data4)
  if(!data4?.nickname) {
    return { 
      code: "E5004", 
      errMsg: "no nickname from wx gzh during wechat bind",
    }
  }

  // 5. find user by wx_gzh_openid
  const uCol = db.collection("User")
  const res5 = await uCol.where({ wx_gzh_openid }).get<Table_User>()
  const list5 = res5.data

  // 6. check out if the wx_gzh_openid has been bound
  let hasBound = false
  for(let i=0; i<list5.length; i++) {
    const v = list5[i]
    if(v.oState === "NORMAL" || v.oState === "LOCK") {
      hasBound = true
    }
  }
  if(hasBound) {
    return { code: "US002", errMsg: "wx_gzh_openid has been bound" }
  }

  // 6.2 check out if the wx_gzh_openid is in BlockList
  const bCol = db.collection("BlockList")
  const w6_2: Partial<Table_BlockList> = {
    type: "wx_gzh_openid",
    value: wx_gzh_openid,
    isOn: "Y",
  }
  const res6_2 = await bCol.where(w6_2).getOne<Table_BlockList>()
  const data6_2 = res6_2?.data
  if(data6_2) {
    console.warn("wx_gzh_openid is in BlockList")
    console.log(data6_2)
    return { code: "US005", errMsg: "wx_gzh_openid is in BlockList" }
  }


  // 7. get current user
  const userId = vRes.userData._id
  const res7 = await uCol.doc(userId).get<Table_User>()
  const user = res7.data
  if(!user || user.oState !== "NORMAL") {
    console.warn("user not found in handle_wechat_bind: ")
    console.log(user)
    return { code: "E4004", errMsg: "user not found" }
  }

  // 8. update user
  const thirdData = user.thirdData ?? {}
  const wx_gzh = thirdData.wx_gzh ?? {}
  wx_gzh.nickname = data4.nickname
  wx_gzh.headimgurl = data4.headimgurl
  thirdData.wx_gzh = wx_gzh

  const u8: Partial<Table_User> = {
    wx_gzh_openid,
    thirdData,
    updatedStamp: getNowStamp(),
  }
  const res8 = await uCol.doc(userId).update(u8)
  user.thirdData = thirdData
  user.wx_gzh_openid = wx_gzh_openid

  afterHandleWechatBind(user)

  return { code: "0000" }
}


async function handle_logout(
  ctx: FunctionContext,
  body: Record<string, string>,
): Promise<LiuRqReturn> {
  const token = body["x_liu_token"]
  const serial_id = body["x_liu_serial"]

  if(!token || !serial_id) {
    return { code: "E4000", errMsg: "token, serial_id are required" }
  }

  // 1. get token data
  const col = db.collection("Token")
  const res = await col.doc(serial_id).get<Table_Token>()
  const d = res.data

  // checking out if it exists
  if(!d) {
    return { code: "E4003", errMsg: "token not found" }
  }

  // checking out the token
  const _token = d.token
  if(_token !== token) {
    return { code: "E4003", errMsg: "your token is wrong" }
  }

  // 2. remove for db
  const res2 = await col.where({ _id: serial_id }).remove()

  // 3. remove for cache
  const map = getLiuTokenUser()
  map.delete(serial_id)

  return { code: "0000" }
}


async function handle_set(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
): Promise<LiuRqReturn> {

  // 1. check inputs
  const Sch_Set = vbot.object({
    theme: vbot.optional(Sch_LocalTheme),
    language: vbot.optional(Sch_LocalLocale),
  })
  const res1 = vbot.safeParse(Sch_Set, body)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }

  // 2. return err if both theme and language are empty
  const { theme, language } = res1.output
  if(!theme && !language) {
    return { code: "E4000", errMsg: "nothing to update" }
  }

  let updated = false
  const user = vRes.userData
  const u: Partial<Table_User> = {}

  // 3. update theme
  if(theme && theme !== user.theme) {
    updated = true
    u.theme = theme
  }

  // 4. update language
  if(language && language !== user.language) {
    updated = true
    u.language = language

    // 4.1 update on wechat gzh
    const oldLocale = getCurrentLocale({ user })
    const openid = user.wx_gzh_openid
    const tmpUser4 = { ...user, language }
    if(openid) {
      tagWxUserLang(openid, tmpUser4, undefined, oldLocale)
    }
  }

  // 5. return if no update
  if(!updated) {
    return { code: "0000" }
  }

  u.updatedStamp = getNowStamp()

  // 6. to update in db
  const userId = user._id
  const col_user = db.collection("User")
  const res6 = await col_user.doc(userId).update(u)

  // 7. update in cache
  const newUser = { ...user, ...u }
  updateUserInCache(userId, newUser)

  return { code: "0000" }
}


/** get the status of membership 
 *  so return UserSubscription
*/
async function handle_membership(
  vRes: VerifyTokenRes_B,
): Promise<LiuRqReturn<UserSettingsAPI.Res_Membership>> {
  // 1. get latest user data
  const res1 = await getLatestUser(vRes)
  if(!res1.pass) return res1.err
  const user = res1.data

  // 2. check out subscription
  const sub = user.subscription
  if(!sub || sub.isOn === "N") {
    return { code: "0000", data: {} }
  }
  const { stripe_customer_id } = user

  // 3. get latest stripe customer portal if needed
  let update_user = false
  const uUser: Partial<Table_User> = {}
  if(stripe_customer_id) {
    const cpc = sub.stripe?.customer_portal_created ?? 1
    const cpu = sub.stripe?.customer_portal_url
    const diff = getNowStamp() - (cpc * 1000)

    // if customer_portal_url is not existed
    // or customer_portal_created is over 24 hrs
    if(!cpu || diff >= DAY) {
      const cPortal = await getStripeCustomerPortal(stripe_customer_id)
      if(cPortal) {
        sub.stripe = {
          ...sub.stripe,
          customer_portal_created: cPortal.created,
          customer_portal_url: cPortal.url,
        }
        user.subscription = sub
        uUser.subscription = sub
        update_user = true
      }
      else {
        console.warn("err happened during getStripeCustomerPortal")
      }
    }
  }

  // n. update user if needed
  if(update_user) {
    const user_id = user._id
    const col_user = db.collection("User")
    await col_user.where({ _id: user_id }).update(uUser)
    updateUserInCache(user_id, user)
  }

  return { code: "0000", data: { subscription: sub } }
}

async function getStripeCustomerPortal(
  customer: string
) {
  const stripe = LiuStripe.getStripeInstance()
  if(!stripe) return

  let return_url = process.env.LIU_DOMAIN
  if(return_url) {
    return_url += `/subscription`
  }

  try {
    const res = await stripe.billingPortal.sessions.create({
      customer,
      return_url,
    })
    return res
  }
  catch(err) {
    console.warn("stripe.billingPortal.sessions.create err:")
    console.log(err)
  }
}


async function handle_enter(
  ctx: FunctionContext,
  vRes: VerifyTokenRes_B,
): Promise<LiuRqReturn<UserSettingsAPI.Res_Enter>> {
  // 0. get some params
  const user = vRes.userData
  const userAgent = ctx.headers?.['user-agent']
  const body = ctx.request?.body ?? {}
  const userTimezone = body.x_liu_timezone 

  // 1. 去获取用户基础设置
  const res1 = await getUserSettings(user)
  if(res1.code !== "0000" || !res1.data) {
    return res1
  }

  // 2. 去记录用户访问了应用
  const now = getNowStamp()
  const u: MongoFilter<Table_User> = {
    lastEnterStamp: now,
    activeStamp: now,
    updatedStamp: now,
    userAgent,
  }
  if(userTimezone !== user.timezone) {
    u.timezone = userTimezone
  }


  // 3. 查看 verifyToken 时，是否有生成新的 token serial
  // 若有，送进回调里
  if(vRes.new_serial && vRes.new_token) {
    res1.data.new_serial = vRes.new_serial
    res1.data.new_token = vRes.new_token
  }

  const q = db.collection("User").where({ _id: user._id })
  q.update(u)
  
  return res1
}

/** get user's latest status */
async function handle_latest(
  vRes: VerifyTokenRes_B,
) {
  const res0 = await getLatestUser(vRes)
  if(!res0.pass) return res0.err
  const user = res0.data

  const res1 = await getUserSettings(user)
  const data = res1.data
  if(res1.code !== "0000" || !data) {
    return res1 as LiuRqReturn<UserSettingsAPI.Res_Latest>
  }
  const newData: UserSettingsAPI.Res_Latest = { ...data }
  const newRes: LiuRqReturn<UserSettingsAPI.Res_Latest> = {
    code: "0000",
    data: newData
  }
  return newRes
}

// handle avatar after binding wechat
async function afterHandleWechatBind(
  user: Table_User,
) {
  // 1. get param
  const { wx_gzh_openid, thirdData } = user
  if(!wx_gzh_openid || !thirdData) return
  const userId = user._id
  const wx_gzh_access_token = await checkAndGetWxGzhAccessToken()
  if(!wx_gzh_access_token) return
  const data1 = await getWxGzhUserInfo(wx_gzh_openid)
  if(!data1) return

  // console.log("data1 in afterHandleWechatBind: ")
  // console.log(data1)

  // 2. set wx_gzh other data
  const wx_gzh = thirdData.wx_gzh ?? {}
  let hasUserChanged = false
  if(wx_gzh.subscribe !== data1.subscribe) {
    hasUserChanged = true
    wx_gzh.subscribe = data1.subscribe
  }
  if(wx_gzh.language !== data1.language) {
    hasUserChanged = true
    wx_gzh.language = data1.language
  }
  if(wx_gzh.subscribe_scene !== data1.subscribe_scene) {
    hasUserChanged = true
    wx_gzh.subscribe_scene = data1.subscribe_scene
  }
  if(wx_gzh.subscribe_time !== data1.subscribe_time) {
    hasUserChanged = true
    wx_gzh.subscribe_time = data1.subscribe_time
  }
  if(hasUserChanged) {
    const u2: Partial<Table_User> = {
      thirdData,
      updatedStamp: getNowStamp(),
    }
    const uCol = db.collection("User")
    await uCol.doc(userId).update(u2)
  }

  // 3. get my personal member 
  const mCol = db.collection("Member")
  const w3: Partial<Table_Member> = {
    user: userId,
    spaceType: "ME",
  }
  const res3 = await mCol.where(w3).getOne<Table_Member>()
  const member = res3.data
  if(!member) {
    console.warn("there is no member in afterHandleWechatBind")
    console.log(res3)
    console.log(w3)
    return
  }

  // console.log("member in afterHandleWechatBind: ")
  // console.log(member)

  // 4. check out wx_gzh_toggle
  const memberId = member._id
  const noti = member.notification ?? {}
  const oldToggle = noti.wx_gzh_toggle ?? false
  const newToggle = Boolean(data1.subscribe === 1)
  if(oldToggle !== newToggle) {
    noti.wx_gzh_toggle = newToggle
    const u4: Partial<Table_Member> = {
      notification: noti,
      updatedStamp: getNowStamp(),
    }
    await mCol.doc(memberId).update(u4)
  }

  // 5. check out avatar
  const myAvatarUrl = member.avatar?.url
  if(!myAvatarUrl) {
    handle_avatar(user, thirdData)
  }

  // 6. tag wx user language
  tagWxUserLang(wx_gzh_openid, user, data1)
  
  return true
}


/**
 * 获取用户基础设置
 * 1. 登录方式，比如 email / GitHub ID 等等
 * 2. 已经加入哪些工作区，这些工作区的名称和头像
 */
async function getUserSettings(
  user: Table_User,
): Promise<LiuRqReturn<UserSettingsAPI.Res_Enter>> {
  const [ui] = await getUserInfos([user])
  if(!ui) {
    return { code: "E4004", errMsg: "it cannot find an userinfo" }
  }

  const { 
    email, 
    open_id,
    github_id, 
    theme, 
    language, 
    subscription,
    wx_gzh_openid,
    phone,
    thirdData,
  } = user
  const spaceMemberList = ui.spaceMemberList
  let wx_gzh_nickname = thirdData?.wx_gzh?.nickname
  if(!wx_gzh_openid) {
    wx_gzh_nickname = undefined
  }

  const data: UserSettingsAPI.Res_Enter = {
    email,
    open_id,
    github_id,
    theme,
    language,
    spaceMemberList,
    subscription,
    phone_pixelated: pixelatePhone(phone),

    /** weixin data */
    wx_gzh_openid,
    wx_gzh_nickname,
  }

  return { code: "0000", data }
}

async function getLatestUser(
  vRes: VerifyTokenRes_B,
): Promise<DataPass<Table_User>> {
  const userId = vRes.userData._id
  const col_user = db.collection("User")
  const res1 = await col_user.doc(userId).get<Table_User>()
  const user = res1.data
  if(!user) {
    return { pass: false, err: { code: "E4004", errMsg: "user not found" } }
  }
  return { pass: true, data: user }
}

async function addWxGzhOpenidToBlockList(
  wx_gzh_openid: string,
) {
  // 1. get old instance
  const bCol = db.collection("BlockList")
  const w1: Partial<Table_BlockList> = {
    type: "wx_gzh_openid",
    value: wx_gzh_openid,
    duration: "one_month",
  }
  const res1 = await bCol.where(w1).getOne<Table_BlockList>()
  const blockItem = res1.data

  // 2. delete the instance if exists
  if(blockItem) {
    await bCol.doc(blockItem._id).remove()
  }

  // 3. add a new instance
  const b3 = getBasicStampWhileAdding()
  const w3: Partial_Id<Table_BlockList> = {
    ...b3,
    type: "wx_gzh_openid",
    isOn: "Y",
    value: wx_gzh_openid,
    duration: "one_month",
  }
  const res3 = await bCol.add(w3)
  return { code: "0000" }
}

function pixelatePhone(phone?: string) {
  if(!phone) return
  const res = normalizePhoneNumber(phone)
  if(!res) return
  const { localNumber } = res

  const aPixel = "*"
  let prefix = ""
  let pixels = ""
  let suffix = ""

  const len = localNumber.length
  if(len < 5) return localNumber

  if(len >= 11) {
    prefix = localNumber.substring(0, 3)
    pixels = aPixel.repeat(len - 5)
    suffix = localNumber.substring(len - 2)
  }
  else {
    prefix = localNumber.substring(0, 2)
    pixels = aPixel.repeat(len - 4)
    suffix = localNumber.substring(len - 2)
  }

  return prefix + pixels + suffix
}


async function toCreateDefaultAiRoom(
  userId: string,
) {
  const b1 = getBasicStampWhileAdding()
  const characters = AiShared.fillCharacters()
  const newRoom: Partial_Id<Table_AiRoom> = {
    ...b1,
    owner: userId,
    characters,
  }
  const rCol = db.collection("AiRoom")
  const res1 = await rCol.add(newRoom)
  const roomId = getDocAddId(res1)
  if(!roomId) return
  newRoom._id = roomId
  return newRoom as Table_AiRoom
}

