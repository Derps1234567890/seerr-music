import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import defineMessages from '@app/utils/defineMessages';
import type { LastFmAlbum, LastFmArtist, LastFmTrack } from '@server/api/lastfm';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('pages.music.discover', {
  discoverMusic: 'Discover Music',
  topArtists: 'Your Top Artists',
  topAlbums: 'Your Top Albums',
  similarArtists: 'Discover Similar Artists',
  recentlyScrobbled: 'Recently Scrobbled',
  chartTopArtists: 'Trending Artists',
  noLastfm:
    'Connect your Last.fm account in Settings → Services → Last.fm to see personalised recommendations.',
  noData: 'No data available.',
  period7day: 'Last 7 Days',
  periodOverall: 'All Time',
  period1month: 'Last Month',
});

type Period = 'overall' | '7day' | '1month';

interface RecommendationsData {
  topArtists: LastFmArtist[];
  topAlbums: LastFmAlbum[];
  similarArtists: LastFmArtist[];
}

const artistImage = (artist: LastFmArtist): string | undefined =>
  artist.image?.find((i) => i.size === 'large')?.['#text'] || undefined;

const albumImage = (album: LastFmAlbum): string | undefined =>
  album.image?.find((i) => i.size === 'large')?.['#text'] || undefined;

const MusicDiscoverPage = () => {
  const intl = useIntl();
  const [period, setPeriod] = useState<Period>('overall');
  const [recs, setRecs] = useState<RecommendationsData | null>(null);
  const [scrobbles, setScrobbles] = useState<LastFmTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [noConfig, setNoConfig] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/music/recommendations?period=${period}`).then((r) => {
        if (r.status === 400) {
          setNoConfig(true);
          return null;
        }
        return r.ok ? r.json() : null;
      }),
      fetch('/api/v1/music/scrobbles?limit=10').then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([r, s]) => {
        if (r) setRecs(r);
        setScrobbles(s);
      })
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <LoadingSpinner />;

  if (noConfig) {
    return (
      <>
        <PageTitle title={intl.formatMessage(messages.discoverMusic)} />
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="text-6xl">🎵</div>
          <p className="max-w-md text-gray-300">
            {intl.formatMessage(messages.noLastfm)}
          </p>
          <Link
            href="/settings/services"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Go to Settings
          </Link>
        </div>
      </>
    );
  }

  const periods: { value: Period; label: string }[] = [
    {
      value: '7day',
      label: intl.formatMessage(messages.period7day),
    },
    {
      value: '1month',
      label: intl.formatMessage(messages.period1month),
    },
    {
      value: 'overall',
      label: intl.formatMessage(messages.periodOverall),
    },
  ];

  return (
    <>
      <PageTitle title={intl.formatMessage(messages.discoverMusic)} />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">
          {intl.formatMessage(messages.discoverMusic)}
        </h1>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                period === p.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {recs && (
        <>
          {/* Top Artists */}
          {recs.topArtists.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-semibold text-white">
                {intl.formatMessage(messages.topArtists)}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {recs.topArtists.map((artist) => {
                  const img = artistImage(artist);
                  return (
                    <Link
                      key={artist.mbid ?? artist.name}
                      href={
                        artist.mbid
                          ? `/music/artist/${artist.mbid}`
                          : `/music/search?query=${encodeURIComponent(artist.name)}`
                      }
                      className="group flex flex-col items-center rounded-lg bg-gray-800 p-3 text-center transition hover:bg-gray-700"
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={artist.name}
                          className="mb-2 h-20 w-20 rounded-full object-cover opacity-90 group-hover:opacity-100"
                        />
                      ) : (
                        <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-3xl text-white">
                          🎵
                        </div>
                      )}
                      <span className="line-clamp-2 text-sm font-medium text-white group-hover:text-indigo-400">
                        {artist.name}
                      </span>
                      {artist.playcount && (
                        <span className="text-xs text-gray-500">
                          {parseInt(artist.playcount).toLocaleString()} plays
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Top Albums */}
          {recs.topAlbums.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-semibold text-white">
                {intl.formatMessage(messages.topAlbums)}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {recs.topAlbums.map((album) => {
                  const img = albumImage(album);
                  const artistName =
                    typeof album.artist === 'string'
                      ? album.artist
                      : album.artist.name;
                  return (
                    <Link
                      key={album.mbid ?? album.name}
                      href={
                        album.mbid
                          ? `/music/album/${album.mbid}`
                          : `/music/search?query=${encodeURIComponent(album.name)}`
                      }
                      className="group flex flex-col items-center rounded-lg bg-gray-800 p-3 text-center transition hover:bg-gray-700"
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={album.name}
                          className="mb-2 h-20 w-20 rounded-lg object-cover opacity-90 group-hover:opacity-100"
                        />
                      ) : (
                        <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-lg bg-purple-700 text-3xl text-white">
                          💿
                        </div>
                      )}
                      <span className="line-clamp-2 text-sm font-medium text-white group-hover:text-purple-400">
                        {album.name}
                      </span>
                      <span className="mt-0.5 text-xs text-gray-400">{artistName}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Similar Artists */}
          {recs.similarArtists.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-semibold text-white">
                {intl.formatMessage(messages.similarArtists)}
              </h2>
              <div className="flex flex-wrap gap-2">
                {recs.similarArtists.map((a) => (
                  <Link
                    key={a.mbid ?? a.name}
                    href={
                      a.mbid
                        ? `/music/artist/${a.mbid}`
                        : `/music/search?query=${encodeURIComponent(a.name)}`
                    }
                    className="rounded-full bg-gray-800 px-3 py-1.5 text-sm text-gray-200 transition hover:bg-indigo-700 hover:text-white"
                  >
                    {a.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Recently Scrobbled */}
      {scrobbles.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">
            {intl.formatMessage(messages.recentlyScrobbled)}
          </h2>
          <ul className="space-y-2">
            {scrobbles.map((track, i) => {
              const artistName =
                '@text' in track.artist
                  ? track.artist['@text']
                  : 'name' in track.artist
                    ? (track.artist as { name: string }).name
                    : '';
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-gray-800 p-3"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-700 text-lg text-gray-400">
                    ♪
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{track.name}</p>
                    <p className="text-xs text-gray-400">{artistName}</p>
                  </div>
                  {track.date && (
                    <span className="ml-auto text-xs text-gray-500">
                      {track.date['#text']}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
};

export default MusicDiscoverPage;
