// Function Name: common-config
// put some configs here
import type { AiCharacter, GenderType } from "@/common-types"

/********************* empty functions ****************/
export async function main(ctx: FunctionContext) {
  console.log("do nothing")
  return true
}

/********************* wechat tag id ****************/

export const wechat_tag_cfg = {
  "zh-Hans": 100,
  "zh-Hant": 101,
  "en": 102,
  "me": 103,
}

/********************* wechat template messages ****************/
export const wx_reminder_tmpl = {
  touser: "",
  template_id: "",
  url: "",
  data: {
    thing18: {
      value: "",
    },
    time4: {
      value: "",
    },
  }
}

export const wx_expired_tmpl = {
  touser: "",
  template_id: "",
  url: "",
  data: {
    thing4: {
      value: "3 小时后过期，你的支持将影响世界",
    },
    const5: {
      value: "会员到期",
    },
  }
}


export const ppl_system_cfg = {
  task_tmpl_id: "4A68CBB88A92B0A9311848DBA1E94A199B166463",
  activity_tmpl_id: "2A84254B945674A2F88CE4970782C402795EB607",
  coming_soom_hrs: 3,
  freemium_task_count: 3,
}


/********************* tencent SES template config ****************/
export const tencent_ses_tmpl_cfg = {
  "confirmation": {
    "zh-Hans": 128068,
    "zh-Hant": 128070,
    "en": 128071,
  }
}

/********************* ai config ****************/
export const ai_cfg = {
  // 当前会话大于等于该值时，才去设置 needSystem2Stamp
  minCoversationsToRecordForSystemTwo: 3,

  // 当前会话大于等于该值时，“系统二”才去处理
  minConversationsToTriggerSystemTwo: 5,

  // 用在混元模型里，当 tool 角色后，只能跟 assistant 或者 tool 或者什么都不接
  i_got_it: "知道了",

  retired_ai: ["baixiaoying", "wanzhi"] as AiCharacter[],
  speaking_characters: ["hailuo", "yuewen", "tongyi-qwen"] as AiCharacter[],
  default_voice: "female" as GenderType,

  max_conversation_count_from_ad: 10,
  conversation_to_ad: 2,

  watch_video_path: "packageA/pages/watch-video/watch-video",

  img2text_prompt: "解释一下图中的现象",

}


/********************* milvus config ****************/
export const milvus_cfg = {
  coupon_keywords_max_capacity: 32,
}

/********************* happy coupon config ****************/
export const happy_coupon_cfg = {
  cache_mins: 10, 

  free_max_coupons: 2,
  premium_max_coupons: 9,
  max_coupons: 30,

}