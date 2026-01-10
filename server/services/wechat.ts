import axios from "axios";

export interface WechatUserInfo {
  openid: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
}

export class WechatService {
  private appId = process.env.WECHAT_APP_ID || "";
  private appSecret = process.env.WECHAT_APP_SECRET || "";
  private redirectUri = process.env.WECHAT_REDIRECT_URI || "";

  /**
   * 生成微信授权 URL
   */
  getAuthorizeUrl(state: string): string {
    const url = new URL("https://open.weixin.qq.com/connect/qrconnect");
    url.searchParams.append("appid", this.appId);
    url.searchParams.append("redirect_uri", this.redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "snsapi_login");
    url.searchParams.append("state", state);
    return `${url.toString()}#wechat_redirect`;
  }

  /**
   * 通过 code 换取 access_token 和 openid
   */
  async getAccessToken(code: string) {
    if (!this.appId || !this.appSecret) {
      // Mock 模式
      console.warn("[WechatService] MOCK MODE: Returning mock openid");
      return {
        access_token: "mock_token",
        openid: `mock_openid_${code}`,
        unionid: `mock_unionid_${code}`
      };
    }

    const response = await axios.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
      params: {
        appid: this.appId,
        secret: this.appSecret,
        code,
        grant_type: "authorization_code"
      }
    });

    if (response.data.errcode) {
      throw new Error(`WeChat Auth Error: ${response.data.errmsg}`);
    }

    return response.data;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
    if (accessToken === "mock_token") {
      return { openid, nickname: "微信用户" };
    }

    const response = await axios.get("https://api.weixin.qq.com/sns/userinfo", {
      params: {
        access_token: accessToken,
        openid,
        lang: "zh_CN"
      }
    });

    return response.data;
  }
}

export const wechatService = new WechatService();
