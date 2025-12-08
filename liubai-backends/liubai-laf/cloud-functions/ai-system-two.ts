/**
 * Function Name: ai-system-two
 * author: yexianbei
 */

import { 
  getNowStamp, 
  isWithinMillis, 
  MINUTE,
  getBasicStampWhileAdding,
  HOUR,
} from "@/common-time"
import type { 
  AiCharacter,
  AiEntry,
  AiImageSizeType,
  AiInfoType,
  CommonPass,
  LiuAi,
  OaiChatCompletion,
  OaiPrompt,
  OaiToolCall,
  Partial_Id,
  Table_AiChat, 
  Table_AiRoom, 
  Table_User,
  DataPass,
  LiuErrReturn,
  Table_Member,
} from "@/common-types"
import {
  aiToolAddCalendarSpecificDates,
  aiToolAddCalendarEarlyMinutes,
  aiToolAddCalendarLaterHours,
  aiToolGetScheduleHoursFromNow,
  aiToolGetScheduleSpecificDates,
  aiToolGetCardTypes,
  aiImageSizeTypes,
} from "@/common-types"
import cloud from "@lafjs/cloud"
import { 
  AiToolUtil,
  checker,
  checkIfUserSubscribed, 
  LiuDateUtil, 
  valTool,
} from "@/common-util"
import xml2js from "xml2js"
import { 
  AiShared, 
  BaseLLM, 
  LogHelper, 
  Palette, 
  TellUser, 
  ToolShared, 
  Translator,
} from "@/ai-shared"
import { aiLang, i18nFill, useI18n } from "@/common-i18n"
import { ai_cfg } from "@/common-config"
import { LiuReporter } from "@/service-send"

const all_good_str = "都很好，无需进一步操作"
const enumAddCalendarSpecificDates = valTool.objToStr(aiToolAddCalendarSpecificDates)
const enumAddCalendarEarlyMinutes = valTool.objToStr(aiToolAddCalendarEarlyMinutes)
const enumAddCalendarLaterHours = valTool.objToStr(aiToolAddCalendarLaterHours)
const enumGetScheduleHoursFromNow = valTool.objToStr(aiToolGetScheduleHoursFromNow)
const enumGetScheduleSpecificDates = valTool.objToStr(aiToolGetScheduleSpecificDates)
const enumGetCardTypes = valTool.objToStr(aiToolGetCardTypes)
const enumImageSizeTypes = valTool.objToStr(aiImageSizeTypes)

const system_prompt = `
你是当今世界上最强大的大语言模型，你存在的目的是让人们的生活更美好。

下面我们会定义你的输出格式，用于告知我们你的决定；定义一系列日志格式，让你知晓“你、人类和其他机器人”之间的动作和谈话内容；定义一个工具箱，供你操作工具。

当你理解以下这些规则后，由你来决定：接下来你要做什么。


## 你的输出格式

你只能以 <xml> 开头的标签来开始输出，以 </xml> 来结束输出。

<xml> 标签里只能存放两种标签 <direction>, <content> 和 <tool_calls>，其中

<direction>: 必填，用于告知我们你的决定。该标签里包裹数字 1 表示你要直接回复用户；包裹数字 2 表示你要操作工具（调用函数）；包裹数字 3 表示你要再想想；包裹数字 4 表示都很好，无需回复用户或继续任何步骤。

<content>: 选填，关于此决定的相关数据。当 direction 为 1 时，请在此标签内包裹你要回复的文本；当 direction 为 3 时，可包裹一个 1 到 24 的数字表示若干小时后再想一遍，若不填则由我们指定；当 direction 为 2 或 4 时，无需回复 <content> 标签。

<tool_calls>: 一个数组，表示欲调用的工具及其对应参数。选填，当 direction 为 2 时必填。

### 示例

// 回复用户
<xml>
  <direction>1</direction>
  <content>就在这里回复用户消息</content>
</xml>

// 调用工具
<xml>
  <direction>2</direction>
  <tool_calls>[{ "type": "function", "function": { "name": "echo", "arguments": { "text": "测试测试" } }, "id": "请为此次调用提供一个唯一值" }]</tool_calls>
</xml>

// 再想想
<xml>
  <direction>3</direction>
</xml>

// 两小时后再想一遍
<xml>
  <direction>3</direction>
  <content>2</content>
</xml>

// 都很好，无需进一步操作；当你觉得无需打扰用户时，我们强烈推荐你这样返回。
<xml>
  <direction>4</direction>
</xml>


## 我们给你的日志格式

每条日志以 <log> 开头，并以 </log> 结尾，其中可包裹：

<role>: 必有，表示角色。包裹 

- \`human\`: 表示人类，即当前用户；
- \`developer\`: 表示开发者，即当前语境中的我们；
- \`bot\`: 表示来自《思考快与慢》中“系统一”的机器人，它们擅长即时反馈，但推理能力没有你强，你更擅长“慢思考”；
- \`system\`: 表示系统消息或旁白；
- \`tool\`: 表示调用工具后的结果；
- \`you\`: 表示你，当今世界上最强大的 AI 助手。

<content>: 选填，表示内容。

<time>: 必有，表示该日志发生的时间。以 YYYY-MM-DD HH:mm:ss 格式表示。

<tool_call_id>: 当 role 为 tool 时必填，表示工具调用的唯一 ID。

<direction>: 当 role 为 you 时必填，表示你的决定。

<name>: 选填，当 role 为 human 或 bot 时可能存在，用来区分不同人或机器人。

<tool_calls>: 选填，当 bot 或 you 调用工具时必填，表示调用的工具列表，其中每个工具是一个 JSON 对象。

### 示例: 来自 human 的消息

// 纯文本消息
<log>
  <role>human</role>
  <content>你好！你是谁？</content>
  <time>2025-02-06 14:39:18</time>
</log>

// 图片消息
<log>
  <role>human</role>
  <content>
    <image_url>https://shanji.online/logos/logo_256x256_v3.png</image_url>
  </content>
  <time>2025-02-06 14:47:05</time>
</log>

### 示例: 来自 bot 的消息

// 回复用户的消息
<log>
  <role>bot</role>
  <content>今天天气真好🌤️</content>
  <time>2025-02-05 11:12:31</time>
</log>

// 调用工具: 获取未来 24 小时内的日程
<log>
  <role>bot</role>
  <tool_calls>[{ "type": "function", "function": { "name": "get_schedule", "arguments": { "hoursFromNow": 24 } }, "id": "tool_id_1" }]</tool_calls>
  <time>2025-02-07 18:43:03</time>
</log>

### 示例: 工具调用的结果

// 调用工具 "get_schedule" 后的结果
<log>
  <role>tool</role>
  <content>{"results": [/** 存放一条条数据，若查无结果，则为一个空数组 */]}</content>
  <tool_call_id>tool_id_1</tool_call_id>
  <time>2025-02-07 18:43:04</time>
</log>

// 调用工具 "web_search" 后的结果
<log>
  <role>tool</role>
  <content>【关键词】：今日新闻\n【原始意图】：告诉我今天的新闻\n【搜索结果】：......</content>
  <tool_call_id>tool_id_2</tool_call_id>
  <time>2025-02-08 08:13:49</time>
</log>

### 示例: 来自你的消息

// 调用工具: 获取今天的日程
<log>
  <role>you</role>
  <direction>2</direction>
  <tool_calls>[{ "type": "function", "function": { "name": "get_schedule", "arguments": { "specificDate": "today" } }, "id": "tool_id_5" }]</tool_calls>
  <time>2025-02-06 14:40:00</time>
</log>

// 回复人类消息
<log>
  <role>you</role>
  <direction>1</direction>
  <content>xxx，下午三点有一场会议，别忘了参加！</content>
  <time>2025-02-06 14:40:10</time>
</log>

// 再想想
<log>
  <role>you</role>
  <direction>3</direction>
  <content>思考过程: 嗯，xxx告诉我说......</content>
  <time>2025-02-06 15:55:31</time>
</log>

// 无需回复
<log>
  <role>you</role>
  <direction>4</direction>
  <content>${all_good_str}</content>
  <time>2025-02-06 15:55:31</time>
</log>


## 工具箱

### 网络搜索

\`\`\`json
{
  type: "function",
  function: {
    name: "web_search",
    description: "搜索网页。给定一段关键词，返回一系列与之相关的网页和背景信息。",
    parameters: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "搜索关键词",
        }
      },
      required: ["q"],
      additionalProperties: false
    }
  },
}
\`\`\`

### 链接解析

\`\`\`json
{
  type: "function",
  function: {
    name: "parse_link",
    description: "解析链接。给定一个 http 链接，返回它的标题、摘要、内文......",
    parameters: {
      type: "object",
      properties: {
        link: {
          type: "string",
          description: "要解析的链接，http 开头",
        },
      },
      required: ["link"],
      additionalProperties: false,
    }
  }
},
\`\`\`

### 画图

\`\`\`json
{
  type: "function",
  function: {
    name: "draw_picture",
    description: "Drawing. Given a delicate prompt, return an image drawn from it.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Description field using English, which indicates what the image you want to draw looks like. The more detailed the description, the better the result.",
        },
        sizeType: {
          type: "string",
          description: '"square" indicates a square image, and "portrait" indicates a vertical image. The default value is "square".',
          enum: ${enumImageSizeTypes},
        }
      },
      required: ["prompt"],
      additionalProperties: false
    }
  }
}
\`\`\`

### 新建笔记

\`\`\`json
{
  type: "function",
  function: {
    name: "add_note",
    description: "添加笔记，其中必须包含内文，以及可选的标题。",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "笔记标题"
        },
        description: {
          type: "string",
          description: "笔记内文",
        },
      },
      required: ["description"],
      additionalProperties: false
    }
  }
}
\`\`\`

### 添加待办

\`\`\`json
{
  type: "function",
  function: {
    name: "add_todo",
    description: "添加待办",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "待办事项标题"
        }
      },
      required: ["title"],
      additionalProperties: false
    }
  }
}
\`\`\`

### 添加提醒事项、事件或日程

\`\`\`json
{
  type: "function",
  function: {
    name: "add_calendar",
    description: "添加: 提醒事项 / 日程 / 事件 / 任务",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "标题"
        },
        description: {
          type: "string",
          description: "描述（内容）",
        },
        date: {
          type: "string",
          description: "日期，格式为 YYYY-MM-DD。该字段与 specificDate 互斥，仅能指定一个。",
        },
        specificDate: {
          type: "string",
          description: "特定日期: 今天、明天、后天或周几，若是“周几”我们将自动推算距离用户最近的周几。该字段与 date 互斥，仅能指定一个。",
          enum: ${enumAddCalendarSpecificDates},
        },
        time: {
          type: "string",
          description: "时间，格式为 hh:mm",
        },
        earlyMinute: {
          type: "string",
          description: "提前多少分钟提醒。设置为 0 时表示准时提醒，设置 1440 表示提前一天提醒。",
          enum: ${enumAddCalendarEarlyMinutes},
        },
        laterHour: {
          type: "string",
          description: '从现在起，往后推算多少小时后发生。设置为 0.5 表示三十分钟后，1 表示一小时后，24 表示一天后发生。该字段与 date, time, earlyMinute 三个字段互斥。',
          enum: ${enumAddCalendarLaterHours},
        }
      },
      required: ["description"],
      additionalProperties: false
    }
  }
}
\`\`\`

### 获取日程

\`\`\`
{
  type: "function",
  function: {
    name: "get_schedule",
    description: "获取最近的日程。可以不指定 hoursFromNow 或 specificDate，那么会直接返回未来 10 条日程。",
    parameters: {
      type: "object",
      properties: {
        hoursFromNow: {
          type: "string",
          description: "获取最近几个小时内的日程，正数表示未来，举例: 24 表示获取未来 24 小时的日程，48 表示获取未来 48 小时的日程；负数表示过去，举例：-24 表示获取过去 24 小时的日程。",
          enum: ${enumGetScheduleHoursFromNow},
        },
        specificDate: {
          type: "string",
          description: "获取昨天、今天、明天、后天、这周或下周某天的日程。specificDate 和 hoursFromNow 不可以同时指定。",
          enum: ${enumGetScheduleSpecificDates}
        }
      },
      additionalProperties: false
    }
  }
}
\`\`\`

### 获取卡片

\`\`\`
{
  type: "function",
  function: {
    name: "get_cards",
    description: "获取待办、已完成或最近添加的事项（卡片）",
    parameters: {
      type: "object",
      properties: {
        cardType: {
          type: "string",
          description: "指定获取哪类事项，有以下合法值：\nTODO: 表示待办；\nFINISHED: 表示已完成；\nADD_RECENTLY: 表示最近添加的卡片；\nEVENT: 最近添加的、带有时间的事件。",
          enum: ${enumGetCardTypes},
        }
      },
      required: ["cardType"],
      additionalProperties: false
    }
  }
}
\`\`\`


## 请求

现在你已经学会如何以正确的格式进行输出，并且能读懂日志理解之前发生了什么，同时你还能驾轻就熟地使用各种我们已定义好的工具。

最后我们想说的是，你非常强大，具备反省、纠错和提醒的能力。你见微知著，饱含同理心，并且富有洞察力，能知道人们需要什么、烦恼什么和渴望什么。

接下来是你的时间。在 user prompt 的地方，我们会打印当前环境信息，并附上最近的日志，由你来决定要如何输出！
`.trim()

const user_prompt = `
## 当前环境

对方昵称: {user_nickname}
当前日期: {current_date}
当前时间: {current_time}
沟通界面: 微信服务号
回复限制: 若你选择 <direction> 为 1，请将回复的文字限制在 300 字内，简洁扼要地交付最终结果。这是因为在微信服务号里，我们传送文字的数量受到限制。


## 日志

下面是由旧至新排序的最近日志：

{logs}

## 最后提醒

看完以上日志后，最后我们提醒您：

1. 以上日志（尤其是来自 bot 的消息）可能存在幻觉问题，需要你调用工具进行检查，仔细甄别。
2. 你的最终输出结果（非思考过程）请务必遵循上文 system prompt 中“你的输出格式”，也就是将你的想法包裹在 <xml> 标签中，里头还包含 <direction> 和 <content> 标签。

现在是你的时间。
`.trim()

const tool_result_tmpl = `
## 工具调用结果

<log>
  <role>tool</role>
  <content>{tool_result}</content>
  <tool_call_id>{tool_call_id}</tool_call_id>
  <time>{time}</time>
</log>

## 再次提醒

请务必遵循 system prompt 中“你的输出格式”进行输出，也就是将你的想法包裹在 <xml> 标签中，里头还包含 <direction> 和 <content> 标签。
`.trim()

const xml_with_tool_calls = `
<xml>
  <direction>2</direction>
  <tool_calls>{tool_calls}</tool_calls>
</xml>
`

/********************* constants ****************/
const db = cloud.database()
const _ = db.command

const HR_47 = HOUR * 47

// 最小会话论述，聊天室的轮数必须大于等于该值，才会进入系统二
const MAX_INPUT_TOKEN_K = 24
const MAX_OUTPUT_TOKENS = 2500

const SYS2_CHARACTER: AiCharacter = "ds-reasoner"

/********************* empty function ****************/
export async function main(ctx: FunctionContext) {
  await invoke_by_clock()
  return true
}

/********************* interfaces ****************/

interface UserCtx {
  user: Table_User
  member: Table_Member
  room: Table_AiRoom
  chats: Table_AiChat[]
}

// invoke by CRON
export async function invoke_by_clock() {
  const controller = new Controller()
  const { num } = await controller.batchRun()
  if(num > 0) {
    console.warn("estimated num: ", num)
  }
  return { num }
}

class Controller {

  private _numPerLoop = 10
  private _maxUser = 100
  private _maxRunTimes = 20

  // call by invoke_by_clock
  async batchRun() {
    const maxUser = this._maxUser
    const now0 = getNowStamp()
    let minNeedSystem2Stamp = now0 - HR_47

    let num = 0
    let runTimes = 0
    while(num < maxUser && runTimes < this._maxRunTimes) {
      runTimes++

      // 1. get rooms
      const res1 = await this.getRooms(minNeedSystem2Stamp)
      if(res1.newNeedSystem2Stamp) {
        minNeedSystem2Stamp = res1.newNeedSystem2Stamp
      }
      if(res1.userIds.length < 1) break

      // 2.1 get users
      const users = await this.getUsers(res1.userIds)
      if(users.length < 1) continue

      // 2.2 get personal members
      const members = await this.getMembers(users)

      // 3. ctxs filled by users and rooms
      const res3 = this.initUserCtxs(res1.rooms, users, members)
      if(res3.length < 1) continue

      // 4. get chats for each ctx
      for(let i=0; i<res3.length; i++) {

        // 4.1 get chats
        const ctx = res3[i]
        const chats = await this.getChats(ctx.room._id)
        if(chats.length < 10) continue
        ctx.chats = chats

        // 4.2 start to run for the user
        const system2 = new SystemTwo(ctx)
        system2.run()

        await valTool.waitMilli(1000)
        num++
      }


      // n. check out if we need to break the loop
      if(!res1.newNeedSystem2Stamp) {
        break
      }
    }

    return { num }
  }


  // call by invoke_by_user
  private async getRooms(
    minNeedSystem2Stamp: number,
  ) {
    const numPerLoop = this._numPerLoop
    const now1 = getNowStamp()
    const w1 = {
      needSystem2Stamp: _.and(_.lte(now1), _.gt(minNeedSystem2Stamp)),
    }
    const rCol = db.collection("AiRoom")
    const q1 = rCol.where(w1).limit(numPerLoop).orderBy("needSystem2Stamp", "asc")
    const res1 = await q1.get<Table_AiRoom>()
    const rooms = res1.data
    const userIds = rooms.map(v => v.owner)
    const rLength = rooms.length
    if(rLength < 1) return { rooms, userIds }
    const lastRoom = rooms[rLength - 1]
    const newNeedSystem2Stamp = lastRoom.needSystem2Stamp
    return { rooms, userIds, newNeedSystem2Stamp }
  }

  private async getUsers(
    userIds: string[],
  ) {
    // 1. get users
    const now1 = getNowStamp()
    const HR_47_AGO = now1 - HR_47
    const w1 = {
      _id: _.in(userIds),
      oState: "NORMAL",
      activeStamp: _.gte(HR_47_AGO),
    }
    const uCol = db.collection("User")
    const res1 = await uCol.where(w1).get<Table_User>()
    const users = res1.data
    if(users.length < 1) return []

    // 2. set more fields, like:
    // "Are they subscribed?" 
    // "Are they premium?"
    // "Were they chatting in the last 47 hours?"
    // "How many conversations do they have?"
    const newUsers: Table_User[] = []
    for(let i=0; i<users.length; i++) {
      const v = users[i]

      const lastUserChatStamp = v.quota?.lastWxGzhChatStamp ?? 1
      const within47 = isWithinMillis(lastUserChatStamp, HR_47)
      if(!within47) continue

      const subscribe = v.thirdData?.wx_gzh?.subscribe
      if(subscribe === 0) continue

      const isPremium = checkIfUserSubscribed(v)
      if(isPremium) {
        newUsers.push(v)
        continue
      }
      const count = v.quota?.aiConversationCount ?? 0
      if(count >= ai_cfg.minConversationsToTriggerSystemTwo) {
        newUsers.push(v)
        continue
      }
    }

    return newUsers
  }

  private async getMembers(
    users: Table_User[],
  ) {
    // 1. get user ids
    const userIds = users.map(v => v._id)
    if(userIds.length < 1) return []

    // 2. construct where
    const w2 = {
      spaceType: "ME",
      oState: "OK",
      user: _.in(userIds),
    }
    const mCol = db.collection("Member")
    const res2 = await mCol.where(w2).get<Table_Member>()
    return res2.data
  }

  private async getChats(
    roomId: string,
  ) {
    const w1 = { roomId }
    const cCol = db.collection("AiChat")
    const q1 = cCol.where(w1).limit(50).orderBy("sortStamp", "desc")
    const res1 = await q1.get<Table_AiChat>()
    const list = res1.data

    // if the first item is direction of 4 from System2, return []
    const firstItem = list[0]
    if(firstItem && firstItem.directionOfSystem2 === "4") return []

    return list
  }

  private initUserCtxs(
    rooms: Table_AiRoom[],
    users: Table_User[],
    members: Table_Member[],
  ) {
    const list: UserCtx[] = []
    for(let i=0; i<rooms.length; i++) {
      const room = rooms[i]
      const user = users.find(v => v._id === room.owner)
      if(!user) continue
      const member = members.find(v => v.user === user._id)
      if(!member) continue
      list.push({ user, room, member, chats: [] })
    }
    return list
  }


}

class SystemTwo {

  private _ctx: UserCtx
  private _reasonerAndUs: OaiPrompt[] = []
  private _runLogs: LiuAi.RunLog[] = []
  private _lastChatCompletion: OaiChatCompletion | undefined

  constructor(ctx: UserCtx) {
    this._ctx = ctx
  }


  async run() {
    // 1. throw needSystem2Stamp to one hour later
    this.mapToSomeHourLater(1)

    // 2. run system two in loop
    const maxTimes = 3
    let runTimes = 0
    while(runTimes < maxTimes) {
      runTimes++
      const chatCompletion = await this.inputToLLM()
      if(!chatCompletion) break
      const res2 = await this.handleOutput(chatCompletion)
      if(!res2) break
    }

    // 3. handle _runLogs
    this.handleRunLogs()
  }

  private async handleRunLogs() {
    // 1. get logs
    const allLogs = this._runLogs
    if(allLogs.length < 1) return
    allLogs.sort((a, b) => a.logStamp - b.logStamp)

    // 2. extract logs into privacy & working
    const privacyLogs = allLogs.filter(v => {
      const bool = Boolean(v.toolName === "get_cards" || v.toolName === "get_schedule")
      return bool
    })
    const workingLogs = allLogs.filter(v => {
      const bool = Boolean(v.toolName === "draw_picture" || v.toolName === "maps_whatever")
      return bool
    })

    // 3. get i18n
    const { t } = useI18n(aiLang, { user: this._ctx.user })
    let msg = ""

    // 4. privacy logs
    if(privacyLogs.length > 0) {
      msg += (t("privacy_title") + "\n")
      privacyLogs.forEach(v => {
        msg += (v.textToUser + "\n")
      })
      msg += "\n"
    }

    // 5. working logs
    if(workingLogs.length > 0) {
      msg += (t("working_log_title") + "\n")
      workingLogs.forEach(v => {
        msg += (v.textToUser + "\n")
      })
      msg += "\n"
    }

    // 6. send
    if(msg) {
      msg = msg.trim()
      console.log("see msg in handleRunLogs: ", msg)
      await valTool.waitMilli(1500)
      const entry = System2Util.mockAiEntry(this._ctx.user)
      TellUser.text(entry, msg)
    }
  }

  private async inputToLLM() {
    // 1. get params
    const { chats, user, member } = this._ctx
    const reasonerAndUs = this._reasonerAndUs
    const maxInputToken = MAX_INPUT_TOKEN_K * 1000

    // 2. get token we have
    let tokenWeHave = AiShared.calculateTextToken(system_prompt)
    tokenWeHave += AiShared.calculateTextToken(user_prompt)
    for(let i=0; i<reasonerAndUs.length; i++) {
      const v = reasonerAndUs[i]
      tokenWeHave += AiShared.calculatePromptToken(v)
    }

    // 3. add logs
    let system2Logs: string[] = []
    for(let i=0; i<chats.length; i++) {
      const v = chats[i]
      const chat2log = new ChatToLog(this._ctx)
      const res3_1 = chat2log.run(v)
      if(!res3_1) continue
      system2Logs.push(...res3_1)
      res3_1.forEach(v2 => {
        tokenWeHave += AiShared.calculateTextToken(v2)
      })
      if(tokenWeHave > maxInputToken) continue
    }

    // 4. generate log string
    let logs = ""
    for(let i=0; i<system2Logs.length; i++) {
      const v = system2Logs[i]
      logs = v + "\n" + logs
    }

    // 5. fill user prompt with logs
    const {
      date: current_date,
      time: current_time,
    } = LiuDateUtil.getDateAndTime(getNowStamp(), user.timezone)
    const userPrompt = i18nFill(user_prompt, {
      user_nickname: member.name ?? "未知",
      current_date,
      current_time,
      logs,
    })

    // 6. constructs messages
    const messages: OaiPrompt[] = [
      {
        role: "system",
        content: system_prompt,
      },
      {
        role: "user",
        content: userPrompt,
      }
    ]

    // console.warn("system_prompt:")
    // LogHelper.printLastChars(system_prompt)

    // 7. add _reasonerAndUs
    messages.push(...reasonerAndUs)

    // 8. call LLM
    const apiData = System2Util.getApiData()
    const { model, baseUrl, apiKey } = apiData
    const llm = new BaseLLM(apiKey, baseUrl)
    const res8 = await llm.chat({ 
      messages, 
      model, 
      temperature: 0.6,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
    })

    return res8
  }

  private async handleOutput(
    chatCompletion: OaiChatCompletion,
  ) {
    // 1. get content & reasoning_content
    const res1 = AiShared.getContentFromLLM(chatCompletion, undefined, true)
    const content1 = res1.content
    const reasoning_content1 = res1.reasoning_content
    this._lastChatCompletion = chatCompletion

    // console.log("content1: ", content1)
    // console.log("reasoning_content1: ", reasoning_content1)

    // 2. handle error
    // 2.1 there is only reasoning_content
    if(!content1 && reasoning_content1) {
      console.warn("there is only reasoning_content: ", reasoning_content1)
      const msg2_1 = `### Only reasoning_content\n\n${reasoning_content1}`
      this._toReporter(msg2_1)
      return false
    }

    // 2.2 see finish reason
    const finishReason = AiShared.getFinishReason(chatCompletion)
    if(!finishReason || finishReason === "length") {
      console.warn("finish reason is unexpected: ", finishReason)
      const msg2_2 = `### Finish Reason\n\n${finishReason}`
      this._toReporter(msg2_2)
      return false
    }

    // 2.3 no content
    if(!content1) {
      console.warn("no content", chatCompletion)
      const ccMsg = valTool.objToStr(chatCompletion)
      const msg2_3 = `### No Content\n\n${ccMsg}`
      this._toReporter(msg2_3)
      return false
    }

    // 3.1 parse content
    let res3: LiuAi.Sys2Output | undefined
    const parser = new xml2js.Parser({ explicitArray: false })
    try {
      const { xml } = await parser.parseStringPromise(content1)
      res3 = xml
    }
    catch(err) {
      console.warn("xml2js.Parser parse error: ", err)
    }

    // 3.2 start to handle parsing error
    if(!res3) {
      const msg3_2 = `### Parse Error\n\n${content1}`

      // 3.2.1 if content1 has <direction> but parser failed
      if(content1.includes("<direction>")) {
        this._toReporter(msg3_2)
        return true
      }

      // 3.2.2 if content1 has <content> but parser failed
      if(content1.includes("<content>")) {
        this._toReporter(msg3_2)
        return true
      }

      // 3.2.3 if content1 has <tool_calls> but parser failed
      if(content1.includes("<tool_calls>")) {
        this._toReporter(msg3_2)
        return true
      }

      // 3.2.4 if contents has too less characters
      if(content1.length < 10) {
        this._toReporter(msg3_2)
        return true
      }

      // 3.2.n package content1 with <xml> and <direction>1</direction>
      try {
        const newContent1 = `<xml>\n  <direction>1</direction>\n  <content>${content1}</content>\n</xml>`
        const { xml: xml2 } = await parser.parseStringPromise(newContent1)
        res3 = xml2
      }
      catch(err) {
        console.warn("parsing failed again: ", err)
      }
    }

    // 3.3 parsing error again
    if(!res3) {
      const msg3_3 = `### Parse Error Again\n\n${content1}`
      this._toReporter(msg3_3)
      return false
    }

    // 3.4 calibrate output
    this._calibrateOutput(res3)
    console.log("see result from SYS 2: ", res3)

    // 4. decide which path to go
    let res4 = false
    const { 
      direction, 
      content: content4,
      tool_calls,
    } = res3
    if(direction === "1" && content4) {
      // get to reply
      this.toReply(content4, reasoning_content1)
    }
    else if(direction === "2" && tool_calls) {
      // const msg4_2 = `### Tool calls\n\n${tool_calls}`
      // this._toReporter(msg4_2)
      res4 = await this.toUseTools(tool_calls)
    }
    else if(direction === "3" && reasoning_content1) {
      const msg4_3 = `### Think Later\n\n${reasoning_content1}`
      this._toReporter(msg4_3)
      this.toThinkLater(reasoning_content1, content4)
    }
    else if(direction === "4") {
      this.toFeelAllGood()
    }
    else {
      const err_msg4 = `### Unexpected Output\n\n${content1}`
      this._toReporter(err_msg4)
    }

    return res4
  }

  private _calibrateOutput(
    result?: LiuAi.Sys2Output
  ) {
    if(!result) return
    const { direction, content } = result

    const _isContentRepliedText = () => {
      if(!content) return false
      const content2 = content.trim()
      if(content2.startsWith("<")) return false
      if(content2.endsWith(">")) return false
      if(content2.length < 3) return false
      return true
    }

    // 1. no direction
    if(!direction) {
      const res1 = _isContentRepliedText()
      if(res1) result.direction = "1"
      return
    }

    // 2. direction is not legal
    const LEGAL_DIRECTIONS = ["1", "2", "3", "4"]
    if(!LEGAL_DIRECTIONS.includes(direction)) {
      const res1 = _isContentRepliedText()
      if(res1) result.direction = "1"
      return
    }
  }


  private _toReporter(
    markdown: string,
    title = "FlashNote System Two",
  ) {
    // 1. add more info into markdown
    const { user, room, chats, member } = this._ctx
    markdown += "\n\n------\n\n"
    markdown += `**User id:** ${user._id}\n\n`
    markdown += `**Room id:** ${room._id}\n\n`
    markdown += `**Chat length:** ${chats.length}\n\n`
    markdown += `**Nickname:** ${member.name || "Unknown"}\n\n`

    // 2. get request id
    const requestId = this._lastChatCompletion?.id
    if(requestId) {
      markdown += `**Request id:** ${requestId}`
    }

    // 3. send
    const reporter = new LiuReporter()
    reporter.send(markdown, title)
  }


  /**
   * 曾遇到一种情况 text 为
   * {
   *    "_": "xxx，我的比特率已经调到最高......",
   *    "I": "love you"
   * }
   */
  private async toReply(
    text: any,
    reasoning_content?: string,
  ) {
    if(!text) return
    if(text?._ && typeof text._ === "string") {
      text = text._
    }
    if(!valTool.isStringWithVal(text)) {
      console.warn("text is not string with value: ", text)
      return
    }

    // 1. add message to chats
    this._addSystem2Chat("assistant", "1", {
      text,
      reasoning_content,
      onlyInSystem2: false,
    })

    // 2. mock AiEntry
    const entry = System2Util.mockAiEntry(this._ctx.user)
    TellUser.text(entry, text, { fromSystem2: true })

    // 3. update needSystem2Stamp
    this.mapToSomeHourLater(23)
  }

  private async toUseTools(tool_calls_str: string) {
    // 1. parse tool calls
    let tool_calls: Record<string, any>[] = []
    try {
      tool_calls = JSON.parse(tool_calls_str)
    }
    catch(err) {
      console.warn("JSON.parse tool_calls error: ", err)
      return false
    }
    if(!tool_calls || !Array.isArray(tool_calls)) {
      console.warn("fail to parse tool_calls: ", tool_calls_str)
      return false
    }

    // 2. let's call tools
    let hasAnyContinue = false
    const maxToolCalls = Math.min(tool_calls.length, 3)
    for(let i=0; i<maxToolCalls; i++) {
      const v = tool_calls[i]
      let res2 = await this.useATool(v as OaiToolCall)
      if(res2) hasAnyContinue = true
    }

    return hasAnyContinue
  }

  private async useATool(
    tool_call: OaiToolCall,
  ) {
    // 1. check out param
    const funcData = tool_call["function"]
    if(tool_call.type !== "function" || !funcData) return true

    // 2. get required params
    const funcName = funcData.name as LiuAi.ToolName
    const funcArgs = funcData.arguments as any
    let funcJson: any = funcArgs
    if(typeof funcArgs === "string") {
      funcJson = valTool.strToObj(funcArgs)
    }

    console.log("funcName: ", funcName)
    console.log(funcJson)

    const toolHandler2 = new ToolHandler2(
      this._ctx, 
      [tool_call] as OaiToolCall[], 
      this._lastChatCompletion,
    )

    // 3. decide which path to go
    if(funcName === "add_note") {
      const addNoteRes1 = await toolHandler2.add_note(funcJson)
      const addNoteRes2 = this.afterAddingCard(addNoteRes1, tool_call)
      return addNoteRes2
    }
    if(funcName === "add_todo") {
      const addTodoRes1 = await toolHandler2.add_todo(funcJson)
      const addTodoRes2 = this.afterAddingCard(addTodoRes1, tool_call)
      return addTodoRes2
    }
    if(funcName === "add_calendar") {
      const addCalendarRes1 = await toolHandler2.add_calendar(funcJson)
      const addCalendarRes2 = this.afterAddingCard(addCalendarRes1, tool_call)
      return addCalendarRes2
    }
    
    if(funcName === "web_search") {
      const searchRes1 = await toolHandler2.web_search(funcJson)
      const searchRes2 = this.afterSearching(searchRes1, tool_call)
      return searchRes2
    }
    
    if(funcName === "parse_link") {
      const parsingRes1 = await toolHandler2.parse_link(funcJson)
      const parsingRes2 = this.afterParsingLink(parsingRes1, tool_call)
      return parsingRes2
    }
    
    if(funcName === "draw_picture") {
      const drawRes1 = await toolHandler2.draw_picture(funcJson)
      const drawRes2 = this.afterDrawingPicture(drawRes1, tool_call)
      return drawRes2
    }

    if(funcName === "get_schedule") {
      const getSchRes1 = await toolHandler2.get_schedule(funcJson)
      const getSchRes2 = this.afterGettingSchedules(getSchRes1, funcJson, tool_call)
      return getSchRes2
    }
    
    if(funcName === "get_cards") {
      const getCardsRes1 = await toolHandler2.get_cards(funcJson)
      const getCardsRes2 = this.afterGettingCards(getCardsRes1, funcJson, tool_call)
      return getCardsRes2
    }

    if(funcName?.startsWith("maps_")) {
      const mapRes1 = await toolHandler2.maps_whatever(funcName, funcJson)
      const mapRes2 = this.afterMapsWhatever(mapRes1, tool_call)
      return mapRes2
    }
    
    return true
  }

  private _addPromptsForToolUse(
    tool_result: string,
    tool_call: OaiToolCall,
  ) {
    // 1. generate message from LLM
    const tool_call_msg = valTool.objToStr(tool_call)
    const tool_calls_str = `[${tool_call_msg}]`
    const content1 = i18nFill(xml_with_tool_calls, {
      tool_calls: tool_calls_str,
    })

    // 2. add assitant prompt
    const assistantMessage: OaiPrompt = {
      role: "assistant",
      content: content1,
    }
    this._reasonerAndUs.push(assistantMessage)

    // 3. add user prompt
    const timeStr = this._getCurrentTimeStr()
    const newUserContent = i18nFill(tool_result_tmpl, {
      time: timeStr,
      tool_call_id: tool_call.id,
      tool_result,
    })
    const userPrompt: OaiPrompt = {
      role: "user",
      content: newUserContent,
    }
    this._reasonerAndUs.push(userPrompt)
    
    console.warn("tool result prompt: ", newUserContent)

    return true
  }

  private _addErrPromptsForToolUse(
    err: LiuErrReturn,
    tool_call: OaiToolCall,
  ) {
    const msg = valTool.objToStr(err)
    return this._addPromptsForToolUse(msg, tool_call)
  }

  private _getCurrentTimeStr() {
    const user = this._ctx.user
    const res1 = LiuDateUtil.getDateAndTime(
      getNowStamp(),
      user?.timezone,
    )
    const timeStr = `${res1.date} ${res1.time}`
    return timeStr
  }

  private afterGettingCards(
    dataPass: DataPass<LiuAi.ReadCardsResult>,
    funcJson: Record<string, any>,
    tool_call: OaiToolCall,
  ) {
    // 1. if error
    if(!dataPass.pass) {
      return this._addErrPromptsForToolUse(dataPass.err, tool_call)
    }
    const readingRes = dataPass.data

    // 2. add running log
    const log: LiuAi.RunLog = {
      toolName: "get_cards",
      cardType: funcJson.cardType,
      character: SYS2_CHARACTER,
      textToUser: readingRes.textToUser,
      logStamp: getNowStamp(),
    }
    this._runLogs.push(log)

    // 3. add prompts
    return this._addPromptsForToolUse(readingRes.textToBot, tool_call)
  }

  private afterGettingSchedules(
    dataPass: DataPass<LiuAi.ReadCardsResult>,
    funcJson: Record<string, any>,
    tool_call: OaiToolCall,
  ) {
    // 1. if error
    if(!dataPass.pass) {
      return this._addErrPromptsForToolUse(dataPass.err, tool_call)
    }
    const readingRes = dataPass.data

    // 2. add running log
    const log: LiuAi.RunLog = {
      toolName: "get_schedule",
      hoursFromNow: funcJson.hoursFromNow,
      specificDate: funcJson.specificDate,
      character: SYS2_CHARACTER,
      textToUser: readingRes.textToUser,
      logStamp: getNowStamp(),
    }
    this._runLogs.push(log)

    // 3. add prompts
    return this._addPromptsForToolUse(readingRes.textToBot, tool_call)
  }

  /** return `true` to represent `continue`,
   * otherwise to represent `stop`
  */
  private afterAddingCard(
    res: CommonPass,
    tool_call: OaiToolCall,
  ) {
    if(!res.pass) {
      return this._addErrPromptsForToolUse(res.err, tool_call)
    }

    this.mapToSomeHourLater(12)

    return false
  }

  /** return `true` to represent `continue`,
   * otherwise to represent `stop`
  */
  private afterSearching(
    dataPass: DataPass<LiuAi.SearchResult>,
    tool_call: OaiToolCall,
  ) {
    if(!dataPass.pass) {
      return this._addErrPromptsForToolUse(dataPass.err, tool_call)
    }
    const searchRes = dataPass.data
    const searchMd = searchRes.markdown
    return this._addPromptsForToolUse(searchMd, tool_call)
  }

  private afterParsingLink(
    dataPass: DataPass<LiuAi.ParseLinkResult>,
    tool_call: OaiToolCall,
  ) {
    if(!dataPass.pass) {
      return this._addErrPromptsForToolUse(dataPass.err, tool_call)
    }
    const parseRes = dataPass.data
    const parseMd = parseRes.markdown
    return this._addPromptsForToolUse(parseMd, tool_call)
  }

  private afterMapsWhatever(
    dataPass: DataPass<LiuAi.MapResult>,
    tool_call: OaiToolCall,
  ) {
    // 1. handle error
    if(!dataPass.pass) {
      return this._addErrPromptsForToolUse(dataPass.err, tool_call)
    }
    const mapRes = dataPass.data

    // 2. add running log
    if(mapRes.textToUser) {
      const log: LiuAi.RunLog = {
        toolName: "maps_whatever",
        character: SYS2_CHARACTER,
        textToUser: mapRes.textToUser,
        logStamp: getNowStamp(),
      }
      this._runLogs.push(log)
    }

    // 3. add prompts
    const mapMd = mapRes.textToBot
    return this._addPromptsForToolUse(mapMd, tool_call)
  }


  /** return `true` to represent `continue`,
   * otherwise to represent `stop`
  */
  private afterDrawingPicture(
    dataPass: DataPass<LiuAi.PaletteResult>,
    tool_call: OaiToolCall,
  ) {
    // 0. if error
    if(!dataPass.pass) {
      return this._addErrPromptsForToolUse(dataPass.err, tool_call)
    }
    const drawRes = dataPass.data

    // 1. get text which will be sent to user
    const user = this._ctx.user
    const { t } = useI18n(aiLang, { user })
    const botName = t("system2_r1")
    const drawTextToUser = t("bot_draw", {
      botName,
      model: drawRes.model,
    })

    // 2. add running log
    const drawLog: LiuAi.RunLog = {
      toolName: "draw_picture",
      drawResult: drawRes,
      character: SYS2_CHARACTER,
      textToUser: drawTextToUser,
      logStamp: getNowStamp(),
    }
    this._runLogs.push(drawLog)

    // 3. map to some hour later
    this.mapToSomeHourLater(12)

    return false
  }

  private toThinkLater(
    reasoning_content: string,
    hrs?: string,
  ) {
    this._addSystem2Chat("assistant", "3", { reasoning_content })
    const hours = Number(hrs)
    if(isNaN(hours)) return
    if(hours >= 2 && hours <= 24) {
      this.mapToSomeHourLater(hours)
    }
  }

  private toFeelAllGood() {
    this._addSystem2Chat("assistant", "4", {})
    this.resetNeedSystem2Stamp()
  }

  private async _addSystem2Chat(
    infoType: AiInfoType,
    direction: LiuAi.Sys2Direction,
    otherParam: Partial<Table_AiChat>,
  ) {
    // 1. get model and baseUrl
    const apiData = System2Util.getApiData()
    const { model, baseUrl } = apiData

    // 2. get other params
    const room = this._ctx.room
    const roomId = room._id
    const b1 = getBasicStampWhileAdding()
    const chatCompletion = this._lastChatCompletion

    // 3. construct new chat
    const newChat: Partial_Id<Table_AiChat> = {
      ...b1,
      sortStamp: b1.insertedStamp,
      roomId,
      infoType,

      model,
      character: SYS2_CHARACTER,
      usage: chatCompletion?.usage,
      requestId: chatCompletion?.id,
      baseUrl,
      finish_reason: "stop",

      onlyInSystem2: true,
      fromSystem2: true,
      directionOfSystem2: direction,

      ...otherParam,
    }
    const chatId = await AiShared.addChat(newChat)
    return chatId
  }

  private async mapToSomeHourLater(
    hr: number
  ) {
    // 1. calculate needSystem2Stamp
    const room = this._ctx.room
    const roomId = room._id
    const now1 = getNowStamp()
    const randomMinute = Math.ceil(Math.random() * 30)
    let needSystem2Stamp = randomMinute * MINUTE + (hr * HOUR) + now1

    // 2. check out activeStamp
    const user = this._ctx.user
    const activeStamp = user.activeStamp
    if(!activeStamp) {
      return
    }
    const maxStamp = activeStamp + (47 * HOUR)
    if(needSystem2Stamp > maxStamp) {
      needSystem2Stamp = maxStamp
    }
    if(needSystem2Stamp < now1) {
      needSystem2Stamp = 0
    }

    // 3. update
    const rCol = db.collection("AiRoom") 
    const u1: Partial<Table_AiRoom> = {
      updatedStamp: now1,
      needSystem2Stamp,
    }
    await rCol.doc(roomId).update(u1)
  }

  private async resetNeedSystem2Stamp() {
    const room = this._ctx.room
    const roomId = room._id
    const now1 = getNowStamp()
    const rCol = db.collection("AiRoom")
    const u1: Partial<Table_AiRoom> = {
      updatedStamp: now1,
      needSystem2Stamp: 0,
    }
    await rCol.doc(roomId).update(u1)
  }
  
}

class ToolHandler2 {

  private _room: Table_AiRoom
  private _user: Table_User
  private _tool_calls: OaiToolCall[]
  private _toolShared: ToolShared
  private _chatCompletion?: OaiChatCompletion

  constructor(
    ctx: UserCtx,
    tool_calls: OaiToolCall[],
    chatCompletion?: OaiChatCompletion,
  ) {
    this._room = ctx.room
    this._user = ctx.user
    this._tool_calls = tool_calls
    this._toolShared = new ToolShared(ctx.user, { fromSystem2: true })
    this._chatCompletion = chatCompletion
  }

  private async _addMsgToChat(
    param: Partial<Table_AiChat>,
  ) {
    const apiData = System2Util.getApiData()
    const b1 = getBasicStampWhileAdding()
    const chatCompletion = this._chatCompletion
    const roomId = this._room._id
    const newChat: Partial_Id<Table_AiChat> = {
      ...b1,
      sortStamp: b1.insertedStamp,
      infoType: "tool_use",
      roomId,
      model: apiData.model,
      usage: chatCompletion?.usage,
      requestId: chatCompletion?.id,
      baseUrl: apiData.baseUrl,
      tool_calls: this._tool_calls,
      onlyInSystem2: true,
      fromSystem2: true,
      ...param,
    }
    const chatId = await AiShared.addChat(newChat)
    return chatId
  }

  private _replyToUser(msg: string) {
    const entry = System2Util.mockAiEntry(this._user)
    TellUser.text(entry, msg, { fromSystem2: true })
  }

  private _getErrForAddingMsg() {
    return checker.getErrResult("fail to add chat", "E5001")
  }

  async add_note(funcJson: Record<string, any>): Promise<CommonPass> {
    // 1. check out param
    const res1 = AiToolUtil.turnJsonToWaitingData("add_note", funcJson)
    if(!res1.pass) {
      return res1
    }

    // 2. add msg
    const chatId = await this._addMsgToChat({
      funcName: "add_note",
      funcJson,
    })
    if(!chatId) {
      return this._getErrForAddingMsg()
    }

    // 3. reply
    const toolShared = this._toolShared
    const msg = toolShared.get_msg_for_adding_note(funcJson, chatId)
    console.warn("add_note msg: ", msg)
    this._replyToUser(msg)
    return { pass: true }
  }

  async add_todo(funcJson: Record<string, any>): Promise<CommonPass> {
    // 1. check out param
    const res1 = AiToolUtil.turnJsonToWaitingData("add_todo", funcJson)
    if(!res1.pass) {
      console.warn("fail to parse funcJson in add_todo: ")
      console.log(funcJson)
      return res1
    }

    // 2. add msg
    const chatId = await this._addMsgToChat({
      funcName: "add_note",
      funcJson,
    })
    if(!chatId) {
      return this._getErrForAddingMsg()
    }

    // 3. reply
    const toolShared = this._toolShared
    const msg = toolShared.get_msg_for_adding_todo(chatId, funcJson)
    console.warn("add_todo msg: ", msg)
    this._replyToUser(msg)
    return { pass: true }
  }

  async add_calendar(funcJson: Record<string, any>): Promise<CommonPass> {
    // 1. check out param
    const res1 = AiToolUtil.turnJsonToWaitingData("add_calendar", funcJson)
    if(!res1.pass) {
      return res1
    }

    // 2. add chat
    const chatId = await this._addMsgToChat({
      funcName: "add_calendar",
      funcJson,
    })
    if(!chatId) {
      return this._getErrForAddingMsg()
    }

    // 3. reply
    const toolShared = this._toolShared
    const msg = toolShared.get_msg_for_adding_calendar(chatId, funcJson)
    console.warn("add_calendar msg: ", msg)
    this._replyToUser(msg)
    return { pass: true }
  }

  async web_search(
    funcJson: Record<string, any>,
  ): Promise<DataPass<LiuAi.SearchResult>> {
    // 1. search by ToolShared
    const toolShared = this._toolShared
    const searchPass = await toolShared.web_search(funcJson)
    if(!searchPass.pass) return searchPass
    const searchRes = searchPass.data

    // 2. add to chat
    const data2: Partial<Table_AiChat> = {
      funcName: "web_search",
      funcJson,
      webSearchProvider: searchRes.provider,
      webSearchData: searchRes.originalResult,
      text: searchRes.markdown,
    }
    await this._addMsgToChat(data2)
    return searchPass
  }


  private async _getDrawResult(
    prompt: string, 
    sizeType: AiImageSizeType,
  ) {
    // 1. get param
    let res: LiuAi.PaletteResult | undefined
    
    // 2. translate if needed
    let imagePrompt = prompt
    const num2 = valTool.getChineseCharNum(prompt)
    if(num2 > 6) {
      const translator = new Translator()
      const res2 = await translator.run(prompt)
      if(!res2) {
        console.warn("fail to tranlate!!!")
      }
      else {
        imagePrompt = res2.translatedText
      }
    }

    // 3. run by default
    res = await Palette.run(imagePrompt, sizeType)
    return res
  }

  async draw_picture(
    funcJson: Record<string, any>,
  ): Promise<DataPass<LiuAi.PaletteResult>> {
    // 0. define error result
    const errRes = checker.getErrResult()

    // 1. check out param
    const prompt = funcJson.prompt
    if(!prompt || typeof prompt !== "string") {
      console.warn("draw_picture prompt is not string")
      console.log(funcJson)
      errRes.err.errMsg = "draw_picture prompt is not string"
      return errRes
    }
    let sizeType = funcJson.sizeType as AiImageSizeType
    if(sizeType !== "portrait" && sizeType !== "square") {
      sizeType = "square"
    }

    // 2. add chat
    const data2: Partial<Table_AiChat> = {
      funcName: "draw_picture",
      funcJson,
      text: prompt,
    }
    const chatId = await this._addMsgToChat(data2)
    if(!chatId) return this._getErrForAddingMsg()

    // 3. draw
    const res3 = await this._getDrawResult(prompt, sizeType)
    if(!res3) {
      errRes.err.errMsg = "fail to draw picture"
      return errRes
    }

    // 4. update chat
    const data4: Partial<Table_AiChat> = {
      drawPictureUrl: res3.url,
      drawPictureData: res3.originalResult,
      drawPictureModel: res3.model,
    }
    if(prompt !== res3.prompt) {
      data4.text = res3.prompt
    }
    AiShared.updateAiChat(chatId, data4)
    console.warn("draw picture result: ", res3)

    // 5. reply
    const entry = System2Util.mockAiEntry(this._user)
    await TellUser.image(entry, res3.url, {
      fromSystem2: true,
    })

    return { pass: true, data: res3 }
  }

  async get_schedule(
    funcJson: Record<string, any>,
  ): Promise<DataPass<LiuAi.ReadCardsResult>> {
    // 1. get schedule from ai-shared.ts
    const toolShared = this._toolShared
    const res1 = await toolShared.get_schedule(funcJson)
    if(!res1.pass) return res1
    const { textToBot, textToUser } = res1.data

    // 2. add chat
    const data2: Partial<Table_AiChat> = {
      funcName: "get_schedule",
      funcJson,
      text: textToBot,
    }
    const chatId = await this._addMsgToChat(data2)
    if(!chatId) return this._getErrForAddingMsg()

    return {
      pass: true,
      data: {
        textToBot,
        textToUser,
        assistantChatId: chatId,
      }
    }
  }

  async get_cards(
    funcJson: Record<string, any>,
  ): Promise<DataPass<LiuAi.ReadCardsResult>> {
    // 1. get cards using ToolShared
    const toolShared = this._toolShared
    const res1 = await toolShared.get_cards(funcJson)
    if(!res1.pass) return res1
    const { textToBot, textToUser } = res1.data

    // 2. add msg
    const data2: Partial<LiuAi.HelperAssistantMsgParam> = {
      funcName: "get_cards",
      funcJson,
      text: textToBot,
    }
    const chatId = await this._addMsgToChat(data2)
    if(!chatId) return this._getErrForAddingMsg()

    return {
      pass: true,
      data: {
        textToBot,
        textToUser,
        assistantChatId: chatId,
      }
    }
  }

  async parse_link(
    funcJson: Record<string, any>,
  ): Promise<DataPass<LiuAi.ParseLinkResult>> {
    // 1. get to parse
    const toolShared = this._toolShared
    const res1 = await toolShared.parse_link(funcJson)
    if(!res1.pass) return res1
    const parsingRes = res1.data

    // 2. clip
    let { markdown } = parsingRes
    if(markdown.length > 6666) {
      markdown = markdown.substring(0, 6666) + "......"
    }

    // 3. add chat
    const data3: Partial<Table_AiChat> = {
      funcName: "parse_link",
      funcJson,
      text: markdown,
    }
    const chatId = await this._addMsgToChat(data3)
    if(!chatId) return this._getErrForAddingMsg()

    return res1
  }

  async maps_whatever(
    funcName: string,
    funcJson: Record<string, any>,
  ): Promise<DataPass<LiuAi.MapResult>> {
    // 1. get required params
    const toolShared = this._toolShared

    // 2. get result
    let res: DataPass<LiuAi.MapResult> | undefined
    if(funcName === "maps_regeo") {
      res = await toolShared.maps_regeo(funcJson)
    }
    else if(funcName === "maps_geo") {
      res = await toolShared.maps_geo(funcJson)
    }
    else if(funcName === "maps_text_search") {
      res = await toolShared.maps_text_search(funcJson)
    }
    else if(funcName === "maps_around_search") {
      res = await toolShared.maps_around_search(funcJson)
    }
    else if(funcName === "maps_direction") {
      res = await toolShared.maps_direction(funcJson)
    }

    // 3. handle error
    if(!res) {
      return {
        pass: false,
        err: { code: "E4000", errMsg: "funcName is invalid" }
      }
    }
    if(!res.pass) return res
    const data3 = res.data

    // 4. add chat
    const data4: Partial<Table_AiChat> = {
      funcName,
      funcJson,
      mapProvider: data3.provider,
      mapSearchData: data3.originalResult,
    }
    const chatId = await this._addMsgToChat(data4)
    if(!chatId) return this._getErrForAddingMsg()
    return res
  }


}

class ChatToLog {

  private _user: Table_User
  private _member: Table_Member

  constructor(ctx: UserCtx) {
    this._user = ctx.user
    this._member = ctx.member
  }

  // it may turn a chat into two logs,
  // so we have to return an array
  run(
    chat: Table_AiChat,
  ) {
    // 1. get user and member
    const user = this._user

    // 2. handle <role> and <content>
    let roleStr: LiuAi.Sys2Role | undefined
    let contentStr: string | undefined

    // 3. specifically handle
    if(chat.infoType === "tool_use") {
      const logs3_1 = this._turnForToolUse(chat)
      return logs3_1
    }
    if(chat.fromSystem2) {
      const logs3_2 = this._turnForSystem2(chat)
      return logs3_2
    }
    if(chat.infoType === "assistant") {
      const logs3_3 = this._turnForBot(chat)
      return logs3_3
    }
    if(chat.infoType === "user") {
      const logs3_4 = this._turnForHuman(chat)
      return logs3_4
    }

    if(chat.infoType === "background" && chat.text) {
      roleStr = "system"
      contentStr = `【背景信息】\n${chat.text}`
    }
    else if(chat.infoType === "clear") {
      roleStr = "system"
      contentStr = `【清空上文】`
    }
    else if(chat.infoType === "summary" && chat.text) {
      roleStr = "system"
      contentStr = `【前方对话摘要】\n${chat.text}`
    }

    // 3. handle content
    if(!roleStr || !contentStr) return
    const timeStr = this._getTimeStr(chat.sortStamp)
    const logStr = this.generateLog(roleStr, {
      content: contentStr,
    }, timeStr)
    return [logStr]
  }

  private _getTimeStr(
    stamp: number,
  ) {
    const user = this._user
    const res1 = LiuDateUtil.getDateAndTime(
      stamp,
      user.timezone,
    )
    const timeStr = `${res1.date} ${res1.time}`
    return timeStr
  }

  private _turnForHuman(
    chat: Table_AiChat,
  ) {
    // 0. get member
    const member = this._member

    // 1. get content
    let contentStr = this._getBasicContent(chat)
    if(!contentStr) return

    // 2. construct middle part
    let obj: Record<string, string> = {
      content: contentStr,
    }
    if(member.name) {
      obj.name = member.name
    }

    // 3. construct log
    const timeStr = this._getTimeStr(chat.sortStamp)
    const logStr = this.generateLog("human", obj, timeStr)
    return [logStr]
  }

  private _turnForBot(
    chat: Table_AiChat,
  ) {
    // 1. get content
    let contentStr = this._getBasicContent(chat)
    if(!contentStr) return

    // 2. construct middle part
    let obj: Record<string, string> = {
      content: contentStr,
    }
    if(chat.model) {
      obj.name = chat.model
    }

    // 3. construct log
    const timeStr = this._getTimeStr(chat.sortStamp)
    const logStr = this.generateLog("bot", obj, timeStr)
    return [logStr]
  }

  private _turnForSystem2(
    v: Table_AiChat,
  ) {
    const { reasoning_content, directionOfSystem2 } = v

    let directionStr = directionOfSystem2
    let contentStr: string | undefined

    if(directionOfSystem2 === "1") {
     contentStr = this._getBasicContent(v)
    }
    else if(directionOfSystem2 === "3") {
      if(reasoning_content) {
        contentStr = `思考过程: ${reasoning_content}`
      }
      else {
        contentStr = `再想想`
      }
    }
    else if(directionOfSystem2 === "4") {
      contentStr = all_good_str
    }

    if(!directionStr || !contentStr) return
    
    const timeStr = this._getTimeStr(v.sortStamp)
    const logStr = this.generateLog("you", {
      direction: directionStr,
      content: contentStr,
    }, timeStr)
    return [logStr]
  }

  private generateLog(
    role: LiuAi.Sys2Role,
    obj: Record<string, string>,
    timeStr: string,
  ) {
    let str = "<log>\n"
    str += `  <role>${role}</role>\n`
    const keys = Object.keys(obj)
    for(let i=0; i<keys.length; i++) {
      const k = keys[i]
      str += `  <${k}>${obj[k]}</${k}>\n`
    }
    str += `  <time>${timeStr}</time>\n`
    str += "</log>"
    return str
  }

  private _turnForToolUse(
    v: Table_AiChat,
  ) {
    // 1. get params
    const user = this._user
    const { tool_calls } = v
    if(!tool_calls) return
    const tool_call_id = tool_calls[0]?.id
    if(!tool_call_id) return
    const { t } = useI18n(aiLang, { user })

    // 2. get tool msg
    const toolMsg = AiShared.getToolMessage(tool_call_id, t, v)
    let toolContent = "[Fail to use the tool]"
    if(toolMsg && typeof toolMsg.content === "string") {
      toolContent = toolMsg.content
    }
    const toolTime = this._getTimeStr(v.sortStamp + 1000)
    const toolLog = this.generateLog("tool", {
      content: toolContent,
      tool_call_id,
    }, toolTime)

    // 3. get assistant msg
    const tool_calls_msg = valTool.objToStr(tool_calls)
    if(!tool_calls_msg) return
    const assistantTime = this._getTimeStr(v.sortStamp)
    let assistantLog = ""
    if(v.fromSystem2) {
      assistantLog = this.generateLog("you", {
        direction: "2",
        tool_calls: tool_calls_msg,
      }, assistantTime)
    }
    else {
      assistantLog = this.generateLog("bot", {
        tool_calls: tool_calls_msg,
      }, assistantTime)
    }

    // n.
    return [toolLog, assistantLog]
  }

  private _getBasicContent(
    v: Table_AiChat,
  ) {
    const {
      text, 
      imageUrl,
      msgType,
    } = v

    let str = ""
    if(imageUrl) {
      str = `【图片消息】\n链接: ${imageUrl}`
      if(text) {
        str += `\n识图结果: ${text}`
      }
      return str
    }

    if(msgType === "voice" && text) {
      str = `【语音消息】\n识别结果: ${text}`
      return str
    }

    return text
  }

}

class System2Util {

  static getApiData() {
    const _env = process.env
    const model = _env.LIU_SYSTEM2_MODEL ?? ""
    const baseUrl = _env.LIU_SYSTEM2_BASE_URL ?? ""
    const apiKey = _env.LIU_SYSTEM2_API_KEY ?? ""
    return { model, baseUrl, apiKey }
  }

  static mockAiEntry(user: Table_User) {
    const wx_gzh_openid = user.wx_gzh_openid
    const entry: AiEntry = {
      user,
      msg_type: "text",
      wx_gzh_openid,
    }
    return entry
  }

}


