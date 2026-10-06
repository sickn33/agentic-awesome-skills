---
name: axonx
description: "Develop AxonX research plugins and operate quantitative research tasks through CLI or MCP, inspecting execution status, logs, artifacts, and lineage."
category: finance
risk: critical
source: "https://github.com/FlowLLM-AI/AxonX/tree/862b90da9c49c3bdee4c2ab9ef896c415aee9f45/skills/axonx"
source_repo: FlowLLM-AI/AxonX
source_type: community
license: Apache-2.0
license_source: "https://github.com/FlowLLM-AI/AxonX/blob/862b90da9c49c3bdee4c2ab9ef896c415aee9f45/LICENSE"
date_added: "2026-10-04"
tags: [quantitative-research, mcp, backtesting, python]
---

# AxonX Development and Operations Guide

This guide can be read independently or installed as an Agent skill. Documentation and source links use absolute URLs, so copying this file does not depend on its original directory. The maintained project is [FlowLLM-AI/AxonX](https://github.com/FlowLLM-AI/AxonX).

Source paths such as `plugins/a158/...` are relative to the root of an AxonX source checkout, not to this document or the Agent workspace. Run source development and plugin build commands from that checkout. Workspace paths passed to Jobs such as `preview_file` are relative to the selected service's workspace. Package installation alone does not provide the example plugin sources.

## When to Use This Skill

- Use when developing or modifying AxonX research plugins and their typed Task contracts.
- Use when a user requests AxonX research task submission, execution tracking, failure investigation, or artifact inspection.
- Use when integrating an external Agent with an existing AxonX MCP service.

## Security & Safety Notes

This skill is labeled `critical` because it documents package installation, task submission, remote shell execution, cancellation, deletion, and artifact replacement. Establish the user's requested operation and exact service/workspace first. Do not treat command examples as authorization. Request clarification when the execution target or the scope of a destructive operation is unclear; existing explicit authorization remains valid. Never expose service or data-provider tokens in reports, logs, or committed files. Back up irreplaceable artifacts before authorized replacement or deletion.

## Prepare the Environment and Service

Use Python 3.12+ on macOS or Linux for local Task execution. In your chosen working directory, create and activate a virtual environment, then install the core:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install axonx
axonx help
```

For the prebuilt Studio UI, install `axonx[studio]` instead. Research plugins are installed separately. For source development, clone the project, enter its root, and install it in an activated virtual environment:

```bash
git clone https://github.com/FlowLLM-AI/AxonX.git
cd AxonX
pip install -e .
```

Configure credentials through environment variables or a `.env` file discovered from the process working directory or its parents. Before starting a local service, replace the token placeholder with your own value:

```bash
export AXONX_SERVICE_TOKEN='replace-with-your-local-service-token'
axonx start --service.host 127.0.0.1
```

Keep that process running. In another terminal, activate the same environment and configure the same token, then run `axonx version` to verify the connection. The default port is `1024`; the default workspace is `.axonx` under the startup directory. If using an existing service, obtain its address and authentication configuration before making calls. Keep one execution target for plugin queries, submissions, status, logs, and artifact inspection.

For MCP clients, connect to `http://127.0.0.1:1024/mcp` using Streamable HTTP and the header `Authorization: Bearer <service-token>`; replace the address and token with those of your service. Discover tools from the connected service rather than assuming a fixed tool catalog. The CLI examples below describe the same operations; use the discovered MCP input schemas when calling tools.

The built-in `demo` Task can verify submission and tracking without market-data or model credentials; the Alpha158 workflow requires its research plugin and prepared input data. Market-data downloads require `AXONX_TUSHARE_TOKEN`; model-backed Agents require separate model configuration. See [Quick start](https://flowllm-ai.github.io/AxonX/en/getting-started/quickstart), [Research workflow](https://flowllm-ai.github.io/AxonX/en/research/workflow), and [MCP integration](https://flowllm-ai.github.io/AxonX/en/agent/mcp-integration) for complete setup examples.

When using this document as a skill, perform only the operations required by the user's request. Documentation examples do not authorize installation, task execution, deletion, or remote changes by themselves. For changes to the source checkout, follow its `AGENTS.md` and [contribution guide](https://github.com/FlowLLM-AI/AxonX/blob/main/CONTRIBUTING.md).

## Background

AxonX is a harness framework for financial quantitative research, organizing data acquisition and ETL, factor analysis, model training, prediction, and backtesting into Tasks with consistent input/output contracts.
Plugins register research implementations; Tasks link upstream and downstream work through Task IDs. The CLI and HTTP service support submitting execution on local or remote machines and querying machine resources, runtime status, and logs.
The framework records task configuration, dependencies, result metadata, and artifacts in the workspace, and provides Agents with task, dependency graph, and file query tools to verify research results, investigate failures, and reuse upstream data.

- Authentication: when service authentication is enabled, configure local `AXONX_SERVICE_TOKEN` or remote `AXONX_TARGET_TOKEN` in environment variables or `.env` beforehand.
- Local operations: use the “Command” column without `--target`. Submit and query Tasks and machine resources directly through the local AxonX HTTP service.
- Discover remote machines: use `axonx list_machines` to query addresses (`address`, such as
  `http://192.168.1.10:1024`) and health status (`healthy`) for all machines configured in the local service's `targets`, then use `axonx machine_status --target <host:port>` to inspect candidates'
  CPU, memory, and GPU resources.
- Remote operations: once the target address is known, append `--target <host:port>` from the “Remote arguments” column to commands that support remote operation.

`192.168.1.10:1024` in the tables is an example target address; replace it before execution. `—` means remote operation is unsupported.

## Plugin Development

A plugin can register multiple Tasks; the a158 example registers five Task types in `plugins/a158/axonx_alpha158/plugin.yaml`. The a158
paths, class names, registered names, and dependency chain here are illustrative; replace them with actual definitions when developing other research plugins. Plugin installation and Task submission are separate operations.

### Required authoring contracts

Every plugin Task must directly or indirectly inherit `BaseTask` and follow the public authoring contract in
[`axonx/task/core/task.py`](https://github.com/FlowLLM-AI/AxonX/blob/main/axonx/task/core/task.py). Registration alone does not replace this contract:

- Declare a fixed `task_type`, `input_cls`, `output_cls`, and a detailed class docstring. Input and output models must
  inherit `BaseInputParams` and `BaseOutputParams` from [`core/params.py`](https://github.com/FlowLLM-AI/AxonX/blob/main/axonx/task/core/params.py).
- Implement `build_task_steps()` to yield synchronous callables in execution order, and `build_output_params()` to
  return a validated instance of the declared `output_cls`; returning a plain dictionary does not satisfy the contract.
- Preserve framework-managed Task identity, context, lifecycle, and metadata persistence. Use `self.task_dir`,
  `source_task_dir()`, and `resolve_workspace_path()` for task artifacts and workspace paths; leave execution and
  status recording to the framework runtime.

[`axonx/task/contracts/`](https://github.com/FlowLLM-AI/AxonX/tree/main/axonx/task/contracts) provides optional standard research Task and parameter classes
for ETL, Analysis, Train, Predict, and Backtest. For these research stages, prefer the corresponding `Base*Task`,
`Base*InputParams`, and `Base*OutputParams` classes. Once adopted, their required fields, types, and validators are part
of the plugin's contract: preserve them and declare additional fields in subclasses. A custom Task may inherit
`BaseTask` directly with its own parameter models, but must still follow the core contract; registration does not
require every Task to inherit one of the five research base classes.

Before implementation, read [Task contracts](https://flowllm-ai.github.io/AxonX/en/reference/task-contracts), [Task lifecycle](https://flowllm-ai.github.io/AxonX/en/concepts/task-lifecycle),
and [Research artifact contracts](https://flowllm-ai.github.io/AxonX/en/reference/research-artifacts). Standard Python fields alone do not guarantee
compatibility with downstream plugins or Studio; also satisfy the artifact mappings and presentation fields used by
the intended consumers.

### Task Types

| Type     | Concept and purpose                                                               |
| -------- | --------------------------------------------------------------------------------- |
| ETL      | Clean and align raw data to generate datasets for subsequent research.            |
| Analysis | Analyze factors in an ETL dataset to diagnose factor quality and performance.     |
| Train    | Train a model using an ETL dataset, producing the model and training results.     |
| Predict  | Generate predictions using a model produced by Train and its associated ETL data. |
| Backtest | Backtest Predict results to evaluate strategy performance.                        |

Tasks link upstream and downstream through Task IDs. The a158 example's main dependency chain is ETL → Train → Predict → Backtest; Analysis uses ETL data for factor analysis.

### Development Steps

#### 1. Modify Code and Registration

For ETL, the minimal structure includes input parameters, output parameters, a Task implementation, and registration. The following is a structural example; replace `...` in `transform` with actual ETL
logic that reads input and writes results to `self.state["output"]`.

`plugins/a158/axonx_alpha158/etl.py`:

```python
from pathlib import Path

from axonx.task.contracts import BaseETLInputParams, BaseETLOutputParams, BaseETLTask


class Alpha158InputParams(BaseETLInputParams):
    input_dir: Path = Path("tushare")


class Alpha158OutputParams(BaseETLOutputParams):
    pass  # Use the ETL base class's output fields directly


class Alpha158Task(BaseETLTask):
    """Clean and align raw market data to create an ETL dataset for training and factor analysis.
    """

    input_cls = Alpha158InputParams
    output_cls = Alpha158OutputParams
    input_params: Alpha158InputParams

    def build_task_steps(self):
        yield self.transform

    def transform(self):
        # Read data from self.resolve_workspace_path(self.input_params.input_dir),
        # save artifacts to self.task_dir, and populate self.state["output"].
        ...

    def build_output_params(self):
        return self.output_cls(**self.state["output"])
```

A Task class must define a nonempty class docstring, used as the Task definition's `description`. Without it, Task resolution and definition queries raise
`TypeError: Task ... must define a detailed class docstring`. Describe the task's purpose, input, and artifacts; method docstrings alone are insufficient.

`BaseETLOutputParams` already defines required fields `output_file`, `rows`, and `date_range`, so `self.state["output"]` must contain at least these three fields. Add fields to
`Alpha158OutputParams` when additional results are needed.

`plugins/a158/axonx_alpha158/plugin.yaml` registers the Task name used by the CLI:

```yaml
tasks:
  a158_etl: axonx_alpha158.etl:Alpha158Task
```

`a158_etl` is the `--task` value for submission; the Python module precedes the colon and the Task class name follows it.

For a new plugin, the package directory must contain `__init__.py`, and `plugins/a158/pyproject.toml` must declare the plugin entry point and registration file distributed with the package. The existing a158 plugin already configures these:

```toml
[project.entry-points."axonx.plugins"]
alpha158 = "axonx_alpha158"

[tool.setuptools.package-data]
axonx_alpha158 = ["plugin.yaml"]
```

#### 2. Install the Plugin

Build a wheel from source and install it into the current Python environment:

```bash
axonx plugin install plugins/a158
```

For Task execution on a remote machine, append `--target 192.168.1.10:1024`; the CLI uploads the wheel and installs it on the target service.

#### 3. Confirm Plugin and Task Registration

- Confirm installation: use `axonx plugin list` to verify that the target plugin is installed and `error` is empty; keys in the returned `tasks` mapping are registered names for `--task`.
- View definitions: use `axonx get_task_definition --task a158_etl` to inspect the selected Task's description, type, and input/output schemas.
- Use a consistent target: append the same `--target 192.168.1.10:1024` for remote queries and submission. Explicitly specify the service address when the local service uses a different Python environment as well.

#### 4. Check Execution Resources

- Use `axonx machine_status` to query CPU, memory, and GPU resources on the execution machine; append `--target 192.168.1.10:1024` for remote execution.
- Confirm that the machine meets the research task's resource requirements before submitting a Task to that service.

#### 5. Submit Tasks

Run only the Tasks needed for the current change and reuse unaffected successful upstream artifacts. Control variables: change only the factor being evaluated, keeping all other data, intervals, and parameters consistent with the baseline.

- Add factors: ETL → Train → Predict → Backtest.
- Update model architecture: Train → Predict → Backtest, reusing existing ETL.
- Update position management: run only Backtest, reusing existing Predict.

Run Analysis only when factor diagnostics are needed. Select the following commands as required.

| Command name | Description                                                                                         | Command                                                                | Remote arguments             |
| ------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| `submit`     | Submit ETL to clean data and generate a dataset; the example specifies the data start date.         | `axonx submit --task a158_etl --start-date 20150101`                   | `--target 192.168.1.10:1024` |
| `submit`     | Submit Analysis to analyze factors in the specified ETL artifacts.                                  | `axonx submit --task a158_factor --source-tasks '<etl_task_id>'`       | `--target 192.168.1.10:1024` |
| `submit`     | Submit Train to train a model using the specified ETL dataset.                                      | `axonx submit --task a158_train --source-tasks '<etl_task_id>'`        | `--target 192.168.1.10:1024` |
| `submit`     | Submit Predict to generate predictions using the specified Train model and its associated ETL data. | `axonx submit --task a158_predict --source-tasks '<train_task_id>'`    | `--target 192.168.1.10:1024` |
| `submit`     | Submit Backtest to evaluate the specified Predict results.                                          | `axonx submit --task a158_backtest --source-tasks '<predict_task_id>'` | `--target 192.168.1.10:1024` |

- Registered Task name: `--task a158_etl` corresponds to a key in `plugin.yaml`'s `tasks`, pointing to `axonx_alpha158.etl:Alpha158Task`. Obtain registered Task names from
  `tasks` keys returned by `axonx plugin list`; use `axonx get_task_definition --task a158_etl` to view the complete definition.
- Input parameters: the Task's `input_cls` defines types and defaults. The CLI converts hyphens to underscores: for example, `--start-date` corresponds to
  `Alpha158InputParams.start_date`, read through `self.input_params.start_date`; `--input-dir` corresponds to `input_dir`. Undeclared fields are rejected.
- Task naming: omit `--task-name` by default. Names are generated as `YYYYMMDDHH` plus four random letters or digits, yielding Task IDs such as
  `etl#a158_etl#<generated name>`. Pass a name only when the user specifies one; **reusing an explicit name replaces artifacts after the previous execution finishes**.
- Return values: inspect the response's `success` and `answer` in full. Successful submission means only that execution was accepted. `answer` contains `task_id`, `run_id`, and `task`, but not
  `state`. Record both actual returned IDs to wait for this run. Downstream `source-tasks` uses the successful upstream `task_id`; do not guess IDs.
- Upstream/downstream linkage: fill `--source-tasks` with Task IDs returned by successful upstream tasks. Separate multiple IDs with commas, such as `'<id1>,<id2>'`; an empty value means no upstream tasks.
  Downstream tasks locate artifacts through upstream `metadata.json`.
- Execution target: omit `--target` locally; for remote execution, append the arguments in the table and replace the address with the actual target.

#### 6. Track Execution and Inspect Artifacts

- Use the actual Task ID and Run ID from submission to wait, query status, read logs, and inspect artifacts on the same service.
- Inspect the complete `answer` from `status`, `wait_task`, or `stream_task`: verify `task_id`, `run_id`, and `state`, and review
  `result`, `error`, `exit_code`, `log_path`, step progress, and other fields. `status`'s `success` means the query succeeded, not that the Task succeeded.
- Continue waiting while `state` is `queued` or `running`; submit downstream tasks only after `succeeded`. For `failed` or `cancelled`, inspect errors and logs first.
- `wait_task` requires the returned `task_id` and `run_id` to wait for that execution. Resubmitting the same Task ID changes Run ID; a mismatch produces an error. Use
  `--poll-interval 1` to set the polling interval in seconds (must exceed 0; default 1). For long tasks, use `--client-timeout 86400` to increase the client request timeout; it does not set
  a Task execution time limit. `wait_task` returns `success: true` only when the final state is `succeeded`.

| Command name    | Description                                                                             | Command                                                                                    | Remote arguments             |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| `wait_task`     | Wait for the specific run returned by submission and check final `answer.state`.        | `axonx wait_task --task-id '<etl_task_id>' --run-id '<etl_run_id>' --client-timeout 86400` | `--target 192.168.1.10:1024` |
| `status`        | Query the submitted ETL Task's status to confirm success.                               | `axonx status --task-id '<etl_task_id>'`                                                   | `--target 192.168.1.10:1024` |
| `read_task_log` | Read recent logs for this ETL Task to inspect output or investigate failures.           | `axonx read_task_log --task-id '<etl_task_id>'`                                            | `--target 192.168.1.10:1024` |
| `preview_file`  | Inspect successful ETL metadata to obtain the dataset artifact path for downstream use. | `axonx preview_file --path 'etl/<etl_task_id>/metadata.json'`                              | `--target 192.168.1.10:1024` |

For other Tasks, use their actual Task IDs and workspace paths for the corresponding type. See the CLI API below for live tracking, dependency graph queries, and data preview commands.

## CLI API

- Example values: replace IPs, Task IDs, and upload path placeholders with actual values from configuration or service responses.
- Parameter format: place regular Job parameters after the Job name; pass JSON arrays as a single shell argument.
- Execution timeout: `shell`'s `--timeout` is the Job execution timeout; `--client-timeout` is the client request timeout. Use the latter for long Task waits.
- Execution conditions: **execute destructive Jobs and `shell` only when the current task requires them and the target has been confirmed**.

### Startup and Local Execution

| Command name | Description                                                                                                                                                                 | Command                                            | Remote arguments             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| `help`       | Show CLI usage, local commands, and how to call service Jobs.                                                                                                               | `axonx help`                                       | —                            |
| `start`      | Load the registered `default` configuration when none is specified and start the local HTTP service.                                                                        | `axonx start`                                      | —                            |
| `start`      | Start the service with an explicitly specified YAML file; the example path is relative to the AxonX repository root and can be replaced with the actual configuration file. | `axonx start --config axonx/config/default.yaml`   | —                            |
| `exec`       | List executable registered Task names and entry classes in the current Python environment without running a Task.                                                           | `axonx exec`                                       | —                            |
| `exec`       | Execute the specified ETL Task in the current process and output results without HTTP submission.                                                                           | `axonx exec --task a158_etl --start-date 20150101` | —                            |
| `version`    | Query version information for the connected AxonX service.                                                                                                                  | `axonx version`                                    | `--target 192.168.1.10:1024` |

### Plugin Management

- Local management: omit `--target` to operate directly on the current Python environment.
- Remote management: pass `--target` to query or modify the target service's plugins.
- Inspection and building: source inspection and wheel building happen locally.
- Local `plugin inspect` accepts a source directory, wheel path, or installed plugin name; remote inspection accepts only a distribution or plugin name installed on the target service, such as
  `axonx-alpha158`. Do not simply append `--target` to local path examples; remote inspection does not upload source or wheels.

| Command name       | Description                                                                                                                   | Command                                                        | Remote arguments             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `plugin list`      | List installed plugins in the current environment or target service; `tasks` keys are registered Task names.                  | `axonx plugin list`                                            | `--target 192.168.1.10:1024` |
| `plugin show`      | View a plugin's version, registered contributions, dependencies, and other information.                                       | `axonx plugin show axonx-alpha158`                             | `--target 192.168.1.10:1024` |
| `plugin inspect`   | Inspect a plugin installed in the current environment or target service; pass its distribution or plugin name.                | `axonx plugin inspect axonx-alpha158`                          | `--target 192.168.1.10:1024` |
| `plugin inspect`   | Build a wheel from local source or reuse a cached wheel to inspect plugin metadata without installation.                      | `axonx plugin inspect plugins/a158`                            | —                            |
| `plugin inspect`   | Inspect plugin metadata from an existing local wheel without rebuilding or installing; replace the path with the actual file. | `axonx plugin inspect '<plugin_wheel_path>'`                   | —                            |
| `plugin build`     | Build from source or reuse a cached wheel and output its path, checksum, and plugin metadata without installation.            | `axonx plugin build plugins/a158`                              | —                            |
| `plugin build`     | Generate a wheel in the specified directory for later distribution or installation.                                           | `axonx plugin build plugins/a158 --output .axonx/plugins/dist` | —                            |
| `plugin install`   | Build a wheel locally from source and install it directly; with a remote target, upload and install it on the target service. | `axonx plugin install plugins/a158`                            | `--target 192.168.1.10:1024` |
| `plugin install`   | Install an existing local wheel; with a remote target, upload and install it on the target service.                           | `axonx plugin install '<plugin_wheel_path>'`                   | `--target 192.168.1.10:1024` |
| `plugin uninstall` | Uninstall the specified plugin from the current environment or target service.                                                | `axonx plugin uninstall axonx-alpha158`                        | `--target 192.168.1.10:1024` |

### Machines

| Command name     | Description                                                                                                                                   | Command                                    | Remote arguments             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| `list_machines`  | Query addresses and health status for machines in the connected service's `targets` to select an execution target.                            | `axonx list_machines`                      | `--target 192.168.1.10:1024` |
| `machine_status` | Query CPU, memory, and GPU information for the machine hosting the connected service.                                                         | `axonx machine_status`                     | `--target 192.168.1.10:1024` |
| `shell`          | Execute a shell command on the machine hosting the connected service; the example queries the current directory with a 30-second Job timeout. | `axonx shell --command 'pwd' --timeout 30` | `--target 192.168.1.10:1024` |

### Task Submission and Execution

| Command name          | Description                                                                                                                            | Command                                                                            | Remote arguments             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| `get_task_definition` | Query a complete Task definition; `--task` takes the registered name, not a Task ID or instance name.                                  | `axonx get_task_definition --task a158_etl`                                        | `--target 192.168.1.10:1024` |
| `submit`              | Submit ETL with a framework-generated name; record `answer.task_id`, `answer.run_id`, and `answer.task`.                               | `axonx submit --task a158_etl --start-date 20150101`                               | `--target 192.168.1.10:1024` |
| `submit`              | Use an explicit name to generate a fixed Task ID; reusing it replaces artifacts after the previous run finishes.                       | `axonx submit --task a158_etl --task-name default --start-date 20150101`           | `--target 192.168.1.10:1024` |
| `submit`              | Submit training using the actual Task ID of a successful ETL as the data source.                                                       | `axonx submit --task a158_train --source-tasks '<etl_task_id>'`                    | `--target 192.168.1.10:1024` |
| `wait_task`           | Wait for the specified Run ID to finish and return complete status; the response succeeds only for `succeeded`.                        | `axonx wait_task --task-id '<task_id>' --run-id '<run_id>' --client-timeout 86400` | `--target 192.168.1.10:1024` |
| `stream_task`         | Continuously output a Task's progress and logs until completion, then return final status.                                             | `axonx stream_task --task-id '<task_id>' --stream true`                            | `--target 192.168.1.10:1024` |
| `list_task_ids`       | List Task IDs with status files for subsequent queries.                                                                                | `axonx list_task_ids`                                                              | `--target 192.168.1.10:1024` |
| `list_task_statuses`  | Get a list of Task status snapshots to inspect multiple tasks.                                                                         | `axonx list_task_statuses`                                                         | `--target 192.168.1.10:1024` |
| `status`              | Get the current status snapshot for a Task without continuously following logs.                                                        | `axonx status --task-id '<task_id>'`                                               | `--target 192.168.1.10:1024` |
| `read_task_log`       | Read the tail of a Task's log once, up to 65536 bytes by default, to inspect recent output.                                            | `axonx read_task_log --task-id '<task_id>'`                                        | `--target 192.168.1.10:1024` |
| `read_task_log`       | Read from a specified byte offset; the example starts at the beginning, and subsequent reads can use the response's `next_offset`.     | `axonx read_task_log --task-id '<task_id>' --offset 0 --limit 65536`               | `--target 192.168.1.10:1024` |
| `get_task_context`    | Collect status, metadata and log paths, dependency graph, and upstream/downstream relationships for investigation or further research. | `axonx get_task_context --task-id '<task_id>'`                                     | `--target 192.168.1.10:1024` |
| `get_task_graph`      | Query the dependency graph containing a Task to inspect nodes, edges, and upstream/downstream links.                                   | `axonx get_task_graph --task-id '<task_id>'`                                       | `--target 192.168.1.10:1024` |
| `cancel`              | Cancel a queued or running Task.                                                                                                       | `axonx cancel --task-id '<task_id>'`                                               | `--target 192.168.1.10:1024` |
| `delete_tasks`        | Delete finished Tasks or Tasks with only metadata, together with their files; even one ID must be passed as a JSON array.              | `axonx delete_tasks --task-ids '["<task_id>"]'`                                    | `--target 192.168.1.10:1024` |
| `delete_tasks`        | Delete multiple finished Tasks or Tasks with only metadata, together with their files.                                                 | `axonx delete_tasks --task-ids '["<task_id_1>","<task_id_2>"]'`                    | `--target 192.168.1.10:1024` |

### Workspace and Synchronization

| Command name     | Description                                                                                                                                               | Command                                                                      | Remote arguments             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------- |
| `list_entries`   | Query the connected service's workspace root for existing Task type directories and other entries.                                                        | `axonx list_entries --path ''`                                               | `--target 192.168.1.10:1024` |
| `list_entries`   | Query files and subdirectories in the specified ETL Task directory to locate actual artifact paths.                                                       | `axonx list_entries --path 'etl/<etl_task_id>'`                              | `--target 192.168.1.10:1024` |
| `list_task_runs` | List run directories containing `metadata.json` by Task type; the example queries ETL.                                                                    | `axonx list_task_runs --task-type etl`                                       | `--target 192.168.1.10:1024` |
| `preview_file`   | Read a Task's `metadata.json` to inspect configuration, dependencies, and artifact paths.                                                                 | `axonx preview_file --path 'etl/<etl_task_id>/metadata.json'`                | `--target 192.168.1.10:1024` |
| `preview_file`   | Preview CSV or Parquet rows; the example skips 200 rows and returns at most 100. Obtain the path from actual artifacts.                                   | `axonx preview_file --path '<artifact_path>' --offset 200 --limit 100`       | `--target 192.168.1.10:1024` |
| `delete_entries` | Delete workspace files or directories; even a single path must be passed as a JSON array.                                                                 | `axonx delete_entries --paths '["etl/<etl_task_id>/old.csv"]'`               | `--target 192.168.1.10:1024` |
| `delete_entries` | Delete multiple workspace files or directories; all paths are relative to the workspace.                                                                  | `axonx delete_entries --paths '["<workspace_path_1>","<workspace_path_2>"]'` | `--target 192.168.1.10:1024` |
| `sync_tasks`     | Use the staged archive path returned by the target service to replace Task directories carried in the archive; this command does not upload files itself. | `axonx sync_tasks --path '<staged_archive_path>'`                            | `--target 192.168.1.10:1024` |

- Artifact paths: after a successful run, metadata is written to `workspace/<task_type>/<task_id>/metadata.json`; `preview_file` uses workspace-relative paths.
- Actual values: obtain upload archive paths, target service addresses, and Task IDs from real configuration or service responses before executing the corresponding commands.

## Examples

### Inspect an existing research run

After connecting to the service identified by the user, obtain its actual task IDs and inspect a selected run:

```bash
axonx list_task_ids
axonx status --task-id '<actual_task_id>'
axonx read_task_log --task-id '<actual_task_id>'
axonx get_task_graph --task-id '<actual_task_id>'
```

Replace the placeholder using the service response and use the same target and authentication for every call. These queries do not submit a new research task.

### Develop a research plugin

For a request to add a factor, inspect the existing plugin and Task definition, implement the change using the authoring contracts above, and run the affected repository checks. Install and execute only when requested for the selected environment. Reuse successful upstream artifacts and keep the data window and other comparison parameters fixed.

## Limitations

- Local Task execution supports Python 3.12+ on macOS/Linux; Windows is not a supported local runtime.
- An AxonX service and its configured credentials are required for HTTP/MCP operations. This file alone does not deploy a service.
- Research plugins, market data, and model configuration are separate dependencies. Example IDs and addresses are placeholders.
- The ETL code above is structural pseudocode and needs a real transform and complete output fields before execution.
- Backtest results do not establish future investment performance; compare costs and data assumptions before interpreting them.
- Source development requires an AxonX checkout; paths inside examples refer to that checkout or the selected service workspace as stated above.

## Source and License

Copyright 2026 FlowLLM-AI. Adapted from the AxonX development guide and Skill at commit `862b90da9c49c3bdee4c2ab9ef896c415aee9f45`, licensed under Apache-2.0; the license is included at `references/LICENSE.md`. This contribution adds catalog metadata, trigger guidance, safety notes, examples, and limitations. Source attribution does not imply endorsement by this catalog.
