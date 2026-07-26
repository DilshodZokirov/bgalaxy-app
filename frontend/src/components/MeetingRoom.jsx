import { useMemo, useState } from "react";
import { Track } from "livekit-client";
import {
  Chat,
  ConnectionStateToast,
  DisconnectButton,
  RoomAudioRenderer,
  TrackToggle,
  VideoTrack,
  isTrackReference,
  useIsSpeaking,
  useParticipants,
  useTracks,
} from "@livekit/components-react";

const MAX_VISIBLE = 8;

function IconMic({ off = false }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      {off ? (
        <>
          <path d="M9 9v3a3 3 0 0 0 5.1 2.1" />
          <path d="M15 9.5V6a3 3 0 0 0-5.8-1" />
          <path d="M5 11a7 7 0 0 0 11 5.7" />
          <path d="M12 18v3M8 21h8" />
          <path d="M4 4l16 16" />
        </>
      ) : (
        <>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
        </>
      )}
    </svg>
  );
}

function IconCam({ off = false }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="12" height="10" rx="2" />
      <path d="M15 10l6-3v10l-6-3z" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4M12 8v4M10 10l2-2 2 2" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 18c.7-3 2.8-4.5 5.5-4.5s4.8 1.5 5.5 4.5" />
      <path d="M14 18c.4-1.8 1.6-3 3.5-3 1.4 0 2.5.7 3.2 2" />
    </svg>
  );
}

function IconEnd() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.7 3.9 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.6 21 3 12.4 3 2c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" />
    </svg>
  );
}

function initialsOf(name) {
  return (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MeetingTile({ trackRef }) {
  const participant = trackRef.participant;
  const speaking = useIsSpeaking(participant);
  const name = participant.name || participant.identity || "Ishtirokchi";
  const videoOn =
    isTrackReference(trackRef) &&
    !!trackRef.publication?.track &&
    !trackRef.publication?.isMuted;
  const micOff = !participant.isMicrophoneEnabled;

  return (
    <div className={`g4-tile ${speaking ? "is-speaking" : ""}`}>
      <div className="g4-tile-media">
        {videoOn ? (
          <VideoTrack trackRef={trackRef} />
        ) : (
          <div className="g4-tile-fallback">
            <span>{initialsOf(name)}</span>
          </div>
        )}
      </div>
      <div className="g4-tile-footer">
        <span className="g4-tile-name">{name}</span>
        <span className={`g4-tile-mic ${micOff ? "off" : ""}`} title={micOff ? "Mikrofon o‘chiq" : "Mikrofon yoqiq"}>
          <IconMic off={micOff} />
        </span>
      </div>
    </div>
  );
}

/**
 * Custom in-call UI matching the G4 Meeting Room mockup.
 * Must be rendered inside <LiveKitRoom>.
 */
export default function MeetingRoom({
  title = "Uchrashuv",
  kicker = "G4 MEETING ROOM",
  headerActions = null,
  hostControls = null,
}) {
  const [showChat, setShowChat] = useState(false);
  const [showPeople, setShowPeople] = useState(false);

  const participants = useParticipants();
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });

  const displayTracks = useMemo(() => {
    // Prefer screen-share tiles first, then cameras (dedupe by participant)
    const seen = new Set();
    const ordered = [];
    for (const tr of screenTracks) {
      const id = tr.participant.identity;
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(tr);
    }
    for (const tr of cameraTracks) {
      const id = tr.participant.identity;
      if (seen.has(`cam:${id}`)) continue;
      // If this person is already shown via screen share, still keep camera? Mockup is people grid — skip cam if sharing
      if (seen.has(id)) continue;
      seen.add(`cam:${id}`);
      ordered.push(tr);
    }
    return ordered;
  }, [cameraTracks, screenTracks]);

  const visible = displayTracks.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, displayTracks.length - MAX_VISIBLE);
  const count = participants.length;

  return (
    <div className="g4-room">
      <RoomAudioRenderer />
      <ConnectionStateToast />

      <header className="g4-header">
        <div className="g4-header-copy">
          <p className="g4-kicker">{kicker}</p>
          <h1>{title}</h1>
        </div>
        <div className="g4-header-right">
          {headerActions}
          <div className="g4-count" title="Ishtirokchilar">
            <IconPeople />
            <span>{count}</span>
          </div>
        </div>
      </header>

      <main className="g4-stage">
        <div className={`g4-grid count-${Math.min(visible.length + (overflow ? 1 : 0), 9)}`}>
          {visible.map((tr) => (
            <MeetingTile
              key={`${tr.participant.identity}-${tr.source}-${tr.publication?.trackSid || "ph"}`}
              trackRef={tr}
            />
          ))}
          {overflow > 0 && (
            <div className="g4-tile g4-tile-more">
              <strong>+{overflow}</strong>
              <span>Yana {overflow} kishi</span>
            </div>
          )}
        </div>
      </main>

      <footer className="g4-controls">
        <TrackToggle source={Track.Source.Microphone} showIcon={false} className="g4-ctrl">
          <IconMic />
        </TrackToggle>
        <TrackToggle source={Track.Source.Camera} showIcon={false} className="g4-ctrl">
          <IconCam />
        </TrackToggle>
        <TrackToggle source={Track.Source.ScreenShare} showIcon={false} className="g4-ctrl">
          <IconShare />
        </TrackToggle>
        <button
          type="button"
          className={`g4-ctrl ${showChat ? "active" : ""}`}
          onClick={() => {
            setShowChat((v) => !v);
            setShowPeople(false);
          }}
          title="Chat"
        >
          <IconChat />
        </button>
        <button
          type="button"
          className={`g4-ctrl ${showPeople ? "active" : ""}`}
          onClick={() => {
            setShowPeople((v) => !v);
            setShowChat(false);
          }}
          title="Ishtirokchilar"
        >
          <IconPeople />
        </button>
        <DisconnectButton className="g4-ctrl g4-ctrl-end">
          <IconEnd />
        </DisconnectButton>
      </footer>

      {showChat && (
        <aside className="g4-sidepanel">
          <div className="g4-sidepanel-head">
            <strong>Chat</strong>
            <button type="button" onClick={() => setShowChat(false)}>
              Yopish
            </button>
          </div>
          <Chat />
        </aside>
      )}

      {showPeople && (
        <aside className="g4-sidepanel">
          <div className="g4-sidepanel-head">
            <strong>Ishtirokchilar ({count})</strong>
            <button type="button" onClick={() => setShowPeople(false)}>
              Yopish
            </button>
          </div>
          <div className="g4-people-list">
            {participants.map((p) => (
              <div key={p.identity} className="g4-people-row">
                <span className="g4-people-avatar">{initialsOf(p.name || p.identity)}</span>
                <div>
                  <strong>{p.name || p.identity}</strong>
                  <em>
                    {p.isLocal ? "Siz" : "Mehmon"}
                    {!p.isMicrophoneEnabled ? " · mic off" : ""}
                    {!p.isCameraEnabled ? " · cam off" : ""}
                  </em>
                </div>
              </div>
            ))}
          </div>
          {hostControls && <div className="g4-host-block">{hostControls}</div>}
        </aside>
      )}
    </div>
  );
}
