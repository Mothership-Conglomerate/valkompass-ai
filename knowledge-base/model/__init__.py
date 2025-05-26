from pydantic import BaseModel


class Topic(BaseModel):
    name: str
    description: str


class DocumentSegment(BaseModel):
    text: str
    start_index: int
    end_index: int


class Document(BaseModel):
    path: str
    raw_content: str
    lines: list[DocumentSegment]
