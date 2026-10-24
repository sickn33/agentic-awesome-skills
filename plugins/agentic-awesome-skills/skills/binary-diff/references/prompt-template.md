# Symbol Migration Prompt Template

## 标准比对 Prompt（直接复制使用）

````text
I have disassembly outputs and procedure code of the same function.

This is the function for reference:

**Disassembly for Reference**
```c
{disasm_for_reference}
```

**Procedure code for Reference**
```c
{procedure_for_reference}
```

This is the function you need to reverse-engineering:

**Disassembly to reverse-engineering**
```c
{disasm_code}
```

**Procedure code to reverse-engineering**
```c
{procedure}
```

What you need to do is to collect all references to "{symbol_name_list}" in the function you need to reverse-engineering and output those references as YAML.

Example:
```yaml
found_vcall:
  - insn_va: '0x180777700'
    insn_disasm: call [rax+68h]
    vfunc_offset: '0x68'
    func_name: ILoopMode_OnLoopActivate

found_call:
  - insn_va: '0x180888800'
    insn_disasm: call sub_180999900
    func_name: CLoopMode_RegisterEventMapInternal

found_funcptr:
  - insn_va: '0x180666600'
    insn_disasm: lea rdx, sub_15BC910
    funcptr_name: CLoopMode_OnClientPollNetworking

found_gv:
  - insn_va: '0x180444400'
    insn_disasm: mov rcx, cs:qword_180666600
    gv_name: g_pNetworkMessages

found_struct_offset:
  - insn_va: '0x1801BA12A'
    insn_disasm: mov rcx, [r14+58h]
    offset: '0x58'
    size: 8
    struct_name: CResourceService
    member_name: m_pEntitySystem
```

If nothing found, output {}. DO NOT output anything other than the desired YAML. DO NOT collect unrelated symbols.
````

## 变量填充说明

| 变量 | 来源 | 获取方式 |
|------|------|---------|
| `{disasm_for_reference}` | 旧版 IDA | `idapro_disasm(addr="函数名")` |
| `{procedure_for_reference}` | 旧版 IDA | `idapro_decompile(addr="函数名")` |
| `{disasm_code}` | 新版 IDA | `idapro_disasm(addr="对应地址")` |
| `{procedure}` | 新版 IDA | `idapro_decompile(addr="对应地址")` |
| `{symbol_name_list}` | 旧版提取 | 从 reference 代码中提取所有非 sub_/loc_ 的符号名 |

## 批量调用脚本骨架（Python）

```python
import yaml
import httpx
import json
from pathlib import Path

# Extract the fenced prompt above to a reviewed UTF-8 text file first; no such file is bundled.
PROMPT_TEMPLATE = Path("prompt-template.txt").read_text(encoding="utf-8")

def migrate_function(ref_disasm, ref_procedure, target_disasm, target_procedure, symbols, api_url, api_key, model="deepseek-chat"):
    prompt = PROMPT_TEMPLATE.format(
        disasm_for_reference=ref_disasm,
        procedure_for_reference=ref_procedure,
        disasm_code=target_disasm,
        procedure=target_procedure,
        symbol_name_list=", ".join(symbols)
    )
    
    resp = httpx.post(api_url, json={
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0
    }, headers={"Authorization": f"Bearer {api_key}"}, timeout=60)
    
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    
    # 提取 YAML 块
    if "```yaml" in content:
        yaml_str = content.split("```yaml")[1].split("```")[0]
    elif "```" in content:
        yaml_str = content.split("```")[1].split("```")[0]
    else:
        yaml_str = content
    
    if len(yaml_str) > 100_000:
        raise ValueError("Response too large")
    result = yaml.safe_load(yaml_str)
    allowed = {"found_call", "found_funcptr", "found_gv", "found_vcall", "found_struct_offset"}
    if not isinstance(result, dict) or set(result) - allowed:
        raise ValueError("Unexpected mapping structure")
    if any(not isinstance(items, list) or len(items) > 1000 for items in result.values()):
        raise ValueError("Expected bounded lists")
    # Validate each item against the expected keys/types and target IDB before use.
    return result


def plan_results(results):
    """Return a review queue only; instruction VA is never a rename target."""
    if not isinstance(results, dict):
        raise ValueError("Expected a validated mapping")
    queue = []
    for kind, items in results.items():
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get("insn_va"), str):
                raise ValueError("Invalid item")
            address = int(item["insn_va"], 16)
            queue.append({"kind": kind, "instruction_va": address, "candidate": item,
                          "status": "requires IDB operand/target and name-conflict validation"})
    return queue

# A real adapter must decode the target IDB instruction, resolve its referenced
# call/function-pointer/global operand, validate mapped address ranges and names,
# preview conflicts, and obtain confirmation before changing a backed-up IDB.
# It must not use instruction_va as the function/global rename address.

```

## API 适配边界

上述 Python 骨架只演示 OpenAI-compatible Chat Completions 响应格式；需要获准的 HTTPS 端点、专用 token 和当前模型标识。Anthropic Messages 的请求头、请求体和响应格式不同，不能直接替换 URL。先查阅所选供应商的当前文档并实现相应适配器；本包没有提供可直接执行的 API 客户端或 IDA 工具。不要将 token 写入提示词、日志或版本库。
