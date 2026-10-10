import uuid
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SchemePolicyBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    code: Optional[str] = None
    ministry: str = Field(default="Ministry of Tribal Affairs", max_length=255)
    provider: str = Field(default="Ministry of Tribal Affairs", max_length=255)
    description: Optional[str] = None
    eligibility: Optional[str] = None
    education_level: Optional[str] = None
    income_criteria: Optional[str] = None
    benefits: Optional[str] = None
    required_documents: List[str] = Field(default_factory=list)
    application_window: Optional[str] = None
    deadline: Optional[str] = None
    scheme_status: str = "active"
    official_url: str = Field("https://tribal.nic.in/Scholarship.aspx", max_length=1024)
    last_verified_at: datetime = Field(default_factory=datetime.now)
    max_income_limit: Optional[float] = Field(None, ge=0.0, description="Upper threshold when officially stated")
    min_marks_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, description="Minimum qualifying marks when officially stated")
    eligible_communities: List[str] = Field(
        default_factory=lambda: ["*"],
        description="List of ST community codes or ['*'] for all ST communities",
    )
    is_active: bool = True
    scholarship_amount: Optional[float] = None


class SchemePolicyCreate(SchemePolicyBase):
    pass


class SchemePolicyUpdate(BaseModel):
    title: Optional[str] = None
    ministry: Optional[str] = None
    provider: Optional[str] = None
    description: Optional[str] = None
    eligibility: Optional[str] = None
    education_level: Optional[str] = None
    income_criteria: Optional[str] = None
    benefits: Optional[str] = None
    required_documents: Optional[List[str]] = None
    application_window: Optional[str] = None
    deadline: Optional[str] = None
    scheme_status: Optional[str] = None
    official_url: Optional[str] = None
    last_verified_at: Optional[datetime] = None
    max_income_limit: Optional[float] = None
    min_marks_percentage: Optional[float] = None
    eligible_communities: Optional[List[str]] = None
    is_active: Optional[bool] = None
    scholarship_amount: Optional[float] = None


class SchemePolicyResponse(SchemePolicyBase):
    id: uuid.UUID
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskFlagBase(BaseModel):
    field_name: str
    source_doc_a: str
    value_a: Optional[str] = None
    source_doc_b: str
    value_b: Optional[str] = None
    similarity_score: Optional[float] = None
    severity: str  # "low", "medium", "high"
    rule_triggered: str
    recommended_action: str
    is_resolved: bool = False


class RiskFlagResponse(RiskFlagBase):
    id: uuid.UUID
    application_id: uuid.UUID
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskFlagResolveRequest(BaseModel):
    is_resolved: bool = True
    resolution_notes: str = Field(..., min_length=3)
