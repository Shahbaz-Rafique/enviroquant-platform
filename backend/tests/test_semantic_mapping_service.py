from unittest.mock import patch

from app.services.semantic_mapping_service import best_semantic_match


def test_semantic_mapping_understands_environmental_synonyms() -> None:
    with patch("app.services.semantic_mapping_service.get_settings") as settings:
        settings.return_value.openai_api_key = None
        index, score, method = best_semantic_match(
            "flora and fauna effects",
            ["project implementation schedule", "biodiversity impact assessment"],
        )

    assert index == 1
    assert score > 0
    assert method == "semantic_lexical"
