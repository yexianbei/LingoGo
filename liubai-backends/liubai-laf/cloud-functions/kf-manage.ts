// Function Name: kf-manage
// 微信公众号客服管理

import cloud from "@lafjs/cloud";
import { 
  checkAndGetWxGzhAccessToken,
  liuReq
} from "@/common-util";

// 微信客服接口
const API_KF_LIST = "https://api.weixin.qq.com/cgi-bin/customservice/getkflist";

// 客服信息类型定义
interface KfInfo {
  nickname: string;
  account: string;
  headimgurl?: string;
  status: number;
}

export async function main(ctx: FunctionContext) {
  const { action } = ctx.body || {};
  
  switch(action) {
    case "get_kf_list":
      return await getKfList();
    default:
      return { code: "E4000", errMsg: "Invalid action. Use: get_kf_list" };
  }
}

/**
 * 获取客服账号列表
 */
async function getKfList() {
  try {
    const access_token = await checkAndGetWxGzhAccessToken();
    if (!access_token) {
      return { code: "E4003", errMsg: "无法获取access_token" };
    }

    const url = `${API_KF_LIST}?access_token=${access_token}`;
    const res = await liuReq(url, undefined, { method: "GET" });
    
    if (res.code === "0000" && res.data) {
      const kfList = res.data.kf_list || [];
      
      // 格式化输出，方便配置
      const configInfo: KfInfo[] = kfList.map((kf: any) => ({
        nickname: kf.kf_nick,
        account: kf.kf_account,
        headimgurl: kf.kf_headimgurl,
        status: kf.status
      }));

      console.log("=== 客服账号配置信息 ===");
      configInfo.forEach((kf: KfInfo, index: number) => {
        console.log(`${index + 1}. 昵称: ${kf.nickname}`);
        console.log(`   账号: ${kf.account}`);
        console.log(`   状态: ${kf.status === 1 ? '在线' : '离线'}`);
        console.log("---");
      });

      return {
        code: "0000",
        data: {
          kf_list: configInfo,
          message: "请查看控制台输出的配置信息"
        }
      };
    }

    return { code: "E4004", errMsg: "获取客服列表失败", data: res };
  } catch (error) {
    console.error("获取客服列表出错:", error);
    return { code: "E5000", errMsg: "服务器错误" };
  }
}
