// Function Name: open-connect
import { 
  getNowStamp,
  MINUTE,
} from "@/common-time"
import cloud from "@lafjs/cloud"
import { 
  type OpenConnectOperate,
  type LiuRqReturn,
  type LiuErrReturn,
  type VerifyTokenRes_B,
  type Table_Member,
  type Table_Credential,
  type Ww_Res_Add_Contact_Way,
  type Res_OC_CheckWeCom,
  type Res_OC_BindWeCom,
  type Res_OC_GetWeChat,
  type Table_User,
  type Wx_Res_Create_QR,
  type Res_OC_BindWeChat,
  type Res_OC_CheckWeChat,
  type Param_OC_SetWechat,
  Sch_Param_OC_SetWechat,
  Sch_Param_OC_SetFeishu,
  type Table_Workspace,
  type DataPass,
  type Res_OC_GetWps,
  type Res_OC_SetWps,
  type Res_OC_GetDingTalk,
  type Res_OC_GetVika,
  type Res_OC_GetFeishu,
} from "@/common-types"
import { 
  checkAndGetWxGzhAccessToken,
  checker,
  CommonShared,
  decryptCloudData,
  encryptDataWithAES,
  getAESKey,
  getDecryptedBody,
  getEncryptedData,
  getWwQynbAccessToken, 
  liuReq, 
  verifyToken,
} from "@/common-util"
import { createBindCredential, createThirdPartyPassword } from "@/common-ids"
import * as vbot from "valibot"

const db = cloud.database()

const API_WECOM_ADD_CONTACT = "https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_contact_way"
const API_WECHAT_CREATE_QRCODE = "https://api.weixin.qq.com/cgi-bin/qrcode/create"
const MIN_10 = 10 * MINUTE

export async function main(ctx: FunctionContext) {
  const body = ctx.request?.body ?? {}
  const oT = body.operateType as OpenConnectOperate


  const vRes = await verifyToken(ctx, body)
  if(!vRes.pass) return vRes.rqReturn

  let res: LiuRqReturn = { code: "E4000" }
  if(oT === "bind-wecom") {
    res = await handle_bind_wecom(vRes, body)
  }
  else if(oT === "check-wecom") {
    res = await handle_check_wecom(vRes, body)
  }
  else if(oT === "get-wechat") {
    res = await handle_get_wechat(vRes, body)
  }
  else if(oT === "set-wechat") {
    res = await handle_set_wechat(vRes, body)
  }
  else if(oT === "bind-wechat") {
    res = await handle_bind_wechat(vRes, body)
  }
  else if(oT === "check-wechat") {
    res = await handle_check_wechat(vRes, body)
  }
  else if(oT === "get-wps") {
    res = await handle_get_wps(vRes, body)
  }
  else if(oT === "set-wps") {
    res = await handle_set_wps(vRes, body)
  }
  else if(oT === "get-dingtalk") {
    res = await handle_get_dingtalk(vRes, body)
  }
  else if(oT === "set-dingtalk") {
    res = await handle_set_dingtalk(vRes, body)
  }
  else if(oT === "get-feishu") {
    res = await handle_get_feishu(vRes, body)
  }
  else if(oT === "set-feishu") {
    res = await handle_set_feishu(vRes, body)
  }
  else if(oT === "get-vika") {
    res = await handle_get_vika(vRes, body)
  }
  else if(oT === "set-vika") {
    res = await handle_set_vika(vRes, body)
  }

  return res
}

async function handle_set_vika(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 0. decrypt body
  const res0 = getDecryptedBody(body, vRes)
  const newBody = res0.newBody
  if(!newBody || res0.rqReturn) {
    return res0.rqReturn ?? { code: "E5001" }
  }

  // 1. check out data
  const enable = newBody.enable
  if(enable !== "Y" && enable !== "N") {
    return { code: "E4000", errMsg: "enable is required" }
  }
  const aesKey = getAESKey()
  if(!aesKey) return { code: "E5001", errMsg: "getAESKey failed in set-dingtalk" }

  // 1.1 check out vika_api_token
  const { 
    vika_api_token,
    vika_datasheet_id,
  } = newBody
  if(typeof vika_api_token === "string" && vika_api_token) {
    if(vika_api_token.length < 5) {
      return { code: "E4000", errMsg: "vika_api_token is not from vika" }
    }
  }

  // 1.2 check out vika_datasheet_id
  if(typeof vika_datasheet_id === "string" && vika_datasheet_id) {
    const len_1_2 = vika_datasheet_id.length
    const isDST = vika_datasheet_id.startsWith("dst")
    if(len_1_2 < 5 || !isDST) {
      return { code: "E4000", errMsg: "vika_datasheet_id is not valid" }
    }
  }

  // 2. get workspace
  const res2 = await getSharedData1(vRes, newBody)
  if(!res2.pass) return res2.err
  const space = res2.data

  // 3. handle dingtalk config
  const cfg = space.vika ?? {}
  let updated = false

  // 3.1 for enable
  if(cfg.enable !== enable) {
    cfg.enable = enable
    updated = true
  }

  // 3.2 for vika_api_token
  let old_token = ""
  if(cfg.enc_api_token) {
    const d3_2 = decryptCloudData<string>(cfg.enc_api_token)
    if(!d3_2.pass) return d3_2.err
    old_token = d3_2.data ?? ""
  }
  if(typeof vika_api_token === "string") {
    if(vika_api_token !== old_token) {
      cfg.enc_api_token = encryptDataWithAES(vika_api_token, aesKey)
      updated = true
    }
  }

  // 3.3 for datasheet_id
  let old_datasheet = ""
  if(cfg.enc_datasheet_id) {
    const d3_3 = decryptCloudData<string>(cfg.enc_datasheet_id)
    if(!d3_3.pass) return d3_3.err
    old_datasheet = d3_3.data ?? ""
  }
  if(typeof vika_datasheet_id === "string") {
    if(vika_datasheet_id !== old_datasheet) {
      cfg.enc_datasheet_id = encryptDataWithAES(vika_datasheet_id, aesKey)
      updated = true
    }
  }

  // 4. get to update
  if(updated) {
    await storageWorkspace(space._id, { vika: cfg })
  }

  return { code: "0000" }
}


async function handle_get_vika(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 1. checking out memberId
  const res1 = await getSharedData1(vRes, body)
  if(!res1.pass) return res1.err
  const space = res1.data

  // 2. handle return data
  const returnData: Res_OC_GetVika = {
    operateType: "get-vika",
  }
  const cfg = space.vika
  if(!cfg) {
    return {
      code: "0000",
      data: returnData,
    }
  }

  // 3.1 decrypt enc_api_token
  if(cfg.enc_api_token) {
    const d1 = decryptCloudData<string>(cfg.enc_api_token)
    if(!d1.pass) {
      console.warn("enc_api_token decrypt failed in handle_get_vika: ", d1.err)
      return { 
        code: "E4009", 
        errMsg: "enc_api_token decryption failed while getting vika",
      }
    }
    returnData.plz_enc_api_token = d1.data
  }

  // 3.2 decrypt enc_datasheet_id
  if(cfg.enc_datasheet_id) {
    const d2 = decryptCloudData<string>(cfg.enc_datasheet_id)
    if(!d2.pass) {
      console.warn("enc_datasheet_id decrypt failed in handle_get_vika: ", d2.err)
      return { 
        code: "E4009", 
        errMsg: "enc_datasheet_id decryption failed while getting vika",
      }
    }
    returnData.plz_enc_datasheet_id = d2.data
  }

  // 3.3 handle enable
  returnData.enable = cfg.enable

  // 4. encrypt data
  const res4 = getSharedData2(vRes, returnData)
  return res4
}

async function handle_set_feishu(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 0. decrypt body
  const res0 = getDecryptedBody(body, vRes)
  const newBody = res0.newBody
  if(!newBody || res0.rqReturn) {
    return res0.rqReturn ?? { code: "E5001" }
  }
  const res0_2 = vbot.safeParse(Sch_Param_OC_SetFeishu, newBody)
  if(!res0_2.success) {
    const err0 = checker.getErrMsgFromIssues(res0_2.issues)
    return { code: "E4000", errMsg: err0 }
  }

  // 1. check out data
  const enable = newBody.enable
  const aesKey = getAESKey()
  if(!aesKey) return { code: "E5001", errMsg: "getAESKey failed in set-feishu" }

  // 1.1 checking whether personal_base_token is from feishu
  const personal_base_token = newBody.personal_base_token
  if(typeof personal_base_token === "string" && personal_base_token) {
    const isFeishuPbt = WebhookHandler.isFeishuPersonalBaseToken(personal_base_token)
    if(!isFeishuPbt) {
      return { code: "E4000", errMsg: "personal_base_token is not from feishu" }
    }
  }

  // 2. get workspace
  const res2 = await getSharedData1(vRes, newBody)
  if(!res2.pass) return res2.err
  const space = res2.data

  // 3. handle dingtalk config
  const cfg = space.feishu ?? {}
  let updated = false

  // 3.1 for enable, base_id, table_id
  if(cfg.enable !== enable) {
    cfg.enable = enable
    updated = true
  }
  if(cfg.base_id !== newBody.base_id) {
    cfg.base_id = newBody.base_id
    updated = true
  }
  if(cfg.table_id !== newBody.table_id) {
    cfg.table_id = newBody.table_id
    updated = true
  }

  // 3.2 for personal_base_token
  let old_pbt = ""
  if(cfg.enc_personal_base_token) {
    const d3_2 = decryptCloudData<string>(cfg.enc_personal_base_token)
    if(!d3_2.pass) return d3_2.err
    old_pbt = d3_2.data ?? ""
  }
  if(typeof personal_base_token === "string") {
    if(personal_base_token !== old_pbt) {
      cfg.enc_personal_base_token = encryptDataWithAES(personal_base_token, aesKey)
      updated = true
    }
  }

  // 4. get to update
  if(updated) {
    await storageWorkspace(space._id, { feishu: cfg })
  }

  return { code: "0000" }
}

async function storageWorkspace(
  id: string,
  updatedData: Partial<Table_Workspace>,
) {
  const wCol = db.collection("Workspace")
  if(!updatedData.updatedStamp) {
    updatedData.updatedStamp = getNowStamp()
  }
  await wCol.doc(id).update(updatedData)
}



async function handle_set_dingtalk(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 0. decrypt body
  const res0 = getDecryptedBody(body, vRes)
  const newBody = res0.newBody
  if(!newBody || res0.rqReturn) {
    return res0.rqReturn ?? { code: "E5001" }
  }

  // 1. check out data
  const enable = newBody.enable
  if(enable !== "Y" && enable !== "N") {
    return { code: "E4000", errMsg: "enable is required" }
  }
  const aesKey = getAESKey()
  if(!aesKey) return { code: "E5001", errMsg: "getAESKey failed in set-dingtalk" }

  // 1.1 checking whether webhook_url is from dingtalk
  const webhook_url = newBody.webhook_url
  if(typeof webhook_url === "string" && webhook_url) {
    const isDingTalkUrl = WebhookHandler.isDingTalkWebhookUrl(webhook_url)
    if(!isDingTalkUrl) {
      return { code: "E4000", errMsg: "webhook_url is not from dingtalk" }
    }
  }

  // 2. get workspace
  const res2 = await getSharedData1(vRes, newBody)
  if(!res2.pass) return res2.err
  const space = res2.data

  // 3. handle dingtalk config
  const cfg = space.dingtalk ?? {}
  let updated = false

  // 3.1 for enable
  if(cfg.enable !== enable) {
    cfg.enable = enable
    updated = true
  }

  // 3.2 for webhook_url
  let old_url = ""
  if(cfg.enc_webhook_url) {
    const d3_2 = decryptCloudData<string>(cfg.enc_webhook_url)
    if(!d3_2.pass) return d3_2.err
    old_url = d3_2.data ?? ""
  }
  if(typeof webhook_url === "string") {
    if(webhook_url !== old_url) {
      cfg.enc_webhook_url = encryptDataWithAES(webhook_url, aesKey)
      updated = true
    }
  }

  // 4. get to update
  if(updated) {
    await storageWorkspace(space._id, { dingtalk: cfg })
  }

  return { code: "0000" }
}

async function handle_get_feishu(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 1. checking out memberId
  const res1 = await getSharedData1(vRes, body)
  if(!res1.pass) return res1.err
  const space = res1.data

  // 2. handle return data
  const returnData: Res_OC_GetFeishu = {
    operateType: "get-feishu",
  }
  const cfg = space.feishu
  if(!cfg) {
    return {
      code: "0000",
      data: returnData,
    }
  }

  // 3.1 decrypt enc_personal_base_token
  if(cfg.enc_personal_base_token) {
    const d1 = decryptCloudData<string>(cfg.enc_personal_base_token)
    if(!d1.pass) {
      console.warn("enc_personal_base_token decrypt failed in handle_get_feishu: ", d1.err)
      return { 
        code: "E4009", 
        errMsg: "enc_personal_base_token decryption failed while getting feishu",
      }
    }
    returnData.plz_enc_personal_base_token = d1.data
  }

  // 3.2 handle enable
  returnData.enable = cfg.enable
  returnData.base_id = cfg.base_id
  returnData.table_id = cfg.table_id

  // 4. encrypt data
  const res4 = getSharedData2(vRes, returnData)
  return res4
}

async function handle_get_dingtalk(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 1. checking out memberId
  const res1 = await getSharedData1(vRes, body)
  if(!res1.pass) return res1.err
  const space = res1.data

  // 2. handle return data
  const returnData: Res_OC_GetDingTalk = {
    operateType: "get-dingtalk",
  }
  const cfg = space.dingtalk
  if(!cfg) {
    return {
      code: "0000",
      data: returnData,
    }
  }

  // 3.1 decrypt enc_webhook_url
  if(cfg.enc_webhook_url) {
    const d1 = decryptCloudData<string>(cfg.enc_webhook_url)
    if(!d1.pass) {
      console.warn("enc_webhook_url decrypt failed in handle_get_dingtalk: ", d1.err)
      return { 
        code: "E4009", 
        errMsg: "enc_webhook_url decryption failed while getting dingtalk",
      }
    }
    returnData.plz_enc_webhook_url = d1.data
  }

  // 3.2 handle enable
  returnData.enable = cfg.enable

  // 4. encrypt data
  const res4 = getSharedData2(vRes, returnData)
  return res4
}


async function handle_set_wps(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 0. decrypt body
  const res0 = getDecryptedBody(body, vRes)
  const newBody = res0.newBody
  if(!newBody || res0.rqReturn) {
    return res0.rqReturn ?? { code: "E5001" }
  }

  // 1. check out data
  const enable = newBody.enable
  if(enable !== "Y" && enable !== "N") {
    return { code: "E4000", errMsg: "enable is required" }
  }
  const aesKey = getAESKey()
  if(!aesKey) return { code: "E5001", errMsg: "getAESKey failed in open-connect" }

  // 1.1 checking whether webhook_url is from wps
  const webhook_url = newBody.webhook_url
  if(typeof webhook_url === "string" && webhook_url) {
    const isWpsUrl = WebhookHandler.isWpsWebhookUrl(webhook_url)
    if(!isWpsUrl) {
      return { code: "E4000", errMsg: "webhook_url is not from wps" }
    }
  }

  // 2. get workspace
  const res2 = await getSharedData1(vRes, newBody)
  if(!res2.pass) return res2.err
  const space = res2.data

  // 3. handle wps config
  const wpsCfg = space.wps ?? {}
  let updated = false

  // 3.1 for enable
  if(wpsCfg.enable !== enable) {
    wpsCfg.enable = enable
    updated = true
  }

  // 3.2 for webhook_url
  let old_url = ""
  if(wpsCfg.enc_webhook_url) {
    const d3_2 = decryptCloudData<string>(wpsCfg.enc_webhook_url)
    if(!d3_2.pass) return d3_2.err
    old_url = d3_2.data ?? ""
  }
  if(typeof webhook_url === "string") {
    if(webhook_url !== old_url) {
      wpsCfg.enc_webhook_url = encryptDataWithAES(webhook_url, aesKey)
      updated = true
    }
  }

  // 3.3 for webhook_password
  const returnData: Res_OC_SetWps = { operateType: "set-wps" }
  let webhook_password = ""
  if(enable === "Y") {
    if(wpsCfg.enc_webhook_password) {
      const d3_3 = decryptCloudData<string>(wpsCfg.enc_webhook_password)
      if(!d3_3.pass) return d3_3.err
      webhook_password = d3_3.data ?? ""
    }
    if(!webhook_password) {
      webhook_password = createThirdPartyPassword()
      wpsCfg.enc_webhook_password = encryptDataWithAES(webhook_password, aesKey)
      updated = true
    }
    returnData.plz_enc_webhook_password = webhook_password
  }

  // 4. get to update
  if(updated) {
    await storageWorkspace(space._id, { wps: wpsCfg })
  }

  // 5. encrypt data
  const res5 = getSharedData2(vRes, returnData)
  return res5
}

async function handle_get_wps(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 1. checking out memberId
  const res1 = await getSharedData1(vRes, body)
  if(!res1.pass) return res1.err
  const space = res1.data

  // 2. handle return data
  const returnData: Res_OC_GetWps = {
    operateType: "get-wps",
  }
  const wpsCfg = space.wps
  if(!wpsCfg) {
    return {
      code: "0000",
      data: returnData,
    }
  }

  // 3.1 decrypt enc_webhook_url
  if(wpsCfg.enc_webhook_url) {
    const d1 = decryptCloudData<string>(wpsCfg.enc_webhook_url)
    if(!d1.pass) {
      console.warn("enc_webhook_url decrypt failed in handle_get_wps: ", d1.err)
      return { code: "E4009", errMsg: "enc_webhook_url decrypt failed" }
    }
    returnData.plz_enc_webhook_url = d1.data
  }

  // 3.2 decrypt enc_webhook_password
  if(wpsCfg.enc_webhook_password) {
    const d2 = decryptCloudData<string>(wpsCfg.enc_webhook_password)
    if(!d2.pass) {
      console.warn("enc_webhook_password decrypt failed in handle_get_wps: ", d2.err)
      return { code: "E4009", errMsg: "enc_webhook_password decrypt failed" }
    }
    returnData.plz_enc_webhook_password = d2.data
  }

  // 3.3 handle enable
  returnData.enable = wpsCfg.enable

  // 4. encrypt data
  const res4 = getSharedData2(vRes, returnData)
  return res4
}

class WebhookHandler {

  static wpsDomains = ["kdocs.cn", "wps.cn"]
  static dingtalkDomains = ["dingtalk.com"]

  private static _checkWebhookUrl(
    link: string,
    domains: string[],
  ) {
    try {
      const url1 = new URL(link)
      const origin = url1.origin
      const domain = domains.find(d => {
        const d1 = "." + d
        const res1 = origin.endsWith(d1)
        if(res1) return true
        const d2 = "/" + d
        const res2 = origin.endsWith(d2)
        return res2
      })
      return Boolean(domain)
    }
    catch(err) {
      console.warn("_checkWebhookUrl error: ", err)
    }
    return false

  }

  static isWpsWebhookUrl(link: string) {
    const list = this.wpsDomains
    const res = this._checkWebhookUrl(link, list)
    return res
  }

  static isDingTalkWebhookUrl(link: string) {
    const list = this.dingtalkDomains
    const res = this._checkWebhookUrl(link, list)
    return res
  }

  static isFeishuPersonalBaseToken(token: string) {
    if(token.startsWith("pt")) return true
    return false
  }

}


async function handle_check_wechat(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
) {
  // 0. get params
  const credential = body.credential
  if(!credential || typeof credential !== "string") {
    return { code: "E4000", errMsg: "credential is required" }
  }
  const res: LiuRqReturn<Res_OC_CheckWeChat> = {
    code: "0000",
  }

  // 1. get credential
  const w1 = {
    credential,
    infoType: "bind-wechat",
  }
  const cCol = db.collection("Credential")
  const q1 = cCol.where(w1).orderBy("expireStamp", "desc").limit(1)
  const res1 = await q1.get<Table_Credential>()
  const list1 = res1.data
  const len1 = list1?.length
  if(len1 < 1) {
    res.data = {
      operateType: "check-wechat",
      status: "plz_check",
    }
    return res
  }

  // 2. check out permission
  const d2 = list1[0]
  const _userId = d2.userId
  const userId = vRes.userData._id
  if(_userId !== userId) {
    res.code = "E4003"
    res.errMsg = "permission denied"
    return res
  }

  // 3. check out expiration
  const now3 = getNowStamp()
  if(now3 > d2.expireStamp) {
    res.data = {
      operateType: "check-wechat",
      status: "expired",
    }
    return res
  }

  // 4. return waiting status
  res.data = {
    operateType: "check-wechat",
    status: "waiting",
  }

  return res
}

async function handle_bind_wechat(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
): Promise<LiuRqReturn<Res_OC_BindWeChat>> {
  // 0. get params
  const userId = vRes.userData._id

  // 1. checking out memberId
  const memberId = body.memberId
  if(memberId && typeof memberId === "string") {
    const res2 = await checkMember(memberId, userId)
    if(!res2.pass) return res2.err
  }

  // 2. checking out credential
  const cCol = db.collection("Credential")
  const w3: Partial<Table_Credential> = {
    infoType: "bind-wechat",
    userId,
  }
  const q3 = cCol.where(w3).orderBy("expireStamp", "desc").limit(1)
  const res3 = await q3.get<Table_Credential>()
  const list3 = res3.data
  const fir3 = list3[0]

  // 4. checking if expired
  const now4 = getNowStamp()
  const e4 = fir3?.expireStamp ?? 1
  const c4 = fir3?.credential
  const qr4 = fir3?.meta_data?.qr_code
  const ticket4 = fir3?.meta_data?.wx_qr_ticket
  const diff4 = e4 - now4
  if(diff4 > MINUTE && c4 && qr4) {
    // if the rest of time is enough to bind
    return {
      code: "0000",
      data: {
        operateType: "bind-wechat",
        qr_code: qr4,
        wx_qr_ticket: ticket4,
        credential: c4,
      },
    }
  }

  // 5. get wechat accessToken
  const accessToken = await checkAndGetWxGzhAccessToken()
  if(!accessToken) {
    return { code: "E5001", errMsg: "wechat accessToken not found" }
  }


  // 6. generate credential
  const cred = createBindCredential()
  const scene_str = `b2=${cred}`
  const w6 = {
    expire_seconds: 60 * 10,
    action_name: "QR_STR_SCENE",
    action_info: {
      scene: {
        scene_str,
      }
    }
  }
  const url6 = new URL(API_WECHAT_CREATE_QRCODE)
  url6.searchParams.set("access_token", accessToken)
  const link6 = url6.toString()
  const res6 = await liuReq<Wx_Res_Create_QR>(link6, w6)

  // 7. extract data from wechat
  const res7 = res6.data
  const qr_code_7 = res7?.url
  if(!qr_code_7) {
    console.warn("creating QR code from wechat failed")
    console.log(res7)
    return { 
      code: "E5004", 
      errMsg: "creating QR code from wechat failed",
    }
  }
  const wx_qr_ticket = res7.ticket

  // 8. add credential into db
  const expireStamp = getNowStamp() + MIN_10
  CommonShared.createCredential(userId, expireStamp, "bind-wechat", {
    credential: cred,
    meta_data: {
      memberId,
      qr_code: qr_code_7,
      wx_qr_ticket,
      x_liu_theme: body["x_liu_theme"],
      x_liu_language: body["x_liu_language"],
    }
  })

  return {
    code: "0000",
    data: {
      operateType: "bind-wechat",
      qr_code: qr_code_7,
      credential: cred,
      wx_qr_ticket,
    }
  }
}


async function handle_set_wechat(
  vRes: VerifyTokenRes_B,
  body: Param_OC_SetWechat,
): Promise<LiuRqReturn> {

  // 0. check params
  const res0 = vbot.safeParse(Sch_Param_OC_SetWechat, body)
  if(!res0.success) {
    const err0 = checker.getErrMsgFromIssues(res0.issues)
    return { code: "E4000", errMsg: err0 }
  }
  const memberId = body.memberId
  const ww_qynb_toggle = body.ww_qynb_toggle
  const wx_gzh_toggle = body.wx_gzh_toggle
  if(typeof ww_qynb_toggle === "undefined") {
    if(typeof wx_gzh_toggle === "undefined") {
      return { code: "E4000", errMsg: "ww_qynb_toggle or wx_gzh_toggle is required" }
    }
  }
  
  // 1. get member
  const mCol = db.collection("Member")
  const res1 = await mCol.doc(memberId).get<Table_Member>()
  const member = res1.data
  if(!member) {
    return { code: "E4004", errMsg: "memeber not found" }
  }
  const userId = vRes.userData._id
  if(member.user !== userId) {
    return { code: "E4003", errMsg: "the member is not yours" }
  }

  // 2. check if we need to update
  let needUpdate = false
  const noti = member.notification ?? {}
  if(typeof ww_qynb_toggle === "boolean") {
    if(noti.ww_qynb_toggle !== ww_qynb_toggle) {
      needUpdate = true
      noti.ww_qynb_toggle = ww_qynb_toggle
    }
  }
  if(typeof wx_gzh_toggle === "boolean") {
    if(noti.wx_gzh_toggle !== wx_gzh_toggle) {
      needUpdate = true
      noti.wx_gzh_toggle = wx_gzh_toggle
    }
  }
  if(!needUpdate) {
    return { code: "0001" }
  }

  // 3. to update
  const w2: Partial<Table_Member> = {
    notification: noti,
    updatedStamp: getNowStamp(),
  }
  const res2 = await mCol.doc(memberId).update(w2)
  return { code: "0000" }
}


async function handle_get_wechat(
  vRes: VerifyTokenRes_B,
  body: Record<string, string>,
) {
  // 0. get params
  const memberId = body.memberId
  if(!memberId || typeof memberId !== "string") {
    return { code: "E4000", errMsg: "memberId is required" }
  }
  const res: LiuRqReturn<Res_OC_GetWeChat> = {
    code: "0000",
  }

  // 1. get user
  const userId = vRes.userData._id
  const uCol = db.collection("User")
  const res1 = await uCol.doc(userId).get<Table_User>()
  const user = res1.data
  if(!user) {
    return { code: "E4004", errMsg: "there is no user" }
  }
  const { 
    wx_gzh_openid,
    ww_qynb_external_userid,
  } = user

  // 2. get member
  const mCol = db.collection("Member")
  const res2 = await mCol.doc(memberId).get<Table_Member>()
  const member = res2.data
  if(!member) {
    return { code: "E4004", errMsg: "there is no memeber" }
  }
  if(member.user !== userId) {
    return { code: "E4003", errMsg: "the member is not yours" }
  }

  // 3. construct response
  const mNoti = member.notification
  const ww_qynb_toggle = mNoti?.ww_qynb_toggle
  const wx_gzh_toggle = mNoti?.wx_gzh_toggle
  const sub3 = user.thirdData?.wx_gzh?.subscribe
  const wx_gzh_subscribed = sub3 ? true : false
  
  res.data = {
    operateType: "get-wechat",
    ww_qynb_external_userid,
    ww_qynb_toggle,
    wx_gzh_openid,
    wx_gzh_toggle,
    wx_gzh_subscribed,
  }
  return res
}


async function handle_bind_wecom(
  vRes: VerifyTokenRes_B,
  body: Record<string, string>,
): Promise<LiuRqReturn<Res_OC_BindWeCom>> {
  // 0. get params
  const userId = vRes.userData._id

  // 1. return directly if ww_qynb_external_userid exists
  const { ww_qynb_external_userid } = vRes.userData
  if(ww_qynb_external_userid) {
    return { code: "Y0001" }
  }

  // 2. checking out memberId
  const memberId = body.memberId
  if(memberId && typeof memberId === "string") {
    const res2 = await checkMember(memberId, userId)
    if(!res2.pass) return res2.err
  }

  // 3. checking out credential
  const cCol = db.collection("Credential")
  const w3: Partial<Table_Credential> = {
    infoType: "bind-wecom",
    userId,
  }
  const q3 = cCol.where(w3).orderBy("expireStamp", "desc").limit(1)
  const res3 = await q3.get<Table_Credential>()
  const list3 = res3.data
  const fir3 = list3[0]

  // 4. checking if expired
  const now4 = getNowStamp()
  const e4 = fir3?.expireStamp ?? 1
  const c4 = fir3?.credential
  const pic_url_4 = fir3?.meta_data?.pic_url
  const diff4 = e4 - now4
  if(diff4 > MINUTE && c4 && pic_url_4) {
    // if the rest of time is enough to bind
    return {
      code: "0000",
      data: {
        operateType: "bind-wecom",
        pic_url: pic_url_4,
        credential: c4,
      },
    }
  }

  // 5. get wecom userid
  const res5 = getWeComBotId()
  const bot_id = res5.data?.bot_id
  if(!bot_id) {
    return res5 as LiuErrReturn
  }

  // 6. get wecom accessToken
  const accessToken = await getWwQynbAccessToken()
  if(!accessToken) {
    return { code: "E5001", errMsg: "wecom accessToken not found" }
  }
  
  
  // 7. generate credential
  const cred = createBindCredential()
  const state = `b1=${cred}`
  const w7 = {
    type: 1,
    scene: 2,
    state,
    user: [bot_id],
  }
  const url7 = new URL(API_WECOM_ADD_CONTACT)
  url7.searchParams.set("access_token", accessToken)
  const link7 = url7.toString()
  const res7 = await liuReq<Ww_Res_Add_Contact_Way>(link7, w7)

  // 8. extract data from wecom
  const res8 = res7.data
  const c8 = res8?.config_id
  const pic_url_8 = res8?.qr_code
  if(!c8 || !pic_url_8) {
    console.log("wecom add contact err7: ")
    console.log("res7: ")
    console.log(res7)

    return {
      code: "E5004",
      errMsg: "wecom config_id or qr_code not found",
    }
  }

  // 9. add credential into db
  const expireStamp = getNowStamp() + MIN_10
  CommonShared.createCredential(userId, expireStamp, "bind-wecom", {
    credential: cred,
    meta_data: {
      memberId,
      pic_url: pic_url_8,
      ww_qynb_config_id: c8,
    }
  })

  return {
    code: "0000",
    data: {
      operateType: "bind-wecom",
      pic_url: pic_url_8,
      credential: cred,
    },
  }
}

function getWeComBotId(): LiuRqReturn {
  const bot_ids = process.env.LIU_WECOM_QYNB_BOT_IDS
  if(!bot_ids) {
    return { code: "E5001", errMsg: "wecom bot_ids not found" }
  }
  const bot_list = bot_ids.split(",")
  const len = bot_list.length
  if(len < 1) {
    return { code: "E5001", errMsg: "getting wecom bot_id fails" }
  }

  const idx = Math.floor(Math.random() * len)
  const bot_id = bot_list[idx]
  if(!bot_id) {
    return { code: "E5001", errMsg: "bot_id is empty" }
  }

  return { code: "0000", data: { bot_id } }
}


async function handle_check_wecom(
  vRes: VerifyTokenRes_B,
  body: Record<string, string>,
) {

  // 0. get params
  const credential = body.credential
  if(!credential || typeof credential !== "string") {
    return { code: "E4000", errMsg: "credential is required" }
  }
  const res: LiuRqReturn<Res_OC_CheckWeCom> = {
    code: "0000",
  }

  // 1. get credential
  const w1 = {
    credential,
    infoType: "bind-wecom",
  }
  const cCol = db.collection("Credential")
  const q1 = cCol.where(w1).orderBy("expireStamp", "desc").limit(1)
  const res1 = await q1.get<Table_Credential>()
  const list1 = res1.data
  const len1 = list1?.length
  if(len1 < 1) {
    res.data = {
      operateType: "check-wecom",
      status: "plz_check",
    }
    return res
  }

  // 2. check out permission
  const d2 = list1[0]
  const _userId = d2.userId
  const userId = vRes.userData._id
  if(_userId !== userId) {
    res.code = "E4003"
    res.errMsg = "permission denied"
    return res
  }

  // 3. check out expiration
  const now3 = getNowStamp()
  if(now3 > d2.expireStamp) {
    res.data = {
      operateType: "check-wecom",
      status: "expired",
    }
    return res
  }

  // 4. return waiting status
  res.data = {
    operateType: "check-wecom",
    status: "waiting",
  }

  return res
}

function getSharedData2(
  vRes: VerifyTokenRes_B,
  returnData: Record<string, any>,
) {
  const res1 = getEncryptedData(returnData, vRes)
  if(res1.rqReturn) return res1.rqReturn
  if(!res1.data) {
    return { code: "E5001", errMsg: "getEncryptedData failed" }
  }
  return {
    code: "0000",
    data: res1.data,
  }
}

async function getSharedData1(
  vRes: VerifyTokenRes_B,
  body: Record<string, any>,
): Promise<DataPass<Table_Workspace>> {
  // 1. checking out memberId
  const userId = vRes.userData._id
  const memberId = body.memberId
  if(!memberId || typeof memberId !== "string") {
    return {
      pass: false,
      err: { code: "E4000", errMsg: "memberId is required" },
    }
  }
  const res1 = await checkMember(memberId, userId)
  if(!res1.pass) return res1
  const member = res1.data

  // 2. get workspace
  const wCol = db.collection("Workspace")
  const res2 = await wCol.doc(member.spaceId).get<Table_Workspace>()
  const space = res2.data
  if(!space || space.oState === "DELETED") {
    return {
      pass: false,
      err: { code: "E4004", errMsg: "workspace not found" }
    }
  }

  return {
    pass: true,
    data: space,
  }
}


async function checkMember(
  memberId: string,
  userId: string,
): Promise<DataPass<Table_Member>> {
  const mCol = db.collection("Member")
  const res2 = await mCol.doc(memberId).get<Table_Member>()
  const d2 = res2.data
  if(!d2) {
    return {
      pass: false,
      err: { code: "E4004", errMsg: "there is no memeber" }
    }
  }
  if(d2.user !== userId) {
    return {
      pass: false,
      err: { code: "E4003", errMsg: "the member is not yours!" },
    }
  }
  return {
    pass: true,
    data: d2,
  }
}
