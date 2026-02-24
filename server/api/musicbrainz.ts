/**
 * MusicBrainz API client.
 *
 * MusicBrainz (https://musicbrainz.org) is a community-maintained open music
 * encyclopedia. It has vastly broader coverage than commercial services,
 * including indie, underground, self-released and lesser-known artists from
 * around the world — making it the ideal metadata source for this music
 * service. Lidarr also uses MusicBrainz IDs natively, so there is no ID
 * translation required when sending requests to Lidarr.
 *
 * Rate limit: max 1 request/second per the MusicBrainz server policy.
 */
import ExternalAPI from '@server/api/externalapi';
import cacheManager from '@server/lib/cache';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

const MB_BASE_URL = 'https://musicbrainz.org/ws/2';
const APP_USER_AGENT =
  'seerr-music/1.0 (https://github.com/Derps1234567890/seerr-music)';

export interface MbArtist {
  id: string;
  name: string;
  'sort-name': string;
  type?: string;
  country?: string;
  disambiguation?: string;
  score?: number;
  tags?: { name: string; count: number }[];
  genres?: { id: string; name: string }[];
  life_span?: { begin?: string; end?: string; ended?: boolean };
}

export interface MbReleaseGroup {
  id: string;
  title: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  disambiguation?: string;
  score?: number;
  'artist-credit'?: { artist: MbArtist; name?: string; joinphrase?: string }[];
  tags?: { name: string; count: number }[];
  genres?: { id: string; name: string }[];
}

export interface MbSearchResult<T> {
  created: string;
  count: number;
  offset: number;
  artists?: T[];
  'release-groups'?: T[];
  recordings?: T[];
}

export interface MbRecording {
  id: string;
  title: string;
  length?: number;
  disambiguation?: string;
  score?: number;
  'artist-credit'?: { artist: MbArtist; name?: string; joinphrase?: string }[];
  releases?: MbReleaseGroup[];
}

class MusicBrainzAPI extends ExternalAPI {
  constructor() {
    const timeout = getSettings().network.apiRequestTimeout;

    super(
      MB_BASE_URL,
      { fmt: 'json' },
      {
        nodeCache: cacheManager.getCache('musicbrainz').data,
        headers: { 'User-Agent': APP_USER_AGENT },
        timeout,
        // MusicBrainz allows max 1 request/second
        rateLimit: { maxRPS: 1, maxRequests: 1 },
      }
    );
  }

  /**
   * Search for artists by name.  Includes indie and self-released artists.
   */
  public searchArtists = async ({
    query,
    limit = 25,
    offset = 0,
  }: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<MbArtist[]> => {
    try {
      const data = await this.get<MbSearchResult<MbArtist>>('/artist', {
        params: { query, limit, offset },
      });
      return data.artists ?? [];
    } catch (e) {
      logger.error('MusicBrainz artist search failed', {
        label: 'MusicBrainz',
        errorMessage: e.message,
        query,
      });
      return [];
    }
  };

  /**
   * Search for release groups (albums / EPs / singles) by title,
   * optionally filtered to a specific artist.
   */
  public searchReleaseGroups = async ({
    query,
    artist,
    limit = 25,
    offset = 0,
  }: {
    query: string;
    artist?: string;
    limit?: number;
    offset?: number;
  }): Promise<MbReleaseGroup[]> => {
    try {
      const luceneQuery = artist
        ? `${query} AND artist:${artist}`
        : query;
      const data = await this.get<MbSearchResult<MbReleaseGroup>>(
        '/release-group',
        { params: { query: luceneQuery, limit, offset } }
      );
      return data['release-groups'] ?? [];
    } catch (e) {
      logger.error('MusicBrainz release-group search failed', {
        label: 'MusicBrainz',
        errorMessage: e.message,
        query,
      });
      return [];
    }
  };

  /** Combined search: returns matching artists and release groups for a query. */
  public searchMusic = async ({
    query,
    limit = 20,
  }: {
    query: string;
    limit?: number;
  }): Promise<{ artists: MbArtist[]; albums: MbReleaseGroup[] }> => {
    const [artists, albums] = await Promise.all([
      this.searchArtists({ query, limit }),
      this.searchReleaseGroups({ query, limit }),
    ]);
    return { artists, albums };
  };

  /** Look up a full artist record by MusicBrainz ID. */
  public getArtist = async (mbid: string): Promise<MbArtist & {
    'release-groups'?: MbReleaseGroup[];
  }> => {
    try {
      const data = await this.get<MbArtist & { 'release-groups'?: MbReleaseGroup[] }>(
        `/artist/${mbid}`,
        { params: { inc: 'release-groups+genres+tags', limit: 100 } },
        86400
      );
      return data;
    } catch (e) {
      logger.error('MusicBrainz artist lookup failed', {
        label: 'MusicBrainz',
        errorMessage: e.message,
        mbid,
      });
      throw new Error('Artist not found');
    }
  };

  /** Look up a full release group (album) record by MusicBrainz ID. */
  public getReleaseGroup = async (mbid: string): Promise<MbReleaseGroup & {
    releases?: { id: string; title: string; date?: string; country?: string }[];
  }> => {
    try {
      const data = await this.get<MbReleaseGroup & {
        releases?: { id: string; title: string; date?: string; country?: string }[];
      }>(
        `/release-group/${mbid}`,
        { params: { inc: 'artist-credits+genres+tags+releases' } },
        86400
      );
      return data;
    } catch (e) {
      logger.error('MusicBrainz release-group lookup failed', {
        label: 'MusicBrainz',
        errorMessage: e.message,
        mbid,
      });
      throw new Error('Album not found');
    }
  };
}

export default MusicBrainzAPI;
