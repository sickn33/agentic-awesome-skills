---
name: app-store-optimization
description: "Complete App Store Optimization (ASO) toolkit for researching, optimizing, and tracking mobile app performance on Apple App Store and Google Play Store"
risk: unknown
source: community
date_added: "2026-02-27"
---

# App Store Optimization (ASO) Skill

This comprehensive skill provides complete ASO capabilities for successfully launching and optimizing mobile applications on the Apple App Store and Google Play Store.

## Capabilities

### Research & Analysis
- **Keyword Research**: Analyze keyword volume, competition, and relevance for app discovery
- **Competitor Analysis**: Deep-dive into top-performing apps in your category
- **Market Trend Analysis**: Identify emerging trends and opportunities in your app category
- **Review Sentiment Analysis**: Extract insights from user reviews to identify strengths and issues
- **Category Analysis**: Evaluate optimal category and subcategory placement strategies

### Metadata Optimization
- **Title Optimization**: Create compelling titles with optimal keyword placement (platform-specific character limits)
- **Description Optimization**: Craft both short and full descriptions that convert and rank
- **Subtitle/Promotional Text**: Optimize Apple-specific subtitle (30 chars) and promotional text (170 chars)
- **Keyword Field**: Maximize Apple's 100-character keyword field with strategic selection
- **Category Selection**: Data-driven recommendations for primary and secondary categories
- **Icon Best Practices**: Guidelines for designing high-converting app icons
- **Screenshot Optimization**: Strategies for creating screenshots that drive installs
- **Preview Video**: Best practices for app preview videos
- **Localization**: Multi-language optimization strategies for global reach

### Conversion Optimization
- **A/B Testing Framework**: Plan and track metadata experiments for continuous improvement
- **Visual Asset Testing**: Test icons, screenshots, and videos for maximum conversion
- **Store Listing Optimization**: Comprehensive page optimization for impression-to-install conversion
- **Call-to-Action**: Optimize CTAs in descriptions and promotional materials

### Rating & Review Management
- **Review Monitoring**: Track and analyze user reviews for actionable insights
- **Response Strategies**: Templates and best practices for responding to reviews
- **Rating Improvement**: Tactical approaches to improve app ratings organically
- **Issue Identification**: Surface common problems and feature requests from reviews

### Launch & Update Strategies
- **Pre-Launch Checklist**: Complete validation before submitting to stores
- **Launch Timing**: Optimize release timing for maximum visibility and downloads
- **Update Cadence**: Plan optimal update frequency and feature rollouts
- **Feature Announcements**: Craft "What's New" sections that re-engage users
- **Seasonal Optimization**: Leverage seasonal trends and events

### Analytics & Tracking
- **ASO Score**: Calculate overall ASO health score across multiple factors
- **Keyword Rankings**: Track keyword position changes over time
- **Conversion Metrics**: Monitor impression-to-install conversion rates
- **Download Velocity**: Track download trends and momentum
- **Performance Benchmarking**: Compare against category averages and competitors

### Platform-Specific Requirements
- **Apple App Store**:
  - Title: 30 characters
  - Subtitle: 30 characters
  - Promotional Text: 170 characters (editable without app update)
  - Description: 4,000 characters
  - Keywords: 100 characters (comma-separated, no spaces)
  - What's New: 4,000 characters
- **Google Play Store**:
  - Title: 50 characters (formerly 30, increased in 2021)
  - Short Description: 80 characters
  - Full Description: 4,000 characters
  - No separate keyword field (keywords extracted from title and description)

## Input Requirements

### Keyword Research
```json
{
  "app_name": "MyApp",
  "category": "Productivity",
  "target_keywords": ["task manager", "productivity", "todo list"],
  "competitors": ["Todoist", "Any.do", "Microsoft To Do"],
  "language": "en-US"
}
```

### Metadata Optimization
```json
{
  "platform": "apple" | "google",
  "app_info": {
    "name": "MyApp",
    "category": "Productivity",
    "target_audience": "Professionals aged 25-45",
    "key_features": ["Task management", "Team collaboration", "AI assistance"],
    "unique_value": "AI-powered task prioritization"
  },
  "current_metadata": {
    "title": "Current Title",
    "subtitle": "Current Subtitle",
    "description": "Current description..."
  },
  "target_keywords": ["productivity", "task manager", "todo"]
}
```

### Review Analysis
```json
{
  "app_id": "com.myapp.app",
  "platform": "apple" | "google",
  "date_range": "last_30_days" | "last_90_days" | "all_time",
  "rating_filter": [1, 2, 3, 4, 5],
  "language": "en"
}
```

### ASO Score Calculation
```json
{
  "metadata": {
    "title_quality": 0.8,
    "description_quality": 0.7,
    "keyword_density": 0.6
  },
  "ratings": {
    "average_rating": 4.5,
    "total_ratings": 15000
  },
  "conversion": {
    "impression_to_install": 0.05
  },
  "keyword_rankings": {
    "top_10": 5,
    "top_50": 12,
    "top_100": 18
  }
}
```

## Output Formats

### Keyword Research Report
- List of recommended keywords with search volume estimates
- Competition level analysis (low/medium/high)
- Relevance scores for each keyword
- Strategic recommendations for primary vs. secondary keywords
- Long-tail keyword opportunities

### Optimized Metadata Package
- Platform-specific title (with character count validation)
- Subtitle/promotional text (Apple)
- Short description (Google)
- Full description (both platforms)
- Keyword field (Apple - 100 chars)
- Character count validation for all fields
- Keyword density analysis
- Before/after comparison

### Competitor Analysis Report
- Top 10 competitors in category
- Their metadata strategies
- Keyword overlap analysis
- Visual asset assessment
- Rating and review volume comparison
- Identified gaps and opportunities

### ASO Health Score
- Overall score (0-100)
- Category breakdown:
  - Metadata Quality (0-25)
  - Ratings & Reviews (0-25)
  - Keyword Performance (0-25)
  - Conversion Metrics (0-25)
- Specific improvement recommendations
- Priority action items

### A/B Test Plan
- Hypothesis and test variables
- Test duration recommendations
- Success metrics definition
- Sample size calculations
- Statistical significance thresholds

### Launch Checklist
- Pre-submission validation (all required assets, metadata)
- Store compliance verification
- Testing checklist (devices, OS versions)
- Marketing preparation items
- Post-launch monitoring plan

## How to Use

### Keyword Research
```
Hey Claude—I just added the "app-store-optimization" skill. Can you research the best keywords for a productivity app targeting professionals? Focus on keywords with good search volume but lower competition.
```

### Optimize App Store Listing
```
Hey Claude—I just added the "app-store-optimization" skill. Can you optimize my app's metadata for the Apple App Store? Here's my current listing: [provide current metadata]. I want to rank for "task management" and "productivity tools".
```

### Analyze Competitor Strategy
```
Hey Claude—I just added the "app-store-optimization" skill. Can you analyze the ASO strategies of Todoist, Any.do, and Microsoft To Do? I want to understand what they're doing well and where there are opportunities.
```

### Review Sentiment Analysis
```
Hey Claude—I just added the "app-store-optimization" skill. Can you analyze recent reviews for my app (com.myapp.ios) and identify the most common user complaints and feature requests?
```

### Calculate ASO Score
```
Hey Claude—I just added the "app-store-optimization" skill. Can you calculate my app's overall ASO health score and provide specific recommendations for improvement?
```

### Plan A/B Test
```
Hey Claude—I just added the "app-store-optimization" skill. I want to A/B test my app icon and first screenshot. Can you help me design the test and determine how long to run it?
```

### Pre-Launch Checklist
```
Hey Claude—I just added the "app-store-optimization" skill. Can you generate a comprehensive pre-launch checklist for submitting my app to both Apple App Store and Google Play Store?
```

## Scripts

### keyword_analyzer.py
Analyzes keywords for search volume, competition, and relevance. Provides strategic recommendations for primary and secondary keywords.

**Key Functions:**
- `analyze_keyword()`: Analyze single keyword metrics
- `compare_keywords()`: Compare multiple keywords
- `find_long_tail()`: Discover long-tail keyword opportunities
- `calculate_keyword_difficulty()`: Assess competition level

### metadata_optimizer.py
Optimizes titles, descriptions, and keyword fields with platform-specific character limit validation.

**Key Functions:**
- `optimize_title()`: Create compelling, keyword-rich titles
- `optimize_description()`: Generate conversion-focused descriptions
- `optimize_keyword_field()`: Maximize Apple's 100-char keyword field
- `validate_character_limits()`: Ensure compliance with platform limits
- `calculate_keyword_density()`: Analyze keyword usage in metadata

### competitor_analyzer.py
Analyzes top competitors' ASO strategies and identifies opportunities.

**Key Functions:**
- `get_top_competitors()`: Identify category leaders
- `analyze_competitor_metadata()`: Extract and analyze competitor keywords
- `compare_visual_assets()`: Evaluate icons and screenshots
- `identify_gaps()`: Find competitive opportunities

### aso_scorer.py
Calculates comprehensive ASO health score across multiple dimensions.

**Key Functions:**
- `calculate_overall_score()`: Compute 0-100 ASO score
- `score_metadata_quality()`: Evaluate title, description, keywords
- `score_ratings_reviews()`: Assess rating quality and volume
- `score_keyword_performance()`: Analyze ranking positions
- `score_conversion_metrics()`: Evaluate impression-to-install rates
- `generate_recommendations()`: Provide prioritized action items

### ab_test_planner.py
Plans and tracks A/B tests for metadata and visual assets.

**Key Functions:**
- `design_test()`: Create test hypothesis and variables
- `calculate_sample_size()`: Determine required test duration
- `calculate_significance()`: Assess statistical significance
- `track_results()`: Monitor test performance
- `generate_report()`: Summarize test outcomes

### localization_helper.py
Manages multi-language ASO optimization strategies.

**Key Functions:**
- `identify_target_markets()`: Recommend localization priorities
- `translate_metadata()`: Generate localized metadata
- `adapt_keywords()`: Research locale-specific keywords
- `validate_translations()`: Check character limits per language
- `calculate_localization_roi()`: Estimate impact of localization

### review_analyzer.py
Analyzes user reviews for sentiment, issues, and feature requests.

**Key Functions:**
- `analyze_sentiment()`: Calculate positive/negative/neutral ratios
- `extract_common_themes()`: Identify frequently mentioned topics
- `identify_issues()`: Surface bugs and user complaints
- `find_feature_requests()`: Extract desired features
- `track_sentiment_trends()`: Monitor sentiment over time
- `generate_response_templates()`: Create review response drafts

### launch_checklist.py
Generates comprehensive pre-launch and update checklists.

**Key Functions:**
- `generate_prelaunch_checklist()`: Complete submission validation
- `validate_app_store_compliance()`: Check Apple guidelines
- `validate_play_store_compliance()`: Check Google policies
- `create_update_plan()`: Plan update cadence and features
- `optimize_launch_timing()`: Recommend release dates
- `plan_seasonal_campaigns()`: Identify seasonal opportunities

## Best Practices

### Keyword Research
1. **Volume vs. Competition**: Balance high-volume keywords with achievable rankings
2. **Relevance First**: Only target keywords genuinely relevant to your app
3. **Long-Tail Strategy**: Include 3-4 word phrases with lower competition
4. **Continuous Research**: Keyword trends change—research quarterly
5. **Competitor Keywords**: Don't copy blindly; ensure relevance to your features

### Metadata Optimization
1. **Front-Load Keywords**: Place most important keywords early in title/description
2. **Natural Language**: Write for humans first, SEO second
3. **Feature Benefits**: Focus on user benefits, not just features
4. **A/B Test Everything**: Test titles, descriptions, screenshots systematically
5. **Update Regularly**: Refresh metadata every major update
6. **Character Limits**: Use every character—don't waste valuable space
7. **Apple Keyword Field**: No plurals, duplicates, or spaces between commas

### Visual Assets
1. **Icon**: Must be recognizable at small sizes (60x60px)
2. **Screenshots**: First 2-3 are critical—most users don't scroll
3. **Captions**: Use screenshot captions to tell your value story
4. **Consistency**: Match visual style to app design
5. **A/B Test Icons**: Icon is the single most important visual element

### Reviews & Ratings
1. **Respond Quickly**: Reply to reviews within 24-48 hours
2. **Professional Tone**: Always courteous, even with negative reviews
3. **Address Issues**: Show you're actively fixing reported problems
4. **Thank Supporters**: Acknowledge positive reviews
5. **Prompt Strategically**: Ask for ratings after positive experiences

### Launch Strategy
1. **Soft Launch**: Consider launching in smaller markets first
2. **PR Timing**: Coordinate press coverage with launch
3. **Update Frequently**: Initial updates signal active development
4. **Monitor Closely**: Track metrics daily for first 2 weeks
5. **Iterate Quickly**: Fix critical issues immediately

### Localization
1. **Prioritize Markets**: Start with English, Spanish, Chinese, French, German
2. **Native Speakers**: Use professional translators, not machine translation
3. **Cultural Adaptation**: Some features resonate differently by culture
4. **Test Locally**: Have native speakers review before publishing
5. **Measure ROI**: Track downloads by locale to assess impact

## Limitations

### Data Dependencies
- Keyword search volume estimates are approximate (no official data from Apple/Google)
- Competitor data may be incomplete for private apps
- Review analysis limited to public reviews (can't access private feedback)
- Historical data may not be available for new apps

### Platform Constraints
- Apple App Store keyword changes require app submission (except Promotional Text)
- Google Play Store metadata changes take 1-2 hours to index
- A/B testing requires significant traffic for statistical significance
- Store algorithms are proprietary and change without notice

### Industry Variability
- ASO benchmarks vary significantly by category (games vs. utilities)
- Seasonality affects different categories differently
- Geographic markets have different competitive landscapes
- Cultural preferences impact what works in different countries

### Scope Boundaries
- Does not include paid user acquisition strategies (Apple Search Ads, Google Ads)
- Does not cover app development or UI/UX optimization
- Does not include app analytics implementation (use Firebase, Mixpanel, etc.)
- Does not handle app submission technical issues (provisioning profiles, certificates)

### When NOT to Use This Skill
- For web apps (different SEO strategies apply)
- For enterprise apps not in public stores
- For apps in beta/TestFlight only
- If you need paid advertising strategies (use marketing skills instead)

## Integration with Other Skills

This skill works well with:
- **Content Strategy Skills**: For creating app descriptions and marketing copy
- **Analytics Skills**: For analyzing download and engagement data
- **Localization Skills**: For managing multi-language content
- **Design Skills**: For creating optimized visual assets
- **Marketing Skills**: For coordinating broader launch campaigns

## Version & Updates

This skill is based on current Apple App Store and Google Play Store requirements as of November 2025. Store policies and best practices evolve—verify current requirements before major launches.

**Key Updates to Monitor:**
- Apple App Store Connect updates (apple.com/app-store/review/guidelines)
- Google Play Console updates (play.google.com/console/about/guides/releasewithconfidence)
- iOS/Android version adoption rates (affects device testing)
- Store algorithm changes (follow ASO blogs and communities)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
