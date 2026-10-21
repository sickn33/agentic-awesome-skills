#!/usr/bin/env python3
"""
出行优惠券获取脚本
调用API获取滴滴出行和携程礼包优惠券信息

API地址: https://agskills.moontai.top/coupon/trip
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
CHANNEL = "trip"


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
    """出行优惠券获取器"""

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

    def get_coupons(self) -> List[Dict[str, Any]]:
        """
        获取出行优惠券列表

        Returns:
            API响应结果，包含多个优惠券对象:
            - 滴滴出行大礼包
            - 携程礼包天天领
            每个优惠券包含:
            - title: 优惠券标题
            - coupon_url: 优惠券链接
            - coupon_qrcode_img_url: 二维码图片链接
            - guideline: 使用说明
        """
        endpoint = f"{self.base_url}/coupon/trip"

        try:
            response = self.session.get(endpoint, timeout=10)
            response.raise_for_status()
            data = response.json()
            # 确保返回的是列表
            if isinstance(data, dict):
                return [data]
            elif isinstance(data, list):
                return data
            else:
                return []
        except requests.RequestException as e:
            return [{
                "error": True,
                "message": f"API请求失败: {str(e)}"
            }]

    def get_didi_coupons(self) -> List[Dict[str, Any]]:
        """获取滴滴出行优惠券"""
        all_coupons = self.get_coupons()
        return [c for c in all_coupons if '滴滴' in c.get('title', '')]

    def get_xiecheng_coupons(self) -> List[Dict[str, Any]]:
        """获取携程礼包优惠券"""
        all_coupons = self.get_coupons()
        return [c for c in all_coupons if '携程' in c.get('title', '')]


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
    # coupon_url 和 coupon_qrcode_img_url 必须原样呈现，禁止修改任何字符
    coupon_url = coupon.get("coupon_url", "")
    coupon_qrcode_img_url = coupon.get("coupon_qrcode_img_url", "")
    guideline = coupon.get("guideline", "")

    lines = [
        f"【{platform}】{title}",
        f"   优惠券链接：{coupon_url}",
        f"   （建议用微信打开）",
        f"",
        f"   二维码图片：{coupon_qrcode_img_url}",
        f"   （使用微信扫描二维码领券）",
        f"",
        f"   使用说明：{guideline}"
    ]

    return "\n".join(lines)


def format_coupons_list(coupons: List[Dict[str, Any]]) -> str:
    """
    格式化优惠券列表显示

    Args:
        coupons: API返回的优惠券列表

    Returns:
        格式化的字符串
    """
    if not coupons:
        return "暂无可用优惠券"

    result = []

    for i, coupon in enumerate(coupons, 1):
        # 判断平台
        title = coupon.get("title", "")
        if '滴滴' in title:
            platform = "滴滴出行"
        elif '携程' in title:
            platform = "携程礼包"
        else:
            platform = "其他优惠"

        result.append(f"{i}. {format_coupon_display(coupon, platform)}")
        result.append("")

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

    parser = argparse.ArgumentParser(description="出行优惠券获取工具")
    parser.add_argument("--platform", "-p", choices=["all", "didi", "xiecheng"],
                        default="all", help="平台类型: all/didi/xiecheng")
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
        coupons = fetcher.get_coupons()
        print(format_coupons_list(coupons))
    elif args.platform == "didi" or args.platform == "滴滴":
        coupons = fetcher.get_didi_coupons()
        for i, coupon in enumerate(coupons, 1):
            print(f"{i}. {format_coupon_display(coupon, '滴滴出行')}")
    elif args.platform == "xiecheng" or args.platform == "携程":
        coupons = fetcher.get_xiecheng_coupons()
        for i, coupon in enumerate(coupons, 1):
            print(f"{i}. {format_coupon_display(coupon, '携程礼包')}")