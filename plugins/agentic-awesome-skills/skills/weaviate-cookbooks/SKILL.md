---
name: weaviate-cookbooks
description: "Build Weaviate AI apps from official cookbook blueprints for RAG, agentic RAG, data exploration, multimodal PDF search, async clients, and frontends."
category: ai
risk: safe
source: community
source_repo: weaviate/agent-skills
source_type: official
date_added: "2026-06-29"
author: Weaviate
tags: [weaviate, rag, agents, vector-database, ai-apps]
tools: [python, weaviate, nextjs]
license: "BSD-3-Clause"
license_source: "https://github.com/weaviate/agent-skills/blob/main/LICENSE"
---

# Weaviate Cookbooks

## Overview

This skill provides an index of implementation guides and foundational requirements for building Weaviate-powered AI applications. Use the references to quickly scaffold full-stack applications with best practices for connection management, environment setup, and application architecture.

## When to Use This Skill

- Use when the user wants a Weaviate-backed RAG, agentic RAG, chatbot, data explorer, or multimodal document-search application.
- Use when selecting between cookbook patterns before writing a full-stack Weaviate app.
- Use when the project needs Weaviate environment, setup, async-client, or frontend guidance.
- Use when the user asks for an official Weaviate blueprint rather than a generic vector database recipe.

### Weaviate Cloud Instance

If the user does not have an instance yet, direct them to the cloud console to register and create a free sandbox. Create a Weaviate instance via [Weaviate Cloud](https://console.weaviate.cloud/signin?utm_source=github&utm_campaign=agent_skills).

## Before Building Any Cookbook

Follow these shared guidelines before generating any cookbook app:

- [Project Setup Contract](references/project_setup.md)
- [Environment Requirements](references/environment_requirements.md)

Then proceed to the specific cookbook reference below.

## Cookbook Index

- [Query Agent Chatbot](references/query_agent_chatbot.md): Build a full-stack chatbot using Weaviate Query Agent with streaming and chat history support.
- [Data Explorer](references/data_explorer.md): Build a full-stack data explorer app including sorting, keyword search and tabular view of weaviate data.
- [Multimodal RAG: Building Document Search](references/pdf_multimodal_rag.md): Build a multimodal Retrieval-Augmented Generation (RAG) system using Weaviate Embeddings (ModernVBERT/colmodernvbert) and Ollama with Qwen3-VL for generation.
- [Basic RAG](references/basic_rag.md): Implement basic retrieval and generation with Weaviate. Useful for most forms of data retrieval from a Weaviate collection.
- [Advanced RAG](references/advanced_rag.md): Improve on basic RAG by adding extra features such as re-ranking, query decomposition, query re-writing, LLM filter selection.
- [Basic Agent](references/basic_agent.md): Build a tool-calling AI agent with structured outputs using DSPy. Covers AgentResponse signatures, RouterAgent, tool design, and sequential multi-step loops.
- [Agentic RAG](references/agentic_rag.md): Build RAG-powered AI agents with Weaviate. Covers naive RAG tools, hierarchical RAG with LLM-created filters, vector DB memory, Weaviate Query Agent, and Elysia integration.

## Interface (Optional)

Use this when the user explicitly asks for a frontend for their Weaviate backend.

- [Frontend Interface](references/frontend_interface.md): Build a Next.js frontend to interact with the Weaviate backend.

## Client Usage

- [Async Client](references/async_client.md): Guide for using the Weaviate Python async client in production applications (FastAPI, async frameworks). Covers connection patterns, lifecycle management, common pitfalls, and multi-cluster setups.

## Limitations

- Cookbook blueprints still need adaptation to the user's data model, embedding provider, auth model, deployment platform, and latency/cost targets.
- This skill does not validate live Weaviate credentials, cloud quotas, or model availability unless the user provides and approves the relevant environment.
- Generated apps should be reviewed for security, data privacy, prompt injection exposure, and production observability before launch.
