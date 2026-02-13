import { useState, useEffect, useRef, useCallback } from 'react';
import websocketService from '../services/websocket';
import api from '../services/api';

const toUrl = (u) => {
  if (!u) return '';
  if (u.startsWith('http://localhost:3000')) return u.replace('http://localhost:3000', import.meta.env.VITE_API_URL || 'http://localhost:3000');
  if (u.startsWith('http')) return u;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${u}`;
};

export default function AmbientPlayer({ gameId, isGameMaster }) {
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [volume, setVolume] = useState(0.5);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [audioAssets, setAudioAssets] = useState([]);
  const [view, setView] = useState('playlists');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressInterval = useRef(null);

  const loadPlaylists = useCallback(async () => {
    try {
      const res = await api.get(`/playlist/game/${gameId}`);
      setPlaylists(Array.isArray(res.data) ? res.data : []);
    } catch { setPlaylists([]); }
  }, [gameId]);

  const loadAudioAssets = useCallback(async () => {
    try {
      const res = await api.get(`/asset/game/${gameId}`);
      const audios = (res.data || []).filter(a => {
        const t = (a.type || '').toLowerCase();
        const name = (a.name || a.filename || '').toLowerCase();
        return t.startsWith('audio') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.m4a');
      });
      setAudioAssets(audios);
    } catch { setAudioAssets([]); }
  }, [gameId]);

  useEffect(() => {
    if (isGameMaster) {
      loadPlaylists();
      loadAudioAssets();
    }
  }, [gameId, isGameMaster, loadPlaylists, loadAudioAssets]);

  useEffect(() => {
    const audio = audioRef.current;
    const onEnded = () => {
      if (activePlaylist && !loop) {
        playNextTrack();
      }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  });

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        const a = audioRef.current;
        if (a.duration) {
          setProgress(a.currentTime);
          setDuration(a.duration);
        }
      }, 500);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying]);

  useEffect(() => {
    const socket = websocketService.getSocket();
    if (!socket) return;
    const onPlay = (data) => {
      const audio = audioRef.current;
      audio.src = toUrl(data.url);
      audio.volume = data.volume ?? 0.5;
      audio.loop = data.loop ?? false;
      audio.play().catch(() => {});
      setCurrentTrack(data.name || 'Audio');
      setIsPlaying(true);
      setVolume(data.volume ?? 0.5);
      setLoop(data.loop ?? false);
    };
    const onStop = () => {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentTrackIndex(-1);
    };
    const onVolume = (data) => {
      audioRef.current.volume = data.volume;
      setVolume(data.volume);
    };
    socket.on('audioPlay', onPlay);
    socket.on('audioStop', onStop);
    socket.on('audioVolume', onVolume);
    return () => {
      socket.off('audioPlay', onPlay);
      socket.off('audioStop', onStop);
      socket.off('audioVolume', onVolume);
    };
  }, []);

  const playTrack = (track, index, pl) => {
    setActivePlaylist(pl);
    setCurrentTrackIndex(index);
    setCurrentTrack(track.name);
    websocketService.playAudio(gameId, track.url, track.name, volume, loop);
  };

  const playNextTrack = () => {
    if (!activePlaylist) return;
    const tracks = activePlaylist.tracks || [];
    if (tracks.length === 0) return;
    let nextIdx;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * tracks.length);
    } else {
      nextIdx = (currentTrackIndex + 1) % tracks.length;
    }
    playTrack(tracks[nextIdx], nextIdx, activePlaylist);
  };

  const playPrevTrack = () => {
    if (!activePlaylist) return;
    const tracks = activePlaylist.tracks || [];
    if (tracks.length === 0) return;
    const prevIdx = currentTrackIndex <= 0 ? tracks.length - 1 : currentTrackIndex - 1;
    playTrack(tracks[prevIdx], prevIdx, activePlaylist);
  };

  const handleStop = () => {
    websocketService.stopAudio(gameId);
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (isGameMaster) {
      websocketService.setAudioVolume(gameId, newVol);
    } else {
      audioRef.current.volume = newVol;
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newTime = pct * duration;
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await api.post(`/playlist/game/${gameId}`, { name: newPlaylistName.trim() });
      setNewPlaylistName('');
      loadPlaylists();
    } catch {}
  };

  const deletePlaylist = async (id) => {
    if (!confirm('Supprimer cette playlist ?')) return;
    try {
      await api.delete(`/playlist/${id}`);
      if (activePlaylist?.id === id) {
        handleStop();
        setActivePlaylist(null);
      }
      loadPlaylists();
    } catch {}
  };

  const addTrackToPlaylist = async (playlistId, asset) => {
    try {
      const res = await api.post(`/playlist/${playlistId}/track`, {
        assetId: asset.id,
        name: asset.name || asset.filename,
        url: asset.url,
      });
      setPlaylists(prev => prev.map(p => p.id === playlistId ? res.data : p));
      if (activePlaylist?.id === playlistId) setActivePlaylist(res.data);
      if (editingPlaylist?.id === playlistId) setEditingPlaylist(res.data);
    } catch {}
  };

  const removeTrackFromPlaylist = async (playlistId, trackId) => {
    try {
      const res = await api.delete(`/playlist/${playlistId}/track/${trackId}`);
      setPlaylists(prev => prev.map(p => p.id === playlistId ? res.data : p));
      if (activePlaylist?.id === playlistId) setActivePlaylist(res.data);
      if (editingPlaylist?.id === playlistId) setEditingPlaylist(res.data);
    } catch {}
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isPlaying && !isGameMaster) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {isGameMaster && showPanel && (
        <div className="bg-gray-800 border-t border-gray-700 max-h-[50vh] overflow-y-auto">
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 flex items-center gap-2">
            <button
              onClick={() => setView('playlists')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === 'playlists' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Playlists
            </button>
            <button
              onClick={() => setView('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === 'library' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Bibliotheque audio
            </button>
            {editingPlaylist && (
              <button
                onClick={() => setView('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === 'edit' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                {editingPlaylist.name}
              </button>
            )}
          </div>

          <div className="p-3">
            {view === 'playlists' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createPlaylist()}
                    placeholder="Nouvelle playlist..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={createPlaylist}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition"
                  >
                    +
                  </button>
                </div>
                {playlists.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Aucune playlist. Creez-en une !</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {playlists.map(pl => {
                      const tracks = pl.tracks || [];
                      const isActive = activePlaylist?.id === pl.id && isPlaying;
                      return (
                        <div key={pl.id}
                          className={`rounded-xl border p-3 transition ${isActive ? 'bg-purple-900 bg-opacity-30 border-purple-600' : 'bg-gray-750 border-gray-600'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isActive && <span className="text-purple-400 animate-pulse">&#9835;</span>}
                              <h4 className="text-white font-semibold text-sm truncate">{pl.name}</h4>
                              <span className="text-gray-500 text-xs shrink-0">{tracks.length} pistes</span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                if (tracks.length > 0) {
                                  setActivePlaylist(pl);
                                  playTrack(tracks[0], 0, pl);
                                }
                              }}
                              disabled={tracks.length === 0}
                              className="px-2.5 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg text-xs transition"
                            >
                              Jouer
                            </button>
                            <button
                              onClick={() => { setEditingPlaylist(pl); setView('edit'); }}
                              className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition"
                            >
                              Editer
                            </button>
                            <button
                              onClick={() => deletePlaylist(pl.id)}
                              className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs transition"
                            >
                              Suppr
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {view === 'library' && (
              <div className="space-y-2">
                <p className="text-gray-400 text-xs mb-2">
                  Cliquez sur un fichier pour le jouer directement, ou ajoutez-le a une playlist.
                </p>
                {audioAssets.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Aucun fichier audio. Uploadez-en via l'onglet Fichiers.</p>
                ) : (
                  <div className="space-y-1">
                    {audioAssets.map(a => (
                      <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-650 group">
                        <button
                          onClick={() => {
                            websocketService.playAudio(gameId, a.url, a.name || a.filename, volume, loop);
                            setCurrentTrack(a.name || a.filename);
                            setActivePlaylist(null);
                            setCurrentTrackIndex(-1);
                          }}
                          className="text-purple-400 hover:text-purple-300 shrink-0"
                          title="Jouer"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <span className="text-gray-200 text-sm truncate flex-1">{a.name || a.filename}</span>
                        {playlists.length > 0 && (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                addTrackToPlaylist(e.target.value, a);
                                e.target.value = '';
                              }
                            }}
                            className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-xs text-gray-300 transition"
                          >
                            <option value="">+ Playlist</option>
                            {playlists.map(pl => (
                              <option key={pl.id} value={pl.id}>{pl.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'edit' && editingPlaylist && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setView('playlists')} className="text-gray-400 hover:text-white text-sm">&larr;</button>
                  <h4 className="text-white font-bold text-sm">{editingPlaylist.name}</h4>
                  <span className="text-gray-500 text-xs">({(editingPlaylist.tracks || []).length} pistes)</span>
                </div>

                {(editingPlaylist.tracks || []).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-3">Aucune piste. Ajoutez-en depuis la bibliotheque.</p>
                ) : (
                  <div className="space-y-1">
                    {(editingPlaylist.tracks || []).map((track, idx) => (
                      <div key={track.id} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg">
                        <span className="text-gray-500 text-xs w-6 text-center">{idx + 1}</span>
                        <button
                          onClick={() => playTrack(track, idx, editingPlaylist)}
                          className="text-purple-400 hover:text-purple-300 shrink-0"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <span className="text-gray-200 text-sm truncate flex-1">{track.name}</span>
                        <button
                          onClick={() => removeTrackFromPlaylist(editingPlaylist.id, track.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-700 pt-3">
                  <p className="text-gray-400 text-xs mb-2">Ajouter des pistes :</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {audioAssets.map(a => {
                      const alreadyIn = (editingPlaylist.tracks || []).some(t => t.assetId === a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => !alreadyIn && addTrackToPlaylist(editingPlaylist.id, a)}
                          disabled={alreadyIn}
                          className={`text-left px-2 py-1.5 rounded text-xs truncate transition ${
                            alreadyIn
                              ? 'bg-gray-800 text-gray-600 cursor-default'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {alreadyIn ? '+ ' : ''}{a.name || a.filename}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player bar */}
      <div className="bg-gray-900 border-t border-gray-700 px-3 py-2">
        <div className="flex items-center gap-2">
          {isGameMaster && (
            <button
              onClick={() => setShowPanel(p => !p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${showPanel ? 'bg-purple-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'}`}
            >
              {showPanel ? 'Fermer' : 'Musique'}
            </button>
          )}

          {isPlaying && isGameMaster && (
            <>
              <button onClick={playPrevTrack} className="text-gray-400 hover:text-white p-1 shrink-0" title="Precedent">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button onClick={handleStop} className="text-red-400 hover:text-red-300 p-1 shrink-0" title="Stop">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
              </button>
              <button onClick={playNextTrack} className="text-gray-400 hover:text-white p-1 shrink-0" title="Suivant">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            </>
          )}

          {isPlaying && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-purple-400 text-sm shrink-0">&#9835;</span>
              <span className="text-gray-300 text-sm truncate">{currentTrack}</span>
              {activePlaylist && (
                <span className="text-gray-600 text-xs truncate shrink-0">({activePlaylist.name})</span>
              )}
            </div>
          )}

          {!isPlaying && isGameMaster && (
            <span className="text-gray-500 text-sm flex-1">Aucune musique</span>
          )}
          {!isPlaying && !isGameMaster && (
            <span className="text-gray-500 text-sm flex-1">Aucune musique en cours</span>
          )}

          {isGameMaster && (
            <>
              <button
                onClick={() => setLoop(l => !l)}
                className={`p-1 rounded transition shrink-0 ${loop ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Boucle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShuffle(s => !s)}
                className={`p-1 rounded transition shrink-0 ${shuffle ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Aleatoire"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            </>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 accent-purple-500"
            />
          </div>
        </div>

        {isPlaying && duration > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 text-[10px] w-8 text-right">{formatTime(progress)}</span>
            <div className="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer relative" onClick={handleSeek}>
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${(progress / duration) * 100}%` }}
              />
            </div>
            <span className="text-gray-500 text-[10px] w-8">{formatTime(duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
