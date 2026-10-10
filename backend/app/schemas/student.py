import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ProfileBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    st_community_code: str = Field(..., description="Scheduled Tribe code (e.g. GOND, BHIL, SANTHAL, MUNDA)")
    annual_income: float = Field(..., ge=0.0, description="Annual Family Income in INR")
    course_name: str = Field(..., min_length=2, max_length=255)
    institution_code: str = Field(..., min_length=2, max_length=100)
    institution_name: Optional[str] = None
    gpa_marks: float = Field(..., ge=0.0, le=100.0, description="Marks Percentage or equivalent (0 - 100)")
    phone_number: Optional[str] = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    st_community_code: Optional[str] = None
    annual_income: Optional[float] = None
    course_name: Optional[str] = None
    institution_code: Optional[str] = None
    institution_name: Optional[str] = None
    gpa_marks: Optional[float] = None
    phone_number: Optional[str] = None


class ProfileResponse(ProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SchemeEligibilityCheck(BaseModel):
    criterion: str
    required_value: str
    student_value: str
    is_satisfied: bool
    explanation: str


class SchemeMatchItem(BaseModel):
    scheme_id: uuid.UUID
    title: str
    ministry: str
    scholarship_amount: Optional[float] = None
    is_eligible: bool
    eligibility_score: float = Field(ge=0.0, le=100.0)
    breakdown: List[SchemeEligibilityCheck]


class StudentSchemeMatchResponse(BaseModel):
    student_id: uuid.UUID
    student_name: str
    community_code: str
    annual_income: float
    gpa_marks: float
    total_schemes_evaluated: int
    eligible_schemes_count: int
    matches: List[SchemeMatchItem]
