// Function Name: product-manage

// 产品管理相关接口
import cloud from '@lafjs/cloud'
import type {
  LiuRqReturn,
  Table_Product,
  ProductManagementAPI,
  UserProductsAPI,
  Table_User,
  UserProductAccess,
} from "@/common-types"
import { getNowStamp } from "@/common-time"
import { getDocAddId } from "@/common-util"
import * as vbot from "valibot"

const db = cloud.database()

export async function main(ctx: FunctionContext) {
  const body = ctx.request?.body ?? {}
  const operateType = body.operateType as string

  let res: LiuRqReturn = { code: "E4000" }
  
  if(operateType === "get_product") {
    res = await handle_get_product(body)
  }
  else if(operateType === "create_product") {
    res = await handle_create_product(body)
  }
  else if(operateType === "get_user_products") {
    res = await handle_get_user_products(body)
  }
  else if(operateType === "switch_product") {
    res = await handle_switch_product(body)
  }

  return res
}

// 获取产品信息
async function handle_get_product(
  body: ProductManagementAPI.Param_GetProducts
): Promise<LiuRqReturn<ProductManagementAPI.Res_GetProducts>> {
  
  const { product_id } = body as any
  if(!product_id) {
    return { code: "E4000", errMsg: "product_id is required" }
  }

  try {
    const pCol = db.collection("Product")
    const res = await pCol.where({ product_id }).get<Table_Product>()
    
    const product = res.data[0]
    if(!product) {
      return { code: "E4004", errMsg: "product not found" }
    }

    return {
      code: "0000",
      data: {
        operateType: "get_products",
        products: [{
          product_id: product.product_id,
          product_name: product.product_name,
          domain: product.domain || "",
          status: product.status,
          features: []
        }]
      }
    }
  } catch (err) {
    console.error("get_product error:", err)
    return { code: "E5001", errMsg: "database error" }
  }
}

// 创建产品
async function handle_create_product(
  body: ProductManagementAPI.Param_CreateProduct
): Promise<LiuRqReturn<ProductManagementAPI.Res_CreateProduct>> {
  
  const { product_id, product_name, domain, oauth_config, limits } = body
  
  if(!product_id || !product_name) {
    return { code: "E4000", errMsg: "product_id and product_name are required" }
  }

  try {
    // 检查产品ID是否已存在
    const pCol = db.collection("Product")
    const existRes = await pCol.where({ product_id }).get<Table_Product>()
    if(existRes.data.length > 0) {
      return { code: "E4001", errMsg: "product_id already exists" }
    }

    // 创建产品记录
    const now = getNowStamp()
    const newProductData = {
      product_id,
      product_name,
      domain,
      theme: {
        primary_color: "#1976d2",
        secondary_color: "#424242"
      },
      oauth_config: oauth_config || {},
      limits: limits || {
        max_users: 1000,
        max_workspaces: 10,
        storage_limit: 1024000
      },
      status: "active" as const,
      owner: "", // TODO: 从token中获取当前用户ID
      insertedStamp: now,
      updatedStamp: now,
    }

    const addRes = await pCol.add(newProductData)
    const productId = getDocAddId(addRes)
    if(!productId) {
      return { code: "E5001", errMsg: "failed to create product" }
    }

    const newProduct: Table_Product = {
      _id: productId,
      ...newProductData
    }

    return {
      code: "0000",
      data: {
        operateType: "create_product",
        product: {
          product_id: newProduct.product_id,
          product_name: newProduct.product_name,
          domain: newProduct.domain || "",
          status: newProduct.status,
          features: []
        }
      }
    }
  } catch (err) {
    console.error("create_product error:", err)
    return { code: "E5001", errMsg: "database error" }
  }
}

// 获取用户可访问的产品列表
async function handle_get_user_products(
  body: UserProductsAPI.Param_GetUserProducts
): Promise<LiuRqReturn<UserProductsAPI.Res_GetUserProducts>> {
  
  const { user_id } = body as any
  if(!user_id) {
    return { code: "E4000", errMsg: "user_id is required" }
  }

  try {
    // 获取用户信息
    const uCol = db.collection("User")
    const userRes = await uCol.doc(user_id).get<Table_User>()
    const user = userRes.data
    if(!user) {
      return { code: "E4004", errMsg: "user not found" }
    }

    const products = user.products || []
    
    // 获取产品详细信息
    const pCol = db.collection("Product")
    const productDetails = []
    
    for(const productAccess of products) {
      const productRes = await pCol.where({ 
        product_id: productAccess.product_id 
      }).get<Table_Product>()
      
      const product = productRes.data[0]
      if(product) {
        productDetails.push({
          product_id: product.product_id,
          product_name: product.product_name,
          role: productAccess.role,
          last_access: productAccess.joined_at,
          permissions: productAccess.permissions
        })
      }
    }

    return {
      code: "0000",
      data: {
        operateType: "get_user_products",
        products: productDetails,
        default_product: user.default_product
      }
    }
  } catch (err) {
    console.error("get_user_products error:", err)
    return { code: "E5001", errMsg: "database error" }
  }
}

// 切换用户当前产品
async function handle_switch_product(
  body: UserProductsAPI.Param_SwitchProduct
): Promise<LiuRqReturn<UserProductsAPI.Res_SwitchProduct>> {
  
  const { product_id } = body
  const { user_id } = body as any // TODO: 从token中获取用户ID
  
  if(!user_id || !product_id) {
    return { code: "E4000", errMsg: "user_id and product_id are required" }
  }

  try {
    // 检查用户是否有访问该产品的权限
    const uCol = db.collection("User")
    const userRes = await uCol.doc(user_id).get<Table_User>()
    const user = userRes.data
    if(!user) {
      return { code: "E4004", errMsg: "user not found" }
    }

    const products = user.products || []
    const productAccess = products.find(p => p.product_id === product_id)
    if(!productAccess) {
      return { code: "E4003", errMsg: "no access to this product" }
    }

    // 更新用户的最后使用产品
    const now = getNowStamp()
    await uCol.doc(user_id).update({
      last_product: product_id,
      updatedStamp: now
    })

    // 获取产品信息
    const pCol = db.collection("Product")
    const productRes = await pCol.where({ product_id }).get<Table_Product>()
    const product = productRes.data[0]

    return {
      code: "0000",
      data: {
        operateType: "switch_product",
        product: {
          product_id,
          product_name: product?.product_name || "",
          role: productAccess.role,
          permissions: productAccess.permissions
        },
        token: "", // TODO: 生成新的token
        workspaces: [] // TODO: 获取该产品下的工作空间
      }
    }
  } catch (err) {
    console.error("switch_product error:", err)
    return { code: "E5001", errMsg: "database error" }
  }
}