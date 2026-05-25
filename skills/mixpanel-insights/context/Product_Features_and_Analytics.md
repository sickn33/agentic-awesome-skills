# Matchmade Product Features & Analytics Overview

This document provides a comprehensive overview of the Matchmade product features, categorized by their core functionality within the ETL (Extract, Transform, Load) pipeline, and maps them to their respective tracking events in Mixpanel.

## 1. Data Ingestion & Source Management
These features handle bringing raw data into the Matchmade ecosystem securely efficiently.

*   **Manual Upload**: Users can manually upload structured files (CSV, XLSX) from their local machine to a unified ETL-ready table.
    *   **Analytics Correlation**: Tracked as `file_upload`, followed by `file_finish` when processing is complete. User management actions are captured via `file_delete`, `file_download`, `file_revert`, and `file_list_filter`.
*   **Automatic Universal Upload**: Automatically routes and groups uploaded files to the correct data source based purely on file name patterns, removing the need for manual contextual selections.
    *   **Analytics Correlation**: Captured as `file_upload` and `file_finish` populated with the `is_universal_upload = true` identity attribute.
*   **Email Crawler Listener**: Automatically reads and fetches required files from designated client emails (utilizing sender and subject rules) without manual intervention constraint.
    *   **Analytics Correlation**: Tracked natively as `email_crawled`.
*   **OCR / LLM File Conversion**: Allows users to upload unstructured files (PDFs, TXTs) and leverages LLM Vision to dynamically read and convert them into structured tabular data.
    *   **Analytics Correlation**: Extensible tracking via `file_llm_extract` (extraction attempt) and `file_llm_confirm` (when a user verifies extraction). 

## 2. Data Transformation (Worker Nodes & Workflows)
Features powering the core data transformation pipeline, enabling technical and non-technical stakeholders to orchestrate data mapping.

*   **STT Worker Nodes & Canvas**: A visual, graph-like sandbox allowing users to intuitively string together data lineage:
    *   *L1/L1.5 Tools*: Filter, Remove Duplicate, Column Edit functions.
    *   *L2 Tools*: SQL input execution, Join, Group Calculate, If-Else conditioning.
    *   *L3 Tools*: Targeted rulesets for data matching.
    *   **Analytics Correlation**: Captured heavily by `worker_run_finish` when successfully processing datasets per node.
*   **Workflow Operations**: Reviewing insights, triggering runs, and monitoring execution logs over an end-to-end data pipeline flow.
    *   **Analytics Correlation**: `workflow_update_click`, `data_update_running` starts, and ultimate completion via `data_update_finish`.
*   **Workflow Template**: Templated pre-built sets of worker configurations allowing delivery managers to easily spin up repeating implementations for identical source workflows.
*   **Workflow Objective Guide**: Context guides that steer user flows based on L3 Matchmap final-states.

## 3. Data Consumption (Tables & Traceability)
Features focused on data reading, table alignment matching, and post-ETL processing visualization.

*   **Single Table View (STV)**: The high-volume core environment. Provides detailed views limited typically to 8000 records, encompassing multi-column sorting, granular filtering and bulk download.
    *   **Analytics Correlation**: Generates bulk tracking through `table_get_record` engagements, accompanied by `table_download` limits.
*   **Multi Table View (MTV) & Matchmap**: A split dual-ledger UI allowing users to visually stack and connect records from separate schemas. Users rely on this interface to establish relational links between sets.
    *   **Analytics Correlation**: Tracked as `table_get_record`. For overrides within matchmaps, usage is quantified through `table_force_match` (override connect) and `table_force_detach` (override disconnect).
*   **Data Lineage Tracing (Legacy & STT)**: Traceability interface navigating users clearly from input records through transformer workers straight up past final target outputs.

## 4. Operational Management
Organizational features tailored securely for internal Delivery Teams, supporting account health and intervention tasks.

*   **Taskboard Management**: Users and automated systems seamlessly generate task-items built out around missing OCR configs, isolated disputes, and general QA fallbacks mapping directly to user workflows.
    *   **Analytics Correlation**: Recorded natively as `task_created`.
*   **Billing Console**: Interfacing meant for managing clients natively by compiling quota metrics dynamically (e.g. storage bytes used, active connections run, and node usage footprint).
*   **Email Crawler Setup**: Config panel exclusively for delivery users to specify exact email sources arrays for listener deployment.

---

## Strategic Analytics Context (V1 Vs. V2)

Current analytics data explicitly reveals behavior dynamics where deep data examination outpaces new feature growth:
1. **The V1 Holdout**: Overall, V1 (legacy `app.matchmade.io`) accounts for high volume engagement. V1 operates with Power Users driving the vast chunk of daily `file_finish` uploads (~600-1500) and STV tracking `table_get_record` consumption limits.
2. **Beta AI Integrations**: Despite broad availability, usage footprint indicates that Beta v2 (e.g., *OCR & Universal AI Uploads*) make up less than `<20%` general load (derived via standard `platform_ver = V2`).

Product feature modifications and enhancements are predominantly mapped in standard telemetry across UI component usage points (`button_click`, `page_view`, `error_log`) with corresponding deep entity association attached to core models (`company_id` and `user_id`).
