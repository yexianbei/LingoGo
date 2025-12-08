// Function Name: common-i18n

import { 
  supportedLocales,
  type SupportedLocale,
  type Table_User,
  type Wx_Gzh_Send_Msg,
  type T_I18N,
} from "@/common-types"

export type LangAtom = Record<SupportedLocale, Record<string, string>>
export interface GetLangValOpt {
  locale?: SupportedLocale
  body?: any
  user?: Table_User
  lang?: string
}

/********************* 空函数 ****************/
export async function main(ctx: FunctionContext) {
  console.log("do nothing")
  return true
}

/********************* 各单元 ****************/

export const commonLang: LangAtom = {
  "zh-Hans": {
    "appName": "闪记记事",
    "image": "图片",
    "file": "文件",
    "other": "其它",
    "from_us": "来自闪记记事",
  },
  "zh-Hant": {
    "appName": "閃記記事",
    "image": "圖片",
    "file": "文件",
    "other": "其它",
    "from_us": "來自閃記記事",
  },
  "en": {
    "appName": "FlashNote",
    "image": "Image",
    "file": "File",
    "other": "Other",
    "from_us": "From FlashNote",
  }
}

export const subPlanLang: LangAtom = {
  "zh-Hans": {
    "payment_title": "闪记记事会员",
    "monthly_payment_title": "闪记月度会员",
    "annual_membership": "年度会员 Premium",
    "quarterly_membership": "季度会员 Premium",
    "monthly_membership": "月度会员 Premium",
    "seven_days_refund": "7天无理由退款",
  },
  "zh-Hant": {
    "payment_title": "閃記記事會員",
    "monthly_payment_title": "閃記月度會員",
    "annual_membership": "年度會員 Premium",
    "quarterly_membership": "季度會員 Premium",
    "monthly_membership": "月度會員 Premium",
    "seven_days_refund": "7天無理由退款",
  },
  "en": {
    "payment_title": "FlashNote Membership",
    "monthly_payment_title": "FlashNote Monthly Membership",
    "annual_membership": "Annual Membership (Premium)",
    "quarterly_membership": "Quarterly Membership (Premium)",
    "monthly_membership": "Monthly Membership (Premium)",
    "seven_days_refund": "7 Days Refund",
  }
}

export const dateLang: LangAtom = {
  "zh-Hans": {
    "m_01": "一月",
    "m_02": "二月",
    "m_03": "三月",
    "m_04": "四月",
    "m_05": "五月",
    "m_06": "六月",
    "m_07": "七月",
    "m_08": "八月",
    "m_09": "九月",
    "m_10": "十月",
    "m_11": "11月",
    "m_12": "12月",
    "day_0": "日",
    "day_1": "一",
    "day_2": "二",
    "day_3": "三",
    "day_4": "四",
    "day_5": "五",
    "day_6": "六",
    "show_1": "{mm}/{dd} ({day}) {hr}:{min}",
    "show_2": "{mm}月{dd}日 {hr}:{min}",
    "show_3": "{yyyy}年{mm}月{dd}日 {hr}:{min}"
  },
  "zh-Hant": {
    "m_01": "一月",
    "m_02": "二月",
    "m_03": "三月",
    "m_04": "四月",
    "m_05": "五月",
    "m_06": "六月",
    "m_07": "七月",
    "m_08": "八月",
    "m_09": "九月",
    "m_10": "十月",
    "m_11": "11月",
    "m_12": "12月",
    "day_0": "日",
    "day_1": "一",
    "day_2": "二",
    "day_3": "三",
    "day_4": "四",
    "day_5": "五",
    "day_6": "六",
    "show_1": "{mm}/{dd} ({day}) {hr}:{min}",
    "show_2": "{mm}月{dd}日 {hr}:{min}",
    "show_3": "{yyyy}年{mm}月{dd}日 {hr}:{min}"
  },
  "en": {
    "m_01": "Jan",
    "m_02": "Feb",
    "m_03": "Mar",
    "m_04": "Apr",
    "m_05": "May",
    "m_06": "Jun",
    "m_07": "Jul",
    "m_08": "Aug",
    "m_09": "Sep",
    "m_10": "Oct",
    "m_11": "Nov",
    "m_12": "Dec",
    "day_0": "Su",
    "day_1": "Mo",
    "day_2": "Tu",
    "day_3": "We",
    "day_4": "Th",
    "day_5": "Fr",
    "day_6": "Sa",
    "show_1": "{mm} {dd} ({day}), {hr}:{min}",
    "show_2": "{mm}-{dd} {hr}:{min}",
    "show_3": "{yyyy}-{mm}-{dd} {hr}:{min}"
  }
}

export const userLoginLang: LangAtom = {
  "zh-Hans": {
    "confirmation_subject": "确认信",
    "confirmation_text_1": "你正在登录{appName}，以下是你的验证码:\n\n{code}",
    "confirmation_text_2": "\n\n该验证码 15 分钟内有效。",
    "login_success": "【登录提醒】",
    "login_way": "登录方式: {way}",
    "wechat_scan": "微信扫码",
    "operate_time": "操作时间: {time}",
    "ip_address": "IP 地址: {ip}",
    "device_info": "设备特征: {device}",
    "wechat_client": "微信客户端",
    "wecom_client": "企业微信",
    "dingtalk_client": "钉钉客户端",
    "alipay_client": "支付宝客户端",
    "feishu_client": "飞书客户端",
    "huawei_browser": "华为浏览器",
    "harmony_os": "鸿蒙",
    "android": "安卓",
    "quark_client": "夸克浏览器",
    "uc_client": "UC浏览器",
    "_unknown": "未知",
  },
  "zh-Hant": {
    "confirmation_subject": "確認信",
    "confirmation_text_1": "你正在登入{appName}，以下是你的驗證代號:\n\n{code}",
    "confirmation_text_2": "\n\n該驗證代號 15 分鐘內有效。",
    "login_success": "【登入提醒】",
    "login_way": "登入方式: {way}",
    "wechat_scan": "微信掃描",
    "operate_time": "操作時間: {time}",
    "ip_address": "IP 地址: {ip}",
    "device_info": "裝置特徵: {device}",
    "wechat_client": "微信客戶端",
    "wecom_client": "企業微信",
    "dingtalk_client": "釘釘客戶端",
    "alipay_client": "支付寶客户端",
    "feishu_client": "飛書客户端",
    "huawei_browser": "華為瀏覽器",
    "harmony_os": "Harmony",
    "android": "Android",
    "quark_client": "夸克瀏覽器",
    "uc_client": "UC Browser",
    "_unknown": "未知",
  },
  "en": {
    "confirmation_subject": "Confirmation",
    "confirmation_text_1": "You are logging into {appName}. The following is your Vertification Code:\n\n{code}",
    "confirmation_text_2": "\n\nIt is valid within 15 minutes.",
    "login_success": "【Login Reminder】",
    "login_way": "Login Way: {way}",
    "wechat_scan": "WeChat Scan",
    "operate_time": "Operate Time: {time}",
    "ip_address": "IP Address: {ip}",
    "device_info": "Device Info: {device}",
    "wechat_client": "WeChat",
    "wecom_client": "WeCom",
    "dingtalk_client": "DingTalk",
    "alipay_client": "Alipay",
    "feishu_client": "Feishu",
    "huawei_browser": "Huawei Browser",
    "harmony_os": "Harmony",
    "android": "Android",
    "quark_client": "Quark Browser",
    "uc_client": "UC Browser",
    "_unknown": "Unknown",
  }
}

export const wecomLang: LangAtom = {
  "zh-Hans": {
    "welcome_1": "Hi! 我是闪小记，你已成功绑定账号 {account}\n在你的闪记记事中，若存在需要提醒的卡片，我将在第一时间通知你！",
    "welcome_2": "你好🥂，我是闪小记！你的微信记录助手！我可以把你传给我的消息同步到闪记记事上哦～\n\n请点击下方链接，完成帐号绑定。\n\n{link}",
    "welcome_3": "你好，我是闪小记！你的微信消息捕捉助手！\n\n我注意到你扫描的二维码似乎已过期或失效，请点击下方链接，重新绑定帐号。\n\n{link}",
    "err_1": "绑定失败，该微信号已与其他闪记记事帐号完成关联。请在原闪记记事帐号上解除绑定后，再重新扫码。",
  },
  "zh-Hant": {
    "welcome_1": "Hi! 我是閃小記，你已成功綁定帳號 {account}\n在你的閃記記事中，若存在需要提醒的卡片，我將在第一時間通知你！",
    "welcome_2": "你好🥂，我是閃小記！你的微信記錄助理！我可以把你傳給我的訊息同步到閃記記事上哦～\n\n請點擊下方連結，完成帳號綁定。\n\n{link}",
    "welcome_3": "你好，我是閃小記！你的微信訊息捕捉助理！\n\n我注意到你掃描的 QR Code 似乎已過期或失效，请點擊下方連結，重新綁定帳號。\n\n{link}",
    "err_1": "綁定失敗，該微信號已與其他閃記記事帳號完成綁定。請在原閃記記事帳號上解除綁定後，再重新掃描 QR Code",
  },
  "en": {
    "welcome_1": "Hi! I am Flash Assistant! You have successfully bound your account {account}\nIf you have any card you want to remind, I will notify you in the first time!",
    "welcome_2": "Hi🥂 I am Flash Assistant! Your Wechat Record Assistant! My duty is synchronising your message to your FlashNote.\n\nNow, let's click the following link to bind your account. \n\n{link}",
    "welcome_3": "Hi, I am Flash Assistant! Your Wechat Message Capture Assistant!\n\nI notice that your QR code has expired or is invalid. Please click the following link to rebind your account.\n\n{link}",
    "err_1": "Binding failed. This Wechat number has already been bound to another account. Please unbind it from the original account first, then re-scan the QR code.",
  }
}

// Notes Calendar Task Todo
export const wechatLang: LangAtom = {
  "zh-Hans": {
    "welcome_1": "欢迎关注闪记记事！\n\n闪记记事 = AI 加持的备忘录📝 + 待办清单📂\n\n你可以在这里记录所有事情，所有「只属于你」的信息都将在这里汇聚。\n\n ",
    "login_guide": "若你想要使用 AI，欢迎使用<a href='{LIU_DOMAIN}/wechat-bind'>微信一键登录</a>\n\n登录后，你可以尝试发送：\n\n[提醒我下午五点去公园画画]\n\n这样在五点的时候，你就能收到一个通知啦。",
    "already_bound": "当前微信已绑定帐号 {account}\n请先在原帐号上解绑后，再重新扫码。",
    "success_1": "绑定成功🎉\n\n小诀窍：<a href='https://mp.weixin.qq.com/s/nhNNdas1rJAGYyHMXLyQLQ'>如何避免漏接提醒</a>",
    "login_first": "尚未登录！\n欢迎使用<a href='{LIU_DOMAIN}/wechat-bind'>微信一键登录</a>",
    "video_unsupported": "[暂不支持发送视频消息]",
    "link_unsupported": "🚧 暂不支持链接消息",
    "buy_time": "\n如果你急着需要，可以<a href='{LIU_CUSTOMER_SERVICE}'>与开发者联系</a>。买断他的时间，让他为你开发。",
    "invitation_link": "您已成为闪记记事 Premium 会员🎉\n邀请您加入<a href='{link}'>会员限定群聊</a>",
    "go_back_to_app": "登录中，请返回 APP 内查看......",
    "membership_1": "点击下方链接👇 成为\n<a href='{LIU_DOMAIN}/subscription'>闪记记事 Premium 会员</a>",
    "membership_2": "你已是最可爱的 Premium 会员 🫶\n\n⏱️ 会员有效期至 {endDate}\n\n👉 <a href='{groupLink}'>戳我加入会员限定群聊</a>\n\n📊 回复“额度”查看使用情况",
    "find_coupon": "找优惠？👇\n<a href='{LIU_DOMAIN}' data-miniprogram-appid='{appid}' data-miniprogram-path='{path}'>翻抽屉呀！</a>"
  },
  "zh-Hant": {
    "welcome_1": "歡迎追蹤閃記記事！\n\n閃記記事 = AI 加持的備忘錄📝 + 待辦清單📂\n\n你可以在這裡記錄所有事情，所有「只屬於你」的資訊都將在這裡匯聚。",
    "login_guide": "若你想要使用 AI，歡迎使用<a href='{LIU_DOMAIN}/wechat-bind'>微信一鍵登入</a>\n\n登入後，你可以尝试發送：\n\n[提醒我下午五點去公園畫畫]\n\n這樣在五點的時候，你就能收到一個通知啦。",
    "already_bound": "當前微信已綁定帳號 {account}\n請先在原帳號上解綁後，再重新掃描 QR Code",
    "success_1": "綁定成功🎉\n\n小訣竅：<a href='https://mp.weixin.qq.com/s/nhNNdas1rJAGYyHMXLyQLQ'>如何避免漏接提醒</a>",
    "login_first": "尚未登入! \n歡迎使用<a href='{LIU_DOMAIN}/wechat-bind'>微信一鍵登入</a>",
    "video_unsupported": "[暫不支援影片訊息]",
    "link_unsupported": "🚧 暫不支援連結訊息",
    "buy_time": "\n如果你急著需要，可以<a href='{LIU_CUSTOMER_SERVICE}'>與開發者聯絡</a>。買斷他的時間，讓他為你開發。",
    "invitation_link": "您已成為閃記記事 Premium 會員🎉\n邀請您加入<a href='{link}'>會員限定群組</a>",
    "go_back_to_app": "登入中，請返回 APP 內檢視......",
    "membership_1": "輕觸下方連結👇 成為\n<a href='{LIU_DOMAIN}/subscription'>閃記記事 Premium 會員</a>",
    "membership_2": "你已是最可愛的 Premium 會員 🫶\n\n⏱️ 會員有效期至 {endDate}\n\n👉 <a href='{groupLink}'>輕觸加入會員限定群組</a>\n\n📊 回覆「額度」查看使用情況",
    "find_coupon": "找優惠？👇\n<a href='{LIU_DOMAIN}' data-miniprogram-appid='{appid}' data-miniprogram-path='{path}'>快來翻抽屜！</a>"
  },
  "en": {
    "welcome_1": "Welcome to follow FlashNote!\n\nFlashNote = Notes📝 + Todo📂 with AI\n\nYou can record all your life's events, and all information you want is out here.",
    "login_guide": "If you want to use AI, welcome to <a href='{LIU_DOMAIN}/wechat-bind'>Continue with WeChat</a>\n\nAfter logging in, you can send:\n\n[Remind me to go to the park to paint at 5 PM]\n\nThis way, you'll receive a notification at 5 o'clock.",
    "already_bound": "Current Wechat has already bound account {account}\nPlease unbind it from the original account first, then re-scan the QR code.",
    "success_1": "Binding successful🎉\n\nTip: <a href='https://mp.weixin.qq.com/s/nhNNdas1rJAGYyHMXLyQLQ'>How to avoid missing reminders</a>",
    "login_first": "Not logged in yet!\nWelcome to <a href='{LIU_DOMAIN}/wechat-bind'>Login via WeChat</a>",
    "video_unsupported": "[Videos are not supported to send]",
    "link_unsupported": "🚧 Link message is still in development",
    "buy_time": "\nIf you want to use it urgently, you can <a href='{LIU_CUSTOMER_SERVICE}'>contact the developer</a>. Buy his time and let him develop for you.",
    "invitation_link": "You have become a member of FlashNote Premium🎉\nWelcome to join our <a href='{link}'>VIP exclusive group!</a>",
    "go_back_to_app": "Logging in......\nPlease go back to our app to view",
    "membership_1": "Tap the link👇\n<a href='{LIU_DOMAIN}/subscription'>FlashNote Premium Membership</a>\nto have premium 🎁",
    "membership_2": "You are the most adorable Premium member 🫶\n\n⏱️ Membership will expire at {endDate}\n\n👉 <a href='{groupLink}'>Join VIP exclusive group</a>\n\n📊 Reply 'quota' to view usage",
    "find_coupon": "Get Coupons?👇\n<a href='{LIU_DOMAIN}' data-miniprogram-appid='{appid}' data-miniprogram-path='{path}'>All in the Drawer!</a>"
  }
}


export const aiLang: LangAtom = {
  "zh-Hans": {
    "privacy_title": "🔓 隐私提示:",
    "working_log_title": "📜 工作日志:",
    "operation_title": "🕹️ 操作栏:",
    "generative_ai_warning": "⚠️ 内容由 AI 生成，请仔细甄别。",
    "kick": "踢掉",
    "add": "召唤",
    "clear_context": "清空上文",
    "quota_warning_2": "您已使用 {membershipTimes} 轮会员版对话额度。续费会员，可将“已使用额度”归零！\n<a href='{link}'>立即续费</a>",
    "quota_warning_4": "免费额度已用尽。\n现在你可以：\n\n1. <a href='{link1}'>购买会员 🎁</a>\n畅享一个月 {membershipTimes} 轮对话，同时解锁闪记记事所有权益。\n\n2. <a href='{LIU_DOMAIN}' data-miniprogram-appid='{appid}' data-miniprogram-path='{path}'>观看视频 📺</a>\n兑换对话额度。",
    "quota_warning_4_mock": "免费额度已用尽。\n现在你可以：\n\n1. <a href='{link1}'>购买会员 🎁</a>\n畅享一个月 {membershipTimes} 轮对话，同时解锁闪记记事所有权益。\n\n2. <a href='{LIU_DOMAIN}'>观看视频 📺</a>\n兑换对话额度。",
    "cannot_read_images": "我目前没有识图的能力",
    "history_cleared": "已清空前面的历史记录",
    "add_note_only_desc": "{botName}请求添加笔记:\n{desc}\n\n<a href='{agreeLink}'>🆗 同意</a>    <a href='{editLink}'>✏️ 编辑</a>",
    "add_note_with_title": "{botName}请求添加笔记\n\n标题：{title}\n详情：{desc}\n\n<a href='{agreeLink}'>🆗 同意</a>    <a href='{editLink}'>✏️ 编辑</a>",
    "add_todo": "{botName}请求添加待办:\n{title}\n\n<a href='{agreeLink}'>🆗 同意</a>    <a href='{editLink}'>✏️ 编辑</a>",
    "add_calendar_1": "{botName}请求添加日程\n\n",
    "add_calendar_2": "标题: {title}\n",
    "add_calendar_3": "内容: {desc}\n",
    "add_calendar_4": "日期: {date}\n",
    "add_calendar_5": "时间: {time}\n",
    "add_calendar_6": "提醒: {str}\n",
    "add_calendar_7": "\n<a href='{agreeLink}'>🆗 同意</a>    <a href='{editLink}'>✏️ 编辑</a>",
    "early_min": "提早 {min} 分钟",
    "early_hr": "提早 {hr} 小时",
    "early_day": "提早 {day} 天",
    "later_min": "{min} 分钟后",
    "later_hr": "{hr} 小时后",
    "later_day": "{day} 天后",
    "not_agree_yet": "【客户尚未同意你的请求】",
    "too_many_words": "这么多字！它们思考不来💭\n（单条文本最多 3000 字符）",
    "no_more_to_continue": "没有更多可以继续了",
    "bot_call_tools": "调用工具: {funcName}\n参数: {funcArgs}",
    "draw_result": "作图结果: {imageUrl}",
    "bot_left": "{botName}已离开聊天室",
    "bot_draw": "{botName}使用画笔 {model} 画了一张图片",
    "status_1": "【群聊成员】",
    "status_2": "【使用额度】",
    "status_conversation": "AI会话: {usedTimes}/{maxTimes}",
    "status_cluster": "AI分类: {usedTimes}/{maxTimes}",
    "conversation_ad": "看视频兑换的剩余次数: {restTimes}",
    "buy_premium": "<a href='{LIU_DOMAIN}/subscription'>购买会员</a>，即刻解锁 Premium 所有权益🥂",
    "renew_premium": "如果需要，你可以在 <a href='{LIU_DOMAIN}/subscription'>会员中心</a> 续费会员🥂",
    "no_member": "没有其他助手",
    "already_exist": "{botName}已在群聊中",
    "already_left": "{botName}并不在群聊内",
    "continue_bot": "继续{botName}",
    "nobody_here": "当前群聊内没有任何助手",
    "do_not_use_tool": "【请根据工具调用结果，直接给出回复，勿再使用工具】",
    "bot_not_available": "💡 尚不支持{botName}\n你可以查看 <a href='{LIU_DOCS_DOMAIN}/guide/three-assistants'>AI 说明书</a>，了解目前支持的大模型。",

    // the first message when a bot has been called
    "called_1": "我是{botName}，想跟我聊什么呢？",
    "called_2": "我是{botName}，很高兴为你服务！",
    "called_3": "Hi, 我是{botName}，有什么需要帮忙的？",
    "called_4": "我是{botName}，是你找我嘛？",

    // corresponding to aiToolAddCalendarSpecificDates
    "today": "今天",
    "tomorrow": "明天",
    "day_after_tomorrow": "后天",
    "monday": "周一",
    "tuesday": "周二",
    "wednesday": "周三",
    "thursday": "周四",
    "friday": "周五",
    "saturday": "周六",
    "sunday": "周日",

    // get schedule
    "yesterday_schedule": "昨天的日程:\n\n",
    "today_schedule": "今天的日程:\n\n",
    "tomorrow_schedule": "明天的日程:\n\n",
    "day2_schedule": "后天的日程:\n\n",
    "schedule_last": "过去 {hour} 小时的日程:\n\n",
    "schedule_next": "未来 {hour} 小时内的日程:\n\n",
    "schedule_this_week": "这{day}的日程:\n\n",
    "schedule_next_week": "下{day}的日程:\n\n",
    "schedule_future": "未来 10 条日程:\n\n",
    "no_data": "查无结果",
    "bot_read_yesterday": "{bot}查看了昨天的日程",
    "bot_read_today": "{bot}查看了今天的日程",
    "bot_read_tomorrow": "{bot}查看了明天的日程",
    "bot_read_day2": "{bot}查看了后天的日程",
    "bot_read_last": "{bot}查看了过去 {hour} 小时的日程",
    "bot_read_next": "{bot}查看了未来 {hour} 小时内的日程",
    "bot_read_this_week": "{bot}查看了这{day}的日程",
    "bot_read_next_week": "{bot}查看了下{day}的日程",
    "bot_read_future": "{bot}查看了未来 10 条日程",

    // get cards
    "todo_cards": "最近的待办:\n\n",
    "note_cards": "最近的笔记:\n\n",
    "finished_cards": "最近完成的事项:\n\n",
    "event_cards": "最近添加的事件:\n\n",
    "bot_read_todo": "{bot}查看了最近的待办",
    "bot_read_note": "{bot}查看了最近的笔记",
    "bot_read_finished": "{bot}查看了最近完成的事项",
    "bot_read_event": "{bot}查看了最近添加的事件",
    "view_thinking": "查看思考过程",
    "result_of_tool": "工具调用结果:\n{msg}",
    "thinking": "【思考中...💭】\n{text}",

    // failures
    "fail_to_search": "网络搜索失败",
    "fail_to_parse_link": "链接解析失败",

    // system 2
    "system2_r1": "系统二（R1）",

    // maps
    "see_map": "{bot}看了一眼地图",
    "parse_latlng": "{bot}解析了经纬度",
    "search_address": "{bot}搜索了地址",
    "search_around": "{bot}搜索了周边",
    "route_plan": "{bot}规划了路线",
    "location_msg": "【位置消息】",
    "address_info": "地址: {address}",
    "open_via_amap": "用高德地图打开",
    "open_via_baidu": "用百度地图打开",

    // ai console
    "hello_ai_voice": "你已触发<a href='https://mp.weixin.qq.com/s/jvnMK9-xjnGB6VC0efqX9w'>语音回复</a>！\n你可以在 <a href='{LIU_DOMAIN}/ai-console'>AI 控制台</a> 管理助手们的声音。",
  },
  "zh-Hant": {
    "privacy_title": "🔓 隱私提示:",
    "working_log_title": "📜 工作日誌:",
    "operation_title": "🕹️ 操作欄:",
    "generative_ai_warning": "⚠️ 內容由 AI 生成，請仔細甄別。",
    "kick": "踢掉",
    "add": "召喚",
    "clear_context": "清除上文",
    "quota_warning_2": "您已使用 {membershipTimes} 輪會員版對話額度。續費會員，可將「已使用額度」歸零！\n<a href='{link}'>立即續費</a>",
    "quota_warning_4": "免費額度已用盡。\n現在你可以：\n\n1. <a href='{link1}'>購買會員 🎁</a>\n暢享一個月 {membershipTimes} 輪對話，同時解鎖閃記記事所有權益。\n\n2. <a href='{LIU_DOMAIN}' data-miniprogram-appid='{appid}' data-miniprogram-path='{path}'>觀看影片 📺</a>\n兌換對話額度。",
    "quota_warning_4_mock": "免費額度已用盡。\n現在你可以：\n\n1. <a href='{link1}'>購買會員 🎁</a>\n暢享一個月 {membershipTimes} 輪對話，同時解鎖閃記記事所有權益。\n\n2. <a href='{LIU_DOMAIN}'>觀看影片 📺</a>\n兌換對話額度。",
    "cannot_read_images": "我目前沒有讀取圖片的能力",
    "history_cleared": "已清空前面的歷史記錄",
    "add_note_only_desc": "{botName}請求新增筆記:\n{desc}\n\n<a href='{agreeLink}'>🆗 同意</a>    <a href='{editLink}'>✏️ 編輯</a>",
    "add_note_with_title": "{botName}請求新增筆記\n\n標題：{title}\n詳情：{desc}\n\n<a href='{agreeLink}'>🆗 同意</a>    <a href='{editLink}'>✏️ 編輯</a>",
    "add_todo": "{botName}請求新增待辦:\n{title}\n\n<a href='{agreeLink}'>🆗 同意</a>    <a href='{editLink}'>✏️ 編輯</a>",
    "add_calendar_1": "{botName}請求新增日程\n\n",
    "add_calendar_2": "標題: {title}\n",
    "add_calendar_3": "內文: {desc}\n",
    "add_calendar_4": "日期: {date}\n",
    "add_calendar_5": "時間: {time}\n",
    "add_calendar_6": "提醒: {str}\n",
    "add_calendar_7": "\n<a href='{agreeLink}'>🆗 同意</a>    <a href='{editLink}'>✏️ 編輯</a>",
    "early_min": "提早 {min} 分鐘",
    "early_hr": "提早 {hr} 小時",
    "early_day": "提早 {day} 天",
    "later_min": "{min} 分鐘後",
    "later_hr": "{hr} 小時後",
    "later_day": "{day} 天後",
    "not_agree_yet": "【客户尚未同意你的請求】",
    "too_many_words": "這麼多字！它們思考不來💭\n（單則文本最多 3000 字元）",
    "no_more_to_continue": "沒有更多可以繼續了",
    "bot_call_tools": "調用工具: {funcName}\n參數: {funcArgs}",
    "draw_result": "畫圖結果: {imageUrl}",
    "bot_left": "{botName}已離開聊天室",
    "bot_draw": "{botName}使用畫筆 {model} 畫了一張圖片",
    "status_1": "【群聊成員】",
    "status_2": "【使用額度】",
    "status_conversation": "AI會話: {usedTimes}/{maxTimes}",
    "status_cluster": "AI分類: {usedTimes}/{maxTimes}",
    "conversation_ad": "看影片兌換的可聊天次數: {restTimes}",
    "buy_premium": "<a href='{LIU_DOMAIN}/subscription'>購買會員</a>，即刻解鎖 Premium 所有權益🥂",
    "renew_premium": "如果需要，你可以在 <a href='{LIU_DOMAIN}/subscription'>會員中心</a> 續費會員🥂",
    "no_member": "沒有其他助手",
    "already_exist": "{botName}已在群聊中",
    "already_left": "{botName}並不在群聊內",
    "continue_bot": "繼續{botName}",
    "nobody_here": "當前群組內沒有任何助手",
    "do_not_use_tool": "【請根據以上工具調用結果，直接給出回覆，勿再使用工具】",
    "bot_not_available": "💡 尚未支援{botName}\n你可以檢視<a href='{LIU_DOCS_DOMAIN}/guide/three-assistants'>AI 說明書</a>，了解目前支援的大模型。",

    // the first message when a bot has been called
    "called_1": "我是{botName}，想跟我聊什麼呢?",
    "called_2": "我是{botName}，很高興為你服務！",
    "called_3": "Hi, 我是{botName}，有什麼需要幫忙的？",
    "called_4": "我是{botName}，是你找我嗎～",

    // corresponding to aiToolAddCalendarSpecificDates
    "today": "今天",
    "tomorrow": "明天",
    "day_after_tomorrow": "後天",
    "monday": "星期一",
    "tuesday": "星期二",
    "wednesday": "星期三",
    "thursday": "星期四",
    "friday": "星期五",
    "saturday": "星期六",
    "sunday": "星期日",

    // get schedule
    "yesterday_schedule": "昨天的日程:\n\n",
    "today_schedule": "今天的日程:\n\n",
    "tomorrow_schedule": "明天的日程:\n\n",
    "day2_schedule": "后天的日程:\n\n",
    "schedule_last": "過去 {hour} 小時的日程:\n\n",
    "schedule_next": "未來 {hour} 小時内的日程:\n\n",
    "schedule_this_week": "這{day}的日程:\n\n",
    "schedule_next_week": "下{day}的日程:\n\n",
    "schedule_future": "未來 10 則日程:\n\n",
    "no_data": "查無結果",
    "bot_read_yesterday": "{bot}查閲了昨天的日程",
    "bot_read_today": "{bot}查閲了今天的日程",
    "bot_read_tomorrow": "{bot}查閱了明天的日程",
    "bot_read_day2": "{bot}查閱了后天的日程",
    "bot_read_last": "{bot}查閱了過去 {hour} 小時的日程",
    "bot_read_next": "{bot}查閱了未來 {hour} 小時内的日程",
    "bot_read_this_week": "{bot}查閱了這{day}的日程",
    "bot_read_next_week": "{bot}查閱了下{day}的日程",
    "bot_read_future": "{bot}查閱了未來 10 則日程",

    // get cards
    "todo_cards": "最近的待辦:\n\n",
    "note_cards": "最近的筆記:\n\n",
    "finished_cards": "最近完成的事項:\n\n",
    "event_cards": "最近新增的事件:\n\n",
    "bot_read_todo": "{bot}檢視了最近的待辦",
    "bot_read_note": "{bot}檢視了最近的筆記",
    "bot_read_finished": "{bot}檢視了最近完成的事項",
    "bot_read_event": "{bot}檢視了最近新增的事件",
    "view_thinking": "檢視思考過程",
    "result_of_tool": "工具調用結果:\n{msg}",
    "thinking": "［思考中...💭］\n{text}",

    // failures
    "fail_to_search": "網路搜尋失敗",
    "fail_to_parse_link": "連結解析失敗",

    // system 2
    "system2_r1": "系統二 (R1) ",

    // maps
    "see_map": "{bot}看了一眼地圖",
    "parse_latlng": "{bot}解析了經緯度",
    "search_address": "{bot}搜尋了地址",
    "search_around": "{bot}搜尋了周邊",
    "route_plan": "{bot}規劃了路線",
    "location_msg": "【位置訊息】",
    "address_info": "地址: {address}",
    "open_via_amap": "用高德地圖開啟",
    "open_via_baidu": "用百度地圖開啟",

    // ai console
    "hello_ai_voice": "你已觸發<a href='https://mp.weixin.qq.com/s/jvnMK9-xjnGB6VC0efqX9w'>語音回覆</a>！\n你可以在 <a href='{LIU_DOMAIN}/ai-console'>AI 控制台</a> 管理助手們的聲音。",
  },
  "en": {
    "privacy_title": "🔓 Privacy:",
    "working_log_title": "📜 Working Logs:",
    "operation_title": "🕹️ Operations:",
    "generative_ai_warning": "⚠️ AI might make mistakes. Please double-check it.",
    "kick": "Remove ",
    "add": "Add ",
    "clear_context": "Clear context",
    "quota_warning_2": "You have used {membershipTimes} conversations of membership. Renew membership to reset the used quota!\n<a href='{link}'>Renew now</a>",
    "quota_warning_4": "Free quota has been used up.\nNow you can: \n\n1. <a href='{link1}'>Purchase membership 🎁</a>\nEnjoy {membershipTimes} conversations per month, and unlock all FlashNote rights.\n\n2. <a href='{LIU_DOMAIN}' data-miniprogram-appid='{appid}' data-miniprogram-path='{path}'>Watch video 📺</a>\nExchange conversation quota.",
    "quota_warning_4_mock": "Free quota has been used up.\nNow you can: \n\n1. <a href='{link1}'>Purchase membership 🎁</a>\nEnjoy {membershipTimes} conversations per month, and unlock all FlashNote rights.\n\n2. <a href='{LIU_DOMAIN}'>Watch video 📺</a>\nExchange conversation quota.",
    "cannot_read_images": "I don't have the ability to read images yet",
    "history_cleared": "History cleared",
    "add_note_only_desc": "{botName} requests to add a note:\n{desc}\n\n<a href='{agreeLink}'>🆗 Agree</a>    <a href='{editLink}'>✏️ Edit</a>",
    "add_note_with_title": "{botName} requests to add a note\n\nTitle: {title}\nDescription: {desc}\n\n<a href='{agreeLink}'>🆗 Agree</a>    <a href='{editLink}'>✏️ Edit</a>",
    "add_todo": "{botName} requests to add a todo:\n{title}\n\n<a href='{agreeLink}'>🆗 Agree</a>    <a href='{editLink}'>✏️ Edit</a>",
    "add_calendar_1": "{botName} requests to add a calendar\n\n",
    "add_calendar_2": "Title: {title}\n",
    "add_calendar_3": "Description: {desc}\n",
    "add_calendar_4": "Date: {date}\n",
    "add_calendar_5": "Time: {time}\n",
    "add_calendar_6": "Reminder: {str}\n",
    "add_calendar_7": "\n<a href='{agreeLink}'>🆗 Agree</a>    <a href='{editLink}'>✏️ Edit</a>",
    "early_min": "{min} mins early",
    "early_hr": "{hr} hr(s) early",
    "early_day": "{day} day(s) early",
    "later_min": "{min} min(s) later",
    "later_hr": "{hr} hr(s) later",
    "later_day": "{day} day(s) later",
    "not_agree_yet": "Customer has not yet agreed to your request",
    "too_many_words": "Too many words to think💭\n(Text supports up to 3000 characters.)",
    "no_more_to_continue": "No more to continue",
    "bot_call_tools": "Call a tool: {funcName}\nArguments: {funcArgs}",
    "draw_result": "The drawing result: {imageUrl}",
    "bot_left": "{botName} has already left",
    "bot_draw": "{botName} uses a brush called {model} to draw a picture",
    "status_1": "[Group Members]",
    "status_2": "[Quota]",
    "status_conversation": "AI Conversation: {usedTimes}/{maxTimes}",
    "status_cluster": "AI Cluster: {usedTimes}/{maxTimes}",
    "conversation_ad": "Video exchange quota: {restTimes}",
    "buy_premium": "<a href='{LIU_DOMAIN}/subscription'>Get Premium</a> to enjoy our top tier service 🥂",
    "renew_premium": "You can renew premium in our <a href='{LIU_DOMAIN}/subscription'>membership center</a> if you want 🥂",
    "no_member": "No assistants here",
    "already_exist": "{botName} has already joined in the group chat",
    "already_left": "{botName} is not in the group chat",
    "continue_bot": "Continue {botName}",
    "nobody_here": "There is no assistant here.",
    "do_not_use_tool": "[Reply me directly with the above results please, and do not use any tools again]",
    "bot_not_available": "💡 {botName} is not available\nYou can view <a href='{LIU_DOCS_DOMAIN}/guide/three-assistants'>AI instruction</a> to learn more about the available LLMs.",

    // the first message when a bot has been called
    "called_1": "I am {botName}. Let's chat together!",
    "called_2": "I'm {botName}. Nice to meet you!",
    "called_3": "Hi, my name is {botName}. How can I give you a hand?",
    "called_4": "I'm {botName}. Are you calling me?",

    // corresponding to aiToolAddCalendarSpecificDates
    "today": "Today",
    "tomorrow": "Tomorrow",
    "day_after_tomorrow": "Day after tomorrow",
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
    "sunday": "Sunday",

    // get schedule
    "yesterday_schedule": "Schedule for yesterday:\n\n",
    "today_schedule": "Schedule for today:\n\n",
    "tomorrow_schedule": "Schedule for tomorrow:\n\n",
    "day2_schedule": "Schedule for the day after tomorrow:\n\n",
    "schedule_last": "Schedule for the last {hour} hours:\n\n",
    "schedule_next": "Schedule for the next {hour} hours:\n\n",
    "schedule_this_week": "Schedule for this {day}:\n\n",
    "schedule_next_week": "Schedule for next {day}:\n\n",
    "schedule_future": "Schedule in the future:\n\n",
    "no_data": "No results found",
    "bot_read_yesterday": "{bot} read yesterday's schedule",
    "bot_read_today": "{bot} read today's schedule",
    "bot_read_tomorrow": "{bot} read tomorrow's schedule",
    "bot_read_day2": "{bot} read the schedule for the day after tomorrow",
    "bot_read_last": "{bot} read the schedule for the last {hour} hours",
    "bot_read_next": "{bot} read the schedule for the next {hour} hours",
    "bot_read_this_week": "{bot} read the schedule for this {day}",
    "bot_read_next_week": "{bot} read the schedule for next {day}",
    "bot_read_future": "{bot} read the recent schedule",

    // get cards
    "todo_cards": "Latest to-dos:\n\n",
    "note_cards": "Latest notes:\n\n",
    "finished_cards": "Latest finished tasks:\n\n",
    "event_cards": "Latest added events:\n\n",
    "bot_read_todo": "{bot} read latest to-dos",
    "bot_read_note": "{bot} read latest notes",
    "bot_read_finished": "{bot} read latest finished tasks",
    "bot_read_event": "{bot} read latest added events",
    "view_thinking": "Dive into Thinking",
    "result_of_tool": "Tool call result:\n{msg}",
    "thinking": "[Thinking..💭]\n{text}",

    // failures
    "fail_to_search": "Fail to search",
    "fail_to_parse_link": "Fail to parse link",

    // system 2
    "system2_r1": "System 2 (R1)",

    // maps
    "see_map": "{bot} looked at the map",
    "parse_latlng": "{bot} parsed the latitude and longitude",
    "search_address": "{bot} searched the address",
    "search_around": "{bot} searched the area",
    "route_plan": "{bot} planned the route",
    "location_msg": "[Location Message]",
    "address_info": "Address: {address}",
    "open_via_amap": "Open via Amap",
    "open_via_baidu": "Open via Baidu",

    // ai console
    "hello_ai_voice": "You've triggered <a href='https://mp.weixin.qq.com/s/jvnMK9-xjnGB6VC0efqX9w'>voice reply</a>!\nYou can manage assistants' voice at <a href='{LIU_DOMAIN}/ai-console'>AI Console</a>.",
  }
}


/********************* Wx Click Replies ****************/
export const wxClickReplies: Record<string, Wx_Gzh_Send_Msg[]> = {
  // zh-Hans
  "guidebook": [
    {
      msgtype: "text",
      text: {
        content: `【使用指南🪧】

🤖 <a href='{LIU_DOCS_DOMAIN}/guide/three-assistants'>AI 使用说明书</a>

🎮 <a href='{LIU_DOMAIN}/ai-console'>AI 控制台</a>

📦 <a href="{LIU_DOCS_DOMAIN}/guide/faq/">提问箱</a>

🌐 <a href="{LIU_DOCS_DOMAIN}/article/2024/supercharge-yourself">笔记如何使用</a>

🧘 <a href="{LIU_DOMAIN}/mine">我的</a>
`,
      }
    }
  ],
  "wechat-bind-app": [
    {
      msgtype: "text",
      text: {
        content: '<a href="{LIU_DOMAIN}/connect/wechat">戳我绑定微信</a>',
      }
    }
  ],
  "customer-service": [
    {
      msgtype: "text",
      text: {
        content: '<a href="{LIU_CUSTOMER_SERVICE}">戳我联系客服📞</a>',
      }
    }
  ],
  "cooperation": [
    {
      msgtype: "text",
      text: {
        content: '📨 期待你的来信！\n\n<a href="mailto:252837151@qq.com">252837151@qq.com</a>',
      }
    },
    {
      msgtype: "image",
      image: {
        media_id: "{LIU_WX_GZ_MEDIA_ID_FOR_CONTACT}"
      }
    }
  ],

  // zh-Hant
  "guidebook=zh-Hant": [
    {
      msgtype: "text",
      text: {
        content: `【指路牌🪧】

🤖 <a href='{LIU_DOCS_DOMAIN}/guide/three-assistants'>AI 使用說明書</a>

🎮 <a href='{LIU_DOMAIN}/ai-console'>AI 控制中心</a>

📦 <a href="{LIU_DOCS_DOMAIN}/guide/faq/">提問箱</a>

🧘 <a href="{LIU_DOMAIN}/mine">我的</a>
`,
      }
    }
  ],
  "wechat-bind-app=zh-Hant": [
    {
      msgtype: "text",
      text: {
        content: '<a href="{LIU_DOMAIN}/connect/wechat">輕觸我綁定微信</a>',
      }
    }
  ],
  "customer-service=zh-Hant": [
    {
      msgtype: "text",
      text: {
        content: '<a href="{LIU_CUSTOMER_SERVICE}">點我聯繫客服📞</a>',
      }
    }
  ],
  "cooperation=zh-Hant": [
    {
      msgtype: "text",
      text: {
        content: '📨 期待你的來信！\n\n<a href="mailto:252837151@qq.com">252837151@qq.com</a>',
      }
    },
    {
      msgtype: "image",
      image: {
        media_id: "{LIU_WX_GZ_MEDIA_ID_FOR_CONTACT}"
      }
    }
  ],

  // en
  "guidebook=en": [
    {
      msgtype: "text",
      text: {
        content: `[Guidebook 🪧]

🤖 <a href='{LIU_DOCS_DOMAIN}/guide/three-assistants'>AI Instructions</a>

🎮 <a href='{LIU_DOMAIN}/ai-console'>AI Console</a>

📦 <a href="{LIU_DOCS_DOMAIN}/guide/faq/">AMA</a>

🧘 <a href="{LIU_DOMAIN}/mine">Mine</a>
`,
      }
    }
  ],
  "wechat-bind-app=en": [
    {
      msgtype: "text",
      text: {
        content: '<a href="{LIU_DOMAIN}/connect/wechat">Click me to bind WeChat</a>',
      }
    }
  ],
  "customer-service=en": [
    {
      msgtype: "text",
      text: {
        content: '<a href="{LIU_CUSTOMER_SERVICE}">Click me to contact customer service📞</a>',
      }
    }
  ],
  "cooperation=en": [
    {
      msgtype: "text",
      text: {
        content: '📨 I am looking forward to your letter!\n\n<a href="mailto:252837151@qq.com">252837151@qq.com</a>',
      }
    },
    {
      msgtype: "image",
      image: {
        media_id: "{LIU_WX_GZ_MEDIA_ID_FOR_CONTACT}"
      }
    }
  ]
}

/********************* Wx Text Auto Replies ****************/
interface WxTextReplyItem {
  keywords: string[]
  replies: Wx_Gzh_Send_Msg[]
}

export const wxTextRepliesItems: WxTextReplyItem[] = [
  {
    keywords: ["人工", "客服", "人工客服", "联系客服", "联系", "联系开发者"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: '<a href="{LIU_CUSTOMER_SERVICE}">戳我联系客服🧑‍💻</a>',
        }
      }
    ]
  },
  {
    keywords: ["聯繫", "聯繫客服", "聯繫開發者"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: '<a href="{LIU_CUSTOMER_SERVICE}">點我聯繫客服🧑‍💻</a>',
        }
      }
    ]
  },
  {
    keywords: ["Customer Service", "Contact", "Contact Customer Service", "Contact Developer"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: '<a href="{LIU_CUSTOMER_SERVICE}">Here you are 🧑‍💻</a>',
        }
      }
    ]
  },
  {
    keywords: ["商务合作"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: '📨 期待你的来信！\n\n<a href="mailto:252837151@qq.com">252837151@qq.com</a>',
        }
      },
      {
        msgtype: "image",
        image: {
          media_id: "{LIU_WX_GZ_MEDIA_ID_FOR_CONTACT}"
        }
      }
    ]
  },
  {
    keywords: ["商務合作"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: '📨 期待你的來信！\n\n<a href="mailto:252837151@qq.com">252837151@qq.com</a>',
        }
      },
      {
        msgtype: "image",
        image: {
          media_id: "{LIU_WX_GZ_MEDIA_ID_FOR_CONTACT}"
        }
      }
    ]
  },
  {
    keywords: ["Business Cooperation", "Cooperation"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: '📨 I am looking forward to your letter!\n\n<a href="mailto:252837151@qq.com">252837151@qq.com</a>',
        }
      },
      {
        msgtype: "image",
        image: {
          media_id: "{LIU_WX_GZ_MEDIA_ID_FOR_CONTACT}"
        }
      }
    ]
  },
  {
    keywords: ["AI 控制台", "控制台"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: "🎮 <a href='{LIU_DOMAIN}/ai-console'>点击进入 AI 控制台</a>"
        }
      }
    ]
  },
  {
    keywords: ["AI 控制中心", "控制中心"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: "🎮 <a href='{LIU_DOMAIN}/ai-console'>輕觸進入 AI 控制中心</a>"
        }
      }
    ]
  },
  {
    keywords: ["AI Console", "Console"],
    replies: [
      {
        msgtype: "text",
        text: {
          content: "🎮 <a href='{LIU_DOMAIN}/ai-console'>Click to enter AI Console</a>"
        }
      }
    ]
  }
]

/********************* 映射函数 ****************/

/** 获取兜底语言 */
let fallbackLocale: SupportedLocale | undefined
export function getFallbackLocale(): SupportedLocale {
  if(fallbackLocale) return fallbackLocale
  const f = process.env.LIU_FALLBACK_LOCALE
  if(!f) return "en"
  const existed = supportedLocales.includes(f as SupportedLocale)
  if(!existed) return "en"
  fallbackLocale = f as SupportedLocale
  return fallbackLocale
}

/** 归一化语言 */
function normalizeLanguage(val: string): SupportedLocale {
  val = val.toLowerCase()
  if(!val) return getFallbackLocale()

  val = val.replace(/_/g, "-")

  if(val === "zh-hant") return "zh-Hant"
  if(val === "zh-tw") return "zh-Hant"
  if(val === "zh-hk") return "zh-Hant"
  if(val.startsWith("zh")) return "zh-Hans"
  if(val.length > 1) return "en"

  return getFallbackLocale()
}

/** 获取当前注入信息下的语言 */
export function getCurrentLocale(
  opt?: GetLangValOpt
): SupportedLocale {
  let locale = opt?.locale
  if(locale) return locale

  // 从 lang 判断
  const lang = opt?.lang
  if(lang && lang !== "system") {
    locale = normalizeLanguage(lang)
    return locale
  }
  
  // 从 user 中判断
  const user = opt?.user
  if(user) {
    const { language, systemLanguage } = user
    if(language !== "system") return language
    if(systemLanguage) {
      locale = normalizeLanguage(systemLanguage)
    }
    else {
      locale = getFallbackLocale()
    }
    return locale
  }

  // 从 body 中判断
  const liuLang = opt?.body?.x_liu_language
  if(liuLang && typeof liuLang === "string") {
    locale = normalizeLanguage(liuLang)
    return locale
  }

  return getFallbackLocale()
}


export function i18nFill(
  res: string,
  opt2: Record<string, string | number>,
) {
  const _env = process.env
  opt2.LIU_DOMAIN = _env.LIU_DOMAIN ?? ""
  opt2.LIU_DOCS_DOMAIN = _env.LIU_DOCS_DOMAIN ?? ""
  opt2.LIU_CUSTOMER_SERVICE = _env.LIU_CUSTOMER_SERVICE ?? ""
  
  const keys = Object.keys(opt2)
  for(let i=0; i<keys.length; i++) {
    const v = keys[i]
    const theVal = opt2[v]
    const dynamicPattern = `{${v}}`
    const escapedPattern = dynamicPattern.replace(/[{}]/g, '\\$&')
    const regexPattern = new RegExp(escapedPattern, 'g')
    res = res.replace(regexPattern, theVal.toString()) 
  }
  return res
}


/** 返回一个翻译函数 t */
export function useI18n(
  langAtom: LangAtom,
  opt1?: GetLangValOpt,
) {
  const _getVal = (key: string) => {
    const locale = getCurrentLocale(opt1)
    let val = langAtom[locale]?.[key]
    if(val) return val
    const fLocale = getFallbackLocale()
    if(fLocale !== locale) {
      val = langAtom[fLocale]?.[key]
      if(val) return val
    }
  }

  const t: T_I18N = (key, opt2) => {
    let res = _getVal(key)
    if(!res) return ""
    res = i18nFill(res, opt2 ?? {})
    return res
  }

  return { t }
}

/** 获取应用名称 */
export function getAppName(
  opt1?: GetLangValOpt,
) {
  const { t } = useI18n(commonLang, opt1)
  const res = t('appName')
  if(res) return res
  return "xxx"
}