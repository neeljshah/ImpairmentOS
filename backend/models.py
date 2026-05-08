# Backward-compatibility shim — all models now live in app/models/
from app.models import (  # noqa: F401
    Base,
    Jurisdiction,
    ComplianceRule,
    Property,
    System,
    Impairment,
    ImpairmentEvent,
    Deficiency,
)
