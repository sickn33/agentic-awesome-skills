# Protocol reverse 速查

> 适用：`protocol-reverse` skill · 2026-07-18

## 常见布局模式

| 模式 | 特征 | 提示 |
|------|------|------|
| 定长头+体 | 前 2/4 字节长度 | 注意是否包含头长 |
| 魔数 | 固定 `0xDEAD` 等 | 便于流再同步 |
| TLV | type-length-value 重复 | type 枚举即消息字典 |
| Protobuf | 字段号 varint | `protoc --decode_raw` |
| 加密帧 | 熵高、无明文 URL | 先找 nonce/IV 邻域 |

## 最小 Python 骨架

```python
import struct
def parse_frame(buf: bytes):
    magic, length, msg_type = struct.unpack_from(">IHI", buf, 0)
    body = buf[10:10+length]
    return {"magic": magic, "type": msg_type, "body": body}
```

## PCAP 提取 TCP payload

```bash
tshark -r cap.pcap -Y "tcp.port==4433" -T fields -e tcp.payload | head
```