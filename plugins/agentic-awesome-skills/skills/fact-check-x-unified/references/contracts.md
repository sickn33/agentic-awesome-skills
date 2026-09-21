# 编排契约

统一入口不发明新的业务判断，只连接三个稳定契约：

- 1.0：`schemaVersion=1` 的 `results.json`。
- 1.1：`fact-check-x/comparison@1`。
- 单点权威请求：`fact-check-x/authority-request@1`。
- 单点权威结果：`fact-check-x/authority-result@1`。
- 汇总：`fact-check-x/verification@2`。
- 流水线：`fact-check-x/pipeline@2`。

`comparison-gate.json` 锁定 1.0 结果、智能体分析和归一化 comparison 的 SHA-256。`authority-gate.json` 锁定 request、evidence、assessment、result 的精确 ID 集合与 SHA-256；任何缺失、额外、陈旧或后改文件都必须阻断后续步骤。

`verification.json`：

```json
{
  "schemaVersion": "fact-check-x/verification@2",
  "question": "用户问题",
  "finalAnswer": {
    "status": "verified",
    "answer": "按知识点顺序合并的权威核验答案",
    "knowledgePointIds": ["K1"]
  },
  "platforms": [{"platform": "dknowc-chat", "label": "深知晓"}],
  "knowledgePoints": [
    {
      "id": "K1",
      "description": "原子事实",
      "claims": {},
      "authority": {"schemaVersion": "fact-check-x/authority-result@1"}
    }
  ],
  "trustedSearchRequestCount": 0,
  "status": "completed"
}
```

`pipeline.json` 记录每层技能名称、产物绝对路径、知识点数、实际可信搜索请求数、深知晓官方材料免查数、`gov.cn` 材料免查数、官方材料免查总数和最终状态。
