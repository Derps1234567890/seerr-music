import LidarrAPI from '@server/api/servarr/lidarr';
import type { LidarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { Router } from 'express';

const lidarrRoutes = Router();

lidarrRoutes.get('/', (_req, res) => {
  const settings = getSettings();
  res.status(200).json(settings.lidarr);
});

lidarrRoutes.post('/', async (req, res) => {
  const settings = getSettings();

  const newLidarr = req.body as LidarrSettings;
  const lastItem = settings.lidarr[settings.lidarr.length - 1];
  newLidarr.id = lastItem ? lastItem.id + 1 : 0;

  if (req.body.isDefault) {
    settings.lidarr.forEach((instance) => {
      instance.isDefault = false;
    });
  }

  settings.lidarr = [...settings.lidarr, newLidarr];
  await settings.save();

  return res.status(201).json(newLidarr);
});

lidarrRoutes.post<
  undefined,
  Record<string, unknown>,
  LidarrSettings & { tagLabel?: string }
>('/test', async (req, res, next) => {
  try {
    const lidarr = new LidarrAPI({
      apiKey: req.body.apiKey,
      url: LidarrAPI.buildUrl(req.body, '/api/v1'),
    });

    const urlBase = await lidarr
      .getSystemStatus()
      .then((value) => value.urlBase)
      .catch(() => req.body.baseUrl);
    const profiles = await lidarr.getProfiles();
    const metadataProfiles = await lidarr.getMetadataProfiles();
    const folders = await lidarr.getRootFolders();
    const tags = await lidarr.getTags();

    return res.status(200).json({
      profiles,
      metadataProfiles,
      rootFolders: folders.map((folder) => ({
        id: folder.id,
        path: folder.path,
      })),
      tags,
      urlBase,
    });
  } catch (e) {
    logger.error('Failed to test Lidarr', {
      label: 'Lidarr',
      message: e.message,
    });

    next({ status: 500, message: 'Failed to connect to Lidarr' });
  }
});

lidarrRoutes.put<{ id: string }, LidarrSettings, LidarrSettings>(
  '/:id',
  async (req, res, next) => {
    const settings = getSettings();

    const lidarrIndex = settings.lidarr.findIndex(
      (r) => r.id === Number(req.params.id)
    );

    if (lidarrIndex === -1) {
      return next({ status: 404, message: 'Lidarr server not found' });
    }

    if (req.body.isDefault) {
      settings.lidarr.forEach((instance) => {
        instance.isDefault = false;
      });
    }

    settings.lidarr[lidarrIndex] = {
      ...req.body,
      id: Number(req.params.id),
    } as LidarrSettings;

    await settings.save();

    return res.status(200).json(settings.lidarr[lidarrIndex]);
  }
);

lidarrRoutes.delete<{ id: string }>('/:id', async (req, res, next) => {
  const settings = getSettings();

  const lidarrIndex = settings.lidarr.findIndex(
    (r) => r.id === Number(req.params.id)
  );

  if (lidarrIndex === -1) {
    return next({ status: 404, message: 'Lidarr server not found' });
  }

  const removed = settings.lidarr.splice(lidarrIndex, 1);
  await settings.save();

  return res.status(200).json(removed[0]);
});

export default lidarrRoutes;
