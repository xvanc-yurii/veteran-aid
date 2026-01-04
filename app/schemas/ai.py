from pydantic import BaseModel


class GenerateApplicationRequest(BaseModel):
    benefit_id: int
    extra_info: str = ""


class GenerateApplicationResponse(BaseModel):
    text: str


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
