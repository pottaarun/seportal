import { useState, useEffect, useRef, useMemo } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { getRelativeTime } from "../lib/timeUtils";

export function meta() {
  return [
    { title: "Learning Hub - SolutionHub" },
    { name: "description", content: "Training videos, recorded playbooks, and semantic transcript search" },
  ];
}

interface Video {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  stream_uid: string;
  thumbnail_url?: string;
  playback_url?: string;
  duration_seconds?: number;
  uploader_email: string;
  uploader_name?: string;
  transcript?: string;
  transcript_vtt?: string;
  transcription_status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  transcription_progress?: number;
  transcription_stage?: string;
  transcription_error?: string;
  retry_count?: number;       // auto-retry attempts (0-10)
  last_retry_at?: string;
  view_count?: number;
  created_at: string;
}

const MAX_AUTO_RETRIES = 10;

interface Cue {
  start: number;
  end: number;
  text: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  citations?: Array<{ start_seconds: number; end_seconds: number; snippet: string; score: number }>;
  timestamp: number;
}

interface SearchResult {
  video_id: string;
  title: string;
  description?: string;
  category?: string;
  stream_uid: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  score: number;
  snippet: string;
  timestamp?: number;
}

const CATEGORIES = [
  'onboarding',
  'product-demo',
  'objection-handling',
  'technical-deep-dive',
  'sales-playbook',
  'customer-success',
  'best-practices',
  'general',
];

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Parse a WebVTT string into { start, end, text } cues.
// Tolerates both "HH:MM:SS.mmm" and "MM:SS.mmm" formats and strips <v> speaker tags.
function parseVTT(vtt: string): Cue[] {
  if (!vtt) return [];
  const parseTime = (s: string): number => {
    const parts = s.trim().split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(s) || 0;
  };
  const cues: Cue[] = [];
  const lines = vtt.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\d{1,2}:\d{2}(?::\d{2})?\.\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?\.\d{1,3})/);
    if (!m) continue;
    const start = parseTime(m[1]);
    const end = parseTime(m[2]);
    const textLines: string[] = [];
    i++;
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i].replace(/<[^>]+>/g, '').trim());
      i++;
    }
    const text = textLines.join(' ').trim();
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

// Load the Cloudflare Stream Player SDK on demand. Returns the Stream global.
// See: https://developers.cloudflare.com/stream/viewing-videos/using-own-player/
let _streamSdkPromise: Promise<any> | null = null;
function loadStreamSdk(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR');
  if ((window as any).Stream) return Promise.resolve((window as any).Stream);
  if (_streamSdkPromise) return _streamSdkPromise;
  _streamSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://embed.videodelivery.net/embed/sdk.latest.js';
    script.async = true;
    script.onload = () => resolve((window as any).Stream);
    script.onerror = () => reject(new Error('Failed to load Cloudflare Stream SDK'));
    document.head.appendChild(script);
  });
  return _streamSdkPromise;
}

function StatusPill({ status, progress, retryCount }: { status: Video['transcription_status']; progress?: number; retryCount?: number }) {
  const pillStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  };
  const retryBadge = typeof retryCount === 'number' && retryCount > 0
    ? ` (try ${retryCount + 1}/${MAX_AUTO_RETRIES + 1})`
    : '';
  switch (status) {
    case 'completed':
      return <span style={{ ...pillStyle, background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>Indexed</span>;
    case 'processing':
      return (
        <span style={{ ...pillStyle, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s ease-in-out infinite' }} />
          {typeof progress === 'number' && progress > 0 ? `Transcribing ${progress}%${retryBadge}` : `Transcribing${retryBadge}`}
        </span>
      );
    case 'uploading':
      return <span style={{ ...pillStyle, background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>Uploading</span>;
    case 'failed':
      // After 10 retries we give up; before that the video will auto-retry with backoff.
      if (typeof retryCount === 'number' && retryCount >= MAX_AUTO_RETRIES) {
        return <span style={{ ...pillStyle, background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>Failed</span>;
      }
      return (
        <span style={{ ...pillStyle, background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
          Retrying {(retryCount || 0) + 1}/{MAX_AUTO_RETRIES}
        </span>
      );
    default:
      return <span style={{ ...pillStyle, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Pending</span>;
  }
}

export default function LearningHub() {
  const { isAdmin, currentUserEmail, currentUserName } = useAdmin();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Open video from URL ?v=<id>
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    if (v) {
      api.videos.getOne(v).then(video => video && setSelectedVideo(video)).catch(() => {});
    }
  }, []);

  const loadVideos = async () => {
    try {
      const data = await api.videos.getAll();
      setVideos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load videos', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadVideos(); }, []);

  // Poll processing videos every 5s so the progress bar feels live.
  useEffect(() => {
    const hasProcessing = videos.some(v => v.transcription_status === 'processing' || v.transcription_status === 'uploading' || v.transcription_status === 'pending');
    if (!hasProcessing) {
      if (processingPollRef.current) { clearInterval(processingPollRef.current); processingPollRef.current = null; }
      return;
    }
    if (processingPollRef.current) return;
    processingPollRef.current = setInterval(() => { loadVideos(); }, 5_000);
    return () => {
      if (processingPollRef.current) { clearInterval(processingPollRef.current); processingPollRef.current = null; }
    };
  }, [videos]);

  // Load recommendations for the currently open video
  useEffect(() => {
    if (!selectedVideo) { setRecommendations([]); return; }
    api.videos.getRecommendations(selectedVideo.id, 5)
      .then(res => setRecommendations((res as any).recommendations || []))
      .catch(() => setRecommendations([]));
    // Record view
    api.videos.recordView(selectedVideo.id, currentUserEmail || undefined).catch(() => {});
  }, [selectedVideo?.id]);

  // Debounced semantic search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.videos.search(searchQuery.trim(), 10);
        setSearchResults(res.results || []);
      } catch (e) {
        console.error('Search failed', e);
        setSearchResults([]);
      }
      setSearching(false);
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  const filteredVideos = videos.filter(v => {
    if (categoryFilter !== 'all' && (v.category || 'general') !== categoryFilter) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this video? This also removes it from Cloudflare Stream and the vector index.')) return;
    try {
      await api.videos.delete(id);
      setVideos(prev => prev.filter(v => v.id !== id));
      if (selectedVideo?.id === id) setSelectedVideo(null);
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleReprocess = async (id: string) => {
    try {
      await api.videos.reprocess(id);
      alert('Reprocessing started. This may take a few minutes.');
      loadVideos();
    } catch (e) {
      alert('Reprocess failed');
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>&#127916;</span> Learning Hub
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>
            Training videos, recorded playbooks, and searchable transcripts. Powered by Cloudflare Stream + Workers AI.
          </p>
        </div>
        <button onClick={() => setShowUploadModal(true)}>
          + Upload Training Video
        </button>
      </div>

      {/* Semantic search bar */}
      <div style={{
        padding: '14px 18px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Ask anything — "How does Cloudflare handle DDoS attacks?" "tips for demoing Workers to CTOs"`}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        />
        {searching && (
          <span style={{ fontSize: '11px', color: 'var(--cf-orange)', fontWeight: 600 }}>Searching transcripts...</span>
        )}
        {searchQuery && !searching && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults(null); }}
            className="btn-secondary btn-sm"
            style={{ padding: '4px 10px', fontSize: '12px' }}
          >Clear</button>
        )}
      </div>

      {/* Search results (semantic) */}
      {searchResults !== null && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Semantic Transcript Matches &mdash; {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
          </div>
          {searchResults.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              No videos matched that query. Try different words — semantic search looks at what was actually said in the video.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {searchResults.map(r => (
                <div
                  key={r.video_id}
                  onClick={() => {
                    const v = videos.find(x => x.id === r.video_id);
                    if (v) setSelectedVideo(v);
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{r.title}</h4>
                    <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700 }}>
                      {Math.round(r.score * 100)}% match
                    </span>
                  </div>
                  {r.snippet && (
                    <p style={{
                      margin: '0 0 8px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                      borderLeft: '2px solid var(--cf-orange)',
                      paddingLeft: '10px',
                      lineHeight: 1.5,
                    }}>
                      "{r.snippet.substring(0, 200)}{r.snippet.length > 200 ? '...' : ''}"
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {r.category && <span>{r.category}</span>}
                    {r.timestamp && r.timestamp > 0 && <span>&middot; @ {formatTimestamp(r.timestamp)}</span>}
                    {r.duration_seconds ? <span>&middot; {formatDuration(r.duration_seconds)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category filter */}
      {searchResults === null && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            onClick={() => setCategoryFilter('all')}
            className={categoryFilter === 'all' ? '' : 'btn-secondary'}
            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--radius-full)' }}
          >
            All ({videos.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = videos.filter(v => (v.category || 'general') === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={categoryFilter === cat ? '' : 'btn-secondary'}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--radius-full)' }}
              >
                {cat.replace(/-/g, ' ')} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Video grid */}
      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /><span className="loading-text">Loading videos...</span></div>
      ) : searchResults === null && filteredVideos.length === 0 ? (
        <div style={{
          padding: '60px 24px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-secondary)',
          border: '1px dashed var(--border-color)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#127916;</div>
          <h3 style={{ margin: '0 0 6px' }}>No training videos yet</h3>
          <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
            Upload your first video to get started. Each upload is automatically transcribed and indexed for search.
          </p>
          <button onClick={() => setShowUploadModal(true)}>+ Upload First Video</button>
        </div>
      ) : searchResults === null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredVideos.map(v => (
            <VideoCard
              key={v.id}
              video={v}
              onOpen={() => setSelectedVideo(v)}
              isAdmin={isAdmin}
              canManage={isAdmin || v.uploader_email === currentUserEmail}
              onDelete={() => handleDelete(v.id)}
              onReprocess={() => handleReprocess(v.id)}
            />
          ))}
        </div>
      ) : null}

      {/* Video player modal */}
      {selectedVideo && (
        <VideoPlayerModal
          video={selectedVideo}
          recommendations={recommendations}
          onClose={() => { setSelectedVideo(null); if (typeof window !== 'undefined') window.history.replaceState(null, '', '/learning'); }}
          onOpenRecommendation={(id) => {
            const rec = videos.find(x => x.id === id);
            if (rec) setSelectedVideo(rec);
            else api.videos.getOne(id).then(v => v && setSelectedVideo(v)).catch(() => {});
          }}
        />
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => { setShowUploadModal(false); loadVideos(); }}
          uploaderEmail={currentUserEmail || ''}
          uploaderName={currentUserName || ''}
        />
      )}

      <div className="page-footer">
        Every uploaded video is auto-transcribed via Cloudflare Stream AI captions and vectorized into the <code>seportal-videos</code> Vectorize index for semantic search and recommendations.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video card (library tile)
// ---------------------------------------------------------------------------
function VideoCard({
  video, onOpen, isAdmin, canManage, onDelete, onReprocess,
}: {
  video: Video;
  onOpen: () => void;
  isAdmin: boolean;
  canManage: boolean;
  onDelete: () => void;
  onReprocess: () => void;
}) {
  // Video is playable as soon as Stream finishes transcoding (playback_url is set).
  // The AI transcription / vectorization can still be running in the background —
  // that only affects the transcript panel and Ask feature, not the player itself.
  const isPlayable = !!video.playback_url;
  return (
    <div
      onClick={isPlayable ? onOpen : undefined}
      style={{
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        cursor: isPlayable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => { if (isPlayable) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Thumbnail */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%',
        background: 'var(--bg-tertiary)',
        overflow: 'hidden',
      }}>
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(246,130,31,0.08), rgba(99,102,241,0.08))',
            fontSize: '48px',
          }}>
            &#127916;
          </div>
        )}
        {isPlayable && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.25)', opacity: 0, transition: 'opacity 0.2s ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#F6821F"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        )}
        {video.duration_seconds ? (
          <span style={{
            position: 'absolute', right: 8, bottom: 8, padding: '2px 6px',
            background: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '11px',
            borderRadius: '4px', fontWeight: 600,
          }}>{formatDuration(video.duration_seconds)}</span>
        ) : null}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, lineHeight: 1.3, flex: 1 }}>{video.title}</h4>
          <StatusPill status={video.transcription_status} progress={video.transcription_progress} retryCount={video.retry_count} />
        </div>
        {/* Live transcription progress bar when the video is still being processed */}
        {video.transcription_status === 'processing' && typeof video.transcription_progress === 'number' && (
          <div style={{ marginTop: '2px' }}>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${video.transcription_progress}%`,
                background: 'linear-gradient(90deg, var(--cf-orange), #F59E0B)',
                transition: 'width 0.5s ease',
              }} />
            </div>
            {video.transcription_stage && (
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
                {video.transcription_stage}
              </p>
            )}
          </div>
        )}
        {video.description && (
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {video.description.length > 100 ? video.description.substring(0, 100) + '...' : video.description}
          </p>
        )}
        {video.transcription_status === 'failed' && video.transcription_error && (
          <p style={{ margin: 0, fontSize: '11px', color: '#EF4444', lineHeight: 1.4 }}>
            {video.transcription_error}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 'auto' }}>
          <span>{video.uploader_name || video.uploader_email.split('@')[0]} &middot; {getRelativeTime(video.created_at)}</span>
          <span>{(video.view_count || 0)} view{video.view_count === 1 ? '' : 's'}</span>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            {isAdmin && video.transcription_status === 'failed' && (
              <button
                onClick={(e) => { e.stopPropagation(); onReprocess(); }}
                className="btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '4px 10px', flex: 1 }}
              >Reprocess</button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px', color: '#EF4444', flex: 1 }}
            >Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video player modal: side-by-side video + (transcript | ask) + similar videos
// ---------------------------------------------------------------------------
// - Cloudflare Stream Player SDK gives us programmatic seek + currentTime events
// - Transcript is rendered as a list of clickable cues with timestamps; the cue
//   at the current playhead is highlighted and auto-scrolled into view
// - "Ask" tab runs per-video RAG and returns answers with clickable citations
// ---------------------------------------------------------------------------
function VideoPlayerModal({
  video, recommendations, onClose, onOpenRecommendation,
}: {
  video: Video;
  recommendations: any[];
  onClose: () => void;
  onOpenRecommendation: (id: string) => void;
}) {
  const [status, setStatus] = useState(video.transcription_status);
  const [progress, setProgress] = useState<number>(video.transcription_progress || 0);
  const [stage, setStage] = useState<string>(video.transcription_stage || '');
  const [retryCount, setRetryCount] = useState<number>(video.retry_count || 0);
  const [transcript, setTranscript] = useState(video.transcript || '');
  const [vtt, setVtt] = useState(video.transcript_vtt || '');
  const [currentTime, setCurrentTime] = useState(0);
  const [rightPaneTab, setRightPaneTab] = useState<'transcript' | 'ask'>('transcript');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<any>(null);
  const activeCueRef = useRef<HTMLDivElement | null>(null);
  const transcriptPaneRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const cues = useMemo(() => parseVTT(vtt), [vtt]);

  // Poll status + progress every 5s. Keep polling on 'failed' too (as long as the
  // auto-retry hasn't maxed out) since the cron will resume the task automatically.
  useEffect(() => {
    if (status === 'completed') return;
    if (status === 'failed' && retryCount >= MAX_AUTO_RETRIES) return; // give up polling
    const interval = setInterval(async () => {
      try {
        const s = await api.videos.getStatus(video.id);
        if (s.transcription_status !== status) setStatus(s.transcription_status);
        if (typeof s.transcription_progress === 'number') setProgress(s.transcription_progress);
        if (s.transcription_stage) setStage(s.transcription_stage);
        if (typeof s.retry_count === 'number') setRetryCount(s.retry_count);
        if (s.transcription_status === 'completed') {
          const full = await api.videos.getOne(video.id);
          setTranscript(full?.transcript || '');
          setVtt(full?.transcript_vtt || '');
          clearInterval(interval);
        }
      } catch {}
    }, 5_000);
    return () => clearInterval(interval);
  }, [video.id, status, retryCount]);

  // If we opened a video that already has transcript_vtt on the list payload, great.
  // Otherwise fetch the full record once on mount to pick up transcript_vtt.
  useEffect(() => {
    if (video.transcript_vtt || vtt) return;
    if (status !== 'completed') return;
    api.videos.getOne(video.id).then(full => {
      if (full?.transcript_vtt) setVtt(full.transcript_vtt);
      if (full?.transcript && !transcript) setTranscript(full.transcript);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, status]);

  // Initialize the Cloudflare Stream Player SDK on the iframe. Gives us:
  //   player.currentTime (read/write for seeking)
  //   player.play() / pause()
  //   "timeupdate" event for cue highlighting
  useEffect(() => {
    if (!iframeRef.current || !video.stream_uid || !video.playback_url) return;
    let disposed = false;
    loadStreamSdk().then((Stream) => {
      if (disposed || !iframeRef.current) return;
      try {
        const player = Stream(iframeRef.current);
        playerRef.current = player;
        player.addEventListener('timeupdate', () => {
          if (!disposed) setCurrentTime(player.currentTime || 0);
        });
      } catch (err) {
        console.error('Stream SDK init failed:', err);
      }
    }).catch(err => console.error('Stream SDK load failed:', err));
    return () => {
      disposed = true;
      playerRef.current = null;
    };
  }, [video.stream_uid, video.playback_url]);

  // Auto-scroll the active cue into view as playback progresses.
  useEffect(() => {
    if (rightPaneTab !== 'transcript') return;
    if (!activeCueRef.current || !transcriptPaneRef.current) return;
    const pane = transcriptPaneRef.current;
    const cue = activeCueRef.current;
    const paneRect = pane.getBoundingClientRect();
    const cueRect = cue.getBoundingClientRect();
    const outOfView = cueRect.top < paneRect.top + 40 || cueRect.bottom > paneRect.bottom - 40;
    if (outOfView) {
      cue.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, rightPaneTab]);

  // Seek the video to `seconds` and resume playback.
  const seekTo = (seconds: number) => {
    const p = playerRef.current;
    if (p) {
      try {
        p.currentTime = Math.max(0, seconds);
        p.play?.();
        return;
      } catch (err) { console.warn('seek via SDK failed, falling back to iframe reload', err); }
    }
    // Fallback: reload iframe with startTime query param if SDK unavailable
    if (iframeRef.current) {
      const base = `https://iframe.videodelivery.net/${video.stream_uid}`;
      iframeRef.current.src = `${base}?autoplay=true&startTime=${Math.max(0, Math.floor(seconds))}s`;
    }
  };

  // Find the currently-active cue (the one containing currentTime).
  const activeCueIndex = useMemo(() => {
    if (cues.length === 0) return -1;
    // Simple linear scan; VTT files are usually ~100-1000 cues so this is fine.
    for (let i = 0; i < cues.length; i++) {
      if (currentTime >= cues[i].start && currentTime < cues[i].end) return i;
      if (currentTime < cues[i].start) return i > 0 ? i - 1 : 0;
    }
    return cues.length - 1;
  }, [cues, currentTime]);

  // Chat: send a question, get answer + citations.
  const sendQuestion = async () => {
    const q = chatInput.trim();
    if (!q || chatBusy) return;
    const userMsg: ChatMessage = { role: 'user', text: q, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatBusy(true);
    setChatError(null);
    try {
      const res = await api.videos.ask(video.id, q);
      const asstMsg: ChatMessage = {
        role: 'assistant',
        text: res.answer,
        citations: res.citations || [],
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, asstMsg]);
    } catch (err: any) {
      setChatError(err?.message || 'Failed to get an answer');
    }
    setChatBusy(false);
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 50);
  };

  const streamEmbedURL = `https://iframe.videodelivery.net/${video.stream_uid}`;
  const hasPlayableVideo = !!video.stream_uid && !!video.playback_url;

  // Only render the "Similar videos" column when there's actually something in it —
  // otherwise collapse to a 2-column layout so the video player gets that extra width.
  const showSimilarColumn = recommendations.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          // Let the modal use almost the full viewport on wide screens.
          maxWidth: 'min(1800px, 98vw)',
          width: '98vw',
          maxHeight: '96vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '14px', flexShrink: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</h3>
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-tertiary)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{video.uploader_name || video.uploader_email}</span>
              <span>&middot;</span>
              <span>{getRelativeTime(video.created_at)}</span>
              {video.category && <><span>&middot;</span><span>{video.category.replace(/-/g, ' ')}</span></>}
              {typeof video.duration_seconds === 'number' && video.duration_seconds > 0 && (
                <><span>&middot;</span><span>{formatDuration(video.duration_seconds)}</span></>
              )}
              <StatusPill status={status} progress={progress} retryCount={retryCount} />
            </div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ flexShrink: 0 }}>&#215;</button>
        </div>

        {/* Body: wide video column + transcript/ask side panel. Similar-videos column only
            appears when recommendations actually exist, so an empty sidebar doesn't steal
            horizontal space from the player. */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: showSimilarColumn
            ? 'minmax(0, 1.8fr) minmax(340px, 480px) minmax(220px, 280px)'
            : 'minmax(0, 2fr) minmax(360px, 520px)',
          gap: '16px',
          padding: '16px 18px',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}>
          {/* ===== COLUMN 1: Video player + description ===== */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>
            {hasPlayableVideo ? (
              <div style={{ position: 'relative', paddingTop: '56.25%', background: 'black', borderRadius: 'var(--radius-lg)', overflow: 'hidden', flexShrink: 0 }}>
                <iframe
                  ref={iframeRef}
                  src={streamEmbedURL}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  title={video.title}
                />
              </div>
            ) : (
              <div style={{
                padding: '40px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-tertiary)',
                textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)',
              }}>
                {status === 'processing' || status === 'uploading' || status === 'pending'
                  ? 'Video is still processing. This page will auto-refresh when ready.'
                  : 'Video playback unavailable.'}
              </div>
            )}

            {video.description && (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, flexShrink: 0 }}>
                {video.description}
              </div>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 'auto' }}>
              Tip: click any timestamp or transcript line to jump the video to that moment.
            </div>
          </div>

          {/* ===== COLUMN 2: Transcript / Ask tabs ===== */}
          <div style={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            overflow: 'hidden',
          }}>
            {/* Tab header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <TabButton active={rightPaneTab === 'transcript'} onClick={() => setRightPaneTab('transcript')}>
                Transcript{cues.length > 0 ? ` · ${cues.length}` : ''}
              </TabButton>
              <TabButton active={rightPaneTab === 'ask'} onClick={() => setRightPaneTab('ask')}>
                Ask <span style={{ fontSize: '9px', padding: '1px 5px', background: 'var(--cf-orange)', color: 'white', borderRadius: '3px', marginLeft: '4px', letterSpacing: '0.05em', fontWeight: 700 }}>AI</span>
              </TabButton>
            </div>

            {/* Tab body */}
            {rightPaneTab === 'transcript' ? (
              <div ref={transcriptPaneRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {status !== 'completed' ? (
                  status === 'failed' ? (
                    <div style={{ padding: '14px' }}>
                      <p style={{ fontSize: '13px', color: '#EF4444', margin: '0 0 8px' }}>
                        Transcription failed: {video.transcription_error || 'unknown error'}
                      </p>
                      {retryCount < MAX_AUTO_RETRIES ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                          Auto-retrying with exponential backoff &mdash; attempt {retryCount}/{MAX_AUTO_RETRIES} done.
                          The next attempt is queued by the cron scheduler; check back in a few minutes.
                        </p>
                      ) : (
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                          Auto-retry budget exhausted ({MAX_AUTO_RETRIES}/{MAX_AUTO_RETRIES}). Click <strong>Reprocess</strong> on the card to try again manually.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '16px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        {stage || 'Preparing transcript...'}
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-tertiary)', overflow: 'hidden', marginBottom: '6px' }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: 'linear-gradient(90deg, var(--cf-orange), #F59E0B)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                        <span>{progress}%</span>
                        <span>Auto-refreshing&hellip;</span>
                      </div>
                      <p style={{ margin: '14px 0 0', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                        Transcription happens in three stages: (1)&nbsp;Stream transcodes the video,
                        (2)&nbsp;Workers&nbsp;AI generates captions via Whisper, (3)&nbsp;we chunk + embed the transcript
                        into Vectorize for semantic search. Typically done in 1-3&nbsp;minutes.
                      </p>
                    </div>
                  )
                ) : cues.length > 0 ? (
                  cues.map((cue: Cue, i: number) => {
                    const isActive = i === activeCueIndex;
                    return (
                      <div
                        key={i}
                        ref={isActive ? activeCueRef : undefined}
                        onClick={() => seekTo(cue.start)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'start',
                          background: isActive ? 'rgba(246,130,31,0.12)' : 'transparent',
                          borderLeft: isActive ? '2px solid var(--cf-orange)' : '2px solid transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isActive ? 'var(--cf-orange)' : 'var(--text-tertiary)',
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                          paddingTop: '1px',
                          minWidth: '42px',
                        }}>
                          {formatTimestamp(cue.start)}
                        </span>
                        <span style={{
                          fontSize: '13px',
                          lineHeight: 1.5,
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: isActive ? 500 : 400,
                        }}>
                          {cue.text}
                        </span>
                      </div>
                    );
                  })
                ) : transcript ? (
                  // Fallback: no VTT available (e.g., older video indexed before we saved VTT).
                  // Show the plain transcript with a hint that cues aren't available.
                  <div style={{ padding: '12px 14px', fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '10px', fontStyle: 'italic' }}>
                      Timestamped cues aren't available for this video (it was indexed before we started saving them). You can use the "Ask" tab to find specific moments — re-process the video to enable click-to-seek.
                    </p>
                    {transcript}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '14px' }}>No transcript available.</p>
                )}
              </div>
            ) : (
              <ChatPane
                messages={chatMessages}
                busy={chatBusy}
                error={chatError}
                input={chatInput}
                setInput={setChatInput}
                onSend={sendQuestion}
                onSeek={seekTo}
                transcriptAvailable={!!transcript || cues.length > 0}
                scrollRef={chatScrollRef}
                videoTitle={video.title}
              />
            )}
          </div>

          {/* ===== COLUMN 3: Similar videos (only rendered when recommendations exist) ===== */}
          {showSimilarColumn && (
            <div style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              overflow: 'hidden',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', flexShrink: 0, padding: '4px 2px' }}>
                Similar Videos
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recommendations.map(rec => (
                  <div
                    key={rec.id}
                    onClick={() => onOpenRecommendation(rec.id)}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  >
                    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                      {rec.thumbnail_url ? (
                        <img src={rec.thumbnail_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          &#127916;
                        </div>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {rec.title}
                    </p>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      {formatDuration(rec.duration_seconds)}
                      {typeof rec.similarity === 'number' && (
                        <> &middot; <span style={{ color: '#10B981', fontWeight: 600 }}>{Math.round(rec.similarity * 100)}% match</span></>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--cf-orange)' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        fontSize: '13px',
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
      }}
    >
      {children}
    </button>
  );
}

// Chat/Ask pane — RAG question answering over this video's transcript
function ChatPane({
  messages, busy, error, input, setInput, onSend, onSeek, transcriptAvailable, scrollRef, videoTitle,
}: {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onSeek: (seconds: number) => void;
  transcriptAvailable: boolean;
  scrollRef: React.Ref<HTMLDivElement>;
  videoTitle: string;
}) {
  const examples = [
    'What is this video about?',
    'Summarize the key takeaways',
    'Where do they discuss [topic]?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 ? (
          <div style={{ padding: '10px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Ask anything about <strong>{videoTitle}</strong>. I&apos;ll answer only from the transcript and cite the exact moments.
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: '4px' }}>
              TRY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {examples.map(ex => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  disabled={!transcriptAvailable}
                  className="btn-secondary"
                  style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', opacity: transcriptAvailable ? 1 : 0.5 }}
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: msg.role === 'user' ? 'rgba(246,130,31,0.12)' : 'var(--bg-tertiary)',
                border: msg.role === 'user' ? '1px solid rgba(246,130,31,0.3)' : '1px solid var(--border-color)',
                fontSize: '13px',
                lineHeight: 1.55,
                color: 'var(--text-primary)',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '95%',
              }}>
                {renderTextWithTimestamps(msg.text, onSeek)}
              </div>
              {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '4px' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                    Sources ({msg.citations.length})
                  </div>
                  {msg.citations.map((c, j) => (
                    <button
                      key={j}
                      onClick={() => onSeek(c.start_seconds)}
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'start',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.borderColor = 'var(--cf-orange)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--cf-orange)',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}>
                        &#9654; {formatTimestamp(c.start_seconds)}
                      </span>
                      <span style={{ lineHeight: 1.4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {c.snippet}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {busy && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-tertiary)',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            alignSelf: 'flex-start',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <span style={{ display: 'inline-flex', gap: '3px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cf-orange)', animation: 'pulse 1.2s ease-in-out infinite' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cf-orange)', animation: 'pulse 1.2s ease-in-out 0.2s infinite' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cf-orange)', animation: 'pulse 1.2s ease-in-out 0.4s infinite' }} />
            </span>
            Thinking...
          </div>
        )}
        {error && (
          <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '12px', color: '#EF4444' }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 10px 12px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
        <form
          onSubmit={(e) => { e.preventDefault(); onSend(); }}
          style={{ display: 'flex', gap: '6px' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy || !transcriptAvailable}
            placeholder={transcriptAvailable ? 'Ask a question...' : 'Waiting for transcript...'}
            className="form-input"
            style={{ flex: 1, fontSize: '13px', padding: '8px 12px' }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim() || !transcriptAvailable}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}

// Render text, converting [MM:SS] or [M:SS] patterns into clickable seek buttons.
function renderTextWithTimestamps(text: string, onSeek: (s: number) => void): React.ReactNode {
  const regex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const [, a, b, c] = m;
    const seconds = c
      ? Number(a) * 3600 + Number(b) * 60 + Number(c)
      : Number(a) * 60 + Number(b);
    parts.push(
      <button
        key={`ts-${key++}`}
        onClick={() => onSeek(seconds)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 6px',
          background: 'rgba(246,130,31,0.15)',
          color: 'var(--cf-orange)',
          border: '1px solid rgba(246,130,31,0.3)',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          cursor: 'pointer',
          margin: '0 1px',
        }}
        title="Jump to this moment"
      >
        &#9654; {m[0].slice(1, -1)}
      </button>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length > 0 ? parts : text;
}

// ---------------------------------------------------------------------------
// Upload modal
// ---------------------------------------------------------------------------
function UploadModal({
  onClose, onUploaded, uploaderEmail, uploaderName,
}: {
  onClose: () => void;
  onUploaded: () => void;
  uploaderEmail: string;
  uploaderName: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadStats, setUploadStats] = useState<{ speedBps: number; etaSeconds: number; bytesUploaded: number; bytesTotal: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating-url' | 'uploading' | 'finalizing' | 'done' | 'error' | 'cancelled'>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);

  const handleCancel = () => {
    if (abortCtrlRef.current) abortCtrlRef.current.abort();
    setStatus('cancelled');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please choose a video file'); return; }
    if (!title.trim()) { setError('Please enter a title'); return; }
    if (!uploaderEmail) { setError('Please sign in first'); return; }
    setError(null);

    try {
      setStatus('creating-url');
      const { video_id, uploadURL, method } = await api.videos.getUploadUrl({
        title: title.trim(),
        description: description.trim(),
        category,
        uploader_email: uploaderEmail,
        uploader_name: uploaderName,
        max_duration_seconds: 21600, // 6 hours max
        upload_length: file.size,
      });

      setStatus('uploading');
      abortCtrlRef.current = new AbortController();
      await api.videos.uploadToStream(
        uploadURL,
        file,
        (pct, stats) => {
          setUploadPct(pct);
          if (stats) setUploadStats(stats);
        },
        method || 'tus',
        abortCtrlRef.current.signal,
      );

      setStatus('finalizing');
      await api.videos.finalizeUpload(video_id);

      setStatus('done');
      setTimeout(onUploaded, 600);
    } catch (err: any) {
      console.error('Upload failed', err);
      if (err?.message === 'Upload cancelled' || status === 'cancelled') {
        setStatus('cancelled');
        setError('Upload cancelled.');
      } else {
        setStatus('error');
        setError(err?.message || 'Upload failed');
      }
    }
  };

  const fmtSpeed = (bps: number): string => {
    if (bps <= 0) return '...';
    const mbps = (bps * 8) / (1024 * 1024);
    const mBps = bps / (1024 * 1024);
    return `${mBps.toFixed(1)} MB/s (${mbps.toFixed(1)} Mbps)`;
  };
  const fmtEta = (sec: number): string => {
    if (!sec || sec <= 0 || !isFinite(sec)) return '...';
    if (sec < 60) return `${Math.round(sec)}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
    return `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m`;
  };

  const busy = status === 'creating-url' || status === 'uploading' || status === 'finalizing';

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h3>Upload Training Video</h3>
          {!busy && <button className="modal-close" onClick={onClose}>&#215;</button>}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
          Videos upload directly to Cloudflare Stream (resumable, 16&nbsp;MB chunks). Upload speed is limited by your internet connection &mdash; expect roughly <strong>1&nbsp;minute per 75&nbsp;MB</strong> on a 10&nbsp;Mbps link. After upload, we auto-transcribe and index the transcript for semantic search.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', color: '#EF4444', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Handling the 'we already have an incumbent' objection"
              disabled={busy}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will viewers learn? Add key talking points so this video surfaces in related searches."
              rows={3}
              style={{ resize: 'vertical' }}
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Video file *</label>
            <input
              type="file"
              accept="video/*"
              className="form-input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={busy}
              required
            />
            {file && (
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                {file.name} &middot; {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
          </div>

          {/* Progress */}
          {status === 'creating-url' && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Requesting resumable upload URL from Cloudflare Stream...</p>}
          {status === 'uploading' && file && (
            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Uploading&hellip; {uploadPct}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                  {uploadStats ? `ETA ${fmtEta(uploadStats.etaSeconds)}` : 'Starting...'}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-primary)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadPct}%`, background: 'linear-gradient(90deg, var(--cf-orange), #F59E0B)', transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                <span>
                  {((file.size * uploadPct) / 100 / (1024 * 1024)).toFixed(1)} MB / {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <span>
                  {uploadStats ? fmtSpeed(uploadStats.speedBps) : '...'}
                </span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                Upload is bandwidth-bound. Keep this tab open until it finishes.
              </div>
            </div>
          )}
          {status === 'finalizing' && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Upload complete. Kicking off transcription...</p>}
          {status === 'done' && <p style={{ fontSize: '13px', color: '#10B981' }}>&#10003; Upload successful! Transcription continues in the background.</p>}
          {status === 'cancelled' && <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Upload cancelled.</p>}

          <div className="modal-actions">
            {status === 'uploading' ? (
              <button type="button" className="btn-secondary" onClick={handleCancel} style={{ color: '#EF4444' }}>
                Cancel upload
              </button>
            ) : !busy ? (
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            ) : null}
            <button type="submit" disabled={busy || !file || !title.trim()}>
              {status === 'idle' ? 'Upload' : status === 'done' ? 'Done' : status === 'cancelled' ? 'Retry' : 'Uploading...'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
