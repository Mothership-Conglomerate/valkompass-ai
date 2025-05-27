test-kb:
	cd knowledge-base && uv run pytest

parse-kb-docs:
	cd knowledge-base && uv run python main.py --actions parse

embed-kb-docs:
	cd knowledge-base && uv run python main.py --actions embed

topic-model-kb-docs:
	cd knowledge-base && uv run python main.py --actions topicmodel

graph-kb-docs:
	cd knowledge-base && uv run python main.py --actions graph

# Default action is parse then embed
process-kb-docs:
	cd knowledge-base && uv run python main.py --actions parse embed

