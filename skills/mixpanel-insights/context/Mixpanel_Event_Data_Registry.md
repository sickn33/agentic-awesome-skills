# Mixpanel Event Data Registry & Context
*Generated on: 2026-04-20 10:53:18*

This document provides a full context of the Mixpanel event data registry, compiling active Mixpanel events with our local event catalog specifications (`[PR] Analytics - Event Data Catalogue - [FACELIFT] Revamped Event Catalog.csv`), along with the detailed attributes definitions (`[PR] Analytics - Event Data Catalogue.xlsx`).

## Summary Insights
- **Total Mixpanel Events**: 31
- **Total Catalogued Events**: 44
- **Mapped Events (Both)**: 23
- **Unmapped Mixpanel Events**: 8
- **Missing / Upcoming Events (Catalog Only)**: 21

---

## 1. Mapped Events (Healthy)
These events are both documented in the Catalog and currently active in Mixpanel.

### `button_click`
- **Context:** Homepage - Source List Pane<br>Homepage - Workflow Pane
- **Triggered When:** [FE] user click a button in homepage<br>[FE] user click a button in source pane page<br>[FE] user click a button in data source pane<br>[FE] user click a button in workflow pane<br>[FE] user click a button in discovery page<br>[FE] user click a button in STV page<br>[FE] user click a button in MTV page<br>[FE] when user click login
- **Developer Status:** False<br>False<br>False<br>False<br>False<br>False<br>False<br>True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* |  |
| `section_name` | *STRING* |  |
| `button_type` | *STRING* |  |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `click_value` | *STRING* |  |
| `file_name` | *STRING* | If bulk, show list of file names |
| `file_group_name` | *STRING* |  |
| `is_bulk` | *BOOLEAN* | if there are more than 1 file |
| `referrer` | *STRING* | default parameter,  kindly check mixpanel doc |
| `distinct_id` | *STRING* |  |
| `current_url` | *STRING* |  |
| `clicked_at` | *ISO TIMESTAMP* |  |
| `parent_screen_name` | *STRING* |  |
| `sequence_id` | *STRING* |  |
| `year_value` | *STRING* |  |
| `modal_name` | *STRING* | NULL if not a modal |
| `source` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `sidepane_name` | *STRING* |  |
| `filter_value` | *STRING* | search value or filter value |
| `platform_name` | *STRING* | i.e. - "unspecified" - "BCA" |
| `tab_name` | *STRING* |  |
| `active_table_section_left` | *STRING* |  |
| `active_table_section_right` | *STRING* |  |

</details>

---
### `data_update_finish`
- **Context:** -
- **Triggered When:** [BE] sequence is successfully finish
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `user_id` | *STRING* |  |
| `distinct_id` | *STRING* |  |
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `sequence_id` | *STRING* | possible value: - workflow_name - empty for single_run |
| `sequence_type` | *STRING* | possible value: - ALL |
| `workflow_duration` | *NUMERIC* | duration in seconds |
| `status` | *STRING* |  |
| `finished_at` | *TIMESTAMP* |  |

</details>

---
### `data_update_running`
- **Context:** -
- **Triggered When:** [BE] sequence is successfully running
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `user_id` | *STRING* |  |
| `distinct_id` | *STRING* |  |
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `sequence_id` | *STRING* | possible value: - workflow_name |
| `sequence_type` | *STRING* | possible value: - ALL |
| `status` | *STRING* |  |
| `run_at` | *TIMESTAMP* |  |

</details>

---
### `email_crawled`
- **Context:** -
- **Triggered When:** [BE] file is successfully crawled
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `email_source` | *STRING* | mail address that being crawled |
| `email_subject` | *STRING* |  |
| `email_sender` | *STRING* | not forwarder, but the original sender |
| `file_name` | *STRING* | possible values: - file name |
| `file_type` | *STRING* | possible values: - CSV - XLSX - XLS - PDF - TXT |
| `file_size` | *NUMERIC* | In kilobyte |
| `filegroup_name` | *STRING* |  |
| `crawled_at` | *TIMESTAMP* |  |

</details>

---
### `error_log`
- **Context:** -
- **Triggered When:** [FE] when there is an error in rendering the page<br>[FE] when there is an error in rendering the page<br>[FE] when there is an error in rendering the page<br>[FE] when there is an error in rendering the page<br>[FE] when there is an error in rendering the page<br>[FE] when there is an error in rendering the page<br>[FE] page is failed to be rendered<br>[FE] page is failed to be rendered
- **Developer Status:** False<br>False<br>False<br>False<br>False<br>False<br>False<br>False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* |  |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `error_platform` | *STRING* |  |
| `error_type` | *STRING* |  |
| `error_code` | *STRING* | possible values: - 404 - 400 <and other http error status code> |
| `error_message` | *STRING* | possible values: - predefined message - error from FUSION |
| `error_trigger_actor` | *STRING* | "Who cause the error" information possible values: - "system" - "user" - (i.e. user input wrong param) |
| `referrer` | *STRING* | default parameter,  kindly check mixpanel doc |
| `distinct_id` | *STRING* |  |
| `current_url` | *STRING* |  |
| `error_at` | *ISO TIMESTAMP* |  |
| `section_name` | *STRING* | - |
| `component_name` | *STRING* | possible values: - NULL - component that failed to load |
| `utm_source` | *STRING* | This value is defined from query param possible values: - facebook - instagram - youtube - google - linkedin  source where traffic is coming from (what URL) |
| `utm_medium` | *STRING* | This value is defined from query param possible values: - website - banner ads - video - email  medium of where the campaign is sent from |
| `utm_campaign` | *STRING* | This value is defined from query param possible values: - onboarding_jan24 - tia_convention_mar24  the campaign name |
| `utm_content` | *STRING* | This value is defined from query param possible values: - matchmaking_feature_set - matchmaking_tutorial  the content name |
| `utm_term` | *STRING* | This value is defined from query param possible values: - recon_tools   the term/keywords that is used when bid |
| `typed_email` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `sidepane_name` | *STRING* |  |
| `tab_name` | *STRING* |  |

</details>

---
### `file_delete`
- **Context:** -
- **Triggered When:** [BE] file is successfully deleted from the list
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `file_name` | *STRING* |  |
| `filegroup_name` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `modified_by` | *STRING* | possible value: - user: when via UI click - system: when automated by time |
| `finished_at` | *TIMESTAMP* | current datetime |
| `error_message` | *STRING* | possible value: - NULL - "service failed to split data" - "file is too big" - "file pattern not match define rule" - {other error message} |

</details>

---
### `file_download`
- **Context:** -
- **Triggered When:** [BE] file is successfully downloaded to user local computer
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* |  |
| `sidepane_name` | *STRING* |  |
| `section_name` | *STRING* | following the active tab |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `file_name` | *STRING* |  |
| `filegroup_name` | *STRING* |  |
| `is_bulk` | *BOOL* | TRUE: file is coming from bulk |
| `finished_at` | *TIMESTAMP* | current datetime |

</details>

---
### `file_finish`
- **Context:** -
- **Triggered When:** [BE] file is successfully uploaded and processed to BQ
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* | possible values: - NULL - preprocess_page - source_detail_page |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `file_name` | *STRING* |  |
| `filegroup_name` | *STRING* | i.e. - SET-BCA - STA-BCA: 1234 - STA-BCA: 5678 |
| `file_from_split` | *BOOLEAN* | Added after file splitter taken |
| `section_name` | *STRING* | possible values: - local_files_section - email_section - uploaded_section - processed_section |
| `finished_at` | *TIMESTAMP* | current datetime |
| `error_message` | *STRING* | possible value: - NULL - "service failed to upload data" - "file is too big" - {other error message} |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `file_type` | *STRING* | possible values: - CSV - XLSX - XLS - PDF - TXT |
| `file_size` | *NUMERIC* | In kilobyte |
| `is_universal_upload` | *BOOL* | TRUE: file filegroup value coming from universal upload |
| `is_bulk` | *BOOL* | TRUE: file is coming from bulk action |
| `is_protected` | *BOOL* | TRUE; file is protected |
| `source_method` | *STRING* | possible values: - "manual upload" - "email crawler" - "api push" |

</details>

---
### `file_list_filter`
- **Context:** -
- **Triggered When:** [BE] file list successfully filtered
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `filtered_by_status` | *BOOL* | TRUE: when file is filtered by upload/process status |
| `filtered_by_filename` | *BOOL* | TRUE: when file is filtered by filename search |
| `filtered_by_date` | *BOOL* | TRUE: when file is filtered by daterange |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `viewed_at` | *ISO TIMESTAMP* |  |

</details>

---
### `file_llm_confirm`
- **Context:** -
- **Triggered When:** [BE] user successfully confirmed llm result
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `file_name` | *STRING* |  |
| `llm_content_type` | *STRING* | possible value: - "tabular" - "singular" - "mix" |
| `file_type` | *STRING* | possible value: - "pdf" - "jpeg" - "png" - "txt" |
| `file_size` | *NUMERIC* | In kilobyte |
| `is_modified` | *BOOLEAN* |  |
| `is_excluded` | *BOOLEAN* | TRUE: there's page that excluded |
| `filegroup_name` | *STRING* |  |
| `confirmed_at` | *TIMESTAMP* |  |
| `error_message` | *STRING* | possible value: - NULL - "service failed to upload data" - "file is too big" - {other error message} |

</details>

---
### `file_revert`
- **Context:** -
- **Triggered When:** [BE] file is successfully deleted from BQ
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `file_name` | *STRING* |  |
| `filegroup_name` | *STRING* |  |
| `file_size` | *NUMERIC* | In kilobyte |
| `modified_by` | *STRING* | possible value: - user: when via UI click - system: when automated by time |
| `duration` | *NUMERIC* | In seconds |
| `finished_at` | *TIMESTAMP* | current datetime |

</details>

---
### `file_upload`
- **Context:** -
- **Triggered When:** [BE] file is succesfully uploaded from local computer but not processed yet
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `file_name` | *STRING* |  |
| `file_type` | *STRING* | possible values: - CSV - XLSX - XLS - PDF - TXT |
| `file_size` | *NUMERIC* | In kilobyte |
| `filegroup_name` | *STRING* |  |
| `is_universal_upload` | *BOOL* | TRUE: file filegroup value coming from universal upload |
| `is_bulk` | *BOOL* | TRUE: file is coming from bulk action |
| `is_protected` | *BOOL* | TRUE: file is protected |
| `source_method` | *STRING* | possible values: - "manual upload" - "email crawler" - "api push" |
| `uploaded_at` | *TIMESTAMP* | current datetime |
| `screen_name` | *STRING* |  |
| `file_is_protected` | *BOOLEAN* |  |
| `datasource_type` | *STRING* |  |
| `file_from_split` | *BOOLEAN* | [UPDATE]  TRUE - if file is from split result |
| `upload_status` | *STRING* | possible value: - "success" - "failed" |
| `error_message` | *STRING* | [UPDATE]  should be removed, as there is already error events |

</details>

---
### `page_view`
- **Context:** Homepage - Navigation<br>Table - Discovery page<br>Table - STV page<br>Table - MTV page<br>Login Page
- **Triggered When:** [FE] page is fully loaded<br>[FE] page is fully loaded<br>[FE] page is fully loaded<br>[FE] page is fully loaded<br>[FE] page fully loaded
- **Developer Status:** False<br>False<br>False<br>False<br>True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* |  |
| `section_name` | *STRING* |  |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `viewed_at` | *ISO TIMESTAMP* |  |
| `parent_screen_name` | *STRING* |  |
| `table_name` | *STRING* |  |
| `file_group_name` | *STRING* |  |
| `secondary_table_name` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `tab_name` | *STRING* |  |
| `active_table_section_left` | *STRING* |  |
| `active_table_section_right` | *STRING* |  |

</details>

---
### `table_download`
- **Context:** -
- **Triggered When:** [BE] Email download is sent through email 

OR

[FE] Ledger download from current page is triggered
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `table_name` | *STRING* |  |
| `view_type` | *STRING* |  |
| `download_media` | *STRING* | if via filter download, email download |
| `is_customview` | *BOOL* |  |
| `file_size` | *NUMERIC* | size of the total file that will be downloaded in KB (if possible) |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* | company id can be left null, since company is get through USER_ID |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `applied_at` | *ISO TIMESTAMP* |  |

</details>

---
### `table_force_detach`
- **Context:** -
- **Triggered When:** [BE] force detach successfully applied
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `prev_match_id` | *STRING* |  |
| `active_table_section_left` | *STRING* |  |
| `active_table_section_right` | *STRING* |  |
| `selected_row_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `duration` | *NUMERIC* | in seconds |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `detached_at` | *ISO TIMESTAMP* |  |

</details>

---
### `table_force_match`
- **Context:** -
- **Triggered When:** [BE] force match successfully applied
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `selection_method` | *STRING* | - "bulk" when from bulk force match - "singular" when from single force match currently only use singular (since bulk is not yet created) |
| `active_table_section_left` | *STRING* |  |
| `active_table_section_right` | *STRING* |  |
| `left_row_id` | *STRING* |  |
| `right_row_id` | *STRING* |  |
| `match_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `duration` | *NUMERIC* | in seconds |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `detached_at` | *ISO TIMESTAMP* |  |

</details>

---
### `table_get_record`
- **Context:** -
- **Triggered When:** [BE] table record is successfully shown
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `table_name` | *STRING* |  |
| `table_section` | *STRING* |  |
| `load_time` | *INT* | in seconds |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `page_change` | *INT* |  |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `viewed_at` | *ISO TIMESTAMP* |  |

</details>

---
### `table_list_import`
- **Context:** -
- **Triggered When:** [BE] table is successfully imported
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `imported_result_num` | *NUMERIC* |  |
| `imported_at` | *TIMESTAMP* |  |

</details>

---
### `task_created`
- **Context:** -
- **Triggered When:** [BE] task is successfully created
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `task_id` | *STRING* |  |
| `task_title` | *STRING* |  |
| `task_description` | *STRING* |  |
| `task_additional_desc` | *STRING* |  |
| `task_reporter` | *STRING* | that report the task |
| `task_due_date` | *STRING* | in date format "yyyy-mm-dd" |
| `task_assignee` | *STRING* | that take the task |
| `task_type` | *STRING* | possible value: - "manual task" - "alert issue" - "workflow insight" |
| `created_at` | *TIMESTAMP* |  |

</details>

---
### `user_signup`
- **Context:** USER
- **Triggered When:** [BE] when user account successfully created
- **Developer Status:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `user_id` | *STRING* | (intenal user) as-is |
| `company_id` | *STRING* | (internal user) use matchmade company id or dev company |
| `company_industry` | *STRING* | (internal user) let it NULL |
| `role` | *STRING* | (internal user) "delivery" or "data model" |
| `paid/demo` | *STRING* | (internal user) let it NULL |
| `received_at` | *TIMESTAMP* | current datetime |

</details>

---
### `worker_run_finish`
- **Context:** -
- **Triggered When:** [BE] a worker is successfully run (or from workflow finish)
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `user_id` | *STRING* |  |
| `distinct_id` | *STRING* |  |
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `sequence_id` | *STRING* | possible value: - workflow_name - empty for single_run |
| `worker_name` | *STRING* |  |
| `duration` | *NUMERIC* | in seconds |
| `status` | *STRING* |  |
| `finished_at` | *TIMESTAMP* |  |

</details>

---
### `workflow_update_click`
- **Context:** -
- **Triggered When:** [FE] user click "update" in workflow
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* |  |
| `sidepane_name` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `section_name` | *STRING* |  |
| `button_type` | *STRING* |  |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `click_value` | *STRING* |  |
| `referrer` | *STRING* | default parameter,  kindly check mixpanel doc |
| `distinct_id` | *STRING* |  |
| `current_url` | *STRING* |  |
| `clicked_at` | *ISO TIMESTAMP* |  |

</details>

---
### `workflow_update_confirm_click`
- **Context:** -
- **Triggered When:** [FE] user click "update" in workflow modal
- **Developer Status:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* |  |
| `sidepane_name` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `section_name` | *STRING* |  |
| `button_type` | *STRING* |  |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `click_value` | *STRING* |  |
| `uploaded_required_num` | *NUMERIC* |  |
| `referrer` | *STRING* | default parameter,  kindly check mixpanel doc |
| `distinct_id` | *STRING* |  |
| `current_url` | *STRING* |  |
| `clicked_at` | *ISO TIMESTAMP* |  |

</details>

---

## 2. Unmapped Mixpanel Events (Needs Documentation/Cleanup)
These events appear in Mixpanel data but are **not** present in the current Event Catalog.

### `$identify`
- **Notes:** Mixpanel Default Event

<details><summary>View Attributes</summary>

*No specific attributes documented.*

</details>

---
### `$mp_click`
- **Notes:** Mixpanel Default Event

<details><summary>View Attributes</summary>

*No specific attributes documented.*

</details>

---
### `$mp_rage_click`
- **Notes:** Mixpanel Default Event

<details><summary>View Attributes</summary>

*No specific attributes documented.*

</details>

---
### `$mp_session_record`
- **Notes:** Mixpanel Default Event

<details><summary>View Attributes</summary>

*No specific attributes documented.*

</details>

---
### `$mp_web_page_view`
- **Notes:** Mixpanel Default Event

<details><summary>View Attributes</summary>

*No specific attributes documented.*

</details>

---
### `modal_view`
- **Notes:** Undocumented Custom Event

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* |  |
| `modal_name` | *STRING* |  |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `file_id` | *STRING* |  |
| `referrer` | *STRING* | default parameter,  kindly check mixpanel doc |
| `distinct_id` | *STRING* |  |
| `current_url` | *STRING* |  |
| `clicked_at` | *ISO TIMESTAMP* |  |
| `parent_screen_name` | *STRING* |  |
| `sidepane_name` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `modal_type` | *STRING* |  |
| `last_workflow_status_view` | *STRING* |  |

</details>

---
### `pass_reset`
- **Notes:** Undocumented Custom Event

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `typed_email` | *STRING* |  |
| `received_at` | *TIMESTAMP* | current datetime |

</details>

---
### `upload_gcs_error`
- **Notes:** Undocumented Custom Event

<details><summary>View Attributes</summary>

*No specific attributes documented.*

</details>

---

## 3. Pending / Missing Events (Needs Implementation/Review)
These events are defined in the Catalog but are **not** found in Mixpanel.

### `file_llm_extract`
- **Context:** -
- **Expected Trigger:** [BE] file is successsfully converted via llm waiting for review
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `file_name` | *STRING* |  |
| `file_fragment_id` | *STRING* |  |
| `file_group_name` | *STRING* |  |
| `llm_content_type` | *STRING* | possible value: - "tabular" - "singular" - "mix" |
| `file_type` | *STRING* | possible value: - "pdf" - "jpeg" - "png" - "txt" |
| `file_size` | *NUMERIC* | In kilobyte |
| `input_token_count` | *NUMERIC* |  |
| `output_token_count` | *NUMERIC* |  |
| `model_name` | *STRING* | possible value: - "chatgpt-4o-latest" - "gpt-4o" - other models |
| `duration` | *NUMERIC* | In seconds |
| `extracted_at` | *TIMESTAMP* |  |
| `error_message` | *STRING* | possible value: - NULL - "service failed to upload data" - "file is too big" - {other error message} |

</details>

---
### `multi_table_connection_applied`
- **Context:** -
- **Expected Trigger:** [BE] Connection modification successfully applied
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `active_table_section_left` | *STRING* |  |
| `active_table_section_right` | *STRING* |  |
| `connection_name` | *STRING* |  |
| `multi_table_connection_type` | *STRING* |  |
| `is_multiple_match_key` | *BOOL* | - TRUE: when matching, and key>1 - FALSE: when matching, and key = 1 or when not matching |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `viewed_at` | *ISO TIMESTAMP* |  |

</details>

---
### `multi_table_connection_created`
- **Context:** -
- **Expected Trigger:** [BE] Connection modification successfully created
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `active_table_section_left` | *STRING* |  |
| `active_table_section_right` | *STRING* |  |
| `connection_name` | *STRING* |  |
| `multi_table_connection_type` | *STRING* |  |
| `is_multiple_match_key` | *BOOL* | - TRUE: when matching, and key>1 - FALSE: when matching, and key = 1 or when not matching |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `duration` | *NUMERIC* | in seconds |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `detached_at` | *ISO TIMESTAMP* |  |

</details>

---
### `multi_table_trace`
- **Context:** -
- **Expected Trigger:** [BE] Trace result shown
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `active_table_section_left` | *STRING* |  |
| `active_table_section_right` | *STRING* |  |
| `is_trace_found` | *BOOL* | - TRUE: when return >0 row id - FALSE: when return 0 row id |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `viewed_at` | *ISO TIMESTAMP* |  |

</details>

---
### `multi_table_view_applied`
- **Context:** -
- **Expected Trigger:** [BE] stack/section is successfully updated
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `active_table_section_left` | *STRING* |  |
| `active_table_section_right` | *STRING* |  |
| `connection_name` | *STRING* | Null if none |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `applied_at` | *ISO TIMESTAMP* |  |

</details>

---
### `page_limit_modified`
- **Context:** -
- **Expected Trigger:** [BE] table page limit is successully updated
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* |  |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `platform_ver` | *STRING* |  |
| `page_limit` | *STRING* |  |
| `clicked_at` | *TIMESTAMP* | current datetime |
| `error_message` | *STRING* | possible value: - NULL - "service failed to upload data" - "file is too big" - {other error message} |

</details>

---
### `sidepane_view`
- **Context:** Homepage - Source Detail Pane<br>Homepage - Task Pane
- **Expected Trigger:** [FE] source pane is fully loaded<br>[FE] task pane is fully loaded
- **Scheduled / Jira:** True<br>False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `sidepane_name` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `section_name` | *STRING* | following the active tab |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `viewed_at` | *ISO TIMESTAMP* |  |
| `parent_screen_name` | *STRING* |  |
| `screen_name` | *STRING* | following active screen, possible values: - "homepage" - "table" - "worker" |

</details>

---
### `table_api_download`
- **Context:** -
- **Expected Trigger:** [BE] API request to download the table from other system directly
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `table_name` | *STRING* |  |
| `view_type` | *STRING* |  |
| `download_media` | *STRING* |  |
| `is_customview` | *BOOL* |  |
| `file_size` | *NUMERIC* | keep it empty |
| `user_id` | *STRING* | keep it empty |
| `Company ID` | *STRING* |  |
| `distinct_id` | *STRING* | default parameter,  kindly check mixpanel doc |
| `referrer` | *STRING* |  |
| `current_url` | *STRING* |  |
| `applied_at` | *ISO TIMESTAMP* |  |

</details>

---
### `table_delete`
- **Context:** -
- **Expected Trigger:** [BE] table is successfully deleted from the list
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `table_name` | *STRING* |  |
| `table_dataset` | *STRING* |  |
| `deleted_at` | *TIMESTAMP* |  |

</details>

---
### `table_filter`
- **Context:** -
- **Expected Trigger:** [BE] table is successfully filtered
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* | possible value: - source_detail_page - transform_detail_page - matchmap_detail_page |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `matchmapview_name` | *STRING* |  |
| `table_id` | *STRING* |  |
| `table_position` | *STRING* | possible value: - first - second - third - NULL (if not matchmap) |
| `filter_query` | *STRING* |  |
| `is_filter_by_log` | *BOOLEAN* | - TRUE: if filter applied from modification log - NULL (if not matchmap) |
| `is_save_filter` | *BOOLEAN* | - TRUE: if filter applied from saved filter - NULL (if not matchmap) |
| `filter_view_name` | *STRING* | NULL if empty |
| `received_at` | *TIMESTAMP* | current datetime |
| `platform_ver` | *STRING* |  |
| `filter_type` | *STRING* | possible values: - simple: if filter is from non-stt like filter - advance: if filter is from stt like filter |
| `table_name` | *STRING* |  |
| `load_time` | *INT* | in seconds |
| `table_section` | *STRING* |  |
| `table_stack` | *STRING* |  |

</details>

---
### `table_modif_applied`
- **Context:** -
- **Expected Trigger:** [BE] Native table modification is successfully applied
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `user_id` | *STRING* | Possible values: - <user_id> - "system_qa_seq" |
| `company_id` | *STRING* | possible values: - <company_id> - "system_qa_seq" |
| `platform_ver` | *STRING* |  |
| `row_changes_count` | *INTEGER* | count the number of row that is modified |
| `finished_at` | *TIMESTAMP* | current datetime |
| `error_message` | *STRING* | possible value: - NULL - "service failed to upload data" - "file is too big" - {other error message} |

</details>

---
### `table_refresh`
- **Context:** -
- **Expected Trigger:** [FE] user click refresh table, and successfully trigger get record
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `table_name` | *STRING* |  |
| `table_section` | *STRING* |  |
| `table_stack` | *STRING* |  |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `received_at` | *TIMESTAMP* | current datetime |

</details>

---
### `table_rename`
- **Context:** -
- **Expected Trigger:** [BE] table is successfully renamed
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `table_name` | *STRING* |  |
| `table_dataset` | *STRING* |  |
| `renamed_at` | *TIMESTAMP* |  |

</details>

---
### `table_sort`
- **Context:** -
- **Expected Trigger:** [BE] table is successfully sorted
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* | possible value: - source_detail_page - transform_detail_page - matchmap_detail_page |
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `matchmapview_name` | *STRING* | NULL (if not matchmap) |
| `table_id` | *STRING* |  |
| `table_position` | *STRING* | possible value: - first - second - third - NULL (if not matchmap) |
| `sort_query` | *STRING* |  |
| `is_save_filter` | *BOOLEAN* | - TRUE: if filter applied from saved filter |
| `filter_view_name` | *STRING* | NULL if empty |
| `received_at` | *TIMESTAMP* | current datetime |
| `platform_ver` | *STRING* |  |
| `table_name` | *STRING* |  |
| `load_time` | *INT* | in seconds |
| `table_section` | *STRING* |  |
| `table_stack` | *STRING* |  |

</details>

---
### `table_starred`
- **Context:** -
- **Expected Trigger:** [BE] table is successfully starred
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `table_name` | *STRING* |  |
| `table_dataset` | *STRING* |  |
| `imported_at` | *TIMESTAMP* |  |

</details>

---
### `task_deleted`
- **Context:** -
- **Expected Trigger:** [BE] task is successfully deleted
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `task_id` | *STRING* |  |
| `task_title` | *STRING* |  |
| `task_description` | *STRING* |  |
| `task_additional_desc` | *STRING* |  |
| `task_reporter` | *STRING* | that report the task |
| `task_due_date` | *STRING* | in date format "yyyy-mm-dd" |
| `task_assignee` | *STRING* | that take the task |
| `task_type` | *STRING* | possible value: - "manual task" - "alert issue" - "workflow insight" |
| `deleted_by` | *STRING* | that delete the task |
| `deleted_at` | *TIMESTAMP* |  |

</details>

---
### `task_draft_created`
- **Context:** -
- **Expected Trigger:** [FE] task draft is successfully created
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `screen_name` | *STRING* | following active screen, possible values: - "homepage" - "table" - "worker" |
| `sidepane_name` | *STRING* |  |
| `platform_ver` | *STRING* | - legacy dashboard: "V1" - facelift dashboard: "V2" |
| `section_name` | *STRING* | following the active tab |
| `trigger` | *STRING* | System that trigger the task draft being shown |
| `company_id` | *STRING* |  |
| `user_id` | *STRING* |  |
| `referrer` | *STRING* | default parameter,  kindly check mixpanel doc |
| `distinct_id` | *STRING* |  |
| `current_url` | *STRING* |  |
| `clicked_at` | *ISO TIMESTAMP* |  |

</details>

---
### `task_list_filtered`
- **Context:** -
- **Expected Trigger:** [BE] task is successfully filtered
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `filter_value` | *STRING* | possible values: - search key - filter by status - filter by date range |
| `filtered_result_num` | *NUMERIC* |  |
| `filtered_at` | *TIMESTAMP* |  |

</details>

---
### `task_status_updated`
- **Context:** -
- **Expected Trigger:** [BE] task status is updated
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `platform_ver` | *STRING* |  |
| `company_id` | *STRING* |  |
| `task_id` | *STRING* |  |
| `task_title` | *STRING* |  |
| `task_description` | *STRING* |  |
| `task_additional_desc` | *STRING* |  |
| `task_reporter` | *STRING* | that report the task |
| `task_due_date` | *STRING* | in date format "yyyy-mm-dd" |
| `task_assignee` | *STRING* | that take the task |
| `prev_status` | *STRING* |  |
| `target_status` | *STRING* |  |
| `task_type` | *STRING* | possible value: - "manual task" - "alert issue" - "workflow insight" |
| `updated_by` | *STRING* | that delete the task |
| `updated_at` | *TIMESTAMP* |  |

</details>

---
### `user_login`
- **Context:** -
- **Expected Trigger:** [BE] when user successfully login
- **Scheduled / Jira:** False

<details><summary>View Attributes</summary>


**Event Attributes:**

| Attribute | Type | Description/Notes |
|---|---|---|
| `user_id` | *STRING* |  |
| `company_id` | *STRING* |  |
| `company_industry` | *STRING* |  |
| `role` | *STRING* |  |
| `paid/demo` | *STRING* |  |
| `received_at` | *TIMESTAMP* | current datetime |

</details>

---
### `workflow_search`
- **Context:** -
- **Expected Trigger:** [FE] Search result is successfully shown
- **Scheduled / Jira:** True

<details><summary>View Attributes</summary>

*No specific attributes documented.*

</details>

---
