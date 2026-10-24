#!/usr/bin/env python3
"""
快递优惠券获取脚本
调用API获取各平台快递优惠券信息

API地址: https://agskills.moontai.top/coupon/parcel
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
CHANNEL = "parcel"


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
    """快递优惠券获取器"""

    def __init__(self, base_url: str = API_BASE_URL, attribution: bool = False):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        if attribution:
            self.session.params.update({
                'ch': CHANNEL,
                'u': _load_install_id(),
            })
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'XiaFan-CouponFetcher/2.0'
        })

    def get_coupons(self) -> Any:
        """
        获取快递优惠券列表

        Returns:
            API响应结果，包含以下字段:
            - title: 优惠券标题
            - coupon_url: 优惠券链接
            - coupon_qrcode_img_url: 优惠券二维码图片URL
            - guideline: 使用说明
        """
        endpoint = f"{self.base_url}/coupon/parcel"

        try:
            response = self.session.get(endpoint, timeout=10)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
                return {"error": True, "message": "Unexpected coupon response shape"}
            return data
        except (requests.RequestException, ValueError) as e:
            return {
                "error": True,
                "message": f"API请求失败: {str(e)}"
            }

    def get_coupon_info(self) -> Any:
        """获取优惠券信息"""
        return self.get_coupons()


def format_coupon_display(data: Dict[str, Any]) -> str:
    """
    格式化优惠券显示信息

    Args:
        data: API返回的优惠券数据

    Returns:
        格式化的字符串
    """
    title = data.get("title", "快递优惠券")
    coupon_url = data.get("coupon_url", "")
    coupon_qrcode_img_url = data.get("coupon_qrcode_img_url", "")
    guideline = data.get("guideline", "")

    lines = [
        "【快递优惠券】",
        f"",
        f"标题: {title}",
        f"",
        f"优惠券链接: {coupon_url}",
        f"（建议用微信打开）",
        f"",
        f"二维码图片: {coupon_qrcode_img_url}",
        f"（使用微信扫描二维码下单，单单享优惠）",
        f"",
        f"使用说明: {guideline}"
    ]

    return "\n".join(lines)


def format_coupons_list(data: Any) -> str:
    """
    格式化优惠券列表显示

    Args:
        data: API返回的完整数据

    Returns:
        格式化的字符串
    """
    if isinstance(data, dict) and data.get("error"):
        return f"获取失败: {data.get('message', '未知错误')}"
    if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
        return "Unexpected coupon response shape"
    return "\n\n".join(format_coupon_display(item) for item in data)


# 主函数 - 支持命令行调用

def terminal_safe(value):
    import unicodedata
    return ''.join(f"\\u{ord(c):04x}" if unicodedata.category(c) in {'Cc', 'Cf'} and c not in '\n\t' else c for c in str(value))

_raw_print = print
def print(*values, **kwargs):
    _raw_print(*(terminal_safe(value) for value in values), **kwargs)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="快递优惠券获取工具")
    parser.add_argument("--json", "-j", action="store_true",
                        help="输出原始JSON数据")

    parser.add_argument("--attribution", action="store_true",
                        help="Opt in to persistent affiliate/install attribution")
    args = parser.parse_args()

    fetcher = CouponFetcher(attribution=args.attribution)

    if args.json:
        # 输出原始JSON
        result = fetcher.get_coupons()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        # 输出格式化后的信息
        result = fetcher.get_coupons()
        print(format_coupons_list(result))
