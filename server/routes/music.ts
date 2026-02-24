import LastFmAPI from '@server/api/lastfm';
import MusicBrainzAPI from '@server/api/musicbrainz';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaType } from '@server/constants/media';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { Router } from 'express';

const musicRoutes = Router();

/** GET /api/v1/music/artist/:mbid  — artist details from MusicBrainz */
musicRoutes.get<{ mbid: string }>('/artist/:mbid', async (req, res, next) => {
  const mb = new MusicBrainzAPI();
  try {
    const artist = await mb.getArtist(req.params.mbid);
    return res.status(200).json(artist);
  } catch (e) {
    logger.debug('Failed to get artist details', {
      label: 'Music API',
      errorMessage: e.message,
      mbid: req.params.mbid,
    });
    return next({ status: 404, message: 'Artist not found' });
  }
});

/** GET /api/v1/music/album/:mbid  — album details from MusicBrainz + media status */
musicRoutes.get<{ mbid: string }>('/album/:mbid', async (req, res, next) => {
  const mb = new MusicBrainzAPI();
  try {
    const album = await mb.getReleaseGroup(req.params.mbid);

    const mediaRepository = getRepository(Media);
    const existingMedia = await mediaRepository.findOne({
      where: { mbId: req.params.mbid, mediaType: MediaType.MUSIC },
    });

    return res.status(200).json({ ...album, mediaInfo: existingMedia ?? null });
  } catch (e) {
    logger.debug('Failed to get album details', {
      label: 'Music API',
      errorMessage: e.message,
      mbid: req.params.mbid,
    });
    return next({ status: 404, message: 'Album not found' });
  }
});

/**
 * GET /api/v1/music/recommendations
 *
 * Returns personalised music suggestions from Last.fm based on the configured
 * username's listening history.  Falls back to chart data when no username is
 * set, so the discover page always has content.
 */
musicRoutes.get('/recommendations', async (req, res, next) => {
  const settings = getSettings();
  const { apiKey, username } = settings.lastfm;

  if (!apiKey) {
    return next({
      status: 400,
      message:
        'Last.fm API key not configured. Please add it in Settings → Services → Last.fm.',
    });
  }

  const lastfm = new LastFmAPI(apiKey);

  try {
    if (username) {
      const [topArtists, topAlbums] = await Promise.all([
        lastfm.getUserTopArtists({
          user: username,
          period: (req.query.period as 'overall' | '7day' | '1month' | '3month' | '6month' | '12month') ?? 'overall',
          limit: 10,
        }),
        lastfm.getUserTopAlbums({
          user: username,
          period: (req.query.period as 'overall' | '7day' | '1month' | '3month' | '6month' | '12month') ?? 'overall',
          limit: 10,
        }),
      ]);

      // For the top artists, fetch their similar artists to surface new music
      const similarArtists = topArtists.length
        ? await lastfm.getSimilarArtists({
            artist: topArtists[0].name,
            mbid: topArtists[0].mbid,
            limit: 10,
          })
        : [];

      return res.status(200).json({ topArtists, topAlbums, similarArtists });
    } else {
      // No username configured – return chart top artists as generic suggestions
      const chartData = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=chart.getTopArtists&api_key=${apiKey}&limit=20&format=json`
      ).then((r) => r.json());
      return res.status(200).json({
        topArtists: chartData?.artists?.artist ?? [],
        topAlbums: [],
        similarArtists: [],
      });
    }
  } catch (e) {
    logger.error('Failed to fetch Last.fm recommendations', {
      label: 'Music API',
      errorMessage: e.message,
    });
    return next({ status: 500, message: 'Unable to retrieve recommendations' });
  }
});

/**
 * GET /api/v1/music/scrobbles
 * Returns the user's recently scrobbled tracks.
 */
musicRoutes.get('/scrobbles', async (req, res, next) => {
  const settings = getSettings();
  const { apiKey, username } = settings.lastfm;

  if (!apiKey || !username) {
    return next({
      status: 400,
      message: 'Last.fm API key and username must be configured.',
    });
  }

  const lastfm = new LastFmAPI(apiKey);
  try {
    const tracks = await lastfm.getUserRecentTracks({
      user: username,
      limit: Number(req.query.limit ?? 25),
    });
    return res.status(200).json(tracks);
  } catch (e) {
    logger.error('Failed to fetch Last.fm recent tracks', {
      label: 'Music API',
      errorMessage: e.message,
    });
    return next({ status: 500, message: 'Unable to retrieve scrobble history' });
  }
});

/**
 * GET /api/v1/music/similar/:mbid
 * Returns similar artists for the given MusicBrainz artist ID.
 * Combines Last.fm similarity data with MusicBrainz metadata.
 */
musicRoutes.get<{ mbid: string }>('/similar/:mbid', async (req, res, next) => {
  const settings = getSettings();
  const { apiKey } = settings.lastfm;

  if (!apiKey) {
    return next({
      status: 400,
      message: 'Last.fm API key not configured.',
    });
  }

  const lastfm = new LastFmAPI(apiKey);
  try {
    const similar = await lastfm.getSimilarArtists({
      mbid: req.params.mbid,
      limit: Number(req.query.limit ?? 10),
    });
    return res.status(200).json(similar);
  } catch (e) {
    logger.error('Failed to fetch similar artists', {
      label: 'Music API',
      errorMessage: e.message,
      mbid: req.params.mbid,
    });
    return next({ status: 500, message: 'Unable to retrieve similar artists' });
  }
});

export default musicRoutes;
