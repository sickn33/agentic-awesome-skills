#!/usr/bin/env python3
"""
外卖优惠券获取脚本
调用API获取各平台外卖优惠券信息

API地址: https://agskills.moontai.top/coupon/takeout
"""

import sys
import json
import requests
from typing import Optional, Dict, List, Any


# API配置
API_BASE_URL = "https://agskills.moontai.top"


# Attribution is optional and does not create a persistent installation ID.
CHANNEL = 'takeout'


class CouponFetcher:
    """外卖优惠券获取器"""

    def __init__(self, base_url: str = API_BASE_URL, attribution: bool = False):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        if attribution:
            self.session.params.update({'ch': CHANNEL})
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'XiaFan-CouponFetcher/2.0'
        })

    def get_coupons(self) -> Dict[str, Any]:
        """
        获取外卖优惠券列表

        Returns:
            API响应结果，包含以下字段:
            - 美团隐藏外卖券列表
            - 饿了么/淘宝闪购隐藏外卖券列表
            - 京东隐藏外卖券列表
            - 聚合H5页面
        """
        endpoint = f"{self.base_url}/coupon/takeout"

        try:
            response = self.session.get(endpoint, timeout=10, allow_redirects=False)
            if 300 <= response.status_code < 400:
                raise ValueError("Unexpected redirect; no automatic follow")
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise ValueError("Expected an object")
            for key in ["美团隐藏外卖券列表", "饿了么/淘宝闪购隐藏外卖券列表", "京东隐藏外卖券列表", "扫码领取/H5网页跳转领取"]:
                if key in data and (not isinstance(data[key], list) or any(not isinstance(item, dict) for item in data[key])):
                    raise ValueError("Invalid coupon list")
            return data
        except (requests.RequestException, ValueError) as e:
            return {
                "error": True,
                "message": f"API请求失败: {str(e)}"
            }

    def get_meituan_coupons(self) -> List[Dict[str, Any]]:
        """获取美团外卖优惠券"""
        data = self.get_coupons()
        if "error" in data:
            return []
        return data.get("美团隐藏外卖券列表", [])

    def get_eleme_coupons(self) -> List[Dict[str, Any]]:
        """获取饿了么/淘宝闪购优惠券"""
        data = self.get_coupons()
        if "error" in data:
            return []
        return data.get("饿了么/淘宝闪购隐藏外卖券列表", [])

    def get_jd_coupons(self) -> List[Dict[str, Any]]:
        """获取京东外卖优惠券"""
        data = self.get_coupons()
        if "error" in data:
            return []
        return data.get("京东隐藏外卖券列表", [])

    def get_h5_page(self) -> Optional[Dict[str, Any]]:
        """获取聚合H5页面信息"""
        data = self.get_coupons()
        if "error" in data:
            return None
        return data.get("扫码领取/H5网页跳转领取")


def display_url(value):
    from urllib.parse import urlsplit
    if not isinstance(value, str) or any(ord(c) < 33 for c in value):
        return "[invalid link omitted]"
    try:
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            return "[invalid link omitted]"
    except ValueError:
        return "[invalid link omitted]"
    return value


def format_coupon_display(coupon: Dict[str, Any], platform: str) -> str:
    """
    格式化单条优惠券显示信息

    Args:
        coupon: 优惠券数据
        platform: 平台名称

    Returns:
        格式化的字符串
    """
    if coupon.get("error"):
        return "获取失败: " + str(coupon.get("message", "未知错误"))
    title = coupon.get("title", "优惠券")
    # coupon_code 必须原样呈现，禁止修改任何字符
    coupon_code = coupon.get("coupon_code", "")
    guideline = coupon.get("guideline", "")

    lines = [
        f"【{platform}】{title}",
        f"   优惠券代码：{coupon_code}",
        f"   领取说明：{guideline}"
    ]

    return "\n".join(lines)


def format_coupons_list(data: Dict[str, Any]) -> str:
    """
    格式化优惠券列表显示

    Args:
        data: API返回的完整数据

    Returns:
        格式化的字符串
    """
    if "error" in data:
        return f"获取失败: {data.get('message', '未知错误')}"

    result = []

    # 美团优惠券
    meituan_list = data.get("美团隐藏外卖券列表", [])
    if meituan_list:
        result.append("【美团外卖】")
        for i, coupon in enumerate(meituan_list, 1):
            result.append(f"{i}. {format_coupon_display(coupon, '美团')}")
            result.append("")
        result.append("")

    # 饿了么/淘宝闪购优惠券
    eleme_list = data.get("饿了么/淘宝闪购隐藏外卖券列表", [])
    if eleme_list:
        result.append("【淘宝闪购/饿了么】")
        for i, coupon in enumerate(eleme_list, 1):
            result.append(f"{i}. {format_coupon_display(coupon, '淘宝闪购')}")
            result.append("")
        result.append("")

    # 京东优惠券
    jd_list = data.get("京东隐藏外卖券列表", [])
    if jd_list:
        result.append("【京东外卖】")
        for i, coupon in enumerate(jd_list, 1):
            result.append(f"{i}. {format_coupon_display(coupon, '京东')}")
            result.append("")
        result.append("")

    for page in data.get("扫码领取/H5网页跳转领取", []):
        result.append(str(page.get("title", "领取页面")))
        result.append(display_url(page.get("coupon_url", "")))
        result.append(display_url(page.get("coupon_qrcode_img_url", "")))
        result.append(str(page.get("guideline", "")))

    return "\n".join(result)


# 主函数 - 支持命令行调用

def terminal_safe(value):
    import unicodedata
    return ''.join(f"\\u{ord(c):04x}" if unicodedata.category(c) in {'Cc', 'Cf'} and c not in '\n\t' else c for c in str(value))

_raw_print = print
def print(*values, **kwargs):
    _raw_print(*(terminal_safe(value) for value in values), **kwargs)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="外卖优惠券获取工具")
    parser.add_argument("--platform", "-p", choices=["all", "meituan", "eleme", "jd"],
                        default="all", help="平台类型: all/meituan/eleme/jd")
    parser.add_argument("--json", "-j", action="store_true",
                        help="输出原始JSON数据")

    parser.add_argument("--attribution", action="store_true", help="Opt in to channel attribution; no installation identifier")
    args = parser.parse_args()

    fetcher = CouponFetcher(attribution=args.attribution)

    if args.json:
        # 输出原始JSON
        result = fetcher.get_coupons()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif args.platform == "all" or args.platform == "全部":
        # 输出格式化后的列表
        result = fetcher.get_coupons()
        print(format_coupons_list(result))
    elif args.platform == "meituan" or args.platform == "美团":
        coupons = fetcher.get_meituan_coupons()
        for i, coupon in enumerate(coupons, 1):
            print(f"{i}. {format_coupon_display(coupon, '美团')}")
    elif args.platform == "eleme" or args.platform == "饿了么" or args.platform == "淘宝闪购":
        coupons = fetcher.get_eleme_coupons()
        for i, coupon in enumerate(coupons, 1):
            print(f"{i}. {format_coupon_display(coupon, '淘宝闪购')}")
    elif args.platform == "jd" or args.platform == "京东":
        coupons = fetcher.get_jd_coupons()
        for i, coupon in enumerate(coupons, 1):
            print(f"{i}. {format_coupon_display(coupon, '京东')}")
