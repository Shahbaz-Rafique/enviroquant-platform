from __future__ import annotations

import math
import re
from difflib import SequenceMatcher

from app.core.config import get_settings


_SYNONYMS = {
    "effects": "impact", "effect": "impact", "impacts": "impact",
    "alternatives": "option", "alternative": "option",
    "emissions": "discharge", "effluent": "discharge", "residues": "waste",
    "fauna": "biodiversity", "flora": "biodiversity", "habitat": "biodiversity",
    "legislation": "regulation", "legal": "regulation", "standards": "regulation",
    "programme": "schedule", "timeline": "schedule",
}


def best_semantic_match(query: str, candidates: list[str]) -> tuple[int | None, float, str]:
    if not candidates:
        return None, 0.0, "none"
    settings = get_settings()
    if settings.openai_api_key:
        embedded = _embedding_match(query, candidates, settings.openai_api_key)
        if embedded is not None:
            return embedded
    return _lexical_semantic_match(query, candidates)


def _embedding_match(query: str, candidates: list[str], api_key: str) -> tuple[int, float, str] | None:
    try:
        from openai import OpenAI

        response = OpenAI(api_key=api_key, timeout=30).embeddings.create(
            model="text-embedding-3-small",
            input=[query[:4000], *[candidate[:1000] for candidate in candidates]],
        )
        vectors = [item.embedding for item in response.data]
        scores = [_cosine(vectors[0], vector) for vector in vectors[1:]]
        index = max(range(len(scores)), key=scores.__getitem__)
        return index, round(max(0.0, min(0.99, scores[index])), 3), "openai_embedding"
    except Exception:
        return None


def _lexical_semantic_match(query: str, candidates: list[str]) -> tuple[int, float, str]:
    normalized_query = _normalize(query)
    query_terms = set(normalized_query.split())
    scores: list[float] = []
    for candidate in candidates:
        normalized_candidate = _normalize(candidate)
        candidate_terms = set(normalized_candidate.split())
        union = query_terms | candidate_terms
        overlap = len(query_terms & candidate_terms) / len(union) if union else 0.0
        sequence = SequenceMatcher(None, normalized_query, normalized_candidate).ratio()
        scores.append((overlap * 0.65) + (sequence * 0.35))
    index = max(range(len(scores)), key=scores.__getitem__)
    return index, round(scores[index], 3), "semantic_lexical"


def _normalize(value: str) -> str:
    terms = re.findall(r"[a-z0-9]+", value.lower())
    return " ".join(_SYNONYMS.get(term, term.rstrip("s") if len(term) > 4 else term) for term in terms)


def _cosine(left: list[float], right: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right, strict=False))
    left_length = math.sqrt(sum(value * value for value in left))
    right_length = math.sqrt(sum(value * value for value in right))
    return numerator / (left_length * right_length) if left_length and right_length else 0.0
