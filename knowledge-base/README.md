`cp .env.dist .env`

`uv sync`

`(cd .. && docker compose up -D)`

`(cd .. && make graph-kb-docs)`
