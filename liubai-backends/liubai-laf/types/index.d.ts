import { 
  FunctionContext as _FunctionContext
} from "@lafjs/cloud"
import { ObjectId as _ObjectId } from "mongodb"

type LiuSwitch = "01" | "02" | undefined

declare global {
  type FunctionContext = _FunctionContext

  class ObjectId extends _ObjectId {}
  
  namespace NodeJS {
    interface ProcessEnv {

      /** 由 Laf 所定义的字段 */
      APPID: string

      /** 应用名称，请以英文字母开头，并且为 \w */
      LIU_APP_NAME: string

      /** 总服务状态，默认开启，仅当值为 `02` 时关闭 */
      LIU_CLOUD_ON: LiuSwitch

      /** 是否开放登录，默认开启，仅当值为 `02` 时关闭，`03` 时表示仅开放 
       *  登录，不开放注册
      */
      LIU_CLOUD_LOGIN: LiuSwitch | "03"

      LIU_ENV_STATE?: "prod" | "dev" 

      /** 当前应用的域名 
       *  其结尾请不要添加路径的开头 `/`
      */
      LIU_DOMAIN?: string
      LIU_DOCS_DOMAIN?: string   // domain for documentation, don't add `/` at the end

      /** 内部 debug 时，通行码 */
      LIU_DEBUG_KEY?: string

      /** 兜底的语言信息，若该字段不存在，系统会使用 'en' 做兜底 */
      LIU_FALLBACK_LOCALE?: string

      /** 默认时区，比如 "8.5" 就是东 8.5 时区 */
      LIU_TIMEZONE?: string
      LIU_CURRENCY?: string   // 默认货币单位（兜底用，大写）
                              // 比如 "CNY" / "USD" / "HKD" / "EUR" / "JPY" / "TWD" / "NZD" / "AUD"

      /** email */
      LIU_EMAIL_1?: string           // 商务合作
      LIU_EMAIL_FOR_REPLY?: string   // 用户回复 noreply 时回复到哪个邮箱地址
      LIU_EMAIL_SEND_CHANNEL?: "resend" | "tencent-ses"    // 必须与 LiuSESChannel 一致

      /** customer service */
      LIU_CUSTOMER_SERVICE?: string   // wecom customer service link, like "https://work.weixin.qq.com/kfid/kfcf......"

      /** GitHub OAuth */
      LIU_GITHUB_OAUTH_CLIENT_ID?: string
      LIU_GITHUB_OAUTH_CLIENT_SECRET?: string

      /** Google OAuth Web 端 */
      LIU_GOOGLE_OAUTH_CLIENT_ID?: string
      LIU_GOOGLE_OAUTH_CLIENT_SECRET?: string

      /** Resend */
      LIU_RESEND_API_KEY?: string
      LIU_RESEND_FROM_EMAIL?: string     // 发送的 email 地址

      /** Stripe */
      LIU_STRIPE_API_KEY?: string        // stripe 的 api key
      LIU_STRIPE_ENDPOINT_SECRET?: string  // stripe 的 webhook secret
      LIU_STRIPE_TEST_PRICE_ID?: string    // stripe 测试用的 price id

      /** 七牛 */
      LIU_QINIU_ACCESS_KEY?: string
      LIU_QINIU_SECRET_KEY?: string
      LIU_QINIU_BUCKET?: string           // 七牛云的目标桶名称
      LIU_QINIU_FOLDER?: string           // 目标桶下的文件夹，不要加斜杠，默认为 users
      LIU_QINIU_THIRD_FOLDER?: string     // 服务端转存第三方文件的文件夹，不要加斜杠，默认为 third
      LIU_QINIU_CALLBACK_URL?: string
      LIU_QINIU_CDN_DOMAIN?: string       // 七牛云的 cdn 域名，结尾不要加 /
      LIU_QINIU_CUSTOM_KEY?: string       // 自定义密钥，用于在 webhook-qiniu 中验证使用
      LIU_QINIU_SMS_TEMP_ID?: string      // 七牛云短信模板 ID
      LIU_QINIU_AVATAR_FOLDER?: string    // the folder for avatar, don't add "/"

      /** 微信公众号 */
      LIU_WX_GZ_APPID?: string
      LIU_WX_GZ_APPSECRET?: string
      LIU_WX_GZ_TOKEN?: string
      LIU_WX_GZ_ENCODING_AESKEY?: string
      LIU_WX_GZ_TAG_MANAGEMENT?: string    // 01: tag management enabled, otherwise disabled
      LIU_WX_GZ_LOGIN?: string             // 01: logging in by wx gzh enabled, otherwise disabled
      LIU_WX_GZ_TMPL_ID_1?: string         // reminder template id enabled, otherwise disabled
      LIU_WX_GZ_TMPL_ID_2?: string         // subscription reminder template id enabled, otherwise disabled
      LIU_WX_GZ_TEST_OPENID?: string       // test openid of wx_gzh for testing ai
      LIU_WX_GZ_TYPE?: "service_account" | "subscription_account"      // 服务号 or 订阅号
      LIU_WX_GZ_MEDIA_ID_FOR_CONTACT?: string     // the media id to send, when user tap "商务合作"
      LIU_WECOM_GROUP_LINK?: string        // vip group link

      /** 微信小程序 */
      LIU_WX_REWARDED_VIDEO_AD?: string    // rewarded video unit ad id
      LIU_WX_MINI_APPID?: string
      LIU_WX_MINI_APPSECRET?: string
      LIU_WX_MINI_TMPL_ID_1?: string       // 优惠券即将过期通知
      LIU_WX_MINI_TMPL_ID_2?: string       // 如果有相似的优惠券，要发送的通知
      LIU_WX_MINI_VERSION_TYPE?: "0" | "1" | "2"    // 0: 正式版
                                                    // 1: 开发版
                                                    // 2: 体验版
      

      /** 企业微信 企业内部自建应用 */
      LIU_WECOM_QYNB_CORPID?: string
      LIU_WECOM_QYNB_AGENTID?: string
      LIU_WECOM_QYNB_SECRET?: string
      LIU_WECOM_QYNB_TOKEN?: string
      LIU_WECOM_QYNB_ENCODING_AESKEY?: string
      LIU_WECOM_QYNB_BOT_IDS?: string    // wecom's userIds where these wecom users
                                         // can send & receive messages via our backend
                                         // plz use comma（,） to split
      // 企业微信 会话内容存档
      LIU_WECOM_CHAT_SYNC_TOKEN?: string
      LIU_WECOM_CHAT_SYNC_ENCODING_AESKEY?: string

      // 微信支付
      LIU_WXPAY_MCH_ID?: string //1514965071
      LIU_WXPAY_NOTIFY_URL?: string       // callback url from wxpay
      LIU_WXPAY_API_V3_KEY?: string       // api v3 key   sak87kkjdaj23dsa221kj2k1jkdsoGHG

      // 腾讯云
      LIU_TENCENTCLOUD_SECRET_ID?: string    // 腾讯云的 secret id
      LIU_TENCENTCLOUD_SECRET_KEY?: string   // 腾讯云的 secret key

      // 腾讯云 SES（邮件）
      LIU_TENCENT_SES_REGION?: string        // 腾讯云 SES 所属的地域，有值 "ap-guangzhou" / "ap-hongkong"
      LIU_TENCENT_SES_FROM_EMAIL?: string    // 腾讯云 SES 的发件邮箱

      // 腾讯云 SMS（短信）
      LIU_TENCENT_SMS_REGION?: string        // 腾讯云 SMS 所属的地域，有值 "ap-guangzhou"
      LIU_TENCENT_SMS_SDKAPPID?: string
      LIU_TENCENT_SMS_APPKEY?: string
      LIU_TENCENT_SMS_SIGNNAME?: string      // 签名内容，like "闪记记事公众号"
      LIU_TENCENT_SMS_TEMPLATEID_1?: string  // 登录时的短信模板

      // 支付宝
      LIU_ALIPAY_APP_ID?: string //2021005185652867
      LIU_ALIPAY_NOTIFY_URL?: string

      /** Official LLMs */
      LIU_ALIYUN_BAILIAN_BASE_URL?: string   // 阿里云百炼 base url
      LIU_ALIYUN_BAILIAN_API_KEY?: string    // 阿里云百炼 api key
      LIU_BAICHUAN_BASE_URL?: string         // 百川 AI 的 base url
      LIU_BAICHUAN_API_KEY?: string          // 百川 AI 的 api key
      LIU_DEEPSEEK_BASE_URL?: string         // DeepSeek AI 的 base url
      LIU_DEEPSEEK_API_KEY?: string          // DeepSeek AI 的 api key
      LIU_MINIMAX_BASE_URL?: string          // MiniMax AI 的 base url
      LIU_MINIMAX_API_KEY?: string           // MiniMax AI 的 api key   eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLlj7blv5fkuJwiLCJVc2VyTmFtZSI6IuWPtuW_l-S4nCIsIkFjY291bnQiOiIiLCJTdWJqZWN0SUQiOiIxOTYwNTkxNDI0NjEzMjYxOTI4IiwiUGhvbmUiOiIxNTk4MDc2NzE3NCIsIkdyb3VwSUQiOiIxOTYwNTkxNDI0NjA0ODczMzIwIiwiUGFnZU5hbWUiOiIiLCJNYWlsIjoiIiwiQ3JlYXRlVGltZSI6IjIwMjUtMDktMDMgMTc6NTU6NTYiLCJUb2tlblR5cGUiOjEsImlzcyI6Im1pbmltYXgifQ.JF2zWz8ebMcLeVtim3fAVRlKoUFPizUr6QO7WCA4uYJO-5vU9gRnnHjQJN_JACJ7aCsIPAq92Zl-6tfcSBpj2dnXjqxAa_i2TSa7NB_vtQUMHazah_VJviphVogQHBXKhr-kk4twUOdXNOLAQFn8Fs5V5wBNQiUGk3bynwxbhnFy_-faDS5y82XORxd_y04leqGEsB_nuWbnAoat610rhWFV2M5U_rTzvXVzTsCl1116-YifRcNuquUfbx1q5ovQKy5hLDFzellxdAyptgrXBfy2FE-fp7RJSmRIwCeuV9FP8OCEP0Y9aUFLv7dXNIrfU8zV14bVGuKNGXlz_tnmng
      LIU_MINIMAX_GROUPID?: string           // MiniMax AI 账户管理的 groupID  1960591424604873320
      LIU_MOONSHOT_BASE_URL?: string         // Moonshot AI 的 base url
      LIU_MOONSHOT_API_KEY?: string          // Moonshot AI 的 api key
      LIU_STEPFUN_BASE_URL?: string          // Stepfun AI 的 base url
      LIU_STEPFUN_API_KEY?: string           // Stepfun AI 的 api key
      LIU_TENCENT_HUNYUAN_API_KEY?: string   // 腾讯混元 api key
      LIU_TENCENT_HUNYUAN_BASE_URL?: string  // 腾讯混元 base url
      LIU_YI_BASE_URL?: string               // 01.ai 的 base url
      LIU_YI_API_KEY?: string                // 01.ai 的 api key
      LIU_ZHIPU_BASE_URL?: string            // 智谱的 base url
      LIU_ZHIPU_API_KEY?: string             // 智谱的 api key

      /** Secondary Providers */
      LIU_SILICONFLOW_BASE_URL?: string
      LIU_SILICONFLOW_API_KEY?: string
      LIU_SILICONFLOW_IMAGE_GENERATION_MODEL?: string
      LIU_GITEE_AI_BASE_URL?: string
      LIU_GITEE_AI_API_KEY?: string
      LIU_QINIU_LLM_BASE_URL?: string
      LIU_QINIU_LLM_API_KEY?: string
      LIU_TENCENT_LKEAP_BASE_URL?: string
      LIU_TENCENT_LKEAP_API_KEY?: string
      LIU_SUANLEME_BASE_URL?: string
      LIU_SUANLEME_API_KEY?: string

      /** Summary */
      LIU_SUMMARY_BASE_URL?: string
      LIU_SUMMARY_API_KEY?: string
      LIU_SUMMARY_MODEL?: string
      LIU_SUMMARY_PREFIX?: "01"              // closed by default, reference: https://api-docs.deepseek.com/zh-cn/guides/chat_prefix_completion
      LIU_SUMMARY_PARTIAL?: "01"             // closed by default, reference: https://platform.moonshot.cn/docs/api/partial

      /** Translation */
      LIU_TRANSLATION_BASE_URL?: string
      LIU_TRANSLATION_API_KEY?: string
      LIU_TRANSLATION_MODEL?: string

      /** Image to Text */
      LIU_IMG2TXT_BASE_URL?: string
      LIU_IMG2TXT_API_KEY?: string
      LIU_IMG2TXT_MODEL?: string

      /** System 2 */
      LIU_SYSTEM2_BASE_URL?: string
      LIU_SYSTEM2_API_KEY?: string
      LIU_SYSTEM2_MODEL?: string

      /** Characters */
      LIU_WXGZH_KF_BAIXIAOYING?: string      // kf_account of baixiaoying
      LIU_WXGZH_KF_DEEPSEEK?: string         // kf_account of deepseek
      LIU_WXGZH_KF_DS_REASONER?: string      // kf_account of ds-reasoner
      LIU_WXGZH_KF_HAILUO?: string           // kf_account of hailuo
      LIU_WXGZH_KF_HUNYUAN?: string          // kf_account of tencent hunyuan
      LIU_WXGZH_KF_KIMI?: string             // kf_account of kimi
      LIU_WXGZH_KF_TONGYI_QWEN?: string      // kf_account of tongyi-qwen
      LIU_WXGZH_KF_WANZHI?: string           // kf_account of wanzhi
      LIU_WXGZH_KF_YUEWEN?: string           // kf_account of yuewen
      LIU_WXGZH_KF_ZHIPU?: string            // kf_account of zhipu
      LIU_WXGZH_KF_SYSTEM2?: string          // kf_account of system2

      /** Statistic */
      LIU_NOCODB_BASEURL?: string            // like https://app.nocodb.com
      LIU_NOCODB_TOKEN?: string              // get it from https://app.nocodb.com/#/account/tokens
      LIU_NOCODB_TABLE_1?: string            // overview table
      LIU_NOCODB_TABLE_2?: string            // AiStatistic table

      /** devbox + ffmpeg */
      LIU_FFMPEG_BASEURL?: string            // like "https://xxxxxx.sealoshzh.site"

      /** DingTalk */
      LIU_DINGTALK_REPORTER?: string         // like "https://oapi.dingtalk.com/robot/send?access_token=xxxxxx"

      /** Amap */
      LIU_AMAP_WEB_KEY?: string              // Web Key of Amap

      /** Jina */ 
      LIU_JINA_BASE_URL?: string             // Do not add a trailing slash: /
      LIU_JINA_APIKEY?: string

      /** Milvus */
      LIU_MILVUS_ADDRESS?: string
      LIU_MILVUS_TOKEN?: string

    }
  }
}