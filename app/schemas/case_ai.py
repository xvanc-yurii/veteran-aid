from pydantic import BaseModel

class CaseAskRequest(BaseModel):
    question: str

class CaseAskResponse(BaseModel):
    answer: str
