# 数据契约

输入是 1.0 的 `results.json`。生成的 `comparison-task.json` 使用 `fact-check-x/comparison-task@1`。

当前智能体填写：

```json
{
  "coreQuestion": "核心问题",
  "synthesisDraft": {
    "status": "unverified",
    "answer": "基于本阶段知识点合并形成的综合草案",
    "basisKnowledgePointIds": ["K1"]
  },
  "knowledgePoints": [
    {
      "description": "一个原子事实",
      "role": "direct",
      "core": true,
      "claims": {
        "dknowc-chat": {
          "covered": true,
          "claim": "该平台主张",
          "answerExcerpt": "包含当前主张及相连脚标的原答案连续子串",
          "citedReferenceIndexes": [1],
          "answerLevelReferenceIndexes": [],
          "faithfulness": "supported",
          "reason": "来源是否支持该主张",
          "evidence": [{"referenceIndex": 1, "excerpt": "已捕获正文的原文子串"}]
        }
      },
      "comparison": {"status": "consensus", "summary": "精确说明主张属于一致、基本一致、部分一致还是冲突"},
      "trustedAnchor": {
        "eligible": true,
        "platform": "dknowc-chat",
        "trustedSearchUsed": true,
        "officialAnswer": "该知识点的官方答案",
        "evidence": [{"referenceIndex": 1, "excerpt": "所附官方正文原文"}]
      }
    }
  ]
}
```

`synthesisDraft` 是第二阶段的独立交付内容，必须满足：

- `status` 固定为 `unverified`；
- `answer` 非空，只能综合本阶段已采集回答与知识点；
- `basisKnowledgePointIds` 非空、无重复，且只能引用当前知识点；
- 必须保留平台冲突、适用条件和信息缺口，不得写成已获权威证实的最终答案。

`faithfulness`：`supported`、`contradicted`、`insufficient`。

每个平台 claim 必须显式提供 `covered`、`claim`、`answerExcerpt`、
`faithfulness` 和 `evidence`；每个知识点必须显式提供 `comparison` 与
`trustedAnchor`，顶层必须提供合格的 `synthesisDraft`。缺少任一字段时必须
停留在 1.1 修复或重试，禁止用默认值静默进入权威核验。

`answerExcerpt` 对所有已覆盖主张必填，且必须是当前平台 `answerMarkdown` 的连续子串。

- `citedReferenceIndexes`：局部角标或平台明确声明的全局来源。
- `answerLevelReferenceIndexes`：仅在当前 `answerExcerpt` 没有局部角标时使用，从本次回答明确返回的参考资料中逐主张语义匹配。
- 局部角标优先；已有局部角标时，程序拒绝回答级来源抬级。
- 回答级来源必须由 `evidence` 提供对应 `capturedText` 的原文子串，并且该原文实际支持当前原子主张。来源只支持其他补充点时，不能归给核心点。

`comparison.status`：

- `consensus`（一致）：核心结论、适用对象、关键条件和事实值相同；
- `mostly_consensus`（基本一致）：核心结论、适用对象和关键条件相同，仅有不改变结论的轻微措辞、范围说明或细节差异；
- `partial`（部分一致）：存在会改变适用性、风险判断或结论的重要条件缺失或新增；
- `conflict`（冲突）：结论或关键事实值互斥；
- `single`（单方覆盖）：只有一个平台覆盖。

归一化后的 `sourceLevel` 与报告外显关系：

- `official` → 官方原站；
- `dknow_trusted_search_official` → 官方来源；
- `nonofficial` → 非官方来源；
- `none` → 无所附来源。

深知晓可信搜索返回的 dknowc / `DT_DATA` 来源按产品规则属于官方来源，即使只暴露内部库链接也不得降级。采集阶段取得同源官网 URL 与全文时，以官网 URL 为主链接，以 `platformUrl` / `originalUrl` 保留深知收录页。它只在主张被逐段溯源，或没有局部脚标时被允许的全文语义溯源且 `faithfulness=supported` 时，才支持直接准确；不得把未绑定来源扩散给其他主张。

`trustedAnchor.eligible=true` 只有在深知晓确实使用可信搜索、该点有可定位的官方来源、主张忠实于依据时有效。验收后的 `comparison.json` 使用 `fact-check-x/comparison@1`。
