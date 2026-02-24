import type { LidarrArtist } from '@server/api/servarr/lidarr';
import LidarrAPI from '@server/api/servarr/lidarr';
import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import type { RunnableScanner, StatusBase } from '@server/lib/scanners/baseScanner';
import type { LidarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { uniqWith } from 'lodash';

type SyncStatus = StatusBase & {
  currentServer: LidarrSettings;
  servers: LidarrSettings[];
};

class LidarrScanner implements RunnableScanner<SyncStatus> {
  private servers: LidarrSettings[];
  private currentServer: LidarrSettings;
  private lidarrApi: LidarrAPI;
  protected running = false;
  protected progress = 0;
  protected items: LidarrArtist[] = [];

  constructor() {
    // noop
  }

  public status(): SyncStatus {
    return {
      running: this.running,
      progress: this.progress,
      total: this.items.length,
      currentServer: this.currentServer,
      servers: this.servers,
    };
  }

  public async run(): Promise<void> {
    if (this.running) {
      logger.warn('Lidarr scanner already running. Skipping.', {
        label: 'Lidarr Scanner',
      });
      return;
    }

    const settings = getSettings();
    this.running = true;
    this.progress = 0;

    try {
      this.servers = uniqWith(settings.lidarr, (lidarrA, lidarrB) => {
        return (
          lidarrA.hostname === lidarrB.hostname &&
          lidarrA.port === lidarrB.port &&
          lidarrA.baseUrl === lidarrB.baseUrl
        );
      });

      for (const server of this.servers) {
        this.currentServer = server;
        if (server.syncEnabled) {
          logger.info(`Beginning to process Lidarr server: ${server.name}`, {
            label: 'Lidarr Scanner',
          });

          this.lidarrApi = new LidarrAPI({
            apiKey: server.apiKey,
            url: LidarrAPI.buildUrl(server, '/api/v1'),
          });

          this.items = await this.lidarrApi.getArtists();

          let processed = 0;
          for (const artist of this.items) {
            await this.processLidarrArtist(artist);
            processed++;
            this.progress = Math.round((processed / this.items.length) * 100);
          }
        } else {
          logger.info(
            `Sync not enabled. Skipping Lidarr server: ${server.name}`,
            { label: 'Lidarr Scanner' }
          );
        }
      }

      logger.info('Lidarr scan complete', { label: 'Lidarr Scanner' });
    } catch (e) {
      logger.error('Lidarr scan interrupted', {
        label: 'Lidarr Scanner',
        errorMessage: e.message,
      });
    } finally {
      this.running = false;
    }
  }

  public cancel(): void {
    this.running = false;
  }

  private async processLidarrArtist(artist: LidarrArtist): Promise<void> {
    if (!artist.monitored && !artist.statistics?.trackFileCount) {
      logger.debug(
        'Artist is unmonitored and has no downloaded tracks. Skipping.',
        { label: 'Lidarr Scanner', title: artist.artistName }
      );
      return;
    }

    const mediaRepository = getRepository(Media);

    try {
      // Use the foreignArtistId (MusicBrainz ID) as our external identifier
      let existingMedia = await mediaRepository.findOne({
        where: {
          mediaType: MediaType.MUSIC,
          externalServiceSlug: artist.foreignArtistId,
        },
      });

      const hasFiles = (artist.statistics?.trackFileCount ?? 0) > 0;

      if (!existingMedia) {
        existingMedia = new Media({
          mediaType: MediaType.MUSIC,
          // Use 0 as a placeholder tmdbId for music (not applicable)
          tmdbId: 0,
          serviceId: this.currentServer.id,
          externalServiceId: artist.id,
          externalServiceSlug: artist.foreignArtistId,
          status: hasFiles ? MediaStatus.AVAILABLE : MediaStatus.PROCESSING,
          status4k: MediaStatus.UNKNOWN,
        });
        await mediaRepository.save(existingMedia);
        logger.debug('Added new music artist to media db', {
          label: 'Lidarr Scanner',
          artistName: artist.artistName,
          foreignArtistId: artist.foreignArtistId,
        });
      } else {
        existingMedia.serviceId = this.currentServer.id;
        existingMedia.externalServiceId = artist.id;
        existingMedia.externalServiceSlug = artist.foreignArtistId;
        existingMedia.status = hasFiles
          ? MediaStatus.AVAILABLE
          : MediaStatus.PROCESSING;
        await mediaRepository.save(existingMedia);
      }
    } catch (e) {
      logger.error('Failed to process Lidarr artist', {
        label: 'Lidarr Scanner',
        errorMessage: e.message,
        artistName: artist.artistName,
      });
    }
  }
}

export const lidarrScanner = new LidarrScanner();
