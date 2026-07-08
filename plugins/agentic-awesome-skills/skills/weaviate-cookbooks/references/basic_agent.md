# Basic Agent Cookbook

Build a tool-calling AI agent with structured outputs using DSPy.
For RAG tools, memory, and framework integrations, [see here](./agentic_rag.md).



Docs to reference if needed:
- DSPy signatures: https://dspy.ai/learn/programming/signatures/
- DSPy language models: https://dspy.ai/learn/programming/language_models/
- LiteLLM providers: https://docs.litellm.ai/docs/

## Core Rules

- Use a virtual environment via `venv`
- Use `uv` for Python project/dependency management.
- Do not manually author `pyproject.toml` or `uv.lock`; let `uv` generate/update them.
- Use this install set: `uv add dspy python-dotenv`
- Customise this cookbook to the users specification, ask them for details if not given.

## Env Rules

Mandatory:
- An LLM provider API key (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`)
- `WEAVIATE_URL`
- `WEAVIATE_API_KEY`

Optional:
- Matching provider keys listed in `environment_requirements.md`

If the user explicitly requests a non-Weaviate agent, `WEAVIATE_URL` and `WEAVIATE_API_KEY` can be omitted.

## Agent Response Signature

The structured output that defines what the LLM returns when selecting tools.

```python
import dspy
from typing import Any, Dict

class AgentResponse(dspy.Signature):

    # Input Fields
    history: dspy.History = dspy.InputField()
    user_prompt: str = dspy.InputField()
    available_tools: str = dspy.InputField()

    # Output Fields
    response: str = dspy.OutputField(
        description="The response to the user's prompt whilst the tool is running. Update the user on the progress of their request (if a tool is picked), or the final response to the user (if no tool is picked)."
    )
    tool: str | None = dspy.OutputField(
        description="The tool that needs to be used. Return None if no tool is needed."
    )
    tool_inputs: Dict[str, Any] | None = dspy.OutputField(
        description=(
            "The inputs for the tool. Return an empty dictionary (still include the field) if no inputs are needed. "
            "The key is the name of the input, the value is the value of the input."
        )
    )
```

Extend `AgentResponse` as needed: add `confidence: float` for certainty scoring, `requires_clarification: bool` for follow-up questions, or modify `description` strings to shape agent behaviour for a specific domain.

## Router Agent (Single Step)

Wraps the agent response into a class that manages conversation history and tool execution.

```python
from typing import Callable, List, Tuple

class RouterAgent:
    def __init__(self, model: str, tools: List[Callable] = []):
        self.tools: list[Callable] = tools
        self.model = dspy.LM(model)
        self.agent = dspy.ChainOfThought(AgentResponse)
        self.conversation_history = dspy.History(messages=[])

    def add_conversation_history(self, message: str, response: dspy.Prediction):
        self.conversation_history.messages.append({"user_prompt": message, **response})

    def get_tools_and_descriptions(self) -> str:
        return "\n".join(
            [
                f"{tool.__name__}:\nDescription: {tool.__doc__ or ''}\nInputs: { {k: v for k, v in tool.__annotations__.items() if k != 'return'} }"
                for tool in self.tools
            ]
        )

    def get_response(self, user_prompt: str) -> Tuple[str, str | None]:
        result = self.agent(
            history=self.conversation_history,
            user_prompt=user_prompt,
            available_tools=self.get_tools_and_descriptions(),
            lm=self.model,
        )
        self.add_conversation_history(message=user_prompt, response=result)
        if result.tool and result.tool.lower() not in ["null", "none"]:
            tool_function = next(
                (tool for tool in self.tools if tool.__name__ == result.tool), None
            )
            if tool_function is None:
                raise ValueError(f"Tool {result.tool} not found")
            tool_inputs = {k: v for k, v in result.tool_inputs.items() if k != "return"}
            tool_result = tool_function(**tool_inputs)
        else:
            tool_result = None
        return result.response, tool_result
```

Usage:

```python
router = RouterAgent(
    model="<model_name>",  # e.g. claude-sonnet-4-5, gpt-5.2, gemini-2.5-pro
    tools=[your_tool_function]
)
response, tool_result = router.get_response("user query here")
```

## Tool Design

Tools are Python functions. The agent reads `__name__`, `__doc__`, and `__annotations__` to decide when to use them.

```python
def your_tool(param1: str, param2: int) -> str:
    """Clear description of what this tool does and when to use it."""
    # tool logic here
    return "result as string"
```

Key rules:
- Docstrings directly influence when the agent selects the tool. Be specific: "Get current weather conditions for a city" is better than "Get weather".
- Type hints guide what inputs the agent provides. Complex types like `filters: List[Dict]` may need additional description in the docstring.
- Return strings or string-serializable data.


## Sequential Multi-Step Agent

For tasks requiring multiple tool calls in succession, add a followup signature and loop.

Followup signature (receives `tool_output` from the previous step):

```python
class AgentFollowup(dspy.Signature):

    # Input Fields
    history: dspy.History = dspy.InputField()
    user_prompt: str = dspy.InputField()
    tool_output: str = dspy.InputField(description="The output of the previous tool.")
    available_tools: str = dspy.InputField(
        description="The available tools and their descriptions."
    )

    # Output Fields
    response: str = dspy.OutputField(
        description="The response to the user's prompt whilst the tool is running. Update the user on the progress of their request (if a tool is picked), or the final response to the user (if no tool is picked)."
    )
    tool: str | None = dspy.OutputField(
        description="The tool that needs to be used. Return None if no tool is needed."
    )
    tool_inputs: Dict[str, Any] | None = dspy.OutputField(
        description="The inputs for the tool. Return an empty dictionary (still include the field) if no inputs are needed. The key is the name of the input, the value is the value of the input.",
    )
```

Modify `RouterAgent` to loop until the agent stops requesting tools:

```python
class RouterAgent:
    def __init__(self, model: str, tools: List[Callable] = []):
        self.tools: list[Callable] = tools
        self.model = dspy.LM(model)
        self.agent = dspy.ChainOfThought(AgentResponse)
        self.followup_agent = dspy.ChainOfThought(AgentFollowup)
        self.conversation_history = dspy.History(messages=[])

    def add_conversation_history(self, message: str, response: dspy.Prediction):
        self.conversation_history.messages.append({"user_prompt": message, **response})

    def get_tools_and_descriptions(self) -> str:
        return "\n".join(
            [
                f"{tool.__name__}:\nDescription: {tool.__doc__ or ''}\nInputs: { {k: v for k, v in tool.__annotations__.items() if k != 'return'} }"
                for tool in self.tools
            ]
        )

    def get_response(self, user_prompt: str) -> str:
        result = self.agent(
            history=self.conversation_history,
            user_prompt=user_prompt,
            available_tools=self.get_tools_and_descriptions(),
            lm=self.model,
        )
        self.add_conversation_history(message=user_prompt, response=result)

        max_iter = 10
        iter = 0

        while result.tool is not None and result.tool.lower() not in ["null", "none"]:
            iter += 1
            if iter > max_iter:
                break

            tool_function = next(
                (tool for tool in self.tools if tool.__name__ == result.tool), None
            )
            if tool_function is None:
                raise ValueError(f"Tool {result.tool} not found")

            tool_inputs = {k: v for k, v in result.tool_inputs.items() if k != "return"}
            tool_result = tool_function(**tool_inputs)

            result = self.followup_agent(
                history=self.conversation_history,
                tool_output=tool_result,
                available_tools=self.get_tools_and_descriptions(),
                lm=self.model,
            )
            self.add_conversation_history(message=tool_result, response=result)

        return result.response
```

`max_iter` controls how many tool calls can occur before forced termination. Increase for complex multi-step tasks, decrease to limit costs and runaway loops.

## User-specific Customisations

If not specified ask the user about these points before implementing their respective strategies:

**LLM Framework**

You can use DSPy (works with all LiteLLM providers) or LiteLLM itself.

- DSPy: https://dspy.ai/learn/programming/language_models/
- LiteLLM: https://docs.litellm.ai/docs/

Alternatively, users can use a single model provider. What model provider will they use?

- OpenAI (https://platform.openai.com/docs/libraries)
- Anthropic (https://platform.claude.com/docs/)
- Google GenAI (https://ai.google.dev/gemini-api/docs/libraries)
- Other (such as locally hosted models), use best judgement

These may require additional installs.

**Model Selection**

What model(s) will the user use? Consider a mixed approach: capable model for main agent routing, cheaper model for auxiliary tasks like memory creation.

**Tools**

What tools does the user need? List their functions, inputs, and expected outputs. The agent is only as capable as its tools.

**Single-step vs Multi-step**

Does the user need a single tool call per query, or should the agent chain multiple tools in sequence? Only use multi-step if the use case requires it.

## Troubleshooting

- DSPy signature warnings about missing fields: ensure all input fields are passed or mark optional fields appropriately.
- Tool not found errors: ensure tool function names match exactly what the agent outputs.
- Agent loops indefinitely: lower `max_iter` or add more explicit termination conditions.
- For any other issues, refer to the official library/package documentation and use web search extensively for troubleshooting.

## Done Criteria

- Create test scripts to check each function works independently with test data. Tear down tests after completion, or create a proper test suite with pytest (requires install)
- User has completed specification of the app.
