from typing import List, Dict, Any, Tuple
import logging
from app.models.scheme import Scheme
from app.models.profile import Profile
from app.schemas.student import SchemeEligibilityCheck, SchemeMatchItem

logger = logging.getLogger(__name__)


class EligibilityEngine:
    """
    Evaluates student profile credentials against active, versioned scholarship policy rules.
    """

    @classmethod
    def evaluate_scheme(cls, student: Profile, scheme: Scheme) -> SchemeMatchItem:
        """
        Evaluates a single scheme against a student's profile.
        Returns detailed criteria breakdown, is_eligible flag, and composite eligibility score.
        """
        checks: List[SchemeEligibilityCheck] = []
        satisfied_count = 0
        total_checks = 3

        # 1. Income Limit Check
        income_satisfied = scheme.max_income_limit is None or student.annual_income <= scheme.max_income_limit
        if income_satisfied:
            satisfied_count += 1
            income_exp = ("The official scheme record does not state an income ceiling." if scheme.max_income_limit is None else
                          f"Annual income of ₹{student.annual_income:,.2f} is within the limit of ₹{scheme.max_income_limit:,.2f}.")
        else:
            income_exp = f"Annual income of ₹{student.annual_income:,.2f} exceeds policy limit of ₹{scheme.max_income_limit:,.2f}."

        checks.append(
            SchemeEligibilityCheck(
                criterion="Income Ceiling",
                required_value="Not stated" if scheme.max_income_limit is None else f"<= ₹{scheme.max_income_limit:,.2f}",
                student_value=f"₹{student.annual_income:,.2f}",
                is_satisfied=income_satisfied,
                explanation=income_exp,
            )
        )

        # 2. Academic Merit (GPA / Marks Percentage)
        marks_satisfied = scheme.min_marks_percentage is None or student.gpa_marks >= scheme.min_marks_percentage
        if marks_satisfied:
            satisfied_count += 1
            marks_exp = ("The official scheme record does not state a minimum marks threshold." if scheme.min_marks_percentage is None else
                         f"Marks score of {student.gpa_marks:.2f}% meets or exceeds the required threshold of {scheme.min_marks_percentage:.2f}%.")
        else:
            marks_exp = f"Marks score of {student.gpa_marks:.2f}% is below required threshold of {scheme.min_marks_percentage:.2f}%."

        checks.append(
            SchemeEligibilityCheck(
                criterion="Minimum Marks Threshold",
                required_value="Not stated" if scheme.min_marks_percentage is None else f">= {scheme.min_marks_percentage:.2f}%,",
                student_value=f"{student.gpa_marks:.2f}%",
                is_satisfied=marks_satisfied,
                explanation=marks_exp,
            )
        )

        # 3. ST Community Eligibility
        eligible_communities = scheme.eligible_communities or []
        community_code = (student.st_community_code or "").strip().upper()

        if "*" in eligible_communities or "ALL" in [c.upper() for c in eligible_communities]:
            comm_satisfied = True
            comm_exp = f"Scheme applies to all recognized Scheduled Tribes (Student belongs to {community_code})."
        else:
            allowed_upper = [c.upper() for c in eligible_communities]
            comm_satisfied = community_code in allowed_upper
            if comm_satisfied:
                comm_exp = f"Student ST community '{community_code}' is included in scheme quota list."
            else:
                comm_exp = f"Community '{community_code}' is not included in specific targeted tribes: {eligible_communities}."

        if comm_satisfied:
            satisfied_count += 1

        checks.append(
            SchemeEligibilityCheck(
                criterion="Scheduled Tribe (ST) Community",
                required_value=", ".join(eligible_communities) if eligible_communities else "All ST",
                student_value=community_code,
                is_satisfied=comm_satisfied,
                explanation=comm_exp,
            )
        )

        is_fully_eligible = satisfied_count == total_checks
        eligibility_score = round((satisfied_count / total_checks) * 100.0, 1)

        return SchemeMatchItem(
            scheme_id=scheme.id,
            title=scheme.title,
            ministry=scheme.ministry,
            scholarship_amount=scheme.scholarship_amount,
            is_eligible=is_fully_eligible,
            eligibility_score=eligibility_score,
            breakdown=checks,
        )

    @classmethod
    def match_all_schemes(cls, student: Profile, schemes: List[Scheme]) -> List[SchemeMatchItem]:
        """
        Evaluates student against all active schemes and sorts by eligibility score desc.
        """
        results: List[SchemeMatchItem] = []
        for scheme in schemes:
            if scheme.is_active:
                result = cls.evaluate_scheme(student, scheme)
                results.append(result)

        # Sort eligible first, then by score descending
        results.sort(key=lambda x: (x.is_eligible, x.eligibility_score), reverse=True)
        return results


eligibility_engine = EligibilityEngine()
