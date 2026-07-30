import { z } from "zod";
export const ReferenceSchema = z.object({
    title: z.string().optional(),
    url: z.string().min(1),
    normalizedUrl: z.string().min(1),
    marker: z.string().optional(),
    text: z.string().optional(),
    snippet: z.string().optional(),
    content: z.string().optional(),
    originUrl: z.string().optional(),
    origin_url: z.string().optional(),
    resourceUrl: z.string().optional(),
    resource_url: z.string().optional(),
    officialUrl: z.string().optional(),
    official_url: z.string().optional(),
    sourceUrl: z.string().optional(),
    source_url: z.string().optional(),
    platformUrl: z.string().optional(),
    platform_url: z.string().optional(),
    originalUrl: z.string().optional(),
    original_url: z.string().optional(),
    originAttributionStatus: z.enum([
        "trusted_search_official_url",
        "trusted_search_no_source_url"
    ]).optional(),
    originAttributionReason: z.string().optional(),
    sameMaterialVerified: z.boolean().optional(),
    trustedSearchCandidateUrl: z.string().optional(),
    trustedSearchPublisher: z.string().optional(),
    trustedSearchRegion: z.string().optional(),
    trustedSearchDataSource: z.string().optional(),
    contentAcquisition: z.enum([
        "trusted_search_full_content",
        "direct_pdf_extraction",
        "direct_page_extraction"
    ]).optional(),
    citationScope: z.enum(["inline", "global", "inline_and_global"]).optional()
});
export const SourceMentionSchema = z.object({
    label: z.string().min(1),
    marker: z.string().optional(),
    occurrenceCount: z.number().int().positive().default(1)
});
export const ArtifactPathsSchema = z.object({
    screenshot: z.string().optional(),
    html: z.string().optional(),
    trace: z.string().optional()
});
export const PlatformStatusSchema = z.enum([
    "success",
    "failed",
    "timeout",
    "login_required",
    "verification_required"
]);
export const PlatformResultSchema = z
    .object({
    platform: z.string().min(1),
    label: z.string().min(1),
    url: z.string().min(1),
    status: PlatformStatusSchema,
    answerMarkdown: z.string(),
    references: z.array(ReferenceSchema).default([]),
    sourceMentions: z.array(SourceMentionSchema).default([]),
    artifacts: ArtifactPathsSchema.optional(),
    durationMs: z.number().int().nonnegative().optional(),
    error: z.string().optional()
})
    .superRefine((value, ctx) => {
    if (value.status === "success" && value.answerMarkdown.trim().length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["answerMarkdown"],
            message: "Successful platform results must include answerMarkdown."
        });
    }
    if (value.status !== "success" && !value.error) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["error"],
            message: "Failed platform results should include an error message."
        });
    }
});
export const RunResultSchema = z.object({
    schemaVersion: z.literal("1"),
    question: z.string().min(1),
    createdAt: z.string().min(1),
    platforms: z.array(PlatformResultSchema).min(1)
});
export function parseRunResult(input) {
    return RunResultSchema.parse(input);
}
