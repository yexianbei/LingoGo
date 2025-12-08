// Function Name: clock-one-hr
// 定时系统: 每 60 分钟执行一次
// 清理过期的 Credential
import cloud from '@lafjs/cloud'
import { 
  getNowStamp, 
  HOUR, 
  DAY, 
  WEEK, 
  localizeStamp,
  currentHoursOfSpecificTimezone,
  formatTimezone,
} from "@/common-time"
import type { 
  Config_WeCom_Qynb,
  Config_WeChat_GZH,
  Config_WeChat_MINI,
  Table_Config,
  WxpayReqAuthorizationOpt,
  Res_Wxpay_Download_Cert,
  LiuWxpayCert,
  Table_User,
} from '@/common-types'
import {
  checkAndGetWxGzhAccessToken,
  LiuDateUtil, 
  liuFetch, 
  liuReq, 
  valTool, 
  WxpayHandler,
} from '@/common-util'
import {
  wxpay_apiclient_key, 
  wxpay_apiclient_serial_no,
} from "@/secret-config"
import { 
  set as date_fn_set, 
  addDays,
} from "date-fns"
import { LiuReporter, WxGzhSender } from '@/service-send'
import { wx_expired_tmpl } from '@/common-config'

const API_WECHAT_ACCESS_TOKEN = "https://api.weixin.qq.com/cgi-bin/token"
const API_WX_JSAPI_TICKET = "https://api.weixin.qq.com/cgi-bin/ticket/getticket"
const API_WECOM_ACCESS_TOKEN = "https://qyapi.weixin.qq.com/cgi-bin/gettoken"

// 微信支付 下载平台证书
const WXPAY_DOMAIN = "https://api.mch.weixin.qq.com"
const WXPAY_DOWNLOAD_CERT_PATH = `/v3/certificates`

const db0 = cloud.mongo.db
const db = cloud.database()
const _ = db.command

export async function main(ctx: FunctionContext) {

  // console.log("---------- Start clock-one-hr ----------")

  // 1. clear data expired
  await clearExpiredCredentials()
  await clearDrafts()
  await clearTokens()

  // 2. get config
  const cfg = await getGlobalConfig()
  if(!cfg) return false

  // 3.1 get accessToken from wechat gzh
  const wechat_gzh = await handleWeChatGZHConfig(cfg)

  // 3.2 get accessToken from wechat mini
  const wechat_mini = await handleWeChatMini(cfg)

  // 4. get accessToken from wecom
  const wecom_qynb = await handleWeComQynbConfig(cfg)

  // 5. get wxpay certs
  const wxpay_certs = await handleWxpayCerts()

  // 6. update config
  await updateGlobalConfig(cfg, { 
    wechat_gzh, 
    wechat_mini,
    wecom_qynb, 
    wxpay_certs,
  })

  // 7. update user's quota on 1st day of each month
  await updateUserQuota()

  // 8. statistics
  await handleStatistics()

  // 9. find users whose membership will be expired within 3 hours
  await findMembershipWillExpired()
  
  

  // console.log("---------- End clock-one-hr ----------")
  // console.log("                                      ")

  return true
}



export async function findMembershipWillExpired() {
  const now1 = getNowStamp()
  const TWO_HOURS_LATER = now1 + (2 * HOUR)
  const THREE_HOURS_LATER = now1 + (3 * HOUR)

  // 1. find users
  const w1 = {
    "oState": "NORMAL",
    "wx_gzh_openid": _.exists(true),
    "subscription.expireStamp": _.and(
      _.gt(TWO_HOURS_LATER),
      _.lte(THREE_HOURS_LATER),
    ),
    "subscription.isOn": "Y",
  }
  const uCol = db.collection("User")
  const res1 = await uCol.where(w1).get<Table_User>()
  const users = res1.data
  if(users.length < 1) return { code: "E4004" }

  // 2. get required params
  const access_token = await checkAndGetWxGzhAccessToken()
  if(!access_token) {
    console.warn("fail to get access token for coming soon expired users")
    return { code: "E4000" }
  }
  const _env = process.env
  const domain = _env.LIU_DOMAIN
  const tmplId = _env.LIU_WX_GZ_TMPL_ID_2
  if(!tmplId || !domain) {
    console.warn("domain and tmplid are required for coming soon expired users")
    return { code: "E4000" }
  }
  const baseBody = { ...wx_expired_tmpl }
  baseBody.template_id = tmplId
  baseBody.url = `${domain}/subscription`
  
  // 3. send message
  let num = 0
  for(let i=0; i<users.length; i++) {

    // 3.1 get wx_gzh_openid
    const user = users[i]
    const wx_gzh_openid = user.wx_gzh_openid
    if(!wx_gzh_openid) continue

    // 3.2 construct object
    const body = { ...baseBody }
    body.touser = wx_gzh_openid
    WxGzhSender.sendTemplateMessage(access_token, body)

    await valTool.waitMilli(100)
    num++
  }

  return { code: "0000", data: { num } }
}


export async function updateUserQuota() {
  // 1. check out if the moment is the 1st day of the month and in midnight
  const stamp1 = getNowStamp()
  const currentStamp = localizeStamp(stamp1)
  const d1 = new Date(currentStamp)
  const currentDate = d1.getDate()
  const currentHour = d1.getHours()
  if(currentDate !== 1 || currentHour !== 0) {
    return
  }
  console.warn("the moment is the 1st day of the month and in midnight")

  // 2. get to update
  const w2 = {
    quota: _.exists(true),
  }
  const u2 = {
    "quota.aiConversationCount": 0,
    "quota.aiClusterCount": 0,
  } 
  const uCol = db.collection("User")
  const res2 = await uCol.where(w2).update(u2, { multi: true })
  console.log("updateUserQuota res2: ", res2)

  // 3. send report
  const reporter = new LiuReporter()
  reporter.sendAny("Monthly Update User Quota", res2)
  
}


interface UpdateCfgOpt {
  wechat_gzh?: Config_WeChat_GZH
  wechat_mini?: Config_WeChat_MINI
  wecom_qynb?: Config_WeCom_Qynb
  wxpay_certs?: LiuWxpayCert[]
}

async function updateGlobalConfig(
  cfg: Table_Config,
  opt: UpdateCfgOpt,
) {
  
  const str = valTool.objToStr(opt)
  if(!str || str === "{}") {
    console.warn("nothing to update")
    return false
  }

  const u: Partial<Table_Config> = {
    ...opt,
    updatedStamp: getNowStamp(),
  }
  const res2 = await db.collection("Config").doc(cfg._id).update(u)
  // console.log("updateGlobalConfig res2:")
  // console.log(res2)

  return true
}


async function getGlobalConfig() {
  const col = db.collection("Config")
  const res = await col.get<Table_Config>()
  const list = res.data
  let cfg = list[0]
  if(!cfg) {
    console.warn("fail to get config")
    console.log(cfg)
    return
  }
  
  return cfg
}

async function handleWeChatMini(
  cfg: Table_Config
): Promise<Config_WeChat_MINI | undefined> {
  // 1. get params
  const now1 = getNowStamp()
  const _env = process.env
  const appid = _env.LIU_WX_MINI_APPID
  const secret = _env.LIU_WX_MINI_APPSECRET
  if(!appid || !secret) {
    console.warn("appid and secret are required")
    console.log("fail to get access_token from wechat mini")
    return
  }

  // 2. fetch access_token
  const url2 = new URL(API_WECHAT_ACCESS_TOKEN)
  const sP2 = url2.searchParams
  sP2.set("grant_type", "client_credential")
  sP2.set("appid", appid)
  sP2.set("secret", secret)
  const link2 = url2.toString()
  const res2 = await liuReq(link2, undefined, { method: "GET" })
  const rData2 = res2?.data
  const access_token = rData2?.access_token
  if(!access_token) {
    console.warn("fail to get access_token from wechat mini")
    console.log(res2)
    return
  }

  const wechat_mini: Config_WeChat_MINI = {
    ...cfg.wechat_mini,
    
    // for access_token
    access_token,
    expires_in: rData2?.expires_in,
    lastGetStamp: now1,
  }
  return wechat_mini
}

async function handleWeChatGZHConfig(
  cfg: Table_Config
): Promise<Config_WeChat_GZH | undefined> {
  // 1. get params
  const now1 = getNowStamp()
  const _env = process.env
  const appid = _env.LIU_WX_GZ_APPID
  const secret = _env.LIU_WX_GZ_APPSECRET
  if(!appid || !secret) {
    console.warn("appid and secret are required")
    console.log("fail to get access_token from wechat")
    return
  }

  // 2. fetch access_token
  const url2 = new URL(API_WECHAT_ACCESS_TOKEN)
  const sP2 = url2.searchParams
  sP2.set("grant_type", "client_credential")
  sP2.set("appid", appid)
  sP2.set("secret", secret)
  const link2 = url2.toString()
  const res2 = await liuReq(link2, undefined, { method: "GET" })
  const rData2 = res2?.data
  const access_token = rData2?.access_token
  if(!access_token) {
    console.warn("fail to get access_token from wechat")
    console.log(res2)
    return
  }

  // 3. handle jsapi_ticket
  const url3 = new URL(API_WX_JSAPI_TICKET)
  const sP3 = url3.searchParams
  sP3.set("access_token", access_token)
  sP3.set("type", "jsapi")
  const link3 = url3.toString()
  const res3 = await liuReq(link3, undefined, { method: "GET" })
  const rData3 = res3?.data
  const jsapi_ticket = rData3?.ticket
  if(!jsapi_ticket) {
    console.warn("fail to get jsapi_ticket from wechat")
    console.log(res3)
    return
  }

  const wechat_gzh: Config_WeChat_GZH = {
    ...cfg.wechat_gzh,
    
    // for access_token
    access_token,
    expires_in: rData2?.expires_in,
    lastGetStamp: now1,

    // for jsapi
    jsapi_ticket,
  }
  return wechat_gzh
}

async function handleWeComQynbConfig(
  cfg: Table_Config
): Promise<Config_WeCom_Qynb | undefined> {
  // 1. get params
  const now1 = getNowStamp()
  const _env = process.env
  const corpid = _env.LIU_WECOM_QYNB_CORPID
  const secret = _env.LIU_WECOM_QYNB_SECRET
  if(!corpid || !secret) {
    return
  }

  // 2. fetch access_token
  const url = new URL(API_WECOM_ACCESS_TOKEN)
  const sP = url.searchParams
  sP.set("corpid", corpid)
  sP.set("corpsecret", secret)
  const link = url.toString()
  const res1 = await liuReq(link, undefined, { method: "GET" })
  const rData = res1?.data
  const access_token = rData?.access_token
  if(!access_token) {
    console.warn("fail to get access_token from wecom")
    console.log(res1)
    return
  }

  const wecom_qynb: Config_WeCom_Qynb = {
    ...cfg.wecom_qynb,
    access_token,
    expires_in: rData?.expires_in,
    lastGetStamp: now1,
  }
  return wecom_qynb
}


async function clearDrafts() {
  const DAY_21_AGO = getNowStamp() - (21 * DAY)
  const q = {
    updatedStamp: {
      $lte: DAY_21_AGO
    },
    oState: {
      $in: ["POSTED", "DELETED"]
    }
  }
  const col = db0.collection("Draft")
  const res1 = await col.deleteMany(q)
  // console.log("删除 21 天前已发表或已删除的草稿 result: ")
  // console.log(res1)

  const DAY_42_AGO = getNowStamp() - (42 * DAY)
  const q2 = {
    editedStamp: {
      $lte: DAY_42_AGO
    }
  }
  const res2 = await col.deleteMany(q2)
  // console.log("删除过去 42 天内都没被更新的草稿 result: ")
  // console.log(res2)
}


// 去清除已经过期超过 1hr 的凭证
async function clearExpiredCredentials() {
  const ONE_HR_AGO = getNowStamp() - HOUR
  const q = {
    expireStamp: {
      $lte: ONE_HR_AGO
    }
  }
  const col = db0.collection("Credential")
  const res = await col.deleteMany(q)
  // console.log("clearExpiredCredentials res:")
  // console.log(res)

  return true
}

async function clearTokens() {

  const col = db0.collection("Token")

  // 1. to clear the tokens whose isOn is equal to "N"
  const q1 = { isOn: "N" }
  const res1 = await col.deleteMany(q1)

  // 2. to clear the tokens whose expireStamp is less than one week ago
  // and they are not related to binding something
  const ONE_WEEK_AGO = getNowStamp() - WEEK
  const q2 = {
    expireStamp: {
      $lte: ONE_WEEK_AGO,
    },
    infoType: {
      $nin: ["bind-wecom"]
    }
  }
  const res2 = await col.deleteMany(q2)
  
  return true
}

async function handleWxpayCerts(): Promise<LiuWxpayCert[] | undefined> {
  // 0. check out if need
  const _env = process.env
  if(!_env.LIU_WXPAY_API_V3_KEY) return
  if(!wxpay_apiclient_key) return
  if(!wxpay_apiclient_serial_no) return

  // 1. get authorization
  const opt1: WxpayReqAuthorizationOpt = {
    method: "GET",
    path: WXPAY_DOWNLOAD_CERT_PATH,
  }
  const res1 = WxpayHandler.getWxpayReqAuthorization(opt1)
  if(!res1.pass || !res1.data) {
    console.warn("fail to get Authorization in handleWxpayCerts")
    return
  }

  // 2. get headers
  const headers = WxpayHandler.getWxpayReqHeaders({ Authorization: res1.data })
  
  // 3. to fetch
  const url3 = WXPAY_DOMAIN + WXPAY_DOWNLOAD_CERT_PATH
  const res3 = await liuFetch<Res_Wxpay_Download_Cert>(url3, { headers, method: "GET" })
  const data3 = res3.data
  if(res3.code !== "0000" || !data3) {
    console.warn("fail to fetch certs in handleWxpayCerts")
    console.log("headers: ")
    console.log(headers)
    console.log(res3)
    return
  }

  // 4. get json from data3
  const json4 = data3.json
  if(!json4) {
    console.warn("no json4 in handleWxpayCerts")
    console.log(data3)
    return
  }

  // 5. decrypt
  const list = json4.data
  const certs: LiuWxpayCert[] = []
  for(let i=0; i<list.length; i++) {
    const v = list[i]
    const cert = WxpayHandler.getLiuWxpayCert(v)
    if(cert) {
      certs.push(cert)
    }
  }

  return certs
}

/** Using NocoDB to get app statistics */
async function handleStatistics() {

  // 1. only trigger once a day in midnight
  const _env = process.env
  const appTimezone = _env.LIU_TIMEZONE ?? "0"
  const tz = formatTimezone(appTimezone)
  const hrs = currentHoursOfSpecificTimezone(tz)
  console.warn("hrs: ", hrs)
  if(hrs !== 0) return

  // 2. get nocodb params
  const baseURL = _env.LIU_NOCODB_BASEURL
  const token = _env.LIU_NOCODB_TOKEN
  const tableId = _env.LIU_NOCODB_TABLE_1
  if(!baseURL || !token || !tableId) return

  // 3. get yesterday
  const now = getNowStamp()
  const appStamp = localizeStamp(now, appTimezone)
  const currentDate = new Date(appStamp)
  const todayDate = date_fn_set(currentDate, {
    hours: 0, minutes: 0, seconds: 0, milliseconds: 0,
  })
  const yesterdayDate = addDays(todayDate, -1)
  const date = LiuDateUtil.getYYYYMMDD(yesterdayDate.getTime())

  // 4. get overview
  const data4 = await _getStatisticForOverview()
  console.warn("statistic overview: ")
  console.log(data4)

  // 5. define data sent to nocodb
  const body = {
    ...data4,
    "Date": date,
  }
  const url = `${baseURL}/api/v2/tables/${tableId}/records`
  const headers = { "xc-token": token }

  // 6. define a function to add row into statistics
  // and try again if needed
  const _tryToAdd = async () => {
    let res6 = await liuReq(url, body, { method: "POST", headers })

    if(res6.code !== "0000" || !res6.data?.Id) {
      await valTool.waitMilli(3000)
      res6 = await liuReq(url, body, { method: "POST", headers })
    }

    return res6
  }

  // 7. fetch
  let res7 = await _tryToAdd()
  if(res7.code !== "0000" || !res7.data?.Id) {
    console.warn("fail to add row into statistics!")
    console.log(res7)
    const reporter = new LiuReporter()
    reporter.send("FlashNote: fail to add row into statistics", "Statistics Error")
  }

  return res7
}

// get D1 / D2 .......
async function _getStatisticForOverview() {
  const uCol = db.collection("User")

  // 1. get DAU
  const now = getNowStamp()
  const ONE_DAY_AGO = now - DAY
  const w = {
    oState: "NORMAL",
    activeStamp: _.gte(ONE_DAY_AGO),
  }
  const res1 = await uCol.where(w).count()
  if(!res1.ok) {
    console.warn("get DAU err::")
    console.log(res1)
  }
  const D1 = res1.total

  // 2. get D2
  const TWO_DAY_AGO = ONE_DAY_AGO - DAY
  w.activeStamp = _.gte(TWO_DAY_AGO)
  const res2 = await uCol.where(w).count()
  const D2 = res2.total

  // 3. get D3
  const THREE_DAY_AGO = TWO_DAY_AGO - DAY
  w.activeStamp = _.gte(THREE_DAY_AGO)
  const res3 = await uCol.where(w).count()
  const D3 = res3.total

  // 4. get D5
  const FIVE_DAY_AGO = THREE_DAY_AGO - DAY - DAY
  w.activeStamp = _.gte(FIVE_DAY_AGO)
  const res4 = await uCol.where(w).count()
  const D5 = res4.total

  // 5. get D7
  const WEEK_AGO = FIVE_DAY_AGO - DAY - DAY
  w.activeStamp = _.gte(WEEK_AGO)
  const res5 = await uCol.where(w).count()
  const D7 = res5.total

  // 6. get D14
  const TWO_WEEK_AGO = WEEK_AGO - (DAY * 7)
  w.activeStamp = _.gte(TWO_WEEK_AGO)
  const res6 = await uCol.where(w).count()
  const D14 = res6.total

  // 7. get D30
  const ONE_MONTH_AGO = ONE_DAY_AGO - (DAY * 30)
  w.activeStamp = _.gte(ONE_MONTH_AGO)
  const res7 = await uCol.where(w).count()
  const D30 = res7.total

  // 8. get E1
  const w2 = {
    oState: "NORMAL",
    lastEnterStamp: _.gte(ONE_DAY_AGO),
  }
  const res8 = await uCol.where(w2).count()
  if(!res8.ok) {
    console.warn("get E1 err::")
    console.log(res8)
  }
  const E1 = res8.total

  // 9. get E2
  w2.lastEnterStamp = _.gte(TWO_DAY_AGO)
  const res9 = await uCol.where(w2).count()
  const E2 = res9.total

  // 10. get E3
  w2.lastEnterStamp = _.gte(THREE_DAY_AGO)
  const res10 = await uCol.where(w2).count()
  const E3 = res10.total

  // 11. get E5
  w2.lastEnterStamp = _.gte(FIVE_DAY_AGO)
  const res11 = await uCol.where(w2).count()
  const E5 = res11.total

  // 12. get E7
  w2.lastEnterStamp = _.gte(WEEK_AGO)
  const res12 = await uCol.where(w2).count()
  const E7 = res12.total

  // 13. get E14
  w2.lastEnterStamp = _.gte(TWO_WEEK_AGO)
  const res13 = await uCol.where(w2).count()
  const E14 = res13.total

  // 14. get E30
  w2.lastEnterStamp = _.gte(ONE_MONTH_AGO)
  const res14 = await uCol.where(w2).count()
  const E30 = res14.total

  // 15. get Total users
  const w3 = { oState: "NORMAL" }
  const res15 = await uCol.where(w3).count()
  const Total_Users = res15.total

  // 16. get the number of devices
  const w4 = {
    "isOn": "Y",
    "lastSet": _.gte(ONE_DAY_AGO),
  }
  const tCol = db.collection("Token")
  const res16 = await tCol.where(w4).count()
  const Devices = res16.total

  return {
    D1, D2, D3, D5, D7, D14, D30,
    E1, E2, E3, E5, E7, E14, E30,
    Total_Users, Devices,
  }
}


