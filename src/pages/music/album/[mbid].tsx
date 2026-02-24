import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import defineMessages from '@app/utils/defineMessages';
import type { MbReleaseGroup } from '@server/api/musicbrainz';
import type { Media } from '@server/entity/Media';
import { MediaStatus } from '@server/constants/media';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('pages.music.album', {
  request: 'Request',
  requested: 'Requested',
  available: 'Available',
  artist: 'Artist',
  released: 'Released',
  type: 'Type',
  genres: 'Genres',
  tags: 'Tags',
  requestSent: 'Your music request has been submitted!',
  requestFailed: 'Failed to submit request. Please try again.',
  alreadyAvailable: 'This album is already available in your library.',
  alreadyRequested: 'This album has already been requested.',
});

type AlbumDetail = MbReleaseGroup & {
  releases?: { id: string; title: string; date?: string; country?: string }[];
  mediaInfo?: Pick<Media, 'status' | 'serviceUrl'> | null;
};

const statusColors: Record<number, string> = {
  [MediaStatus.AVAILABLE]: 'bg-green-500',
  [MediaStatus.PENDING]: 'bg-yellow-500',
  [MediaStatus.PROCESSING]: 'bg-blue-500',
};

const MusicAlbumPage = () => {
  const intl = useIntl();
  const router = useRouter();
  const mbid = router.query.mbid as string;

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!mbid) return;
    fetch(`/api/v1/music/album/${mbid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setAlbum)
      .finally(() => setLoading(false));
  }, [mbid]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await fetch('/api/v1/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: 'music',
          mediaId: 0,
          mbId: mbid,
        }),
      });
      setRequestStatus('success');
      // Refresh album data to show updated status
      const refreshed = await fetch(`/api/v1/music/album/${mbid}`).then((r) =>
        r.ok ? r.json() : null
      );
      if (refreshed) setAlbum(refreshed);
    } catch {
      setRequestStatus('error');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!album) return <div className="text-center text-gray-400">Album not found.</div>;

  const artist = album['artist-credit']?.[0]?.artist;
  const releaseYear = album['first-release-date']?.substring(0, 4);
  const mediaStatus = album.mediaInfo?.status;

  const isAvailable = mediaStatus === MediaStatus.AVAILABLE;
  const isPending =
    mediaStatus === MediaStatus.PENDING ||
    mediaStatus === MediaStatus.PROCESSING;

  return (
    <>
      <PageTitle title={album.title} />

      <div className="mb-8 flex items-start gap-6">
        {/* Album art placeholder */}
        <div className="flex h-44 w-44 flex-shrink-0 items-center justify-center rounded-xl bg-purple-700 text-7xl text-white shadow-lg">
          💿
        </div>
        <div className="flex-1">
          <h1 className="mb-1 text-4xl font-bold text-white">{album.title}</h1>
          {artist && (
            <Link
              href={`/music/artist/${artist.id}`}
              className="mb-2 inline-block text-xl text-indigo-400 hover:underline"
            >
              {artist.name}
            </Link>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-400">
            {releaseYear && (
              <span>
                <span className="font-medium text-gray-300">
                  {intl.formatMessage(messages.released)}:{' '}
                </span>
                {releaseYear}
              </span>
            )}
            {album['primary-type'] && (
              <span>
                <span className="font-medium text-gray-300">
                  {intl.formatMessage(messages.type)}:{' '}
                </span>
                {album['primary-type']}
                {album['secondary-types'] && album['secondary-types'].length > 0
                  ? ` / ${album['secondary-types'].join(', ')}`
                  : ''}
              </span>
            )}
          </div>
          {album.genres && album.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {album.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full bg-purple-900 px-2 py-0.5 text-xs text-purple-300"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}
          {album.tags && album.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {album.tags.slice(0, 8).map((t) => (
                <span
                  key={t.name}
                  className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {/* Library status badge */}
          {mediaStatus !== undefined && mediaStatus !== null && (
            <div className="mt-3">
              {isAvailable && (
                <span className="rounded-full bg-green-600 px-3 py-1 text-sm font-medium text-white">
                  ✓ {intl.formatMessage(messages.available)}
                </span>
              )}
              {isPending && (
                <span className="rounded-full bg-yellow-600 px-3 py-1 text-sm font-medium text-white">
                  ⏳ {intl.formatMessage(messages.requested)}
                </span>
              )}
            </div>
          )}

          {/* Request button */}
          <div className="mt-4 flex gap-3">
            {!isAvailable && !isPending && (
              <Button
                buttonType="primary"
                disabled={requesting}
                onClick={handleRequest}
              >
                {requesting ? 'Requesting…' : intl.formatMessage(messages.request)}
              </Button>
            )}
            {album.mediaInfo?.serviceUrl && (
              <Button
                as="a"
                href={album.mediaInfo.serviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                buttonType="ghost"
              >
                View in Lidarr
              </Button>
            )}
          </div>

          {requestStatus === 'success' && (
            <p className="mt-2 text-sm text-green-400">
              {intl.formatMessage(messages.requestSent)}
            </p>
          )}
          {requestStatus === 'error' && (
            <p className="mt-2 text-sm text-red-400">
              {intl.formatMessage(messages.requestFailed)}
            </p>
          )}
        </div>
      </div>

      {/* Releases */}
      {album.releases && album.releases.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">Releases</h2>
          <div className="overflow-hidden rounded-lg bg-gray-800">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-500">
                  <th className="p-3">Title</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Country</th>
                </tr>
              </thead>
              <tbody>
                {album.releases.map((release) => (
                  <tr
                    key={release.id}
                    className="border-b border-gray-700 last:border-0 hover:bg-gray-750"
                  >
                    <td className="p-3">{release.title}</td>
                    <td className="p-3">{release.date ?? '—'}</td>
                    <td className="p-3">{release.country ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
};

export default MusicAlbumPage;
