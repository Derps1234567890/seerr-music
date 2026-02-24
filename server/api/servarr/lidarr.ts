import logger from '@server/logger';
import ServarrBase from './base';

export interface LidarrAlbumOptions {
  title: string;
  qualityProfileId: number;
  metadataProfileId: number;
  mbAlbumId: string;
  mbArtistId: string;
  artistName: string;
  rootFolderPath: string;
  tags?: number[];
  monitored?: boolean;
  searchNow?: boolean;
}

export interface LidarrArtist {
  id: number;
  artistName: string;
  foreignArtistId: string;
  monitored: boolean;
  status: string;
  overview?: string;
  path: string;
  qualityProfileId: number;
  metadataProfileId: number;
  tags: number[];
  added: string;
  images: {
    coverType: string;
    url: string;
    remoteUrl?: string;
  }[];
  statistics?: {
    albumCount: number;
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
  titleSlug?: string;
}

export interface LidarrAlbum {
  id: number;
  title: string;
  foreignAlbumId: string;
  monitored: boolean;
  anyReleaseOk: boolean;
  profileId: number;
  duration: number;
  albumType: string;
  releases: {
    id: number;
    albumId: number;
    foreignReleaseId: string;
    title: string;
    status: string;
    duration: number;
    trackCount: number;
    media: { mediumNumber: number; name: string; format: string }[];
    mediumCount: number;
    disambiguation?: string;
    country: string[];
    label: string[];
    format?: string;
    monitored: boolean;
  }[];
  artist?: LidarrArtist;
  images: {
    coverType: string;
    url: string;
    remoteUrl?: string;
  }[];
  links?: { url: string; name: string }[];
  grabbed?: boolean;
  added: string;
  releaseDate?: string;
  ratings?: { votes: number; value: number };
  statistics?: {
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
}

export interface MetadataProfile {
  id: number;
  name: string;
}

class LidarrAPI extends ServarrBase<{ albumId: number }> {
  constructor({ url, apiKey }: { url: string; apiKey: string }) {
    super({ url, apiKey, cacheName: 'lidarr', apiName: 'Lidarr' });
  }

  // Lidarr v1 uses lowercase endpoint names
  public getProfiles = async () => {
    try {
      const data = await this.getRolling<{ id: number; name: string }[]>(
        '/qualityprofile',
        undefined,
        3600
      );
      return data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve quality profiles: ${e.message}`);
    }
  };

  public getArtists = async (): Promise<LidarrArtist[]> => {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist');
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artists: ${e.message}`);
    }
  };

  public getAlbums = async (): Promise<LidarrAlbum[]> => {
    try {
      const response = await this.axios.get<LidarrAlbum[]>('/album');
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve albums: ${e.message}`);
    }
  };

  public getAlbumByMbAlbumId = async (
    mbAlbumId: string
  ): Promise<LidarrAlbum> => {
    try {
      const response = await this.axios.get<LidarrAlbum[]>('/album/lookup', {
        params: { term: `lidarr:${mbAlbumId}` },
      });

      if (!response.data[0]) {
        throw new Error('Album not found');
      }

      return response.data[0];
    } catch (e) {
      logger.error('Error retrieving album by MusicBrainz ID', {
        label: 'Lidarr API',
        errorMessage: e.message,
        mbAlbumId,
      });
      throw new Error('Album not found');
    }
  };

  public addAlbum = async (options: LidarrAlbumOptions): Promise<LidarrAlbum> => {
    try {
      const album = await this.getAlbumByMbAlbumId(options.mbAlbumId);

      if (album.statistics?.trackFileCount && album.statistics.trackFileCount > 0) {
        logger.info(
          'Album already exists and is available. Skipping add and returning success',
          { label: 'Lidarr', album }
        );
        return album;
      }

      if (album.id && !album.monitored) {
        const response = await this.axios.put<LidarrAlbum>('/album', {
          ...album,
          monitored: options.monitored ?? true,
          addOptions: { searchForNewAlbum: options.searchNow },
        });

        if (response.data.monitored) {
          logger.info('Found existing album in Lidarr and set it to monitored.', {
            label: 'Lidarr',
            albumId: response.data.id,
            albumTitle: response.data.title,
          });
          if (options.searchNow) {
            this.searchAlbum(response.data.id);
          }
          return response.data;
        } else {
          throw new Error('Failed to update existing album in Lidarr');
        }
      }

      if (album.id) {
        logger.info('Album is already monitored in Lidarr. Skipping add.', {
          label: 'Lidarr',
        });
        return album;
      }

      // Need to add the artist first if not present
      const artistResponse = await this.ensureArtist(options);
      const artistId = artistResponse.id;

      const response = await this.axios.post<LidarrAlbum>('/album', {
        title: options.title,
        foreignAlbumId: options.mbAlbumId,
        monitored: options.monitored ?? true,
        artist: { id: artistId, foreignArtistId: options.mbArtistId },
        qualityProfileId: options.qualityProfileId,
        metadataProfileId: options.metadataProfileId,
        rootFolderPath: options.rootFolderPath,
        tags: options.tags ?? [],
        addOptions: { searchForNewAlbum: options.searchNow },
      });

      if (response.data.id) {
        logger.info('Lidarr accepted album request', { label: 'Lidarr' });
      } else {
        throw new Error('Failed to add album to Lidarr');
      }

      return response.data;
    } catch (e) {
      logger.error('Failed to add album to Lidarr.', {
        label: 'Lidarr',
        errorMessage: e.message,
        options,
      });
      throw new Error('Failed to add album to Lidarr');
    }
  };

  private ensureArtist = async (
    options: LidarrAlbumOptions
  ): Promise<LidarrArtist> => {
    try {
      const existing = await this.axios.get<LidarrArtist[]>('/artist/lookup', {
        params: { term: `lidarr:${options.mbArtistId}` },
      });

      if (existing.data[0]?.id) {
        return existing.data[0];
      }

      const response = await this.axios.post<LidarrArtist>('/artist', {
        foreignArtistId: options.mbArtistId,
        artistName: options.artistName,
        qualityProfileId: options.qualityProfileId,
        metadataProfileId: options.metadataProfileId,
        rootFolderPath: options.rootFolderPath,
        tags: options.tags ?? [],
        monitored: options.monitored ?? true,
        addOptions: { monitor: 'none', searchForMissingAlbums: false },
      });

      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to ensure artist: ${e.message}`);
    }
  };

  public async searchAlbum(albumId: number): Promise<void> {
    logger.info('Executing album search command', {
      label: 'Lidarr API',
      albumId,
    });
    try {
      await this.runCommand('AlbumSearch', { albumIds: [albumId] });
    } catch (e) {
      logger.error('Something went wrong while executing Lidarr album search.', {
        label: 'Lidarr API',
        errorMessage: e.message,
        albumId,
      });
    }
  }

  public getMetadataProfiles = async (): Promise<MetadataProfile[]> => {
    try {
      const data = await this.getRolling<MetadataProfile[]>(
        '/metadataprofile',
        undefined,
        3600
      );
      return data;
    } catch (e) {
      throw new Error(
        `[Lidarr] Failed to retrieve metadata profiles: ${e.message}`
      );
    }
  };

  public clearCache = ({
    mbAlbumId,
    externalId,
  }: {
    mbAlbumId?: string | null;
    externalId?: number | null;
  }) => {
    if (mbAlbumId) {
      this.removeCache('/album/lookup', { term: `lidarr:${mbAlbumId}` });
    }
    if (externalId) {
      this.removeCache(`/album/${externalId}`);
    }
  };
}

export default LidarrAPI;
