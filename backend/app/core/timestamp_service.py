from datetime import datetime, timezone
from zoneinfo import ZoneInfo


class TimestampService:
    """
    All timestamps stored as UTC. Display converts to an IANA timezone.
    No naive datetimes ever leave this service.
    No tzinfo stripping — use astimezone() to normalize instead.
    """

    @staticmethod
    def now_utc() -> datetime:
        """Current time as a timezone-aware UTC datetime."""
        return datetime.now(timezone.utc)

    @staticmethod
    def to_display(utc_dt: datetime, iana_tz: str = "America/New_York") -> datetime:
        """Convert a UTC datetime to a local display timezone."""
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=timezone.utc)
        return utc_dt.astimezone(ZoneInfo(iana_tz))

    @staticmethod
    def duration_hours(start: datetime, end: datetime | None = None) -> float:
        """
        Compute elapsed hours between two timestamps.
        Naive datetimes are assumed to be UTC (SQLite stores timestamps without tz).
        Uses astimezone() — never strips tzinfo.
        """
        if end is None:
            end = TimestampService.now_utc()
        # Treat naive datetimes as UTC (SQLite stores without timezone info)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return (end.astimezone(timezone.utc) - start.astimezone(timezone.utc)).total_seconds() / 3600

    @staticmethod
    def format_for_packet(utc_dt: datetime, iana_tz: str = "America/New_York") -> str:
        """Format for the Impairment Packet: '07:40 AM EST'."""
        return TimestampService.to_display(utc_dt, iana_tz).strftime("%I:%M %p %Z")
