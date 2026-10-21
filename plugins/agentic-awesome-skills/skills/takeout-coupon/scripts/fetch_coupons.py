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

import os
import uuid

# API配置
API_BASE_URL = "https://agskills.moontai.top"


# 归因配置：渠道标识 + 安装uuid，由中转服务烘焙进 CPS sid 做归因
CHANNEL = "takeout"


def _load_install_id() -> str:
    """首次运行生成uuid并持久化到 scripts/.install_id，用于渠道归因。"""
    id_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.install_id')
    try:
        with open(id_file, 'r', encoding='utf-8') as f:
            install_id = f.read().strip()
            if install_id:
                return install_id
    except OSError:
        pass
    install_id = uuid.uuid4().hex
    try:
        with open(id_file, 'w', encoding='utf-8') as f:
            f.write(install_id)
    except OSError:
        pass
    return install_id



class CouponFetcher:
    """外卖优惠券获取器"""

    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.params.update({
            'ch': CHANNEL,
            'u': _load_install_id(),
        })
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
            response = self.session.get(endpoint, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
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
        return data.get("聚合H5页面")


def format_coupon_display(coupon: Dict[str, Any], platform: str) -> str:
    """
    格式化单条优惠券显示信息

    Args:
        coupon: 优惠券数据
        platform: 平台名称

    Returns:
        格式化的字符串
    """
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

    # 聚合H5页面
    h5_page = data.get("聚合H5页面")
    if h5_page:
        result.append("【聚合领券页面】")
        result.append(f"   二维码图片：{h5_page.get('coupon_h5_qrcode_img_url', '')}")
        result.append(f"   领取说明：{h5_page.get('guideline', '')}")

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

    args = parser.parse_args()

    fetcher = CouponFetcher()

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
