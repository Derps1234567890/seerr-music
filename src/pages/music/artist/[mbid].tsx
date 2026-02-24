import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import defineMessages from '@app/utils/defineMessages';
import type { LastFmArtist } from '@server/api/lastfm';
import type { MbArtist, MbReleaseGroup } from '@server/api/musicbrainz';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('pages.music.artist', {
  discography: 'Discography',
  similarArtists: 'Similar Artists (via Last.fm)',
  requestAlbum: 'Request Album',
  noAlbums: 'No albums found.',
  noSimilar: 'No similar artist data available.',
  type: 'Type',
  country: 'Country',
  tags: 'Tags',
});

type ArtistDetail = MbArtist & { 'release-groups'?: MbReleaseGroup[] };

const MusicArtistPage = () => {
  const intl = useIntl();
  const router = useRouter();
  const mbid = router.query.mbid as string;

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [similar, setSimilar] = useState<LastFmArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mbid) return;
    Promise.all([
      fetch(`/api/v1/music/artist/${mbid}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/v1/music/similar/${mbid}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([a, s]) => {
        setArtist(a);
        setSimilar(s);
      })
      .finally(() => setLoading(false));
  }, [mbid]);

  if (loading) return <LoadingSpinner />;
  if (!artist) return <div className="text-center text-gray-400">Artist not found.</div>;

  const albums = artist['release-groups']?.filter(
    (rg) => rg['primary-type'] === 'Album'
  ) ?? [];
  const otherReleases = artist['release-groups']?.filter(
    (rg) => rg['primary-type'] !== 'Album'
  ) ?? [];

  return (
    <>
      <PageTitle title={artist.name} />

      {/* Artist header */}
      <div className="mb-8 flex items-start gap-6">
        <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-6xl text-white shadow-lg">
          🎵
        </div>
        <div>
          <h1 className="mb-1 text-4xl font-bold text-white">{artist.name}</h1>
          {artist.disambiguation && (
            <p className="mb-2 text-gray-400">{artist.disambiguation}</p>
          )}
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {artist.type && (
              <span>
                <span className="font-medium text-gray-300">{intl.formatMessage(messages.type)}: </span>
                {artist.type}
              </span>
            )}
            {artist.country && (
              <span>
                <span className="font-medium text-gray-300">{intl.formatMessage(messages.country)}: </span>
                {artist.country}
              </span>
            )}
          </div>
          {artist.tags && artist.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {artist.tags.slice(0, 8).map((tag) => (
                <span
                  key={tag.name}
                  className="rounded-full bg-indigo-900 px-2 py-0.5 text-xs text-indigo-300"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Albums */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold text-white">
          {intl.formatMessage(messages.discography)}
          {albums.length > 0 && (
            <span className="ml-2 text-base text-gray-400">— Albums</span>
          )}
        </h2>
        {albums.length === 0 ? (
          <p className="text-gray-400">{intl.formatMessage(messages.noAlbums)}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/music/album/${album.id}`}
                className="group flex flex-col items-center rounded-lg bg-gray-800 p-4 text-center transition hover:bg-gray-700"
              >
                <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-lg bg-purple-700 text-3xl text-white">
                  💿
                </div>
                <span className="line-clamp-2 font-medium text-white group-hover:text-purple-400">
                  {album.title}
                </span>
                {album['first-release-date'] && (
                  <span className="mt-1 text-xs text-gray-500">
                    {album['first-release-date'].substring(0, 4)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Singles / EPs / Other */}
        {otherReleases.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-lg font-medium text-gray-300">
              Singles, EPs &amp; Other Releases
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {otherReleases.map((rg) => (
                <Link
                  key={rg.id}
                  href={`/music/album/${rg.id}`}
                  className="group flex flex-col items-center rounded-lg bg-gray-800 p-3 text-center transition hover:bg-gray-700"
                >
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-700 text-2xl text-white">
                    🎵
                  </div>
                  <span className="line-clamp-2 text-sm font-medium text-white group-hover:text-gray-300">
                    {rg.title}
                  </span>
                  <span className="mt-0.5 text-xs text-indigo-400">
                    {rg['primary-type']}
                  </span>
                  {rg['first-release-date'] && (
                    <span className="text-xs text-gray-500">
                      {rg['first-release-date'].substring(0, 4)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Similar Artists from Last.fm */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold text-white">
          {intl.formatMessage(messages.similarArtists)}
        </h2>
        {similar.length === 0 ? (
          <p className="text-gray-400">{intl.formatMessage(messages.noSimilar)}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {similar.map((s) => (
              <Link
                key={s.mbid ?? s.name}
                href={
                  s.mbid
                    ? `/music/artist/${s.mbid}`
                    : `/music/search?query=${encodeURIComponent(s.name)}`
                }
                className="rounded-full bg-gray-800 px-4 py-2 text-sm text-gray-200 transition hover:bg-indigo-700 hover:text-white"
              >
                {s.name}
                {s.match && (
                  <span className="ml-1 text-xs text-gray-500">
                    {Math.round(parseFloat(s.match) * 100)}%
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default MusicArtistPage;
