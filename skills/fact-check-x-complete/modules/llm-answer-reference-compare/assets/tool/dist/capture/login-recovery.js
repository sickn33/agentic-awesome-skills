import { normalizeUrl } from "../utils/urls.js";

export function buildLoginRecovery(config, question, error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
        schemaVersion: "fact-check-x/capture-recovery@1",
        status: "required",
        action: "computer_use",
        phase: "login",
        createdAt: new Date().toISOString(),
        question: String(question || ""),
        failedPlatforms: [{
                platform: config.name,
                label: config.label,
                url: normalizeUrl(config.url),
                loginUrl: normalizeUrl(config.url),
                status: "login_required",
                error: message
        }],
        instructions: [
            "运行载体具备 Computer Use 时用它恢复同一平台；否则停止在原始答案采集阶段。",
            "禁止测试或改用 headless/无头浏览器、另一套浏览器、锁文件清理、显示会话检查或启动参数诊断。",
            "需要用户本人处理账号、密码、验证码或人机验证。",
            "直接读取本文件 question 字段并复用原始问题；不得要求用户回滚会话复制问题。",
            "完成登录、地区选择、问题提交并等待回答停止生成。",
            "全部指定平台成功前禁止进入知识点对比、权威核验和最终报告。",
            "当前载体没有 Computer Use 能力时，用中文说明能力缺失并停止在原始答案采集阶段。"
        ]
    };
}
