"""Thin wrapper around LiveKit's server-side RoomServiceClient — used for
two things neither group_meeting.py nor partner_meeting.py could do before:
seeing who's ACTUALLY connected to a room right now (for the "active
meetings" list), and a host forcibly muting someone's mic/camera (which
only the LiveKit server, not another participant's browser, is allowed to
do). Every function here is best-effort: on any error (LiveKit not
configured, room doesn't exist, SDK hiccup) it degrades to an empty/false
result instead of raising, since none of this should ever break the actual
meeting itself.
"""
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def _configured() -> bool:
    return bool(settings.livekit_api_key and settings.livekit_api_secret and settings.livekit_url)


async def list_room_participants(room_name: str) -> list[dict]:
    """Returns [{identity, name, tracks: [{sid, kind, muted}]}] for whoever
    is currently connected to this LiveKit room. Empty list if the room is
    empty, doesn't exist, or LiveKit isn't configured."""
    if not _configured():
        return []
    from livekit import api as livekit_api

    lkapi = livekit_api.LiveKitAPI(settings.livekit_url, settings.livekit_api_key, settings.livekit_api_secret)
    try:
        res = await lkapi.room.list_participants(livekit_api.ListParticipantsRequest(room=room_name))
        out = []
        for p in res.participants:
            tracks = [
                {"sid": t.sid, "kind": "video" if t.type == 1 else "audio", "muted": t.muted}
                for t in p.tracks
            ]
            out.append({"identity": p.identity, "name": p.name or p.identity, "tracks": tracks})
        return out
    except Exception:
        logger.info("Could not list participants for room %s (likely empty/nonexistent)", room_name)
        return []
    finally:
        await lkapi.aclose()


async def mute_participant_track(room_name: str, identity: str, kind: str, muted: bool = True) -> bool:
    """Forcibly mutes (or unmutes) a participant's audio or video track.
    `kind` is "audio" or "video". Returns True if a matching track was
    found and the mute call succeeded."""
    if not _configured():
        return False
    from livekit import api as livekit_api

    participants = await list_room_participants(room_name)
    target = next((p for p in participants if p["identity"] == identity), None)
    if not target:
        return False
    track = next((t for t in target["tracks"] if t["kind"] == kind), None)
    if not track:
        return False

    lkapi = livekit_api.LiveKitAPI(settings.livekit_url, settings.livekit_api_key, settings.livekit_api_secret)
    try:
        await lkapi.room.mute_published_track(
            livekit_api.MutePublishedTrackRequest(
                room=room_name, identity=identity, track_sid=track["sid"], muted=muted
            )
        )
        return True
    except Exception:
        logger.exception("Failed to mute track for %s in room %s", identity, room_name)
        return False
    finally:
        await lkapi.aclose()
