// Function Name: sync-operate

import cloud from '@lafjs/cloud'
import { 
  AiToolUtil, 
  checker, 
  encryptDataWithAES, 
  getAESKey, 
  getDocAddId, 
  SpaceUtil, 
  verifyToken,
} from '@/common-util'
import * as vbot from "valibot"
import { 
  type CryptoCipherAndIV, 
  type LiuRqReturn, 
  type Table_AiChat, 
  type Table_AiRoom, 
  type Table_Content, 
  type Table_Member, 
  type Table_User, 
  type Table_Workspace,
  type DataPass,
  SyncOperateAPI,
} from '@/common-types'
import { getBasicStampWhileAdding, getNowStamp } from './common-time'
import { createThreadId } from '@/common-ids'
import { AiShared } from '@/ai-shared'
import { afterPostingThread } from '@/sync-after'

const db = cloud.database()
const _ = db.command

export async function main(ctx: FunctionContext) {

  // 1. pre-check
  const body = ctx.request?.body ?? {}
  const err1 = preCheck(body)
  if(err1) return err1

  // 2. verify token
  const vRes = await verifyToken(ctx, body)
  if(!vRes.pass) return vRes.rqReturn
  const user = vRes.userData
  
  // 3. decide which path to run
  let res: LiuRqReturn = { code: "E4000" }
  const b = body as SyncOperateAPI.Param
  if(b.operateType === "agree-aichat") {
    res = await agree_aichat(user, b.chatId)
  }
  else if(b.operateType === "get-aichat") {
    // for compose-page
    res = await get_aichat(user, b.chatId)
  }
  else if(b.operateType === "get-ai-detail") {
    res = await get_ai_detail(user, b.chatId)
  }
  
  return res
}


async function get_ai_detail(
  user: Table_User,
  chatId: string,
): Promise<LiuRqReturn<SyncOperateAPI.Res_GetAiDetail>> {
  // 1. get shared data
  const data1 = await getSharedData(user, chatId)
  if(!data1.pass) return data1.err
  const { theChat } = data1.data

  // 2. return the detail
  const data2: SyncOperateAPI.Res_GetAiDetail = {
    operateType: "get-ai-detail",
    reasoningContent: theChat.reasoning_content,
  }
  return { code: "0000", data: data2 }
}


interface SharedData {
  funcName?: string
  funcJson?: Record<string, any>
  theChat: Table_AiChat
  theRoom: Table_AiRoom
}

async function get_aichat(
  user: Table_User,
  chatId: string,
): Promise<LiuRqReturn<SyncOperateAPI.Res_GetAichat>> {
  // 1. get shared data
  const data1 = await getSharedData(user, chatId)
  if(!data1.pass) return data1.err
  const { funcName, funcJson, theChat } = data1.data
  if(!funcName || !funcJson) {
    return { code: "E5001", errMsg: "funcName or funcJson is empty" }
  }

  // 2. return directly if there is a content associated with this chat
  if(theChat.contentId) {
    return {
      code: "0000",
      data: {
        operateType: "get-aichat",
        result: "created",
        contentId: theChat.contentId
      }
    }
  }

  // 3. get waiting data
  const res3 = AiToolUtil.turnJsonToWaitingData(funcName, funcJson, user)
  if(!res3.pass) {
    return res3.err
  }

  return {
    code: "0000",
    data: {
      operateType: "get-aichat",
      result: "waiting",
      waitingData: res3.data,
    }
  }
}

async function agree_aichat(
  user: Table_User,
  chatId: string,
): Promise<LiuRqReturn<SyncOperateAPI.Res_AgreeAichat>> {
  // 1. get shared data
  const data1 = await getSharedData(user, chatId)
  if(!data1.pass) return data1.err
  const { funcName, funcJson, theChat } = data1.data
  if(!funcName || !funcJson) {
    return { code: "E5001", errMsg: "funcName or funcJson is empty" }
  }

  // 2. return if there is a content associated with this chat
  let contentType: SyncOperateAPI.ContentType = "note"
  if(funcName === "add_todo") contentType = "todo"
  else if(funcName === "add_calendar") contentType = "calendar"
  if(theChat.contentId) {
    return { 
      code: "0000", 
      data: {
        operateType: "agree-aichat",
        contentType,
        contentId: theChat.contentId
      },
    }
  }

  // 3. get my personal space & member
  const spaceAndMember = await getMyPersonalSpaceAndMember(user._id)
  if(!spaceAndMember) {
    return { code: "E5001", errMsg: "fail to get my space or member" }
  }
  const { space, member } = spaceAndMember

  // 4. construct content
  const res4 = AiToolUtil.turnJsonToWaitingData(funcName, funcJson, user)
  if(!res4.pass) {
    return res4.err
  }
  const waitingData = res4.data

  // 5. encrypt waitingData
  const aesKey = getAESKey() ?? ""
  const enc_title = encryptDataWithAES(waitingData.title, aesKey)
  let enc_desc: CryptoCipherAndIV | undefined
  if(waitingData.liuDesc) {
    enc_desc = encryptDataWithAES(waitingData.liuDesc, aesKey)
  }
  // TODO: enc_search_text

  // 6. construct content
  const b6 = getBasicStampWhileAdding()
  const first_id = createThreadId()
  const newContent: Partial<Table_Content> = {
    ...b6,
    first_id,
    user: user._id,
    member: member._id,
    spaceId: space._id,
    spaceType: space.infoType,

    infoType: "THREAD",
    oState: "OK",
    visScope: "DEFAULT",
    storageState: "CLOUD",
    aiReadable: "Y",

    enc_title,
    enc_desc,

    calendarStamp: waitingData.calendarStamp,
    remindStamp: waitingData.remindStamp,
    whenStamp: waitingData.whenStamp,
    remindMe: waitingData.remindMe,
    emojiData: { total: 0, system: [] },

    createdStamp: b6.insertedStamp,
    editedStamp: b6.insertedStamp,

    levelOne: 0,
    levelOneAndTwo: 0,
    aiCharacter: theChat.character,
    computingProvider: AiShared.turnBaseUrlToProvider(theChat.baseUrl),
    aiModel: AiShared.storageAiModel(theChat.model),
  }

  // 7. check out TODO
  let todoIdx = -1
  if(funcName === "add_todo") {
    const sCfg9 = space.stateConfig ?? SpaceUtil.getDefaultStateCfg()
    sCfg9.stateList?.forEach((v, i) => {
      if(v.id === "TODO") {
        todoIdx = i
      }
    })
    if(todoIdx >= 0) {
      newContent.stateId = "TODO"
      newContent.stateStamp = b6.insertedStamp
    }
  }

  // 8. save content
  const cCol = db.collection("Content")
  const res8 = await cCol.add(newContent)
  const contentId = getDocAddId(res8)
  if(!contentId) {
    return { code: "E5001", errMsg: "fail to get contentId" }
  }

  // 10. update ai chat
  const now10 = getNowStamp()
  const u10: Partial<Table_AiChat> = { contentId, updatedStamp: now10 }
  const aCol = db.collection("AiChat")
  aCol.doc(chatId).update(u10)

  // 11. call sync-after
  afterPostingThread(contentId, { disableAiCluster: true })

  return { 
    code: "0000", 
    data: {
      operateType: "agree-aichat",
      contentType,
      contentId,
    },
  }
}


async function getSharedData(
  user: Table_User,
  chatId: string,
): Promise<DataPass<SharedData>> {
  // 1. get the ai chat
  const aiChatCol = db.collection("AiChat")
  const res1 = await aiChatCol.doc(chatId).get<Table_AiChat>()
  const theChat = res1.data
  
  if(!theChat) {
    return { 
      pass: false, 
      err: { code: "E4004", errMsg: "ai chat not found" }
    }
  }
  const { funcName, funcJson } = theChat

  // 2. get the room
  const roomId = theChat.roomId
  const rCol = db.collection("AiRoom")
  const res2 = await rCol.doc(roomId).get<Table_AiRoom>()
  const theRoom = res2.data
  if(!theRoom) {
    return { 
      pass: false, 
      err: { code: "E4004", errMsg: "ai room not found" }
    }
  }

  // 3. check out permission
  if(theRoom.owner !== user._id) {
    return { 
      pass: false, 
      err: { code: "E4003", errMsg: "permission denied" }
    }
  }

  return {
    pass: true,
    data: {
      funcName,
      funcJson,
      theChat,
      theRoom,
    }
  }
}

function preCheck(
  body: Record<string, any>,
) {
  // checking out the AES key of backend
  const backendAESKey = getAESKey()
  if(!backendAESKey) {
    return { code: "E5001", errMsg: "no backend AES key" }
  }

  // checking out the body
  const sch = SyncOperateAPI.Sch_Param
  const res1 = vbot.safeParse(sch, body)
  if(!res1.success) {
    const errMsg = checker.getErrMsgFromIssues(res1.issues)
    return { code: "E4000", errMsg }
  }
}

async function getMyPersonalSpaceAndMember(
  userId: string,
) {
  const wCol = db.collection("Workspace")
  const w1: Partial<Table_Workspace> = {
    owner: userId,
    infoType: "ME",
  }
  const res1 = await wCol.where(w1).getOne<Table_Workspace>()
  const space = res1.data
  if(!space) return

  const mCol = db.collection("Member")
  const w2: Partial<Table_Member> = {
    spaceType: "ME",
    spaceId: space._id,
    user: userId,
  }
  const res2 = await mCol.where(w2).getOne<Table_Member>()
  const member = res2.data
  if(!member) return

  return {
    space,
    member,
  }
}