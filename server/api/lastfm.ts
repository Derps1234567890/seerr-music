/**
 * Last.fm API client.
 *
 * Last.fm (https://last.fm) is the world's largest music scrobbling service.
 * By integrating with a user's Last.fm account we can surface personalised
 * music suggestions — similar artists, top albums, recently played tracks —
 * directly inside the discover/request workflow.
 */
import ExternalAPI from '@server/api/externalapi';
import cacheManager from '@server/lib/cache';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export interface LastFmArtist {
  name: string;
  mbid?: string;
  url: string;
  image?: { '#text': string; size: string }[];
  listeners?: string;
  playcount?: string;
  match?: string;
  streamable?: string;
  tags?: { tag: { name: string; url: string }[] };
  bio?: { summary: string; content: string };
}

export interface LastFmAlbum {
  name: string;
  artist: string | { name: string; mbid?: string; url: string };
  mbid?: string;
  url: string;
  image?: { '#text': string; size: string }[];
  playcount?: string;
  tracks?: {
    track: {
      name: string;
      duration: string;
      url: string;
    }[];
  };
}

export interface LastFmTrack {
  name: string;
  artist: { '#text': string; mbid?: string } | { name: string; mbid?: string; url: string };
  album?: { '#text': string; mbid?: string };
  mbid?: string;
  url: string;
  image?: { '#text': string; size: string }[];
  date?: { '#text': string; uts: string };
  playcount?: string;
}

export interface LastFmTag {
  name: string;
  url: string;
  count?: number;
  reach?: number;
}

class LastFmAPI extends ExternalAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    const timeout = getSettings().network.apiRequestTimeout;

    super(
      LASTFM_BASE_URL,
      { api_key: apiKey, format: 'json' },
      {
        nodeCache: cacheManager.getCache('lastfm').data,
        timeout,
      }
    );
    this.apiKey = apiKey;
  }

  /** Retrieve artists similar to the given artist (great for recommendations). */
  public getSimilarArtists = async ({
    artist,
    mbid,
    limit = 10,
  }: {
    artist?: string;
    mbid?: string;
    limit?: number;
  }): Promise<LastFmArtist[]> => {
    try {
      const params: Record<string, unknown> = {
        method: 'artist.getSimilar',
        limit,
        autocorrect: 1,
      };
      if (mbid) params.mbid = mbid;
      else if (artist) params.artist = artist;
      else throw new Error('artist name or mbid required');

      const data = await this.get<{
        similarartists: { artist: LastFmArtist[] };
      }>('', { params });
      return data.similarartists?.artist ?? [];
    } catch (e) {
      logger.error('Last.fm getSimilarArtists failed', {
        label: 'Last.fm',
        errorMessage: e.message,
      });
      return [];
    }
  };

  /** Get a user's top artists over a given period. */
  public getUserTopArtists = async ({
    user,
    period = 'overall',
    limit = 10,
  }: {
    user: string;
    period?: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month';
    limit?: number;
  }): Promise<LastFmArtist[]> => {
    try {
      const data = await this.get<{
        topartists: { artist: LastFmArtist[] };
      }>('', {
        params: { method: 'user.getTopArtists', user, period, limit },
      });
      return data.topartists?.artist ?? [];
    } catch (e) {
      logger.error('Last.fm getUserTopArtists failed', {
        label: 'Last.fm',
        errorMessage: e.message,
        user,
      });
      return [];
    }
  };

  /** Get a user's top albums over a given period. */
  public getUserTopAlbums = async ({
    user,
    period = 'overall',
    limit = 10,
  }: {
    user: string;
    period?: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month';
    limit?: number;
  }): Promise<LastFmAlbum[]> => {
    try {
      const data = await this.get<{
        topalbums: { album: LastFmAlbum[] };
      }>('', {
        params: { method: 'user.getTopAlbums', user, period, limit },
      });
      return data.topalbums?.album ?? [];
    } catch (e) {
      logger.error('Last.fm getUserTopAlbums failed', {
        label: 'Last.fm',
        errorMessage: e.message,
        user,
      });
      return [];
    }
  };

  /** Get a user's recently scrobbled tracks. */
  public getUserRecentTracks = async ({
    user,
    limit = 25,
  }: {
    user: string;
    limit?: number;
  }): Promise<LastFmTrack[]> => {
    try {
      const data = await this.get<{
        recenttracks: { track: LastFmTrack[] };
      }>('', {
        params: { method: 'user.getRecentTracks', user, limit },
      });
      return data.recenttracks?.track ?? [];
    } catch (e) {
      logger.error('Last.fm getUserRecentTracks failed', {
        label: 'Last.fm',
        errorMessage: e.message,
        user,
      });
      return [];
    }
  };

  /** Get top albums for an artist (useful for filling out artist detail pages). */
  public getArtistTopAlbums = async ({
    artist,
    mbid,
    limit = 10,
  }: {
    artist?: string;
    mbid?: string;
    limit?: number;
  }): Promise<LastFmAlbum[]> => {
    try {
      const params: Record<string, unknown> = {
        method: 'artist.getTopAlbums',
        limit,
        autocorrect: 1,
      };
      if (mbid) params.mbid = mbid;
      else if (artist) params.artist = artist;
      else throw new Error('artist name or mbid required');

      const data = await this.get<{ topalbums: { album: LastFmAlbum[] } }>('', {
        params,
      });
      return data.topalbums?.album ?? [];
    } catch (e) {
      logger.error('Last.fm getArtistTopAlbums failed', {
        label: 'Last.fm',
        errorMessage: e.message,
      });
      return [];
    }
  };

  /** Fetch metadata about a specific artist. */
  public getArtistInfo = async ({
    artist,
    mbid,
  }: {
    artist?: string;
    mbid?: string;
  }): Promise<LastFmArtist | null> => {
    try {
      const params: Record<string, unknown> = {
        method: 'artist.getInfo',
        autocorrect: 1,
      };
      if (mbid) params.mbid = mbid;
      else if (artist) params.artist = artist;
      else throw new Error('artist name or mbid required');

      const data = await this.get<{ artist: LastFmArtist }>('', { params });
      return data.artist ?? null;
    } catch (e) {
      logger.error('Last.fm getArtistInfo failed', {
        label: 'Last.fm',
        errorMessage: e.message,
      });
      return null;
    }
  };

  /** Verify that the API key is valid by calling the chart.getTopArtists endpoint. */
  public testApiKey = async (): Promise<boolean> => {
    try {
      await this.get('', {
        params: { method: 'chart.getTopArtists', limit: 1 },
      });
      return true;
    } catch {
      return false;
    }
  };
}

export default LastFmAPI;
