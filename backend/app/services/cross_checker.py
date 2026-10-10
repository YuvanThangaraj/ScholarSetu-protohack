from typing import List, Dict, Any, Optional, Tuple
import logging
from rapidfuzz import fuzz
import re

logger = logging.getLogger(__name__)


class CrossDocumentChecker:
    """
    Engine B: Cross-Document Consistency Engine
    Performs fuzzy logic matching & numerical cross-verification across:
    1. Full Name across Student Profile, Caste Cert, Income Cert, and Marksheet.
    2. Income Amount between Profile and Income Certificate.
    3. Institution Name across Marksheet, Bonafide Cert, and Profile.
    """

    def __init__(self, name_threshold: float = 80.0, inst_threshold: float = 75.0):
        self.name_threshold = name_threshold
        self.inst_threshold = inst_threshold

    @staticmethod
    def calculate_string_similarity(val_a: Optional[str], val_b: Optional[str]) -> float:
        """
        Calculates composite RapidFuzz similarity score taking into account:
        - token_sort_ratio: unaffected by word ordering ("Ramesh Koram" vs "Koram Ramesh")
        - token_set_ratio: unaffected by duplicate tokens or partial honorifics
        - ratio: exact string distance
        """
        if not val_a or not val_b:
            return 0.0

        def normalize(value: str) -> str:
            value = re.sub(r"\b(SRI|SMT|KUMARI|MR|MS|MRS|DR)\b", " ", str(value).upper())
            return re.sub(r"[^A-Z0-9 ]", " ", value).strip()
        str_a = normalize(str(val_a))
        str_b = normalize(str(val_b))

        if str_a == str_b:
            return 100.0

        # Rapidfuzz token metrics
        ts_ratio = fuzz.token_sort_ratio(str_a, str_b)
        tset_ratio = fuzz.token_set_ratio(str_a, str_b)
        p_ratio = fuzz.partial_ratio(str_a, str_b)

        # Composite score weighting
        composite = (ts_ratio * 0.45) + (tset_ratio * 0.35) + (p_ratio * 0.20)
        return round(composite, 2)

    @staticmethod
    def calculate_numeric_similarity(num_a: Optional[float], num_b: Optional[float]) -> Tuple[float, str]:
        """
        Computes numeric discrepancy and percentage divergence for income amounts.
        """
        if num_a is None or num_b is None:
            return 0.0, "MISSING_DATA"

        if num_a == num_b:
            return 100.0, "MATCH"

        max_val = max(num_a, num_b)
        if max_val == 0:
            return 100.0, "MATCH"

        diff = abs(num_a - num_b)
        percentage_diff = (diff / max_val) * 100.0
        score = max(0.0, 100.0 - percentage_diff)

        status = "MATCH" if percentage_diff <= 5.0 else ("PARTIAL_MATCH" if percentage_diff <= 20.0 else "MISMATCH")
        return round(score, 2), status

    def evaluate_consistency(
        self,
        student_profile: Dict[str, Any],
        documents_ocr: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Executes cross-document verification matrix.
        Returns:
        - similarity_matrix: List of pairwise comparisons
        - discrepancies: Identified high-priority variances
        """
        similarity_matrix: List[Dict[str, Any]] = []
        discrepancies: List[Dict[str, Any]] = []

        profile_name = student_profile.get("full_name")
        profile_income = student_profile.get("annual_income")
        profile_inst = student_profile.get("institution_name") or student_profile.get("institution_code")
        profile_community = student_profile.get("st_community_code")

        caste_data = documents_ocr.get("caste_cert", {}).get("extracted_fields", {})
        income_data = documents_ocr.get("income_cert", {}).get("extracted_fields", {})
        marksheet_data = documents_ocr.get("marksheet", {}).get("extracted_fields", {})
        bonafide_data = documents_ocr.get("bonafide", {}).get("extracted_fields", {})

        # ---------------------------------------------------------
        # 1. Candidate Name Consistency Across All Sources
        # ---------------------------------------------------------
        name_sources = [
            ("profile", profile_name),
            ("caste_cert", caste_data.get("candidate_name")),
            ("income_cert", income_data.get("candidate_name")),
            ("marksheet", marksheet_data.get("candidate_name")),
            ("bonafide", bonafide_data.get("candidate_name")),
        ]

        # Filter out sources that exist
        active_names = [(src, name) for src, name in name_sources if name]

        for i in range(len(active_names)):
            for j in range(i + 1, len(active_names)):
                src_a, val_a = active_names[i]
                src_b, val_b = active_names[j]
                score = self.calculate_string_similarity(val_a, val_b)
                
                status_str = "MATCH" if score >= self.name_threshold else ("PARTIAL_MATCH" if score >= 60.0 else "MISMATCH")
                
                metric = {
                    "field_name": "full_name",
                    "doc_1": src_a,
                    "value_1": val_a,
                    "doc_2": src_b,
                    "value_2": val_b,
                    "similarity_score": score,
                    "status": status_str,
                }
                similarity_matrix.append(metric)

                if score < self.name_threshold:
                    discrepancies.append({
                        "field_name": "full_name",
                        "doc_1": src_a,
                        "value_1": val_a,
                        "doc_2": src_b,
                        "value_2": val_b,
                        "score": score,
                        "reason": f"Candidate name variance detected between {src_a} ('{val_a}') and {src_b} ('{val_b}') with similarity score {score}%",
                        "severity": "high" if score < 60.0 else "medium",
                    })

        # ---------------------------------------------------------
        # 2. Income Amount Consistency (Profile vs Income Certificate)
        # ---------------------------------------------------------
        cert_income = income_data.get("annual_income")
        if profile_income is not None and cert_income is not None:
            score, num_status = self.calculate_numeric_similarity(float(profile_income), float(cert_income))
            
            similarity_matrix.append({
                "field_name": "annual_income",
                "doc_1": "profile",
                "value_1": f"₹{profile_income:,.2f}",
                "doc_2": "income_cert",
                "value_2": f"₹{cert_income:,.2f}",
                "similarity_score": score,
                "status": num_status,
            })

            if num_status != "MATCH":
                diff = abs(profile_income - cert_income)
                discrepancies.append({
                    "field_name": "annual_income",
                    "doc_1": "profile",
                    "value_1": f"₹{profile_income:,.2f}",
                    "doc_2": "income_cert",
                    "value_2": f"₹{cert_income:,.2f}",
                    "score": score,
                    "reason": f"Income mismatch - Certificate shows ₹{cert_income:,.2f}, profile states ₹{profile_income:,.2f} (Similarity Score: {score}%)",
                    "severity": "high" if score < 70.0 else "medium",
                })

        # ---------------------------------------------------------
        # 3. Community / Tribe Consistency
        # ---------------------------------------------------------
        cert_community = caste_data.get("community_name")
        if profile_community and cert_community:
            score = self.calculate_string_similarity(profile_community, cert_community)
            similarity_matrix.append({
                "field_name": "st_community_code",
                "doc_1": "profile",
                "value_1": profile_community,
                "doc_2": "caste_cert",
                "value_2": cert_community,
                "similarity_score": score,
                "status": "MATCH" if score >= 80.0 else "MISMATCH",
            })
            if score < 80.0:
                discrepancies.append({
                    "field_name": "st_community_code",
                    "doc_1": "profile",
                    "value_1": profile_community,
                    "doc_2": "caste_cert",
                    "value_2": cert_community,
                    "score": score,
                    "reason": f"Community mismatch - Profile indicates '{profile_community}' but Caste Certificate identifies '{cert_community}'",
                    "severity": "high",
                })

        # ---------------------------------------------------------
        # 4. Institution Name Consistency
        # ---------------------------------------------------------
        inst_marksheet = marksheet_data.get("institution_name")
        inst_bonafide = bonafide_data.get("institution_name")

        institution_sources = [("profile", profile_inst), ("marksheet", inst_marksheet), ("bonafide", inst_bonafide)]
        active_institutions = [(src, value) for src, value in institution_sources if value]
        for i in range(len(active_institutions)):
            for j in range(i + 1, len(active_institutions)):
                src_a, inst_a = active_institutions[i]
                src_b, inst_b = active_institutions[j]
                score = self.calculate_string_similarity(inst_a, inst_b)
                similarity_matrix.append({
                    "field_name": "institution_name",
                    "doc_1": src_a,
                    "value_1": inst_a,
                    "doc_2": src_b,
                    "value_2": inst_b,
                    "similarity_score": score,
                    "status": "MATCH" if score >= self.inst_threshold else "MISMATCH",
                })
                if score < self.inst_threshold:
                    discrepancies.append({
                        "field_name": "institution_name",
                        "doc_1": src_a,
                        "value_1": inst_a,
                        "doc_2": src_b,
                        "value_2": inst_b,
                        "score": score,
                        "reason": f"Institution mismatch between {src_a} ('{inst_a}') and {src_b} ('{inst_b}')",
                        "severity": "medium",
                    })

        return {
            "similarity_matrix": similarity_matrix,
            "discrepancies": discrepancies,
            "total_checks_run": len(similarity_matrix),
        }


# Singleton cross checker instance
cross_checker = CrossDocumentChecker()
