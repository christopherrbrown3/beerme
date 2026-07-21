# Repository instructions for AI agents

When an AI agent creates a commit, append an `AI-Agent` trailer that identifies the agent and its
full model family, version, and variant. Use this format:

```text
AI-Agent: <agent name> (<model family, version, and variant>)
```

For example: `AI-Agent: OpenAI Codex (GPT-5.6 Sol)`. Use the actual model for the authoring agent;
do not copy the example when a different model or variant produced the commit.

Do not add this trailer to commits authored entirely by humans.
