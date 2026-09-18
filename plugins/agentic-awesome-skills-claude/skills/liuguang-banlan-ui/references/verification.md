# 验证契约

## 能力门槛

先确认执行模型是否具备原生视觉能力：让模型直接查看一张生成的页面截图，并确认它能描述布局、色场、文字可读性和明显缺陷。只有这一步通过，才可把 `visualVerificationMode` 记为 `native-vision-plus-deterministic-pixel-metrics`。

若执行模型不能查看图片：

- 仍可运行语法、DOM、浏览器交互和像素统计；
- 把 `modelVision` 或 `visualVerificationMode` 标记为不可用/`visual-unverified`；
- 不得把截图尺寸、CSS 值或 DOM 状态当作视觉质量证明；
- 把需要人眼确认的项目明确列入未验证清单。

## 浏览器检查

用真实浏览器生成至少两种视口：桌面（建议 1440×960）和窄屏（建议 390×844）。至少检查：

1. 页面初始渲染与 WebGL/CSS fallback 状态；
2. 参数面板打开、关闭、Escape 返回焦点；
3. 总体彩色强度和每个颜色滑杆实时改变画面与数值；
4. 恢复预设、导出 JSON、复制失败时的可用提示；
5. 导航、记录选择、标签切换、移动端导航收起；
6. 控制台错误/警告和本地静态资源请求；
7. reduced-motion 与页面隐藏时暂停/冻结行为。

截图必须直接看过才能产生审美结论。重点检查：白版是否仍以白为主、黑版是否仍以黑为底、六色是否形成连续流域、文字是否可读，以及是否出现圆形大光斑、RGB 霓虹、灰雾、黑压死或全页玻璃。

## 像素检查

用 `scripts/measure_preview.py` 测量纯色场截图，而不是只测被面板遮挡的完整页面。脚本会：

- 读取 JS manifest 中的 base 与 palette；
- 将截图转换到 OKLab；
- 以“高于基材色度阈值”的像素作为可见色；
- 将可见像素分配给最近的配置色相；
- 输出可见色像素比例、OKLab chroma、亮度均值/P95/最大值、每色覆盖率和有效色度份额。

低色度白场的色相归属只能作为近似统计，不能替代视觉检查。黑版必须同时检查最大亮度不超过 manifest 的 `luminanceCap` 意图；不要把截图中的 sRGB 值直接当成线性亮度。

## 报告结构

最终报告至少输出：

```json
{
  "validationCapabilities": {
    "modelVision": true,
    "screenshotCapture": true,
    "deterministicPixelMetrics": true,
    "visualVerificationMode": "native-vision-plus-deterministic-pixel-metrics"
  },
  "theme": {
    "overallColorIntensity": 0.82,
    "colors": [
      {
        "id": "cyan",
        "intensity": 0.62,
        "oklch": [0.928, 0.043, 201],
        "peakOpacity": 0.078,
        "fieldScale": 0.94,
        "phase": [0.78, 0.21],
        "measuredCoverage": 0.1499,
        "effectiveShare": 0.227
      }
    ]
  }
}
```

把“配置参数”和“截图实测”分开写。若某一项没有真实测量，使用 `null` 或 `unverified`，不要填一个看起来完整但无法复现的数字。
