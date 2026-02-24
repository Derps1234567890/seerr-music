import Header from '@app/components/Common/Header';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import defineMessages from '@app/utils/defineMessages';
import type { MbArtist, MbReleaseGroup } from '@server/api/musicbrainz';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('pages.music.search', {
  searchMusic: 'Search Music',
  searchResults: 'Music Search Results',
  artists: 'Artists',
  albums: 'Albums',
  noResults: 'No results found for "{query}".',
  viewArtist: 'View Artist',
  viewAlbum: 'View Album',
  indieNote:
    'Powered by MusicBrainz — includes indie, self-released and lesser-known artists from every genre.',
});

interface MusicSearchResult {
  artists: MbArtist[];
  albums: MbReleaseGroup[];
}

const MusicSearch = () => {
  const intl = useIntl();
  const router = useRouter();
  const query = router.query.query as string;

  const [data, setData] = useState<MusicSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(false);
    fetch(`/api/v1/search/music?query=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [query]);

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <PageTitle title={intl.formatMessage(messages.searchMusic)} />
      <div className="mb-5 mt-1">
        <Header>{intl.formatMessage(messages.searchResults)}</Header>
      </div>
      {error && (
        <div className="text-center text-gray-400">
          {intl.formatMessage(messages.noResults, { query })}
        </div>
      )}
      {data && (
        <>
          {/* Indie note */}
          <p className="mb-6 text-sm italic text-gray-500">
            {intl.formatMessage(messages.indieNote)}
          </p>

          {/* Artists */}
          {data.artists.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-white">
                {intl.formatMessage(messages.artists)}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {data.artists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/music/artist/${artist.id}`}
                    className="group flex flex-col items-center rounded-lg bg-gray-800 p-4 text-center transition hover:bg-gray-700"
                  >
                    <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-3xl text-white">
                      🎵
                    </div>
                    <span className="line-clamp-2 font-medium text-white group-hover:text-indigo-400">
                      {artist.name}
                    </span>
                    {artist.disambiguation && (
                      <span className="mt-1 text-xs text-gray-400">
                        {artist.disambiguation}
                      </span>
                    )}
                    {artist.type && (
                      <span className="mt-1 text-xs text-gray-500">
                        {artist.type}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {data.albums.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                {intl.formatMessage(messages.albums)}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {data.albums.map((album) => (
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
                    {album['artist-credit']?.[0] && (
                      <span className="mt-1 text-xs text-gray-400">
                        {album['artist-credit'][0].artist.name}
                      </span>
                    )}
                    {album['first-release-date'] && (
                      <span className="mt-1 text-xs text-gray-500">
                        {album['first-release-date'].substring(0, 4)}
                      </span>
                    )}
                    {album['primary-type'] && (
                      <span className="mt-1 text-xs text-indigo-400">
                        {album['primary-type']}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.artists.length === 0 && data.albums.length === 0 && (
            <div className="text-center text-gray-400">
              {intl.formatMessage(messages.noResults, { query })}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default MusicSearch;
