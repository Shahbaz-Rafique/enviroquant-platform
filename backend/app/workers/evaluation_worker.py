from __future__ import annotations

import logging
import signal
import time
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.eia_evaluation import EiaEvaluationRun
from app.services.eia_evaluation_service import process_eia_evaluation_run_background


logger = logging.getLogger("enviroquant.evaluation_worker")
_running = True


def _stop(*_args: object) -> None:
    global _running
    _running = False


def next_pending_run_id():
    with SessionLocal() as db:
        cutoff = datetime.now(UTC) - timedelta(minutes=10)
        db.execute(
            update(EiaEvaluationRun)
            .where(
                EiaEvaluationRun.status == "RUNNING",
                EiaEvaluationRun.updated_at < cutoff,
            )
            .values(status="PENDING", completed_at=None)
        )
        db.commit()
        return db.scalar(
            select(EiaEvaluationRun.id)
            .where(EiaEvaluationRun.status == "PENDING")
            .order_by(EiaEvaluationRun.created_at.asc())
            .limit(1)
        )


def run_worker() -> None:
    settings = get_settings()
    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)
    logger.info("Evaluation worker started")
    while _running:
        run_id = next_pending_run_id()
        if run_id is None:
            time.sleep(settings.evaluation_worker_poll_seconds)
            continue
        process_eia_evaluation_run_background(run_id)
    logger.info("Evaluation worker stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_worker()
