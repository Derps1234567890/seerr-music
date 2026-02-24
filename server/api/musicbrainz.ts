import cacheManager from '@server/lib/cache';
import ExternalAPI from './externalapi';

export interface MusicBrainzArtist {
  id: string;
  name: string;
  'sort-name': string;
  disambiguation?: string;
  country?: string;
  type?: string;
  genres?: { id: string; name: string }[];
  tags?: { name: string; count: number }[];
  score?: number;
}

export interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  disambiguation?: string;
  'artist-credit'?: {
    name: string;
    artist: { id: string; name: string };
  }[];
  score?: number;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  status?: string;
  'release-group'?: MusicBrainzReleaseGroup;
  'artist-credit'?: {
    name: string;
    artist: { id: string; name: string };
  }[];
  score?: number;
}

export interface MusicBrainzSearchArtistsResponse {
  created: string;
  count: number;
  offset: number;
  artists: MusicBrainzArtist[];
}

export interface MusicBrainzSearchReleaseGroupsResponse {
  created: string;
  count: number;
  offset: number;
  'release-groups': MusicBrainzReleaseGroup[];
}

export interface MusicBrainzSearchReleasesResponse {
  created: string;
  count: number;
  offset: number;
  releases: MusicBrainzRelease[];
}

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const MUSICBRAINZ_USER_AGENT = 'Seerr-Music/1.0.0 (https://github.com/seerr)';

class MusicBrainz extends ExternalAPI {
  constructor() {
    super(
      MUSICBRAINZ_BASE_URL,
      { fmt: 'json' },
      {
        nodeCache: cacheManager.getCache('musicbrainz').data,
        headers: {
          'User-Agent': MUSICBRAINZ_USER_AGENT,
        },
        rateLimit: {
          maxRPS: 1,
          maxRequests: 1,
        },
      }
    );
  }

  public searchArtists = async ({
    query,
    page = 1,
    limit = 20,
  }: {
    query: string;
    page?: number;
    limit?: number;
  }): Promise<MusicBrainzSearchArtistsResponse> => {
    const data = await this.get<MusicBrainzSearchArtistsResponse>('/artist', {
      params: {
        query,
        limit,
        offset: (page - 1) * limit,
      },
    });
    return data;
  };

  public searchReleaseGroups = async ({
    query,
    page = 1,
    limit = 20,
    artistId,
  }: {
    query: string;
    page?: number;
    limit?: number;
    artistId?: string;
  }): Promise<MusicBrainzSearchReleaseGroupsResponse> => {
    const searchQuery = artistId
      ? `${query} AND arid:${artistId}`
      : query;

    const data =
      await this.get<MusicBrainzSearchReleaseGroupsResponse>(
        '/release-group',
        {
          params: {
            query: searchQuery,
            limit,
            offset: (page - 1) * limit,
          },
        }
      );
    return data;
  };

  public getArtist = async ({
    artistId,
    inc = ['release-groups', 'genres', 'tags'],
  }: {
    artistId: string;
    inc?: string[];
  }): Promise<MusicBrainzArtist & { 'release-groups'?: MusicBrainzReleaseGroup[] }> => {
    const data = await this.get<
      MusicBrainzArtist & { 'release-groups'?: MusicBrainzReleaseGroup[] }
    >(`/artist/${artistId}`, {
      params: {
        inc: inc.join('+'),
      },
    });
    return data;
  };

  public getReleaseGroup = async ({
    releaseGroupId,
    inc = ['artists', 'releases'],
  }: {
    releaseGroupId: string;
    inc?: string[];
  }): Promise<
    MusicBrainzReleaseGroup & {
      releases?: MusicBrainzRelease[];
      'artist-credit'?: { name: string; artist: MusicBrainzArtist }[];
    }
  > => {
    const data = await this.get<
      MusicBrainzReleaseGroup & {
        releases?: MusicBrainzRelease[];
        'artist-credit'?: { name: string; artist: MusicBrainzArtist }[];
      }
    >(`/release-group/${releaseGroupId}`, {
      params: {
        inc: inc.join('+'),
      },
    });
    return data;
  };

  public searchAll = async ({
    query,
    page = 1,
    limit = 10,
  }: {
    query: string;
    page?: number;
    limit?: number;
  }): Promise<{
    artists: MusicBrainzArtist[];
    releaseGroups: MusicBrainzReleaseGroup[];
    totalArtists: number;
    totalReleaseGroups: number;
  }> => {
    const [artistResults, releaseGroupResults] = await Promise.all([
      this.searchArtists({ query, page, limit }),
      this.searchReleaseGroups({ query, page, limit }),
    ]);

    return {
      artists: artistResults.artists,
      releaseGroups: releaseGroupResults['release-groups'],
      totalArtists: artistResults.count,
      totalReleaseGroups: releaseGroupResults.count,
    };
  };
}

export default MusicBrainz;
