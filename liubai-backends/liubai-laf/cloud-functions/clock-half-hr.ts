// Function Name: clock-half-hr
// 定时系统: 每 30 分钟执行一次

/**
 * 1. clear bind-wecom credentials in db
 * 2. clear login state in db
 * 3. clear login state in memory
 * 4. clear token user in memory
 * 5. clear expired orders in db
 * 6. check security like updating blocked ips
 */

import cloud from '@lafjs/cloud'
import type { 
  Shared_LoginState, 
  Shared_TokenUser,
  Table_Credential,
  Table_Order,
  Table_WxTask,
} from "@/common-types"
import { getNowStamp, MINUTE, HOUR } from "@/common-time"
import { 
  getWwQynbAccessToken, 
  liuReq, 
  SafeGuard,
  WxMiniHandler,
} from '@/common-util'
import { notifyWxToCloseChatTool } from '@/people-tasks'
import { ppl_system_cfg } from '@/common-config'

const db = cloud.database()
const _ = db.command

const MIN_20 = 20 * MINUTE
const MIN_15 = 15 * MINUTE
const HR_23 = 23 * HOUR

const API_WECOM_DEL_CONTACT_WAY = "https://qyapi.weixin.qq.com/cgi-bin/externalcontact/del_contact_way"

export async function main(ctx: FunctionContext) {

  // console.log("---------- Start 清理缓存程序 ----------")
  await clearBindWecom()
  await clearLoginStateInDB()
  clearLoginStateInMemory()
  clearTokenUser()
  await clearExpiredOrder()
  await checkSecurity()
  await checkWxTasksToClose()
  await checkWxTasksForComingSoon()
  // console.log("---------- End 清理缓存程序 ----------")
  // console.log(" ")

  return true
}

export async function checkWxTasksForComingSoon() {
  const time1 = getNowStamp() + ppl_system_cfg.coming_soom_hrs * HOUR
  const time2 = Math.floor(time1 + 0.5 * HOUR)
  const threshold1 = _.gte(time1)
  const threshold2 = _.lt(time2)
  const constraint1 = _.and(threshold1, threshold2)

  const w1 = {
    oState: "OK",
    taskState: "DEFAULT",
    activity_id: _.exists(true),
    endStamp: constraint1,
  }
  const wtCol = db.collection("WxTask")
  const q1 = wtCol.where(w1).limit(50).orderBy("insertedStamp", "asc")
  const res1 = await q1.get<Table_WxTask>()
  const tasks = res1.data
  if(tasks.length < 1) {
    return true
  }

  for(let i=0; i<tasks.length; i++) {
    const v = tasks[i]
    const activity_id = v.activity_id as string
    const isActivity = v.infoType === "ACTIVITY"
    const tmpl_id = isActivity ? ppl_system_cfg.activity_tmpl_id : ppl_system_cfg.task_tmpl_id
    await WxMiniHandler.setChatToolMsg(activity_id, 2, tmpl_id)
  }
  return true
}

async function checkWxTasksToClose() {
  
  // 1. get tasks
  const HR_23_AGO = getNowStamp() - HR_23
  const ONE_DAY_AGO = HR_23_AGO - HOUR
  const w1 = {
    oState: "OK",
    infoType: "TASK",
    taskState: "DEFAULT",
    updatedStamp: _.lt(HR_23_AGO),
    assigneeList: _.elemMatch({
      doneStamp: _.gte(ONE_DAY_AGO),
    }),
  }
  const wtCol = db.collection("WxTask")
  const q1 = wtCol.where(w1).limit(50).orderBy("updatedStamp", "desc")
  const res1 = await q1.get<Table_WxTask>()
  const tasks = res1.data
  if(tasks.length < 1) return true

  let closedNum = 0
  const originalNum = tasks.length
  for(let i=0; i<tasks.length; i++) {

    // 2. check if everyone is done
    const v = tasks[i]
    const { assigneeList, _id, owner_openid } = v
    if(!assigneeList || assigneeList.length < 1) continue
    const someoneNotDone = assigneeList.find(item => !Boolean(item.doneStamp))
    if(someoneNotDone) continue

    // 3. handle finished_openids
    const finished_openids = v.finished_openids ?? []
    if(!finished_openids.includes(owner_openid)) {
      finished_openids.push(owner_openid)
    }

    // 4. update db
    const now2 = getNowStamp()
    const u2: Partial<Table_WxTask> = {
      taskState: "CLOSED",
      related_openids: [],
      finished_openids,
      closedStamp: now2,
      updatedStamp: now2,
    }
    await wtCol.doc(_id).update(u2)
    closedNum++

    // 5. notify wechat
    const activity_id = v.activity_id
    if(!activity_id) continue
    const resFromWx = await notifyWxToCloseChatTool(activity_id, false)
    if(!resFromWx.pass) {
      console.warn("fail to notify wechat to close task: ", activity_id)
      console.log(resFromWx)
    }
  }
  
  console.log(`closed ${closedNum} tasks from ${originalNum}`)
  return true
}


async function clearExpiredOrder() {
  const MIN_15_AGO = getNowStamp() - MIN_15

  // 1. get expired orders
  const col = db.collection("Order")
  const w1 = {
    oState: "OK",
    orderStatus: "INIT",
    expireStamp: _.lt(MIN_15_AGO),
  }
  const res1 = await col.where(w1).get<Table_Order>()
  const d1 = res1.data
  if(d1.length < 1) return true

  // 2. to delete
  const res2 = await col.where(w1).remove({ multi: true })
  // console.log("clearExpiredOrder res2: ")
  // console.log(res2)
  
  return true
}

async function checkSecurity() {
  await SafeGuard.handleBlockedIPs()
}


/** to clear credentials about `bind-wecom` */
async function clearBindWecom() {
  const MIN_15_AGO = getNowStamp() - MIN_15

  // 1. get credentials
  const col = db.collection("Credential")
  const w1 = {
    infoType: "bind-wecom",
    expireStamp: _.lt(MIN_15_AGO),
  }
  const res1 = await col.where(w1).get<Table_Credential>()
  const d1 = res1.data
  if(d1.length < 1) {
    return true
  }

  // 2. get accessToken for wecom
  const accessToken = await getWwQynbAccessToken()
  if(!accessToken) {
    console.warn("accessToken for wecom is not found")
    return false
  }

  // 3. get link of deleting contact way on wecom
  const url = new URL(API_WECOM_DEL_CONTACT_WAY)
  const sP = url.searchParams
  sP.set("access_token", accessToken)
  const link = url.toString()
  
  for(let i=0; i<d1.length; i++) {

    // 4. delete contact way
    const c4 = d1[i]
    const config_id = c4.meta_data?.ww_qynb_config_id
    if(!config_id) continue

    const res4 = await liuReq(link, { config_id })
    const d4 = res4.data  // it looks like { errcode: 0, errmsg: 'ok' }
    if(d4?.errmsg !== "ok") {
      console.warn("fail to delete contact way: ", config_id)
      console.log(res4)
      break
    }

    // 5. delete the credential
    const res5 = await col.doc(c4._id).remove()
  }

  return true
}


/** 清理 liu-login-state 字段的 map */
function clearLoginStateInMemory() {
  const gShared = cloud.shared
  const loginState: Map<string, Shared_LoginState> = gShared.get('liu-login-state')
  if(!loginState) {
    // console.log("liu-login-state 不存在，无需清理")
    // console.log(" ")
    return true
  }

  const size1 = loginState.size
  // console.log(`清理 loginState 前的 size: ${size1}`)

  const now = getNowStamp()
  loginState.forEach((val, key) => {
    const diff = now - val.createdStamp
    if(diff < MIN_20) return
    loginState.delete(key)
  })

  const size2 = loginState.size
  // console.log(`清理 loginState 后的 size: ${size2}`)

  return true
}

/** clear LoginState in db */
async function clearLoginStateInDB() {
  const now = getNowStamp()
  const sCol = db.collection("LoginState")
  const res = await sCol.where({
    insertedStamp: _.lt(now - MIN_20),
  }).remove({ multi: true })
}


/** 清理 liu-token-user 字段的 map */
function clearTokenUser() {
  const gShared = cloud.shared
  const tokenUser: Map<string, Shared_TokenUser> = gShared.get('liu-token-user')
  if(!tokenUser) {
    // console.log("liu-token-user 不存在，无需清理")
    // console.log(" ")
    return true
  }

  const size1 = tokenUser.size
  // console.log(`清理 tokenUser 前的 size: ${size1}`)

  const now = getNowStamp()
  tokenUser.forEach((val, key) => {
    const diff = now - val.lastSet
    if(diff < MIN_15) return
    tokenUser.delete(key)
  })

  const size2 = tokenUser.size
  // console.log(`清理 tokenUser 后的 size: ${size2}`)

  return true
}