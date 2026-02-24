import logger from '@server/logger';
import ServarrBase from './base';

export interface LidarrArtistOptions {
  foreignArtistId: string;
  title: string;
  qualityProfileId: number;
  metadataProfileId: number;
  rootFolderPath: string;
  tags: number[];
  monitored?: boolean;
  albumFolder?: boolean;
  searchForMissingAlbums?: boolean;
}

export interface LidarrAlbumOptions {
  foreignAlbumId: string;
  title: string;
  artistId: number;
  qualityProfileId: number;
  rootFolderPath: string;
  tags: number[];
  monitored?: boolean;
  searchForNewAlbum?: boolean;
}

export interface LidarrArtist {
  id: number;
  foreignArtistId: string;
  artistName: string;
  sortName: string;
  status: string;
  overview?: string;
  artistType?: string;
  disambiguation?: string;
  remotePoster?: string;
  path: string;
  qualityProfileId: number;
  metadataProfileId: number;
  monitored: boolean;
  albumFolder: boolean;
  tags: number[];
  added: string;
  statistics?: {
    albumCount: number;
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
}

export interface LidarrAlbum {
  id: number;
  foreignAlbumId: string;
  title: string;
  disambiguation?: string;
  overview?: string;
  artistId: number;
  foreignArtistId: string;
  artist: LidarrArtist;
  albumType: string;
  secondaryTypes?: string[];
  releaseDate?: string;
  releases?: {
    id: number;
    albumId: number;
    foreignReleaseId: string;
    title: string;
    status: string;
    duration: number;
    trackCount: number;
    media: { mediumNumber: number; name: string; format: string }[];
    country: string[];
    label: string[];
    disambiguation: string;
    monitored: boolean;
  }[];
  genres?: string[];
  images?: { coverType: string; url: string }[];
  monitored: boolean;
  anyReleaseOk: boolean;
  profileId: number;
  duration: number;
  titleSlug: string;
  tags: number[];
  added: string;
  addOptions?: {
    addType: string;
    searchForNewAlbum: boolean;
  };
  statistics?: {
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
  grabbed: boolean;
}

export interface MetadataProfile {
  id: number;
  name: string;
}

class LidarrAPI extends ServarrBase<{ artistId: number; albumId: number }> {
  constructor({ url, apiKey }: { url: string; apiKey: string }) {
    super({ url, apiKey, cacheName: 'lidarr', apiName: 'Lidarr' });
  }

  public getArtists = async (): Promise<LidarrArtist[]> => {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist');
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artists: ${e.message}`);
    }
  };

  public getArtist = async ({ id }: { id: number }): Promise<LidarrArtist> => {
    try {
      const response = await this.axios.get<LidarrArtist>(`/artist/${id}`);
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artist: ${e.message}`);
    }
  };

  public async getArtistByForeignId(
    foreignArtistId: string
  ): Promise<LidarrArtist> {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist/lookup', {
        params: { term: `lidarr:${foreignArtistId}` },
      });

      if (!response.data[0]) {
        throw new Error('Artist not found');
      }

      return response.data[0];
    } catch (e) {
      logger.error('Error retrieving artist by foreign ID', {
        label: 'Lidarr API',
        errorMessage: e.message,
        foreignArtistId,
      });
      throw new Error('Artist not found');
    }
  }

  public async getAlbumByForeignId(
    foreignAlbumId: string
  ): Promise<LidarrAlbum> {
    try {
      const response = await this.axios.get<LidarrAlbum[]>('/album/lookup', {
        params: { term: `lidarr:${foreignAlbumId}` },
      });

      if (!response.data[0]) {
        throw new Error('Album not found');
      }

      return response.data[0];
    } catch (e) {
      logger.error('Error retrieving album by foreign ID', {
        label: 'Lidarr API',
        errorMessage: e.message,
        foreignAlbumId,
      });
      throw new Error('Album not found');
    }
  }

  public addArtist = async (
    options: LidarrArtistOptions
  ): Promise<LidarrArtist> => {
    try {
      const artist = await this.getArtistByForeignId(options.foreignArtistId);

      if (artist.id) {
        logger.info(
          'Artist already exists in Lidarr. Skipping add and returning success.',
          { label: 'Lidarr', artist }
        );
        return artist;
      }

      const response = await this.axios.post<LidarrArtist>('/artist', {
        foreignArtistId: options.foreignArtistId,
        artistName: options.title,
        qualityProfileId: options.qualityProfileId,
        metadataProfileId: options.metadataProfileId,
        rootFolderPath: options.rootFolderPath,
        monitored: options.monitored ?? true,
        albumFolder: options.albumFolder ?? true,
        tags: options.tags,
        addOptions: {
          searchForMissingAlbums: options.searchForMissingAlbums ?? false,
        },
      });

      if (response.data.id) {
        logger.info('Lidarr accepted artist request', { label: 'Lidarr' });
        logger.debug('Lidarr add artist details', {
          label: 'Lidarr',
          artist: response.data,
        });
      } else {
        logger.error('Failed to add artist to Lidarr', {
          label: 'Lidarr',
          options,
        });
        throw new Error('Failed to add artist to Lidarr');
      }

      return response.data;
    } catch (e) {
      logger.error('Failed to add artist to Lidarr.', {
        label: 'Lidarr',
        errorMessage: e.message,
        options,
        response: e?.response?.data,
      });
      throw new Error('Failed to add artist to Lidarr');
    }
  };

  public addAlbum = async (
    options: LidarrAlbumOptions
  ): Promise<LidarrAlbum> => {
    try {
      const album = await this.getAlbumByForeignId(options.foreignAlbumId);

      if (album.statistics?.trackFileCount) {
        logger.info(
          'Album already exists in Lidarr. Skipping add and returning success.',
          { label: 'Lidarr', album }
        );
        return album;
      }

      if (album.id) {
        logger.info(
          'Album is already monitored in Lidarr. Skipping add and returning success.',
          { label: 'Lidarr' }
        );
        return album;
      }

      const response = await this.axios.post<LidarrAlbum>('/album', {
        foreignAlbumId: options.foreignAlbumId,
        title: options.title,
        artistId: options.artistId,
        qualityProfileId: options.qualityProfileId,
        rootFolderPath: options.rootFolderPath,
        monitored: options.monitored ?? true,
        tags: options.tags,
        addOptions: {
          searchForNewAlbum: options.searchForNewAlbum ?? false,
        },
      });

      if (response.data.id) {
        logger.info('Lidarr accepted album request', { label: 'Lidarr' });
        logger.debug('Lidarr add album details', {
          label: 'Lidarr',
          album: response.data,
        });
      } else {
        logger.error('Failed to add album to Lidarr', {
          label: 'Lidarr',
          options,
        });
        throw new Error('Failed to add album to Lidarr');
      }

      return response.data;
    } catch (e) {
      logger.error('Failed to add album to Lidarr.', {
        label: 'Lidarr',
        errorMessage: e.message,
        options,
        response: e?.response?.data,
      });
      throw new Error('Failed to add album to Lidarr');
    }
  };

  public async searchArtist(artistId: number): Promise<void> {
    logger.info('Executing artist search command', {
      label: 'Lidarr API',
      artistId,
    });

    try {
      await this.runCommand('ArtistSearch', { artistId });
    } catch (e) {
      logger.error('Something went wrong while executing Lidarr artist search.', {
        label: 'Lidarr API',
        errorMessage: e.message,
        artistId,
      });
    }
  }

  public async searchAlbums(albumIds: number[]): Promise<void> {
    logger.info('Executing album search command', {
      label: 'Lidarr API',
      albumIds,
    });

    try {
      await this.runCommand('AlbumSearch', { albumIds });
    } catch (e) {
      logger.error('Something went wrong while executing Lidarr album search.', {
        label: 'Lidarr API',
        errorMessage: e.message,
        albumIds,
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
}

export default LidarrAPI;
