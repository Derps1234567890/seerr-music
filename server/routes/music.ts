import MusicBrainz from '@server/api/musicbrainz';
import logger from '@server/logger';
import { Router } from 'express';

const musicRoutes = Router();

musicRoutes.get('/search', async (req, res, next) => {
  const query = req.query.query as string;
  const page = Number(req.query.page) || 1;

  if (!query) {
    return next({ status: 400, message: 'Query parameter is required' });
  }

  try {
    const musicBrainz = new MusicBrainz();
    const results = await musicBrainz.searchAll({ query, page });

    return res.status(200).json(results);
  } catch (e) {
    logger.error('Something went wrong searching music', {
      label: 'Music API',
      errorMessage: e.message,
      query,
    });
    return next({ status: 500, message: 'Unable to search music.' });
  }
});

musicRoutes.get('/artist/search', async (req, res, next) => {
  const query = req.query.query as string;
  const page = Number(req.query.page) || 1;

  if (!query) {
    return next({ status: 400, message: 'Query parameter is required' });
  }

  try {
    const musicBrainz = new MusicBrainz();
    const results = await musicBrainz.searchArtists({ query, page });

    return res.status(200).json({
      page,
      totalResults: results.count,
      results: results.artists,
    });
  } catch (e) {
    logger.error('Something went wrong searching artists', {
      label: 'Music API',
      errorMessage: e.message,
      query,
    });
    return next({ status: 500, message: 'Unable to search artists.' });
  }
});

musicRoutes.get('/artist/:artistId', async (req, res, next) => {
  try {
    const musicBrainz = new MusicBrainz();
    const artist = await musicBrainz.getArtist({
      artistId: req.params.artistId,
    });

    return res.status(200).json(artist);
  } catch (e) {
    logger.error('Something went wrong retrieving artist details', {
      label: 'Music API',
      errorMessage: e.message,
      artistId: req.params.artistId,
    });
    return next({ status: 500, message: 'Unable to retrieve artist details.' });
  }
});

musicRoutes.get('/album/search', async (req, res, next) => {
  const query = req.query.query as string;
  const page = Number(req.query.page) || 1;
  const artistId = req.query.artistId as string | undefined;

  if (!query) {
    return next({ status: 400, message: 'Query parameter is required' });
  }

  try {
    const musicBrainz = new MusicBrainz();
    const results = await musicBrainz.searchReleaseGroups({
      query,
      page,
      artistId,
    });

    return res.status(200).json({
      page,
      totalResults: results.count,
      results: results['release-groups'],
    });
  } catch (e) {
    logger.error('Something went wrong searching albums', {
      label: 'Music API',
      errorMessage: e.message,
      query,
    });
    return next({ status: 500, message: 'Unable to search albums.' });
  }
});

musicRoutes.get('/album/:albumId', async (req, res, next) => {
  try {
    const musicBrainz = new MusicBrainz();
    const album = await musicBrainz.getReleaseGroup({
      releaseGroupId: req.params.albumId,
    });

    return res.status(200).json(album);
  } catch (e) {
    logger.error('Something went wrong retrieving album details', {
      label: 'Music API',
      errorMessage: e.message,
      albumId: req.params.albumId,
    });
    return next({ status: 500, message: 'Unable to retrieve album details.' });
  }
});

export default musicRoutes;
