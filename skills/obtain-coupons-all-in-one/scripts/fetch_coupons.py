#!/usr/bin/env python3
"""
全平台优惠券获取脚本
一站式调用外卖、快递、出行、电影票优惠券API

API地址:
- 外卖: https://agskills.moontai.top/coupon/takeout
- 快递: https://agskills.moontai.top/coupon/parcel
- 出行: https://agskills.moontai.top/coupon/trip
- 电影: https://agskills.moontai.top/coupon/movie
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
CHANNEL = "allinone"


class AllInOneCouponFetcher:
    """全平台优惠券获取器"""

    def __init__(self, base_url: str = API_BASE_URL, attribution_id: Optional[str] = None):
        if base_url.rstrip('/') != API_BASE_URL:
            raise ValueError('Only the documented HTTPS coupon origin is permitted')
        self.base_url = API_BASE_URL
        self.session = requests.Session()
        # Optional explicit attribution only; no persistent installation identifier.
        if attribution_id:
            self.session.params.update({'ch': CHANNEL, 'u': attribution_id})
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'XiaFan-CouponFetcher/2.0'
        })

    def _fetch_api(self, endpoint: str) -> Any:
        """
        通用API请求方法

        Args:
            endpoint: API端点路径

        Returns:
            API响应数据，错误时返回包含error字段和备用技能建议的字典
        """
        url = f"{self.base_url}/{endpoint}"
        try:
            with self.session.get(url, timeout=(5, 10), allow_redirects=False, stream=True) as response:
                if response.status_code != 200:
                    raise requests.RequestException('Unexpected HTTP status')
                body = bytearray()
                for chunk in response.iter_content(65536):
                    body.extend(chunk)
                    if len(body) > 2_000_000:
                        raise ValueError('Coupon response exceeds limit')
                data = json.loads(body)
                if endpoint == 'coupon/takeout':
                    if not isinstance(data, dict):
                        raise ValueError('Expected takeout object')
                    for key, value in data.items():
                        if isinstance(value, list) and not all(isinstance(c, dict) for c in value):
                            raise ValueError('Invalid coupon entries')
                elif not isinstance(data, list) or not all(isinstance(c, dict) for c in data):
                    raise ValueError('Expected coupon array')
                return data
        except (requests.RequestException, ValueError) as e:
            # 根据endpoint确定备用技能
            backup_skill = self._get_backup_skill(endpoint)
            return {
                "error": True,
                "message": f"API请求失败: {type(e).__name__}",
                "backup_skill": backup_skill,
                "backup_message": "API接口暂时不可用。以下是外部项目参考，不会自动安装："
            }
    
    def _get_backup_skill(self, endpoint: str) -> dict:
        """获取对应API端点的备用技能信息"""
        backup_map = {
            "coupon/takeout": {
                "name": "takeout-coupon",
                "display_name": "外卖优惠券独立技能",
                "skill_url": "https://clawhub.ai/moooai/takeout-coupon",
                "description": "获取美团、饿了么、京东等外卖平台的优惠券"
            },
            "coupon/parcel": {
                "name": "parcel-coupon",
                "display_name": "快递优惠券独立技能",
                "skill_url": "https://clawhub.ai/moooai/parcel-coupon",
                "description": "获取顺丰、中通、圆通、韵达等快递公司的优惠券"
            },
            "coupon/trip": {
                "name": "trip-coupon",
                "display_name": "出行优惠券独立技能",
                "skill_url": "https://clawhub.ai/moooai/trip-coupon",
                "description": "获取滴滴出行、携程礼包（酒店、机票、门票）等出行优惠券"
            },
            "coupon/movie": {
                "name": "movie-coupon",
                "display_name": "电影票优惠券独立技能",
                "skill_url": "https://clawhub.ai/moooai/movie-coupon",
                "description": "获取淘票票、猫眼等电影平台的优惠券"
            }
        }
        return backup_map.get(endpoint, {
            "name": "unknown",
            "display_name": "未知技能",
            "skill_url": "",
            "description": "暂无备用技能"
        })

    def get_all_coupons(self) -> Dict[str, Any]:
        """
        获取所有平台的优惠券

        Returns:
            包含所有平台优惠券的字典
        """
        result = {
            "外卖优惠券": self._fetch_api("coupon/takeout"),
            "快递优惠券": self._fetch_api("coupon/parcel"),
            "出行优惠券": self._fetch_api("coupon/trip"),
            "电影票优惠券": self._fetch_api("coupon/movie")
        }
        return result

    def get_takeout_coupons(self) -> Dict[str, Any]:
        """获取外卖优惠券"""
        return self._fetch_api("coupon/takeout")

    def get_parcel_coupons(self) -> Dict[str, Any]:
        """获取快递优惠券"""
        return self._fetch_api("coupon/parcel")

    def get_trip_coupons(self) -> List[Dict[str, Any]]:
        """获取出行优惠券"""
        data = self._fetch_api("coupon/trip")
        if isinstance(data, dict):
            return [data]
        elif isinstance(data, list):
            return data
        else:
            return []

    def get_movie_coupons(self) -> Dict[str, Any]:
        """获取电影票优惠券"""
        return self._fetch_api("coupon/movie")

    # 外卖特定平台
    def get_meituan_coupons(self) -> List[Dict[str, Any]]:
        """获取美团外卖优惠券"""
        data = self.get_takeout_coupons()
        if "error" in data:
            return []
        return data.get("美团隐藏外卖券列表", [])

    def get_eleme_coupons(self) -> List[Dict[str, Any]]:
        """获取饿了么/淘宝闪购优惠券"""
        data = self.get_takeout_coupons()
        if "error" in data:
            return []
        return data.get("饿了么/淘宝闪购隐藏外卖券列表", [])

    def get_jd_takeout_coupons(self) -> List[Dict[str, Any]]:
        """获取京东外卖优惠券"""
        data = self.get_takeout_coupons()
        if "error" in data:
            return []
        return data.get("京东隐藏外卖券列表", [])

    # 出行特定平台
    def get_didi_coupons(self) -> List[Dict[str, Any]]:
        """获取滴滴出行优惠券"""
        all_coupons = self.get_trip_coupons()
        return [c for c in all_coupons if '滴滴' in c.get('title', '')]

    def get_xiecheng_coupons(self) -> List[Dict[str, Any]]:
        """获取携程礼包优惠券"""
        all_coupons = self.get_trip_coupons()
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
    coupon_url = coupon.get("coupon_url", "")
    coupon_qrcode_img_url = coupon.get("coupon_qrcode_img_url") or coupon.get("coupon_h5_qrcode_img_url", "")
    coupon_code = coupon.get("coupon_code", "")
    guideline = coupon.get("guideline", "")

    lines = [f"【{platform}】{title}"]

    if coupon_code:
        # 优惠券代码（外卖）
        lines.append(f"   优惠券代码：{coupon_code}")
    else:
        # 优惠券链接（快递、出行、电影）
        lines.append(f"   优惠券链接：{coupon_url}")
        lines.append(f"   （建议用微信打开）")

    if coupon_qrcode_img_url:
        lines.append(f"")
        lines.append(f"   二维码图片：{coupon_qrcode_img_url}")
        lines.append(f"   （使用微信扫描二维码领券）")

    lines.append(f"")
    lines.append(f"   使用说明：{guideline}")

    return "\n".join(lines)


def format_takeout_coupons(data: Dict[str, Any]) -> str:
    """格式化外卖优惠券"""
    if "error" in data:
        result = [f"获取失败: {data.get('message', '未知错误')}"]
        if "backup_skill" in data and data["backup_skill"].get("skill_url"):
            backup = data["backup_skill"]
            result.append(f"\n{data.get('backup_message', '备用方案:')}")
            result.append(f"📱 {backup.get('display_name', '备用技能')}: {backup.get('description', '')}")
            result.append(f"🔗 技能地址: {backup.get('skill_url', '')}")
            result.append('外部技能需单独审查与授权，不能假定可以修复同一API故障。')
        return "\n".join(result)

    result = ["【外卖优惠券】"]

    # 美团优惠券
    meituan_list = data.get("美团隐藏外卖券列表", [])
    if meituan_list:
        result.append("")
        result.append("【美团外卖】")
        for i, coupon in enumerate(meituan_list, 1):
            result.append(f"{i}. {format_coupon_display(coupon, '美团')}")
        result.append("")

    # 饿了么/淘宝闪购优惠券
    eleme_list = data.get("饿了么/淘宝闪购隐藏外卖券列表", [])
    if eleme_list:
        result.append("")
        result.append("【淘宝闪购/饿了么】")
        for i, coupon in enumerate(eleme_list, 1):
            result.append(f"{i}. {format_coupon_display(coupon, '淘宝闪购')}")
        result.append("")

    # 京东优惠券
    jd_list = data.get("京东隐藏外卖券列表", [])
    if jd_list:
        result.append("")
        result.append("【京东外卖】")
        for i, coupon in enumerate(jd_list, 1):
            result.append(f"{i}. {format_coupon_display(coupon, '京东')}")
        result.append("")

    # 聚合H5页面
    h5_page = data.get("查找更多优惠券") or data.get("聚合H5页面")
    if h5_page:
        result.append("")
        result.append("【聚合领券页面】")
        result.append(f"   二维码图片：{h5_page.get('coupon_h5_qrcode_img_url', '')}")
        result.append(f"   领取说明：{h5_page.get('guideline', '')}")

    return "\n".join(result)


def format_parcel_coupons(data: Any) -> str:
    """格式化快递优惠券"""
    if isinstance(data, list):
        return "\n\n".join(format_coupon_display(c, "快递优惠券") for c in data) if data else "暂无快递优惠券"
    if "error" in data:
        result = [f"获取失败: {data.get('message', '未知错误')}"]
        if "backup_skill" in data and data["backup_skill"].get("skill_url"):
            backup = data["backup_skill"]
            result.append(f"\n{data.get('backup_message', '备用方案:')}")
            result.append(f"📱 {backup.get('display_name', '备用技能')}: {backup.get('description', '')}")
            result.append(f"🔗 技能地址: {backup.get('skill_url', '')}")
            result.append('外部技能需单独审查与授权，不能假定可以修复同一API故障。')
        return "\n".join(result)

    return format_coupon_display(data, "快递优惠券")


def format_trip_coupons(coupons: List[Dict[str, Any]]) -> str:
    """格式化出行优惠券"""
    if not coupons:
        return "暂无可用出行优惠券"
    # 检查是否只有一个错误项目
    if len(coupons) == 1 and "error" in coupons[0]:
        error_data = coupons[0]
        result = [f"获取失败: {error_data.get('message', '未知错误')}"]
        if "backup_skill" in error_data and error_data["backup_skill"].get("skill_url"):
            backup = error_data["backup_skill"]
            result.append(f"\n{error_data.get('backup_message', '备用方案:')}")
            result.append(f"📱 {backup.get('display_name', '备用技能')}: {backup.get('description', '')}")
            result.append(f"🔗 技能地址: {backup.get('skill_url', '')}")
            result.append('外部技能需单独审查与授权，不能假定可以修复同一API故障。')
        return "\n".join(result)

    result = ["【出行优惠券】"]

    for i, coupon in enumerate(coupons, 1):
        title = coupon.get("title", "")
        if '滴滴' in title:
            platform = "滴滴出行"
        elif '携程' in title:
            platform = "携程礼包"
        else:
            platform = "其他优惠"

        result.append("")
        result.append(f"{i}. {format_coupon_display(coupon, platform)}")

    return "\n".join(result)


def format_movie_coupons(data: Any) -> str:
    """格式化电影票优惠券"""
    if isinstance(data, list):
        return "\n\n".join(format_coupon_display(c, "电影票优惠券") for c in data) if data else "暂无电影票优惠券"
    if "error" in data:
        result = [f"获取失败: {data.get('message', '未知错误')}"]
        if "backup_skill" in data and data["backup_skill"].get("skill_url"):
            backup = data["backup_skill"]
            result.append(f"\n{data.get('backup_message', '备用方案:')}")
            result.append(f"📱 {backup.get('display_name', '备用技能')}: {backup.get('description', '')}")
            result.append(f"🔗 技能地址: {backup.get('skill_url', '')}")
            result.append('外部技能需单独审查与授权，不能假定可以修复同一API故障。')
        return "\n".join(result)

    return format_coupon_display(data, "电影票优惠券")


def format_all_coupons(all_data: Dict[str, Any]) -> str:
    """格式化所有平台优惠券"""
    result = []

    # 外卖优惠券
    takeout = all_data.get("外卖优惠券", {})
    if isinstance(takeout, dict):
        result.append(format_takeout_coupons(takeout))
        result.append("")
        result.append("=" * 60)
        result.append("")

    # 快递优惠券
    parcel = all_data.get("快递优惠券", {})
    if isinstance(parcel, (dict, list)):
        result.append(format_parcel_coupons(parcel))
        result.append("")
        result.append("=" * 60)
        result.append("")

    # 出行优惠券
    trip = all_data.get("出行优惠券", [])
    if isinstance(trip, list) and len(trip) > 0:
        result.append(format_trip_coupons(trip))
        result.append("")
        result.append("=" * 60)
        result.append("")

    # 电影票优惠券
    movie = all_data.get("电影票优惠券", {})
    if isinstance(movie, (dict, list)):
        result.append(format_movie_coupons(movie))

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

    parser = argparse.ArgumentParser(description="全平台优惠券获取工具")
    parser.add_argument("--category", "-c", choices=["all", "takeout", "parcel", "trip", "movie"],
                        default="all", help="优惠券类型: all/takeout/parcel/trip/movie")
    parser.add_argument("--platform", "-p", type=str,
                        help="特定平台: meituan/eleme/jd/didi/xiecheng")
    parser.add_argument("--json", "-j", action="store_true",
                        help="输出原始JSON数据")

    parser.add_argument("--attribution-id", help="Optional explicit affiliate attribution identifier; sent to the coupon provider, never stored")
    args = parser.parse_args()

    fetcher = AllInOneCouponFetcher(attribution_id=args.attribution_id)

    if args.json:
        # 输出原始JSON
        if args.category == "all":
            result = fetcher.get_all_coupons()
        elif args.category == "takeout":
            result = fetcher.get_takeout_coupons()
        elif args.category == "parcel":
            result = fetcher.get_parcel_coupons()
        elif args.category == "trip":
            result = fetcher.get_trip_coupons()
        elif args.category == "movie":
            result = fetcher.get_movie_coupons()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        # 输出格式化后的信息
        if args.platform:
            # 特定平台
            if args.platform == "meituan" or args.platform == "美团":
                coupons = fetcher.get_meituan_coupons()
                for i, coupon in enumerate(coupons, 1):
                    print(f"{i}. {format_coupon_display(coupon, '美团')}")
            elif args.platform == "eleme" or args.platform == "饿了么" or args.platform == "淘宝闪购":
                coupons = fetcher.get_eleme_coupons()
                for i, coupon in enumerate(coupons, 1):
                    print(f"{i}. {format_coupon_display(coupon, '淘宝闪购')}")
            elif args.platform == "jd" or args.platform == "京东":
                coupons = fetcher.get_jd_takeout_coupons()
                for i, coupon in enumerate(coupons, 1):
                    print(f"{i}. {format_coupon_display(coupon, '京东')}")
            elif args.platform == "didi" or args.platform == "滴滴":
                coupons = fetcher.get_didi_coupons()
                for i, coupon in enumerate(coupons, 1):
                    print(f"{i}. {format_coupon_display(coupon, '滴滴出行')}")
            elif args.platform == "xiecheng" or args.platform == "携程":
                coupons = fetcher.get_xiecheng_coupons()
                for i, coupon in enumerate(coupons, 1):
                    print(f"{i}. {format_coupon_display(coupon, '携程礼包')}")
        elif args.category == "all":
            # 所有类别
            result = fetcher.get_all_coupons()
            print(format_all_coupons(result))
        elif args.category == "takeout":
            result = fetcher.get_takeout_coupons()
            print(format_takeout_coupons(result))
        elif args.category == "parcel":
            result = fetcher.get_parcel_coupons()
            print(format_parcel_coupons(result))
        elif args.category == "trip":
            result = fetcher.get_trip_coupons()
            print(format_trip_coupons(result))
        elif args.category == "movie":
            result = fetcher.get_movie_coupons()
            print(format_movie_coupons(result))
