// Function Name: menu-manage
// WeChat Official Account Menu Management - Simplified Version
// 微信公众号自定义菜单管理 - 简化版本

import cloud from "@lafjs/cloud";
import type { 
  LiuRqReturn,
  Res_Common,
} from "@/common-types";
import { 
  checkAndGetWxGzhAccessToken,
  liuReq
} from "@/common-util";

// WeChat Menu API
const API_MENU_CREATE = "https://api.weixin.qq.com/cgi-bin/menu/create";
const API_MENU_GET = "https://api.weixin.qq.com/cgi-bin/menu/get";
const API_MENU_DELETE = "https://api.weixin.qq.com/cgi-bin/menu/delete";

/*********** 菜单配置区域 - 在这里修改菜单内容 ***********/

/**
 * 微信公众号菜单配置
 * 📝 修改说明：
 * 1. 主页链接：修改 HOMEPAGE_URL
 * 2. 菜单名称：修改 name 字段  
 * 3. 菜单功能：修改 type、url、key 字段
 * 4. 环境变量：{LIU_CUSTOMER_SERVICE} 会自动替换为实际的客服链接
 */

// 🏠 主页链接配置
const HOMEPAGE_URL = "https://shanji.online";

// 🎯 菜单结构配置
const MENU_CONFIG = {
  button: [
    {
      // 🏠 主页按钮
      name: "🏠 主页",
      type: "view",                    // view = 跳转链接
      url: HOMEPAGE_URL
    },
    {
      // 📱 更多功能菜单（包含子菜单）
      name: "📱 更多",
      sub_button: [
        {
          // 👨‍💻 联系客服 - 跳转到微信客服
          name: "👨‍💻 联系客服",
          type: "view",                // view = 跳转链接
          url: "{LIU_CUSTOMER_SERVICE}" // 环境变量，发布时自动替换
        },
        {
          // 🔗 绑定微信 - 复用现有功能
          name: "🔗 绑定微信", 
          type: "click",               // click = 点击事件
          key: "wechat-bind-app"       // 复用现有的事件处理逻辑
        }
        // ,
        // {
        //   // 📖 使用指南 - 复用现有功能（原名：指路牌）
        //   name: "📖 使用指南",
        //   type: "click",               // click = 点击事件
        //   key: "guidebook"             // 复用现有的事件处理逻辑
        // }
      ]
    }
  ]
};

/*********** 以下为功能实现代码，一般不需要修改 ***********/

export async function main(ctx: FunctionContext) {
  const { action } = ctx.body || {};
  
  switch(action) {
    case "publish":
      return await publishMenuToWechat();
    case "get_current":
      return await getCurrentMenuFromWechat();
    case "delete":
      return await deleteMenuFromWechat();
    default:
      return { code: "E4000", errMsg: "Invalid action. Use: publish, get_current, delete" };
  }
}

/**
 * 🚀 发布菜单到微信公众平台
 * 直接使用代码中的 MENU_CONFIG 配置
 */
async function publishMenuToWechat(): Promise<LiuRqReturn> {
  try {
    // 1. 获取微信访问令牌
    const accessToken = await checkAndGetWxGzhAccessToken();
    if (!accessToken) {
      return { code: "E5001", errMsg: "Failed to get WeChat access token" };
    }

    // 2. 验证菜单配置
    const validation = validateMenuConfig(MENU_CONFIG);
    if (!validation.isValid) {
      return { code: "E4000", errMsg: `Menu config validation failed: ${validation.error}` };
    }

    // 3. 转换为微信API格式并替换环境变量
    const wechatMenuData = convertToWechatFormat(MENU_CONFIG);

    // 4. 调用微信API创建菜单
    const url = `${API_MENU_CREATE}?access_token=${accessToken}`;
    const result = await liuReq<Res_Common>(url, wechatMenuData);
    
    if (result.code !== "0000" || !result.data) {
      return { code: "E5002", errMsg: "Failed to call WeChat API", data: result };
    }

    const wechatRes = result.data;
    if (wechatRes.errcode !== 0) {
      return { 
        code: "E5003", 
        errMsg: `WeChat API error: ${wechatRes.errmsg}`, 
        data: wechatRes 
      };
    }

    return { 
      code: "0000", 
      data: { 
        message: "Menu published successfully! 菜单发布成功！",
        publishedAt: new Date().toISOString(),
        menuConfig: MENU_CONFIG, // 返回当前使用的配置
        wechatResponse: wechatRes
      } 
    };

  } catch (err) {
    console.error("Error in publishMenuToWechat:", err);
    return { code: "E5000", errMsg: "Internal server error" };
  }
}

/**
 * 📋 从微信获取当前菜单
 */
async function getCurrentMenuFromWechat(): Promise<LiuRqReturn> {
  try {
    const accessToken = await checkAndGetWxGzhAccessToken();
    if (!accessToken) {
      return { code: "E5001", errMsg: "Failed to get WeChat access token" };
    }

    const url = `${API_MENU_GET}?access_token=${accessToken}`;
    const result = await liuReq<any>(url, undefined, { method: "GET" });
    
    if (result.code !== "0000") {
      return { code: "E5002", errMsg: "Failed to call WeChat API", data: result };
    }

    return { code: "0000", data: result.data };

  } catch (err) {
    console.error("Error in getCurrentMenuFromWechat:", err);
    return { code: "E5000", errMsg: "Internal server error" };
  }
}

/**
 * 🗑️ 删除微信菜单
 */
async function deleteMenuFromWechat(): Promise<LiuRqReturn> {
  try {
    const accessToken = await checkAndGetWxGzhAccessToken();
    if (!accessToken) {
      return { code: "E5001", errMsg: "Failed to get WeChat access token" };
    }

    const url = `${API_MENU_DELETE}?access_token=${accessToken}`;
    const result = await liuReq<Res_Common>(url, {}, { method: "GET" });
    
    if (result.code !== "0000" || !result.data) {
      return { code: "E5002", errMsg: "Failed to call WeChat API", data: result };
    }

    const wechatRes = result.data;
    if (wechatRes.errcode !== 0) {
      return { 
        code: "E5003", 
        errMsg: `WeChat API error: ${wechatRes.errmsg}`, 
        data: wechatRes 
      };
    }

    return { 
      code: "0000", 
      data: { 
        message: "Menu deleted successfully! 菜单删除成功！",
        deletedAt: new Date().toISOString(),
        wechatResponse: wechatRes
      } 
    };

  } catch (err) {
    console.error("Error in deleteMenuFromWechat:", err);
    return { code: "E5000", errMsg: "Internal server error" };
  }
}

/**
 * 🔍 菜单配置验证
 */

function validateMenuConfig(menuConfig: any): { isValid: boolean; error?: string } {
  if (!menuConfig || !menuConfig.button) {
    return { isValid: false, error: "Menu config must have button array" };
  }

  if (menuConfig.button.length === 0 || menuConfig.button.length > 3) {
    return { isValid: false, error: "Menu must have 1-3 top level buttons" };
  }

  for (let i = 0; i < menuConfig.button.length; i++) {
    const button = menuConfig.button[i];
    const validation = validateMenuButton(button, 1);
    if (!validation.isValid) {
      return { isValid: false, error: `Button ${i + 1}: ${validation.error}` };
    }
  }

  return { isValid: true };
}

function validateMenuButton(button: any, level: number): { isValid: boolean; error?: string } {
  if (!button.name || button.name.length === 0) {
    return { isValid: false, error: "Button name is required" };
  }

  if (button.name.length > 16) {
    return { isValid: false, error: "Button name cannot exceed 16 characters" };
  }

  // 一级菜单检查
  if (level === 1) {
    // 如果有子菜单
    if (button.sub_button && button.sub_button.length > 0) {
      if (button.sub_button.length > 5) {
        return { isValid: false, error: "Sub menu cannot have more than 5 buttons" };
      }
      
      // 有子菜单时不能有type、key、url等属性
      if (button.type || button.key || button.url) {
        return { isValid: false, error: "Button with sub_button cannot have type, key, or url" };
      }

      // 验证子菜单
      for (let i = 0; i < button.sub_button.length; i++) {
        const subButton = button.sub_button[i];
        const validation = validateMenuButton(subButton, 2);
        if (!validation.isValid) {
          return { isValid: false, error: `Sub button ${i + 1}: ${validation.error}` };
        }
      }
    } else {
      // 没有子菜单时必须有操作
      if (!button.type) {
        return { isValid: false, error: "Button without sub_button must have type" };
      }
    }
  }

  // 二级菜单检查
  if (level === 2) {
    if (button.sub_button && button.sub_button.length > 0) {
      return { isValid: false, error: "Sub button cannot have further sub buttons" };
    }
    
    if (!button.type) {
      return { isValid: false, error: "Sub button must have type" };
    }
  }

  // 类型检查
  if (button.type) {
    if (!["click", "view", "miniprogram"].includes(button.type)) {
      return { isValid: false, error: "Button type must be click, view, or miniprogram" };
    }

    if (button.type === "click" && !button.key) {
      return { isValid: false, error: "Click button must have key" };
    }

    if (button.type === "view" && !button.url) {
      return { isValid: false, error: "View button must have url" };
    }

    if (button.type === "miniprogram" && (!button.appid || !button.pagepath)) {
      return { isValid: false, error: "Miniprogram button must have appid and pagepath" };
    }
  }

  return { isValid: true };
}

/**
 * 🔄 转换为微信API格式并替换环境变量
 */
function convertToWechatFormat(menuConfig: any): any {
  return {
    button: menuConfig.button.map((button: any) => convertButtonToWechatFormat(button))
  };
}

function convertButtonToWechatFormat(button: any): any {
  const wechatButton: any = {
    name: button.name
  };

  // 如果有子菜单
  if (button.sub_button && button.sub_button.length > 0) {
    wechatButton.sub_button = button.sub_button.map((sub: any) => convertButtonToWechatFormat(sub));
  } else {
    // 没有子菜单，添加操作属性
    if (button.type) {
      wechatButton.type = button.type;
    }
    if (button.key) {
      wechatButton.key = button.key;
    }
    if (button.url) {
      // 替换环境变量
      wechatButton.url = replaceEnvVariables(button.url);
    }
    if (button.appid) {
      wechatButton.appid = button.appid;
    }
    if (button.pagepath) {
      wechatButton.pagepath = button.pagepath;
    }
  }

  return wechatButton;
}

/**
 * 替换字符串中的环境变量
 */
function replaceEnvVariables(text: string): string {
  if (!text) return text;
  
  const _env = process.env;
  
  // 替换常用的环境变量
  const replacements: Record<string, string> = {
    '{LIU_CUSTOMER_SERVICE}': _env.LIU_CUSTOMER_SERVICE || '',
    '{LIU_DOMAIN}': _env.LIU_DOMAIN || '',
    '{LIU_DOCS_DOMAIN}': _env.LIU_DOCS_DOMAIN || '',
  };
  
  let result = text;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return result;
}

/**
 * 🔍 根据 key 查找菜单按钮配置（用于webhook事件处理）
 */
export async function findMenuButtonByKey(key: string): Promise<any | null> {
  try {
    return findButtonInConfig(MENU_CONFIG.button, key);
  } catch (err) {
    console.error("Error finding menu button by key:", err);
    return null;
  }
}

/**
 * 在菜单配置中递归查找按钮
 */
function findButtonInConfig(buttons: any[], key: string): any | null {
  for (const button of buttons) {
    if (button.key === key) {
      return button;
    }
    
    if (button.sub_button && button.sub_button.length > 0) {
      const found = findButtonInConfig(button.sub_button, key);
      if (found) return found;
    }
  }
  
  return null;
}
