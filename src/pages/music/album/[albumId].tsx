import PageTitle from '@app/components/Common/PageTitle';
import type { MusicBrainzArtist, MusicBrainzReleaseGroup } from '@server/api/musicbrainz';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';

type AlbumDetailData = MusicBrainzReleaseGroup & {
  releases?: { id: string; title: string; date?: string; status?: string }[];
  'artist-credit'?: { name: string; artist: MusicBrainzArtist }[];
};

const AlbumDetailPage: NextPage = () => {
  const router = useRouter();
  const { albumId } = router.query;

  const { data: album, error } = useSWR<AlbumDetailData>(
    albumId ? `/api/v1/music/album/${albumId}` : null
  );

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Failed to load album details.</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const artists = album['artist-credit'] ?? [];

  return (
    <div>
      <PageTitle title={[album.title, 'Music']} />
      <div className="mb-8">
        <div className="flex items-start space-x-6">
          <div className="flex h-48 w-48 flex-shrink-0 items-center justify-center rounded-lg bg-gray-700">
            <svg
              className="h-24 w-24 text-gray-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">{album.title}</h1>
            {album.disambiguation && (
              <p className="mt-1 text-gray-400">({album.disambiguation})</p>
            )}
            {artists.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {artists.map((credit, index) => (
                  <Link
                    key={index}
                    href={`/music/artist/${credit.artist.id}`}
                    className="text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    {credit.name}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {album['primary-type'] && (
                <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm text-white">
                  {album['primary-type']}
                </span>
              )}
              {album['secondary-types']?.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-gray-700 px-3 py-1 text-sm text-white"
                >
                  {type}
                </span>
              ))}
              {album['first-release-date'] && (
                <span className="rounded-full bg-gray-700 px-3 py-1 text-sm text-gray-300">
                  {album['first-release-date']}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {album.releases && album.releases.length > 0 && (
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-white">
            Releases ({album.releases.length})
          </h2>
          <div className="overflow-hidden rounded-lg bg-gray-800 shadow">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {album.releases.map((release) => (
                  <tr key={release.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-white">
                      {release.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {release.date ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {release.status ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumDetailPage;
