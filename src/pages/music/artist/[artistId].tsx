import PageTitle from '@app/components/Common/PageTitle';
import type { MusicBrainzArtist, MusicBrainzReleaseGroup } from '@server/api/musicbrainz';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const ArtistDetailPage: NextPage = () => {
  const router = useRouter();
  const { artistId } = router.query;

  const { data: artist, error } = useSWR<
    MusicBrainzArtist & { 'release-groups'?: MusicBrainzReleaseGroup[] }
  >(artistId ? `/api/v1/music/artist/${artistId}` : null);

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Failed to load artist details.</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const releaseGroups = artist['release-groups'] ?? [];
  const albums = releaseGroups.filter(
    (rg) =>
      rg['primary-type'] === 'Album' || rg['primary-type'] === 'Single' || rg['primary-type'] === 'EP'
  );

  return (
    <div>
      <PageTitle title={[artist.name, 'Music']} />
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white">{artist.name}</h1>
        {artist.disambiguation && (
          <p className="mt-1 text-gray-400">({artist.disambiguation})</p>
        )}
        {artist.type && (
          <span className="mt-2 inline-block rounded-full bg-indigo-600 px-3 py-1 text-sm text-white">
            {artist.type}
          </span>
        )}
        {artist.country && (
          <span className="ml-2 mt-2 inline-block rounded-full bg-gray-700 px-3 py-1 text-sm text-white">
            {artist.country}
          </span>
        )}
      </div>

      {albums.length > 0 && (
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-white">
            Releases ({albums.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {albums.map((album) => (
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
                    {album['first-release-date'] && (
                      <p className="mt-1 text-xs text-gray-400">
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
    </div>
  );
};

export default ArtistDetailPage;
