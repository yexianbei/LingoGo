
// Function Name: people-tasks
import cloud from "@lafjs/cloud"
import { 
  checker, checkIfUserSubscribed, getDocAddId, valTool, verifyToken, WxMiniHandler,
} from "@/common-util"
import { 
  type LiuRqReturn, 
  type VerifyTokenRes_B,
  PeopleTasksAPI,
  WxMiniAPI,
  type Table_WxBond,
  type Partial_Id,
  type LiuErrReturn,
  type Table_WxTask,
  type Table_User, 
} from "@/common-types"
import * as vbot from "valibot"
import { getBasicStampWhileAdding, getNowStamp, HOUR } from "@/common-time"
import { ppl_system_cfg } from "@/common-config"
import { afterUpdatingTask } from "@/sync-after"

const db = cloud.database()
const _ = db.command

export async function main(ctx: FunctionContext) {

  // 1. verify
  const body = ctx.request?.body ?? {}
  const vRes = await verifyToken(ctx, body)
  if(!vRes.pass) return vRes.rqReturn

  // 2. decide which path to go
  let res: LiuRqReturn = { code: "E4000" }
  const oT = body["operateType"] as PeopleTasksAPI.OperateType
  if(oT === "enter-wx-chat-tool") {
    res = await enter_wx_chat_tool(body, vRes)
  }
  else if(oT === "create-wx-task") {
    res = await create_wx_task(body, vRes)
  }
  else if(oT === "list-wx-tasks") {
    res = await list_wx_tasks(body, vRes)
  }
  else if(oT === "get-wx-task") {
    res = await get_wx_task(body, vRes)
  }
  else if(oT === "complete-wx-task") {
    res = await complete_wx_task(body, vRes)
  }
  else if(oT === "close-wx-task") {
    res = await close_wx_task(body, vRes)
  }
  else if(oT === "update-task-title") {
    res = await update_task_title(body, vRes)
  }
  else if(oT === "update-task-note") {
    res = await update_task_note(body, vRes)
  }
  else if(oT === "delete-wx-task") {
    res = await delete_wx_task(body, vRes)
  }
  else if(oT === "update-task-time") {
    res = await update_task_time(body, vRes)
  }
  else if(oT === "can-i-post-task") {
    res = await can_i_post_task(body, vRes)
  }

  return res
}

async function can_i_post_task(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
): Promise<LiuRqReturn<PeopleTasksAPI.Res_CanIPostTask>> {
  // 1. define result
  const data: PeopleTasksAPI.Res_CanIPostTask = {
    operateType: "can-i-post-task",
    status: "yes",
  }

  // 2. check out cache
  const res2 = checkIfUserSubscribed(vRes.userData)
  if(res2) {
    return { code: "0000", data }
  }

  // 3. check out db
  const userId = vRes.userData._id
  const col = db.collection("User")
  const res3 = await col.doc(userId).get<Table_User>()
  const user = res3.data
  if(!user) return { code: "E4004", errMsg: "no such user" }
  const isPremium = checkIfUserSubscribed(user)
  if(isPremium) {
    return { code: "0000", data }
  }

  // 4. get active tasks
  const body4 = {
    operateType: "list-wx-tasks",
    listType: "available",
  }
  const res4 = await list_wx_tasks(body4, vRes)
  const tasks = res4.data?.tasks ?? []
  console.log("tasks length: ", tasks.length)
  if(tasks.length >= ppl_system_cfg.freemium_task_count) {
    data.status = "no"
  }
  return { code: "0000", data }
}

async function update_task_time(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  // 1. check out params
  const res1 = vbot.safeParse(PeopleTasksAPI.Sch_Param_UpdateTaskTime, body)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }
  const { id, remindStamp, whenStamp, remindMe } = body
  const userId = vRes.userData._id

  // 2. get task
  const wtCol = db.collection("WxTask")
  const res2 = await wtCol.doc(id).get<Table_WxTask>()
  const data2 = res2.data
  if(!data2 || data2.oState !== "OK") {
    return { code: "E4004", errMsg: "no such task" }
  }
  if(data2.owner_userid !== userId) {
    return { code: "E4003", errMsg: "you are not the owner of this task" }
  }

  // 3. update the task
  const now3 = getNowStamp()
  const w3: Partial<Table_WxTask> = {
    remindStamp,
    whenStamp,
    remindMe,
    updatedStamp: now3,
    editedStamp: now3,
  }
  if(whenStamp) {
    w3.calendarStamp = whenStamp
  }
  await wtCol.doc(id).update(w3)

  return { code: "0000" }
}


async function delete_wx_task(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  const id = body.id
  if(!valTool.isStringWithVal(id)) {
    return { code: "E4000", errMsg: "no id" }
  }
  const userId = vRes.userData._id

  // 1. get task
  const wtCol = db.collection("WxTask")
  const res1 = await wtCol.doc(id).get<Table_WxTask>()
  const data1 = res1.data
  if(!data1 || data1.oState !== "OK") {
    return { code: "E4004", errMsg: "no such task" }
  }
  if(data1.owner_userid !== userId) {
    return { code: "E4003", errMsg: "you are not the owner of this task" }
  }

  // 2. delete the task
  const w2: Partial<Table_WxTask> = {
    oState: "DEL_BY_USER",
    updatedStamp: getNowStamp(),
  }
  await wtCol.doc(id).update(w2)

  return { code: "0000" }
}

async function update_task_note(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  const id = body.id
  if(!valTool.isStringWithVal(id)) {
    return { code: "E4000", errMsg: "no id" }
  }
  const note = body.note
  if(typeof note !== "string") {
    return { code: "E4000", errMsg: "the type of note is incorrect" }
  }
  if(note.length > 3000) {
    return { code: "PT005", errMsg: "note is too long"  }
  }
  const userId = vRes.userData._id

  // 1. get task
  const wtCol = db.collection("WxTask")
  const res1 = await wtCol.doc(id).get<Table_WxTask>()
  const data1 = res1.data
  if(!data1 || data1.oState !== "OK") {
    return { code: "E4004", errMsg: "no such task" }
  }
  if(data1.owner_userid !== userId) {
    return { code: "E4003", errMsg: "you are not the owner of this task" }
  }
  if(data1.note === note) {
    return { code: "0001" }
  }

  // 2. update the task
  const now2 = getNowStamp()
  const w2: Partial<Table_WxTask> = {
    note,
    editedStamp: now2,
    updatedStamp: now2,
  }
  await wtCol.doc(id).update(w2)

  return { code: "0000" }
}


async function update_task_title(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  const id = body.id
  if(!valTool.isStringWithVal(id)) {
    return { code: "E4000", errMsg: "no id" }
  }
  const title = body.title
  if(!valTool.isStringWithVal(title)) {
    return { code: "E4000", errMsg: "no title" }
  }
  if(title.length > 144) {
    return { code: "PT004", errMsg: "title is too long" }
  }
  const userId = vRes.userData._id

  // 1. get task
  const wtCol = db.collection("WxTask")
  const res1 = await wtCol.doc(id).get<Table_WxTask>()
  const data1 = res1.data
  if(!data1 || data1.oState !== "OK") {
    return { code: "E4004", errMsg: "no such task" }
  }
  if(data1.owner_userid !== userId) {
    return { code: "E4003", errMsg: "you are not the owner of this task" }
  }
  if(data1.desc === title) {
    return { code: "0001" }
  }

  // 2. update the task
  const now2 = getNowStamp()
  const w2: Partial<Table_WxTask> = {
    desc: title,
    editedStamp: now2,
    updatedStamp: now2,
  }
  await wtCol.doc(id).update(w2)

  // 3. run syncAfter
  const newTask = { ...data1, ...w2 } as Table_WxTask
  afterUpdatingTask(newTask)

  return { code: "0000" }
}

async function list_wx_tasks(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
): Promise<LiuRqReturn<PeopleTasksAPI.Res_ListWxTasks>> {
  // 1. check out params
  const res1 = vbot.safeParse(PeopleTasksAPI.Sch_Param_ListWxTasks, body)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }
  const listType = body.listType as PeopleTasksAPI.TaskListType
  const userId = vRes.userData._id

  // 2. get bonds
  const w2: Partial<Table_WxBond> = {
    userId,
    infoType: "chat-tool",
  }
  const wbCol = db.collection("WxBond")
  const q2 = wbCol.where(w2).orderBy("enterStamp", "desc").limit(50)
  const res2 = await q2.get<Table_WxBond>()
  const data2 = res2.data ?? []
  const openids = data2.map(v => v.group_openid)

  // 3. construct result
  const result: PeopleTasksAPI.Res_ListWxTasks = {
    operateType: "list-wx-tasks",
    tasks: [],
  }
  if(openids.length < 1) {
    return { code: "0000", data: result }
  }

  // 4. get tasks
  const w4: Record<string, any> = { oState: "OK" }
  if(listType === "available") {
    w4.related_openids = _.in(openids)
    w4.taskState = "DEFAULT"
  }
  else if(listType === "inactive") {
    w4.finished_openids = _.in(openids)
  }
  const wtCol = db.collection("WxTask")
  let q4 = wtCol.where(w4).orderBy("insertedStamp", "desc").limit(16)
  if(body.skip) {
    q4 = q4.skip(body.skip)
  }
  const res4 = await q4.get<Table_WxTask>()
  const data4 = res4.data ?? []
  if(data4.length < 1) {
    return { code: "0000", data: result }
  }

  // 5. package tasks
  const tasks = packageWxTasks(data4, userId)
  result.tasks = tasks
  return { code: "0000", data: result }
}


async function close_wx_task(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  const id = body.id
  if(!valTool.isStringWithVal(id)) {
    return { code: "E4000", errMsg: "no id" }
  }
  const userId = vRes.userData._id

  // 1. get task
  const wtCol = db.collection("WxTask")
  const res1 = await wtCol.doc(id).get<Table_WxTask>()
  const data1 = res1.data
  if(!data1 || data1.oState !== "OK") {
    return { code: "E4004", errMsg: "no such task" }
  }
  if(data1.owner_userid !== userId) {
    return { code: "E4003", errMsg: "you are not the owner of this task" }
  }
  if(data1.taskState === "CLOSED") {
    return { code: "0000" }
  }

  // 2. handle finished_openids
  let finished_openids = data1.finished_openids ?? []
  const assignees = data1.assigneeList.map(v => v.group_openid)
  const owner_openid = data1.owner_openid
  finished_openids.push(...assignees)
  finished_openids.push(owner_openid)
  finished_openids = valTool.uniqueArray(finished_openids)

  // 3. update the task
  const now3 = getNowStamp()
  const w3: Partial<Table_WxTask> = {
    taskState: "CLOSED",
    closedStamp: now3,
    updatedStamp: now3,
    related_openids: [],
    finished_openids,
  }
  await wtCol.doc(id).update(w3)

  // notify wechat if needed
  const activity_id = data1.activity_id
  if(!activity_id) return { code: "0000" }

  // get to notify
  await notifyWxToCloseChatTool(activity_id, data1.infoType === "ACTIVITY", body)
  
  return { code: "0000" }
}

export async function notifyWxToCloseChatTool(
  activity_id: string,
  isActivity: boolean,
  body?: Record<string, any>,
) {
  const tmpl_id = isActivity ? ppl_system_cfg.activity_tmpl_id : ppl_system_cfg.task_tmpl_id
  const target_state = 3
  const res4 = await WxMiniHandler.setChatToolMsg(
    activity_id, 
    target_state, 
    tmpl_id,
    undefined,
    body,
  )
  return res4
}


async function complete_wx_task(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  // 1. get task
  const id = body.id
  if(!valTool.isStringWithVal(id)) {
    return { code: "E4000", errMsg: "no id" }
  }
  const userId = vRes.userData._id
  const wtCol = db.collection("WxTask")
  const res1 = await wtCol.doc(id).get<Table_WxTask>()
  const data1 = res1.data
  if(!data1 || data1.oState !== "OK") {
    return { code: "E4004", errMsg: "no such task" }
  }
  const isActivity = data1.infoType === "ACTIVITY"
  const iAmOwner = data1.owner_userid === userId
  
  // 2. find my bond about the chat
  const w2: Partial<Table_WxBond> = {
    userId,
    infoType: "chat-tool",
  }
  if(data1.open_single_roomid) {
    w2.open_single_roomid = data1.open_single_roomid
  }
  if(data1.opengid) {
    w2.opengid = data1.opengid
  }
  const wbCol = db.collection("WxBond")
  const res2 = await wbCol.where(w2).getOne<Table_WxBond>()
  const data2 = res2.data
  const my_group_openid = data2?.group_openid
  if(!my_group_openid) {
    return { code: "E4003", errMsg: "you are not the member of this chat" }
  }

  // 3. update the state
  const now3 = getNowStamp()
  const u3: Record<string, any> = { updatedStamp: now3 }
  const assigneeList = data1.assigneeList
  const related_openids = data1.related_openids
  const finished_openids = data1.finished_openids ?? []
  const participatorList = data1.participatorList ?? []
  let idx3_1 = -1
  let idx3_2 = -1
  if(isActivity) {
    // if we are operating ACTIVITY
    const myParticipator = participatorList.find(v => {
      if(v.engagedStamp && v.group_openid === my_group_openid) return true
      return false
    })
    if(myParticipator) {
      return { code: "PT003", errMsg: "you have already engaged in this activity" }
    }
    const newParticipator: PeopleTasksAPI.ParticipatorItem = {
      group_openid: my_group_openid,
      engagedStamp: now3,
    }
    u3.participatorList = _.push(newParticipator)
    idx3_1 = related_openids.indexOf(my_group_openid)
    if(idx3_1 < 0) {
      u3.related_openids = _.push(my_group_openid)
    }
  }
  else {
    // if we are operating TASK
    let isAllDone = true
    let myAssignee: PeopleTasksAPI.AssigneeItem | undefined
    assigneeList.forEach(v => {
      if(v.group_openid === my_group_openid) {
        myAssignee = v
      }
      else if(!v.doneStamp) {
        isAllDone = false
      }
    })

    if(!myAssignee) {
      return { code: "PT002", errMsg: "you are not the assignee of this task" }
    }
    if(myAssignee.doneStamp) {
      return { code: "0001" }
    }

    if(!iAmOwner || isAllDone) {
      idx3_1 = related_openids.indexOf(my_group_openid)
      if(idx3_1 >= 0) {
        related_openids.splice(idx3_1, 1)
      }
    }

    idx3_2 = finished_openids.indexOf(my_group_openid)
    if(idx3_2 < 0) {
      finished_openids.push(my_group_openid)
      u3.finished_openids = finished_openids
    }
    
    myAssignee.doneStamp = now3
    u3.assigneeList = assigneeList
    u3.related_openids = related_openids
  }

  // 4. update the task in db
  await wtCol.doc(id).update(u3)

  // notify wechat if needed
  const endStamp = data1.endStamp ?? now3
  const activity_id = data1.activity_id
  if(!activity_id) return { code: "0000" }
  // if(now3 >= (endStamp - SECOND)) return { code: "0000" }
  if(data1.closedStamp) return { code: "0000" }

  // get to notify
  const tmpl_id = isActivity ? ppl_system_cfg.activity_tmpl_id : ppl_system_cfg.task_tmpl_id
  const thresholdStamp = endStamp - ppl_system_cfg.coming_soom_hrs * HOUR
  const isComingSoon = now3 >= thresholdStamp
  const target_state = isComingSoon ? 2 : 1
  const myInfo: WxMiniAPI.ChatToolParticipatorInfo = {
    group_openid: my_group_openid,
    state: 1,
  }
  const res5 = await WxMiniHandler.setChatToolMsg(
    activity_id,
    target_state,
    tmpl_id,
    [myInfo],
    body,
  )
  // if(!res5.pass) {
  //   console.warn("WxMiniHandler.setChatToolMsg failed", res5.err)
  // }

  return { code: "0000" }
}


async function get_wx_task(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  // 1. check out params
  const res1 = vbot.safeParse(PeopleTasksAPI.Sch_Param_GetWxTask, body)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }
  const id = body.id as string
  let chatInfo = body.chatInfo as WxMiniAPI.ChatInfo | undefined
  const user = vRes.userData
  const userId = user._id

  // 2. get the task
  const wtCol = db.collection("WxTask")
  const res2 = await wtCol.doc(id).get<Table_WxTask>()
  const data2 = res2.data
  if(!data2 || data2.oState !== "OK") {
    return { code: "E4004", errMsg: "no such task" }
  }
  if(data2.open_single_roomid && chatInfo) {
    if(data2.open_single_roomid !== chatInfo.open_single_roomid) {
      return { code: "PT001", errMsg: "open_single_roomid is not matched" }
    }
  }
  if(data2.opengid && chatInfo) {
    if(data2.opengid !== chatInfo.opengid) {
      return { code: "PT001", errMsg: "opengid is not matched" }
    }
  }

  // 3. check my auth if no chatInfo
  if(!chatInfo) {
    const wbCol = db.collection("WxBond")
    const w3: Partial<Table_WxBond> = {
      userId,
      infoType: "chat-tool",
    }
    if(data2.open_single_roomid) {
      w3.open_single_roomid = data2.open_single_roomid
    }
    if(data2.opengid) {
      w3.opengid = data2.opengid
    }
    const res3 = await wbCol.where(w3).getOne<Table_WxBond>()
    const data3 = res3.data
    if(!data3) {
      return { code: "E4003", errMsg: "you are not the member of this chat" }
    }
    chatInfo = {
      opengid: data3.opengid,
      open_single_roomid: data3.open_single_roomid,
      group_openid: data3.group_openid,
      chat_type: data3.chat_type,
    }
  }

  // 4. package data
  const session_key = user.thirdData?.wx_mini?.session_key
  const data4 = packageResOfGetWxTask(data2, userId, session_key)

  return { code: "0000", data: data4 }
}


async function getEachOtherOpenid(
  assigneeList: PeopleTasksAPI.AssigneeItem[],
  chatInfo: WxMiniAPI.ChatInfo,
) {
  const roomid = chatInfo.open_single_roomid
  if(!roomid) return

  const myOpenid = chatInfo.group_openid
  const eachOther = assigneeList.find(v => v.group_openid !== myOpenid)
  if(eachOther) {
    return eachOther.group_openid
  }

  const wbCol = db.collection("WxBond")
  const w2 = {
    open_single_roomid: roomid,
    infoType: "chat-tool",
    group_openid: _.neq(myOpenid),
  }
  const res2 = await wbCol.where(w2).getOne<Table_WxBond>()
  const data2 = res2.data
  if(!data2) return
  return data2.group_openid
}



async function create_wx_task(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  // 1. check out params
  const res1 = vbot.safeParse(PeopleTasksAPI.Sch_Param_CreateWxTask, body)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }
  const userId = vRes.userData._id
  const desc = body.desc as string
  const assignees = body.assignees as string[]
  const chatInfo = body.chatInfo as WxMiniAPI.ChatInfo

  // 2. check chat info
  const res2 = await checkChatInfo(chatInfo, userId)
  if(res2) return res2

  // 3. call wx to create activity id 
  const res3 = await WxMiniHandler.createActivityId()
  if(!res3.pass) {
    console.warn("fail to create activity id", res3.err)
    return res3.err
  }
  const data3 = res3.data

  // 4. handle activity_id and expiration_time
  const activity_id = data3.activity_id as string
  const expiration_time = data3.expiration_time as number
  if(!activity_id) {
    return { code: "E5001", errMsg: "no activity_id" }
  }
  let endStamp = expiration_time
  if(endStamp < getNowStamp()) {
    endStamp = endStamp * 1000
  }

  // 5.1 calculate related_openids & assigneeList
  const owner_openid = chatInfo.group_openid as string
  let related_openids = [...assignees, owner_openid]
  related_openids = valTool.uniqueArray(related_openids)
  const assigneeList = assignees.map(v => {
    const obj5: PeopleTasksAPI.AssigneeItem = {
      group_openid: v,
    }
    return obj5
  })

  // 5.2 try to get each_other_openid
  let each_other_openid: string | undefined
  if(chatInfo.open_single_roomid) {
    each_other_openid = await getEachOtherOpenid(assigneeList, chatInfo)
  }

  // 6. create the task
  const b6 = getBasicStampWhileAdding()
  const data6: Partial_Id<Table_WxTask> = {
    ...b6,
    oState: "OK",
    infoType: assignees.length > 0 ? "TASK" : "ACTIVITY",
    taskState: "DEFAULT",
    owner_userid: userId,
    owner_openid,
    opengid: chatInfo.opengid,
    open_single_roomid: chatInfo.open_single_roomid,
    chat_type: chatInfo.chat_type as WxMiniAPI.ChatType,
    desc,
    assigneeList,
    related_openids,
    finished_openids: [],
    activity_id,
    endStamp,
    each_other_openid,
  }
  const wtCol = db.collection("WxTask")
  const res6 = await wtCol.add(data6)
  const docId = getDocAddId(res6)
  if(!docId) {
    return { code: "E5001", errMsg: "fail to create task, with operating db" }
  }
  checkTaskForSecurity(docId, desc, vRes.userData)

  // 7. run syncAfter
  const newTask = { ...data6, _id: docId } as Table_WxTask
  afterUpdatingTask(newTask)

  return { code: "0000", data: { id: docId } }
}


async function checkTaskForSecurity(
  id: string,
  text: string,
  user: Table_User,
) {
  const wx_mini_openid = user.wx_mini_openid
  if(!wx_mini_openid) {
    console.warn("checkTaskForSecurity: no wx_mini_openid")
    return
  }

  // 1. msg sec check
  const res1 = await WxMiniHandler.msgSecCheck(text, wx_mini_openid)
  if(!res1.pass) {
    console.warn("checkTaskForSecurity err1: ")
    console.log(res1.err)
    return
  }

  // 2. return if pass
  const res2 = res1.data.result
  if(res2.suggest === "pass") {
    return
  }
  console.log("checkTaskForSecurity result: ", res2)
  console.log("checkTaskForSecurity illegal text: ", text)
  
  // 3. to delete
  const now3 = getNowStamp()
  const w3: Partial<Table_WxTask> = {
    oState: "DEL_BY_AI",
    updatedStamp: now3,
  }
  const wtCol = db.collection("WxTask")
  await wtCol.doc(id).update(w3)
}


function packageResOfGetWxTask(
  v: Table_WxTask,
  myUserId: string,
  session_key?: string,
) {
  const obj: PeopleTasksAPI.Res_GetWxTask = {
    operateType: "get-wx-task",
    id: v._id,
    infoType: v.infoType ?? "TASK",
    activity_id: v.activity_id,
    desc: v.desc,
    owner_openid: v.owner_openid,
    opengid: v.opengid,
    open_single_roomid: v.open_single_roomid,
    chat_type: v.chat_type,
    assigneeList: v.assigneeList,
    participatorList: v.participatorList,
    isMine: v.owner_userid === myUserId,
    insertedStamp: v.insertedStamp,
    editedStamp: v.editedStamp,
    endStamp: v.endStamp,
    closedStamp: v.closedStamp,

    calendarStamp: v.calendarStamp,
    remindStamp: v.remindStamp,
    whenStamp: v.whenStamp,
    remindMe: v.remindMe,
    aiWorker: v.aiWorker,
    
    note: v.note,
  }

  if(session_key) {
    const path = `pages/index/index?task=${v._id}`
    const sign = WxMiniHandler.hmac_sha256(path, session_key)
    obj.calendar_path = path
    obj.calendar_signature = sign
  }


  return obj
}


function packageWxTasks(
  tasks: Table_WxTask[],
  myUserId: string,
) {
  const list: PeopleTasksAPI.WxTaskItem[] = []
  for(let i=0; i<tasks.length; i++) {
    const v = tasks[i]
    const obj: PeopleTasksAPI.WxTaskItem = {
      id: v._id,
      infoType: v.infoType ?? "TASK",
      activity_id: v.activity_id,
      desc: v.desc,
      owner_openid: v.owner_openid,
      opengid: v.opengid,
      open_single_roomid: v.open_single_roomid,
      chat_type: v.chat_type,
      assigneeList: v.assigneeList,
      participatorList: v.participatorList,
      isMine: v.owner_userid === myUserId,
      insertedStamp: v.insertedStamp,
      endStamp: v.endStamp,
      closedStamp: v.closedStamp,
      editedStamp: v.editedStamp,

      calendarStamp: v.calendarStamp,
      remindStamp: v.remindStamp,
      whenStamp: v.whenStamp,
      remindMe: v.remindMe,
      aiWorker: v.aiWorker,
      note: v.note,
      each_other_openid: v.each_other_openid,
    }

    // handle each_other_openid
    if(v.open_single_roomid && v.assigneeList.length && !v.each_other_openid) {
      const eachOther = v.assigneeList.find(v2 => {
        if(v2.group_openid !== v.owner_openid) {
          return true
        }
        return false
      })
      if(eachOther) {
        obj.each_other_openid = eachOther.group_openid
      }
    }

    list.push(obj)
  }
  return list
}


async function checkChatInfo(
  chatInfo: WxMiniAPI.ChatInfo,
  userId: string,
): Promise<LiuErrReturn | undefined> {
  const group_openid = chatInfo.group_openid
  if(!group_openid) {
    return { code: "E4000", errMsg: "no group_openid" }
  }

  const wbCol = db.collection("WxBond")
  const w1: Partial<Table_WxBond> = {
    userId,
    infoType: "chat-tool",
    group_openid,
  }
  const res1 = await wbCol.where(w1).getOne<Table_WxBond>()
  const data1 = res1.data
  if(!data1) {
    return { code: "E4003", errMsg: "you are not the member of this chat" }
  }
  
}


async function enter_wx_chat_tool(
  body: Record<string, any>,
  vRes: VerifyTokenRes_B,
) {
  // 1. check out wxData
  const wxData = body.wxData
  const res1 = vbot.safeParse(WxMiniAPI.Sch_EncryptedAtom, wxData)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }
  const encryptedData = wxData.encryptedData
  const iv = wxData.iv

  // 2. get required params
  const session_key = vRes.userData.thirdData?.wx_mini?.session_key
  const appid = process.env.LIU_WX_MINI_APPID
  if(!session_key || !appid) {
    return { code: "E5001", errMsg: "no session_key or appid" }
  }

  // 3. decrypt wxData
  const res3 = WxMiniHandler.decryptUserData<WxMiniAPI.ChatInfo>(
    appid, session_key, encryptedData, iv
  )
  if(!res3) {
    return { code: "E5001", errMsg: "fail to decrypt wxData" }
  }

  // 4. save chat info
  const userId = vRes.userData._id
  await saveChatInfo(userId, res3)

  // 5. return data
  const result: PeopleTasksAPI.Res_EnterWxChatTool = {
    operateType: "enter-wx-chat-tool",
    chatInfo: res3,
  }

  return { code: "0000", data: result }
}

async function saveChatInfo(
  userId: string,
  chatInfo: WxMiniAPI.ChatInfo,
) {
  const group_openid = chatInfo.group_openid
  const chat_type = chatInfo.chat_type
  if(!group_openid || !chat_type) return false
  const wbCol = db.collection("WxBond")
  const w1: Partial<Table_WxBond> = {
    userId,
    infoType: "chat-tool",
    group_openid,
  }
  const res1 = await wbCol.where(w1).get<Table_WxBond>()
  const list1 = res1.data

  const _update = async (row: Table_WxBond) => {
    const bondId = row._id
    const now2 = getNowStamp()
    const u2: Partial<Table_WxBond> = {
      enterStamp: now2,
      updatedStamp: now2,
    }
    await wbCol.doc(bondId).update(u2)
  }

  const _add = async () => {
    const b2 = getBasicStampWhileAdding()
    const newData: Partial_Id<Table_WxBond> = {
      ...b2,
      enterStamp: b2.insertedStamp,
      infoType: "chat-tool",
      userId,
      opengid: chatInfo.opengid,
      open_single_roomid: chatInfo.open_single_roomid,
      group_openid,
      chat_type,
    }
    await wbCol.add(newData)
  }

  if(list1.length > 0) {
    const theBond = list1[0]
    _update(theBond)
  }
  else {
    await _add()
  }
  
  return true
}