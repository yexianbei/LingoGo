// Function Name: clock-per-min
// 定时系统: 每分钟执行一次
// 发送提醒
import cloud from "@lafjs/cloud";
import { addSeconds, set as date_fn_set } from "date-fns"
import type { 
  Table_Member, 
  Table_User,
  Table_Content,
  RequireSth,
  SupportedLocale,
  Table_WxTask,
  Table_WxBond,
  Wx_Param_Msg_Templ_Send,
} from "@/common-types";
import { 
  decryptEncData,
  LiuDateUtil,
  valTool,
  checkAndGetWxGzhAccessToken,
  RichTexter,
  getWxGzhUserInfo,
} from "@/common-util";
import { commonLang, getCurrentLocale, useI18n } from "@/common-i18n";
import { wx_reminder_tmpl } from "@/common-config";
import { WxGzhSender } from "@/service-send";
import { invoke_by_clock } from "@/ai-system-two";
import { getNowStamp } from "@/common-time";

const db = cloud.database()
const _ = db.command


/************************** types **************************/
interface RemindAtom {
  contentId: string
  userId: string
  memberId: string
  title?: string
  hasImage?: boolean
  hasFile?: boolean
  calendarStamp: number

  wx_gzh_openid?: string
  locale?: SupportedLocale
  timezone?: string
}

interface TaskRemindAtom {
  taskId: string
  userId: string
  title: string
  calendarStamp: number
  wx_gzh_openid?: string
  locale?: SupportedLocale
  timezone?: string
  name? :string
}

type RemindAtom_2 = RequireSth<RemindAtom, "wx_gzh_openid">
type TaskRemindAtom_2 = RequireSth<TaskRemindAtom, "wx_gzh_openid">

interface AuthorAtom {
  userId: string
  memberId: string

  wx_gzh_openid?: string
  locale?: SupportedLocale
  timezone?: string
}

type AuthorAtom_2 = RequireSth<AuthorAtom, "locale">

interface TaskAuthorAtom {
  userId: string
  wx_gzh_openid: string
  locale: SupportedLocale
  timezone?: string
  name?: string
}

type Field_User = {
  [key in keyof Table_User]?: 0 | 1
}

type Field_Member = {
  [key in keyof Table_Member]?: 0 | 1
}


/************************** entry **************************/
export async function main(ctx: FunctionContext) {

  await handle_remind()
  await handle_task_remind()
  await handle_system_two()
  await handle_update_unionid()

  return { code: "0000" }
}


async function handle_system_two() {
  const date = new Date()
  const min = date.getMinutes()
  const remainder = min % 5
  if(remainder !== 3) return
  await invoke_by_clock()
}

async function handle_update_unionid() {
  const w1 = {
    oState: "NORMAL",
    wx_unionid: _.exists(false),
    wx_gzh_openid: _.exists(true),
    thirdData: {
      wx_gzh: {
        subscribe: _.eq(1),
      }
    }
  }
  const uCol = db.collection("User")
  const q1 = uCol.where(w1).limit(50).orderBy("insertedStamp", "asc")
  const res = await q1.get<Table_User>()
  const users = res.data
  if (!users || users.length === 0) {
    return
  }
  const access_token = await checkAndGetWxGzhAccessToken()
  if (!access_token) {
    console.warn("handle_update_unionid: access_token is not found")
    return
  }

  const _unsubscribe = async (user: Table_User) => {
    const userId = user._id
    const wx_gzh = user.thirdData?.wx_gzh
    if(!wx_gzh) return
    wx_gzh.subscribe = 0
    const now3 = getNowStamp()
    const u3 = {
      "thirdData.wx_gzh": _.set(wx_gzh),
      "updatedStamp": now3,
    }
    await uCol.doc(userId).update(u3)
  }

  let updatedNum = 0
  for (const user of users) {
    const userId = user._id
    const wx_gzh_openid = user.wx_gzh_openid
    if (!wx_gzh_openid || user.wx_unionid) continue

    const userInfoRes = await getWxGzhUserInfo(wx_gzh_openid)
    if(!userInfoRes) {
      console.warn("handle_update_unionid: userInfoRes is not found")
      break
    }

    const wx_unionid = userInfoRes.unionid
    if(!wx_unionid) {
      console.warn("handle_update_unionid: unionid is not found", wx_gzh_openid)
      console.log(userInfoRes)
      if(userInfoRes.subscribe === 0) {
        await _unsubscribe(user)
      }
      continue
    }

    const w2: Partial<Table_User> = { wx_unionid }
    await uCol.doc(userId).update(w2)
    updatedNum++
    await valTool.waitMilli(200)
  }

  if(updatedNum > 0) {
    console.log(`update ${updatedNum} for wx_unionid from ${users.length}`)
  }
}


async function handle_task_remind() {
  // 1. get tmplId
  const _env = process.env
  const tmplId = _env.LIU_WX_GZ_TMPL_ID_1
  if(!tmplId) {
    return false
  }

  // 2. get startStamp and endStamp
  let startDate = addSeconds(new Date(), -59)
  startDate = date_fn_set(startDate, { seconds: 55, milliseconds: 0 })
  const endDate = addSeconds(startDate, 59)
  const startStamp = startDate.getTime()
  const endStamp = endDate.getTime()

  // 3. find atoms
  const atoms = await get_task_atoms(startStamp, endStamp)
  if(atoms.length < 1) {
    return true
  }

  // 4. find authors
  const atoms2 = await find_task_authors(atoms)
  if(atoms2.length < 1) {
    return true
  }

  // 5. get access token
  const access_token = await checkAndGetWxGzhAccessToken()
  if(!access_token) {
    return false
  }
  
  // 6. batch send
  await batch_send_for_tasks(access_token, atoms2)
}


async function find_task_authors(
  atoms: TaskRemindAtom[],
) {
  const userIds = valTool.uniqueArray(atoms.map(v => v.userId))
  const authors: TaskAuthorAtom[] = []

  const uCol = db.collection("User")
  let runTimes = 0
  const NUM_ONCE = 50
  const MAX_TIMES = 100

  // to find authors
  while(userIds.length > 0 && runTimes < MAX_TIMES) {
    const tmpUserIds = userIds.splice(0, NUM_ONCE)
    const w = {
      oState: "NORMAL",
      _id: _.in(tmpUserIds),
    }
    const f: Field_User = {
      _id: 1,
      oState: 1,
      thirdData: 1,
      wx_gzh_openid: 1,
      language: 1,
      systemLanguage: 1,
      timezone: 1,
    }
    const res1 = await uCol.where(w).field(f).get<Table_User>()
    const results1 = res1.data

    for(let i=0; i<results1.length; i++) {
      const user = results1[i]
      const wx_gzh_openid = user.wx_gzh_openid
      if(!wx_gzh_openid) continue
      const author: TaskAuthorAtom = {
        userId: user._id,
        wx_gzh_openid,
        locale: getCurrentLocale({ user }),
        timezone: user.timezone,
        name: user.thirdData?.wx_gzh?.nickname ||
            user.email ||
            "主人",
      }
      authors.push(author)
    }
    
    runTimes++
  }

  // match authors for atoms
  const newAtoms: TaskRemindAtom_2[] = []
  for(let i=0; i<atoms.length; i++) {
    const atom = atoms[i]
    const author = authors.find(v => v.userId === atom.userId)
    if(author) {
      newAtoms.push({ ...atom, ...author })
    }
  }
  
  return newAtoms
}


async function get_task_atoms(
  startStamp: number,
  endStamp: number,
) {
  let runTimes = 0
  const NUM_ONCE = 50
  const MAX_TIMES = 100

  const w1 = {
    oState: "OK",
    taskState: "DEFAULT",
    remindStamp: _.and(_.gte(startStamp), _.lte(endStamp)),
  }
  const wtCol = db.collection("WxTask")
  const atoms: TaskRemindAtom[] = []

  while(runTimes < MAX_TIMES) {
    let q = wtCol.where(w1).orderBy("remindStamp", "asc")
    if(runTimes > 0) {
      q = q.skip(runTimes * NUM_ONCE)
    }
    const res = await q.limit(NUM_ONCE).get<Table_WxTask>()
    const tmpList = res.data
    const tLength = tmpList.length

    for(let i=0; i<tLength; i++) {
      const v = tmpList[i]
      const newAtoms = await turnTaskIntoAtoms(v)
      if(newAtoms) {
        atoms.push(...newAtoms)
      }
    }

    if(tLength < NUM_ONCE) break
    runTimes++
  }

  return atoms
}



async function handle_remind() {

  // check out if the tmplId is enabled
  const _env = process.env
  const tmplId = _env.LIU_WX_GZ_TMPL_ID_1
  if(!tmplId) {
    return false
  }

  let startDate = addSeconds(new Date(), -59)
  startDate = date_fn_set(startDate, { seconds: 55, milliseconds: 0 })
  let endDate = addSeconds(startDate, 59)

  const startStamp = startDate.getTime()
  const endStamp = endDate.getTime()

  const atoms = await get_remind_atoms(startStamp, endStamp)
  if(atoms.length < 1) {
    return true
  }

  const atoms2 = await find_remind_authors(atoms)
  if(atoms2.length < 1) {
    return true
  }

  const access_token = await checkAndGetWxGzhAccessToken()
  if(!access_token) {
    console.warn("access_token is not found")
    return false
  }
  
  await batch_send(access_token, atoms2)

}

async function batch_send(
  access_token: string,
  atoms: RemindAtom_2[],
) {
  const numMap = new Map<string, number>()
  const aLength = atoms.length

  for(let i=0; i<atoms.length; i++) {
    const v = atoms[i]
    const userId = v.userId
    const num = numMap.get(userId) ?? 0
    if(num > 3) continue
    numMap.set(userId, num + 1)
    send_wx_message(access_token, v)

    if(i !== 0 && (i % 5) === 0 && i !== (aLength - 1)) {
      await valTool.waitMilli(200)
    }
  }
}

async function batch_send_for_tasks(
  access_token: string,
  atoms: TaskRemindAtom_2[],
) {
  const numMap = new Map<string, number>()

  for(let i=0; i<atoms.length; i++) {
    const v = atoms[i]
    const userId = v.userId
    const num = numMap.get(userId) ?? 0
    if(num > 3) continue
    numMap.set(userId, num + 1)
    await send_for_task(access_token, v)
  }
}


async function send_for_task(
  access_token: string,
  atom: TaskRemindAtom_2,
) {
  const obj = { ...wx_reminder_tmpl } as Wx_Param_Msg_Templ_Send
  const _env = process.env
  const domain = _env.LIU_DOMAIN
  const tmplId = _env.LIU_WX_GZ_TMPL_ID_1 ?? ""
  const miniAppId = _env.LIU_WX_MINI_APPID ?? ""
  obj.template_id = tmplId
  const { taskId, locale, wx_gzh_openid, calendarStamp, timezone } = atom
  obj.touser = wx_gzh_openid
  obj.url = `${domain}`
  obj.miniprogram = {
    appid: miniAppId,
    pagepath: `pages/index/index?task=${taskId}`,
  }

  let title = atom.title
  if(title.length > 20) {
    title = title.substring(0, 17) + "..."
  }
  title = title.replace(/\n/g, " ")
  obj.data.thing18.value = title
  const str_time = LiuDateUtil.displayTime(calendarStamp, locale, timezone)
  obj.data.time4.value = str_time

  await WxGzhSender.sendTemplateMessage(access_token, obj)
  return true
}

async function send_wx_message(
  access_token: string,
  atom: RemindAtom_2,
) {
  const obj = { ...wx_reminder_tmpl }
  const _env = process.env
  const domain = _env.LIU_DOMAIN
  const tmplId = _env.LIU_WX_GZ_TMPL_ID_1 ?? ""
  obj.template_id = tmplId
  const { 
    contentId, 
    locale, 
    calendarStamp,
    wx_gzh_openid,
    timezone,
  } = atom

  obj.touser = wx_gzh_openid
  if(domain) {
    obj.url = `${domain}/${contentId}`
  }
  
  let title = atom.title
  if(!title) {
    const { t: t1 } = useI18n(commonLang, { locale })
    title = `[${t1("other")}]`
    if(atom.hasImage) title = `[${t1("image")}]`
    else if(atom.hasFile) title = `[${t1("file")}]`
  }
  if(title.length > 20) {
    title = title.substring(0, 17) + "..."
  }
  title = title.replace(/\n/g, " ")

  obj.data.thing18.value = title
  const str_time = LiuDateUtil.displayTime(calendarStamp, locale, timezone)
  obj.data.time4.value = str_time

  const res = await WxGzhSender.sendTemplateMessage(access_token, obj)
  return true
}

async function find_remind_authors(
  atoms: RemindAtom[],
) {
  const list_1: AuthorAtom[] = []
  const list_2: AuthorAtom_2[] = []
  const list_3: AuthorAtom_2[] = []

  // 1. package list_1
  for(let i=0; i<atoms.length; i++) {
    const v1 = atoms[i]
    const idx = list_1.findIndex(v2 => v1.userId === v2.userId)
    if(idx >= 0) continue
    list_1.push({ userId: v1.userId, memberId: v1.memberId })
  }

  const uCol = db.collection("User")
  let runTimes = 0
  const NUM_ONCE = 50
  const MAX_TIMES = 100

  // 2. find users
  while(list_1.length > 0 && runTimes < MAX_TIMES) {
    let tmpList = list_1.splice(0, NUM_ONCE)

    const userIds = tmpList.map(v => v.userId)
    const w = {
      oState: "NORMAL",
      _id: _.in(userIds),
    }
    const f: Field_User = {
      _id: 1,
      oState: 1,
      thirdData: 1,
      wx_gzh_openid: 1,
      language: 1,
      systemLanguage: 1,
      timezone: 1,
    }
    const res1 = await uCol.where(w).field(f).get<Table_User>()
    const results1 = res1.data
    const tmpList2 = packAuthors1(tmpList, results1)
    list_2.push(...tmpList2)

    runTimes++
  }

  runTimes = 0

  // 3. find members
  const mCol = db.collection("Member")
  while(list_2.length > 0 && runTimes < MAX_TIMES) {
    let tmpList = list_2.splice(0, NUM_ONCE)
    const memberIds = tmpList.map(v => v.memberId)
    const w = {
      oState: "OK",
      _id: _.in(memberIds),
    }
    const f: Field_Member = {
      _id: 1,
      oState: 1,
      config: 1,
      notification: 1,
    }

    const res2 = await mCol.where(w).field(f).get<Table_Member>()
    const results2 = res2.data
    tmpList = packAuthors2(tmpList, results2)
    list_3.push(...tmpList)

    runTimes++
  }

  // 4. get list_3 into atoms
  for(let i=0; i<list_3.length; i++) {
    const v1 = list_3[i]
    for(let j=0; j<atoms.length; j++) {
      const v2 = atoms[j]
      if(v1.userId === v2.userId) {
        v2.wx_gzh_openid = v1.wx_gzh_openid
        v2.timezone = v1.timezone
        v2.locale = v1.locale
      }
    }
  }

  // 5. filter atoms without wx_gzh_openid
  // TODO: web push
  let newAtoms = atoms.filter(v => v.wx_gzh_openid) as RemindAtom_2[]
  
  return newAtoms
}

async function get_remind_atoms(
  startStamp: number,
  endStamp: number,
) {
  let runTimes = 0
  const NUM_ONCE = 50
  const MAX_TIMES = 100

  const w = {
    infoType: "THREAD",
    oState: "OK",
    remindStamp: _.and(_.gte(startStamp), _.lte(endStamp)),
    stateId: _.neq("FINISHED"),
  }
  const cCol = db.collection("Content")
  const atoms: RemindAtom[] = []

  while(runTimes < MAX_TIMES) {
    let q = cCol.where(w).orderBy("remindStamp", "asc")
    if(runTimes > 0) {
      q = q.skip(runTimes * NUM_ONCE)
    }
    const res = await q.limit(NUM_ONCE).get<Table_Content>()
    const tmpList = res.data
    const tLength = tmpList.length

    for(let i=0; i<tLength; i++) {
      const v = tmpList[i]
      const atom = turnContentIntoAtom(v)
      if(atom) {
        atoms.push(atom)
      }
    }

    if(tLength < NUM_ONCE) break
    runTimes++
  }

  return atoms
}

// when we get members, package authors with them
// filter members whose wx_gzh_toggle is false or undefined
function packAuthors2(
  tmpList: AuthorAtom_2[],
  members: Table_Member[],
) {
  if(members.length < 1) return []

  for(let i=0; i<tmpList.length; i++) {
    const v1 = tmpList[i]
    const member = members.find(v2 => v1.memberId === v2._id)
    const wx_gzh_toggle = member?.notification?.wx_gzh_toggle
    if(!wx_gzh_toggle) {
      tmpList.splice(i, 1)
      i--
      continue
    }
  }

  return tmpList
}

// when we get users, package authors with them
function packAuthors1(
  tmpList: AuthorAtom[],
  users: Table_User[],
) {

  if(users.length < 1) return []

  for(let i=0; i<tmpList.length; i++) {
    const v1 = tmpList[i]
    const user = users.find(v2 => v1.userId === v2._id)
    const wx_gzh_openid = user?.wx_gzh_openid
    const wx_subscribe = user?.thirdData?.wx_gzh?.subscribe
    if(!user || !wx_gzh_openid || wx_subscribe !== 1) {
      tmpList.splice(i, 1)
      i--
      continue
    }

    v1.locale = getCurrentLocale({ user })
    v1.wx_gzh_openid = wx_gzh_openid
    v1.timezone = user.timezone
  }

  return tmpList as AuthorAtom_2[]
}

async function turnTaskIntoAtoms(
  task: Table_WxTask,
) {
  const {
    calendarStamp,
    assigneeList = [],
    owner_userid,
  } = task
  if(!calendarStamp) return

  // manage to get userIds
  let userIds: string[] = []
  const group_openids: string[] = []
  assigneeList.forEach(v1 => {
    if(!v1.doneStamp) {
      group_openids.push(v1.group_openid)
    }
  })
  if(group_openids.length) {
    const w1 = {
      infoType: "chat-tool",
      group_openid: _.in(group_openids),
    }
    const wbCol = db.collection("WxBond")
    const res1 = await wbCol.where(w1).get<Table_WxBond>()
    const bonds = res1.data
    userIds = bonds.map(v => v.userId)
  }
  if(!userIds.includes(owner_userid)) {
    userIds.push(owner_userid)
  }

  const atoms = userIds.map(v => {
    const atom: TaskRemindAtom = {
      taskId: task._id,
      userId: v,
      title: task.desc,
      calendarStamp,
    }
    return atom
  })
  return atoms
}

function turnContentIntoAtom(
  v: Table_Content,
) {
  if(!v.member) return
  if(!v.calendarStamp) return

  const res1 = decryptEncData(v)
  if(!res1.pass) return

  let title: string | undefined
  if(res1.title) {
    title = res1.title
  }
  else if(res1.liuDesc) {
    title = RichTexter.getSummary(res1.liuDesc)
  }

  const atom: RemindAtom = {
    contentId: v._id,
    userId: v.user,
    memberId: v.member,
    title,
    hasImage: Boolean(res1.images?.length),
    hasFile: Boolean(res1.files?.length),
    calendarStamp: v.calendarStamp,
  }
  return atom
}