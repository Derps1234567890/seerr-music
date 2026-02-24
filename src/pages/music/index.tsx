import PageTitle from '@app/components/Common/PageTitle';
import type {
  MusicBrainzArtist,
  MusicBrainzReleaseGroup,
} from '@server/api/musicbrainz';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface MusicSearchResults {
  artists: MusicBrainzArtist[];
  releaseGroups: MusicBrainzReleaseGroup[];
  totalArtists: number;
  totalReleaseGroups: number;
}

const MusicPage: NextPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState((router.query.query as string) ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, error } = useSWR<MusicSearchResults>(
    debouncedQuery
      ? `/api/v1/music/search?query=${encodeURIComponent(debouncedQuery)}`
      : null
  );

  return (
    <div>
      <PageTitle title="Music" />
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Music</h1>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for artists or albums…"
            className="w-full rounded-lg bg-gray-700 px-4 py-3 pl-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 p-4 text-red-300">
          Failed to load music search results.
        </div>
      )}

      {!debouncedQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg
            className="mb-4 h-16 w-16"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <p className="text-lg">Search for your favorite music above</p>
        </div>
      )}

      {debouncedQuery && !data && !error && (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {data && (
        <div className="space-y-10">
          {data.artists.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-white">
                Artists ({data.totalArtists})
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {data.artists.slice(0, 10).map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/music/artist/${artist.id}`}
                    className="group flex flex-col overflow-hidden rounded-lg bg-gray-800 p-4 shadow transition hover:bg-gray-700"
                  >
                      <div className="mb-3 flex h-20 items-center justify-center rounded-full bg-gray-700 group-hover:bg-gray-600">
                        <svg
                          className="h-10 w-10 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <p className="truncate text-center text-sm font-medium text-white">
                        {artist.name}
                      </p>
                      {artist.disambiguation && (
                        <p className="mt-1 truncate text-center text-xs text-gray-400">
                          {artist.disambiguation}
                        </p>
                      )}
                      {artist.type && (
                        <p className="mt-1 text-center text-xs text-indigo-400">
                          {artist.type}
                        </p>
                      )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.releaseGroups.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-white">
                Albums ({data.totalReleaseGroups})
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {data.releaseGroups.slice(0, 12).map((album) => (
                  <Link
                    key={album.id}
                    href={`/music/album/${album.id}`}
                    className="group flex flex-col overflow-hidden rounded-lg bg-gray-800 shadow transition hover:bg-gray-700"
                  >
                      <div className="flex h-40 items-center justify-center bg-gray-700 group-hover:bg-gray-600">
                        <svg
                          className="h-16 w-16 text-gray-500"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-medium text-white">
                          {album.title}
                        </p>
                        {album['artist-credit'] &&
                          album['artist-credit'].length > 0 && (
                            <p className="mt-1 truncate text-xs text-gray-400">
                              {album['artist-credit']
                                .map((c) => c.name)
                                .join(', ')}
                            </p>
                          )}
                        {album['first-release-date'] && (
                          <p className="mt-1 text-xs text-gray-500">
                            {album['first-release-date'].substring(0, 4)}
                          </p>
                        )}
                        {album['primary-type'] && (
                          <p className="mt-1 text-xs text-indigo-400">
                            {album['primary-type']}
                          </p>
                        )}
                      </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.artists.length === 0 && data.releaseGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-lg">No results found for &quot;{debouncedQuery}&quot;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MusicPage;
